<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.moderationTitle') }}</div>
        <div v-if="content.moderationRequest" class="text-subtitle2 text-muted">
          {{ typeLabel }} · {{ statusLabel(content.moderationRequest.status) }}
        </div>
      </div>
      <div class="q-gutter-sm">
        <q-btn
          flat
          :label="$t('content.edit')"
          :to="{ name: 'content-pack-edit', params: { id: packId } }"
        />
        <q-btn flat :label="$t('content.collectionNav')" :to="{ name: 'content-collection' }" />
      </div>
    </div>

    <q-banner v-if="content.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
    </q-banner>

    <div v-if="content.loading && !content.moderationRequest" class="text-muted">
      {{ $t('content.loading') }}
    </div>

    <template v-else-if="content.moderationRequest">
      <q-list bordered separator class="rounded-borders q-mb-lg">
        <q-item v-for="msg in content.moderationMessages" :key="msg.id">
          <q-item-section>
            <q-item-label>{{ messageAuthorLabel(msg) }}</q-item-label>
            <q-item-label caption>{{ formatDate(msg.createdAt) }}</q-item-label>
            <div class="q-mt-sm" style="white-space: pre-wrap">{{ msg.body }}</div>
          </q-item-section>
        </q-item>
        <q-item v-if="!content.moderationMessages.length">
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
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import type { QForm } from 'quasar';

import { useAuthStore } from '@/stores/auth';
import {
  contentErrorI18nKey,
  useContentStore,
  type ModerationMessage,
  type ModerationRequestType,
} from '@/stores/content';

const auth = useAuthStore();
const content = useContentStore();
const route = useRoute();
const { t } = useI18n();

const packId = computed(() => {
  const params = route.params as Record<string, string | string[] | undefined>;
  const raw = params.id;
  return typeof raw === 'string' ? raw : '';
});

const threadType = computed((): ModerationRequestType | undefined => {
  const q = route.query as Record<string, string | string[] | undefined>;
  const raw = q.type;
  const value = typeof raw === 'string' ? raw : '';
  if (value === 'answers' || value === 'tasks') return value;
  const fromReq = content.moderationRequest?.type;
  if (fromReq === 'answers' || fromReq === 'tasks') return fromReq;
  return undefined;
});

const replyBody = ref('');
const replyFormRef = ref<QForm | null>(null);

const canReply = computed(() => {
  const status = content.moderationRequest?.status;
  return status === 'pending' || status === 'rejected';
});

const typeLabel = computed(() => {
  const typ = content.moderationRequest?.type ?? threadType.value;
  if (typ === 'tasks') return t('content.requestTypeTasks');
  if (typ === 'answers') return t('content.requestTypeAnswers');
  return '';
});

const errorLabel = computed(() => {
  const key = contentErrorI18nKey(content.error);
  return key ? t(key) : (content.error ?? '');
});

function load() {
  if (!packId.value) return;
  const q = route.query as Record<string, string | string[] | undefined>;
  const raw = q.type;
  const type =
    raw === 'answers' || raw === 'tasks' ? (raw as ModerationRequestType) : undefined;
  void content.loadModeration(packId.value, type).catch(() => {
    /* error in store */
  });
}

onMounted(load);
watch([packId, () => route.query.type], load);

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

function messageAuthorLabel(msg: ModerationMessage) {
  if (msg.authorKind === 'staff') {
    return t('content.authorStaff');
  }
  if (msg.authorUserId === String(auth.user?.id ?? '')) {
    return t('content.authorYou');
  }
  return t('content.authorUser');
}

async function onReply() {
  try {
    await content.postModerationMessage(
      packId.value,
      replyBody.value.trim(),
      threadType.value,
    );
    replyBody.value = '';
    await nextTick();
    replyFormRef.value?.resetValidation();
  } catch {
    /* error in store */
  }
}
</script>
