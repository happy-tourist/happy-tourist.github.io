import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/App.vue';

const {
  authState,
  gameState,
  themeState,
  contentState,
  mapsState,
  routeState,
  screenLtMd,
  logout,
  leaveGame,
  routerPush,
  routerReplace,
} = vi.hoisted(() => {
  const authState = {
    ready: true,
    isAuthenticated: true,
    isStaff: false,
    needsEmailVerification: false,
    user: { id: 'u1', anonymous: false } as {
      id: string;
      anonymous: boolean;
    } | null,
  };
  const gameState = {
    phase: 'waiting' as string | null,
    status: 'waiting' as string,
    currentTurnSessionId: null as string | null,
    isMyTurn: false,
    mySeat: null as unknown,
    isSeated: false,
    isPlaying: false,
    isMySeatFinished: false,
    isMySeatTimeExpired: false,
    consentedLeaving: false,
    leaveGame: vi.fn().mockResolvedValue(undefined),
  };
  const themeState = {
    error: null as string | null,
    syncFromAuthUser: vi.fn(),
    toggle: vi.fn(),
  };
  const contentState = {
    pack: { id: 'p1', title: 'Пак Альфа' } as { id: string; title: string } | null,
    draft: { title: 'Пак Альфа' } as { title: string } | null,
  };
  const mapsState = {
    map: null as {
      id: string;
      authorDisplayName?: string;
      players: number;
      touristsPerPlayer: number;
    } | null,
    list: [] as {
      id: string;
      authorDisplayName?: string;
      players: number;
      touristsPerPlayer: number;
    }[],
    draft: null as unknown,
    liveContent: null as unknown,
  };
  const routeState = {
    name: 'lobby' as string,
    params: {} as Record<string, string>,
    query: {},
    path: '/lobby',
  };
  const screenLtMd = { value: false };
  return {
    authState,
    gameState,
    themeState,
    contentState,
    mapsState,
    routeState,
    screenLtMd,
    logout: vi.fn().mockResolvedValue(undefined),
    leaveGame: gameState.leaveGame,
    routerPush: vi.fn(),
    routerReplace: vi.fn(),
  };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: routerPush, replace: routerReplace }),
    useRoute: () => routeState,
  };
});

vi.mock('quasar', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useQuasar: () => ({
      dark: { isActive: false },
      screen: { lt: { md: screenLtMd.value, sm: false } },
    }),
  };
});

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    ...authState,
    logout,
  })),
}));

vi.mock('@/stores/game', () => ({
  useGameStore: vi.fn(() => gameState),
}));

vi.mock('@/stores/theme', () => ({
  useThemeStore: vi.fn(() => themeState),
}));

vi.mock('@/stores/content', () => ({
  useContentStore: vi.fn(() => contentState),
}));

vi.mock('@/stores/maps', () => ({
  useMapsStore: vi.fn(() => mapsState),
}));

const stubs = {
  'q-layout': { template: '<div><slot /></div>' },
  'q-header': { template: '<div data-test-id="q-header"><slot /></div>' },
  'q-toolbar': { template: '<div data-test-id="q-toolbar"><slot /></div>' },
  'q-page-container': { template: '<div><slot /></div>' },
  'q-space': { template: '<div />' },
  'q-btn': {
    props: ['label', 'to', 'icon', 'ariaLabel'],
    template:
      '<button v-bind="$attrs" :data-to="to ? JSON.stringify(to) : undefined" :data-icon="icon">{{ label }}<slot /></button>',
  },
  'q-menu': { template: '<div data-test-id="header-burger-menu"><slot /></div>' },
  'q-list': { template: '<div><slot /></div>' },
  'q-item': {
    props: ['to'],
    template: '<div v-bind="$attrs" :data-to="to ? JSON.stringify(to) : undefined"><slot /></div>',
  },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-breadcrumbs': { template: '<nav data-test-id="breadcrumbs-nav"><slot /></nav>' },
  'q-breadcrumbs-el': {
    props: ['label', 'to'],
    template:
      '<span class="crumb" :data-to="to ? JSON.stringify(to) : undefined">{{ label }}</span>',
  },
  'q-dialog': { template: '<div><slot /></div>' },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-banner': true,
  'router-view': { template: '<div />' },
};

function mountApp() {
  return shallowMount(App, {
    global: {
      stubs,
      mocks: {
        $q: { dark: { isActive: false }, screen: { lt: { md: screenLtMd.value } } },
      },
    },
  });
}

describe('App header chrome (SC-BRAND / SC-LEAVE / crumbs)', () => {
  let wrapper: ReturnType<typeof mountApp> | null = null;

  beforeEach(() => {
    authState.ready = true;
    authState.isAuthenticated = true;
    authState.isStaff = false;
    authState.needsEmailVerification = false;
    authState.user = { id: 'u1', anonymous: false };
    routeState.name = 'lobby';
    routeState.params = {};
    routeState.path = '/lobby';
    screenLtMd.value = false;
    gameState.isSeated = false;
    gameState.isPlaying = false;
    contentState.pack = { id: 'p1', title: 'Пак Альфа' };
    mapsState.map = null;
    mapsState.list = [];
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.clearAllMocks();
  });

  it('SC-BRAND-11: Packs/Maps/Support right of logo on Lobby', async () => {
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="header-sections"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="header-packs"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="header-maps"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="header-support"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="header-moderation"]').exists()).toBe(false);
  });

  it('SC-BRAND-12: staff sees Модерация in header', async () => {
    authState.isStaff = true;
    wrapper = mountApp();
    await flushPromises();
    const mod = wrapper.find('[data-test-id="header-moderation"]');
    expect(mod.exists()).toBe(true);
    expect(mod.attributes('data-to') ?? '').toContain('content-staff');
  });

  it('SC-BRAND-13: logout rightmost vs account and theme on Lobby', async () => {
    wrapper = mountApp();
    await flushPromises();
    const toolbar = wrapper.find('[data-test-id="q-toolbar"]');
    const html = toolbar.html();
    const accountIdx = html.indexOf('header-account');
    const themeIdx = html.indexOf('header-theme');
    const logoutIdx = html.indexOf('header-logout');
    expect(accountIdx).toBeGreaterThan(-1);
    expect(themeIdx).toBeGreaterThan(accountIdx);
    expect(logoutIdx).toBeGreaterThan(themeIdx);
  });

  it('SC-BRAND-14: burger exposes sections on narrow viewport', async () => {
    screenLtMd.value = true;
    authState.isStaff = true;
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="header-sections"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-burger"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="header-burger-menu"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('header.packs');
    expect(wrapper.text()).toContain('header.maps');
    expect(wrapper.text()).toContain('header.support');
    expect(wrapper.text()).toContain('header.moderation');
  });

  it('SC-BRAND-16 / SC-PACK-180: breadcrumbs under header on pack route', async () => {
    routeState.name = 'content-pack';
    routeState.params = { id: 'p1' };
    routeState.path = '/content/packs/p1';
    wrapper = mountApp();
    await flushPromises();
    const crumbs = wrapper.find('[data-test-id="app-breadcrumbs"]');
    expect(crumbs.exists()).toBe(true);
    expect(crumbs.text()).toContain('header.lobby');
    expect(crumbs.text()).toContain('header.packs');
    expect(crumbs.text()).toContain('Пак Альфа');
  });

  it('SC-BRAND-17 / SC-PACK-193 / SC-MAP-52: breadcrumbs outside elevated header bar', async () => {
    routeState.name = 'content-pack';
    routeState.params = { id: 'p1' };
    routeState.path = '/content/packs/p1';
    wrapper = mountApp();
    await flushPromises();
    const header = wrapper.find('[data-test-id="q-header"]');
    const crumbs = wrapper.find('[data-test-id="app-breadcrumbs"]');
    expect(crumbs.exists()).toBe(true);
    expect(header.find('[data-test-id="app-breadcrumbs"]').exists()).toBe(false);
    expect(header.html()).not.toContain('app-breadcrumbs');

    wrapper.unmount();
    routeState.name = 'content-maps';
    routeState.params = {};
    routeState.path = '/content/maps';
    wrapper = mountApp();
    await flushPromises();
    expect(
      wrapper.find('[data-test-id="q-header"]').find('[data-test-id="app-breadcrumbs"]').exists(),
    ).toBe(false);
    expect(wrapper.find('[data-test-id="app-breadcrumbs"]').exists()).toBe(true);
  });

  it('SC-MAP-44: breadcrumbs on Maps list and editor', async () => {
    routeState.name = 'content-maps';
    routeState.path = '/content/maps';
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="app-breadcrumbs"]').text()).toContain('header.maps');
    expect(wrapper.find('[data-test-id="app-breadcrumbs"]').text()).toContain('header.lobby');

    wrapper.unmount();
    mapsState.map = {
      id: 'm1',
      authorDisplayName: 'Картограф',
      players: 2,
      touristsPerPlayer: 3,
    };
    mapsState.list = [];
    routeState.name = 'content-map-edit';
    routeState.params = { id: 'm1' };
    wrapper = mountApp();
    await flushPromises();
    const crumbs = wrapper.find('[data-test-id="app-breadcrumbs"]').text();
    expect(crumbs).toContain('header.maps');
    expect(crumbs).toContain('Картограф');
  });

  it('SC-LEAVE-09/10/11/12: Game leave right; logo leave; no logout; no sections', async () => {
    routeState.name = 'game';
    routeState.params = { roomId: 'r1' };
    routeState.path = '/game/r1';
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="header-sections"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-moderation"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-logout"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-game-leave"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="app-breadcrumbs"]').exists()).toBe(false);

    await wrapper.find('[data-test-id="header-game-leave"]').trigger('click');
    expect(leaveGame).toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith({ name: 'lobby' });

    leaveGame.mockClear();
    routerPush.mockClear();
    await wrapper.find('[data-test-id="brand-logo"]').trigger('click');
    expect(leaveGame).toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith({ name: 'lobby' });
  });

  it('SC-LEAVE-08: no Game leave control on Lobby; session logout may appear', async () => {
    routeState.name = 'lobby';
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="header-game-leave"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-logout"]').exists()).toBe(true);
  });

  it('SC-PACK-183: header Модерация opens staff queue', async () => {
    authState.isStaff = true;
    wrapper = mountApp();
    await flushPromises();
    const mod = wrapper.find('[data-test-id="header-moderation"]');
    expect(mod.attributes('data-to') ?? '').toContain('content-staff');
  });
});
