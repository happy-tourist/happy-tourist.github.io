import { defineStore, acceptHMRUpdate } from 'pinia';
import type { Room, RoomAvailable } from '@colyseus/sdk';

import { client } from '@/boot/colyseus';

/** Room name registered on the Colyseus server. */
export const CHECKERS_ROOM = 'checkers';

export type CellValue = 0 | 1 | 2 | 3 | 4;
/** 0 empty, 1 white, 2 black, 3 white king, 4 black king */
export type Board = CellValue[][];

export interface GameRoomMeta {
  title?: string;
  status?: 'waiting' | 'playing' | 'finished';
  [key: string]: unknown;
}

function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 0 as CellValue));
}

export const useGameStore = defineStore('game', {
  state: () => ({
    rooms: [] as RoomAvailable<GameRoomMeta>[],
    room: null as Room | null,
    roomId: null as string | null,
    board: emptyBoard(),
    myColor: null as 'white' | 'black' | null,
    currentTurn: null as 'white' | 'black' | null,
    status: 'idle' as 'idle' | 'connecting' | 'waiting' | 'playing' | 'finished',
    error: null as string | null,
    listing: false,
  }),

  getters: {
    isInRoom: (state) => Boolean(state.room),
    canMove: (state) =>
      state.status === 'playing' && state.myColor !== null && state.currentTurn === state.myColor,
  },

  actions: {
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

    async _enterRoom(connect: () => Promise<Room>) {
      this.status = 'connecting';
      this.error = null;

      try {
        await this.leaveGame();
        const room = await connect();
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
