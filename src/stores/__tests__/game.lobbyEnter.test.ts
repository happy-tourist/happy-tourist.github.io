/* eslint-disable @typescript-eslint/unbound-method */
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { client } from '@/boot/colyseus';
import { LOBBY_LEAVE_TIMEOUT_MS, useGameStore, type CreateGameOptions } from '@/stores/game';

function makeTouristRoom(overrides: Partial<{ roomId: string; sessionId: string }> = {}) {
  return {
    roomId: overrides.roomId ?? 'tourist-1',
    sessionId: overrides.sessionId ?? 'sess-1',
    reconnectionToken: 'tok',
    state: null,
    send: vi.fn(),
    leave: vi.fn().mockResolvedValue(undefined),
    onStateChange: vi.fn(),
    onMessage: vi.fn(),
    onError: vi.fn(),
    onLeave: vi.fn(),
  };
}

/** Lobby room whose `leave()` never settles (SC-LOBBY-05/37 hang). */
function makeHangLobby() {
  const leave = vi.fn(() => new Promise<void>(() => {}));
  return {
    roomId: 'lobby-1',
    sessionId: 'lobby-sess',
    leave,
    onMessage: vi.fn(),
    onError: vi.fn(),
    onLeave: vi.fn(),
    reconnection: { enabled: true },
  };
}

const createOptions: CreateGameOptions = {
  mapId: 'm1',
  packId: 'p1',
  taskSetIds: ['ts1'],
  maxSeats: 2,
};

describe('game store lobby enter (SC-LOBBY-05 / SC-LOBBY-37)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.mocked(client.create).mockReset();
    vi.mocked(client.joinById).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function seedLobbyHang() {
    const game = useGameStore();
    const lobby = makeHangLobby();
    game.lobbyWanted = true;
    game.rooms = [{ roomId: 'listed', name: 'tourist' } as never];
    game.lobbyRoom = lobby as never;
    return { game, lobby };
  }

  it('SC-LOBBY-05: createGame initiates lobby close and resolves without awaiting hang leave', async () => {
    const { game, lobby } = seedLobbyHang();
    const tourist = makeTouristRoom();
    vi.mocked(client.create).mockResolvedValue(tourist as never);

    // Under fake timers, awaiting unsubscribe would hang until LOBBY_LEAVE_TIMEOUT_MS.
    // Resolving here without advancing timers proves enter does not await leave.
    const room = await game.createGame(createOptions);

    expect(room.roomId).toBe(tourist.roomId);
    expect(lobby.leave).toHaveBeenCalledTimes(1);
    expect(game.lobbyRoom).toBeNull();
    expect(game.lobbyWanted).toBe(false);
    expect(game.rooms).toEqual([]);
    expect(game.roomId).toBe(tourist.roomId);
    expect(game.sessionId).toBe(tourist.sessionId);
  });

  it.each([
    {
      label: 'createGame',
      sc: 'SC-LOBBY-37',
      connect: async (game: ReturnType<typeof useGameStore>) => {
        const tourist = makeTouristRoom({ roomId: 'created-1' });
        vi.mocked(client.create).mockResolvedValue(tourist as never);
        return { room: await game.createGame(createOptions), tourist };
      },
    },
    {
      label: 'joinGame',
      sc: 'SC-LOBBY-37',
      connect: async (game: ReturnType<typeof useGameStore>) => {
        const tourist = makeTouristRoom({ roomId: 'joined-1' });
        vi.mocked(client.joinById).mockResolvedValue(tourist as never);
        return { room: await game.joinGame('listed'), tourist };
      },
    },
  ] as const)(
    '$sc: $label completes when lobby.leave never resolves (timeout D3)',
    async ({ connect }) => {
      const { game, lobby } = seedLobbyHang();

      const { room, tourist } = await connect(game);

      expect(room.roomId).toBe(tourist.roomId);
      expect(lobby.leave).toHaveBeenCalledTimes(1);
      expect(game.lobbyRoom).toBeNull();
      expect(game.lobbyWanted).toBe(false);
      expect(game.rooms).toEqual([]);
      expect(game.roomId).toBe(tourist.roomId);
      expect(game.sessionId).toBe(tourist.sessionId);

      // Bound leave race (D3) may settle via timeout; entry already succeeded above.
      await vi.advanceTimersByTimeAsync(LOBBY_LEAVE_TIMEOUT_MS);
      expect(LOBBY_LEAVE_TIMEOUT_MS).toBe(1500);
    },
  );
});
