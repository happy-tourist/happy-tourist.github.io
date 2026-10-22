/**
 * Solo end-modal infer: steps-exhausted vs timer-expired (SC-PRESENCE-21/35).
 * Legal peek target = free unfinished on a still-present task cell (**!trapped**),
 * mirroring server `hasLegalPeek`.
 */

export type SoloEndModalKind = 'steps' | 'timer';

/** Minimal piece fields needed for legal-peek / end-modal infer. */
export type SoloEndPiece = {
  finished: boolean;
  trapped: boolean;
  row: number;
  col: number;
};

/**
 * True when any own unfinished free piece stands on a still-present task cell.
 * Trapped pieces do not count (SC-PRESENCE-35).
 */
export function hasOwnUnfinishedOnLiveTask(
  pieces: readonly SoloEndPiece[],
  isPresentTaskCell: (row: number, col: number) => boolean,
): boolean {
  return pieces.some((p) => !p.finished && !p.trapped && isPresentTaskCell(p.row, p.col));
}

/**
 * Infer end-modal copy kind when the seat becomes time-expired.
 * steps ≤ 0 ∧ no legal peek target → `'steps'`; otherwise `'timer'`.
 */
export function inferSoloEndModalKind(
  pieces: readonly SoloEndPiece[],
  steps: number,
  isPresentTaskCell: (row: number, col: number) => boolean,
): SoloEndModalKind {
  if (steps <= 0 && !hasOwnUnfinishedOnLiveTask(pieces, isPresentTaskCell)) {
    return 'steps';
  }
  return 'timer';
}
