import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref, computed } from 'vue';

import { client } from '@/boot/colyseus';

const AUTH_TOKEN_KEY = 'colyseus-auth-token';

export type AuthRole = 'user' | 'moderator' | 'admin';

export interface AuthUser {
  id?: string | number;
  email?: string;
  /** SDK / OAuth display name (may differ from persisted displayName). */
  name?: string;
  /** Persisted cabinet display name from DB (SC-AUTH-10 / SC-PROFILE-01). */
  displayName?: string | null;
  anonymous?: boolean;
  /** Soft email verification flag from userdata (SC-EMAIL-*). */
  emailVerified?: boolean;
  /** Registered-user UI theme from userdata (`light` | `dark`); unset when null/absent. */
  theme?: string | null;
  /** Product role from userdata (nav gating only — server enforces). */
  role?: AuthRole;
  /** True when account has a local password credential (hide change-password if false). */
  hasPassword?: boolean;
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
 * - client.http POST /api/auth/send-email-confirmation, /api/auth/email,
 *   /api/auth/confirm-email, /api/auth/reset-password,
 *   /api/auth/display-name, /api/auth/change-password
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
  const displayName = computed(() => {
    const u = user.value;
    const persisted = typeof u?.displayName === 'string' ? u.displayName.trim() : '';
    if (persisted) {
      return persisted;
    }
    return u?.name || u?.email || (u?.anonymous ? 'Гость' : 'Игрок');
  });
  /** Email/password accounts only — Google / no credential → false (SC-PROFILE-03). */
  const canChangePassword = computed(() =>
    Boolean(
      isAuthenticated.value &&
      user.value &&
      !user.value.anonymous &&
      user.value.hasPassword === true,
    ),
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

  const role = computed<AuthRole>(() => {
    const r = user.value?.role;
    if (r === 'moderator' || r === 'admin' || r === 'user') {
      return r;
    }
    return 'user';
  });
  /** Moderator or admin — staff support queue (client nav only). */
  const isStaff = computed(() => role.value === 'moderator' || role.value === 'admin');
  /** Admin-only users UI (SC-ROLE-08). */
  const isAdmin = computed(() => role.value === 'admin');

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
      const code = authErrorCode(e);
      if (code.includes('password_policy_failed')) {
        error.value = 'password_policy_failed';
      } else {
        error.value = e instanceof Error ? e.message : String(e);
      }
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

  /** Map SDK / API error bodies to a stable code string. */
  function authErrorCode(e: unknown): string {
    if (!e || typeof e !== 'object') {
      return '';
    }
    const anyErr = e as {
      message?: string;
      data?: { error?: string; message?: string };
    };
    const fromData = anyErr.data?.error ?? anyErr.data?.message;
    if (typeof fromData === 'string' && fromData) {
      return fromData;
    }
    return typeof anyErr.message === 'string' ? anyErr.message : '';
  }

  /** Forgot-password — Colyseus `/auth/forgot-password` (SC-RESET-01/05/07). */
  async function forgotPassword(email: string) {
    loading.value = true;
    error.value = null;

    try {
      await client.auth.sendPasswordResetEmail(email);
    } catch (e) {
      const code = authErrorCode(e);
      if (code.includes('email_not_found')) {
        error.value = 'email_not_found';
      } else {
        error.value = e instanceof Error ? e.message : String(e);
      }
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /**
   * SPA confirm — POST JSON `/api/auth/confirm-email` (SC-EMAIL-02/12).
   * No session required; refresh userdata when already signed in.
   */
  async function confirmEmail(token: string) {
    loading.value = true;
    error.value = null;

    try {
      await client.http.post('/api/auth/confirm-email', {
        body: { token },
      });
      if (client.auth.token) {
        await refreshUserData();
      }
    } catch (e) {
      const code = authErrorCode(e);
      if (code.includes('token_expired') || code.toLowerCase().includes('expired')) {
        error.value = 'token_expired';
      } else if (
        code.includes('token_invalid') ||
        code.toLowerCase().includes('jwt') ||
        code.toLowerCase().includes('token')
      ) {
        error.value = 'token_invalid';
      } else {
        error.value = e instanceof Error ? e.message : String(e);
      }
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** SPA reset — POST JSON `/api/auth/reset-password` (SC-RESET-02). */
  async function resetPassword(token: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      await client.http.post('/api/auth/reset-password', {
        body: { token, password },
      });
    } catch (e) {
      const code = authErrorCode(e);
      if (code.includes('password_policy_failed')) {
        error.value = 'password_policy_failed';
      } else if (code.includes('token_expired') || code.toLowerCase().includes('expired')) {
        error.value = 'token_expired';
      } else if (code.includes('token_already_used')) {
        error.value = 'token_already_used';
      } else if (
        code.includes('token_invalid') ||
        code.toLowerCase().includes('jwt') ||
        code.toLowerCase().includes('token')
      ) {
        error.value = 'token_invalid';
      } else {
        error.value = e instanceof Error ? e.message : String(e);
      }
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update display name — POST `/api/auth/display-name` (SC-PROFILE-01/05).
   * Server returns new JWT + user; apply like changeEmail.
   */
  async function updateDisplayName(displayNameValue: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await client.http.post<{ user: AuthUser; token: string }>(
        '/api/auth/display-name',
        {
          body: { displayName: displayNameValue },
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
      const code = authErrorCode(e);
      if (code.includes('display_name_invalid')) {
        error.value = 'display_name_invalid';
      } else {
        error.value = e instanceof Error ? e.message : String(e);
      }
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Change password — POST `/api/auth/change-password` then logout (SC-PROFILE-02/04).
   */
  async function changePassword(currentPassword: string, newPassword: string) {
    loading.value = true;
    error.value = null;

    try {
      await client.http.post('/api/auth/change-password', {
        body: { currentPassword, newPassword },
      });
      await client.auth.signOut();
    } catch (e) {
      const code = authErrorCode(e);
      if (code.includes('invalid_current_password')) {
        error.value = 'invalid_current_password';
      } else if (code.includes('password_policy_failed')) {
        error.value = 'password_policy_failed';
      } else if (code.includes('password_change_unavailable')) {
        error.value = 'password_change_unavailable';
      } else {
        error.value = e instanceof Error ? e.message : String(e);
      }
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
    canChangePassword,
    needsEmailVerification,
    role,
    isStaff,
    isAdmin,
    register,
    login,
    loginAnonymously,
    loginWithGoogle,
    logout,
    forgotPassword,
    confirmEmail,
    resetPassword,
    updateDisplayName,
    changePassword,
    sendEmailConfirmation,
    changeEmail,
    refreshUserData,
    whenReady,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
