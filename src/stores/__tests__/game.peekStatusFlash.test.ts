import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PEEK_STATUS_FLASH_MS, useGameStore } from '@/stores/game';
import enUS from '@/i18n/en-US';

const notifyCreate = vi.fn();
vi.mock('quasar', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vitest importOriginal
  const actual: any = await importOriginal();
  return {
    ...actual,
    Notify: { create: (...args: unknown[]) => notifyCreate(...args) },
  };
});

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

  it('i18n RU copy for flash/toast kinds (SC-PRESENCE-36 / SC-BOARD-88)', () => {
    expect(enUS.game.peekStatusFlash.correct).toBe('Правильно!');
    expect(enUS.game.peekStatusFlash.wrong).toBe('Ошибка!');
    expect(enUS.game.peekStatusFlash.timeout).toBe('Не успел!');
  });

  it('SC-BOARD-88: quasar Notify plugin enabled; store fires top-center toast', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const quasarCfg = readFileSync(path.join(root, 'quasar.config.ts'), 'utf8');
    const storeSrc = readFileSync(path.join(root, 'src/stores/game.ts'), 'utf8');
    expect(quasarCfg).toMatch(/plugins:\s*\[[^\]]*Notify/);
    expect(storeSrc).toMatch(/Notify\.create/);
    expect(storeSrc).toMatch(/position:\s*'top'/);
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

    notifyCreate.mockClear();
    const t0 = Date.now();
    room._emit('peekClose', { sessionId: 'peeker', correct: true });
    expect(game.openPeek).toBeNull();
    expect(game.peekStatusFlash?.kind).toBe('correct');
    expect(game.peekStatusFlash!.until).toBeGreaterThanOrEqual(t0 + PEEK_STATUS_FLASH_MS);
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Правильно!',
        position: 'top',
      }),
    );

    vi.advanceTimersByTime(PEEK_STATUS_FLASH_MS);
    expect(game.peekStatusFlash).toBeNull();

    room._emit('peekClose', {
      sessionId: 'peeker',
      correct: false,
      reason: 'wrong',
    });
    expect(game.peekStatusFlash?.kind).toBe('wrong');
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ошибка!', position: 'top' }),
    );
    vi.advanceTimersByTime(PEEK_STATUS_FLASH_MS);
    expect(game.peekStatusFlash).toBeNull();

    room._emit('peekClose', {
      sessionId: 'peeker',
      correct: false,
      reason: 'timeout',
    });
    expect(game.peekStatusFlash?.kind).toBe('timeout');
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Не успел!', position: 'top' }),
    );
    vi.advanceTimersByTime(PEEK_STATUS_FLASH_MS);
    expect(game.peekStatusFlash).toBeNull();

    const callsBeforeLegacy = notifyCreate.mock.calls.length;
    room._emit('peekClose', { sessionId: 'peeker', correct: false });
    expect(game.peekStatusFlash).toBeNull();
    expect(notifyCreate.mock.calls.length).toBe(callsBeforeLegacy);
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

  it('SC-PRESENCE-57: allJailSkip Notify top-center; no start-reset modal', () => {
    expect(enUS.game.allJailSkipToast).toBe('Все туристы в решётке — ход пропущен');
    const game = useGameStore();
    const room = makeRoom();
    game._attachRoom(room as never);
    notifyCreate.mockClear();
    room._emit('allJailSkip', {});
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: enUS.game.allJailSkipToast,
        position: 'top',
      }),
    );
    expect(game.allJailWarning).toBe(false);
  });
});
