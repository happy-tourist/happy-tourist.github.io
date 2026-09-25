import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPackPage from '@/pages/ContentPackPage.vue';
import type { ContentPackSummary, PackContent } from '@/stores/content';

const { contentState, authState, loadLivePack, acquireEditLock, starPack, unstarPack, routerPush } =
  vi.hoisted(() => {
    const pack: ContentPackSummary = {
      id: 'p1',
      title: 'Live',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
      createdBy: 'u1',
      inCollection: false,
      isFavorite: false,
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
      pack,
      liveContent,
    };
    const authState = {
      user: { id: 'u1', anonymous: false } as { id: string; anonymous: boolean } | null,
      needsEmailVerification: false,
      isStaff: false,
    };
    return {
      contentState,
      authState,
      loadLivePack: vi.fn().mockResolvedValue(undefined),
      acquireEditLock: vi.fn().mockResolvedValue({ ok: true }),
      starPack: vi.fn().mockResolvedValue({ ok: true, isFavorite: true }),
      unstarPack: vi.fn().mockResolvedValue({ ok: true, isFavorite: false }),
      routerPush: vi.fn(),
    };
  });

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: routerPush, replace: vi.fn() }),
    useRoute: () => ({ params: { id: 'p1' }, query: {}, path: '/content/packs/p1' }),
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
      loadLivePack,
      acquireEditLock,
      starPack,
      unstarPack,
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
  'q-chip': { template: '<span><slot /></span>' },
  'q-dialog': { template: '<div><slot /></div>' },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
};

describe('live pack ACL (SC-PACK-53/106/108/112/154/164/165)', () => {
  beforeEach(() => {
    contentState.error = null;
    contentState.pack = {
      id: 'p1',
      title: 'Live',
      description: '',
      blocked: false,
      hasLive: true,
      inCatalog: true,
      createdBy: 'u1',
      inCollection: false,
      isFavorite: false,
    };
    authState.isStaff = false;
    authState.user = { id: 'u1', anonymous: false };
    authState.needsEmailVerification = false;
    loadLivePack.mockClear();
    acquireEditLock.mockClear();
    starPack.mockClear();
    unstarPack.mockClear();
    routerPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-108/164: verified non-creator sees add-task-set, not Edit/collect', async () => {
    // Not pack creator — Edit is for creator / task-set-author (SC-PACK-156…158).
    contentState.pack = { ...contentState.pack, createdBy: 'owner-other' };
    authState.user = { id: 'u1', anonymous: false };
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();

    const labels = wrapper.findAll('button').map((b) => b.text());
    expect(labels.some((l) => l.includes('content.edit'))).toBe(false);
    expect(labels.some((l) => l.includes('content.addTaskSetNav'))).toBe(true);
    expect(labels.some((l) => l.includes('content.addToCollection'))).toBe(false);
    expect(labels.some((l) => l.includes('content.inCollection'))).toBe(false);
    expect(wrapper.text()).toContain('content.taskSets');
  });

  it('SC-PACK-165: guest does not see add-task-set or star', async () => {
    authState.user = { id: 'g1', anonymous: true };
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    const labels = wrapper.findAll('button').map((b) => b.text());
    expect(labels.some((l) => l.includes('content.addTaskSetNav'))).toBe(false);
    expect(wrapper.find('[data-test-id="pack-detail-star"]').exists()).toBe(false);
  });

  it('SC-PACK-154: detail star toggles favorite', async () => {
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();
    const star = wrapper.find('[data-test-id="pack-detail-star"]');
    expect(star.exists()).toBe(true);
    await star.trigger('click');
    await flushPromises();
    expect(starPack).toHaveBeenCalledWith('p1');
  });

  it('SC-PACK-112: staff Edit acquires lock then navigates', async () => {
    authState.isStaff = true;
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();

    const editBtn = wrapper.findAll('button').find((b) => b.text().includes('content.edit'));
    expect(editBtn).toBeTruthy();
    expect(wrapper.findAll('button').some((b) => b.text().includes('content.addTaskSetNav'))).toBe(
      false,
    );
    await editBtn!.trigger('click');
    await flushPromises();
    expect(acquireEditLock).toHaveBeenCalledWith('p1');
    expect(routerPush).toHaveBeenCalledWith({ name: 'content-pack-edit', params: { id: 'p1' } });
  });
});
