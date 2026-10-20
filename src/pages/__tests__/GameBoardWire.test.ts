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

  it('SC-BOARD-10/45: peeks=0 finite hides eye on flipped task cell', async () => {
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

    // With peeks remaining, eye appears on the same flipped cell.
    game.peeks = 1;
    await flushPromises();
    expect(wrapper.find('.peek-affordance').exists()).toBe(true);

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
});
