import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentCollectionPage from '@/pages/ContentCollectionPage.vue';
import type { ContentPackSummary } from '@/stores/content';

const { contentState, authState, listCollection, unpublishPack, republishPack } = vi.hoisted(() => {
  const contentState = {
    error: null as string | null,
    loading: false,
    collection: [] as ContentPackSummary[],
  };
  const authState = {
    user: { id: 'u1', anonymous: false } as { id: string; anonymous: boolean } | null,
    needsEmailVerification: false,
    isStaff: true,
  };
  return {
    contentState,
    authState,
    listCollection: vi.fn().mockResolvedValue(undefined),
    unpublishPack: vi.fn().mockResolvedValue({ ok: true }),
    republishPack: vi.fn().mockResolvedValue({ ok: true }),
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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
      unpublishPack,
      republishPack,
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

const staffUnpublished: ContentPackSummary = {
  id: 'p2',
  title: 'Unpublished',
  description: '',
  blocked: false,
  hasLive: false,
  unpublishedByStaff: true,
  hasLastLive: true,
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

describe('collection staff unpublish/republish (SC-PACK-92…94)', () => {
  beforeEach(() => {
    contentState.error = null;
    contentState.loading = false;
    contentState.collection = [structuredClone(livePack)];
    authState.user = { id: 'u1', anonymous: false };
    authState.needsEmailVerification = false;
    authState.isStaff = true;
    listCollection.mockClear();
    unpublishPack.mockClear();
    republishPack.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-92: staff sees unpublish next to Edit on live pack', async () => {
    const wrapper = shallowMount(ContentCollectionPage, { global: { stubs } });
    await flushPromises();

    expect(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'content.edit'),
    ).toBe(true);
    expect(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'content.unpublish'),
    ).toBe(true);
  });

  it('SC-PACK-93: non-staff hides Edit after staff-unpublish; remove stays', async () => {
    authState.isStaff = false;
    contentState.collection = [structuredClone(staffUnpublished)];
    const wrapper = shallowMount(ContentCollectionPage, { global: { stubs } });
    await flushPromises();

    expect(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'content.edit'),
    ).toBe(false);
    expect(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'content.unpublish'),
    ).toBe(false);
    expect(
      wrapper
        .findAll('button')
        .some((b) => b.attributes('aria-label') === 'content.removeFromCollection'),
    ).toBe(true);
  });

  it('SC-PACK-94: staff sees republish when unpublishedByStaff', async () => {
    contentState.collection = [structuredClone(staffUnpublished)];
    const wrapper = shallowMount(ContentCollectionPage, { global: { stubs } });
    await flushPromises();

    expect(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'content.republish'),
    ).toBe(true);
    expect(
      wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'content.edit'),
    ).toBe(true);

    const republishBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('aria-label') === 'content.republish');
    await republishBtn!.trigger('click');
    await flushPromises();
    const confirm = wrapper
      .findAll('button')
      .filter((b) => b.text().includes('content.republish'))
      .at(-1);
    await confirm!.trigger('click');
    await flushPromises();
    expect(republishPack).toHaveBeenCalledWith('p2');
  });

  it('SC-PACK-93: staff-unpublished row shows unpublished badge, not draftOnly', async () => {
    contentState.collection = [structuredClone(staffUnpublished)];
    const wrapper = shallowMount(ContentCollectionPage, { global: { stubs } });
    await flushPromises();
    expect(wrapper.text()).toContain('content.unpublishedByStaff');
    expect(wrapper.text()).not.toContain('content.draftOnly');
  });
});
