import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ContentPackPage from '@/pages/ContentPackPage.vue';
import type { ContentPackSummary, PackContent } from '@/stores/content';

const { contentState, authState, loadLivePack, acquireEditLock, routerPush } = vi.hoisted(() => {
  const pack: ContentPackSummary = {
    id: 'p1',
    title: 'Live',
    description: '',
    blocked: false,
    hasLive: true,
    createdBy: 'u1',
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
      addToCollection: vi.fn(),
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

describe('live pack ACL (SC-PACK-53/106/112)', () => {
  beforeEach(() => {
    contentState.error = null;
    contentState.pack = {
      id: 'p1',
      title: 'Live',
      description: '',
      blocked: false,
      hasLive: true,
      createdBy: 'u1',
      inCollection: true,
    };
    authState.isStaff = false;
    authState.user = { id: 'u1', anonymous: false };
    authState.needsEmailVerification = false;
    loadLivePack.mockClear();
    acquireEditLock.mockClear();
    routerPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('SC-PACK-53/106/117: non-staff sees add-task-set by tasks section, not Edit', async () => {
    const wrapper = shallowMount(ContentPackPage, { global: { stubs } });
    await flushPromises();

    const labels = wrapper.findAll('button').map((b) => b.text());
    expect(labels.some((l) => l.includes('content.edit'))).toBe(false);
    expect(labels.some((l) => l.includes('content.addTaskSetNav'))).toBe(true);
    // Beside «Задания» heading, not only in page chrome.
    expect(wrapper.text()).toContain('content.taskSets');
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
