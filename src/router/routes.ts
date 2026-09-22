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
    path: '/content/packs',
    name: 'content-catalog',
    component: () => import('@/pages/ContentCatalogPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/content/collection',
    name: 'content-collection',
    component: () => import('@/pages/ContentCollectionPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/content/packs/new',
    name: 'content-pack-new',
    component: () => import('@/pages/ContentPackCreatePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/content/staff',
    name: 'content-staff',
    component: () => import('@/pages/ContentStaffPage.vue'),
    meta: { requiresAuth: true, requiresStaff: true },
  },
  {
    path: '/content/staff/requests/:id',
    name: 'content-staff-request',
    component: () => import('@/pages/ContentStaffRequestPage.vue'),
    meta: { requiresAuth: true, requiresStaff: true },
  },
  {
    path: '/content/packs/:id/edit',
    name: 'content-pack-edit',
    component: () => import('@/pages/ContentPackEditorPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/content/packs/:id/moderation',
    name: 'content-pack-moderation',
    component: () => import('@/pages/ContentPackModerationPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/content/packs/:id',
    name: 'content-pack',
    component: () => import('@/pages/ContentPackPage.vue'),
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
