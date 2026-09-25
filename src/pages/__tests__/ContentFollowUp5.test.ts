import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPackEditorPage from '@/pages/ContentPackEditorPage.vue';
import ContentPackPage from '@/pages/ContentPackPage.vue';
import ContentPackTasksPage from '@/pages/ContentPackTasksPage.vue';
import ContentStaffRequestPage from '@/pages/ContentStaffRequestPage.vue';
import type { PackContent, StaffPreview } from '@/stores/content';

const {
  contentState,
  authState,
  loadLivePack,
  loadDraft,
  loadStaffEdit,
  loadStaffPreview,
  acquireEditLock,
} = vi.hoisted(() => {
  const liveContent: PackContent = {
    title: 'Большой пак',
    description: '',
    answerCards: [
      { id: 'c1', content: 'Ответ Альфа', description: '' },
      { id: 'c2', content: 'Ответ Бета', description: '' },
    ],
    taskSets: [
      {
        id: 'ts1',
        authorUserId: 'u1',
        authorDisplayName: 'Мария',
        coauthorLabels: [],
        inCatalog: true,
        tasks: [
          {
            id: 't1',
            question: 'Q1?',
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
      {
        id: 'ts2',
        authorUserId: 'u1',
        authorDisplayName: 'Мария',
        coauthorLabels: ['соавтор'],
        inCatalog: true,
        tasks: [
          {
            id: 't3',
            question: 'Q3?',
            difficulty: 1,
            slots: [{ id: 's3', answerCardId: 'c1' }],
          },
          {
            id: 't4',
            question: 'Q4?',
            difficulty: 3,
            slots: [{ id: 's4', answerCardId: 'c2' }],
          },
        ],
      },
    ],
  };

  /** SC-PACK-134: task_set preview with live answerCards (server D17). */
  const taskSetPreview: StaffPreview = {
    request: {
      id: 'req-ts',
      packId: 'p1',
      changeAuthorId: 'u2',
      revisionId: 'rev-ts',
      status: 'pending',
      type: 'task_set',
    },
    pack: {
      id: 'p1',
      title: 'Большой пак',
      description: '',
      blocked: false,
      hasLive: true,
      createdBy: 'u1',
      inCatalog: true,
    },
    content: {
      title: 'Большой пак',
      description: '',
      answerCards: [
        { id: 'c1', content: 'Ответ Альфа', description: '' },
        { id: 'c2', content: 'Ответ Бета', description: '' },
      ],
      taskSets: [
        {
          id: 'ts-new',
          authorUserId: 'u2',
          authorDisplayName: 'ivan',
          coauthorLabels: [],
          tasks: [
            {
              id: 'tn1',
              question: 'New Q1?',
              difficulty: 1,
              slots: [{ id: 'sn1', answerCardId: 'c1' }],
            },
            {
              id: 'tn2',
              question: 'New Q2?',
              difficulty: 2,
              slots: [{ id: 'sn2', answerCardId: 'c2' }],
            },
          ],
        },
      ],
    },
    messages: [],
    canApprove: true,
  };

  const contentState = {
    error: null as string | null,
    loading: false,
    saving: false,
    pack: {
      id: 'p1',
      title: 'Большой пак',
      description: '',
      blocked: false,
      hasLive: true,
      createdBy: 'u1',
      inCatalog: true,
      inCollection: true,
    },
    liveContent: structuredClone(liveContent),
    draft: structuredClone(liveContent),
    staffPreview: null as StaffPreview | null,
    staffEditTarget: null as 'live' | 'working' | null,
    moderationStatus: null as string | null,
    pendingRequestId: null as string | null,
    isPendingAuthor: false,
    taskSetHasCascadeGap: vi.fn(() => false),
    taskHasCascadeGap: vi.fn(() => false),
    markCascadeGaps: vi.fn(),
    pruneCascadeGaps: vi.fn(),
    cascadeGapTaskIds: new Set<string>(),
    _taskSetPreview: taskSetPreview,
  };
  const authState = {
    user: { id: 'u1', anonymous: false } as { id: string; anonymous: boolean } | null,
    needsEmailVerification: false,
    isStaff: false,
  };
  return {
    contentState,
    authState,
    loadLivePack: vi.fn().mockImplementation(() =>
      Promise.resolve({
        pack: contentState.pack,
        content: contentState.liveContent,
      }),
    ),
    loadDraft: vi.fn().mockImplementation(() =>
      Promise.resolve({
        draft: contentState.draft,
      }),
    ),
    loadStaffEdit: vi.fn().mockResolvedValue(undefined),
    loadStaffPreview: vi.fn().mockResolvedValue(undefined),
    acquireEditLock: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useRoute: () => ({
      params: { id: 'p1', taskSetId: 'ts1' },
      query: { view: 'live' },
      path: '/content/packs/p1/tasks/ts1',
      name: 'content-pack-tasks',
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
      loadLivePack,
      loadDraft,
      loadStaffEdit,
      loadStaffPreview,
      acquireEditLock,
      refreshEditLock: vi.fn(),
      releaseEditLock: vi.fn(),
      staffSavePack: vi.fn(),
      saveDraft: vi.fn(),
      unpublishTaskSet: vi.fn(),
      republishTaskSet: vi.fn(),
      deleteTaskSet: vi.fn(),
      loadModeration: vi.fn().mockResolvedValue({ messages: [] }),
      postModerationMessage: vi.fn(),
      listPublishedTaskSetCount: () =>
        (contentState.liveContent?.taskSets ?? []).filter((ts) => ts.inCatalog !== false).length,
    })),
  };
});

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': {
    props: ['clickable', 'disable'],
    template:
      '<div class="q-item-stub" v-bind="$attrs" @click="$attrs.onClick?.($event)"><slot /></div>',
  },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable', 'to', 'loading', 'flat', 'dense', 'color', 'icon'],
    template: '<button type="button">{{ label }}<slot /></button>',
  },
  'q-chip': {
    props: ['dense', 'outline', 'color'],
    template: '<span class="q-chip-stub"><slot /></span>',
  },
  'q-badge': { template: '<span><slot /></span>' },
  'q-banner': { template: '<div><slot /><slot name="action" /></div>' },
  'q-tooltip': { template: '<span />' },
  'q-space': { template: '<span />' },
  'q-icon': { template: '<i />' },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-dialog': { template: '<div v-if="modelValue"><slot /></div>', props: ['modelValue'] },
  'q-form': { template: '<form @submit.prevent="$emit(\'submit\')"><slot /></form>' },
  'q-input': {
    props: ['modelValue', 'label'],
    template: '<input :aria-label="label" :value="modelValue" />',
  },
  'q-select': { template: '<select />' },
};

describe('content follow-up 5 (SC-PACK-134…136)', () => {
  beforeEach(() => {
    authState.isStaff = false;
    authState.user = { id: 'u1', anonymous: false };
    contentState.staffPreview = null;
    contentState.staffEditTarget = null;
    contentState.liveContent = structuredClone(contentState.liveContent);
    contentState.draft = structuredClone(contentState.draft);
    // restore liveContent from initial shape if tests mutated
    contentState.liveContent.taskSets.forEach((ts) => {
      ts.authorDisplayName = 'Мария';
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-134: staff task_set preview shows answer card text, not slotFilled', async () => {
    authState.isStaff = true;
    contentState.staffPreview = structuredClone(contentState._taskSetPreview);

    const wrapper = shallowMount(ContentStaffRequestPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('Ответ Альфа');
    expect(wrapper.text()).toContain('Ответ Бета');
    expect(wrapper.text()).not.toContain('content.slotFilled');
    expect(wrapper.text()).toContain('content.taskSetLabelFrom');
  });

  it('SC-PACK-135: live and editor show author on every task-set row', async () => {
    const live = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    const liveText = live.text();
    expect(liveText).toContain('content.taskSetLabelFrom');
    // Two separate rows (not collapsed) — both rendered
    const liveRows = live
      .findAll('.q-item-stub')
      .filter((n) => n.text().includes('content.taskSetLabelFrom'));
    expect(liveRows.length).toBe(2);

    contentState.staffEditTarget = 'live';
    authState.isStaff = true;
    const editor = shallowMount(ContentPackEditorPage, { global: { stubs } });
    await flushPromises();
    const editorRows = editor
      .findAll('.q-item-stub')
      .filter((n) => n.text().includes('content.taskSetLabelFrom'));
    expect(editorRows.length).toBe(2);
    expect(editor.text()).toContain('соавтор');
  });

  it('SC-PACK-136/182: live drill-in has no «Вернуться»; crumbs cover path', async () => {
    contentState.draft = structuredClone(contentState.liveContent);
    const wrapper = shallowMount(ContentPackTasksPage, { global: { stubs } });
    await flushPromises();

    const buttons = wrapper.findAll('button');
    // SC-PACK-182: live view no longer shows content.back («Вернуться»).
    expect(buttons.some((b) => b.text() === 'content.back')).toBe(false);
    expect(wrapper.text()).not.toMatch(/Большой пак(?!.*content)/);
    // Heading uses author label, not pack title as back
    expect(wrapper.text()).toContain('content.taskSetLabelFrom');
  });
});
