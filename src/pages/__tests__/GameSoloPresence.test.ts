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

function baseSeat(pieces: GameSeat['pieces']): GameSeat {
  return {
    sessionId: 's1',
    touristId: 1,
    pieces,
    connected: true,
    reconnectUntil: 0,
    ready: false,
    finishPlace: 0,
    timeExpired: false,
  };
}

function seedSoloPlaying(opts?: { budgetsInfinite?: boolean; steps?: number; peeks?: number }) {
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
            '<div class="progress-stub" :data-color="color" :data-max="max" :data-value="value" />',
          props: ['min', 'max', 'value', 'size', 'thickness', 'color', 'trackColor'],
        },
      },
    },
  });
}

describe('GamePage solo presence (SC-PRESENCE-09/16/19)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('SC-PRESENCE-16: solo shows ∞ on both steps and peeks', async () => {
    seedSoloPlaying({ budgetsInfinite: true, steps: 0, peeks: 0 });
    const wrapper = mountPage();
    await flushPromises();

    const values = wrapper.findAll('.presence-budgets .budget-value');
    expect(values).toHaveLength(2);
    expect(values[0]!.text()).toBe('game.budgetInfinity');
    expect(values[1]!.text()).toBe('game.budgetInfinity');

    wrapper.unmount();
  });

  it('SC-PRESENCE-09: 1 eligible seat → red ring color (not via turnBudgetSeconds)', async () => {
    seedSoloPlaying({ budgetsInfinite: true });
    const wrapper = mountPage();
    await flushPromises();

    const progress = wrapper.find('.presence-slot--own .progress-stub');
    expect(progress.exists()).toBe(true);
    expect(progress.attributes('data-color')).toBe('negative');
    expect(useGameStore().turnBudgetSeconds).toBe(60);

    wrapper.unmount();
  });

  it('SC-PRESENCE-09: ≥2 eligible seats → blue ring at same 60s budget', async () => {
    const game = seedSoloPlaying({ budgetsInfinite: false });
    game.$patch({
      maxSeats: 2,
      budgetsInfinite: false,
      seats: [
        baseSeat([{ pieceId: '0', row: 3, col: 3, finished: false, trapped: false }]),
        {
          sessionId: 's2',
          touristId: 2,
          pieces: [{ pieceId: '0', row: 3, col: 4, finished: false, trapped: false }],
          connected: true,
          reconnectUntil: 0,
          ready: false,
          finishPlace: 0,
          timeExpired: false,
        },
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

  it('SC-PRESENCE-19: becoming infinite opens soloUnlimitedModal', async () => {
    seedSoloPlaying({ budgetsInfinite: false });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).not.toContain('game.soloUnlimitedModal');

    useGameStore().budgetsInfinite = true;
    await flushPromises();

    expect(wrapper.text()).toContain('game.soloUnlimitedModal');

    wrapper.unmount();
  });
});
