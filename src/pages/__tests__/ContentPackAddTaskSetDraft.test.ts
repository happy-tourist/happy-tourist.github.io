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
        contentState.addTaskSet = {
          ...contentState.addTaskSet,
          pendingRequestId: 'r-draft',
          moderationStatus: 'draft',
          stagedRevisionId: 'rev1',
        };
      }
      return Promise.resolve({
        draft: contentState.addTaskSet?.draft,
        pendingRequestId: 'r-draft',
        moderationStatus: 'draft',
        stagedRevisionId: 'rev1',
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
    useContentStore: vi.fn(() => ({
      ...contentState,
      loadAddTaskSet,
      saveAddTaskSet,
      discardAddTaskSetDraft,
      submitAddTaskSet,
      cancelRequest: vi.fn(),
      loadModeration,
      postModerationMessage: vi.fn(),
    })),
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
}) {
  const taskSets: TaskSet[] = [
    {
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
  };
}

const pageSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../ContentPackAddTaskSetPage.vue'),
  'utf8',
);

describe('ContentPackAddTaskSetPage pre-submit draft (SC-PACK-264…268)', () => {
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
    seedDraftState({ moderationStatus: null, pendingRequestId: null, tasks: [] });
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

    seedDraftState({ moderationStatus: null, pendingRequestId: null, tasks: [] });
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

  it('SC-PACK-265: reload restores retained draft tasks; Submit disabled until further edit', async () => {
    seedDraftState({
      moderationStatus: 'draft',
      pendingRequestId: 'r-draft',
      tasks: incompleteSet.tasks,
    });
    const wrapper = mountPage();
    await flushPromises();

    expect(loadAddTaskSet).toHaveBeenCalledWith('p1');
    expect(wrapper.text()).toContain('Incomplete?');
    expect(wrapper.text()).toContain('content.addTaskSetDraftStatus');
    const state = setupState(wrapper);
    expect(state.canSubmit).toBe(false);
    expect(state.isDirty).toBe(false);
  });

  it('SC-PACK-266: top delete + confirm discards draft', async () => {
    seedDraftState({ moderationStatus: 'draft', pendingRequestId: 'r-draft' });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[data-testid="delete-add-task-set-draft"]').exists()).toBe(true);
    await wrapper.find('[data-testid="delete-add-task-set-draft"]').trigger('click');
    await flushPromises();

    const state = setupState(wrapper);
    expect(state.draftDeleteConfirmOpen).toBe(true);
    await (state.doDeleteDraft as () => Promise<void>)();
    await flushPromises();

    expect(discardAddTaskSetDraft).toHaveBeenCalledWith('p1');
    expect(loadAddTaskSet).toHaveBeenCalled();
  });

  it('SC-PACK-264/265: removing last task still quiet-persists empty draft', async () => {
    seedDraftState({
      moderationStatus: 'draft',
      pendingRequestId: 'r-draft',
      tasks: incompleteSet.tasks,
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

  it('SC-PACK-268: delete draft control only for author retained draft (not foreign/pending)', async () => {
    seedDraftState({ moderationStatus: null, pendingRequestId: null, tasks: [] });
    const empty = mountPage();
    await flushPromises();
    expect(empty.find('[data-testid="delete-add-task-set-draft"]').exists()).toBe(false);

    seedDraftState({
      moderationStatus: 'pending',
      pendingRequestId: 'r-open',
      foreignPending: true,
    });
    const foreign = mountPage();
    await flushPromises();
    expect(foreign.find('[data-testid="delete-add-task-set-draft"]').exists()).toBe(false);

    seedDraftState({ moderationStatus: 'draft', pendingRequestId: 'r-draft' });
    const authorDraft = mountPage();
    await flushPromises();
    expect(authorDraft.find('[data-testid="delete-add-task-set-draft"]').exists()).toBe(true);
    expect(pageSrc).toMatch(/delete-add-task-set-draft/);
  });
});
