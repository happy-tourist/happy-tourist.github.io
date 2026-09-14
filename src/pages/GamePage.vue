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

    <div class="tourist-board" aria-hidden="true">
      <div
        v-for="(tile, i) in boardTiles"
        :key="i"
        class="tile"
        :class="`tile-${tile.kind}`"
        :style="tile.style"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useGameStore } from '@/stores/game';

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

type TileKind = 'start' | 'task' | 'center';

interface BoardTile {
  kind: TileKind;
  style: Record<string, string>;
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

const boardTiles = buildBoardTiles();

const game = useGameStore();
const route = useRoute('game');
const router = useRouter();

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

onMounted(async () => {
  const raw = route.params.roomId;
  const roomId = typeof raw === 'string' && raw.length > 0 ? raw : undefined;

  // room уже в Pinia после Lobby; иначе rejoin по roomId
  if (!game.room && roomId) {
    try {
      await game.joinGame(roomId);
    } catch {
      await router.replace({ name: 'lobby' });
    }
  } else if (!game.room) {
    await router.replace({ name: 'lobby' });
  }
});

async function onLeave() {
  await game.leaveGame();
  await router.push({ name: 'lobby' });
}
</script>

<style scoped>
.game-header {
  max-width: calc(10 * 60px + 9 * 6px);
  width: 100%;
}

.tourist-board {
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
</style>
