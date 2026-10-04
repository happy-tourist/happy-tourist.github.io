import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPackAddTaskSetPage from '@/pages/ContentPackAddTaskSetPage.vue';
import type { AddTaskSetState, ContentPackSummary, TaskSet } from '@/stores/content';

const pack: ContentPackSummary = {
  id: 'p1',
  title: 'Live Pack',
  description: '',
  blocked: false,
  hasLive: true,
  createdBy: 'a1',
  inCatalog: true,
  moderationStatus: 'in_catalog',
};

const incompleteSet: TaskSet = {
  id: 'ts-draft',
  authorUserId: 'u1',
  coauthorLabels: [],
  tasks: [
    {
      id: 't1',
      question: 'Incomplete?',
      difficulty: 1,
      slots: [{ id: 's1', answerCardId: null }],
    },
  ],
};

const readySet: TaskSet = {
  id: 'ts-ready',
  authorUserId: 'u1',
  coauthorLabels: [],
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
      difficulty: 1,
      slots: [{ id: 's2', answerCardId: 'c2' }],
    },
  ],
};

const {
  contentState,
  authState,
  loadAddTaskSet,
  saveAddTaskSet,
  discardAddTaskSetDraft,
  submitAddTaskSet,
  loadModeration,
} = vi.hoisted(() => {
  const contentState = {
    error: null as string | null,
    loading: false,
    saving: false,
    pack: null as ContentPackSummary | null,
    addTaskSet: null as AddTaskSetState | null,
    catalog: [] as ContentPackSummary[],
  };
  const authState = {
    user: { id: 'u1', anonymous: false } as { id: string; anonymous: boolean } | null,
    needsEmailVerification: false,
    isStaff: false,
  };
  return {
    contentState,
    authState,
    loadAddTaskSet: vi.fn().mockResolvedValue(undefined),
    saveAddTaskSet: vi.fn().mockImplementation(() => {
      if (contentState.addTaskSet) {
        const prev = contentState.addTaskSet.moderationStatus;
        contentState.addTaskSet = {
          ...contentState.addTaskSet,
          pendingRequestId: contentState.addTaskSet.pendingRequestId ?? 'r-draft',
          moderationStatus: prev === 'pending' ? 'draft' : (prev ?? 'draft'),
          stagedRevisionId: 'rev1',
          hasUnsubmittedChanges: true,
          canHardDelete: true,
        };
      }
      return Promise.resolve({
        draft: contentState.addTaskSet?.draft,
        pendingRequestId: 'r-draft',
        moderationStatus: contentState.addTaskSet?.moderationStatus ?? 'draft',
        stagedRevisionId: 'rev1',
        hasUnsubmittedChanges: true,
        canHardDelete: true,
      });
    }),
    discardAddTaskSetDraft: vi.fn().mockImplementation(() => {
      if (contentState.addTaskSet) {
        contentState.addTaskSet = {
          ...contentState.addTaskSet,
          draft: {
            title: contentState.addTaskSet.draft.title,
            description: contentState.addTaskSet.draft.description,
            taskSets: [],
          },
          pendingRequestId: null,
          moderationStatus: null,
          stagedRevisionId: null,
          hasUnsubmittedChanges: false,
          canHardDelete: false,
        };
      }
      return Promise.resolve({ ok: true, packId: 'p1', discardedRequestId: 'r-draft' });
    }),
    submitAddTaskSet: vi.fn(),
    loadModeration: vi.fn().mockResolvedValue({ messages: [] }),
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
      path: '/content/packs/p1/add-task-set',
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
    useContentStore: vi.fn(() =>
      Object.assign(contentState, {
        loadAddTaskSet,
        saveAddTaskSet,
        discardAddTaskSetDraft,
        submitAddTaskSet,
        cancelRequest: vi.fn(),
        loadModeration,
        postModerationMessage: vi.fn(),
      }),
    ),
  };
});

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable', 'icon', 'type', 'loading'],
    template:
      '<button type="button" :disabled="disable" :data-label="label" :data-icon="icon" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
  },
  'q-tooltip': { template: '<span><slot /></span>' },
  'q-banner': { template: '<div><slot /><slot name="action" /></div>' },
  'q-dialog': {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /></div>',
  },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': { template: '<div><slot /></div>' },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-form': { template: '<form><slot /></form>' },
  'q-input': true,
  PackTaskComposeDialog: { template: '<div data-testid="task-compose-dialog" />' },
  PackTaskTile: {
    props: ['question', 'editable'],
    template: '<div data-testid="pack-task-tile">{{ question }}</div>',
  },
  PackTasksCsvControls: { template: '<div data-testid="pack-tasks-csv-controls" />' },
};

function mountPage() {
  return shallowMount(ContentPackAddTaskSetPage, {
    global: { stubs },
  });
}

function setupState(wrapper: ReturnType<typeof mountPage>) {
  return (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$.setupState;
}

function seedDraftState(opts?: {
  moderationStatus?: string | null;
  pendingRequestId?: string | null;
  tasks?: TaskSet['tasks'];
  foreignPending?: boolean;
  hasUnsubmittedChanges?: boolean;
  canHardDelete?: boolean;
  taskSet?: TaskSet;
}) {
  const taskSets: TaskSet[] = [
    opts?.taskSet ?? {
      ...incompleteSet,
      tasks: opts?.tasks ?? incompleteSet.tasks,
    },
  ];
  contentState.pack = pack;
  contentState.addTaskSet = {
    pack,
    liveCards: [
      { id: 'c1', content: 'Paris', description: '' },
      { id: 'c2', content: 'Rome', description: '' },
    ],
    draft: { title: pack.title, description: '', taskSets },
    pendingRequestId:
      opts && 'pendingRequestId' in opts ? (opts.pendingRequestId ?? null) : 'r-draft',
    moderationStatus:
      opts && 'moderationStatus' in opts ? (opts.moderationStatus ?? null) : 'draft',
    foreignPending: opts?.foreignPending ?? false,
    stagedRevisionId: 'rev1',
    hasUnsubmittedChanges: opts?.hasUnsubmittedChanges ?? true,
    canHardDelete: opts?.canHardDelete ?? true,
  };
}

const pageSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../ContentPackAddTaskSetPage.vue'),
  'utf8',
);

describe('ContentPackAddTaskSetPage draft lifecycle (SC-PACK-264…275)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    contentState.error = null;
    contentState.loading = false;
    contentState.saving = false;
    contentState.pack = pack;
    contentState.catalog = [];
    authState.user = { id: 'u1', anonymous: false };
    authState.needsEmailVerification = false;
    seedDraftState({
      moderationStatus: null,
      pendingRequestId: null,
      tasks: [],
      hasUnsubmittedChanges: false,
      canHardDelete: false,
    });
    loadAddTaskSet.mockImplementation(() => Promise.resolve(undefined));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('SC-PACK-264: quiet autosave wiring + dirty incomplete change calls saveAddTaskSet', async () => {
    expect(pageSrc).toMatch(/saveAddTaskSet/);
    expect(pageSrc).toMatch(/quiet:\s*true/);
    expect(pageSrc).toMatch(/flushAutosave|scheduleAutosave/);

    seedDraftState({
      moderationStatus: null,
      pendingRequestId: null,
      tasks: [],
      hasUnsubmittedChanges: false,
      canHardDelete: false,
    });
    const wrapper = mountPage();
    await flushPromises();

    const state = setupState(wrapper);
    const ensureLocalSet = state.ensureLocalSet as () => TaskSet;
    const set = ensureLocalSet();
    set.tasks.push({
      id: 't-new',
      question: 'Draft Q?',
      difficulty: 1,
      slots: [{ id: 's1', answerCardId: null }],
    });
    await flushPromises();
    await (state.flushAutosave as () => Promise<void>)();
    await flushPromises();

    expect(saveAddTaskSet).toHaveBeenCalled();
    const quietOpts = saveAddTaskSet.mock.calls.at(0)?.at(2);
    expect(quietOpts).toEqual({ quiet: true });
    expect(state.canSubmit).toBe(false);
  });

  it('SC-PACK-265/271: reload restores draft; Submit ready when marker ∧ minima', async () => {
    seedDraftState({
      moderationStatus: 'draft',
      pendingRequestId: 'r-draft',
      tasks: incompleteSet.tasks,
      hasUnsubmittedChanges: true,
    });
    const incomplete = mountPage();
    await flushPromises();
    expect(incomplete.text()).toContain('Incomplete?');
    expect(incomplete.text()).toContain('content.addTaskSetDraftStatus');
    expect(setupState(incomplete).canSubmit).toBe(false);

    seedDraftState({
      moderationStatus: 'draft',
      pendingRequestId: 'r-draft',
      taskSet: readySet,
      hasUnsubmittedChanges: true,
      canHardDelete: true,
    });
    const ready = mountPage();
    await flushPromises();
    expect(setupState(ready).canSubmit).toBe(true);
    expect(setupState(ready).hasPersistedDirty).toBe(true);
  });

  it('SC-PACK-266/274: top delete by canHardDelete for draft and pending', async () => {
    seedDraftState({
      moderationStatus: 'draft',
      pendingRequestId: 'r-draft',
      canHardDelete: true,
    });
    const draftPage = mountPage();
    await flushPromises();
    expect(draftPage.find('[data-testid="delete-add-task-set-draft"]').exists()).toBe(true);
    await draftPage.find('[data-testid="delete-add-task-set-draft"]').trigger('click');
    await flushPromises();
    const draftState = setupState(draftPage);
    expect(draftState.draftDeleteConfirmOpen).toBe(true);
    await (draftState.doDeleteDraft as () => Promise<void>)();
    await flushPromises();
    expect(discardAddTaskSetDraft).toHaveBeenCalledWith('p1');

    seedDraftState({
      moderationStatus: 'pending',
      pendingRequestId: 'r-open',
      taskSet: readySet,
      hasUnsubmittedChanges: false,
      canHardDelete: true,
    });
    const pendingPage = mountPage();
    await flushPromises();
    expect(pendingPage.find('[data-testid="delete-add-task-set-draft"]').exists()).toBe(true);
    expect(setupState(pendingPage).readOnly).toBe(false);
  });

  it('SC-PACK-275: delete hidden when canHardDelete is false', async () => {
    seedDraftState({
      moderationStatus: 'draft',
      pendingRequestId: 'r-draft',
      canHardDelete: false,
    });
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.find('[data-testid="delete-add-task-set-draft"]').exists()).toBe(false);
  });

  it('SC-PACK-272: own pending stays editable; save shows draft + dirty Submit', async () => {
    seedDraftState({
      moderationStatus: 'pending',
      pendingRequestId: 'r-open',
      taskSet: readySet,
      hasUnsubmittedChanges: false,
      canHardDelete: true,
    });
    const wrapper = mountPage();
    await flushPromises();
    const state = setupState(wrapper);
    expect(state.readOnly).toBe(false);
    expect(state.canSubmit).toBe(false);
    expect(wrapper.text()).toContain('content.taskSetStatusMarks.pending');

    (state.local as TaskSet).tasks[0]!.question = 'Changed?';
    await (state.flushAutosave as () => Promise<void>)();
    await flushPromises();

    expect(saveAddTaskSet).toHaveBeenCalled();
    expect(contentState.addTaskSet?.moderationStatus).toBe('draft');
    expect(contentState.addTaskSet?.hasUnsubmittedChanges).toBe(true);

    seedDraftState({
      moderationStatus: 'draft',
      pendingRequestId: 'r-open',
      taskSet: {
        ...readySet,
        tasks: [{ ...readySet.tasks[0]!, question: 'Changed?' }, readySet.tasks[1]!],
      },
      hasUnsubmittedChanges: true,
      canHardDelete: true,
    });
    const after = mountPage();
    await flushPromises();
    expect(setupState(after).canSubmit).toBe(true);
    expect(after.text()).toContain('content.addTaskSetDraftStatus');
  });

  it('SC-PACK-273: dirty needs_revision keeps label/thread and Submit after reload', async () => {
    seedDraftState({
      moderationStatus: 'needs_revision',
      pendingRequestId: 'r-rev',
      taskSet: readySet,
      hasUnsubmittedChanges: true,
      canHardDelete: true,
    });
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.text()).toContain('content.taskSetStatusMarks.needs_revision');
    expect(setupState(wrapper).showModerationThread).toBe(true);
    expect(setupState(wrapper).canSubmit).toBe(true);
  });

  it('SC-PACK-264/265: removing last task still quiet-persists empty draft', async () => {
    seedDraftState({
      moderationStatus: 'draft',
      pendingRequestId: 'r-draft',
      tasks: incompleteSet.tasks,
      hasUnsubmittedChanges: true,
    });
    const wrapper = mountPage();
    await flushPromises();

    const state = setupState(wrapper);
    const local = state.local as { tasks: TaskSet['tasks'] };
    local.tasks = [];
    await (state.flushAutosave as () => Promise<void>)();
    await flushPromises();

    expect(saveAddTaskSet).toHaveBeenCalled();
    const body = saveAddTaskSet.mock.calls.at(-1)?.at(1) as { taskSets: TaskSet[] };
    expect(body.taskSets[0]?.tasks).toEqual([]);
  });

  it('SC-PACK-268: delete control gated by canHardDelete; foreign pending hidden', async () => {
    seedDraftState({
      moderationStatus: null,
      pendingRequestId: null,
      tasks: [],
      hasUnsubmittedChanges: false,
      canHardDelete: false,
    });
    const empty = mountPage();
    await flushPromises();
    expect(empty.find('[data-testid="delete-add-task-set-draft"]').exists()).toBe(false);

    seedDraftState({
      moderationStatus: 'pending',
      pendingRequestId: 'r-open',
      foreignPending: true,
      canHardDelete: false,
    });
    const foreign = mountPage();
    await flushPromises();
    expect(foreign.find('[data-testid="delete-add-task-set-draft"]').exists()).toBe(false);

    seedDraftState({ moderationStatus: 'draft', pendingRequestId: 'r-draft', canHardDelete: true });
    const authorDraft = mountPage();
    await flushPromises();
    expect(authorDraft.find('[data-testid="delete-add-task-set-draft"]').exists()).toBe(true);
    expect(pageSrc).toMatch(/delete-add-task-set-draft/);
  });
});
