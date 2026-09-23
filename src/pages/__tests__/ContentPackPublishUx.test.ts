import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPackEditorPage from '@/pages/ContentPackEditorPage.vue';
import ContentPackPage from '@/pages/ContentPackPage.vue';
import ContentPackTasksPage from '@/pages/ContentPackTasksPage.vue';
import ContentStaffTasksPage from '@/pages/ContentStaffTasksPage.vue';
import type { PackContent, TaskSet } from '@/stores/content';

const {
  mockRoute,
  mockPush,
  contentState,
  authState,
  loadDraft,
  loadLivePack,
  loadStaffPreview,
  rebaseDraft,
  unpublishLiveTaskSet,
} = vi.hoisted(() => {
  const contentState = {
    error: null as string | null,
    loading: false,
    saving: false,
    pack: null as {
      id: string;
      title: string;
      description: string;
      blocked: boolean;
      hasLive: boolean;
      createdBy: string;
      inCollection?: boolean;
      unpublishedByStaff?: boolean;
      hasLastLive?: boolean;
    } | null,
    liveContent: null as PackContent | null,
    draft: null as PackContent | null,
    answersDirty: false,
    tasksDirty: false,
    taskSetMarks: [] as { id: string; needsModeration: boolean }[],
    cascadeGapTaskIds: [] as string[],
    answersModeration: {
      status: 'none' as string,
      requestId: null as string | null,
      changeAuthorId: null as string | null,
      isAuthor: false,
    },
    tasksModeration: {
      status: 'none' as string,
      requestId: null as string | null,
      changeAuthorId: null as string | null,
      isAuthor: false,
    },
    pendingAnswersRequestId: null as string | null,
    pendingTasksRequestId: null as string | null,
    pendingAnswersAuthorId: null as string | null,
    pendingTasksAuthorId: null as string | null,
    isAnswersPendingAuthor: false,
    isTasksPendingAuthor: false,
    pendingRequestId: null as string | null,
    isPendingAuthor: false,
    draftStale: false,
    moderationMessages: [] as unknown[],
    taskHasCascadeGap: (id: string) => contentState.cascadeGapTaskIds.includes(id),
    taskSetHasCascadeGap: (ts: TaskSet) =>
      ts.tasks.some((t) => contentState.cascadeGapTaskIds.includes(t.id)),
    pruneCascadeGaps: vi.fn(),
    markCascadeGaps: vi.fn(),
    restoreCascadeGapsIfNeeded: vi.fn(),
  };
  const authState = {
    user: { id: 'u1', anonymous: false } as { id: string; anonymous: boolean } | null,
    needsEmailVerification: false,
    isStaff: true,
  };
  return {
    mockRoute: {
      params: { id: 'p1', taskSetId: 'ts1' },
      name: 'content-pack',
      path: '/content/packs/p1',
      query: {},
    },
    mockPush: vi.fn(),
    contentState,
    authState,
    loadDraft: vi.fn(),
    loadLivePack: vi.fn(),
    loadStaffPreview: vi.fn(),
    rebaseDraft: vi.fn(),
    unpublishLiveTaskSet: vi.fn(),
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: mockPush, replace: vi.fn() }),
    useRoute: () => mockRoute,
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
      loadDraft,
      loadLivePack,
      loadStaffPreview,
      loadModeration: vi.fn().mockResolvedValue({ messages: [] }),
      saveDraft: vi.fn(),
      submitAnswers: vi.fn(),
      submitTasks: vi.fn(),
      postModerationMessage: vi.fn(),
      approveRequest: vi.fn(),
      rejectRequest: vi.fn(),
      cancelRequest: vi.fn(),
      postStaffMessage: vi.fn(),
      addToCollection: vi.fn(),
      deleteUnpublishedPack: vi.fn(),
      deleteTaskSet: vi.fn(),
      rebaseDraft,
      unpublishLiveTaskSet,
      unpublishPack: vi.fn(),
      republishPack: vi.fn(),
    })),
  };
});

const sampleDraft: PackContent = {
  title: 'Pack',
  description: '',
  answerCards: [
    { id: 'c1', content: 'Paris', description: '' },
    { id: 'c2', content: 'Lyon', description: '' },
  ],
  taskSets: [
    {
      id: 'ts1',
      authorUserId: 'u1',
      coauthorLabels: [],
      tasks: [
        {
          id: 't1',
          question: 'Capital?',
          difficulty: 1,
          slots: [
            { id: 's1', answerCardId: 'c1' },
            { id: 's2', answerCardId: null },
          ],
        },
      ],
    },
    {
      id: 'ts2',
      authorUserId: 'u1',
      coauthorLabels: [],
      tasks: [
        {
          id: 't2',
          question: 'Second?',
          difficulty: 1,
          slots: [{ id: 's3', answerCardId: 'c2' }],
        },
      ],
    },
  ],
};

function resetState() {
  contentState.error = null;
  contentState.loading = false;
  contentState.saving = false;
  contentState.pack = {
    id: 'p1',
    title: 'Pack',
    description: '',
    blocked: false,
    hasLive: true,
    createdBy: 'u1',
    inCollection: true,
  };
  contentState.liveContent = structuredClone(sampleDraft);
  contentState.draft = structuredClone(sampleDraft);
  contentState.answersDirty = false;
  contentState.tasksDirty = false;
  contentState.taskSetMarks = [];
  contentState.cascadeGapTaskIds = [];
  contentState.answersModeration = {
    status: 'approved',
    requestId: null,
    changeAuthorId: null,
    isAuthor: false,
  };
  contentState.tasksModeration = {
    status: 'approved',
    requestId: null,
    changeAuthorId: null,
    isAuthor: false,
  };
  contentState.pendingAnswersRequestId = null;
  contentState.pendingTasksRequestId = null;
  contentState.pendingAnswersAuthorId = null;
  contentState.pendingTasksAuthorId = null;
  contentState.isAnswersPendingAuthor = false;
  contentState.isTasksPendingAuthor = false;
  contentState.draftStale = false;
  authState.user = { id: 'u1', anonymous: false };
  authState.needsEmailVerification = false;
  authState.isStaff = true;
  mockRoute.params = { id: 'p1', taskSetId: 'ts1' };
  loadDraft.mockReset();
  loadLivePack.mockReset();
  loadStaffPreview.mockReset();
  rebaseDraft.mockReset();
  unpublishLiveTaskSet.mockReset();
  loadDraft.mockResolvedValue({
    pack: contentState.pack,
    draft: structuredClone(sampleDraft),
  });
  loadLivePack.mockResolvedValue(undefined);
  rebaseDraft.mockResolvedValue({
    pack: contentState.pack,
    draft: structuredClone(sampleDraft),
    draftStale: false,
  });
  unpublishLiveTaskSet.mockResolvedValue({ ok: true, packId: 'p1', removedTaskSetId: 'ts2' });
  loadStaffPreview.mockResolvedValue({
    pack: contentState.pack,
    content: structuredClone(sampleDraft),
    request: { id: 'r1', packId: 'p1', changeAuthorId: 'u1', revisionId: 'rev', status: 'pending' },
    messages: [],
    nested: {
      tasksPending: {
        requestId: 'r1',
        changeAuthorId: 'u1',
        status: 'pending',
        type: 'tasks',
      },
      tasksContent: { taskSets: sampleDraft.taskSets, title: 'Pack' },
      hasLiveTasks: true,
    },
    tasksOnly: false,
  });
}

describe('content pack publish UX UI (SC-PACK-85…89)', () => {
  beforeEach(() => {
    resetState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-86: cards page subtitle is published when answers approved + hasLive', async () => {
    contentState.pack!.hasLive = true;
    contentState.answersModeration.status = 'approved';
    contentState.answersDirty = false;

    const wrapper = shallowMount(ContentPackEditorPage);
    await flushPromises();

    expect(wrapper.text()).toContain('content.taskSetStatusMarks.published');
    expect(wrapper.text()).not.toContain('content.slotsCount');
  });

  it('SC-PACK-87: tasks page subtitle is approved when tasks approved and no catalog live', async () => {
    contentState.pack!.hasLive = false;
    contentState.tasksModeration.status = 'approved';
    contentState.tasksDirty = false;

    const wrapper = shallowMount(ContentPackTasksPage);
    await flushPromises();

    expect(wrapper.text()).toContain('content.taskSetStatusMarks.approved');
  });

  it('SC-PACK-88: live pack shows slot chips, not slotsCount alone', async () => {
    const wrapper = shallowMount(ContentPackPage, {
      global: {
        stubs: {
          'q-chip': { template: '<span class="q-chip-stub"><slot /></span>', name: 'QChip' },
          'q-page': { template: '<div><slot /></div>' },
          'q-btn': true,
          'q-banner': true,
          'q-list': { template: '<div><slot /></div>' },
          'q-item': { template: '<div><slot /></div>' },
          'q-item-section': { template: '<div><slot /></div>' },
          'q-item-label': { template: '<div><slot /></div>' },
          'q-badge': true,
          'q-dialog': true,
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
        },
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Paris');
    expect(wrapper.text()).toContain('content.slotEmpty');
    expect(wrapper.text()).not.toContain('content.slotsCount');
    expect(wrapper.findAll('.q-chip-stub').length).toBeGreaterThan(0);
  });

  it('SC-PACK-89: staff tasks preview shows slot chips', async () => {
    mockRoute.params = { id: 'r1', taskSetId: 'ts1' };
    const wrapper = shallowMount(ContentStaffTasksPage, {
      global: {
        stubs: {
          'q-chip': { template: '<span class="q-chip-stub"><slot /></span>', name: 'QChip' },
          'q-page': { template: '<div><slot /></div>' },
          'q-btn': true,
          'q-banner': true,
          'q-list': { template: '<div><slot /></div>' },
          'q-item': { template: '<div><slot /></div>' },
          'q-item-section': { template: '<div><slot /></div>' },
          'q-item-label': { template: '<div><slot /></div>' },
          'q-form': true,
          'q-input': true,
          'q-dialog': true,
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
        },
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Paris');
    expect(wrapper.text()).toContain('content.slotEmpty');
    expect(wrapper.text()).not.toMatch(/Paris ·/);
    expect(wrapper.findAll('.q-chip-stub').length).toBeGreaterThan(0);
  });

  it('SC-PACK-85: cascade uses outline class, not bg-warning fill', async () => {
    contentState.cascadeGapTaskIds = ['t1'];
    contentState.answersDirty = true;

    const tasks = shallowMount(ContentPackTasksPage);
    await flushPromises();
    const gapItem = tasks.find('.cascade-gap-outline');
    expect(gapItem.exists()).toBe(true);
    expect(tasks.find('.bg-warning').exists()).toBe(false);

    const editor = shallowMount(ContentPackEditorPage);
    await flushPromises();
    expect(editor.find('.cascade-gap-outline').exists()).toBe(true);
    expect(editor.find('.bg-warning').exists()).toBe(false);
  });

  it('SC-PACK-90: cards editor shows stale banner and pull control', async () => {
    contentState.draftStale = true;

    const wrapper = shallowMount(ContentPackEditorPage, {
      global: {
        stubs: {
          'q-banner': {
            template: '<div class="q-banner-stub"><slot /><slot name="action" /></div>',
          },
          'q-btn': {
            template: '<button type="button" v-bind="$attrs"><slot /></button>',
          },
          'q-page': { template: '<div><slot /></div>' },
          'q-dialog': { template: '<div><slot /></div>' },
          'q-card': { template: '<div><slot /></div>' },
          'q-card-section': { template: '<div><slot /></div>' },
          'q-card-actions': { template: '<div><slot /></div>' },
          'q-list': { template: '<div><slot /></div>' },
          'q-item': { template: '<div><slot /></div>' },
          'q-item-section': { template: '<div><slot /></div>' },
          'q-item-label': { template: '<div><slot /></div>' },
          'q-form': true,
          'q-input': true,
          'q-badge': true,
          'q-icon': true,
          'q-tooltip': true,
        },
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('content.draftStaleBanner');
    expect(wrapper.text()).toContain('content.draftStalePull');
  });

  it('SC-PACK-91: pull confirm calls rebaseDraft', async () => {
    contentState.draftStale = true;
    const wrapper = shallowMount(ContentPackEditorPage, {
      global: {
        stubs: {
          'q-banner': {
            template: '<div class="q-banner-stub"><slot /><slot name="action" /></div>',
          },
          'q-btn': {
            props: ['label'],
            template:
              '<button type="button" v-bind="$attrs" @click="$emit(\'click\')">{{ label }}<slot /></button>',
          },
          'q-page': { template: '<div><slot /></div>' },
          'q-dialog': { template: '<div class="dialog"><slot /></div>' },
          'q-card': { template: '<div><slot /></div>' },
          'q-card-section': { template: '<div><slot /></div>' },
          'q-card-actions': { template: '<div><slot /></div>' },
          'q-list': { template: '<div><slot /></div>' },
          'q-item': { template: '<div><slot /></div>' },
          'q-item-section': { template: '<div><slot /></div>' },
          'q-item-label': { template: '<div><slot /></div>' },
          'q-form': true,
          'q-input': true,
          'q-badge': true,
          'q-icon': true,
          'q-tooltip': true,
        },
      },
    });
    await flushPromises();

    const bannerPull = wrapper
      .findAll('button')
      .find((b) => b.text().includes('content.draftStalePull'));
    expect(bannerPull).toBeTruthy();
    await bannerPull!.trigger('click');
    await flushPromises();

    const confirmPull = wrapper
      .findAll('button')
      .filter((b) => b.text().includes('content.draftStalePull'))
      .at(-1);
    expect(confirmPull).toBeTruthy();
    await confirmPull!.trigger('click');
    await flushPromises();

    expect(rebaseDraft).toHaveBeenCalledWith('p1');
  });

  it('SC-PACK-95: staff sees unpublish on task-set row when ≥2 live sets', async () => {
    // Live ids remapped vs draft (copyRevision) — match by fingerprint, not id.
    const draft = structuredClone(sampleDraft);
    contentState.liveContent = {
      ...draft,
      taskSets: draft.taskSets.map((ts, i) => ({
        ...ts,
        id: `live-ts-${i + 1}`,
        tasks: ts.tasks.map((t, ti) => ({
          ...t,
          id: `live-t-${i}-${ti}`,
          slots: t.slots.map((s, si) => ({ ...s, id: `live-s-${i}-${ti}-${si}` })),
        })),
      })),
    };
    const wrapper = shallowMount(ContentPackEditorPage, {
      global: {
        stubs: {
          'q-btn': {
            template: '<button type="button" v-bind="$attrs"><slot /></button>',
          },
          'q-page': { template: '<div><slot /></div>' },
          'q-list': { template: '<div><slot /></div>' },
          'q-item': { template: '<div><slot /></div>' },
          'q-item-section': { template: '<div><slot /></div>' },
          'q-item-label': { template: '<div><slot /></div>' },
          'q-banner': true,
          'q-dialog': true,
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
          'q-form': true,
          'q-input': true,
          'q-badge': true,
          'q-icon': true,
          'q-tooltip': true,
        },
      },
    });
    await flushPromises();

    const unpublishBtns = wrapper
      .findAll('button')
      .filter((b) => b.attributes('aria-label') === 'content.unpublishTaskSet');
    expect(unpublishBtns.length).toBeGreaterThanOrEqual(2);
  });

  it('SC-PACK-95: unpublish confirm POSTs live task-set id (not draft id)', async () => {
    const draft = structuredClone(sampleDraft);
    contentState.liveContent = {
      ...draft,
      taskSets: draft.taskSets.map((ts, i) => ({
        ...ts,
        id: `live-ts-${i + 1}`,
      })),
    };
    const wrapper = shallowMount(ContentPackEditorPage, {
      global: {
        stubs: {
          'q-btn': {
            props: ['label'],
            template:
              '<button type="button" v-bind="$attrs" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
          },
          'q-page': { template: '<div><slot /></div>' },
          'q-list': { template: '<div><slot /></div>' },
          'q-item': { template: '<div><slot /></div>' },
          'q-item-section': { template: '<div><slot /></div>' },
          'q-item-label': { template: '<div><slot /></div>' },
          'q-banner': true,
          'q-dialog': { template: '<div class="dialog"><slot /></div>' },
          'q-card': { template: '<div><slot /></div>' },
          'q-card-section': { template: '<div><slot /></div>' },
          'q-card-actions': { template: '<div><slot /></div>' },
          'q-form': true,
          'q-input': true,
          'q-badge': true,
          'q-icon': true,
          'q-tooltip': true,
        },
      },
    });
    await flushPromises();

    const unpublishBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('aria-label') === 'content.unpublishTaskSet');
    expect(unpublishBtn).toBeTruthy();
    await unpublishBtn!.trigger('click');
    await flushPromises();

    const confirmBtn = wrapper
      .findAll('button')
      .filter((b) => b.text().includes('content.unpublishTaskSet'))
      .at(-1);
    expect(confirmBtn).toBeTruthy();
    await confirmBtn!.trigger('click');
    await flushPromises();

    expect(unpublishLiveTaskSet).toHaveBeenCalledWith('p1', 'live-ts-1');
  });

  it('SC-PACK-96: no task-set unpublish when only one live set', async () => {
    contentState.liveContent = {
      ...structuredClone(sampleDraft),
      taskSets: [
        {
          ...structuredClone(sampleDraft.taskSets[0]!),
          id: 'live-only',
        },
      ],
    };
    const wrapper = shallowMount(ContentPackEditorPage, {
      global: {
        stubs: {
          'q-btn': {
            template: '<button type="button" v-bind="$attrs"><slot /></button>',
          },
          'q-page': { template: '<div><slot /></div>' },
          'q-list': { template: '<div><slot /></div>' },
          'q-item': { template: '<div><slot /></div>' },
          'q-item-section': { template: '<div><slot /></div>' },
          'q-item-label': { template: '<div><slot /></div>' },
          'q-banner': true,
          'q-dialog': true,
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
          'q-form': true,
          'q-input': true,
          'q-badge': true,
          'q-icon': true,
          'q-tooltip': true,
        },
      },
    });
    await flushPromises();

    const unpublishBtns = wrapper
      .findAll('button')
      .filter((b) => b.attributes('aria-label') === 'content.unpublishTaskSet');
    expect(unpublishBtns).toHaveLength(0);
  });
});
