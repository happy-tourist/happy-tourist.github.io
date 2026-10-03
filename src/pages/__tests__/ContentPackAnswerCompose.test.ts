import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPackEditorPage from '@/pages/ContentPackEditorPage.vue';
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

const { contentState, authState, loadDraft, saveDraft, markCascadeGaps } = vi.hoisted(() => {
  const markCascadeGaps = vi.fn();
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
    },
    draft: null as PackContent | null,
    staffEditTarget: null as 'live' | 'working' | null,
    editorKind: 'creator' as 'creator' | 'task_set_author',
    moderationStatus: null as string | null,
    pendingRequestId: null as string | null,
    isPendingAuthor: false,
    taskSetHasCascadeGap: () => false,
    taskHasCascadeGap: () => false,
    pruneCascadeGaps: vi.fn(),
    markCascadeGaps,
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
    markCascadeGaps,
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
      acquireEditLock: vi.fn(),
      refreshEditLock: vi.fn(),
      releaseEditLock: vi.fn(),
      loadModeration: vi.fn(),
      postModerationMessage: vi.fn(),
      submitPack: vi.fn(),
      cancelRequest: vi.fn(),
      deleteUnpublishedPack: vi.fn(),
      unpublishTaskSet: vi.fn(),
      republishTaskSet: vi.fn(),
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
  'q-space': true,
  'q-dialog': {
    props: ['modelValue'],
    emits: ['update:modelValue', 'hide'],
    template: '<div v-if="modelValue" class="q-dialog-stub"><slot /></div>',
  },
  PackAnswerCardTile: {
    props: ['content', 'description', 'editable'],
    emits: ['edit', 'delete'],
    template:
      '<div class="pack-answer-tile-stub" :data-editable="editable" :data-content="content">' +
      '<button v-if="editable" type="button" data-testid="pack-answer-tile-edit" @click="$emit(\'edit\')">edit</button>' +
      '</div>',
  },
  PackTaskSetCardTile: true,
  PackListCardTile: false,
};

function mountEditor() {
  return shallowMount(ContentPackEditorPage, { global: { stubs } });
}

describe('ContentPackEditorPage answer compose dialog (SC-PACK-256/257)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contentState.error = null;
    contentState.loading = false;
    contentState.draft = structuredClone(draftBody);
    contentState.editorKind = 'creator';
    contentState.pack = {
      id: 'p1',
      title: 'My Pack',
      description: '',
      blocked: false,
      hasLive: false,
      createdBy: 'u1',
    };
    authState.user = { id: 'u1', anonymous: false };
    authState.needsEmailVerification = false;
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

  it('SC-PACK-256: add-answer opens dialog; no persistent inline form above the list', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    expect(wrapper.find('[data-testid="add-answer-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="answer-compose-dialog"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="answer-compose-content"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="answer-card-grid"]').exists()).toBe(true);

    await wrapper.find('[data-testid="add-answer-card"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="answer-compose-dialog"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="answer-compose-content"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="answer-compose-description"]').exists()).toBe(true);
    // fields only — no playing-card preview inside the dialog
    expect(
      wrapper.find('[data-testid="answer-compose-dialog"] .pack-answer-tile-stub').exists(),
    ).toBe(false);
  });

  it('SC-PACK-256: add control hidden when cardsReadOnly (task_set_author)', async () => {
    contentState.editorKind = 'task_set_author';
    const wrapper = mountEditor();
    await flushPromises();

    expect(wrapper.find('[data-testid="add-answer-card"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="answer-compose-dialog"]').exists()).toBe(false);
  });

  it('SC-PACK-257: Edit opens the same dialog prefilled; save/cancel close it', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    const editBtn = wrapper.findAll('[data-testid="pack-answer-tile-edit"]')[0];
    expect(editBtn).toBeTruthy();
    await editBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="answer-compose-dialog"]').exists()).toBe(true);
    const contentInput = wrapper.find('[data-testid="answer-compose-content"]');
    expect((contentInput.element as HTMLInputElement).value).toBe('Paris');
    expect(
      wrapper.find('[data-testid="answer-compose-dialog"] .pack-answer-tile-stub').exists(),
    ).toBe(false);

    // Cancel closes without leaving an inline form
    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-label') === 'content.cancelEditCard');
    expect(cancelBtn).toBeTruthy();
    await cancelBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="answer-compose-dialog"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="answer-compose-content"]').exists()).toBe(false);

    // Re-open via Edit and save (content change → cascade)
    await wrapper.findAll('[data-testid="pack-answer-tile-edit"]')[0]!.trigger('click');
    await flushPromises();
    const contentEl = wrapper.find('[data-testid="answer-compose-content"]');
    await contentEl.setValue('Paris!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[data-testid="answer-compose-dialog"]').exists()).toBe(false);
    expect(saveDraft).toHaveBeenCalled();
    expect(markCascadeGaps).toHaveBeenCalledWith(['t1'], expect.anything());
    expect(wrapper.find('[data-testid="answer-compose-content"]').exists()).toBe(false);
  });

  it('SC-PACK-257: Edit does not open dialog when cardsReadOnly', async () => {
    contentState.editorKind = 'task_set_author';
    const wrapper = mountEditor();
    await flushPromises();

    // tiles are not editable → no edit buttons; dialog stays closed
    expect(wrapper.find('[data-testid="pack-answer-tile-edit"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="answer-compose-dialog"]').exists()).toBe(false);
  });
});
