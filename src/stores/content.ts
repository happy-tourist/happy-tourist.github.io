import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';

import { client } from '@/boot/colyseus';

export type Difficulty = 1 | 2 | 3;
/** API request types after simplify-content-pack-editing (D2). */
export type ModerationRequestType = 'pack' | 'task_set' | 'map';

/** Unified list row status from GET /api/content/packs (SC-PACK-148…150). */
export type PackListModerationStatus =
  'in_catalog' | 'draft' | 'pending' | 'needs_revision' | 'unpublished';

export interface ContentPackSummary {
  id: string;
  title: string;
  description: string;
  blocked: boolean;
  hasLive: boolean;
  /** Soft-unpublished when hasLive && !inCatalog (SC-PACK-120…). */
  inCatalog?: boolean;
  createdBy: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  /** Legacy; collection product paths removed (SC-PACK-164). */
  inCollection?: boolean;
  /** Caller-facing list status (SC-PACK-148…150). */
  moderationStatus?: PackListModerationStatus | null;
  isMine?: boolean;
  isContributor?: boolean;
  isFavorite?: boolean;
}

export interface AnswerCard {
  id: string;
  content: string;
  description: string;
  position?: number;
}

export interface TaskSlot {
  id: string;
  answerCardId: string | null;
  position?: number;
}

export interface ContentTask {
  id: string;
  question: string;
  difficulty: Difficulty;
  slots: TaskSlot[];
}

/** Per-set mark on live/editor payload for set author + staff (SC-PACK-171…174). */
export type TaskSetModerationStatus = 'pending' | 'needs_revision' | 'draft' | 'live' | null;

export interface TaskSet {
  id: string;
  authorUserId: string;
  /** D18 / SC-PACK-135: displayName else email local-part. */
  authorDisplayName?: string;
  coauthorLabels: string[];
  /** Soft-unpublished when false (SC-PACK-131/132). Default true. */
  inCatalog?: boolean;
  /**
   * Caller-facing set status (SC-PACK-171…174 / D10).
   * Visible to that set's author and staff; null for others (incl. pack creator).
   */
  moderationStatus?: TaskSetModerationStatus;
  tasks: ContentTask[];
}

export interface PackContent {
  revisionId?: string;
  packId?: string;
  title: string;
  description: string;
  answerCards: AnswerCard[];
  taskSets: TaskSet[];
}

export interface ModerationRequest {
  id: string;
  packId: string;
  mapId?: string | null;
  changeAuthorId: string;
  revisionId: string;
  status: string;
  type?: string;
  /** Staff take holder (SC-PACK-161…163 / SC-MAP-38/39). */
  takenBy?: string | null;
  takenAt?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/** Edit lock TTL / moderation take TTL (5 min) — mirror server EDIT_LOCK_TTL_MS. */
export const CONTENT_LOCK_TTL_MS = 5 * 60 * 1000;

export type PackEditorKind = 'creator' | 'task_set_author';

export function moderationTakeHeldBy(
  req: { takenBy?: string | null; takenAt?: string | Date | null } | null | undefined,
  userId: string | null | undefined,
): boolean {
  if (!req?.takenBy || !userId || req.takenBy !== userId) return false;
  if (!req.takenAt) return false;
  const t = req.takenAt instanceof Date ? req.takenAt.getTime() : new Date(req.takenAt).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= CONTENT_LOCK_TTL_MS;
}

export interface ModerationMessage {
  id: string;
  requestId: string;
  authorUserId: string;
  authorKind: string;
  body: string;
  createdAt: string | Date;
}

export interface StaffPendingItem {
  requestId: string;
  packId: string | null;
  mapId?: string | null;
  changeAuthorId: string;
  status: string;
  title: string;
  blocked?: boolean;
  type?: string;
  taskSetCount?: number;
  cardCount?: number;
  players?: number;
  touristsPerPlayer?: number;
  grid?: string;
  authorDisplayName?: string;
  takenBy?: string | null;
  takenAt?: string | Date | null;
  updatedAt: string | Date;
}

/** Author «На модерации» row — open pending | needs_revision. */
export interface MyModerationItem {
  requestId: string;
  packId: string | null;
  mapId?: string | null;
  type: string;
  status: string;
  title: string;
  players?: number;
  touristsPerPlayer?: number;
  grid?: string;
  updatedAt: string | Date;
}

export type ModerationCycleStatus =
  'none' | 'pending' | 'needs_revision' | 'rejected' | 'approved' | 'cancelled';

export type TaskSetStatusMark =
  | 'none'
  | 'pending'
  | 'rejected'
  | 'needs_revision'
  | 'needs_moderation'
  | 'approved'
  | 'published';

export interface TypeModerationState {
  status: ModerationCycleStatus;
  requestId: string | null;
  changeAuthorId: string | null;
  isAuthor: boolean;
}

export interface MapStaffContent {
  grid: string;
  players: number;
  touristsPerPlayer: number;
}

export interface MapStaffSummary {
  id: string;
  createdBy: string;
  authorDisplayName?: string;
  hasLive: boolean;
  inCatalog: boolean;
  players: number;
  touristsPerPlayer: number;
  grid: string;
}

export interface StaffPreview {
  request: ModerationRequest;
  /** Present for pack | task_set requests. */
  pack?: ContentPackSummary;
  /** Present for map requests (SC-MAP-14). */
  map?: MapStaffSummary;
  content: PackContent | MapStaffContent;
  messages: ModerationMessage[];
  canApprove?: boolean;
}

export interface EditLockSnapshot {
  lockedBy: string | null;
  lockedAt: string | null;
  expiresAt: string | null;
}

/**
 * SC-PACK-115 / D3: staff Edit session spans cards editor ↔ task-set editor
 * for the same pack — do not release lock on that navigation.
 */
export function isStaffEditSessionNavigation(
  to: { name?: string | symbol | null; params?: Record<string, unknown> },
  packId: string,
): boolean {
  if (!packId) return false;
  const raw = to.params?.id;
  const toId = typeof raw === 'string' ? raw : Array.isArray(raw) ? String(raw[0] ?? '') : '';
  if (toId !== packId) return false;
  return to.name === 'content-pack-edit' || to.name === 'content-pack-tasks';
}

export interface AddTaskSetState {
  pack: ContentPackSummary;
  liveCards: AnswerCard[];
  draft: { title: string; description: string; taskSets: TaskSet[] };
  pendingRequestId: string | null;
  moderationStatus: string | null;
  foreignPending: boolean;
  stagedRevisionId?: string | null;
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
  'not_in_collection',
  'pack_blocked',
  'pack_pending_lock',
  'pack_pending_other',
  'task_set_pending_other',
  'answers_dirty',
  'tasks_need_cards',
  'submit_need_cards',
  'submit_need_tasks',
  'submit_need_task_sets',
  'submit_empty_slots',
  'empty_title',
  'empty_card_content',
  'empty_question',
  'empty_body',
  'empty_comment',
  'invalid_difficulty',
  'pack_not_public',
  'pack_unpublished',
  'last_published_task_set',
  'pack_not_found',
  'request_not_found',
  'not_pending',
  'not_approvable',
  'not_cancellable',
  'thread_closed',
  'not_creator',
  'pack_published',
  'task_set_not_found',
  'edit_locked',
  'edit_lock_required',
  'author_request_open',
  'moderation_taken',
  'moderation_take_required',
  'no_working_copy',
  'use_submit_pack',
  'use_submit_add_task_set',
  'approve_need_task_sets',
  'approve_need_cards',
  'forbidden',
  'unauthenticated',
] as const;

/** Map API error codes to i18n keys under `content.errors.*` (page resolves). */
function mapContentError(e: unknown): string {
  const code = httpErrorCode(e);
  for (const k of KNOWN_ERROR_CODES) {
    if (code.includes(k)) {
      return k;
    }
  }
  return e instanceof Error ? e.message : String(e);
}

export function contentErrorI18nKey(code: string | null): `content.errors.${string}` | null {
  if (!code) return null;
  for (const k of KNOWN_ERROR_CODES) {
    if (code === k) {
      return `content.errors.${k}`;
    }
  }
  return null;
}

/** Local temp id for new cards/tasks/slots before first save. */
export function newLocalId(prefix = 'local'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Task ids whose slots currently reference `cardId` (pre-cascade snapshot). */
export function taskIdsReferencingCard(content: PackContent, cardId: string): string[] {
  const out: string[] = [];
  for (const ts of content.taskSets) {
    for (const task of ts.tasks) {
      if (task.slots.some((s) => s.answerCardId === cardId)) {
        out.push(task.id);
      }
    }
  }
  return out;
}

function findTaskInContent(content: PackContent, taskId: string): ContentTask | null {
  for (const ts of content.taskSets) {
    const task = ts.tasks.find((t) => t.id === taskId);
    if (task) return task;
  }
  return null;
}

function normalizeRequestType(raw: unknown): string {
  if (raw === 'task_set' || raw === 'tasks') return 'task_set';
  if (raw === 'pack' || raw === 'answers') return 'pack';
  if (raw === 'map') return 'map';
  return typeof raw === 'string' ? raw : 'pack';
}

/**
 * Content packs HTTP: working copy, unified submit, add-task-set, staff lock/save.
 * Pages show `error` via q-banner; map codes with contentErrorI18nKey.
 */
export const useContentStore = defineStore('content', () => {
  const catalog = ref<ContentPackSummary[]>([]);
  const collection = ref<ContentPackSummary[]>([]);
  const pack = ref<ContentPackSummary | null>(null);
  const liveContent = ref<PackContent | null>(null);
  /** Working copy / staff edit payload (API still uses `draft` field name). */
  const draft = ref<PackContent | null>(null);
  const cascadeGapTaskIds = ref<string[]>([]);
  const pendingRequestId = ref<string | null>(null);
  const isPendingAuthor = ref(false);
  const moderationStatus = ref<string | null>(null);
  /** Compat aliases used by older page helpers. */
  const pendingAnswersAuthorId = ref<string | null>(null);
  const pendingTasksAuthorId = ref<string | null>(null);
  const pendingPackAuthorId = ref<string | null>(null);
  const pendingTaskSetAuthorId = ref<string | null>(null);
  const moderationRequest = ref<ModerationRequest | null>(null);
  const moderationMessages = ref<ModerationMessage[]>([]);
  const staffPending = ref<StaffPendingItem[]>([]);
  const staffPreview = ref<StaffPreview | null>(null);
  const myModeration = ref<MyModerationItem[]>([]);
  const addTaskSet = ref<AddTaskSetState | null>(null);
  const editLock = ref<EditLockSnapshot | null>(null);
  const staffEditTarget = ref<'live' | 'working' | null>(null);
  /** Creator vs task-set-author working-copy edit (SC-PACK-156…159). */
  const editorKind = ref<PackEditorKind | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  function clearWorkingFlags() {
    cascadeGapTaskIds.value = [];
    pendingRequestId.value = null;
    isPendingAuthor.value = false;
    moderationStatus.value = null;
    editorKind.value = null;
  }

  /** Drop cascade yellow when gaps are filled or the task is gone. */
  function pruneCascadeGaps(draftContent: PackContent | null) {
    if (!draftContent) {
      cascadeGapTaskIds.value = [];
      return;
    }
    cascadeGapTaskIds.value = cascadeGapTaskIds.value.filter((id) => {
      const task = findTaskInContent(draftContent, id);
      return Boolean(task?.slots.some((s) => !s.answerCardId));
    });
  }

  function markCascadeGaps(taskIds: string[], draftContent: PackContent) {
    const next = new Set(cascadeGapTaskIds.value);
    for (const id of taskIds) {
      const task = findTaskInContent(draftContent, id);
      if (task?.slots.some((s) => !s.answerCardId)) {
        next.add(id);
      }
    }
    cascadeGapTaskIds.value = [...next];
    pruneCascadeGaps(draftContent);
  }

  function taskHasCascadeGap(taskId: string): boolean {
    return cascadeGapTaskIds.value.includes(taskId);
  }

  function taskSetHasCascadeGap(taskSet: TaskSet): boolean {
    return taskSet.tasks.some((t) => cascadeGapTaskIds.value.includes(t.id));
  }

  async function listCatalog() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{ packs: ContentPackSummary[] }>('/api/content/packs');
      catalog.value = data?.packs ?? [];
    } catch (e) {
      error.value = mapContentError(e);
      catalog.value = [];
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function listCollection() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{ packs: ContentPackSummary[] }>(
        '/api/content/collection',
      );
      collection.value = data?.packs ?? [];
    } catch (e) {
      error.value = mapContentError(e);
      collection.value = [];
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function addToCollection(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      await client.http.post('/api/content/collection', {
        body: { packId },
      });
      if (pack.value?.id === packId) {
        pack.value = { ...pack.value, inCollection: true };
      }
      return { ok: true, packId };
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function removeFromCollection(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      await client.http.post('/api/content/collection/remove', {
        body: { packId },
      });
      collection.value = collection.value.filter((p) => p.id !== packId);
      if (pack.value?.id === packId) {
        pack.value = { ...pack.value, inCollection: false };
      }
      return { ok: true, packId };
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function patchFavorite(packId: string, isFavorite: boolean) {
    catalog.value = catalog.value.map((p) => (p.id === packId ? { ...p, isFavorite } : p));
    collection.value = collection.value.map((p) => (p.id === packId ? { ...p, isFavorite } : p));
    if (pack.value?.id === packId) {
      pack.value = { ...pack.value, isFavorite };
    }
  }

  /** Star in-catalog pack (SC-PACK-154); registered non-anonymous only. */
  async function starPack(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        packId: string;
        isFavorite: boolean;
      }>(`/api/content/packs/${packId}/favorite`, { body: {} });
      patchFavorite(packId, data?.isFavorite ?? true);
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Unstar pack (SC-PACK-154). */
  async function unstarPack(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        packId: string;
        isFavorite: boolean;
      }>(`/api/content/packs/${packId}/unfavorite`, { body: {} });
      patchFavorite(packId, data?.isFavorite ?? false);
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Staff soft-hide from public catalog (SC-PACK-120). Keeps live payload. */
  async function unpublishPack(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        packId: string;
        inCatalog: boolean;
      }>(`/api/content/packs/${packId}/unpublish`, { body: {} });
      const patch = { inCatalog: false as const };
      catalog.value = catalog.value.map((p) => (p.id === packId ? { ...p, ...patch } : p));
      collection.value = collection.value.map((p) => (p.id === packId ? { ...p, ...patch } : p));
      if (pack.value?.id === packId) {
        pack.value = { ...pack.value, ...patch };
      }
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Staff restore catalog visibility without moderation (SC-PACK-123). */
  async function republishPack(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        packId: string;
        inCatalog: boolean;
      }>(`/api/content/packs/${packId}/republish`, { body: {} });
      const patch = { inCatalog: true as const };
      catalog.value = catalog.value.map((p) => (p.id === packId ? { ...p, ...patch } : p));
      collection.value = collection.value.map((p) => (p.id === packId ? { ...p, ...patch } : p));
      if (pack.value?.id === packId) {
        pack.value = { ...pack.value, ...patch };
      }
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Staff soft-hide a live task set (SC-PACK-131). Rejects last published set. */
  async function unpublishTaskSet(packId: string, taskSetId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        packId: string;
        taskSetId: string;
        inCatalog: boolean;
      }>('/api/content/task-set/unpublish', { body: { packId, taskSetId } });
      patchTaskSetInCatalog(packId, taskSetId, false);
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Staff restore a soft-hidden task set without moderation (SC-PACK-132). */
  async function republishTaskSet(packId: string, taskSetId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        packId: string;
        taskSetId: string;
        inCatalog: boolean;
      }>('/api/content/task-set/republish', { body: { packId, taskSetId } });
      patchTaskSetInCatalog(packId, taskSetId, true);
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function patchTaskSetInCatalog(packId: string, taskSetId: string, inCatalog: boolean) {
    const patchSet = (sets: TaskSet[] | undefined) => {
      if (!sets) return sets;
      return sets.map((ts) => (ts.id === taskSetId ? { ...ts, inCatalog } : ts));
    };
    if (liveContent.value && pack.value?.id === packId) {
      liveContent.value = {
        ...liveContent.value,
        taskSets: patchSet(liveContent.value.taskSets) ?? [],
      };
    }
    if (draft.value && pack.value?.id === packId) {
      draft.value = {
        ...draft.value,
        taskSets: patchSet(draft.value.taskSets) ?? [],
      };
    }
  }

  async function loadLivePack(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{
        pack: ContentPackSummary;
        content: PackContent;
        pendingPackAuthorId?: string | null;
        pendingTaskSetAuthorId?: string | null;
        pendingAnswersAuthorId?: string | null;
        pendingTasksAuthorId?: string | null;
      }>(`/api/content/packs/${packId}`);
      const fromList = catalog.value.find((p) => p.id === packId);
      pack.value = {
        ...data.pack,
        isFavorite: data.pack.isFavorite ?? fromList?.isFavorite ?? false,
        moderationStatus: data.pack.moderationStatus ?? fromList?.moderationStatus ?? null,
        isMine: data.pack.isMine ?? fromList?.isMine,
        isContributor: data.pack.isContributor ?? fromList?.isContributor,
      };
      liveContent.value = data.content;
      pendingPackAuthorId.value =
        typeof data.pendingPackAuthorId === 'string'
          ? data.pendingPackAuthorId
          : typeof data.pendingAnswersAuthorId === 'string'
            ? data.pendingAnswersAuthorId
            : null;
      pendingTaskSetAuthorId.value =
        typeof data.pendingTaskSetAuthorId === 'string'
          ? data.pendingTaskSetAuthorId
          : typeof data.pendingTasksAuthorId === 'string'
            ? data.pendingTasksAuthorId
            : null;
      pendingAnswersAuthorId.value = pendingPackAuthorId.value;
      pendingTasksAuthorId.value = pendingTaskSetAuthorId.value;
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      pack.value = null;
      liveContent.value = null;
      pendingPackAuthorId.value = null;
      pendingTaskSetAuthorId.value = null;
      pendingAnswersAuthorId.value = null;
      pendingTasksAuthorId.value = null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createPack(title: string, description = '') {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        pack: ContentPackSummary;
        draft: PackContent;
      }>('/api/content/packs', {
        body: { title, description },
      });
      pack.value = data.pack;
      draft.value = data.draft;
      clearWorkingFlags();
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Creator / task-set-author working copy (incl. post-publish re-edit SC-PACK-156…159). */
  async function loadDraft(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{
        pack: ContentPackSummary;
        draft: PackContent;
        pendingRequestId?: string | null;
        isPendingAuthor?: boolean;
        moderationStatus?: string | null;
        editorKind?: PackEditorKind | null;
      }>(`/api/content/packs/${packId}/draft`);
      pack.value = data.pack;
      draft.value = data.draft;
      pendingRequestId.value = data.pendingRequestId ?? null;
      isPendingAuthor.value = Boolean(data.isPendingAuthor);
      moderationStatus.value = data.moderationStatus ?? null;
      editorKind.value =
        data.editorKind === 'creator' || data.editorKind === 'task_set_author'
          ? data.editorKind
          : null;
      pruneCascadeGaps(data.draft);
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      draft.value = null;
      editorKind.value = null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function saveDraft(packId: string, body: PackContent, opts?: { quiet?: boolean }) {
    const quiet = Boolean(opts?.quiet);
    if (quiet) {
      saving.value = true;
    } else {
      loading.value = true;
    }
    error.value = null;
    try {
      const { data } = await client.http.post<{
        draft: PackContent;
      }>(`/api/content/packs/${packId}/draft`, {
        body: {
          title: body.title,
          description: body.description,
          answerCards: body.answerCards,
          taskSets: body.taskSets,
        },
      });
      draft.value = data.draft;
      pruneCascadeGaps(data.draft);
      return data.draft;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      if (quiet) {
        saving.value = false;
      } else {
        loading.value = false;
      }
    }
  }

  /** Unified first-publish submit (SC-PACK-102). */
  async function submitPack(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        request: {
          id: string;
          packId: string;
          status: string;
          changeAuthorId: string;
          type?: string;
        };
      }>(`/api/content/packs/${packId}/submit`);
      pendingRequestId.value = data.request.id;
      isPendingAuthor.value = true;
      moderationStatus.value = data.request.status;
      return data.request;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadAddTaskSet(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<AddTaskSetState>(
        `/api/content/packs/${packId}/add-task-set`,
      );
      addTaskSet.value = data;
      pack.value = data.pack;
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      addTaskSet.value = null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function saveAddTaskSet(
    packId: string,
    body: { title?: string; description?: string; taskSets: TaskSet[] },
    opts?: { quiet?: boolean },
  ) {
    const quiet = Boolean(opts?.quiet);
    if (quiet) {
      saving.value = true;
    } else {
      loading.value = true;
    }
    error.value = null;
    try {
      const { data } = await client.http.post<{
        draft: { title: string; description: string; taskSets: TaskSet[] };
        pendingRequestId?: string | null;
        moderationStatus?: string | null;
        stagedRevisionId?: string | null;
      }>(`/api/content/packs/${packId}/add-task-set`, {
        body: {
          title: body.title,
          description: body.description,
          taskSets: body.taskSets,
        },
      });
      if (addTaskSet.value) {
        addTaskSet.value = {
          ...addTaskSet.value,
          draft: data.draft,
          pendingRequestId: data.pendingRequestId ?? null,
          moderationStatus: data.moderationStatus ?? null,
          stagedRevisionId: data.stagedRevisionId ?? addTaskSet.value.stagedRevisionId ?? null,
        };
      }
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      if (quiet) {
        saving.value = false;
      } else {
        loading.value = false;
      }
    }
  }

  async function submitAddTaskSet(
    packId: string,
    body?: {
      title?: string;
      description?: string;
      taskSets?: TaskSet[];
      stagedRevisionId?: string;
    },
  ) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        request: {
          id: string;
          packId: string;
          status: string;
          changeAuthorId: string;
          type?: string;
        };
      }>(`/api/content/packs/${packId}/add-task-set/submit`, {
        body: body ?? {},
      });
      if (addTaskSet.value) {
        addTaskSet.value = {
          ...addTaskSet.value,
          pendingRequestId: data.request.id,
          moderationStatus: data.request.status,
        };
      }
      return data.request;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function acquireEditLock(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        lock: EditLockSnapshot;
      }>(`/api/content/packs/${packId}/edit-lock`);
      editLock.value = data.lock;
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function refreshEditLock(packId: string) {
    try {
      const { data } = await client.http.get<{
        lock: EditLockSnapshot;
        heldByMe: boolean;
      }>(`/api/content/packs/${packId}/edit-lock`);
      editLock.value = data.lock;
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    }
  }

  async function releaseEditLock(packId: string) {
    try {
      await client.http.post(`/api/content/packs/${packId}/edit-unlock`);
      editLock.value = null;
      staffEditTarget.value = null;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    }
  }

  /** Staff editor payload (requires lock). */
  async function loadStaffEdit(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{
        pack: ContentPackSummary;
        content: PackContent;
        target: 'live' | 'working';
        lock: EditLockSnapshot;
      }>(`/api/content/packs/${packId}/staff-edit`);
      pack.value = data.pack;
      draft.value = data.content;
      staffEditTarget.value = data.target;
      editLock.value = data.lock;
      pruneCascadeGaps(data.content);
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      draft.value = null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function staffSavePack(packId: string, body: PackContent, opts?: { quiet?: boolean }) {
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
        content: PackContent;
        moderationRequestCreated: boolean;
        target: 'live' | 'working';
      }>(`/api/content/packs/${packId}/staff-save`, {
        body: {
          title: body.title,
          description: body.description,
          answerCards: body.answerCards,
          taskSets: body.taskSets,
        },
      });
      draft.value = data.content;
      staffEditTarget.value = data.target;
      pruneCascadeGaps(data.content);
      return data.content;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      if (quiet) {
        saving.value = false;
      } else {
        loading.value = false;
      }
    }
  }

  async function loadModeration(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{
        request: ModerationRequest;
        messages: ModerationMessage[];
      }>(`/api/content/packs/${packId}/moderation`);
      moderationRequest.value = data.request;
      moderationMessages.value = data.messages ?? [];
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      moderationRequest.value = null;
      moderationMessages.value = [];
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function postModerationMessage(packId: string, body: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        request: ModerationRequest;
        messages: ModerationMessage[];
      }>(`/api/content/packs/${packId}/moderation/messages`, {
        body: { body },
      });
      moderationRequest.value = data.request;
      moderationMessages.value = data.messages ?? [];
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function listStaffPending() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{ items: StaffPendingItem[] }>(
        '/api/content/staff/pending',
      );
      staffPending.value = (data?.items ?? []).map((item: StaffPendingItem) => ({
        ...item,
        type: normalizeRequestType(item.type),
      }));
    } catch (e) {
      error.value = mapContentError(e);
      staffPending.value = [];
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function listMyModeration() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{ items: MyModerationItem[] }>(
        '/api/content/my-moderation',
      );
      myModeration.value = (data?.items ?? []).map((item: MyModerationItem) => ({
        ...item,
        type: normalizeRequestType(item.type),
      }));
    } catch (e) {
      error.value = mapContentError(e);
      myModeration.value = [];
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadStaffPreview(requestId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<StaffPreview>(
        `/api/content/staff/requests/${requestId}`,
      );
      const preview: StaffPreview = {
        ...data,
        request: {
          ...data.request,
          type: normalizeRequestType(data.request.type),
          packId: data.request.packId ?? data.pack?.id ?? '',
          mapId: (data.request as ModerationRequest & { mapId?: string }).mapId ?? data.map?.id,
          takenBy: data.request.takenBy ?? null,
          takenAt: data.request.takenAt ?? null,
        },
      };
      staffPreview.value = preview;
      moderationRequest.value = preview.request;
      moderationMessages.value = data.messages ?? [];
      pack.value = data.pack ?? null;
      return preview;
    } catch (e) {
      error.value = mapContentError(e);
      staffPreview.value = null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Staff take open request before moderating (SC-PACK-161…163 / SC-MAP-38/39). */
  async function takeModerationRequest(requestId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        request: ModerationRequest;
        take?: { takenBy: string | null; takenAt: string | null; expiresAt: string | null };
      }>(`/api/content/staff/requests/${requestId}/take`);
      const req = {
        ...data.request,
        type: normalizeRequestType(data.request.type),
        takenBy: data.request.takenBy ?? data.take?.takenBy ?? null,
        takenAt: data.request.takenAt ?? data.take?.takenAt ?? null,
      };
      if (staffPreview.value?.request.id === requestId) {
        staffPreview.value = {
          ...staffPreview.value,
          request: { ...staffPreview.value.request, ...req },
        };
      }
      moderationRequest.value = req;
      staffPending.value = staffPending.value.map((item) =>
        item.requestId === requestId
          ? { ...item, takenBy: req.takenBy ?? null, takenAt: req.takenAt ?? null }
          : item,
      );
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Staff release take without terminal action. */
  async function releaseModerationRequest(requestId: string) {
    try {
      const { data } = await client.http.post<{ ok: boolean; requestId: string }>(
        `/api/content/staff/requests/${requestId}/release`,
      );
      if (staffPreview.value?.request.id === requestId) {
        staffPreview.value = {
          ...staffPreview.value,
          request: {
            ...staffPreview.value.request,
            takenBy: null,
            takenAt: null,
          },
        };
      }
      if (moderationRequest.value?.id === requestId) {
        moderationRequest.value = {
          ...moderationRequest.value,
          takenBy: null,
          takenAt: null,
        };
      }
      staffPending.value = staffPending.value.map((item) =>
        item.requestId === requestId ? { ...item, takenBy: null, takenAt: null } : item,
      );
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    }
  }

  async function approveRequest(requestId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        packId: string;
        liveRevisionId?: string;
      }>(`/api/content/staff/requests/${requestId}/approve`);
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Staff «Доработать» → needs_revision (SC-PACK-104). */
  async function needsRevisionRequest(requestId: string, comment: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post(
        `/api/content/staff/requests/${requestId}/needs-revision`,
        {
          body: { comment },
        },
      );
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** @deprecated alias — prefer needsRevisionRequest. */
  async function rejectRequest(requestId: string, comment: string) {
    return needsRevisionRequest(requestId, comment);
  }

  /** Author or staff cancel open request (SC-PACK-105 / SC-PACK-175…179: keep working → draft). */
  async function cancelRequest(requestId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post(`/api/content/requests/${requestId}/cancel`);
      const wasAuthorPending = pendingRequestId.value === requestId && isPendingAuthor.value;
      if (pendingRequestId.value === requestId) {
        pendingRequestId.value = null;
        isPendingAuthor.value = false;
        // D11: Cancel keeps working; author-facing status becomes draft.
        moderationStatus.value = 'draft';
      }
      // Only the change author sees draft on the unified list (not staff viewing the pack).
      if (wasAuthorPending) {
        const pid = pack.value?.id;
        if (pid) {
          catalog.value = catalog.value.map((p) =>
            p.id === pid ? { ...p, moderationStatus: 'draft' } : p,
          );
          if (pack.value) {
            pack.value = { ...pack.value, moderationStatus: 'draft' };
          }
        }
      }
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function postStaffMessage(requestId: string, body: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        request: ModerationRequest;
        messages: ModerationMessage[];
      }>(`/api/content/staff/requests/${requestId}/messages`, {
        body: { body },
      });
      if (staffPreview.value) {
        staffPreview.value = {
          ...staffPreview.value,
          request: data.request,
          messages: data.messages ?? [],
        };
      }
      moderationRequest.value = data.request;
      moderationMessages.value = data.messages ?? [];
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteUnpublishedPack(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post('/api/content/pack/delete', {
        body: { packId },
      });
      // SC-PACK-177: hard-delete removes entity — not shown as draft on unified list.
      collection.value = collection.value.filter((p) => p.id !== packId);
      catalog.value = catalog.value.filter((p) => p.id !== packId);
      draft.value = null;
      pack.value = null;
      clearWorkingFlags();
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteTaskSet(packId: string, taskSetId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post('/api/content/task-set/delete', {
        body: { packId, taskSetId },
      });
      if (data?.draft) {
        draft.value = data.draft as PackContent;
      } else if (draft.value) {
        draft.value = {
          ...draft.value,
          taskSets: draft.value.taskSets.filter((ts) => ts.id !== taskSetId),
        };
      }
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return {
    catalog,
    collection,
    pack,
    liveContent,
    draft,
    cascadeGapTaskIds,
    markCascadeGaps,
    pruneCascadeGaps,
    taskHasCascadeGap,
    taskSetHasCascadeGap,
    pendingRequestId,
    isPendingAuthor,
    moderationStatus,
    pendingAnswersAuthorId,
    pendingTasksAuthorId,
    pendingPackAuthorId,
    pendingTaskSetAuthorId,
    moderationRequest,
    moderationMessages,
    staffPending,
    staffPreview,
    myModeration,
    addTaskSet,
    editLock,
    staffEditTarget,
    editorKind,
    loading,
    saving,
    error,
    clearError,
    listCatalog,
    listCollection,
    addToCollection,
    removeFromCollection,
    starPack,
    unstarPack,
    unpublishPack,
    republishPack,
    unpublishTaskSet,
    republishTaskSet,
    loadLivePack,
    createPack,
    loadDraft,
    saveDraft,
    submitPack,
    loadAddTaskSet,
    saveAddTaskSet,
    submitAddTaskSet,
    acquireEditLock,
    refreshEditLock,
    releaseEditLock,
    loadStaffEdit,
    staffSavePack,
    loadModeration,
    postModerationMessage,
    listStaffPending,
    listMyModeration,
    loadStaffPreview,
    takeModerationRequest,
    releaseModerationRequest,
    approveRequest,
    needsRevisionRequest,
    rejectRequest,
    cancelRequest,
    postStaffMessage,
    deleteUnpublishedPack,
    deleteTaskSet,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useContentStore, import.meta.hot));
}
