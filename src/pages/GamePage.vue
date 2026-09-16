<template>
  <q-page class="q-pa-md flex flex-center column">
    <div
      v-if="showCountdownOverlay"
      class="countdown-overlay"
      role="dialog"
      aria-live="assertive"
      :aria-label="$t('game.countdownSoon')"
    >
      <div class="countdown-overlay__card">
        <div class="countdown-overlay__title">{{ $t('game.countdownSoon') }}</div>
        <div class="countdown-overlay__seconds">{{ game.countdownRemaining }}</div>
      </div>
    </div>

    <div class="row items-center justify-between full-width q-mb-md game-header">
      <q-btn flat icon="arrow_back" :label="$t('game.leave')" @click="onExitClick" />
      <div class="text-center">
        <div class="text-subtitle1">{{ statusLabel }}</div>
      </div>
      <div class="text-caption text-muted">{{ game.roomId?.slice(0, 8) }}</div>
    </div>

    <q-dialog v-model="leaveConfirmOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-body1">{{ $t('game.leaveConfirm') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('game.leaveCancel')" v-close-popup />
          <q-btn color="primary" :label="$t('game.leaveExit')" @click="onConfirmLeave" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Own finish place 0→N (SC-FINISH-03/04); close keeps player in room. -->
    <q-dialog v-model="placeModalOpen" persistent>
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6 text-center">
            {{ $t('game.finishPlaceModal', { n: celebratedPlace }) }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn color="primary" :label="$t('game.finishPlaceModalOk')" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Own seat solo budget expiry (SC-MOVE-31); close keeps player in room. -->
    <q-dialog v-model="timeoutModalOpen" persistent>
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6 text-center">
            {{ $t('game.timeExpiredModal') }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn color="primary" :label="$t('game.timeExpiredModalOk')" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-banner
      v-if="game.error"
      class="bg-negative text-white q-mb-md"
      dense
      rounded
      style="max-width: 480px; width: 100%"
    >
      {{ game.error }}
    </q-banner>

    <div class="presence-frame">
      <template v-for="(row, ri) in presenceLayout" :key="`presence-row-${ri}`">
        <div
          v-if="row.kind === 'markers'"
          class="presence-row"
          :class="`presence-row--${row.slot}`"
        >
          <div
            v-for="marker in row.markers"
            :key="`presence-${marker.sessionId}`"
            class="presence-slot"
          >
            <div
              class="presence-marker"
              :class="{
                'presence-marker--sayable': canSendSay(marker) || canShowReady(marker),
              }"
            >
              <!-- Sibling rings + avatar (SC-PRESENCE-04/10/11/12/13).
                   Quasar default slot renders only with show-value — img must be sibling. -->
              <q-circular-progress
                :min="0"
                :max="turnRingMax"
                :value="turnRingValue(marker)"
                :size="`${PRESENCE_OUTER_PX}px`"
                :thickness="0.12"
                :color="turnRingColor(marker)"
                :track-color="showTurnRing(marker) ? 'grey-4' : 'transparent'"
                class="presence-progress presence-progress--outer"
              />
              <q-circular-progress
                :min="0"
                :max="GRACE_SECONDS"
                :value="showGraceRing(marker) ? graceRemaining(marker.reconnectUntil) : 0"
                :size="`${PRESENCE_INNER_PX}px`"
                :thickness="0.18"
                :color="showGraceRing(marker) ? 'warning' : 'transparent'"
                :track-color="showGraceRing(marker) ? 'grey-4' : 'transparent'"
                class="presence-progress presence-progress--inner"
              />
              <img class="presence-avatar" :src="touristSrc(marker.touristId)" alt="" />

              <!-- Finish badge top-left (SC-PRESENCE-14) -->
              <span
                v-if="marker.finishPlace > 0"
                class="presence-place-badge"
                :aria-label="$t('game.finishPlaceBadgeAria', { n: marker.finishPlace })"
              >
                {{ marker.finishPlace }}
              </span>

              <!-- Ready top-left own only (SC-PRESENCE-14); phases do not overlap finish -->
              <button
                v-if="canShowReady(marker)"
                type="button"
                class="ready-affordance"
                :aria-label="$t('game.readyButton')"
                @click.stop="onReadyClick"
              >
                {{ $t('game.readyButton') }}
              </button>

              <!-- Say top-right own only (SC-PRESENCE-14 / SC-SAY-07) -->
              <button
                v-if="canSendSay(marker)"
                type="button"
                class="say-affordance"
                :aria-label="$t('game.say.affordance')"
                @click.stop="toggleSayPicker"
              >
                <q-icon name="chat_bubble_outline" size="18px" />
              </button>

              <!-- Bubbles toward board: top below / bottom above (SC-SAY-11/12) -->
              <div class="say-bubbles" :class="`say-bubbles--${row.slot}`" aria-live="polite">
                <div
                  v-for="bubble in liveSaysFor(marker.sessionId)"
                  :key="`say-${bubble.sessionId}-${bubble.at}-${bubble.presetId}`"
                  class="say-bubble"
                >
                  {{ $t(`game.say.${bubble.presetId}`) }}
                </div>
              </div>

              <div
                v-if="sayPickerOpen && canSendSay(marker)"
                class="say-picker"
                role="menu"
                @click.stop
              >
                <button
                  v-for="presetId in SAY_PRESET_IDS"
                  :key="presetId"
                  type="button"
                  class="say-picker__btn"
                  role="menuitem"
                  @click="chooseSayPreset(presetId)"
                >
                  {{ $t(`game.say.${presetId}`) }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="tourist-board" :class="{ 'tourist-board--interactive': isInteractive }">
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
              'piece--own': isOwnPiece(piece) && !piece.disappearing,
              'piece--no-transition': !pieceTransitionsReady,
              'piece--disappearing': piece.disappearing,
            }"
            :src="touristSrc(piece.touristId)"
            alt=""
            :style="pieceStyle(piece)"
            @click.stop="onPieceClick(piece)"
            @transitionend="onPieceTransitionEnd($event)"
          />
        </div>
      </template>
    </div>

    <!-- Strip only once own pieces exist (SC-PIECE-09/17 — empty before playing). -->
    <div
      v-if="mySeat && hasOwnPieces"
      class="my-tourist-strip q-mt-md"
      :class="{ 'my-tourist-strip--interactive': isInteractive }"
    >
      <div class="text-caption text-muted">Мои туристы</div>
      <div class="my-tourist-slots">
        <div
          v-for="side in STRIP_SIDES"
          :key="`strip-${side}`"
          class="my-tourist-slot"
          :class="{
            'my-tourist-slot--finished': isStripSlotFinished(side),
            'my-tourist-slot--selected': selectedSide === side && !isStripSlotFinished(side),
          }"
          @click="onStripClick(side)"
        >
          <img
            class="my-tourist-img"
            :src="touristSrc(mySeat.touristId)"
            :alt="`Мои туристы ${side}`"
          />
          <q-icon
            v-if="isStripSlotFinished(side)"
            class="my-tourist-finish-icon"
            name="flag"
            size="18px"
            :aria-label="$t('game.finishStripAria')"
          />
        </div>
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
import {
  useGameStore,
  type GameSeat,
  type SayEvent,
  type SayPresetId,
  SAY_TTL_MS,
  isFinishedPiece,
  turnRemainingSeconds,
} from '@/stores/game';

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
/** Short fade after landing on center before DOM removal (SC-FINISH-01). */
const FINISH_FADE_MS = 200;

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

/** Presence row slots — top opponents / bottom self (SC-PRESENCE-02/03). No left/right. */
type PresenceSlot = 'top' | 'bottom';

/**
 * Presence chrome sizes (SC-PRESENCE-11/13): avatar matches strip tourist (72px);
 * rings scale around avatar; reserved marker box = outer ring.
 */
const PRESENCE_OUTER_PX = 96;
const PRESENCE_INNER_PX = 84;

/** Whitelist preset ids for picker — display copy via i18n `game.say.*` (ready via sendReady). */
const SAY_PRESET_IDS: readonly SayPresetId[] = ['hello', 'luck'];

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
  /** True while slide+fade after finish — still in DOM, not selectable. */
  disappearing?: boolean;
}

interface PresenceMarker {
  sessionId: string;
  touristId: number;
  connected: boolean;
  reconnectUntil: number;
  slot: PresenceSlot;
  /** Synced current-turn seat (SC-MOVE-01 indicator). */
  isCurrentTurn: boolean;
  /** Finish place; 0 = none (SC-PRESENCE-06/07). */
  finishPlace: number;
}

type PresenceLayoutRow =
  { kind: 'markers'; slot: PresenceSlot; markers: PresenceMarker[] } | { kind: 'board' };

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
const {
  mySeat,
  isMyTurn,
  canSendReady,
  isPlaying,
  isSeated,
  isMySeatFinished,
  isMySeatTimeExpired,
  myFinishedStripSides,
} = storeToRefs(game);
const route = useRoute('game');
const router = useRouter();

/** Local selection — only meaningful on own turn (D5). */
const selectedSide = ref<string | null>(null);
/** Ignore clicks while own piece travel animates (SC-MOVE-15). */
const moveAnimating = ref(false);
/** Skip first paint transition so pieces do not fly from 0,0. */
const pieceTransitionsReady = ref(false);
/** Own-marker preset picker open (SC-SAY-07). */
const sayPickerOpen = ref(false);
/** Leave confirm for seated ∧ playing ∧ !finishPlace ∧ !timeExpired (SC-LEAVE-02…07). */
const leaveConfirmOpen = ref(false);
/** Own place congratulation modal (SC-FINISH-03/04). */
const placeModalOpen = ref(false);
const celebratedPlace = ref(0);
/** Own solo timeout modal (SC-MOVE-31); other clients never open this. */
const timeoutModalOpen = ref(false);

let moveAnimTimer: ReturnType<typeof setTimeout> | undefined;
/** Clock tick so offline grace rings animate from reconnectUntil. */
const nowMs = ref(Date.now());
let graceTick: ReturnType<typeof setInterval> | undefined;

/** Consented exit — do not auto-rejoin after leaveGame clears the room. */
const consentedLeaving = ref(false);
/** Avoid overlapping remount / soft-fail rejoin attempts. */
let rejoinInFlight = false;

/**
 * Keys of pieces that just finished — keep on board for slide + fade (SC-FINISH-01).
 * Cleared after MOVE_ANIM_MS + FINISH_FADE_MS; mid-join finished pieces never enter here.
 */
const disappearingKeys = ref<Set<string>>(new Set());
const finishFadeTimers = new Map<string, ReturnType<typeof setTimeout>>();

function pieceKey(sessionId: string, side: string): string {
  return `${sessionId}:${side}`;
}

function isStripSlotFinished(side: string): boolean {
  return myFinishedStripSides.value.includes(side);
}

/** Personal strip only after pieces materialize (SC-PIECE-17). */
const hasOwnPieces = computed(() => Boolean(mySeat.value && mySeat.value.pieces.length > 0));

/** Flat board overlay: unfinished + short-lived disappearing finishers. */
const boardPieces = computed((): BoardPiece[] => {
  const out: BoardPiece[] = [];
  const fading = disappearingKeys.value;

  for (const piece of game.unfinishedBoardPieces) {
    out.push({ ...piece });
  }

  for (const seat of game.seats) {
    for (const piece of seat.pieces) {
      if (!piece.finished) {
        continue;
      }
      const key = pieceKey(seat.sessionId, piece.side);
      if (!fading.has(key)) {
        continue;
      }
      out.push({
        sessionId: seat.sessionId,
        touristId: seat.touristId,
        side: piece.side,
        row: piece.row,
        col: piece.col,
        disappearing: true,
      });
    }
  }
  return out;
});

/** Move chrome / submit only in playing; lock when finished or time-expired (SC-MOVE-20/31/32). */
const isInteractive = computed(
  () =>
    isPlaying.value &&
    isMyTurn.value &&
    !isMySeatFinished.value &&
    !isMySeatTimeExpired.value &&
    !moveAnimating.value,
);

/** Fullscreen countdown for every client in the room (SC-START-08). */
const showCountdownOverlay = computed(() => game.phase === 'countdown');

/** Occupancy of unfinished pieces only (local hint; finished do not block). */
function buildOccupancy(exclude?: Cell): Set<string> {
  const set = new Set<string>();
  const excludeKey = exclude ? cellKey(exclude.row, exclude.col) : null;
  for (const piece of game.unfinishedBoardPieces) {
    const key = cellKey(piece.row, piece.col);
    if (excludeKey !== null && key === excludeKey) {
      continue;
    }
    set.add(key);
  }
  return set;
}

/** Legal one-step destinations for the selected own unfinished piece (D5 / SC-MOVE-12). */
const legalTargets = computed((): Cell[] => {
  if (!isInteractive.value || !selectedSide.value || !mySeat.value) {
    return [];
  }
  const piece = mySeat.value.pieces.find(
    (p) => p.side === selectedSide.value && !isFinishedPiece(p),
  );
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
  const piece = mySeat.value.pieces.find(
    (p) => p.side === selectedSide.value && !isFinishedPiece(p),
  );
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
  const piece = mySeat.value.pieces.find((p) => p.side === side);
  if (!piece || isFinishedPiece(piece)) {
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
  if (!isInteractive.value || !isOwnPiece(piece) || piece.disappearing) {
    return;
  }
  selectOwnSide(piece.side);
}

function onStripClick(side: string) {
  if (isStripSlotFinished(side)) {
    return;
  }
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
 * Join order = array order from sync map forEach (design D9).
 * Seated: self bottom; opponents one top row L→R. Spectator: all top L→R.
 */
const presenceMarkers = computed((): PresenceMarker[] => {
  const seats = game.seats;
  const selfId = game.sessionId;
  const self = seats.find((s) => s.sessionId === selfId);

  if (self) {
    const markers: PresenceMarker[] = [toMarker(self, 'bottom')];
    for (const seat of seats) {
      if (seat.sessionId !== selfId) {
        markers.push(toMarker(seat, 'top'));
      }
    }
    return markers;
  }

  return seats.map((seat) => toMarker(seat, 'top'));
});

/** Top row → board → bottom row (omit empty rows). */
const presenceLayout = computed((): PresenceLayoutRow[] => {
  const markers = presenceMarkers.value;
  const top = markers.filter((m) => m.slot === 'top');
  const bottom = markers.filter((m) => m.slot === 'bottom');
  const rows: PresenceLayoutRow[] = [];
  if (top.length > 0) {
    rows.push({ kind: 'markers', slot: 'top', markers: top });
  }
  rows.push({ kind: 'board' });
  if (bottom.length > 0) {
    rows.push({ kind: 'markers', slot: 'bottom', markers: bottom });
  }
  return rows;
});

function toMarker(seat: GameSeat, slot: PresenceSlot): PresenceMarker {
  return {
    sessionId: seat.sessionId,
    touristId: seat.touristId,
    connected: seat.connected,
    reconnectUntil: seat.reconnectUntil,
    slot,
    isCurrentTurn:
      Boolean(game.currentTurnSessionId) && seat.sessionId === game.currentTurnSessionId,
    finishPlace: seat.finishPlace,
  };
}

function showGraceRing(marker: PresenceMarker): boolean {
  return !marker.connected && marker.reconnectUntil > 0;
}

/**
 * Active turn countdown on current-turn seat while deadline is synced (SC-PRESENCE-08/09).
 * Track chrome stays reserved even when inactive (SC-PRESENCE-11).
 */
function showTurnRing(marker: PresenceMarker): boolean {
  return (
    marker.isCurrentTurn &&
    game.phase === 'playing' &&
    game.turnUntil > 0 &&
    game.turnBudgetSeconds > 0
  );
}

/** Outer ring max = synced budget (60 or 300); fallback keeps layout stable. */
const turnRingMax = computed(() => (game.turnBudgetSeconds > 0 ? game.turnBudgetSeconds : 60));

function turnRingValue(marker: PresenceMarker): number {
  if (!showTurnRing(marker)) {
    return 0;
  }
  return turnRemainingSeconds(game.turnUntil, game.turnBudgetSeconds, nowMs.value);
}

/** Blue for multi 60s; red for solo 300s (D5 / SC-PRESENCE-08/09). */
function turnRingColor(marker: PresenceMarker): string {
  if (!showTurnRing(marker)) {
    return 'transparent';
  }
  return game.isSoloBudget ? 'negative' : 'primary';
}

/** Affordance only on own online seated marker (SC-SAY-07/08). */
function canSendSay(marker: PresenceMarker): boolean {
  return Boolean(game.sessionId) && marker.sessionId === game.sessionId && marker.connected;
}

/** Ready control beside own say when eligible (SC-START-09). */
function canShowReady(marker: PresenceMarker): boolean {
  return canSendReady.value && marker.sessionId === game.sessionId;
}

/** Live bubbles for a seat — TTL from server `at`, max 3, oldest→newest (D4). */
function liveSaysFor(sessionId: string): SayEvent[] {
  const now = nowMs.value;
  return game.sayEvents
    .filter((e) => e.sessionId === sessionId && now - e.at < SAY_TTL_MS)
    .sort((a, b) => a.at - b.at)
    .slice(-3);
}

function toggleSayPicker() {
  sayPickerOpen.value = !sayPickerOpen.value;
}

function chooseSayPreset(presetId: SayPresetId) {
  sayPickerOpen.value = false;
  game.sendSay(presetId);
}

function onReadyClick() {
  sayPickerOpen.value = false;
  game.sendReady();
}

function closeSayPicker() {
  sayPickerOpen.value = false;
}

/** Remaining grace seconds (full at disconnect → empty at deadline). */
function graceRemaining(reconnectUntil: number): number {
  if (reconnectUntil <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(GRACE_SECONDS, (reconnectUntil - nowMs.value) / 1000));
}

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
        if (isMyTurn.value) {
          return 'Ваш ход';
        }
        if (mySeat.value) {
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

// Clear local selection when turn ends / not playing / spectator (SC-MOVE-11…13 / SC-BOARD-05).
watch([isMyTurn, isPlaying], ([mine, playing]) => {
  if (!mine || !playing) {
    selectedSide.value = null;
  }
});

/**
 * Own seat time-expired → solo timeout modal + clear move chrome (SC-MOVE-31/32).
 * Only this client; skip initial sync (already expired on remount).
 */
watch(isMySeatTimeExpired, (expired, prev) => {
  if (expired) {
    selectedSide.value = null;
  }
  if (prev === false && expired) {
    timeoutModalOpen.value = true;
  }
});

/**
 * Newly finished pieces: keep same DOM key for slide to center, then fade out (SC-FINISH-01).
 * flush sync so disappearingKeys updates before boardPieces re-render (no one-frame gap).
 * Initial sync skipped — already-finished pieces stay off the board.
 */
watch(
  () =>
    game.seats.flatMap((s) =>
      s.pieces.filter((p) => p.finished).map((p) => pieceKey(s.sessionId, p.side)),
    ),
  (finishedKeys, prevKeys) => {
    if (prevKeys === undefined) {
      return;
    }
    const prev = new Set(prevKeys);
    for (const key of finishedKeys) {
      if (prev.has(key) || disappearingKeys.value.has(key)) {
        continue;
      }
      const next = new Set(disappearingKeys.value);
      next.add(key);
      disappearingKeys.value = next;

      const existing = finishFadeTimers.get(key);
      if (existing !== undefined) {
        clearTimeout(existing);
      }
      finishFadeTimers.set(
        key,
        setTimeout(() => {
          finishFadeTimers.delete(key);
          const cleared = new Set(disappearingKeys.value);
          cleared.delete(key);
          disappearingKeys.value = cleared;
        }, MOVE_ANIM_MS + FINISH_FADE_MS),
      );
    }

    // Drop selection if the selected piece just finished (SC-MOVE-24).
    if (selectedSide.value && mySeat.value) {
      const sel = mySeat.value.pieces.find((p) => p.side === selectedSide.value);
      if (sel && isFinishedPiece(sel)) {
        selectedSide.value = null;
      }
    }
  },
  { flush: 'sync' },
);

/**
 * Own finish place 0→N → local place modal; stay in room after close (SC-FINISH-03/04).
 * Skip initial sync (already finished mid-join / remount).
 */
watch(
  () => mySeat.value?.finishPlace ?? 0,
  (place, prev) => {
    if (typeof prev === 'number' && prev === 0 && place > 0) {
      celebratedPlace.value = place;
      placeModalOpen.value = true;
    }
  },
);

// Close say picker if we lose seat / go offline / lose ready eligibility context.
watch(
  () => {
    const seat = game.seats.find((s) => s.sessionId === game.sessionId);
    return Boolean(seat?.connected);
  },
  (ok) => {
    if (!ok) {
      sayPickerOpen.value = false;
    }
  },
);

onMounted(async () => {
  graceTick = setInterval(() => {
    nowMs.value = Date.now();
  }, 200);

  document.addEventListener('click', closeSayPicker);

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
    sayPickerOpen.value = false;
    await ensureTouristRoom();
  },
);

onUnmounted(() => {
  document.removeEventListener('click', closeSayPicker);
  if (graceTick !== undefined) {
    clearInterval(graceTick);
    graceTick = undefined;
  }
  if (moveAnimTimer !== undefined) {
    clearTimeout(moveAnimTimer);
    moveAnimTimer = undefined;
  }
  for (const timer of finishFadeTimers.values()) {
    clearTimeout(timer);
  }
  finishFadeTimers.clear();
});

/** Confirm only when seated ∧ playing ∧ !finishPlace ∧ !timeExpired (SC-LEAVE-05/07). */
const needsLeaveConfirm = computed(
  () => isSeated.value && isPlaying.value && !isMySeatFinished.value && !isMySeatTimeExpired.value,
);

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
  consentedLeaving.value = true;
  await game.leaveGame();
  await router.push({ name: 'lobby' });
}
</script>

<style scoped>
.game-header {
  /* Cap to board max-width — no side presence gutters (D9 / SC-PRESENCE-02 / SC-BOARD-03). */
  max-width: calc(10 * 60px + 9 * 2px);
  width: 100%;
}

/* Presence rows above/below board — no left/right columns (SC-PRESENCE-02/03). */
.presence-frame {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: calc(10 * 60px + 9 * 2px);
  pointer-events: none;
}

.presence-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  justify-content: center;
  /* Gap keeps neighbor say-bubbles from overlapping (SC-SAY-11/12 / D9). */
  gap: 48px;
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  min-height: 96px; /* = PRESENCE_OUTER_PX */
}

.presence-row--bottom {
  align-items: flex-end;
}

.presence-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: visible;
  flex-shrink: 0;
}

.presence-marker {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Reserved outer chrome = PRESENCE_OUTER_PX (SC-PRESENCE-11). */
  width: 96px;
  height: 96px;
  flex-shrink: 0;
}

.presence-progress--outer {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.presence-progress--inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  pointer-events: none;
}

.presence-marker--sayable {
  pointer-events: auto;
}

/* Ready top-left own only (SC-PRESENCE-14). */
.ready-affordance {
  position: absolute;
  top: -4px;
  left: -4px;
  z-index: 3;
  pointer-events: auto;
  border: none;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 11px;
  line-height: 1.3;
  white-space: nowrap;
  cursor: pointer;
  color: #fff;
  background: #43a047;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.ready-affordance:hover {
  background: #388e3c;
}

.countdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  pointer-events: auto;
}

.countdown-overlay__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 36px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  color: #1a1a1a;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  text-align: center;
  max-width: min(90vw, 360px);
}

body.body--dark .countdown-overlay__card {
  background: rgba(40, 40, 40, 0.96);
  color: #f0f0f0;
}

.countdown-overlay__title {
  font-size: 1.15rem;
  font-weight: 600;
}

.countdown-overlay__seconds {
  font-size: 3.5rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

/* Avatar matches strip tourist image box 72px (SC-PRESENCE-13). */
.presence-avatar {
  position: relative;
  z-index: 2;
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: 50%;
  pointer-events: none;
}

/* Finish place top-left (SC-PRESENCE-14). */
.presence-place-badge {
  position: absolute;
  top: -4px;
  left: -4px;
  z-index: 3;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: #2e7d32;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  pointer-events: none;
}

/* Comic say bubbles toward board (SC-SAY-11/12) — not Notify toasts. */
.say-bubbles {
  position: absolute;
  z-index: 2;
  display: flex;
  gap: 4px;
  pointer-events: none;
  max-width: 140px;
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
}

/* Top row: stack below avatar toward board; newer closer (column-reverse + oldest→newest). */
.say-bubbles--top {
  top: calc(100% + 4px);
  flex-direction: column-reverse;
}

/* Bottom self: stack above avatar toward board; newer closer (column + oldest→newest). */
.say-bubbles--bottom {
  bottom: calc(100% + 4px);
  flex-direction: column;
}

.say-bubble {
  background: #fff;
  color: #212121;
  border: 1px solid rgba(0, 0, 0, 0.18);
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 11px;
  line-height: 1.25;
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

body.body--dark .say-bubble {
  background: #2d2d2d;
  color: #f5f5f5;
  border-color: rgba(255, 255, 255, 0.18);
}

/* Say affordance top-right own only (SC-PRESENCE-14 / SC-SAY-07). */
.say-affordance {
  position: absolute;
  top: -4px;
  right: -4px;
  z-index: 3;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: rgba(33, 150, 243, 0.92);
  color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  flex-shrink: 0;
}

.say-affordance:hover {
  background: #1e88e5;
}

.say-picker {
  position: absolute;
  z-index: 4;
  left: 50%;
  bottom: calc(100% + 28px);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
  padding: 6px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.14);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  pointer-events: auto;
}

body.body--dark .say-picker {
  background: #2d2d2d;
  border-color: rgba(255, 255, 255, 0.16);
}

.say-picker__btn {
  border: none;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  color: inherit;
}

.say-picker__btn:hover {
  background: rgba(33, 150, 243, 0.12);
}

.tourist-board {
  --gap: 2px;
  --radius: 2px;
  --cell: calc((100% - 9 * var(--gap)) / 10);
  position: relative;

  /* Height from aspect-ratio: % in grid-template-rows against auto height collapses to 0 */
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr);
  gap: var(--gap);
  width: 100%;
  max-width: calc(10 * 60px + 9 * 2px);
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

.piece--disappearing {
  pointer-events: none;
  opacity: 0;
  transition:
    left 250ms ease-out,
    top 250ms ease-out,
    opacity 200ms ease-out 250ms;
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

.my-tourist-slot {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  pointer-events: none;
}

.my-tourist-strip--interactive .my-tourist-slot:not(.my-tourist-slot--finished) {
  pointer-events: auto;
  cursor: pointer;
}

.my-tourist-slot--finished {
  opacity: 0.55;
}

.my-tourist-slot--selected {
  outline: 3px solid #ffffff;
  outline-offset: 2px;
}

.my-tourist-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  border-radius: 8px;
}

.my-tourist-finish-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  color: #2e7d32;
  filter: drop-shadow(0 0 1px #fff);
  pointer-events: none;
}
</style>
