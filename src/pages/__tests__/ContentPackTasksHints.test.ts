import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPackTasksPage from '@/pages/ContentPackTasksPage.vue';
import type { PackContent } from '@/stores/content';

const { contentState, authState, staffSavePack, saveDraft, draft } = vi.hoisted(() => {
  const draft: PackContent = {
    title: 'T',
    description: '',
    answerCards: [{ id: 'c1', content: 'A', description: '' }],
    taskSets: [
      {
        id: 'ts1',
        authorUserId: 'u1',
        coauthorLabels: [],
        tasks: [],
      },
    ],
  };
  const contentState = {
    error: null as string | null,
    loading: false,
    saving: false,
    pack: {
      id: 'p1',
      title: 'T',
      description: '',
      blocked: false,
      hasLive: true,
      createdBy: 'u1',
    },
    draft: null as PackContent | null,
    staffEditTarget: null as 'live' | 'working' | null,
    moderationStatus: null as string | null,
    taskHasCascadeGap: () => false,
    pruneCascadeGaps: vi.fn(),
  };
  const authState = {
    user: { id: 's1', anonymous: false } as { id: string; anonymous: boolean } | null,
    needsEmailVerification: false,
    isStaff: true,
  };
  return {
    draft,
    contentState,
    authState,
    staffSavePack: vi.fn().mockResolvedValue(draft),
    saveDraft: vi.fn().mockResolvedValue(draft),
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
      query: {},
      path: '/content/packs/p1/tasks/ts1',
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
      staffSavePack,
      saveDraft,
      loadDraft: vi.fn(),
      loadStaffEdit: vi.fn(),
      acquireEditLock: vi.fn(),
      refreshEditLock: vi.fn(),
      releaseEditLock: vi.fn(),
      deleteTaskSet: vi.fn(),
    })),
  };
});

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': { template: '<div><slot /></div>' },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable', 'icon', 'type'],
    template:
      '<button :type="type || \'button\'" :disabled="disable" :data-label="label" v-bind="$attrs">{{ label }}<slot /></button>',
  },
  'q-tooltip': { template: '<span class="tooltip-stub"><slot /></span>' },
  'q-banner': true,
  'q-badge': true,
  'q-chip': {
    template:
      '<button type="button" data-testid="task-compose-answer-chip" @click="$emit(\'click\')"><slot /></button>',
  },
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
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  'q-select': true,
  'q-space': true,
  'q-dialog': {
    props: ['modelValue'],
    emits: ['update:modelValue', 'hide'],
    template: '<div v-if="modelValue" class="q-dialog-stub"><slot /></div>',
  },
  PackTasksCsvControls: true,
  PackTaskTile: true,
};

function mountTasks() {
  return shallowMount(ContentPackTasksPage, {
    global: { stubs: { ...stubs, PackTaskComposeDialog: false } },
  });
}

describe('tasks page staff session + hints (SC-PACK-115/116/119)', () => {
  beforeEach(() => {
    contentState.error = null;
    contentState.loading = false;
    contentState.draft = structuredClone(draft);
    contentState.staffEditTarget = 'live';
    authState.isStaff = true;
    staffSavePack.mockClear();
    staffSavePack.mockResolvedValue(structuredClone(draft));
    saveDraft.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-115: with staffEditTarget, autosave uses staff-save not working-copy', async () => {
    const wrapper = mountTasks();
    await flushPromises();

    expect(contentState.staffEditTarget).toBe('live');
    await wrapper.find('[data-testid="add-task-question"]').trigger('click');
    await flushPromises();

    const input = wrapper.find('[data-testid="task-compose-question"]');
    expect(input.exists()).toBe(true);
    await input.setValue('New question text');
    await wrapper.find('[data-testid="task-compose-answer-chip"]').trigger('click');
    await flushPromises();
    await wrapper.find('[data-testid="task-compose-save"]').trigger('click');
    // form submit may be needed
    const form = wrapper.find('form');
    if (form.exists()) await form.trigger('submit');
    await flushPromises();

    expect(saveDraft).not.toHaveBeenCalled();
    expect(staffSavePack).toHaveBeenCalled();
  });

  it('SC-PACK-116: staff hint uses instant-save copy, not moderation send', async () => {
    const wrapper = mountTasks();
    await flushPromises();

    expect(wrapper.text()).toContain('content.staffEditSubtitle');
    expect(wrapper.text()).not.toContain('content.tasksSaveHint');
  });

  it('SC-PACK-119: questionNeedsSlot is tooltip-only (no jumping caption)', async () => {
    const wrapper = mountTasks();
    await flushPromises();

    await wrapper.find('[data-testid="add-task-question"]').trigger('click');
    await flushPromises();

    const input = wrapper.find('[data-testid="task-compose-question"]');
    await input.setValue('Question without slot');
    await flushPromises();

    // Caption must not appear as standalone layout-shifting text; tooltip stub may hold key.
    const captions = wrapper
      .findAll('.text-caption')
      .filter((n) => n.text().includes('content.questionNeedsSlot'));
    expect(captions.length).toBe(0);
    expect(wrapper.find('.tooltip-stub').exists()).toBe(true);
  });
});
