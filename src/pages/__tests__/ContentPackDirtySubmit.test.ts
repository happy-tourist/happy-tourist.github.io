import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAllPackSubmitBaselines } from '@/lib/editorDirty';
import ContentPackEditorPage from '@/pages/ContentPackEditorPage.vue';
import type { PackContent } from '@/stores/content';

/** Meets creator submit minima (≥2 cards, ≥1 set with ≥2 filled tasks). */
const readyBody: PackContent = {
  title: 'Ready Pack',
  description: '',
  answerCards: [
    { id: 'c1', content: 'Paris', description: '' },
    { id: 'c2', content: 'London', description: '' },
  ],
  taskSets: [
    {
      id: 'ts1',
      authorUserId: 'u1',
      authorDisplayName: 'Author',
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
  submitPack,
} = vi.hoisted(() => {
  const contentState = {
    error: null as string | null,
    loading: false,
    saving: false,
    pack: {
      id: 'p1',
      title: 'Ready Pack',
      description: '',
      blocked: false,
      hasLive: false,
      inCatalog: false,
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
    loadStaffEdit: vi.fn(),
    acquireEditLock: vi.fn().mockResolvedValue({ ok: true }),
    staffSavePack: vi.fn(),
    saveDraft: vi.fn(),
    submitPack: vi.fn(),
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
      submitPack,
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

function submitBtn(wrapper: ReturnType<typeof mountEditor>) {
  return wrapper
    .findAll('button')
    .find((b) => b.attributes('data-label') === 'content.submitModeration');
}

describe('pack editor dirty Submit (SC-PACK-234)', () => {
  beforeEach(() => {
    clearAllPackSubmitBaselines();
    contentState.error = null;
    contentState.loading = false;
    contentState.staffEditTarget = null;
    contentState.editorKind = 'creator';
    contentState.moderationStatus = null;
    contentState.pendingRequestId = null;
    contentState.isPendingAuthor = false;
    contentState.pack = {
      id: 'p1',
      title: 'Ready Pack',
      description: '',
      blocked: false,
      hasLive: false,
      inCatalog: false,
      createdBy: 'u1',
    };
    contentState.draft = structuredClone(readyBody);
    authState.user = { id: 'u1', anonymous: false };
    authState.needsEmailVerification = false;
    authState.isStaff = false;
    acquireEditLock.mockClear().mockResolvedValue({ ok: true });
    staffSavePack.mockClear();
    saveDraft.mockClear().mockResolvedValue(structuredClone(readyBody));
    submitPack.mockClear().mockResolvedValue(undefined);
    loadStaffEdit.mockReset();
    loadDraft.mockReset().mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(readyBody),
    });
  });

  afterEach(() => {
    clearAllPackSubmitBaselines();
    vi.clearAllMocks();
  });

  it('SC-PACK-234: Submit disabled on open without edits; enabled after change', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    const btn = submitBtn(wrapper);
    expect(btn).toBeTruthy();
    expect(btn!.attributes('disabled')).toBeDefined();

    const titleInput = wrapper.find('input');
    await titleInput.setValue('Ready Pack edited');
    await flushPromises();

    expect(submitBtn(wrapper)!.attributes('disabled')).toBeUndefined();
  });

  it('SC-PACK-234: after successful submit, baseline refresh disables Submit again', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    await wrapper.find('input').setValue('Ready Pack edited');
    await flushPromises();
    expect(submitBtn(wrapper)!.attributes('disabled')).toBeUndefined();

    const afterSubmit: PackContent = {
      ...structuredClone(readyBody),
      title: 'Ready Pack edited',
    };
    submitPack.mockResolvedValue(undefined);
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: afterSubmit,
    });
    saveDraft.mockResolvedValue(afterSubmit);

    await submitBtn(wrapper)!.trigger('click');
    await flushPromises();

    expect(submitPack).toHaveBeenCalled();
    expect(submitBtn(wrapper)!.attributes('disabled')).toBeDefined();
  });

  it('staff published path still has no Submit (unaffected)', async () => {
    authState.isStaff = true;
    contentState.pack = {
      id: 'p1',
      title: 'Ready Pack',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
      createdBy: 'u1',
    };
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(readyBody),
    });
    loadStaffEdit.mockImplementation(() => {
      contentState.draft = structuredClone(readyBody);
      contentState.staffEditTarget = 'live';
      return Promise.resolve({
        pack: contentState.pack,
        content: structuredClone(readyBody),
        target: 'live' as const,
        lock: { holderId: 'u1', expiresAt: new Date(Date.now() + 60_000).toISOString() },
      });
    });

    const wrapper = mountEditor();
    await flushPromises();

    expect(submitBtn(wrapper)).toBeUndefined();
  });
});
