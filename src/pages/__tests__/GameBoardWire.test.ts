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

describe('GamePage board / peek / strip (SC-BOARD-42/46/49/50…54, SC-PIECE-52)', () => {
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

  function openPeekFixture(
    game: ReturnType<typeof useGameStore>,
    overrides: Partial<NonNullable<(typeof game)['openPeek']>> = {},
  ) {
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
      ...overrides,
    };
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
    expect(digit.classes()).toContain('tile-difficulty');
    const flipped = wrapper.find('.tile-task.tile--flipped');
    expect(flipped.exists()).toBe(true);
    wrapper.unmount();
  });

  it('SC-BOARD-01/02/04/42/56/57: playable tiles use skin vars, radius 0, dark flip digit', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const pageSrc = readFileSync(path.resolve(__dirname, '../GamePage.vue'), 'utf8');
    const skinsSrc = readFileSync(path.resolve(__dirname, '../../lib/tileSkins.ts'), 'utf8');

    expect(skinsSrc).toMatch(/assets\/tiles\/start\.png/);
    expect(skinsSrc).toMatch(/assets\/tiles\/tile\.png/);
    expect(skinsSrc).toMatch(/assets\/tiles\/tile-back\.png/);
    expect(skinsSrc).toMatch(/assets\/tiles\/finish\.png/);

    expect(pageSrc).toMatch(/\.tile\s*\{[^}]*border-radius:\s*0/s);
    expect(pageSrc).toMatch(/--gap:\s*2px/);
    expect(pageSrc).toMatch(/\.tile-start\s*\{[^}]*--tile-skin-start/s);
    expect(pageSrc).toMatch(/\.tile-task\s*\{[^}]*--tile-skin-task/s);
    expect(pageSrc).toMatch(/\.tile-task\.tile--flipped\s*\{[^}]*--tile-skin-task-flipped/s);
    expect(pageSrc).toMatch(/\.tile-center\s*\{[^}]*--tile-skin-finish/s);
    expect(pageSrc).toMatch(/\.tile-difficulty\s*\{[^}]*color:\s*#212121/s);
    expect(pageSrc).toMatch(/\.tile-difficulty\s*\{[^}]*text-shadow:\s*none/s);
    expect(pageSrc).not.toMatch(/\.tile-start\s*\{[^}]*background:\s*#4caf50/s);
    expect(pageSrc).not.toMatch(/\.tile\s*\{[^}]*border-radius:\s*var\(--radius\)/s);

    const game = seedPlayingSeat(1);
    game.flippedCells = [{ key: '1,3', taskId: 't1', difficulty: 2 }];
    const wrapper = mountPage();
    await flushPromises();
    const board = wrapper.find('.tourist-board');
    expect(board.exists()).toBe(true);
    const style = board.attributes('style') ?? '';
    expect(style).toMatch(/--tile-skin-start/);
    expect(style).toMatch(/--tile-skin-task/);
    expect(style).toMatch(/--tile-skin-task-flipped/);
    expect(style).toMatch(/--tile-skin-finish/);
    expect(wrapper.findAll('.tile-center').length).toBe(4);
    expect(wrapper.find('.tile-start').exists()).toBe(true);
    expect(wrapper.find('.tile-task.tile--flipped').exists()).toBe(true);
    wrapper.unmount();
  });

  it('SC-MOVE-65: finish click/outline is per-cell (no nearest-legal remap)', async () => {
    // Piece at (3,3): Chebyshev-1 to center (4,4) only — not (4,5)/(5,4)/(5,5).
    const game = seedPlayingSeat(1);
    const seat = game.seats[0]!;
    seat.pieces = [
      {
        pieceId: '0',
        row: 3,
        col: 3,
        finished: false,
        trapped: false,
      },
    ];
    const sendMove = vi.spyOn(game, 'sendMove').mockReturnValue(true);

    const wrapper = mountPage();
    await flushPromises();

    const piece = wrapper.find('.piece');
    expect(piece.exists()).toBe(true);
    await piece.trigger('click');
    await flushPromises();

    const centers = wrapper.findAll('.tile-center');
    expect(centers).toHaveLength(4);

    const styleOf = (el: (typeof centers)[number]) => el.attributes('style') ?? '';
    const centerAt = (row: number, col: number) =>
      centers.find(
        (t) =>
          styleOf(t).includes(`grid-column: ${col + 1}`) &&
          styleOf(t).includes(`grid-row: ${row + 1}`),
      );

    const legalFinish = centerAt(4, 4);
    const illegalFinish = centerAt(4, 5);
    expect(legalFinish).toBeTruthy();
    expect(illegalFinish).toBeTruthy();

    expect(legalFinish!.classes()).toContain('tile--target');
    expect(illegalFinish!.classes()).not.toContain('tile--target');
    // Only the legal finish among centers is outlined.
    expect(centers.filter((t) => t.classes().includes('tile--target'))).toHaveLength(1);

    await illegalFinish!.trigger('click');
    await flushPromises();
    expect(sendMove).not.toHaveBeenCalled();

    await legalFinish!.trigger('click');
    await flushPromises();
    expect(sendMove).toHaveBeenCalledTimes(1);
    expect(sendMove).toHaveBeenCalledWith('0', 4, 4);

    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const pageSrc = readFileSync(path.resolve(__dirname, '../GamePage.vue'), 'utf8');
    expect(pageSrc).not.toMatch(/nearestLegalCenterCell/);

    wrapper.unmount();
  });

  it('SC-BOARD-46: shared peek modal shows question; peeker can place/submit', async () => {
    const game = seedPlayingSeat(2);
    openPeekFixture(game);
    const sendPeekPlace = vi.spyOn(game, 'sendPeekPlace').mockReturnValue(true);
    const sendPeekSubmit = vi.spyOn(game, 'sendPeekSubmit').mockReturnValue(true);

    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.find('[data-testid="peek-question"]').text()).toContain('Сколько будет 2+2?');
    expect(wrapper.findAll('[data-testid="peek-slot"]')).toHaveLength(2);
    expect(wrapper.find('.peek-modal-card').classes()).toContain('peek-chrome');

    const poolCards = wrapper.findAll('[data-testid="peek-answer-chip"]');
    expect(poolCards.length).toBeGreaterThan(0);
    await poolCards[0]!.trigger('click');
    expect(sendPeekPlace).toHaveBeenCalled();

    game.openPeek = {
      ...game.openPeek!,
      placements: ['a1', 'a2'],
    };
    await flushPromises();
    const submitBtn = wrapper.find('[data-testid="peek-submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.attributes('disabled')).toBeUndefined();
    await submitBtn.trigger('click');
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
    openPeekFixture(game, {
      sessionId: 'other',
      question: 'Вопрос для всех',
      difficulty: 1,
      reward: 1,
      placements: ['a1'],
    });

    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.find('[data-testid="peek-question"]').text()).toContain('Вопрос для всех');
    expect(wrapper.find('[data-testid="peek-spectator-hint"]').text()).toContain(
      'game.peekSpectatorHint',
    );
    expect(wrapper.find('[data-testid="peek-submit"]').exists()).toBe(false);
    expect(
      wrapper
        .findAll('[data-testid="peek-answer-chip"]')
        .every((c) => c.classes().includes('peek-answer-mini--readonly')),
    ).toBe(true);
    wrapper.unmount();
  });

  it('SC-BOARD-49: same answer card may fill multiple peek slots without used chrome', async () => {
    const game = seedPlayingSeat(2);
    openPeekFixture(game, {
      question: 'Повтори ответ',
      difficulty: 1,
      reward: 1,
    });
    const sendPeekPlace = vi
      .spyOn(game, 'sendPeekPlace')
      .mockImplementation((slotIndex, answerCardId) => {
        if (!game.openPeek) return false;
        const next = [...game.openPeek.placements];
        next[slotIndex] = answerCardId ?? '';
        game.openPeek = { ...game.openPeek, placements: next };
        return true;
      });

    const wrapper = mountPage();
    await flushPromises();

    const chips = wrapper.findAll('[data-testid="peek-answer-chip"]');
    expect(chips.length).toBeGreaterThan(0);
    const firstChip = chips[0]!;

    await firstChip.trigger('click');
    await flushPromises();
    await firstChip.trigger('click');
    await flushPromises();

    expect(sendPeekPlace).toHaveBeenCalledTimes(2);
    expect(sendPeekPlace).toHaveBeenNthCalledWith(1, 0, 'a1');
    expect(sendPeekPlace).toHaveBeenNthCalledWith(2, 1, 'a1');
    expect(game.openPeek!.placements).toEqual(['a1', 'a1']);

    // Reuse: no disabled / used / primary consumed chrome after place (SC-BOARD-49).
    expect(firstChip.attributes('disabled')).toBeUndefined();
    expect(firstChip.classes()).toContain('peek-answer-mini');
    expect(firstChip.classes()).not.toContain('peek-answer-mini--used');
    expect(firstChip.classes()).not.toContain('peek-answer-mini--readonly');
    expect(firstChip.classes()).not.toContain('disabled');

    const filledSlots = wrapper.findAll('.peek-slot--filled');
    expect(filledSlots).toHaveLength(2);
    expect(filledSlots.every((s) => s.text().includes('Четыре'))).toBe(true);
    expect(filledSlots.every((s) => s.classes().includes('peek-slot--portrait'))).toBe(true);

    // Pool never gets filled-slot primary border class / used chrome.
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const appScss = readFileSync(path.resolve(__dirname, '../../css/app.scss'), 'utf8');
    expect(appScss).toMatch(
      /\.peek-slot--portrait\.peek-slot--filled[\s\S]*?border:\s*1px\s+solid\s+#1976d2/s,
    );
    expect(appScss).toMatch(
      /\.peek-answer-mini\s*\{[^}]*border:\s*1px\s+solid\s+var\(--pack-card-border\)/s,
    );
    expect(appScss).not.toMatch(/\.peek-answer-mini--used/);

    await filledSlots[0]!.trigger('click');
    await flushPromises();
    expect(sendPeekPlace).toHaveBeenCalledWith(0, '');
    expect(game.openPeek!.placements).toEqual(['', 'a1']);

    wrapper.unmount();
  });

  it('SC-BOARD-50: peek header shows left-edge dots and centered word-only badge', async () => {
    const game = seedPlayingSeat(2);
    openPeekFixture(game, { difficulty: 2, reward: 2 });

    const wrapper = mountPage();
    await flushPromises();

    const header = wrapper.find('[data-testid="peek-diff-header"]');
    expect(header.exists()).toBe(true);
    expect(header.classes()).toContain('peek-diff-header');

    const dots = wrapper.find('[data-testid="peek-diff-dots"]');
    expect(dots.exists()).toBe(true);
    expect(dots.attributes('data-diff')).toBe('2');
    expect(dots.findAll('.peek-diff-dot')).toHaveLength(3);
    expect(dots.findAll('.peek-diff-dot--filled')).toHaveLength(2);

    const badge = wrapper.find('[data-testid="peek-diff-badge"]');
    expect(badge.exists()).toBe(true);
    expect(badge.attributes('data-diff')).toBe('2');
    // Word-only key — not «Сложность:», digit-only, or digit-prefix select labels.
    expect(badge.text()).toBe('content.difficultyWord.2');
    expect(badge.text()).not.toMatch(/Сложность/i);
    expect(badge.text()).not.toMatch(/^2$/);
    expect(badge.text()).not.toBe('game.peekDifficulty');
    expect(badge.text()).not.toBe('game.peekDifficultyBadge');
    expect(badge.text()).not.toBe('content.difficulty.2');

    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const appScss = readFileSync(path.resolve(__dirname, '../../css/app.scss'), 'utf8');
    // Layout: dots absolutely left-edged; badge centered via flex (not one centered cluster).
    expect(appScss).toMatch(
      /\.peek-diff-header\s*\{[^}]*position:\s*relative[^}]*justify-content:\s*center/s,
    );
    expect(appScss).toMatch(
      /\.peek-diff-header\s+\.peek-diff-dots\s*\{[^}]*position:\s*absolute[^}]*left:\s*0/s,
    );

    // Read-only: clicking dots does not change difficulty.
    await dots.findAll('.peek-diff-dot')[2]!.trigger('click');
    await flushPromises();
    expect(game.openPeek!.difficulty).toBe(2);
    expect(dots.findAll('.peek-diff-dot--filled')).toHaveLength(2);

    wrapper.unmount();
  });

  it('SC-BOARD-10/45/13: peeks=0 finite hides eye; peeks>0 shows illustrated peek icon', async () => {
    const game = seedPlayingSeat(1);
    game.peeks = 0;
    game.budgetsInfinite = false;
    // Piece 0 sits on task * at (3,3); mark that cell flipped.
    game.flippedCells = [{ key: '3,3', taskId: 't1', difficulty: 2 }];

    const wrapper = mountPage();
    await flushPromises();

    const slot = wrapper.find('.my-tourist-slot');
    expect(slot.exists()).toBe(true);
    await slot.trigger('click');
    await flushPromises();

    expect(wrapper.find('.peek-affordance').exists()).toBe(false);

    // With peeks remaining, illustrated peek icon appears on the same flipped cell.
    game.peeks = 1;
    await flushPromises();
    const peek = wrapper.find('.peek-affordance');
    expect(peek.exists()).toBe(true);
    expect(peek.find('img.board-action-icon').exists()).toBe(true);
    expect(peek.find('i').exists()).toBe(false);

    wrapper.unmount();
  });

  it('SC-BOARD-51: empty slots blank dashed; filled half-size with primary border', async () => {
    const game = seedPlayingSeat(2);
    openPeekFixture(game, { placements: ['', ''] });

    const wrapper = mountPage();
    await flushPromises();

    const slots = wrapper.findAll('[data-testid="peek-slot"]');
    expect(slots).toHaveLength(2);
    for (const slot of slots) {
      expect(slot.classes()).toContain('peek-slot--portrait');
      expect(slot.classes()).not.toContain('peek-slot--filled');
      expect(slot.text().trim()).toBe('');
      expect(slot.text()).not.toContain('game.peekSlotEmpty');
      expect(slot.text()).not.toMatch(/Слот/i);
    }

    game.openPeek = { ...game.openPeek!, placements: ['a1', ''] };
    await flushPromises();

    const after = wrapper.findAll('[data-testid="peek-slot"]');
    expect(after[0]!.classes()).toContain('peek-slot--filled');
    expect(after[0]!.classes()).toContain('peek-slot--portrait');
    expect(after[0]!.find('.peek-slot__label').text()).toContain('Четыре');
    expect(after[1]!.classes()).not.toContain('peek-slot--filled');
    expect(after[1]!.text().trim()).toBe('');

    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const appScss = readFileSync(path.resolve(__dirname, '../../css/app.scss'), 'utf8');
    expect(appScss).toMatch(/--peek-tile-max-w:\s*43px/);
    expect(appScss).toMatch(
      /\.peek-slot--portrait,\s*\n\.peek-slot-like--portrait\s*\{[^}]*max-width:\s*var\(--peek-tile-max-w/s,
    );
    expect(appScss).toMatch(
      /\.peek-slot--portrait,\s*\n\.peek-slot-like--portrait\s*\{[^}]*aspect-ratio:\s*156\s*\/\s*206/s,
    );
    expect(appScss).toMatch(
      /\.peek-slot--portrait\.peek-slot--filled[\s\S]*?border:\s*1px\s+solid\s+#1976d2/s,
    );

    wrapper.unmount();
  });

  it('SC-BOARD-52: answer pool is a scrollable mini-card grid up to 4×4', async () => {
    const game = seedPlayingSeat(2);
    game.answerCards = Array.from({ length: 17 }, (_, i) => ({
      id: `a${i + 1}`,
      content: `Ответ ${i + 1}`,
      description: i === 0 ? 'ед.' : '',
    }));
    openPeekFixture(game);

    const wrapper = mountPage();
    await flushPromises();

    const pool = wrapper.find('[data-testid="peek-answer-pool"]');
    expect(pool.exists()).toBe(true);
    expect(pool.classes()).toContain('peek-answer-pool');
    const cards = pool.findAll('[data-testid="peek-answer-chip"]');
    expect(cards).toHaveLength(17);
    expect(cards.every((c) => c.classes().includes('peek-answer-mini'))).toBe(true);
    expect(cards[0]!.find('.peek-answer-mini__primary').text()).toContain('Ответ 1');
    expect(cards[0]!.find('.peek-answer-mini__secondary').text()).toContain('ед.');

    // Contract: 4 half-size cols + max-height for ≤4 rows + overflow-y scroll.
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const appScss = readFileSync(path.resolve(__dirname, '../../css/app.scss'), 'utf8');
    expect(appScss).toMatch(/\.peek-answer-pool\s*\{[^}]*grid-template-columns:\s*repeat\(4/s);
    expect(appScss).toMatch(/\.peek-answer-pool\s*\{[^}]*--peek-tile-max-w/s);
    expect(appScss).toMatch(/\.peek-answer-pool\s*\{[^}]*max-height:/s);
    expect(appScss).toMatch(/\.peek-answer-pool\s*\{[^}]*overflow-y:\s*auto/s);
    expect(appScss).toMatch(/\.peek-answer-mini\s*\{[^}]*aspect-ratio:\s*156\s*\/\s*206/s);
    expect(appScss).toMatch(/\.peek-answer-mini\s*\{[^}]*max-width:\s*var\(--peek-tile-max-w/s);
    expect(appScss).toMatch(/\.peek-answer-mini--readonly\s*\{[^}]*pointer-events:\s*none/s);

    wrapper.unmount();
  });

  it('SC-BOARD-53: peeker sees full-width primary submit; spectator does not', async () => {
    const game = seedPlayingSeat(2);
    openPeekFixture(game, { placements: ['a1', 'a2'] });

    const wrapper = mountPage();
    await flushPromises();

    const submitBtn = wrapper.find('[data-testid="peek-submit"]');
    expect(submitBtn.exists()).toBe(true);
    expect(submitBtn.classes()).toContain('peek-submit-btn');
    expect(submitBtn.classes()).toContain('full-width');
    expect(submitBtn.attributes('data-color')).toBe('primary');
    expect(submitBtn.text()).toContain('game.peekSubmit');

    // Height band via scoped CSS (28–36 / --pack-card-action-h 30) + Spec pad/line-height.
    // no-caps: Spec copy `Ответить` (stubbed q-btn may not emit q-btn--no-caps class).
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const pageSrc = readFileSync(path.resolve(__dirname, '../GamePage.vue'), 'utf8');
    expect(pageSrc).toMatch(
      /data-testid="peek-submit"[\s\S]*?no-caps|no-caps[\s\S]*?data-testid="peek-submit"/,
    );
    expect(pageSrc).toMatch(/\.peek-submit-btn\s*\{[^}]*min-height:\s*28px/s);
    expect(pageSrc).toMatch(/\.peek-submit-btn\s*\{[^}]*max-height:\s*36px/s);
    expect(pageSrc).toMatch(/\.peek-submit-btn\s*\{[^}]*height:\s*var\(--pack-card-action-h/s);
    expect(pageSrc).toMatch(/\.peek-submit-btn\s*\{[^}]*padding:\s*0\s+0\.6rem/s);
    expect(pageSrc).toMatch(/\.peek-submit-btn\s*\{[^}]*line-height:\s*1\.2/s);
    expect(pageSrc).toMatch(/\.peek-modal-card\s*\{[^}]*max-width:\s*min\(400px,\s*92vw\)/s);

    wrapper.unmount();

    // Spectator branch
    game.sessionId = 'spectator';
    game.seats = [{ ...seatWithPieces(2), sessionId: 'other' }];
    openPeekFixture(game, {
      sessionId: 'other',
      placements: ['a1', 'a2'],
    });
    const spectator = mountPage();
    await flushPromises();
    expect(spectator.find('[data-testid="peek-submit"]').exists()).toBe(false);
    expect(spectator.find('[data-testid="peek-spectator-hint"]').exists()).toBe(true);
    spectator.unmount();
  });

  it('SC-BOARD-54: game peek question uses enlarged ~24px type band', async () => {
    const game = seedPlayingSeat(2);
    openPeekFixture(game, { question: 'Увеличенный вопрос?' });

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[data-testid="peek-question"]').text()).toContain('Увеличенный вопрос?');

    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const pageSrc = readFileSync(path.resolve(__dirname, '../GamePage.vue'), 'utf8');
    expect(pageSrc).toMatch(/\.peek-question\s*\{[^}]*font-size:\s*24px/s);

    // Compose question control must not inherit this scale.
    const composeSrc = readFileSync(
      path.resolve(__dirname, '../../components/PackTaskComposeDialog.vue'),
      'utf8',
    );
    expect(composeSrc).not.toMatch(/font-size:\s*24px/);
    expect(composeSrc).toMatch(/data-testid="task-compose-question"/);

    wrapper.unmount();
  });

  it('SC-BOARD-23/24/58: catapult timings ×1.5 + drop-shadow on overlays (SFC source)', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const pageSrc = readFileSync(path.resolve(__dirname, '../GamePage.vue'), 'utf8');

    expect(pageSrc).toMatch(/const CATAPULT_ANIM_MS = 1500/);
    expect(pageSrc).toMatch(/const CATAPULT_BROKEN_HOLD_MS = 450/);
    expect(pageSrc).toMatch(/const CATAPULT_BROKEN_VANISH_MS = 300/);
    expect(pageSrc).toMatch(/--catapult-anim-ms,\s*1500ms/);
    expect(pageSrc).toMatch(
      /\.catapult-overlay--vanish\s*\{[^}]*--catapult-broken-vanish-ms,\s*300ms/s,
    );

    const dropShadow =
      /drop-shadow\(0 0 1px rgba\(0,\s*0,\s*0,\s*0\.55\)\)[\s\S]*?drop-shadow\(0 0 2px rgba\(255,\s*255,\s*255,\s*0\.4\)\)/;
    expect(pageSrc).toMatch(new RegExp(`\\.grille-overlay\\s*\\{[^}]*${dropShadow.source}`, 's'));
    expect(pageSrc).toMatch(new RegExp(`\\.catapult-overlay\\s*\\{[^}]*${dropShadow.source}`, 's'));
    expect(pageSrc).toMatch(
      new RegExp(`\\.my-tourist-chrome-grille\\s*\\{[^}]*${dropShadow.source}`, 's'),
    );
    expect(pageSrc).not.toMatch(
      /\.my-tourist-chrome-grille\s*\{[^}]*background:\s*(?:#|rgba?\(|opaque)/s,
    );
  });

  it('SC-FINISH-01/17/19/20: longer finish travel + deferred race (SFC source)', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const pageSrc = readFileSync(path.resolve(__dirname, '../GamePage.vue'), 'utf8');

    // D13: enter-center slide ~550 / fade ~300; ordinary move + catapult overlay unchanged.
    expect(pageSrc).toMatch(/const MOVE_ANIM_MS = 250/);
    expect(pageSrc).toMatch(/const FINISH_TRAVEL_MS = 550/);
    expect(pageSrc).toMatch(/const FINISH_FADE_MS = 300/);
    expect(pageSrc).toMatch(/const CATAPULT_ANIM_MS = 1500/);
    expect(pageSrc).toMatch(
      /\.piece--disappearing\s*\{[^}]*left\s+550ms\s+ease-out[^}]*top\s+550ms\s+ease-out[^}]*opacity\s+300ms\s+ease-out\s+550ms/s,
    );
    // Ordinary non-finish piece travel stays ~250 ms.
    expect(pageSrc).toMatch(/\.piece\s*\{[^}]*left\s+250ms\s+ease-out[^}]*top\s+250ms\s+ease-out/s);
    expect(pageSrc).toMatch(/FINISH_TRAVEL_MS\s*\+\s*FINISH_FADE_MS/);
    expect(pageSrc).not.toMatch(/MOVE_ANIM_MS\s*\+\s*FINISH_FADE_MS/);
    // Own center move / push→center busy lock covers finish slide (D13).
    expect(pageSrc).toMatch(/beginMoveAnimation\(FINISH_TRAVEL_MS\)/);
    expect(pageSrc).toMatch(/Math\.max\(MOVE_ANIM_MS\s*\*\s*2,\s*FINISH_TRAVEL_MS\)/);

    // Race: fading before clearing deferred; keep finished while deferred/pinned/visual.
    expect(pageSrc).toMatch(
      /disappearingKeys\.value\s*=\s*fading;[\s\S]*?catapultDeferFinishKeys\.value\s*=\s*deferred/,
    );
    expect(pageSrc).toMatch(
      /!fading\.has\(key\)\s*&&\s*!deferredFinish\.has\(key\)\s*&&\s*!pinned\.has\(key\)\s*&&\s*!visual\.has\(key\)/,
    );
    // Catapult→center always paints finishAnimFrom then clears after paint (SC-FINISH-19/20).
    expect(pageSrc).toMatch(/async function releaseDeferredFinishAfterVanish/);
    expect(pageSrc).toMatch(
      /finishAnimFromByKey\.value\s*=\s*nextFrom;[\s\S]*?requestAnimationFrame[\s\S]*?finishAnimFromByKey\.value\s*=\s*cleared/,
    );
    expect(pageSrc).toMatch(/function shouldFinishTravelAfterVanish/);
    expect(pageSrc).toMatch(
      /catapultDeferFinishKeys\.value\.has\(key\)\s*\|\|\s*catapultOwnsPiece\(key\)/,
    );
  });

  it('SC-BOARD-13 / SC-MOVE-74/77 / SC-FINISH-09/13: illustrated board-action icons + transparent chrome', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const pageSrc = readFileSync(path.resolve(__dirname, '../GamePage.vue'), 'utf8');

    // Assets + img glyphs (D2 / D4) — not Material names on affordance slots.
    for (const asset of [
      'peek.png',
      'push.png',
      'return.png',
      'flag.png',
      'focus.png',
      'end-turn.png',
      'rescue.png',
      'say.png',
    ]) {
      expect(pageSrc).toContain(`@/assets/board/${asset}`);
    }
    expect(pageSrc).toMatch(/class="peek-affordance"[\s\S]*?boardPeekIcon/);
    expect(pageSrc).toMatch(/class="rescue-affordance"[\s\S]*?boardRescueIcon/);
    expect(pageSrc).toMatch(/class="push-affordance"[\s\S]*?boardPushIcon/);
    expect(pageSrc).toMatch(/class="return-affordance"[\s\S]*?boardReturnIcon/);
    expect(pageSrc).toMatch(/:src="boardFlagIcon"/);
    expect(pageSrc).toMatch(/class="my-tourist-finish-icon"/);
    // Affordance Material glyphs removed (budgets keep visibility / directions_walk).
    for (const name of [
      'lock_open',
      'swipe',
      'undo',
      'flag',
      'center_focus_strong',
      'skip_next',
      'chat_bubble_outline',
    ]) {
      expect(pageSrc).not.toMatch(new RegExp(`name=["']${name}["']`));
    }
    expect(pageSrc).not.toMatch(/peek-affordance[\s\S]{0,200}name=["']visibility["']/);

    // Budgets still Material (out of scope).
    expect(pageSrc).toMatch(/name=["']directions_walk["']/);
    expect(pageSrc).toMatch(/name=["']visibility["']/);
    expect(pageSrc).toMatch(/class="ready-affordance"/);

    // Transparent hit — no solid fill / medallion box-shadow on affordances (D1).
    const affordanceBlocks = [
      /\.peek-affordance,\s*\n\.rescue-affordance,\s*\n\.push-affordance\s*\{([^}]+)\}/m,
      /\.return-affordance\s*\{([^}]+)\}/m,
      /\.say-affordance\s*\{([^}]+)\}/m,
      /\.focus-affordance\s*\{([^}]+)\}/m,
      /\.end-turn-affordance\s*\{([^}]+)\}/m,
    ];
    for (const re of affordanceBlocks) {
      const m = pageSrc.match(re);
      expect(m, `missing rule ${re}`).toBeTruthy();
      const body = m![1]!;
      expect(body).toMatch(/background:\s*transparent/);
      expect(body).not.toMatch(/background:\s*rgba\(/);
      expect(body).not.toMatch(/background:\s*#[0-9a-fA-F]{3,8}/);
      expect(body).not.toMatch(/box-shadow:/);
    }
    // ×2 glyph + enlarged hits (flag size unchanged).
    const glyphCss = pageSrc.match(/\.board-action-icon\s*\{([^}]+)\}/m)?.[1] ?? '';
    expect(glyphCss).toMatch(/width:\s*36px/);
    expect(glyphCss).toMatch(/height:\s*36px/);
    const boardHitCss =
      pageSrc.match(
        /\.peek-affordance,\s*\n\.rescue-affordance,\s*\n\.push-affordance\s*\{([^}]+)\}/m,
      )?.[1] ?? '';
    expect(boardHitCss).toMatch(/width:\s*52px/);
    // Clearance above sprite: anchor at cell/slot top −8px, translate(-50%,-100%) (D10 / SC-BOARD-71).
    expect(boardHitCss).toMatch(/translate\(-50%,\s*-100%\)/);
    expect(boardHitCss).toMatch(/-\s*8px/);
    expect(boardHitCss).not.toMatch(/translateX\(-50%\)/);
    const returnCss = pageSrc.match(/\.return-affordance\s*\{([^}]+)\}/m)?.[1] ?? '';
    expect(returnCss).toMatch(/width:\s*52px/);
    expect(returnCss).toMatch(/translate\(-50%,\s*-100%\)/);
    expect(returnCss).toMatch(/top:\s*-8px/);
    expect(returnCss).not.toMatch(/translateX\(-50%\)/);
    // Flag: glyph swap only — size stays ~18px; no Material color tint.
    const flagCss = pageSrc.match(/\.my-tourist-finish-icon\s*\{([^}]+)\}/m)?.[1] ?? '';
    expect(flagCss).toMatch(/width:\s*18px/);
    expect(flagCss).toMatch(/height:\s*18px/);
    expect(flagCss).toMatch(/object-fit:\s*contain/);
    expect(flagCss).not.toMatch(/color:\s*#2e7d32/);
    expect(flagCss).not.toMatch(/translate\(-50%,\s*-100%\)/);

    // DOM: rescue (SC-MOVE-77).
    {
      const game = seedPlayingSeat(2);
      game.$patch({
        seats: [
          {
            sessionId: 's1',
            touristId: 1,
            pieces: [
              { pieceId: '0', row: 3, col: 3, finished: false, trapped: true },
              { pieceId: '1', row: 3, col: 4, finished: false, trapped: false },
            ],
            connected: true,
            reconnectUntil: 0,
            ready: false,
            finishPlace: 0,
            timeExpired: false,
          },
        ],
        holdingGrilleKeys: ['3,3'],
      });
      const wrapper = mountPage();
      await flushPromises();
      expect(wrapper.find('.rescue-affordance img.board-action-icon').exists()).toBe(true);
      wrapper.unmount();
    }

    // Finished strip → flag + return (SC-FINISH-09/13).
    {
      setActivePinia(createPinia());
      const game = seedPlayingSeat(2);
      game.$patch({
        seats: [
          {
            sessionId: 's1',
            touristId: 1,
            pieces: [
              { pieceId: '0', row: 4, col: 4, finished: true, trapped: false },
              { pieceId: '1', row: 3, col: 3, finished: false, trapped: false },
            ],
            connected: true,
            reconnectUntil: 0,
            ready: false,
            finishPlace: 0,
            timeExpired: false,
          },
        ],
        holdingGrilleKeys: [],
      });
      const wrapper = mountPage();
      await flushPromises();
      const finishIcon = wrapper.find('.my-tourist-finish-icon');
      expect(finishIcon.exists()).toBe(true);
      expect(finishIcon.element.tagName.toLowerCase()).toBe('img');
      expect(wrapper.find('.return-affordance img.board-action-icon').exists()).toBe(true);
      wrapper.unmount();
    }

    // Push: select free piece adjacent to another free piece (SC-MOVE-74).
    {
      setActivePinia(createPinia());
      seedPlayingSeat(2);
      const wrapper = mountPage();
      await flushPromises();
      const slots = wrapper.findAll('.my-tourist-slot');
      await slots[0]!.trigger('click');
      await flushPromises();
      expect(wrapper.find('.push-affordance img.board-action-icon').exists()).toBe(true);
      wrapper.unmount();
    }
  });
});
