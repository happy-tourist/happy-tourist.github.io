import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';

import { client } from '@/boot/colyseus';

export const SUPPORT_TOPICS = ['problem', 'suggestion', 'feedback', 'question', 'other'] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export const SUPPORT_STATUSES = [
  'under_review',
  'in_progress',
  'awaiting_response',
  'closed',
] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const USER_ROLES = ['user', 'moderator', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Staff queue status filter (server default `open`). */
export const STAFF_STATUS_FILTERS = ['open', 'closed', 'all'] as const;
export type StaffStatusFilter = (typeof STAFF_STATUS_FILTERS)[number];

export interface SupportTicket {
  id: string;
  authorUserId: string;
  topic: string;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  awaitingSince?: string | Date | null;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  authorUserId: string;
  body: string;
  createdAt: string | Date;
  authorKind: string;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  anonymous: boolean;
  role: string;
  displayName: string | null;
  emailVerified?: boolean;
}

export interface StaffTicketsFilters {
  /** Omit or empty = all topics. */
  topic?: SupportTopic | '';
  /** Default on server is `open`. */
  status?: StaffStatusFilter;
}

function httpErrorCode(e: unknown): string {
  if (!e || typeof e !== 'object') {
    return '';
  }
  const anyErr = e as {
    message?: string;
    data?: { error?: string; message?: string };
  };
  const fromData = anyErr.data?.error ?? anyErr.data?.message;
  if (typeof fromData === 'string' && fromData) {
    return fromData;
  }
  return typeof anyErr.message === 'string' ? anyErr.message : '';
}

/** Map API error codes to i18n keys under `support.errors.*` (page resolves). */
function mapSupportError(e: unknown): string {
  const code = httpErrorCode(e);
  if (code.includes('rate_limit_creates_per_day')) {
    return 'rate_limit_creates_per_day';
  }
  if (code.includes('rate_limit_open_tickets')) {
    return 'rate_limit_open_tickets';
  }
  if (code.includes('rate_limit_messages_per_hour')) {
    return 'rate_limit_messages_per_hour';
  }
  if (code.includes('ticket_closed')) {
    return 'ticket_closed';
  }
  if (code.includes('empty_body')) {
    return 'empty_body';
  }
  if (code.includes('invalid_topic')) {
    return 'invalid_topic';
  }
  if (
    code.includes('staff_required') ||
    code.includes('admin_required') ||
    code.includes('forbidden')
  ) {
    return 'forbidden';
  }
  return e instanceof Error ? e.message : String(e);
}

/** Map store error codes to i18n keys (pages call `$t`). */
export function supportErrorI18nKey(
  code: string | null,
):
  | 'support.errors.rate_limit_creates_per_day'
  | 'support.errors.rate_limit_open_tickets'
  | 'support.errors.rate_limit_messages_per_hour'
  | 'support.errors.ticket_closed'
  | 'support.errors.empty_body'
  | 'support.errors.invalid_topic'
  | 'support.errors.forbidden'
  | null {
  switch (code) {
    case 'rate_limit_creates_per_day':
      return 'support.errors.rate_limit_creates_per_day';
    case 'rate_limit_open_tickets':
      return 'support.errors.rate_limit_open_tickets';
    case 'rate_limit_messages_per_hour':
      return 'support.errors.rate_limit_messages_per_hour';
    case 'ticket_closed':
      return 'support.errors.ticket_closed';
    case 'empty_body':
      return 'support.errors.empty_body';
    case 'invalid_topic':
      return 'support.errors.invalid_topic';
    case 'forbidden':
      return 'support.errors.forbidden';
    default:
      return null;
  }
}

/**
 * Support + admin HTTP (author / staff / admin).
 * Pages show `error` via q-banner; map rate-limit codes with i18n.
 */
export const useSupportStore = defineStore('support', () => {
  const tickets = ref<SupportTicket[]>([]);
  const staffTickets = ref<SupportTicket[]>([]);
  const ticket = ref<SupportTicket | null>(null);
  const messages = ref<SupportMessage[]>([]);
  const adminUsers = ref<AdminUserRow[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function listOwnTickets() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{ tickets: SupportTicket[] }>('/api/support/tickets');
      tickets.value = data?.tickets ?? [];
    } catch (e) {
      error.value = mapSupportError(e);
      tickets.value = [];
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createTicket(topic: SupportTopic, body: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ticket: SupportTicket;
        messages: SupportMessage[];
      }>('/api/support/tickets', {
        body: { topic, body },
      });
      ticket.value = data.ticket;
      messages.value = data.messages ?? [];
      return data.ticket;
    } catch (e) {
      error.value = mapSupportError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadTicket(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{
        ticket: SupportTicket;
        messages: SupportMessage[];
      }>(`/api/support/tickets/${id}`);
      ticket.value = data.ticket;
      messages.value = data.messages ?? [];
      return data;
    } catch (e) {
      error.value = mapSupportError(e);
      ticket.value = null;
      messages.value = [];
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function postMessage(id: string, body: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ticket: SupportTicket;
        messages: SupportMessage[];
      }>(`/api/support/tickets/${id}/messages`, {
        body: { body },
      });
      ticket.value = data.ticket;
      messages.value = data.messages ?? [];
      return data;
    } catch (e) {
      error.value = mapSupportError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function closeTicket(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{ ticket: SupportTicket }>(
        `/api/support/tickets/${id}/close`,
      );
      ticket.value = data.ticket;
      return data.ticket;
    } catch (e) {
      error.value = mapSupportError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function listStaffTickets(filters: StaffTicketsFilters = {}) {
    loading.value = true;
    error.value = null;
    try {
      const query: { topic?: string; status?: StaffStatusFilter } = {};
      if (filters.topic) {
        query.topic = filters.topic;
      }
      if (filters.status) {
        query.status = filters.status;
      }
      const { data } = await client.http.get<{ tickets: SupportTicket[] }>(
        '/api/support/staff/tickets',
        { query },
      );
      staffTickets.value = data?.tickets ?? [];
    } catch (e) {
      error.value = mapSupportError(e);
      staffTickets.value = [];
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function takeTicket(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{ ticket: SupportTicket }>(
        `/api/support/tickets/${id}/take`,
      );
      ticket.value = data.ticket;
      return data.ticket;
    } catch (e) {
      error.value = mapSupportError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function setStatus(id: string, status: SupportStatus) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{ ticket: SupportTicket }>(
        `/api/support/tickets/${id}/status`,
        { body: { status } },
      );
      ticket.value = data.ticket;
      return data.ticket;
    } catch (e) {
      error.value = mapSupportError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function listAdminUsers() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{ users: AdminUserRow[] }>('/api/admin/users');
      adminUsers.value = data?.users ?? [];
    } catch (e) {
      error.value = mapSupportError(e);
      adminUsers.value = [];
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function setUserRole(userId: string, role: UserRole) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{ user: AdminUserRow }>(
        `/api/admin/users/${userId}/role`,
        { body: { role } },
      );
      const updated = data.user;
      if (updated) {
        adminUsers.value = adminUsers.value.map((u) => (u.id === updated.id ? updated : u));
      }
      return updated;
    } catch (e) {
      error.value = mapSupportError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return {
    tickets,
    staffTickets,
    ticket,
    messages,
    adminUsers,
    loading,
    error,
    clearError,
    listOwnTickets,
    createTicket,
    loadTicket,
    postMessage,
    closeTicket,
    listStaffTickets,
    takeTicket,
    setStatus,
    listAdminUsers,
    setUserRole,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSupportStore, import.meta.hot));
}
