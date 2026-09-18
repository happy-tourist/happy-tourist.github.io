<template>
  <q-page class="flex flex-center q-pa-md">
    <q-card class="confirm-card q-pa-md" flat bordered>
      <q-card-section>
        <div class="text-h5 text-center">{{ $t('auth.confirmTitle') }}</div>
      </q-card-section>

      <q-card-section>
        <div v-if="pending" class="text-center text-muted">
          {{ $t('auth.confirmPending') }}
        </div>

        <q-banner v-if="pageError" dense class="bg-negative text-white">
          {{ pageError }}
        </q-banner>

        <q-banner v-if="successMessage" dense class="bg-positive text-white">
          {{ successMessage }}
        </q-banner>
      </q-card-section>

      <q-card-actions v-if="pageError" vertical class="q-px-md q-pb-md">
        <q-btn flat color="primary" :label="$t('auth.backToLogin')" :to="{ name: 'login' }" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const pending = ref(true);
const pageError = ref<string | null>(null);
const successMessage = ref<string | null>(null);

function mapConfirmError(code: string | null): string {
  if (code === 'token_expired') {
    return t('auth.confirmExpired');
  }
  if (code === 'token_invalid') {
    return t('auth.confirmInvalid');
  }
  return t('auth.confirmFailed');
}

onMounted(async () => {
  const raw = route.query.token;
  const token = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  if (!token) {
    pending.value = false;
    pageError.value = t('auth.confirmInvalid');
    return;
  }

  try {
    await auth.confirmEmail(token);
    // SC-EMAIL-02: show RU success before SC-EMAIL-11 lobby navigate.
    successMessage.value = t('auth.confirmSuccess');
    pending.value = false;
    await new Promise((r) => setTimeout(r, 1200));
    await router.replace({ name: 'lobby' });
  } catch {
    pending.value = false;
    pageError.value = mapConfirmError(auth.error);
  }
});
</script>

<style scoped>
.confirm-card {
  width: 100%;
  max-width: 400px;
}
</style>
