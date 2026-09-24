<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.collectionTitle') }}</div>
        <div class="text-subtitle2 text-muted">{{ $t('content.collectionSubtitle') }}</div>
      </div>
      <div class="q-gutter-sm">
        <q-btn flat :label="$t('content.catalogNav')" :to="{ name: 'content-catalog' }" />
        <!-- SC-PACK-116: hide author my-moderation for staff -->
        <q-btn
          v-if="!auth.isStaff"
          flat
          icon="hourglass_top"
          :label="$t('content.myModerationNav')"
          :to="{ name: 'content-my-moderation' }"
        />
        <q-btn
          v-if="auth.isStaff"
          flat
          icon="rate_review"
          :label="$t('content.staffNav')"
          :to="{ name: 'content-staff' }"
        />
        <q-btn color="primary" icon="add" :label="$t('content.create')" @click="onCreateClick" />
      </div>
    </div>

    <q-banner v-if="content.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
    </q-banner>

    <q-list bordered separator class="rounded-borders">
      <template v-if="content.loading && !content.collection.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('content.loading') }}</q-item-section>
        </q-item>
      </template>
      <template v-else-if="!content.collection.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('content.emptyCollection') }}</q-item-section>
        </q-item>
      </template>
      <template v-else>
        <!-- No :to on row — Quasar router-link races with side actions (SC-PACK-65/66). -->
        <q-item
          v-for="item in content.collection"
          :key="item.id"
          :clickable="canNavigateRow(item)"
          :class="{ 'text-grey-6': isSoftUnpublished(item) && !auth.isStaff }"
          v-ripple="canNavigateRow(item)"
          @click="onRowClick(item)"
        >
          <q-item-section>
            <q-item-label>
              {{ item.title || $t('content.untitled') }}
              <q-badge v-if="item.blocked" color="negative" class="q-ml-sm">
                {{ $t('content.blocked') }}
              </q-badge>
              <q-badge v-else-if="isSoftUnpublished(item)" color="grey" class="q-ml-sm">
                {{ $t('content.unpublishedByStaff') }}
              </q-badge>
              <q-badge v-else-if="!item.hasLive" color="grey" class="q-ml-sm">
                {{ $t('content.draftOnly') }}
              </q-badge>
            </q-item-label>
            <q-item-label v-if="item.description" caption>
              {{ item.description }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="q-gutter-xs" @click.stop>
              <!-- SC-PACK-118: no row add-task-set; SC-PACK-106: staff Edit only. -->
              <q-btn
                v-if="canEditPack(item)"
                flat
                dense
                icon="edit"
                :aria-label="$t('content.edit')"
                @click.stop="onEdit(item)"
              />
              <q-btn
                flat
                dense
                icon="delete"
                color="negative"
                :aria-label="$t('content.removeFromCollection')"
                :loading="content.loading"
                @click.stop="confirmRemove(item.id)"
              />
            </div>
          </q-item-section>
        </q-item>
      </template>
    </q-list>

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
            :to="{ name: 'login', query: { redirect: '/content/packs/new' } }"
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

    <q-dialog v-model="removeConfirmOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ $t('content.removeFromCollectionTitle') }}</div>
          <div class="q-mt-sm">{{ $t('content.removeFromCollectionConfirm') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.gateDismiss')" v-close-popup />
          <q-btn
            color="negative"
            :label="$t('content.removeFromCollection')"
            :loading="content.loading"
            @click="doRemove"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { contentErrorI18nKey, useContentStore, type ContentPackSummary } from '@/stores/content';

const auth = useAuthStore();
const content = useContentStore();
const router = useRouter();
const { t } = useI18n();

const gateOpen = ref(false);
const gateMode = ref<'login' | 'verify'>('login');
const removeConfirmOpen = ref(false);
const pendingRemoveId = ref<string | null>(null);

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

onMounted(() => {
  void content.listCollection().catch(() => {
    /* error in store */
  });
});

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

function onCreateClick() {
  if (!ensureEligible()) return;
  void router.push({ name: 'content-pack-new' });
}

/** Soft-unpublished: has live but not in public catalog (SC-PACK-121). */
function isSoftUnpublished(item: ContentPackSummary): boolean {
  return Boolean(item.hasLive) && item.inCatalog === false;
}

function canNavigateRow(item: ContentPackSummary): boolean {
  if (isSoftUnpublished(item) && !auth.isStaff) return false;
  return true;
}

/** Full Edit: unpublished creator, or staff any pack (SC-PACK-106/111/112/124). */
function canEditPack(item: ContentPackSummary): boolean {
  if (item.blocked) return false;
  if (auth.isStaff) return true;
  if (item.hasLive) return false;
  const uid = String(auth.user?.id ?? '');
  return Boolean(uid) && item.createdBy === uid;
}

function onRowClick(item: ContentPackSummary) {
  // SC-PACK-121/125: non-staff soft-unpublished — no navigate
  if (!canNavigateRow(item)) return;
  if (item.hasLive) {
    void router.push({ name: 'content-pack', params: { id: item.id } });
    return;
  }
  if (!canEditPack(item)) return;
  void router.push({ name: 'content-pack-edit', params: { id: item.id } });
}

function onEdit(item: ContentPackSummary) {
  if (!ensureEligible()) return;
  void router.push({ name: 'content-pack-edit', params: { id: item.id } });
}

function confirmRemove(packId: string) {
  pendingRemoveId.value = packId;
  removeConfirmOpen.value = true;
}

async function doRemove() {
  const packId = pendingRemoveId.value;
  if (!packId) return;
  try {
    await content.removeFromCollection(packId);
    removeConfirmOpen.value = false;
    pendingRemoveId.value = null;
  } catch {
    /* error in store */
  }
}
</script>
