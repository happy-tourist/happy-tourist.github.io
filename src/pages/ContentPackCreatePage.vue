<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('content.createTitle') }}</div>
        <div class="text-subtitle2 text-muted">{{ $t('content.createSubtitle') }}</div>
      </div>
      <q-btn flat :label="$t('content.catalogNav')" :to="{ name: 'content-catalog' }" />
    </div>

    <q-banner v-if="content.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ errorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
    </q-banner>

    <q-card flat bordered>
      <q-card-section>
        <q-form class="q-gutter-md" @submit.prevent="onSubmit">
          <q-input
            v-model="title"
            outlined
            dense
            lazy-rules
            :label="$t('content.packTitle')"
            :rules="[(v) => (!!v && String(v).trim().length > 0) || $t('content.titleRequired')]"
          />
          <q-input
            v-model="description"
            type="textarea"
            outlined
            dense
            autogrow
            :label="$t('content.packDescription')"
          />
          <q-btn
            type="submit"
            color="primary"
            :label="$t('content.createSubmit')"
            :loading="content.loading"
          />
        </q-form>
      </q-card-section>
    </q-card>

    <q-dialog v-model="gateOpen" persistent>
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ gateTitle }}</div>
          <div class="q-mt-sm">{{ gateText }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('content.catalogNav')" :to="{ name: 'content-catalog' }" />
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

const title = ref('');
const description = ref('');
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
  if (auth.user?.anonymous) {
    gateMode.value = 'login';
    gateOpen.value = true;
    return;
  }
  if (auth.needsEmailVerification) {
    gateMode.value = 'verify';
    gateOpen.value = true;
  }
});

async function onSubmit() {
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
  try {
    const created = await content.createPack(title.value.trim(), description.value.trim());
    // SC-PACK-01: after create → answers editing surface
    await router.replace({
      name: 'content-pack-edit',
      params: { id: created.pack.id },
    });
  } catch {
    /* error in store */
  }
}
</script>
