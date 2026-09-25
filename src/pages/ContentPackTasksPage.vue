<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">
          {{ taskSetHeading }}
          <q-badge v-if="taskSetSoftUnpublished" color="grey" class="q-ml-sm">
            {{ $t('content.unpublishedByStaff') }}
          </q-badge>
        </div>
        <div class="text-subtitle2 text-muted">
          <template v-if="tasksStatusLabel">
            {{ tasksStatusLabel }}
          </template>
          <template v-else-if="locked">
            {{ tasksGateHint }}
          </template>
          <template v-else>
            {{ $t('content.tasksSubtitle') }}
          </template>
        </div>
      </div>
      <div class="q-gutter-sm">
        <!-- SC-PACK-131/132: set unpublish/republish inside Tasks -->
        <q-btn
          v-if="showSetRepublish"
          flat
          color="primary"
          :label="$t('content.republish')"
          :loading="content.loading"
          @click="onRepublishSet"
        />
        <q-btn
          v-if="showSetUnpublish"
          flat
          color="warning"
          :label="$t('content.unpublish')"
          :loading="content.loading"
          :disable="!canUnpublishThisSet"
          @click="confirmUnpublishSet"
        >
          <q-tooltip v-if="!canUnpublishThisSet">
            {{ $t('content.lastPublishedTaskSetHint') }}
          </q-tooltip>
        </q-btn>
        <!-- SC-PACK-182: live «Вернуться» replaced by App breadcrumbs; editor keeps back to answers -->
        <q-btn
          v-if="!(liveViewMode && !staffMode)"
          flat
          :label="$t('content.backToAnswers')"
          :to="backTarget"
        />
      </div>
    </div>

    <q-banner v-if="content.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
    </q-banner>

    <div v-if="content.loading && !local" class="text-muted">{{ $t('content.loading') }}</div>

    <template v-else-if="local && taskSet">
      <q-card v-if="!viewOnly" flat bordered class="q-mb-md">
        <q-card-section>
          <q-form class="q-gutter-md" @submit.prevent="onAddOrUpdateTask">
            <q-input
              v-model="taskForm.question"
              outlined
              dense
              :label="$t('content.question')"
              :disable="readOnly"
            />
            <q-select
              v-model="taskForm.difficulty"
              :options="difficultyOptions"
              emit-value
              map-options
              outlined
              dense
              :label="$t('content.difficultyLabel')"
              :disable="readOnly"
            />
            <div class="row items-center q-mb-xs">
              <div class="text-caption">{{ $t('content.slots') }}</div>
              <q-space />
              <q-btn
                flat
                dense
                round
                icon="remove"
                :disable="readOnly || taskForm.slots.length <= 1"
                @click="removeFormSlot"
              />
              <q-btn flat dense round icon="add" :disable="readOnly" @click="addFormSlot" />
            </div>
            <div class="row q-gutter-sm q-mb-sm">
              <q-chip
                v-for="slot in taskForm.slots"
                :key="slot.id"
                clickable
                :outline="!slot.answerCardId"
                :color="slot.answerCardId ? 'primary' : 'grey'"
                :disable="readOnly"
                @click="clearFormSlot(slot)"
              >
                {{ slotLabel(slot) }}
              </q-chip>
            </div>
            <div class="text-caption q-mb-xs">{{ $t('content.answerTiles') }}</div>
            <div class="row q-gutter-sm q-mb-md">
              <q-chip
                v-for="card in local.answerCards"
                :key="card.id"
                clickable
                outline
                color="secondary"
                :disable="readOnly || !card.content.trim()"
                @click="fillNextFormSlot(card.id)"
              >
                {{ card.content.trim() || $t('content.untitled') }}
              </q-chip>
            </div>
            <div class="row q-gutter-sm">
              <q-btn
                type="submit"
                color="primary"
                :label="editingTaskId ? $t('content.saveTask') : $t('content.addTask')"
                :loading="content.saving"
                :disable="readOnly || !canSaveQuestion"
              >
                <!-- SC-PACK-119: tooltip instead of jumping caption -->
                <q-tooltip v-if="!canSaveQuestion && taskForm.question.trim()">
                  {{ $t('content.questionNeedsSlot') }}
                </q-tooltip>
              </q-btn>
              <q-btn
                v-if="editingTaskId"
                flat
                :label="$t('content.cancelEditTask')"
                :disable="readOnly"
                @click="resetTaskForm"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>

      <div class="text-h6 q-mb-sm">{{ $t('content.questionsList') }}</div>
      <q-list bordered separator class="rounded-borders q-mb-lg">
        <q-item
          v-for="(task, ti) in taskSet.tasks"
          :key="task.id"
          :class="{ 'cascade-gap-outline': content.taskHasCascadeGap(task.id) }"
        >
          <q-item-section>
            <q-item-label>{{ task.question || $t('content.taskN', { n: ti + 1 }) }}</q-item-label>
            <q-item-label caption>
              {{ $t('content.difficultyLabel') }}:
              {{ $t(`content.difficulty.${task.difficulty}`) }}
            </q-item-label>
            <!-- SC-PACK-84 / D47: explicit answer slots on each task row -->
            <div class="row q-gutter-xs q-mt-xs">
              <q-chip
                v-for="slot in task.slots"
                :key="slot.id"
                dense
                :outline="!slot.answerCardId"
                :color="
                  slot.answerCardId
                    ? 'primary'
                    : content.taskHasCascadeGap(task.id)
                      ? 'warning'
                      : 'grey'
                "
              >
                {{ slotLabel(slot) }}
              </q-chip>
              <span v-if="!task.slots.length" class="text-caption text-muted">
                {{ $t('content.slotEmpty') }}
              </span>
            </div>
          </q-item-section>
          <q-item-section side v-if="!viewOnly">
            <div class="q-gutter-xs">
              <q-btn
                flat
                dense
                icon="edit"
                :aria-label="$t('content.editTask')"
                :disable="readOnly"
                @click="startEditTask(task)"
              />
              <q-btn
                flat
                dense
                icon="delete"
                color="negative"
                :aria-label="$t('content.deleteTask')"
                :disable="readOnly"
                @click="confirmDeleteTask(task.id)"
              />
            </div>
          </q-item-section>
        </q-item>
        <q-item v-if="!taskSet.tasks.length">
          <q-item-section class="text-muted">{{ $t('content.emptyTasks') }}</q-item-section>
        </q-item>
      </q-list>

      <div class="row q-gutter-sm">
        <q-btn
          v-if="canDeleteTaskSet"
          color="negative"
          outline
          :label="$t('content.deleteTaskSet')"
          :loading="content.loading"
          @click="taskSetDeleteConfirmOpen = true"
        />
      </div>
      <!-- SC-PACK-116/D6: staff uses instant-save copy; always reserved (SC-PACK-119) -->
      <div v-if="!viewOnly" class="text-caption text-muted q-mt-sm">
        {{ staffMode ? $t('content.staffEditSubtitle') : $t('content.tasksSaveHint') }}
      </div>
    </template>

    <q-dialog v-model="gateOpen" persistent>
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ gateTitle }}</div>
          <div class="q-mt-sm">{{ gateText }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.catalogNav')" :to="{ name: 'content-catalog' }" />
          <q-btn
            v-if="gateMode === 'login'"
            color="primary"
            :label="$t('content.gateLogin')"
            :to="{ name: 'login', query: { redirect: tasksPath } }"
          />
          <q-btn
            v-else
            color="primary"
            :label="$t('content.gateVerify')"
            :to="{ name: 'account' }"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteConfirmOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ $t('content.deleteTaskTitle') }}</div>
          <div class="q-mt-sm">{{ $t('content.deleteTaskConfirm') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.gateDismiss')" v-close-popup />
          <q-btn color="negative" :label="$t('content.deleteTask')" @click="doDeleteTask" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="taskSetDeleteConfirmOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ $t('content.deleteTaskSetTitle') }}</div>
          <div class="q-mt-sm">{{ $t('content.deleteTaskSetConfirm') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.gateDismiss')" v-close-popup />
          <q-btn
            color="negative"
            :label="$t('content.deleteTaskSet')"
            :loading="content.loading"
            @click="doDeleteTaskSet"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- SC-PACK-132: confirm task-set unpublish -->
    <q-dialog v-model="unpublishSetConfirmOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ $t('content.unpublishTaskSetConfirmTitle') }}</div>
          <div class="q-mt-sm">{{ $t('content.unpublishTaskSetConfirm') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.gateDismiss')" v-close-popup />
          <q-btn
            color="warning"
            :label="$t('content.unpublish')"
            :loading="content.loading"
            @click="doUnpublishSet"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import {
  contentErrorI18nKey,
  isStaffEditSessionNavigation,
  newLocalId,
  useContentStore,
  type ContentTask,
  type Difficulty,
  type PackContent,
  type TaskSlot,
} from '@/stores/content';

const AUTOSAVE_MS = 800;
const LOCK_HEARTBEAT_MS = 60_000;

const auth = useAuthStore();
const content = useContentStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const packId = computed(() => {
  const params = route.params as Record<string, string | string[] | undefined>;
  const raw = params.id;
  return typeof raw === 'string' ? raw : '';
});
const taskSetId = computed(() => {
  const params = route.params as Record<string, string | string[] | undefined>;
  const raw = params.taskSetId;
  return typeof raw === 'string' ? raw : '';
});
const tasksPath = computed(() => `/content/packs/${packId.value}/tasks/${taskSetId.value}`);

const local = ref<PackContent | null>(null);
const gateOpen = ref(false);
const gateMode = ref<'login' | 'verify'>('login');
const editingTaskId = ref<string | null>(null);
const taskForm = reactive<{
  question: string;
  difficulty: Difficulty;
  slots: TaskSlot[];
}>({
  question: '',
  difficulty: 1,
  slots: [{ id: newLocalId('slot'), answerCardId: null }],
});
const deleteConfirmOpen = ref(false);
const pendingDeleteTaskId = ref<string | null>(null);
const taskSetDeleteConfirmOpen = ref(false);
const unpublishSetConfirmOpen = ref(false);
/** SC-PACK-130: live drill-in read-only (not staff Edit session). */
const liveViewMode = ref(false);
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let lockHeartbeat: ReturnType<typeof setInterval> | null = null;
let suppressAutosave = false;

const staffMode = computed(() => Boolean(content.staffEditTarget));

const viewOnly = computed(() => liveViewMode.value && !staffMode.value);

const backTarget = computed(() => {
  if (liveViewMode.value && !staffMode.value) {
    return { name: 'content-pack' as const, params: { id: packId.value } };
  }
  return { name: 'content-pack-edit' as const, params: { id: packId.value } };
});

const taskSetSoftUnpublished = computed(() => taskSet.value?.inCatalog === false);

const showSetUnpublish = computed(
  () =>
    staffMode.value &&
    Boolean(content.pack?.hasLive) &&
    !taskSetSoftUnpublished.value &&
    !content.pack?.blocked,
);

const showSetRepublish = computed(
  () =>
    staffMode.value &&
    Boolean(content.pack?.hasLive) &&
    taskSetSoftUnpublished.value &&
    !content.pack?.blocked,
);

const canUnpublishThisSet = computed(() => {
  if (!local.value) return false;
  return local.value.taskSets.filter((ts) => ts.inCatalog !== false).length > 1;
});

const difficultyOptions = computed(() =>
  ([1, 2, 3] as Difficulty[]).map((value) => ({
    label: t(`content.difficulty.${value}`),
    value,
  })),
);

const gateTitle = computed(() =>
  gateMode.value === 'login' ? t('content.gateLoginTitle') : t('content.gateVerifyTitle'),
);
const gateText = computed(() =>
  gateMode.value === 'login' ? t('content.gateLoginText') : t('content.gateVerifyText'),
);

const errorLabel = computed(() => {
  const key = contentErrorI18nKey(content.error);
  return key ? t(key) : (content.error ?? '');
});

const taskSet = computed(
  () => local.value?.taskSets.find((ts) => ts.id === taskSetId.value) ?? null,
);

/** SC-PACK-135: «Набор заданий {n} от {name}» when set is known. */
const taskSetHeading = computed(() => {
  const sets = local.value?.taskSets ?? [];
  const idx = sets.findIndex((ts) => ts.id === taskSetId.value);
  if (idx < 0) return t('content.tasksTitle');
  const ts = sets[idx]!;
  return t('content.taskSetLabelFrom', {
    n: idx + 1,
    name: ts.authorDisplayName || t('content.authorUser'),
  });
});

const locked = computed(() => Boolean(content.pack?.blocked) || !local.value?.answerCards.length);

const readOnly = computed(
  () => viewOnly.value || Boolean(content.pack?.blocked) || Boolean(gateOpen.value) || locked.value,
);

const tasksGateHint = computed(() => {
  if (!local.value?.answerCards.length) {
    return t('content.tasksNeedCards');
  }
  if (content.pack?.blocked) {
    return t('content.blocked');
  }
  return '';
});

const canDeleteTaskSet = computed(() => {
  if (!content.pack || content.pack.hasLive || staffMode.value) return false;
  const uid = String(auth.user?.id ?? '');
  return Boolean(uid) && content.pack.createdBy === uid;
});

const tasksStatusLabel = computed(() => {
  const status = content.moderationStatus;
  if (status === 'pending') return t('content.taskSetStatusMarks.pending');
  if (status === 'needs_revision' || status === 'rejected') {
    return t('content.taskSetStatusMarks.needs_revision');
  }
  if (content.pack?.hasLive || staffMode.value) {
    return t('content.taskSetStatusMarks.published');
  }
  return '';
});

const hasFilledSlot = computed(() => taskForm.slots.some((s) => Boolean(s.answerCardId)));

const canSaveQuestion = computed(() => Boolean(taskForm.question.trim()) && hasFilledSlot.value);

async function persist(body: PackContent, opts?: { quiet?: boolean }) {
  // SC-PACK-115: staff session always staff-save, never working-copy.
  if (content.staffEditTarget || staffMode.value) {
    return content.staffSavePack(packId.value, body, opts);
  }
  return content.saveDraft(packId.value, body, opts);
}

function checkGate(): boolean {
  if (auth.user?.anonymous) {
    gateMode.value = 'login';
    gateOpen.value = true;
    return false;
  }
  if (auth.needsEmailVerification) {
    gateMode.value = 'verify';
    gateOpen.value = true;
    return false;
  }
  return true;
}

function clearAutosaveTimer() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
}

function stopLockHeartbeat() {
  if (lockHeartbeat) {
    clearInterval(lockHeartbeat);
    lockHeartbeat = null;
  }
}

function startLockHeartbeat() {
  stopLockHeartbeat();
  if (!packId.value || !content.staffEditTarget) return;
  lockHeartbeat = setInterval(() => {
    void content.refreshEditLock(packId.value).catch(() => {
      /* ignore heartbeat errors */
    });
  }, LOCK_HEARTBEAT_MS);
}

function scheduleAutosave() {
  if (suppressAutosave || readOnly.value || !local.value) return;
  clearAutosaveTimer();
  autosaveTimer = setTimeout(() => {
    void flushAutosave();
  }, AUTOSAVE_MS);
}

async function flushAutosave() {
  clearAutosaveTimer();
  if (!local.value || readOnly.value || !packId.value) return;
  try {
    const saved = await persist(local.value, { quiet: true });
    suppressAutosave = true;
    local.value = JSON.parse(JSON.stringify(saved)) as PackContent;
    suppressAutosave = false;
    content.pruneCascadeGaps(local.value);
  } catch {
    suppressAutosave = false;
  }
}

function resetTaskForm() {
  editingTaskId.value = null;
  taskForm.question = '';
  taskForm.difficulty = 1;
  taskForm.slots = [{ id: newLocalId('slot'), answerCardId: null }];
}

function startEditTask(task: ContentTask) {
  editingTaskId.value = task.id;
  taskForm.question = task.question;
  taskForm.difficulty = task.difficulty;
  taskForm.slots = JSON.parse(JSON.stringify(task.slots)) as TaskSlot[];
  if (!taskForm.slots.length) {
    taskForm.slots = [{ id: newLocalId('slot'), answerCardId: null }];
  }
}

function addFormSlot() {
  if (readOnly.value) return;
  taskForm.slots.push({ id: newLocalId('slot'), answerCardId: null });
}

function removeFormSlot() {
  if (readOnly.value || taskForm.slots.length <= 1) return;
  taskForm.slots.pop();
}

function clearFormSlot(slot: TaskSlot) {
  if (readOnly.value) return;
  slot.answerCardId = null;
}

function fillNextFormSlot(cardId: string) {
  if (readOnly.value) return;
  const empty = taskForm.slots.find((s) => !s.answerCardId);
  if (empty) {
    empty.answerCardId = cardId;
  }
}

function slotLabel(slot: TaskSlot) {
  if (!slot.answerCardId || !local.value) {
    return t('content.slotEmpty');
  }
  // SC-PACK-134: resolve card text; never show «заполнен» when card is found with content.
  const card = local.value.answerCards.find((c) => c.id === slot.answerCardId);
  if (card) {
    const text = card.content?.trim();
    if (text) return text;
  }
  return t('content.slotFilled');
}

async function onAddOrUpdateTask() {
  if (!taskSet.value || readOnly.value || !canSaveQuestion.value) return;
  const question = taskForm.question.trim();
  if (!question) return;
  const slots = JSON.parse(JSON.stringify(taskForm.slots)) as TaskSlot[];
  if (!slots.length) {
    slots.push({ id: newLocalId('slot'), answerCardId: null });
  }

  if (editingTaskId.value) {
    const task = taskSet.value.tasks.find((x) => x.id === editingTaskId.value);
    if (task) {
      task.question = question;
      task.difficulty = taskForm.difficulty;
      task.slots = slots;
    }
  } else {
    taskSet.value.tasks.push({
      id: newLocalId('task'),
      question,
      difficulty: taskForm.difficulty,
      slots,
    });
  }
  resetTaskForm();
  await flushAutosave();
}

function confirmDeleteTask(taskId: string) {
  pendingDeleteTaskId.value = taskId;
  deleteConfirmOpen.value = true;
}

function doDeleteTask() {
  if (!taskSet.value || !pendingDeleteTaskId.value) return;
  const idx = taskSet.value.tasks.findIndex((t) => t.id === pendingDeleteTaskId.value);
  if (idx >= 0) {
    taskSet.value.tasks.splice(idx, 1);
    if (editingTaskId.value === pendingDeleteTaskId.value) {
      resetTaskForm();
    }
    scheduleAutosave();
  }
  pendingDeleteTaskId.value = null;
  deleteConfirmOpen.value = false;
}

async function doDeleteTaskSet() {
  if (!canDeleteTaskSet.value || !packId.value || !taskSetId.value) return;
  try {
    await content.deleteTaskSet(packId.value, taskSetId.value);
    taskSetDeleteConfirmOpen.value = false;
    await router.replace({ name: 'content-pack-edit', params: { id: packId.value } });
  } catch {
    /* error in store */
  }
}

async function load() {
  if (!packId.value || !taskSetId.value) return;
  if (!checkGate()) return;
  clearAutosaveTimer();
  stopLockHeartbeat();
  liveViewMode.value = false;
  try {
    let payload: PackContent;
    const forceLiveView = route.query.view === 'live';
    if (content.staffEditTarget) {
      payload = content.draft!;
      startLockHeartbeat();
    } else if (
      !forceLiveView &&
      auth.isStaff &&
      content.pack?.hasLive &&
      content.draft &&
      content.pack.id === packId.value
    ) {
      // Staff already in edit payload (navigated editor → tasks).
      payload = content.draft;
      if (!content.staffEditTarget) {
        await content.acquireEditLock(packId.value);
        await content.loadStaffEdit(packId.value);
        payload = content.draft!;
      }
      startLockHeartbeat();
    } else if (!forceLiveView && content.draft && content.pack?.id === packId.value) {
      // Creator / task-set-author working copy (incl. post-publish SC-PACK-156…158).
      payload = content.draft;
      startLockHeartbeat();
    } else if (forceLiveView || (content.pack?.hasLive && !content.draft)) {
      // SC-PACK-130: live drill-in read-only (or soft-unpublished staff Edit via lock).
      const data = await content.loadLivePack(packId.value);
      payload = data.content;
      liveViewMode.value = true;
    } else {
      const data = await content.loadDraft(packId.value);
      payload = data.draft;
      startLockHeartbeat();
    }
    suppressAutosave = true;
    local.value = JSON.parse(JSON.stringify(payload)) as PackContent;
    suppressAutosave = false;

    if (!local.value.answerCards.length) {
      await router.replace(
        liveViewMode.value
          ? { name: 'content-pack', params: { id: packId.value } }
          : { name: 'content-pack-edit', params: { id: packId.value } },
      );
      return;
    }

    const found = local.value.taskSets.find((ts) => ts.id === taskSetId.value);
    if (!found) {
      await router.replace(
        liveViewMode.value
          ? { name: 'content-pack', params: { id: packId.value } }
          : { name: 'content-pack-edit', params: { id: packId.value } },
      );
      return;
    }

    // SC-PACK-132: soft-unpublished — non-staff cannot enter.
    if (found.inCatalog === false && !staffMode.value && !auth.isStaff) {
      await router.replace({ name: 'content-pack', params: { id: packId.value } });
      return;
    }
    // Soft-unpublished + staff without Edit session: bounce to live (use Edit on row).
    if (found.inCatalog === false && liveViewMode.value && !staffMode.value) {
      await router.replace({ name: 'content-pack', params: { id: packId.value } });
    }
  } catch {
    /* error in store */
  }
}

function confirmUnpublishSet() {
  if (!canUnpublishThisSet.value) return;
  unpublishSetConfirmOpen.value = true;
}

async function doUnpublishSet() {
  if (!packId.value || !taskSetId.value || !local.value) return;
  try {
    await content.unpublishTaskSet(packId.value, taskSetId.value);
    const ts = local.value.taskSets.find((s) => s.id === taskSetId.value);
    if (ts) ts.inCatalog = false;
    unpublishSetConfirmOpen.value = false;
  } catch {
    /* error in store */
  }
}

async function onRepublishSet() {
  if (!packId.value || !taskSetId.value || !local.value) return;
  try {
    await content.republishTaskSet(packId.value, taskSetId.value);
    const ts = local.value.taskSets.find((s) => s.id === taskSetId.value);
    if (ts) ts.inCatalog = true;
  } catch {
    /* error in store */
  }
}

onMounted(load);
watch([packId, taskSetId], load);

/** SC-PACK-115: unlock only when leaving the whole Edit session. */
onBeforeRouteLeave((to) => {
  if (!content.staffEditTarget || !packId.value) return;
  if (isStaffEditSessionNavigation(to, packId.value)) return;
  void content.releaseEditLock(packId.value).catch(() => {
    /* ignore */
  });
});

onBeforeUnmount(() => {
  clearAutosaveTimer();
  stopLockHeartbeat();
});
</script>

<style scoped>
.cascade-gap-outline {
  outline: 2px solid var(--q-warning);
  outline-offset: -2px;
}
</style>
