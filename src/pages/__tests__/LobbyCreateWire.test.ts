import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LobbyPage from '@/pages/LobbyPage.vue';

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
    props: ['label', 'disable', 'loading', 'to'],
    emits: ['click'],
    template:
      '<button type="button" v-bind="$attrs" :disabled="disable" @click="$emit(\'click\')">{{ label }}<slot /></button>',
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
  'q-option-group': {
    props: ['modelValue', 'options', 'type', 'disable'],
    emits: ['update:modelValue'],
    template: `
      <div class="q-option-group-stub" :data-type="type">
        <label
          v-for="opt in options"
          :key="String(opt.value)"
          :data-pack="opt.packTitle"
          :data-author="opt.authorDisplayName"
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
            @change="$emit('update:modelValue', opt.value)"
          />
          <span>{{ opt.label }}</span>
        </label>
      </div>
    `,
    methods: {
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
    template: '<div class="map-grid-preview-stub" :data-grid="grid" />',
  },
};

describe('lobby create & listing wire (SC-LOBBY-21…27)', () => {
  let wrapper: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    mapsState.list = [
      {
        id: 'map-m',
        authorDisplayName: 'Автор карты',
        hasLive: true,
        inCatalog: true,
        players: 3,
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

  it('SC-LOBBY-21: create requires map; capacity shown after map select; soft-unpublished maps omitted', async () => {
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
    expect(wrapper!.find('[data-test-id="lobby-create-map-capacity"]').exists()).toBe(true);
    expect(wrapper!.text()).toContain('lobby.mapCapacity');
  });

  it('SC-LOBBY-23/24: multi-select published sets within one pack; row shows pack theme + author', async () => {
    await openCreate();
    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
    await wrapper!.get('[data-test-id="opt-pack-p"]').trigger('click');
    await flushPromises();

    expect(contentState.loadLivePack).toHaveBeenCalledWith('pack-p');
    expect(wrapper!.find('[data-test-id="check-s-soft"]').exists()).toBe(false);
    expect(wrapper!.text()).toContain('lobby.taskSetFromAuthor');
    const s1 = wrapper!.get('[data-test-id="check-s1"]').element.closest('label');
    const s2 = wrapper!.get('[data-test-id="check-s2"]').element.closest('label');
    expect(s1?.getAttribute('data-pack')).toBe('Математика');
    expect(s1?.getAttribute('data-author')).toBe('Иван');
    expect(s2?.getAttribute('data-author')).toBe('Мария');

    await wrapper!.get('[data-test-id="check-s1"]').setValue(true);
    await wrapper!.get('[data-test-id="check-s2"]').setValue(true);
    await flushPromises();

    const confirm = wrapper!.get('[data-test-id="lobby-create-confirm"]');
    expect(confirm.attributes('disabled')).toBeFalsy();
  });

  it('SC-LOBBY-22: confirm create sends mapId/packId/taskSetIds (no maxSeats picker)', async () => {
    await openCreate();
    expect(wrapper!.text()).not.toContain('lobby.maxSeats');

    await wrapper!.get('[data-test-id="opt-map-m"]').trigger('click');
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
      grilleDensity: 'medium',
      catapultDensity: 'medium',
    });
    expect(routerPush).toHaveBeenCalledWith({ name: 'game', params: { roomId: 'room-new' } });
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

  it('SC-LOBBY-25/26: listing shows map preview, capacity, pack/set labels', async () => {
    gameState.rooms = [
      {
        roomId: 'r1',
        clients: 1,
        maxClients: 8,
        metadata: {
          title: 'Tourist',
          status: 'waiting',
          seats: 1,
          maxSeats: 2,
          mapGrid: '1'.repeat(100),
          players: 2,
          touristsPerPlayer: 3,
          packTitle: 'Математика',
          taskSetLabels: [{ taskSetId: 's1', authorDisplayName: 'Мария' }],
        },
      },
    ];
    wrapper = mount(LobbyPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.find('[data-test-id="lobby-room-r1"]').exists()).toBe(true);
    expect(wrapper.find('.map-grid-preview-stub').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="lobby-room-map-capacity"]').text()).toContain(
      'lobby.mapCapacityCaption',
    );
    expect(wrapper.find('[data-test-id="lobby-room-pack-sets"]').text()).toContain(
      'lobby.packSetsCaption',
    );
    expect(wrapper.text()).toContain('lobby.capacity');
  });
});
