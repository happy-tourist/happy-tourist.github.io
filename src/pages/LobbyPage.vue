<template>
  <q-page class="q-pa-md">
    <!-- SC-BRAND-15: section nav / account / logout live in App header — no duplicate toolbar -->
    <div class="q-mb-md">
      <div class="text-h5">Лобби</div>
      <div class="text-subtitle2 text-muted">Привет, {{ auth.displayName }}</div>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-auto">
        <q-btn
          color="primary"
          icon="add"
          data-test-id="lobby-create-open"
          :label="$t('lobby.create')"
          :loading="creating"
          @click="openCreateModal"
        />
      </div>
    </div>

    <q-banner v-if="game.error" class="bg-negative text-white q-mb-md" dense rounded>
      {{ game.error }}
    </q-banner>
    <q-banner v-if="maps.error" class="bg-negative text-white q-mb-md" dense rounded>
      {{ mapsErrorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="maps.error = null" />
      </template>
    </q-banner>
    <q-banner v-if="content.error" class="bg-negative text-white q-mb-md" dense rounded>
      {{ contentErrorLabel }}
      <template #action>
        <q-btn flat dense label="OK" @click="content.error = null" />
      </template>
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
          :data-test-id="`lobby-room-${room.roomId}`"
          @click="onJoin(room.roomId)"
        >
          <q-item-section v-if="room.metadata?.mapGrid" avatar>
            <MapGridPreview
              :grid="String(room.metadata.mapGrid)"
              :size="56"
              :aria-label="$t('maps.previewAria')"
              data-test-id="lobby-room-map-preview"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{
              room.metadata?.title || `Комната ${room.roomId.slice(0, 6)}`
            }}</q-item-label>
            <q-item-label
              v-if="roomMapCapacity(room)"
              caption
              data-test-id="lobby-room-map-capacity"
            >
              {{ roomMapCapacity(room) }}
            </q-item-label>
            <q-item-label caption data-test-id="lobby-room-seats">
              {{
                $t('lobby.capacity', {
                  seats: room.metadata?.seats ?? 0,
                  maxSeats: room.metadata?.maxSeats ?? '—',
                })
              }}
              <span v-if="room.metadata?.status"> · {{ room.metadata.status }}</span>
            </q-item-label>
            <q-item-label
              v-if="roomPackSetsCaption(room)"
              caption
              data-test-id="lobby-room-pack-sets"
            >
              {{ roomPackSetsCaption(room) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat dense color="primary" label="Войти" :loading="joining" :disable="joining" />
          </q-item-section>
        </q-item>
      </template>
    </q-list>

    <q-dialog v-model="createModalOpen" persistent>
      <q-card style="min-width: 320px; max-width: 480px; width: 92vw">
        <q-card-section>
          <div class="text-h6">{{ $t('lobby.createTitle') }}</div>
        </q-card-section>

        <q-card-section v-if="maps.error || content.error" class="q-pt-none">
          <q-banner
            v-if="maps.error"
            dense
            rounded
            class="bg-negative text-white q-mb-sm"
            data-test-id="lobby-create-maps-error"
          >
            {{ mapsErrorLabel }}
          </q-banner>
          <q-banner
            v-if="content.error"
            dense
            rounded
            class="bg-negative text-white"
            data-test-id="lobby-create-content-error"
          >
            {{ contentErrorLabel }}
          </q-banner>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-select
            v-model="createMapId"
            data-test-id="lobby-create-map"
            :options="mapOptions"
            emit-value
            map-options
            outlined
            dense
            :loading="pickersLoading"
            :label="$t('lobby.map')"
            :disable="creating"
            @update:model-value="onMapSelected"
          >
            <template #option="scope">
              <q-item v-bind="scope.itemProps" :data-test-id="`lobby-map-opt-${scope.opt.value}`">
                <q-item-section avatar>
                  <MapGridPreview :grid="scope.opt.grid" :size="40" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>
                    {{
                      $t('lobby.mapCapacity', {
                        players: scope.opt.players,
                        tourists: scope.opt.touristsPerPlayer,
                      })
                    }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
            <template #selected-item="scope">
              <span>{{ scope.opt?.label ?? '' }}</span>
            </template>
            <template #no-option>
              <q-item>
                <q-item-section class="text-muted">{{ $t('lobby.emptyMaps') }}</q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>

        <q-card-section v-if="selectedMap" class="q-pt-none">
          <div class="text-subtitle2 q-mb-sm">{{ $t('lobby.maxSeats') }}</div>
          <q-option-group
            v-model="createMaxSeats"
            type="radio"
            color="primary"
            data-test-id="lobby-create-max-seats"
            :options="maxSeatsOptions"
            inline
            :disable="creating"
          />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-select
            v-model="createPackId"
            data-test-id="lobby-create-pack"
            :options="packOptions"
            emit-value
            map-options
            outlined
            dense
            :loading="pickersLoading || packDetailLoading"
            :label="$t('lobby.pack')"
            :disable="creating"
            @update:model-value="onPackSelected"
          >
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.title }}</q-item-label>
                  <q-item-label v-if="scope.opt.description" caption>
                    {{ scope.opt.description }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
            <template #selected-item="scope">
              <span>{{ scope.opt?.title ?? scope.opt?.label ?? '' }}</span>
            </template>
            <template #no-option>
              <q-item>
                <q-item-section class="text-muted">{{ $t('lobby.emptyPacks') }}</q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>

        <q-card-section v-if="createPackId" class="q-pt-none">
          <div class="row items-center q-mb-sm">
            <div class="text-subtitle2 col">{{ $t('lobby.taskSets') }}</div>
            <q-btn
              v-if="publishedTaskSets.length"
              flat
              dense
              color="primary"
              data-test-id="lobby-create-select-all-sets"
              :label="$t('lobby.selectAllTaskSets')"
              :disable="creating"
              @click="selectAllTaskSets"
            />
          </div>
          <div v-if="packDetailLoading" class="text-muted text-caption">…</div>
          <div v-else-if="!publishedTaskSets.length" class="text-muted text-caption">
            {{ $t('lobby.emptyTaskSets') }}
          </div>
          <q-option-group
            v-else
            v-model="createTaskSetIds"
            type="checkbox"
            color="primary"
            data-test-id="lobby-create-task-sets"
            :options="taskSetOptions"
            :disable="creating"
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
            :disable="creating"
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
            :disable="creating"
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
            data-test-id="lobby-create-confirm"
            :label="$t('lobby.createConfirm')"
            :loading="creating"
            :disable="!canConfirmCreate"
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
import type { RoomAvailable } from '@colyseus/sdk';

import MapGridPreview from '@/components/MapGridPreview.vue';
import { useAuthStore } from '@/stores/auth';
import { useContentStore, contentErrorI18nKey, type TaskSet } from '@/stores/content';
import {
  useGameStore,
  type CreateGameCatapultDensity,
  type CreateGameGrilleDensity,
  type GameRoomMeta,
} from '@/stores/game';
import { mapsErrorI18nKey, useMapsStore } from '@/stores/maps';

const auth = useAuthStore();
const game = useGameStore();
const content = useContentStore();
const maps = useMapsStore();
const router = useRouter();
const { t } = useI18n();

const mapsErrorLabel = computed(() => {
  const key = mapsErrorI18nKey(maps.error);
  return key ? t(key) : (maps.error ?? '');
});

const contentErrorLabel = computed(() => {
  const key = contentErrorI18nKey(content.error);
  return key ? t(key) : (content.error ?? '');
});

const creating = ref(false);
const joining = ref(false);
const createModalOpen = ref(false);
const pickersLoading = ref(false);
const packDetailLoading = ref(false);

const createMapId = ref<string | null>(null);
const createPackId = ref<string | null>(null);
const createTaskSetIds = ref<string[]>([]);
/** Chosen seats 1…map.players; default min(2, map.players) after map select (SC-LOBBY-28). */
const createMaxSeats = ref(2);
/** Default medium (22%) — SC-LOBBY-15. */
const createGrilleDensity = ref<CreateGameGrilleDensity>('medium');
/** Default medium (22%) — SC-LOBBY-18. */
const createCatapultDensity = ref<CreateGameCatapultDensity>('medium');

const inCatalogMaps = computed(() =>
  (maps.list ?? []).filter((m) => m.hasLive && m.inCatalog === true),
);

const selectedMap = computed(
  () => inCatalogMaps.value.find((m) => m.id === createMapId.value) ?? null,
);

const maxSeatsOptions = computed(() => {
  const players = selectedMap.value?.players ?? 0;
  const ceiling = Math.max(1, Math.min(4, Math.floor(players)));
  return Array.from({ length: ceiling }, (_, i) => {
    const n = i + 1;
    return { label: String(n), value: n };
  });
});

const mapOptions = computed(() =>
  inCatalogMaps.value.map((m) => ({
    label: m.authorDisplayName || t('content.authorUser'),
    value: m.id,
    grid: m.grid,
    players: m.players,
    touristsPerPlayer: m.touristsPerPlayer,
  })),
);

const packOptions = computed(() =>
  (content.catalog ?? [])
    .filter((p) => p.inCatalog !== false && p.hasLive)
    .map((p) => ({
      label: p.title || t('content.untitled'),
      value: p.id,
      title: p.title || t('content.untitled'),
      description: p.description ?? '',
    })),
);

const selectedPackTitle = computed(() => {
  const opt = packOptions.value.find((p) => p.value === createPackId.value);
  return opt?.title ?? '';
});

function isPublishedTaskSet(ts: TaskSet): boolean {
  return ts.inCatalog !== false && ts.neverLive !== true;
}

const publishedTaskSets = computed(() => {
  const sets = content.liveContent?.taskSets ?? [];
  if (!createPackId.value || content.pack?.id !== createPackId.value) {
    return [] as TaskSet[];
  }
  return sets.filter(isPublishedTaskSet);
});

const taskSetOptions = computed(() =>
  publishedTaskSets.value.map((ts) => ({
    label: t('lobby.taskSetFromAuthor', {
      pack: selectedPackTitle.value,
      name: ts.authorDisplayName || t('content.authorUser'),
    }),
    value: ts.id,
    /** Exposed for tests / aria — pack theme + author (SC-LOBBY-24). */
    packTitle: selectedPackTitle.value,
    authorDisplayName: ts.authorDisplayName || '',
  })),
);

const canConfirmCreate = computed(
  () =>
    Boolean(createMapId.value) &&
    Boolean(createPackId.value) &&
    createTaskSetIds.value.length > 0 &&
    createMaxSeats.value >= 1 &&
    createMaxSeats.value <= (selectedMap.value?.players ?? 0),
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

function resetCreateForm() {
  createMapId.value = null;
  createPackId.value = null;
  createTaskSetIds.value = [];
  createMaxSeats.value = 2;
  createGrilleDensity.value = 'medium';
  createCatapultDensity.value = 'medium';
}

async function openCreateModal() {
  resetCreateForm();
  maps.error = null;
  content.error = null;
  createModalOpen.value = true;
  pickersLoading.value = true;
  try {
    // Store actions set maps.error / content.error; await both even if one fails.
    await Promise.allSettled([maps.listMaps(), content.listCatalog()]);
  } finally {
    pickersLoading.value = false;
  }
}

function closeCreateModal() {
  if (creating.value) {
    return;
  }
  createModalOpen.value = false;
}

function onMapSelected(mapId: string | null) {
  const map = inCatalogMaps.value.find((m) => m.id === mapId);
  if (!map) {
    createMaxSeats.value = 2;
    return;
  }
  const ceiling = Math.max(1, Math.min(4, Math.floor(map.players)));
  createMaxSeats.value = Math.min(2, ceiling);
}

async function onPackSelected(packId: string | null) {
  createTaskSetIds.value = [];
  if (!packId) {
    return;
  }
  packDetailLoading.value = true;
  try {
    await content.loadLivePack(packId);
    // SC-LOBBY-30: exactly one published set → pre-check it.
    const sets = (content.liveContent?.taskSets ?? []).filter(isPublishedTaskSet);
    if (sets.length === 1 && sets[0]) {
      createTaskSetIds.value = [sets[0].id];
    }
  } catch {
    // error in store
  } finally {
    packDetailLoading.value = false;
  }
}

function selectAllTaskSets() {
  createTaskSetIds.value = publishedTaskSets.value.map((ts) => ts.id);
}

function roomMapCapacity(room: RoomAvailable<GameRoomMeta>): string | null {
  // Listing capacity uses room maxSeats (chosen at create), not map.players (SC-LOBBY-25).
  const players =
    typeof room.metadata?.maxSeats === 'number' ? room.metadata.maxSeats : room.metadata?.players;
  const tourists = room.metadata?.touristsPerPlayer;
  if (typeof players !== 'number' || typeof tourists !== 'number') {
    return null;
  }
  return t('lobby.mapCapacityCaption', { players, tourists });
}

function roomPackSetsCaption(room: RoomAvailable<GameRoomMeta>): string | null {
  const packTitle = room.metadata?.packTitle;
  const labels = room.metadata?.taskSetLabels;
  if (!packTitle || !Array.isArray(labels) || !labels.length) {
    return null;
  }
  const authors = labels
    .map((l) => (typeof l?.authorDisplayName === 'string' ? l.authorDisplayName.trim() : ''))
    .filter(Boolean)
    .join(', ');
  if (!authors) {
    return packTitle;
  }
  return t('lobby.packSetsCaption', { pack: packTitle, authors });
}

async function onConfirmCreate() {
  // SC-LOBBY-21 / SC-LOBBY-27: require map + ≥1 published task set before create.
  if (!canConfirmCreate.value || !createMapId.value || !createPackId.value) {
    return;
  }
  creating.value = true;
  try {
    const room = await game.createGame({
      mapId: createMapId.value,
      packId: createPackId.value,
      taskSetIds: [...createTaskSetIds.value],
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
</script>
