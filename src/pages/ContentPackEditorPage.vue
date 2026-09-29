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
        <q-btn flat :label="$t('content.catalogNav')" :to="{ name: 'content-catalog' }" />
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
            :disable="cardsReadOnly"
            @update:model-value="scheduleAutosave"
          />
          <q-input
            v-model="local.description"
            type="textarea"
            outlined
            dense
            autogrow
            :label="$t('content.packDescription')"
            :disable="cardsReadOnly"
            @update:model-value="scheduleAutosave"
          />
        </q-card-section>
      </q-card>

      <div class="row items-center justify-between q-mb-sm">
        <div class="text-h6">{{ $t('content.answerCards') }}</div>
        <div class="q-gutter-sm">
          <q-btn
            flat
            dense
            icon="download"
            :label="$t('content.exportAnswersCsv')"
            :disable="answersExportDisabled"
            data-testid="export-answers-csv"
            @click="onExportAnswersCsv"
          />
          <q-btn
            flat
            dense
            icon="upload"
            :label="$t('content.importAnswersCsv')"
            :disable="cardsReadOnly"
            data-testid="import-answers-csv"
            @click="openAnswersCsvImport"
          >
            <q-tooltip>
              {{ cardsReadOnly ? $t('content.csvImportDisabled') : $t('content.csvAnswersHint') }}
            </q-tooltip>
          </q-btn>
        </div>
      </div>

      <PackCsvImportDialog
        v-model="answersCsvImportOpen"
        v-model:error="csvImportError"
        :format-example="$t('content.csvAnswersFormatExample')"
        :format-hint="$t('content.csvAnswersHint')"
        @file="onAnswersCsvFile"
      />

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <q-form class="q-gutter-md" @submit.prevent="onAddOrUpdateCard">
            <q-input
              v-model="cardForm.content"
              outlined
              dense
              :label="$t('content.cardContent')"
              :disable="cardsReadOnly"
            />
            <q-input
              v-model="cardForm.description"
              outlined
              dense
              :label="$t('content.cardDescription')"
              :disable="cardsReadOnly"
            />
            <div class="row q-gutter-sm">
              <q-btn
                type="submit"
                color="primary"
                :label="editingCardId ? $t('content.saveCard') : $t('content.addCard')"
                :loading="content.saving"
                :disable="cardsReadOnly || !cardForm.content.trim()"
              />
              <q-btn
                v-if="editingCardId"
                flat
                :label="$t('content.cancelEditCard')"
                :disable="cardsReadOnly"
                @click="resetCardForm"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>

      <div
        v-if="local.answerCards.length"
        class="pack-card-grid q-mb-lg"
        data-testid="answer-card-grid"
      >
        <PackAnswerCardTile
          v-for="card in local.answerCards"
          :key="card.id"
          :content="card.content"
          :description="card.description"
          :editable="!cardsReadOnly"
          @edit="startEditCard(card)"
          @delete="confirmDeleteCard(card.id)"
        />
      </div>
      <div v-else class="text-muted q-mb-lg">{{ $t('content.emptyCards') }}</div>

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
      <!-- SC-PACK-229 / D13: 100×200 task-set cards; soft-unpublish preserved -->
      <div
        v-if="local.taskSets.length"
        class="pack-card-grid q-mb-lg"
        data-testid="editor-task-set-grid"
      >
        <PackListCardTile
          v-for="(ts, si) in local.taskSets"
          :key="ts.id"
          :title="
            $t('content.taskSetLabelFrom', {
              n: si + 1,
              name: ts.authorDisplayName || $t('content.authorUser'),
            })
          "
          :clickable="canOpenTasks && canEnterEditorSet(ts)"
          :muted="isSetSoftUnpublished(ts)"
          :cascade-gap="content.taskSetHasCascadeGap(ts)"
          :test-id="`editor-task-set-row-${ts.id}`"
          @open="canOpenTasks && canEnterEditorSet(ts) && openTaskSet(ts.id)"
        >
          <template #status>
            <q-badge v-if="isSetSoftUnpublished(ts)" color="grey" dense>
              {{ $t('content.unpublishedByStaff') }}
            </q-badge>
          </template>
          <template #trailing>
            <q-btn
              v-if="canOpenTasks && canEnterEditorSet(ts)"
              flat
              dense
              round
              size="sm"
              icon="edit"
              :aria-label="$t('content.edit')"
              :data-test-id="`editor-task-set-edit-${ts.id}`"
              :disable="!canOpenTasks"
              @click.stop="openTaskSet(ts.id)"
            />
          </template>
          <template #caption>
            {{ $t('content.tasksCount', { n: ts.tasks.length }) }}
            <span v-if="ts.coauthorLabels?.length"> · {{ ts.coauthorLabels.join(', ') }}</span>
          </template>
          <template #actions>
            <q-btn
              v-if="staffMode && content.pack?.hasLive && isSetSoftUnpublished(ts)"
              flat
              dense
              size="sm"
              color="primary"
              :label="$t('content.republish')"
              :loading="content.loading"
              @click.stop="onRepublishSet(ts.id)"
            />
            <q-btn
              v-if="
                staffMode && content.pack?.hasLive && !isSetSoftUnpublished(ts) && canUnpublishSet
              "
              flat
              dense
              size="sm"
              color="warning"
              :label="$t('content.unpublish')"
              :loading="content.loading"
              @click.stop="confirmUnpublishSet(ts.id)"
            />
            <q-btn
              v-if="
                staffMode && content.pack?.hasLive && !isSetSoftUnpublished(ts) && !canUnpublishSet
              "
              flat
              dense
              size="sm"
              color="warning"
              :label="$t('content.unpublish')"
              disable
            >
              <q-tooltip>{{ $t('content.lastPublishedTaskSetHint') }}</q-tooltip>
            </q-btn>
          </template>
        </PackListCardTile>
      </div>
      <div v-else class="text-muted q-mb-lg">{{ $t('content.emptyTaskSets') }}</div>

      <div class="row q-gutter-sm">
        <!-- SC-PACK-111: no Submit for staff edits. -->
        <q-btn
          v-if="!staffMode"
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
          <q-btn flat :label="$t('content.catalogNav')" :to="{ name: 'content-catalog' }" />
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

    <!-- SC-PACK-131/132: confirm task-set unpublish -->
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import type { QForm } from 'quasar';

import PackAnswerCardTile from '@/components/PackAnswerCardTile.vue';
import PackCsvImportDialog from '@/components/PackCsvImportDialog.vue';
import PackListCardTile from '@/components/PackListCardTile.vue';
import {
  downloadCsvText,
  parseAnswers,
  sanitizePackCsvFilename,
  serializeAnswers,
} from '@/lib/packContentCsv';
import { useAuthStore } from '@/stores/auth';
import {
  contentErrorI18nKey,
  isStaffEditSessionNavigation,
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
const answersCsvImportOpen = ref(false);
const csvImportError = ref<string | null>(null);
const deleteConfirmOpen = ref(false);
const pendingDeleteCardId = ref<string | null>(null);
const packDeleteConfirmOpen = ref(false);
const unpublishSetConfirmOpen = ref(false);
const pendingUnpublishSetId = ref<string | null>(null);
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

/** SC-PACK-102/156: unified submit for creator / task-set-author working copy (incl. post-publish). */
const canSubmit = computed(() => {
  if (staffMode.value || !local.value || readOnly.value) return false;
  if (content.editorKind === 'task_set_author') {
    // Task-set author submits from cards page after editing own sets; minima = own sets.
    const mine = local.value.taskSets.filter((ts) => ts.authorUserId === uid.value);
    if (mine.length < 1) return false;
    if (
      !mine.every(
        (ts) =>
          ts.tasks.length >= 2 &&
          ts.tasks.every(
            (task) =>
              task.question.trim() &&
              task.slots.length > 0 &&
              task.slots.every((s) => Boolean(s.answerCardId)),
          ),
      )
    ) {
      return false;
    }
  } else if (!meetsSubmitMinima.value) {
    return false;
  }
  if (content.pendingRequestId && !content.isPendingAuthor) return false;
  // SC-PACK-163: author may resubmit while open/pending (incl. while staff holds take).
  return true;
});

const submitHint = computed(() => {
  if (content.pendingRequestId && !content.isPendingAuthor) {
    return t('content.submitLockedOther');
  }
  if (content.moderationStatus === 'pending' && content.isPendingAuthor) {
    return t('content.statusPendingAuthor');
  }
  if (content.editorKind === 'task_set_author') {
    return t('content.submitHintTaskSetAuthor');
  }
  if (!meetsSubmitMinima.value) {
    return t('content.submitHint');
  }
  return t('content.submitHint');
});

/** Task-set author cannot edit answer cards (SC-PACK-159). */
const cardsReadOnly = computed(() => readOnly.value || content.editorKind === 'task_set_author');

/** SC-PACK-219: Export disabled when there are zero draft answer cards. */
const answersExportDisabled = computed(() => !local.value || local.value.answerCards.length === 0);

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

function onExportAnswersCsv() {
  if (answersExportDisabled.value || !local.value) return;
  const base = sanitizePackCsvFilename(local.value.title);
  const csv = serializeAnswers(local.value.answerCards);
  downloadCsvText(`${base}.csv`, csv);
}

function openAnswersCsvImport() {
  if (cardsReadOnly.value) return;
  csvImportError.value = null;
  answersCsvImportOpen.value = true;
}

async function onAnswersCsvFile(file: File) {
  if (!local.value || cardsReadOnly.value) return;

  let rows;
  try {
    const text = await file.text();
    rows = parseAnswers(text);
  } catch {
    csvImportError.value = t('content.csvImportFailed');
    return;
  }

  // D6′: empty file → in-modal error, draft unchanged, modal stays open.
  if (rows.length === 0) {
    csvImportError.value = t('content.csvImportFailed');
    return;
  }

  for (const row of rows) {
    local.value.answerCards.push({
      id: newLocalId('card'),
      content: row.content,
      description: row.description,
    });
  }
  csvImportError.value = null;
  answersCsvImportOpen.value = false;
  await flushAutosave();
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
    await router.replace({ name: 'content-catalog' });
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

function isSetSoftUnpublished(ts: TaskSet): boolean {
  return ts.inCatalog === false;
}

function canEnterEditorSet(ts: TaskSet): boolean {
  // Staff may still open soft-unpublished sets in Edit session (SC-PACK-132).
  if (staffMode.value) return true;
  if (isSetSoftUnpublished(ts)) return false;
  // SC-PACK-159: task-set author only own sets.
  if (content.editorKind === 'task_set_author') {
    return Boolean(uid.value) && ts.authorUserId === uid.value;
  }
  return true;
}

const canUnpublishSet = computed(() => {
  if (!local.value) return false;
  return local.value.taskSets.filter((ts) => ts.inCatalog !== false).length > 1;
});

function confirmUnpublishSet(taskSetId: string) {
  pendingUnpublishSetId.value = taskSetId;
  unpublishSetConfirmOpen.value = true;
}

async function doUnpublishSet() {
  if (!packId.value || !pendingUnpublishSetId.value || !local.value) return;
  try {
    await content.unpublishTaskSet(packId.value, pendingUnpublishSetId.value);
    const id = pendingUnpublishSetId.value;
    const ts = local.value.taskSets.find((s) => s.id === id);
    if (ts) ts.inCatalog = false;
    unpublishSetConfirmOpen.value = false;
    pendingUnpublishSetId.value = null;
  } catch {
    /* error in store */
  }
}

async function onRepublishSet(taskSetId: string) {
  if (!packId.value || !local.value) return;
  try {
    await content.republishTaskSet(packId.value, taskSetId);
    const ts = local.value.taskSets.find((s) => s.id === taskSetId);
    if (ts) ts.inCatalog = true;
  } catch {
    /* error in store */
  }
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
  content.error = null;

  // SC-PACK-115: resume staff session when returning cards↔tasks (keep lock/target).
  if (
    auth.isStaff &&
    content.staffEditTarget &&
    content.pack?.id === packId.value &&
    content.draft
  ) {
    lockHeld.value = true;
    staffMode.value = true;
    suppressAutosave = true;
    local.value = JSON.parse(JSON.stringify(content.draft)) as PackContent;
    suppressAutosave = false;
    startLockHeartbeat();
    return;
  }

  lockHeld.value = false;
  staffMode.value = false;

  try {
    // Probe working copy for creator / task-set-author (incl. post-publish SC-PACK-156…159).
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
      // Post-publish author / task-set-author: acquire lock + edit working copy.
      if (packHasLive && (createdBy === uid.value || content.editorKind === 'task_set_author')) {
        await content.acquireEditLock(packId.value);
        lockHeld.value = true;
        startLockHeartbeat();
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

    // Published non-staff without edit rights → add-task-set
    if (content.pack?.hasLive || packHasLive) {
      await router.replace({
        name: 'content-pack-add-task-set',
        params: { id: packId.value },
      });
      return;
    }
    await router.replace({ name: 'content-catalog' });
  } catch {
    /* error in store */
    if (content.error === 'edit_locked' || content.error === 'author_request_open') {
      await router.replace({ name: 'content-pack', params: { id: packId.value } });
    }
  }
}

onMounted(load);
watch(packId, load);

/** SC-PACK-115: unlock only when leaving the whole Edit session, not cards↔tasks. */
onBeforeRouteLeave((to) => {
  if (!packId.value) return;
  if (isStaffEditSessionNavigation(to, packId.value)) return;
  // Prefer staffEditTarget so mid-load leave still unlocks (lockHeld may still be false).
  if (!lockHeld.value && !content.staffEditTarget) return;
  void content.releaseEditLock(packId.value).catch(() => {
    /* ignore */
  });
  lockHeld.value = false;
});

onBeforeUnmount(() => {
  clearAutosaveTimer();
  stopLockHeartbeat();
});
</script>

<!-- SC-PACK-126 / D10: same visible yellow outline as TasksPage cascade gaps -->
<style scoped>
.cascade-gap-outline {
  outline: 2px solid var(--q-warning);
  outline-offset: -2px;
}
</style>
