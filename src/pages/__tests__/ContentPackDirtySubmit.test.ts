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
  deleteUnpublishedPack,
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
    hasUnsubmittedChanges: false,
    canHardDelete: false,
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
    deleteUnpublishedPack: vi.fn(),
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
    useContentStore: vi.fn(() =>
      Object.assign(contentState, {
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
        deleteUnpublishedPack,
        unpublishTaskSet: vi.fn(),
        republishTaskSet: vi.fn(),
      }),
    ),
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
      '<button type="button" :disabled="disable" :data-label="label" v-bind="$attrs" @click="$emit(\'click\')"><slot />{{ label }}</button>',
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

function setupState(wrapper: ReturnType<typeof mountEditor>) {
  return (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$.setupState;
}

describe('pack editor dirty Submit (SC-PACK-234/271/273)', () => {
  beforeEach(() => {
    clearAllPackSubmitBaselines();
    contentState.error = null;
    contentState.loading = false;
    contentState.staffEditTarget = null;
    contentState.editorKind = 'creator';
    contentState.moderationStatus = null;
    contentState.pendingRequestId = null;
    contentState.isPendingAuthor = false;
    contentState.hasUnsubmittedChanges = false;
    contentState.canHardDelete = true;
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
    saveDraft.mockClear().mockImplementation((body: PackContent) => {
      contentState.hasUnsubmittedChanges = true;
      if (contentState.moderationStatus === 'pending') {
        contentState.moderationStatus = 'draft';
      }
      return Promise.resolve(structuredClone(body));
    });
    submitPack.mockClear().mockImplementation(() => {
      contentState.hasUnsubmittedChanges = false;
      contentState.moderationStatus = 'pending';
      contentState.pendingRequestId = 'r1';
      contentState.isPendingAuthor = true;
      return Promise.resolve(undefined);
    });
    deleteUnpublishedPack.mockClear().mockResolvedValue({ ok: true });
    loadStaffEdit.mockReset();
    loadDraft.mockReset().mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(readyBody),
      hasUnsubmittedChanges: contentState.hasUnsubmittedChanges,
      canHardDelete: contentState.canHardDelete,
      moderationStatus: contentState.moderationStatus,
    });
  });

  afterEach(() => {
    clearAllPackSubmitBaselines();
    vi.clearAllMocks();
  });

  it('SC-PACK-234: Submit disabled without persisted dirty; enabled after marker set', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    const btn = submitBtn(wrapper);
    expect(btn).toBeTruthy();
    expect(btn!.attributes('disabled')).toBeDefined();
    expect(setupState(wrapper).canSubmit).toBe(false);

    // Local edit alone does not enable Submit (server marker required).
    await wrapper.find('input').setValue('Ready Pack edited');
    await flushPromises();
    expect(setupState(wrapper).canSubmit).toBe(false);

    contentState.hasUnsubmittedChanges = true;
    const ready = mountEditor();
    await flushPromises();
    expect(setupState(ready).canSubmit).toBe(true);
    expect(submitBtn(ready)!.attributes('disabled')).toBeUndefined();
  });

  it('SC-PACK-271: reload with hasUnsubmittedChanges enables Submit without further edit', async () => {
    contentState.hasUnsubmittedChanges = true;
    contentState.moderationStatus = 'draft';
    contentState.pendingRequestId = 'r-draft';
    contentState.isPendingAuthor = true;
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(readyBody),
      hasUnsubmittedChanges: true,
      canHardDelete: true,
      moderationStatus: 'draft',
    });

    const wrapper = mountEditor();
    await flushPromises();

    expect(setupState(wrapper).canSubmit).toBe(true);
    expect(submitBtn(wrapper)!.attributes('disabled')).toBeUndefined();
    expect(wrapper.text()).toContain('content.addTaskSetDraftStatus');
  });

  it('SC-PACK-273: dirty needs_revision keeps label and enables Submit after reload', async () => {
    contentState.hasUnsubmittedChanges = true;
    contentState.moderationStatus = 'needs_revision';
    contentState.pendingRequestId = 'r1';
    contentState.isPendingAuthor = true;
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(readyBody),
      hasUnsubmittedChanges: true,
      canHardDelete: true,
      moderationStatus: 'needs_revision',
    });

    const wrapper = mountEditor();
    await flushPromises();

    expect(wrapper.text()).toContain('content.taskSetStatusMarks.needs_revision');
    expect(setupState(wrapper).canSubmit).toBe(true);
    expect(setupState(wrapper).canReply).toBe(true);
  });

  it('SC-PACK-272: pending remains editable; save shows draft status', async () => {
    contentState.hasUnsubmittedChanges = false;
    contentState.moderationStatus = 'pending';
    contentState.pendingRequestId = 'r1';
    contentState.isPendingAuthor = true;
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(readyBody),
      hasUnsubmittedChanges: false,
      canHardDelete: true,
      moderationStatus: 'pending',
    });

    const pending = mountEditor();
    await flushPromises();
    expect(setupState(pending).canSubmit).toBe(false);
    expect(pending.text()).toContain('content.taskSetStatusMarks.pending');

    contentState.hasUnsubmittedChanges = true;
    contentState.moderationStatus = 'draft';
    const withdrawn = mountEditor();
    await flushPromises();
    expect(withdrawn.text()).toContain('content.addTaskSetDraftStatus');
    expect(setupState(withdrawn).canSubmit).toBe(true);
  });

  it('SC-PACK-234: after successful submit, marker clear disables Submit again', async () => {
    contentState.hasUnsubmittedChanges = true;
    const wrapper = mountEditor();
    await flushPromises();
    expect(setupState(wrapper).canSubmit).toBe(true);

    const afterSubmit: PackContent = {
      ...structuredClone(readyBody),
      title: 'Ready Pack edited',
    };
    loadDraft.mockImplementation(() => {
      contentState.hasUnsubmittedChanges = false;
      contentState.moderationStatus = 'pending';
      contentState.pendingRequestId = 'r1';
      contentState.isPendingAuthor = true;
      contentState.draft = afterSubmit;
      return Promise.resolve({
        pack: contentState.pack,
        draft: afterSubmit,
        hasUnsubmittedChanges: false,
        canHardDelete: true,
        moderationStatus: 'pending',
      });
    });
    saveDraft.mockResolvedValue(afterSubmit);

    await submitBtn(wrapper)!.trigger('click');
    await flushPromises();

    expect(submitPack).toHaveBeenCalled();
    expect(contentState.hasUnsubmittedChanges).toBe(false);
    // Remount mirrors reload after submit (non-reactive mock bag).
    const after = mountEditor();
    await flushPromises();
    expect(setupState(after).canSubmit).toBe(false);
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
    contentState.canHardDelete = false;
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
