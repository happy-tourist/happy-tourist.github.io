import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';
import { Dark } from 'quasar';

import { client } from '@/boot/colyseus';
import {
  applyQuasarTheme,
  clearStoredTheme,
  readStoredTheme,
  writeStoredTheme,
  type StoredTheme,
} from '@/boot/theme';
import { useAuthStore, type AuthUser } from '@/stores/auth';

/**
 * UI theme preference (Quasar Dark).
 * Guest → localStorage; registered → POST save + GET restore from profile (not JWT-only).
 */
export const useThemeStore = defineStore('theme', () => {
  const preference = ref<StoredTheme | null>(readStoredTheme());
  const error = ref<string | null>(null);

  /** Ignores stale GET responses when auth user changes mid-flight. */
  let restoreGeneration = 0;

  function apply(theme: StoredTheme | null) {
    preference.value = theme;
    applyQuasarTheme(theme);
  }

  function themeFromPayload(value: unknown): StoredTheme | null {
    return value === 'light' || value === 'dark' ? value : null;
  }

  /**
   * Guest / signed out → localStorage or auto (SC-THEME-03).
   * Registered → GET /api/theme from profile (SC-THEME-08/09); do not use JWT
   * `user.theme` alone after reload. Login userdata may still match GET after a
   * fresh sign-in (SC-THEME-06).
   */
  async function syncFromAuthUser(user: AuthUser | null) {
    const generation = ++restoreGeneration;

    if (!user || user.anonymous) {
      apply(readStoredTheme());
      return;
    }

    error.value = null;
    try {
      const { data } = await client.http.get<{ theme?: string | null }>('/api/theme');
      if (generation !== restoreGeneration) {
        return;
      }
      const theme = themeFromPayload(data?.theme);
      apply(theme);
      // Keep device copy aligned with profile (or clear when unset → auto).
      // Theme lives in this store after GET — do not replace auth.user (SC-THEME-10 / D9).
      if (theme) {
        writeStoredTheme(theme);
      } else {
        clearStoredTheme();
      }
    } catch (e) {
      if (generation !== restoreGeneration) {
        return;
      }
      error.value = e instanceof Error ? e.message : String(e);
      // Keep early localStorage / boot apply; do not fall back to stale JWT alone.
    }
  }

  /** Explicit light ↔ dark toggle; persists guest locally / registered via HTTP. */
  async function toggle() {
    const next: StoredTheme = Dark.isActive ? 'light' : 'dark';
    apply(next);
    // Always keep a device copy (guest persist + reduce flash before auth sync).
    writeStoredTheme(next);
    error.value = null;

    const auth = useAuthStore();
    if (auth.isAuthenticated && auth.user && !auth.user.anonymous) {
      try {
        await client.http.post('/api/theme', { body: { theme: next } });
        auth.user = { ...auth.user, theme: next };
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
      }
    }
  }

  return {
    preference,
    error,
    syncFromAuthUser,
    toggle,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useThemeStore, import.meta.hot));
}
