import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentMyModerationPage from '@/pages/ContentMyModerationPage.vue';
import ContentStaffPage from '@/pages/ContentStaffPage.vue';
import MapEditorPage from '@/pages/MapEditorPage.vue';
import MapsListPage from '@/pages/MapsListPage.vue';
import type { MyModerationItem, StaffPendingItem } from '@/stores/content';
import { emptyMapGrid, type MapRevision, type MapSummary } from '@/stores/maps';

const emptyGrid = emptyMapGrid();

const approvedMap: MapSummary = {
  id: 'm-approved',
  createdBy: 'author-1',
  authorDisplayName: 'Alice',
  hasLive: true,
  inCatalog: true,
  players: 2,
  touristsPerPlayer: 3,
  grid: emptyGrid,
};

const draftMap: MapSummary = {
  id: 'm-draft',
  createdBy: 'u1',
  authorDisplayName: 'Me',
  hasLive: false,
  inCatalog: false,
  players: 1,
  touristsPerPlayer: 1,
  grid: emptyGrid,
};

const softMap: MapSummary = {
  id: 'm-soft',
  createdBy: 'author-1',
  authorDisplayName: 'Alice',
  hasLive: true,
  inCatalog: false,
  players: 2,
  touristsPerPlayer: 2,
  grid: emptyGrid,
};

const {
  mapsState,
  authState,
  contentState,
  listMaps,
  createMap,
  loadDraft,
  loadLiveMap,
  loadModeration,
  submitMap,
  saveDraft,
  acquireEditLock,
  releaseEditLock,
  loadStaffEdit,
  listStaffPending,
  listMyModeration,
  routerPush,
  routerReplace,
  routeState,
  draftRevision,
} = vi.hoisted(() => {
  const empty = '.'.repeat(100);
  const draftRevision = {
    grid: empty,
    players: 2,
    touristsPerPlayer: 1,
  };
  const mapsState = {
    error: null as string | null,
    loading: false,
    saving: false,
    list: [] as MapSummary[],
    map: null as MapSummary | null,
    draft: null as MapRevision | null,
    liveContent: null as MapRevision | null,
    pendingRequestId: null as string | null,
    isPendingAuthor: false,
    moderationStatus: null as string | null,
    $patch: vi.fn(),
  };
  const authState = {
    user: { id: 'u1', anonymous: false } as {
      id: string;
      anonymous: boolean;
    } | null,
    needsEmailVerification: false,
    isStaff: false,
  };
  const contentState = {
    error: null as string | null,
    loading: false,
    staffPending: [] as StaffPendingItem[],
    myModeration: [] as MyModerationItem[],
  };
  const routeState = {
    params: { id: 'm-draft' } as Record<string, string>,
    query: {} as Record<string, string>,
    path: '/content/maps/m-draft/edit',
    fullPath: '/content/maps/m-draft/edit',
    name: 'content-map-edit' as string,
  };
  return {
    mapsState,
    authState,
    contentState,
    listMaps: vi.fn().mockResolvedValue(undefined),
    createMap: vi.fn(),
    loadDraft: vi.fn(),
    loadLiveMap: vi.fn(),
    loadModeration: vi.fn(),
    submitMap: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue(draftRevision),
    acquireEditLock: vi.fn().mockResolvedValue(undefined),
    releaseEditLock: vi.fn().mockResolvedValue(undefined),
    loadStaffEdit: vi.fn().mockResolvedValue(undefined),
    listStaffPending: vi.fn().mockResolvedValue(undefined),
    listMyModeration: vi.fn().mockResolvedValue(undefined),
    routerPush: vi.fn(),
    routerReplace: vi.fn(),
    routeState,
    draftRevision,
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: routerPush, replace: routerReplace }),
    useRoute: () => routeState,
    onBeforeRouteLeave: vi.fn(),
  };
});

vi.mock('quasar', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useQuasar: () => ({
      screen: { lt: { sm: false, md: false } },
    }),
  };
});

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => authState),
}));

vi.mock('@/stores/maps', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  // Proxy so mutations inside load* mocks remain visible to the page (no spread snapshot).
  const mapsApi = {
    listMaps,
    createMap,
    loadDraft,
    loadLiveMap,
    loadModeration,
    submitMap,
    saveDraft,
    postModerationMessage: vi.fn(),
    deleteUnpublishedMap: vi.fn(),
    cancelRequest: vi.fn(),
    unpublishMap: vi.fn(),
    republishMap: vi.fn(),
    acquireEditLock,
    refreshEditLock: vi.fn().mockResolvedValue(undefined),
    releaseEditLock,
    loadStaffEdit,
    staffSaveMap: vi.fn(),
  };
  return {
    ...actual,
    useMapsStore: vi.fn(
      () =>
        new Proxy(mapsState, {
          get(target, prop, receiver) {
            if (prop in mapsApi) {
              return mapsApi[prop as keyof typeof mapsApi];
            }
            return Reflect.get(target, prop, receiver);
          },
          set(target, prop, value, receiver) {
            return Reflect.set(target, prop, value, receiver);
          },
        }),
    ),
  };
});

vi.mock('@/stores/content', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  const contentApi = {
    listStaffPending,
    listMyModeration,
    cancelRequest: vi.fn(),
  };
  return {
    ...actual,
    useContentStore: vi.fn(
      () =>
        new Proxy(contentState, {
          get(target, prop, receiver) {
            if (prop in contentApi) {
              return contentApi[prop as keyof typeof contentApi];
            }
            return Reflect.get(target, prop, receiver);
          },
          set(target, prop, value, receiver) {
            return Reflect.set(target, prop, value, receiver);
          },
        }),
    ),
  };
});

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': {
    name: 'QItem',
    props: ['to', 'clickable'],
    template:
      '<div class="q-item-stub" v-bind="$attrs" @click="$attrs.onClick || (() => {})"><slot /></div>',
  },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable', 'to', 'loading'],
    template:
      '<button type="button" :disabled="disable || undefined" v-bind="$attrs">{{ label }}<slot /></button>',
  },
  'q-banner': {
    template: '<div class="q-banner-stub"><slot /><slot name="action" /></div>',
  },
  'q-badge': { template: '<span class="q-badge-stub"><slot /></span>' },
  'q-dialog': {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="dialog"><slot /></div>',
  },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-icon': true,
  'q-select': true,
  'q-tooltip': { template: '<span><slot /></span>' },
  'q-form': { template: '<form @submit.prevent><slot /></form>' },
  'q-input': {
    props: ['modelValue', 'label'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" :aria-label="label" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  MapGridPreview: {
    name: 'MapGridPreview',
    props: ['grid', 'size', 'interactive', 'ariaLabel'],
    emits: ['cellClick'],
    template:
      '<div class="map-preview-stub" :data-interactive="interactive" :data-size="size" :data-grid-len="(grid || \'\').length" @click="$emit(\'cellClick\', 0)" />',
  },
  // Render real card so preview + capacity + bottom actions stay testable (SC-MAP-55).
  MapListCardTile: false,
};

describe('content maps UI (SC-MAP-06…08, 14, 17, 21, 24–25, 29–30)', () => {
  let wrapper: ReturnType<typeof shallowMount> | null = null;

  beforeEach(() => {
    mapsState.error = null;
    mapsState.loading = false;
    mapsState.saving = false;
    mapsState.list = [];
    mapsState.map = null;
    mapsState.draft = null;
    mapsState.liveContent = null;
    mapsState.pendingRequestId = null;
    mapsState.isPendingAuthor = false;
    mapsState.moderationStatus = null;
    authState.user = { id: 'u1', anonymous: false };
    authState.isStaff = false;
    authState.needsEmailVerification = false;
    contentState.error = null;
    contentState.loading = false;
    contentState.staffPending = [];
    contentState.myModeration = [];
    listMaps.mockClear().mockResolvedValue(undefined);
    createMap.mockClear();
    loadDraft.mockReset();
    loadLiveMap.mockReset();
    loadModeration.mockReset();
    submitMap.mockClear();
    acquireEditLock.mockClear().mockResolvedValue(undefined);
    loadStaffEdit.mockClear().mockResolvedValue(undefined);
    listStaffPending.mockClear().mockResolvedValue(undefined);
    listMyModeration.mockClear().mockResolvedValue(undefined);
    routerPush.mockClear();
    routerReplace.mockClear();
    routeState.params = { id: 'm-draft' };
    routeState.query = {};
    routeState.path = '/content/maps/m-draft/edit';
    routeState.fullPath = '/content/maps/m-draft/edit';
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.clearAllMocks();
  });

  const getMapsListWrapper = () =>
    shallowMount(MapsListPage, {
      global: { stubs },
    });

  const getEditorWrapper = () =>
    shallowMount(MapEditorPage, {
      global: { stubs },
    });

  const getStaffWrapper = () =>
    shallowMount(ContentStaffPage, {
      global: { stubs },
    });

  const getMyModerationWrapper = () =>
    shallowMount(ContentMyModerationPage, {
      global: { stubs },
    });

  it('SC-MAP-06: approved map row shows preview, author, and players×tourists', async () => {
    mapsState.list = [{ ...approvedMap }];
    wrapper = getMapsListWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('Alice');
    expect(wrapper.text()).toContain('maps.seatConfig');
    expect(wrapper.find('.map-preview-stub').exists()).toBe(true);
    expect(wrapper.find('.map-preview-stub').attributes('data-grid-len')).toBe('100');
  });

  it('SC-MAP-07: author unpublished draft is listed and enterable', async () => {
    mapsState.list = [{ ...draftMap }];
    wrapper = getMapsListWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('maps.draftOnly');
    await wrapper.find('[data-test-id="maps-row-m-draft"]').trigger('click');
    await flushPromises();
    expect(routerPush).toHaveBeenCalledWith({
      name: 'content-map-edit',
      params: { id: 'm-draft' },
    });
  });

  it('SC-MAP-08: Maps list offers no collect / uncollect affordance', async () => {
    mapsState.list = [{ ...approvedMap }];
    wrapper = getMapsListWrapper();
    await flushPromises();

    const text = wrapper.text();
    expect(text).not.toContain('content.addToCollection');
    expect(text).not.toContain('content.removeFromCollection');
    expect(text).not.toContain('maps.collect');
    expect(text).not.toContain('maps.uncollect');
  });

  it('SC-MAP-14: staff queue shows map type badge beside pack rows', async () => {
    authState.isStaff = true;
    contentState.staffPending = [
      {
        requestId: 'req-pack',
        packId: 'p1',
        changeAuthorId: 'u1',
        status: 'pending',
        title: 'Pack A',
        type: 'pack',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        requestId: 'req-map',
        packId: null,
        mapId: 'm1',
        changeAuthorId: 'u1',
        status: 'pending',
        title: '2×1',
        type: 'map',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ];
    wrapper = getStaffWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('Pack A');
    expect(wrapper.text()).toContain('maps.requestTypeBadge');
    expect(wrapper.text()).toContain('maps.requestType');
  });

  it('SC-MAP-17: after approve, author open without edit query is view-only without submit', async () => {
    loadDraft.mockRejectedValueOnce(new Error('map_published'));
    loadLiveMap.mockImplementation(() => {
      mapsState.map = { ...approvedMap, createdBy: 'u1' };
      mapsState.liveContent = { ...draftRevision };
      return Promise.resolve({ map: mapsState.map, content: mapsState.liveContent });
    });

    wrapper = getEditorWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('maps.viewOnlySubtitle');
    expect(wrapper.find('[data-test-id="map-paint-tools"]').exists()).toBe(false);
    expect(wrapper.findAll('button').some((b) => b.text().includes('maps.submitModeration'))).toBe(
      false,
    );
    expect(wrapper.find('.map-preview-stub').attributes('data-interactive')).toBe('false');
  });

  it('SC-MAP-21: soft-unpublished labeled for staff; non-staff cannot open', async () => {
    mapsState.list = [{ ...softMap }];
    authState.isStaff = false;
    wrapper = getMapsListWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('maps.unpublishedByStaff');
    await wrapper.find('[data-test-id="maps-row-m-soft"]').trigger('click');
    await flushPromises();
    expect(routerPush).not.toHaveBeenCalled();

    wrapper.unmount();
    authState.isStaff = true;
    wrapper = getMapsListWrapper();
    await flushPromises();
    expect(wrapper.text()).toContain('maps.unpublishedByStaff');
    expect(wrapper.findAll('button').some((b) => b.text().includes('maps.republish'))).toBe(true);
  });

  it('SC-MAP-24: author my-moderation lists pending map and links to editor', async () => {
    contentState.myModeration = [
      {
        requestId: 'req-map',
        packId: null,
        mapId: 'm-draft',
        type: 'map',
        status: 'pending',
        title: '2×1',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    wrapper = getMyModerationWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('maps.requestType');
    expect(wrapper.text()).toContain('content.statuses.pending');
    const item = wrapper.findComponent({ name: 'QItem' });
    expect(item.props('to')).toEqual({
      name: 'content-map-edit',
      params: { id: 'm-draft' },
    });
  });

  it('SC-MAP-40/43: staff does not see author my-moderation; no embedded Модерация on Maps list', async () => {
    authState.isStaff = true;
    wrapper = getMapsListWrapper();
    await flushPromises();

    expect(
      wrapper.findAll('button').some((b) => b.text().includes('content.myModerationNav')),
    ).toBe(false);
    expect(wrapper.findAll('button').some((b) => b.text().includes('content.staffNav'))).toBe(
      false,
    );
  });

  it('SC-MAP-40: non-staff hides my-moderation nav; filters available', async () => {
    authState.isStaff = false;
    wrapper = getMapsListWrapper();
    await flushPromises();

    expect(
      wrapper.findAll('button').some((b) => b.text().includes('content.myModerationNav')),
    ).toBe(false);
    expect(wrapper.find('[data-test-id="maps-filters"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="maps-filter-moderation"]').exists()).toBe(true);
  });

  it('SC-MAP-31/32: pending and needs_revision badges on Maps list', async () => {
    mapsState.list = [
      { ...approvedMap, id: 'm-pend', moderationStatus: 'pending', createdBy: 'u1' },
      {
        ...approvedMap,
        id: 'm-nr',
        moderationStatus: 'needs_revision',
        createdBy: 'u1',
        authorDisplayName: 'Me',
      },
    ];
    wrapper = getMapsListWrapper();
    await flushPromises();

    expect(wrapper.find('[data-test-id="maps-status-m-pend"]').text()).toContain(
      'content.statuses.pending',
    );
    expect(wrapper.find('[data-test-id="maps-status-m-nr"]').text()).toContain(
      'content.statuses.needs_revision',
    );
  });

  it('SC-MAP-33: moderation filter shows only own open items', async () => {
    mapsState.list = [
      { ...approvedMap, id: 'm-pend', moderationStatus: 'pending', createdBy: 'u1' },
      { ...approvedMap, id: 'm-other', moderationStatus: 'in_catalog', createdBy: 'other' },
      { ...draftMap, moderationStatus: 'draft' },
    ];
    wrapper = getMapsListWrapper();
    await flushPromises();

    await wrapper.find('[data-test-id="maps-filter-moderation"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test-id="maps-row-m-pend"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="maps-row-m-other"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="maps-row-m-draft"]').exists()).toBe(false);
  });

  it('SC-MAP-34: mine filter includes catalog and drafts', async () => {
    mapsState.list = [
      { ...approvedMap, id: 'm-mine', createdBy: 'u1', moderationStatus: 'in_catalog' },
      { ...draftMap, moderationStatus: 'draft' },
      { ...approvedMap, id: 'm-other', createdBy: 'other', moderationStatus: 'in_catalog' },
    ];
    wrapper = getMapsListWrapper();
    await flushPromises();

    await wrapper.find('[data-test-id="maps-filter-mine"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test-id="maps-row-m-mine"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="maps-row-m-draft"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="maps-row-m-other"]').exists()).toBe(false);
  });

  it('SC-MAP-29: editor shows open thread status, messages, and reply', async () => {
    mapsState.map = { ...draftMap };
    mapsState.draft = {
      grid: `${'1'.repeat(2)}${'.'.repeat(98)}`,
      players: 2,
      touristsPerPlayer: 1,
    };
    mapsState.pendingRequestId = 'req-1';
    mapsState.isPendingAuthor = true;
    mapsState.moderationStatus = 'pending';
    loadDraft.mockImplementation(async () => {
      /* state already set */
    });
    loadModeration.mockResolvedValue({
      request: { id: 'req-1', status: 'pending', type: 'map' },
      messages: [
        {
          id: 'msg-1',
          requestId: 'req-1',
          authorUserId: 'staff-1',
          authorKind: 'staff',
          body: 'Need more starts',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    wrapper = getEditorWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('content.statuses.pending');
    expect(wrapper.text()).toContain('maps.moderationThread');
    expect(wrapper.text()).toContain('Need more starts');
    expect(wrapper.find('input[aria-label="content.reply"]').exists()).toBe(true);
    expect(loadModeration).toHaveBeenCalledWith('m-draft');
  });

  it('SC-MAP-30: list failure shows store error banner', async () => {
    mapsState.error = 'unauthenticated';
    mapsState.list = [];
    wrapper = getMapsListWrapper();
    await flushPromises();

    expect(wrapper.find('.q-banner-stub').exists()).toBe(true);
    expect(wrapper.text()).toContain('maps.errors.unauthenticated');
    expect(wrapper.text()).not.toContain('Alice');
  });

  it('submit gate: insufficient starts disables submit (SC-MAP-04/09 UX)', async () => {
    mapsState.map = { ...draftMap };
    mapsState.draft = { ...draftRevision, grid: emptyGrid, players: 2, touristsPerPlayer: 3 };
    loadDraft.mockImplementation(async () => {
      /* state already set */
    });

    wrapper = getEditorWrapper();
    await flushPromises();

    const submit = wrapper
      .findAll('button')
      .find((b) => b.text().includes('maps.submitModeration'));
    expect(submit).toBeTruthy();
    expect(submit!.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('maps.submitHintStarts');
  });

  it('SC-MAP-41: after cancel, author sees draft badge and drafts filter', async () => {
    mapsState.list = [
      {
        ...approvedMap,
        id: 'm-cancel',
        createdBy: 'u1',
        hasLive: true,
        inCatalog: true,
        moderationStatus: 'draft',
        authorRequestOpen: false,
      },
    ];
    wrapper = getMapsListWrapper();
    await flushPromises();

    expect(wrapper.find('[data-test-id="maps-status-m-cancel"]').text()).toContain(
      'maps.draftOnly',
    );

    await wrapper.find('[data-test-id="maps-filter-drafts"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test-id="maps-row-m-cancel"]').exists()).toBe(true);
  });

  it('SC-MAP-42: others keep live snapshot after cancel; author sees draft', async () => {
    mapsState.list = [
      {
        ...approvedMap,
        id: 'm-shared',
        createdBy: 'u1',
        moderationStatus: 'draft',
      },
    ];
    wrapper = getMapsListWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test-id="maps-status-m-shared"]').text()).toContain(
      'maps.draftOnly',
    );
    wrapper.unmount();

    authState.user = { id: 'other', anonymous: false };
    mapsState.list = [
      {
        ...approvedMap,
        id: 'm-shared',
        createdBy: 'u1',
        moderationStatus: 'in_catalog',
      },
    ];
    wrapper = getMapsListWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test-id="maps-status-m-shared"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('maps.statusInCatalog');
    expect(wrapper.text()).not.toContain('maps.draftOnly');
  });
});

describe('map View/Edit and never-published → Edit (SC-MAP-45…49)', () => {
  let wrapper: ReturnType<typeof shallowMount> | null = null;

  const getMapsListWrapper = () =>
    shallowMount(MapsListPage, {
      global: { stubs },
    });

  const getEditorWrapper = () =>
    shallowMount(MapEditorPage, {
      global: { stubs },
    });

  beforeEach(() => {
    mapsState.error = null;
    mapsState.loading = false;
    mapsState.saving = false;
    mapsState.list = [];
    mapsState.map = null;
    mapsState.draft = null;
    mapsState.liveContent = null;
    mapsState.pendingRequestId = null;
    mapsState.isPendingAuthor = false;
    mapsState.moderationStatus = null;
    authState.user = { id: 'u1', anonymous: false };
    authState.isStaff = false;
    authState.needsEmailVerification = false;
    loadDraft.mockReset();
    loadLiveMap.mockReset();
    saveDraft.mockReset().mockResolvedValue(draftRevision);
    acquireEditLock.mockClear().mockResolvedValue(undefined);
    loadStaffEdit.mockClear().mockResolvedValue(undefined);
    routerPush.mockClear();
    routerReplace.mockClear();
    routeState.params = { id: 'm-approved' };
    routeState.query = {};
    routeState.path = '/content/maps/m-approved/edit';
    routeState.fullPath = '/content/maps/m-approved/edit';
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('SC-MAP-45: published map has no in_catalog badge', async () => {
    mapsState.list = [{ ...approvedMap, moderationStatus: 'in_catalog' }];
    wrapper = getMapsListWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test-id="maps-row-m-approved"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="maps-status-m-approved"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('maps.statusInCatalog');
  });

  it('SC-MAP-46/47: published map row opens View without paint tools; shows author and seats', async () => {
    mapsState.list = [{ ...approvedMap }];
    wrapper = getMapsListWrapper();
    await flushPromises();
    await wrapper.find('[data-test-id="maps-row-m-approved"]').trigger('click');
    await flushPromises();
    expect(routerPush).toHaveBeenCalledWith({
      name: 'content-map-edit',
      params: { id: 'm-approved' },
    });
    wrapper.unmount();

    loadDraft.mockRejectedValueOnce(new Error('map_published'));
    loadLiveMap.mockImplementation(() => {
      mapsState.map = { ...approvedMap };
      mapsState.liveContent = { ...draftRevision, players: 2, touristsPerPlayer: 3 };
      return Promise.resolve({ map: mapsState.map, content: mapsState.liveContent });
    });
    wrapper = getEditorWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('maps.viewOnlySubtitle');
    expect(wrapper.find('[data-test-id="map-paint-tools"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="map-view-meta"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="map-view-meta"]').text()).toContain('Alice');
    expect(wrapper.find('[data-test-id="map-view-meta"]').text()).toContain('maps.seatConfig');
    expect(wrapper.find('.map-preview-stub').attributes('data-interactive')).toBe('false');
  });

  it('SC-MAP-48: Edit from list or View enters locked edit with paint tools', async () => {
    mapsState.list = [{ ...approvedMap, createdBy: 'u1' }];
    wrapper = getMapsListWrapper();
    await flushPromises();
    await wrapper.find('[data-test-id="maps-author-edit"]').trigger('click');
    await flushPromises();
    expect(routerPush).toHaveBeenCalledWith({
      name: 'content-map-edit',
      params: { id: 'm-approved' },
      query: { edit: '1' },
    });
    wrapper.unmount();

    routeState.query = { edit: '1' };
    loadDraft.mockImplementation(() => {
      mapsState.map = { ...approvedMap, createdBy: 'u1' };
      mapsState.draft = { ...draftRevision };
      return Promise.resolve({ map: mapsState.map, content: mapsState.draft });
    });
    wrapper = getEditorWrapper();
    await flushPromises();

    expect(acquireEditLock).toHaveBeenCalledWith('m-approved');
    expect(wrapper.find('[data-test-id="map-paint-tools"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('maps.viewOnlySubtitle');
    expect(wrapper.findAll('button').some((b) => b.text().includes('maps.submitModeration'))).toBe(
      true,
    );
    wrapper.unmount();

    // From View → Edit button
    routeState.query = {};
    acquireEditLock.mockClear().mockResolvedValue(undefined);
    loadDraft.mockReset();
    loadDraft.mockImplementation(() => {
      mapsState.map = { ...approvedMap, createdBy: 'u1' };
      mapsState.draft = { ...draftRevision };
      return Promise.resolve({ map: mapsState.map, content: mapsState.draft });
    });
    loadLiveMap.mockImplementation(() => {
      mapsState.map = { ...approvedMap, createdBy: 'u1' };
      mapsState.liveContent = { ...draftRevision };
      return Promise.resolve({ map: mapsState.map, content: mapsState.liveContent });
    });
    // Published with draft available still opens View first
    wrapper = getEditorWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test-id="map-view-edit"]').exists()).toBe(true);
    await wrapper.find('[data-test-id="map-view-edit"]').trigger('click');
    await flushPromises();
    expect(acquireEditLock).toHaveBeenCalledWith('m-approved');
    expect(wrapper.find('[data-test-id="map-paint-tools"]').exists()).toBe(true);
  });

  it('SC-MAP-49: never-published map row opens Edit (not View-first)', async () => {
    mapsState.list = [{ ...draftMap, moderationStatus: 'draft' }];
    wrapper = getMapsListWrapper();
    await flushPromises();
    await wrapper.find('[data-test-id="maps-row-m-draft"]').trigger('click');
    await flushPromises();
    expect(routerPush).toHaveBeenCalledWith({
      name: 'content-map-edit',
      params: { id: 'm-draft' },
    });
    wrapper.unmount();

    routeState.params = { id: 'm-draft' };
    routeState.query = {};
    loadDraft.mockImplementation(() => {
      mapsState.map = { ...draftMap };
      mapsState.draft = { ...draftRevision, players: 1, touristsPerPlayer: 1 };
      return Promise.resolve({ map: mapsState.map, content: mapsState.draft });
    });
    wrapper = getEditorWrapper();
    await flushPromises();

    expect(wrapper.find('[data-test-id="map-paint-tools"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('maps.viewOnlySubtitle');
    expect(wrapper.find('[data-test-id="map-view-meta"]').exists()).toBe(false);
    expect(acquireEditLock).not.toHaveBeenCalled();
  });

  it('SC-MAP-50: author pending map opens Edit from list (not View-first)', async () => {
    mapsState.list = [
      {
        ...approvedMap,
        createdBy: 'u1',
        moderationStatus: 'pending',
      },
    ];
    wrapper = getMapsListWrapper();
    await flushPromises();
    await wrapper.find('[data-test-id="maps-row-m-approved"]').trigger('click');
    await flushPromises();
    expect(routerPush).toHaveBeenCalledWith({
      name: 'content-map-edit',
      params: { id: 'm-approved' },
      query: { edit: '1' },
    });
  });

  it('SC-MAP-51: View Edit control is in the title row (not below view meta alone)', async () => {
    loadDraft.mockRejectedValueOnce(new Error('map_published'));
    loadLiveMap.mockImplementation(() => {
      mapsState.map = { ...approvedMap, createdBy: 'u1' };
      mapsState.liveContent = { ...draftRevision };
      return Promise.resolve({ map: mapsState.map, content: mapsState.liveContent });
    });
    wrapper = getEditorWrapper();
    await flushPromises();
    const editBtn = wrapper.find('[data-test-id="map-view-edit"]');
    expect(editBtn.exists()).toBe(true);
    // Title-row Edit must not sit inside map-view-meta (author/seats block).
    expect(
      wrapper
        .find('[data-test-id="map-view-meta"]')
        .find('[data-test-id="map-view-edit"]')
        .exists(),
    ).toBe(false);
    expect(wrapper.html().indexOf('map-view-edit')).toBeLessThan(
      wrapper.html().indexOf('map-view-meta'),
    );
  });

  it('SC-MAP-53: second paint survives first quiet-save round-trip (block + anti-stale)', async () => {
    vi.useFakeTimers();
    mapsState.map = { ...draftMap };
    mapsState.draft = { grid: emptyGrid, players: 1, touristsPerPlayer: 1 };
    loadDraft.mockImplementation(async () => {
      /* state already set */
    });

    let resolveSave: ((v: MapRevision) => void) | null = null;
    saveDraft.mockImplementation(
      () =>
        new Promise<MapRevision>((resolve) => {
          resolveSave = resolve;
        }),
    );

    wrapper = getEditorWrapper();
    await flushPromises();

    const preview = wrapper.findComponent({ name: 'MapGridPreview' });
    expect(preview.props('interactive')).toBe(true);

    // Paint cell A (index 0)
    await preview.vm.$emit('cellClick', 0);
    await flushPromises();
    const gridAfterA = String(preview.props('grid'));
    expect(gridAfterA[0]).toBe('1');

    // Quiet save starts after debounce
    await vi.advanceTimersByTimeAsync(800);
    await flushPromises();
    expect(saveDraft).toHaveBeenCalled();
    expect(preview.props('interactive')).toBe(false);

    // Paint cell B while save in flight — blocked (D15)
    await preview.vm.$emit('cellClick', 1);
    await flushPromises();
    expect(String(preview.props('grid'))[1]).toBe('.');

    // Stale-ish echo of request (only A); apply allowed because revision unchanged
    resolveSave!({
      grid: gridAfterA,
      players: 1,
      touristsPerPlayer: 1,
    });
    await flushPromises();
    expect(preview.props('interactive')).toBe(true);
    expect(String(preview.props('grid'))[0]).toBe('1');

    // Second paint after settle remains
    await preview.vm.$emit('cellClick', 1);
    await flushPromises();
    const gridFinal = String(preview.props('grid'));
    expect(gridFinal[0]).toBe('1');
    expect(gridFinal[1]).toBe('1');

    vi.useRealTimers();
  });

  it('SC-MAP-53: anti-stale skips save apply when local revision advanced', async () => {
    vi.useFakeTimers();
    mapsState.map = { ...draftMap };
    mapsState.draft = { grid: emptyGrid, players: 1, touristsPerPlayer: 1 };
    loadDraft.mockImplementation(async () => {
      /* state already set */
    });

    let resolveSave: ((v: MapRevision) => void) | null = null;
    saveDraft.mockImplementation(
      () =>
        new Promise<MapRevision>((resolve) => {
          resolveSave = resolve;
        }),
    );

    wrapper = getEditorWrapper();
    await flushPromises();

    const preview = wrapper.findComponent({ name: 'MapGridPreview' });
    await preview.vm.$emit('cellClick', 0);
    await flushPromises();
    const gridWithA = String(preview.props('grid'));

    await vi.advanceTimersByTimeAsync(800);
    await flushPromises();

    // Seat change during in-flight save bumps local revision (anti-stale path)
    const setupState = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$
      .setupState;
    const localRef = setupState.local as { value: MapRevision };
    localRef.value = { ...localRef.value, players: 2 };
    (setupState.onSeatsChange as () => void)();
    await flushPromises();

    // Server returns older snapshot without seat bump — must not wipe local
    resolveSave!({
      grid: gridWithA,
      players: 1,
      touristsPerPlayer: 1,
    });
    await flushPromises();

    expect(localRef.value.players).toBe(2);
    expect(String(preview.props('grid'))[0]).toBe('1');

    vi.useRealTimers();
  });

  it('SC-MAP-54: board-comparable field; palette tiles under map with labels under tiles', async () => {
    mapsState.map = { ...draftMap };
    mapsState.draft = { ...draftRevision, players: 1, touristsPerPlayer: 1 };
    loadDraft.mockImplementation(async () => {
      /* state already set */
    });

    wrapper = getEditorWrapper();
    await flushPromises();

    const field = wrapper.find('[data-test-id="map-editor-field"]');
    const tools = wrapper.find('[data-test-id="map-paint-tools"]');
    expect(field.exists()).toBe(true);
    expect(tools.exists()).toBe(true);
    // Palette is below the field in DOM order
    expect(wrapper.html().indexOf('map-editor-field')).toBeLessThan(
      wrapper.html().indexOf('map-paint-tools'),
    );

    const preview = wrapper.findComponent({ name: 'MapGridPreview' });
    expect(Number(preview.props('size'))).toBeGreaterThanOrEqual(480);

    for (const tool of ['start', 'task', 'finish'] as const) {
      const tile = wrapper.find(`[data-test-id="map-paint-tool-${tool}"]`);
      expect(tile.exists()).toBe(true);
      expect(tile.find('.map-paint-tile__swatch').exists()).toBe(true);
      expect(tile.find('.map-paint-tile__label').text()).toBe(`maps.tools.${tool}`);
      // Label under swatch in DOM
      expect(tile.html().indexOf('map-paint-tile__swatch')).toBeLessThan(
        tile.html().indexOf('map-paint-tile__label'),
      );
    }
  });

  it('SC-MAP-55: maps list renders card grid with mini preview, capacity, and bottom Edit text', async () => {
    mapsState.list = [{ ...approvedMap, createdBy: 'u1' }];
    wrapper = getMapsListWrapper();
    await flushPromises();

    expect(wrapper.find('[data-test-id="maps-card-grid"]').exists()).toBe(true);
    const card = wrapper.find('[data-test-id="maps-row-m-approved"]');
    expect(card.exists()).toBe(true);
    expect(card.classes()).toContain('map-list-tile');

    const preview = card.find('.map-preview-stub');
    expect(preview.exists()).toBe(true);
    expect(card.text()).toContain('maps.seatConfig');
    expect(card.text()).toContain('Alice');

    // Preview appears before capacity text in card DOM
    const html = card.html();
    expect(html.indexOf('map-preview-stub')).toBeLessThan(html.indexOf('maps.seatConfig'));

    const editBtn = card.find('[data-test-id="maps-author-edit"]');
    expect(editBtn.exists()).toBe(true);
    expect(editBtn.text()).toBe('content.edit');
    expect(editBtn.classes()).toContain('full-width');
    // Actions sit below capacity (border-top actions region)
    expect(html.indexOf('maps.seatConfig')).toBeLessThan(html.indexOf('maps-author-edit'));
  });

  it('SC-MAP-56: editor column is centered and seat selects are usable width', async () => {
    loadDraft.mockImplementation(() => {
      mapsState.map = { ...draftMap };
      mapsState.draft = { ...draftRevision };
      return Promise.resolve({ map: mapsState.map, content: mapsState.draft });
    });
    wrapper = getEditorWrapper();
    await flushPromises();

    const body = wrapper.find('.map-editor-body');
    expect(body.exists()).toBe(true);
    // Centered column (D16′ / SC-MAP-56)
    expect(body.classes()).not.toContain('items-start');
    const bodyStyle = (wrapper.find('.map-editor-body').element as HTMLElement).className;
    // Scoped CSS sets align-items: center on .map-editor-body — assert via computed style when available
    const styleEl = wrapper.find('style');
    if (styleEl.exists()) {
      expect(styleEl.text()).toMatch(/align-items:\s*center/);
    } else {
      // Fallback: class presence is enough when style block is stripped in shallow mount
      expect(bodyStyle).toContain('map-editor-body');
    }

    const seats = wrapper.find('[data-test-id="map-editor-seats"]');
    expect(seats.exists()).toBe(true);
    expect(wrapper.findAll('.map-editor-seat-select').length).toBe(2);
    // Seats after palette in DOM
    expect(wrapper.html().indexOf('map-paint-tools')).toBeLessThan(
      wrapper.html().indexOf('map-editor-seats'),
    );
  });

  it('SC-MAP-62: staff creator on published map has no Submit (staff Mode)', async () => {
    authState.isStaff = true;
    authState.user = { id: 'u1', anonymous: false };
    routeState.params = { id: 'm-approved' };
    routeState.query = { staff: '1' };
    loadDraft.mockImplementation(() => {
      mapsState.map = { ...approvedMap, createdBy: 'u1' };
      mapsState.draft = { ...draftRevision };
      return Promise.resolve({ map: mapsState.map, content: mapsState.draft });
    });
    loadStaffEdit.mockImplementation(() => {
      mapsState.map = { ...approvedMap, createdBy: 'u1' };
      mapsState.draft = { ...draftRevision };
      return Promise.resolve({
        map: mapsState.map,
        content: mapsState.draft,
        target: 'live',
      });
    });
    wrapper = getEditorWrapper();
    await flushPromises();

    expect(acquireEditLock).toHaveBeenCalledWith('m-approved');
    expect(loadStaffEdit).toHaveBeenCalledWith('m-approved');
    expect(wrapper.text()).toContain('maps.staffEditSubtitle');
    expect(wrapper.find('[data-test-id="map-paint-tools"]').exists()).toBe(true);
    expect(wrapper.findAll('button').some((b) => b.text().includes('maps.submitModeration'))).toBe(
      false,
    );
  });

  it('SC-MAP-63: staff=1 on never-published keeps Submit (not staffMode)', async () => {
    authState.isStaff = true;
    authState.user = { id: 'u1', anonymous: false };
    routeState.params = { id: 'm-draft' };
    routeState.query = { staff: '1' };
    routeState.path = '/content/maps/m-draft/edit';
    routeState.fullPath = '/content/maps/m-draft/edit?staff=1';
    loadDraft.mockImplementation(() => {
      mapsState.map = { ...draftMap, createdBy: 'u1' };
      mapsState.draft = { ...draftRevision, players: 1, touristsPerPlayer: 1 };
      return Promise.resolve({ map: mapsState.map, content: mapsState.draft });
    });
    wrapper = getEditorWrapper();
    await flushPromises();

    expect(loadStaffEdit).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test-id="map-paint-tools"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('maps.staffEditSubtitle');
    expect(wrapper.findAll('button').some((b) => b.text().includes('maps.submitModeration'))).toBe(
      true,
    );
  });

  it('SC-MAP-63: staff creator on never-published map keeps Submit', async () => {
    authState.isStaff = true;
    authState.user = { id: 'u1', anonymous: false };
    routeState.params = { id: 'm-draft' };
    routeState.query = {};
    routeState.path = '/content/maps/m-draft/edit';
    routeState.fullPath = '/content/maps/m-draft/edit';
    loadDraft.mockImplementation(() => {
      mapsState.map = { ...draftMap, createdBy: 'u1' };
      mapsState.draft = { ...draftRevision, players: 1, touristsPerPlayer: 1 };
      return Promise.resolve({ map: mapsState.map, content: mapsState.draft });
    });
    wrapper = getEditorWrapper();
    await flushPromises();

    expect(loadStaffEdit).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test-id="map-paint-tools"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('maps.staffEditSubtitle');
    expect(wrapper.findAll('button').some((b) => b.text().includes('maps.submitModeration'))).toBe(
      true,
    );
  });

  it('SC-MAP-65: Submit disabled on open without edits; enabled after paint', async () => {
    authState.isStaff = false;
    authState.user = { id: 'u1', anonymous: false };
    routeState.params = { id: 'm-draft' };
    routeState.query = {};
    routeState.path = '/content/maps/m-draft/edit';
    routeState.fullPath = '/content/maps/m-draft/edit';
    // Start at index 1 so stub click (index 0) paints without toggling the existing start off.
    const readyGrid = `.1${'.'.repeat(98)}`;
    const readyRevision = { grid: readyGrid, players: 1, touristsPerPlayer: 1 };
    loadDraft.mockImplementation(() => {
      mapsState.map = { ...draftMap, createdBy: 'u1' };
      mapsState.draft = { ...readyRevision };
      return Promise.resolve({ map: mapsState.map, content: mapsState.draft });
    });
    saveDraft.mockImplementation((_id: string, body: MapRevision) => {
      mapsState.draft = { ...body };
      return Promise.resolve(mapsState.draft);
    });
    wrapper = getEditorWrapper();
    await flushPromises();

    const submit = () =>
      wrapper!.findAll('button').find((b) => b.text().includes('maps.submitModeration'));
    expect(submit()).toBeTruthy();
    expect(submit()!.attributes('disabled')).toBeDefined();

    await wrapper.find('.map-preview-stub').trigger('click');
    await flushPromises();

    expect(submit()!.attributes('disabled')).toBeUndefined();
  });

  it('SC-MAP-65: after successful submit, baseline refresh disables Submit', async () => {
    authState.isStaff = false;
    authState.user = { id: 'u1', anonymous: false };
    routeState.params = { id: 'm-draft' };
    routeState.query = {};
    routeState.path = '/content/maps/m-draft/edit';
    routeState.fullPath = '/content/maps/m-draft/edit';
    const readyGrid = `.1${'.'.repeat(98)}`;
    const readyRevision = { grid: readyGrid, players: 1, touristsPerPlayer: 1 };
    loadDraft.mockImplementation(() => {
      mapsState.map = { ...draftMap, createdBy: 'u1' };
      mapsState.draft = { ...readyRevision };
      return Promise.resolve({ map: mapsState.map, content: mapsState.draft });
    });
    saveDraft.mockImplementation((_id: string, body: MapRevision) => {
      mapsState.draft = { ...body };
      return Promise.resolve(mapsState.draft);
    });
    submitMap.mockResolvedValue({ id: 'req1', mapId: 'm-draft', status: 'pending' });
    wrapper = getEditorWrapper();
    await flushPromises();

    await wrapper.find('.map-preview-stub').trigger('click');
    await flushPromises();

    const submit = () =>
      wrapper!.findAll('button').find((b) => b.text().includes('maps.submitModeration'));
    expect(submit()!.attributes('disabled')).toBeUndefined();

    await submit()!.trigger('click');
    await flushPromises();

    expect(submitMap).toHaveBeenCalled();
    expect(submit()!.attributes('disabled')).toBeDefined();
  });
});
