import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

function seatBase(pieces: GameSeat['pieces']): GameSeat {
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

function seedPlaying(pieces: GameSeat['pieces']) {
  const game = useGameStore();
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
    touristsPerPlayer: pieces.length,
    packTitle: 'Пак',
    seats: [seatBase(pieces)],
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

function pieceStyleVars(el: { attributes: (name: string) => string | undefined }) {
  const style = el.attributes('style') ?? '';
  const prow = style.match(/--prow:\s*([^;]+)/)?.[1]?.trim();
  const pcol = style.match(/--pcol:\s*([^;]+)/)?.[1]?.trim();
  return { prow, pcol, style };
}

describe('GamePage finish/return travel clip (SC-FINISH-15/35/36/37/38)', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function mountPage() {
    return mount(GamePage, {
      global: {
        stubs: {
          QDialog: {
            template: '<div class="q-dialog-stub"><slot /></div>',
            props: ['modelValue'],
          },
          QCard: {
            template: '<div class="q-card-stub" :class="$attrs.class"><slot /></div>',
          },
          QCardSection: {
            template: '<div class="q-card-section-stub" :class="$attrs.class"><slot /></div>',
          },
          QCardActions: {
            template: '<div class="q-card-actions-stub" :class="$attrs.class"><slot /></div>',
          },
          QBtn: {
            template:
              '<button :class="$attrs.class" :disabled="disable || undefined" :data-color="color || \'\'" @click="$emit(\'click\')"><slot />{{ label }}</button>',
            props: ['label', 'flat', 'color', 'disable', 'unelevated'],
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

  it('SC-FINISH-35/36: click→center keeps piece with travel from; sync finished does not drop', async () => {
    const game = seedPlaying([
      { pieceId: '0', row: 3, col: 3, finished: false, trapped: false },
      { pieceId: '1', row: 3, col: 5, finished: false, trapped: false },
    ]);
    vi.spyOn(game, 'sendMove').mockReturnValue(true);

    wrapper = mountPage();
    await flushPromises();

    const pieceBefore = wrapper.find('.piece');
    expect(pieceBefore.exists()).toBe(true);
    expect(pieceStyleVars(pieceBefore)).toMatchObject({ prow: '3', pcol: '3' });

    await pieceBefore.trigger('click');
    await flushPromises();

    const legalFinish = wrapper.findAll('.tile-center').find((t) => {
      const s = t.attributes('style') ?? '';
      return s.includes('grid-column: 5') && s.includes('grid-row: 5');
    });
    expect(legalFinish).toBeTruthy();
    await legalFinish!.trigger('click');
    await flushPromises();

    // Hold phase: clip from = pre-finish cell (not sync center alone).
    const traveling = wrapper.find('.piece');
    expect(traveling.exists()).toBe(true);
    expect(pieceStyleVars(traveling)).toMatchObject({ prow: '3', pcol: '3' });

    // Early/late sync finished at center — piece stays via active finish clip (SC-FINISH-36).
    game.$patch({
      seats: [
        seatBase([
          { pieceId: '0', row: 4, col: 4, finished: true, trapped: false },
          { pieceId: '1', row: 3, col: 5, finished: false, trapped: false },
        ]),
      ],
    });
    await flushPromises();

    const stillThere = wrapper.findAll('.piece');
    expect(stillThere.length).toBeGreaterThanOrEqual(1);
    const finisher = stillThere.find((p) => {
      const { prow, pcol } = pieceStyleVars(p);
      // Still painting clip from or to — never absent solely because sync finished.
      return (prow === '3' && pcol === '3') || (prow === '4' && pcol === '4');
    });
    expect(finisher).toBeTruthy();
  });

  it('SC-FINISH-38: own click→center keeps overlay slot when sync finished mid-travel', async () => {
    const game = seedPlaying([
      { pieceId: '0', row: 3, col: 3, finished: false, trapped: false },
      { pieceId: '1', row: 3, col: 5, finished: false, trapped: false },
    ]);
    vi.spyOn(game, 'sendMove').mockReturnValue(true);

    wrapper = mountPage();
    await flushPromises();

    await wrapper.find('.piece').trigger('click');
    await flushPromises();

    const legalFinish = wrapper.findAll('.tile-center').find((t) => {
      const s = t.attributes('style') ?? '';
      return s.includes('grid-column: 5') && s.includes('grid-row: 5');
    });
    expect(legalFinish).toBeTruthy();
    await legalFinish!.trigger('click');
    await flushPromises();

    // Hold: finisher paints pre-finish cell; record overlay index among .piece siblings.
    const piecesBefore = wrapper.findAll('.piece');
    const idxBefore = piecesBefore.findIndex((p) => {
      const { prow, pcol } = pieceStyleVars(p);
      return prow === '3' && pcol === '3';
    });
    expect(idxBefore).toBeGreaterThanOrEqual(0);
    // Sibling unfinished must exist so unfinished→finished+clip shelf would reorder without D6.
    expect(piecesBefore.length).toBeGreaterThanOrEqual(2);

    // Mid-presentation sync finished at center (acting client) — must not migrate shelf / snap.
    game.$patch({
      seats: [
        seatBase([
          { pieceId: '0', row: 4, col: 4, finished: true, trapped: false },
          { pieceId: '1', row: 3, col: 5, finished: false, trapped: false },
        ]),
      ],
    });
    await flushPromises();
    await nextTick();

    const piecesAfter = wrapper.findAll('.piece');
    expect(piecesAfter.length).toBeGreaterThanOrEqual(2);
    const idxAfter = piecesAfter.findIndex((p) => {
      const { prow, pcol } = pieceStyleVars(p);
      // Continuous travel paint: still clip from (hold) or to (travel|fade) — not absent.
      return (prow === '3' && pcol === '3') || (prow === '4' && pcol === '4');
    });
    expect(idxAfter).toBe(idxBefore);

    const finisher = piecesAfter[idxAfter]!;
    expect(finisher.exists()).toBe(true);
    // Must not be snap-only at center without having painted continuous travel origin path.
    const { prow, pcol } = pieceStyleVars(finisher);
    expect((prow === '3' && pcol === '3') || (prow === '4' && pcol === '4')).toBe(true);

    // Hold→travel (clip rAF): same overlay index; paint moves to center `to` without shelf migrate.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    await flushPromises();
    await nextTick();

    const piecesTravel = wrapper.findAll('.piece');
    expect(piecesTravel.length).toBeGreaterThanOrEqual(2);
    const idxTravel = piecesTravel.findIndex((p) => {
      const vars = pieceStyleVars(p);
      return vars.prow === '4' && vars.pcol === '4';
    });
    expect(idxTravel).toBe(idxBefore);
    expect(piecesTravel[idxTravel]!.classes()).toContain('piece--disappearing');
  });

  it('SC-FINISH-35: finished mid-join without travel from omits board piece', async () => {
    seedPlaying([
      { pieceId: '0', row: 4, col: 4, finished: true, trapped: false },
      { pieceId: '1', row: 3, col: 3, finished: false, trapped: false },
    ]);

    wrapper = mountPage();
    await flushPromises();

    // Only unfinished piece on board — finished without observed from/clip is omitted.
    const pieces = wrapper.findAll('.piece');
    expect(pieces).toHaveLength(1);
    expect(pieceStyleVars(pieces[0]!)).toMatchObject({ prow: '3', pcol: '3' });
  });

  it('SC-FINISH-37: early finished during catapult overlay does not drop the piece', async () => {
    vi.useFakeTimers();
    const game = seedPlaying([
      { pieceId: '0', row: 3, col: 3, finished: false, trapped: false },
      { pieceId: '1', row: 6, col: 3, finished: false, trapped: false },
    ]);

    wrapper = mountPage();
    await flushPromises();
    expect(wrapper.findAll('.piece')).toHaveLength(2);

    // Reveal catapult on the piece cell → pin/queue owns presentation.
    game.$patch({
      revealingCatapultKeys: ['3,3'],
      seats: [
        seatBase([
          { pieceId: '0', row: 4, col: 4, finished: true, trapped: false },
          { pieceId: '1', row: 6, col: 3, finished: false, trapped: false },
        ]),
      ],
    });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(0);
    await flushPromises();

    // Overlay still running (CATAPULT_ANIM_MS = 1500) — finished must stay visible.
    const pieces = wrapper.findAll('.piece');
    expect(pieces.length).toBeGreaterThanOrEqual(2);
    const pinned = pieces.find((p) => {
      const { prow, pcol } = pieceStyleVars(p);
      return prow === '3' && pcol === '3';
    });
    expect(pinned).toBeTruthy();
  });

  it('SC-FINISH-15: return paints from nearest center (not ring snap)', async () => {
    const game = seedPlaying([
      { pieceId: '0', row: 4, col: 4, finished: true, trapped: false },
      { pieceId: '1', row: 3, col: 3, finished: false, trapped: false },
    ]);
    vi.spyOn(game, 'sendReturnFromFinish').mockReturnValue(true);

    wrapper = mountPage();
    await flushPromises();

    // Mid-join finished omitted — start return via affordance after seat is interactive.
    expect(wrapper.find('.return-affordance').exists()).toBe(true);
    await wrapper.find('.return-affordance').trigger('click');
    await flushPromises();

    const ring = wrapper.findAll('.tile').find((t) => {
      const s = t.attributes('style') ?? '';
      return (
        t.classes().includes('tile--target') &&
        s.includes('grid-column: 5') &&
        s.includes('grid-row: 4')
      );
    });
    expect(ring).toBeTruthy();
    await ring!.trigger('click');
    await flushPromises();

    // Hold: nearest center to (3,4) is (4,4) (Chebyshev tie → lower col) — not ring snap alone.
    const returning = wrapper.findAll('.piece').find((p) => {
      const { prow, pcol } = pieceStyleVars(p);
      return prow === '4' && pcol === '4';
    });
    expect(returning).toBeTruthy();
    const ringSnapOnly = wrapper.findAll('.piece').some((p) => {
      const { prow, pcol } = pieceStyleVars(p);
      return prow === '3' && pcol === '4';
    });
    expect(ringSnapOnly).toBe(false);
  });

  it('SC-FINISH-15: observed return starts clip from nearest center', async () => {
    const game = seedPlaying([
      { pieceId: '0', row: 4, col: 4, finished: true, trapped: false },
      { pieceId: '1', row: 6, col: 3, finished: false, trapped: false },
    ]);

    wrapper = mountPage();
    await flushPromises();
    expect(wrapper.findAll('.piece')).toHaveLength(1);

    game.$patch({
      seats: [
        seatBase([
          { pieceId: '0', row: 3, col: 4, finished: false, trapped: false },
          { pieceId: '1', row: 6, col: 3, finished: false, trapped: false },
        ]),
      ],
    });
    // One tick only — hold phase still paints nearest center `from` (rAF advances to travel).
    await nextTick();

    const fromCenter = wrapper.findAll('.piece').find((p) => {
      const { prow, pcol } = pieceStyleVars(p);
      return prow === '4' && pcol === '4';
    });
    expect(fromCenter).toBeTruthy();
  });
});
