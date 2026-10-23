import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/App.vue';

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const appVueSrc = readFileSync(join(srcRoot, 'App.vue'), 'utf8');
const appScss = readFileSync(join(srcRoot, 'css/app.scss'), 'utf8');
const packsAssetsDir = join(srcRoot, 'assets/packs');
const packBgAssets = [
  'pack-bg-desktop-light.jpg',
  'pack-bg-desktop-dark.jpg',
  'pack-bg-mobile-light.jpg',
  'pack-bg-mobile-dark.jpg',
] as const;

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
    peekStatusFlash: null as {
      kind: 'correct' | 'wrong' | 'timeout';
      until: number;
    } | null,
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
    staffPreview: null as {
      pack?: { title?: string };
      map?: { authorDisplayName?: string };
    } | null,
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
    fullPath: '/lobby',
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
  'q-layout': {
    inheritAttrs: false,
    template: '<div data-test-id="q-layout" v-bind="$attrs"><slot /></div>',
  },
  'q-header': { template: '<div data-test-id="q-header"><slot /></div>' },
  'q-toolbar': { template: '<div data-test-id="q-toolbar"><slot /></div>' },
  'q-page-container': {
    inheritAttrs: false,
    template: '<div data-test-id="q-page-container" v-bind="$attrs"><slot /></div>',
  },
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
      '<span class="crumb" v-bind="$attrs" :data-to="to ? JSON.stringify(to) : undefined" @click="$emit(\'click\', $event)">{{ label }}</span>',
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
    routeState.fullPath = '/lobby';
    screenLtMd.value = false;
    gameState.isSeated = false;
    gameState.isPlaying = false;
    gameState.phase = 'waiting';
    gameState.status = 'waiting';
    gameState.currentTurnSessionId = null;
    gameState.isMyTurn = false;
    gameState.mySeat = null;
    gameState.peekStatusFlash = null;
    contentState.pack = { id: 'p1', title: 'Пак Альфа' };
    contentState.staffPreview = null;
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

  it('SC-BRAND-13: logout rightmost vs account and theme on Lobby (wide)', async () => {
    screenLtMd.value = false;
    authState.user = { id: 'u1', anonymous: false };
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
    expect(wrapper.find('[data-test-id="header-login"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-burger"]').exists()).toBe(false);
  });

  it('SC-BRAND-22: guest sees login icon instead of logout (wide)', async () => {
    screenLtMd.value = false;
    authState.user = { id: 'guest1', anonymous: true };
    routeState.name = 'lobby';
    routeState.path = '/lobby';
    routeState.fullPath = '/lobby';
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="header-account"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-logout"]').exists()).toBe(false);
    const loginBtn = wrapper.find('[data-test-id="header-login"]');
    expect(loginBtn.exists()).toBe(true);
    expect(loginBtn.attributes('data-icon')).toBe('login');
    const toolbar = wrapper.find('[data-test-id="q-toolbar"]');
    const html = toolbar.html();
    const themeIdx = html.indexOf('header-theme');
    const loginIdx = html.indexOf('header-login');
    expect(themeIdx).toBeGreaterThan(-1);
    expect(loginIdx).toBeGreaterThan(themeIdx);

    await loginBtn.trigger('click');
    expect(logout).not.toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith({
      name: 'login',
      query: { redirect: '/lobby' },
    });
  });

  it('SC-BRAND-22: auth screens omit logout and guest login', async () => {
    screenLtMd.value = false;
    authState.user = { id: 'guest1', anonymous: true };
    routeState.name = 'login';
    routeState.path = '/login';
    routeState.fullPath = '/login';
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="header-logout"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-login"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-theme"]').exists()).toBe(true);

    wrapper.unmount();
    authState.user = { id: 'u1', anonymous: false };
    routeState.name = 'forgot-password';
    routeState.path = '/forgot-password';
    routeState.fullPath = '/forgot-password';
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="header-logout"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-login"]').exists()).toBe(false);
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

  it('SC-BRAND-19: narrow burger is rightmost and holds Acc/Theme/Logout', async () => {
    screenLtMd.value = true;
    authState.user = { id: 'u1', anonymous: false };
    wrapper = mountApp();
    await flushPromises();
    const toolbar = wrapper.find('[data-test-id="q-toolbar"]');
    expect(wrapper.find('[data-test-id="header-account"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-theme"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-logout"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-login"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-burger"]').exists()).toBe(true);
    // Top-level toolbar header-* ids only (exclude menu internals header-burger-*).
    const toolbarIds = [...toolbar.html().matchAll(/data-test-id="(header-[^"]+)"/g)]
      .map((m) => m[1]!)
      .filter((id) => !id.startsWith('header-burger-'));
    expect(toolbarIds[toolbarIds.length - 1]).toBe('header-burger');
    expect(wrapper.find('[data-test-id="header-burger-account"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="header-burger-theme"]').exists()).toBe(true);
    const logoutItem = wrapper.find('[data-test-id="header-burger-logout"]');
    expect(logoutItem.exists()).toBe(true);
    expect(wrapper.find('[data-test-id="header-burger-login"]').exists()).toBe(false);
    const menuHtml = wrapper.find('[data-test-id="header-burger-menu"]').html();
    const accIdx = menuHtml.indexOf('header-burger-account');
    const themeIdx = menuHtml.indexOf('header-burger-theme');
    const logoutIdx = menuHtml.indexOf('header-burger-logout');
    expect(themeIdx).toBeGreaterThan(accIdx);
    expect(logoutIdx).toBeGreaterThan(themeIdx);
  });

  it('SC-BRAND-24: narrow burger holds login for guest', async () => {
    screenLtMd.value = true;
    authState.user = { id: 'guest1', anonymous: true };
    routeState.name = 'lobby';
    routeState.path = '/lobby';
    routeState.fullPath = '/lobby';
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="header-account"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-logout"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-login"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-burger"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="header-burger-account"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-burger-logout"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-burger-theme"]').exists()).toBe(true);
    const loginItem = wrapper.find('[data-test-id="header-burger-login"]');
    expect(loginItem.exists()).toBe(true);
    const menuHtml = wrapper.find('[data-test-id="header-burger-menu"]').html();
    const themeIdx = menuHtml.indexOf('header-burger-theme');
    const loginIdx = menuHtml.indexOf('header-burger-login');
    expect(loginIdx).toBeGreaterThan(themeIdx);

    await loginItem.trigger('click');
    expect(logout).not.toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith({
      name: 'login',
      query: { redirect: '/lobby' },
    });
  });

  it('SC-BRAND-19 / D21: Game and auth do not fold Acc/Theme into section burger', async () => {
    screenLtMd.value = true;
    routeState.name = 'game';
    routeState.params = { roomId: 'r1' };
    routeState.path = '/game/r1';
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="header-burger"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-theme"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="header-game-leave"]').exists()).toBe(true);

    wrapper.unmount();
    authState.isAuthenticated = false;
    authState.user = null;
    routeState.name = 'login';
    routeState.params = {};
    routeState.path = '/login';
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="header-burger"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-theme"]').exists()).toBe(true);
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

  it('SC-BRAND-17 / SC-PACK-193 / SC-MAP-52: breadcrumbs inside page-container offset zone', async () => {
    routeState.name = 'content-pack';
    routeState.params = { id: 'p1' };
    routeState.path = '/content/packs/p1';
    wrapper = mountApp();
    await flushPromises();
    const header = wrapper.find('[data-test-id="q-header"]');
    const pageContainer = wrapper.find('[data-test-id="q-page-container"]');
    const crumbs = wrapper.find('[data-test-id="app-breadcrumbs"]');
    expect(crumbs.exists()).toBe(true);
    expect(header.find('[data-test-id="app-breadcrumbs"]').exists()).toBe(false);
    expect(header.html()).not.toContain('app-breadcrumbs');
    expect(pageContainer.find('[data-test-id="app-breadcrumbs"]').exists()).toBe(true);

    wrapper.unmount();
    routeState.name = 'content-maps';
    routeState.params = {};
    routeState.path = '/content/maps';
    wrapper = mountApp();
    await flushPromises();
    expect(
      wrapper.find('[data-test-id="q-header"]').find('[data-test-id="app-breadcrumbs"]').exists(),
    ).toBe(false);
    expect(
      wrapper
        .find('[data-test-id="q-page-container"]')
        .find('[data-test-id="app-breadcrumbs"]')
        .exists(),
    ).toBe(true);
  });

  it('SC-BRAND-18: breadcrumbs on staff moderation queue and detail', async () => {
    authState.isStaff = true;
    routeState.name = 'content-staff';
    routeState.path = '/content/staff';
    wrapper = mountApp();
    await flushPromises();
    let crumbs = wrapper.find('[data-test-id="app-breadcrumbs"]');
    expect(crumbs.exists()).toBe(true);
    expect(crumbs.text()).toContain('header.lobby');
    expect(crumbs.text()).toContain('header.moderation');

    wrapper.unmount();
    contentState.staffPreview = { pack: { title: 'Заявка Пак' } };
    routeState.name = 'content-staff-request';
    routeState.params = { id: 'r1' };
    routeState.path = '/content/staff/r1';
    wrapper = mountApp();
    await flushPromises();
    crumbs = wrapper.find('[data-test-id="app-breadcrumbs"]');
    expect(crumbs.text()).toContain('header.lobby');
    expect(crumbs.text()).toContain('header.moderation');
    expect(crumbs.text()).toContain('Заявка Пак');

    wrapper.unmount();
    routeState.name = 'content-my-moderation';
    routeState.params = {};
    routeState.path = '/content/my-moderation';
    wrapper = mountApp();
    await flushPromises();
    crumbs = wrapper.find('[data-test-id="app-breadcrumbs"]');
    expect(crumbs.text()).toContain('header.lobby');
    expect(crumbs.text()).toContain('header.moderation');
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

  it.each([
    {
      name: 'content-pack',
      params: { id: 'p1' },
      path: '/content/packs/p1',
      staff: false,
    },
    {
      name: 'content-maps',
      params: {},
      path: '/content/maps',
      staff: false,
    },
    {
      name: 'content-staff',
      params: {},
      path: '/content/staff',
      staff: true,
    },
    {
      name: 'content-my-moderation',
      params: {},
      path: '/content/my-moderation',
      staff: false,
    },
  ] as const)(
    'SC-BRAND-20: Lobby crumb navigates to lobby from $name',
    async ({ name, params, path, staff }) => {
      authState.isStaff = staff;
      routeState.name = name;
      routeState.params = { ...params };
      routeState.path = path;
      wrapper = mountApp();
      await flushPromises();
      const lobbyCrumb = wrapper.find('[data-test-id="breadcrumb-lobby"]');
      expect(lobbyCrumb.exists()).toBe(true);
      expect(lobbyCrumb.attributes('data-to') ?? '').toContain('"name":"lobby"');
      await lobbyCrumb.trigger('click');
      expect(routerPush).toHaveBeenCalledWith({ name: 'lobby' });
    },
  );

  it('SC-LEAVE-09/10/11/12: Game leave right; logo leave; no logout; no sections', async () => {
    routeState.name = 'game';
    routeState.params = { roomId: 'r1' };
    routeState.path = '/game/r1';
    routeState.fullPath = '/game/r1';
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="header-sections"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-moderation"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-logout"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="header-login"]').exists()).toBe(false);
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

  it('SC-BRAND-25 / SC-BRAND-01: brand logo is image mark without wordmark label', async () => {
    wrapper = mountApp();
    await flushPromises();
    const logo = wrapper.find('[data-test-id="brand-logo"]');
    expect(logo.exists()).toBe(true);
    expect(logo.find('img.brand-logo').exists()).toBe(true);
    expect(logo.text().trim()).toBe('');
    expect(wrapper.text()).not.toContain('СЧАСТЛИВЫЙ ТУРИСТ');
  });

  it('SC-BRAND-21: q-layout mounts with app-page-bg on shared shell', async () => {
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="q-layout"]').classes()).toContain('app-page-bg');
    expect(appVueSrc).toMatch(/<q-layout[^>]*class="app-page-bg"/);
  });

  it('SC-PRESENCE-36: peek flash replaces game-status with color then restores', async () => {
    routeState.name = 'game';
    routeState.path = '/game/r1';
    routeState.fullPath = '/game/r1';
    gameState.phase = 'playing';
    gameState.status = 'playing';
    gameState.currentTurnSessionId = 's1';
    gameState.isMyTurn = true;
    gameState.mySeat = { sessionId: 's1' };

    const remountStatus = async () => {
      wrapper?.unmount();
      wrapper = mountApp();
      await flushPromises();
      return wrapper.find('[data-test-id="game-status"]');
    };

    let status = await remountStatus();
    expect(status.exists()).toBe(true);
    expect(status.text()).toBe('Ваш ход');
    expect(status.classes()).not.toContain('text-positive');

    gameState.peekStatusFlash = {
      kind: 'correct',
      until: Date.now() + 10_000,
    };
    status = await remountStatus();
    expect(status.text()).toBe('game.peekStatusFlash.correct');
    expect(status.classes()).toContain('text-positive');

    gameState.peekStatusFlash = {
      kind: 'wrong',
      until: Date.now() + 10_000,
    };
    status = await remountStatus();
    expect(status.text()).toBe('game.peekStatusFlash.wrong');
    expect(status.classes()).toContain('text-negative');

    gameState.peekStatusFlash = {
      kind: 'timeout',
      until: Date.now() + 10_000,
    };
    status = await remountStatus();
    expect(status.text()).toBe('game.peekStatusFlash.timeout');
    expect(status.classes()).toContain('text-warning');

    gameState.peekStatusFlash = null;
    status = await remountStatus();
    expect(status.text()).toBe('Ваш ход');
    expect(status.classes()).not.toContain('text-warning');
  });
});

describe('App breadcrumbs layout (SC-BRAND-23 / D7)', () => {
  let wrapper: ReturnType<typeof mountApp> | null = null;

  beforeEach(() => {
    authState.ready = true;
    authState.isAuthenticated = true;
    authState.isStaff = false;
    authState.user = { id: 'u1', anonymous: false };
    routeState.params = {};
    contentState.pack = { id: 'p1', title: 'Пак Альфа' };
    contentState.staffPreview = null;
    mapsState.map = null;
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.clearAllMocks();
  });

  it('SC-BRAND-23: page-container gets --with-crumbs when breadcrumbs show (packs/maps)', async () => {
    routeState.name = 'content-catalog';
    routeState.path = '/content';
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="app-breadcrumbs"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="q-page-container"]').classes()).toContain(
      'q-page-container--with-crumbs',
    );

    wrapper.unmount();
    routeState.name = 'content-maps';
    routeState.path = '/content/maps';
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="app-breadcrumbs"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="q-page-container"]').classes()).toContain(
      'q-page-container--with-crumbs',
    );
  });

  it('SC-BRAND-23: lobby has no crumbs class (Quasar page min-height unchanged)', async () => {
    routeState.name = 'lobby';
    routeState.path = '/lobby';
    wrapper = mountApp();
    await flushPromises();
    expect(wrapper.find('[data-test-id="app-breadcrumbs"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-id="q-page-container"]').classes()).not.toContain(
      'q-page-container--with-crumbs',
    );
  });

  it('SC-BRAND-23 / D7: app.scss flex column + override Quasar page min-height under crumbs', () => {
    expect(appVueSrc).toMatch(/q-page-container--with-crumbs[\s\S]*breadcrumbItems\.length/);
    expect(appScss).toMatch(
      /\.q-page-container--with-crumbs\s*\{[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column[\s\S]*min-height:\s*100vh/,
    );
    expect(appScss).toMatch(
      /\.q-page-container--with-crumbs\s*>\s*\.q-page\s*\{[\s\S]*min-height:\s*0\s*!important/,
    );
    // Prefer flex/min-height over hiding overflow on body (design D7 risk mitigation).
    expect(appScss).not.toMatch(/body\s*\{[^}]*overflow:\s*hidden/);
  });
});

describe('App page backgrounds (SC-BRAND-21 / SC-PACK-285)', () => {
  it('SC-BRAND-21: app.scss fixed cover + four theme×viewport pack-bg urls', () => {
    expect(appScss).toMatch(/\.app-page-bg\s*\{[\s\S]*background-attachment:\s*fixed/);
    expect(appScss).toMatch(/url\(['"]?\.\.\/assets\/packs\/pack-bg-desktop-light\.jpg['"]?\)/);
    expect(appScss).toMatch(
      /body\.body--dark\s+\.app-page-bg[\s\S]*url\(['"]?\.\.\/assets\/packs\/pack-bg-desktop-dark\.jpg['"]?\)/,
    );
    expect(appScss).toMatch(/@media\s*\(\s*max-width:\s*599px\s*\)/);
    expect(appScss).toMatch(
      /@media\s*\(\s*max-width:\s*599px\s*\)[\s\S]*url\(['"]?\.\.\/assets\/packs\/pack-bg-mobile-light\.jpg['"]?\)/,
    );
    expect(appScss).toMatch(
      /@media\s*\(\s*max-width:\s*599px\s*\)[\s\S]*body\.body--dark\s+\.app-page-bg[\s\S]*url\(['"]?\.\.\/assets\/packs\/pack-bg-mobile-dark\.jpg['"]?\)/,
    );
  });

  it('SC-BRAND-21: transparent page canvas under .app-page-bg', () => {
    expect(appScss).toMatch(/\.app-page-bg\s*\{[\s\S]*--q-page-bg:\s*transparent/);
    expect(appScss).toMatch(
      /\.app-page-bg\s+\.q-page,[\s\S]*\.app-page-bg\s+\.q-page-container[\s\S]*background:\s*transparent/,
    );
    expect(appScss).toMatch(/\.app-page-bg\s+\.app-breadcrumbs[\s\S]*background:\s*transparent/);
  });

  it('SC-PACK-285: underlay rgba + pad/radius only on .pack-card-grid (not .peek-chrome)', () => {
    // Layout-only block (D5) — underlay on `.pack-card-grid` alone.
    expect(appScss).toMatch(
      /(?:^|\n)\.pack-card-grid\s*\{[^}]*background:\s*rgba\(\s*255,\s*255,\s*255,\s*0\.78\s*\)/m,
    );
    expect(appScss).toMatch(
      /(?:^|\n)\.pack-card-grid\s*\{[^}]*(?:padding:\s*0\.75rem[^}]*border-radius:\s*8px|border-radius:\s*8px[^}]*padding:\s*0\.75rem)/m,
    );
    expect(appScss).toMatch(
      /(?:^|\n)body\.body--dark\s+\.pack-card-grid\s*\{[^}]*background:\s*rgba\(\s*18,\s*18,\s*18,\s*0\.78\s*\)/m,
    );
    // Shared token selector with .peek-chrome must not paint the underlay.
    expect(appScss).not.toMatch(
      /\.pack-card-grid\s*,\s*\.peek-chrome\s*\{[^}]*background:\s*rgba\(\s*255,\s*255,\s*255,\s*0\.78\s*\)/,
    );
    expect(appScss).not.toMatch(
      /\.peek-chrome\s*,\s*\.pack-card-grid\s*\{[^}]*background:\s*rgba\(\s*255,\s*255,\s*255,\s*0\.78\s*\)/,
    );
    expect(appScss).not.toMatch(
      /body\.body--dark\s+\.pack-card-grid\s*,\s*body\.body--dark\s+\.peek-chrome\s*\{[^}]*background:\s*rgba\(\s*18,\s*18,\s*18,\s*0\.78\s*\)/,
    );
  });

  it('SC-BRAND-28: catalog lists must not override pack-card-grid with solid cream/navy', () => {
    expect(appScss).not.toMatch(/\.catalog-list-page\s+\.pack-card-grid\s*\{/);
    expect(appScss).not.toMatch(/#f7f4ec/);
    expect(appScss).not.toMatch(/#141b2b/);
    expect(appScss).toMatch(
      /(?:^|\n)\.pack-card-grid\s*\{[^}]*background:\s*rgba\(\s*255,\s*255,\s*255,\s*0\.78\s*\)/m,
    );
    expect(appScss).toMatch(
      /(?:^|\n)body\.body--dark\s+\.pack-card-grid\s*\{[^}]*background:\s*rgba\(\s*18,\s*18,\s*18,\s*0\.78\s*\)/m,
    );
  });

  it('SC-BRAND-21: four pack-bg JPG assets exist under src/assets/packs/', () => {
    for (const name of packBgAssets) {
      expect(existsSync(join(packsAssetsDir, name)), name).toBe(true);
    }
  });

  it('smoke SC-BRAND-21 / SC-PACK-285 / SC-THEME-07: Login/Lobby readable; Game holes transparent', () => {
    const loginSrc = readFileSync(join(srcRoot, 'pages/LoginPage.vue'), 'utf8');
    const lobbySrc = readFileSync(join(srcRoot, 'pages/LobbyPage.vue'), 'utf8');
    const gameSrc = readFileSync(join(srcRoot, 'pages/GamePage.vue'), 'utf8');

    // Login / Lobby sit under shared shell bg; elevated surfaces stay readable.
    expect(appVueSrc).toMatch(/class="app-page-bg"/);
    expect(loginSrc).toMatch(/login-card/);
    expect(lobbySrc).toMatch(/pack-card-grid/);
    expect(appScss).toMatch(
      /\.pack-card-grid\s*\{[\s\S]*background:\s*rgba\(\s*255,\s*255,\s*255,\s*0\.78\s*\)/,
    );
    expect(appScss).toMatch(
      /body\.body--dark\s+\.pack-card-grid\s*\{[\s\S]*background:\s*rgba\(\s*18,\s*18,\s*18,\s*0\.78\s*\)/,
    );

    // Game: removed cells remain transparent holes (page bg shows through); HUD chrome retained.
    expect(gameSrc).toMatch(/tile--removed/);
    expect(gameSrc).toMatch(/\.tile-task\.tile--removed\s*\{[\s\S]*background:\s*transparent/);
    expect(gameSrc).toMatch(/game-hud/);
  });

  it('SC-PRESENCE-34: sticky .game-hud uses translucent underlay (not opaque #fff / #121212)', () => {
    const gameSrc = readFileSync(join(srcRoot, 'pages/GamePage.vue'), 'utf8');
    expect(gameSrc).toMatch(
      /(?:^|\n)\.game-hud\s*\{[^}]*background-color:\s*rgba\(\s*255,\s*255,\s*255,\s*0\.78\s*\)/m,
    );
    expect(gameSrc).toMatch(
      /(?:^|\n)body\.body--dark\s+\.game-hud\s*\{[^}]*background-color:\s*rgba\(\s*18,\s*18,\s*18,\s*0\.78\s*\)/m,
    );
    // Must not regress to fully opaque solid bar fills.
    expect(gameSrc).not.toMatch(/(?:^|\n)\.game-hud\s*\{[^}]*background-color:\s*#fff\b/m);
    expect(gameSrc).not.toMatch(
      /(?:^|\n)body\.body--dark\s+\.game-hud\s*\{[^}]*background-color:\s*#121212\b/m,
    );
  });
});
