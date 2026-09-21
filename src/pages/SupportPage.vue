<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('support.title') }}</div>
        <div class="text-subtitle2 text-muted">{{ auth.displayName }}</div>
      </div>
      <div class="q-gutter-sm">
        <q-btn
          v-if="auth.isStaff"
          flat
          icon="support_agent"
          :label="$t('support.staffNav')"
          :to="{ name: 'support-staff' }"
        />
        <q-btn
          v-if="auth.isAdmin"
          flat
          icon="admin_panel_settings"
          :label="$t('support.adminNav')"
          :to="{ name: 'admin-users' }"
        />
        <q-btn flat :label="$t('auth.backToLobby')" :to="{ name: 'lobby' }" />
      </div>
    </div>

    <q-banner v-if="auth.user?.anonymous" dense rounded class="bg-warning text-dark q-mb-md">
      {{ $t('support.guestWarning') }}
    </q-banner>

    <q-banner v-if="support.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="support.error = null" />
      </template>
    </q-banner>

    <q-card flat bordered class="q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">{{ $t('support.createTitle') }}</div>
        <q-form ref="createFormRef" class="q-gutter-md" @submit.prevent="onCreate">
          <q-select
            v-model="topic"
            :options="topicOptions"
            emit-value
            map-options
            outlined
            dense
            lazy-rules
            :label="$t('support.topic')"
            :rules="[(v) => !!v || $t('support.topicRequired')]"
          />
          <q-input
            v-model="body"
            type="textarea"
            outlined
            dense
            autogrow
            lazy-rules
            :label="$t('support.body')"
            :rules="[(v) => (!!v && String(v).trim().length > 0) || $t('support.bodyRequired')]"
          />
          <q-btn
            type="submit"
            color="primary"
            :label="$t('support.submit')"
            :loading="support.loading"
          />
        </q-form>
      </q-card-section>
    </q-card>

    <div class="text-h6 q-mb-sm">{{ $t('support.myTickets') }}</div>
    <q-list bordered separator class="rounded-borders">
      <template v-if="support.loading && !support.tickets.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('support.loading') }}</q-item-section>
        </q-item>
      </template>
      <template v-else-if="!support.tickets.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('support.emptyList') }}</q-item-section>
        </q-item>
      </template>
      <template v-else>
        <q-item
          v-for="item in support.tickets"
          :key="item.id"
          clickable
          v-ripple
          :to="{ name: 'support-ticket', params: { id: item.id } }"
        >
          <q-item-section>
            <q-item-label>{{ topicLabel(item.topic) }}</q-item-label>
            <q-item-label caption>
              {{ statusLabel(item.status) }}
              · {{ formatDate(item.updatedAt) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon name="chevron_right" />
          </q-item-section>
        </q-item>
      </template>
    </q-list>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { QForm } from 'quasar';

import { useAuthStore } from '@/stores/auth';
import {
  SUPPORT_TOPICS,
  supportErrorI18nKey,
  useSupportStore,
  type SupportTopic,
} from '@/stores/support';

const auth = useAuthStore();
const support = useSupportStore();
const router = useRouter();
const { t } = useI18n();

const topic = ref<SupportTopic>('problem');
const body = ref('');
const createFormRef = ref<QForm | null>(null);

const topicOptions = computed(() =>
  SUPPORT_TOPICS.map((value) => ({
    label: t(`support.topics.${value}`),
    value,
  })),
);

const errorLabel = computed(() => {
  const key = supportErrorI18nKey(support.error);
  return key ? t(key) : (support.error ?? '');
});

onMounted(() => {
  void support.listOwnTickets().catch(() => {
    /* error in store */
  });
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

async function onCreate() {
  try {
    const created = await support.createTicket(topic.value, body.value.trim());
    body.value = '';
    await nextTick();
    createFormRef.value?.resetValidation();
    await support.listOwnTickets().catch(() => undefined);
    await router.push({ name: 'support-ticket', params: { id: created.id } });
  } catch {
    /* error in store */
  }
}
</script>
