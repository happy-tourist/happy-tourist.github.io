<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('support.ticketTitle') }}</div>
        <div v-if="support.ticket" class="text-subtitle2 text-muted">
          {{ topicLabel(support.ticket.topic) }} · {{ statusLabel(support.ticket.status) }}
        </div>
      </div>
      <q-btn flat :label="$t('support.backToList')" :to="{ name: 'support' }" />
    </div>

    <q-banner v-if="support.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="support.error = null" />
      </template>
    </q-banner>

    <template v-if="support.ticket">
      <q-banner v-if="isClosed" dense rounded class="bg-grey-4 text-dark q-mb-md">
        {{ $t('support.closedHint') }}
        <template #action>
          <q-btn
            flat
            dense
            color="primary"
            :label="$t('support.newTicketCta')"
            :to="{ name: 'support' }"
          />
        </template>
      </q-banner>

      <q-list bordered separator class="rounded-borders q-mb-md">
        <q-item v-for="msg in support.messages" :key="msg.id">
          <q-item-section>
            <q-item-label class="text-weight-medium">
              {{ messageAuthorLabel(msg) }}
              <span class="text-caption text-muted q-ml-sm">{{ formatDate(msg.createdAt) }}</span>
            </q-item-label>
            <q-item-label class="text-body2" style="white-space: pre-wrap">{{
              msg.body
            }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <div v-if="!isClosed" class="q-gutter-md">
        <q-form class="q-gutter-md" @submit.prevent="onReply">
          <q-input
            v-model="replyBody"
            type="textarea"
            outlined
            dense
            autogrow
            :label="$t('support.reply')"
            :rules="[(v) => (!!v && String(v).trim().length > 0) || $t('support.bodyRequired')]"
          />
          <div class="row q-gutter-sm">
            <q-btn
              type="submit"
              color="primary"
              :label="$t('support.sendReply')"
              :loading="support.loading"
            />
            <q-btn
              v-if="isAuthor"
              flat
              color="negative"
              :label="$t('support.close')"
              :loading="support.loading"
              @click="onClose"
            />
          </div>
        </q-form>

        <div v-if="auth.isStaff" class="q-mt-lg">
          <div class="text-subtitle1 q-mb-sm">{{ $t('support.staffActions') }}</div>
          <div class="row q-gutter-sm">
            <q-btn
              v-if="support.ticket.status === 'under_review'"
              color="primary"
              outline
              :label="$t('support.take')"
              :loading="support.loading"
              @click="onTake"
            />
            <q-btn
              v-if="support.ticket.status !== 'awaiting_response'"
              color="warning"
              outline
              :label="$t('support.setAwaiting')"
              :loading="support.loading"
              @click="onSetAwaiting"
            />
            <q-btn
              color="negative"
              outline
              :label="$t('support.close')"
              :loading="support.loading"
              @click="onClose"
            />
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="support.loading" class="text-muted">{{ $t('support.loading') }}</div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { supportErrorI18nKey, useSupportStore, type SupportMessage } from '@/stores/support';

const auth = useAuthStore();
const support = useSupportStore();
const route = useRoute('support-ticket');
const { t } = useI18n();

const replyBody = ref('');

const ticketId = computed(() => String(route.params.id ?? ''));

const isClosed = computed(() => support.ticket?.status === 'closed');

const isAuthor = computed(() => {
  const uid = auth.user?.id != null ? String(auth.user.id) : '';
  return Boolean(uid && support.ticket && support.ticket.authorUserId === uid);
});

const errorLabel = computed(() => {
  const key = supportErrorI18nKey(support.error);
  return key ? t(key) : (support.error ?? '');
});

async function reload() {
  if (!ticketId.value) {
    return;
  }
  await support.loadTicket(ticketId.value).catch(() => {
    /* error in store */
  });
}

onMounted(() => {
  void reload();
});

watch(ticketId, () => {
  void reload();
});

function topicLabel(value: string) {
  if (
    value === 'problem' ||
    value === 'suggestion' ||
    value === 'feedback' ||
    value === 'question' ||
    value === 'other'
  ) {
    return t(`support.topics.${value}`);
  }
  return value;
}

function statusLabel(value: string) {
  if (
    value === 'under_review' ||
    value === 'in_progress' ||
    value === 'awaiting_response' ||
    value === 'closed'
  ) {
    return t(`support.statuses.${value}`);
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

/** Anonymous authors display as «Гость» (SC-SUP / D8). */
function messageAuthorLabel(msg: SupportMessage) {
  if (msg.authorKind === 'staff') {
    return t('support.authorStaff');
  }
  const uid = auth.user?.id != null ? String(auth.user.id) : '';
  if (uid && msg.authorUserId === uid) {
    return auth.user?.anonymous ? t('support.guest') : auth.displayName;
  }
  if (auth.user?.anonymous === false && msg.authorUserId === support.ticket?.authorUserId) {
    return t('support.authorUser');
  }
  return t('support.guest');
}

async function onReply() {
  try {
    await support.postMessage(ticketId.value, replyBody.value.trim());
    replyBody.value = '';
  } catch {
    /* error in store */
  }
}

async function onClose() {
  try {
    await support.closeTicket(ticketId.value);
  } catch {
    /* error in store */
  }
}

async function onTake() {
  try {
    await support.takeTicket(ticketId.value);
  } catch {
    /* error in store */
  }
}

async function onSetAwaiting() {
  try {
    await support.setStatus(ticketId.value, 'awaiting_response');
  } catch {
    /* error in store */
  }
}
</script>
