import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGameStore } from '@/stores/game';

function makeRoom() {
  const listeners: Record<string, Array<(msg: unknown) => void>> = {};
  const send = vi.fn();
  return {
    roomId: 'r1',
    sessionId: 's1',
    reconnectionToken: 'tok',
    state: null,
    send,
    leave: vi.fn().mockResolvedValue(undefined),
    onStateChange: vi.fn(),
    onMessage: vi.fn((type: string, cb: (msg: unknown) => void) => {
      (listeners[type] ??= []).push(cb);
    }),
    onError: vi.fn(),
    onLeave: vi.fn(),
    _emit(type: string, msg: unknown) {
      for (const cb of listeners[type] ?? []) {
        cb(msg);
      }
    },
  };
}

describe('game store board/peek/pieces (SC-BOARD-42/46, SC-PIECE-51/52)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('mirrors grid, touristsPerPlayer, flippedCells, answerCards from state', () => {
    const game = useGameStore();
    const room = makeRoom();
    game._attachRoom(room as never);

    const flipped = new Map([['3,3', { taskId: 't1', difficulty: 2 }]]);
    const answers = [
      { id: 'a1', content: 'Ответ A', description: '' },
      { id: 'a2', content: 'Ответ B', description: '' },
    ];
    const pieces = new Map([
      ['0', { row: 1, col: 1, finished: false, trapped: false }],
      ['1', { row: 2, col: 2, finished: false, trapped: false }],
    ]);
    const seats = new Map([
      [
        's1',
        {
          touristId: 1,
          connected: true,
          reconnectUntil: 0,
          ready: false,
          finishPlace: 0,
          timeExpired: false,
          pieces,
        },
      ],
    ]);

    game._mirrorRoomState(room as never, {
      phase: 'playing',
      maxSeats: 2,
      grid: '1'.repeat(100),
      touristsPerPlayer: 2,
      packTitle: 'Пак',
      flippedCells: flipped,
      answerCards: answers,
      seats,
      removedTaskKeys: [],
      holdingGrilleKeys: [],
      revealingCatapultKeys: [],
      brokenCatapultKeys: [],
      peekActive: false,
    });

    expect(game.grid).toHaveLength(100);
    expect(game.touristsPerPlayer).toBe(2);
    expect(game.flippedCells).toEqual([{ key: '3,3', taskId: 't1', difficulty: 2 }]);
    expect(game.answerCards).toHaveLength(2);
    expect(game.mySeat?.pieces.map((p) => p.pieceId)).toEqual(['0', '1']);
    expect(game.mySeat?.pieces.every((p) => !('side' in p))).toBe(true);
  });

  it('SC-BOARD-46: shared peekOpen / peekPlace / peekClose for all clients', () => {
    const game = useGameStore();
    const room = makeRoom();
    game._attachRoom(room as never);
    game.sessionId = 'spectator';

    room._emit('peekOpen', {
      sessionId: 'peeker',
      pieceId: '0',
      row: 3,
      col: 3,
      taskId: 't1',
      question: 'Сколько будет 2+2?',
      difficulty: 2,
      reward: 2,
      placements: ['', ''],
    });

    expect(game.openPeek?.question).toBe('Сколько будет 2+2?');
    expect(game.openPeek?.placements).toEqual(['', '']);
    expect(game.isPeekOwner).toBe(false);

    room._emit('peekPlace', {
      sessionId: 'peeker',
      slotIndex: 0,
      answerCardId: 'a1',
    });
    expect(game.openPeek?.placements).toEqual(['a1', '']);

    room._emit('peekClose', { sessionId: 'peeker', correct: false });
    expect(game.openPeek).toBeNull();
  });

  it('sendPeek / sendPeekPlace / sendPeekSubmit use pieceId contract', () => {
    const game = useGameStore();
    const room = makeRoom();
    game._attachRoom(room as never);
    game.phase = 'playing';
    game.sessionId = 's1';
    game.currentTurnSessionId = 's1';
    game.seats = [
      {
        sessionId: 's1',
        touristId: 1,
        pieces: [{ pieceId: '0', row: 3, col: 3, finished: false, trapped: false }],
        connected: true,
        reconnectUntil: 0,
        ready: false,
        finishPlace: 0,
        timeExpired: false,
      },
    ];
    game.openPeek = {
      sessionId: 's1',
      pieceId: '0',
      row: 3,
      col: 3,
      taskId: 't1',
      question: 'Q',
      difficulty: 1,
      reward: 1,
      placements: [''],
    };

    expect(game.sendPeek('0')).toBe(true);
    expect(room.send).toHaveBeenCalledWith('peek', { pieceId: '0' });

    expect(game.sendPeekPlace(0, 'a1')).toBe(true);
    expect(room.send).toHaveBeenCalledWith('peekPlace', {
      slotIndex: 0,
      answerCardId: 'a1',
    });

    expect(game.sendPeekSubmit()).toBe(true);
    expect(room.send).toHaveBeenCalledWith('peekSubmit', {});
  });

  it('sendMove addresses piece by pieceId (no side)', () => {
    const game = useGameStore();
    const room = makeRoom();
    game._attachRoom(room as never);
    game.phase = 'playing';
    game.sessionId = 's1';
    game.currentTurnSessionId = 's1';
    game.steps = 3;
    game.seats = [
      {
        sessionId: 's1',
        touristId: 1,
        pieces: [{ pieceId: '1', row: 3, col: 3, finished: false, trapped: false }],
        connected: true,
        reconnectUntil: 0,
        ready: false,
        finishPlace: 0,
        timeExpired: false,
      },
    ];

    expect(game.sendMove('1', 3, 4)).toBe(true);
    expect(room.send).toHaveBeenCalledWith('move', { pieceId: '1', row: 3, col: 4 });
  });
});
