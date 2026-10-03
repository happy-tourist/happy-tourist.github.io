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
      <!-- SC-PACK-261: no top live answer grid; live cards only in dialog pool + CSV -->
      <!-- SC-PACK-258…262 / D5: add → CSV → list; compose in dialog -->
      <div v-if="canComposeTasks" class="q-mb-md">
        <q-btn
          color="primary"
          outline
          icon="add"
          :label="$t('content.addTask')"
          data-testid="add-task-question"
          @click="openCreateTask"
        />
      </div>

      <PackTasksCsvControls
        :tasks="taskSet?.tasks ?? []"
        :answer-cards="liveCards"
        :pack-title="content.pack?.title || ''"
        :set-number="1"
        :read-only="readOnly"
        :ready="Boolean(local)"
        @append="onTasksCsvAppend"
      />
      <div
        v-if="(taskSet?.tasks ?? []).length"
        class="pack-card-grid q-mb-lg"
        data-testid="task-card-grid"
      >
        <PackTaskTile
          v-for="task in taskSet?.tasks ?? []"
          :key="task.id"
          :question="task.question"
          :difficulty="task.difficulty"
          :slot-labels="taskSlotLabels(task)"
          :editable="canComposeTasks"
          @edit="startEditTask(task)"
          @delete="removeTask(task.id)"
        />
      </div>
      <div v-else class="text-muted q-mb-lg">{{ $t('content.emptyTasks') }}</div>

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

        <q-form
          v-if="showModerationThread"
          ref="replyFormRef"
          class="q-gutter-md"
          @submit.prevent="onReply"
        >
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

    <!-- SC-PACK-258…260: task create/edit in peek-like dialog -->
    <PackTaskComposeDialog
      v-model="taskComposeOpen"
      :editing="Boolean(editingTaskId)"
      v-model:question="taskForm.question"
      v-model:difficulty="taskForm.difficulty"
      v-model:form-slots="taskForm.slots"
      :answer-cards="liveCards"
      :read-only="readOnly"
      :saving="content.saving"
      :can-save="canSaveQuestion"
      @save="onAddOrUpdateTask"
      @cancel="cancelTaskCompose"
      @hide="onTaskComposeHide"
    />

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

import PackTaskComposeDialog from '@/components/PackTaskComposeDialog.vue';
import PackTaskTile from '@/components/PackTaskTile.vue';
import PackTasksCsvControls from '@/components/PackTasksCsvControls.vue';
import { fingerprintEditorContent, isEditorContentDirty } from '@/lib/editorDirty';
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
const taskComposeOpen = ref(false);
const replyBody = ref('');
const replyFormRef = ref<QForm | null>(null);
const threadMessages = ref<ModerationMessage[]>([]);
/** D3 / SC-PACK-234: pristine snapshot after load / successful submit. */
const submitBaseline = ref<string | null>(null);
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

/** SC-PACK-258/D5: add + Edit compose only when not read-only. */
const canComposeTasks = computed(() => !readOnly.value);

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

/** D3 / SC-PACK-234: dirty vs load baseline. */
const isDirty = computed(() => isEditorContentDirty(local.value, submitBaseline.value));

const canSubmit = computed(() => {
  if (readOnly.value || !meetsMinima.value || !isDirty.value) return false;
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
  if (!isDirty.value) return t('content.submitHintNotDirty');
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

function openCreateTask() {
  if (!canComposeTasks.value) return;
  resetTaskForm();
  taskComposeOpen.value = true;
}

function cancelTaskCompose() {
  taskComposeOpen.value = false;
  resetTaskForm();
}

function onTaskComposeHide() {
  resetTaskForm();
}

function startEditTask(task: ContentTask) {
  if (!canComposeTasks.value) return;
  editingTaskId.value = task.id;
  taskForm.question = task.question;
  taskForm.difficulty = task.difficulty;
  taskForm.slots = JSON.parse(JSON.stringify(task.slots)) as TaskSlot[];
  if (!taskForm.slots.length) {
    taskForm.slots = [{ id: newLocalId('slot'), answerCardId: null }];
  }
  taskComposeOpen.value = true;
}

function slotLabel(slot: TaskSlot) {
  if (!slot.answerCardId) return t('content.slotEmpty');
  // SC-PACK-134: resolve card text; never show «заполнен» when card is found with content.
  const card = liveCards.value.find((c) => c.id === slot.answerCardId);
  if (card) {
    const text = card.content?.trim();
    if (text) return text;
  }
  return t('content.slotFilled');
}

function taskSlotLabels(task: ContentTask): string[] {
  return task.slots.map((slot) => slotLabel(slot));
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
  taskComposeOpen.value = false;
  resetTaskForm();
}

function onTasksCsvAppend(tasks: ContentTask[]) {
  if (readOnly.value || !tasks.length) return;
  const set = ensureLocalSet();
  set.tasks.push(...tasks);
}

function removeTask(taskId: string) {
  if (!local.value || readOnly.value) return;
  local.value.tasks = local.value.tasks.filter((t) => t.id !== taskId);
  if (editingTaskId.value === taskId) {
    taskComposeOpen.value = false;
    resetTaskForm();
  }
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
    syncFromState({ refreshBaseline: true });
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
    syncFromState({ refreshBaseline: true });
    await loadThread();
  } catch {
    /* error in store */
  }
}

function syncFromState(opts?: { refreshBaseline?: boolean }) {
  const data = content.addTaskSet;
  if (!data) {
    local.value = null;
    liveCards.value = [];
    submitBaseline.value = null;
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
  if (opts?.refreshBaseline || submitBaseline.value == null) {
    submitBaseline.value = fingerprintEditorContent(local.value);
  }
}

async function load() {
  if (!packId.value) return;
  if (!checkGate()) return;
  submitBaseline.value = null;
  try {
    await content.loadAddTaskSet(packId.value);
    syncFromState({ refreshBaseline: true });
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
