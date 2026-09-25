import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentCatalogPage from '@/pages/ContentCatalogPage.vue';
import type { ContentPackSummary } from '@/stores/content';

const { contentState, authState, listCatalog, starPack, unstarPack, routerPush } = vi.hoisted(
  () => {
    const contentState = {
      error: null as string | null,
      loading: false,
      catalog: [] as ContentPackSummary[],
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
      starPack: vi.fn().mockResolvedValue({ ok: true, isFavorite: true }),
      unstarPack: vi.fn().mockResolvedValue({ ok: true, isFavorite: false }),
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
    useRoute: () => ({ params: {}, query: {}, path: '/content/packs' }),
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
      starPack,
      unstarPack,
      unpublishPack: vi.fn(),
      republishPack: vi.fn(),
    })),
  };
});

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': {
    template: '<div v-bind="$attrs" @click="$attrs.onClick?.($event)"><slot /></div>',
  },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'disable', 'icon'],
    template:
      '<button type="button" v-bind="$attrs" :disabled="disable" @click="$attrs.onClick?.($event)">{{ label }}<slot /></button>',
  },
  'q-banner': true,
  'q-badge': { template: '<span><slot /></span>' },
  'q-dialog': { template: '<div><slot /></div>' },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-icon': true,
};

function sampleCatalog(): ContentPackSummary[] {
  return [
    {
      id: 'pub1',
      title: 'Public',
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
      title: 'My draft',
      description: '',
      blocked: false,
      hasLive: false,
      inCatalog: false,
      createdBy: 'u1',
      moderationStatus: 'draft',
      isMine: true,
      isContributor: false,
      isFavorite: false,
    },
    {
      id: 'pend1',
      title: 'Pending pack',
      description: '',
      blocked: false,
      hasLive: false,
      inCatalog: false,
      createdBy: 'u1',
      moderationStatus: 'pending',
      isMine: true,
      isContributor: false,
      isFavorite: false,
    },
    {
      id: 'contrib1',
      title: 'Contributed',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
      createdBy: 'other',
      moderationStatus: 'in_catalog',
      isMine: false,
      isContributor: true,
      isFavorite: true,
    },
  ];
}

describe('unified packs list (SC-PACK-148…155, 166)', () => {
  let wrapper: ReturnType<typeof shallowMount> | null = null;

  const getWrapper = () =>
    shallowMount(ContentCatalogPage, {
      global: { stubs },
    });

  beforeEach(() => {
    contentState.error = null;
    contentState.catalog = sampleCatalog();
    authState.isStaff = false;
    authState.user = { id: 'u1', anonymous: false };
    authState.needsEmailVerification = false;
    listCatalog.mockClear();
    starPack.mockClear();
    unstarPack.mockClear();
    routerPush.mockClear();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.clearAllMocks();
  });

  it('SC-PACK-166: non-staff does not see my-moderation nav', async () => {
    wrapper = getWrapper();
    await flushPromises();
    expect(
      wrapper.findAll('button').some((b) => b.text().includes('content.myModerationNav')),
    ).toBe(false);
    expect(wrapper.find('[data-test-id="packs-filters"]').exists()).toBe(true);
  });

  it('SC-PACK-166: staff sees staff queue, not my-moderation', async () => {
    authState.isStaff = true;
    wrapper = getWrapper();
    await flushPromises();
    expect(
      wrapper.findAll('button').some((b) => b.text().includes('content.myModerationNav')),
    ).toBe(false);
    expect(wrapper.findAll('button').some((b) => b.text().includes('content.staffNav'))).toBe(true);
  });

  it('SC-PACK-148: in-catalog packs shown with status on all filter', async () => {
    wrapper = getWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test-id="packs-row-pub1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="packs-status-pub1"]').text()).toContain(
      'content.statusInCatalog',
    );
  });

  it('SC-PACK-149/150: draft and pending statuses on list', async () => {
    wrapper = getWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test-id="packs-status-draft1"]').text()).toContain(
      'content.statusDraft',
    );
    expect(wrapper.find('[data-test-id="packs-status-pend1"]').text()).toContain(
      'content.statuses.pending',
    );
  });

  it('SC-PACK-151: moderation filter shows only own open items', async () => {
    wrapper = getWrapper();
    await flushPromises();
    await wrapper.find('[data-test-id="packs-filter-moderation"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test-id="packs-row-pend1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="packs-row-pub1"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="packs-row-draft1"]').exists()).toBe(false);
  });

  it('SC-PACK-152: mine filter includes creator and contributor', async () => {
    wrapper = getWrapper();
    await flushPromises();
    await wrapper.find('[data-test-id="packs-filter-mine"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test-id="packs-row-draft1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="packs-row-contrib1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="packs-row-pub1"]').exists()).toBe(false);
  });

  it('SC-PACK-153: guest cannot use favorites; no star affordance', async () => {
    authState.user = { id: 'g1', anonymous: true };
    wrapper = getWrapper();
    await flushPromises();
    const favBtn = wrapper.find('[data-test-id="packs-filter-favorites"]');
    expect(favBtn.attributes('disabled')).toBeDefined();
    // Identity filter click must not grant a personal favorites set
    await favBtn.trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test-id="packs-row-pub1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="packs-star-pub1"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="packs-star-contrib1"]').exists()).toBe(false);
  });

  it('SC-PACK-154: star and unstar call store favorites API', async () => {
    wrapper = getWrapper();
    await flushPromises();
    await wrapper.find('[data-test-id="packs-star-pub1"]').trigger('click');
    await flushPromises();
    expect(starPack).toHaveBeenCalledWith('pub1');

    contentState.catalog = sampleCatalog().map((p) =>
      p.id === 'contrib1' ? p : p.id === 'pub1' ? { ...p, isFavorite: true } : p,
    );
    wrapper.unmount();
    wrapper = getWrapper();
    await flushPromises();
    await wrapper.find('[data-test-id="packs-star-pub1"]').trigger('click');
    await flushPromises();
    expect(unstarPack).toHaveBeenCalledWith('pub1');
  });
});
