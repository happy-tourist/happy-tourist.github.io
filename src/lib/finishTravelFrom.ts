/** Board cell for finish-travel `from` seeding (SC-FINISH-35 / D10). */
export type FinishTravelCell = { row: number; col: number };

export type FinishTravelPreCell = {
  pieceId: string;
  row: number;
  col: number;
};

/**
 * Resolve the non-center cell a finishing piece should paint for one frame
 * before sliding to center. Returns null when no usable `from` is known
 * (mid-join already on center, or missing seeds — callers must not snap-vanish).
 */
export function resolveFinishTravelFrom(opts: {
  lastKnown: FinishTravelCell | undefined;
  boardActionPre: FinishTravelPreCell | null | undefined;
  pieceKey: string;
  selfSessionId: string | null | undefined;
  isCenterCell: (row: number, col: number) => boolean;
  pieceKeyOf: (sessionId: string, pieceId: string) => string;
}): FinishTravelCell | null {
  const { lastKnown, boardActionPre, pieceKey, selfSessionId, isCenterCell, pieceKeyOf } = opts;

  let from: FinishTravelCell | undefined = lastKnown;
  if ((!from || isCenterCell(from.row, from.col)) && boardActionPre) {
    if (
      selfSessionId &&
      pieceKey === pieceKeyOf(selfSessionId, boardActionPre.pieceId) &&
      !isCenterCell(boardActionPre.row, boardActionPre.col)
    ) {
      from = { row: boardActionPre.row, col: boardActionPre.col };
    }
  }
  if (from && !isCenterCell(from.row, from.col)) {
    return from;
  }
  return null;
}
