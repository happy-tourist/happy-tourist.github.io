import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentCatalogPage from '@/pages/ContentCatalogPage.vue';

const { contentState, authState, listCatalog } = vi.hoisted(() => {
  const contentState = {
    error: null as string | null,
    loading: false,
    catalog: [] as { id: string; title: string; description: string; blocked: boolean }[],
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
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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
      starPack: vi.fn(),
      unstarPack: vi.fn(),
      unpublishPack: vi.fn(),
      republishPack: vi.fn(),
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
    props: ['label'],
    template: '<button type="button" v-bind="$attrs">{{ label }}<slot /></button>',
  },
  'q-banner': true,
  'q-badge': true,
  'q-dialog': { template: '<div><slot /></div>' },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-icon': true,
};

describe('catalog ACL (SC-PACK-166)', () => {
  beforeEach(() => {
    contentState.error = null;
    contentState.catalog = [];
    authState.isStaff = false;
    authState.user = { id: 'u1', anonymous: false };
    listCatalog.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-166: non-staff does not see my-moderation nav; filters available', async () => {
    const wrapper = shallowMount(ContentCatalogPage, { global: { stubs } });
    await flushPromises();
    expect(
      wrapper.findAll('button').some((b) => b.text().includes('content.myModerationNav')),
    ).toBe(false);
    expect(wrapper.find('[data-test-id="packs-filters"]').exists()).toBe(true);
  });

  it('SC-PACK-166: staff does not see my-moderation; sees staff queue', async () => {
    authState.isStaff = true;
    const wrapper = shallowMount(ContentCatalogPage, { global: { stubs } });
    await flushPromises();
    expect(
      wrapper.findAll('button').some((b) => b.text().includes('content.myModerationNav')),
    ).toBe(false);
    expect(wrapper.findAll('button').some((b) => b.text().includes('content.staffNav'))).toBe(true);
  });
});
