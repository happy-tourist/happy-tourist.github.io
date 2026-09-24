import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentCatalogPage from '@/pages/ContentCatalogPage.vue';
import ContentCollectionPage from '@/pages/ContentCollectionPage.vue';
import ContentPackAddTaskSetPage from '@/pages/ContentPackAddTaskSetPage.vue';
import ContentPackPage from '@/pages/ContentPackPage.vue';
import ContentStaffRequestPage from '@/pages/ContentStaffRequestPage.vue';
import type {
  AddTaskSetState,
  ContentPackSummary,
  PackContent,
  StaffPreview,
} from '@/stores/content';

const {
  contentState,
  authState,
  listCatalog,
  listCollection,
  loadLivePack,
  unpublishPack,
  republishPack,
  unpublishTaskSet,
  republishTaskSet,
  acquireEditLock,
  loadStaffEdit,
  loadDraft,
  loadAddTaskSet,
  loadModeration,
  loadStaffPreview,
  routerPush,
} = vi.hoisted(() => {
  const pack: ContentPackSummary = {
    id: 'p1',
    title: 'Live',
    description: '',
    blocked: false,
    hasLive: true,
    inCatalog: true,
    createdBy: 'creator-1',
    inCollection: true,
  };
  const liveContent: PackContent = {
    title: 'Live',
    description: '',
    answerCards: [
      { id: 'c1', content: 'A', description: '' },
      { id: 'c2', content: 'B', description: '' },
    ],
    taskSets: [
      {
        id: 'ts1',
        authorUserId: 'u1',
        coauthorLabels: [],
        inCatalog: true,
        tasks: [
          {
            id: 't1',
            question: 'Easy?',
            difficulty: 1,
            slots: [{ id: 's1', answerCardId: 'c1' }],
          },
          {
            id: 't2',
            question: 'Hard?',
            difficulty: 3,
            slots: [{ id: 's2', answerCardId: 'c2' }],
          },
        ],
      },
      {
        id: 'ts2',
        authorUserId: 'u1',
        coauthorLabels: [],
        inCatalog: false,
        tasks: [
          {
            id: 't3',
            question: 'Hidden?',
            difficulty: 2,
            slots: [{ id: 's3', answerCardId: 'c1' }],
          },
        ],
      },
    ],
  };
  const contentState = {
    error: null as string | null,
    loading: false,
    catalog: [] as ContentPackSummary[],
    collection: [] as ContentPackSummary[],
    pack,
    liveContent,
    draft: null as PackContent | null,
    staffEditTarget: null as 'live' | 'working' | null,
    staffPreview: null as StaffPreview | null,
    addTaskSet: null as AddTaskSetState | null,
    moderationStatus: 'none' as string,
    moderationMessages: [] as unknown[],
    isPendingAuthor: false,
    pendingRequestId: null as string | null,
    taskSetHasCascadeGap: () => false,
    taskHasCascadeGap: () => false,
  };
  const authState = {
    user: { id: 'creator-1', anonymous: false } as {
      id: string;
      anonymous: boolean;
    } | null,
    needsEmailVerification: false,
    isStaff: false,
  };
  return {
    contentState,
    authState,
    listCatalog: vi.fn().mockResolvedValue(undefined),
    listCollection: vi.fn().mockResolvedValue(undefined),
    loadLivePack: vi.fn().mockResolvedValue(undefined),
    unpublishPack: vi.fn().mockResolvedValue({ ok: true, inCatalog: false }),
    republishPack: vi.fn().mockResolvedValue({ ok: true, inCatalog: true }),
    unpublishTaskSet: vi.fn().mockResolvedValue({ ok: true, inCatalog: false }),
    republishTaskSet: vi.fn().mockResolvedValue({ ok: true, inCatalog: true }),
    acquireEditLock: vi.fn().mockResolvedValue({ ok: true }),
    loadStaffEdit: vi.fn().mockResolvedValue(undefined),
    loadDraft: vi.fn().mockResolvedValue({ draft: liveContent }),
    loadAddTaskSet: vi.fn().mockResolvedValue(undefined),
    loadModeration: vi.fn().mockResolvedValue(undefined),
    loadStaffPreview: vi.fn().mockResolvedValue(undefined),
    routerPush: vi.fn(),
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: routerPush, replace: vi.fn() }),
    useRoute: () => ({
      params: { id: 'p1' },
      query: {},
      path: '/content/packs/p1',
    }),
    onBeforeRouteLeave: vi.fn(),
  };
});

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => authState),
}));

vi.mock('@/stores/content', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useContentStore: vi.fn(() => ({
      ...contentState,
      listCatalog,
      listCollection,
      loadLivePack,
      unpublishPack,
      republishPack,
      unpublishTaskSet,
      republishTaskSet,
      acquireEditLock,
      loadStaffEdit,
      loadDraft,
      loadAddTaskSet,
      loadModeration,
      loadStaffPreview,
      addToCollection: vi.fn(),
      removeFromCollection: vi.fn(),
      saveDraft: vi.fn(),
      staffSavePack: vi.fn(),
      submitPack: vi.fn(),
      releaseEditLock: vi.fn(),
      refreshEditLock: vi.fn(),
      postModerationMessage: vi.fn(),
      approveRequest: vi.fn(),
      needsRevisionRequest: vi.fn(),
    })),
  };
});

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': {
    template: '<div class="q-item-stub" v-bind="$attrs" @click="$attrs.onClick"><slot /></div>',
  },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable'],
    template:
      '<button type="button" v-bind="$attrs" :disabled="disable">{{ label }}<slot /></button>',
  },
  'q-banner': true,
  'q-badge': { template: '<span class="q-badge-stub"><slot /></span>' },
  'q-chip': {
    template: '<span class="q-chip-stub" v-bind="$attrs"><slot /></span>',
  },
  'q-dialog': {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="dialog"><slot /></div>',
  },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-form': { template: '<form @submit.prevent><slot /></form>' },
  'q-input': true,
  'q-select': true,
  'q-space': true,
  'q-tooltip': { template: '<span><slot /></span>' },
  'q-icon': true,
};

describe('follow-up 4 UI (SC-PACK-129…133)', () => {
  beforeEach(() => {
    contentState.error = null;
    contentState.loading = false;
    contentState.catalog = [
      {
        id: 'p1',
        title: 'In Catalog',
        description: '',
        blocked: false,
        hasLive: true,
        inCatalog: true,
        createdBy: 'u1',
      },
    ];
    contentState.collection = [
      {
        id: 'p1',
        title: 'In Catalog',
        description: '',
        blocked: false,
        hasLive: true,
        inCatalog: true,
        createdBy: 'u1',
      },
    ];
    contentState.pack = {
      id: 'p1',
      title: 'Live',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
      createdBy: 'creator-1',
      inCollection: true,
    };
    contentState.liveContent = {
      title: 'Live',
      description: '',
      answerCards: [
        { id: 'c1', content: 'A', description: '' },
        { id: 'c2', content: 'B', description: '' },
      ],
      taskSets: [
        {
          id: 'ts1',
          authorUserId: 'u1',
          coauthorLabels: [],
          inCatalog: true,
          tasks: [
            {
              id: 't1',
              question: 'Easy?',
              difficulty: 1,
              slots: [{ id: 's1', answerCardId: 'c1' }],
            },
            {
              id: 't2',
              question: 'Hard?',
              difficulty: 3,
              slots: [{ id: 's2', answerCardId: 'c2' }],
            },
          ],
        },
        {
          id: 'ts2',
          authorUserId: 'u1',
          coauthorLabels: [],
          inCatalog: false,
          tasks: [
            {
              id: 't3',
              question: 'Hidden?',
              difficulty: 2,
              slots: [{ id: 's3', answerCardId: 'c1' }],
            },
          ],
        },
      ],
    };
    contentState.draft = JSON.parse(JSON.stringify(contentState.liveContent)) as PackContent;
    contentState.staffEditTarget = null;
    contentState.staffPreview = null;
    contentState.addTaskSet = {
      pack: contentState.pack,
      liveCards: contentState.liveContent.answerCards,
      draft: {
        title: 'Live',
        description: '',
        taskSets: [
          {
            id: 'ts-new',
            authorUserId: 'u1',
            coauthorLabels: [],
            tasks: [],
          },
        ],
      },
      pendingRequestId: null,
      moderationStatus: 'none',
      foreignPending: false,
      stagedRevisionId: null,
    };
    authState.user = { id: 'creator-1', anonymous: false };
    authState.isStaff = false;
    authState.needsEmailVerification = false;
    unpublishPack.mockClear();
    republishPack.mockClear();
    unpublishTaskSet.mockClear();
    republishTaskSet.mockClear();
    routerPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-129: collection shows staff unpublish; confirm before API', async () => {
    authState.isStaff = true;
    const wrapper = shallowMount(ContentCollectionPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.findAll('button').some((b) => b.text().includes('content.unpublish'))).toBe(
      true,
    );

    // Open confirm — API not called until dialog confirm.
    const rowUnpub = wrapper.findAll('button').find((b) => b.text().includes('content.unpublish'));
    await rowUnpub!.trigger('click');
    await flushPromises();
    expect(unpublishPack).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('content.unpublishConfirmTitle');

    const confirmBtn = wrapper
      .findAll('button')
      .filter((b) => b.text().includes('content.unpublish'))
      .at(-1);
    await confirmBtn!.trigger('click');
    await flushPromises();
    expect(unpublishPack).toHaveBeenCalledWith('p1');
  });

  it('SC-PACK-129: catalog asks confirm; cancel does not call API', async () => {
    authState.isStaff = true;
    const wrapper = shallowMount(ContentCatalogPage, { global: { stubs } });
    await flushPromises();

    const unpub = wrapper.findAll('button').find((b) => b.text().includes('content.unpublish'));
    await unpub!.trigger('click');
    await flushPromises();
    expect(unpublishPack).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('content.unpublishConfirmTitle');

    const dismiss = wrapper.findAll('button').find((b) => b.text().includes('content.gateDismiss'));
    await dismiss!.trigger('click');
    await flushPromises();
    expect(unpublishPack).not.toHaveBeenCalled();
  });

  it('SC-PACK-129: staff queue has no pack unpublish controls', async () => {
    authState.isStaff = true;
    contentState.staffPreview = {
      request: {
        id: 'r1',
        packId: 'p1',
        changeAuthorId: 'u1',
        revisionId: 'rev1',
        status: 'pending',
        type: 'pack',
      },
      content: contentState.liveContent,
      pack: contentState.pack,
      messages: [],
    };
    const wrapper = shallowMount(ContentStaffRequestPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.findAll('button').some((b) => b.text().includes('content.unpublish'))).toBe(
      false,
    );
  });

  it('SC-PACK-130: live shows set summary (count + difficulty), not inline questions', async () => {
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('content.tasksCount');
    expect(wrapper.text()).toContain('content.taskSetDifficultySummary');
    expect(wrapper.text()).not.toContain('Easy?');
    expect(wrapper.text()).not.toContain('Hard?');
  });

  it('SC-PACK-132: soft-unpublished set is gray; non-staff click does not navigate', async () => {
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('content.unpublishedByStaff');
    expect(wrapper.find('.text-grey-6').exists()).toBe(true);

    const softRow = wrapper
      .findAll('.q-item-stub')
      .find((n) => n.classes().includes('text-grey-6'));
    expect(softRow).toBeTruthy();
    await softRow!.trigger('click');
    await flushPromises();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('SC-PACK-132: staff sees republish on soft set; published drill-in navigates', async () => {
    authState.isStaff = true;
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.findAll('button').some((b) => b.text().includes('content.republish'))).toBe(
      true,
    );

    // Click first task-set row (published ts1) — answer cards list has items too.
    const setRows = wrapper
      .findAll('.q-item-stub')
      .filter((n) => n.text().includes('content.taskSetLabel'));
    expect(setRows.length).toBeGreaterThanOrEqual(1);
    await setRows[0]!.trigger('click');
    await flushPromises();
    expect(routerPush).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'content-pack-tasks',
        params: { id: 'p1', taskSetId: 'ts1' },
        query: { view: 'live' },
      }),
    );
  });

  it('SC-PACK-131: live disables unpublish when set is last published', async () => {
    authState.isStaff = true;
    // Only one published set
    contentState.liveContent = {
      ...contentState.liveContent,
      taskSets: [
        {
          id: 'ts1',
          authorUserId: 'u1',
          coauthorLabels: [],
          inCatalog: true,
          tasks: [
            {
              id: 't1',
              question: 'Q?',
              difficulty: 1,
              slots: [{ id: 's1', answerCardId: 'c1' }],
            },
            {
              id: 't2',
              question: 'Q2?',
              difficulty: 2,
              slots: [{ id: 's2', answerCardId: 'c2' }],
            },
          ],
        },
      ],
    };
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();

    const setUnpub = wrapper
      .findAll('button')
      .filter((b) => b.text().includes('content.unpublish'));
    // Pack-level unpublish + disabled set unpublish
    expect(
      setUnpub.some((b) => b.attributes('disabled') === '' || b.attributes('disabled') === 'true'),
    ).toBe(true);
  });

  it('SC-PACK-133: AddTaskSet answer tiles are q-chip, not rectangular q-btn', async () => {
    authState.user = { id: 'u1', anonymous: false };
    const wrapper = shallowMount(ContentPackAddTaskSetPage, { global: { stubs } });
    await flushPromises();

    const chips = wrapper.findAll('.q-chip-stub');
    expect(chips.some((c) => c.text().includes('A'))).toBe(true);
    expect(chips.some((c) => c.text().includes('B'))).toBe(true);
    const tileBtns = wrapper.findAll('button').filter((b) => b.text() === 'A' || b.text() === 'B');
    expect(tileBtns.length).toBe(0);
  });
});
