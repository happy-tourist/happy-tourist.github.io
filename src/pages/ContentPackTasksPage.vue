<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.tasksTitle') }}</div>
        <div class="text-subtitle2 text-muted">
          <template v-if="content.pendingTasksRequestId && content.isTasksPendingAuthor">
            {{ $t('content.statusPendingTasks') }}
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
        <q-btn
          flat
          :label="$t('content.backToAnswers')"
          :to="{ name: 'content-pack-edit', params: { id: packId } }"
        />
        <q-btn
          v-if="content.pendingTasksRequestId"
          flat
          :label="$t('content.moderationThread')"
          :to="{
            name: 'content-pack-moderation',
            params: { id: packId },
            query: { type: 'tasks' },
          }"
        />
      </div>
    </div>

    <q-banner v-if="content.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
    </q-banner>

    <div v-if="content.saving" class="text-caption text-muted q-mb-sm">
      {{ $t('content.autosaving') }}
    </div>

    <div v-if="content.loading && !local" class="text-muted">{{ $t('content.loading') }}</div>

    <template v-else-if="local && taskSet">
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
                :disable="readOnly || !taskForm.question.trim()"
              />
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
        <q-item v-for="(task, ti) in taskSet.tasks" :key="task.id">
          <q-item-section>
            <q-item-label>{{ task.question || $t('content.taskN', { n: ti + 1 }) }}</q-item-label>
            <q-item-label caption>
              {{ $t('content.difficultyLabel') }}:
              {{ $t(`content.difficulty.${task.difficulty}`) }}
              ·
              {{ task.slots.map((s) => slotLabel(s)).join(' · ') }}
            </q-item-label>
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
          color="secondary"
          :label="$t('content.submitTasks')"
          :loading="content.loading"
          :disable="readOnly || !canSubmitTasks"
          @click="onSubmitTasks"
        />
      </div>
      <div v-if="!canSubmitTasks" class="text-caption text-muted q-mt-sm">
        {{ $t('content.submitTasksHint') }}
      </div>
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
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import {
  contentErrorI18nKey,
  newLocalId,
  useContentStore,
  type ContentTask,
  type Difficulty,
  type PackContent,
  type TaskSlot,
} from '@/stores/content';

const AUTOSAVE_MS = 800;

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
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let suppressAutosave = false;

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

const locked = computed(
  () => content.answersDirty || !local.value?.answerCards.length || Boolean(content.pack?.blocked),
);

const readOnly = computed(
  () => Boolean(content.pack?.blocked) || Boolean(gateOpen.value) || locked.value,
);

const tasksGateHint = computed(() => {
  if (!local.value?.answerCards.length) {
    return t('content.tasksNeedCards');
  }
  if (content.answersDirty) {
    return t('content.tasksLockedDirty');
  }
  if (content.pack?.blocked) {
    return t('content.blocked');
  }
  return '';
});

const canSubmitTasks = computed(() => {
  if (!local.value || readOnly.value) return false;
  let taskCount = 0;
  for (const ts of local.value.taskSets) {
    for (const task of ts.tasks) {
      taskCount += 1;
      if (!task.slots.length || task.slots.some((s) => !s.answerCardId)) return false;
      if (![1, 2, 3].includes(task.difficulty)) return false;
    }
  }
  return taskCount >= 2;
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

function clearAutosaveTimer() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
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
    const saved = await content.saveDraft(packId.value, local.value, { quiet: true });
    suppressAutosave = true;
    local.value = JSON.parse(JSON.stringify(saved)) as PackContent;
    suppressAutosave = false;
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
  const card = local.value.answerCards.find((c) => c.id === slot.answerCardId);
  return card?.content?.trim() || t('content.slotFilled');
}

function onAddOrUpdateTask() {
  if (!taskSet.value || readOnly.value) return;
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
  scheduleAutosave();
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

async function load() {
  if (!packId.value || !taskSetId.value) return;
  if (!checkGate()) return;
  clearAutosaveTimer();
  try {
    const data = await content.loadDraft(packId.value);
    suppressAutosave = true;
    local.value = JSON.parse(JSON.stringify(data.draft)) as PackContent;
    suppressAutosave = false;

    if (!local.value.answerCards.length || content.answersDirty) {
      await router.replace({ name: 'content-pack-edit', params: { id: packId.value } });
      return;
    }

    const found = local.value.taskSets.some((ts) => ts.id === taskSetId.value);
    if (!found) {
      await router.replace({ name: 'content-pack-edit', params: { id: packId.value } });
    }
  } catch {
    /* error in store */
  }
}

onMounted(load);
watch([packId, taskSetId], load);
onBeforeUnmount(() => {
  clearAutosaveTimer();
});

async function onSubmitTasks() {
  if (!local.value || !checkGate() || !canSubmitTasks.value) return;
  clearAutosaveTimer();
  try {
    await content.saveDraft(packId.value, local.value);
    await content.submitTasks(packId.value);
    const data = await content.loadDraft(packId.value);
    suppressAutosave = true;
    local.value = JSON.parse(JSON.stringify(data.draft)) as PackContent;
    suppressAutosave = false;
  } catch {
    /* error in store */
  }
}
</script>
