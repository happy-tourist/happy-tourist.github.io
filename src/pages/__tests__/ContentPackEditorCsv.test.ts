import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPackEditorPage from '@/pages/ContentPackEditorPage.vue';
import type { PackContent } from '@/stores/content';

const draftBody: PackContent = {
  title: 'My Pack / v1',
  description: '',
  answerCards: [
    { id: 'c1', content: 'Paris', description: 'Capital' },
    { id: 'c2', content: 'Rome', description: '' },
  ],
  taskSets: [],
};

const { contentState, authState, loadDraft, saveDraft } = vi.hoisted(() => {
  const contentState = {
    error: null as string | null,
    loading: false,
    saving: false,
    pack: {
      id: 'p1',
      title: 'My Pack / v1',
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
    markCascadeGaps: vi.fn(),
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
      loadStaffEdit: vi.fn(),
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
    props: ['label', 'disable', 'icon'],
    template:
      '<button type="button" :disabled="disable" :data-label="label" :data-icon="icon">{{ label }}<slot /></button>',
  },
  'q-tooltip': { template: '<span class="tooltip-stub"><slot /></span>' },
  'q-banner': {
    template: '<div class="banner-stub"><slot /><slot name="action" /></div>',
  },
  'q-badge': true,
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-form': { template: '<form @submit.prevent><slot /></form>' },
  'q-input': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  'q-space': true,
  'q-dialog': { template: '<div><slot /></div>' },
};

describe('ContentPackEditorPage answers CSV (SC-PACK-210/211/212)', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    contentState.error = null;
    contentState.loading = false;
    contentState.pack = {
      id: 'p1',
      title: 'My Pack / v1',
      description: '',
      blocked: false,
      hasLive: false,
      createdBy: 'u1',
    };
    contentState.editorKind = 'creator';
    contentState.draft = structuredClone(draftBody);
    authState.user = { id: 'u1', anonymous: false };
    authState.needsEmailVerification = false;
    authState.isStaff = false;
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(draftBody),
    });
    saveDraft.mockImplementation((_id: string, body: PackContent) =>
      Promise.resolve(structuredClone(body)),
    );
    createObjectURL = vi.fn(() => 'blob:mock');
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('SC-PACK-210: shows export control and downloads CSV named from pack title', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const wrapper = shallowMount(ContentPackEditorPage, { global: { stubs } });
    await flushPromises();

    const exportBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-label') === 'content.exportAnswersCsv');
    expect(exportBtn).toBeTruthy();
    await exportBtn!.trigger('click');

    expect(createObjectURL).toHaveBeenCalled();
    const blobArg = createObjectURL.mock.calls[0]![0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    const text = await blobArg.text();
    expect(text).toBe('Paris;Capital\nRome');
    clickSpy.mockRestore();
  });

  it('SC-PACK-211: import appends parsed cards with new ids', async () => {
    const wrapper = shallowMount(ContentPackEditorPage, { global: { stubs } });
    await flushPromises();

    const fileInput = wrapper.find('input[type="file"]');
    expect(fileInput.exists()).toBe(true);

    const file = new File(['Berlin;City\nMadrid'], 'answers.csv', { type: 'text/csv' });
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      configurable: true,
    });
    await fileInput.trigger('change');
    await flushPromises();

    expect(saveDraft).toHaveBeenCalled();
    const saved = saveDraft.mock.calls[0]![1] as PackContent;
    expect(saved.answerCards).toHaveLength(4);
    expect(saved.answerCards[0]!.id).toBe('c1');
    expect(saved.answerCards[1]!.id).toBe('c2');
    expect(saved.answerCards[2]).toMatchObject({ content: 'Berlin', description: 'City' });
    expect(saved.answerCards[3]).toMatchObject({ content: 'Madrid', description: '' });
    expect(saved.answerCards[2]!.id).not.toBe('c1');
    expect(saved.answerCards[2]!.id).not.toBe('c2');
  });

  it('SC-PACK-212: import disabled when cardsReadOnly (task_set_author)', async () => {
    contentState.editorKind = 'task_set_author';
    contentState.pack = {
      ...contentState.pack,
      hasLive: true,
    };
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(draftBody),
    });

    const wrapper = shallowMount(ContentPackEditorPage, { global: { stubs } });
    await flushPromises();

    const importBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('data-label') === 'content.importAnswersCsv');
    expect(importBtn).toBeTruthy();
    expect(importBtn!.attributes('disabled')).toBeDefined();
  });

  it('SC-PACK-218-ish: failed file read shows error and does not append', async () => {
    const wrapper = shallowMount(ContentPackEditorPage, { global: { stubs } });
    await flushPromises();

    const fileInput = wrapper.find('input[type="file"]');
    const badFile = {
      text: () => Promise.reject(new Error('unreadable')),
    } as unknown as File;
    Object.defineProperty(fileInput.element, 'files', {
      value: [badFile],
      configurable: true,
    });
    await fileInput.trigger('change');
    await flushPromises();

    expect(wrapper.text()).toContain('content.csvImportFailed');
    expect(saveDraft).not.toHaveBeenCalled();
  });
});
