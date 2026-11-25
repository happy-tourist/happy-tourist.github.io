import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LobbyPage from '@/pages/LobbyPage.vue';

const lobbyPageSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../LobbyPage.vue'),
  'utf8',
);

const { authState, gameState, mapsState, contentState, routerPush } = vi.hoisted(() => {
  const routerPush = vi.fn().mockResolvedValue(undefined);
  const authState = {
    displayName: 'Player',
    user: { id: 'u1', anonymous: false } as { id: string; anonymous: boolean } | null,
  };
  const gameState = {
    error: null as string | null,
    listing: false,
    rooms: [] as unknown[],
    subscribeLobby: vi.fn().mockResolvedValue(undefined),
    unsubscribeLobby: vi.fn().mockResolvedValue(undefined),
    createGame: vi.fn().mockResolvedValue({ roomId: 'room-new' }),
    joinGame: vi.fn().mockResolvedValue({ roomId: 'room-1' }),
  };
  const mapsState = {
    list: [] as Array<{
      id: string;
      authorDisplayName?: string;
      hasLive: boolean;
      inCatalog: boolean;
      players: number;
      touristsPerPlayer: number;
      grid: string;
    }>,
    loading: false,
    listMaps: vi.fn().mockResolvedValue(undefined),
  };
  const contentState = {
    catalog: [] as Array<{
      id: string;
      title: string;
      description?: string;
      hasLive: boolean;
      inCatalog?: boolean;
    }>,
    pack: null as { id: string; title: string } | null,
    liveContent: null as {
      title: string;
      taskSets: Array<{
        id: string;
        authorDisplayName?: string;
        inCatalog?: boolean;
        neverLive?: boolean;
        tasks: unknown[];
        authorUserId: string;
        coauthorLabels: string[];
      }>;
    } | null,
    loading: false,
    listCatalog: vi.fn().mockResolvedValue(undefined),
    loadLivePack: vi.fn().mockImplementation((packId: string) => {
      contentState.pack = { id: packId, title: 'Математика' };
      contentState.liveContent = {
        title: 'Математика',
        taskSets: [
          {
            id: 's1',
            authorUserId: 'a1',
            authorDisplayName: 'Иван',
            coauthorLabels: [],
            inCatalog: true,
            tasks: [],
          },
          {
            id: 's2',
            authorUserId: 'a2',
            authorDisplayName: 'Мария',
            coauthorLabels: [],
            inCatalog: true,
            tasks: [],
          },
          {
            id: 's-soft',
            authorUserId: 'a3',
            authorDisplayName: 'Hidden',
            coauthorLabels: [],
            inCatalog: false,
            tasks: [],
          },
        ],
      };
    }),
  };
  return { authState, gameState, mapsState, contentState, routerPush };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: routerPush, replace: vi.fn() }),
    useRoute: () => ({ params: {}, query: {}, path: '/lobby', name: 'lobby' }),
  };
});

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    ...authState,
    logout: vi.fn(),
  })),
}));

vi.mock('@/stores/game', () => ({
  useGameStore: vi.fn(() => gameState),
}));

vi.mock('@/stores/maps', () => ({
  useMapsStore: vi.fn(() => mapsState),
}));

vi.mock('@/stores/content', () => ({
  useContentStore: vi.fn(() => contentState),
}));

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': {
    props: ['clickable', 'disable'],
    template: '<div v-bind="$attrs"><slot /></div>',
  },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable', 'loading', 'to', 'outline', 'dense'],
    emits: ['click'],
    template:
      '<button type="button" v-bind="$attrs" :disabled="disable" :data-outline="outline ? \'1\' : \'\'" @click="$emit(\'click\')">{{ label }}<slot /></button>',
  },
  'q-badge': {
    template: '<span v-bind="$attrs"><slot /></span>',
  },
  'q-banner': true,
  'q-dialog': {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /></div>',
  },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-select': {
    props: ['modelValue', 'options', 'label', 'disable'],
    emits: ['update:modelValue'],
    template: `
      <div class="q-select-stub" :data-label="label">
        <button
          v-for="opt in options"
          :key="String(opt.value)"
          type="button"
          :data-test-id="'opt-' + opt.value"
          @click="$emit('update:modelValue', opt.value)"
        >{{ opt.label || opt.title }}</button>
        <slot name="selected-item" :opt="options.find(o => o.value === modelValue)" />
        <slot name="no-option" />
      </div>
    `,
  },
  'q-icon': {
    props: ['name', 'size'],
    template: '<i class="q-icon-stub" :data-name="name" :data-icon="name" />',
  },
  'q-option-group': {
    props: ['modelValue', 'options', 'type', 'disable'],
    emits: ['update:modelValue'],
    template: `
      <div class="q-option-group-stub" v-bind="$attrs" :data-type="type">
        <label
          v-for="opt in options"
          :key="String(opt.value)"
          :data-pack="opt.packTitle"
          :data-set="opt.setLabel"
          :data-set-n="opt.setOrdinal"
          :data-icon="opt.icon"
        >
          <input
            v-if="type === 'checkbox'"
            type="checkbox"
            :value="opt.value"
            :checked="Array.isArray(modelValue) && modelValue.includes(opt.value)"
            :data-test-id="'check-' + opt.value"
            @change="onCheck(opt.value, $event)"
          />
          <input
            v-else
            type="radio"
            :value="opt.value"
            :checked="modelValue === opt.value"
            :data-test-id="radioTestId(opt)"
            :data-icon="opt.icon"
            @change="$emit('update:modelValue', opt.value)"
          />
          <slot name="label" v-bind="opt">
            <span>{{ opt.label }}</span>
          </slot>
        </label>
      </div>
    `,
    methods: {
      radioTestId(opt: { value: string | number; icon?: string }) {
        const self = this as unknown as { $attrs: Record<string, unknown> };
        if (self.$attrs['data-test-id'] === 'lobby-create-opponent-mode') {
          return 'opponent-' + String(opt.value);
        }
        return 'seat-' + String(opt.value);
      },
      onCheck(value: string, e: Event) {
        const self = this as unknown as {
          modelValue: unknown;
          $emit: (event: string, value: unknown) => void;
        };
        const checked = (e.target as HTMLInputElement).checked;
        const cur = Array.isArray(self.modelValue) ? [...self.modelValue] : [];
        const next = checked ? [...cur, value] : cur.filter((v: string) => v !== value);
        self.$emit('update:modelValue', next);
      },
    },
  },
  'q-space': true,
  MapGridPreview: {
    props: ['grid', 'size'],
    template: '<div class="map-grid-preview-stub" v-bind="$attrs" :data-grid="grid" />',
  },
};

describe('lobby create & listing wire (SC-LOBBY-21…31)', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    mapsState.list = [
      {
        id: 'map-m',
        authorDisplayName: 'Автор карты',
        hasLive: true,
        inCatalog: true,
        players: 4,
        touristsPerPlayer: 2,
        grid: '1'.repeat(100),
      },
      {
        id: 'map-soft',
        authorDisplayName: 'Hidden map',
        hasLive: true,
        inCatalog: false,
        players: 2,
        touristsPerPlayer: 2,
        grid: '.'.repeat(100),
      },
    ];
    contentState.catalog = [
      {
        id: 'pack-p',
        title: 'Математика',
        description: 'числа',
        hasLive: true,
        inCatalog: true,
      },
    ];
    contentState.pack = null;
    contentState.liveContent = null;
    gameState.rooms = [];
    gameState.createGame.mockClear();
    routerPush.mockClear();
    mapsState.listMaps.mockClear();
    contentState.listCatalog.mockClear();
    contentState.loadLivePack.mockClear();
    contentState.loadLivePack.mockImplementation((packId: string) => {
      contentState.pack = { id: packId, title: 'Математика' };
      contentState.liveContent = {
        title: 'Математика',
        taskSets: [
          {
            id: 's1',
            authorUserId: 'a1',
            authorDisplayName: 'Иван',
            coauthorLabels: [],
            inCatalog: true,
            tasks: [],
          },
          {
            id: 's2',
            authorUserId: 'a2',
            authorDisplayName: 'Мария',
            coauthorLabels: [],
            inCatalog: true,
            tasks: [],
          },
          {
            id: 's-soft',
            authorUserId: 'a3',
            authorDisplayName: 'Hidden',
            coauthorLabels: [],
            inCatalog: false,
            tasks: [],
          },
        ],
      };
    });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.clearAllMocks();
  });

  async function openCreate() {
    wrapper = mount(LobbyPage, { global: { stubs } });
    await flushPromises();
    await wrapper.get('[data-test-id="lobby-create-open"]').trigger('click');
    await flushPromises();
  }

  it('SC-BRAND-27: lobby create is Quasar primary + add (catalog parity baseline)', () => {
    const lobbyCreate = lobbyPageSrc.match(
      /<q-btn[\s\S]*?data-test-id="lobby-create-open"[\s\S]*?\/>/,
    )?.[0];
    expect(lobbyCreate).toBeTruthy();
    expect(lobbyCreate).toMatch(/color="primary"/);
    expect(lobbyCreate).toMatch(/icon="add"/);
    expect(lobbyCreate).not.toMatch(/unelevated/);
  });

  it('SC-LOBBY-21/29: create requires map; capacity in options only (no duplicate caption)', async () => {
    await openCreate();
    expect(mapsState.listMaps).toHaveBeenCalled();
    expect(wrapper!.find('[data-test-id="lobby-create-map"]').attributes('data-label')).toBe(
      'lobby.map',
    );
    expect(wrapper!.find('[data-test-id="lobby-create-map-capacity"]').exists()).toBe(false);
    expect(wrapper!.find('[data-test-id="opt-map-soft"]').exists()).toBe(false);

    const confirm = wrapper!.get('[data-test-id="lobby-create-confirm"]');
    expect(confirm.attributes('disabled')).toBeDefined();

    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
    await flushPromises();
    // SC-LOBBY-29: no second capacity caption under closed map select.
    expect(wrapper!.find('[data-test-id="lobby-create-map-capacity"]').exists()).toBe(false);
  });

  it('SC-LOBBY-31: selected map shows mini preview + label in closed select', async () => {
    await openCreate();
    expect(wrapper!.find('[data-test-id="lobby-create-map-selected"]').exists()).toBe(false);

    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
    await flushPromises();

    const selected = wrapper!.find('[data-test-id="lobby-create-map-selected"]');
    expect(selected.exists()).toBe(true);
    expect(
      selected.find('[data-test-id="lobby-create-map-selected-preview"]').attributes('data-grid'),
    ).toBe('1'.repeat(100));
    expect(wrapper!.get('[data-test-id="lobby-create-map-selected-label"]').text()).toBe(
      'Автор карты',
    );
  });

  it('SC-LOBBY-28: seats picker 1…map.players; default min(2, players)', async () => {
    await openCreate();
    expect(wrapper!.find('[data-test-id="lobby-create-max-seats"]').exists()).toBe(false);

    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
    await flushPromises();

    const seats = wrapper!.find('[data-test-id="lobby-create-max-seats"]');
    expect(seats.exists()).toBe(true);
    expect(wrapper!.find('[data-test-id="seat-1"]').exists()).toBe(true);
    expect(wrapper!.find('[data-test-id="seat-2"]').exists()).toBe(true);
    expect(wrapper!.find('[data-test-id="seat-3"]').exists()).toBe(true);
    expect(wrapper!.find('[data-test-id="seat-4"]').exists()).toBe(true);
    expect((wrapper!.get('[data-test-id="seat-2"]').element as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it('SC-LOBBY-23/24: multi-select published sets within one pack; row shows pack theme without set author', async () => {
    const messages = (await import('@/i18n/en-US')).default;
    expect(messages.content.taskSetLabel).toBe('Набор заданий #{n}');

    await openCreate();
    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
    await wrapper!.get('[data-test-id="opt-pack-p"]').trigger('click');
    await flushPromises();

    expect(contentState.loadLivePack).toHaveBeenCalledWith('pack-p');
    expect(wrapper!.find('[data-test-id="check-s-soft"]').exists()).toBe(false);
    expect(wrapper!.text()).toContain('lobby.taskSetOption');
    expect(wrapper!.text()).not.toContain('lobby.taskSetFromAuthor');
    const s1 = wrapper!.get('[data-test-id="check-s1"]').element.closest('label');
    const s2 = wrapper!.get('[data-test-id="check-s2"]').element.closest('label');
    expect(s1?.getAttribute('data-pack')).toBe('Математика');
    expect(s1?.getAttribute('data-set')).toBe('content.taskSetLabel');
    expect(s2?.getAttribute('data-set')).toBe('content.taskSetLabel');
    expect(s1?.getAttribute('data-author')).toBeNull();
    expect(wrapper!.text()).not.toContain('Иван');
    expect(wrapper!.text()).not.toContain('Мария');

    await wrapper!.get('[data-test-id="check-s1"]').setValue(true);
    await wrapper!.get('[data-test-id="check-s2"]').setValue(true);
    await flushPromises();

    const confirm = wrapper!.get('[data-test-id="lobby-create-confirm"]');
    expect(confirm.attributes('disabled')).toBeFalsy();
  });

  it('SC-LOBBY-24: create picker ordinals follow pack index when a soft set is ahead', async () => {
    contentState.loadLivePack.mockImplementation((packId: string) => {
      contentState.pack = { id: packId, title: 'Математика' };
      contentState.liveContent = {
        title: 'Математика',
        taskSets: [
          {
            id: 's-soft',
            authorUserId: 'a0',
            authorDisplayName: 'Hidden',
            coauthorLabels: [],
            inCatalog: false,
            tasks: [],
          },
          {
            id: 's-pub',
            authorUserId: 'a1',
            authorDisplayName: 'Иван',
            coauthorLabels: [],
            inCatalog: true,
            tasks: [],
          },
        ],
      };
    });

    await openCreate();
    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
    await wrapper!.get('[data-test-id="opt-pack-p"]').trigger('click');
    await flushPromises();

    expect(wrapper!.find('[data-test-id="check-s-soft"]').exists()).toBe(false);
    const pub = wrapper!.get('[data-test-id="check-s-pub"]').element.closest('label');
    // Soft set is pack index 0 → published set stays «Набор заданий #2».
    expect(pub?.getAttribute('data-set-n')).toBe('2');
    expect(wrapper!.text()).not.toContain('Иван');
  });

  it('SC-LOBBY-30: single published set is pre-checked', async () => {
    contentState.loadLivePack.mockImplementation((packId: string) => {
      contentState.pack = { id: packId, title: 'Математика' };
      contentState.liveContent = {
        title: 'Математика',
        taskSets: [
          {
            id: 's-only',
            authorUserId: 'a1',
            authorDisplayName: 'Иван',
            coauthorLabels: [],
            inCatalog: true,
            tasks: [],
          },
        ],
      };
    });
    await openCreate();
    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
    await wrapper!.get('[data-test-id="opt-pack-p"]').trigger('click');
    await flushPromises();

    expect(
      (wrapper!.get('[data-test-id="check-s-only"]').element as HTMLInputElement).checked,
    ).toBe(true);
    const confirm = wrapper!.get('[data-test-id="lobby-create-confirm"]');
    expect(confirm.attributes('disabled')).toBeFalsy();
  });

  it('SC-LOBBY-40: create modal has no grille/catapult density controls', async () => {
    await openCreate();
    expect(wrapper!.text()).not.toContain('Плотность решёток');
    expect(wrapper!.text()).not.toContain('Плотность катапульт');
    expect(lobbyPageSrc).not.toMatch(
      /grilleDensity|catapultDensity|createGrilleDensity|createCatapultDensity/,
    );
    // Map / pack remain; maxSeats after map; task sets after pack (SC-LOBBY-40).
    expect(wrapper!.find('[data-test-id="lobby-create-map"]').exists()).toBe(true);
    expect(wrapper!.find('[data-test-id="lobby-create-pack"]').exists()).toBe(true);
    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
    await flushPromises();
    expect(wrapper!.find('[data-test-id="lobby-create-max-seats"]').exists()).toBe(true);
    await wrapper!.get('[data-test-id="opt-pack-p"]').trigger('click');
    await flushPromises();
    expect(wrapper!.find('[data-test-id="lobby-create-task-sets"]').exists()).toBe(true);
    expect(wrapper!.text()).not.toContain('Плотность решёток');
    expect(wrapper!.text()).not.toContain('Плотность катапульт');
  });

  it('SC-LOBBY-22/41: confirm create sends mapId/packId/taskSetIds/maxSeats without density', async () => {
    await openCreate();
    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
    await flushPromises();
    await wrapper!.get('[data-test-id="seat-3"]').setValue(true);
    await wrapper!.get('[data-test-id="opt-pack-p"]').trigger('click');
    await flushPromises();
    await wrapper!.get('[data-test-id="check-s1"]').setValue(true);
    await flushPromises();

    await wrapper!.get('[data-test-id="lobby-create-confirm"]').trigger('click');
    await flushPromises();

    expect(gameState.createGame).toHaveBeenCalledWith({
      mapId: 'map-m',
      packId: 'pack-p',
      taskSetIds: ['s1'],
      maxSeats: 3,
      opponentMode: 'people',
    });
    const createArg = gameState.createGame.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(createArg).not.toHaveProperty('grilleDensity');
    expect(createArg).not.toHaveProperty('catapultDensity');
    expect(routerPush).toHaveBeenCalledWith({ name: 'game', params: { roomId: 'room-new' } });
  });

  it('SC-LOBBY-50: create modal shows people vs AI radio after maxSeats (person/smart_toy; default people)', async () => {
    const messages = (await import('@/i18n/en-US')).default;
    expect(messages.lobby.opponentMode).toBe('Соперник');
    expect(messages.lobby.opponentPeople).toBe('Люди');
    expect(messages.lobby.opponentAi).toBe('AI');
    expect(lobbyPageSrc).toMatch(/icon:\s*'person'/);
    expect(lobbyPageSrc).toMatch(/icon:\s*'smart_toy'/);
    // Icons must be in #label (QOptionGroup ignores options[].icon).
    expect(lobbyPageSrc).toMatch(/#label[\s\S]*?q-icon[\s\S]*?opt\.icon/);
    expect(lobbyPageSrc).toMatch(/lobby-create-max-seats[\s\S]*?lobby-create-opponent-mode/);

    await openCreate();
    expect(wrapper!.find('[data-test-id="lobby-create-opponent-mode"]').exists()).toBe(false);

    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
    await flushPromises();

    const opponent = wrapper!.get('[data-test-id="lobby-create-opponent-mode"]');
    expect(opponent.attributes('data-test-id')).toBe('lobby-create-opponent-mode');
    const people = wrapper!.get('[data-test-id="opponent-people"]');
    const ai = wrapper!.get('[data-test-id="opponent-ai"]');
    expect(people.attributes('data-icon')).toBe('person');
    expect(ai.attributes('data-icon')).toBe('smart_toy');
    // Visible Material icons via #label → q-icon (SC-LOBBY-50).
    expect(opponent.findAll('[data-name="person"]')).toHaveLength(1);
    expect(opponent.findAll('[data-name="smart_toy"]')).toHaveLength(1);
    expect((people.element as HTMLInputElement).checked).toBe(true);
    expect((ai.element as HTMLInputElement).checked).toBe(false);

    await ai.setValue(true);
    await flushPromises();
    expect((ai.element as HTMLInputElement).checked).toBe(true);
    expect((people.element as HTMLInputElement).checked).toBe(false);
  });

  it('SC-LOBBY-51: confirm create sends opponentMode ai with maxSeats 3', async () => {
    await openCreate();
    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
    await flushPromises();
    await wrapper!.get('[data-test-id="seat-3"]').setValue(true);
    await wrapper!.get('[data-test-id="opponent-ai"]').setValue(true);
    await wrapper!.get('[data-test-id="opt-pack-p"]').trigger('click');
    await flushPromises();
    await wrapper!.get('[data-test-id="check-s1"]').setValue(true);
    await flushPromises();

    await wrapper!.get('[data-test-id="lobby-create-confirm"]').trigger('click');
    await flushPromises();

    expect(gameState.createGame).toHaveBeenCalledWith({
      mapId: 'map-m',
      packId: 'pack-p',
      taskSetIds: ['s1'],
      maxSeats: 3,
      opponentMode: 'ai',
    });
    expect(routerPush).toHaveBeenCalledWith({ name: 'game', params: { roomId: 'room-new' } });
  });

  it('SC-LOBBY-52: maxSeats 1 + AI still sends opponentMode ai (no client coerce)', async () => {
    await openCreate();
    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
    await flushPromises();
    await wrapper!.get('[data-test-id="seat-1"]').setValue(true);
    await wrapper!.get('[data-test-id="opponent-ai"]').setValue(true);
    await flushPromises();
    // Radio stays available at maxSeats===1.
    expect(wrapper!.find('[data-test-id="lobby-create-opponent-mode"]').exists()).toBe(true);
    expect(
      (wrapper!.get('[data-test-id="opponent-ai"]').element as HTMLInputElement).disabled,
    ).toBe(false);

    await wrapper!.get('[data-test-id="opt-pack-p"]').trigger('click');
    await flushPromises();
    await wrapper!.get('[data-test-id="check-s1"]').setValue(true);
    await flushPromises();

    await wrapper!.get('[data-test-id="lobby-create-confirm"]').trigger('click');
    await flushPromises();

    expect(gameState.createGame).toHaveBeenCalledWith({
      mapId: 'map-m',
      packId: 'pack-p',
      taskSetIds: ['s1'],
      maxSeats: 1,
      opponentMode: 'ai',
    });
  });

  it('SC-LOBBY-27: confirm without task set does not create a room', async () => {
    await openCreate();
    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
    await wrapper!.get('[data-test-id="opt-pack-p"]').trigger('click');
    await flushPromises();

    const confirm = wrapper!.get('[data-test-id="lobby-create-confirm"]');
    expect(confirm.attributes('disabled')).toBeDefined();
    await confirm.trigger('click');
    await flushPromises();
    expect(gameState.createGame).not.toHaveBeenCalled();
  });

  it('SC-LOBBY-25/26/33/34: card listing — preview, capacity, pack/sets, outline join, waiting status', async () => {
    const messages = (await import('@/i18n/en-US')).default;
    expect(messages.content.taskSetLabel).toBe('Набор заданий #{n}');
    expect(messages.lobby.roomCardTaskSetLabel).toBe('Набор #{n}');
    expect(messages.lobby.roomCardStatusWaiting).toBe('ОЖИДАНИЕ');
    expect(messages.lobby.roomCardStatusPlaying).toBe('ИГРА');
    expect(messages.lobby.join).toBe('Войти');
    expect(lobbyPageSrc).toMatch(/pack-card-grid/);
    expect(lobbyPageSrc).toMatch(/LobbyRoomCardTile/);

    gameState.rooms = [
      {
        roomId: 'r1',
        clients: 1,
        maxClients: 8,
        metadata: {
          title: 'Tourist',
          status: 'waiting',
          seats: 2,
          maxSeats: 2,
          mapGrid: '1'.repeat(100),
          players: 4,
          touristsPerPlayer: 3,
          packTitle: 'Математика',
          taskSetLabels: [
            { taskSetId: 's1', authorDisplayName: 'Мария', taskCount: 48 },
            { taskSetId: 's2', authorDisplayName: 'Иван', taskCount: 32 },
          ],
        },
      },
    ];
    wrapper = mount(LobbyPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.find('[data-test-id="lobby-rooms-grid"]').classes()).toContain('pack-card-grid');
    expect(wrapper.find('[data-test-id="lobby-room-r1"]').exists()).toBe(true);
    expect(wrapper.find('.map-grid-preview-stub').exists()).toBe(true);
    // Seats use chosen maxSeats (2), not map players (4); no players×tourists caption.
    expect(wrapper.find('[data-test-id="lobby-room-seats-count"]').text()).toContain(
      'lobby.capacity',
    );
    expect(wrapper.find('[data-test-id="lobby-room-seats-label"]').text()).toContain(
      'lobby.roomCardSeatsFew',
    );
    expect(wrapper.find('[data-test-id="lobby-room-map-capacity"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="lobby-room-tourists-label"]').text()).toContain(
      'lobby.roomCardTouristsFew',
    );
    expect(wrapper.find('[data-test-id="lobby-room-tourists-count"]').text()).toBe('3');
    expect(wrapper.text()).not.toMatch(/\+\s*3/);
    expect(wrapper.find('[data-test-id="lobby-room-pack-title"]').text()).toContain('Математика');
    const sets = wrapper.find('[data-test-id="lobby-room-sets"]');
    expect(sets.text()).toContain('lobby.roomCardTaskSetLabel');
    expect(sets.text()).toContain('48');
    expect(sets.text()).toContain('32');
    expect(sets.text()).not.toContain('Мария');
    expect(sets.text()).not.toContain('Иван');
    expect(wrapper.text()).not.toContain('Мария');
    const joinBtn = wrapper.find('[data-test-id="lobby-room-join-btn"]');
    expect(joinBtn.exists()).toBe(true);
    expect(joinBtn.text()).toContain('lobby.join');
    // Outline join (not primary fill) — LobbyPage wires `outline` on the control.
    expect(lobbyPageSrc).toMatch(/<q-btn\s+outline[\s\S]*?data-test-id="lobby-room-join-btn"/);
    expect(wrapper.find('[data-test-id="lobby-room-status-r1"]').text()).toContain(
      'lobby.roomCardStatusWaiting',
    );
  });

  it('SC-LOBBY-34: playing room shows short ИГРА status on card', async () => {
    gameState.rooms = [
      {
        roomId: 'r-play',
        clients: 2,
        maxClients: 8,
        metadata: {
          status: 'playing',
          seats: 2,
          maxSeats: 2,
          mapGrid: '1'.repeat(100),
          touristsPerPlayer: 2,
          packTitle: 'Pack',
          taskSetLabels: [{ taskSetId: 's1', taskCount: 10 }],
        },
      },
    ];
    wrapper = mount(LobbyPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.find('[data-test-id="lobby-room-status-r-play"]').text()).toContain(
      'lobby.roomCardStatusPlaying',
    );
  });

  it('SC-LOBBY-35: listing card caps set rows at 4 with overflow', async () => {
    const messages = (await import('@/i18n/en-US')).default;
    expect(messages.content.packCardSetsOverflow).toBe('ещё {k}');

    gameState.rooms = [
      {
        roomId: 'r-overflow',
        clients: 1,
        maxClients: 8,
        metadata: {
          status: 'waiting',
          seats: 1,
          maxSeats: 2,
          mapGrid: '1'.repeat(100),
          touristsPerPlayer: 2,
          packTitle: 'Pack',
          taskSetLabels: Array.from({ length: 6 }, (_, i) => ({
            taskSetId: `s${i + 1}`,
            authorDisplayName: `Author${i + 1}`,
            taskCount: (i + 1) * 10,
          })),
        },
      },
    ];
    wrapper = mount(LobbyPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.findAll('[data-testid="lobby-room-set-row"]')).toHaveLength(4);
    expect(wrapper.find('[data-test-id="lobby-room-sets-overflow"]').text()).toContain(
      'content.packCardSetsOverflow',
    );
    expect(wrapper.text()).not.toContain('Author5');
  });

  it('SC-LOBBY-19: join busy-lock ignores re-entrant card + button clicks', async () => {
    const joinGate: {
      resolve: (value: { roomId: string }) => void;
    } = {
      resolve: () => {
        /* assigned below */
      },
    };
    gameState.joinGame = vi.fn(
      () =>
        new Promise<{ roomId: string }>((resolve) => {
          joinGate.resolve = resolve;
        }),
    );
    gameState.rooms = [
      {
        roomId: 'r-busy',
        clients: 1,
        maxClients: 8,
        metadata: {
          status: 'waiting',
          seats: 1,
          maxSeats: 2,
          mapGrid: '1'.repeat(100),
          touristsPerPlayer: 2,
          packTitle: 'Pack',
          taskSetLabels: [{ taskSetId: 's1', taskCount: 10 }],
        },
      },
    ];
    wrapper = mount(LobbyPage, { global: { stubs } });
    await flushPromises();

    await wrapper.find('[data-test-id="lobby-room-r-busy"]').trigger('click');
    await wrapper.find('[data-test-id="lobby-room-join-btn"]').trigger('click');
    await wrapper.find('[data-test-id="lobby-room-r-busy"]').trigger('click');
    await flushPromises();

    expect(gameState.joinGame).toHaveBeenCalledTimes(1);
    joinGate.resolve({ roomId: 'r-busy' });
    await flushPromises();
  });
});
