import { config } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  setActivePinia(createPinia());
});

config.global.mocks = {
  ...config.global.mocks,
  $t: (key: string) => key,
};

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
      te: () => true,
      locale: { value: 'ru-RU' },
    }),
  };
});

/** Do not boot a live Colyseus client in unit tests. */
vi.mock('@/boot/colyseus', () => ({
  client: {
    auth: {
      token: null as string | null,
      onChange: vi.fn(),
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      getUserData: vi.fn(),
      registerWithEmailAndPassword: vi.fn(),
      signInAnonymously: vi.fn(),
      signInWithEmailAndPassword: vi.fn(),
      signInWithProvider: vi.fn(),
      sendPasswordResetEmail: vi.fn(),
    },
    http: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      del: vi.fn(),
    },
    joinOrCreate: vi.fn(),
    joinById: vi.fn(),
    create: vi.fn(),
  },
  default: vi.fn(),
}));
