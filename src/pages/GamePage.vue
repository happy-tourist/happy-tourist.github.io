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

      <div class="tourist-board" :class="{ 'tourist-board--interactive': isInteractive }">
        <div
          v-for="(tile, i) in boardTiles"
          :key="`tile-${i}`"
          class="tile"
          :class="[
            `tile-${tile.kind}`,
            {
              'tile--selected': isTileSelected(tile),
              'tile--target': isTileTarget(tile),
            },
          ]"
          :style="tile.style"
          @click="onTileClick(tile, $event)"
        />
        <img
          v-for="piece in boardPieces"
          :key="`piece-${piece.sessionId}-${piece.side}`"
          class="piece"
          :class="{
            'piece--own': isOwnPiece(piece),
            'piece--no-transition': !pieceTransitionsReady,
          }"
          :src="touristSrc(piece.touristId)"
          alt=""
          :style="pieceStyle(piece)"
          @click.stop="onPieceClick(piece)"
          @transitionend="onPieceTransitionEnd($event)"
        />
      </div>
    </div>

    <div
      v-if="mySeat"
      class="my-tourist-strip q-mt-md"
      :class="{ 'my-tourist-strip--interactive': isInteractive }"
    >
      <div class="text-caption text-muted">Мои туристы</div>
      <div class="my-tourist-slots">
        <img
          v-for="side in STRIP_SIDES"
          :key="`strip-${side}`"
          class="my-tourist-img"
          :class="{ 'my-tourist-img--selected': selectedSide === side }"
          :src="touristSrc(mySeat.touristId)"
          :alt="`Мои туристы ${side}`"
          @click="onStripClick(side)"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
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

/** Piece travel animation (D6) — matches CSS transition. */
const MOVE_ANIM_MS = 250;

const CENTER_CELLS = [
  { row: 4, col: 4 },
  { row: 4, col: 5 },
  { row: 5, col: 4 },
  { row: 5, col: 5 },
] as const;

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
  /** Top-left cell for this tile (center covers 2×2 from here). */
  row: number;
  col: number;
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

interface Cell {
  row: number;
  col: number;
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function isPlayableCell(row: number, col: number): boolean {
  const ch = LAYOUT[row]?.[col];
  return ch === '1' || ch === '*' || ch === '7';
}

function isCenterCell(row: number, col: number): boolean {
  return CENTER_CELLS.some((c) => c.row === row && c.col === col);
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
          row,
          col,
          style: {
            gridColumn: `${col + 1} / span 2`,
            gridRow: `${row + 1} / span 2`,
          },
        });
        continue;
      }
      tiles.push({
        kind: ch === '1' ? 'start' : 'task',
        row,
        col,
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
const { mySeat, isMyTurn } = storeToRefs(game);
const route = useRoute('game');
const router = useRouter();

/** Local selection — only meaningful on own turn (D5). */
const selectedSide = ref<string | null>(null);
/** Ignore clicks while own piece travel animates (SC-MOVE-15). */
const moveAnimating = ref(false);
/** Skip first paint transition so pieces do not fly from 0,0. */
const pieceTransitionsReady = ref(false);

let moveAnimTimer: ReturnType<typeof setTimeout> | undefined;
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

const isInteractive = computed(() => isMyTurn.value && !moveAnimating.value);

/** Occupancy of every piece on the board (local hint, not authority). */
function buildOccupancy(exclude?: Cell): Set<string> {
  const set = new Set<string>();
  const excludeKey = exclude ? cellKey(exclude.row, exclude.col) : null;
  for (const piece of boardPieces.value) {
    const key = cellKey(piece.row, piece.col);
    if (excludeKey !== null && key === excludeKey) {
      continue;
    }
    set.add(key);
  }
  return set;
}

/** Legal one-step destinations for the selected own piece (D5 / SC-MOVE-12). */
const legalTargets = computed((): Cell[] => {
  if (!isInteractive.value || !selectedSide.value || !mySeat.value) {
    return [];
  }
  const piece = mySeat.value.pieces.find((p) => p.side === selectedSide.value);
  if (!piece) {
    return [];
  }
  const from: Cell = { row: piece.row, col: piece.col };
  const occupied = buildOccupancy(from);
  const targets: Cell[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) {
        continue;
      }
      const row = from.row + dr;
      const col = from.col + dc;
      if (!isPlayableCell(row, col)) {
        continue;
      }
      if (occupied.has(cellKey(row, col))) {
        continue;
      }
      targets.push({ row, col });
    }
  }
  return targets;
});

const legalTargetKeys = computed(
  () => new Set(legalTargets.value.map((c) => cellKey(c.row, c.col))),
);

const selectedCell = computed((): Cell | null => {
  if (!selectedSide.value || !mySeat.value) {
    return null;
  }
  const piece = mySeat.value.pieces.find((p) => p.side === selectedSide.value);
  return piece ? { row: piece.row, col: piece.col } : null;
});

function isTileSelected(tile: BoardTile): boolean {
  const sel = selectedCell.value;
  if (!sel || !isInteractive.value) {
    return false;
  }
  if (tile.kind === 'center') {
    return isCenterCell(sel.row, sel.col);
  }
  return tile.row === sel.row && tile.col === sel.col;
}

function isTileTarget(tile: BoardTile): boolean {
  if (!isInteractive.value || legalTargetKeys.value.size === 0) {
    return false;
  }
  if (tile.kind === 'center') {
    // Selection chrome wins when the selected piece sits on the center block.
    if (selectedCell.value && isCenterCell(selectedCell.value.row, selectedCell.value.col)) {
      return false;
    }
    return CENTER_CELLS.some((c) => legalTargetKeys.value.has(cellKey(c.row, c.col)));
  }
  return legalTargetKeys.value.has(cellKey(tile.row, tile.col));
}

function isOwnPiece(piece: BoardPiece): boolean {
  return Boolean(mySeat.value && piece.sessionId === mySeat.value.sessionId);
}

function pieceStyle(piece: BoardPiece): Record<string, string> {
  return {
    '--prow': String(piece.row),
    '--pcol': String(piece.col),
  };
}

function selectOwnSide(side: string) {
  if (!isInteractive.value || !mySeat.value) {
    return;
  }
  if (!mySeat.value.pieces.some((p) => p.side === side)) {
    return;
  }
  selectedSide.value = side;
}

function beginMoveAnimation() {
  moveAnimating.value = true;
  if (moveAnimTimer !== undefined) {
    clearTimeout(moveAnimTimer);
  }
  moveAnimTimer = setTimeout(() => {
    moveAnimating.value = false;
    moveAnimTimer = undefined;
  }, MOVE_ANIM_MS + 50);
}

function submitMove(side: string, row: number, col: number) {
  if (!isInteractive.value) {
    return;
  }
  // Animate / lock input only when the store actually sent (room + isMyTurn).
  if (!game.sendMove(side, row, col)) {
    return;
  }
  selectedSide.value = null;
  beginMoveAnimation();
}

function onPieceClick(piece: BoardPiece) {
  if (!isInteractive.value || !isOwnPiece(piece)) {
    return;
  }
  selectOwnSide(piece.side);
}

function onStripClick(side: string) {
  selectOwnSide(side);
}

function resolveCenterClick(event: MouseEvent): Cell {
  const el = event.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  const x = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
  const y = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0;
  return {
    row: y < 0.5 ? 4 : 5,
    col: x < 0.5 ? 4 : 5,
  };
}

function onTileClick(tile: BoardTile, event: MouseEvent) {
  if (!isInteractive.value || !selectedSide.value) {
    return;
  }

  if (tile.kind === 'center') {
    const cell = resolveCenterClick(event);
    if (legalTargetKeys.value.has(cellKey(cell.row, cell.col))) {
      submitMove(selectedSide.value, cell.row, cell.col);
    }
    return;
  }

  if (legalTargetKeys.value.has(cellKey(tile.row, tile.col))) {
    submitMove(selectedSide.value, tile.row, tile.col);
  }
}

function onPieceTransitionEnd(event: TransitionEvent) {
  if (event.propertyName !== 'left' && event.propertyName !== 'top') {
    return;
  }
  // Clear animating early when travel finishes (timer is backup).
  if (moveAnimating.value) {
    moveAnimating.value = false;
    if (moveAnimTimer !== undefined) {
      clearTimeout(moveAnimTimer);
      moveAnimTimer = undefined;
    }
  }
}

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

// Clear local selection when turn ends / spectator (SC-MOVE-11…13 / SC-BOARD-05).
watch(isMyTurn, (mine) => {
  if (!mine) {
    selectedSide.value = null;
  }
});

onMounted(async () => {
  graceTick = setInterval(() => {
    nowMs.value = Date.now();
  }, 200);

  // room уже в Pinia после Lobby; иначе reconnect(token) → joinById (D3)
  await ensureTouristRoom();
  await nextTick();
  pieceTransitionsReady.value = true;
});

// Soft drop: SDK may give up and fire onLeave → Pinia room null while still on Game.
// Retry localStorage reconnect within server grace (design D3).
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
  if (moveAnimTimer !== undefined) {
    clearTimeout(moveAnimTimer);
    moveAnimTimer = undefined;
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
  --cell: calc((100% - 9 * var(--gap)) / 10);
  position: relative;

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
  /* Re-enable clicks on board inside non-interactive presence-frame */
  pointer-events: auto;
}

.tile {
  border-radius: var(--radius);
  pointer-events: none;
  z-index: 0;
}

.tourist-board--interactive .tile {
  pointer-events: auto;
}

.tourist-board--interactive .tile--target {
  cursor: pointer;
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

/* Local move chrome — current-turn client only (SC-MOVE-11/12).
   Keep tile outlines under pieces so selection does not hide the tourist PNG. */
.tile--selected {
  outline: 3px solid #ffffff;
  outline-offset: -2px;
}

.tile--target {
  outline: 3px solid #f44336;
  outline-offset: -2px;
}

.piece {
  /* Absolute offsets (D6): % in left/top resolve against the board, not the piece. */
  position: absolute;
  width: var(--cell);
  height: var(--cell);
  left: calc(var(--pcol) * (var(--cell) + var(--gap)));
  top: calc(var(--prow) * (var(--cell) + var(--gap)));
  object-fit: contain;
  pointer-events: none;
  z-index: 2;
  padding: 2px;
  box-sizing: border-box;
  transition:
    left 250ms ease-out,
    top 250ms ease-out;
}

.piece--no-transition {
  transition: none;
}

.tourist-board--interactive .piece--own {
  pointer-events: auto;
  cursor: pointer;
}

.my-tourist-strip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
}

.my-tourist-strip--interactive {
  pointer-events: auto;
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
  border-radius: 8px;
}

.my-tourist-strip--interactive .my-tourist-img {
  pointer-events: auto;
  cursor: pointer;
}

.my-tourist-img--selected {
  outline: 3px solid #ffffff;
  outline-offset: 2px;
}
</style>
