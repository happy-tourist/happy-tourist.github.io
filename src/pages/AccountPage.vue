<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('auth.cabinetTitle') }}</div>
        <div class="text-subtitle2 text-muted">{{ auth.displayName }}</div>
      </div>
      <q-btn flat :label="$t('auth.backToLobby')" :to="{ name: 'lobby' }" />
    </div>

    <q-banner v-if="auth.error" dense rounded class="bg-negative text-white q-mb-md">
      {{ auth.error }}
      <template #action>
        <q-btn flat dense label="OK" @click="auth.error = null" />
      </template>
    </q-banner>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle2 text-muted q-mb-sm">{{ $t('auth.email') }}</div>
        <div class="row items-center q-col-gutter-sm">
          <div class="col">
            <div class="text-body1">{{ auth.user?.email || '—' }}</div>
            <div v-if="auth.user?.emailVerified === true" class="text-caption text-positive">
              {{ $t('auth.emailVerified') }}
            </div>
            <div v-else-if="auth.user?.email" class="text-caption text-warning">
              {{ $t('auth.emailUnverified') }}
            </div>
          </div>
          <div v-if="showConfirmButton" class="col-auto">
            <q-btn
              color="primary"
              outline
              dense
              :label="$t('auth.sendConfirm')"
              :loading="auth.loading"
              @click="onSendConfirm"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-h6 q-mb-md">{{ $t('auth.changeEmailTitle') }}</div>
        <q-form class="q-gutter-md" @submit.prevent="onChangeEmail">
          <q-input
            v-model="newEmail"
            type="email"
            :label="$t('auth.newEmail')"
            outlined
            dense
            autocomplete="email"
            :rules="[(v) => !!v || $t('auth.emailRequired')]"
          />
          <q-btn
            type="submit"
            color="primary"
            :label="$t('auth.changeEmailSubmit')"
            :loading="auth.loading"
          />
        </q-form>
      </q-card-section>
    </q-card>

    <q-dialog v-model="confirmSentOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-body1">{{ $t('auth.confirmSentDialog') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn color="primary" :label="$t('auth.confirmSentOk')" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const newEmail = ref('');
const confirmSentOpen = ref(false);

/** Cabinet is for registered (non-anonymous) users only (design D7). */
onMounted(() => {
  if (auth.user?.anonymous) {
    void router.replace({ name: 'lobby' });
  }
});

const showConfirmButton = computed(
  () => Boolean(auth.user?.email) && !auth.user?.anonymous && auth.user?.emailVerified !== true,
);

async function onSendConfirm() {
  try {
    await auth.sendEmailConfirmation();
    confirmSentOpen.value = true;
  } catch {
    // error already in store
  }
}

async function onChangeEmail() {
  try {
    await auth.changeEmail(newEmail.value);
    newEmail.value = '';
  } catch {
    // error already in store
  }
}
</script>
