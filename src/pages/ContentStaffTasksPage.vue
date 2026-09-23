<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.staffTasksTitle') }}</div>
        <div class="text-subtitle2 text-muted">
          {{ hubPackTitle || $t('content.staffTasksSubtitle') }}
          <template v-if="tasksPending"> · {{ statusLabel(tasksPending.status) }} </template>
        </div>
      </div>
      <q-btn
        flat
        :label="$t('content.backToStaffHub')"
        :to="{ name: 'content-staff-request', params: { id: answersRequestId } }"
      />
    </div>

    <q-banner v-if="content.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
    </q-banner>

    <div v-if="content.loading && !ready" class="text-muted">{{ $t('content.loading') }}</div>

    <template v-else-if="ready">
      <div v-if="tasksPending" class="q-mb-sm text-caption text-muted">
        {{ $t('content.tasksPendingHint') }}
      </div>
      <div v-else-if="hasLiveTasks" class="q-mb-sm text-caption text-muted">
        {{ $t('content.tasksLiveHint') }}
      </div>
      <div v-else class="q-mb-sm text-caption text-muted">
        {{ $t('content.tasksMissingHint') }}
      </div>

      <div v-for="(ts, si) in displayTaskSets" :key="ts.id" class="q-mb-md">
        <div class="text-subtitle1 q-mb-xs">{{ $t('content.taskSetLabel', { n: si + 1 }) }}</div>
        <q-list bordered separator class="rounded-borders">
          <q-item v-for="task in ts.tasks" :key="task.id">
            <q-item-section>
              <q-item-label>{{ task.question }}</q-item-label>
              <q-item-label caption>
                {{ $t('content.difficultyLabel') }}:
                {{ $t(`content.difficulty.${task.difficulty}`) }}
              </q-item-label>
              <q-item-label caption>
                {{
                  task.slots
                    .map((s) => cardContent(s.answerCardId) || $t('content.slotEmpty'))
                    .join(' · ')
                }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-if="!ts.tasks.length">
            <q-item-section class="text-muted">{{ $t('content.emptyTasks') }}</q-item-section>
          </q-item>
        </q-list>
      </div>
      <div v-if="!displayTaskSets.length" class="text-muted q-mb-lg">
        {{ $t('content.emptyTasks') }}
      </div>

      <div
        v-if="
          tasksPending && (tasksPending.status === 'pending' || tasksPending.status === 'rejected')
        "
        class="q-gutter-sm q-mb-lg"
      >
        <div class="text-subtitle2">{{ $t('content.approveTasksFirst') }}</div>
        <q-btn
          color="positive"
          :label="$t('content.approveTasks')"
          :loading="content.loading"
          @click="onApproveTasks"
        />
        <q-btn
          v-if="tasksPending.status === 'pending'"
          color="warning"
          :label="$t('content.rejectTasks')"
          :loading="content.loading"
          @click="openReject"
        />
        <q-btn
          color="grey"
          outline
          :label="$t('content.cancelTasksPending')"
          :loading="content.loading"
          @click="onCancelTasks"
        />
      </div>

      <div class="text-h6 q-mb-sm">{{ $t('content.threadTasks') }}</div>
      <q-list bordered separator class="rounded-borders q-mb-lg">
        <q-item v-for="msg in tasksMessages" :key="msg.id">
          <q-item-section>
            <q-item-label>
              {{
                msg.authorKind === 'staff' ? $t('content.authorStaff') : $t('content.authorUser')
              }}
            </q-item-label>
            <q-item-label caption>{{ formatDate(msg.createdAt) }}</q-item-label>
            <div class="q-mt-sm" style="white-space: pre-wrap">{{ msg.body }}</div>
          </q-item-section>
        </q-item>
        <q-item v-if="!tasksMessages.length">
          <q-item-section class="text-muted">{{ $t('content.emptyThread') }}</q-item-section>
        </q-item>
      </q-list>

      <q-form
        v-if="
          tasksPending && (tasksPending.status === 'pending' || tasksPending.status === 'rejected')
        "
        ref="replyFormRef"
        class="q-gutter-md"
        @submit.prevent="onStaffReply"
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
          :disable="!tasksPending"
        />
      </q-form>
    </template>

    <q-dialog v-model="rejectOpen">
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">{{ $t('content.rejectTitle') }}</div>
          <q-input
            v-model="rejectComment"
            type="textarea"
            outlined
            dense
            autogrow
            class="q-mt-md"
            :label="$t('content.rejectComment')"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.gateDismiss')" v-close-popup />
          <q-btn
            color="warning"
            :label="$t('content.reject')"
            :disable="!rejectComment.trim()"
            :loading="content.loading"
            @click="onReject"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import type { QForm } from 'quasar';

import { useAuthStore } from '@/stores/auth';
import {
  contentErrorI18nKey,
  useContentStore,
  type AnswerCard,
  type ModerationMessage,
  type TaskSet,
} from '@/stores/content';

const auth = useAuthStore();
const content = useContentStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const answersRequestId = computed(() => {
  const params = route.params as Record<string, string | string[] | undefined>;
  const raw = params.id;
  return typeof raw === 'string' ? raw : '';
});

const ready = ref(false);
const hubPackTitle = ref('');
const hasLiveTasks = ref(false);
/** SC-PACK-71: tasks-only hub — after approve leave to queue (no answers step). */
const isTasksOnly = ref(false);
const tasksPending = ref<{
  requestId: string;
  changeAuthorId: string;
  status: string;
  type: string;
} | null>(null);
const displayTaskSets = ref<TaskSet[]>([]);
const answerCards = ref<AnswerCard[]>([]);
const tasksMessages = ref<ModerationMessage[]>([]);
const tasksRequestId = ref<string | null>(null);

const replyBody = ref('');
const replyFormRef = ref<QForm | null>(null);
const rejectOpen = ref(false);
const rejectComment = ref('');

const errorLabel = computed(() => {
  const key = contentErrorI18nKey(content.error);
  return key ? t(key) : (content.error ?? '');
});

function statusLabel(value: string) {
  if (
    value === 'pending' ||
    value === 'approved' ||
    value === 'rejected' ||
    value === 'cancelled'
  ) {
    return t(`content.statuses.${value}`);
  }
  return value;
}

function formatDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }
  return d.toLocaleString('ru-RU');
}

function cardContent(answerCardId: string | null) {
  if (!answerCardId) return '';
  const fromHub = answerCards.value.find((c) => c.id === answerCardId);
  if (fromHub) return fromHub.content;
  return '';
}

async function load() {
  if (!answersRequestId.value) return;
  ready.value = false;
  try {
    const hub = await content.loadStaffPreview(answersRequestId.value);
    hubPackTitle.value = hub.pack.title;
    hasLiveTasks.value = Boolean(hub.nested?.hasLiveTasks);
    // Prefer server `tasksOnly` so dual-pending (answers hub) never redirects to queue.
    isTasksOnly.value =
      typeof hub.tasksOnly === 'boolean'
        ? hub.tasksOnly
        : hub.answersActionsAvailable === false || hub.request.type === 'tasks';
    tasksPending.value = hub.nested?.tasksPending ?? null;
    answerCards.value = hub.content.answerCards ?? [];

    const pendingId = hub.nested?.tasksPending?.requestId ?? null;
    tasksRequestId.value = pendingId;

    if (pendingId) {
      // Tasks-only hub id === tasks request: nested.tasksContent already on first preview.
      if (pendingId === answersRequestId.value && hub.nested?.tasksContent?.taskSets) {
        displayTaskSets.value = hub.nested.tasksContent.taskSets;
        tasksMessages.value = hub.messages ?? [];
      } else {
        const tasksPreview = await content.loadStaffPreview(pendingId);
        displayTaskSets.value =
          tasksPreview.nested?.tasksContent?.taskSets ?? tasksPreview.content.taskSets ?? [];
        tasksMessages.value = tasksPreview.messages ?? [];
        // Restore answers hub preview for back-nav after tasks load overwrote staffPreview.
        await content.loadStaffPreview(answersRequestId.value);
      }
    } else {
      // SC-PACK-51: never GET live pack here — unpublished packs yield pack_not_public.
      // After tasks approve staff leave via redirect; without pending show empty + live hint.
      displayTaskSets.value = [];
      tasksMessages.value = [];
    }
    ready.value = true;
  } catch {
    ready.value = false;
  }
}

onMounted(() => {
  if (!auth.isStaff) {
    void router.replace({ name: 'content-collection' });
    return;
  }
  void load();
});
watch(answersRequestId, () => {
  void load();
});

function openReject() {
  rejectComment.value = '';
  rejectOpen.value = true;
}

async function onApproveTasks() {
  const id = tasksRequestId.value;
  if (!id) return;
  try {
    await content.approveRequest(id);
    if (isTasksOnly.value) {
      // SC-PACK-71 / D35: tasks-only — back to queue (no answers approve step).
      await router.replace({ name: 'content-staff' });
      return;
    }
    // SC-PACK-51: return to answers hub — do not stay on empty/not-public tasks page.
    await router.replace({
      name: 'content-staff-request',
      params: { id: answersRequestId.value },
    });
  } catch {
    /* error in store */
  }
}

async function onReject() {
  const id = tasksRequestId.value;
  if (!id) return;
  try {
    await content.rejectRequest(id, rejectComment.value.trim());
    rejectOpen.value = false;
    rejectComment.value = '';
    await load();
  } catch {
    /* error in store */
  }
}

async function onCancelTasks() {
  const id = tasksRequestId.value;
  if (!id) return;
  try {
    await content.cancelRequest(id);
    if (isTasksOnly.value) {
      await router.replace({ name: 'content-staff' });
      return;
    }
    await load();
  } catch {
    /* error in store */
  }
}

async function onStaffReply() {
  const id = tasksRequestId.value;
  if (!id) return;
  try {
    await content.postStaffMessage(id, replyBody.value.trim());
    tasksMessages.value = [...content.moderationMessages];
    replyBody.value = '';
    await nextTick();
    replyFormRef.value?.resetValidation();
  } catch {
    /* error in store */
  }
}
</script>
