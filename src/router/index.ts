import { defineRouter } from '#q-app';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

import routes from './routes';
import { useAuthStore } from '@/stores/auth';

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to) => {
    const auth = useAuthStore();
    await auth.whenReady();

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      return '/login';
    }

    if (to.meta.guest && auth.isAuthenticated) {
      return '/lobby';
    }

    // Client nav gating only — server still enforces (SC-ROLE-08).
    if (to.meta.requiresAdmin && !auth.isAdmin) {
      return '/support';
    }

    if (to.meta.requiresStaff && !auth.isStaff) {
      return '/support';
    }
  });

  return Router;
});
