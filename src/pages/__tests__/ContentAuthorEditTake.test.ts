import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPackPage from '@/pages/ContentPackPage.vue';
import ContentStaffPage from '@/pages/ContentStaffPage.vue';
import ContentStaffRequestPage from '@/pages/ContentStaffRequestPage.vue';
import type {
  ContentPackSummary,
  PackContent,
  StaffPendingItem,
  StaffPreview,
} from '@/stores/content';
import { moderationTakeHeldBy } from '@/stores/content';

const {
  contentState,
  authState,
  loadLivePack,
  acquireEditLock,
  loadDraft,
  takeModerationRequest,
  releaseModerationRequest,
  approveRequest,
  needsRevisionRequest,
  cancelRequest,
  listStaffPending,
  loadStaffPreview,
  routerPush,
  routerReplace,
} = vi.hoisted(() => {
  const pack: ContentPackSummary = {
    id: 'p1',
    title: 'Live',
    description: '',
    blocked: false,
    hasLive: true,
    inCatalog: true,
    createdBy: 'u1',
    inCollection: false,
    isFavorite: false,
  };
  const liveContent: PackContent = {
    title: 'Live',
    description: '',
    answerCards: [{ id: 'c1', content: 'A', description: '' }],
    taskSets: [
      {
        id: 'ts1',
        authorUserId: 'contrib',
        authorDisplayName: 'Contrib',
        coauthorLabels: [],
        tasks: [],
      },
    ],
  };
  const contentState = {
    error: null as string | null,
    loading: false,
    pack,
    liveContent,
    pendingPackAuthorId: null as string | null,
    pendingTaskSetAuthorId: null as string | null,
    staffPending: [] as StaffPendingItem[],
    staffPreview: null as StaffPreview | null,
  };
  const authState = {
    user: { id: 'u1', anonymous: false } as { id: string; anonymous: boolean } | null,
    needsEmailVerification: false,
    isStaff: false,
  };
  return {
    contentState,
    authState,
    loadLivePack: vi.fn().mockResolvedValue(undefined),
    acquireEditLock: vi.fn().mockResolvedValue({ ok: true }),
    loadDraft: vi.fn().mockResolvedValue({ pack, draft: liveContent }),
    takeModerationRequest: vi.fn().mockResolvedValue({ ok: true }),
    releaseModerationRequest: vi.fn().mockResolvedValue({ ok: true }),
    approveRequest: vi.fn().mockResolvedValue({ ok: true }),
    needsRevisionRequest: vi.fn().mockResolvedValue({ ok: true }),
    cancelRequest: vi.fn().mockResolvedValue({ ok: true }),
    listStaffPending: vi.fn().mockResolvedValue(undefined),
    loadStaffPreview: vi.fn().mockResolvedValue(undefined),
    routerPush: vi.fn(),
    routerReplace: vi.fn(),
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: routerPush, replace: routerReplace }),
    useRoute: () => ({
      params: { id: contentState.staffPreview?.request.id ?? 'p1' },
      query: {},
      path: '/content',
    }),
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
      loadLivePack,
      acquireEditLock,
      loadDraft,
      takeModerationRequest,
      releaseModerationRequest,
      approveRequest,
      needsRevisionRequest,
      cancelRequest,
      listStaffPending,
      loadStaffPreview,
      postStaffMessage: vi.fn(),
    })),
  };
});

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': {
    name: 'QItem',
    props: ['to', 'clickable'],
    inheritAttrs: false,
    template:
      '<div class="q-item-stub" v-bind="$attrs" @click="$emit(\'click\')"><slot /><slot name="side" /></div>',
  },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable', 'to', 'loading', 'icon'],
    template:
      '<button :disabled="disable" :data-to="to" @click="$emit(\'click\')"><slot />{{ label }}</button>',
  },
  'q-badge': { template: '<span><slot /></span>' },
  'q-banner': { template: '<div><slot /><slot name="action" /></div>' },
  'q-icon': { template: '<i />' },
  'q-tooltip': { template: '<span><slot /></span>' },
  'q-dialog': { template: '<div><slot /></div>' },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-form': { template: '<form @submit.prevent="$emit(\'submit\')"><slot /></form>' },
  'q-input': { template: '<input />' },
  'q-chip': { template: '<span><slot /></span>' },
  MapGridPreview: { template: '<div class="map-preview-stub" />' },
};

describe('moderationTakeHeldBy helper', () => {
  it('returns true only for non-expired holder', () => {
    const now = Date.now();
    expect(moderationTakeHeldBy({ takenBy: 'a', takenAt: new Date(now).toISOString() }, 'a')).toBe(
      true,
    );
    expect(
      moderationTakeHeldBy(
        { takenBy: 'a', takenAt: new Date(now - 10 * 60 * 1000).toISOString() },
        'a',
      ),
    ).toBe(false);
    expect(moderationTakeHeldBy({ takenBy: 'b', takenAt: new Date(now).toISOString() }, 'a')).toBe(
      false,
    );
  });
});

describe('author Edit ACL (SC-PACK-156…160)', () => {
  beforeEach(() => {
    authState.user = { id: 'u1', anonymous: false };
    authState.needsEmailVerification = false;
    authState.isStaff = false;
    contentState.error = null;
    contentState.pack = {
      id: 'p1',
      title: 'Live',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
      createdBy: 'u1',
      inCollection: false,
      isFavorite: false,
    };
    contentState.pendingPackAuthorId = null;
    contentState.pendingTaskSetAuthorId = null;
    acquireEditLock.mockClear();
    routerPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-156: creator sees Edit and acquires lock', async () => {
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    // SC-PACK-181: no separate «К наборам» when App breadcrumbs cover the path
    expect(wrapper.findAll('button').some((b) => b.text().includes('content.catalogNav'))).toBe(
      false,
    );
    const edit = wrapper.find('[data-test-id="pack-author-edit"]');
    expect(edit.exists()).toBe(true);
    await edit.trigger('click');
    await flushPromises();
    expect(acquireEditLock).toHaveBeenCalledWith('p1');
    expect(routerPush).toHaveBeenCalledWith({ name: 'content-pack-edit', params: { id: 'p1' } });
  });

  it('SC-PACK-157: staff Edit hidden when author request open', async () => {
    authState.isStaff = true;
    contentState.pendingPackAuthorId = 'u1';
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('[data-test-id="pack-staff-edit"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="pack-staff-edit-blocked"]').exists()).toBe(true);
  });

  it('SC-PACK-158: task-set author sees Edit on own set', async () => {
    authState.user = { id: 'contrib', anonymous: false };
    contentState.pack = { ...contentState.pack, createdBy: 'owner' };
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('[data-test-id="pack-author-edit"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="pack-task-set-author-edit"]').exists()).toBe(true);
  });
});

describe('live task-set moderation marks (SC-PACK-171…174)', () => {
  beforeEach(() => {
    authState.user = { id: 'contrib', anonymous: false };
    authState.needsEmailVerification = false;
    authState.isStaff = false;
    contentState.error = null;
    contentState.pack = {
      id: 'p1',
      title: 'Live',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
      createdBy: 'owner',
      inCollection: false,
      isFavorite: false,
    };
    contentState.liveContent = {
      title: 'Live',
      description: '',
      answerCards: [{ id: 'c1', content: 'A', description: '' }],
      taskSets: [
        {
          id: 'ts1',
          authorUserId: 'contrib',
          authorDisplayName: 'Contrib',
          coauthorLabels: [],
          moderationStatus: 'pending',
          tasks: [],
        },
      ],
    };
    contentState.pendingPackAuthorId = null;
    contentState.pendingTaskSetAuthorId = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-171: set author sees pending on live set row', async () => {
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    const badge = wrapper.find('[data-test-id="pack-task-set-status-ts1"]');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain('content.taskSetStatusMarks.pending');
  });

  it('SC-PACK-172: set author sees needs_revision on live set row', async () => {
    contentState.liveContent = {
      ...contentState.liveContent,
      taskSets: [
        {
          ...contentState.liveContent.taskSets[0]!,
          moderationStatus: 'needs_revision',
        },
      ],
    };
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('[data-test-id="pack-task-set-status-ts1"]').text()).toContain(
      'content.taskSetStatusMarks.needs_revision',
    );
  });

  it('SC-PACK-173: pack creator does not see foreign set moderation marks', async () => {
    authState.user = { id: 'owner', anonymous: false };
    contentState.pack = { ...contentState.pack, createdBy: 'owner' };
    // Server omits foreign marks for pack creator (null).
    contentState.liveContent = {
      ...contentState.liveContent,
      taskSets: [
        {
          ...contentState.liveContent.taskSets[0]!,
          authorUserId: 'contrib',
          moderationStatus: null,
        },
      ],
    };
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('[data-test-id="pack-task-set-status-ts1"]').exists()).toBe(false);
  });

  it('SC-PACK-174: staff sees set moderation marks', async () => {
    authState.user = { id: 'staff1', anonymous: false };
    authState.isStaff = true;
    contentState.liveContent = {
      ...contentState.liveContent,
      taskSets: [
        {
          ...contentState.liveContent.taskSets[0]!,
          moderationStatus: 'pending',
        },
      ],
    };
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('[data-test-id="pack-task-set-status-ts1"]').text()).toContain(
      'content.taskSetStatusMarks.pending',
    );
  });

  it('SC-PACK-179: cancelled task_set shows draft mark for set author', async () => {
    contentState.liveContent = {
      ...contentState.liveContent,
      taskSets: [
        {
          ...contentState.liveContent.taskSets[0]!,
          moderationStatus: 'draft',
        },
      ],
    };
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('[data-test-id="pack-task-set-status-ts1"]').text()).toContain(
      'content.taskSetStatusMarks.needs_moderation',
    );
  });
});

describe('never-live add-task-set ghost (SC-PACK-188…190)', () => {
  beforeEach(() => {
    authState.user = { id: 'contrib', anonymous: false };
    authState.needsEmailVerification = false;
    authState.isStaff = false;
    contentState.error = null;
    contentState.pack = {
      id: 'p1',
      title: 'Live',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
      createdBy: 'owner',
      inCollection: false,
      isFavorite: false,
    };
    contentState.liveContent = {
      title: 'Live',
      description: '',
      answerCards: [{ id: 'c1', content: 'A', description: '' }],
      taskSets: [
        {
          id: 'ts0',
          authorUserId: 'other',
          authorDisplayName: 'Other',
          coauthorLabels: [],
          moderationStatus: null,
          tasks: [{ id: 't0', question: 'Q0', difficulty: 1, slots: [] }],
        },
        {
          id: 'ts-ghost',
          authorUserId: 'contrib',
          authorDisplayName: 'Contrib',
          coauthorLabels: [],
          moderationStatus: 'needs_revision',
          neverLive: true,
          tasks: [{ id: 'tg1', question: 'Ghost Q', difficulty: 1, slots: [] }],
        },
      ],
    };
    contentState.pendingPackAuthorId = null;
    contentState.pendingTaskSetAuthorId = 'contrib';
    routerPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-188: set author sees never-live set with needs_revision; live set not falsely marked', async () => {
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('[data-test-id="pack-task-set-ghost-ts-ghost"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="pack-task-set-status-ts-ghost"]').text()).toContain(
      'content.taskSetStatusMarks.needs_revision',
    );
    // S0 remains without inheriting needs_revision from ghost S1 (SC-PACK-187 client view).
    expect(wrapper.find('[data-test-id="pack-task-set-status-ts0"]').exists()).toBe(false);
  });

  it('SC-PACK-189: others do not see never-live set on live list', async () => {
    // Server omits ghost for non-authors — client just renders what it receives.
    authState.user = { id: 'owner', anonymous: false };
    contentState.liveContent = {
      ...contentState.liveContent,
      taskSets: [
        {
          id: 'ts0',
          authorUserId: 'other',
          authorDisplayName: 'Other',
          coauthorLabels: [],
          moderationStatus: null,
          tasks: [{ id: 't0', question: 'Q0', difficulty: 1, slots: [] }],
        },
      ],
    };
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.find('[data-test-id="pack-task-set-ghost-ts-ghost"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Ghost Q');
  });

  it('SC-PACK-190: never-live set row opens Edit (add-task-set amend)', async () => {
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    await wrapper.find('[data-test-id="pack-task-set-ghost-ts-ghost"]').trigger('click');
    await flushPromises();
    expect(routerPush).toHaveBeenCalledWith({
      name: 'content-pack-add-task-set',
      params: { id: 'p1' },
    });
  });
});

describe('staff take UI (SC-PACK-161…163)', () => {
  beforeEach(() => {
    authState.user = { id: 'staff1', anonymous: false };
    authState.isStaff = true;
    contentState.error = null;
    contentState.staffPending = [
      {
        requestId: 'r1',
        packId: 'p1',
        changeAuthorId: 'u1',
        status: 'pending',
        title: 'Pack',
        type: 'pack',
        updatedAt: '2026-01-01T00:00:00.000Z',
        takenBy: null,
        takenAt: null,
      },
    ];
    contentState.staffPreview = {
      request: {
        id: 'r1',
        packId: 'p1',
        changeAuthorId: 'u1',
        revisionId: 'rev1',
        status: 'pending',
        type: 'pack',
        takenBy: null,
        takenAt: null,
      },
      pack: contentState.pack,
      content: contentState.liveContent,
      messages: [],
      canApprove: true,
    };
    takeModerationRequest.mockClear();
    approveRequest.mockClear();
    routerPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-161: queue shows take; detail gates approve until take', async () => {
    const queue = shallowMount(ContentStaffPage, { global: { stubs } });
    await flushPromises();
    expect(queue.find('[data-test-id="staff-queue-take"]').exists()).toBe(true);

    const detail = shallowMount(ContentStaffRequestPage, { global: { stubs } });
    await flushPromises();
    const approve = detail.find('[data-test-id="staff-approve"]');
    expect(approve.exists()).toBe(true);
    expect((approve.element as HTMLButtonElement).disabled).toBe(true);

    await detail.find('[data-test-id="staff-take"]').trigger('click');
    await flushPromises();
    expect(takeModerationRequest).toHaveBeenCalledWith('r1');
  });

  it('SC-PACK-162: taken by other disables take and actions', async () => {
    contentState.staffPreview = {
      ...contentState.staffPreview!,
      request: {
        ...contentState.staffPreview!.request,
        takenBy: 'other-staff',
        takenAt: new Date().toISOString(),
      },
    };
    const detail = shallowMount(ContentStaffRequestPage, { global: { stubs } });
    await flushPromises();
    expect((detail.find('[data-test-id="staff-take"]').element as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (detail.find('[data-test-id="staff-approve"]').element as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
