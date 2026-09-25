import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPackAddTaskSetPage from '@/pages/ContentPackAddTaskSetPage.vue';
import ContentPackEditorPage from '@/pages/ContentPackEditorPage.vue';
import ContentStaffRequestPage from '@/pages/ContentStaffRequestPage.vue';
import type {
  AddTaskSetState,
  ModerationMessage,
  PackContent,
  StaffPreview,
} from '@/stores/content';

const editorPagePath = resolve(process.cwd(), 'src/pages/ContentPackEditorPage.vue');

const draftContent: PackContent = {
  title: 'Pack',
  description: '',
  answerCards: [
    { id: 'c1', content: 'Alpha', description: '' },
    { id: 'c2', content: 'Beta', description: '' },
  ],
  taskSets: [
    {
      id: 'ts1',
      authorUserId: 'u1',
      coauthorLabels: [],
      tasks: [
        {
          id: 't1',
          question: 'Q1?',
          difficulty: 1,
          slots: [
            { id: 's1', answerCardId: 'c1' },
            { id: 's2', answerCardId: null },
          ],
        },
      ],
    },
  ],
};

const addTaskSetFixture: AddTaskSetState = {
  pack: {
    id: 'p1',
    title: 'Pack',
    description: '',
    blocked: false,
    hasLive: true,
    createdBy: 'u1',
    inCollection: true,
    inCatalog: true,
  },
  liveCards: [
    { id: 'c1', content: 'Alpha', description: '' },
    { id: 'c2', content: 'Beta', description: '' },
  ],
  draft: {
    title: 'Pack',
    description: '',
    taskSets: [
      {
        id: 'ts-new',
        authorUserId: 'u1',
        coauthorLabels: [],
        tasks: [
          {
            id: 't-new',
            question: 'New Q?',
            difficulty: 1,
            slots: [
              { id: 'ns1', answerCardId: 'c1' },
              { id: 'ns2', answerCardId: null },
            ],
          },
        ],
      },
    ],
  },
  pendingRequestId: 'req-1',
  moderationStatus: 'needs_revision',
  foreignPending: false,
  stagedRevisionId: 'rev-1',
};

const staffPreviewFixture: StaffPreview = {
  request: {
    id: 'req-staff',
    packId: 'p1',
    changeAuthorId: 'u1',
    revisionId: 'rev-1',
    status: 'pending',
    type: 'pack',
  },
  pack: {
    id: 'p1',
    title: 'Pack',
    description: '',
    blocked: false,
    hasLive: false,
    createdBy: 'u1',
  },
  content: draftContent,
  messages: [],
  canApprove: true,
};

const threadMessages: ModerationMessage[] = [
  {
    id: 'm1',
    requestId: 'req-1',
    authorUserId: 'staff-1',
    authorKind: 'staff',
    body: 'Please fix slots',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const {
  contentState,
  authState,
  loadDraft,
  loadAddTaskSet,
  loadStaffPreview,
  loadModeration,
  postModerationMessage,
} = vi.hoisted(() => {
  const contentState = {
    error: null as string | null,
    loading: false,
    saving: false,
    pack: {
      id: 'p1',
      title: 'Pack',
      description: '',
      blocked: false,
      hasLive: false,
      createdBy: 'u1',
    },
    draft: null as PackContent | null,
    addTaskSet: null as AddTaskSetState | null,
    staffPreview: null as StaffPreview | null,
    moderationStatus: null as string | null,
    pendingRequestId: null as string | null,
    isPendingAuthor: false,
    staffEditTarget: null as 'live' | 'working' | null,
    taskSetHasCascadeGap: vi.fn(() => true),
    taskHasCascadeGap: vi.fn(() => false),
    markCascadeGaps: vi.fn(),
    pruneCascadeGaps: vi.fn(),
  };
  const authState = {
    user: { id: 'u1', anonymous: false } as { id: string; anonymous: boolean } | null,
    needsEmailVerification: false,
    isStaff: false,
  };
  return {
    contentState,
    authState,
    loadDraft: vi.fn(),
    loadAddTaskSet: vi.fn().mockResolvedValue(undefined),
    loadStaffPreview: vi.fn().mockResolvedValue(undefined),
    loadModeration: vi.fn(),
    postModerationMessage: vi.fn(),
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useRoute: () => ({
      params: { id: 'p1' },
      query: {},
      path: '/content/packs/p1/edit',
      name: 'content-pack-edit',
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
      loadDraft,
      loadAddTaskSet,
      loadStaffPreview,
      loadModeration,
      postModerationMessage,
      saveDraft: vi.fn(),
      submitPack: vi.fn(),
      submitAddTaskSet: vi.fn(),
      cancelRequest: vi.fn(),
      acquireEditLock: vi.fn(),
      refreshEditLock: vi.fn(),
      releaseEditLock: vi.fn(),
      loadStaffEdit: vi.fn(),
      approveRequest: vi.fn(),
      needsRevisionRequest: vi.fn(),
      postStaffMessage: vi.fn(),
    })),
  };
});

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': {
    template: '<div class="q-item-stub" v-bind="$attrs"><slot /></div>',
  },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable'],
    template: '<button type="button" v-bind="$attrs">{{ label }}<slot /></button>',
  },
  'q-tooltip': { template: '<span class="tooltip-stub"><slot /></span>' },
  'q-banner': true,
  'q-badge': true,
  'q-chip': {
    props: ['outline', 'color'],
    template:
      '<span class="q-chip-stub" :data-outline="outline" :data-color="color"><slot /></span>',
  },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-form': { template: '<form @submit.prevent><slot /></form>' },
  'q-input': {
    props: ['modelValue', 'label'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" :aria-label="label" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  'q-select': true,
  'q-space': true,
  'q-dialog': { template: '<div><slot /></div>' },
  'q-icon': true,
};

describe('moderation UX follow-up (SC-PACK-126…128)', () => {
  beforeEach(() => {
    contentState.error = null;
    contentState.loading = false;
    contentState.draft = null;
    contentState.addTaskSet = null;
    contentState.staffPreview = null;
    contentState.moderationStatus = null;
    contentState.pendingRequestId = null;
    contentState.isPendingAuthor = false;
    contentState.staffEditTarget = null;
    contentState.pack = {
      id: 'p1',
      title: 'Pack',
      description: '',
      blocked: false,
      hasLive: false,
      createdBy: 'u1',
    };
    authState.user = { id: 'u1', anonymous: false };
    authState.isStaff = false;
    authState.needsEmailVerification = false;
    contentState.taskSetHasCascadeGap.mockReturnValue(true);
    loadDraft.mockReset();
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(draftContent),
      moderationStatus: null,
      pendingRequestId: null,
      isPendingAuthor: false,
    });
    loadAddTaskSet.mockClear();
    loadStaffPreview.mockClear();
    loadModeration.mockReset();
    loadModeration.mockResolvedValue({
      request: { id: 'req-1', status: 'needs_revision' },
      messages: structuredClone(threadMessages),
    });
    postModerationMessage.mockReset();
    postModerationMessage.mockResolvedValue({
      request: { id: 'req-1', status: 'needs_revision' },
      messages: structuredClone(threadMessages),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-126: editor task-set row has cascade-gap-outline class and visible CSS', async () => {
    const editorSrc = readFileSync(editorPagePath, 'utf8');
    expect(editorSrc).toMatch(
      /\.cascade-gap-outline\s*\{[^}]*outline:\s*2px solid var\(--q-warning\)/s,
    );

    const wrapper = shallowMount(ContentPackEditorPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.find('.cascade-gap-outline').exists()).toBe(true);
    expect(contentState.taskSetHasCascadeGap).toHaveBeenCalled();
  });

  it('SC-PACK-127: staff hub question rows show answer slot chips', async () => {
    authState.isStaff = true;
    contentState.staffPreview = structuredClone(staffPreviewFixture);

    const wrapper = shallowMount(ContentStaffRequestPage, { global: { stubs } });
    await flushPromises();

    const chips = wrapper.findAll('.q-chip-stub');
    expect(chips.length).toBeGreaterThanOrEqual(2);
    expect(wrapper.text()).toContain('Alpha');
    expect(wrapper.text()).toContain('content.slotEmpty');
  });

  it('SC-PACK-127: add-task-set question list shows answer slot chips', async () => {
    contentState.addTaskSet = structuredClone(addTaskSetFixture);

    const wrapper = shallowMount(ContentPackAddTaskSetPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('New Q?');
    expect(wrapper.text()).toContain('Alpha');
    expect(wrapper.text()).toContain('content.slotEmpty');
    const chips = wrapper.findAll('.q-chip-stub');
    expect(chips.length).toBeGreaterThanOrEqual(2);
  });

  it('SC-PACK-128: add-task-set shows needs_revision status, thread, and reply', async () => {
    contentState.addTaskSet = structuredClone(addTaskSetFixture);

    const wrapper = shallowMount(ContentPackAddTaskSetPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('content.taskSetStatusMarks.needs_revision');
    expect(wrapper.text()).toContain('content.moderationThread');
    expect(wrapper.text()).toContain('Please fix slots');
    expect(wrapper.text()).toContain('content.authorStaff');
    expect(loadModeration).toHaveBeenCalledWith('p1');

    const replyInput = wrapper.find('input[aria-label="content.reply"]');
    expect(replyInput.exists()).toBe(true);
    await replyInput.setValue('Will fix');
    const forms = wrapper.findAll('form');
    expect(forms.length).toBeGreaterThanOrEqual(2);
    await forms[forms.length - 1]!.trigger('submit.prevent');
    await flushPromises();
    expect(postModerationMessage).toHaveBeenCalledWith('p1', 'Will fix');
  });
});

describe('moderation chrome without «К наборам» (SC-PACK-194/195)', () => {
  it('SC-PACK-194/195: pack/staff/my-moderation pages omit content.catalogNav', () => {
    const pages = [
      'src/pages/ContentPackModerationPage.vue',
      'src/pages/ContentStaffPage.vue',
      'src/pages/ContentStaffRequestPage.vue',
      'src/pages/ContentMyModerationPage.vue',
    ];
    for (const rel of pages) {
      const src = readFileSync(resolve(process.cwd(), rel), 'utf8');
      expect(src, rel).not.toContain('content.catalogNav');
    }
  });
});
