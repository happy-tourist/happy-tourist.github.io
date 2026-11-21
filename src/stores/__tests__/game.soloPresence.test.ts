import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import enUS from '@/i18n/en-US';
import { isSoloBudgetFromSeats, useGameStore, type GameSeat } from '@/stores/game';

function seat(partial: Partial<GameSeat> & Pick<GameSeat, 'sessionId'>): GameSeat {
  return {
    sessionId: partial.sessionId,
    touristId: partial.touristId ?? 1,
    pieces: partial.pieces ?? [],
    connected: partial.connected ?? true,
    reconnectUntil: partial.reconnectUntil ?? 0,
    ready: partial.ready ?? false,
    finishPlace: partial.finishPlace ?? 0,
    timeExpired: partial.timeExpired ?? false,
  };
}

describe('game store knowledge / retired end-turn (SC-PRESENCE-50/55)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('SC-PRESENCE-55: canSendEndTurn always false; sendEndTurn no-op', () => {
    const game = useGameStore();
    game.$patch({
      room: { send: () => undefined } as never,
      sessionId: 's1',
      phase: 'playing',
      maxSeats: 2,
      currentTurnSessionId: 's1',
      seats: [seat({ sessionId: 's1' }), seat({ sessionId: 's2', touristId: 2 })],
    });
    expect(game.canSendEndTurn).toBe(false);
    expect(game.sendEndTurn()).toBe(false);
  });

  it('knowledgeDelivered i18n keys exist; retired solo/place keys gone', () => {
    expect(enUS.game.knowledgeDeliveredModal).toMatch(/\{n\}/);
    expect(enUS.game.knowledgeDeliveredModalCut).toMatch(/\{n\}/);
    expect(enUS.game.knowledgeDeliveredModal).not.toBe(enUS.game.knowledgeDeliveredModalCut);
    expect(enUS.game.knowledgeDeliveredModalOk).toBe('ОК');
    expect(enUS.game.knowledgeCounterAria).toBe('Знания');
    expect(enUS.game).not.toHaveProperty('soloUnlimitedModal');
    expect(enUS.game).not.toHaveProperty('finishPlaceModal');
    expect(enUS.game).not.toHaveProperty('budgetInfinity');
    expect(enUS.game).not.toHaveProperty('endTurn');
  });

  it('isSoloBudgetFromSeats still computes leftover (server may still use eligibility)', () => {
    const leftover = [seat({ sessionId: 's1' })];
    expect(isSoloBudgetFromSeats(leftover, 2)).toBe(true);
    expect(
      isSoloBudgetFromSeats(
        [seat({ sessionId: 's1' }), seat({ sessionId: 's2', touristId: 2 })],
        2,
      ),
    ).toBe(false);
    expect(isSoloBudgetFromSeats([seat({ sessionId: 's1' })], 1)).toBe(false);
  });
});
