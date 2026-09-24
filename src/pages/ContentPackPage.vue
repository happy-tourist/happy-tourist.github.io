<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">
          {{ content.pack?.title || $t('content.untitled') }}
          <q-badge v-if="content.pack?.blocked" color="negative" class="q-ml-sm">
            {{ $t('content.blocked') }}
          </q-badge>
          <q-badge
            v-else-if="content.pack?.hasLive && content.pack?.inCatalog === false"
            color="grey"
            class="q-ml-sm"
          >
            {{ $t('content.unpublishedByStaff') }}
          </q-badge>
        </div>
        <div v-if="content.pack?.description" class="text-subtitle2 text-muted">
          {{ content.pack.description }}
        </div>
      </div>
      <div class="q-gutter-sm">
        <q-btn flat :label="$t('content.catalogNav')" :to="{ name: 'content-catalog' }" />
        <!-- SC-PACK-53/111/112: staff Edit without collection. -->
        <q-btn
          v-if="showStaffEdit"
          color="primary"
          icon="edit"
          :label="$t('content.edit')"
          :loading="content.loading"
          @click="onStaffEdit"
        />
        <q-btn
          v-if="showUnpublish"
          flat
          color="warning"
          :label="$t('content.unpublish')"
          :loading="content.loading"
          @click="confirmUnpublish"
        />
        <q-btn
          v-if="showRepublish"
          flat
          color="primary"
          :label="$t('content.republish')"
          :loading="content.loading"
          @click="onRepublish"
        />
        <q-btn
          v-if="showCollect"
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

      <!-- SC-PACK-117/D7: add-task-set beside «Задания» section, not header. -->
      <div class="row items-center justify-between q-mb-sm">
        <div class="text-h6">{{ $t('content.taskSets') }}</div>
        <q-btn
          v-if="showAddTaskSet"
          flat
          dense
          color="secondary"
          icon="playlist_add"
          :label="$t('content.addTaskSetNav')"
          @click="onAddTaskSet"
        />
      </div>
      <!-- SC-PACK-130/132: summary rows + drill-in; soft-unpublished gray -->
      <q-list bordered separator class="rounded-borders">
        <q-item
          v-for="(ts, si) in live.taskSets"
          :key="ts.id"
          :clickable="canEnterTaskSet(ts)"
          :class="{ 'text-grey-6': isSetSoftUnpublished(ts) }"
          v-ripple="canEnterTaskSet(ts)"
          @click="onTaskSetClick(ts)"
        >
          <q-item-section>
            <q-item-label>
              {{ $t('content.taskSetLabel', { n: si + 1 }) }}
              <q-badge v-if="isSetSoftUnpublished(ts)" color="grey" class="q-ml-sm">
                {{ $t('content.unpublishedByStaff') }}
              </q-badge>
              <span v-if="ts.coauthorLabels?.length" class="text-muted text-caption q-ml-sm">
                {{ ts.coauthorLabels.join(', ') }}
              </span>
            </q-item-label>
            <q-item-label caption>
              {{ $t('content.tasksCount', { n: ts.tasks.length }) }} ·
              {{ difficultySummary(ts) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="q-gutter-xs" @click.stop>
              <q-btn
                v-if="auth.isStaff && isSetSoftUnpublished(ts)"
                flat
                dense
                color="primary"
                :label="$t('content.republish')"
                :loading="content.loading"
                @click.stop="onRepublishSet(ts.id)"
              />
              <q-btn
                v-if="auth.isStaff && isSetSoftUnpublished(ts)"
                flat
                dense
                icon="edit"
                :aria-label="$t('content.edit')"
                @click.stop="onStaffEditSet(ts.id)"
              />
              <q-btn
                v-if="auth.isStaff && !isSetSoftUnpublished(ts) && canUnpublishSet(ts)"
                flat
                dense
                color="warning"
                :label="$t('content.unpublish')"
                :loading="content.loading"
                @click.stop="confirmUnpublishSet(ts.id)"
              />
              <q-btn
                v-if="auth.isStaff && !isSetSoftUnpublished(ts) && !canUnpublishSet(ts)"
                flat
                dense
                color="warning"
                :label="$t('content.unpublish')"
                disable
              >
                <q-tooltip>{{ $t('content.lastPublishedTaskSetHint') }}</q-tooltip>
              </q-btn>
              <q-icon v-if="canEnterTaskSet(ts)" name="chevron_right" />
            </div>
          </q-item-section>
        </q-item>
        <q-item v-if="!live.taskSets.length">
          <q-item-section class="text-muted">{{ $t('content.emptyTasks') }}</q-item-section>
        </q-item>
      </q-list>
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

    <!-- SC-PACK-129 / D16: confirm pack unpublish -->
    <q-dialog v-model="unpublishConfirmOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ $t('content.unpublishConfirmTitle') }}</div>
          <div class="q-mt-sm">{{ $t('content.unpublishConfirm') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.gateDismiss')" v-close-popup />
          <q-btn
            color="warning"
            :label="$t('content.unpublish')"
            :loading="content.loading"
            @click="doUnpublish"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- SC-PACK-132: confirm task-set unpublish -->
    <q-dialog v-model="unpublishSetConfirmOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ $t('content.unpublishTaskSetConfirmTitle') }}</div>
          <div class="q-mt-sm">{{ $t('content.unpublishTaskSetConfirm') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.gateDismiss')" v-close-popup />
          <q-btn
            color="warning"
            :label="$t('content.unpublish')"
            :loading="content.loading"
            @click="doUnpublishSet"
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
import { contentErrorI18nKey, useContentStore, type TaskSet } from '@/stores/content';

const auth = useAuthStore();
const content = useContentStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const gateOpen = ref(false);
const gateMode = ref<'login' | 'verify'>('login');
const unpublishConfirmOpen = ref(false);
const unpublishSetConfirmOpen = ref(false);
const pendingUnpublishSetId = ref<string | null>(null);

const packId = computed(() => {
  const params = route.params as Record<string, string | string[] | undefined>;
  const raw = params.id;
  return typeof raw === 'string' ? raw : '';
});
const live = computed(() => content.liveContent);
const inCollection = computed(() => Boolean(content.pack?.inCollection));

/** SC-PACK-112/124: staff Edit without collection; hide if blocked. */
const showStaffEdit = computed(() => auth.isStaff && !content.pack?.blocked);

const showUnpublish = computed(
  () =>
    auth.isStaff &&
    Boolean(content.pack?.hasLive) &&
    content.pack?.inCatalog === true &&
    !content.pack?.blocked,
);

const showRepublish = computed(
  () =>
    auth.isStaff &&
    Boolean(content.pack?.hasLive) &&
    content.pack?.inCatalog === false &&
    !content.pack?.blocked,
);

/** Soft-unpublished packs are not collectable from live (already hidden for non-staff). */
const showCollect = computed(() => content.pack?.inCatalog !== false);

/**
 * SC-PACK-53/106/107: non-staff never get full Edit on live;
 * verified + inCollection may add a task set (in-catalog only).
 */
const showAddTaskSet = computed(() => {
  if (auth.isStaff || content.pack?.blocked) return false;
  if (content.pack?.inCatalog === false) return false;
  if (!inCollection.value) return false;
  if (auth.user?.anonymous || auth.needsEmailVerification) return false;
  return true;
});

const publishedSetCount = computed(
  () => live.value?.taskSets.filter((ts) => ts.inCatalog !== false).length ?? 0,
);

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

function isSetSoftUnpublished(ts: TaskSet): boolean {
  return ts.inCatalog === false;
}

function canEnterTaskSet(ts: TaskSet): boolean {
  if (isSetSoftUnpublished(ts)) return false;
  return true;
}

function canUnpublishSet(ts: TaskSet): boolean {
  if (isSetSoftUnpublished(ts)) return false;
  return publishedSetCount.value > 1;
}

function difficultySummary(ts: TaskSet): string {
  let d1 = 0;
  let d2 = 0;
  let d3 = 0;
  for (const task of ts.tasks) {
    if (task.difficulty === 1) d1 += 1;
    else if (task.difficulty === 2) d2 += 1;
    else if (task.difficulty === 3) d3 += 1;
  }
  return t('content.taskSetDifficultySummary', { d1, d2, d3 });
}

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

async function onStaffEdit() {
  if (!packId.value) return;
  try {
    await content.acquireEditLock(packId.value);
    await router.push({ name: 'content-pack-edit', params: { id: packId.value } });
  } catch {
    /* error in store — edit_locked shown via banner */
  }
}

async function onStaffEditSet(taskSetId: string) {
  if (!packId.value) return;
  try {
    await content.acquireEditLock(packId.value);
    await content.loadStaffEdit(packId.value);
    await router.push({
      name: 'content-pack-tasks',
      params: { id: packId.value, taskSetId },
    });
  } catch {
    /* error in store */
  }
}

function confirmUnpublish() {
  unpublishConfirmOpen.value = true;
}

async function doUnpublish() {
  if (!packId.value) return;
  try {
    await content.unpublishPack(packId.value);
    unpublishConfirmOpen.value = false;
  } catch {
    /* error in store */
  }
}

async function onRepublish() {
  if (!packId.value) return;
  try {
    await content.republishPack(packId.value);
  } catch {
    /* error in store */
  }
}

function onTaskSetClick(ts: TaskSet) {
  if (!canEnterTaskSet(ts) || !packId.value) return;
  void router.push({
    name: 'content-pack-tasks',
    params: { id: packId.value, taskSetId: ts.id },
    query: { view: 'live' },
  });
}

function confirmUnpublishSet(taskSetId: string) {
  pendingUnpublishSetId.value = taskSetId;
  unpublishSetConfirmOpen.value = true;
}

async function doUnpublishSet() {
  if (!packId.value || !pendingUnpublishSetId.value) return;
  try {
    await content.unpublishTaskSet(packId.value, pendingUnpublishSetId.value);
    unpublishSetConfirmOpen.value = false;
    pendingUnpublishSetId.value = null;
  } catch {
    /* error in store */
  }
}

async function onRepublishSet(taskSetId: string) {
  if (!packId.value) return;
  try {
    await content.republishTaskSet(packId.value, taskSetId);
  } catch {
    /* error in store */
  }
}

function onAddTaskSet() {
  if (!packId.value) return;
  if (!ensureEligible()) return;
  void router.push({ name: 'content-pack-add-task-set', params: { id: packId.value } });
}

async function onAdd() {
  try {
    await content.addToCollection(packId.value);
  } catch {
    /* error in store */
  }
}
</script>
