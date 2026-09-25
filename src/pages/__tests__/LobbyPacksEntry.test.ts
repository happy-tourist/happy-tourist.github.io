import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LobbyPage from '@/pages/LobbyPage.vue';

const { authState, gameState } = vi.hoisted(() => {
  const authState = {
    displayName: 'Player',
    user: { id: 'u1', anonymous: false } as { id: string; anonymous: boolean } | null,
  };
  const gameState = {
    error: null as string | null,
    listing: false,
    rooms: [] as unknown[],
    subscribeLobby: vi.fn().mockResolvedValue(undefined),
    unsubscribeLobby: vi.fn().mockResolvedValue(undefined),
  };
  return { authState, gameState };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useRoute: () => ({ params: {}, query: {}, path: '/lobby', name: 'lobby' }),
  };
});

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    ...authState,
    logout: vi.fn(),
  })),
}));

vi.mock('@/stores/game', () => ({
  useGameStore: vi.fn(() => gameState),
}));

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': { template: '<div><slot /></div>' },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-item-label': { template: '<div><slot /></div>' },
  'q-btn': {
    props: ['label', 'to'],
    template: '<a v-bind="$attrs" :data-to="JSON.stringify(to)">{{ label }}<slot /></a>',
  },
  'q-banner': true,
  'q-dialog': { template: '<div><slot /></div>' },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-option-group': true,
  'q-select': true,
  'q-space': true,
  MapGridPreview: true,
};

describe('lobby packs entry / header chrome (SC-PACK-41 / SC-BRAND-15)', () => {
  let wrapper: ReturnType<typeof shallowMount> | null = null;

  const getWrapper = () => shallowMount(LobbyPage, { global: { stubs } });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.clearAllMocks();
  });

  it('SC-BRAND-15: Lobby has no duplicate Packs/Maps/Support section toolbar', async () => {
    wrapper = getWrapper();
    await flushPromises();
    const links = wrapper.findAll('a');
    const sectionLabels = ['content.nav', 'maps.nav', 'support.nav'];
    for (const label of sectionLabels) {
      expect(links.some((a) => a.text().includes(label))).toBe(false);
    }
  });

  it('SC-PACK-41: create-game affordance remains; packs entry is via App header (not collection)', async () => {
    wrapper = getWrapper();
    await flushPromises();
    // Lobby still hosts create game; unified packs list route is content-catalog (header).
    expect(wrapper.text()).toContain('lobby.create');
    expect(wrapper.html()).not.toContain('content-collection');
  });
});
