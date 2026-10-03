import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPackAddTaskSetPage from '@/pages/ContentPackAddTaskSetPage.vue';
import ContentPackTasksPage from '@/pages/ContentPackTasksPage.vue';
import type { PackContent } from '@/stores/content';

const draftBody: PackContent = {
  title: 'My Pack',
  description: '',
  answerCards: [
    { id: 'c1', content: 'Paris', description: 'Capital' },
    { id: 'c2', content: 'Rome', description: '' },
  ],
  taskSets: [
    {
      id: 'ts1',
      authorUserId: 'u1',
      coauthorLabels: [],
      tasks: [
        {
          id: 't1',
          question: 'Capital of France?',
          difficulty: 1,
          slots: [{ id: 's1', answerCardId: 'c1' }],
        },
      ],
    },
  ],
};

const { contentState, authState, loadDraft, saveDraft, loadAddTaskSet, loadLivePack } = vi.hoisted(
  () => {
    const contentState = {
      error: null as string | null,
      loading: false,
      saving: false,
      pack: {
        id: 'p1',
        title: 'My Pack',
        description: '',
        blocked: false,
        hasLive: false,
        createdBy: 'u1',
        inCatalog: true,
      },
      draft: null as PackContent | null,
      staffEditTarget: null as 'live' | 'working' | null,
      moderationStatus: null as string | null,
      addTaskSet: null as null | {
        pack: { id: string; title: string };
        liveCards: { id: string; content: string; description: string }[];
        draft: { title: string; description: string; taskSets: PackContent['taskSets'] };
        pendingRequestId: string | null;
        moderationStatus: string;
        foreignPending: boolean;
        stagedRevisionId: string | null;
      },
      taskHasCascadeGap: () => false,
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
      saveDraft: vi.fn(),
      loadAddTaskSet: vi.fn(),
      loadLivePack: vi.fn(),
    };
  },
);

const routeState = vi.hoisted(() => ({
  params: { id: 'p1', taskSetId: 'ts1' },
  path: '/content/packs/p1/tasks/ts1',
  query: {},
}));

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useRoute: () => ({
      params: routeState.params,
      query: routeState.query,
      path: routeState.path,
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
      saveDraft,
      loadAddTaskSet,
      loadLivePack,
      acquireEditLock: vi.fn(),
      refreshEditLock: vi.fn(),
      releaseEditLock: vi.fn(),
      loadStaffEdit: vi.fn(),
      staffSavePack: vi.fn(),
      deleteTaskSet: vi.fn(),
      submitAddTaskSet: vi.fn(),
      cancelRequest: vi.fn(),
      loadModeration: vi.fn().mockResolvedValue({ messages: [] }),
      postModerationMessage: vi.fn(),
    })),
  };
});

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable', 'icon', 'type'],
    template:
      '<button :type="type || \'button\'" :disabled="disable" :data-label="label" :data-icon="icon" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
  },
  'q-tooltip': { template: '<span />' },
  'q-banner': { template: '<div><slot /><slot name="action" /></div>' },
  'q-badge': true,
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-form': {
    template: '<form @submit.prevent="$emit(\'submit\', $event)"><slot /></form>',
  },
  'q-input': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', ($event.target).value)" />',
  },
  'q-select': {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template: '<div class="q-select-stub" />',
  },
  'q-chip': {
    props: {
      disable: Boolean,
      outline: Boolean,
      clickable: Boolean,
      color: String,
    },
    template:
      '<button type="button" class="q-chip-stub" :disabled="disable" :data-outline="outline ? \'true\' : \'false\'" :data-color="color || \'\'" :data-clickable="clickable ? \'true\' : \'false\'" data-testid="task-compose-answer-chip" @click="$emit(\'click\')"><slot /></button>',
  },
  'q-space': true,
  'q-dialog': {
    props: ['modelValue'],
    emits: ['update:modelValue', 'hide'],
    template: '<div v-if="modelValue" class="q-dialog-stub"><slot /></div>',
  },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': { template: '<div><slot /></div>' },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  PackTasksCsvControls: {
    name: 'PackTasksCsvControls',
    template: '<div data-testid="pack-tasks-csv-controls" />',
  },
  PackTaskTile: {
    props: ['question', 'editable'],
    emits: ['edit', 'delete'],
    template:
      '<div class="pack-task-tile-stub" :data-editable="editable" :data-question="question">' +
      '<button v-if="editable" type="button" data-testid="pack-task-tile-edit" @click="$emit(\'edit\')">edit</button>' +
      '</div>',
  },
  PackAnswerCardTile: {
    template: '<div class="pack-answer-tile-stub" data-testid="pack-answer-tile" />',
  },
};

function mountTasks() {
  return shallowMount(ContentPackTasksPage, {
    global: {
      stubs: {
        ...stubs,
        PackTaskComposeDialog: false,
      },
    },
  });
}

function mountAddTaskSet() {
  routeState.params = { id: 'p1', taskSetId: '' };
  routeState.path = '/content/packs/p1/add-task-set';
  return shallowMount(ContentPackAddTaskSetPage, {
    global: {
      stubs: {
        ...stubs,
        PackTaskComposeDialog: false,
      },
    },
  });
}

describe('ContentPackTasksPage task compose dialog (SC-PACK-258/259/260/262)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contentState.error = null;
    contentState.loading = false;
    contentState.saving = false;
    contentState.draft = structuredClone(draftBody);
    contentState.staffEditTarget = null;
    contentState.pack = {
      id: 'p1',
      title: 'My Pack',
      description: '',
      blocked: false,
      hasLive: false,
      createdBy: 'u1',
      inCatalog: true,
    };
    contentState.addTaskSet = null;
    authState.user = { id: 'u1', anonymous: false };
    authState.needsEmailVerification = false;
    authState.isStaff = false;
    routeState.params = { id: 'p1', taskSetId: 'ts1' };
    routeState.path = '/content/packs/p1/tasks/ts1';
    routeState.query = {};
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(draftBody),
    });
    saveDraft.mockImplementation((_id: string, body: PackContent) =>
      Promise.resolve(structuredClone(body)),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-258: add-question opens dialog; no persistent inline compose form', async () => {
    const wrapper = mountTasks();
    await flushPromises();

    expect(wrapper.find('[data-testid="add-task-question"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="task-compose-dialog"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="slot-picker-grid"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="compose-slot-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="task-card-grid"]').exists()).toBe(true);

    await wrapper.find('[data-testid="add-task-question"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="task-compose-dialog"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="task-compose-question"]').exists()).toBe(true);
  });

  it('SC-PACK-259: Edit opens the same dialog prefilled; cancel closes without inline form', async () => {
    const wrapper = mountTasks();
    await flushPromises();

    const editBtn = wrapper.find('[data-testid="pack-task-tile-edit"]');
    expect(editBtn.exists()).toBe(true);
    await editBtn.trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="task-compose-dialog"]').exists()).toBe(true);
    const q = wrapper.find('[data-testid="task-compose-question"]');
    expect((q.element as HTMLInputElement).value).toBe('Capital of France?');

    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-label') === 'content.cancelEditTask');
    expect(cancelBtn).toBeTruthy();
    await cancelBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="task-compose-dialog"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="task-compose-question"]').exists()).toBe(false);
  });

  it('SC-PACK-260: dialog has centered slots + chip pool, not playing-card picker', async () => {
    const wrapper = mountTasks();
    await flushPromises();

    await wrapper.find('[data-testid="add-task-question"]').trigger('click');
    await flushPromises();

    const dialog = wrapper.find('[data-testid="task-compose-dialog"]');
    expect(dialog.exists()).toBe(true);

    const row = dialog.find('[data-testid="compose-slot-row"]');
    expect(row.exists()).toBe(true);
    expect(row.classes()).toContain('peek-slot-like-row');
    expect(row.classes()).toContain('justify-center');
    expect(row.find('[data-testid="peek-slot-like"]').exists()).toBe(true);

    const pool = dialog.find('[data-testid="task-compose-answer-pool"]');
    expect(pool.exists()).toBe(true);
    expect(pool.classes()).toContain('peek-answers');
    expect(pool.findAll('[data-testid="task-compose-answer-chip"]').length).toBeGreaterThan(0);

    expect(dialog.find('[data-testid="slot-picker-grid"]').exists()).toBe(false);
    expect(dialog.find('.pack-answer-tile-stub').exists()).toBe(false);
  });

  it('SC-PACK-262: CSV stays on the page above the list, outside the dialog', async () => {
    const wrapper = mountTasks();
    await flushPromises();

    expect(wrapper.find('[data-testid="pack-tasks-csv-controls"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="task-card-grid"]').exists()).toBe(true);

    await wrapper.find('[data-testid="add-task-question"]').trigger('click');
    await flushPromises();

    const dialog = wrapper.find('[data-testid="task-compose-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.find('[data-testid="pack-tasks-csv-controls"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="pack-tasks-csv-controls"]').exists()).toBe(true);
  });

  it('SC-PACK-258: add control hidden when viewOnly (live)', async () => {
    contentState.pack.hasLive = true;
    contentState.draft = null;
    routeState.query = { view: 'live' };
    loadLivePack.mockResolvedValue({ content: structuredClone(draftBody) });

    const wrapper = mountTasks();
    await flushPromises();

    expect(loadLivePack).toHaveBeenCalled();
    expect(wrapper.find('[data-testid="add-task-question"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="task-compose-dialog"]').exists()).toBe(false);
  });

  it('SC-PACK-263: same answer card fills multiple slots; chip stays available without used chrome', async () => {
    const wrapper = mountTasks();
    await flushPromises();

    await wrapper.find('[data-testid="add-task-question"]').trigger('click');
    await flushPromises();

    const dialog = wrapper.find('[data-testid="task-compose-dialog"]');
    expect(dialog.exists()).toBe(true);

    await dialog.find('[data-testid="task-compose-add-slot"]').trigger('click');
    await flushPromises();

    let slots = dialog.findAll('[data-testid="peek-slot-like"]');
    expect(slots.length).toBeGreaterThanOrEqual(2);

    const chips = dialog.findAll('[data-testid="task-compose-answer-chip"]');
    const parisChip = chips.find((c) => c.text().includes('Paris'));
    expect(parisChip).toBeTruthy();

    await parisChip!.trigger('click');
    await flushPromises();
    await parisChip!.trigger('click');
    await flushPromises();

    slots = dialog.findAll('[data-testid="peek-slot-like"]');
    const filledLabels = slots
      .filter((s) => s.classes().includes('peek-slot-like--filled'))
      .map((s) => s.text());
    expect(filledLabels.filter((t) => t.includes('Paris')).length).toBeGreaterThanOrEqual(2);

    expect(parisChip!.attributes('disabled')).toBeUndefined();
    expect(parisChip!.attributes('data-outline')).toBe('true');
    expect(parisChip!.attributes('data-color')).toBe('');
    expect(parisChip!.attributes('data-clickable')).toBe('true');
  });
});

describe('ContentPackAddTaskSetPage compose (SC-PACK-261 + dialog)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contentState.error = null;
    contentState.loading = false;
    contentState.saving = false;
    contentState.pack = {
      id: 'p1',
      title: 'Live Pack',
      description: '',
      blocked: false,
      hasLive: true,
      createdBy: 'u1',
      inCatalog: true,
    };
    contentState.addTaskSet = {
      pack: contentState.pack,
      liveCards: [
        { id: 'c1', content: 'Paris', description: '' },
        { id: 'c2', content: 'Rome', description: '' },
      ],
      draft: {
        title: 'Live Pack',
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
    authState.user = { id: 'u1', anonymous: false };
    authState.needsEmailVerification = false;
    authState.isStaff = false;
    loadAddTaskSet.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-261: no top live-answer-card-grid; chips available in dialog', async () => {
    const wrapper = mountAddTaskSet();
    await flushPromises();

    expect(wrapper.find('[data-testid="live-answer-card-grid"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('content.addTaskSetLiveCardsHint');
    expect(wrapper.find('[data-testid="add-task-question"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pack-tasks-csv-controls"]').exists()).toBe(true);

    await wrapper.find('[data-testid="add-task-question"]').trigger('click');
    await flushPromises();

    const dialog = wrapper.find('[data-testid="task-compose-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.findAll('[data-testid="task-compose-answer-chip"]').length).toBe(2);
    expect(dialog.find('[data-testid="slot-picker-grid"]').exists()).toBe(false);
  });
});
