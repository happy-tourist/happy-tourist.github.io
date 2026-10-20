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

const {
  contentState,
  authState,
  loadDraft,
  saveDraft,
  loadAddTaskSet,
  loadLivePack,
  saveAddTaskSet,
  discardAddTaskSetDraft,
} = vi.hoisted(() => {
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
      moderationStatus: string | null;
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
    saveAddTaskSet: vi.fn().mockResolvedValue({
      draft: { title: 'T', description: '', taskSets: [] },
      pendingRequestId: 'r-draft',
      moderationStatus: 'draft',
    }),
    discardAddTaskSetDraft: vi.fn().mockResolvedValue({ ok: true }),
  };
});

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
      saveAddTaskSet,
      discardAddTaskSetDraft,
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

  it('SC-PACK-260/237: dialog has centered portrait slots + mini-card pool, not playing-card picker', async () => {
    const wrapper = mountTasks();
    await flushPromises();

    await wrapper.find('[data-testid="add-task-question"]').trigger('click');
    await flushPromises();

    const dialog = wrapper.find('[data-testid="task-compose-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.classes()).toContain('peek-chrome');

    const row = dialog.find('[data-testid="compose-slot-row"]');
    expect(row.exists()).toBe(true);
    expect(row.classes()).toContain('peek-slot-like-row');
    expect(row.classes()).toContain('justify-center');
    const slots = row.findAll('[data-testid="peek-slot-like"]');
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]!.classes()).toContain('peek-slot-like--portrait');
    // Empty compose slots: unlabeled (no slotEmpty / СЛОТ copy).
    expect(slots[0]!.text().trim()).toBe('');

    const pool = dialog.find('[data-testid="task-compose-answer-pool"]');
    expect(pool.exists()).toBe(true);
    expect(pool.classes()).toContain('peek-answer-pool');
    const cards = pool.findAll('[data-testid="task-compose-answer-chip"]');
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((c) => c.classes().includes('peek-answer-mini'))).toBe(true);
    expect(cards[0]!.find('.peek-answer-mini__primary').text()).toContain('Paris');
    expect(cards[0]!.find('.peek-answer-mini__secondary').text()).toContain('Capital');

    expect(dialog.find('[data-testid="slot-picker-grid"]').exists()).toBe(false);
    expect(dialog.find('.pack-answer-tile-stub').exists()).toBe(false);
    expect(dialog.find('.q-select-stub').exists()).toBe(false);
  });

  it('SC-PACK-276: difficulty dots left-edge + word-only badge center; preview/commit; model 1|2|3', async () => {
    const wrapper = mountTasks();
    await flushPromises();

    await wrapper.find('[data-testid="add-task-question"]').trigger('click');
    await flushPromises();

    const dialog = wrapper.find('[data-testid="task-compose-dialog"]');
    const header = dialog.find('[data-testid="compose-diff-header"]');
    expect(header.exists()).toBe(true);
    expect(header.classes()).toContain('peek-diff-header');

    const dotsHost = dialog.find('[data-testid="task-compose-difficulty"]');
    expect(dotsHost.exists()).toBe(true);
    expect(dotsHost.attributes('data-diff')).toBe('1');
    expect(dotsHost.classes()).toContain('peek-diff-dots');

    const dots = dialog.findAll('[data-testid="compose-diff-dot"]');
    expect(dots).toHaveLength(3);
    expect(dots.filter((d) => d.classes().includes('peek-diff-dot--filled'))).toHaveLength(1);

    const badge = dialog.find('[data-testid="compose-diff-badge"]');
    expect(badge.exists()).toBe(true);
    expect(badge.attributes('data-diff')).toBe('1');
    // Word-only — no «Сложность:» prefix / digit-only / digit-prefix select labels.
    expect(badge.text()).toBe('content.difficultyWord.1');
    expect(badge.text()).not.toMatch(/Сложность/i);
    expect(badge.text()).not.toMatch(/^1$/);
    expect(badge.text()).not.toBe('content.difficulty.1');
    expect(badge.text()).not.toBe('content.difficultyBadge');

    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const appScss = readFileSync(path.resolve(__dirname, '../../css/app.scss'), 'utf8');
    // Same as game peek: dots absolute left; badge centered independently.
    expect(appScss).toMatch(
      /\.peek-diff-header\s*\{[^}]*position:\s*relative[^}]*justify-content:\s*center/s,
    );
    expect(appScss).toMatch(
      /\.peek-diff-header\s+\.peek-diff-dots\s*\{[^}]*position:\s*absolute[^}]*left:\s*0/s,
    );

    // Hover third dot → preview filled 1…3 in hard color (data-diff=3).
    await dots[2]!.trigger('mouseenter');
    await flushPromises();
    expect(dotsHost.attributes('data-diff')).toBe('3');
    expect(dots.filter((d) => d.classes().includes('peek-diff-dot--filled'))).toHaveLength(3);

    await dots[2]!.trigger('mouseleave');
    await flushPromises();
    expect(dotsHost.attributes('data-diff')).toBe('1');

    // Click second → commit difficulty 2; badge tracks committed value.
    await dots[1]!.trigger('click');
    await flushPromises();
    expect(dotsHost.attributes('data-diff')).toBe('2');
    expect(dots.filter((d) => d.classes().includes('peek-diff-dot--filled'))).toHaveLength(2);
    expect(badge.attributes('data-diff')).toBe('2');
    expect(badge.text()).toBe('content.difficultyWord.2');
  });

  it('SC-PACK-279: compose dialog width ≤ four pool mini-cards + pad; not fixed 360/400', async () => {
    const wrapper = mountTasks();
    await flushPromises();

    await wrapper.find('[data-testid="add-task-question"]').trigger('click');
    await flushPromises();

    const dialog = wrapper.find('[data-testid="task-compose-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.classes()).toContain('pack-task-compose-card');

    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const composeSrc = readFileSync(
      path.resolve(__dirname, '../../components/PackTaskComposeDialog.vue'),
      'utf8',
    );
    // Width formula: 4×--peek-tile-max-w + 3×8px + horizontal pad; cap 92vw.
    expect(composeSrc).toMatch(
      /4\s*\*\s*var\(--peek-tile-max-w(?:,\s*43px)?\)\s*\+\s*3\s*\*\s*8px/,
    );
    expect(composeSrc).toMatch(/92vw/);
    expect(composeSrc).not.toMatch(/min\(360px,\s*92vw\)/);
    expect(composeSrc).not.toMatch(/min\(400px,\s*92vw\)/);

    const pool = dialog.find('[data-testid="task-compose-answer-pool"]');
    expect(pool.classes()).toContain('peek-answer-pool');
    const appScss = readFileSync(path.resolve(__dirname, '../../css/app.scss'), 'utf8');
    expect(appScss).toMatch(/\.peek-answer-pool\s*\{[^}]*grid-template-columns:\s*repeat\(4/s);

    // Game peek modal width unchanged (SC-PACK-279 / design Decision 5).
    const gamePageSrc = readFileSync(path.resolve(__dirname, '../GamePage.vue'), 'utf8');
    expect(gamePageSrc).toMatch(/\.peek-modal-card\s*\{[^}]*max-width:\s*min\(400px,\s*92vw\)/s);
  });

  it('SC-PACK-280: compose dots ≈ badge height; shared peek base stays 6px', async () => {
    const wrapper = mountTasks();
    await flushPromises();

    await wrapper.find('[data-testid="add-task-question"]').trigger('click');
    await flushPromises();

    const dialog = wrapper.find('[data-testid="task-compose-dialog"]');
    expect(dialog.findAll('[data-testid="compose-diff-dot"]')).toHaveLength(3);
    expect(dialog.find('[data-testid="compose-diff-badge"]').exists()).toBe(true);

    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const composeSrc = readFileSync(
      path.resolve(__dirname, '../../components/PackTaskComposeDialog.vue'),
      'utf8',
    );
    const appScss = readFileSync(path.resolve(__dirname, '../../css/app.scss'), 'utf8');

    // Compose-scoped ≈20px (= badge height); not a global .peek-diff-dot override.
    expect(composeSrc).toMatch(/--compose-diff-dot-size:\s*20px/);
    expect(composeSrc).toMatch(
      /\.pack-task-compose-card\s+\.peek-diff-dot\s*\{[^}]*var\(--compose-diff-dot-size\)/s,
    );
    expect(appScss).toMatch(/\.peek-diff-dot\s*\{[^}]*width:\s*6px[^}]*height:\s*6px/s);

    // Game peek still uses shared 6px class (no compose-only size on GamePage).
    const gamePageSrc = readFileSync(path.resolve(__dirname, '../GamePage.vue'), 'utf8');
    expect(gamePageSrc).toMatch(/class="peek-diff-dot"/);
    expect(gamePageSrc).not.toMatch(/compose-diff-dot-size/);
  });

  it('SC-PACK-277: empty unlabeled; half-size pool scrolls past 4×4; filled primary border', async () => {
    const manyCards = Array.from({ length: 17 }, (_, i) => ({
      id: `c${i + 1}`,
      content: `Answer ${i + 1}`,
      description: i === 0 ? 'desc' : '',
    }));
    contentState.draft = {
      ...structuredClone(draftBody),
      answerCards: manyCards,
    };
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: contentState.draft,
    });

    const wrapper = mountTasks();
    await flushPromises();

    await wrapper.find('[data-testid="add-task-question"]').trigger('click');
    await flushPromises();

    const dialog = wrapper.find('[data-testid="task-compose-dialog"]');
    const emptySlots = dialog
      .findAll('[data-testid="peek-slot-like"]')
      .filter((s) => !s.classes().includes('peek-slot-like--filled'));
    for (const slot of emptySlots) {
      expect(slot.classes()).toContain('peek-slot-like--portrait');
      expect(slot.text().trim()).toBe('');
      expect(slot.text()).not.toMatch(/slotEmpty|Слот/i);
    }

    const pool = dialog.find('[data-testid="task-compose-answer-pool"]');
    expect(pool.classes()).toContain('peek-answer-pool');
    expect(pool.findAll('[data-testid="task-compose-answer-chip"]')).toHaveLength(17);

    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const appScss = readFileSync(path.resolve(__dirname, '../../css/app.scss'), 'utf8');
    expect(appScss).toMatch(/--peek-tile-max-w:\s*43px/);
    expect(appScss).toMatch(/\.peek-answer-pool\s*\{[^}]*grid-template-columns:\s*repeat\(4/s);
    expect(appScss).toMatch(/\.peek-answer-pool\s*\{[^}]*--peek-tile-max-w/s);
    expect(appScss).toMatch(/\.peek-answer-pool\s*\{[^}]*max-height:/s);
    expect(appScss).toMatch(/\.peek-answer-pool\s*\{[^}]*overflow-y:\s*auto/s);
    expect(appScss).toMatch(/\.peek-answer-mini\s*\{[^}]*aspect-ratio:\s*156\s*\/\s*206/s);
    expect(appScss).toMatch(/\.peek-answer-mini\s*\{[^}]*max-width:\s*var\(--peek-tile-max-w/s);
    expect(appScss).toMatch(
      /\.peek-slot-like--portrait\.peek-slot-like--filled[\s\S]*?border:\s*1px\s+solid\s+#1976d2/s,
    );
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

  it('SC-PACK-263: same answer card fills multiple slots; pool mini-card stays available without used chrome', async () => {
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

    const poolCards = dialog.findAll('[data-testid="task-compose-answer-chip"]');
    const parisCard = poolCards.find((c) => c.text().includes('Paris'));
    expect(parisCard).toBeTruthy();

    await parisCard!.trigger('click');
    await flushPromises();
    await parisCard!.trigger('click');
    await flushPromises();

    slots = dialog.findAll('[data-testid="peek-slot-like"]');
    const filled = slots.filter((s) => s.classes().includes('peek-slot-like--filled'));
    expect(filled.filter((s) => s.text().includes('Paris')).length).toBeGreaterThanOrEqual(2);
    expect(filled.every((s) => s.classes().includes('peek-slot-like--portrait'))).toBe(true);
    // Secondary description on filled slot when present.
    expect(filled.some((s) => s.find('.peek-slot-like__secondary').exists())).toBe(true);

    expect(parisCard!.classes()).toContain('peek-answer-mini');
    expect(parisCard!.classes()).not.toContain('peek-answer-mini--used');
    expect(parisCard!.classes()).not.toContain('peek-answer-mini--readonly');
    expect(parisCard!.classes()).not.toContain('disabled');

    // Filled slots get primary border in CSS; pool keeps neutral pack-card border.
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const appScss = readFileSync(path.resolve(__dirname, '../../css/app.scss'), 'utf8');
    expect(appScss).toMatch(
      /\.peek-slot-like--portrait\.peek-slot-like--filled[\s\S]*?border:\s*1px\s+solid\s+#1976d2/s,
    );
    expect(appScss).toMatch(
      /\.peek-answer-mini\s*\{[^}]*border:\s*1px\s+solid\s+var\(--pack-card-border\)/s,
    );
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

  it('SC-PACK-261: no top live-answer-card-grid; mini-cards available in dialog', async () => {
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
