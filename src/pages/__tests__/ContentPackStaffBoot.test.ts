import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPackEditorPage from '@/pages/ContentPackEditorPage.vue';
import type { PackContent } from '@/stores/content';

const draftBody: PackContent = {
  title: 'Staff Pack',
  description: '',
  answerCards: [{ id: 'c1', content: 'Paris', description: '' }],
  taskSets: [
    {
      id: 'ts1',
      authorUserId: 'u1',
      authorDisplayName: 'Staff',
      coauthorLabels: [],
      tasks: [
        {
          id: 't1',
          question: 'Q?',
          difficulty: 1,
          slots: [{ id: 's1', answerCardId: 'c1' }],
        },
        {
          id: 't2',
          question: 'Q2?',
          difficulty: 1,
          slots: [{ id: 's2', answerCardId: 'c1' }],
        },
      ],
    },
  ],
};

const {
  contentState,
  authState,
  loadDraft,
  loadStaffEdit,
  acquireEditLock,
  staffSavePack,
  saveDraft,
} = vi.hoisted(() => {
  const contentState = {
    error: null as string | null,
    loading: false,
    saving: false,
    pack: {
      id: 'p1',
      title: 'Staff Pack',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
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
    isStaff: true,
  };
  return {
    contentState,
    authState,
    loadDraft: vi.fn(),
    loadStaffEdit: vi.fn(),
    acquireEditLock: vi.fn().mockResolvedValue({ ok: true }),
    staffSavePack: vi.fn(),
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
      loadStaffEdit,
      acquireEditLock,
      refreshEditLock: vi.fn(),
      releaseEditLock: vi.fn(),
      staffSavePack,
      saveDraft,
      loadModeration: vi.fn().mockResolvedValue({ messages: [] }),
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
      '<button type="button" :disabled="disable" :data-label="label" @click="$emit(\'click\')"><slot />{{ label }}</button>',
  },
  'q-banner': { template: '<div><slot /><slot name="action" /></div>' },
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
  'q-tooltip': { template: '<span><slot /></span>' },
  'q-dialog': { template: '<div><slot /></div>' },
  PackListCardTile: false,
  PackAnswerCardTile: true,
};

function mountEditor() {
  return shallowMount(ContentPackEditorPage, { global: { stubs } });
}

function hasSubmit(wrapper: ReturnType<typeof mountEditor>) {
  return wrapper
    .findAll('button')
    .some((b) => b.attributes('data-label') === 'content.submitModeration');
}

describe('pack editor staff boot (SC-PACK-231/232)', () => {
  beforeEach(() => {
    contentState.error = null;
    contentState.loading = false;
    contentState.staffEditTarget = null;
    contentState.editorKind = 'creator';
    contentState.moderationStatus = null;
    contentState.pendingRequestId = null;
    contentState.isPendingAuthor = false;
    contentState.draft = structuredClone(draftBody);
    authState.user = { id: 'u1', anonymous: false };
    authState.needsEmailVerification = false;
    authState.isStaff = true;
    acquireEditLock.mockClear().mockResolvedValue({ ok: true });
    staffSavePack.mockClear().mockResolvedValue(structuredClone(draftBody));
    saveDraft.mockClear().mockResolvedValue(structuredClone(draftBody));
    loadStaffEdit.mockReset();
    loadDraft.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-231: staff creator on published pack enters staffMode without Submit', async () => {
    contentState.pack = {
      id: 'p1',
      title: 'Staff Pack',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
      createdBy: 'u1',
    };
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(draftBody),
    });
    loadStaffEdit.mockImplementation(() => {
      contentState.draft = structuredClone(draftBody);
      contentState.staffEditTarget = 'live';
      return Promise.resolve({
        pack: contentState.pack,
        content: structuredClone(draftBody),
        target: 'live' as const,
        lock: { holderId: 'u1', expiresAt: new Date(Date.now() + 60_000).toISOString() },
      });
    });

    const wrapper = mountEditor();
    await flushPromises();

    expect(loadDraft).toHaveBeenCalledWith('p1');
    expect(acquireEditLock).toHaveBeenCalledWith('p1');
    expect(loadStaffEdit).toHaveBeenCalledWith('p1');
    expect(hasSubmit(wrapper)).toBe(false);
    expect(wrapper.find('input').exists()).toBe(true);
  });

  it('SC-PACK-232: staff creator on never-published pack keeps Submit', async () => {
    contentState.pack = {
      id: 'p1',
      title: 'Staff Pack',
      description: '',
      blocked: false,
      hasLive: false,
      inCatalog: false,
      createdBy: 'u1',
    };
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(draftBody),
    });

    const wrapper = mountEditor();
    await flushPromises();

    expect(loadDraft).toHaveBeenCalledWith('p1');
    expect(loadStaffEdit).not.toHaveBeenCalled();
    expect(hasSubmit(wrapper)).toBe(true);
  });
});
