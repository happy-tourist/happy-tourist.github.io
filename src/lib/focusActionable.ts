/**
 * Nearest actionable tourist for presence focus control (SC-PRESENCE-30/31/32).
 * Distance: Manhattan from current selection (or board center if none);
 * ties → smaller piece index (design D22).
 */

export type FocusCell = { row: number; col: number };

export type ActionableCandidate = {
  pieceId: string;
  row: number;
  col: number;
  /** Seat piece index — tie-break prefers smaller. */
  index: number;
};

export function manhattanDistance(a: FocusCell, b: FocusCell): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/** Geometric center of a 10×10 tourist board (design: board center when no selection). */
export const BOARD_CENTER: FocusCell = { row: 4.5, col: 4.5 };

/**
 * Pick nearest actionable candidate from `from`.
 * Returns null when `candidates` is empty.
 */
export function pickNearestActionablePieceId(
  candidates: readonly ActionableCandidate[],
  from: FocusCell,
): string | null {
  if (candidates.length === 0) {
    return null;
  }
  let best = candidates[0]!;
  let bestDist = manhattanDistance(from, best);
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i]!;
    const d = manhattanDistance(from, c);
    if (d < bestDist || (d === bestDist && c.index < best.index)) {
      best = c;
      bestDist = d;
    }
  }
  return best.pieceId;
}
