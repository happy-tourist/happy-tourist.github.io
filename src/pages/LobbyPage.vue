<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Лобби</div>
        <div class="text-subtitle2 text-grey-7">Привет, {{ auth.displayName }}</div>
      </div>

      <div class="q-gutter-sm">
        <q-btn flat icon="logout" label="Выйти" @click="onLogout" />
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-auto">
        <q-btn
          color="primary"
          icon="sports_esports"
          label="Играть"
          :loading="joining"
          @click="onPlay"
        />
      </div>
      <div class="col-12 col-sm-auto">
        <q-btn
          outline
          color="primary"
          icon="add"
          label="Создать игру"
          :loading="creating"
          @click="onCreate"
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
          <q-item-section class="text-grey-7">Загрузка списка комнат…</q-item-section>
        </q-item>
      </template>

      <template v-else-if="!game.rooms.length">
        <q-item>
          <q-item-section class="text-grey-7">Пока нет открытых комнат</q-item-section>
        </q-item>
      </template>

      <template v-else>
        <q-item
          v-for="room in game.rooms"
          :key="room.roomId"
          clickable
          v-ripple
          @click="onJoin(room.roomId)"
        >
          <q-item-section>
            <q-item-label>{{
              room.metadata?.title || `Комната ${room.roomId.slice(0, 6)}`
            }}</q-item-label>
            <q-item-label caption>
              {{ room.clients }}/{{ room.maxClients }} игроков
              <span v-if="room.metadata?.status"> · {{ room.metadata.status }}</span>
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat dense color="primary" label="Войти" />
          </q-item-section>
        </q-item>
      </template>
    </q-list>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';

const auth = useAuthStore();
const game = useGameStore();
const router = useRouter();

const creating = ref(false);
const joining = ref(false);

onMounted(() => {
  void game.subscribeLobby();
});

onUnmounted(() => {
  void game.unsubscribeLobby();
});

/** joinOrCreate(CHECKERS_ROOM) → room в Pinia → /game/:roomId */
async function onPlay() {
  joining.value = true;
  try {
    const room = await game.joinGame();
    await router.push({ name: 'game', params: { roomId: room.roomId } });
  } catch {
    // error in store
  } finally {
    joining.value = false;
  }
}

async function onCreate() {
  creating.value = true;
  try {
    const room = await game.createGame();
    await router.push({ name: 'game', params: { roomId: room.roomId } });
  } catch {
    // error in store
  } finally {
    creating.value = false;
  }
}

async function onJoin(roomId: string) {
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
