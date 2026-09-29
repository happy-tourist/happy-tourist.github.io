import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentCatalogPage from '@/pages/ContentCatalogPage.vue';
import ContentPackEditorPage from '@/pages/ContentPackEditorPage.vue';
import ContentPackPage from '@/pages/ContentPackPage.vue';
import type { ContentPackSummary, PackContent } from '@/stores/content';

const { contentState, authState, listCatalog, loadLivePack, loadDraft, routerPush } = vi.hoisted(
  () => {
    const contentState = {
      error: null as string | null,
      loading: false,
      catalog: [] as ContentPackSummary[],
      pack: null as ContentPackSummary | null,
      liveContent: null as PackContent | null,
      draft: null as PackContent | null,
      staffEditTarget: null as 'live' | 'working' | null,
      editorKind: 'creator' as 'creator' | 'task_set_author',
      moderationStatus: null as string | null,
      pendingRequestId: null as string | null,
      isPendingAuthor: false,
      pendingPackAuthorId: null as string | null,
      pendingTaskSetAuthorId: null as string | null,
      taskSetHasCascadeGap: vi.fn(() => false),
      taskHasCascadeGap: vi.fn(() => false),
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
      listCatalog: vi.fn().mockResolvedValue(undefined),
      loadLivePack: vi.fn().mockResolvedValue(undefined),
      loadDraft: vi.fn(),
      routerPush: vi.fn(),
    };
  },
);

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: routerPush, replace: vi.fn() }),
    useRoute: () => ({
      params: { id: 'p1' },
      query: {},
      path: '/content/packs',
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
      listCatalog,
      loadLivePack,
      loadDraft,
      starPack: vi.fn(),
      unstarPack: vi.fn(),
      unpublishPack: vi.fn(),
      republishPack: vi.fn(),
      unpublishTaskSet: vi.fn(),
      republishTaskSet: vi.fn(),
      acquireEditLock: vi.fn(),
      refreshEditLock: vi.fn(),
      releaseEditLock: vi.fn(),
      saveDraft: vi.fn(),
      loadModeration: vi.fn(),
      submitPack: vi.fn(),
      cancelRequest: vi.fn(),
      deleteUnpublishedPack: vi.fn(),
    })),
  };
});

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable', 'icon'],
    template:
      '<button type="button" v-bind="$attrs" :disabled="disable" @click="$attrs.onClick?.($event)">{{ label }}<slot /></button>',
  },
  'q-banner': true,
  'q-badge': { template: '<span v-bind="$attrs"><slot /></span>' },
  'q-dialog': { template: '<div><slot /></div>' },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-tooltip': { template: '<span />' },
  'q-form': { template: '<form><slot /></form>' },
  'q-input': { template: '<input />' },
  'q-space': true,
  'q-icon': true,
  PackAnswerCardTile: { template: '<div class="pack-answer-tile-stub" />' },
  PackCsvImportDialog: { template: '<div />' },
  PackListCardTile: false,
};

describe('catalog + task-set cards (SC-PACK-228/229)', () => {
  beforeEach(() => {
    authState.user = { id: 'u1', anonymous: false };
    authState.isStaff = false;
    authState.needsEmailVerification = false;
    contentState.error = null;
    contentState.loading = false;
    contentState.catalog = [
      {
        id: 'pub1',
        title: 'Published Pack',
        description: '',
        blocked: false,
        hasLive: true,
        inCatalog: true,
        createdBy: 'other',
        moderationStatus: 'in_catalog',
        isMine: false,
        isContributor: false,
        isFavorite: false,
      },
      {
        id: 'draft1',
        title: 'My draft pack with a long title',
        description: '',
        blocked: false,
        hasLive: false,
        createdBy: 'u1',
        moderationStatus: 'draft',
        isMine: true,
        isFavorite: false,
      },
    ];
    contentState.pack = {
      id: 'p1',
      title: 'Live',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
      createdBy: 'u1',
      isFavorite: false,
    };
    contentState.liveContent = {
      title: 'Live',
      description: '',
      answerCards: [{ id: 'c1', content: 'A', description: '' }],
      taskSets: [
        {
          id: 'ts1',
          authorUserId: 'u1',
          authorDisplayName: 'Author',
          coauthorLabels: [],
          moderationStatus: 'pending',
          tasks: [{ id: 't1', question: 'Q?', difficulty: 1, slots: [] }],
        },
      ],
    };
    contentState.draft = structuredClone(contentState.liveContent);
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(contentState.draft),
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-228: catalog packs render as 100×200 cards with star TL and Edit TR', async () => {
    const wrapper = shallowMount(ContentCatalogPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.find('[data-testid="packs-card-grid"]').exists()).toBe(true);
    const cards = wrapper.findAll('.pack-list-tile');
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards.every((c) => c.classes().includes('pack-list-tile'))).toBe(true);

    expect(wrapper.find('[data-test-id="packs-star-pub1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="packs-edit-draft1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="packs-edit-pub1"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="packs-status-draft1"]').exists()).toBe(true);
    expect(
      wrapper.find('[data-test-id="packs-row-draft1"] .pack-list-tile__title').text(),
    ).toContain('My draft pack');
  });

  it('SC-PACK-229: live task-set list uses 100×200 cards with status and Edit', async () => {
    // Set author (not pack creator) gets Edit on the card (SC-PACK-158).
    authState.user = { id: 'contrib', anonymous: false };
    contentState.pack = { ...contentState.pack!, createdBy: 'owner' };
    contentState.liveContent = {
      ...contentState.liveContent!,
      taskSets: [
        {
          id: 'ts1',
          authorUserId: 'contrib',
          authorDisplayName: 'Contrib',
          coauthorLabels: [],
          moderationStatus: 'pending',
          tasks: [{ id: 't1', question: 'Q?', difficulty: 1, slots: [] }],
        },
      ],
    };

    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.find('[data-testid="pack-task-set-grid"]').exists()).toBe(true);
    const card = wrapper.find('[data-test-id="pack-task-set-row-ts1"]');
    expect(card.exists()).toBe(true);
    expect(card.classes()).toContain('pack-list-tile');
    expect(wrapper.find('[data-test-id="pack-task-set-status-ts1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="pack-task-set-author-edit"]').exists()).toBe(true);
    expect(card.find('.pack-list-tile__title').text()).toContain('content.taskSetLabelFrom');
  });

  it('SC-PACK-229: editor task-set list uses same 100×200 card chrome', async () => {
    const wrapper = shallowMount(ContentPackEditorPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.find('[data-testid="editor-task-set-grid"]').exists()).toBe(true);
    const card = wrapper.find('[data-test-id="editor-task-set-row-ts1"]');
    expect(card.exists()).toBe(true);
    expect(card.classes()).toContain('pack-list-tile');
    expect(wrapper.find('[data-test-id="editor-task-set-edit-ts1"]').exists()).toBe(true);
    expect(card.find('.pack-list-tile__title').text()).toContain('content.taskSetLabelFrom');
  });
});
