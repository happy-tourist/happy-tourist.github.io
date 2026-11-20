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

describe('solo presence helpers (SC-PRESENCE-09/16/19)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('SC-PRESENCE-09 red ring via eligible-seat count', () => {
    it('1 eligible → solo (red); ≥2 → not solo (blue); ignores turnBudgetSeconds', () => {
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
      expect(isSoloBudgetFromSeats(one)).toBe(true);
      expect(countEligibleSeats(two)).toBe(2);
      expect(isSoloBudgetFromSeats(two)).toBe(false);
      expect(countEligibleSeats(onePlusFinished)).toBe(1);
      expect(isSoloBudgetFromSeats(onePlusFinished)).toBe(true);
      expect(countEligibleSeats(onePlusExpired)).toBe(1);
      expect(isSoloBudgetFromSeats(onePlusExpired)).toBe(true);

      const game = useGameStore();
      game.$patch({ seats: one, turnBudgetSeconds: 60 });
      expect(game.isSoloBudget).toBe(true);
      game.$patch({ seats: two, turnBudgetSeconds: 60 });
      expect(game.isSoloBudget).toBe(false);
      // Same 60s budget must not flip accent — eligibility alone decides.
      game.$patch({ seats: one, turnBudgetSeconds: 60 });
      expect(game.isSoloBudget).toBe(true);
      game.$patch({ seats: two, turnBudgetSeconds: 300 });
      expect(game.isSoloBudget).toBe(false);
    });
  });

  describe('SC-PRESENCE-16 both counters ∞ when budgetsInfinite', () => {
    it('store flag is true for solo infinite budgets', () => {
      const game = useGameStore();
      game.$patch({ budgetsInfinite: true, steps: 0, peeks: 0 });
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
});
