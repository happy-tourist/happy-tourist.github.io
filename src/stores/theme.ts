import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';
import { Dark } from 'quasar';

import { client } from '@/boot/colyseus';
import {
  applyQuasarTheme,
  readStoredTheme,
  writeStoredTheme,
  type StoredTheme,
} from '@/boot/theme';
import { useAuthStore, type AuthUser } from '@/stores/auth';

/**
 * UI theme preference (Quasar Dark).
 * Guest → localStorage; registered → POST /api/theme + apply from userdata on login.
 */
export const useThemeStore = defineStore('theme', () => {
  const preference = ref<StoredTheme | null>(readStoredTheme());
  const error = ref<string | null>(null);

  function apply(theme: StoredTheme | null) {
    preference.value = theme;
    applyQuasarTheme(theme);
  }

  /**
   * Registered user with theme in userdata → apply it (SC-THEME-06).
   * Registered with unset theme → device auto (SC-THEME-01).
   * Guest / signed out → localStorage or auto (SC-THEME-03).
   */
  function syncFromAuthUser(user: AuthUser | null) {
    if (user && !user.anonymous) {
      const theme = user.theme;
      if (theme === 'light' || theme === 'dark') {
        apply(theme);
        return;
      }
      apply(null);
      return;
    }

    apply(readStoredTheme());
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
