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
  [key: string]: unknown;
}

/** Mirrored piece from synced Seat.pieces (keyed by side N|E|S|W on server). */
export interface GamePiece {
  side: string;
  row: number;
  col: number;
}

/** Mirrored seat from synced MyRoomState.seats (keyed by sessionId on server). */
export interface GameSeat {
  sessionId: string;
  touristId: number;
  pieces: GamePiece[];
  /** Synced connectivity — true while online (D2 / SC-PIECE-16). */
  connected: boolean;
  /** Unix ms reconnect deadline; 0 when online (D2). */
  reconnectUntil: number;
}

type GameStatus = 'idle' | 'connecting' | 'waiting' | 'playing' | 'finished';

type PieceSync = {
  side: string;
  row: number;
  col: number;
};

type SeatSync = {
  touristId: number;
  connected?: boolean;
  reconnectUntil?: number;
  pieces?: {
    forEach: (cb: (piece: PieceSync, side: string) => void) => void;
  };
};

type TouristRoomState = {
  started?: boolean;
  /** Synced current-turn seated sessionId (empty if no seated). */
  currentTurnSessionId?: string;
  seats?: {
    forEach: (cb: (seat: SeatSync, sessionId: string) => void) => void;
  };
};

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
    started: boolean;
    /** Mirrored MyRoomState.currentTurnSessionId — whose turn it is. */
    currentTurnSessionId: string;
    seats: GameSeat[];
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
    currentTurnSessionId: '',
    seats: [],
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

    async createGame(options: Record<string, unknown> = {}) {
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
    },

    /**
     * Submit a one-step tourist move (D2). Only via store — pages must not room.send.
     * Server rejects if not seated / not current turn / illegal; no local authority.
     * @returns true if the message was sent (room present and isMyTurn).
     */
    sendMove(side: string, row: number, col: number): boolean {
      if (!this.room || !this.isMyTurn) {
        return false;
      }
      this.room.send('move', { side, row, col });
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
      this.currentTurnSessionId = '';
      this.seats = [];

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
      this.started = Boolean(s.started);
      this.currentTurnSessionId =
        typeof s.currentTurnSessionId === 'string' ? s.currentTurnSessionId : '';

      const next: GameSeat[] = [];
      s.seats?.forEach((seat, sessionId) => {
        const pieces: GamePiece[] = [];
        seat.pieces?.forEach((piece, sideKey) => {
          pieces.push({
            side: String(piece.side || sideKey),
            row: Number(piece.row),
            col: Number(piece.col),
          });
        });
        next.push({
          sessionId,
          touristId: Number(seat.touristId),
          pieces,
          connected: seat.connected !== false,
          reconnectUntil: Number(seat.reconnectUntil ?? 0),
        });
      });
      this.seats = next;

      this.status = this.started ? 'playing' : 'waiting';

      // Keep localStorage token fresh after soft reconnect (token may rotate).
      saveTouristReconnect(room);
    },

    _attachRoom(room: Room) {
      this.room = room;
      this.roomId = room.roomId;
      this.sessionId = room.sessionId;
      this.status = 'waiting';

      // D3: persist tourist reconnection token only (never lobby).
      saveTouristReconnect(room);

      room.onStateChange((state) => {
        this._mirrorRoomState(room, state);
      });

      // If full state already landed (rare), mirror once; otherwise onStateChange.
      if (room.state) {
        this._mirrorRoomState(room, room.state);
      }

      room.onError((_code, message) => {
        this.error = message || 'Room error';
      });

      room.onLeave(() => {
        // Unexpected drop: keep localStorage token for F5 / remount / browser reopen (D3).
        this._resetRoomState();
      });
    },

    _resetRoomState() {
      this.room = null;
      this.roomId = null;
      this.sessionId = null;
      this.started = false;
      this.currentTurnSessionId = '';
      this.seats = [];
      this.status = 'idle';
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useGameStore, import.meta.hot));
}
