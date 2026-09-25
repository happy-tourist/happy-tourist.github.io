<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.myModerationTitle') }}</div>
        <div class="text-subtitle2 text-muted">{{ $t('content.myModerationSubtitle') }}</div>
      </div>
      <div class="q-gutter-sm">
        <q-btn flat :label="$t('content.catalogNav')" :to="{ name: 'content-catalog' }" />
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
      <template v-if="content.loading && !content.myModeration.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('content.loading') }}</q-item-section>
        </q-item>
      </template>
      <template v-else-if="!content.myModeration.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('content.emptyMyModeration') }}</q-item-section>
        </q-item>
      </template>
      <template v-else>
        <!-- SC-PACK-75: click → cards editor for that pack. -->
        <q-item
          v-for="item in content.myModeration"
          :key="item.requestId"
          clickable
          v-ripple
          :to="myModerationLink(item)"
        >
          <q-item-section>
            <q-item-label>{{ item.title || $t('content.untitled') }}</q-item-label>
            <q-item-label caption>
              {{ requestTypeLabel(item.type) }}
              · {{ queueStatusLabel(item.status) }} · {{ formatDate(item.updatedAt) }}
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

import { contentErrorI18nKey, useContentStore, type MyModerationItem } from '@/stores/content';

const content = useContentStore();
const { t } = useI18n();

const errorLabel = computed(() => {
  const key = contentErrorI18nKey(content.error);
  return key ? t(key) : (content.error ?? '');
});

function load() {
  return content.listMyModeration().catch(() => {
    /* error in store */
  });
}

onMounted(() => {
  void load();
});

function myModerationLink(item: MyModerationItem) {
  if (item.type === 'map' && item.mapId) {
    return { name: 'content-map-edit', params: { id: item.mapId } };
  }
  if (item.type === 'task_set' || item.type === 'tasks') {
    return { name: 'content-pack-add-task-set', params: { id: item.packId } };
  }
  return { name: 'content-pack-edit', params: { id: item.packId } };
}

function requestTypeLabel(type: string) {
  if (type === 'map') return t('maps.requestType');
  if (type === 'task_set' || type === 'tasks') return t('content.requestTypeTaskSet');
  return t('content.requestTypePack');
}

/** pending → на модерации; needs_revision → нужна доработка. */
function queueStatusLabel(status: string) {
  if (status === 'pending') return t('content.statuses.pending');
  if (status === 'needs_revision' || status === 'rejected')
    return t('content.statuses.needs_revision');
  return status;
}

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
