<template>
  <q-page class="flex flex-center q-pa-md">
    <q-card class="reset-card q-pa-md" flat bordered>
      <q-card-section>
        <div class="text-h5 text-center">{{ $t('auth.resetTitle') }}</div>
        <div v-if="!successMessage" class="text-subtitle2 text-center text-muted q-mt-xs">
          {{ $t('auth.resetSubtitle') }}
        </div>
      </q-card-section>

      <q-card-section>
        <q-banner v-if="missingToken" dense class="bg-negative text-white">
          {{ $t('auth.resetInvalid') }}
        </q-banner>

        <q-banner v-else-if="successMessage" dense class="bg-positive text-white">
          {{ successMessage }}
        </q-banner>

        <q-form v-else class="q-gutter-md" @submit.prevent="onSubmit">
          <q-input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :label="$t('auth.resetPassword')"
            outlined
            dense
            autocomplete="new-password"
            :rules="[(v) => passwordPolicyRule(v, $t('auth.passwordPolicy'))]"
          >
            <template #append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <PasswordStrengthMeter :password="password" />

          <q-banner v-if="pageError" dense class="bg-negative text-white">
            {{ pageError }}
          </q-banner>

          <q-btn
            type="submit"
            color="primary"
            class="full-width"
            :label="$t('auth.resetSubmit')"
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
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

import PasswordStrengthMeter from '@/components/PasswordStrengthMeter.vue';
import { passwordPolicyRule } from '@/lib/passwordPolicy';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const password = ref('');
const showPassword = ref(false);
const pageError = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const token = computed(() => {
  const raw = route.query.token;
  if (typeof raw === 'string') {
    return raw;
  }
  if (Array.isArray(raw) && typeof raw[0] === 'string') {
    return raw[0];
  }
  return '';
});

const missingToken = computed(() => !token.value && !successMessage.value);

function mapResetError(code: string | null): string {
  if (code === 'token_expired') {
    return t('auth.resetExpired');
  }
  if (code === 'token_already_used') {
    return t('auth.resetUsed');
  }
  if (code === 'token_invalid') {
    return t('auth.resetInvalid');
  }
  if (code === 'password_policy_failed') {
    return t('auth.passwordPolicy');
  }
  return t('auth.resetFailed');
}

async function onSubmit() {
  pageError.value = null;
  if (!token.value) {
    pageError.value = t('auth.resetInvalid');
    return;
  }

  try {
    await auth.resetPassword(token.value, password.value);
    // SC-RESET-02: show RU success before SC-RESET-08 login navigate.
    successMessage.value = t('auth.resetSuccess');
    await new Promise((r) => setTimeout(r, 1200));
    await router.replace({ name: 'login' });
  } catch {
    pageError.value = mapResetError(auth.error);
  }
}
</script>

<style scoped>
.reset-card {
  width: 100%;
  max-width: 400px;
}
</style>
