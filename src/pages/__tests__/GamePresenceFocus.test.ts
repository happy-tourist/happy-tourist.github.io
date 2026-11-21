import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GamePage from '@/pages/GamePage.vue';
import { touristLayoutGrid } from '@/lib/boardGeometry';
import { useGameStore, type GameSeat } from '@/stores/game';
import enUS from '@/i18n/en-US';

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

function seedPlaying(opts: {
  pieces: GameSeat['pieces'];
  currentTurnSessionId?: string;
  sessionId?: string;
  seats?: GameSeat[];
  holdingGrilleKeys?: string[];
  knowledgeDelivered?: number;
  knowledgePieces?: Record<string, number>;
  finishPlace?: number;
  turnUntil?: number;
  maxSeats?: number;
}) {
  const game = useGameStore();
  const seat = {
    ...baseSeat(opts.pieces),
    finishPlace: opts.finishPlace ?? 0,
  };
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
    maxSeats: opts.maxSeats ?? 2,
    currentTurnSessionId: opts.currentTurnSessionId ?? 's1',
    turnBudgetSeconds: 60,
    turnUntil: opts.turnUntil ?? Date.now() + 60_000,
    grid: touristLayoutGrid(),
    touristsPerPlayer: opts.pieces.length || 4,
    packTitle: 'Пак',
    seats,
    knowledgeDelivered: opts.knowledgeDelivered ?? 0,
    knowledgePieces: opts.knowledgePieces ?? {},
    // Tests patch knowledge directly — mark synced so +N fall watch is armed.
    knowledgeSynced: true,
    flippedCells: [],
    answerCards: [],
    openPeek: null,
    removedTaskKeys: [],
    holdingGrilleKeys: opts.holdingGrilleKeys ?? [],
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
          template: '<div v-if="modelValue !== false" class="q-dialog-stub"><slot /></div>',
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

describe('GamePage focus @3 + knowledge HUD (SC-PRESENCE-30…33/37/50…56)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('SC-PRESENCE-30 / SC-PRESENCE-53 / SC-PRESENCE-55: say@12 + focus@3; no end-turn', async () => {
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
    const focus = marker.find('[data-test-id="focus-actionable"]');
    expect(say.exists()).toBe(true);
    expect(focus.exists()).toBe(true);
    expect(focus.classes()).toContain('focus-affordance');
    expect(wrapper.find('.end-turn-affordance').exists()).toBe(false);
    expect(own.find('.presence-knowledge .focus-affordance').exists()).toBe(false);

    expect(say.find('img.board-action-icon').exists()).toBe(true);
    expect(focus.find('img.board-action-icon').exists()).toBe(true);
    expect(say.find('i').exists()).toBe(false);
    expect(focus.find('i').exists()).toBe(false);

    const sayCss = cssRuleBody('say-affordance');
    const focusCss = cssRuleBody('focus-affordance');
    const glyphCss = cssRuleBody('board-action-icon');

    expect(glyphCss).toMatch(/width:\s*36px/);
    expect(glyphCss).toMatch(/height:\s*36px/);

    expect(sayCss).toMatch(/top:\s*0/);
    expect(sayCss).toMatch(/left:\s*50%/);
    expect(sayCss).toMatch(/translate\(-50%,\s*-50%\)/);
    expect(sayCss).toMatch(/width:\s*36px/);
    assertTransparentAffordanceChrome(sayCss);

    // Focus at former end-turn slot: right-center / 3 o’clock.
    expect(focusCss).toMatch(/top:\s*50%/);
    expect(focusCss).toMatch(/left:\s*100%/);
    expect(focusCss).toMatch(/translate\(-50%,\s*-50%\)/);
    expect(focusCss).toMatch(/width:\s*36px/);
    assertTransparentAffordanceChrome(focusCss);

    expect(pageSrc).not.toMatch(/class="end-turn-affordance"/);
    expect(pageSrc).not.toMatch(/\.end-turn-affordance\s*\{/);

    const markerW = 96;
    const markerH = 96;
    const btn = 36;
    const sayCenterX = markerW * 0.5;
    const sayCenterY = 0;
    const focusCenterX = markerW;
    const focusCenterY = markerH * 0.5;

    const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
    expect(dist(sayCenterX, sayCenterY, focusCenterX, focusCenterY)).toBeGreaterThanOrEqual(btn);

    wrapper.unmount();
  });

  it('SC-PRESENCE-31: focus selects nearest actionable tourist', async () => {
    seedPlaying({
      pieces: [
        { pieceId: '0', row: 3, col: 0, finished: false, trapped: true, remainingTurns: 2 },
        { pieceId: '1', row: 3, col: 3, finished: false, trapped: false },
      ],
      holdingGrilleKeys: ['3,0'],
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
      pieces: [
        { pieceId: '0', row: 3, col: 0, finished: false, trapped: true, remainingTurns: 2 },
        { pieceId: '1', row: 6, col: 0, finished: false, trapped: true, remainingTurns: 2 },
      ],
      holdingGrilleKeys: ['3,0', '6,0'],
    });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[data-test-id="focus-actionable"]').exists()).toBe(false);
    expect(wrapper.find('.end-turn-affordance').exists()).toBe(false);

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

  it('SC-PRESENCE-33 / SC-PRESENCE-14 / SC-SAY-15: say@12 focus@3; picker right; no place badge', async () => {
    seedPlaying({
      pieces: [
        { pieceId: '0', row: 3, col: 3, finished: false, trapped: false },
        { pieceId: '1', row: 3, col: 4, finished: false, trapped: false },
      ],
      seats: [
        baseSeat([
          { pieceId: '0', row: 3, col: 3, finished: false, trapped: false },
          { pieceId: '1', row: 3, col: 4, finished: false, trapped: false },
        ]),
        {
          ...baseSeat([], 's2', 2),
          finishPlace: 1,
        },
      ],
    });
    const wrapper = mountPage();
    await flushPromises();

    const own = wrapper.find('.presence-slot--own');
    const marker = own.find('.presence-marker');
    const say = marker.find('.say-affordance');
    const focus = marker.find('.focus-affordance');
    expect(say.exists()).toBe(true);
    expect(focus.exists()).toBe(true);
    expect(wrapper.find('.end-turn-affordance').exists()).toBe(false);
    expect(wrapper.find('.presence-place-badge').exists()).toBe(false);

    const markerW = 96;
    const markerH = 96;
    const btn = 36;
    const sayCenterX = markerW * 0.5;
    const sayCenterY = 0;
    const focusCenterX = markerW;
    const focusCenterY = markerH * 0.5;

    const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
    expect(dist(sayCenterX, sayCenterY, focusCenterX, focusCenterY)).toBeGreaterThanOrEqual(btn);

    const readyCss = cssRuleBody('ready-affordance');
    expect(readyCss).toMatch(/top:\s*-4px/);
    expect(readyCss).toMatch(/left:\s*-4px/);

    const pickerCss = cssRuleBody('say-picker');
    expect(pickerCss).toMatch(/left:\s*50%/);
    expect(pickerCss).toMatch(/bottom:\s*calc\(100%\s*\+\s*24px\)/);
    expect(pickerCss).toMatch(/transform:\s*none/);

    assertTransparentAffordanceChrome(cssRuleBody('say-affordance'));
    assertTransparentAffordanceChrome(cssRuleBody('focus-affordance'));
    expect(say.find('img.board-action-icon').exists()).toBe(true);

    expect(pageSrc).toMatch(/class="ready-affordance"/);
    expect(pageSrc).not.toMatch(/directions_walk|name=["']visibility["']/);
    expect(pageSrc).not.toMatch(/presence-place-badge/);

    wrapper.unmount();
  });

  it('SC-PRESENCE-37: focus @3 CSS keeps 36×36 hit fully on circumference', () => {
    const focusCss = cssRuleBody('focus-affordance');
    expect(focusCss).toMatch(/top:\s*50%/);
    expect(focusCss).toMatch(/left:\s*100%/);
    expect(focusCss).toMatch(/width:\s*36px/);
    expect(focusCss).toMatch(/height:\s*36px/);
  });

  it('SC-PRESENCE-50: own knowledge counter; no steps/peeks', async () => {
    seedPlaying({
      pieces: [{ pieceId: '0', row: 3, col: 3, finished: false, trapped: false }],
      knowledgeDelivered: 7,
    });
    const wrapper = mountPage();
    await flushPromises();

    const counter = wrapper.find('[data-testid="knowledge-counter"]');
    expect(counter.exists()).toBe(true);
    expect(counter.find('.knowledge-value').text()).toBe('7');
    expect(wrapper.find('.presence-budgets').exists()).toBe(false);
    expect(wrapper.findAll('.budget-counter')).toHaveLength(0);
    expect(enUS.game.knowledgeCounterAria).toBe('Знания');

    wrapper.unmount();
  });

  it('SC-PRESENCE-51: +N fall only when delivered grows', async () => {
    const game = seedPlaying({
      pieces: [{ pieceId: '0', row: 3, col: 3, finished: false, trapped: false }],
      knowledgeDelivered: 2,
    });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.findAll('.budget-fall')).toHaveLength(0);

    game.knowledgeDelivered = 5;
    await flushPromises();

    const falls = wrapper.findAll('.budget-fall');
    expect(falls).toHaveLength(1);
    expect(falls[0]!.text()).toBe('+3');

    wrapper.unmount();
  });

  it('SC-PRESENCE-54: current turn shows timer ring (60s budget)', async () => {
    seedPlaying({
      pieces: [{ pieceId: '0', row: 3, col: 3, finished: false, trapped: false }],
      turnUntil: Date.now() + 60_000,
    });
    const wrapper = mountPage();
    await flushPromises();

    const progress = wrapper.find('.presence-slot--own .progress-stub');
    expect(progress.exists()).toBe(true);
    expect(progress.attributes('data-color')).toBe('primary');
    expect(Number(progress.attributes('data-value'))).toBeGreaterThan(50);

    wrapper.unmount();
  });

  it('SC-PRESENCE-06 / SC-PRESENCE-56: finished seat shows no place badge', async () => {
    seedPlaying({
      pieces: [
        { pieceId: '0', row: 4, col: 4, finished: true, trapped: false },
        { pieceId: '1', row: 4, col: 4, finished: true, trapped: false },
      ],
      finishPlace: 1,
      knowledgeDelivered: 6,
    });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.presence-place-badge').exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/Вы \d+-й/);
    expect(wrapper.text()).not.toContain('game.finishPlaceModal');

    wrapper.unmount();
  });

  it('SC-FINISH-31 / SC-FINISH-34: finishPlace 0→1 opens knowledge modal; finish vs cut copy', async () => {
    const game = seedPlaying({
      pieces: [
        { pieceId: '0', row: 4, col: 4, finished: true, trapped: false },
        { pieceId: '1', row: 3, col: 3, finished: false, trapped: false },
      ],
      knowledgeDelivered: 6,
      finishPlace: 0,
    });
    game.knowledgeOutcome = 'finish';
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[data-testid="knowledge-delivered-modal"]').exists()).toBe(false);

    const seat = game.seats.find((s) => s.sessionId === 's1');
    expect(seat).toBeTruthy();
    seat!.finishPlace = 1;
    await flushPromises();

    const modal = wrapper.find('[data-testid="knowledge-delivered-modal"]');
    expect(modal.exists()).toBe(true);
    expect(modal.text()).toContain('game.knowledgeDeliveredModal');
    expect(modal.text()).not.toContain('game.knowledgeDeliveredModalCut');
    expect(enUS.game.knowledgeDeliveredModal).toMatch(/\{n\}/);
    expect(enUS.game.knowledgeDeliveredModalCut).toMatch(/\{n\}/);
    expect(enUS.game.knowledgeDeliveredModalCut).toMatch(/которые успели/);
    expect(enUS.game.knowledgeDeliveredModalCut).not.toMatch(/что успели/);
    expect(enUS.game.knowledgeDeliveredModal).not.toBe(enUS.game.knowledgeDeliveredModalCut);
    expect(wrapper.text()).not.toContain('game.finishPlaceModal');
    expect(wrapper.find('.presence-place-badge').exists()).toBe(false);

    game.knowledgeOutcome = 'cut';
    await flushPromises();
    expect(wrapper.find('[data-testid="knowledge-delivered-modal"]').text()).toContain(
      'game.knowledgeDeliveredModalCut',
    );

    wrapper.unmount();
  });

  it('SC-FINISH-31: modal body follows late knowledge after finishPlace (transfer race)', async () => {
    // Live bind (not open-time snapshot) so Colyseus knowledge-after-finishPlace is correct.
    expect(pageSrc).toMatch(/knowledgeModalI18nKey,\s*\{\s*n:\s*game\.knowledgeDelivered\s*\}/);
    expect(pageSrc).not.toMatch(/knowledgeModalDelivered/);

    const game = seedPlaying({
      pieces: [
        { pieceId: '0', row: 4, col: 4, finished: true, trapped: false },
        { pieceId: '1', row: 3, col: 3, finished: false, trapped: false },
      ],
      knowledgeDelivered: 4,
      finishPlace: 0,
    });
    const wrapper = mountPage();
    await flushPromises();

    const seat = game.seats.find((s) => s.sessionId === 's1')!;
    seat.finishPlace = 1;
    await flushPromises();

    expect(wrapper.find('[data-testid="knowledge-delivered-modal"]').exists()).toBe(true);

    // Private knowledge arrives after finishPlace patch (Colyseus interleave).
    game.knowledgeDelivered = 6;
    await flushPromises();

    expect(wrapper.find('[data-testid="knowledge-delivered-modal"]').exists()).toBe(true);
    expect(game.knowledgeDelivered).toBe(6);

    wrapper.unmount();
  });

  it('SC-PRESENCE-10: offline current-turn seat shows dual turn + grace rings', async () => {
    const game = seedPlaying({
      pieces: [{ pieceId: '0', row: 3, col: 3, finished: false, trapped: false }],
      turnUntil: Date.now() + 60_000,
    });
    const seat = game.seats.find((s) => s.sessionId === 's1')!;
    seat.connected = false;
    seat.reconnectUntil = Date.now() + 20_000;
    const wrapper = mountPage();
    await flushPromises();

    const stubs = wrapper.findAll('.presence-slot--own .progress-stub');
    expect(stubs.length).toBeGreaterThanOrEqual(2);
    // Outer turn ring paints while current + deadline active.
    expect(stubs[0]!.attributes('data-color')).toBe('primary');
    expect(Number(stubs[0]!.attributes('data-value'))).toBeGreaterThan(0);
    // Inner grace ring paints warning.
    expect(stubs[1]!.attributes('data-color')).toBe('warning');

    wrapper.unmount();
  });

  it('SC-PRESENCE-52: strip knowledge TR + lightbulb; no board yellow badge', async () => {
    seedPlaying({
      pieces: [
        { pieceId: '0', row: 3, col: 3, finished: false, trapped: false },
        { pieceId: '1', row: 3, col: 4, finished: false, trapped: false },
      ],
      knowledgePieces: { '0': 2 },
      knowledgeDelivered: 3,
    });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[data-testid="piece-knowledge-badge"]').exists()).toBe(false);
    const strip = wrapper.find('[data-testid="strip-knowledge-badge"]');
    expect(strip.exists()).toBe(true);
    expect(strip.text()).toContain('2');
    expect(strip.find('[data-name="lightbulb"]').exists()).toBe(true);
    expect(strip.find('[data-name="mdi-lightbulb-on"]').exists()).toBe(false);
    const avatarIcon = wrapper.find('[data-testid="knowledge-counter"] [data-name="lightbulb"]');
    expect(avatarIcon.exists()).toBe(true);
    expect(pageSrc).not.toMatch(/mdi-lightbulb/);
    expect(pageSrc).toMatch(/name="lightbulb"/);

    wrapper.unmount();
  });

  it('SC-FINISH-34: cut copy uses «которые успели» not «что успели»', () => {
    expect(enUS.game.knowledgeDeliveredModalCut).toMatch(/которые успели/);
    expect(enUS.game.knowledgeDeliveredModalCut).not.toMatch(/что успели/);
  });
});
