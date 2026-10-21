import type { RouteLocationNormalized } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authBeforeEach, resetSilentGuestInFlightForTests } from '@/router/authGuard';

const { authState, loginAnonymously } = vi.hoisted(() => {
  const loginAnonymously = vi.fn();
  const authState = {
    isAuthenticated: false,
    isAdmin: false,
    isStaff: false,
    user: null as { anonymous?: boolean } | null,
    error: null as string | null,
    whenReady: vi.fn().mockResolvedValue(undefined),
    loginAnonymously,
  };
  return { authState, loginAnonymously };
});

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => authState),
}));

function route(partial: {
  name?: string;
  path?: string;
  fullPath?: string;
  meta?: Record<string, unknown>;
}): RouteLocationNormalized {
  const path = partial.path ?? '/';
  return {
    name: partial.name ?? path,
    path,
    fullPath: partial.fullPath ?? path,
    hash: '',
    query: {},
    params: {},
    matched: [],
    meta: partial.meta ?? {},
    redirectedFrom: undefined,
  } as RouteLocationNormalized;
}

describe('authBeforeEach silent guest / Login upgrade (SC-AUTH-11…13, 11b)', () => {
  beforeEach(() => {
    resetSilentGuestInFlightForTests();
    authState.isAuthenticated = false;
    authState.isAdmin = false;
    authState.isStaff = false;
    authState.user = null;
    authState.error = null;
    loginAnonymously.mockReset();
    loginAnonymously.mockResolvedValue(undefined);
    authState.whenReady.mockResolvedValue(undefined);
  });

  it('SC-AUTH-11: unauthenticated ordinary requiresAuth calls loginAnonymously and stays', async () => {
    loginAnonymously.mockImplementation(() => {
      authState.isAuthenticated = true;
      authState.user = { anonymous: true };
      return Promise.resolve();
    });

    const result = await authBeforeEach(
      route({ path: '/lobby', name: 'lobby', meta: { requiresAuth: true } }),
    );

    expect(loginAnonymously).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it('SC-AUTH-11b: silent guest failure redirects to Login with redirect', async () => {
    loginAnonymously.mockRejectedValue(new Error('network'));
    authState.error = 'network';

    const result = await authBeforeEach(
      route({
        path: '/lobby',
        name: 'lobby',
        fullPath: '/lobby',
        meta: { requiresAuth: true },
      }),
    );

    expect(loginAnonymously).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      path: '/login',
      query: { redirect: '/lobby' },
    });
  });

  it('SC-AUTH-11b: silent guest resolve without session falls back to Login', async () => {
    loginAnonymously.mockImplementation(() => {
      // promise ok but store still unauthenticated
      authState.isAuthenticated = false;
      return Promise.resolve();
    });

    const result = await authBeforeEach(
      route({
        path: '/content/packs',
        name: 'content-catalog',
        fullPath: '/content/packs',
        meta: { requiresAuth: true },
      }),
    );

    expect(loginAnonymously).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      path: '/login',
      query: { redirect: '/content/packs' },
    });
  });

  it('SC-AUTH-11: concurrent ordinary navigations share one loginAnonymously', async () => {
    let resolveSignIn!: () => void;
    const signInStarted = new Promise<void>((resolveStarted) => {
      loginAnonymously.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveStarted();
            resolveSignIn = () => {
              authState.isAuthenticated = true;
              authState.user = { anonymous: true };
              resolve();
            };
          }),
      );
    });

    const p1 = authBeforeEach(
      route({ path: '/lobby', name: 'lobby', meta: { requiresAuth: true } }),
    );
    const p2 = authBeforeEach(
      route({
        path: '/content/packs',
        name: 'content-catalog',
        meta: { requiresAuth: true },
      }),
    );
    await signInStarted;
    resolveSignIn();
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(loginAnonymously).toHaveBeenCalledTimes(1);
    expect(r1).toBeUndefined();
    expect(r2).toBeUndefined();
  });

  it('SC-AUTH-12: staff without session goes to Login with redirect, no anonymous', async () => {
    const result = await authBeforeEach(
      route({
        path: '/support/staff',
        name: 'support-staff',
        fullPath: '/support/staff',
        meta: { requiresAuth: true, requiresStaff: true },
      }),
    );

    expect(loginAnonymously).not.toHaveBeenCalled();
    expect(result).toEqual({
      path: '/login',
      query: { redirect: '/support/staff' },
    });
  });

  it('SC-AUTH-12: admin without session goes to Login with redirect, no anonymous', async () => {
    const result = await authBeforeEach(
      route({
        path: '/admin/users',
        name: 'admin-users',
        fullPath: '/admin/users',
        meta: { requiresAuth: true, requiresAdmin: true },
      }),
    );

    expect(loginAnonymously).not.toHaveBeenCalled();
    expect(result).toEqual({
      path: '/login',
      query: { redirect: '/admin/users' },
    });
  });

  it('SC-AUTH-13: anonymous authenticated may stay on Login', async () => {
    authState.isAuthenticated = true;
    authState.user = { anonymous: true };

    const result = await authBeforeEach(
      route({ path: '/login', name: 'login', meta: { guest: true } }),
    );

    expect(result).toBeUndefined();
  });

  it('SC-AUTH-13: registered authenticated is bounced from Login to lobby', async () => {
    authState.isAuthenticated = true;
    authState.user = { anonymous: false };

    const result = await authBeforeEach(
      route({ path: '/login', name: 'login', meta: { guest: true } }),
    );

    expect(result).toBe('/lobby');
  });

  it('SC-AUTH-13: anonymous authenticated is bounced from forgot-password', async () => {
    authState.isAuthenticated = true;
    authState.user = { anonymous: true };

    const result = await authBeforeEach(
      route({
        path: '/forgot-password',
        name: 'forgot-password',
        meta: { guest: true },
      }),
    );

    expect(result).toBe('/lobby');
  });
});
