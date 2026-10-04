import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAllPackSubmitBaselines } from '@/lib/editorDirty';
import ContentCatalogPage from '@/pages/ContentCatalogPage.vue';
import ContentPackEditorPage from '@/pages/ContentPackEditorPage.vue';
import type { ContentPackSummary, PackContent } from '@/stores/content';

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
  acquireEditLock,
  saveDraft,
  deleteUnpublishedPack,
  listCatalog,
  routerReplace,
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
    } as ContentPackSummary,
    draft: null as PackContent | null,
    catalog: [] as ContentPackSummary[],
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
    acquireEditLock: vi.fn().mockResolvedValue({ ok: true }),
    saveDraft: vi.fn(),
    deleteUnpublishedPack: vi.fn(),
    listCatalog: vi.fn().mockResolvedValue(undefined),
    routerReplace: vi.fn(),
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: routerReplace }),
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
        loadStaffEdit: vi.fn(),
        acquireEditLock,
        refreshEditLock: vi.fn(),
        releaseEditLock: vi.fn(),
        staffSavePack: vi.fn(),
        saveDraft,
        loadModeration: vi.fn().mockResolvedValue({ messages: [] }),
        postModerationMessage: vi.fn(),
        submitPack: vi.fn(),
        cancelRequest: vi.fn(),
        deleteUnpublishedPack,
        unpublishTaskSet: vi.fn(),
        republishTaskSet: vi.fn(),
        listCatalog,
        starPack: vi.fn(),
        unstarPack: vi.fn(),
        unpublishPack: vi.fn(),
        republishPack: vi.fn(),
      }),
    ),
  };
});

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const editorStubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': { template: '<div><slot /></div>' },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable', 'icon'],
    template:
      '<button type="button" :disabled="disable" :data-label="label" v-bind="$attrs" @click="$emit(\'click\')">{{ label }}</button>',
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
  'q-dialog': {
    props: ['modelValue'],
    template: '<div v-if="modelValue !== false"><slot /></div>',
  },
  PackAnswerCardTile: true,
  PackTaskSetCardTile: true,
};

const catalogStubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable', 'icon'],
    template: '<button type="button">{{ label }}</button>',
  },
  'q-banner': true,
  'q-dialog': { template: '<div><slot /></div>' },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  PackListCardTile: {
    props: ['title', 'testId'],
    template: '<div :data-testid="testId || \'packs-row\'">{{ title }}</div>',
  },
};

function mountEditor() {
  return shallowMount(ContentPackEditorPage, { global: { stubs: editorStubs } });
}

function setupState(wrapper: ReturnType<typeof mountEditor>) {
  return (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$.setupState;
}

describe('pack draft lifecycle UI (SC-PACK-269/270/272/274/275)', () => {
  beforeEach(() => {
    clearAllPackSubmitBaselines();
    contentState.error = null;
    contentState.loading = false;
    contentState.catalog = [];
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
    saveDraft.mockClear().mockResolvedValue(structuredClone(readyBody));
    deleteUnpublishedPack.mockClear().mockResolvedValue({ ok: true, packId: 'p1' });
    listCatalog.mockClear().mockResolvedValue(undefined);
    routerReplace.mockClear();
    loadDraft.mockReset().mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(readyBody),
      hasUnsubmittedChanges: false,
      canHardDelete: true,
      moderationStatus: null,
    });
  });

  afterEach(() => {
    clearAllPackSubmitBaselines();
    vi.clearAllMocks();
  });

  it('SC-PACK-269: untouched shell is absent from unified catalog', async () => {
    // Server omits draft_activated=false shells; client catalog stays empty after create.
    contentState.catalog = [];
    const wrapper = shallowMount(ContentCatalogPage, { global: { stubs: catalogStubs } });
    await flushPromises();
    expect(wrapper.findAll('[data-testid^="packs-row"]').length).toBe(0);
  });

  it('SC-PACK-270: activated author draft appears in catalog after first save sync', async () => {
    contentState.catalog = [
      {
        id: 'p1',
        title: 'Ready Pack',
        description: '',
        blocked: false,
        hasLive: false,
        createdBy: 'u1',
        moderationStatus: 'draft',
        openRequestType: 'pack',
        isMine: true,
      },
    ];
    const wrapper = shallowMount(ContentCatalogPage, { global: { stubs: catalogStubs } });
    await flushPromises();
    expect(wrapper.find('[data-testid="packs-row-p1"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Ready Pack');
  });

  it('SC-PACK-274: top delete shown for canHardDelete pending; confirm clears and routes home', async () => {
    contentState.canHardDelete = true;
    contentState.moderationStatus = 'pending';
    contentState.pendingRequestId = 'r1';
    contentState.isPendingAuthor = true;
    contentState.hasUnsubmittedChanges = false;

    const wrapper = mountEditor();
    await flushPromises();

    expect(wrapper.find('[data-testid="delete-unpublished-pack"]').exists()).toBe(true);
    await wrapper.find('[data-testid="delete-unpublished-pack"]').trigger('click');
    await flushPromises();

    const state = setupState(wrapper);
    expect(state.packDeleteConfirmOpen).toBe(true);
    await (state.doDeletePack as () => Promise<void>)();
    await flushPromises();

    expect(deleteUnpublishedPack).toHaveBeenCalledWith('p1');
    expect(routerReplace).toHaveBeenCalledWith({ name: 'content-catalog' });
  });

  it('SC-PACK-275: hard delete hidden when canHardDelete is false (published lineage)', async () => {
    contentState.canHardDelete = false;
    contentState.pack = {
      id: 'p1',
      title: 'Live Pack',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
      createdBy: 'u1',
    };
    contentState.moderationStatus = 'draft';
    contentState.hasUnsubmittedChanges = true;

    const wrapper = mountEditor();
    await flushPromises();
    expect(wrapper.find('[data-testid="delete-unpublished-pack"]').exists()).toBe(false);
    expect(setupState(wrapper).canDeletePack).toBe(false);
  });

  it('SC-PACK-272: pending withdraw to draft updates author status label', async () => {
    contentState.moderationStatus = 'pending';
    contentState.pendingRequestId = 'r1';
    contentState.isPendingAuthor = true;
    contentState.hasUnsubmittedChanges = false;

    const pending = mountEditor();
    await flushPromises();
    expect(pending.text()).toContain('content.taskSetStatusMarks.pending');

    contentState.moderationStatus = 'draft';
    contentState.hasUnsubmittedChanges = true;
    const draft = mountEditor();
    await flushPromises();
    expect(draft.text()).toContain('content.addTaskSetDraftStatus');
  });
});
