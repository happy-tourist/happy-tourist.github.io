import { defineStore, acceptHMRUpdate } from 'pinia';
import type { Room, RoomAvailable } from '@colyseus/sdk';

import { client } from '@/boot/colyseus';

/** Room name registered on the Colyseus server. */
export const CHECKERS_ROOM = 'checkers';

/** Built-in Colyseus LobbyRoom name. */
export const LOBBY_ROOM = 'lobby';

export type CellValue = 0 | 1 | 2 | 3 | 4;
/** 0 empty, 1 white, 2 black, 3 white king, 4 black king */
export type Board = CellValue[][];

export interface GameRoomMeta {
  title?: string;
  status?: 'waiting' | 'playing' | 'finished';
  [key: string]: unknown;
}

function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, (): CellValue => 0));
}

type GameStatus = 'idle' | 'connecting' | 'waiting' | 'playing' | 'finished';

export const useGameStore = defineStore('game', {
  state: (): {
    rooms: RoomAvailable<GameRoomMeta>[];
    lobbyRoom: Room | null;
    room: Room | null;
    roomId: string | null;
    board: Board;
    myColor: 'white' | 'black' | null;
    currentTurn: 'white' | 'black' | null;
    status: GameStatus;
    error: string | null;
    listing: boolean;
  } => ({
    rooms: [],
    lobbyRoom: null,
    room: null,
    roomId: null,
    board: emptyBoard(),
    myColor: null,
    currentTurn: null,
    status: 'idle',
    error: null,
    listing: false,
  }),

  getters: {
    isInRoom: (state) => Boolean(state.room),
    canMove: (state) =>
      state.status === 'playing' && state.myColor !== null && state.currentTurn === state.myColor,
  },

  actions: {
    /** HTTP fallback listing — unused by LobbyPage (live LobbyRoom subscribe). */
    async refreshRooms() {
      this.listing = true;
      this.error = null;

      try {
        // Requires a server route like GET /rooms/:roomName (getAvailableRooms was removed in 0.16+)
        const { data } = await client.http.get(`/rooms/${CHECKERS_ROOM}`);
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
          filter: { name: CHECKERS_ROOM },
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
      return this._enterRoom(() => client.create(CHECKERS_ROOM, options));
    },

    async joinGame(roomId?: string, options: Record<string, unknown> = {}) {
      if (roomId) {
        return this._enterRoom(() => client.joinById(roomId, options));
      }
      return this._enterRoom(() => client.joinOrCreate(CHECKERS_ROOM, options));
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

    sendMove(from: { row: number; col: number }, to: { row: number; col: number }) {
      if (!this.room) {
        return;
      }
      this.room.send('move', { from, to });
    },

    /**
     * Detach a prior checkers room without touching the lobby subscription.
     * Lobby stays live until enter succeeds (SC-LOBBY-01 / SC-LOBBY-05).
     */
    async _leaveCheckersRoom() {
      const room = this.room;
      this.room = null;
      this.roomId = null;
      this.board = emptyBoard();
      this.myColor = null;
      this.currentTurn = null;

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
        // Unsubscribe only after checkers connect succeeds (SC-LOBBY-05 / design D2).
        await this._leaveCheckersRoom();
        const room = await connect();
        await this.unsubscribeLobby();
        this._attachRoom(room);
        return room;
      } catch (e) {
        this.status = 'idle';
        this.error = e instanceof Error ? e.message : String(e);
        throw e;
      }
    },

    _attachRoom(room: Room) {
      this.room = room;
      this.roomId = room.roomId;
      this.status = 'waiting';

      room.onStateChange((state) => {
        const s = state as {
          board?: Board;
          currentTurn?: 'white' | 'black';
          status?: 'waiting' | 'playing' | 'finished';
          players?: Record<string, { color?: 'white' | 'black' }>;
        };

        if (s.board) {
          this.board = s.board;
        }
        if (s.currentTurn) {
          this.currentTurn = s.currentTurn;
        }
        if (s.status) {
          this.status = s.status;
        }

        const me = s.players?.[room.sessionId];
        if (me?.color) {
          this.myColor = me.color;
        }
      });

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
      this.board = emptyBoard();
      this.myColor = null;
      this.currentTurn = null;
      this.status = 'idle';
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useGameStore, import.meta.hot));
}
