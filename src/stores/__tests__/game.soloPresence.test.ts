import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import enUS from '@/i18n/en-US';
import {
  countEligibleSeats,
  isSoloBudgetFromSeats,
  useGameStore,
  type GameSeat,
} from '@/stores/game';

function seat(partial: Partial<GameSeat> & Pick<GameSeat, 'sessionId'>): GameSeat {
  return {
    touristId: 1,
    pieces: [],
    connected: true,
    reconnectUntil: 0,
    ready: false,
    finishPlace: 0,
    timeExpired: false,
    ...partial,
  };
}

describe('solo presence helpers (SC-PRESENCE-09/16/19/38/42)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('SC-PRESENCE-09 red ring via leftover (maxSeats≥2 + eligible===1)', () => {
    it('leftover → solo (red); ≥2 eligible → not solo; maxSeats=1 never leftover', () => {
      const one: GameSeat[] = [seat({ sessionId: 'a' })];
      const two: GameSeat[] = [seat({ sessionId: 'a' }), seat({ sessionId: 'b', touristId: 2 })];
      const onePlusFinished: GameSeat[] = [
        seat({ sessionId: 'a' }),
        seat({ sessionId: 'b', touristId: 2, finishPlace: 1 }),
      ];
      const onePlusExpired: GameSeat[] = [
        seat({ sessionId: 'a' }),
        seat({ sessionId: 'b', touristId: 2, timeExpired: true }),
      ];

      expect(countEligibleSeats(one)).toBe(1);
      expect(isSoloBudgetFromSeats(one, 2)).toBe(true);
      expect(isSoloBudgetFromSeats(one, 1)).toBe(false);
      expect(countEligibleSeats(two)).toBe(2);
      expect(isSoloBudgetFromSeats(two, 2)).toBe(false);
      expect(countEligibleSeats(onePlusFinished)).toBe(1);
      expect(isSoloBudgetFromSeats(onePlusFinished, 2)).toBe(true);
      expect(countEligibleSeats(onePlusExpired)).toBe(1);
      expect(isSoloBudgetFromSeats(onePlusExpired, 2)).toBe(true);

      const game = useGameStore();
      game.$patch({ seats: one, maxSeats: 2, turnBudgetSeconds: 60 });
      expect(game.isSoloBudget).toBe(true);
      game.$patch({ seats: one, maxSeats: 1, turnBudgetSeconds: 60 });
      expect(game.isSoloBudget).toBe(false);
      game.$patch({ seats: two, maxSeats: 2, turnBudgetSeconds: 60 });
      expect(game.isSoloBudget).toBe(false);
      // Same 60s budget must not flip accent — leftover eligibility + maxSeats decide.
      game.$patch({ seats: one, maxSeats: 2, turnBudgetSeconds: 60 });
      expect(game.isSoloBudget).toBe(true);
      game.$patch({ seats: two, maxSeats: 2, turnBudgetSeconds: 300 });
      expect(game.isSoloBudget).toBe(false);
    });
  });

  describe('SC-PRESENCE-16 both counters ∞ when budgetsInfinite', () => {
    it('store flag is true for solo leftover infinite budgets', () => {
      const game = useGameStore();
      game.$patch({ budgetsInfinite: true, steps: 0, peeks: 0, maxSeats: 2 });
      expect(game.budgetsInfinite).toBe(true);
      // Display uses budgetsInfinite → ∞ for both (GamePage stepsBudgetDisplay / peeksBudgetDisplay).
      expect(enUS.game.budgetInfinity).toBe('∞');
    });
  });

  describe('SC-PRESENCE-19 solo unlimited modal copy', () => {
    it('i18n states alone + unlimited moves/peeks + 1 minute', () => {
      expect(enUS.game.soloUnlimitedModal).toBe(
        'Вы один. Ходы и просмотры безлимитны. У вас 1 минута.',
      );
    });
  });

  describe('SC-PRESENCE-42 canSendEndTurn rejects maxSeats=1', () => {
    it('finite own turn with maxSeats=1 → canSendEndTurn false; multi ≥2 → true', () => {
      const game = useGameStore();
      const own = seat({ sessionId: 's1' });
      game.$patch({
        phase: 'playing',
        sessionId: 's1',
        currentTurnSessionId: 's1',
        budgetsInfinite: false,
        seats: [own],
        maxSeats: 1,
      });
      expect(game.canSendEndTurn).toBe(false);

      game.$patch({
        maxSeats: 2,
        seats: [own, seat({ sessionId: 's2', touristId: 2 })],
      });
      expect(game.canSendEndTurn).toBe(true);

      // Leftover ∞ still hides end-turn (SC-PRESENCE-18).
      game.$patch({
        maxSeats: 2,
        budgetsInfinite: true,
        seats: [own, seat({ sessionId: 's2', touristId: 2, finishPlace: 1 })],
      });
      expect(game.canSendEndTurn).toBe(false);
    });
  });

  describe('SC-PRESENCE-38 single-player stays finite (store mirror)', () => {
    it('maxSeats=1 with finite budgets is not leftover infinite', () => {
      const game = useGameStore();
      game.$patch({
        maxSeats: 1,
        budgetsInfinite: false,
        steps: 3,
        peeks: 2,
        seats: [seat({ sessionId: 's1' })],
      });
      expect(game.budgetsInfinite).toBe(false);
      expect(game.isSoloBudget).toBe(false);
      expect(game.steps).toBe(3);
      expect(game.peeks).toBe(2);
    });
  });
});
