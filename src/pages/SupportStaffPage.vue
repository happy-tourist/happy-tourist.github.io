<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('support.staffTitle') }}</div>
        <div class="text-subtitle2 text-muted">{{ $t('support.staffSubtitle') }}</div>
      </div>
      <div class="q-gutter-sm">
        <q-btn
          v-if="auth.isAdmin"
          flat
          icon="admin_panel_settings"
          :label="$t('support.adminNav')"
          :to="{ name: 'admin-users' }"
        />
        <q-btn flat :label="$t('support.backToSupport')" :to="{ name: 'support' }" />
      </div>
    </div>

    <q-banner v-if="support.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="support.error = null" />
      </template>
    </q-banner>

    <div class="row q-col-gutter-md items-end q-mb-md">
      <div class="col-12 col-sm-4">
        <q-select
          v-model="topicFilter"
          :options="topicFilterOptions"
          emit-value
          map-options
          outlined
          dense
          :label="$t('support.filterTopic')"
          @update:model-value="onFiltersChange"
        />
      </div>
      <div class="col-12 col-sm-4">
        <q-select
          v-model="statusFilter"
          :options="statusFilterOptions"
          emit-value
          map-options
          outlined
          dense
          :label="$t('support.filterStatus')"
          @update:model-value="onFiltersChange"
        />
      </div>
      <div class="col-12 col-sm-4">
        <q-btn
          flat
          icon="refresh"
          :label="$t('support.refresh')"
          :loading="support.loading"
          @click="onRefresh"
        />
      </div>
    </div>

    <q-list bordered separator class="rounded-borders">
      <template v-if="support.loading && !support.staffTickets.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('support.loading') }}</q-item-section>
        </q-item>
      </template>
      <template v-else-if="!support.staffTickets.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('support.emptyStaffList') }}</q-item-section>
        </q-item>
      </template>
      <template v-else>
        <q-item
          v-for="item in support.staffTickets"
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
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import {
  STAFF_STATUS_FILTERS,
  SUPPORT_TOPICS,
  supportErrorI18nKey,
  useSupportStore,
  type StaffStatusFilter,
  type SupportTopic,
} from '@/stores/support';

const auth = useAuthStore();
const support = useSupportStore();
const router = useRouter();
const { t } = useI18n();

/** Empty string = all topics (omit query). */
const topicFilter = ref<SupportTopic | ''>('');
/** Server default is open. */
const statusFilter = ref<StaffStatusFilter>('open');

const topicFilterOptions = computed(() => [
  { label: t('support.filterTopicAll'), value: '' as const },
  ...SUPPORT_TOPICS.map((value) => ({
    label: t(`support.topics.${value}`),
    value,
  })),
]);

const statusFilterOptions = computed(() =>
  STAFF_STATUS_FILTERS.map((value) => ({
    label: t(`support.filterStatuses.${value}`),
    value,
  })),
);

const errorLabel = computed(() => {
  const key = supportErrorI18nKey(support.error);
  return key ? t(key) : (support.error ?? '');
});

function loadStaffList() {
  return support
    .listStaffTickets({
      topic: topicFilter.value,
      status: statusFilter.value,
    })
    .catch(() => {
      /* error in store */
    });
}

onMounted(() => {
  if (!auth.isStaff) {
    void router.replace({ name: 'support' });
    return;
  }
  void loadStaffList();
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

function onFiltersChange() {
  void loadStaffList();
}

function onRefresh() {
  void loadStaffList();
}
</script>
