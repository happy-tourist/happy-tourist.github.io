import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { touristLayoutGrid } from '@/lib/boardGeometry';
import GamePage from '@/pages/GamePage.vue';
import { useGameStore, type GameSeat } from '@/stores/game';
import enUS from '@/i18n/en-US';

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

/** Playing seed for knowledge presence (SC-PRESENCE-50…56; retired leftover/solo UX). */
function seedPlaying(opts?: {
  maxSeats?: number;
  knowledgeDelivered?: number;
  turnUntil?: number;
  finishPlace?: number;
}) {
  const game = useGameStore();
  const seat = {
    ...baseSeat([{ pieceId: '0', row: 3, col: 3, finished: false, trapped: false }]),
    finishPlace: opts?.finishPlace ?? 0,
  };
  game.$patch({
    room: { roomId: 'r1' } as never,
    roomId: 'r1',
    sessionId: 's1',
    phase: 'playing',
    status: 'playing',
    started: true,
    maxSeats: opts?.maxSeats ?? 2,
    currentTurnSessionId: 's1',
    turnUntil: opts?.turnUntil ?? Date.now() + 60_000,
    turnBudgetSeconds: 60,
    grid: touristLayoutGrid(),
    touristsPerPlayer: 1,
    packTitle: 'Пак',
    seats: [seat, baseSeat([], 's2', 2)],
    knowledgeDelivered: opts?.knowledgeDelivered ?? 3,
    knowledgePieces: {},
    knowledgeSynced: true,
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

describe('GamePage knowledge presence (SC-PRESENCE-50…56; retired solo leftover)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('SC-PRESENCE-50: shows knowledge counter; no steps/peeks/∞', async () => {
    seedPlaying({ knowledgeDelivered: 4 });
    const wrapper = mountPage();
    await flushPromises();

    const value = wrapper.find('[data-testid="knowledge-counter"] .knowledge-value');
    expect(value.exists()).toBe(true);
    expect(value.text()).toBe('4');
    expect(wrapper.find('.presence-budgets').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('∞');
    expect(wrapper.text()).not.toContain('game.budgetInfinity');

    wrapper.unmount();
  });

  it('SC-PRESENCE-54: no turn ring even with synced turnUntil', async () => {
    seedPlaying({ turnUntil: Date.now() + 60_000, maxSeats: 2 });
    const wrapper = mountPage();
    await flushPromises();

    const progress = wrapper.find('.presence-slot--own .progress-stub');
    expect(progress.exists()).toBe(true);
    expect(progress.attributes('data-color')).toBe('transparent');
    expect(Number(progress.attributes('data-value'))).toBe(0);

    wrapper.unmount();
  });

  it('SC-PRESENCE-55: end-turn never shown on own turn', async () => {
    seedPlaying({ maxSeats: 2 });
    const wrapper = mountPage();
    await flushPromises();

    expect(useGameStore().canSendEndTurn).toBe(false);
    expect(wrapper.find('.end-turn-affordance').exists()).toBe(false);

    wrapper.unmount();
  });

  it('retired solo unlimited / timer end modals never open', async () => {
    seedPlaying({ maxSeats: 2 });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).not.toContain('game.soloUnlimitedModal');
    expect(wrapper.text()).not.toContain('game.timeExpiredModal');
    expect(enUS.game).not.toHaveProperty('soloUnlimitedModal');
    expect(enUS.game).not.toHaveProperty('timeExpiredModal');

    wrapper.unmount();
  });

  it('SC-PRESENCE-56 / SC-FINISH-34: no place badge; knowledge modal i18n has no place', async () => {
    seedPlaying({ finishPlace: 1, knowledgeDelivered: 1 });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.presence-place-badge').exists()).toBe(false);
    expect(enUS.game.knowledgeDeliveredModal).toMatch(/\{n\}/);
    expect(enUS.game.knowledgeDeliveredModal).not.toMatch(/-й/);
    expect(enUS.game).not.toHaveProperty('finishPlaceModal');

    wrapper.unmount();
  });
});
