<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.collectionTitle') }}</div>
        <div class="text-subtitle2 text-muted">{{ $t('content.collectionSubtitle') }}</div>
      </div>
      <div class="q-gutter-sm">
        <q-btn flat :label="$t('content.catalogNav')" :to="{ name: 'content-catalog' }" />
        <q-btn
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
        <!-- No :to on row — Quasar router-link races with side Edit/trash (SC-PACK-65/66). -->
        <q-item
          v-for="item in content.collection"
          :key="item.id"
          clickable
          v-ripple
          @click="onRowClick(item)"
        >
          <q-item-section>
            <q-item-label>
              {{ item.title || $t('content.untitled') }}
              <q-badge v-if="item.blocked" color="negative" class="q-ml-sm">
                {{ $t('content.blocked') }}
              </q-badge>
              <q-badge v-if="!item.hasLive" color="grey" class="q-ml-sm">
                {{ $t('content.draftOnly') }}
              </q-badge>
            </q-item-label>
            <q-item-label v-if="item.description" caption>
              {{ item.description }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="q-gutter-xs" @click.stop>
              <!-- SC-PACK-25: blocked packs are not editable. -->
              <q-btn
                v-if="!item.blocked"
                flat
                dense
                icon="edit"
                :aria-label="$t('content.edit')"
                @click.stop="onEdit(item.id)"
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

/** Row body: live view when published, else editor (draft-only). D28 / SC-PACK-65. */
function onRowClick(item: ContentPackSummary) {
  if (item.hasLive) {
    void router.push({ name: 'content-pack', params: { id: item.id } });
    return;
  }
  void router.push({ name: 'content-pack-edit', params: { id: item.id } });
}

/** Side Edit always opens editor (even when hasLive). SC-PACK-66. */
function onEdit(packId: string) {
  if (!ensureEligible()) return;
  void router.push({ name: 'content-pack-edit', params: { id: packId } });
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
