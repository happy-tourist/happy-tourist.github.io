<template>
  <q-page class="flex flex-center q-pa-md">
    <q-card class="login-card q-pa-md" flat bordered>
      <q-card-section>
        <div class="text-h5 text-center">Шашки</div>
        <div class="text-subtitle2 text-center text-grey-7 q-mt-xs">
          {{ isRegister ? 'Регистрация' : 'Вход' }}
        </div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit.prevent="onSubmit">
          <q-input
            v-if="isRegister"
            v-model="displayName"
            label="Имя"
            outlined
            dense
            autocomplete="nickname"
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
            autocomplete="current-password"
            :rules="[(v) => (v && v.length >= 6) || 'Минимум 6 символов']"
          >
            <template #append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <q-banner v-if="auth.error" dense class="bg-negative text-white">
            {{ auth.error }}
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
          color="grey-8"
          label="Войти как гость"
          :loading="auth.loading"
          @click="onAnonymous"
        />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const isRegister = ref(false);
const showPassword = ref(false);
const displayName = ref('');
const email = ref('');
const password = ref('');

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
      const options = displayName.value ? { name: displayName.value } : {};
      await auth.register(email.value, password.value, options);
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
    const options = displayName.value ? { name: displayName.value } : {};
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
