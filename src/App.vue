<template>
  <q-layout view="hHh lpR fFf">
    <q-header bordered>
      <q-toolbar>
        <q-space />
        <q-btn
          flat
          round
          dense
          :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
          aria-label="Toggle theme"
          @click="onToggleTheme"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-banner v-if="theme.error" dense rounded class="bg-negative text-white q-ma-md">
        {{ theme.error }}
        <template #action>
          <q-btn flat dense label="OK" @click="theme.error = null" />
        </template>
      </q-banner>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { watch } from 'vue';

import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

const auth = useAuthStore();
const theme = useThemeStore();

// Restore on ready / identity change — not on in-memory `user.theme` patches after POST.
watch(
  () => [auth.ready, auth.user?.id, auth.user?.anonymous] as const,
  () => {
    if (auth.ready) {
      void theme.syncFromAuthUser(auth.user);
    }
  },
  { immediate: true },
);

function onToggleTheme() {
  void theme.toggle();
}
</script>
