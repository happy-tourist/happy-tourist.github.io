import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GamePage from '@/pages/GamePage.vue';
import { touristLayoutGrid } from '@/lib/boardGeometry';
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

function baseSeat(
  partial: Partial<GameSeat> & Pick<GameSeat, 'sessionId' | 'touristId'>,
): GameSeat {
  return {
    sessionId: partial.sessionId,
    touristId: partial.touristId,
    pieces: partial.pieces ?? [],
    connected: partial.connected ?? true,
    reconnectUntil: partial.reconnectUntil ?? 0,
    ready: partial.ready ?? false,
    finishPlace: partial.finishPlace ?? 0,
    timeExpired: partial.timeExpired ?? false,
    isBot: partial.isBot ?? false,
  };
}

function seedAiRoom() {
  const game = useGameStore();
  const human = baseSeat({
    sessionId: 'human',
    touristId: 1,
    pieces: [{ pieceId: '0', row: 3, col: 3, finished: false, trapped: false }],
  });
  const botA = baseSeat({ sessionId: 'bot-a', touristId: 2, isBot: true });
  const botB = baseSeat({ sessionId: 'bot-b', touristId: 3, isBot: true });
  game.$patch({
    room: { roomId: 'r1' } as never,
    roomId: 'r1',
    sessionId: 'human',
    phase: 'playing',
    status: 'playing',
    started: true,
    maxSeats: 3,
    currentTurnSessionId: 'human',
    turnBudgetSeconds: 60,
    turnUntil: Date.now() + 60_000,
    grid: touristLayoutGrid(),
    touristsPerPlayer: 4,
    packTitle: 'Пак',
    seats: [human, botA, botB],
    knowledgeDelivered: 0,
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
            '<div class="progress-stub" :data-color="color" :data-max="max" :data-value="value" />',
          props: ['min', 'max', 'value', 'size', 'thickness', 'color', 'trackColor'],
        },
      },
    },
  });
}

describe('GamePage presence AI caption (SC-PRESENCE-60)', () => {
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
    vi.clearAllMocks();
  });

  it('SC-PRESENCE-60: bot opponents show shared AI caption; human has none', async () => {
    expect(enUS.game.presenceAi).toBe('AI');

    seedAiRoom();
    wrapper = mountPage();
    await flushPromises();

    const topCaptions = wrapper
      .find('.presence-row--top')
      .findAll('[data-test-id="presence-ai-caption"]');
    expect(topCaptions).toHaveLength(2);
    for (const caption of topCaptions) {
      expect(caption.text()).toBe('game.presenceAi');
      expect(caption.classes()).toContain('text-caption');
      expect(caption.classes()).toContain('text-muted');
    }

    const own = wrapper.find('.presence-slot--own');
    expect(own.exists()).toBe(true);
    expect(own.find('[data-test-id="presence-ai-caption"]').exists()).toBe(false);
  });
});
