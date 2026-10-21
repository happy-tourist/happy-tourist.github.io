import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '@/pages/LoginPage.vue';

const { authState, mockLogin, mockReplace, routeQuery } = vi.hoisted(() => {
  const mockLogin = vi.fn();
  const mockReplace = vi.fn();
  const routeQuery = { redirect: undefined as string | undefined };
  const authState = {
    error: null as string | null,
    loading: false,
    user: null as { anonymous?: boolean } | null,
    login: mockLogin,
    register: vi.fn(),
    loginAnonymously: vi.fn(),
    loginWithGoogle: vi.fn(),
  };
  return { authState, mockLogin, mockReplace, routeQuery };
});

vi.mock('vue-router', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
    useRoute: () => ({
      params: {},
      query: routeQuery,
      path: '/login',
      name: 'login',
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
  'q-form': {
    template:
      '<form data-test-id="login-form" @submit.prevent="$emit(\'submit\', $event)"><slot /></form>',
  },
  'q-input': true,
  'q-btn': {
    props: ['label', 'loading', 'type'],
    template: '<button v-bind="$attrs" :type="type || \'button\'">{{ label }}<slot /></button>',
  },
  'q-banner': true,
  'q-icon': true,
  PasswordStrengthMeter: true,
};

describe('LoginPage silent guest / upgrade (SC-AUTH-14/15)', () => {
  let wrapper: ReturnType<typeof shallowMount> | null = null;

  const getWrapper = () =>
    shallowMount(LoginPage, {
      global: { stubs },
    });

  beforeEach(() => {
    authState.error = null;
    authState.loading = false;
    authState.user = null;
    routeQuery.redirect = undefined;
    mockLogin.mockReset();
    mockLogin.mockResolvedValue(undefined);
    mockReplace.mockReset();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.clearAllMocks();
  });

  it('SC-AUTH-14: guest button hidden when already anonymous', async () => {
    authState.user = { anonymous: true };
    wrapper = getWrapper();
    await flushPromises();

    expect(wrapper.find('[data-test-id="login-anonymous"]').exists()).toBe(false);
  });

  it('SC-AUTH-14: guest button shown when not anonymous', async () => {
    authState.user = null;
    wrapper = getWrapper();
    await flushPromises();

    expect(wrapper.find('[data-test-id="login-anonymous"]').exists()).toBe(true);
  });

  it('SC-AUTH-15: after email login navigates to query.redirect', async () => {
    routeQuery.redirect = '/content/packs';
    mockLogin.mockResolvedValue(undefined);
    wrapper = getWrapper();
    await flushPromises();

    await wrapper.find('[data-test-id="login-form"]').trigger('submit');
    await flushPromises();

    expect(mockLogin).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/content/packs');
  });

  it('SC-AUTH-15: without redirect defaults to lobby after login', async () => {
    routeQuery.redirect = undefined;
    mockLogin.mockResolvedValue(undefined);
    wrapper = getWrapper();
    await flushPromises();

    await wrapper.find('[data-test-id="login-form"]').trigger('submit');
    await flushPromises();

    expect(mockReplace).toHaveBeenCalledWith('/lobby');
  });
});
