import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';

import { client } from '@/boot/colyseus';

export type Difficulty = 1 | 2 | 3;
export type ModerationRequestType = 'answers' | 'tasks';

export interface ContentPackSummary {
  id: string;
  title: string;
  description: string;
  blocked: boolean;
  hasLive: boolean;
  createdBy: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  inCollection?: boolean;
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

export interface TaskSet {
  id: string;
  authorUserId: string;
  coauthorLabels: string[];
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
  changeAuthorId: string;
  revisionId: string;
  status: string;
  type?: ModerationRequestType;
  createdAt?: string | Date;
  updatedAt?: string | Date;
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
  packId: string;
  changeAuthorId: string;
  status: string;
  title: string;
  blocked: boolean;
  type?: ModerationRequestType;
  hasTasksPending?: boolean;
  hasLiveTasks?: boolean;
  updatedAt: string | Date;
}

export type ModerationCycleStatus = 'none' | 'pending' | 'rejected' | 'approved';

export type TaskSetStatusMark = 'none' | 'pending' | 'rejected' | 'needs_moderation' | 'approved';

export interface TypeModerationState {
  status: ModerationCycleStatus;
  requestId: string | null;
  changeAuthorId: string | null;
  isAuthor: boolean;
}

export interface TaskSetMark {
  id: string;
  needsModeration: boolean;
}

export interface StaffTaskSetListItem {
  id: string;
  authorUserId: string;
  coauthorLabels: string[];
  taskCount: number;
  needsModeration: boolean;
  statusMark: TaskSetStatusMark;
}

export interface StaffNestedTasks {
  tasksPending: {
    requestId: string;
    changeAuthorId: string;
    status: string;
    type: string;
  } | null;
  taskSetList?: StaffTaskSetListItem[];
  tasksContent: {
    taskSets: TaskSet[];
    title: string;
  } | null;
  hasLiveTasks: boolean;
}

export interface StaffPreview {
  request: ModerationRequest;
  pack: ContentPackSummary;
  content: PackContent;
  messages: ModerationMessage[];
  nested?: StaffNestedTasks;
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
  'answers_dirty',
  'tasks_need_cards',
  'submit_need_cards',
  'submit_need_tasks',
  'submit_empty_slots',
  'empty_title',
  'empty_card_content',
  'empty_question',
  'empty_body',
  'empty_comment',
  'invalid_difficulty',
  'pack_not_public',
  'pack_not_found',
  'request_not_found',
  'not_pending',
  'not_cancellable',
  'thread_closed',
  'approve_answers_need_live_tasks',
  'not_creator',
  'pack_published',
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

/**
 * Content packs HTTP (catalog / collection / draft / dual submit / moderation / staff).
 * Pages show `error` via q-banner; map codes with contentErrorI18nKey.
 * No badge state for «submit answers» reminders (SC-PACK / D10).
 */
export const useContentStore = defineStore('content', () => {
  const catalog = ref<ContentPackSummary[]>([]);
  const collection = ref<ContentPackSummary[]>([]);
  const pack = ref<ContentPackSummary | null>(null);
  const liveContent = ref<PackContent | null>(null);
  const draft = ref<PackContent | null>(null);
  const answersDirty = ref(false);
  const tasksDirty = ref(false);
  const taskSetMarks = ref<TaskSetMark[]>([]);
  const answersModeration = ref<TypeModerationState>({
    status: 'none',
    requestId: null,
    changeAuthorId: null,
    isAuthor: false,
  });
  const tasksModeration = ref<TypeModerationState>({
    status: 'none',
    requestId: null,
    changeAuthorId: null,
    isAuthor: false,
  });
  const pendingAnswersRequestId = ref<string | null>(null);
  const pendingTasksRequestId = ref<string | null>(null);
  const isAnswersPendingAuthor = ref(false);
  const isTasksPendingAuthor = ref(false);
  /** Compat: either pending answers or tasks request id. */
  const pendingRequestId = ref<string | null>(null);
  const isPendingAuthor = ref(false);
  const moderationRequest = ref<ModerationRequest | null>(null);
  const moderationMessages = ref<ModerationMessage[]>([]);
  const staffPending = ref<StaffPendingItem[]>([]);
  const staffPreview = ref<StaffPreview | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  function emptyModeration(): TypeModerationState {
    return {
      status: 'none',
      requestId: null,
      changeAuthorId: null,
      isAuthor: false,
    };
  }

  function normalizeModeration(raw: unknown): TypeModerationState {
    if (!raw || typeof raw !== 'object') return emptyModeration();
    const m = raw as Partial<TypeModerationState>;
    const status =
      m.status === 'pending' ||
      m.status === 'rejected' ||
      m.status === 'approved' ||
      m.status === 'none'
        ? m.status
        : 'none';
    return {
      status,
      requestId: typeof m.requestId === 'string' ? m.requestId : null,
      changeAuthorId: typeof m.changeAuthorId === 'string' ? m.changeAuthorId : null,
      isAuthor: Boolean(m.isAuthor),
    };
  }

  function applyDraftFlags(data: {
    answersDirty?: boolean;
    tasksDirty?: boolean;
    taskSetMarks?: TaskSetMark[];
    answersModeration?: TypeModerationState;
    tasksModeration?: TypeModerationState;
    pendingAnswersRequestId?: string | null;
    pendingTasksRequestId?: string | null;
    isAnswersPendingAuthor?: boolean;
    isTasksPendingAuthor?: boolean;
    pendingRequestId?: string | null;
    isPendingAuthor?: boolean;
  }) {
    answersDirty.value = Boolean(data.answersDirty);
    if (typeof data.tasksDirty === 'boolean') {
      tasksDirty.value = data.tasksDirty;
    }
    if (Array.isArray(data.taskSetMarks)) {
      taskSetMarks.value = data.taskSetMarks.map((m: TaskSetMark) => ({
        id: m.id,
        needsModeration: Boolean(m.needsModeration),
      }));
    }
    if (data.answersModeration !== undefined) {
      answersModeration.value = normalizeModeration(data.answersModeration);
    }
    if (data.tasksModeration !== undefined) {
      tasksModeration.value = normalizeModeration(data.tasksModeration);
    }
    pendingAnswersRequestId.value = data.pendingAnswersRequestId ?? null;
    pendingTasksRequestId.value = data.pendingTasksRequestId ?? null;
    isAnswersPendingAuthor.value = Boolean(data.isAnswersPendingAuthor);
    isTasksPendingAuthor.value = Boolean(data.isTasksPendingAuthor);
    pendingRequestId.value =
      data.pendingRequestId ?? data.pendingAnswersRequestId ?? data.pendingTasksRequestId ?? null;
    isPendingAuthor.value =
      data.isPendingAuthor !== undefined
        ? Boolean(data.isPendingAuthor)
        : isAnswersPendingAuthor.value || isTasksPendingAuthor.value;
  }

  function clearDraftFlags() {
    answersDirty.value = false;
    tasksDirty.value = false;
    taskSetMarks.value = [];
    answersModeration.value = emptyModeration();
    tasksModeration.value = emptyModeration();
    pendingAnswersRequestId.value = null;
    pendingTasksRequestId.value = null;
    isAnswersPendingAuthor.value = false;
    isTasksPendingAuthor.value = false;
    pendingRequestId.value = null;
    isPendingAuthor.value = false;
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
      return { ok: true, packId };
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadLivePack(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{
        pack: ContentPackSummary;
        content: PackContent;
      }>(`/api/content/packs/${packId}`);
      pack.value = data.pack;
      liveContent.value = data.content;
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      pack.value = null;
      liveContent.value = null;
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
      clearDraftFlags();
      answersDirty.value = true;
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadDraft(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.get<{
        pack: ContentPackSummary;
        draft: PackContent;
        answersDirty?: boolean;
        tasksDirty?: boolean;
        taskSetMarks?: TaskSetMark[];
        answersModeration?: TypeModerationState;
        tasksModeration?: TypeModerationState;
        pendingAnswersRequestId?: string | null;
        pendingTasksRequestId?: string | null;
        isAnswersPendingAuthor?: boolean;
        isTasksPendingAuthor?: boolean;
        pendingRequestId?: string | null;
        isPendingAuthor?: boolean;
      }>(`/api/content/packs/${packId}/draft`);
      pack.value = data.pack;
      draft.value = data.draft;
      applyDraftFlags(data);
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      draft.value = null;
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
        answersDirty?: boolean;
        tasksDirty?: boolean;
        taskSetMarks?: TaskSetMark[];
      }>(`/api/content/packs/${packId}/draft`, {
        body: {
          title: body.title,
          description: body.description,
          answerCards: body.answerCards,
          taskSets: body.taskSets,
        },
      });
      draft.value = data.draft;
      if (typeof data.answersDirty === 'boolean') {
        answersDirty.value = data.answersDirty;
      }
      if (typeof data.tasksDirty === 'boolean') {
        tasksDirty.value = data.tasksDirty;
      }
      if (Array.isArray(data.taskSetMarks)) {
        taskSetMarks.value = data.taskSetMarks.map((m: TaskSetMark) => ({
          id: m.id,
          needsModeration: Boolean(m.needsModeration),
        }));
      }
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

  async function submitAnswers(packId: string) {
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
      }>(`/api/content/packs/${packId}/submit/answers`);
      pendingAnswersRequestId.value = data.request.id;
      isAnswersPendingAuthor.value = true;
      answersDirty.value = false;
      pendingRequestId.value = data.request.id;
      isPendingAuthor.value = true;
      return data.request;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function submitTasks(packId: string) {
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
      }>(`/api/content/packs/${packId}/submit/tasks`);
      pendingTasksRequestId.value = data.request.id;
      isTasksPendingAuthor.value = true;
      tasksDirty.value = false;
      taskSetMarks.value = taskSetMarks.value.map((m) => ({ ...m, needsModeration: false }));
      pendingRequestId.value = data.request.id;
      isPendingAuthor.value = true;
      return data.request;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** @deprecated Use submitAnswers / submitTasks. Kept for compile safety during migration. */
  async function submitPack(packId: string) {
    return submitAnswers(packId);
  }

  async function loadModeration(packId: string, type?: ModerationRequestType) {
    loading.value = true;
    error.value = null;
    try {
      const qs = type === 'answers' || type === 'tasks' ? `?type=${encodeURIComponent(type)}` : '';
      const { data } = await client.http.get<{
        request: ModerationRequest;
        messages: ModerationMessage[];
      }>(`/api/content/packs/${packId}/moderation${qs}`);
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

  async function postModerationMessage(packId: string, body: string, type?: ModerationRequestType) {
    loading.value = true;
    error.value = null;
    try {
      const payload: { body: string; type?: ModerationRequestType } = { body };
      if (type === 'answers' || type === 'tasks') {
        payload.type = type;
      }
      const { data } = await client.http.post<{
        request: ModerationRequest;
        messages: ModerationMessage[];
      }>(`/api/content/packs/${packId}/moderation/messages`, {
        body: payload,
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
      staffPending.value = data?.items ?? [];
    } catch (e) {
      error.value = mapContentError(e);
      staffPending.value = [];
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
      staffPreview.value = data;
      moderationRequest.value = data.request;
      moderationMessages.value = data.messages ?? [];
      pack.value = data.pack;
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      staffPreview.value = null;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function approveRequest(requestId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post<{
        ok: boolean;
        packId: string;
        liveRevisionId: string;
      }>(`/api/content/staff/requests/${requestId}/approve`);
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function rejectRequest(requestId: string, comment: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post(`/api/content/staff/requests/${requestId}/reject`, {
        body: { comment },
      });
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function cancelRequest(requestId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post(`/api/content/staff/requests/${requestId}/cancel`);
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

  /** Creator hard-deletes an unpublished pack (cascade). */
  async function deleteUnpublishedPack(packId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post('/api/content/pack/delete', {
        body: { packId },
      });
      collection.value = collection.value.filter((p) => p.id !== packId);
      if (pack.value?.id === packId) {
        pack.value = null;
      }
      draft.value = null;
      clearDraftFlags();
      return data;
    } catch (e) {
      error.value = mapContentError(e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /** Creator deletes one task set from draft (+ unpublished liveTasks). */
  async function deleteTaskSet(packId: string, taskSetId: string) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await client.http.post('/api/content/task-set/delete', {
        body: { packId, taskSetId },
      });
      if (data?.draft) {
        draft.value = data.draft as PackContent;
        const flags: {
          tasksDirty?: boolean;
          taskSetMarks?: TaskSetMark[];
        } = {};
        if (typeof data.tasksDirty === 'boolean') {
          flags.tasksDirty = data.tasksDirty;
        }
        if (Array.isArray(data.taskSetMarks)) {
          flags.taskSetMarks = data.taskSetMarks as TaskSetMark[];
        }
        applyDraftFlags(flags);
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
    answersDirty,
    tasksDirty,
    taskSetMarks,
    answersModeration,
    tasksModeration,
    pendingAnswersRequestId,
    pendingTasksRequestId,
    isAnswersPendingAuthor,
    isTasksPendingAuthor,
    pendingRequestId,
    isPendingAuthor,
    moderationRequest,
    moderationMessages,
    staffPending,
    staffPreview,
    loading,
    saving,
    error,
    clearError,
    listCatalog,
    listCollection,
    addToCollection,
    removeFromCollection,
    loadLivePack,
    createPack,
    loadDraft,
    saveDraft,
    submitAnswers,
    submitTasks,
    submitPack,
    loadModeration,
    postModerationMessage,
    listStaffPending,
    loadStaffPreview,
    approveRequest,
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
