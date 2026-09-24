import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentCatalogPage from '@/pages/ContentCatalogPage.vue';
import ContentCollectionPage from '@/pages/ContentCollectionPage.vue';
import ContentPackPage from '@/pages/ContentPackPage.vue';
import type { ContentPackSummary, PackContent } from '@/stores/content';

const {
  contentState,
  authState,
  listCatalog,
  listCollection,
  loadLivePack,
  unpublishPack,
  republishPack,
  acquireEditLock,
  routerPush,
} = vi.hoisted(() => {
  const pack: ContentPackSummary = {
    id: 'p1',
    title: 'Live',
    description: '',
    blocked: false,
    hasLive: true,
    inCatalog: true,
    createdBy: 'creator-1',
    inCollection: true,
  };
  const liveContent: PackContent = {
    title: 'Live',
    description: '',
    answerCards: [{ id: 'c1', content: 'A', description: '' }],
    taskSets: [],
  };
  const contentState = {
    error: null as string | null,
    loading: false,
    catalog: [] as ContentPackSummary[],
    collection: [] as ContentPackSummary[],
    pack,
    liveContent,
  };
  const authState = {
    user: { id: 'creator-1', anonymous: false } as {
      id: string;
      anonymous: boolean;
    } | null,
    needsEmailVerification: false,
    isStaff: false,
  };
  return {
    contentState,
    authState,
    listCatalog: vi.fn().mockResolvedValue(undefined),
    listCollection: vi.fn().mockResolvedValue(undefined),
    loadLivePack: vi.fn().mockResolvedValue(undefined),
    unpublishPack: vi.fn().mockResolvedValue({ ok: true, inCatalog: false }),
    republishPack: vi.fn().mockResolvedValue({ ok: true, inCatalog: true }),
    acquireEditLock: vi.fn().mockResolvedValue({ ok: true }),
    routerPush: vi.fn(),
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: routerPush, replace: vi.fn() }),
    useRoute: () => ({
      params: { id: 'p1' },
      query: {},
      path: '/content/packs/p1',
    }),
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
      listCollection,
      loadLivePack,
      unpublishPack,
      republishPack,
      acquireEditLock,
      addToCollection: vi.fn(),
      removeFromCollection: vi.fn(),
    })),
  };
});

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': {
    template: '<div class="q-item-stub" v-bind="$attrs" @click="$attrs.onClick"><slot /></div>',
  },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label'],
    template: '<button type="button" v-bind="$attrs">{{ label }}<slot /></button>',
  },
  'q-banner': true,
  'q-badge': { template: '<span class="q-badge-stub"><slot /></span>' },
  'q-chip': { template: '<span><slot /></span>' },
  'q-dialog': {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="dialog"><slot /></div>',
  },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-icon': true,
};

const softPack: ContentPackSummary = {
  id: 'p-soft',
  title: 'Soft Pack',
  description: '',
  blocked: false,
  hasLive: true,
  inCatalog: false,
  createdBy: 'creator-1',
};

describe('soft-unpublish UI (SC-PACK-120…125)', () => {
  beforeEach(() => {
    contentState.error = null;
    contentState.loading = false;
    contentState.catalog = [
      {
        id: 'p1',
        title: 'In Catalog',
        description: '',
        blocked: false,
        hasLive: true,
        inCatalog: true,
        createdBy: 'u1',
      },
      { ...softPack },
    ];
    contentState.collection = [{ ...softPack }];
    contentState.pack = {
      id: 'p1',
      title: 'Live',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
      createdBy: 'creator-1',
      inCollection: true,
    };
    authState.user = { id: 'creator-1', anonymous: false };
    authState.isStaff = false;
    authState.needsEmailVerification = false;
    listCatalog.mockClear();
    listCollection.mockClear();
    loadLivePack.mockClear();
    unpublishPack.mockClear();
    republishPack.mockClear();
    routerPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-121: soft-unpublished collection row is gray, labeled, non-navigating; trash remains', async () => {
    const wrapper = shallowMount(ContentCollectionPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('content.unpublishedByStaff');
    expect(wrapper.find('.text-grey-6').exists()).toBe(true);
    expect(
      wrapper
        .findAll('button')
        .some((b) => b.attributes('aria-label') === 'content.removeFromCollection'),
    ).toBe(true);
    expect(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'content.edit'),
    ).toBe(false);

    await wrapper.find('.q-item-stub').trigger('click');
    await flushPromises();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('SC-PACK-125: creator after publish has no unpublish/republish; gray row like non-staff', async () => {
    const coll = shallowMount(ContentCollectionPage, { global: { stubs } });
    await flushPromises();
    expect(coll.text()).toContain('content.unpublishedByStaff');
    expect(coll.findAll('button').some((b) => b.text().includes('content.unpublish'))).toBe(false);
    expect(coll.findAll('button').some((b) => b.text().includes('content.republish'))).toBe(false);

    contentState.pack = { ...softPack, inCollection: true };
    const live = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    expect(live.findAll('button').some((b) => b.text().includes('content.unpublish'))).toBe(false);
    expect(live.findAll('button').some((b) => b.text().includes('content.republish'))).toBe(false);
    expect(live.findAll('button').some((b) => b.text().includes('content.edit'))).toBe(false);
  });

  it('SC-PACK-120 UI: staff sees unpublish in catalog and republish for soft-unpublished', async () => {
    authState.isStaff = true;
    const wrapper = shallowMount(ContentCatalogPage, { global: { stubs } });
    await flushPromises();

    expect(wrapper.findAll('button').some((b) => b.text().includes('content.unpublish'))).toBe(
      true,
    );
    expect(wrapper.findAll('button').some((b) => b.text().includes('content.republish'))).toBe(
      true,
    );
    expect(wrapper.text()).toContain('content.unpublishedByStaff');
  });

  it('SC-PACK-120 UI: staff sees unpublish/republish inside pack', async () => {
    authState.isStaff = true;
    contentState.pack = {
      id: 'p1',
      title: 'Live',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
      createdBy: 'u1',
      inCollection: false,
    };
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.findAll('button').some((b) => b.text().includes('content.unpublish'))).toBe(
      true,
    );

    contentState.pack = { ...contentState.pack, inCatalog: false };
    const soft = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    expect(soft.findAll('button').some((b) => b.text().includes('content.republish'))).toBe(true);
    expect(soft.findAll('button').some((b) => b.text().includes('content.edit'))).toBe(true);
  });
});
