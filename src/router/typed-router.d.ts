/* eslint-disable */
/* prettier-ignore */
// @ts-nocheck
// Manual route typings for src/router/routes.ts

import type { RouteRecordInfo } from 'vue-router'

declare module 'vue-router' {
  interface TypesConfig {
    RouteNamedMap: {
      login: RouteRecordInfo<'login', '/login', Record<never, never>, Record<never, never>>;
      'forgot-password': RouteRecordInfo<
        'forgot-password',
        '/forgot-password',
        Record<never, never>,
        Record<never, never>
      >;
      'confirm-email': RouteRecordInfo<
        'confirm-email',
        '/confirm-email',
        Record<never, never>,
        Record<never, never>
      >;
      'reset-password': RouteRecordInfo<
        'reset-password',
        '/reset-password',
        Record<never, never>,
        Record<never, never>
      >;
      lobby: RouteRecordInfo<'lobby', '/lobby', Record<never, never>, Record<never, never>>;
      account: RouteRecordInfo<'account', '/account', Record<never, never>, Record<never, never>>;
      support: RouteRecordInfo<'support', '/support', Record<never, never>, Record<never, never>>;
      'support-staff': RouteRecordInfo<
        'support-staff',
        '/support/staff',
        Record<never, never>,
        Record<never, never>
      >;
      'support-ticket': RouteRecordInfo<
        'support-ticket',
        '/support/:id',
        { id: string },
        { id: string }
      >;
      'admin-users': RouteRecordInfo<
        'admin-users',
        '/admin/users',
        Record<never, never>,
        Record<never, never>
      >;
      game: RouteRecordInfo<'game', '/game/:roomId', { roomId: string }, { roomId: string }>;
    };
  }
}

export {};
