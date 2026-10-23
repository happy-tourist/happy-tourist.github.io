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

/** Transparent hit chrome — no solid fill / medallion box-shadow (D1 / D4). */
function assertTransparentAffordanceChrome(css: string) {
  expect(css).toMatch(/background:\s*transparent/);
  expect(css).not.toMatch(/background:\s*rgba\(/);
  expect(css).not.toMatch(/background:\s*#[0-9a-fA-F]{3,8}/);
  expect(css).not.toMatch(/box-shadow:/);
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

  it('SC-PRESENCE-30 / SC-SAY-07 / SC-PRESENCE-17: say@12 + end-turn@3; focus under end-turn at avatar square corner', async () => {
    seedPlaying({
      pieces: [
        { pieceId: '0', row: 3, col: 3, finished: false, trapped: false },
        { pieceId: '1', row: 3, col: 4, finished: false, trapped: false },
      ],
    });
    const wrapper = mountPage();
    await flushPromises();

    const own = wrapper.find('.presence-slot--own');
    const marker = own.find('.presence-marker');
    expect(marker.exists()).toBe(true);
    const say = marker.find('.say-affordance');
    const endTurn = marker.find('.end-turn-affordance');
    const focus = marker.find('[data-test-id="focus-actionable"]');
    expect(say.exists()).toBe(true);
    expect(endTurn.exists()).toBe(true);
    expect(focus.exists()).toBe(true);
    expect(focus.classes()).toContain('focus-affordance');
    // Focus not in budgets stack.
    expect(own.find('.presence-budgets .focus-affordance').exists()).toBe(false);

    // Illustrated PNG glyphs — not Material q-icon.
    expect(say.find('img.board-action-icon').exists()).toBe(true);
    expect(focus.find('img.board-action-icon').exists()).toBe(true);
    expect(endTurn.find('img.board-action-icon').exists()).toBe(true);
    expect(say.find('i').exists()).toBe(false);
    expect(focus.find('i').exists()).toBe(false);
    expect(endTurn.find('i').exists()).toBe(false);

    const sayCss = cssRuleBody('say-affordance');
    const focusCss = cssRuleBody('focus-affordance');
    const endCss = cssRuleBody('end-turn-affordance');
    const glyphCss = cssRuleBody('board-action-icon');

    expect(glyphCss).toMatch(/width:\s*36px/);
    expect(glyphCss).toMatch(/height:\s*36px/);

    expect(sayCss).toMatch(/top:\s*0/);
    expect(sayCss).toMatch(/left:\s*50%/);
    expect(sayCss).toMatch(/translate\(-50%,\s*-50%\)/);
    expect(sayCss).toMatch(/width:\s*36px/);
    assertTransparentAffordanceChrome(sayCss);

    // Focus at bottom-right corner of 72px avatar square (±36px from marker center).
    expect(focusCss).toMatch(/left:\s*calc\(50%\s*\+\s*36px\)/);
    expect(focusCss).toMatch(/top:\s*calc\(50%\s*\+\s*36px\)/);
    expect(focusCss).toMatch(/translate\(-50%,\s*-50%\)/);
    expect(focusCss).toMatch(/width:\s*36px/);
    expect(focusCss).not.toMatch(/left:\s*0/);
    assertTransparentAffordanceChrome(focusCss);

    expect(endCss).toMatch(/top:\s*50%/);
    expect(endCss).toMatch(/left:\s*100%/);
    expect(endCss).toMatch(/translate\(-50%,\s*-50%\)/);
    expect(endCss).toMatch(/width:\s*36px/);
    assertTransparentAffordanceChrome(endCss);

    const markerW = 96;
    const markerH = 96;
    const btn = 36;
    const sayCenterX = markerW * 0.5;
    const sayCenterY = 0;
    const endCenterX = markerW;
    const endCenterY = markerH * 0.5;
    const focusCenterX = markerW * 0.5 + 36;
    const focusCenterY = markerH * 0.5 + 36;

    expect(sayCenterX / markerW).toBeCloseTo(0.5, 5);
    expect(endCenterX).toBe(markerW);
    expect(focusCenterY).toBeGreaterThan(endCenterY);

    const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
    expect(dist(sayCenterX, sayCenterY, endCenterX, endCenterY)).toBeGreaterThanOrEqual(btn);
    expect(dist(endCenterX, endCenterY, focusCenterX, focusCenterY)).toBeGreaterThanOrEqual(btn);

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

  it('SC-PRESENCE-33 / SC-PRESENCE-14 / SC-SAY-15: say@12 end-turn@3; focus under end-turn; picker right', async () => {
    seedPlaying({
      pieces: [
        { pieceId: '0', row: 3, col: 3, finished: false, trapped: false },
        { pieceId: '1', row: 3, col: 4, finished: false, trapped: false },
      ],
    });
    const wrapper = mountPage();
    await flushPromises();

    const own = wrapper.find('.presence-slot--own');
    const marker = own.find('.presence-marker');
    const say = marker.find('.say-affordance');
    const endTurn = marker.find('.end-turn-affordance');
    const focus = marker.find('.focus-affordance');
    expect(say.exists()).toBe(true);
    expect(focus.exists()).toBe(true);
    expect(endTurn.exists()).toBe(true);
    expect(own.find('.presence-budgets .focus-affordance').exists()).toBe(false);

    const markerW = 96;
    const markerH = 96;
    const btn = 36;
    const sayCenterX = markerW * 0.5;
    const sayCenterY = 0;
    const endCenterX = markerW;
    const endCenterY = markerH * 0.5;
    const focusCenterX = markerW * 0.5 + 36;
    const focusCenterY = markerH * 0.5 + 36;

    expect(sayCenterX).toBeCloseTo(markerW * 0.5, 5);
    expect(endCenterX).toBe(markerW);
    const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
    expect(dist(sayCenterX, sayCenterY, endCenterX, endCenterY)).toBeGreaterThanOrEqual(btn);
    expect(dist(endCenterX, endCenterY, focusCenterX, focusCenterY)).toBeGreaterThanOrEqual(btn);

    const readyCss = cssRuleBody('ready-affordance');
    expect(readyCss).toMatch(/top:\s*-4px/);
    expect(readyCss).toMatch(/left:\s*-4px/);

    const pickerCss = cssRuleBody('say-picker');
    expect(pickerCss).toMatch(/left:\s*50%/);
    expect(pickerCss).toMatch(/bottom:\s*calc\(100%\s*\+\s*24px\)/);
    expect(pickerCss).toMatch(/transform:\s*none/);
    expect(pickerCss).not.toMatch(/translateX\(-50%\)/);

    assertTransparentAffordanceChrome(cssRuleBody('say-affordance'));
    assertTransparentAffordanceChrome(cssRuleBody('focus-affordance'));
    assertTransparentAffordanceChrome(cssRuleBody('end-turn-affordance'));
    expect(say.find('img.board-action-icon').exists()).toBe(true);

    expect(pageSrc).toMatch(/class="ready-affordance"/);
    expect(pageSrc).toMatch(/directions_walk|visibility/);

    wrapper.unmount();
  });
});
