import { defineStore, acceptHMRUpdate } from 'pinia';
import type { Room, RoomAvailable } from '@colyseus/sdk';

import { client } from '@/boot/colyseus';

/** Room name registered on the Colyseus server. */
export const TOURIST_ROOM = 'tourist';

/** Built-in Colyseus LobbyRoom name. */
export const LOBBY_ROOM = 'lobby';

/** localStorage key for tourist reconnection (D3) — never used for lobby. */
const TOURIST_RECONNECT_KEY = 'ht-tourist-reconnect';

export interface GameRoomMeta {
  title?: string;
  status?: 'waiting' | 'playing' | 'finished';
  /** Occupied seated count from room metadata (not clients). */
  seats?: number;
  /** Max seated players from room metadata (not maxClients). */
  maxSeats?: number;
  [key: string]: unknown;
}

/** Allowed maxSeats values for tourist room create (D4). */
export type CreateGameMaxSeats = 2 | 3 | 4;

/** Create option grille density presets (D1 / SC-LOBBY-13…15). */
export type CreateGameGrilleDensity = 'few' | 'medium' | 'many';

export interface CreateGameOptions {
  maxSeats?: CreateGameMaxSeats;
  /** few/medium/many → 25/45/65% of task cells; default medium on server. */
  grilleDensity?: CreateGameGrilleDensity;
}

/** Mirrored piece from synced Seat.pieces (keyed by side N|E|S|W on server). */
export interface GamePiece {
  side: string;
  row: number;
  col: number;
  /** Synced finish flag — finished pieces leave board occupancy (game/finish). */
  finished: boolean;
  /** Synced trap flag — piece held by a revealed grille (game/move). */
  trapped: boolean;
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
}

/** Flat unfinished piece for board overlay (SC-PIECE-09 / SC-FINISH-01). */
export interface UnfinishedBoardPiece {
  sessionId: string;
  touristId: number;
  side: string;
  row: number;
  col: number;
  /** Synced trap flag — piece held by a revealed grille (SC-PIECE-24/27). */
  trapped: boolean;
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

/** Solo five-minute budget is active (turnBudgetSeconds === 300). */
export function isSoloBudgetSeconds(turnBudgetSeconds: number): boolean {
  return turnBudgetSeconds === 300;
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

/** Private step/peek budgets from room `budgets` message (owner-only). */
export interface SeatBudgets {
  steps: number;
  peeks: number;
  infinite: boolean;
  /** Multi one-peek-per-turn; restored on reconnect. */
  peekedThisTurn?: boolean;
}

/** Open peek modal payload from room `peekOpen` (owner-only). */
export interface OpenPeek {
  side: string;
  row: number;
  col: number;
  reward: 1 | 2 | 3;
}

/** Live say bubble lifetime (ms) — mirrors server SAY_TTL_MS. */
export const SAY_TTL_MS = 10_000;

/** Max concurrent live says per session — mirrors server SAY_MAX_LIVE. */
export const SAY_MAX_LIVE = 3;

const SAY_PRESETS: ReadonlySet<string> = new Set(['hello', 'luck', 'ready']);

type GameStatus = 'idle' | 'connecting' | 'waiting' | 'playing' | 'finished';

type PieceSync = {
  side: string;
  row: number;
  col: number;
  finished?: boolean;
  trapped?: boolean;
};

type SeatSync = {
  touristId: number;
  connected?: boolean;
  reconnectUntil?: number;
  ready?: boolean;
  finishPlace?: number;
  timeExpired?: boolean;
  pieces?: {
    forEach: (cb: (piece: PieceSync, side: string) => void) => void;
  };
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
  /** Active turn budget seconds (60 multi / 300 solo); 0 when none. */
  turnBudgetSeconds?: number;
  /** Synced removed task cell keys `"r,c"` (holes: not landable; stand OK). */
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
    /** Active turn budget in seconds (60 multi / 300 solo); `0` when none. */
    turnBudgetSeconds: number;
    seats: GameSeat[];
    /**
     * Synced removed task cell keys `"r,c"` (visual holes; not landable).
     * Mirrored from MyRoomState.removedTaskKeys. Piece may stand on a hole.
     */
    removedTaskKeys: string[];
    /**
     * Synced revealed grille cells currently holding a trapped piece (`"r,c"`).
     * Mirrored from MyRoomState.holdingGrilleKeys (hidden grilles never sync).
     */
    holdingGrilleKeys: string[];
    /** Own private steps budget from `budgets` (always finite; 0 for spectators / unset). */
    steps: number;
    /** Own private peeks budget from `budgets` (0 for spectators / unset). */
    peeks: number;
    /**
     * Solo peeks∞ flag from `budgets.infinite` — does **not** make steps infinite
     * (SC-PRESENCE-16 / SC-MOVE-40).
     */
    budgetsInfinite: boolean;
    /**
     * Legacy mirror of `budgets.peekedThisTurn` (server no longer gates peeks).
     * Kept for payload/reconnect parity; GamePage does not gate the eye on it.
     */
    peekedThisTurn: boolean;
    /**
     * Open peek modal for this client (`peekOpen`); null when none.
     * Cleared on answer / room reset (page shows modal in block 3).
     */
    openPeek: OpenPeek | null;
    /**
     * Private all-jail warning for this seat only (`allJailWarning`).
     * Page shows informational modal; clear via `clearAllJailWarning` (SC-MOVE-63).
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
    steps: 0,
    peeks: 0,
    budgetsInfinite: false,
    peekedThisTurn: false,
    openPeek: null,
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
            side: piece.side,
            row: piece.row,
            col: piece.col,
            trapped: piece.trapped,
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
    /** Solo five-minute budget is active (SC-PRESENCE-09 / SC-MOVE-29). */
    isSoloBudget: (state): boolean => isSoloBudgetSeconds(state.turnBudgetSeconds),
    /** Own seat is locked after solo timer or steps exhaustion (SC-MOVE-45/48). */
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
     * Own strip sides whose pieces are finished (SC-FINISH-09/10 / SC-PIECE-09).
     * Empty when not seated.
     */
    myFinishedStripSides: (state): string[] => {
      const seat = state.seats.find((s) => s.sessionId === state.sessionId);
      if (!seat) {
        return [];
      }
      return seat.pieces.filter((p) => p.finished).map((p) => p.side);
    },
    /**
     * Multiplayer end-turn is available: own turn, not solo peeks∞, not finished/expired.
     * Solo peeks∞ hides end-turn (SC-MOVE-41 / SC-PRESENCE-18).
     */
    canSendEndTurn: (state): boolean => {
      if (
        state.phase !== 'playing' ||
        !state.sessionId ||
        !state.currentTurnSessionId ||
        state.sessionId !== state.currentTurnSessionId ||
        state.budgetsInfinite
      ) {
        return false;
      }
      const seat = state.seats.find((s) => s.sessionId === state.sessionId);
      return Boolean(seat && seat.finishPlace === 0 && !seat.timeExpired);
    },
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
      this.error = null;

      try {
        this._attachLobbyRoom(await this._joinLobbyRoom());
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (isLobbyReconnectNoise(msg)) {
          // Entry hit reconnect noise — one quiet retry before SC-LOBBY-07 surface.
          try {
            this._attachLobbyRoom(await this._joinLobbyRoom());
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
      } finally {
        this.listing = false;
      }
    },

    async unsubscribeLobby() {
      this.lobbyWanted = false;
      const lobby = this.lobbyRoom;
      this.lobbyRoom = null;

      if (lobby) {
        try {
          await lobby.leave();
        } catch {
          // lobby may already be closed
        }
      }
    },

    async createGame(options: CreateGameOptions = {}) {
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
     * Spends one step on the server; does **not** advance the turn (endTurn / auto / timeout).
     * Server rejects if not seated / not current turn / not playing / no steps / illegal.
     * @returns true if the message was sent (room present, playing, and isMyTurn).
     */
    sendMove(side: string, row: number, col: number): boolean {
      if (
        !this.room ||
        this.phase !== 'playing' ||
        !this.isMyTurn ||
        this.isMySeatFinished ||
        this.isMySeatTimeExpired ||
        this.steps <= 0
      ) {
        return false;
      }
      this.room.send('move', { side, row, col });
      return true;
    },

    /**
     * Rescue own trapped piece with an adjacent free own piece (−1 step).
     * Server rejects if not own turn / no adj rescuer / no steps / not trapped.
     * @returns true if the message was sent.
     */
    sendRescue(side: string): boolean {
      if (
        !this.room ||
        this.phase !== 'playing' ||
        !this.isMyTurn ||
        this.isMySeatFinished ||
        this.isMySeatTimeExpired ||
        this.steps <= 0 ||
        typeof side !== 'string' ||
        side.length === 0
      ) {
        return false;
      }
      this.room.send('rescue', { side });
      return true;
    },

    /**
     * Push an adjacent free piece through its far-side cell (−1 step).
     * Relocates the target only; pusher stays. Server validates geometry / landable.
     * @returns true if the message was sent.
     */
    sendPush(
      pusherSide: string,
      targetSessionId: string,
      targetSide: string,
      row: number,
      col: number,
    ): boolean {
      if (
        !this.room ||
        this.phase !== 'playing' ||
        !this.isMyTurn ||
        this.isMySeatFinished ||
        this.isMySeatTimeExpired ||
        this.steps <= 0 ||
        typeof pusherSide !== 'string' ||
        pusherSide.length === 0 ||
        typeof targetSessionId !== 'string' ||
        targetSessionId.length === 0 ||
        typeof targetSide !== 'string' ||
        targetSide.length === 0 ||
        typeof row !== 'number' ||
        typeof col !== 'number' ||
        !Number.isInteger(row) ||
        !Number.isInteger(col)
      ) {
        return false;
      }
      this.room.send('push', {
        pusherSide,
        targetSessionId,
        targetSide,
        row,
        col,
      });
      return true;
    },

    /**
     * Return a finished own piece onto a legal center-ring cell (−1 step).
     * Server rejects illegal ring / occupancy / hole / finishPlace ≠ 0.
     * @returns true if the message was sent.
     */
    sendReturnFromFinish(side: string, row: number, col: number): boolean {
      if (
        !this.room ||
        this.phase !== 'playing' ||
        !this.isMyTurn ||
        this.isMySeatFinished ||
        this.isMySeatTimeExpired ||
        this.steps <= 0 ||
        typeof side !== 'string' ||
        side.length === 0
      ) {
        return false;
      }
      this.room.send('returnFromFinish', { side, row, col });
      return true;
    },

    /**
     * Open a peek on own unfinished piece standing on a present task cell.
     * Finite peeks: require peeks > 0; solo peeks∞ skips that gate.
     * Server replies with private `peekOpen` (reward) or rejects silently.
     * @returns true if the message was sent.
     */
    sendPeek(side: string): boolean {
      if (
        !this.room ||
        this.phase !== 'playing' ||
        !this.isMyTurn ||
        this.isMySeatFinished ||
        this.isMySeatTimeExpired ||
        (!this.budgetsInfinite && this.peeks <= 0) ||
        typeof side !== 'string' ||
        side.length === 0
      ) {
        return false;
      }
      this.room.send('peek', { side });
      return true;
    },

    /**
     * Resolve an open peek («Правильно» / «Неправильно»). Clears local openPeek on send.
     * @returns true if the message was sent.
     */
    sendPeekAnswer(correct: boolean): boolean {
      if (!this.room || typeof correct !== 'boolean') {
        return false;
      }
      this.room.send('peekAnswer', { correct });
      this.openPeek = null;
      return true;
    },

    /**
     * End own multiplayer turn (does not move pieces). Solo peeks∞ → no-op.
     * @returns true if the message was sent.
     */
    sendEndTurn(): boolean {
      if (!this.room || !this.canSendEndTurn) {
        return false;
      }
      this.room.send('endTurn');
      return true;
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
      this.steps = 0;
      this.peeks = 0;
      this.budgetsInfinite = false;
      this.peekedThisTurn = false;
      this.openPeek = null;
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

    /** Dismiss own all-jail warning modal (informational only). */
    clearAllJailWarning() {
      this.allJailWarning = false;
    },

    async _enterRoom(connect: () => Promise<Room>) {
      this.status = 'connecting';
      this.error = null;

      try {
        // Keep lobby WS during the attempt so a failed enter leaves the list live.
        // Unsubscribe only after tourist connect succeeds (SC-LOBBY-05 / design D2).
        await this._leaveTouristRoom();
        const room = await connect();
        // Attach BEFORE lobby leave: JOIN ack → ROOM_STATE can arrive during the
        // await gap; without a listener seats stay empty on Game forever.
        this._attachRoom(room);
        await this.unsubscribeLobby();
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

      try {
        const lobby = await this._joinLobbyRoom();
        if (!this.lobbyWanted) {
          try {
            await lobby.leave();
          } catch {
            // already closed
          }
          return;
        }
        this._attachLobbyRoom(lobby);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (isLobbyReconnectNoise(msg)) {
          // Transient reconnect noise — leave list as-is; user may remount Lobby.
          return;
        }
        // SC-LOBBY-07: listing remains unavailable after quiet attempt.
        this.error = msg;
        this.rooms = [];
        this.lobbyRoom = null;
      }
    },

    _mirrorRoomState(room: Room, state: unknown) {
      const s = state as TouristRoomState;

      this.sessionId = room.sessionId;
      this.phase = parsePhase(s.phase);
      // Phase-first: started mirrors playing (legacy field may still exist on server).
      this.started = this.phase === 'playing';
      const maxRaw = Number(s.maxSeats);
      this.maxSeats = maxRaw === 2 || maxRaw === 3 || maxRaw === 4 ? maxRaw : 2;
      const cd = Number(s.countdownRemaining ?? 0);
      this.countdownRemaining = Number.isFinite(cd) && cd > 0 ? Math.floor(cd) : 0;
      this.currentTurnSessionId =
        typeof s.currentTurnSessionId === 'string' ? s.currentTurnSessionId : '';
      const turnUntilRaw = Number(s.turnUntil ?? 0);
      this.turnUntil = Number.isFinite(turnUntilRaw) && turnUntilRaw > 0 ? turnUntilRaw : 0;
      const budgetRaw = Number(s.turnBudgetSeconds ?? 0);
      this.turnBudgetSeconds =
        budgetRaw === 60 || budgetRaw === 300
          ? budgetRaw
          : budgetRaw > 0
            ? Math.floor(budgetRaw)
            : 0;

      const next: GameSeat[] = [];
      s.seats?.forEach((seat, sessionId) => {
        const pieces: GamePiece[] = [];
        seat.pieces?.forEach((piece, sideKey) => {
          pieces.push({
            side: String(piece.side || sideKey),
            row: Number(piece.row),
            col: Number(piece.col),
            finished: Boolean(piece.finished),
            trapped: Boolean(piece.trapped),
          });
        });
        next.push({
          sessionId,
          touristId: Number(seat.touristId),
          pieces,
          connected: seat.connected !== false,
          reconnectUntil: Number(seat.reconnectUntil ?? 0),
          ready: Boolean(seat.ready),
          finishPlace: Number(seat.finishPlace ?? 0) || 0,
          timeExpired: Boolean(seat.timeExpired),
        });
      });
      this.seats = next;

      const removed: string[] = [];
      s.removedTaskKeys?.forEach((key) => {
        removed.push(String(key));
      });
      this.removedTaskKeys = removed;

      const holding: string[] = [];
      s.holdingGrilleKeys?.forEach((key) => {
        holding.push(String(key));
      });
      this.holdingGrilleKeys = holding;

      // Drop stale peek modal if turn moved away (timeout force-wrong / end-turn).
      if (
        this.openPeek &&
        (!this.sessionId ||
          !this.currentTurnSessionId ||
          this.sessionId !== this.currentTurnSessionId)
      ) {
        this.openPeek = null;
      }

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
      this.steps = 0;
      this.peeks = 0;
      this.budgetsInfinite = false;
      this.peekedThisTurn = false;
      this.openPeek = null;
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

      room.onMessage('budgets', (message: unknown) => {
        this._onBudgetsMessage(message);
      });

      room.onMessage('peekOpen', (message: unknown) => {
        this._onPeekOpenMessage(message);
      });

      room.onMessage('allJailWarning', () => {
        this.allJailWarning = true;
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

    _onBudgetsMessage(message: unknown) {
      if (!message || typeof message !== 'object') {
        return;
      }
      const raw = message as Record<string, unknown>;
      const steps = Number(raw.steps);
      const peeks = Number(raw.peeks);
      // Accept 0 (spent budget); reject NaN / negative.
      this.steps = Number.isFinite(steps) && steps >= 0 ? Math.floor(steps) : 0;
      this.peeks = Number.isFinite(peeks) && peeks >= 0 ? Math.floor(peeks) : 0;
      this.budgetsInfinite = Boolean(raw.infinite);
      this.peekedThisTurn = Boolean(raw.peekedThisTurn);
    },

    _onPeekOpenMessage(message: unknown) {
      if (!message || typeof message !== 'object') {
        return;
      }
      const raw = message as Record<string, unknown>;
      const side = raw.side;
      const row = Number(raw.row);
      const col = Number(raw.col);
      const reward = Number(raw.reward);
      if (
        typeof side !== 'string' ||
        side.length === 0 ||
        !Number.isFinite(row) ||
        !Number.isFinite(col) ||
        (reward !== 1 && reward !== 2 && reward !== 3)
      ) {
        return;
      }
      this.openPeek = {
        side,
        row: Math.floor(row),
        col: Math.floor(col),
        reward: reward,
      };
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
      this.steps = 0;
      this.peeks = 0;
      this.budgetsInfinite = false;
      this.peekedThisTurn = false;
      this.openPeek = null;
      this.allJailWarning = false;
      this.sayEvents = [];
      this.status = 'idle';
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useGameStore, import.meta.hot));
}
