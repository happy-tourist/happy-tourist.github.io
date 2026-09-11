import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref, computed } from 'vue';

import { client } from '@/boot/colyseus';

export interface AuthUser {
  id?: string | number;
  email?: string;
  name?: string;
  anonymous?: boolean;
  [key: string]: unknown;
}

/**
 * Auth store for @colyseus/sdk 0.18.
 *
 * Client API (not @colyseus/auth — that package is server-side):
 * - client.auth.registerWithEmailAndPassword(email, password, options?)
 * - client.auth.signInWithEmailAndPassword(email, password)
 * - client.auth.signInAnonymously(options?)
 * - client.auth.signInWithProvider('google')
 * - client.auth.signOut()
 * - client.auth.token / onChange — token persisted under "colyseus-auth-token"
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const token = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const ready = ref(false);

  let resolveReady: (() => void) | null = null;
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const isAuthenticated = computed(() => Boolean(token.value && user.value));
  const displayName = computed(
    () => user.value?.name || user.value?.email || (user.value?.anonymous ? 'Гость' : 'Игрок'),
  );

  // Restores session: Auth constructor loads token from storage; onChange fetches userdata.
  client.auth.onChange((data) => {
    token.value = data.token ?? null;
    user.value = (data.user as AuthUser | null) ?? null;
    ready.value = true;
    resolveReady?.();
    resolveReady = null;
  });

  async function register(email: string, password: string, options?: { name?: string }) {
    loading.value = true;
    error.value = null;

    try {
      // `options` (e.g. { name }) is passed to backend onRegisterWithEmailAndPassword
      await client.auth.registerWithEmailAndPassword(email, password, options);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function login(email: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      await client.auth.signInWithEmailAndPassword(email, password);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loginAnonymously(options?: { name?: string }) {
    loading.value = true;
    error.value = null;

    try {
      await client.auth.signInAnonymously(options);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loginWithGoogle() {
    loading.value = true;
    error.value = null;

    try {
      await client.auth.signInWithProvider('google');
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    loading.value = true;
    error.value = null;

    try {
      await client.auth.signOut();
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function whenReady() {
    if (ready.value) {
      return Promise.resolve();
    }
    return readyPromise;
  }

  return {
    user,
    token,
    loading,
    error,
    ready,
    isAuthenticated,
    displayName,
    register,
    login,
    loginAnonymously,
    loginWithGoogle,
    logout,
    whenReady,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
