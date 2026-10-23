import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PEEK_STATUS_FLASH_MS, useGameStore } from '@/stores/game';
import enUS from '@/i18n/en-US';

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

describe('game store peek status flash (SC-PRESENCE-36)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('i18n RU copy for flash kinds', () => {
    expect(enUS.game.peekStatusFlash.correct).toBe('Правильно!');
    expect(enUS.game.peekStatusFlash.wrong).toBe('Ошибка!');
    expect(enUS.game.peekStatusFlash.timeout).toBe('Не успел!');
  });

  it('SC-PRESENCE-36: correct / wrong / timeout flash 10s then clear; legacy no reason skips', () => {
    const game = useGameStore();
    const room = makeRoom();
    game._attachRoom(room as never);
    game.openPeek = {
      sessionId: 'peeker',
      pieceId: '0',
      row: 1,
      col: 1,
      taskId: 't1',
      question: '?',
      difficulty: 1,
      reward: 1,
      placements: [''],
    };

    const t0 = Date.now();
    room._emit('peekClose', { sessionId: 'peeker', correct: true });
    expect(game.openPeek).toBeNull();
    expect(game.peekStatusFlash?.kind).toBe('correct');
    expect(game.peekStatusFlash!.until).toBeGreaterThanOrEqual(t0 + PEEK_STATUS_FLASH_MS);

    vi.advanceTimersByTime(PEEK_STATUS_FLASH_MS);
    expect(game.peekStatusFlash).toBeNull();

    room._emit('peekClose', {
      sessionId: 'peeker',
      correct: false,
      reason: 'wrong',
    });
    expect(game.peekStatusFlash?.kind).toBe('wrong');
    vi.advanceTimersByTime(PEEK_STATUS_FLASH_MS);
    expect(game.peekStatusFlash).toBeNull();

    room._emit('peekClose', {
      sessionId: 'peeker',
      correct: false,
      reason: 'timeout',
    });
    expect(game.peekStatusFlash?.kind).toBe('timeout');
    vi.advanceTimersByTime(PEEK_STATUS_FLASH_MS);
    expect(game.peekStatusFlash).toBeNull();

    room._emit('peekClose', { sessionId: 'peeker', correct: false });
    expect(game.peekStatusFlash).toBeNull();
  });

  it('SC-PRESENCE-36: new peekClose overwrites flash and restarts 10s', () => {
    const game = useGameStore();
    const room = makeRoom();
    game._attachRoom(room as never);

    room._emit('peekClose', { sessionId: 'a', correct: true });
    expect(game.peekStatusFlash?.kind).toBe('correct');
    vi.advanceTimersByTime(PEEK_STATUS_FLASH_MS / 2);

    room._emit('peekClose', {
      sessionId: 'a',
      correct: false,
      reason: 'wrong',
    });
    expect(game.peekStatusFlash?.kind).toBe('wrong');
    vi.advanceTimersByTime(PEEK_STATUS_FLASH_MS / 2);
    expect(game.peekStatusFlash?.kind).toBe('wrong');
    vi.advanceTimersByTime(PEEK_STATUS_FLASH_MS / 2);
    expect(game.peekStatusFlash).toBeNull();
  });

  it('clears flash on room reset / leave', () => {
    const game = useGameStore();
    const room = makeRoom();
    game._attachRoom(room as never);
    room._emit('peekClose', { sessionId: 'a', correct: true });
    expect(game.peekStatusFlash?.kind).toBe('correct');

    game._resetRoomState();
    expect(game.peekStatusFlash).toBeNull();
  });
});
