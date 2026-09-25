<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Лобби</div>
        <div class="text-subtitle2 text-muted">Привет, {{ auth.displayName }}</div>
      </div>

      <div class="q-gutter-sm">
        <q-btn flat icon="style" :label="$t('content.nav')" :to="{ name: 'content-collection' }" />
        <q-btn flat icon="map" :label="$t('maps.nav')" :to="{ name: 'content-maps' }" />
        <q-btn flat icon="help_outline" :label="$t('support.nav')" :to="{ name: 'support' }" />
        <q-btn
          v-if="!auth.user?.anonymous"
          flat
          icon="manage_accounts"
          :label="$t('auth.accountNav')"
          :to="{ name: 'account' }"
        />
        <q-btn flat icon="logout" label="Выйти" @click="onLogout" />
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-auto">
        <q-btn
          color="primary"
          icon="add"
          :label="$t('lobby.create')"
          :loading="creating"
          @click="openCreateModal"
        />
      </div>
    </div>

    <q-banner v-if="game.error" class="bg-negative text-white q-mb-md" dense rounded>
      {{ game.error }}
    </q-banner>

    <q-list bordered separator class="rounded-borders">
      <q-item-label header>Доступные игры</q-item-label>

      <template v-if="game.listing">
        <q-item>
          <q-item-section class="text-muted">Загрузка списка комнат…</q-item-section>
        </q-item>
      </template>

      <template v-else-if="!game.rooms.length">
        <q-item>
          <q-item-section class="text-muted">Пока нет открытых комнат</q-item-section>
        </q-item>
      </template>

      <template v-else>
        <q-item
          v-for="room in game.rooms"
          :key="room.roomId"
          :clickable="!joining"
          :disable="joining"
          v-ripple="!joining"
          @click="onJoin(room.roomId)"
        >
          <q-item-section>
            <q-item-label>{{
              room.metadata?.title || `Комната ${room.roomId.slice(0, 6)}`
            }}</q-item-label>
            <q-item-label caption>
              {{
                $t('lobby.capacity', {
                  seats: room.metadata?.seats ?? 0,
                  maxSeats: room.metadata?.maxSeats ?? '—',
                })
              }}
              <span v-if="room.metadata?.status"> · {{ room.metadata.status }}</span>
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat dense color="primary" label="Войти" :loading="joining" :disable="joining" />
          </q-item-section>
        </q-item>
      </template>
    </q-list>

    <q-dialog v-model="createModalOpen" persistent>
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ $t('lobby.createTitle') }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="text-subtitle2 q-mb-sm">{{ $t('lobby.maxSeats') }}</div>
          <q-option-group
            v-model="createMaxSeats"
            type="radio"
            color="primary"
            :options="maxSeatsOptions"
            inline
          />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="text-subtitle2 q-mb-sm">{{ $t('lobby.grilleDensity') }}</div>
          <q-option-group
            v-model="createGrilleDensity"
            type="radio"
            color="primary"
            :options="grilleDensityOptions"
            inline
          />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="text-subtitle2 q-mb-sm">{{ $t('lobby.catapultDensity') }}</div>
          <q-option-group
            v-model="createCatapultDensity"
            type="radio"
            color="primary"
            :options="catapultDensityOptions"
            inline
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            :label="$t('lobby.createCancel')"
            :disable="creating"
            @click="closeCreateModal"
          />
          <q-btn
            color="primary"
            :label="$t('lobby.createConfirm')"
            :loading="creating"
            @click="onConfirmCreate"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import {
  useGameStore,
  type CreateGameCatapultDensity,
  type CreateGameGrilleDensity,
  type CreateGameMaxSeats,
} from '@/stores/game';

const auth = useAuthStore();
const game = useGameStore();
const router = useRouter();
const { t } = useI18n();

const creating = ref(false);
const joining = ref(false);
const createModalOpen = ref(false);
const createMaxSeats = ref<CreateGameMaxSeats>(2);
/** Default medium (22%) — SC-LOBBY-15. */
const createGrilleDensity = ref<CreateGameGrilleDensity>('medium');
/** Default medium (22%) — SC-LOBBY-18. */
const createCatapultDensity = ref<CreateGameCatapultDensity>('medium');

const maxSeatsOptions = computed(() =>
  ([2, 3, 4] as const).map((n) => ({
    label: t('lobby.maxSeatsOption', { n }),
    value: n,
  })),
);

const grilleDensityOptions = computed(() => [
  { label: t('lobby.grilleDensityFew'), value: 'few' as const },
  { label: t('lobby.grilleDensityMedium'), value: 'medium' as const },
  { label: t('lobby.grilleDensityMany'), value: 'many' as const },
]);

const catapultDensityOptions = computed(() => [
  { label: t('lobby.catapultDensityFew'), value: 'few' as const },
  { label: t('lobby.catapultDensityMedium'), value: 'medium' as const },
  { label: t('lobby.catapultDensityMany'), value: 'many' as const },
]);

onMounted(() => {
  void game.subscribeLobby();
});

onUnmounted(() => {
  void game.unsubscribeLobby();
});

function openCreateModal() {
  createMaxSeats.value = 2;
  createGrilleDensity.value = 'medium';
  createCatapultDensity.value = 'medium';
  createModalOpen.value = true;
}

function closeCreateModal() {
  if (creating.value) {
    return;
  }
  createModalOpen.value = false;
}

async function onConfirmCreate() {
  creating.value = true;
  try {
    const room = await game.createGame({
      maxSeats: createMaxSeats.value,
      grilleDensity: createGrilleDensity.value,
      catapultDensity: createCatapultDensity.value,
    });
    createModalOpen.value = false;
    await router.push({ name: 'game', params: { roomId: room.roomId } });
  } catch {
    // error in store
  } finally {
    creating.value = false;
  }
}

async function onJoin(roomId: string) {
  // SC-LOBBY-19: busy-lock — ignore re-entrant join while connecting.
  if (joining.value) {
    return;
  }
  joining.value = true;
  try {
    await game.joinGame(roomId);
    await router.push({ name: 'game', params: { roomId } });
  } catch {
    // error in store
  } finally {
    joining.value = false;
  }
}

async function onLogout() {
  await game.leaveGame();
  await auth.logout();
  await router.replace({ name: 'login' });
}
</script>
