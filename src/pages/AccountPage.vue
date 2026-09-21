<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ $t('auth.cabinetTitle') }}</div>
        <div class="text-subtitle2 text-muted">{{ auth.displayName }}</div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          flat
          color="negative"
          :label="$t('auth.logout')"
          :loading="auth.loading"
          @click="onLogout"
        />
      </div>
    </div>

    <q-banner v-if="pageError" dense rounded class="bg-negative text-white q-mb-md">
      {{ pageError }}
      <template #action>
        <q-btn flat dense label="OK" @click="clearErrors" />
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

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">{{ $t('auth.displayNameTitle') }}</div>
        <q-form class="q-gutter-md" @submit.prevent="onUpdateDisplayName">
          <q-input
            v-model="nameDraft"
            :label="$t('auth.displayNameLabel')"
            outlined
            dense
            autocomplete="nickname"
            :rules="[(v) => !!String(v || '').trim() || $t('auth.displayNameRequired')]"
          />
          <q-btn
            type="submit"
            color="primary"
            :label="$t('auth.displayNameSubmit')"
            :loading="auth.loading"
          />
        </q-form>
      </q-card-section>
    </q-card>

    <q-card v-if="auth.canChangePassword" flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">{{ $t('auth.changePasswordTitle') }}</div>
        <q-form class="q-gutter-md" @submit.prevent="onChangePassword">
          <q-input
            v-model="currentPassword"
            :type="showCurrentPassword ? 'text' : 'password'"
            :label="$t('auth.currentPassword')"
            outlined
            dense
            autocomplete="current-password"
            :rules="[(v) => !!v || $t('auth.currentPasswordRequired')]"
          >
            <template #append>
              <q-icon
                :name="showCurrentPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showCurrentPassword = !showCurrentPassword"
              />
            </template>
          </q-input>
          <q-input
            v-model="newPassword"
            :type="showNewPassword ? 'text' : 'password'"
            :label="$t('auth.newPassword')"
            outlined
            dense
            autocomplete="new-password"
            :rules="[(v) => passwordPolicyRule(v, $t('auth.passwordPolicy'))]"
          >
            <template #append>
              <q-icon
                :name="showNewPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showNewPassword = !showNewPassword"
              />
            </template>
          </q-input>
          <PasswordStrengthMeter :password="newPassword" />
          <q-btn
            type="submit"
            color="primary"
            :label="$t('auth.changePasswordSubmit')"
            :loading="auth.loading"
          />
        </q-form>
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
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

import PasswordStrengthMeter from '@/components/PasswordStrengthMeter.vue';
import { passwordPolicyRule } from '@/lib/passwordPolicy';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const { t } = useI18n();

const newEmail = ref('');
const nameDraft = ref('');
const currentPassword = ref('');
const newPassword = ref('');
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const confirmSentOpen = ref(false);

/** Cabinet is for registered (non-anonymous) users only (design D7). */
onMounted(() => {
  if (auth.user?.anonymous) {
    void router.replace({ name: 'lobby' });
  }
});

watch(
  () => [auth.user?.displayName, auth.user?.name] as const,
  ([dn, name]) => {
    const persisted = typeof dn === 'string' ? dn.trim() : '';
    if (persisted) {
      nameDraft.value = persisted;
      return;
    }
    nameDraft.value = typeof name === 'string' ? name : '';
  },
  { immediate: true },
);

const showConfirmButton = computed(
  () => Boolean(auth.user?.email) && !auth.user?.anonymous && auth.user?.emailVerified !== true,
);

const pageError = computed(() => {
  const code = auth.error;
  if (!code) {
    return null;
  }
  if (code === 'display_name_invalid') {
    return t('auth.displayNameRequired');
  }
  if (code === 'invalid_current_password') {
    return t('auth.invalidCurrentPassword');
  }
  if (code === 'password_policy_failed') {
    return t('auth.passwordPolicy');
  }
  if (code === 'password_change_unavailable') {
    return t('auth.passwordChangeUnavailable');
  }
  return code;
});

function clearErrors() {
  auth.error = null;
}

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

async function onUpdateDisplayName() {
  try {
    await auth.updateDisplayName(nameDraft.value.trim());
  } catch {
    // error already in store
  }
}

async function onChangePassword() {
  try {
    await auth.changePassword(currentPassword.value, newPassword.value);
    await router.replace({ name: 'login' });
  } catch {
    // error already in store — session kept on failure (SC-PROFILE-04)
  }
}

async function onLogout() {
  try {
    await auth.logout();
    await router.replace({ name: 'login' });
  } catch {
    // error already in store
  }
}
</script>
