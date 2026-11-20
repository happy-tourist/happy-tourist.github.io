/**
 * Solo end-modal infer: timer-only (SC-PRESENCE-21/35).
 * Solo steps are infinite — no distinct steps-exhausted copy.
 */

export type SoloEndModalKind = 'timer';

/** Minimal piece fields (kept for legal-peek helper / tests). */
export type SoloEndPiece = {
  finished: boolean;
  trapped: boolean;
  row: number;
  col: number;
};

/**
 * True when any own unfinished free piece stands on a still-present task cell.
 * Trapped pieces do not count (legacy legal-peek helper).
 */
export function hasOwnUnfinishedOnLiveTask(
  pieces: readonly SoloEndPiece[],
  isPresentTaskCell: (row: number, col: number) => boolean,
): boolean {
  return pieces.some((p) => !p.finished && !p.trapped && isPresentTaskCell(p.row, p.col));
}

/**
 * Infer end-modal copy kind when the seat becomes time-expired.
 * Always `'timer'` — steps-exhausted branch removed (SC-PRESENCE-21/35).
 */
export function inferSoloEndModalKind(): SoloEndModalKind {
  return 'timer';
}
