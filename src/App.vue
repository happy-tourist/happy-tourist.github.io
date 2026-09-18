<template>
  <q-layout view="hHh lpR fFf">
    <q-header bordered>
      <q-toolbar>
        <q-btn
          v-if="isGameRoute"
          flat
          round
          dense
          icon="logout"
          :aria-label="t('game.leave')"
          @click="onExitClick"
        />
        <q-space />
        <div v-if="isGameRoute" class="text-subtitle1 text-center">{{ statusLabel }}</div>
        <q-space />
        <q-btn
          v-if="showAccountNav"
          flat
          round
          dense
          icon="manage_accounts"
          :aria-label="t('auth.accountNavAria')"
          :to="{ name: 'account' }"
        />
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

    <q-dialog v-model="leaveConfirmOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-body1">{{ t('game.leaveConfirm') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('game.leaveCancel')" v-close-popup />
          <q-btn color="primary" :label="t('game.leaveExit')" @click="onConfirmLeave" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="emailVerifyReminderOpen" persistent>
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6 q-mb-sm">{{ t('auth.verifyReminderTitle') }}</div>
          <div class="text-body1">{{ t('auth.verifyReminderText') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            :label="t('auth.verifyReminderDismiss')"
            @click="dismissEmailVerifyReminder"
          />
          <q-btn
            color="primary"
            :label="t('auth.verifyReminderGoCabinet')"
            @click="goToCabinetFromReminder"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

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
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { useThemeStore } from '@/stores/theme';

const EMAIL_VERIFY_REMINDER_KEY = 'ht-email-verify-reminder';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const game = useGameStore();
const theme = useThemeStore();

const leaveConfirmOpen = ref(false);
const emailVerifyReminderOpen = ref(false);
/** Fallback when sessionStorage is unavailable (private mode). */
let emailVerifyReminderShown = false;

const isGameRoute = computed(() => route.name === 'game');
const isLoginRoute = computed(
  () =>
    route.name === 'login' ||
    route.name === 'forgot-password' ||
    route.name === 'confirm-email' ||
    route.name === 'reset-password',
);

/** Registered non-anonymous — cabinet link in header (design D7). */
const showAccountNav = computed(
  () => auth.isAuthenticated && auth.user && !auth.user.anonymous && !isLoginRoute.value,
);

/** Same branches as former GamePage statusLabel (SC-PRESENCE-23). */
const statusLabel = computed(() => {
  if (game.phase === 'countdown') {
    return 'Старт…';
  }
  switch (game.status) {
    case 'connecting':
      return 'Подключение…';
    case 'waiting':
    case 'playing': {
      if (game.phase === 'playing' && game.currentTurnSessionId) {
        if (game.isMyTurn) {
          return 'Ваш ход';
        }
        if (game.mySeat) {
          return 'Ход соперника';
        }
        return 'Ход игрока';
      }
      return game.phase === 'playing' ? 'Игра идёт' : 'Ожидание соперника';
    }
    case 'finished':
      return 'Игра окончена';
    default:
      return 'Нет комнаты';
  }
});

/** Confirm only when seated ∧ playing ∧ !finishPlace ∧ !timeExpired (SC-LEAVE-05/07). */
const needsLeaveConfirm = computed(
  () => game.isSeated && game.isPlaying && !game.isMySeatFinished && !game.isMySeatTimeExpired,
);

// Restore on ready / identity change — not on in-memory `user.theme` patches after POST.
// Source must be a stable multi-source array (not a getter that allocates a new [] each run),
// otherwise any invalidate (e.g. replacing auth.user) re-fires even when primitives are unchanged.
watch(
  [() => auth.ready, () => auth.user?.id, () => auth.user?.anonymous],
  () => {
    if (auth.ready) {
      void theme.syncFromAuthUser(auth.user);
    }
  },
  { immediate: true },
);

/** Once-per-session reminder → cabinet (SC-EMAIL-08/09); not that mail was already sent. */
watch(
  [() => auth.ready, () => auth.needsEmailVerification, () => route.name],
  () => {
    if (!auth.ready || !auth.needsEmailVerification) {
      return;
    }
    if (
      route.name === 'login' ||
      route.name === 'forgot-password' ||
      route.name === 'confirm-email' ||
      route.name === 'reset-password'
    ) {
      return;
    }
    if (emailVerifyReminderShown) {
      return;
    }
    try {
      if (sessionStorage.getItem(EMAIL_VERIFY_REMINDER_KEY) === '1') {
        emailVerifyReminderShown = true;
        return;
      }
    } catch {
      // private mode — use in-memory flag below
    }
    // Mark seen when shown so a new tab in the same browser session does not
    // re-open the reminder (SC-EMAIL-08 once-per-session).
    emailVerifyReminderShown = true;
    markEmailVerifyReminderSeen();
    emailVerifyReminderOpen.value = true;
  },
  { immediate: true },
);

watch(isGameRoute, (onGame) => {
  if (!onGame) {
    leaveConfirmOpen.value = false;
    // Belt-and-suspenders with leaveGame finally — allow remount rejoin.
    game.consentedLeaving = false;
  }
});

function markEmailVerifyReminderSeen() {
  try {
    sessionStorage.setItem(EMAIL_VERIFY_REMINDER_KEY, '1');
  } catch {
    // ignore
  }
}

function dismissEmailVerifyReminder() {
  markEmailVerifyReminderSeen();
  emailVerifyReminderOpen.value = false;
}

function goToCabinetFromReminder() {
  markEmailVerifyReminderSeen();
  emailVerifyReminderOpen.value = false;
  void router.push({ name: 'account' });
}

function onToggleTheme() {
  void theme.toggle();
}

function onExitClick() {
  if (needsLeaveConfirm.value) {
    leaveConfirmOpen.value = true;
    return;
  }
  void onLeave();
}

function onConfirmLeave() {
  leaveConfirmOpen.value = false;
  void onLeave();
}

async function onLeave() {
  await game.leaveGame();
  await router.push({ name: 'lobby' });
}
</script>
