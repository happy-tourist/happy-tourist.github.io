<template>
  <q-page class="q-pa-md flex flex-center column">
    <div class="row items-center justify-between full-width q-mb-md game-header">
      <q-btn flat icon="arrow_back" label="Лобби" @click="onLeave" />
      <div class="text-center">
        <div class="text-subtitle1">{{ statusLabel }}</div>
        <div class="text-caption text-muted">{{ turnLabel }}</div>
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

    <div class="board" :class="{ disabled: !game.canMove }">
      <div v-for="(row, r) in game.board" :key="r" class="board-row">
        <button
          v-for="(cell, c) in row"
          :key="`${r}-${c}`"
          type="button"
          class="cell"
          :class="[
            (r + c) % 2 === 0 ? 'light' : 'dark',
            { selected: selected?.row === r && selected?.col === c },
            { target: isTarget(r, c) },
          ]"
          @click="onCellClick(r, c)"
        >
          <span v-if="cell" class="piece" :class="pieceClass(cell)" />
        </button>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useGameStore, type CellValue } from '@/stores/game';

const game = useGameStore();
const route = useRoute('game');
const router = useRouter();

const selected = ref<{ row: number; col: number } | null>(null);
const targets = ref<Array<{ row: number; col: number }>>([]);

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

const turnLabel = computed(() => {
  if (game.status !== 'playing') {
    return game.myColor ? `Вы: ${game.myColor === 'white' ? 'белые' : 'чёрные'}` : '';
  }
  if (game.canMove) {
    return 'Ваш ход';
  }
  return 'Ход соперника';
});

watch(
  () => game.board,
  () => {
    if (selected.value) {
      targets.value = getTargets(selected.value.row, selected.value.col);
    }
  },
  { deep: true },
);

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

onUnmounted(() => {
  selected.value = null;
  targets.value = [];
});

function pieceClass(cell: CellValue) {
  return {
    white: cell === 1 || cell === 3,
    black: cell === 2 || cell === 4,
    king: cell === 3 || cell === 4,
  };
}

function isOwnPiece(cell: CellValue): boolean {
  if (!cell || !game.myColor) {
    return false;
  }
  const isWhite = cell === 1 || cell === 3;
  return game.myColor === 'white' ? isWhite : !isWhite;
}

function isTarget(row: number, col: number): boolean {
  return targets.value.some((t) => t.row === row && t.col === col);
}

/**
 * Клиентская подсказка ходов (русские шашки, упрощённо).
 * Сервер — источник истины; UI только подсвечивает возможные клетки.
 */
function getTargets(row: number, col: number): Array<{ row: number; col: number }> {
  const cell = game.board[row]?.[col] ?? 0;
  if (!cell) {
    return [];
  }

  const isKing = cell === 3 || cell === 4;
  const isWhite = cell === 1 || cell === 3;
  const result: Array<{ row: number; col: number }> = [];

  const dirs: Array<[number, number]> = isKing
    ? [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]
    : isWhite
      ? [
          [-1, -1],
          [-1, 1],
        ]
      : [
          [1, -1],
          [1, 1],
        ];

  // тихие ходы
  for (const [dr, dc] of dirs) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r > 7 || c < 0 || c > 7) {
      continue;
    }
    if ((game.board[r]?.[c] ?? 0) === 0 && (r + c) % 2 === 1) {
      result.push({ row: r, col: c });
    }
  }

  // взятия (одна клетка через соперника)
  const captureDirs: Array<[number, number]> = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [dr, dc] of captureDirs) {
    const midR = row + dr;
    const midC = col + dc;
    const landR = row + dr * 2;
    const landC = col + dc * 2;
    if (landR < 0 || landR > 7 || landC < 0 || landC > 7) {
      continue;
    }
    const mid = game.board[midR]?.[midC] ?? 0;
    const land = game.board[landR]?.[landC] ?? 0;
    if (!mid || land !== 0) {
      continue;
    }
    const midWhite = mid === 1 || mid === 3;
    if (midWhite === isWhite) {
      continue;
    }
    result.push({ row: landR, col: landC });
  }

  return result;
}

function onCellClick(row: number, col: number) {
  if (!game.canMove) {
    return;
  }

  const cell = game.board[row]?.[col] ?? 0;

  if (!selected.value) {
    if (!isOwnPiece(cell)) {
      return;
    }
    selected.value = { row, col };
    targets.value = getTargets(row, col);
    return;
  }

  if (selected.value.row === row && selected.value.col === col) {
    selected.value = null;
    targets.value = [];
    return;
  }

  if (isOwnPiece(cell)) {
    selected.value = { row, col };
    targets.value = getTargets(row, col);
    return;
  }

  if (!isTarget(row, col)) {
    return;
  }

  game.sendMove(selected.value, { row, col });
  selected.value = null;
  targets.value = [];
}

async function onLeave() {
  await game.leaveGame();
  await router.push({ name: 'lobby' });
}
</script>

<style scoped>
.game-header {
  max-width: 480px;
}

.board {
  display: inline-block;
  border: 3px solid #3e2723;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  max-width: min(90vw, 480px);
  width: 100%;
}

.board.disabled {
  opacity: 0.92;
}

.board-row {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
}

.cell {
  aspect-ratio: 1;
  border: none;
  padding: 0;
  position: relative;
  cursor: pointer;
}

.cell.light {
  background: #f0d9b5;
}

.cell.dark {
  background: #b58863;
}

.cell.selected {
  outline: 3px solid #ffeb3b;
  outline-offset: -3px;
  z-index: 1;
}

.cell.target::after {
  content: '';
  position: absolute;
  inset: 35%;
  border-radius: 50%;
  background: rgba(76, 175, 80, 0.55);
  pointer-events: none;
}

.piece {
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.25);
}

.piece.white {
  background: radial-gradient(circle at 35% 30%, #fff, #d7d7d7);
}

.piece.black {
  background: radial-gradient(circle at 35% 30%, #666, #1a1a1a);
}

.piece.king::after {
  content: '♛';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(10px, 3vw, 18px);
  color: #ffc107;
}
</style>
