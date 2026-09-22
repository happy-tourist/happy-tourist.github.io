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
      'content-catalog': RouteRecordInfo<
        'content-catalog',
        '/content/packs',
        Record<never, never>,
        Record<never, never>
      >;
      'content-collection': RouteRecordInfo<
        'content-collection',
        '/content/collection',
        Record<never, never>,
        Record<never, never>
      >;
      'content-pack-new': RouteRecordInfo<
        'content-pack-new',
        '/content/packs/new',
        Record<never, never>,
        Record<never, never>
      >;
      'content-staff': RouteRecordInfo<
        'content-staff',
        '/content/staff',
        Record<never, never>,
        Record<never, never>
      >;
      'content-staff-request': RouteRecordInfo<
        'content-staff-request',
        '/content/staff/requests/:id',
        { id: string },
        { id: string }
      >;
      'content-pack-edit': RouteRecordInfo<
        'content-pack-edit',
        '/content/packs/:id/edit',
        { id: string },
        { id: string }
      >;
      'content-pack-moderation': RouteRecordInfo<
        'content-pack-moderation',
        '/content/packs/:id/moderation',
        { id: string },
        { id: string }
      >;
      'content-pack': RouteRecordInfo<
        'content-pack',
        '/content/packs/:id',
        { id: string },
        { id: string }
      >;
      game: RouteRecordInfo<'game', '/game/:roomId', { roomId: string }, { roomId: string }>;
    };
  }
}

export {};
