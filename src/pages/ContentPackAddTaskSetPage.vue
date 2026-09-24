<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.addTaskSetTitle') }}</div>
        <div class="text-subtitle2 text-muted">
          <template v-if="statusLabel">{{ statusLabel }}</template>
          <template v-else>
            {{ content.pack?.title || $t('content.addTaskSetSubtitle') }}
          </template>
        </div>
      </div>
      <div class="q-gutter-sm">
        <q-btn
          flat
          :label="$t('content.backToLive')"
          :to="{ name: 'content-pack', params: { id: packId } }"
        />
      </div>
    </div>

    <q-banner v-if="content.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
    </q-banner>

    <q-banner v-if="state?.foreignPending" dense rounded class="bg-warning text-dark q-mb-md">
      {{ $t('content.addTaskSetForeignPending') }}
    </q-banner>

    <div v-if="content.loading && !local" class="text-muted">{{ $t('content.loading') }}</div>

    <template v-else-if="local">
      <!-- SC-PACK-107: no editable lists of existing cards/sets — only new set. -->
      <div class="text-caption text-muted q-mb-md">{{ $t('content.addTaskSetLiveCardsHint') }}</div>
      <div class="row q-gutter-xs q-mb-lg">
        <q-chip v-for="card in liveCards" :key="card.id" dense outline color="primary">
          {{ card.content }}
        </q-chip>
        <span v-if="!liveCards.length" class="text-muted">{{ $t('content.emptyCards') }}</span>
      </div>

      <q-card flat bordered class="q-mb-md">
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
              <q-btn flat dense icon="add" :disable="readOnly" @click="addFormSlot" />
              <q-btn
                flat
                dense
                icon="remove"
                :disable="readOnly || taskForm.slots.length <= 1"
                @click="removeFormSlot"
              />
            </div>
            <div class="row q-gutter-xs q-mb-sm">
              <q-chip
                v-for="slot in taskForm.slots"
                :key="slot.id"
                dense
                removable
                :outline="!slot.answerCardId"
                :color="slot.answerCardId ? 'primary' : 'grey'"
                @remove="clearFormSlot(slot)"
              >
                {{ slotLabel(slot) }}
              </q-chip>
            </div>
            <div class="text-caption q-mb-xs">{{ $t('content.answerTiles') }}</div>
            <div class="row q-gutter-xs q-mb-md">
              <q-btn
                v-for="card in liveCards"
                :key="card.id"
                dense
                outline
                color="primary"
                :label="card.content"
                :disable="readOnly"
                @click="fillNextFormSlot(card.id)"
              />
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
        <q-item v-for="task in taskSet?.tasks ?? []" :key="task.id">
          <q-item-section>
            <q-item-label>{{ task.question }}</q-item-label>
            <q-item-label caption>
              {{ $t('content.difficultyLabel') }}:
              {{ $t(`content.difficulty.${task.difficulty}`) }}
            </q-item-label>
            <!-- SC-PACK-127 / D11: answer slots on every question row -->
            <div class="row q-gutter-xs q-mt-xs">
              <q-chip
                v-for="slot in task.slots"
                :key="slot.id"
                dense
                :outline="!slot.answerCardId"
                :color="slot.answerCardId ? 'primary' : 'grey'"
              >
                {{ slotLabel(slot) }}
              </q-chip>
              <span v-if="!task.slots.length" class="text-caption text-muted">
                {{ $t('content.slotEmpty') }}
              </span>
            </div>
          </q-item-section>
          <q-item-section side>
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
                @click="removeTask(task.id)"
              />
            </div>
          </q-item-section>
        </q-item>
        <q-item v-if="!taskSet?.tasks.length">
          <q-item-section class="text-muted">{{ $t('content.emptyTasks') }}</q-item-section>
        </q-item>
      </q-list>

      <div class="row q-gutter-sm">
        <q-btn
          color="secondary"
          :label="$t('content.submitModeration')"
          :loading="content.loading"
          :disable="readOnly || !canSubmit"
          @click="onSubmit"
        >
          <!-- SC-PACK-119: tooltip instead of jumping caption -->
          <q-tooltip v-if="!canSubmit">{{ submitHint }}</q-tooltip>
        </q-btn>
        <q-btn
          v-if="canCancel"
          color="grey"
          outline
          :label="$t('content.cancelPending')"
          :loading="content.loading"
          @click="onCancel"
        />
      </div>

      <!-- SC-PACK-128 / D12: thread only while open task_set request (pending | needs_revision) -->
      <template v-if="showModerationThread">
        <div class="text-h6 q-mt-xl q-mb-sm">{{ $t('content.moderationThread') }}</div>
        <q-list bordered separator class="rounded-borders q-mb-lg">
          <q-item v-for="msg in threadMessages" :key="msg.id">
            <q-item-section>
              <q-item-label>{{ messageAuthorLabel(msg) }}</q-item-label>
              <q-item-label caption>{{ formatDate(msg.createdAt) }}</q-item-label>
              <div class="q-mt-sm" style="white-space: pre-wrap">{{ msg.body }}</div>
            </q-item-section>
          </q-item>
          <q-item v-if="!threadMessages.length">
            <q-item-section class="text-muted">{{ $t('content.emptyThread') }}</q-item-section>
          </q-item>
        </q-list>

        <q-form v-if="showModerationThread" ref="replyFormRef" class="q-gutter-md" @submit.prevent="onReply">
          <q-input
            v-model="replyBody"
            type="textarea"
            outlined
            dense
            autogrow
            lazy-rules
            :label="$t('content.reply')"
            :rules="[(v) => (!!v && String(v).trim().length > 0) || $t('content.bodyRequired')]"
          />
          <q-btn
            type="submit"
            color="primary"
            :label="$t('content.sendReply')"
            :loading="content.loading"
          />
        </q-form>
      </template>
    </template>

    <q-dialog v-model="gateOpen" persistent>
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ gateTitle }}</div>
          <div class="q-mt-sm">{{ gateText }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.collectionNav')" :to="{ name: 'content-collection' }" />
          <q-btn
            v-if="gateMode === 'login'"
            color="primary"
            :label="$t('content.gateLogin')"
            :to="{ name: 'login', query: { redirect: pagePath } }"
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
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import type { QForm } from 'quasar';

import { useAuthStore } from '@/stores/auth';
import {
  contentErrorI18nKey,
  newLocalId,
  useContentStore,
  type ContentTask,
  type Difficulty,
  type ModerationMessage,
  type TaskSet,
  type TaskSlot,
} from '@/stores/content';

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
const pagePath = computed(() => `/content/packs/${packId.value}/add-task-set`);

const local = ref<TaskSet | null>(null);
const liveCards = ref<{ id: string; content: string; description: string }[]>([]);
const gateOpen = ref(false);
const gateMode = ref<'login' | 'verify'>('login');
const editingTaskId = ref<string | null>(null);
const replyBody = ref('');
const replyFormRef = ref<QForm | null>(null);
const threadMessages = ref<ModerationMessage[]>([]);
const taskForm = reactive<{
  question: string;
  difficulty: Difficulty;
  slots: TaskSlot[];
}>({
  question: '',
  difficulty: 1,
  slots: [{ id: newLocalId('slot'), answerCardId: null }],
});

const state = computed(() => content.addTaskSet);
const taskSet = computed(() => local.value);

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

const readOnly = computed(
  () =>
    Boolean(gateOpen.value) ||
    Boolean(state.value?.foreignPending) ||
    state.value?.moderationStatus === 'pending',
);

const statusLabel = computed(() => {
  const status = state.value?.moderationStatus;
  if (status === 'pending') return t('content.taskSetStatusMarks.pending');
  if (status === 'needs_revision' || status === 'rejected') {
    return t('content.taskSetStatusMarks.needs_revision');
  }
  return '';
});

const hasFilledSlot = computed(() => taskForm.slots.some((s) => Boolean(s.answerCardId)));
const canSaveQuestion = computed(() => Boolean(taskForm.question.trim()) && hasFilledSlot.value);

const meetsMinima = computed(() => {
  const tasks = local.value?.tasks ?? [];
  if (tasks.length < 2) return false;
  return tasks.every(
    (task) =>
      task.question.trim() &&
      task.slots.length > 0 &&
      task.slots.every((s) => Boolean(s.answerCardId)),
  );
});

const canSubmit = computed(() => {
  if (readOnly.value || !meetsMinima.value) return false;
  if (state.value?.moderationStatus === 'pending') return false;
  return true;
});

const canCancel = computed(
  () =>
    Boolean(state.value?.pendingRequestId) &&
    (state.value?.moderationStatus === 'pending' ||
      state.value?.moderationStatus === 'needs_revision'),
);

/** SC-PACK-128: thread + reply only for open own request (not fresh create / foreign). */
const showModerationThread = computed(() => {
  if (state.value?.foreignPending || !state.value?.pendingRequestId) return false;
  const status = state.value?.moderationStatus;
  return status === 'pending' || status === 'needs_revision';
});

const submitHint = computed(() => {
  if (state.value?.foreignPending) return t('content.addTaskSetForeignPending');
  if (state.value?.moderationStatus === 'pending') return t('content.statusPendingAuthor');
  if (!meetsMinima.value) return t('content.submitTasksHint');
  return '';
});

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

function ensureLocalSet(): TaskSet {
  if (!local.value) {
    local.value = {
      id: newLocalId('ts'),
      authorUserId: String(auth.user?.id ?? ''),
      coauthorLabels: [],
      tasks: [],
    };
  }
  return local.value;
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
  if (empty) empty.answerCardId = cardId;
}

function slotLabel(slot: TaskSlot) {
  if (!slot.answerCardId) return t('content.slotEmpty');
  const card = liveCards.value.find((c) => c.id === slot.answerCardId);
  return card?.content?.trim() || t('content.slotFilled');
}

function messageAuthorLabel(msg: ModerationMessage) {
  if (msg.authorKind === 'staff') return t('content.authorStaff');
  if (msg.authorUserId === String(auth.user?.id ?? '')) return t('content.authorYou');
  return t('content.authorUser');
}

function formatDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('ru-RU');
}

function onAddOrUpdateTask() {
  if (readOnly.value || !canSaveQuestion.value) return;
  const set = ensureLocalSet();
  const slots = JSON.parse(JSON.stringify(taskForm.slots)) as TaskSlot[];
  if (editingTaskId.value) {
    const task = set.tasks.find((x) => x.id === editingTaskId.value);
    if (task) {
      task.question = taskForm.question.trim();
      task.difficulty = taskForm.difficulty;
      task.slots = slots;
    }
  } else {
    set.tasks.push({
      id: newLocalId('task'),
      question: taskForm.question.trim(),
      difficulty: taskForm.difficulty,
      slots,
    });
  }
  resetTaskForm();
}

function removeTask(taskId: string) {
  if (!local.value || readOnly.value) return;
  local.value.tasks = local.value.tasks.filter((t) => t.id !== taskId);
  if (editingTaskId.value === taskId) resetTaskForm();
}

async function loadThread() {
  const status = state.value?.moderationStatus;
  if (
    !packId.value ||
    state.value?.foreignPending ||
    (status !== 'pending' && status !== 'needs_revision')
  ) {
    threadMessages.value = [];
    return;
  }
  try {
    const data = await content.loadModeration(packId.value);
    threadMessages.value = data.messages ?? [];
  } catch {
    threadMessages.value = [];
  }
}

async function onReply() {
  if (!packId.value || !replyBody.value.trim() || !showModerationThread.value) return;
  try {
    const data = await content.postModerationMessage(packId.value, replyBody.value.trim());
    threadMessages.value = data.messages ?? [];
    replyBody.value = '';
    await nextTick();
    replyFormRef.value?.resetValidation();
  } catch {
    /* error in store */
  }
}

async function onSubmit() {
  if (!packId.value || !local.value || !canSubmit.value) return;
  try {
    await content.submitAddTaskSet(packId.value, {
      taskSets: [local.value],
      ...(state.value?.stagedRevisionId ? { stagedRevisionId: state.value.stagedRevisionId } : {}),
    });
    await content.loadAddTaskSet(packId.value);
    syncFromState();
    await loadThread();
  } catch {
    /* error in store */
  }
}

async function onCancel() {
  const id = state.value?.pendingRequestId;
  if (!id) return;
  try {
    await content.cancelRequest(id);
    await content.loadAddTaskSet(packId.value);
    syncFromState();
    await loadThread();
  } catch {
    /* error in store */
  }
}

function syncFromState() {
  const data = content.addTaskSet;
  if (!data) {
    local.value = null;
    liveCards.value = [];
    return;
  }
  liveCards.value = data.liveCards ?? [];
  const first = data.draft.taskSets[0];
  local.value = first
    ? (JSON.parse(JSON.stringify(first)) as TaskSet)
    : {
        id: newLocalId('ts'),
        authorUserId: String(auth.user?.id ?? ''),
        coauthorLabels: [],
        tasks: [],
      };
}

async function load() {
  if (!packId.value) return;
  if (!checkGate()) return;
  try {
    await content.loadAddTaskSet(packId.value);
    syncFromState();
    await loadThread();
  } catch {
    if (content.error === 'not_in_collection' || content.error === 'pack_not_public') {
      await router.replace({ name: 'content-pack', params: { id: packId.value } });
    }
  }
}

onMounted(load);
watch(packId, load);
</script>
