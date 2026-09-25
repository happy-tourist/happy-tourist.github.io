<template>
  <q-layout view="hHh lpR fFf">
    <q-header bordered>
      <q-toolbar>
        <button
          type="button"
          class="brand-logo-control"
          data-test-id="brand-logo"
          :aria-label="brandLogoAria"
          @click="onBrandLogoClick"
        >
          <img :src="brandLogoUrl" alt="" class="brand-logo" />
        </button>

        <!-- SC-BRAND-11/12: section links right of logo (hidden on Game / auth) -->
        <div
          v-if="showSectionNav && !isNarrow"
          class="row items-center q-gutter-xs q-ml-sm"
          data-test-id="header-sections"
        >
          <q-btn
            flat
            dense
            :label="t('header.packs')"
            :to="{ name: 'content-catalog' }"
            data-test-id="header-packs"
          />
          <q-btn
            flat
            dense
            :label="t('header.maps')"
            :to="{ name: 'content-maps' }"
            data-test-id="header-maps"
          />
          <q-btn
            flat
            dense
            :label="t('header.support')"
            :to="{ name: 'support' }"
            data-test-id="header-support"
          />
          <q-btn
            v-if="auth.isStaff"
            flat
            dense
            :label="t('header.moderation')"
            :to="{ name: 'content-staff' }"
            data-test-id="header-moderation"
          />
        </div>

        <!-- SC-BRAND-14: burger on narrow viewport -->
        <q-btn
          v-if="showSectionNav && isNarrow"
          flat
          dense
          round
          icon="menu"
          class="q-ml-sm"
          data-test-id="header-burger"
          :aria-label="t('header.menu')"
        >
          <q-menu data-test-id="header-burger-menu">
            <q-list style="min-width: 180px">
              <q-item clickable v-close-popup :to="{ name: 'content-catalog' }">
                <q-item-section>{{ t('header.packs') }}</q-item-section>
              </q-item>
              <q-item clickable v-close-popup :to="{ name: 'content-maps' }">
                <q-item-section>{{ t('header.maps') }}</q-item-section>
              </q-item>
              <q-item clickable v-close-popup :to="{ name: 'support' }">
                <q-item-section>{{ t('header.support') }}</q-item-section>
              </q-item>
              <q-item
                v-if="auth.isStaff"
                clickable
                v-close-popup
                :to="{ name: 'content-staff' }"
                data-test-id="header-burger-moderation"
              >
                <q-item-section>{{ t('header.moderation') }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>

        <q-space />
        <div v-if="isGameRoute" class="text-subtitle1 text-center" data-test-id="game-status">
          {{ statusLabel }}
        </div>
        <q-space />

        <!-- SC-BRAND-13: Acc / Theme / Logout (logout rightmost); SC-LEAVE-09/11 Game leave -->
        <q-btn
          v-if="showAccountNav"
          flat
          round
          dense
          icon="manage_accounts"
          data-test-id="header-account"
          :aria-label="t('auth.accountNavAria')"
          :to="{ name: 'account' }"
        />
        <q-btn
          flat
          round
          dense
          data-test-id="header-theme"
          :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
          aria-label="Toggle theme"
          @click="onToggleTheme"
        />
        <q-btn
          v-if="isGameRoute"
          flat
          dense
          icon="exit_to_app"
          data-test-id="header-game-leave"
          :aria-label="t('game.leave')"
          :label="t('game.leave')"
          @click="onExitClick"
        />
        <q-btn
          v-else-if="showSessionLogout"
          flat
          dense
          icon="logout"
          data-test-id="header-logout"
          :aria-label="t('auth.logout')"
          :label="t('auth.logout')"
          @click="onSessionLogout"
        />
      </q-toolbar>
    </q-header>

    <!-- SC-BRAND-17 / SC-PACK-193 / SC-MAP-52: crumbs below elevated header (page zone) -->
    <div
      v-if="breadcrumbItems.length"
      class="app-breadcrumbs q-px-md q-py-sm"
      data-test-id="app-breadcrumbs"
    >
      <q-breadcrumbs>
        <q-breadcrumbs-el
          v-for="(crumb, idx) in breadcrumbItems"
          :key="`${crumb.label}-${idx}`"
          :label="crumb.label"
          :to="crumb.to"
        />
      </q-breadcrumbs>
    </div>

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
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';

import brandLogoUrl from '@/assets/brand/logo.png';
import { useAuthStore } from '@/stores/auth';
import { useContentStore } from '@/stores/content';
import { useGameStore } from '@/stores/game';
import { useMapsStore } from '@/stores/maps';
import { useThemeStore } from '@/stores/theme';

const EMAIL_VERIFY_REMINDER_KEY = 'ht-email-verify-reminder';

const AUTH_ROUTE_NAMES = new Set(['login', 'forgot-password', 'confirm-email', 'reset-password']);

const PACKS_BREADCRUMB_ROUTES = new Set([
  'content-catalog',
  'content-pack',
  'content-pack-new',
  'content-pack-edit',
  'content-pack-tasks',
  'content-pack-add-task-set',
  'content-pack-moderation',
]);

const MAPS_BREADCRUMB_ROUTES = new Set(['content-maps', 'content-map-edit']);

const { t } = useI18n();
const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const game = useGameStore();
const content = useContentStore();
const maps = useMapsStore();
const theme = useThemeStore();

const leaveConfirmOpen = ref(false);
const emailVerifyReminderOpen = ref(false);
/** Fallback when sessionStorage is unavailable (private mode). */
let emailVerifyReminderShown = false;

const isGameRoute = computed(() => route.name === 'game');
const isLoginRoute = computed(() => AUTH_ROUTE_NAMES.has(String(route.name)));

/** Narrow viewport → burger for sections (SC-BRAND-14). */
const isNarrow = computed(() => $q.screen.lt.md);

/** Authenticated non-Game / non-auth screens show section nav (SC-BRAND-11, SC-LEAVE-12). */
const showSectionNav = computed(
  () => auth.isAuthenticated && !isGameRoute.value && !isLoginRoute.value,
);

/** Brand logo click mode (design D2) — always same button DOM (SC-BRAND-09). */
const brandLogoMode = computed<'noop' | 'leave' | 'toLobby'>(() => {
  const name = route.name;
  if (name === 'game') {
    return 'leave';
  }
  if (name === 'lobby') {
    return 'noop';
  }
  // Auth + other authenticated → lobby (SC-BRAND-04; guest may bounce via requiresAuth)
  return 'toLobby';
});

const brandLogoAria = computed(() => {
  if (brandLogoMode.value === 'leave') {
    return t('game.leave');
  }
  return t('auth.backToLobby');
});

/** Registered non-anonymous — cabinet link in header (design D7). */
const showAccountNav = computed(
  () => auth.isAuthenticated && auth.user && !auth.user.anonymous && !isLoginRoute.value,
);

/** Session logout rightmost off-Game (SC-BRAND-13); never on Game (SC-LEAVE-11). */
const showSessionLogout = computed(
  () => auth.isAuthenticated && !isGameRoute.value && !isLoginRoute.value,
);

type Crumb = { label: string; to?: { name: string; params?: Record<string, string> } };

const breadcrumbItems = computed((): Crumb[] => {
  const name = String(route.name ?? '');
  if (!auth.isAuthenticated || isGameRoute.value || isLoginRoute.value) {
    return [];
  }
  if (PACKS_BREADCRUMB_ROUTES.has(name)) {
    const crumbs: Crumb[] = [
      { label: t('header.lobby'), to: { name: 'lobby' } },
      { label: t('header.packs'), to: { name: 'content-catalog' } },
    ];
    if (name === 'content-catalog' || name === 'content-pack-new') {
      if (name === 'content-pack-new') {
        crumbs.push({ label: t('content.create') });
      }
      return crumbs;
    }
    const packTitle = content.pack?.title || content.draft?.title || t('content.untitled');
    const packId = String((route.params as { id?: string }).id ?? '');
    if (name === 'content-pack') {
      crumbs.push({ label: packTitle });
    } else {
      crumbs.push({
        label: packTitle,
        to: { name: 'content-pack', params: { id: packId } },
      });
    }
    if (name === 'content-pack-edit') {
      crumbs.push({ label: t('content.edit') });
    } else if (name === 'content-pack-tasks') {
      crumbs.push({ label: t('content.taskSets') });
    } else if (name === 'content-pack-add-task-set') {
      crumbs.push({ label: t('content.addTaskSet') });
    } else if (name === 'content-pack-moderation') {
      crumbs.push({ label: t('content.moderationTitle') });
    }
    return crumbs;
  }
  if (MAPS_BREADCRUMB_ROUTES.has(name)) {
    const crumbs: Crumb[] = [
      { label: t('header.lobby'), to: { name: 'lobby' } },
      { label: t('header.maps'), to: { name: 'content-maps' } },
    ];
    if (name === 'content-map-edit') {
      // Maps have no title field — use author (+ seats) for the entity crumb (SC-MAP-44).
      const mapId = String((route.params as { id?: string }).id ?? '');
      const m =
        maps.map?.id === mapId
          ? maps.map
          : (maps.list?.find((row) => row.id === mapId) ?? maps.map);
      const author = m?.authorDisplayName;
      const seatLabel = m
        ? t('maps.seatConfig', {
            players: m.players,
            tourists: m.touristsPerPlayer,
          })
        : '';
      crumbs.push({
        label: author ? (seatLabel ? `${author} · ${seatLabel}` : author) : t('maps.untitled'),
      });
    }
    return crumbs;
  }
  return [];
});

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

function onBrandLogoClick() {
  if (brandLogoMode.value === 'leave') {
    onExitClick();
    return;
  }
  if (brandLogoMode.value === 'toLobby') {
    void router.push({ name: 'lobby' });
  }
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

async function onSessionLogout() {
  await game.leaveGame();
  await auth.logout();
  await router.replace({ name: 'login' });
}
</script>

<style scoped>
.brand-logo {
  height: 60px;
  width: auto;
  object-fit: contain;
  display: block;
}

.brand-logo-control {
  display: inline-flex;
  align-items: center;
  padding: 2px 4px;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  line-height: 0;
}

.brand-logo-control:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* Page-zone strip — not inside elevated q-header (SC-BRAND-17). */
.app-breadcrumbs {
  font-size: 0.875rem;
  background: var(--q-page-bg, transparent);
}
</style>
