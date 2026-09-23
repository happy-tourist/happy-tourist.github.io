<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.answersTitle') }}</div>
        <div class="text-subtitle2 text-muted">
          <template v-if="content.pack?.blocked">
            {{ $t('content.blocked') }}
          </template>
          <template v-else-if="statusLabel">
            {{ statusLabel }}
          </template>
          <template v-else-if="staffMode">
            {{ $t('content.staffEditSubtitle') }}
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
          <q-tooltip v-if="!canOpenTasks">{{ $t('content.tasksNeedCards') }}</q-tooltip>
        </q-btn>
      </div>
      <q-list bordered separator class="rounded-borders q-mb-lg">
        <q-item
          v-for="(ts, si) in local.taskSets"
          :key="ts.id"
          :clickable="canOpenTasks"
          :disable="!canOpenTasks"
          v-ripple="canOpenTasks"
          :class="{ 'cascade-gap-outline': content.taskSetHasCascadeGap(ts) }"
          @click="canOpenTasks && openTaskSet(ts.id)"
        >
          <q-item-section>
            <q-item-label>
              {{ $t('content.taskSetLabel', { n: si + 1 }) }}
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
        <!-- SC-PACK-111: no Submit for staff edits. -->
        <q-btn
          v-if="!staffMode"
          color="secondary"
          :label="$t('content.submitModeration')"
          :loading="content.loading"
          :disable="readOnly || !canSubmit"
          @click="onSubmit"
        />
        <q-btn
          v-if="canCancelRequest"
          color="grey"
          outline
          :label="$t('content.cancelPending')"
          :loading="content.loading"
          @click="onCancelRequest"
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
      <div v-if="!staffMode && !canSubmit" class="text-caption text-muted q-mt-sm">
        {{ submitHint }}
      </div>

      <template v-if="!staffMode">
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

        <q-form v-if="canReply" ref="replyFormRef" class="q-gutter-md" @submit.prevent="onReply">
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
          <div class="q-mt-sm">{{ deleteCardConfirmText }}</div>
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
  taskIdsReferencingCard,
  useContentStore,
  type AnswerCard,
  type ModerationMessage,
  type PackContent,
  type TaskSet,
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
const threadMessages = ref<ModerationMessage[]>([]);
const staffMode = ref(false);
const lockHeld = ref(false);
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let lockHeartbeat: ReturnType<typeof setInterval> | null = null;
let suppressAutosave = false;

const uid = computed(() => String(auth.user?.id ?? ''));

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

const statusLabel = computed(() => {
  const status = content.moderationStatus;
  if (status === 'pending') return t('content.taskSetStatusMarks.pending');
  if (status === 'needs_revision' || status === 'rejected') {
    return t('content.taskSetStatusMarks.needs_revision');
  }
  if (content.pack?.hasLive) return t('content.taskSetStatusMarks.published');
  return '';
});

const deleteCardConfirmText = computed(() =>
  content.pack?.hasLive || staffMode.value
    ? t('content.deleteCardConfirmPublished')
    : t('content.deleteCardConfirm'),
);

const meetsSubmitMinima = computed(() => {
  if (!local.value) return false;
  const cards = local.value.answerCards.filter((c) => c.content.trim()).length;
  if (cards < 2) return false;
  if (local.value.taskSets.length < 1) return false;
  return local.value.taskSets.every(
    (ts) =>
      ts.tasks.length >= 2 &&
      ts.tasks.every(
        (task) =>
          task.question.trim() &&
          task.slots.length > 0 &&
          task.slots.every((s) => Boolean(s.answerCardId)),
      ),
  );
});

/** SC-PACK-102: unified submit for creator working copy. */
const canSubmit = computed(() => {
  if (staffMode.value || !local.value || readOnly.value) return false;
  if (content.pack?.hasLive) return false;
  if (!meetsSubmitMinima.value) return false;
  if (content.pendingRequestId && !content.isPendingAuthor) return false;
  if (content.moderationStatus === 'pending') return false;
  return true;
});

const submitHint = computed(() => {
  if (content.pendingRequestId && !content.isPendingAuthor) {
    return t('content.submitLockedOther');
  }
  if (content.moderationStatus === 'pending') {
    return t('content.statusPendingAuthor');
  }
  if (!meetsSubmitMinima.value) {
    return t('content.submitHint');
  }
  return t('content.submitHint');
});

const canOpenTasks = computed(() => {
  if (readOnly.value || !local.value) return false;
  return local.value.answerCards.length > 0;
});

const canDeletePack = computed(() => {
  if (!content.pack || content.pack.hasLive || staffMode.value) return false;
  return Boolean(uid.value) && content.pack.createdBy === uid.value;
});

const canCancelRequest = computed(
  () =>
    !staffMode.value &&
    content.isPendingAuthor &&
    Boolean(content.pendingRequestId) &&
    (content.moderationStatus === 'pending' || content.moderationStatus === 'needs_revision'),
);

const canReply = computed(() => {
  if (staffMode.value || !content.isPendingAuthor || !content.pendingRequestId) return false;
  return content.moderationStatus === 'pending' || content.moderationStatus === 'needs_revision';
});

function taskSetAttribution(ts: TaskSet) {
  const labels = ts.coauthorLabels?.filter(Boolean) ?? [];
  if (labels.length) return labels.join(', ');
  if (ts.authorUserId && ts.authorUserId === uid.value) return t('content.authorYou');
  return t('content.authorUser');
}

function messageAuthorLabel(msg: ModerationMessage) {
  if (msg.authorKind === 'staff') return t('content.authorStaff');
  if (msg.authorUserId === uid.value) return t('content.authorYou');
  return t('content.authorUser');
}

function formatDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
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

function stopLockHeartbeat() {
  if (lockHeartbeat) {
    clearInterval(lockHeartbeat);
    lockHeartbeat = null;
  }
}

function startLockHeartbeat() {
  stopLockHeartbeat();
  if (!packId.value || !lockHeld.value) return;
  lockHeartbeat = setInterval(() => {
    void content.refreshEditLock(packId.value).catch(() => {
      /* ignore heartbeat errors */
    });
  }, LOCK_HEARTBEAT_MS);
}

async function persist(body: PackContent, opts?: { quiet?: boolean }) {
  if (staffMode.value) {
    return content.staffSavePack(packId.value, body, opts);
  }
  return content.saveDraft(packId.value, body, opts);
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

  let cascadeTaskIds: string[] = [];
  if (editingCardId.value) {
    const card = local.value.answerCards.find((c) => c.id === editingCardId.value);
    if (card) {
      const prev = card.content;
      card.content = text;
      card.description = cardForm.description;
      if (prev !== text) {
        cascadeTaskIds = taskIdsReferencingCard(local.value, card.id);
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
  if (cascadeTaskIds.length && local.value) {
    content.markCascadeGaps(cascadeTaskIds, local.value);
  }
}

function confirmDeleteCard(cardId: string) {
  pendingDeleteCardId.value = cardId;
  deleteConfirmOpen.value = true;
}

async function doDeleteCard() {
  if (!local.value || !pendingDeleteCardId.value) return;
  const id = pendingDeleteCardId.value;
  const idx = local.value.answerCards.findIndex((c) => c.id === id);
  if (idx < 0) {
    pendingDeleteCardId.value = null;
    deleteConfirmOpen.value = false;
    return;
  }
  const cascadeTaskIds = taskIdsReferencingCard(local.value, id);
  local.value.answerCards.splice(idx, 1);
  if (editingCardId.value === id) resetCardForm();
  pendingDeleteCardId.value = null;
  deleteConfirmOpen.value = false;
  await flushAutosave();
  if (cascadeTaskIds.length && local.value) {
    content.markCascadeGaps(cascadeTaskIds, local.value);
  }
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
    authorUserId: uid.value,
    coauthorLabels: [],
    tasks: [],
  };
  local.value.taskSets.push(ts);
  try {
    const saved = await persist(local.value);
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

async function loadThread() {
  if (staffMode.value || !content.isPendingAuthor || !packId.value) {
    threadMessages.value = [];
    return;
  }
  if (content.moderationStatus !== 'pending' && content.moderationStatus !== 'needs_revision') {
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
  if (!packId.value || !replyBody.value.trim()) return;
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
    await persist(local.value);
    await content.submitPack(packId.value);
    const data = await content.loadDraft(packId.value);
    suppressAutosave = true;
    local.value = JSON.parse(JSON.stringify(data.draft)) as PackContent;
    suppressAutosave = false;
    await loadThread();
  } catch {
    /* error in store */
  }
}

async function onCancelRequest() {
  if (!content.pendingRequestId) return;
  try {
    await content.cancelRequest(content.pendingRequestId);
    await content.loadDraft(packId.value);
    await loadThread();
  } catch {
    /* error in store */
  }
}

async function enterStaffEdit() {
  await content.acquireEditLock(packId.value);
  lockHeld.value = true;
  startLockHeartbeat();
  const data = await content.loadStaffEdit(packId.value);
  suppressAutosave = true;
  local.value = JSON.parse(JSON.stringify(data.content)) as PackContent;
  suppressAutosave = false;
  staffMode.value = true;
}

async function load() {
  if (!packId.value) return;
  if (!checkGate()) return;
  clearAutosaveTimer();
  stopLockHeartbeat();
  lockHeld.value = false;
  staffMode.value = false;
  content.error = null;

  try {
    // Probe live first when possible via collection/pack flags is unknown — try draft, fall back staff.
    // Prefer staff path when staff + published (or non-creator unpublished).
    let packHasLive = false;
    let createdBy = '';
    try {
      const draftData = await content.loadDraft(packId.value);
      packHasLive = Boolean(draftData.pack.hasLive);
      createdBy = draftData.pack.createdBy;
      // Unpublished creator path (even if staff) — keep submit.
      if (!packHasLive && createdBy === uid.value) {
        suppressAutosave = true;
        local.value = JSON.parse(JSON.stringify(draftData.draft)) as PackContent;
        suppressAutosave = false;
        staffMode.value = false;
        await loadThread();
        return;
      }
    } catch (e) {
      const code = content.error;
      // pack_published → staff may still edit; not_creator → staff only
      if (code !== 'pack_published' && code !== 'not_creator' && code !== 'forbidden') {
        if (!auth.isStaff) {
          throw e;
        }
      }
      content.error = null;
    }

    if (auth.isStaff) {
      await enterStaffEdit();
      return;
    }

    // Published non-staff → add-task-set or collection
    if (content.pack?.hasLive || packHasLive) {
      await router.replace({
        name: 'content-pack-add-task-set',
        params: { id: packId.value },
      });
      return;
    }
    await router.replace({ name: 'content-collection' });
  } catch {
    /* error in store */
    if (content.error === 'edit_locked') {
      await router.replace({ name: 'content-pack', params: { id: packId.value } });
    }
  }
}

onMounted(load);
watch(packId, load);

onBeforeUnmount(() => {
  clearAutosaveTimer();
  stopLockHeartbeat();
  if (lockHeld.value && packId.value) {
    void content.releaseEditLock(packId.value).catch(() => {
      /* ignore */
    });
  }
});
</script>
