<template>
  <q-page class="flex flex-center q-pa-md">
    <q-card class="login-card q-pa-md" flat bordered>
      <q-card-section>
        <div class="text-h5 text-center">Счастливый турист</div>
        <div class="text-subtitle2 text-center text-muted q-mt-xs">
          {{ isRegister ? 'Регистрация' : 'Вход' }}
        </div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit.prevent="onSubmit">
          <q-input
            v-if="isRegister"
            v-model="displayName"
            :label="$t('auth.displayNameLabel')"
            outlined
            dense
            autocomplete="nickname"
            :rules="[(v) => !!String(v || '').trim() || $t('auth.displayNameRequired')]"
          />

          <q-input
            v-model="email"
            type="email"
            label="Email"
            outlined
            dense
            autocomplete="email"
            :rules="[(v) => !!v || 'Введите email']"
          />

          <q-input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            label="Пароль"
            outlined
            dense
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            :rules="passwordRules"
          >
            <template #append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <PasswordStrengthMeter
            v-if="isRegister"
            :password="password"
            :user-inputs="strengthInputs"
          />

          <q-banner v-if="auth.error" dense class="bg-negative text-white">
            {{ authErrorText }}
          </q-banner>

          <q-btn
            type="submit"
            color="primary"
            class="full-width"
            :label="isRegister ? 'Зарегистрироваться' : 'Войти'"
            :loading="auth.loading"
          />
        </q-form>
      </q-card-section>

      <q-card-actions vertical class="q-gutter-sm q-px-md q-pb-md">
        <q-btn
          v-if="!isRegister"
          flat
          dense
          color="primary"
          class="full-width"
          :label="$t('auth.forgotLink')"
          :to="{ name: 'forgot-password' }"
        />
        <q-btn
          outline
          color="primary"
          class="full-width"
          :label="$t('login.google')"
          :loading="auth.loading"
          @click="onGoogle"
        />
        <q-btn
          flat
          color="primary"
          :label="isRegister ? 'Уже есть аккаунт' : 'Создать аккаунт'"
          @click="toggleMode"
        />
        <q-btn
          flat
          color="grey"
          label="Войти как гость"
          :loading="auth.loading"
          @click="onAnonymous"
        />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

import PasswordStrengthMeter from '@/components/PasswordStrengthMeter.vue';
import { passwordPolicyRule } from '@/lib/passwordPolicy';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const isRegister = ref(false);
const showPassword = ref(false);
const displayName = ref('');
const email = ref('');
const password = ref('');

const passwordRules = computed(() => {
  if (isRegister.value) {
    return [(v: string) => passwordPolicyRule(v, t('auth.passwordPolicy'))];
  }
  return [(v: string) => (v && v.length >= 6) || t('auth.passwordMin')];
});

const strengthInputs = computed(() =>
  [email.value, displayName.value].filter((v) => Boolean(v && String(v).trim())),
);

const authErrorText = computed(() => {
  const code = auth.error;
  if (code === 'password_policy_failed') {
    return t('auth.passwordPolicy');
  }
  return code;
});

function toggleMode() {
  isRegister.value = !isRegister.value;
  auth.error = null;
}

async function goAfterLogin() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/lobby';
  await router.replace(redirect);
}

async function onSubmit() {
  try {
    if (isRegister.value) {
      const name = displayName.value.trim();
      await auth.register(email.value, password.value, { name });
    } else {
      await auth.login(email.value, password.value);
    }
    await goAfterLogin();
  } catch {
    // error already in store
  }
}

async function onAnonymous() {
  try {
    const name = displayName.value.trim();
    const options = name ? { name } : {};
    await auth.loginAnonymously(options);
    await goAfterLogin();
  } catch {
    // error already in store
  }
}

async function onGoogle() {
  try {
    await auth.loginWithGoogle();
    await goAfterLogin();
  } catch {
    // error already in store
  }
}
</script>

<style scoped>
.login-card {
  width: 100%;
  max-width: 400px;
}
</style>
