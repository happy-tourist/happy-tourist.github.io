import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';

import { client } from '@/boot/colyseus';
import type { EditLockSnapshot, ModerationMessage, ModerationRequest } from '@/stores/content';

/** Grid alphabet — matches server MAP_CELL / LAYOUT. */
export const MAP_SIZE = 10;
export const MAP_CELLS = MAP_SIZE * MAP_SIZE;
export const MAP_CELL = {
  hole: '.',
  start: '1',
  task: '*',
  finish: '7',
} as const;
export type MapCell = (typeof MAP_CELL)[keyof typeof MAP_CELL];

export type MapPaintTool = 'start' | 'task' | 'finish';

export interface MapSummary {
  id: string;
  createdBy: string;
  authorDisplayName?: string;
  hasLive: boolean;
  inCatalog: boolean;
  players: number;
  touristsPerPlayer: number;
  grid: string;
  /** Caller-facing list status (SC-MAP-31/32). */
  moderationStatus?: 'in_catalog' | 'draft' | 'pending' | 'needs_revision' | 'unpublished' | null;
  /** Open author request blocks staff Edit (SC-MAP-36); independent of caller's own status. */
  authorRequestOpen?: boolean;
}

export interface MapRevision {
  grid: string;
  players: number;
  touristsPerPlayer: number;
}

export interface MapStaffPreview {
  request: ModerationRequest;
  map: MapSummary;
  content: MapRevision;
  messages: ModerationMessage[];
  canApprove?: boolean;
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

const KNOWN_ERROR_CODES = [
  'email_verified_required',
  'registered_user_required',
  'insufficient_starts',
  'invalid_grid',
  'invalid_players',
  'invalid_tourists_per_player',
  'map_not_public',
  'map_unpublished',
  'map_not_found',
  'map_pending_other',
  'map_published',
  'not_creator',
  'not_pending',
  'not_approvable',
  'not_cancellable',
  'empty_body',
  'empty_comment',
  'edit_locked',
  'edit_lock_required',
  'author_request_open',
  'moderation_taken',
  'moderation_take_required',
  'no_working_copy',
  'request_not_found',
  'thread_closed',
  'forbidden',
  'unauthenticated',
  'not_map_request',
] as const;

function mapMapsError(e: unknown): string {
  const code = httpErrorCode(e);
  for (const k of KNOWN_ERROR_CODES) {
    if (code.includes(k)) {
      return k;
    }
  }
  return e instanceof Error ? e.message : String(e);
}

export function mapsErrorI18nKey(code: string | null): `maps.errors.${string}` | null {
  if (!code) return null;
  for (const k of KNOWN_ERROR_CODES) {
    if (code === k) {
      return `maps.errors.${k}`;
    }
  }
  return null;
}

export function emptyMapGrid(): string {
  return MAP_CELL.hole.repeat(MAP_CELLS);
}

export function countStarts(grid: string): number {
  let n = 0;
  for (const ch of grid) {
    if (ch === MAP_CELL.start) n += 1;
  }
  return n;
}

export function paintToolToCell(tool: MapPaintTool): MapCell {
  if (tool === 'start') return MAP_CELL.start;
  if (tool === 'finish') return MAP_CELL.finish;
  return MAP_CELL.task;
}

/** Toggle same / replace other (SC-MAP-04). */
export function paintCell(grid: string, index: number, tool: MapPaintTool): string {
  if (index < 0 || index >= MAP_CELLS || grid.length !== MAP_CELLS) {
    return grid;
  }
  const next = paintToolToCell(tool);
  const chars = grid.split('');
  chars[index] = chars[index] === next ? MAP_CELL.hole : next;
  return chars.join('');
}

export function clampSeatCount(raw: number): number {
  if (!Number.isFinite(raw)) return 1;
  return Math.min(4, Math.max(1, Math.round(raw)));
}

/**
 * Content maps HTTP: list / create / draft / submit / moderation / staff lock / soft-unpublish.
 * Pages show `error` via q-banner; map codes with mapsErrorI18nKey.
 */
export const useMapsStore = defineStore('maps', () => {
  const list = ref<MapSummary[]>([]);
  const map = ref<MapSummary | null>(null);
  const draft = ref<MapRevision | null>(null);
  const liveContent = ref<MapRevision | null>(null);
  const pendingRequestId = ref<string | null>(null);
  const isPendingAuthor = ref(false);
  const moderationStatus = ref<string | null>(null);
  const moderationRequest = ref<ModerationRequest | null>(null);
  const moderationMessages = ref<ModerationMessage[]>([]);
  const staffPreview = ref<MapStaffPreview | null>(null);
  const editLock = ref<EditLockSnapshot | null>(null);
  const staffEditTarget = ref<'live' | 'working' | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  function clearWorkingFlags() {
    pendingRequestId.value = null;
    isPendingAuthor.value = false;
    moderationStatus.value = null;
  }

  async function listMaps() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{ maps: MapSummary[] }>('/api/content/maps');
      list.value = data?.maps ?? [];
    } catch (e) {
      error.value = mapMapsError(e);
      list.value = [];
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createMap() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        map: MapSummary;
        draft: MapRevision;
      }>('/api/content/maps', { body: {} });
      map.value = data.map;
      draft.value = data.draft;
      clearWorkingFlags();
      return data;
    } catch (e) {
      error.value = mapMapsError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadLiveMap(mapId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{
        map: MapSummary;
        content: MapRevision;
      }>(`/api/content/maps/${mapId}`);
      map.value = data.map;
      liveContent.value = data.content;
      draft.value = null;
      clearWorkingFlags();
      return data;
    } catch (e) {
      error.value = mapMapsError(e);
      map.value = null;
      liveContent.value = null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadDraft(mapId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{
        map: MapSummary;
        draft: MapRevision;
        pendingRequestId?: string | null;
        isPendingAuthor?: boolean;
        moderationStatus?: string | null;
      }>(`/api/content/maps/${mapId}/draft`);
      map.value = data.map;
      draft.value = data.draft;
      liveContent.value = null;
      pendingRequestId.value =
        typeof data.pendingRequestId === 'string' ? data.pendingRequestId : null;
      isPendingAuthor.value = Boolean(data.isPendingAuthor);
      moderationStatus.value =
        typeof data.moderationStatus === 'string' ? data.moderationStatus : null;
      return data;
    } catch (e) {
      error.value = mapMapsError(e);
      draft.value = null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function saveDraft(mapId: string, body: MapRevision, opts?: { quiet?: boolean }) {
    const quiet = Boolean(opts?.quiet);
    if (quiet) {
      saving.value = true;
    } else {
      loading.value = true;
    }
    error.value = null;
    try {
      const { data } = await client.http.post<{ draft: MapRevision }>(
        `/api/content/maps/${mapId}/draft`,
        {
          body: {
            grid: body.grid,
            players: body.players,
            touristsPerPlayer: body.touristsPerPlayer,
          },
        },
      );
      draft.value = data.draft;
      return data.draft;
    } catch (e) {
      error.value = mapMapsError(e);
      throw e;
    } finally {
      if (quiet) {
        saving.value = false;
      } else {
        loading.value = false;
      }
    }
  }

  async function submitMap(mapId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        request: {
          id: string;
          mapId: string;
          status: string;
          changeAuthorId: string;
          type?: string;
        };
      }>(`/api/content/maps/${mapId}/submit`);
      pendingRequestId.value = data.request.id;
      isPendingAuthor.value = true;
      moderationStatus.value = data.request.status;
      return data.request;
    } catch (e) {
      error.value = mapMapsError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadModeration(mapId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{
        request: ModerationRequest;
        messages: ModerationMessage[];
      }>(`/api/content/maps/${mapId}/moderation`);
      moderationRequest.value = data.request;
      moderationMessages.value = data.messages ?? [];
      return data;
    } catch (e) {
      error.value = mapMapsError(e);
      moderationRequest.value = null;
      moderationMessages.value = [];
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function postModerationMessage(mapId: string, body: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        request: ModerationRequest;
        messages: ModerationMessage[];
      }>(`/api/content/maps/${mapId}/moderation/messages`, {
        body: { body },
      });
      moderationRequest.value = data.request;
      moderationMessages.value = data.messages ?? [];
      return data;
    } catch (e) {
      error.value = mapMapsError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function acquireEditLock(mapId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        lock: EditLockSnapshot;
      }>(`/api/content/maps/${mapId}/edit-lock`);
      editLock.value = data.lock;
      return data;
    } catch (e) {
      error.value = mapMapsError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function refreshEditLock(mapId: string) {
    try {
      const { data } = await client.http.get<{
        lock: EditLockSnapshot;
        heldByMe: boolean;
      }>(`/api/content/maps/${mapId}/edit-lock`);
      editLock.value = data.lock;
      return data;
    } catch (e) {
      error.value = mapMapsError(e);
      throw e;
    }
  }

  async function releaseEditLock(mapId: string) {
    try {
      await client.http.post(`/api/content/maps/${mapId}/edit-unlock`);
      editLock.value = null;
      staffEditTarget.value = null;
    } catch (e) {
      error.value = mapMapsError(e);
      throw e;
    }
  }

  async function loadStaffEdit(mapId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{
        map: MapSummary;
        content: MapRevision;
        target: 'live' | 'working';
        lock: EditLockSnapshot;
      }>(`/api/content/maps/${mapId}/staff-edit`);
      map.value = data.map;
      draft.value = data.content;
      staffEditTarget.value = data.target;
      editLock.value = data.lock;
      return data;
    } catch (e) {
      error.value = mapMapsError(e);
      draft.value = null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function staffSaveMap(mapId: string, body: MapRevision, opts?: { quiet?: boolean }) {
    const quiet = Boolean(opts?.quiet);
    if (quiet) {
      saving.value = true;
    } else {
      loading.value = true;
    }
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        content: MapRevision;
        target: 'live' | 'working';
      }>(`/api/content/maps/${mapId}/staff-save`, {
        body: {
          grid: body.grid,
          players: body.players,
          touristsPerPlayer: body.touristsPerPlayer,
        },
      });
      draft.value = data.content;
      staffEditTarget.value = data.target;
      return data.content;
    } catch (e) {
      error.value = mapMapsError(e);
      throw e;
    } finally {
      if (quiet) {
        saving.value = false;
      } else {
        loading.value = false;
      }
    }
  }

  async function unpublishMap(mapId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        mapId: string;
        inCatalog: boolean;
      }>(`/api/content/maps/${mapId}/unpublish`, { body: {} });
      const patch = { inCatalog: false as const };
      list.value = list.value.map((m) => (m.id === mapId ? { ...m, ...patch } : m));
      if (map.value?.id === mapId) {
        map.value = { ...map.value, ...patch };
      }
      return data;
    } catch (e) {
      error.value = mapMapsError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function republishMap(mapId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        mapId: string;
        inCatalog: boolean;
      }>(`/api/content/maps/${mapId}/republish`, { body: {} });
      const patch = { inCatalog: true as const };
      list.value = list.value.map((m) => (m.id === mapId ? { ...m, ...patch } : m));
      if (map.value?.id === mapId) {
        map.value = { ...map.value, ...patch };
      }
      return data;
    } catch (e) {
      error.value = mapMapsError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteUnpublishedMap(mapId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post('/api/content/map/delete', {
        body: { mapId },
      });
      list.value = list.value.filter((m) => m.id !== mapId);
      if (map.value?.id === mapId) {
        map.value = null;
        draft.value = null;
        clearWorkingFlags();
      }
      return data;
    } catch (e) {
      error.value = mapMapsError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Author or staff cancel open map request (shared `/api/content/requests/:id/cancel`). */
  async function cancelRequest(requestId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post(`/api/content/requests/${requestId}/cancel`);
      if (pendingRequestId.value === requestId) {
        clearWorkingFlags();
      }
      return data;
    } catch (e) {
      error.value = mapMapsError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Shared staff queue preview when request type is map (same HTTP as packs). */
  async function loadStaffPreview(requestId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<MapStaffPreview>(
        `/api/content/staff/requests/${requestId}`,
      );
      const preview: MapStaffPreview = {
        ...data,
        request: {
          ...data.request,
          type: data.request.type === 'map' ? 'map' : data.request.type,
        },
      };
      staffPreview.value = preview;
      moderationRequest.value = preview.request;
      moderationMessages.value = data.messages ?? [];
      map.value = data.map;
      return preview;
    } catch (e) {
      error.value = mapMapsError(e);
      staffPreview.value = null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return {
    list,
    map,
    draft,
    liveContent,
    pendingRequestId,
    isPendingAuthor,
    moderationStatus,
    moderationRequest,
    moderationMessages,
    staffPreview,
    editLock,
    staffEditTarget,
    loading,
    saving,
    error,
    clearError,
    listMaps,
    createMap,
    loadLiveMap,
    loadDraft,
    saveDraft,
    submitMap,
    loadModeration,
    postModerationMessage,
    acquireEditLock,
    refreshEditLock,
    releaseEditLock,
    loadStaffEdit,
    staffSaveMap,
    unpublishMap,
    republishMap,
    deleteUnpublishedMap,
    cancelRequest,
    loadStaffPreview,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMapsStore, import.meta.hot));
}
