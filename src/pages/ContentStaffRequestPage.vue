<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">
          {{ preview?.pack.title || $t('content.untitled') }}
          <q-badge v-if="preview?.pack.blocked" color="negative" class="q-ml-sm">
            {{ $t('content.blocked') }}
          </q-badge>
        </div>
        <div class="text-subtitle2 text-muted">
          {{ $t('content.requestTypeAnswers') }}
          <template v-if="preview"> · {{ statusLabel(preview.request.status) }}</template>
        </div>
      </div>
      <q-btn flat :label="$t('content.staffBack')" :to="{ name: 'content-staff' }" />
    </div>

    <q-banner v-if="content.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
    </q-banner>

    <div v-if="content.loading && !preview" class="text-muted">{{ $t('content.loading') }}</div>

    <template v-else-if="preview">
      <div class="text-body1 q-mb-md" style="white-space: pre-wrap">
        {{ preview.content.description }}
      </div>

      <div class="text-h6 q-mb-sm">{{ $t('content.answerCards') }}</div>
      <q-list bordered separator class="rounded-borders q-mb-lg">
        <q-item v-for="card in preview.content.answerCards" :key="card.id">
          <q-item-section>
            <q-item-label>{{ card.content }}</q-item-label>
            <q-item-label v-if="card.description" caption>{{ card.description }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <div class="text-h6 q-mb-sm">{{ $t('content.nestedTasks') }}</div>
      <div v-if="nested?.tasksPending" class="q-mb-sm text-caption text-muted">
        {{ $t('content.tasksPendingHint') }}
      </div>
      <div v-else-if="nested?.hasLiveTasks" class="q-mb-sm text-caption text-muted">
        {{ $t('content.tasksLiveHint') }}
      </div>
      <div v-else class="q-mb-sm text-caption text-muted">
        {{ $t('content.tasksMissingHint') }}
      </div>

      <div v-for="(ts, si) in nestedTaskSets" :key="ts.id" class="q-mb-md">
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
        </q-list>
      </div>
      <div v-if="!nestedTaskSets.length" class="text-muted q-mb-lg">
        {{ $t('content.emptyTasks') }}
      </div>

      <div
        v-if="nested?.tasksPending && nested.tasksPending.status === 'pending'"
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
          color="warning"
          :label="$t('content.rejectTasks')"
          :loading="content.loading"
          @click="openReject('tasks')"
        />
        <q-btn
          color="grey"
          outline
          :label="$t('content.cancelTasksPending')"
          :loading="content.loading"
          @click="onCancelTasks"
        />
      </div>

      <div v-if="preview.request.status === 'pending'" class="q-gutter-sm q-mb-lg">
        <q-btn
          color="positive"
          :label="$t('content.approveAnswers')"
          :loading="content.loading"
          :disable="!canApproveAnswers"
          @click="onApproveAnswers"
        />
        <q-btn
          color="warning"
          :label="$t('content.rejectAnswers')"
          :loading="content.loading"
          @click="openReject('answers')"
        />
        <q-btn
          color="grey"
          outline
          :label="$t('content.cancelAnswersPending')"
          :loading="content.loading"
          @click="onCancelAnswers"
        />
        <div v-if="!canApproveAnswers" class="text-caption text-muted">
          {{ $t('content.approveAnswersNeedLiveTasks') }}
        </div>
      </div>

      <div class="q-gutter-sm q-mb-lg">
        <q-btn
          v-if="!preview.pack.blocked"
          color="negative"
          outline
          :label="$t('content.block')"
          :loading="content.loading"
          @click="onBlock"
        />
        <q-btn
          v-else
          color="primary"
          outline
          :label="$t('content.unblock')"
          :loading="content.loading"
          @click="onUnblock"
        />
      </div>

      <div class="text-h6 q-mb-sm">{{ $t('content.threadAnswers') }}</div>
      <q-list bordered separator class="rounded-borders q-mb-lg">
        <q-item v-for="msg in preview.messages" :key="msg.id">
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
        <q-item v-if="!preview.messages.length">
          <q-item-section class="text-muted">{{ $t('content.emptyThread') }}</q-item-section>
        </q-item>
      </q-list>

      <q-form
        v-if="preview.request.status === 'pending' || preview.request.status === 'rejected'"
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
import { contentErrorI18nKey, useContentStore, type TaskSet } from '@/stores/content';

const auth = useAuthStore();
const content = useContentStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const requestId = computed(() => {
  const params = route.params as Record<string, string | string[] | undefined>;
  const raw = params.id;
  return typeof raw === 'string' ? raw : '';
});
const preview = computed(() => content.staffPreview);
const nested = computed(() => preview.value?.nested);
const nestedTaskSets = computed((): TaskSet[] => nested.value?.tasksContent?.taskSets ?? []);
const canApproveAnswers = computed(() => Boolean(nested.value?.hasLiveTasks));

const replyBody = ref('');
const replyFormRef = ref<QForm | null>(null);
const rejectOpen = ref(false);
const rejectComment = ref('');
const rejectTarget = ref<'answers' | 'tasks'>('answers');

const errorLabel = computed(() => {
  const key = contentErrorI18nKey(content.error);
  return key ? t(key) : (content.error ?? '');
});

function load() {
  if (!requestId.value) return;
  void content.loadStaffPreview(requestId.value).catch(() => {
    /* error in store */
  });
}

onMounted(() => {
  if (!auth.isStaff) {
    void router.replace({ name: 'content-collection' });
    return;
  }
  load();
});
watch(requestId, load);

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
  if (!answerCardId || !preview.value) return '';
  // Prefer answers cards from pending answers content; fall back to empty.
  const fromAnswers = preview.value.content.answerCards.find((c) => c.id === answerCardId);
  if (fromAnswers) return fromAnswers.content;
  return '';
}

function openReject(target: 'answers' | 'tasks') {
  rejectTarget.value = target;
  rejectComment.value = '';
  rejectOpen.value = true;
}

async function onApproveTasks() {
  const tasksId = nested.value?.tasksPending?.requestId;
  if (!tasksId) return;
  try {
    await content.approveRequest(tasksId);
    await content.loadStaffPreview(requestId.value);
  } catch {
    /* error in store */
  }
}

async function onApproveAnswers() {
  try {
    await content.approveRequest(requestId.value);
    await router.replace({ name: 'content-staff' });
  } catch {
    /* error in store */
  }
}

async function onReject() {
  const id =
    rejectTarget.value === 'tasks' ? nested.value?.tasksPending?.requestId : requestId.value;
  if (!id) return;
  try {
    await content.rejectRequest(id, rejectComment.value.trim());
    rejectOpen.value = false;
    rejectComment.value = '';
    await content.loadStaffPreview(requestId.value);
  } catch {
    /* error in store */
  }
}

async function onCancelTasks() {
  const tasksId = nested.value?.tasksPending?.requestId;
  if (!tasksId) return;
  try {
    await content.cancelRequest(tasksId);
    await content.loadStaffPreview(requestId.value);
  } catch {
    /* error in store */
  }
}

async function onCancelAnswers() {
  try {
    await content.cancelRequest(requestId.value);
    await router.replace({ name: 'content-staff' });
  } catch {
    /* error in store */
  }
}

async function onBlock() {
  if (!preview.value) return;
  try {
    await content.blockPack(preview.value.pack.id);
  } catch {
    /* error in store */
  }
}

async function onUnblock() {
  if (!preview.value) return;
  try {
    await content.unblockPack(preview.value.pack.id);
  } catch {
    /* error in store */
  }
}

async function onStaffReply() {
  try {
    await content.postStaffMessage(requestId.value, replyBody.value.trim());
    replyBody.value = '';
    await nextTick();
    replyFormRef.value?.resetValidation();
  } catch {
    /* error in store */
  }
}
</script>
