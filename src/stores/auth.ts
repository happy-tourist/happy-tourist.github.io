import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref, computed } from 'vue';

import { client } from '@/boot/colyseus';

const AUTH_TOKEN_KEY = 'colyseus-auth-token';

export interface AuthUser {
  id?: string | number;
  email?: string;
  name?: string;
  anonymous?: boolean;
  /** Soft email verification flag from userdata (SC-EMAIL-*). */
  emailVerified?: boolean;
  /** Registered-user UI theme from userdata (`light` | `dark`); unset when null/absent. */
  theme?: string | null;
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
 * - client.auth.sendPasswordResetEmail(email)
 * - client.auth.signOut()
 * - client.auth.token / onChange — token persisted under "colyseus-auth-token"
 * - client.http POST /api/auth/send-email-confirmation, /api/auth/email
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
  /** Registered non-anonymous with unverified email — cabinet + session modal. */
  const needsEmailVerification = computed(() =>
    Boolean(
      isAuthenticated.value &&
      user.value &&
      !user.value.anonymous &&
      user.value.email &&
      user.value.emailVerified !== true,
    ),
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

  /** Forgot-password — Colyseus `/auth/forgot-password` (SC-RESET-01/05). */
  async function forgotPassword(email: string) {
    loading.value = true;
    error.value = null;

    try {
      await client.auth.sendPasswordResetEmail(email);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Cabinet button — POST send-confirm; no auto-send on register (SC-EMAIL-06). */
  async function sendEmailConfirmation() {
    loading.value = true;
    error.value = null;

    try {
      await client.http.post('/api/auth/send-email-confirmation');
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Change email — resets verified; server returns new JWT; apply locally
   * (SDK has no public emitChange) then refresh userdata (SC-EMAIL-10).
   */
  async function changeEmail(email: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await client.http.post<{ user: AuthUser; token: string }>(
        '/api/auth/email',
        {
          body: { email },
        },
      );
      client.auth.token = data.token;
      try {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      } catch {
        // ignore storage failures (private mode)
      }
      token.value = data.token;
      user.value = data.user;
      await refreshUserData();
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Re-fetch userdata into store (e.g. after confirm on another device). */
  async function refreshUserData() {
    if (!client.auth.token) {
      return;
    }
    const { user: next } = await client.auth.getUserData<AuthUser>();
    user.value = next ?? null;
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
    needsEmailVerification,
    register,
    login,
    loginAnonymously,
    loginWithGoogle,
    logout,
    forgotPassword,
    sendEmailConfirmation,
    changeEmail,
    refreshUserData,
    whenReady,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
