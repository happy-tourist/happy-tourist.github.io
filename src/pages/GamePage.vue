<template>
  <q-page class="q-pa-md column game-page">
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

    <!-- Solo end: timer vs steps-exhausted (SC-PRESENCE-21 / SC-MOVE-45/48). -->
    <q-dialog v-model="timeoutModalOpen" persistent>
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6 text-center">
            {{
              endModalKind === 'steps'
                ? $t('game.stepsExhaustedModal')
                : $t('game.timeExpiredModal')
            }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            color="primary"
            :label="
              endModalKind === 'steps'
                ? $t('game.stepsExhaustedModalOk')
                : $t('game.timeExpiredModalOk')
            "
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Peek under task tile — Correct / Wrong (SC-BOARD-08/09); owner-only via openPeek. -->
    <q-dialog :model-value="Boolean(game.openPeek)" persistent>
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-body1 text-center">
            {{ $t('game.peekModal', { n: game.openPeek?.reward ?? 0 }) }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('game.peekWrong')" @click="answerPeek(false)" />
          <q-btn color="primary" :label="$t('game.peekCorrect')" @click="answerPeek(true)" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Solo peeks∞ / finite steps (SC-PRESENCE-19); close keeps player in room. -->
    <q-dialog v-model="soloUnlimitedModalOpen" persistent>
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-body1 text-center">
            {{ $t('game.soloUnlimitedModal') }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn color="primary" :label="$t('game.soloUnlimitedModalOk')" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- All-jail warning — own seat only (SC-MOVE-63); informational. -->
    <q-dialog
      :model-value="game.allJailWarning"
      persistent
      @update:model-value="onAllJailDialogUpdate"
    >
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-body1 text-center">
            {{ $t('game.allJailWarningModal') }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            color="primary"
            :label="$t('game.allJailWarningModalOk')"
            @click="onAllJailDialogUpdate(false)"
          />
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

    <!-- Board scrolls above sticky bottom HUD; opponents/spectator markers above board (SC-PRESENCE-02/03/22 / D2). -->
    <div class="game-board-region">
      <div
        v-if="topPresenceMarkers.length > 0"
        class="presence-row presence-row--top"
        aria-label="presence"
      >
        <div
          v-for="marker in topPresenceMarkers"
          :key="`top-presence-${marker.sessionId}`"
          class="presence-slot"
        >
          <div class="presence-marker">
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

            <span
              v-if="marker.finishPlace > 0"
              class="presence-place-badge"
              :aria-label="$t('game.finishPlaceBadgeAria', { n: marker.finishPlace })"
            >
              {{ marker.finishPlace }}
            </span>

            <!-- Top markers: bubbles stack down toward board (SC-SAY-11). -->
            <div class="say-bubbles say-bubbles--top" aria-live="polite">
              <div
                v-for="bubble in liveSaysFor(marker.sessionId)"
                :key="`say-top-${bubble.sessionId}-${bubble.at}-${bubble.presetId}`"
                class="say-bubble"
              >
                {{ $t(`game.say.${bubble.presetId}`) }}
              </div>
            </div>
          </div>
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
              'tile--removed': tile.removed,
            },
          ]"
          :style="tile.style"
          @click="onTileClick(tile)"
        />
        <img
          v-for="piece in boardPieces"
          :key="`piece-${piece.sessionId}-${piece.side}`"
          class="piece"
          :class="{
            'piece--own': isOwnPiece(piece) && !piece.disappearing && !piece.trapped,
            'piece--trapped': piece.trapped,
            'piece--no-transition': !pieceTransitionsReady,
            'piece--disappearing': piece.disappearing,
          }"
          :src="touristSrc(piece.touristId)"
          alt=""
          :style="pieceStyle(piece)"
          @click.stop="onPieceClick(piece)"
          @transitionend="onPieceTransitionEnd($event)"
        />
        <!-- Revealed holding grilles — drop/rise for all clients (SC-BOARD-17…19). -->
        <img
          v-for="grille in grilleOverlays"
          :key="`grille-${grille.key}`"
          class="grille-overlay"
          :class="{
            'grille-overlay--drop': grille.phase === 'drop',
            'grille-overlay--rise': grille.phase === 'rise',
          }"
          :src="grilleSrc"
          alt=""
          :style="grilleStyle(grille)"
        />
        <!-- Eye to open peek on selected own free piece on present * (SC-BOARD-13/20). -->
        <button
          v-if="canShowPeekAffordance"
          type="button"
          class="peek-affordance"
          :aria-label="$t('game.peekAffordance')"
          :style="peekAffordanceStyle"
          @click.stop="onPeekClick"
        >
          <q-icon name="visibility" size="18px" />
        </button>
        <!-- Rescue over trapped when adj free + steps (SC-MOVE-54 UX). -->
        <button
          v-for="rescue in rescueAffordances"
          :key="`rescue-${rescue.side}`"
          type="button"
          class="rescue-affordance"
          :aria-label="$t('game.rescueAffordance')"
          :style="rescueAffordanceStyle(rescue)"
          @click.stop="onRescueClick(rescue.side)"
        >
          <q-icon name="lock_open" size="18px" />
        </button>
        <!-- Push over pushable free neighbors of selected pusher (SC-MOVE-74/75). -->
        <button
          v-for="push in pushAffordances"
          :key="`push-${push.targetSessionId}-${push.targetSide}`"
          type="button"
          class="push-affordance"
          :aria-label="$t('game.pushAffordance')"
          :style="pushAffordanceStyle(push)"
          @click.stop="onPushClick(push)"
        >
          <q-icon name="swipe" size="18px" />
        </button>
      </div>

      <!-- End-turn above sticky HUD, right-aligned — not in budgets row (SC-PRESENCE-17/25 / D3). -->
      <div v-if="canSendEndTurn" class="end-turn-dock">
        <q-btn
          dense
          unelevated
          color="primary"
          size="sm"
          class="end-turn-btn"
          :label="$t('game.endTurn')"
          @click.stop="onEndTurnClick"
        />
      </div>
    </div>

    <!-- Sticky bottom HUD: seated own + strip only; spectator has no bottom presence (SC-PRESENCE-02/03/22). -->
    <div v-if="isSeatedViewer" class="game-hud game-hud--seated">
      <!-- Scroll wrapper (not the bar) so overflow-x does not clip say chrome (SC-SAY-15). -->
      <div class="game-hud__scroll">
        <div class="game-hud__bar game-hud__bar--seated">
          <template v-for="item in bottomHudItems" :key="item.key">
            <!-- Four strip slots in HUD: row N,E,W,S / narrow 2×2 (SC-PIECE-09/32; D4).
                 No compact chip / q-menu (SC-PIECE-29/30 removed). -->
            <div v-if="item.kind === 'strip' && mySeat" class="my-tourist-strip">
              <div
                class="my-tourist-slots"
                :class="{ 'my-tourist-slots--interactive': isInteractive }"
              >
                <div
                  v-for="side in STRIP_SIDES"
                  :key="`strip-${side}`"
                  class="my-tourist-slot"
                  :class="{
                    'my-tourist-slot--finished': isStripSlotFinished(side),
                    'my-tourist-slot--dimmed': isStripSlotFinished(side) && !canReturn(side),
                    'my-tourist-slot--trapped': isStripSlotTrapped(side),
                    'my-tourist-slot--selected':
                      selectedSide === side && !isStripSlotFinished(side),
                    'my-tourist-slot--returning': returningSide === side,
                  }"
                  @click="onStripSlotClick(side)"
                >
                  <img
                    class="my-tourist-img"
                    :src="touristSrc(mySeat.touristId)"
                    :alt="`tourist ${side}`"
                  />
                  <img
                    v-if="chromeGrillePhase(side)"
                    class="my-tourist-chrome-grille"
                    :class="{
                      'my-tourist-chrome-grille--drop': chromeGrillePhase(side) === 'drop',
                      'my-tourist-chrome-grille--rise': chromeGrillePhase(side) === 'rise',
                    }"
                    :src="grilleSrc"
                    :style="chromeGrilleStyle"
                    alt=""
                  />
                  <q-icon
                    v-if="isStripSlotFinished(side)"
                    class="my-tourist-finish-icon"
                    name="flag"
                    size="18px"
                    :aria-label="$t('game.finishStripAria')"
                  />
                  <!-- Green return over finished strip tourist — no confirm modal (SC-FINISH-13/16). -->
                  <button
                    v-if="canReturn(side)"
                    type="button"
                    class="return-affordance"
                    :aria-label="$t('game.returnAffordance')"
                    @click.stop="onReturnAffordanceClick(side)"
                  >
                    <q-icon name="undo" size="18px" />
                  </button>
                </div>
              </div>
            </div>

            <div v-else-if="item.kind === 'marker'" class="presence-slot presence-slot--own">
              <div
                class="presence-marker"
                :class="{
                  'presence-marker--sayable':
                    canSendSay(item.marker) ||
                    canShowReady(item.marker) ||
                    showOwnBudgets(item.marker),
                }"
              >
                <!-- Sibling rings + avatar (SC-PRESENCE-04/10/11/12/13).
                   Quasar default slot renders only with show-value — img must be sibling. -->
                <q-circular-progress
                  :min="0"
                  :max="turnRingMax"
                  :value="turnRingValue(item.marker)"
                  :size="`${PRESENCE_OUTER_PX}px`"
                  :thickness="0.12"
                  :color="turnRingColor(item.marker)"
                  :track-color="showTurnRing(item.marker) ? 'grey-4' : 'transparent'"
                  class="presence-progress presence-progress--outer"
                />
                <q-circular-progress
                  :min="0"
                  :max="GRACE_SECONDS"
                  :value="
                    showGraceRing(item.marker) ? graceRemaining(item.marker.reconnectUntil) : 0
                  "
                  :size="`${PRESENCE_INNER_PX}px`"
                  :thickness="0.18"
                  :color="showGraceRing(item.marker) ? 'warning' : 'transparent'"
                  :track-color="showGraceRing(item.marker) ? 'grey-4' : 'transparent'"
                  class="presence-progress presence-progress--inner"
                />
                <img class="presence-avatar" :src="touristSrc(item.marker.touristId)" alt="" />

                <!-- Own bottom: bubbles stack up toward board (SC-SAY-12). -->
                <div class="say-bubbles say-bubbles--bottom" aria-live="polite">
                  <div
                    v-for="bubble in liveSaysFor(item.marker.sessionId)"
                    :key="`say-${bubble.sessionId}-${bubble.at}-${bubble.presetId}`"
                    class="say-bubble"
                  >
                    {{ $t(`game.say.${bubble.presetId}`) }}
                  </div>
                </div>

                <!-- Finish badge top-left (SC-PRESENCE-14) -->
                <span
                  v-if="item.marker.finishPlace > 0"
                  class="presence-place-badge"
                  :aria-label="$t('game.finishPlaceBadgeAria', { n: item.marker.finishPlace })"
                >
                  {{ item.marker.finishPlace }}
                </span>

                <!-- Ready top-left own only (SC-PRESENCE-14); phases do not overlap finish -->
                <button
                  v-if="canShowReady(item.marker)"
                  type="button"
                  class="ready-affordance"
                  :aria-label="$t('game.readyButton')"
                  @click.stop="onReadyClick"
                >
                  {{ $t('game.readyButton') }}
                </button>

                <!-- Say top-right own only (SC-PRESENCE-14 / SC-SAY-07) -->
                <button
                  v-if="canSendSay(item.marker)"
                  type="button"
                  class="say-affordance"
                  :aria-label="$t('game.say.affordance')"
                  @click.stop="toggleSayPicker"
                >
                  <q-icon name="chat_bubble_outline" size="18px" />
                </button>

                <div
                  v-if="sayPickerOpen && canSendSay(item.marker)"
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

              <!-- Budgets to the right of own avatar (SC-PRESENCE-15 / D3); end-turn in end-turn-dock. -->
              <div v-if="showOwnBudgets(item.marker)" class="presence-budgets">
                <div class="budget-counters">
                  <div class="budget-counter" :aria-label="$t('game.stepsCounterAria')">
                    <q-icon name="directions_walk" size="16px" />
                    <span class="budget-value">{{ stepsBudgetDisplay }}</span>
                    <span
                      v-for="fall in stepFalls"
                      :key="`step-fall-${fall.id}`"
                      class="budget-fall"
                      aria-hidden="true"
                    >
                      +{{ fall.n }}
                    </span>
                  </div>
                  <div class="budget-counter" :aria-label="$t('game.peeksCounterAria')">
                    <q-icon name="visibility" size="16px" />
                    <span class="budget-value">{{ peeksBudgetDisplay }}</span>
                    <span
                      v-for="fall in peekFalls"
                      :key="`peek-fall-${fall.id}`"
                      class="budget-fall"
                      aria-hidden="true"
                    >
                      +{{ fall.n }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import tourist1 from '@/assets/tourists/tourist1.png';
import tourist2 from '@/assets/tourists/tourist2.png';
import tourist3 from '@/assets/tourists/tourist3.png';
import tourist4 from '@/assets/tourists/tourist4.png';
import grilleSrc from '@/assets/grilles/grille.png';
import {
  useGameStore,
  type GamePiece,
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

/** Strip slot order: row N,E,W,S; 2×2 grid N,E / W,S (SC-PIECE-09/32). */
const STRIP_SIDES = ['N', 'E', 'W', 'S'] as const;

/** Reconnect grace length (seconds) — matches server / design D1. */
const GRACE_SECONDS = 30;

/** Piece travel animation (D6) — matches CSS transition. */
const MOVE_ANIM_MS = 250;
/** Short fade after landing on center before DOM removal (SC-FINISH-01). */
const FINISH_FADE_MS = 200;
/** Grille drop / rise animation — board + chrome (SC-BOARD-18/19/21, SC-PIECE-31). */
const GRILLE_ANIM_MS = 1000;

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
  /** Removed task cell — visual hole; not landable; piece may stand (SC-BOARD-11/12/15). */
  removed?: boolean;
}

interface BudgetFall {
  id: number;
  n: number;
}

interface BoardPiece {
  sessionId: string;
  touristId: number;
  side: string;
  row: number;
  col: number;
  /** Synced trap flag — visible under grille (SC-PIECE-27). */
  trapped?: boolean;
  /** True while slide+fade after finish — still in DOM, not selectable. */
  disappearing?: boolean;
}

type GrillePhase = 'drop' | 'hold' | 'rise';

interface GrilleOverlay {
  key: string;
  row: number;
  col: number;
  phase: GrillePhase;
}

interface RescueAffordance {
  side: string;
  row: number;
  col: number;
}

/** Push affordance over a legal target of the selected pusher (SC-MOVE-74). */
interface PushAffordance {
  pusherSide: string;
  targetSessionId: string;
  targetSide: string;
  /** Far-side destination for the target. */
  row: number;
  col: number;
  /** Icon position = target’s current cell. */
  targetRow: number;
  targetCol: number;
}

/** Occupied-seat presence marker (top row and/or bottom HUD). */
interface PresenceMarker {
  sessionId: string;
  touristId: number;
  connected: boolean;
  reconnectUntil: number;
  /** Synced current-turn seat (SC-MOVE-01 indicator). */
  isCurrentTurn: boolean;
  /** Finish place; 0 = none (SC-PRESENCE-06/07). */
  finishPlace: number;
}

/** Bottom HUD items: seated own marker + optional strip (SC-PRESENCE-02/22). */
type HudItem =
  { kind: 'marker'; key: string; marker: PresenceMarker } | { kind: 'strip'; key: 'strip' };

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

function chebyshevDistance(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

/** Far-side cell through target: `target + (target − pusher)` (SC-MOVE-67). */
function farSideCell(pusher: Cell, target: Cell): Cell {
  return {
    row: target.row + (target.row - pusher.row),
    col: target.col + (target.col - pusher.col),
  };
}

/** Nearest of four center cells to `to` (Chebyshev; tie lower row, then col — SC-FINISH-15). */
function nearestCenterCell(to: Cell): Cell {
  let best: Cell = { row: CENTER_CELLS[0].row, col: CENTER_CELLS[0].col };
  let bestDist = Infinity;
  for (const c of CENTER_CELLS) {
    const d = chebyshevDistance(c, to);
    if (
      d < bestDist ||
      (d === bestDist && (c.row < best.row || (c.row === best.row && c.col < best.col)))
    ) {
      bestDist = d;
      best = { row: c.row, col: c.col };
    }
  }
  return best;
}

/**
 * Nearest legal center among CENTER_CELLS ∩ legalKeys relative to `from`
 * (Chebyshev; tie lower row, then col — SC-MOVE-63). No quadrant mapping.
 */
function nearestLegalCenterCell(from: Cell, legalKeys: Set<string>): Cell | null {
  let best: Cell | null = null;
  let bestDist = Infinity;
  for (const c of CENTER_CELLS) {
    if (!legalKeys.has(cellKey(c.row, c.col))) {
      continue;
    }
    const d = chebyshevDistance(from, c);
    if (
      best === null ||
      d < bestDist ||
      (d === bestDist && (c.row < best.row || (c.row === best.row && c.col < best.col)))
    ) {
      bestDist = d;
      best = { row: c.row, col: c.col };
    }
  }
  return best;
}

/**
 * Ring around the central 2×2 (incl. diagonal corners) — mirrors server
 * CENTER_RING_CELLS (SC-MOVE-57/58 / SC-FINISH-13).
 */
function buildCenterRingCells(): Cell[] {
  const centerKeys = new Set(CENTER_CELLS.map((c) => cellKey(c.row, c.col)));
  const ring = new Map<string, Cell>();
  for (const center of CENTER_CELLS) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) {
          continue;
        }
        const row = center.row + dr;
        const col = center.col + dc;
        const key = cellKey(row, col);
        if (centerKeys.has(key) || !isPlayableCell(row, col)) {
          continue;
        }
        ring.set(key, { row, col });
      }
    }
  }
  return [...ring.values()];
}

const CENTER_RING_CELLS = buildCenterRingCells();

function parseCellKey(key: string): Cell | null {
  const parts = key.split(',');
  if (parts.length !== 2) {
    return null;
  }
  const row = Number(parts[0]);
  const col = Number(parts[1]);
  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return null;
  }
  return { row, col };
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

const LAYOUT_TILES = buildBoardTiles();

const { t } = useI18n();
const game = useGameStore();
const {
  mySeat,
  isMyTurn,
  canSendReady,
  canSendEndTurn,
  isPlaying,
  isSeated,
  isMySeatFinished,
  isMySeatTimeExpired,
  myFinishedStripSides,
  budgetsInfinite,
} = storeToRefs(game);
const route = useRoute('game');
const router = useRouter();

/** Local selection — only meaningful on own turn (D5). */
const selectedSide = ref<string | null>(null);
/** Finished strip return mode — pick a center-ring cell (SC-FINISH-13). */
const returningSide = ref<string | null>(null);
/** Ignore clicks while own piece travel / rescue approach animates (SC-MOVE-15). */
const moveAnimating = ref(false);
/** Skip first paint transition so pieces do not fly from 0,0. */
const pieceTransitionsReady = ref(false);
/**
 * Return-from-finish travel: start cell (nearest center) keyed by pieceKey (SC-FINISH-15).
 * First paint uses this; nextTick clears so CSS slides to ring coords.
 */
const returnAnimFromByKey = ref(new Map<string, Cell>());
/** Own-marker preset picker open (SC-SAY-07). */
const sayPickerOpen = ref(false);
/** Own place congratulation modal (SC-FINISH-03/04). */
const placeModalOpen = ref(false);
const celebratedPlace = ref(0);
/** Own solo end modal (SC-MOVE-45/48 / SC-PRESENCE-21); other clients never open this. */
const timeoutModalOpen = ref(false);
/** Which solo end copy to show when `timeoutModalOpen` (timer vs steps). */
const endModalKind = ref<'timer' | 'steps'>('timer');
/** Solo peeks-unlimited modal (SC-PRESENCE-19). */
const soloUnlimitedModalOpen = ref(false);

/** Revealed grille overlays with drop/rise phases (SC-BOARD-18/19). */
const grilleOverlays = ref<GrilleOverlay[]>([]);
const grilleTimers = new Map<string, ReturnType<typeof setTimeout>>();
/** Strip-slot grille phases keyed by side (SC-PIECE-31) — same timing as board. */
const chromeGrilleBySide = ref<Partial<Record<string, GrillePhase>>>({});
const chromeGrilleTimers = new Map<string, ReturnType<typeof setTimeout>>();
const chromeGrilleStyle = { '--grille-anim-ms': `${GRILLE_ANIM_MS}ms` };
/** Temporary rescuer slide toward trapped cell (D5 — server coords unchanged). */
const rescueAnimOverride = ref<{
  sessionId: string;
  side: string;
  row: number;
  col: number;
} | null>(null);

/** +N fall-into-counter animations (SC-PRESENCE-15 / SC-PRESENCE-20). */
const stepFalls = ref<BudgetFall[]>([]);
const peekFalls = ref<BudgetFall[]>([]);
let budgetFallSeq = 0;
const budgetFallTimers = new Map<number, ReturnType<typeof setTimeout>>();
/** Local +N fall duration ≈ 2s (SC-PRESENCE-20); keep in sync with `.budget-fall` CSS. */
const BUDGET_FALL_MS = 2000;

let moveAnimTimer: ReturnType<typeof setTimeout> | undefined;
/** Clock tick so offline grace rings animate from reconnectUntil. */
const nowMs = ref(Date.now());
let graceTick: ReturnType<typeof setInterval> | undefined;

/** Avoid overlapping remount / soft-fail rejoin attempts. */
let rejoinInFlight = false;

/**
 * Keys of pieces that just finished — keep on board for slide + fade (SC-FINISH-01).
 * Cleared after MOVE_ANIM_MS + FINISH_FADE_MS; mid-join finished pieces never enter here.
 */
const disappearingKeys = ref<Set<string>>(new Set());
const finishFadeTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Synced removed task keys as a Set for O(1) hole checks. */
const removedTaskKeySet = computed(() => new Set(game.removedTaskKeys));

/** Board tiles with removed `*` as transparent holes (still in DOM for targets). */
const boardTiles = computed((): BoardTile[] => {
  const removed = removedTaskKeySet.value;
  return LAYOUT_TILES.map((tile) => {
    if (tile.kind !== 'task') {
      return tile;
    }
    const key = cellKey(tile.row, tile.col);
    return removed.has(key) ? { ...tile, removed: true } : tile;
  });
});

function pieceKey(sessionId: string, side: string): string {
  return `${sessionId}:${side}`;
}

function isPresentTaskCell(row: number, col: number): boolean {
  return LAYOUT[row]?.[col] === '*' && !removedTaskKeySet.value.has(cellKey(row, col));
}

/** Landing targets: playable LAYOUT cell that is not a removed-task hole (SC-BOARD-15). */
function isLandableCell(row: number, col: number): boolean {
  if (!isPlayableCell(row, col)) {
    return false;
  }
  return !removedTaskKeySet.value.has(cellKey(row, col));
}

/** Steps always numeric; peeks ∞ only in solo (SC-PRESENCE-16). */
const stepsBudgetDisplay = computed(() => String(game.steps));
const peeksBudgetDisplay = computed(() =>
  budgetsInfinite.value ? t('game.budgetInfinity') : String(game.peeks),
);

function showOwnBudgets(marker: PresenceMarker): boolean {
  return (
    isPlaying.value &&
    isSeated.value &&
    Boolean(game.sessionId) &&
    marker.sessionId === game.sessionId
  );
}

function pushBudgetFall(target: 'steps' | 'peeks', delta: number) {
  // Peeks∞: no +N on peeks; steps stay finite and still animate (SC-PRESENCE-16/20).
  if (delta <= 0 || (target === 'peeks' && budgetsInfinite.value)) {
    return;
  }
  const id = ++budgetFallSeq;
  const entry: BudgetFall = { id, n: delta };
  if (target === 'steps') {
    stepFalls.value = [...stepFalls.value, entry];
  } else {
    peekFalls.value = [...peekFalls.value, entry];
  }
  budgetFallTimers.set(
    id,
    setTimeout(() => {
      budgetFallTimers.delete(id);
      if (target === 'steps') {
        stepFalls.value = stepFalls.value.filter((f) => f.id !== id);
      } else {
        peekFalls.value = peekFalls.value.filter((f) => f.id !== id);
      }
    }, BUDGET_FALL_MS),
  );
}

function isStripSlotFinished(side: string): boolean {
  return myFinishedStripSides.value.includes(side);
}

function isStripSlotTrapped(side: string): boolean {
  const piece = mySeat.value?.pieces.find((p) => p.side === side);
  return Boolean(piece && piece.trapped && !piece.finished);
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

/** Legal one-step destinations for the selected own unfinished free piece (D5 / SC-MOVE-12/46). */
const legalTargets = computed((): Cell[] => {
  if (!isInteractive.value || !selectedSide.value || !mySeat.value || returningSide.value) {
    return [];
  }
  // Steps always finite (incl. solo): 0 steps → keep selection for peek eye, no move hints.
  if (game.steps <= 0) {
    return [];
  }
  const piece = mySeat.value.pieces.find(
    (p) => p.side === selectedSide.value && !isFinishedPiece(p) && !p.trapped,
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
      // Removed-task holes are not landable (SC-BOARD-11/15); stand-on-hole is OK.
      if (!isLandableCell(row, col)) {
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

/** Legal center-ring cells for return-from-finish (SC-MOVE-57/58 / SC-FINISH-13). */
const legalReturnTargets = computed((): Cell[] => {
  if (!isInteractive.value || !returningSide.value || !mySeat.value) {
    return [];
  }
  if (game.steps <= 0 || mySeat.value.finishPlace !== 0) {
    return [];
  }
  const occupied = buildOccupancy();
  return CENTER_RING_CELLS.filter(
    (c) => isLandableCell(c.row, c.col) && !occupied.has(cellKey(c.row, c.col)),
  );
});

const legalReturnTargetKeys = computed(
  () => new Set(legalReturnTargets.value.map((c) => cellKey(c.row, c.col))),
);

const selectedCell = computed((): Cell | null => {
  if (!selectedSide.value || !mySeat.value) {
    return null;
  }
  const piece = mySeat.value.pieces.find(
    (p) => p.side === selectedSide.value && !isFinishedPiece(p) && !p.trapped,
  );
  return piece ? { row: piece.row, col: piece.col } : null;
});

/**
 * Eye when selected own free unfinished piece sits on a still-present task cell
 * (SC-BOARD-13/14/20). Trapped pieces cannot peek (SC-MOVE-53 UX).
 */
const canShowPeekAffordance = computed(() => {
  if (
    !isInteractive.value ||
    !selectedSide.value ||
    !mySeat.value ||
    game.openPeek ||
    returningSide.value
  ) {
    return false;
  }
  // Multi peek while peeks remain; solo peeks∞ — no one-peek/turn gate (SC-BOARD-14).
  if (!budgetsInfinite.value && game.peeks <= 0) {
    return false;
  }
  const piece = mySeat.value.pieces.find(
    (p) => p.side === selectedSide.value && !isFinishedPiece(p) && !p.trapped,
  );
  return Boolean(piece && isPresentTaskCell(piece.row, piece.col));
});

const peekAffordanceStyle = computed((): Record<string, string> => {
  const cell = selectedCell.value;
  if (!cell) {
    return {};
  }
  return {
    '--prow': String(cell.row),
    '--pcol': String(cell.col),
  };
});

function hasAdjacentFreeRescuer(trapped: GamePiece): boolean {
  if (!mySeat.value || !trapped.trapped || trapped.finished) {
    return false;
  }
  const target: Cell = { row: trapped.row, col: trapped.col };
  for (const piece of mySeat.value.pieces) {
    if (piece.side === trapped.side || piece.finished || piece.trapped) {
      continue;
    }
    if (chebyshevDistance({ row: piece.row, col: piece.col }, target) === 1) {
      return true;
    }
  }
  return false;
}

function findAdjacentFreeRescuer(trapped: GamePiece): GamePiece | null {
  if (!mySeat.value || !trapped.trapped || trapped.finished) {
    return null;
  }
  const target: Cell = { row: trapped.row, col: trapped.col };
  for (const piece of mySeat.value.pieces) {
    if (piece.side === trapped.side || piece.finished || piece.trapped) {
      continue;
    }
    if (chebyshevDistance({ row: piece.row, col: piece.col }, target) === 1) {
      return piece;
    }
  }
  return null;
}

/** Rescue affordances over own trapped pieces with adj free + steps (SC-MOVE-54 UX). */
const rescueAffordances = computed((): RescueAffordance[] => {
  if (!isInteractive.value || !mySeat.value || game.steps <= 0 || returningSide.value) {
    return [];
  }
  const out: RescueAffordance[] = [];
  for (const piece of mySeat.value.pieces) {
    if (!piece.trapped || piece.finished) {
      continue;
    }
    if (!hasAdjacentFreeRescuer(piece)) {
      continue;
    }
    out.push({ side: piece.side, row: piece.row, col: piece.col });
  }
  return out;
});

function rescueAffordanceStyle(rescue: RescueAffordance): Record<string, string> {
  return {
    '--prow': String(rescue.row),
    '--pcol': String(rescue.col),
  };
}

/**
 * Push affordances over free neighbors the selected own free pusher can push
 * (own turn + steps≥1; SC-MOVE-74).
 */
const pushAffordances = computed((): PushAffordance[] => {
  if (
    !isInteractive.value ||
    !mySeat.value ||
    !selectedSide.value ||
    game.steps <= 0 ||
    returningSide.value
  ) {
    return [];
  }
  const pusher = mySeat.value.pieces.find(
    (p) => p.side === selectedSide.value && !isFinishedPiece(p) && !p.trapped,
  );
  if (!pusher) {
    return [];
  }
  const pusherCell: Cell = { row: pusher.row, col: pusher.col };
  const out: PushAffordance[] = [];
  for (const target of game.unfinishedBoardPieces) {
    if (target.trapped) {
      continue;
    }
    if (target.row === pusher.row && target.col === pusher.col) {
      continue;
    }
    const targetCell: Cell = { row: target.row, col: target.col };
    if (chebyshevDistance(pusherCell, targetCell) !== 1) {
      continue;
    }
    const dest = farSideCell(pusherCell, targetCell);
    if (!isLandableCell(dest.row, dest.col)) {
      continue;
    }
    // Target leaves its cell; exclude it from occupancy (mirrors server).
    const occupied = buildOccupancy(targetCell);
    if (occupied.has(cellKey(dest.row, dest.col))) {
      continue;
    }
    out.push({
      pusherSide: pusher.side,
      targetSessionId: target.sessionId,
      targetSide: target.side,
      row: dest.row,
      col: dest.col,
      targetRow: target.row,
      targetCol: target.col,
    });
  }
  return out;
});

function pushAffordanceStyle(push: PushAffordance): Record<string, string> {
  return {
    '--prow': String(push.targetRow),
    '--pcol': String(push.targetCol),
  };
}

function listLegalReturnCellsHint(): Cell[] {
  if (!mySeat.value || game.steps <= 0 || mySeat.value.finishPlace !== 0) {
    return [];
  }
  const occupied = buildOccupancy();
  return CENTER_RING_CELLS.filter(
    (c) => isLandableCell(c.row, c.col) && !occupied.has(cellKey(c.row, c.col)),
  );
}

function canReturn(side: string): boolean {
  if (!isInteractive.value || !mySeat.value || game.steps <= 0) {
    return false;
  }
  if (mySeat.value.finishPlace !== 0 || !isStripSlotFinished(side)) {
    return false;
  }
  return listLegalReturnCellsHint().length > 0;
}

function grilleStyle(grille: GrilleOverlay): Record<string, string> {
  return {
    '--prow': String(grille.row),
    '--pcol': String(grille.col),
    '--grille-anim-ms': `${GRILLE_ANIM_MS}ms`,
  };
}

function chromeGrillePhase(side: string): GrillePhase | undefined {
  return chromeGrilleBySide.value[side];
}

function isTileSelected(tile: BoardTile): boolean {
  const sel = selectedCell.value;
  if (!sel || !isInteractive.value || returningSide.value) {
    return false;
  }
  if (tile.kind === 'center') {
    return isCenterCell(sel.row, sel.col);
  }
  return tile.row === sel.row && tile.col === sel.col;
}

function isTileTarget(tile: BoardTile): boolean {
  if (!isInteractive.value) {
    return false;
  }
  // Return-mode: same red outline as ordinary move targets (SC-FINISH-13 / SC-MOVE-12).
  if (returningSide.value) {
    if (legalReturnTargetKeys.value.size === 0) {
      return false;
    }
    if (tile.kind === 'center') {
      return false;
    }
    return legalReturnTargetKeys.value.has(cellKey(tile.row, tile.col));
  }
  if (legalTargetKeys.value.size === 0) {
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
  const key = pieceKey(piece.sessionId, piece.side);
  const returnFrom = returnAnimFromByKey.value.get(key);
  if (returnFrom) {
    return {
      '--prow': String(returnFrom.row),
      '--pcol': String(returnFrom.col),
    };
  }
  const override = rescueAnimOverride.value;
  if (override && override.sessionId === piece.sessionId && override.side === piece.side) {
    return {
      '--prow': String(override.row),
      '--pcol': String(override.col),
    };
  }
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
  // Finished / trapped: no move or peek selection (SC-MOVE-52/53 UX).
  if (!piece || isFinishedPiece(piece) || piece.trapped) {
    return;
  }
  returningSide.value = null;
  selectedSide.value = side;
}

/** Lock board chrome for travel (default) or approach+back (rescue/push = 2×). */
function beginMoveAnimation(durationMs: number = MOVE_ANIM_MS) {
  moveAnimating.value = true;
  if (moveAnimTimer !== undefined) {
    clearTimeout(moveAnimTimer);
  }
  moveAnimTimer = setTimeout(() => {
    moveAnimating.value = false;
    moveAnimTimer = undefined;
  }, durationMs + 50);
}

function submitMove(side: string, row: number, col: number) {
  if (!isInteractive.value) {
    return;
  }
  // Animate / lock input only when the store actually sent (room + isMyTurn).
  if (!game.sendMove(side, row, col)) {
    return;
  }
  // Keep-focus after non-finishing move (SC-MOVE-46); clear only on center finish.
  if (isCenterCell(row, col)) {
    selectedSide.value = null;
  }
  beginMoveAnimation();
}

function onPieceClick(piece: BoardPiece) {
  if (!isInteractive.value || !isOwnPiece(piece) || piece.disappearing) {
    return;
  }
  selectOwnSide(piece.side);
}

/** Strip slot: select unfinished non-trapped; finished body alone does not start return (SC-FINISH-16). */
function onStripSlotClick(side: string) {
  if (!isInteractive.value) {
    return;
  }
  if (isStripSlotFinished(side) || isStripSlotTrapped(side)) {
    return;
  }
  selectOwnSide(side);
}

/** Return affordance → enter return-mode without confirm (SC-FINISH-13 / SC-MOVE-57). */
function onReturnAffordanceClick(side: string) {
  if (!canReturn(side)) {
    return;
  }
  selectedSide.value = null;
  returningSide.value = side;
}

function submitReturn(side: string, row: number, col: number) {
  if (!isInteractive.value || !returningSide.value) {
    return;
  }
  if (!game.sendReturnFromFinish(side, row, col)) {
    return;
  }
  returningSide.value = null;
  beginMoveAnimation();
}

function onRescueClick(side: string) {
  if (!isInteractive.value || !mySeat.value || game.steps <= 0) {
    return;
  }
  const trapped = mySeat.value.pieces.find((p) => p.side === side && p.trapped && !p.finished);
  if (!trapped) {
    return;
  }
  const rescuer = findAdjacentFreeRescuer(trapped);
  if (!rescuer) {
    return;
  }
  if (!game.sendRescue(side)) {
    return;
  }
  returningSide.value = null;
  // Brief approach-and-back (D5); server does not move the rescuer.
  beginMoveAnimation(MOVE_ANIM_MS * 2);
  const seatId = mySeat.value.sessionId;
  rescueAnimOverride.value = {
    sessionId: seatId,
    side: rescuer.side,
    row: trapped.row,
    col: trapped.col,
  };
  window.setTimeout(() => {
    rescueAnimOverride.value = {
      sessionId: seatId,
      side: rescuer.side,
      row: rescuer.row,
      col: rescuer.col,
    };
    window.setTimeout(() => {
      rescueAnimOverride.value = null;
    }, MOVE_ANIM_MS);
  }, MOVE_ANIM_MS);
}

function onPushClick(push: PushAffordance) {
  if (!isInteractive.value || !mySeat.value || game.steps <= 0) {
    return;
  }
  const pusher = mySeat.value.pieces.find(
    (p) => p.side === push.pusherSide && !isFinishedPiece(p) && !p.trapped,
  );
  if (!pusher) {
    return;
  }
  if (!game.sendPush(push.pusherSide, push.targetSessionId, push.targetSide, push.row, push.col)) {
    return;
  }
  returningSide.value = null;
  // Keep selection on the pusher (SC-MOVE-75); approach/back via rescueAnimOverride.
  selectedSide.value = push.pusherSide;
  beginMoveAnimation(MOVE_ANIM_MS * 2);
  const seatId = mySeat.value.sessionId;
  rescueAnimOverride.value = {
    sessionId: seatId,
    side: pusher.side,
    row: push.targetRow,
    col: push.targetCol,
  };
  window.setTimeout(() => {
    rescueAnimOverride.value = {
      sessionId: seatId,
      side: pusher.side,
      row: pusher.row,
      col: pusher.col,
    };
    window.setTimeout(() => {
      rescueAnimOverride.value = null;
    }, MOVE_ANIM_MS);
  }, MOVE_ANIM_MS);
}

function onAllJailDialogUpdate(open: boolean) {
  if (!open) {
    game.clearAllJailWarning();
  }
}

function onTileClick(tile: BoardTile) {
  if (!isInteractive.value) {
    return;
  }

  if (returningSide.value) {
    if (tile.kind === 'center') {
      return;
    }
    if (legalReturnTargetKeys.value.has(cellKey(tile.row, tile.col))) {
      submitReturn(returningSide.value, tile.row, tile.col);
    }
    return;
  }

  if (!selectedSide.value) {
    return;
  }

  if (tile.kind === 'center') {
    // Any click on visual 2×2 → nearest legal center vs selected piece (SC-MOVE-63).
    const from = selectedCell.value;
    if (!from) {
      return;
    }
    const cell = nearestLegalCenterCell(from, legalTargetKeys.value);
    if (cell) {
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
 * Seated: opponents above board; bottom HUD = own + strip.
 * Spectator: all markers above board; no bottom presence HUD.
 */
const isSeatedViewer = computed((): boolean => {
  const selfId = game.sessionId;
  return Boolean(selfId && game.seats.some((s) => s.sessionId === selfId));
});

/** Markers above the board — opponents (seated) or all occupied (spectator). */
const topPresenceMarkers = computed((): PresenceMarker[] => {
  const seats = game.seats;
  const selfId = game.sessionId;
  const self = seats.find((s) => s.sessionId === selfId);
  if (self) {
    return seats.filter((s) => s.sessionId !== selfId).map(toMarker);
  }
  return seats.map(toMarker);
});

/** Sticky bottom HUD: own marker + strip only when seated (SC-PRESENCE-02/22). */
const bottomHudItems = computed((): HudItem[] => {
  const seats = game.seats;
  const selfId = game.sessionId;
  const self = seats.find((s) => s.sessionId === selfId);
  if (!self) {
    return [];
  }
  const items: HudItem[] = [
    { kind: 'marker', key: `presence-${self.sessionId}`, marker: toMarker(self) },
  ];
  if (hasOwnPieces.value) {
    items.push({ kind: 'strip', key: 'strip' });
  }
  return items;
});

function toMarker(seat: GameSeat): PresenceMarker {
  return {
    sessionId: seat.sessionId,
    touristId: seat.touristId,
    connected: seat.connected,
    reconnectUntil: seat.reconnectUntil,
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

function onEndTurnClick() {
  sayPickerOpen.value = false;
  game.sendEndTurn();
}

function onPeekClick() {
  if (!canShowPeekAffordance.value || !selectedSide.value) {
    return;
  }
  game.sendPeek(selectedSide.value);
}

function answerPeek(correct: boolean) {
  game.sendPeekAnswer(correct);
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

async function ensureTouristRoom() {
  if (game.consentedLeaving || rejoinInFlight || game.room) {
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
    if (!game.consentedLeaving) {
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
    returningSide.value = null;
  }
});

// Lock move/peek selection if the selected piece becomes trapped (SC-MOVE-52/53 UX).
watch(
  () => {
    if (!selectedSide.value || !mySeat.value) {
      return false;
    }
    return Boolean(mySeat.value.pieces.find((p) => p.side === selectedSide.value)?.trapped);
  },
  (trapped) => {
    if (trapped) {
      selectedSide.value = null;
    }
  },
);

// Return mode needs steps ≥ 1 (SC-MOVE-59 UX).
watch(
  () => game.steps,
  (steps) => {
    if (steps <= 0) {
      returningSide.value = null;
    }
  },
);

/**
 * Sync revealed holding grilles → drop on appear, rise+vanish on clear (SC-BOARD-18/19).
 * Mid-join / remount shows hold without drop.
 */
watch(
  () => game.holdingGrilleKeys.slice(),
  (next, prev) => {
    const nextSet = new Set(next);
    const prevSet = new Set(prev ?? []);
    const isInitial = prev === undefined;

    for (const key of nextSet) {
      if (prevSet.has(key)) {
        continue;
      }
      const cell = parseCellKey(key);
      if (!cell) {
        continue;
      }
      grilleOverlays.value = [
        ...grilleOverlays.value.filter((g) => g.key !== key),
        {
          key,
          row: cell.row,
          col: cell.col,
          phase: isInitial ? 'hold' : 'drop',
        },
      ];
      const existing = grilleTimers.get(key);
      if (existing !== undefined) {
        clearTimeout(existing);
      }
      if (!isInitial) {
        grilleTimers.set(
          key,
          setTimeout(() => {
            grilleTimers.delete(key);
            grilleOverlays.value = grilleOverlays.value.map((g) =>
              g.key === key && g.phase === 'drop' ? { ...g, phase: 'hold' } : g,
            );
          }, GRILLE_ANIM_MS),
        );
      }
    }

    for (const key of prevSet) {
      if (nextSet.has(key)) {
        continue;
      }
      grilleOverlays.value = grilleOverlays.value.map((g) =>
        g.key === key ? { ...g, phase: 'rise' } : g,
      );
      const existing = grilleTimers.get(key);
      if (existing !== undefined) {
        clearTimeout(existing);
      }
      grilleTimers.set(
        key,
        setTimeout(() => {
          grilleTimers.delete(key);
          grilleOverlays.value = grilleOverlays.value.filter((g) => g.key !== key);
        }, GRILLE_ANIM_MS),
      );
    }
  },
  { immediate: true },
);

/**
 * Mirror trapped → chrome grille drop/rise on strip slots (SC-PIECE-31 / D8).
 * Mid-join / remount shows hold without drop (same as board).
 */
watch(
  () => {
    if (!mySeat.value) {
      return '';
    }
    return mySeat.value.pieces
      .filter((p) => p.trapped && !p.finished)
      .map((p) => p.side)
      .sort()
      .join(',');
  },
  (nextStr, prevStr) => {
    const nextSet = new Set(nextStr ? nextStr.split(',') : []);
    const prevSet = new Set(prevStr ? prevStr.split(',') : []);
    const isInitial = prevStr === undefined;
    const nextMap: Partial<Record<string, GrillePhase>> = {
      ...chromeGrilleBySide.value,
    };

    for (const side of nextSet) {
      if (prevSet.has(side)) {
        continue;
      }
      nextMap[side] = isInitial ? 'hold' : 'drop';
      const existing = chromeGrilleTimers.get(side);
      if (existing !== undefined) {
        clearTimeout(existing);
      }
      if (!isInitial) {
        chromeGrilleTimers.set(
          side,
          setTimeout(() => {
            chromeGrilleTimers.delete(side);
            if (chromeGrilleBySide.value[side] === 'drop') {
              chromeGrilleBySide.value = {
                ...chromeGrilleBySide.value,
                [side]: 'hold',
              };
            }
          }, GRILLE_ANIM_MS),
        );
      }
    }

    for (const side of prevSet) {
      if (nextSet.has(side)) {
        continue;
      }
      nextMap[side] = 'rise';
      const existing = chromeGrilleTimers.get(side);
      if (existing !== undefined) {
        clearTimeout(existing);
      }
      chromeGrilleTimers.set(
        side,
        setTimeout(() => {
          chromeGrilleTimers.delete(side);
          const rest = { ...chromeGrilleBySide.value };
          delete rest[side];
          chromeGrilleBySide.value = rest;
        }, GRILLE_ANIM_MS),
      );
    }

    chromeGrilleBySide.value = nextMap;
  },
  { immediate: true },
);

/** +N falls into own counters on finite budget increases (SC-PRESENCE-15/20). */
watch(
  () => game.steps,
  (next, prev) => {
    if (typeof prev !== 'number') {
      return;
    }
    if (next > prev) {
      pushBudgetFall('steps', next - prev);
    }
  },
);

watch(
  () => game.peeks,
  (next, prev) => {
    if (typeof prev !== 'number' || budgetsInfinite.value) {
      return;
    }
    if (next > prev) {
      pushBudgetFall('peeks', next - prev);
    }
  },
);

/**
 * Solo peeks∞ → peeks-unlimited modal (SC-PRESENCE-19).
 * Skip initial sync (already infinite on remount).
 */
watch(budgetsInfinite, (infinite, prev) => {
  if (prev === false && infinite) {
    soloUnlimitedModalOpen.value = true;
  }
});

/** Own unfinished piece on a still-present task cell (live `*`). */
function hasOwnUnfinishedOnLiveTask(): boolean {
  const seat = mySeat.value;
  if (!seat) {
    return false;
  }
  return seat.pieces.some((p) => !isFinishedPiece(p) && isPresentTaskCell(p.row, p.col));
}

/**
 * Own seat time-expired → dual end copy + clear move chrome (SC-PRESENCE-21 / SC-MOVE-45/48).
 * Infer cause locally: steps=0 ∧ ¬on live `*` → steps; else timer.
 * Only this client; skip initial sync (already expired on remount).
 */
watch(isMySeatTimeExpired, (expired, prev) => {
  if (expired) {
    selectedSide.value = null;
  }
  if (prev === false && expired) {
    endModalKind.value = game.steps <= 0 && !hasOwnUnfinishedOnLiveTask() ? 'steps' : 'timer';
    timeoutModalOpen.value = true;
  }
});

/**
 * Newly finished pieces: keep same DOM key for slide to center, then fade out (SC-FINISH-01).
 * Pieces leaving finished → return travel from nearest center (SC-FINISH-15).
 * flush sync so disappearingKeys / returnAnimFrom update before boardPieces re-render.
 * Initial sync skipped — already-finished / mid-join pieces stay as-is.
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
    const nextFinished = new Set(finishedKeys);

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

    // Return-from-finish: piece left finished set → animate from nearest center (all clients).
    for (const key of prev) {
      if (nextFinished.has(key)) {
        continue;
      }
      // Cancel any in-flight finish disappear for this piece.
      const fadeTimer = finishFadeTimers.get(key);
      if (fadeTimer !== undefined) {
        clearTimeout(fadeTimer);
        finishFadeTimers.delete(key);
      }
      if (disappearingKeys.value.has(key)) {
        const cleared = new Set(disappearingKeys.value);
        cleared.delete(key);
        disappearingKeys.value = cleared;
      }

      const colon = key.indexOf(':');
      if (colon <= 0) {
        continue;
      }
      const sessionId = key.slice(0, colon);
      const side = key.slice(colon + 1);
      const seat = game.seats.find((s) => s.sessionId === sessionId);
      const piece = seat?.pieces.find((p) => p.side === side && !p.finished);
      if (!piece) {
        continue;
      }
      const from = nearestCenterCell({ row: piece.row, col: piece.col });
      const nextFrom = new Map(returnAnimFromByKey.value);
      nextFrom.set(key, from);
      returnAnimFromByKey.value = nextFrom;
      // Paint at nearest center first, then slide to ring (SC-FINISH-15).
      void nextTick(() => {
        requestAnimationFrame(() => {
          const cleared = new Map(returnAnimFromByKey.value);
          if (cleared.delete(key)) {
            returnAnimFromByKey.value = cleared;
          }
        });
      });
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
    if (room || !prev || game.consentedLeaving) {
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
  for (const timer of budgetFallTimers.values()) {
    clearTimeout(timer);
  }
  budgetFallTimers.clear();
  for (const timer of grilleTimers.values()) {
    clearTimeout(timer);
  }
  grilleTimers.clear();
  for (const timer of chromeGrilleTimers.values()) {
    clearTimeout(timer);
  }
  chromeGrilleTimers.clear();
  rescueAnimOverride.value = null;
});
</script>

<style scoped>
/* Page column: board scroll region + sticky bottom HUD (D2/D3 / SC-PRESENCE-22). */
.game-page {
  flex: 1 1 auto;
  min-height: 100%;
  width: 100%;
  max-width: calc(10 * 60px + 9 * 2px);
  margin-inline: auto;
  align-items: stretch;
}

.game-board-region {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Board region sits above sibling HUD; keep a small inset. */
  padding-bottom: 8px;
}

/* Opponents (seated) / all seats (spectator) above the board (SC-PRESENCE-02/03).
   Bubbles are absolute and may overlay the top of the board — no reserved gap. */
.presence-row--top {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: flex-start;
  gap: 48px;
  width: 100%;
  min-height: 96px;
  margin-bottom: 8px;
  overflow: visible;
  pointer-events: none;
}

.presence-row--top .presence-slot {
  pointer-events: auto;
}

/* End-turn above sticky HUD, right edge (SC-PRESENCE-17/25). */
.end-turn-dock {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  max-width: calc(10 * 60px + 9 * 2px);
  padding: 4px 0 8px;
  pointer-events: none;
  flex-shrink: 0;
}

.end-turn-dock .end-turn-btn {
  pointer-events: auto;
}

.game-hud {
  position: sticky;
  bottom: 0;
  z-index: 20;
  width: 100%;
  max-width: calc(10 * 60px + 9 * 2px);
  margin-inline: auto;
  overflow: visible;
  pointer-events: none;
  /* Opaque bar so board does not show through under markers. */
  background-color: #fff;
  /* Narrow strip 2×2 vs wide row (SC-PIECE-32). */
  container-type: inline-size;
  container-name: game-hud;
}

body.body--dark .game-hud {
  background-color: #121212;
}

/* Horizontal scroll on a wrapper — not on the bar — so Y chrome (say affordance /
   bubbles) is not clipped by browsers forcing overflow-y with overflow-x (SC-SAY-15). */
.game-hud__scroll {
  width: 100%;
  overflow-x: auto;
  padding-top: 160px;
  margin-top: -160px;
  padding-bottom: 8px;
  pointer-events: none;
}

.game-hud__bar {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-end;
  gap: 48px;
  width: max-content;
  min-width: 100%;
  min-height: 96px;
  overflow: visible;
  pointer-events: none;
}

.game-hud__bar--seated {
  justify-content: flex-start;
  /* Own + strip only — tight gap; 2×2 kicks in under ~420 so no primary scroll (SC-PIECE-32). */
  gap: 12px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.presence-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: visible;
  flex-shrink: 0;
  pointer-events: auto;
}

/* Own cluster: avatar | budgets to the right (SC-PRESENCE-15 / D3). */
.presence-slot--own {
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

/* Own private budgets beside avatar (SC-PRESENCE-15 / D3). */
.presence-budgets {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  pointer-events: auto;
  z-index: 3;
  flex-shrink: 0;
}

.budget-counters {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 4px;
}

.budget-counter {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 48px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

body.body--dark .budget-counter {
  background: rgba(255, 255, 255, 0.14);
}

.budget-value {
  min-width: 1ch;
}

.budget-fall {
  position: absolute;
  left: 50%;
  top: -14px;
  transform: translateX(-50%);
  color: #81c784;
  font-size: 12px;
  font-weight: 700;
  pointer-events: none;
  /* ≈ BUDGET_FALL_MS / SC-PRESENCE-20 */
  animation: budget-fall-in 2s ease-in forwards;
}

@keyframes budget-fall-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-12px);
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
}

.end-turn-btn {
  white-space: nowrap;
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

/* Top-row markers: stack below avatar toward board; newer closer (column-reverse + oldest→newest). */
.say-bubbles--top {
  top: calc(100% + 4px);
  bottom: auto;
  flex-direction: column-reverse;
}

/* Own bottom HUD: stack above avatar toward board; newer closer (column + oldest→newest). */
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

/* Say affordance top-right own only (SC-PRESENCE-14 / SC-SAY-07 / SC-SAY-15).
   Hit-area ≥ ~32px; icon glyph may stay smaller. */
.say-affordance {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 5;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
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
  z-index: 6;
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

/* Removed task cells = page background hole (not a red target; SC-BOARD-11/12/15). */
.tile-task.tile--removed {
  background: transparent;
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

.tile--removed.tile--selected {
  /* Piece may stand on a hole with selection chrome; never offer as a red target (SC-BOARD-12/15). */
  background: transparent;
}

/* Eye affordance on selected peekable tourist (SC-BOARD-13). */
.peek-affordance {
  position: absolute;
  z-index: 4;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  color: #fff;
  background: rgba(33, 150, 243, 0.95);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
  left: calc(var(--pcol) * (var(--cell) + var(--gap)) + var(--cell) - 14px);
  top: calc(var(--prow) * (var(--cell) + var(--gap)) - 6px);
}

.peek-affordance:hover {
  background: #1e88e5;
}

/* Rescue affordance over trapped tourist (SC-MOVE-54 UX). */
.rescue-affordance {
  position: absolute;
  z-index: 5;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  color: #fff;
  background: rgba(67, 160, 71, 0.95);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
  left: calc(var(--pcol) * (var(--cell) + var(--gap)) + var(--cell) - 14px);
  top: calc(var(--prow) * (var(--cell) + var(--gap)) - 6px);
}

.rescue-affordance:hover {
  background: #388e3c;
}

/* Push affordance over pushable target (SC-MOVE-74 — same green family as rescue). */
.push-affordance {
  position: absolute;
  z-index: 5;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  color: #fff;
  background: rgba(67, 160, 71, 0.95);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
  left: calc(var(--pcol) * (var(--cell) + var(--gap)) + var(--cell) - 14px);
  top: calc(var(--prow) * (var(--cell) + var(--gap)) - 6px);
}

.push-affordance:hover {
  background: #388e3c;
}

/* Revealed grille overlay — above piece, drop/rise (SC-BOARD-18/19 / SC-PIECE-27). */
.grille-overlay {
  position: absolute;
  z-index: 3;
  width: var(--cell);
  height: var(--cell);
  left: calc(var(--pcol) * (var(--cell) + var(--gap)));
  top: calc(var(--prow) * (var(--cell) + var(--gap)));
  object-fit: contain;
  pointer-events: none;
  padding: 1px;
  box-sizing: border-box;
}

.grille-overlay--drop {
  animation: grille-drop var(--grille-anim-ms, 1000ms) ease-out both;
}

.grille-overlay--rise {
  animation: grille-rise var(--grille-anim-ms, 1000ms) ease-out both;
}

@keyframes grille-drop {
  from {
    transform: translateY(-45%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes grille-rise {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-50%);
    opacity: 0;
  }
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

.piece--trapped {
  pointer-events: none;
  cursor: default;
}

.tourist-board--interactive .piece--own {
  pointer-events: auto;
  cursor: pointer;
}

.my-tourist-strip {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  flex-shrink: 0;
  pointer-events: auto;
}

/* Wide: row N,E,W,S; when own(96)+gap(12)+4×72+gaps won't fit (~420) → 2×2 (SC-PIECE-09/32). */
.my-tourist-slots {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 0;
}

.my-tourist-slot {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  pointer-events: none;
  flex-shrink: 0;
}

.my-tourist-slots--interactive
  .my-tourist-slot:not(.my-tourist-slot--finished):not(.my-tourist-slot--trapped) {
  pointer-events: auto;
  cursor: pointer;
}

.my-tourist-slot--dimmed {
  opacity: 0.55;
}

.my-tourist-slot--selected {
  outline: 3px solid #ffffff;
  outline-offset: 2px;
}

.my-tourist-slot--returning {
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
  z-index: 2;
}

/* Return affordance over finished strip tourist (SC-FINISH-13 — same green family as rescue/push). */
.return-affordance {
  position: absolute;
  z-index: 5;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  color: #fff;
  background: rgba(67, 160, 71, 0.95);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
  left: 50%;
  top: -10px;
  transform: translateX(-50%);
}

.return-affordance:hover {
  background: #388e3c;
}

.my-tourist-chrome-grille {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  z-index: 1;
  padding: 1px;
  box-sizing: border-box;
}

.my-tourist-chrome-grille--drop {
  animation: grille-drop var(--grille-anim-ms, 1000ms) ease-out both;
}

.my-tourist-chrome-grille--rise {
  animation: grille-rise var(--grille-anim-ms, 1000ms) ease-out both;
}

/*
 * Switch when a single row would force horizontal scroll as primary UX (SC-PIECE-32).
 * own 96 + gap 12 + 4×72 + 3×8 ≈ 420; ≤320/300 target is covered by this breakpoint.
 */
@container game-hud (max-width: 420px) {
  .my-tourist-slots {
    display: grid;
    grid-template-columns: repeat(2, 40px);
    grid-template-rows: repeat(2, 40px);
    gap: 4px;
  }

  .my-tourist-slot {
    width: 40px;
    height: 40px;
    border-radius: 6px;
  }

  .my-tourist-img {
    border-radius: 6px;
  }

  .my-tourist-finish-icon {
    top: 0;
    right: 0;
  }

  .return-affordance {
    width: 26px;
    height: 26px;
    min-width: 26px;
    min-height: 26px;
    top: -8px;
  }
}
</style>
