<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.answersTitle') }}</div>
        <div class="text-subtitle2 text-muted">
          <template v-if="content.pack?.blocked">
            {{ $t('content.blocked') }}
          </template>
          <template v-else-if="answersStatusLabel">
            {{ answersStatusLabel }}
          </template>
          <template v-else>
            {{ $t('content.answersSubtitle') }}
          </template>
        </div>
      </div>
      <div class="q-gutter-sm">
        <q-btn flat :label="$t('content.collectionNav')" :to="{ name: 'content-collection' }" />
      </div>
    </div>

    <q-banner v-if="content.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
    </q-banner>

    <div v-if="content.loading && !local" class="text-muted">{{ $t('content.loading') }}</div>

    <template v-else-if="local">
      <q-card flat bordered class="q-mb-lg">
        <q-card-section class="q-gutter-md">
          <q-input
            v-model="local.title"
            outlined
            dense
            :label="$t('content.packTitle')"
            :disable="readOnly"
            @update:model-value="scheduleAutosave"
          />
          <q-input
            v-model="local.description"
            type="textarea"
            outlined
            dense
            autogrow
            :label="$t('content.packDescription')"
            :disable="readOnly"
            @update:model-value="scheduleAutosave"
          />
        </q-card-section>
      </q-card>

      <div class="text-h6 q-mb-sm">{{ $t('content.answerCards') }}</div>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <q-form class="q-gutter-md" @submit.prevent="onAddOrUpdateCard">
            <q-input
              v-model="cardForm.content"
              outlined
              dense
              :label="$t('content.cardContent')"
              :disable="readOnly"
            />
            <q-input
              v-model="cardForm.description"
              outlined
              dense
              :label="$t('content.cardDescription')"
              :disable="readOnly"
            />
            <div class="row q-gutter-sm">
              <q-btn
                type="submit"
                color="primary"
                :label="editingCardId ? $t('content.saveCard') : $t('content.addCard')"
                :loading="content.saving"
                :disable="readOnly || !cardForm.content.trim()"
              />
              <q-btn
                v-if="editingCardId"
                flat
                :label="$t('content.cancelEditCard')"
                :disable="readOnly"
                @click="resetCardForm"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>

      <q-list bordered separator class="rounded-borders q-mb-lg">
        <q-item v-for="card in local.answerCards" :key="card.id">
          <q-item-section>
            <q-item-label>{{ card.content || $t('content.untitled') }}</q-item-label>
            <q-item-label v-if="card.description" caption>{{ card.description }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="q-gutter-xs">
              <q-btn
                flat
                dense
                icon="edit"
                :aria-label="$t('content.editCard')"
                :disable="readOnly"
                @click="startEditCard(card)"
              />
              <q-btn
                flat
                dense
                icon="delete"
                color="negative"
                :aria-label="$t('content.deleteCard')"
                :disable="readOnly"
                @click="confirmDeleteCard(card.id)"
              />
            </div>
          </q-item-section>
        </q-item>
        <q-item v-if="!local.answerCards.length">
          <q-item-section class="text-muted">{{ $t('content.emptyCards') }}</q-item-section>
        </q-item>
      </q-list>

      <div class="row items-center justify-between q-mb-sm">
        <div class="text-h6">{{ $t('content.taskSets') }}</div>
        <q-btn
          flat
          dense
          icon="add"
          :label="$t('content.addTaskSet')"
          :loading="content.loading"
          :disable="!canOpenTasks"
          @click="onAddTaskSet"
        >
          <q-tooltip v-if="!canOpenTasks">{{
            tasksGateHint || $t('content.addTaskSetTooltip')
          }}</q-tooltip>
        </q-btn>
      </div>
      <div v-if="!canOpenTasks" class="text-caption text-muted q-mb-sm">
        {{ tasksGateHint }}
      </div>
      <q-list bordered separator class="rounded-borders q-mb-lg">
        <q-item
          v-for="(ts, si) in local.taskSets"
          :key="ts.id"
          :clickable="canOpenTasks"
          :disable="!canOpenTasks"
          v-ripple="canOpenTasks"
          @click="canOpenTasks && openTaskSet(ts.id)"
        >
          <q-item-section>
            <q-item-label>
              {{ $t('content.taskSetLabel', { n: si + 1 }) }}
              <q-badge
                v-if="taskSetNeedsModeration(ts.id)"
                color="warning"
                class="q-ml-sm"
                :label="$t('content.needsModerationMark')"
              />
            </q-item-label>
            <q-item-label caption>
              {{ taskSetAttribution(ts) }} ·
              {{ $t('content.tasksCount', { n: ts.tasks.length }) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon name="chevron_right" />
          </q-item-section>
        </q-item>
        <q-item v-if="!local.taskSets.length">
          <q-item-section class="text-muted">{{ $t('content.emptyTaskSets') }}</q-item-section>
        </q-item>
      </q-list>

      <div class="row q-gutter-sm">
        <q-btn
          color="secondary"
          :label="$t('content.submitAnswers')"
          :loading="content.loading"
          :disable="readOnly || !canSubmitAnswers"
          @click="onSubmitAnswers"
        />
        <q-btn
          v-if="canDeletePack"
          color="negative"
          outline
          :label="$t('content.deletePack')"
          :loading="content.loading"
          @click="packDeleteConfirmOpen = true"
        />
      </div>
      <div v-if="!canSubmitAnswers" class="text-caption text-muted q-mt-sm">
        {{ submitAnswersHint }}
      </div>

      <div class="text-h6 q-mt-xl q-mb-sm">{{ $t('content.threadAnswers') }}</div>
      <q-list bordered separator class="rounded-borders q-mb-lg">
        <q-item v-for="msg in answersMessages" :key="msg.id">
          <q-item-section>
            <q-item-label>{{ messageAuthorLabel(msg) }}</q-item-label>
            <q-item-label caption>{{ formatDate(msg.createdAt) }}</q-item-label>
            <div class="q-mt-sm" style="white-space: pre-wrap">{{ msg.body }}</div>
          </q-item-section>
        </q-item>
        <q-item v-if="!answersMessages.length">
          <q-item-section class="text-muted">{{ $t('content.emptyThread') }}</q-item-section>
        </q-item>
      </q-list>

      <q-form
        v-if="canReplyAnswers"
        ref="replyFormRef"
        class="q-gutter-md"
        @submit.prevent="onReplyAnswers"
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
            :to="{ name: 'login', query: { redirect: editPath } }"
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
          <div class="text-h6">{{ $t('content.deleteCardTitle') }}</div>
          <div class="q-mt-sm">{{ $t('content.deleteCardConfirm') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.gateDismiss')" v-close-popup />
          <q-btn color="negative" :label="$t('content.deleteCard')" @click="doDeleteCard" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="packDeleteConfirmOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ $t('content.deletePackTitle') }}</div>
          <div class="q-mt-sm">{{ $t('content.deletePackConfirm') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.gateDismiss')" v-close-popup />
          <q-btn
            color="negative"
            :label="$t('content.deletePack')"
            :loading="content.loading"
            @click="doDeletePack"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import type { QForm } from 'quasar';

import { useAuthStore } from '@/stores/auth';
import {
  contentErrorI18nKey,
  newLocalId,
  useContentStore,
  type AnswerCard,
  type ModerationMessage,
  type PackContent,
  type TaskSet,
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
const editPath = computed(() => `/content/packs/${packId.value}/edit`);
const local = ref<PackContent | null>(null);
const gateOpen = ref(false);
const gateMode = ref<'login' | 'verify'>('login');
const editingCardId = ref<string | null>(null);
const cardForm = reactive({ content: '', description: '' });
const deleteConfirmOpen = ref(false);
const pendingDeleteCardId = ref<string | null>(null);
const packDeleteConfirmOpen = ref(false);
const replyBody = ref('');
const replyFormRef = ref<QForm | null>(null);
const answersMessages = ref<ModerationMessage[]>([]);
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let suppressAutosave = false;

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

const readOnly = computed(() => Boolean(content.pack?.blocked) || Boolean(gateOpen.value));

const answersStatusLabel = computed(() => {
  const status = content.answersModeration.status;
  if (status === 'pending') return t('content.statusCyclePending');
  if (status === 'rejected') return t('content.statusCycleRejected');
  if (status === 'approved') return t('content.statusCycleApproved');
  return '';
});

const meetsAnswersMinima = computed(() => {
  if (!local.value) return false;
  return local.value.answerCards.filter((c) => c.content.trim()).length >= 2;
});

/** SC-PACK-42/46: dirty + minima + only pending author (or no foreign pending). */
const canSubmitAnswers = computed(() => {
  if (!local.value || readOnly.value) return false;
  if (!meetsAnswersMinima.value) return false;
  if (!content.answersDirty) return false;
  if (content.pendingAnswersRequestId && !content.isAnswersPendingAuthor) return false;
  return true;
});

const submitAnswersHint = computed(() => {
  if (content.pendingAnswersRequestId && !content.isAnswersPendingAuthor) {
    return t('content.submitLockedOther');
  }
  if (!meetsAnswersMinima.value) {
    return t('content.submitAnswersHint');
  }
  if (!content.answersDirty) {
    return t('content.submitAnswersHintNotDirty');
  }
  return t('content.submitAnswersHint');
});

const canOpenTasks = computed(() => {
  if (readOnly.value || !local.value) return false;
  if (!local.value.answerCards.length) return false;
  // D1′ / SC-PACK-57/58: answers-pending author A MAY edit tasks (even if dirty);
  // others blocked; dirty without pending blocks everyone.
  if (content.pendingAnswersRequestId) {
    return content.isAnswersPendingAuthor;
  }
  if (content.answersDirty) return false;
  return true;
});

const tasksGateHint = computed(() => {
  if (!local.value?.answerCards.length) {
    return t('content.tasksNeedCards');
  }
  if (content.pendingAnswersRequestId && !content.isAnswersPendingAuthor) {
    return t('content.tasksLockedPendingOther');
  }
  if (content.answersDirty) {
    return t('content.addTaskSetTooltip');
  }
  return '';
});

const canDeletePack = computed(() => {
  if (!content.pack || content.pack.hasLive) return false;
  const uid = String(auth.user?.id ?? '');
  return Boolean(uid) && content.pack.createdBy === uid;
});

const canReplyAnswers = computed(() => {
  const mod = content.answersModeration;
  if (!mod.isAuthor || !mod.requestId) return false;
  return mod.status === 'pending' || mod.status === 'rejected';
});

function taskSetNeedsModeration(taskSetId: string) {
  return content.taskSetMarks.some((m) => m.id === taskSetId && m.needsModeration);
}

function taskSetAttribution(ts: TaskSet) {
  const labels = ts.coauthorLabels?.filter(Boolean) ?? [];
  if (labels.length) {
    return labels.join(', ');
  }
  if (ts.authorUserId && ts.authorUserId === String(auth.user?.id ?? '')) {
    return t('content.authorYou');
  }
  return t('content.authorUser');
}

function messageAuthorLabel(msg: ModerationMessage) {
  if (msg.authorKind === 'staff') {
    return t('content.authorStaff');
  }
  if (msg.authorUserId === String(auth.user?.id ?? '')) {
    return t('content.authorYou');
  }
  return t('content.authorUser');
}

function formatDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }
  return d.toLocaleString('ru-RU');
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

function resetCardForm() {
  editingCardId.value = null;
  cardForm.content = '';
  cardForm.description = '';
}

function startEditCard(card: AnswerCard) {
  editingCardId.value = card.id;
  cardForm.content = card.content;
  cardForm.description = card.description;
}

async function onAddOrUpdateCard() {
  if (!local.value || readOnly.value) return;
  const text = cardForm.content.trim();
  if (!text) return;

  if (editingCardId.value) {
    const card = local.value.answerCards.find((c) => c.id === editingCardId.value);
    if (card) {
      const prev = card.content;
      card.content = text;
      card.description = cardForm.description;
      if (prev !== text) {
        clearSlotsForCard(card.id);
      }
    }
  } else {
    local.value.answerCards.push({
      id: newLocalId('card'),
      content: text,
      description: cardForm.description,
    });
  }
  resetCardForm();
  await flushAutosave();
}

function clearSlotsForCard(cardId: string) {
  if (!local.value) return;
  for (const ts of local.value.taskSets) {
    for (const task of ts.tasks) {
      for (const slot of task.slots) {
        if (slot.answerCardId === cardId) {
          slot.answerCardId = null;
        }
      }
    }
  }
}

function confirmDeleteCard(cardId: string) {
  pendingDeleteCardId.value = cardId;
  deleteConfirmOpen.value = true;
}

function doDeleteCard() {
  if (!local.value || !pendingDeleteCardId.value) return;
  const id = pendingDeleteCardId.value;
  const idx = local.value.answerCards.findIndex((c) => c.id === id);
  if (idx >= 0) {
    local.value.answerCards.splice(idx, 1);
    clearSlotsForCard(id);
    if (editingCardId.value === id) {
      resetCardForm();
    }
    scheduleAutosave();
  }
  pendingDeleteCardId.value = null;
  deleteConfirmOpen.value = false;
}

async function doDeletePack() {
  if (!canDeletePack.value || !packId.value) return;
  try {
    await content.deleteUnpublishedPack(packId.value);
    packDeleteConfirmOpen.value = false;
    await router.replace({ name: 'content-collection' });
  } catch {
    /* error in store */
  }
}

async function onAddTaskSet() {
  if (!local.value || !canOpenTasks.value) return;
  await flushAutosave();
  const ts: TaskSet = {
    id: newLocalId('ts'),
    authorUserId: String(auth.user?.id ?? ''),
    coauthorLabels: [],
    tasks: [],
  };
  local.value.taskSets.push(ts);
  try {
    const saved = await content.saveDraft(packId.value, local.value);
    local.value = JSON.parse(JSON.stringify(saved)) as PackContent;
    const created = local.value.taskSets[local.value.taskSets.length - 1];
    if (created) {
      await router.push({
        name: 'content-pack-tasks',
        params: { id: packId.value, taskSetId: created.id },
      });
    }
  } catch {
    /* error in store */
  }
}

function openTaskSet(taskSetId: string) {
  void router.push({
    name: 'content-pack-tasks',
    params: { id: packId.value, taskSetId },
  });
}

async function loadAnswersThread() {
  const mod = content.answersModeration;
  if (!mod.requestId || !mod.isAuthor || !packId.value) {
    answersMessages.value = [];
    return;
  }
  if (mod.status !== 'pending' && mod.status !== 'rejected') {
    answersMessages.value = [];
    return;
  }
  try {
    const data = await content.loadModeration(packId.value, 'answers');
    answersMessages.value = data.messages ?? [];
  } catch {
    answersMessages.value = [];
  }
}

async function load() {
  if (!packId.value) return;
  if (!checkGate()) return;
  clearAutosaveTimer();
  try {
    const data = await content.loadDraft(packId.value);
    suppressAutosave = true;
    local.value = JSON.parse(JSON.stringify(data.draft)) as PackContent;
    suppressAutosave = false;
    await loadAnswersThread();
  } catch {
    /* error in store */
  }
}

onMounted(load);
watch(packId, load);
onBeforeUnmount(() => {
  clearAutosaveTimer();
});

async function onSubmitAnswers() {
  if (!local.value || !checkGate() || !canSubmitAnswers.value) return;
  clearAutosaveTimer();
  try {
    await content.saveDraft(packId.value, local.value);
    await content.submitAnswers(packId.value);
    const data = await content.loadDraft(packId.value);
    suppressAutosave = true;
    local.value = JSON.parse(JSON.stringify(data.draft)) as PackContent;
    suppressAutosave = false;
    await loadAnswersThread();
  } catch {
    /* error in store */
  }
}

async function onReplyAnswers() {
  try {
    await content.postModerationMessage(packId.value, replyBody.value.trim(), 'answers');
    answersMessages.value = [...content.moderationMessages];
    replyBody.value = '';
    await nextTick();
    replyFormRef.value?.resetValidation();
  } catch {
    /* error in store */
  }
}
</script>
