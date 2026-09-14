import { defineStore, acceptHMRUpdate } from 'pinia';
import type { Room, RoomAvailable } from '@colyseus/sdk';

import { client } from '@/boot/colyseus';

/** Room name registered on the Colyseus server. */
export const TOURIST_ROOM = 'tourist';

/** Built-in Colyseus LobbyRoom name. */
export const LOBBY_ROOM = 'lobby';

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
}

type GameStatus = 'idle' | 'connecting' | 'waiting' | 'playing' | 'finished';

type PieceSync = {
  side: string;
  row: number;
  col: number;
};

type SeatSync = {
  touristId: number;
  pieces?: {
    forEach: (cb: (piece: PieceSync, side: string) => void) => void;
  };
};

type TouristRoomState = {
  started?: boolean;
  seats?: {
    forEach: (cb: (seat: SeatSync, sessionId: string) => void) => void;
  };
};

export const useGameStore = defineStore('game', {
  state: (): {
    rooms: RoomAvailable<GameRoomMeta>[];
    lobbyRoom: Room | null;
    room: Room | null;
    roomId: string | null;
    sessionId: string | null;
    started: boolean;
    seats: GameSeat[];
    status: GameStatus;
    error: string | null;
    listing: boolean;
  } => ({
    rooms: [],
    lobbyRoom: null,
    room: null,
    roomId: null,
    sessionId: null,
    started: false,
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
      this.listing = true;
      this.error = null;

      try {
        const lobby = await client.joinOrCreate(LOBBY_ROOM, {
          filter: { name: TOURIST_ROOM },
        });
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
          this.error = message || 'Lobby error';
        });

        lobby.onLeave(() => {
          if (this.lobbyRoom === lobby) {
            this.lobbyRoom = null;
          }
        });
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e);
        this.rooms = [];
        this.lobbyRoom = null;
      } finally {
        this.listing = false;
      }
    },

    async unsubscribeLobby() {
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

    async leaveGame() {
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
     * Detach a prior tourist room without touching the lobby subscription.
     * Lobby stays live until enter succeeds (SC-LOBBY-01 / SC-LOBBY-05).
     */
    async _leaveTouristRoom() {
      const room = this.room;
      this.room = null;
      this.roomId = null;
      this.sessionId = null;
      this.started = false;
      this.seats = [];

      if (room) {
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

    _mirrorRoomState(room: Room, state: unknown) {
      const s = state as TouristRoomState;

      this.sessionId = room.sessionId;
      this.started = Boolean(s.started);

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
        });
      });
      this.seats = next;

      this.status = this.started ? 'playing' : 'waiting';
    },

    _attachRoom(room: Room) {
      this.room = room;
      this.roomId = room.roomId;
      this.sessionId = room.sessionId;
      this.status = 'waiting';

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
        this._resetRoomState();
      });
    },

    _resetRoomState() {
      this.room = null;
      this.roomId = null;
      this.sessionId = null;
      this.started = false;
      this.seats = [];
      this.status = 'idle';
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useGameStore, import.meta.hot));
}
