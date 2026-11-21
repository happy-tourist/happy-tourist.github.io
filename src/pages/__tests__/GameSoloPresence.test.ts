import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { touristLayoutGrid } from '@/lib/boardGeometry';
import GamePage from '@/pages/GamePage.vue';
import { useGameStore, type GameSeat } from '@/stores/game';

const routerPush = vi.fn().mockResolvedValue(undefined);

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRoute: () => ({
      name: 'game',
      params: { roomId: 'r1' },
      query: {},
      path: '/game/r1',
    }),
    useRouter: () => ({ push: routerPush, replace: vi.fn() }),
  };
});

function baseSeat(pieces: GameSeat['pieces'], sessionId = 's1', touristId = 1): GameSeat {
  return {
    sessionId,
    touristId,
    pieces,
    connected: true,
    reconnectUntil: 0,
    ready: false,
    finishPlace: 0,
    timeExpired: false,
  };
}

/** Solo leftover seeds: maxSeats ≥ 2 (SC-PRESENCE-09/16/19). */
function seedLeftoverPlaying(opts?: {
  budgetsInfinite?: boolean;
  steps?: number;
  peeks?: number;
  maxSeats?: number;
}) {
  const game = useGameStore();
  const seat = baseSeat([{ pieceId: '0', row: 3, col: 3, finished: false, trapped: false }]);
  game.$patch({
    room: { roomId: 'r1' } as never,
    roomId: 'r1',
    sessionId: 's1',
    phase: 'playing',
    status: 'playing',
    started: true,
    maxSeats: opts?.maxSeats ?? 2,
    currentTurnSessionId: 's1',
    turnUntil: Date.now() + 60_000,
    turnBudgetSeconds: 60,
    budgetsInfinite: opts?.budgetsInfinite ?? true,
    grid: touristLayoutGrid(),
    touristsPerPlayer: 1,
    packTitle: 'Пак',
    seats: [seat],
    steps: opts?.steps ?? 0,
    peeks: opts?.peeks ?? 0,
    flippedCells: [],
    answerCards: [],
    openPeek: null,
    removedTaskKeys: [],
    holdingGrilleKeys: [],
    revealingCatapultKeys: [],
    brokenCatapultKeys: [],
  });
  return game;
}

/** Intentional single-player: maxSeats === 1, finite budgets (SC-PRESENCE-38…42). */
function seedSinglePlayerPlaying(opts?: {
  steps?: number;
  peeks?: number;
  turnUntil?: number;
  budgetsInfinite?: boolean;
}) {
  const game = useGameStore();
  const seat = baseSeat([{ pieceId: '0', row: 3, col: 3, finished: false, trapped: false }]);
  game.$patch({
    room: { roomId: 'r1' } as never,
    roomId: 'r1',
    sessionId: 's1',
    phase: 'playing',
    status: 'playing',
    started: true,
    maxSeats: 1,
    currentTurnSessionId: 's1',
    turnUntil: opts?.turnUntil ?? 0,
    turnBudgetSeconds: opts?.turnUntil && opts.turnUntil > 0 ? 60 : 0,
    budgetsInfinite: opts?.budgetsInfinite ?? false,
    grid: touristLayoutGrid(),
    touristsPerPlayer: 1,
    packTitle: 'Пак',
    seats: [seat],
    steps: opts?.steps ?? 2,
    peeks: opts?.peeks ?? 1,
    flippedCells: [],
    answerCards: [],
    openPeek: null,
    removedTaskKeys: [],
    holdingGrilleKeys: [],
    revealingCatapultKeys: [],
    brokenCatapultKeys: [],
  });
  return game;
}

function mountPage() {
  return mount(GamePage, {
    global: {
      stubs: {
        QDialog: {
          // Only render body when open — otherwise persistent dialogs leak copy into text().
          template: '<div v-if="modelValue" class="q-dialog-stub"><slot /></div>',
          props: ['modelValue'],
        },
        QCard: { template: '<div><slot /></div>' },
        QCardSection: { template: '<div><slot /></div>' },
        QCardActions: { template: '<div><slot /></div>' },
        QBtn: {
          template: '<button @click="$emit(\'click\')"><slot />{{ label }}</button>',
          props: ['label', 'flat', 'color', 'disable'],
        },
        QIcon: { template: '<i :data-name="name" />', props: ['name', 'size'] },
        QBanner: { template: '<div><slot /></div>' },
        QCircularProgress: {
          template:
            '<div class="progress-stub" :data-color="color" :data-max="max" :data-value="value" :data-track="trackColor" />',
          props: ['min', 'max', 'value', 'size', 'thickness', 'color', 'trackColor'],
        },
      },
    },
  });
}

describe('GamePage solo leftover presence (SC-PRESENCE-09/16/19)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('SC-PRESENCE-16: leftover shows ∞ on both steps and peeks', async () => {
    seedLeftoverPlaying({ budgetsInfinite: true, steps: 0, peeks: 0 });
    const wrapper = mountPage();
    await flushPromises();

    const values = wrapper.findAll('.presence-budgets .budget-value');
    expect(values).toHaveLength(2);
    expect(values[0]!.text()).toBe('game.budgetInfinity');
    expect(values[1]!.text()).toBe('game.budgetInfinity');

    wrapper.unmount();
  });

  it('SC-PRESENCE-09: leftover 1 eligible + maxSeats≥2 → red ring (not via turnBudgetSeconds)', async () => {
    seedLeftoverPlaying({ budgetsInfinite: true, maxSeats: 2 });
    const wrapper = mountPage();
    await flushPromises();

    const progress = wrapper.find('.presence-slot--own .progress-stub');
    expect(progress.exists()).toBe(true);
    expect(progress.attributes('data-color')).toBe('negative');
    expect(useGameStore().turnBudgetSeconds).toBe(60);
    expect(useGameStore().maxSeats).toBe(2);

    wrapper.unmount();
  });

  it('SC-PRESENCE-09: ≥2 eligible seats → blue ring at same 60s budget', async () => {
    const game = seedLeftoverPlaying({ budgetsInfinite: false });
    game.$patch({
      maxSeats: 2,
      budgetsInfinite: false,
      seats: [
        baseSeat([{ pieceId: '0', row: 3, col: 3, finished: false, trapped: false }]),
        baseSeat([{ pieceId: '0', row: 3, col: 4, finished: false, trapped: false }], 's2', 2),
      ],
      turnBudgetSeconds: 60,
      turnUntil: Date.now() + 60_000,
    });
    const wrapper = mountPage();
    await flushPromises();

    const progress = wrapper.find('.presence-slot--own .progress-stub');
    expect(progress.exists()).toBe(true);
    expect(progress.attributes('data-color')).toBe('primary');

    wrapper.unmount();
  });

  it('SC-PRESENCE-19: leftover becoming infinite opens soloUnlimitedModal', async () => {
    seedLeftoverPlaying({ budgetsInfinite: false, maxSeats: 2 });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).not.toContain('game.soloUnlimitedModal');

    useGameStore().budgetsInfinite = true;
    await flushPromises();

    expect(wrapper.text()).toContain('game.soloUnlimitedModal');

    wrapper.unmount();
  });
});

describe('GamePage single-player presence (SC-PRESENCE-38…42)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('SC-PRESENCE-38: single-player shows numeric budgets (not infinity)', async () => {
    seedSinglePlayerPlaying({ steps: 3, peeks: 2 });
    const wrapper = mountPage();
    await flushPromises();

    const values = wrapper.findAll('.presence-budgets .budget-value');
    expect(values).toHaveLength(2);
    expect(values[0]!.text()).toBe('3');
    expect(values[1]!.text()).toBe('2');
    expect(wrapper.text()).not.toContain('game.budgetInfinity');

    wrapper.unmount();
  });

  it('SC-PRESENCE-39: maxSeats=1 hides turn ring even with stale turnUntil', async () => {
    seedSinglePlayerPlaying({ turnUntil: Date.now() + 60_000 });
    const wrapper = mountPage();
    await flushPromises();

    const game = useGameStore();
    expect(game.maxSeats).toBe(1);
    expect(game.turnUntil).toBeGreaterThan(0);

    const progress = wrapper.find('.presence-slot--own .progress-stub');
    expect(progress.exists()).toBe(true);
    expect(progress.attributes('data-color')).toBe('transparent');
    expect(progress.attributes('data-track')).toBe('transparent');
    expect(Number(progress.attributes('data-value'))).toBe(0);

    wrapper.unmount();
  });

  it('SC-PRESENCE-40: maxSeats=1 does not open unlimited modal on budgetsInfinite flip', async () => {
    seedSinglePlayerPlaying({ budgetsInfinite: false });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).not.toContain('game.soloUnlimitedModal');

    useGameStore().budgetsInfinite = true;
    await flushPromises();

    expect(wrapper.text()).not.toContain('game.soloUnlimitedModal');

    wrapper.unmount();
  });

  it('SC-PRESENCE-41: finite budget increase plays +N fall animation', async () => {
    const game = seedSinglePlayerPlaying({ steps: 1, peeks: 1 });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.findAll('.budget-fall')).toHaveLength(0);

    game.steps = 2;
    game.peeks = 2;
    await flushPromises();

    const falls = wrapper.findAll('.budget-fall');
    expect(falls.length).toBeGreaterThanOrEqual(2);
    expect(falls.some((f) => f.text() === '+1')).toBe(true);

    wrapper.unmount();
  });

  it('SC-PRESENCE-42: single-player hides end-turn despite finite own turn', async () => {
    seedSinglePlayerPlaying({ steps: 2, peeks: 1 });
    const wrapper = mountPage();
    await flushPromises();

    const game = useGameStore();
    expect(game.maxSeats).toBe(1);
    expect(game.budgetsInfinite).toBe(false);
    expect(game.canSendEndTurn).toBe(false);
    expect(wrapper.find('.end-turn-affordance').exists()).toBe(false);

    wrapper.unmount();
  });
});
