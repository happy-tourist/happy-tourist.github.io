<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.staffTitle') }}</div>
        <div class="text-subtitle2 text-muted">{{ $t('content.staffQueueSubtitle') }}</div>
      </div>
      <div class="q-gutter-sm">
        <q-btn flat :label="$t('content.collectionNav')" :to="{ name: 'content-collection' }" />
        <q-btn
          flat
          icon="refresh"
          :label="$t('content.refresh')"
          :loading="content.loading"
          @click="onRefresh"
        />
      </div>
    </div>

    <q-banner v-if="content.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
    </q-banner>

    <q-list bordered separator class="rounded-borders">
      <template v-if="content.loading && !content.staffPending.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('content.loading') }}</q-item-section>
        </q-item>
      </template>
      <template v-else-if="!content.staffPending.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('content.emptyStaff') }}</q-item-section>
        </q-item>
      </template>
      <template v-else>
        <q-item
          v-for="item in content.staffPending"
          :key="item.requestId"
          clickable
          v-ripple
          :to="{ name: 'content-staff-request', params: { id: item.requestId } }"
        >
          <q-item-section>
            <q-item-label>
              {{ item.title || $t('content.untitled') }}
              <q-badge v-if="item.blocked" color="negative" class="q-ml-sm">
                {{ $t('content.blocked') }}
              </q-badge>
            </q-item-label>
            <q-item-label caption>
              {{
                item.tasksOnly || item.type === 'tasks'
                  ? $t('content.requestTypeTasks')
                  : $t('content.requestTypeAnswers')
              }}
              · {{ $t('content.statuses.pending') }} · {{ formatDate(item.updatedAt) }}
              <template v-if="item.hasTasksPending && !(item.tasksOnly || item.type === 'tasks')">
                · {{ $t('content.hasTasksPending') }}
              </template>
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
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { contentErrorI18nKey, useContentStore } from '@/stores/content';

const auth = useAuthStore();
const content = useContentStore();
const router = useRouter();
const { t } = useI18n();

const errorLabel = computed(() => {
  const key = contentErrorI18nKey(content.error);
  return key ? t(key) : (content.error ?? '');
});

function load() {
  return content.listStaffPending().catch(() => {
    /* error in store */
  });
}

onMounted(() => {
  if (!auth.isStaff) {
    void router.replace({ name: 'content-collection' });
    return;
  }
  void load();
});

function formatDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }
  return d.toLocaleString('ru-RU');
}

function onRefresh() {
  void load();
}
</script>
