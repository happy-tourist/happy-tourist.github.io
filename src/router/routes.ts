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
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/pages/ForgotPasswordPage.vue'),
    meta: { guest: true },
  },
  {
    // Public: works logged-in or not (cabinet mail while session exists — SC-EMAIL-02).
    // Not meta.guest — guest would redirect authenticated users away before confirm.
    path: '/confirm-email',
    name: 'confirm-email',
    component: () => import('@/pages/ConfirmEmailPage.vue'),
  },
  {
    // Public reset form (SPA + JSON); success → login (SC-RESET-02/08).
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/pages/ResetPasswordPage.vue'),
  },
  {
    path: '/lobby',
    name: 'lobby',
    component: () => import('@/pages/LobbyPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('@/pages/AccountPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/support',
    name: 'support',
    component: () => import('@/pages/SupportPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/support/staff',
    name: 'support-staff',
    component: () => import('@/pages/SupportStaffPage.vue'),
    meta: { requiresAuth: true, requiresStaff: true },
  },
  {
    path: '/support/:id',
    name: 'support-ticket',
    component: () => import('@/pages/SupportTicketPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/pages/AdminUsersPage.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
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
