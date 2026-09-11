import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/lobby' },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/lobby',
    name: 'lobby',
    component: () => import('@/pages/LobbyPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/game/:roomId',
    name: 'game',
    component: () => import('@/pages/GamePage.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/:catchAll(.*)*', redirect: '/lobby' },
];

export default routes;
