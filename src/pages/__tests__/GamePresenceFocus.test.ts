import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GamePage from '@/pages/GamePage.vue';
import { touristLayoutGrid } from '@/lib/boardGeometry';
import { useGameStore, type GameSeat } from '@/stores/game';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pageSrc = readFileSync(path.resolve(__dirname, '../GamePage.vue'), 'utf8');

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

/** Extract a CSS rule body for a class from the SFC (jsdom does not resolve scoped CSS). */
function cssRuleBody(className: string): string {
  const re = new RegExp(`\\.${className}\\s*\\{([^}]+)\\}`, 'm');
  const m = pageSrc.match(re);
  expect(m, `missing .${className} rule`).toBeTruthy();
  return m![1]!;
}

type Box = { left: number; top: number; right: number; bottom: number };

function boxesOverlap(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
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

  it('SC-PRESENCE-30 / SC-SAY-07: clock-axis placement (say 12 / focus 9 / end-turn 3)', async () => {
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

    // Authoritative CSS (jsdom may not resolve scoped rules via getComputedStyle).
    const sayCss = cssRuleBody('say-affordance');
    const focusCss = cssRuleBody('focus-affordance');
    const endCss = cssRuleBody('end-turn-affordance');

    expect(sayCss).toMatch(/top:\s*-40px/);
    expect(sayCss).toMatch(/left:\s*50%/);
    expect(sayCss).toMatch(/translateX\(-50%\)/);
    expect(sayCss).not.toMatch(/right:/);

    expect(focusCss).toMatch(/top:\s*50%/);
    expect(focusCss).toMatch(/left:\s*-8px/);
    expect(focusCss).toMatch(/translateY\(-50%\)/);
    expect(focusCss).not.toMatch(/right:/);

    expect(endCss).toMatch(/top:\s*50%/);
    expect(endCss).toMatch(/right:\s*-8px/);
    expect(endCss).toMatch(/translateY\(-50%\)/);

    // Geometry clock-axis (marker 96px, circular chrome 36px) — DOM order alone is insufficient.
    const markerW = 96;
    const markerH = 96;
    const btn = 36;
    const sayCenterX = markerW * 0.5;
    const sayCenterY = -40 + btn / 2;
    const focusLeft = -8;
    const focusCenterX = focusLeft + btn / 2;
    const focusCenterY = markerH * 0.5;
    const endRight = markerW + 8;
    const endCenterX = endRight - btn / 2;
    const endCenterY = markerH * 0.5;

    expect(sayCenterX / markerW).toBeCloseTo(0.5, 5);
    expect(focusLeft).toBeLessThan(0);
    expect(focusCenterX).toBeLessThan(sayCenterX);
    expect(endCenterX).toBeGreaterThan(sayCenterX);
    expect(endRight).toBeGreaterThan(markerW);

    // Circular hit areas do not overlap (centers ≥ 36px apart).
    const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
    expect(dist(sayCenterX, sayCenterY, focusCenterX, focusCenterY)).toBeGreaterThanOrEqual(btn);
    expect(dist(sayCenterX, sayCenterY, endCenterX, endCenterY)).toBeGreaterThanOrEqual(btn);
    expect(dist(focusCenterX, focusCenterY, endCenterX, endCenterY)).toBeGreaterThanOrEqual(btn);

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

  it('SC-PRESENCE-33 / SC-PRESENCE-14: clock positions without hit overlap; ready+say clear', async () => {
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
    const endTurn = marker.find('.end-turn-affordance');
    expect(say.exists()).toBe(true);
    expect(focus.exists()).toBe(true);
    expect(endTurn.exists()).toBe(true);

    // Clock geometry (design D3): say 12, focus 9, end-turn 3 — not vertical stack (focusTopPct=32).
    const markerW = 96;
    const markerH = 96;
    const btn = 36;
    const sayTop = -40;
    const sayBox: Box = {
      left: markerW * 0.5 - btn / 2,
      top: sayTop,
      right: markerW * 0.5 + btn / 2,
      bottom: sayTop + btn,
    };
    const focusBox: Box = {
      left: -8,
      top: markerH * 0.5 - btn / 2,
      right: -8 + btn,
      bottom: markerH * 0.5 + btn / 2,
    };
    // right: -8 → right edge = W+8; left = W+8-36
    const endBox: Box = {
      left: markerW + 8 - btn,
      top: markerH * 0.5 - btn / 2,
      right: markerW + 8,
      bottom: markerH * 0.5 + btn / 2,
    };

    expect(sayBox.left + btn / 2).toBeCloseTo(markerW * 0.5, 5);
    expect(focusBox.left).toBeLessThan(0);
    expect(endBox.right).toBeGreaterThan(markerW);
    expect(boxesOverlap(sayBox, focusBox)).toBe(false);
    expect(boxesOverlap(sayBox, endBox)).toBe(false);
    expect(boxesOverlap(focusBox, endBox)).toBe(false);
    // Say remains higher than focus (SC-PRESENCE-33 historic sense).
    expect(sayBox.top + btn / 2).toBeLessThan(focusBox.top + btn / 2);

    // Ready TL + say 12 co-visible: hit boxes must not intersect (D3 top: -40px).
    const readyCss = cssRuleBody('ready-affordance');
    expect(readyCss).toMatch(/top:\s*-4px/);
    expect(readyCss).toMatch(/left:\s*-4px/);
    // Conservative ready size (padding 2×8 + short RU label ≈ 18×48).
    const readyBox: Box = { left: -4, top: -4, right: -4 + 48, bottom: -4 + 18 };
    expect(boxesOverlap(sayBox, readyBox)).toBe(false);
    // Old top:-32 would overlap ready:
    const oldSayBox: Box = { ...sayBox, top: -32, bottom: -32 + btn };
    expect(boxesOverlap(oldSayBox, readyBox)).toBe(true);

    // Say-picker stays marker-centered above avatar (SC-SAY-15 / D3).
    const pickerCss = cssRuleBody('say-picker');
    expect(pickerCss).toMatch(/left:\s*50%/);
    expect(pickerCss).toMatch(/bottom:\s*calc\(100%\s*\+\s*28px\)/);

    wrapper.unmount();
  });
});
