<template>
  <q-page class="q-pa-md flex flex-center column">
    <div class="row items-center justify-between full-width q-mb-md game-header">
      <q-btn flat icon="arrow_back" label="Лобби" @click="onLeave" />
      <div class="text-center">
        <div class="text-subtitle1">{{ statusLabel }}</div>
      </div>
      <div class="text-caption text-muted">{{ game.roomId?.slice(0, 8) }}</div>
    </div>

    <q-banner
      v-if="game.error"
      class="bg-negative text-white q-mb-md"
      dense
      rounded
      style="max-width: 480px; width: 100%"
    >
      {{ game.error }}
    </q-banner>

    <div class="presence-frame" aria-hidden="true">
      <div
        v-for="marker in presenceMarkers"
        :key="`presence-${marker.sessionId}`"
        class="presence-slot"
        :class="`presence-${marker.slot}`"
      >
        <div class="presence-marker">
          <q-circular-progress
            v-if="showGraceRing(marker)"
            :min="0"
            :max="GRACE_SECONDS"
            :value="graceRemaining(marker.reconnectUntil)"
            size="52px"
            :thickness="0.15"
            color="warning"
            track-color="grey-4"
            class="presence-progress"
          >
            <img class="presence-avatar" :src="touristSrc(marker.touristId)" alt="" />
          </q-circular-progress>
          <img
            v-else
            class="presence-avatar presence-avatar--solo"
            :src="touristSrc(marker.touristId)"
            alt=""
          />
        </div>
      </div>

      <div class="tourist-board">
        <div
          v-for="(tile, i) in boardTiles"
          :key="`tile-${i}`"
          class="tile"
          :class="`tile-${tile.kind}`"
          :style="tile.style"
        />
        <img
          v-for="piece in boardPieces"
          :key="`piece-${piece.sessionId}-${piece.side}`"
          class="piece"
          :src="touristSrc(piece.touristId)"
          alt=""
          :style="{
            gridColumn: String(piece.col + 1),
            gridRow: String(piece.row + 1),
          }"
        />
      </div>
    </div>

    <div v-if="mySeat" class="my-tourist-strip q-mt-md">
      <div class="text-caption text-muted">Мои туристы</div>
      <div class="my-tourist-slots">
        <img
          v-for="side in STRIP_SIDES"
          :key="`strip-${side}`"
          class="my-tourist-img"
          :src="touristSrc(mySeat.touristId)"
          :alt="`Мои туристы ${side}`"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import tourist1 from '@/assets/tourists/tourist1.png';
import tourist2 from '@/assets/tourists/tourist2.png';
import tourist3 from '@/assets/tourists/tourist3.png';
import tourist4 from '@/assets/tourists/tourist4.png';
import { useGameStore, type GameSeat } from '@/stores/game';

/** 10×10 sparse layout: `.` hole, `1` start, `*` task, `7` center (solid 2×2). */
const LAYOUT = [
  '...1111...',
  '...****...',
  '..******..',
  '1********1',
  '1***77***1',
  '1***77***1',
  '1********1',
  '..******..',
  '...****...',
  '...1111...',
] as const;

/** Strip slot order = board sides (SC-PIECE-09). */
const STRIP_SIDES = ['N', 'E', 'S', 'W'] as const;

/** Reconnect grace length (seconds) — matches server / design D1. */
const GRACE_SECONDS = 30;

const TOURIST_SRC: Record<number, string> = {
  1: tourist1,
  2: tourist2,
  3: tourist3,
  4: tourist4,
};

/** Presence positions around the board (SC-PRESENCE-02/03). */
type PresenceSlot = 'top' | 'bottom' | 'left' | 'right';

/** Opponents for a seated viewer: join order → top, left, right. */
const SEATED_OPPONENT_SLOTS: PresenceSlot[] = ['top', 'left', 'right'];

/** Spectator join order → top, bottom, left, right. */
const SPECTATOR_SLOTS: PresenceSlot[] = ['top', 'bottom', 'left', 'right'];

type TileKind = 'start' | 'task' | 'center';

interface BoardTile {
  kind: TileKind;
  style: Record<string, string>;
}

interface BoardPiece {
  sessionId: string;
  touristId: number;
  side: string;
  row: number;
  col: number;
}

interface PresenceMarker {
  sessionId: string;
  touristId: number;
  connected: boolean;
  reconnectUntil: number;
  slot: PresenceSlot;
}

function buildBoardTiles(): BoardTile[] {
  const tiles: BoardTile[] = [];
  let centerPlaced = false;

  for (let row = 0; row < LAYOUT.length; row++) {
    const line = LAYOUT[row]!;
    for (let col = 0; col < line.length; col++) {
      const ch = line[col]!;
      if (ch === '.') {
        continue;
      }
      if (ch === '7') {
        if (centerPlaced) {
          continue;
        }
        centerPlaced = true;
        tiles.push({
          kind: 'center',
          style: {
            gridColumn: `${col + 1} / span 2`,
            gridRow: `${row + 1} / span 2`,
          },
        });
        continue;
      }
      tiles.push({
        kind: ch === '1' ? 'start' : 'task',
        style: {
          gridColumn: String(col + 1),
          gridRow: String(row + 1),
        },
      });
    }
  }

  return tiles;
}

function touristSrc(touristId: number): string {
  return TOURIST_SRC[touristId] ?? tourist1;
}

const boardTiles = buildBoardTiles();

const game = useGameStore();
const { mySeat } = storeToRefs(game);
const route = useRoute('game');
const router = useRouter();

/** Clock tick so offline grace rings animate from reconnectUntil. */
const nowMs = ref(Date.now());
let graceTick: ReturnType<typeof setInterval> | undefined;

/** Consented exit — do not auto-rejoin after leaveGame clears the room. */
const consentedLeaving = ref(false);
/** Avoid overlapping remount / soft-fail rejoin attempts. */
let rejoinInFlight = false;

/** Flat list of all seats' pieces for board overlay. */
const boardPieces = computed((): BoardPiece[] => {
  const out: BoardPiece[] = [];
  for (const seat of game.seats) {
    for (const piece of seat.pieces) {
      out.push({
        sessionId: seat.sessionId,
        touristId: seat.touristId,
        side: piece.side,
        row: piece.row,
        col: piece.col,
      });
    }
  }
  return out;
});

/**
 * Occupied seats only (store mirrors MapSchema — no empty slots).
 * Join order = array order from sync map forEach (design D5).
 */
const presenceMarkers = computed((): PresenceMarker[] => {
  const seats = game.seats;
  const selfId = game.sessionId;
  const self = seats.find((s) => s.sessionId === selfId);

  if (self) {
    const markers: PresenceMarker[] = [toMarker(self, 'bottom')];
    const others = seats.filter((s) => s.sessionId !== selfId);
    others.forEach((seat, i) => {
      const slot = SEATED_OPPONENT_SLOTS[i];
      if (slot) {
        markers.push(toMarker(seat, slot));
      }
    });
    return markers;
  }

  return seats
    .map((seat, i) => {
      const slot = SPECTATOR_SLOTS[i];
      return slot ? toMarker(seat, slot) : null;
    })
    .filter((m): m is PresenceMarker => m !== null);
});

function toMarker(seat: GameSeat, slot: PresenceSlot): PresenceMarker {
  return {
    sessionId: seat.sessionId,
    touristId: seat.touristId,
    connected: seat.connected,
    reconnectUntil: seat.reconnectUntil,
    slot,
  };
}

function showGraceRing(marker: PresenceMarker): boolean {
  return !marker.connected && marker.reconnectUntil > 0;
}

/** Remaining grace seconds (full at disconnect → empty at deadline). */
function graceRemaining(reconnectUntil: number): number {
  if (reconnectUntil <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(GRACE_SECONDS, (reconnectUntil - nowMs.value) / 1000));
}

const statusLabel = computed(() => {
  switch (game.status) {
    case 'connecting':
      return 'Подключение…';
    case 'waiting':
      return 'Ожидание соперника';
    case 'playing':
      return 'Игра идёт';
    case 'finished':
      return 'Игра окончена';
    default:
      return 'Нет комнаты';
  }
});

async function ensureTouristRoom() {
  if (consentedLeaving.value || rejoinInFlight || game.room) {
    return;
  }

  const raw = route.params.roomId;
  const roomId = typeof raw === 'string' && raw.length > 0 ? raw : undefined;
  if (!roomId) {
    await router.replace({ name: 'lobby' });
    return;
  }

  rejoinInFlight = true;
  try {
    await game.rejoinGame(roomId);
  } catch {
    if (!consentedLeaving.value) {
      await router.replace({ name: 'lobby' });
    }
  } finally {
    rejoinInFlight = false;
  }
}

onMounted(async () => {
  graceTick = setInterval(() => {
    nowMs.value = Date.now();
  }, 200);

  // room уже в Pinia после Lobby; иначе reconnect(token) → joinById (D3)
  await ensureTouristRoom();
});

// Soft drop: SDK may give up and fire onLeave → Pinia room null while still on Game.
// Retry sessionStorage reconnect within server grace (design D3).
watch(
  () => game.room,
  async (room, prev) => {
    if (room || !prev || consentedLeaving.value) {
      return;
    }
    await ensureTouristRoom();
  },
);

onUnmounted(() => {
  if (graceTick !== undefined) {
    clearInterval(graceTick);
    graceTick = undefined;
  }
});

async function onLeave() {
  consentedLeaving.value = true;
  await game.leaveGame();
  await router.push({ name: 'lobby' });
}
</script>

<style scoped>
.game-header {
  max-width: calc(10 * 60px + 9 * 6px + 2 * 64px);
  width: 100%;
}

/* Occupied presence around the board (SC-PRESENCE-01…05). */
.presence-frame {
  display: grid;
  grid-template-columns: 56px minmax(0, calc(10 * 60px + 9 * 6px)) 56px;
  grid-template-rows: 56px auto 56px;
  grid-template-areas:
    '. top .'
    'left board right'
    '. bottom .';
  column-gap: 4px;
  row-gap: 4px;
  width: 100%;
  max-width: calc(10 * 60px + 9 * 6px + 2 * 60px);
  justify-content: center;
  align-items: center;
  pointer-events: none;
}

.presence-top {
  grid-area: top;
}

.presence-left {
  grid-area: left;
}

.presence-right {
  grid-area: right;
}

.presence-bottom {
  grid-area: bottom;
}

.presence-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
}

.presence-marker {
  display: flex;
  align-items: center;
  justify-content: center;
}

.presence-avatar {
  width: 36px;
  height: 36px;
  object-fit: contain;
  border-radius: 50%;
}

.presence-avatar--solo {
  width: 44px;
  height: 44px;
  padding: 2px;
  box-sizing: border-box;
  background: rgba(127, 127, 127, 0.12);
  box-shadow: 0 0 0 2px rgba(127, 127, 127, 0.35);
}

.tourist-board {
  grid-area: board;
  --gap: 6px;
  --radius: 12px;

  /* Height from aspect-ratio: % in grid-template-rows against auto height collapses to 0 */
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr);
  gap: var(--gap);
  width: 100%;
  max-width: calc(10 * 60px + 9 * 6px);
  aspect-ratio: 1;
  /* Holes show page background — no board chrome fill */
  background: transparent;
}

.tile {
  border-radius: var(--radius);
  pointer-events: none;
}

.tile-start {
  background: #4caf50;
}

.tile-task {
  background: #8d6e63;
}

.tile-center {
  background: #ffeb3b;
}

.piece {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  z-index: 1;
  padding: 2px;
  box-sizing: border-box;
}

.my-tourist-strip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
}

.my-tourist-slots {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.my-tourist-img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  pointer-events: none;
}
</style>
