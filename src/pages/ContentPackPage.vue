<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">
          {{ content.pack?.title || $t('content.untitled') }}
          <q-badge v-if="content.pack?.blocked" color="negative" class="q-ml-sm">
            {{ $t('content.blocked') }}
          </q-badge>
        </div>
        <div v-if="content.pack?.description" class="text-subtitle2 text-muted">
          {{ content.pack.description }}
        </div>
      </div>
      <div class="q-gutter-sm">
        <q-btn flat :label="$t('content.catalogNav')" :to="{ name: 'content-catalog' }" />
        <q-btn
          color="primary"
          outline
          :label="added ? $t('content.inCollection') : $t('content.addToCollection')"
          :loading="content.loading"
          :disable="Boolean(content.pack?.blocked) || added"
          @click="onAdd"
        />
      </div>
    </div>

    <q-banner v-if="content.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
    </q-banner>

    <div v-if="content.loading && !live" class="text-muted">{{ $t('content.loading') }}</div>

    <template v-else-if="live">
      <div class="text-h6 q-mb-sm">{{ $t('content.answerCards') }}</div>
      <q-list bordered separator class="rounded-borders q-mb-lg">
        <q-item v-for="card in live.answerCards" :key="card.id">
          <q-item-section>
            <q-item-label>{{ card.content }}</q-item-label>
            <q-item-label v-if="card.description" caption>{{ card.description }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item v-if="!live.answerCards.length">
          <q-item-section class="text-muted">{{ $t('content.emptyCards') }}</q-item-section>
        </q-item>
      </q-list>

      <div class="text-h6 q-mb-sm">{{ $t('content.taskSets') }}</div>
      <div v-for="(ts, si) in live.taskSets" :key="ts.id" class="q-mb-md">
        <div class="text-subtitle1 q-mb-xs">
          {{ $t('content.taskSetLabel', { n: si + 1 }) }}
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
                ·
                {{
                  $t('content.slotsCount', { n: task.slots.filter((s) => s.answerCardId).length })
                }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div v-if="!live.taskSets.length" class="text-muted">{{ $t('content.emptyTasks') }}</div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { contentErrorI18nKey, useContentStore } from '@/stores/content';

const content = useContentStore();
const route = useRoute();
const { t } = useI18n();

const added = ref(false);

const packId = computed(() => {
  const params = route.params as Record<string, string | string[] | undefined>;
  const raw = params.id;
  return typeof raw === 'string' ? raw : '';
});
const live = computed(() => content.liveContent);

const errorLabel = computed(() => {
  const key = contentErrorI18nKey(content.error);
  return key ? t(key) : (content.error ?? '');
});

function load() {
  if (!packId.value) return;
  added.value = false;
  void content.loadLivePack(packId.value).catch(() => {
    /* error in store */
  });
}

onMounted(load);
watch(packId, load);

async function onAdd() {
  try {
    await content.addToCollection(packId.value);
    added.value = true;
  } catch {
    /* error in store */
  }
}
</script>
