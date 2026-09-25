import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentCollectionPage from '@/pages/ContentCollectionPage.vue';
import type { ContentPackSummary } from '@/stores/content';

const { contentState, authState, listCollection, routerPush } = vi.hoisted(() => {
  const contentState = {
    error: null as string | null,
    loading: false,
    collection: [] as ContentPackSummary[],
  };
  const authState = {
    user: { id: 'u1', anonymous: false } as { id: string; anonymous: boolean } | null,
    needsEmailVerification: false,
    isStaff: false,
  };
  return {
    contentState,
    authState,
    listCollection: vi.fn().mockResolvedValue(undefined),
    routerPush: vi.fn(),
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: routerPush, replace: vi.fn() }),
    useRoute: () => ({ params: {}, query: {}, path: '/content/collection' }),
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
      listCollection,
      removeFromCollection: vi.fn(),
    })),
  };
});

const livePack: ContentPackSummary = {
  id: 'p1',
  title: 'Live Pack',
  description: '',
  blocked: false,
  hasLive: true,
  createdBy: 'u1',
};

const draftPack: ContentPackSummary = {
  id: 'p2',
  title: 'Draft',
  description: '',
  blocked: false,
  hasLive: false,
  createdBy: 'u1',
};

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': { template: '<div><slot /></div>' },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label'],
    template: '<button type="button" v-bind="$attrs">{{ label }}<slot /></button>',
  },
  'q-banner': true,
  'q-badge': { template: '<span class="q-badge-stub"><slot /></span>' },
  'q-dialog': { template: '<div class="dialog"><slot /></div>' },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
};

describe('collection ACL (SC-PACK-106/107)', () => {
  beforeEach(() => {
    contentState.error = null;
    contentState.loading = false;
    contentState.collection = [structuredClone(livePack)];
    authState.user = { id: 'u1', anonymous: false };
    authState.needsEmailVerification = false;
    authState.isStaff = false;
    listCollection.mockClear();
    routerPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-106/118: published non-staff has no row add-task-set or Edit', async () => {
    const wrapper = shallowMount(ContentCollectionPage, { global: { stubs } });
    await flushPromises();

    expect(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'content.edit'),
    ).toBe(false);
    expect(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'content.addTaskSetNav'),
    ).toBe(false);
    expect(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'content.unpublish'),
    ).toBe(false);
  });

  it('SC-PACK-66/118: published row click goes to live, not add-task-set or edit', async () => {
    const localStubs = {
      ...stubs,
      'q-item': {
        template:
          '<div class="collection-row" v-bind="$attrs" @click="$attrs.onClick"><slot /></div>',
      },
    };
    const wrapper = shallowMount(ContentCollectionPage, { global: { stubs: localStubs } });
    await flushPromises();

    const row = wrapper.find('.collection-row');
    expect(row.exists()).toBe(true);
    await row.trigger('click');
    await flushPromises();
    expect(routerPush).toHaveBeenCalledWith({ name: 'content-pack', params: { id: 'p1' } });
    expect(routerPush).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: 'content-pack-add-task-set' }),
    );
    expect(routerPush).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: 'content-pack-edit' }),
    );
  });

  it('SC-PACK-112: staff sees Edit on published pack', async () => {
    authState.isStaff = true;
    const wrapper = shallowMount(ContentCollectionPage, { global: { stubs } });
    await flushPromises();

    expect(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'content.edit'),
    ).toBe(true);
    expect(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'content.addTaskSetNav'),
    ).toBe(false);
  });

  it('SC-PACK-116/184: staff does not see my-moderation; no embedded Модерация on collection chrome', async () => {
    authState.isStaff = true;
    const wrapper = shallowMount(ContentCollectionPage, { global: { stubs } });
    await flushPromises();

    expect(
      wrapper.findAll('button').some((b) => b.text().includes('content.myModerationNav')),
    ).toBe(false);
    expect(wrapper.findAll('button').some((b) => b.text().includes('content.staffNav'))).toBe(
      false,
    );
  });

  it('unpublished creator sees Edit', async () => {
    contentState.collection = [structuredClone(draftPack)];
    const wrapper = shallowMount(ContentCollectionPage, { global: { stubs } });
    await flushPromises();

    expect(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'content.edit'),
    ).toBe(true);
    expect(wrapper.text()).toContain('content.draftOnly');
  });
});
