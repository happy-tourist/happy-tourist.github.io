import { defineStore, acceptHMRUpdate } from 'pinia';
import type { Room, RoomAvailable } from '@colyseus/sdk';
import { Notify } from 'quasar';

import { client } from '@/boot/colyseus';
import enUS from '@/i18n/en-US';

/** Room name registered on the Colyseus server. */
export const TOURIST_ROOM = 'tourist';

/** Built-in Colyseus LobbyRoom name. */
export const LOBBY_ROOM = 'lobby';

/**
 * Bound for lobby `leave()` in `unsubscribeLobby` (D3 / SC-LOBBY-37).
 * Callers that await unsubscribe get a short wait; hang leave cannot block forever.
 */
export const LOBBY_LEAVE_TIMEOUT_MS = 1500;

/** localStorage key for tourist reconnection (D3) — never used for lobby. */
const TOURIST_RECONNECT_KEY = 'ht-tourist-reconnect';

export interface GameRoomTaskSetLabel {
  taskSetId: string;
  /** Optional for API compat; lobby card MUST NOT surface author (SC-LOBBY-26). */
  authorDisplayName?: string;
  /** Create-time task count for this set in the room snapshot (SC-LOBBY-32). */
  taskCount?: number;
}

export interface GameRoomMeta {
  title?: string;
  status?: 'waiting' | 'playing' | 'finished';
  /** Occupied seated count from room metadata (not clients). */
  seats?: number;
  /** Max seated players from room metadata (not maxClients). */
  maxSeats?: number;
  /** Compact 10×10 map grid string for lobby mini-preview (SC-LOBBY-25). */
  mapGrid?: string;
  /** Map capacity players (SC-LOBBY-25). */
  players?: number;
  /** Map tourists per player (SC-LOBBY-25). */
  touristsPerPlayer?: number;
  /** Selected pack title/theme (SC-LOBBY-26). */
  packTitle?: string;
  /**
   * Selected task sets (+ optional author for API compat; + taskCount SC-LOBBY-32).
   * UI shows ordinals + counts, never author (SC-LOBBY-26).
   */
  taskSetLabels?: GameRoomTaskSetLabel[];
  [key: string]: unknown;
}

/** Create options — map + pack/sets + chosen maxSeats ≤ map.players (D2).
 * Trap seed is fixed server-side (15% grille / 20% catapult); no client density (SC-LOBBY-40/41).
 * `opponentMode` always sent; server coerces effective AI only when ai ∧ maxSeats≥2 (SC-LOBBY-50…52). */
export type OpponentMode = 'people' | 'ai';

export interface CreateGameOptions {
  mapId: string;
  packId: string;
  taskSetIds: string[];
  /** Chosen seats 1…map.players; server defaults to min(2, map.players) if omitted. */
  maxSeats: number;
  /** People vs AI; client does not coerce when maxSeats===1 (SC-LOBBY-51/52). */
  opponentMode: OpponentMode;
}

/** Mirrored piece from synced Seat.pieces (keyed by seat-local piece id `"0"`…). */
export interface GamePiece {
  /** Seat-local piece id — map key on server; no N/E/S/W side (D3). */
  pieceId: string;
  row: number;
  col: number;
  /** Synced finish flag — finished pieces leave board occupancy (game/finish). */
  finished: boolean;
  /** Synced trap flag — piece held by a revealed grille (game/move). */
  trapped: boolean;
  /** Public grille auto-free countdown; 0 when not trapped (SC-BOARD-85 / D5). */
  remainingTurns?: number;
}

/** Synced start phase from MyRoomState.phase. */
export type GamePhase = 'waiting' | 'countdown' | 'playing';

/** Mirrored seat from synced MyRoomState.seats (keyed by sessionId on server). */
export interface GameSeat {
  sessionId: string;
  touristId: number;
  pieces: GamePiece[];
  /** Synced connectivity — true while online (D2 / SC-PIECE-16). */
  connected: boolean;
  /** Unix ms reconnect deadline; 0 when online (D2). */
  reconnectUntil: number;
  /** Ready-to-start while waiting underfilled (game/start). */
  ready: boolean;
  /** Finish place; `0` until all four pieces finished (game/finish). */
  finishPlace: number;
  /** Solo turn budget elapsed; moves rejected until leave (game/move). */
  timeExpired: boolean;
  /** Synced AI seat flag — presence caption «AI» (SC-PRESENCE-60 / D4). */
  isBot: boolean;
}

/** Flat unfinished piece for board overlay (SC-PIECE-09 / SC-FINISH-01). */
export interface UnfinishedBoardPiece {
  sessionId: string;
  touristId: number;
  pieceId: string;
  row: number;
  col: number;
  /** Synced trap flag — piece held by a revealed grille (SC-PIECE-24/27). */
  trapped: boolean;
  /** Public grille auto-free countdown; 0 when not trapped (SC-BOARD-85). */
  remainingTurns: number;
}

/** Pack answer chip mirrored from synced answerCards (shared peek modal). */
export interface AnswerCardView {
  id: string;
  content: string;
  description: string;
}

/** Flipped (bound) task cell — public difficulty digit (SC-BOARD-42). */
export interface FlippedCellView {
  key: string;
  taskId: string;
  difficulty: 1 | 2 | 3;
}

/** Seat has a finish place (all four pieces finished). */
export function isFinishedSeat(seat: GameSeat): boolean {
  return seat.finishPlace > 0;
}

/** Strip slot / piece is finished and must not be selected for moves. */
export function isFinishedPiece(piece: GamePiece): boolean {
  return piece.finished;
}

/** Seat locked after solo budget expiry (game/move). */
export function isTimeExpiredSeat(seat: GameSeat): boolean {
  return seat.timeExpired;
}

/**
 * Eligible seat for leftover/multi turn accent: non-finished and not time-expired
 * (SC-PRESENCE-09). Spectators see synced seats.
 */
export function isEligibleSeat(seat: Pick<GameSeat, 'finishPlace' | 'timeExpired'>): boolean {
  return seat.finishPlace === 0 && !seat.timeExpired;
}

/** Count eligible seats — leftover red ring needs exactly one (SC-PRESENCE-09). */
export function countEligibleSeats(
  seats: readonly Pick<GameSeat, 'finishPlace' | 'timeExpired'>[],
): number {
  return seats.filter(isEligibleSeat).length;
}

/**
 * Solo leftover red ring: maxSeats ≥ 2 and exactly one eligible seat
 * (SC-PRESENCE-09). Intentional single-player (maxSeats === 1) is not leftover.
 */
export function isSoloBudgetFromSeats(
  seats: readonly Pick<GameSeat, 'finishPlace' | 'timeExpired'>[],
  maxSeats: number,
): boolean {
  return maxSeats >= 2 && countEligibleSeats(seats) === 1;
}

/**
 * Remaining turn seconds from synced turnUntil (clamped to budget).
 * Full at deadline start → empty at turnUntil.
 */
export function turnRemainingSeconds(
  turnUntil: number,
  turnBudgetSeconds: number,
  nowMs: number,
): number {
  if (turnUntil <= 0 || turnBudgetSeconds <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(turnBudgetSeconds, (turnUntil - nowMs) / 1000));
}

/** Whitelist preset ids for room message `say` (D1 / game/say). */
export type SayPresetId = 'hello' | 'luck' | 'ready';

/** Ephemeral say broadcast from server (not schema). */
export interface SayEvent {
  sessionId: string;
  presetId: SayPresetId;
  /** Server timestamp (ms) for TTL. */
  at: number;
}

/**
 * Shared peek session (schema + peekOpen broadcast) — every client sees the modal.
 * Peeker alone may place/submit; others are read-only (SC-BOARD-43/44/46).
 */
export interface OpenPeek {
  sessionId: string;
  pieceId: string;
  row: number;
  col: number;
  taskId: string;
  question: string;
  difficulty: 1 | 2 | 3;
  /** Alias of difficulty (legacy reward wording). */
  reward: 1 | 2 | 3;
  /** Slot placements: answerCardId or `""` empty. */
  placements: string[];
}

/** Live say bubble lifetime (ms) — mirrors server SAY_TTL_MS. */
export const SAY_TTL_MS = 10_000;

/** Header match-status peek-outcome flash duration (SC-PRESENCE-36 / D4). */
export const PEEK_STATUS_FLASH_MS = 10_000;

/** Peek-close outcome kind for App `game-status` flash (SC-PRESENCE-36). */
export type PeekStatusFlashKind = 'correct' | 'wrong' | 'timeout';

export interface PeekStatusFlash {
  kind: PeekStatusFlashKind;
  /** Unix ms — flash ends at this time (local timer). */
  until: number;
}

/** Max concurrent live says per session — mirrors server SAY_MAX_LIVE. */
export const SAY_MAX_LIVE = 3;

/** Clears local peekStatusFlash timeout across leave / new flash. */
let peekStatusFlashTimer: ReturnType<typeof setTimeout> | null = null;

const SAY_PRESETS: ReadonlySet<string> = new Set(['hello', 'luck', 'ready']);

type GameStatus = 'idle' | 'connecting' | 'waiting' | 'playing' | 'finished';

type PieceSync = {
  row: number;
  col: number;
  finished?: boolean;
  trapped?: boolean;
  remainingTurns?: number;
};

/** Private knowledge finish/cut outcome (SC-FINISH-31/32/34 / D8). */
export type KnowledgeOutcome = 'finish' | 'cut';

/** Private knowledge payload from room `knowledge` message (owner-only — D2). */
export type KnowledgePayload = {
  delivered: number;
  pieces: Record<string, number>;
  /** Present on full finish / penultimate cut; omit on ordinary sync. */
  outcome?: KnowledgeOutcome;
};

type SeatSync = {
  touristId: number;
  connected?: boolean;
  reconnectUntil?: number;
  ready?: boolean;
  finishPlace?: number;
  timeExpired?: boolean;
  /** Synced AI seat (SC-PRESENCE-60 / D4). */
  isBot?: boolean;
  pieces?: {
    forEach: (cb: (piece: PieceSync, pieceId: string) => void) => void;
  };
};

type FlippedCellSync = {
  taskId?: string;
  difficulty?: number;
};

type AnswerCardSync = {
  id?: string;
  content?: string;
  description?: string;
};

type TouristRoomState = {
  /** Legacy; prefer phase === 'playing'. */
  started?: boolean;
  phase?: string;
  maxSeats?: number;
  countdownRemaining?: number;
  /** Synced current-turn seated sessionId (empty if no seated). */
  currentTurnSessionId?: string;
  /** Unix ms turn deadline; 0 = no active timer. */
  turnUntil?: number;
  /** Active turn budget seconds (60 multi / 60 solo); 0 when none. */
  turnBudgetSeconds?: number;
  /** Map snapshot grid (100 chars) — authoritative board layout. */
  grid?: string;
  /** Pieces per seat from map snapshot. */
  touristsPerPlayer?: number;
  packTitle?: string;
  /** Synced removed task cell keys `"r,c"` (visual holes; landable; stand OK). */
  removedTaskKeys?: {
    forEach: (cb: (key: string) => void) => void;
    length?: number;
  };
  /**
   * Synced revealed grille cells currently holding a trapped piece (`"r,c"`).
   * Hidden (unspent) grilles are never synced.
   */
  holdingGrilleKeys?: {
    forEach: (cb: (key: string) => void) => void;
    length?: number;
  };
  /**
   * Synced catapult cells currently presenting fade reveal (`"r,c"`).
   * Hidden unspent catapults are never synced.
   */
  revealingCatapultKeys?: {
    forEach: (cb: (key: string) => void) => void;
    length?: number;
  };
  /**
   * Subset of revealing catapults that show broken artwork on fade-out.
   */
  brokenCatapultKeys?: {
    forEach: (cb: (key: string) => void) => void;
    length?: number;
  };
  flippedCells?: {
    forEach: (cb: (cell: FlippedCellSync, key: string) => void) => void;
  };
  answerCards?: {
    forEach: (cb: (card: AnswerCardSync) => void) => void;
    length?: number;
  };
  peekActive?: boolean;
  peekSessionId?: string;
  peekPieceId?: string;
  peekRow?: number;
  peekCol?: number;
  peekTaskId?: string;
  peekQuestion?: string;
  peekDifficulty?: number;
  peekPlacements?: {
    forEach: (cb: (id: string) => void) => void;
    length?: number;
  };
  seats?: {
    forEach: (cb: (seat: SeatSync, sessionId: string) => void) => void;
  };
};

function parsePhase(raw: unknown): GamePhase {
  if (raw === 'countdown' || raw === 'playing' || raw === 'waiting') {
    return raw;
  }
  return 'waiting';
}

type StoredTouristReconnect = {
  roomId: string;
  token: string;
};

/** Matchmaking / SDK reconnect noise that must not become lobby listing error (D7). */
function isLobbyReconnectNoise(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('seat reservation expired') ||
    m.includes('failed_to_reconnect') ||
    m.includes('reconnection failed') ||
    m.includes('reconnection token')
  );
}

function loadTouristReconnect(): StoredTouristReconnect | null {
  try {
    let raw = localStorage.getItem(TOURIST_RECONNECT_KEY);
    // One-shot migrate from pre-D3-revision sessionStorage (same key/format).
    if (!raw) {
      try {
        raw = sessionStorage.getItem(TOURIST_RECONNECT_KEY);
        if (raw) {
          localStorage.setItem(TOURIST_RECONNECT_KEY, raw);
          sessionStorage.removeItem(TOURIST_RECONNECT_KEY);
        }
      } catch {
        // private mode / quota — fall through with session raw if any
      }
    }
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredTouristReconnect;
    if (
      typeof parsed?.roomId === 'string' &&
      parsed.roomId.length > 0 &&
      typeof parsed?.token === 'string' &&
      parsed.token.length > 0
    ) {
      return parsed;
    }
  } catch {
    // ignore corrupt storage
  }
  return null;
}

function saveTouristReconnect(room: Room) {
  const token = room.reconnectionToken;
  if (!token || !room.roomId) {
    return;
  }
  try {
    localStorage.setItem(
      TOURIST_RECONNECT_KEY,
      JSON.stringify({ roomId: room.roomId, token } satisfies StoredTouristReconnect),
    );
  } catch {
    // private mode / quota — reconnect after browser restart may fail; soft reconnect still works
  }
}

function clearTouristReconnect() {
  try {
    localStorage.removeItem(TOURIST_RECONNECT_KEY);
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(TOURIST_RECONNECT_KEY);
  } catch {
    // ignore legacy key
  }
}

export const useGameStore = defineStore('game', {
  state: (): {
    rooms: RoomAvailable<GameRoomMeta>[];
    lobbyRoom: Room | null;
    /** True while LobbyPage wants a live listing (quiet resubscribe after drop). */
    lobbyWanted: boolean;
    room: Room | null;
    roomId: string | null;
    sessionId: string | null;
    /** Derived mirror of phase === 'playing' (legacy; prefer phase). */
    started: boolean;
    /** Synced start phase (waiting | countdown | playing). */
    phase: GamePhase;
    /** Synced room capacity (2|3|4). */
    maxSeats: number;
    /** Synced countdown seconds remaining (5…1 while countdown; else 0). */
    countdownRemaining: number;
    /** Mirrored MyRoomState.currentTurnSessionId — whose turn it is. */
    currentTurnSessionId: string;
    /** Unix ms turn deadline; `0` = no active turn timer (game/move). */
    turnUntil: number;
    /** Active turn budget in seconds (60 multi / 60 solo); `0` when none. */
    turnBudgetSeconds: number;
    seats: GameSeat[];
    /**
     * Synced removed task cell keys `"r,c"` (visual holes; landable).
     * Mirrored from MyRoomState.removedTaskKeys. Piece may stand on a hole.
     */
    removedTaskKeys: string[];
    /**
     * Synced revealed grille cells currently holding a trapped piece (`"r,c"`).
     * Mirrored from MyRoomState.holdingGrilleKeys (hidden grilles never sync).
     */
    holdingGrilleKeys: string[];
    /**
     * Synced catapult cells currently presenting fade reveal (`"r,c"`).
     * Mirrored from MyRoomState.revealingCatapultKeys (hidden never sync).
     */
    revealingCatapultKeys: string[];
    /**
     * Subset of revealing catapults that show broken artwork on fade-out.
     * Mirrored from MyRoomState.brokenCatapultKeys.
     */
    brokenCatapultKeys: string[];
    /** Map snapshot grid (100 chars) from room create — authoritative layout. */
    grid: string;
    /** Pieces per seat from map snapshot (SC-PIECE-51/52). */
    touristsPerPlayer: number;
    /** Pack title from create snapshot (peek chrome). */
    packTitle: string;
    /** Flipped (bound) task cells — public difficulty digits (SC-BOARD-42). */
    flippedCells: FlippedCellView[];
    /** Pack answer cards for shared peek modal chips. */
    answerCards: AnswerCardView[];
    /**
     * Own delivered knowledge from private `knowledge` (avatar HUD — block 6).
     * Strip yellow TR badges read `knowledgePieces` (D9 / SC-PRESENCE-52).
     */
    knowledgeDelivered: number;
    /** Own carried knowledge per pieceId from private `knowledge.pieces` (D2 / SC-PRESENCE-52). */
    knowledgePieces: Record<string, number>;
    /**
     * Latest finish/cut outcome from private `knowledge` (SC-FINISH-31/32/34).
     * `null` until a finish/cut payload arrives; modal defaults to finish copy.
     */
    knowledgeOutcome: KnowledgeOutcome | null;
    /**
     * True after the first private `knowledge` sync for this tourist attach.
     * GamePage arms +N falls only once synced so remount/rejoin baseline
     * (0 → delivered) does not play a spurious grant animation (SC-PRESENCE-51).
     */
    knowledgeSynced: boolean;
    /**
     * Shared peek session for every client (`peekActive` / `peekOpen`).
     * Cleared on peekClose / room reset (SC-BOARD-43/44/46).
     * Opened by server open-on-land — client must not send `peek` (D4 / SC-BOARD-84).
     */
    openPeek: OpenPeek | null;
    /**
     * Ephemeral peek-outcome flash for App header `game-status` (SC-PRESENCE-36 / D4).
     * Also drives top-center Notify toast (SC-BOARD-88 / D9).
     * Set from room-wide `peekClose`; cleared after PEEK_STATUS_FLASH_MS or leave.
     */
    peekStatusFlash: PeekStatusFlash | null;
    /**
     * Legacy all-jail teleport warning — inert (SC-MOVE-119): server no longer
     * teleports; client ignores the message and never opens a modal.
     */
    allJailWarning: boolean;
    /** Ephemeral say broadcasts (D3) — pruned by SAY_TTL_MS. */
    sayEvents: SayEvent[];
    /**
     * Consented leave in progress — GamePage must not auto-rejoin after leaveGame
     * clears the room (header leave lives in App.vue; D1 / redesign-game-hud).
     */
    consentedLeaving: boolean;
    status: GameStatus;
    error: string | null;
    listing: boolean;
  } => ({
    rooms: [],
    lobbyRoom: null,
    lobbyWanted: false,
    room: null,
    roomId: null,
    sessionId: null,
    started: false,
    phase: 'waiting',
    maxSeats: 2,
    countdownRemaining: 0,
    currentTurnSessionId: '',
    turnUntil: 0,
    turnBudgetSeconds: 0,
    seats: [],
    removedTaskKeys: [],
    holdingGrilleKeys: [],
    revealingCatapultKeys: [],
    brokenCatapultKeys: [],
    grid: '',
    touristsPerPlayer: 4,
    packTitle: '',
    flippedCells: [],
    answerCards: [],
    knowledgeDelivered: 0,
    knowledgePieces: {},
    knowledgeOutcome: null,
    knowledgeSynced: false,
    openPeek: null,
    peekStatusFlash: null,
    allJailWarning: false,
    sayEvents: [],
    consentedLeaving: false,
    status: 'idle',
    error: null,
    listing: false,
  }),

  getters: {
    isInRoom: (state) => Boolean(state.room),
    mySeat: (state): GameSeat | null =>
      state.seats.find((s) => s.sessionId === state.sessionId) ?? null,
    isSeated: (state) =>
      Boolean(state.sessionId && state.seats.some((s) => s.sessionId === state.sessionId)),
    /** True when this client is the seated player whose turn it is. */
    isMyTurn: (state) =>
      Boolean(
        state.sessionId &&
        state.currentTurnSessionId &&
        state.sessionId === state.currentTurnSessionId &&
        state.seats.some((s) => s.sessionId === state.sessionId),
      ),
    /** Moves / move chrome only while phase is playing. */
    isPlaying: (state) => state.phase === 'playing',
    /**
     * Own seated client may submit ready (SC-START-04/09):
     * waiting, ≥2 seated, under maxSeats, own seat not ready, connected.
     */
    canSendReady: (state) => {
      if (state.phase !== 'waiting' || !state.sessionId) {
        return false;
      }
      const seated = state.seats.length;
      if (seated < 2 || seated >= state.maxSeats) {
        return false;
      }
      const seat = state.seats.find((s) => s.sessionId === state.sessionId);
      return Boolean(seat && seat.connected && !seat.ready);
    },
    /**
     * Unfinished pieces of all seats for board overlay (SC-FINISH-01 / SC-PIECE-09).
     * Finished pieces stay off the board (disappear animation is page-local).
     */
    unfinishedBoardPieces: (state): UnfinishedBoardPiece[] => {
      const out: UnfinishedBoardPiece[] = [];
      for (const seat of state.seats) {
        for (const piece of seat.pieces) {
          if (piece.finished) {
            continue;
          }
          out.push({
            sessionId: seat.sessionId,
            touristId: seat.touristId,
            pieceId: piece.pieceId,
            row: piece.row,
            col: piece.col,
            trapped: piece.trapped,
            remainingTurns: piece.remainingTurns ?? 0,
          });
        }
      }
      return out;
    },
    /** Own seat has a finish place (all four pieces finished). */
    isMySeatFinished: (state): boolean => {
      const seat = state.seats.find((s) => s.sessionId === state.sessionId);
      return Boolean(seat && seat.finishPlace > 0);
    },
    /**
     * Solo leftover red-ring: maxSeats ≥ 2 and exactly one eligible seat.
     * Not via turnBudgetSeconds — leftover and multi both use 60s (SC-PRESENCE-09).
     * Single-player (maxSeats === 1) is never red-ring leftover.
     */
    isSoloBudget: (state): boolean => isSoloBudgetFromSeats(state.seats, state.maxSeats),
    /** Own seat is locked after solo timer expiry (SC-MOVE-45). */
    isMySeatTimeExpired: (state): boolean => {
      const seat = state.seats.find((s) => s.sessionId === state.sessionId);
      return Boolean(seat && seat.timeExpired);
    },
    /**
     * Remaining turn seconds from synced turnUntil (needs wall-clock nowMs).
     * Use with page tick like reconnect grace (SC-PRESENCE-08…11).
     */
    turnRemainingSeconds:
      (state) =>
      (nowMs: number): number =>
        turnRemainingSeconds(state.turnUntil, state.turnBudgetSeconds, nowMs),
    /**
     * Own strip piece ids whose pieces are finished (SC-FINISH-09/10 / SC-PIECE-09).
     * Empty when not seated.
     */
    myFinishedStripPieceIds: (state): string[] => {
      const seat = state.seats.find((s) => s.sessionId === state.sessionId);
      if (!seat) {
        return [];
      }
      return seat.pieces.filter((p) => p.finished).map((p) => p.pieceId);
    },
    /** True when this client is the peeker of the open shared session. */
    isPeekOwner: (state): boolean =>
      Boolean(state.openPeek && state.sessionId && state.openPeek.sessionId === state.sessionId),
    /**
     * End-turn retired (SC-PRESENCE-55 / D3) — always false; server rejects `endTurn`.
     */
    canSendEndTurn: (): boolean => false,
  },

  actions: {
    /** HTTP fallback listing — unused by LobbyPage (live LobbyRoom subscribe). */
    async refreshRooms() {
      this.listing = true;
      this.error = null;

      try {
        // Requires a server route like GET /rooms/:roomName (getAvailableRooms was removed in 0.16+)
        const { data } = await client.http.get(`/rooms/${TOURIST_ROOM}`);
        this.rooms = (data ?? []) as RoomAvailable<GameRoomMeta>[];
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e);
        this.rooms = [];
      } finally {
        this.listing = false;
      }
    },

    async subscribeLobby() {
      await this.unsubscribeLobby();
      this.lobbyWanted = true;
      this.listing = true;
      // SC-LOBBY-20 / D3: drop stale list; stay loading until fresh `rooms` snapshot.
      this.rooms = [];
      this.error = null;

      try {
        this._attachLobbyRoom(await this._joinLobbyRoom());
        // listing cleared in onMessage('rooms') — not here.
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (isLobbyReconnectNoise(msg)) {
          // Entry hit reconnect noise — one quiet retry before SC-LOBBY-07 surface.
          try {
            this._attachLobbyRoom(await this._joinLobbyRoom());
            return;
          } catch (e2) {
            const msg2 = e2 instanceof Error ? e2.message : String(e2);
            if (!isLobbyReconnectNoise(msg2)) {
              this.error = msg2;
            } else {
              // Still only noise — do not put reservation/reconnect text in listing error.
              this.error = 'Список комнат недоступен';
            }
            this.rooms = [];
            this.lobbyRoom = null;
          }
        } else {
          // SC-LOBBY-07: real primary subscribe fail.
          this.error = msg;
          this.rooms = [];
          this.lobbyRoom = null;
        }
        this.listing = false;
      }
    },

    async unsubscribeLobby() {
      // Sync teardown before any await (SC-LOBBY-37): hung leave must not keep
      // lobby as the active subscription. leaveGame / subscribeLobby may await
      // this bounded race; _enterRoom must not await it to completion.
      this.lobbyWanted = false;
      // SC-LOBBY-20: clear before leave/resubscribe so remount never flashes stale rows.
      this.rooms = [];
      const lobby = this.lobbyRoom;
      this.lobbyRoom = null;

      if (lobby) {
        try {
          // .catch on leave: if timeout wins the race, a later leave reject
          // must not become an unhandled rejection (intentional swallow).
          await Promise.race([
            lobby.leave().catch(() => undefined),
            new Promise<void>((resolve) => {
              setTimeout(resolve, LOBBY_LEAVE_TIMEOUT_MS);
            }),
          ]);
        } catch {
          // lobby may already be closed
        }
      }
    },

    async createGame(options: CreateGameOptions) {
      return this._enterRoom(() => client.create(TOURIST_ROOM, options));
    },

    async joinGame(roomId?: string, options: Record<string, unknown> = {}) {
      if (roomId) {
        return this._enterRoom(() => client.joinById(roomId, options));
      }
      return this._enterRoom(() => client.joinOrCreate(TOURIST_ROOM, options));
    },

    /**
     * Game mount rejoin (D3): prefer localStorage reconnectionToken, then joinById.
     * Missing/invalid token = fresh join (SC-PIECE-18). Cross-tab steal OK.
     */
    async rejoinGame(roomId: string, options: Record<string, unknown> = {}) {
      const saved = loadTouristReconnect();
      if (saved && saved.roomId === roomId) {
        try {
          return await this._enterRoom(() => client.reconnect(saved.token));
        } catch {
          // grace expired / token invalid — clear stale, then fresh joinById
          clearTouristReconnect();
        }
      }
      return this._enterRoom(() => client.joinById(roomId, options));
    },

    async leaveGame() {
      // Gate GamePage soft-drop rejoin while room is cleared (App header leave).
      // Flag must not stay true after leave — unlike the old page-local ref, store
      // state survives remount and would block browser-back / deep-link rejoin.
      this.consentedLeaving = true;
      try {
        // Consented leave: clear tourist reconnect token (D3).
        clearTouristReconnect();
        // logout / leave screen: drop lobby subscription with any session reset
        await this.unsubscribeLobby();

        const room = this.room;
        this._resetRoomState();

        if (room) {
          try {
            await room.leave();
          } catch {
            // room may already be closed
          }
        }
      } finally {
        // Soft-drop watch already saw room→null with the flag set (sync).
        this.consentedLeaving = false;
      }
    },

    /**
     * Submit a one-step tourist move. Only via store — pages must not room.send.
     * One board action per turn (D3 / SC-MOVE-110); no steps budget.
     * Server rejects if not seated / not current turn / not playing / already spent / illegal.
     * @returns true if the message was sent (room present, playing, and isMyTurn).
     */
    sendMove(pieceId: string, row: number, col: number): boolean {
      if (
        !this.room ||
        this.phase !== 'playing' ||
        !this.isMyTurn ||
        this.isMySeatFinished ||
        this.isMySeatTimeExpired ||
        typeof pieceId !== 'string' ||
        pieceId.length === 0
      ) {
        return false;
      }
      this.room.send('move', { pieceId, row, col });
      return true;
    },

    /**
     * Rescue own trapped piece with an adjacent free own piece (free before board action — D3).
     * Server rejects if not own turn / no adj rescuer / boardActionUsed / not trapped.
     * @returns true if the message was sent.
     */
    sendRescue(pieceId: string): boolean {
      if (
        !this.room ||
        this.phase !== 'playing' ||
        !this.isMyTurn ||
        this.isMySeatFinished ||
        this.isMySeatTimeExpired ||
        typeof pieceId !== 'string' ||
        pieceId.length === 0
      ) {
        return false;
      }
      this.room.send('rescue', { pieceId });
      return true;
    },

    /**
     * Push retired (D3 / SC-MOVE-114) — always no-op; do not send.
     * @returns false always.
     */
    sendPush(
      pusherPieceId: string,
      targetSessionId: string,
      targetPieceId: string,
      row: number,
      col: number,
    ): boolean {
      void pusherPieceId;
      void targetSessionId;
      void targetPieceId;
      void row;
      void col;
      return false;
    },

    /**
     * Return a finished own piece onto a legal center-ring cell (one board action — D3).
     * Server rejects illegal ring / occupancy / hole / finishPlace ≠ 0 / already spent.
     * @returns true if the message was sent.
     */
    sendReturnFromFinish(pieceId: string, row: number, col: number): boolean {
      if (
        !this.room ||
        this.phase !== 'playing' ||
        !this.isMyTurn ||
        this.isMySeatFinished ||
        this.isMySeatTimeExpired ||
        typeof pieceId !== 'string' ||
        pieceId.length === 0
      ) {
        return false;
      }
      this.room.send('returnFromFinish', { pieceId, row, col });
      return true;
    },

    /**
     * Client `peek` retired — open-on-land opens the shared modal (D4 / SC-BOARD-84).
     * Do not send; use peekPlace / peekSubmit after land-opened session.
     * @returns false always.
     */
    sendPeek(pieceId: string): boolean {
      void pieceId;
      return false;
    },

    /**
     * Place (or clear) an answer chip into a peek slot — peeker only (SC-BOARD-46).
     * @returns true if the message was sent.
     */
    sendPeekPlace(slotIndex: number, answerCardId: string | null): boolean {
      if (
        !this.room ||
        !this.openPeek ||
        !this.isPeekOwner ||
        typeof slotIndex !== 'number' ||
        !Number.isInteger(slotIndex) ||
        slotIndex < 0
      ) {
        return false;
      }
      this.room.send('peekPlace', {
        slotIndex,
        answerCardId: answerCardId ?? '',
      });
      return true;
    },

    /**
     * Submit ordered slot placements for the open peek — peeker only (SC-BOARD-43/44).
     * Server validates order; clears session via peekClose. Do not clear openPeek locally.
     * @returns true if the message was sent.
     */
    sendPeekSubmit(): boolean {
      if (!this.room || !this.openPeek || !this.isPeekOwner) {
        return false;
      }
      this.room.send('peekSubmit', {});
      return true;
    },

    /**
     * End-turn retired (SC-PRESENCE-55) — always no-op; do not send.
     * @returns false always.
     */
    sendEndTurn(): boolean {
      return false;
    },

    /**
     * Submit a whitelist preset say (D3). Only via store — pages must not room.send.
     * Seated + connected only; client UX respects max SAY_MAX_LIVE live by `at`.
     * Manual picker uses hello|luck; ready arrives via sendReady broadcast.
     * @returns true if the message was sent.
     */
    sendSay(presetId: SayPresetId): boolean {
      if (!this.room || !SAY_PRESETS.has(presetId) || presetId === 'ready') {
        return false;
      }
      const seat = this.seats.find((s) => s.sessionId === this.sessionId);
      if (!seat || !seat.connected) {
        return false;
      }
      const now = Date.now();
      this._pruneSayEvents(now);
      const live = this.sayEvents.filter((e) => e.sessionId === this.sessionId).length;
      if (live >= SAY_MAX_LIVE) {
        return false;
      }
      this.room.send('say', { presetId });
      return true;
    },

    /**
     * One-shot ready-to-start (game/start). Only via store — pages must not room.send.
     * Server marks seat.ready + broadcasts say preset `ready`.
     * @returns true if the message was sent.
     */
    sendReady(): boolean {
      if (!this.room || !this.canSendReady) {
        return false;
      }
      this.room.send('ready');
      return true;
    },

    /**
     * Detach a prior tourist room without touching the lobby subscription.
     * Lobby stays live until enter succeeds (SC-LOBBY-01 / SC-LOBBY-05).
     * Consented leave of a live prior tourist → clear reconnect token.
     */
    async _leaveTouristRoom() {
      const room = this.room;
      this.room = null;
      this.roomId = null;
      this.sessionId = null;
      this.started = false;
      this.phase = 'waiting';
      this.maxSeats = 2;
      this.countdownRemaining = 0;
      this.currentTurnSessionId = '';
      this.turnUntil = 0;
      this.turnBudgetSeconds = 0;
      this.seats = [];
      this.removedTaskKeys = [];
      this.holdingGrilleKeys = [];
      this.revealingCatapultKeys = [];
      this.brokenCatapultKeys = [];
      this.grid = '';
      this.touristsPerPlayer = 4;
      this.packTitle = '';
      this.flippedCells = [];
      this.answerCards = [];
      this.knowledgeDelivered = 0;
      this.knowledgePieces = {};
      this.knowledgeOutcome = null;
      this.knowledgeSynced = false;
      this.openPeek = null;
      this._clearPeekStatusFlash();
      this.allJailWarning = false;
      this.sayEvents = [];

      if (room) {
        clearTouristReconnect();
        try {
          await room.leave();
        } catch {
          // room may already be closed
        }
      }
    },

    async _enterRoom(connect: () => Promise<Room>) {
      this.status = 'connecting';
      this.error = null;

      try {
        // Keep lobby WS during the attempt so a failed enter leaves the list live.
        // Unsubscribe only after tourist connect succeeds (SC-LOBBY-05 / design D2).
        await this._leaveTouristRoom();
        const room = await connect();
        // Attach BEFORE initiating lobby leave: JOIN ack → ROOM_STATE can arrive
        // during any await gap; without a listener seats stay empty on Game forever.
        this._attachRoom(room);
        // SC-LOBBY-05/37 (D1): initiate unsubscribe (sync clear runs before first
        // await inside); do not await leave completion — create/join UX must not hang.
        void this.unsubscribeLobby();
        return room;
      } catch (e) {
        this.status = 'idle';
        this.error = e instanceof Error ? e.message : String(e);
        throw e;
      }
    },

    async _joinLobbyRoom() {
      const lobby = await client.joinOrCreate(LOBBY_ROOM, {
        filter: { name: TOURIST_ROOM },
      });
      // D7: no SDK auto-reconnect / seat-reservation churn for listing.
      lobby.reconnection.enabled = false;
      return lobby;
    },

    _attachLobbyRoom(lobby: Room) {
      this.lobbyRoom = lobby;

      lobby.onMessage('rooms', (rooms: RoomAvailable<GameRoomMeta>[]) => {
        this.rooms = rooms ?? [];
        // SC-LOBBY-20 / D3: first (or refreshed) snapshot ends listing spinner.
        this.listing = false;
      });

      lobby.onMessage('+', ([roomId, room]: [string, RoomAvailable<GameRoomMeta>]) => {
        const idx = this.rooms.findIndex((r) => r.roomId === roomId);
        if (idx === -1) {
          this.rooms.push(room);
        } else {
          this.rooms.splice(idx, 1, room);
        }
      });

      lobby.onMessage('-', (roomId: string) => {
        this.rooms = this.rooms.filter((r) => r.roomId !== roomId);
      });

      lobby.onError((_code, message) => {
        const msg = message || 'Lobby error';
        // SC-LOBBY-08: do not surface reservation / reconnect noise as listing error.
        if (isLobbyReconnectNoise(msg)) {
          return;
        }
        this.error = msg;
      });

      lobby.onLeave(() => {
        if (this.lobbyRoom === lobby) {
          this.lobbyRoom = null;
        }
        // D7 / SC-LOBBY-08: quiet resubscribe while Lobby still wants listing.
        if (this.lobbyWanted) {
          void this._quietResubscribeLobby();
        }
      });
    },

    /** Drop → clear + resubscribe without treating reconnect noise as SC-LOBBY-07. */
    async _quietResubscribeLobby() {
      if (!this.lobbyWanted || this.lobbyRoom) {
        return;
      }

      // SC-LOBBY-20: do not keep prior snapshot visible across resubscribe.
      this.rooms = [];
      this.listing = true;

      try {
        const lobby = await this._joinLobbyRoom();
        if (!this.lobbyWanted) {
          try {
            await lobby.leave();
          } catch {
            // already closed
          }
          this.listing = false;
          return;
        }
        this._attachLobbyRoom(lobby);
        // listing cleared in onMessage('rooms').
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (isLobbyReconnectNoise(msg)) {
          // Transient reconnect noise — empty-safe until remount / next drop.
          this.listing = false;
          return;
        }
        // SC-LOBBY-07: listing remains unavailable after quiet attempt.
        this.error = msg;
        this.rooms = [];
        this.lobbyRoom = null;
        this.listing = false;
      }
    },

    _mirrorRoomState(room: Room, state: unknown) {
      const s = state as TouristRoomState;

      this.sessionId = room.sessionId;
      this.phase = parsePhase(s.phase);
      // Phase-first: started mirrors playing (legacy field may still exist on server).
      this.started = this.phase === 'playing';
      const maxRaw = Number(s.maxSeats);
      this.maxSeats = Number.isInteger(maxRaw) && maxRaw >= 1 && maxRaw <= 4 ? maxRaw : 2;
      const cd = Number(s.countdownRemaining ?? 0);
      this.countdownRemaining = Number.isFinite(cd) && cd > 0 ? Math.floor(cd) : 0;
      this.currentTurnSessionId =
        typeof s.currentTurnSessionId === 'string' ? s.currentTurnSessionId : '';
      const turnUntilRaw = Number(s.turnUntil ?? 0);
      this.turnUntil = Number.isFinite(turnUntilRaw) && turnUntilRaw > 0 ? turnUntilRaw : 0;
      const budgetRaw = Number(s.turnBudgetSeconds ?? 0);
      // Multi and solo both use 60s (SC-PRESENCE-09 / SC-MOVE-29); accept any positive.
      this.turnBudgetSeconds =
        budgetRaw === 60 ? budgetRaw : budgetRaw > 0 ? Math.floor(budgetRaw) : 0;

      const next: GameSeat[] = [];
      s.seats?.forEach((seat, sessionId) => {
        const pieces: GamePiece[] = [];
        seat.pieces?.forEach((piece, pieceIdKey) => {
          const remainingRaw = Number(piece.remainingTurns ?? 0);
          pieces.push({
            pieceId: String(pieceIdKey),
            row: Number(piece.row),
            col: Number(piece.col),
            finished: Boolean(piece.finished),
            trapped: Boolean(piece.trapped),
            remainingTurns:
              Number.isFinite(remainingRaw) && remainingRaw > 0 ? Math.floor(remainingRaw) : 0,
          });
        });
        pieces.sort((a, b) => Number(a.pieceId) - Number(b.pieceId));
        next.push({
          sessionId,
          touristId: Number(seat.touristId),
          pieces,
          connected: seat.connected !== false,
          reconnectUntil: Number(seat.reconnectUntil ?? 0),
          ready: Boolean(seat.ready),
          finishPlace: Number(seat.finishPlace ?? 0) || 0,
          timeExpired: Boolean(seat.timeExpired),
          isBot: Boolean(seat.isBot),
        });
      });

      const removed: string[] = [];
      s.removedTaskKeys?.forEach((key) => {
        removed.push(String(key));
      });

      const holding: string[] = [];
      s.holdingGrilleKeys?.forEach((key) => {
        holding.push(String(key));
      });

      const revealingCatapult: string[] = [];
      s.revealingCatapultKeys?.forEach((key) => {
        revealingCatapult.push(String(key));
      });

      const brokenCatapult: string[] = [];
      s.brokenCatapultKeys?.forEach((key) => {
        brokenCatapult.push(String(key));
      });

      const flipped: FlippedCellView[] = [];
      s.flippedCells?.forEach((cell, key) => {
        const difficulty = Number(cell.difficulty);
        if (difficulty !== 1 && difficulty !== 2 && difficulty !== 3) {
          return;
        }
        flipped.push({
          key: String(key),
          taskId: typeof cell.taskId === 'string' ? cell.taskId : '',
          difficulty,
        });
      });

      const answers: AnswerCardView[] = [];
      s.answerCards?.forEach((card) => {
        if (typeof card.id !== 'string' || card.id.length === 0) {
          return;
        }
        answers.push({
          id: card.id,
          content: typeof card.content === 'string' ? card.content : '',
          description: typeof card.description === 'string' ? card.description : '',
        });
      });

      const grid = typeof s.grid === 'string' ? s.grid : '';
      const touristsRaw = Number(s.touristsPerPlayer ?? 4);
      const touristsPerPlayer = touristsRaw >= 1 && touristsRaw <= 4 ? Math.floor(touristsRaw) : 4;
      const packTitle = typeof s.packTitle === 'string' ? s.packTitle : '';

      // Shared peek session from schema (everyone sees modal + placements).
      let openPeek: OpenPeek | null = this.openPeek;
      if (s.peekActive) {
        const difficulty = Number(s.peekDifficulty ?? 0);
        const reward = difficulty === 1 || difficulty === 2 || difficulty === 3 ? difficulty : null;
        const placements: string[] = [];
        s.peekPlacements?.forEach((id) => {
          placements.push(typeof id === 'string' ? id : '');
        });
        if (
          reward &&
          typeof s.peekSessionId === 'string' &&
          s.peekSessionId.length > 0 &&
          typeof s.peekPieceId === 'string'
        ) {
          openPeek = {
            sessionId: s.peekSessionId,
            pieceId: s.peekPieceId,
            row: Math.floor(Number(s.peekRow ?? 0)),
            col: Math.floor(Number(s.peekCol ?? 0)),
            taskId: typeof s.peekTaskId === 'string' ? s.peekTaskId : '',
            question: typeof s.peekQuestion === 'string' ? s.peekQuestion : '',
            difficulty: reward,
            reward,
            placements,
          };
        }
      } else if (!s.peekActive) {
        openPeek = null;
      }

      // D13: atomic seats + catapult reveal so board watchers never see
      // "pieces already at fling dest" with empty revealingCatapultKeys mid-tick.
      this.$patch({
        seats: next,
        removedTaskKeys: removed,
        holdingGrilleKeys: holding,
        revealingCatapultKeys: revealingCatapult,
        brokenCatapultKeys: brokenCatapult,
        grid,
        touristsPerPlayer,
        packTitle,
        flippedCells: flipped,
        answerCards: answers,
        openPeek,
      });

      // Status from phase (countdown stays waiting for lobby-style label).
      this.status = this.phase === 'playing' ? 'playing' : 'waiting';

      // Keep localStorage token fresh after soft reconnect (token may rotate).
      saveTouristReconnect(room);
    },

    _attachRoom(room: Room) {
      this.consentedLeaving = false;
      this.room = room;
      this.roomId = room.roomId;
      this.sessionId = room.sessionId;
      this.status = 'waiting';
      this.sayEvents = [];
      this.removedTaskKeys = [];
      this.holdingGrilleKeys = [];
      this.revealingCatapultKeys = [];
      this.brokenCatapultKeys = [];
      this.grid = '';
      this.touristsPerPlayer = 4;
      this.packTitle = '';
      this.flippedCells = [];
      this.answerCards = [];
      this.knowledgeDelivered = 0;
      this.knowledgePieces = {};
      this.knowledgeOutcome = null;
      this.knowledgeSynced = false;
      this.openPeek = null;
      this._clearPeekStatusFlash();
      this.allJailWarning = false;

      // D3: persist tourist reconnection token only (never lobby).
      saveTouristReconnect(room);

      room.onStateChange((state) => {
        this._mirrorRoomState(room, state);
      });

      // If full state already landed (rare), mirror once; otherwise onStateChange.
      if (room.state) {
        this._mirrorRoomState(room, room.state);
      }

      room.onMessage('say', (message: unknown) => {
        this._onSayMessage(message);
      });

      room.onMessage('knowledge', (message: unknown) => {
        this._onKnowledgeMessage(message);
      });

      // Hard-cut: ignore legacy `budgets` from mid-rollout peers (D2).
      room.onMessage('budgets', (_message: unknown) => {
        void _message;
      });

      room.onMessage('peekOpen', (message: unknown) => {
        this._onPeekOpenMessage(message);
      });

      room.onMessage('peekPlace', (message: unknown) => {
        this._onPeekPlaceMessage(message);
      });

      room.onMessage('peekClose', (message: unknown) => {
        this._onPeekCloseMessage(message);
      });

      // Inert: all-jail no longer teleports / warns (SC-MOVE-119 / block 8.8).
      room.onMessage('allJailWarning', () => {
        this.allJailWarning = false;
      });

      // Room-wide all-jail skip toast for every client (D7 / SC-PRESENCE-57).
      room.onMessage('allJailSkip', () => {
        this._onAllJailSkipMessage();
      });

      room.onError((_code, message) => {
        this.error = message || 'Room error';
      });

      room.onLeave(() => {
        // Unexpected drop: keep localStorage token for F5 / remount / browser reopen (D3).
        this._resetRoomState();
      });
    },

    _pruneSayEvents(now = Date.now()) {
      this.sayEvents = this.sayEvents.filter((e) => now - e.at < SAY_TTL_MS);
    },

    /** Private knowledge for strip TR badges + avatar counter (D2 / D9). */
    _onKnowledgeMessage(message: unknown) {
      if (!message || typeof message !== 'object') {
        return;
      }
      const raw = message as Record<string, unknown>;
      const delivered = Number(raw.delivered);
      this.knowledgeDelivered =
        Number.isFinite(delivered) && delivered >= 0 ? Math.floor(delivered) : 0;
      const piecesRaw = raw.pieces;
      const pieces: Record<string, number> = {};
      if (piecesRaw && typeof piecesRaw === 'object' && !Array.isArray(piecesRaw)) {
        for (const [pieceId, value] of Object.entries(piecesRaw as Record<string, unknown>)) {
          const n = Number(value);
          if (Number.isFinite(n) && n > 0) {
            pieces[pieceId] = Math.floor(n);
          }
        }
      }
      this.knowledgePieces = pieces;
      // Finish/cut outcome for modal copy (SC-FINISH-31/32/34); keep prior when omitted.
      if (raw.outcome === 'finish' || raw.outcome === 'cut') {
        this.knowledgeOutcome = raw.outcome;
      }
      // Mark synced after applying payload so remount baseline is not a grant (SC-PRESENCE-51).
      this.knowledgeSynced = true;
    },

    _onPeekOpenMessage(message: unknown) {
      if (!message || typeof message !== 'object') {
        return;
      }
      const raw = message as Record<string, unknown>;
      const pieceId = raw.pieceId;
      const sessionId = raw.sessionId;
      const row = Number(raw.row);
      const col = Number(raw.col);
      const difficulty = Number(raw.difficulty ?? raw.reward);
      const question = typeof raw.question === 'string' ? raw.question : '';
      const taskId = typeof raw.taskId === 'string' ? raw.taskId : '';
      const placementsRaw = raw.placements;
      const placements: string[] = [];
      if (Array.isArray(placementsRaw)) {
        for (const id of placementsRaw) {
          placements.push(typeof id === 'string' ? id : '');
        }
      }
      if (
        typeof pieceId !== 'string' ||
        pieceId.length === 0 ||
        typeof sessionId !== 'string' ||
        sessionId.length === 0 ||
        !Number.isFinite(row) ||
        !Number.isFinite(col) ||
        (difficulty !== 1 && difficulty !== 2 && difficulty !== 3)
      ) {
        return;
      }
      this.openPeek = {
        sessionId,
        pieceId,
        row: Math.floor(row),
        col: Math.floor(col),
        taskId,
        question,
        difficulty,
        reward: difficulty,
        placements,
      };
    },

    _onPeekPlaceMessage(message: unknown) {
      if (!message || typeof message !== 'object' || !this.openPeek) {
        return;
      }
      const raw = message as Record<string, unknown>;
      const slotIndex = raw.slotIndex;
      if (typeof slotIndex !== 'number' || !Number.isInteger(slotIndex) || slotIndex < 0) {
        return;
      }
      let answerCardId = '';
      if (typeof raw.answerCardId === 'string') {
        answerCardId = raw.answerCardId;
      }
      const next = [...this.openPeek.placements];
      while (next.length <= slotIndex) {
        next.push('');
      }
      next[slotIndex] = answerCardId;
      this.openPeek = { ...this.openPeek, placements: next };
    },

    _clearPeekStatusFlashTimer() {
      if (peekStatusFlashTimer !== null) {
        clearTimeout(peekStatusFlashTimer);
        peekStatusFlashTimer = null;
      }
    },

    _clearPeekStatusFlash() {
      this._clearPeekStatusFlashTimer();
      this.peekStatusFlash = null;
    },

    /**
     * Room-wide all-jail turn skip → top-center Notify for every client
     * (SC-PRESENCE-57 / D7). Never opens the retired start-reset modal.
     */
    _onAllJailSkipMessage() {
      this.allJailWarning = false;
      Notify.create({
        message: enUS.game.allJailSkipToast,
        position: 'top',
        timeout: 2500,
        group: 'all-jail-skip',
        color: 'warning',
        textColor: 'white',
      });
    },

    /**
     * Room-wide peek outcome → header flash 10s + top-center Notify toast
     * (SC-PRESENCE-36 / SC-BOARD-88 / D9). Header alone is not enough.
     * Overwrites any in-flight flash and restarts the timer.
     */
    _setPeekStatusFlash(kind: PeekStatusFlashKind) {
      this._clearPeekStatusFlashTimer();
      const until = Date.now() + PEEK_STATUS_FLASH_MS;
      this.peekStatusFlash = { kind, until };
      peekStatusFlashTimer = setTimeout(() => {
        peekStatusFlashTimer = null;
        if (this.peekStatusFlash?.until === until) {
          this.peekStatusFlash = null;
        }
      }, PEEK_STATUS_FLASH_MS);
      Notify.create({
        message: enUS.game.peekStatusFlash[kind],
        position: 'top',
        timeout: 2500,
        group: 'peek-outcome',
        color: kind === 'correct' ? 'positive' : kind === 'wrong' ? 'negative' : 'warning',
        textColor: 'white',
      });
    },

    /**
     * Clear shared peek; set header flash from `correct` + `reason` (SC-PRESENCE-36).
     * Legacy `correct:false` without reason → no flash (timeout needs explicit reason).
     */
    _onPeekCloseMessage(message?: unknown) {
      this.openPeek = null;
      if (!message || typeof message !== 'object') {
        return;
      }
      const raw = message as Record<string, unknown>;
      if (raw.correct === true) {
        this._setPeekStatusFlash('correct');
        return;
      }
      if (raw.correct !== false) {
        return;
      }
      if (raw.reason === 'timeout') {
        this._setPeekStatusFlash('timeout');
      } else if (raw.reason === 'wrong') {
        this._setPeekStatusFlash('wrong');
      }
    },

    _onSayMessage(message: unknown) {
      if (!message || typeof message !== 'object') {
        return;
      }
      const raw = message as Record<string, unknown>;
      const sessionId = raw.sessionId;
      const presetId = raw.presetId;
      const at = raw.at;
      if (
        typeof sessionId !== 'string' ||
        typeof presetId !== 'string' ||
        !SAY_PRESETS.has(presetId) ||
        typeof at !== 'number' ||
        !Number.isFinite(at)
      ) {
        return;
      }
      const now = Date.now();
      this._pruneSayEvents(now);
      const forSession = this.sayEvents.filter((e) => e.sessionId === sessionId);
      if (forSession.length >= SAY_MAX_LIVE) {
        const oldestAt = Math.min(...forSession.map((e) => e.at));
        this.sayEvents = this.sayEvents.filter(
          (e) => !(e.sessionId === sessionId && e.at === oldestAt),
        );
      }
      this.sayEvents.push({
        sessionId,
        presetId: presetId as SayPresetId,
        at,
      });
    },

    _resetRoomState() {
      this.room = null;
      this.roomId = null;
      this.sessionId = null;
      this.started = false;
      this.phase = 'waiting';
      this.maxSeats = 2;
      this.countdownRemaining = 0;
      this.currentTurnSessionId = '';
      this.turnUntil = 0;
      this.turnBudgetSeconds = 0;
      this.seats = [];
      this.removedTaskKeys = [];
      this.holdingGrilleKeys = [];
      this.revealingCatapultKeys = [];
      this.brokenCatapultKeys = [];
      this.grid = '';
      this.touristsPerPlayer = 4;
      this.packTitle = '';
      this.flippedCells = [];
      this.answerCards = [];
      this.knowledgeDelivered = 0;
      this.knowledgePieces = {};
      this.knowledgeOutcome = null;
      this.knowledgeSynced = false;
      this.openPeek = null;
      this._clearPeekStatusFlash();
      this.allJailWarning = false;
      this.sayEvents = [];
      this.status = 'idle';
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useGameStore, import.meta.hot));
}
