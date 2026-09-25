import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GamePage from '@/pages/GamePage.vue';
import { touristLayoutGrid } from '@/lib/boardGeometry';
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

function seatWithPieces(count: number): GameSeat {
  return {
    sessionId: 's1',
    touristId: 1,
    pieces: Array.from({ length: count }, (_, i) => ({
      pieceId: String(i),
      row: 3,
      col: 3 + i,
      finished: false,
      trapped: false,
    })),
    connected: true,
    reconnectUntil: 0,
    ready: false,
    finishPlace: 0,
    timeExpired: false,
  };
}

function seedPlayingSeat(count: number) {
  const game = useGameStore();
  const seat = seatWithPieces(count);
  game.$patch({
    room: { roomId: 'r1' } as never,
    roomId: 'r1',
    sessionId: 's1',
    phase: 'playing',
    status: 'playing',
    started: true,
    maxSeats: 2,
    currentTurnSessionId: 's1',
    turnBudgetSeconds: 60,
    grid: touristLayoutGrid(),
    touristsPerPlayer: count,
    packTitle: 'Пак',
    seats: [seat],
    steps: 5,
    peeks: 2,
    flippedCells: [],
    answerCards: [
      { id: 'a1', content: 'Четыре', description: '' },
      { id: 'a2', content: 'Пять', description: '' },
    ],
    openPeek: null,
    removedTaskKeys: [],
    holdingGrilleKeys: [],
    revealingCatapultKeys: [],
    brokenCatapultKeys: [],
  });
  return game;
}

describe('GamePage board / peek / strip (SC-BOARD-42/46, SC-PIECE-52)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  function mountPage() {
    return mount(GamePage, {
      global: {
        stubs: {
          QDialog: {
            template: '<div class="q-dialog-stub"><slot /></div>',
            props: ['modelValue'],
          },
          QCard: { template: '<div><slot /></div>' },
          QCardSection: { template: '<div><slot /></div>' },
          QCardActions: { template: '<div><slot /></div>' },
          QBtn: {
            template: '<button @click="$emit(\'click\')"><slot />{{ label }}</button>',
            props: ['label', 'flat', 'color', 'disable'],
          },
          QChip: {
            template: '<button class="q-chip-stub" @click="$emit(\'click\')"><slot /></button>',
            props: ['clickable', 'outline', 'color', 'disable'],
          },
          QIcon: { template: '<i />', props: ['name', 'size'] },
          QBanner: { template: '<div><slot /></div>' },
          QCircularProgress: {
            template: '<div class="progress-stub" />',
            props: ['min', 'max', 'value', 'size', 'thickness', 'color', 'trackColor'],
          },
        },
      },
    });
  }

  it('SC-PIECE-52: strip slot count follows touristsPerPlayer / pieces', async () => {
    seedPlayingSeat(1);
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.findAll('.my-tourist-slot')).toHaveLength(1);
    wrapper.unmount();
  });

  it('SC-BOARD-42: flipped difficulty digit is public on the tile', async () => {
    const game = seedPlayingSeat(2);
    game.flippedCells = [{ key: '1,3', taskId: 't1', difficulty: 3 }];
    const wrapper = mountPage();
    await flushPromises();
    const digit = wrapper.find('.tile-difficulty');
    expect(digit.exists()).toBe(true);
    expect(digit.text()).toBe('3');
    wrapper.unmount();
  });

  it('SC-BOARD-46: shared peek modal shows question; peeker can place/submit', async () => {
    const game = seedPlayingSeat(2);
    game.openPeek = {
      sessionId: 's1',
      pieceId: '0',
      row: 3,
      col: 3,
      taskId: 't1',
      question: 'Сколько будет 2+2?',
      difficulty: 2,
      reward: 2,
      placements: ['', ''],
    };
    const sendPeekPlace = vi.spyOn(game, 'sendPeekPlace').mockReturnValue(true);
    const sendPeekSubmit = vi.spyOn(game, 'sendPeekSubmit').mockReturnValue(true);

    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.text()).toContain('Сколько будет 2+2?');
    expect(wrapper.findAll('.peek-slot')).toHaveLength(2);

    const chips = wrapper.findAll('.q-chip-stub');
    expect(chips.length).toBeGreaterThan(0);
    await chips[0]!.trigger('click');
    expect(sendPeekPlace).toHaveBeenCalled();

    game.openPeek = {
      ...game.openPeek,
      placements: ['a1', 'a2'],
    };
    await flushPromises();
    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('game.peekSubmit'));
    expect(submitBtn).toBeTruthy();
    expect(submitBtn!.attributes('disable')).toBeFalsy();
    await submitBtn!.trigger('click');
    expect(sendPeekSubmit).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('SC-BOARD-46: spectators see peek read-only without submit', async () => {
    const game = seedPlayingSeat(2);
    game.sessionId = 'spectator';
    game.seats = [
      {
        ...seatWithPieces(2),
        sessionId: 'other',
      },
    ];
    game.openPeek = {
      sessionId: 'other',
      pieceId: '0',
      row: 3,
      col: 3,
      taskId: 't1',
      question: 'Вопрос для всех',
      difficulty: 1,
      reward: 1,
      placements: ['a1'],
    };

    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.text()).toContain('Вопрос для всех');
    expect(wrapper.text()).toContain('game.peekSpectatorHint');
    expect(wrapper.text()).not.toContain('game.peekSubmit');
    wrapper.unmount();
  });
});
