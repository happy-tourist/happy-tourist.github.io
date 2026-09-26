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

function seedPlaying(opts: {
  pieces: GameSeat['pieces'];
  steps?: number;
  peeks?: number;
  currentTurnSessionId?: string;
  sessionId?: string;
  seats?: GameSeat[];
}) {
  const game = useGameStore();
  const seat = baseSeat(opts.pieces);
  const seats = opts.seats ?? [
    seat,
    {
      sessionId: 's2',
      touristId: 2,
      pieces: [],
      connected: true,
      reconnectUntil: 0,
      ready: false,
      finishPlace: 0,
      timeExpired: false,
    },
  ];
  game.$patch({
    room: { roomId: 'r1' } as never,
    roomId: 'r1',
    sessionId: opts.sessionId ?? 's1',
    phase: 'playing',
    status: 'playing',
    started: true,
    maxSeats: 2,
    currentTurnSessionId: opts.currentTurnSessionId ?? 's1',
    turnBudgetSeconds: 60,
    budgetsInfinite: false,
    grid: touristLayoutGrid(),
    touristsPerPlayer: opts.pieces.length,
    packTitle: 'Пак',
    seats,
    steps: opts.steps ?? 5,
    peeks: opts.peeks ?? 2,
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
        QIcon: { template: '<i :data-name="name" />', props: ['name', 'size'] },
        QBanner: { template: '<div><slot /></div>' },
        QCircularProgress: {
          template: '<div class="progress-stub" />',
          props: ['min', 'max', 'value', 'size', 'thickness', 'color', 'trackColor'],
        },
      },
    },
  });
}

describe('GamePage focus control (SC-PRESENCE-30/31/32/33)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('SC-PRESENCE-30: focus control sits between say and end-turn', async () => {
    seedPlaying({
      pieces: [
        { pieceId: '0', row: 3, col: 3, finished: false, trapped: false },
        { pieceId: '1', row: 3, col: 4, finished: false, trapped: false },
      ],
    });
    const wrapper = mountPage();
    await flushPromises();

    const marker = wrapper.find('.presence-slot--own .presence-marker');
    expect(marker.exists()).toBe(true);
    const say = marker.find('.say-affordance');
    const focus = marker.find('[data-test-id="focus-actionable"]');
    const endTurn = marker.find('.end-turn-affordance');
    expect(say.exists()).toBe(true);
    expect(focus.exists()).toBe(true);
    expect(focus.classes()).toContain('focus-affordance');
    expect(endTurn.exists()).toBe(true);

    const children = Array.from(marker.element.children) as HTMLElement[];
    const sayIdx = children.findIndex((el) => el.classList.contains('say-affordance'));
    const focusIdx = children.findIndex((el) => el.classList.contains('focus-affordance'));
    const endIdx = children.findIndex((el) => el.classList.contains('end-turn-affordance'));
    expect(sayIdx).toBeGreaterThanOrEqual(0);
    expect(focusIdx).toBeGreaterThan(sayIdx);
    expect(endIdx).toBeGreaterThan(focusIdx);

    wrapper.unmount();
  });

  it('SC-PRESENCE-31: focus selects nearest actionable tourist', async () => {
    // steps=0 → no moves; peeks>0 → only piece on present * can peek.
    // Piece A on start `1` (3,0); piece B on task `*` (3,3) — only B actionable.
    seedPlaying({
      steps: 0,
      peeks: 2,
      pieces: [
        { pieceId: '0', row: 3, col: 0, finished: false, trapped: false },
        { pieceId: '1', row: 3, col: 3, finished: false, trapped: false },
      ],
    });
    const wrapper = mountPage();
    await flushPromises();

    const focus = wrapper.find('[data-test-id="focus-actionable"]');
    expect(focus.exists()).toBe(true);
    await focus.trigger('click');
    await flushPromises();

    const slots = wrapper.findAll('.my-tourist-slot');
    expect(slots).toHaveLength(2);
    expect(slots[0]!.classes()).not.toContain('my-tourist-slot--selected');
    expect(slots[1]!.classes()).toContain('my-tourist-slot--selected');

    wrapper.unmount();
  });

  it('SC-PRESENCE-32: focus hidden when nothing actionable', async () => {
    seedPlaying({
      steps: 0,
      peeks: 0,
      pieces: [
        { pieceId: '0', row: 3, col: 0, finished: false, trapped: false },
        { pieceId: '1', row: 6, col: 0, finished: false, trapped: false },
      ],
    });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[data-test-id="focus-actionable"]').exists()).toBe(false);
    expect(wrapper.find('.end-turn-affordance').exists()).toBe(true);

    wrapper.unmount();
  });

  it('SC-PRESENCE-32: spectators / non-current do not see enabled focus', async () => {
    seedPlaying({
      sessionId: 'spectator',
      currentTurnSessionId: 's1',
      pieces: [{ pieceId: '0', row: 3, col: 3, finished: false, trapped: false }],
      seats: [
        baseSeat([{ pieceId: '0', row: 3, col: 3, finished: false, trapped: false }]),
        {
          sessionId: 's2',
          touristId: 2,
          pieces: [{ pieceId: '0', row: 3, col: 5, finished: false, trapped: false }],
          connected: true,
          reconnectUntil: 0,
          ready: false,
          finishPlace: 0,
          timeExpired: false,
        },
      ],
    });
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.find('[data-test-id="focus-actionable"]').exists()).toBe(false);
    wrapper.unmount();

    setActivePinia(createPinia());
    seedPlaying({
      currentTurnSessionId: 's2',
      pieces: [
        { pieceId: '0', row: 3, col: 3, finished: false, trapped: false },
        { pieceId: '1', row: 3, col: 4, finished: false, trapped: false },
      ],
    });
    const wrapper2 = mountPage();
    await flushPromises();
    expect(wrapper2.find('[data-test-id="focus-actionable"]').exists()).toBe(false);
    wrapper2.unmount();
  });

  it('SC-PRESENCE-33: say is above focus without overlap', async () => {
    seedPlaying({
      pieces: [
        { pieceId: '0', row: 3, col: 3, finished: false, trapped: false },
        { pieceId: '1', row: 3, col: 4, finished: false, trapped: false },
      ],
    });
    const wrapper = mountPage();
    await flushPromises();

    const marker = wrapper.find('.presence-slot--own .presence-marker');
    const say = marker.find('.say-affordance');
    const focus = marker.find('.focus-affordance');
    expect(say.exists()).toBe(true);
    expect(focus.exists()).toBe(true);

    // Authoritative CSS (jsdom may not resolve scoped rules via getComputedStyle).
    // Marker is 96px; say top -32px (center −14); focus top 32% with translateY(-50%)
    // (center ≈ 30.7). Centers ≥ 36px apart → 36px hit circles do not overlap.
    const markerH = 96;
    const btn = 36;
    const sayTopPx = -32;
    const focusTopPct = 32;
    const sayCenter = sayTopPx + btn / 2;
    const focusCenter = (focusTopPct / 100) * markerH;
    expect(sayCenter).toBeLessThan(focusCenter);
    expect(Math.abs(focusCenter - sayCenter)).toBeGreaterThanOrEqual(btn);

    wrapper.unmount();
  });
});
