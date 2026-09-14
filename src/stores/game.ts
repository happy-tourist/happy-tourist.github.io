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

type GameStatus = 'idle' | 'connecting' | 'waiting' | 'playing' | 'finished';

export const useGameStore = defineStore('game', {
  state: (): {
    rooms: RoomAvailable<GameRoomMeta>[];
    lobbyRoom: Room | null;
    room: Room | null;
    roomId: string | null;
    status: GameStatus;
    error: string | null;
    listing: boolean;
  } => ({
    rooms: [],
    lobbyRoom: null,
    room: null,
    roomId: null,
    status: 'idle',
    error: null,
    listing: false,
  }),

  getters: {
    isInRoom: (state) => Boolean(state.room),
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
          status?: 'waiting' | 'playing' | 'finished';
        };

        if (s.status) {
          this.status = s.status;
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
      this.status = 'idle';
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useGameStore, import.meta.hot));
}
