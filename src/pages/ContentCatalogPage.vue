<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.catalogTitle') }}</div>
        <div class="text-subtitle2 text-muted">{{ $t('content.catalogSubtitle') }}</div>
      </div>
      <div class="q-gutter-sm">
        <q-btn flat :label="$t('content.collectionNav')" :to="{ name: 'content-collection' }" />
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
      <template v-if="content.loading && !content.catalog.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('content.loading') }}</q-item-section>
        </q-item>
      </template>
      <template v-else-if="!content.catalog.length">
        <q-item>
          <q-item-section class="text-muted">{{ $t('content.emptyCatalog') }}</q-item-section>
        </q-item>
      </template>
      <template v-else>
        <q-item
          v-for="item in content.catalog"
          :key="item.id"
          clickable
          v-ripple
          :to="{ name: 'content-pack', params: { id: item.id } }"
        >
          <q-item-section>
            <q-item-label>
              {{ item.title || $t('content.untitled') }}
              <q-badge v-if="item.blocked" color="negative" class="q-ml-sm">
                {{ $t('content.blocked') }}
              </q-badge>
            </q-item-label>
            <q-item-label v-if="item.description" caption>
              {{ item.description }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon name="chevron_right" />
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
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { contentErrorI18nKey, useContentStore } from '@/stores/content';

const auth = useAuthStore();
const content = useContentStore();
const router = useRouter();
const { t } = useI18n();

const gateOpen = ref(false);
const gateMode = ref<'login' | 'verify'>('login');

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
  void content.listCatalog().catch(() => {
    /* error in store */
  });
});

function onCreateClick() {
  if (auth.user?.anonymous) {
    gateMode.value = 'login';
    gateOpen.value = true;
    return;
  }
  if (auth.needsEmailVerification) {
    gateMode.value = 'verify';
    gateOpen.value = true;
    return;
  }
  void router.push({ name: 'content-pack-new' });
}
</script>
