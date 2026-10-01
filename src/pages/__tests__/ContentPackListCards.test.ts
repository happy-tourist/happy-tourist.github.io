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
    props: {
      label: { type: String, default: undefined },
      disable: { type: Boolean, default: false },
      icon: { type: String, default: undefined },
      outline: { type: Boolean, default: false },
      dense: { type: Boolean, default: false },
    },
    template:
      '<button type="button" v-bind="$attrs" :disabled="disable" :data-icon="icon" :data-outline="outline ? \'1\' : \'\'" :data-dense="dense ? \'1\' : \'\'" @click="$attrs.onClick?.($event)">{{ label }}<slot /></button>',
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
  PackListCardTile: false,
  PackTaskSetCardTile: false,
};

describe('catalog + task-set cards (SC-PACK-228/229/249…251)', () => {
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

  it('SC-PACK-228: catalog packs render as ~180×260 cards with star TL, description, Edit bottom', async () => {
    contentState.catalog = [
      {
        id: 'pub1',
        title: 'Published Pack',
        description: 'Published pack description text',
        blocked: false,
        hasLive: true,
        inCatalog: true,
        createdBy: 'other',
        moderationStatus: 'in_catalog',
        isMine: false,
        isContributor: false,
        isFavorite: false,
        taskSetsPreview: [
          { id: 'ts1', ordinal: 1, taskCount: 10, inCatalog: true },
          { id: 'ts2', ordinal: 2, taskCount: 5, inCatalog: true },
        ],
      },
      {
        id: 'draft1',
        title: 'My draft pack with a long title',
        description: 'Draft description for catalog card',
        blocked: false,
        hasLive: false,
        createdBy: 'u1',
        moderationStatus: 'draft',
        isMine: true,
        isFavorite: false,
        taskSetsPreview: [],
      },
    ];

    const wrapper = shallowMount(ContentCatalogPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.find('[data-testid="packs-card-grid"]').exists()).toBe(true);
    const cards = wrapper.findAll('.pack-list-tile');
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards.every((c) => c.classes().includes('pack-list-tile'))).toBe(true);

    expect(wrapper.find('[data-test-id="packs-star-pub1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="packs-edit-draft1"]').exists()).toBe(true);
    expect(
      wrapper.find('.pack-list-tile__trailing [data-test-id="packs-edit-draft1"]').exists(),
    ).toBe(false);
    expect(
      wrapper.find('.pack-list-tile__actions [data-test-id="packs-edit-draft1"]').exists(),
    ).toBe(true);
    const editBtn = wrapper.find('[data-test-id="packs-edit-draft1"]');
    expect(editBtn.attributes('data-outline')).toBe('1');
    expect(editBtn.attributes('data-icon')).toBe('edit');
    expect(editBtn.attributes('data-dense')).toBe('1');
    expect(wrapper.find('[data-test-id="packs-edit-pub1"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="packs-status-draft1"]').exists()).toBe(true);
    expect(
      wrapper.find('[data-test-id="packs-row-draft1"] .pack-list-tile__title').text(),
    ).toContain('My draft pack');
    expect(
      wrapper.find('[data-test-id="packs-row-draft1"] .pack-list-tile__description').text(),
    ).toContain('Draft description');
    // Set preview on published card.
    expect(
      wrapper.find('[data-test-id="packs-row-pub1"] [data-testid="pack-list-sets"]').exists(),
    ).toBe(true);
  });

  it('SC-PACK-249: catalog card shows ≤4 sets + overflow; muted soft-unpub/neverLive rows', async () => {
    contentState.catalog = [
      {
        id: 'pub1',
        title: 'Six sets pack',
        description: 'Has six sets',
        blocked: false,
        hasLive: true,
        inCatalog: true,
        createdBy: 'other',
        moderationStatus: 'in_catalog',
        isMine: false,
        isFavorite: false,
        taskSetsPreview: [
          { id: 'a', ordinal: 1, taskCount: 48, inCatalog: true },
          { id: 'b', ordinal: 2, taskCount: 36, inCatalog: false },
          { id: 'c', ordinal: 3, taskCount: 12, inCatalog: true },
          { id: 'd', ordinal: 4, taskCount: 8, inCatalog: true },
          { id: 'e', ordinal: 5, taskCount: 4, inCatalog: true },
          { id: 'f', ordinal: 6, taskCount: 2, inCatalog: true, neverLive: true },
        ],
      },
    ];

    const wrapper = shallowMount(ContentCatalogPage, { global: { stubs } });
    await flushPromises();

    const card = wrapper.find('[data-test-id="packs-row-pub1"]');
    expect(card.exists()).toBe(true);
    expect(card.findAll('[data-testid="pack-list-set-row"]')).toHaveLength(4);
    expect(card.find('[data-testid="pack-list-sets-overflow"]').exists()).toBe(true);
    expect(card.findAll('.pack-list-tile__set-row--muted').length).toBeGreaterThanOrEqual(1);
    expect(card.find('[data-testid="pack-list-set-icon"]').attributes('data-icon')).toBe(
      'task-set-card-tasks',
    );
  });

  it('SC-PACK-250: outline+icon Edit/Unpublish; whole-card open outside actions/star', async () => {
    authState.isStaff = true;
    authState.user = { id: 'staff1', anonymous: false };
    contentState.catalog = [
      {
        id: 'pub1',
        title: 'Staff pack',
        description: 'Desc',
        blocked: false,
        hasLive: true,
        inCatalog: true,
        createdBy: 'u1',
        moderationStatus: 'draft',
        openRequestType: 'pack',
        isMine: true,
        isFavorite: false,
        taskSetsPreview: [{ id: 'ts1', ordinal: 1, taskCount: 3, inCatalog: true }],
      },
    ];

    const wrapper = shallowMount(ContentCatalogPage, { global: { stubs } });
    await flushPromises();

    const editBtn = wrapper.find('[data-test-id="packs-edit-pub1"]');
    expect(editBtn.exists()).toBe(true);
    expect(editBtn.attributes('data-outline')).toBe('1');
    expect(editBtn.attributes('data-icon')).toBe('edit');
    expect(editBtn.attributes('data-dense')).toBe('1');

    const unpubBtn = wrapper.find('[data-test-id="packs-unpublish-pub1"]');
    expect(unpubBtn.exists()).toBe(true);
    expect(unpubBtn.attributes('data-outline')).toBe('1');
    expect(unpubBtn.attributes('data-icon')).toBe('visibility_off');
    expect(unpubBtn.text()).toContain('content.unpublish');

    // Body open → Edit for pack-level draft.
    await wrapper.find('[data-test-id="packs-row-pub1"]').trigger('click');
    expect(routerPush).toHaveBeenCalledWith({
      name: 'content-pack-edit',
      params: { id: 'pub1' },
    });
  });

  it('SC-PACK-251: revise badge short ДОРАБОТАТЬ red-outline; title uppercase CSS', async () => {
    const messages = (await import('@/i18n/en-US')).default;
    expect(messages.content.taskSetCardBadge.needs_revision).toBe('ДОРАБОТАТЬ');
    expect(messages.content.statuses.needs_revision).toBe('Нужна доработка');
    expect(messages.content.packCardSetsOverflow).toBe('ещё {k}');

    contentState.catalog = [
      {
        id: 'rev1',
        title: 'География мира',
        description: 'Факты и столицы.',
        blocked: false,
        hasLive: false,
        createdBy: 'u1',
        moderationStatus: 'needs_revision',
        openRequestType: 'pack',
        isMine: true,
        isFavorite: false,
        taskSetsPreview: [],
      },
    ];

    const wrapper = shallowMount(ContentCatalogPage, { global: { stubs } });
    await flushPromises();

    const status = wrapper.find('[data-test-id="packs-status-rev1"]');
    expect(status.exists()).toBe(true);
    expect(status.classes()).toContain('pack-list-status-badge--revise');
    expect(status.text()).toContain('content.taskSetCardBadge.needs_revision');
    expect(status.text()).not.toContain('content.statuses.needs_revision');

    const title = wrapper.find('[data-test-id="packs-row-rev1"] .pack-list-tile__title');
    expect(title.exists()).toBe(true);
    expect(title.text()).toContain('География мира');
  });

  it('SC-PACK-229: live task-set list uses summary cards with status and bottom Edit', async () => {
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
    expect(card.classes()).toContain('pack-task-set-tile');
    expect(wrapper.find('[data-test-id="pack-task-set-status-ts1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="pack-task-set-author-edit"]').exists()).toBe(true);
    expect(
      card.find('.pack-task-set-tile__actions [data-test-id="pack-task-set-author-edit"]').exists(),
    ).toBe(true);
    expect(card.find('.pack-task-set-tile__title').text()).toContain('content.taskSetLabel');
    expect(card.find('.pack-task-set-tile__title').text()).not.toContain('taskSetLabelFrom');
    expect(card.find('[data-testid="pack-task-set-stats"]').exists()).toBe(true);
  });

  it('SC-PACK-229: editor task-set list uses same summary card chrome with bottom Edit', async () => {
    const wrapper = shallowMount(ContentPackEditorPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.find('[data-testid="editor-task-set-grid"]').exists()).toBe(true);
    const card = wrapper.find('[data-test-id="editor-task-set-row-ts1"]');
    expect(card.exists()).toBe(true);
    expect(card.classes()).toContain('pack-task-set-tile');
    const editBtn = wrapper.find('[data-test-id="editor-task-set-edit-ts1"]');
    expect(editBtn.exists()).toBe(true);
    expect(
      card.find('.pack-task-set-tile__actions [data-test-id="editor-task-set-edit-ts1"]').exists(),
    ).toBe(true);
    expect(editBtn.attributes('data-outline')).toBe('1');
    expect(editBtn.attributes('data-dense')).toBe('1');
    expect(card.find('.pack-task-set-tile__title').text()).toContain('content.taskSetLabel');
  });

  it('SC-PACK-240/241/248: short card badges with SVG icons and outline actions on live task-set card', async () => {
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
          moderationStatus: 'needs_revision',
          tasks: [
            { id: 't1', question: 'Q1?', difficulty: 1, slots: [] },
            { id: 't2', question: 'Q2?', difficulty: 2, slots: [] },
            { id: 't3', question: 'Q3?', difficulty: 3, slots: [] },
          ],
        },
      ],
    };

    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();

    const status = wrapper.find('[data-test-id="pack-task-set-status-ts1"]');
    expect(status.exists()).toBe(true);
    expect(status.text()).toContain('content.taskSetCardBadge.needs_revision');
    expect(status.text()).not.toContain('content.taskSetStatusMarks');
    // SC-PACK-248: custom SVG mask icon class (not Material close/schedule/…).
    expect(status.find('.pack-task-set-status-icon--revise').exists()).toBe(true);
    expect(status.find('.pack-task-set-status-icon--revise').element.tagName.toLowerCase()).toBe(
      'span',
    );

    const editBtn = wrapper.find('[data-test-id="pack-task-set-author-edit"]');
    expect(editBtn.exists()).toBe(true);
    // Outline + icon (SC-PACK-241); not icon-only corner.
    expect(editBtn.attributes('data-icon')).toBe('edit');
    expect(editBtn.attributes('data-outline')).toBe('1');
    // Slim ~28–32px via dense (+ tile CSS min-height).
    expect(editBtn.attributes('data-dense')).toBe('1');
    expect(editBtn.text()).toContain('content.edit');
    expect(wrapper.find('[data-testid="pack-task-set-diff-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pack-task-set-diff-2"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pack-task-set-diff-3"]').exists()).toBe(true);
    // Total-row custom SVG (SC-PACK-248).
    expect(wrapper.find('[data-testid="pack-task-set-total-icon"]').attributes('data-icon')).toBe(
      'task-set-card-tasks',
    );
  });

  it('SC-PACK-239: viewer without card actions has no empty actions chrome', async () => {
    // Pack creator on live: Edit is header-only; card actions omitted for non-staff non-contrib.
    authState.user = { id: 'owner', anonymous: false };
    authState.isStaff = false;
    contentState.pack = { ...contentState.pack!, createdBy: 'owner' };
    contentState.liveContent = {
      ...contentState.liveContent!,
      taskSets: [
        {
          id: 'ts1',
          authorUserId: 'owner',
          authorDisplayName: 'Owner',
          coauthorLabels: [],
          tasks: [{ id: 't1', question: 'Q?', difficulty: 1, slots: [] }],
        },
      ],
    };

    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();

    const card = wrapper.find('[data-test-id="pack-task-set-row-ts1"]');
    expect(card.exists()).toBe(true);
    expect(card.find('.pack-task-set-tile__actions').exists()).toBe(false);
  });

  it('SC-PACK-241/243: card soft-unpublish/republish use short keys; pack unpublish stays long', async () => {
    const messages = (await import('@/i18n/en-US')).default;
    expect(messages.content.taskSetLabel).toMatch(/#\{n\}/);
    expect(messages.content.taskSetCardTotal).toBe('Заданий:');
    expect(messages.content.taskSetCardUnpublish).toBe('Снять');
    expect(messages.content.taskSetCardRepublish).toBe('Вернуть');
    expect(messages.content.unpublish).toBe('Снять с публикации');
    expect(messages.content.republish).toBe('Опубликовать снова');

    authState.isStaff = true;
    authState.user = { id: 'staff1', anonymous: false };
    contentState.liveContent = {
      ...contentState.liveContent!,
      taskSets: [
        {
          id: 'ts1',
          authorUserId: 'u1',
          authorDisplayName: 'Author',
          coauthorLabels: [],
          inCatalog: true,
          tasks: [{ id: 't1', question: 'Q?', difficulty: 1, slots: [] }],
        },
        {
          id: 'ts2',
          authorUserId: 'u1',
          authorDisplayName: 'Author',
          coauthorLabels: [],
          inCatalog: false,
          tasks: [{ id: 't2', question: 'Q2?', difficulty: 2, slots: [] }],
        },
      ],
    };

    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();

    const card = wrapper.find('[data-test-id="pack-task-set-row-ts1"]');
    expect(card.exists()).toBe(true);
    expect(card.find('.pack-task-set-tile__title').text()).toContain('content.taskSetLabel');
    expect(
      wrapper.findAll('button').some((b) => b.text().includes('content.taskSetCardUnpublish')),
    ).toBe(true);
    expect(
      wrapper.findAll('button').some((b) => b.text().includes('content.taskSetCardRepublish')),
    ).toBe(true);
    // Pack-level chrome keeps long copy.
    expect(wrapper.findAll('button').some((b) => b.text().includes('content.unpublish'))).toBe(
      true,
    );
  });
});
