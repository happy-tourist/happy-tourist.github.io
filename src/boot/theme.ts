import { defineBoot } from '#q-app';
import { Dark } from 'quasar';

/** localStorage key for guest (and pre-login) theme preference. */
export const THEME_STORAGE_KEY = 'ht-theme';

export type StoredTheme = 'light' | 'dark';

export function readStoredTheme(): StoredTheme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(theme: StoredTheme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/** Drop device copy when profile theme is unset (registered restore → auto). */
export function clearStoredTheme(): void {
  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // ignore quota / private-mode failures
  }
}

/** Apply Quasar Dark: explicit light/dark, or `auto` when unset (SC-THEME-01). */
export function applyQuasarTheme(theme: StoredTheme | null): void {
  if (theme === 'light') {
    Dark.set(false);
  } else if (theme === 'dark') {
    Dark.set(true);
  } else {
    Dark.set('auto');
  }
}

export default defineBoot(() => {
  applyQuasarTheme(readStoredTheme());
});
