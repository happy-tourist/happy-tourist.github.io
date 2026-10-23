import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AccountPage from '@/pages/AccountPage.vue';

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const accountPageSrc = readFileSync(join(pagesDir, 'AccountPage.vue'), 'utf8');

const { authState, logout, routerReplace } = vi.hoisted(() => {
  const logout = vi.fn().mockResolvedValue(undefined);
  const routerReplace = vi.fn();
  const authState = {
    error: null as string | null,
    loading: false,
    displayName: 'Test User',
    user: {
      id: 'u1',
      email: 'a@b.c',
      emailVerified: true,
      anonymous: false,
      displayName: 'Test User',
      name: 'Test User',
    } as {
      id: string;
      email?: string;
      emailVerified?: boolean;
      anonymous?: boolean;
      displayName?: string;
      name?: string;
    } | null,
    logout,
    sendEmailConfirmation: vi.fn(),
    changeEmail: vi.fn(),
    updateDisplayName: vi.fn(),
    changePassword: vi.fn(),
  };
  return { authState, logout, routerReplace };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: routerReplace }),
    useRoute: () => ({
      params: {},
      query: {},
      path: '/account',
      name: 'account',
    }),
  };
});

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => authState),
}));

const stubs = {
  'q-page': { template: '<div><slot /></div>' },
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<div><slot /></div>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-form': { template: '<form><slot /></form>' },
  'q-input': true,
  'q-btn': {
    props: ['label', 'icon', 'ariaLabel', 'loading', 'color'],
    template:
      '<button v-bind="$attrs" :aria-label="ariaLabel" :data-icon="icon">{{ label }}</button>',
  },
  'q-banner': true,
  'q-dialog': { template: '<div><slot /></div>' },
  'q-icon': true,
  PasswordStrengthMeter: true,
};

describe('AccountPage logout (SC-BRAND-32)', () => {
  let wrapper: ReturnType<typeof shallowMount> | null = null;

  const getWrapper = () =>
    shallowMount(AccountPage, {
      global: {
        stubs,
        directives: { 'close-popup': () => undefined },
      },
    });

  beforeEach(() => {
    authState.error = null;
    authState.loading = false;
    authState.displayName = 'Test User';
    authState.user = {
      id: 'u1',
      email: 'a@b.c',
      emailVerified: true,
      anonymous: false,
      displayName: 'Test User',
      name: 'Test User',
    };
    logout.mockClear();
    routerReplace.mockClear();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.clearAllMocks();
  });

  it('SC-BRAND-32: account logout is icon-only with auth.logout aria', async () => {
    expect(existsSync(join(pagesDir, 'AccountPage.vue'))).toBe(true);
    expect(accountPageSrc).toMatch(
      /icon="logout"\s+:aria-label="\$t\('auth\.logout'\)"\s+data-test-id="account-logout"/,
    );
    expect(accountPageSrc).not.toMatch(
      /data-test-id="account-logout"[^>]*:label=|:label=[^>]*data-test-id="account-logout"/,
    );

    wrapper = getWrapper();
    await flushPromises();

    const btn = wrapper.find('[data-test-id="account-logout"]');
    expect(btn.exists()).toBe(true);
    expect(btn.attributes('data-icon')).toBe('logout');
    expect(btn.attributes('aria-label')).toBe('auth.logout');
    expect(btn.text().trim()).toBe('');
  });
});
