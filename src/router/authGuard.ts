import type { NavigationGuardReturn, RouteLocationNormalized } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

/** Share one in-flight anonymous sign-in across concurrent navigations. */
let silentGuestInFlight: Promise<void> | null = null;

/** Test-only: clear shared in-flight so cases do not leak across specs. */
export function resetSilentGuestInFlightForTests(): void {
  silentGuestInFlight = null;
}

function loginRedirect(to: RouteLocationNormalized): NavigationGuardReturn {
  return {
    path: '/login',
    query: { redirect: to.fullPath },
  };
}

/**
 * Auth navigation guard (SC-AUTH-11…15, 11b).
 * Silent anonymous on ordinary requiresAuth; staff/admin → Login + redirect;
 * Login bounce only for registered; other meta.guest bounce any authenticated.
 */
export async function authBeforeEach(to: RouteLocationNormalized): Promise<NavigationGuardReturn> {
  const auth = useAuthStore();
  await auth.whenReady();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    if (to.meta.requiresStaff || to.meta.requiresAdmin) {
      return loginRedirect(to);
    }
    try {
      if (!silentGuestInFlight) {
        silentGuestInFlight = auth.loginAnonymously().finally(() => {
          silentGuestInFlight = null;
        });
      }
      await silentGuestInFlight;
      // Defensive: SDK must leave a session; otherwise fall back (SC-AUTH-11b).
      if (!auth.isAuthenticated) {
        return loginRedirect(to);
      }
    } catch {
      // error already in store (SC-AUTH-11b)
      return loginRedirect(to);
    }
  }

  if (to.meta.guest && auth.isAuthenticated) {
    const allowAnonymousOnLogin = to.name === 'login' && Boolean(auth.user?.anonymous);
    if (!allowAnonymousOnLogin) {
      return '/lobby';
    }
  }

  // Client nav gating only — server still enforces (SC-ROLE-08).
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return '/support';
  }

  if (to.meta.requiresStaff && !auth.isStaff) {
    return '/support';
  }
}
