import { describe, expect, it } from 'vitest';

import {
  BOARD_CENTER,
  manhattanDistance,
  pickNearestActionablePieceId,
} from '@/lib/focusActionable';

describe('focusActionable (SC-PRESENCE-31 nearest)', () => {
  it('picks minimum Manhattan distance from origin', () => {
    const id = pickNearestActionablePieceId(
      [
        { pieceId: 'a', row: 0, col: 0, index: 0 },
        { pieceId: 'b', row: 5, col: 5, index: 1 },
      ],
      { row: 4, col: 5 },
    );
    expect(id).toBe('b');
    expect(manhattanDistance({ row: 4, col: 5 }, { row: 5, col: 5 })).toBe(1);
  });

  it('ties break to smaller piece index', () => {
    const id = pickNearestActionablePieceId(
      [
        { pieceId: 'later', row: 3, col: 3, index: 2 },
        { pieceId: 'earlier', row: 5, col: 5, index: 0 },
      ],
      BOARD_CENTER,
    );
    // Both at Manhattan 3 from (4.5,4.5); index 0 wins.
    expect(id).toBe('earlier');
  });

  it('returns null for empty candidates', () => {
    expect(pickNearestActionablePieceId([], BOARD_CENTER)).toBeNull();
  });
});
