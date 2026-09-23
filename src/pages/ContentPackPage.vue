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
          v-if="showEdit"
          color="primary"
          icon="edit"
          :label="$t('content.edit')"
          @click="onEdit"
        />
        <q-btn
          color="primary"
          outline
          :label="inCollection ? $t('content.inCollection') : $t('content.addToCollection')"
          :loading="content.loading"
          :disable="Boolean(content.pack?.blocked) || inCollection"
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

    <q-dialog v-model="gateOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ gateTitle }}</div>
          <div class="q-mt-sm">{{ gateText }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.gateDismiss')" v-close-popup />
          <q-btn
            v-if="gateMode === 'login'"
            color="primary"
            :label="$t('content.gateLogin')"
            :to="{ name: 'login', query: { redirect: editRedirect } }"
          />
          <q-btn
            v-else
            color="primary"
            :label="$t('content.gateVerify')"
            :to="{ name: 'account' }"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { contentErrorI18nKey, useContentStore } from '@/stores/content';

const auth = useAuthStore();
const content = useContentStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const gateOpen = ref(false);
const gateMode = ref<'login' | 'verify'>('login');

const packId = computed(() => {
  const params = route.params as Record<string, string | string[] | undefined>;
  const raw = params.id;
  return typeof raw === 'string' ? raw : '';
});
const live = computed(() => content.liveContent);
/** D29 / SC-PACK-64: membership from live GET, not ephemeral local flag. */
const inCollection = computed(() => Boolean(content.pack?.inCollection));

/**
 * D27 / SC-PACK-53/61–63: Edit when in collection; hide if any pending
 * answers|tasks authored by someone else; pending author still sees Edit.
 * SC-PACK-25: blocked packs are not editable.
 */
const showEdit = computed(() => {
  if (!inCollection.value) return false;
  if (content.pack?.blocked) return false;
  const me = String(auth.user?.id ?? '');
  const answersAuthor = content.pendingAnswersAuthorId;
  const tasksAuthor = content.pendingTasksAuthorId;
  if (answersAuthor && String(answersAuthor) !== me) return false;
  if (tasksAuthor && String(tasksAuthor) !== me) return false;
  return true;
});

const editRedirect = computed(() =>
  packId.value ? `/content/packs/${packId.value}/edit` : '/content/collection',
);

const gateTitle = computed(() =>
  gateMode.value === 'login' ? t('content.gateLoginTitle') : t('content.gateVerifyTitle'),
);
const gateText = computed(() =>
  gateMode.value === 'login' ? t('content.gateLoginText') : t('content.gateVerifyText'),
);

const errorLabel = computed(() => {
  const key = contentErrorI18nKey(content.error);
  return key ? t(key) : (content.error ?? '');
});

function load() {
  if (!packId.value) return;
  void content.loadLivePack(packId.value).catch(() => {
    /* error in store */
  });
}

onMounted(load);
watch(packId, load);

function ensureEligible(): boolean {
  if (auth.user?.anonymous) {
    gateMode.value = 'login';
    gateOpen.value = true;
    return false;
  }
  if (auth.needsEmailVerification) {
    gateMode.value = 'verify';
    gateOpen.value = true;
    return false;
  }
  return true;
}

function onEdit() {
  if (!packId.value) return;
  if (!ensureEligible()) return;
  void router.push({ name: 'content-pack-edit', params: { id: packId.value } });
}

async function onAdd() {
  try {
    await content.addToCollection(packId.value);
  } catch {
    /* error in store */
  }
}
</script>
