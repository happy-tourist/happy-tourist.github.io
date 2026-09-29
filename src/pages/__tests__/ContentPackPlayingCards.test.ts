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
  taskSets: [],
};

const { contentState, authState, loadDraft, saveDraft } = vi.hoisted(() => {
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
    template: '<button type="button" :disabled="disable">{{ label }}<slot /></button>',
  },
  'q-tooltip': { template: '<span />' },
  'q-banner': { template: '<div><slot /><slot name="action" /></div>' },
  'q-badge': true,
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-form': { template: '<form @submit.prevent><slot /></form>' },
  'q-input': { template: '<input />' },
  'q-space': true,
  'q-dialog': { template: '<div><slot /></div>' },
  PackAnswerCardTile: {
    props: ['content', 'description', 'editable'],
    emits: ['edit', 'delete'],
    template:
      '<div class="pack-answer-tile-stub" :data-editable="editable" :data-content="content" :data-description="description"></div>',
  },
  PackListCardTile: false,
};

describe('ContentPackEditorPage playing-card chrome (SC-PACK-222/224)', () => {
  beforeEach(() => {
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
    loadDraft.mockResolvedValue({
      pack: contentState.pack,
      draft: structuredClone(draftBody),
    });
    saveDraft.mockResolvedValue(undefined);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders answer cards as playing-card tiles in a wrap grid', async () => {
    const wrapper = shallowMount(ContentPackEditorPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.find('[data-testid="answer-card-grid"]').exists()).toBe(true);
    const tiles = wrapper.findAll('.pack-answer-tile-stub');
    expect(tiles).toHaveLength(2);
    expect(tiles[0]!.attributes('data-content')).toBe('Paris');
    expect(tiles[0]!.attributes('data-description')).toBe('Capital');
    expect(tiles[0]!.attributes('data-editable')).toBe('true');
    expect(tiles[1]!.attributes('data-description')).toBe('');
  });
});
