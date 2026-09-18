<template>
  <q-page class="flex flex-center q-pa-md">
    <q-card class="forgot-card q-pa-md" flat bordered>
      <q-card-section>
        <div class="text-h5 text-center">{{ $t('auth.forgotTitle') }}</div>
        <div class="text-subtitle2 text-center text-muted q-mt-xs">
          {{ $t('auth.forgotSubtitle') }}
        </div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit.prevent="onSubmit">
          <q-input
            v-model="email"
            type="email"
            :label="$t('auth.email')"
            outlined
            dense
            autocomplete="email"
            :rules="[(v) => !!v || $t('auth.emailRequired')]"
          />

          <q-banner v-if="auth.error" dense class="bg-negative text-white">
            {{ auth.error }}
          </q-banner>

          <q-banner v-if="successMessage" dense class="bg-positive text-white">
            {{ successMessage }}
          </q-banner>

          <q-btn
            type="submit"
            color="primary"
            class="full-width"
            :label="$t('auth.forgotSubmit')"
            :loading="auth.loading"
          />
        </q-form>
      </q-card-section>

      <q-card-actions vertical class="q-px-md q-pb-md">
        <q-btn flat color="primary" :label="$t('auth.backToLogin')" :to="{ name: 'login' }" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const { t } = useI18n();

const email = ref('');
const successMessage = ref<string | null>(null);

async function onSubmit() {
  successMessage.value = null;
  try {
    await auth.forgotPassword(email.value);
    successMessage.value = t('auth.forgotSuccess');
  } catch {
    // error already in store
  }
}
</script>

<style scoped>
.forgot-card {
  width: 100%;
  max-width: 400px;
}
</style>
