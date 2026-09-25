<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">
          <template v-if="isMapRequest">
            {{ mapTitle }}
          </template>
          <template v-else>
            {{ preview?.pack?.title || $t('content.untitled') }}
          </template>
          <q-badge v-if="preview?.pack?.blocked" color="negative" class="q-ml-sm">
            {{ $t('content.blocked') }}
          </q-badge>
        </div>
        <div class="text-subtitle2 text-muted">
          {{ requestTypeLabel }}
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

    <template v-else-if="preview && isMapRequest && mapContent">
      <div class="row q-col-gutter-md q-mb-lg items-start">
        <div class="col-auto">
          <MapGridPreview
            :grid="mapContent.grid"
            :size="200"
            :aria-label="$t('maps.previewAria')"
          />
        </div>
        <div class="col">
          <div class="text-body1">
            {{ preview.map?.authorDisplayName || $t('content.authorUser') }}
          </div>
          <div class="text-subtitle2 text-muted">
            {{
              $t('maps.seatConfig', {
                players: mapContent.players,
                tourists: mapContent.touristsPerPlayer,
              })
            }}
          </div>
        </div>
      </div>

      <div v-if="isOpen" class="q-gutter-sm q-mb-lg">
        <q-btn
          color="positive"
          :label="$t('content.approve')"
          :loading="content.loading"
          :disable="!canApprove"
          @click="onApprove"
        />
        <q-btn
          color="warning"
          :label="$t('content.needsRevision')"
          :loading="content.loading"
          @click="openNeedsRevision"
        />
        <q-btn
          color="grey"
          outline
          :label="$t('content.cancelPending')"
          :loading="content.loading"
          @click="onCancel"
        />
        <div v-if="!canApprove" class="text-caption text-muted">
          {{ $t('maps.approveNeedStarts') }}
        </div>
      </div>

      <div class="text-h6 q-mb-sm">{{ $t('content.moderationThread') }}</div>
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

      <q-form v-if="isOpen" ref="replyFormRef" class="q-gutter-md" @submit.prevent="onStaffReply">
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

    <template v-else-if="preview && packContent">
      <div class="text-body1 q-mb-md" style="white-space: pre-wrap">
        {{ packContent.description }}
      </div>

      <template v-if="isPackRequest">
        <div class="text-h6 q-mb-sm">{{ $t('content.answerCards') }}</div>
        <q-list bordered separator class="rounded-borders q-mb-lg">
          <q-item v-for="card in packContent.answerCards" :key="card.id">
            <q-item-section>
              <q-item-label>{{ card.content }}</q-item-label>
              <q-item-label v-if="card.description" caption>{{ card.description }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-if="!packContent.answerCards.length">
            <q-item-section class="text-muted">{{ $t('content.emptyCards') }}</q-item-section>
          </q-item>
        </q-list>
      </template>

      <div class="text-h6 q-mb-sm">{{ $t('content.taskSets') }}</div>
      <div v-for="(ts, si) in packContent.taskSets" :key="ts.id" class="q-mb-md">
        <div class="text-subtitle1 q-mb-xs">
          {{
            $t('content.taskSetLabelFrom', {
              n: si + 1,
              name: ts.authorDisplayName || $t('content.authorUser'),
            })
          }}
          <span v-if="ts.coauthorLabels?.length" class="text-muted text-caption q-ml-sm">
            {{ ts.coauthorLabels.join(', ') }}
          </span>
        </div>
        <q-list bordered separator class="rounded-borders">
          <q-item v-for="task in ts.tasks" :key="task.id">
            <q-item-section>
              <q-item-label>{{ task.question }}</q-item-label>
              <q-item-label caption>
                {{ $t('content.difficultyLabel') }}:
                {{ $t(`content.difficulty.${task.difficulty}`) }}
              </q-item-label>
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
          </q-item>
        </q-list>
      </div>
      <div v-if="!packContent.taskSets.length" class="text-muted q-mb-lg">
        {{ $t('content.emptyTaskSets') }}
      </div>

      <div v-if="isOpen" class="q-gutter-sm q-mb-lg">
        <q-btn
          color="positive"
          :label="$t('content.approve')"
          :loading="content.loading"
          :disable="!canApprove"
          @click="onApprove"
        />
        <q-btn
          color="warning"
          :label="$t('content.needsRevision')"
          :loading="content.loading"
          @click="openNeedsRevision"
        />
        <q-btn
          color="grey"
          outline
          :label="$t('content.cancelPending')"
          :loading="content.loading"
          @click="onCancel"
        />
        <div v-if="!canApprove" class="text-caption text-muted">
          {{ $t('content.approveNeedTaskSets') }}
        </div>
      </div>

      <div class="text-h6 q-mb-sm">{{ $t('content.moderationThread') }}</div>
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

      <q-form v-if="isOpen" ref="replyFormRef" class="q-gutter-md" @submit.prevent="onStaffReply">
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

    <q-dialog v-model="needsRevisionOpen">
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">{{ $t('content.needsRevisionTitle') }}</div>
          <q-input
            v-model="needsRevisionComment"
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
            :label="$t('content.needsRevision')"
            :disable="!needsRevisionComment.trim()"
            :loading="content.loading"
            @click="onNeedsRevision"
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

import MapGridPreview from '@/components/MapGridPreview.vue';
import { useAuthStore } from '@/stores/auth';
import {
  contentErrorI18nKey,
  useContentStore,
  type MapStaffContent,
  type PackContent,
  type TaskSlot,
} from '@/stores/content';

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

const isMapRequest = computed(() => preview.value?.request.type === 'map');

const isPackRequest = computed(() => {
  const type = preview.value?.request.type;
  return type !== 'task_set' && type !== 'tasks' && type !== 'map';
});

const mapContent = computed((): MapStaffContent | null => {
  if (!isMapRequest.value || !preview.value) return null;
  const c = preview.value.content as MapStaffContent;
  if (typeof c?.grid !== 'string') return null;
  return c;
});

const packContent = computed((): PackContent | null => {
  if (isMapRequest.value || !preview.value) return null;
  const c = preview.value.content as PackContent;
  if (!Array.isArray(c?.answerCards)) return null;
  return c;
});

const mapTitle = computed(() => {
  const c = mapContent.value;
  if (!c) return t('maps.untitled');
  return t('maps.seatConfig', { players: c.players, tourists: c.touristsPerPlayer });
});

const requestTypeLabel = computed(() => {
  if (isMapRequest.value) return t('maps.requestType');
  return isPackRequest.value ? t('content.requestTypePack') : t('content.requestTypeTaskSet');
});

const isOpen = computed(() => {
  const status = preview.value?.request.status;
  return status === 'pending' || status === 'needs_revision' || status === 'rejected';
});

const canApprove = computed(() => {
  if (typeof preview.value?.canApprove === 'boolean') return preview.value.canApprove;
  if (isMapRequest.value) {
    const c = mapContent.value;
    if (!c) return false;
    const starts = [...c.grid].filter((ch) => ch === '1').length;
    return starts >= c.players * c.touristsPerPlayer;
  }
  const c = packContent.value;
  if (!c) return false;
  if (!isPackRequest.value) {
    return c.taskSets.length >= 1 && c.taskSets.every((ts) => ts.tasks.length >= 2);
  }
  return c.answerCards.length >= 2 && c.taskSets.length >= 1;
});

const replyBody = ref('');
const replyFormRef = ref<QForm | null>(null);
const needsRevisionOpen = ref(false);
const needsRevisionComment = ref('');

const errorLabel = computed(() => {
  const key = contentErrorI18nKey(content.error);
  return key ? t(key) : (content.error ?? '');
});

function statusLabel(status: string) {
  if (status === 'pending') return t('content.statuses.pending');
  if (status === 'needs_revision' || status === 'rejected')
    return t('content.statuses.needs_revision');
  if (status === 'approved') return t('content.statuses.approved');
  return status;
}

function slotLabel(slot: TaskSlot) {
  if (!slot.answerCardId || !packContent.value) {
    return t('content.slotEmpty');
  }
  const card = packContent.value.answerCards.find((c) => c.id === slot.answerCardId);
  if (card) {
    const text = card.content?.trim();
    if (text) return text;
  }
  return t('content.slotFilled');
}

function formatDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('ru-RU');
}

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

async function onApprove() {
  if (!requestId.value || !canApprove.value) return;
  try {
    await content.approveRequest(requestId.value);
    await router.replace({ name: 'content-staff' });
  } catch {
    /* error in store */
  }
}

function openNeedsRevision() {
  needsRevisionComment.value = '';
  needsRevisionOpen.value = true;
}

async function onNeedsRevision() {
  if (!requestId.value || !needsRevisionComment.value.trim()) return;
  try {
    await content.needsRevisionRequest(requestId.value, needsRevisionComment.value.trim());
    needsRevisionOpen.value = false;
    load();
  } catch {
    /* error in store */
  }
}

async function onCancel() {
  if (!requestId.value) return;
  try {
    await content.cancelRequest(requestId.value);
    await router.replace({ name: 'content-staff' });
  } catch {
    /* error in store */
  }
}

async function onStaffReply() {
  if (!requestId.value || !replyBody.value.trim()) return;
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
