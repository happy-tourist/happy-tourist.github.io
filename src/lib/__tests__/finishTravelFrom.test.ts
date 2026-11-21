import { describe, expect, it } from 'vitest';

import { resolveFinishTravelFrom } from '@/lib/finishTravelFrom';

function isCenterCell(row: number, col: number): boolean {
  return (row === 4 || row === 5) && (col === 4 || col === 5);
}

function pieceKeyOf(sessionId: string, pieceId: string): string {
  return `${sessionId}:${pieceId}`;
}

describe('resolveFinishTravelFrom (SC-FINISH-35)', () => {
  it('uses lastKnown when finishing from a non-center cell (first tourist)', () => {
    const from = resolveFinishTravelFrom({
      lastKnown: { row: 3, col: 4 },
      boardActionPre: null,
      pieceKey: 's1:0',
      selfSessionId: 's1',
      isCenterCell,
      pieceKeyOf,
    });
    expect(from).toEqual({ row: 3, col: 4 });
  });

  it('falls back to boardActionPreCell when lastKnown missing or center', () => {
    const from = resolveFinishTravelFrom({
      lastKnown: { row: 4, col: 4 },
      boardActionPre: { pieceId: '0', row: 3, col: 3 },
      pieceKey: 's1:0',
      selfSessionId: 's1',
      isCenterCell,
      pieceKeyOf,
    });
    expect(from).toEqual({ row: 3, col: 3 });
  });

  it('fails closed (null) when no non-center from is available', () => {
    expect(
      resolveFinishTravelFrom({
        lastKnown: undefined,
        boardActionPre: null,
        pieceKey: 's1:0',
        selfSessionId: 's1',
        isCenterCell,
        pieceKeyOf,
      }),
    ).toBeNull();

    expect(
      resolveFinishTravelFrom({
        lastKnown: { row: 4, col: 5 },
        boardActionPre: { pieceId: '1', row: 2, col: 2 },
        pieceKey: 's1:0',
        selfSessionId: 's1',
        isCenterCell,
        pieceKeyOf,
      }),
    ).toBeNull();
  });
});
