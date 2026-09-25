/**
 * Client board geometry from synced map snapshot grid (100 chars).
 * Mirrors server `game/boardGeometry` for tile render + local move hints.
 */

export type Cell = { row: number; col: number };

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/** Legacy fixed tourist ASCII (fallback before first sync / empty grid). */
export const TOURIST_LAYOUT = [
  '...1111...',
  '...****...',
  '..******..',
  '1********1',
  '1***77***1',
  '1***77***1',
  '1********1',
  '..******..',
  '...****...',
  '...1111...',
] as const;

export function touristLayoutGrid(): string {
  return TOURIST_LAYOUT.join('');
}

export type TileKind = 'start' | 'task' | 'center';

export interface BoardTile {
  kind: TileKind;
  /** Top-left cell for this tile (center covers 2×2 from here). */
  row: number;
  col: number;
  style: Record<string, string>;
  /** Removed task cell — visual hole; not landable; piece may stand. */
  removed?: boolean;
  /** Public difficulty digit on flipped still-present task (SC-BOARD-42). */
  difficulty?: 1 | 2 | 3;
}

export type BoardGeometry = {
  readonly grid: string;
  readonly playable: ReadonlySet<string>;
  readonly centerCells: ReadonlyArray<Cell>;
  charAt(row: number, col: number): string;
  isPlayable(row: number, col: number): boolean;
  isTask(row: number, col: number): boolean;
  isCenter(row: number, col: number): boolean;
};

/**
 * Parse a 100-char map grid.
 * Empty string (pre-sync) → legacy tourist layout for waiting chrome.
 * Any other non-100 length → throw (do not silently swap layouts mid-game).
 */
export function parseBoardGeometry(grid: string): BoardGeometry {
  let normalized: string;
  if (grid.length === 100) {
    normalized = grid;
  } else if (grid.length === 0) {
    normalized = touristLayoutGrid();
  } else {
    throw new Error(`invalid map grid length ${grid.length} (expected 100)`);
  }
  const playable = new Set<string>();
  const centerCells: Cell[] = [];

  for (let i = 0; i < 100; i++) {
    const row = Math.floor(i / 10);
    const col = i % 10;
    const ch = normalized[i] ?? '.';
    const key = cellKey(row, col);
    if (ch === '1' || ch === '*' || ch === '7') {
      playable.add(key);
    }
    if (ch === '7') {
      centerCells.push({ row, col });
    }
  }

  const centerKeySet = new Set(centerCells.map((c) => cellKey(c.row, c.col)));

  return {
    grid: normalized,
    playable,
    centerCells,
    charAt(row: number, col: number): string {
      if (row < 0 || row > 9 || col < 0 || col > 9) {
        return '.';
      }
      return normalized[row * 10 + col] ?? '.';
    },
    isPlayable(row: number, col: number): boolean {
      return playable.has(cellKey(row, col));
    },
    isTask(row: number, col: number): boolean {
      return this.charAt(row, col) === '*';
    },
    isCenter(row: number, col: number): boolean {
      return centerKeySet.has(cellKey(row, col));
    },
  };
}

/**
 * Build CSS-grid tiles from a 100-char grid.
 * Adjacent finish (`7`) cells become one 2×2 center tile from the min row/col.
 */
export function buildBoardTiles(grid: string): BoardTile[] {
  const geo = parseBoardGeometry(grid);
  const tiles: BoardTile[] = [];
  const visitedCenter = new Set<string>();

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const ch = geo.charAt(row, col);
      if (ch === '.') {
        continue;
      }
      if (ch === '7') {
        const key = cellKey(row, col);
        if (visitedCenter.has(key)) {
          continue;
        }
        // Expand contiguous finish block from this origin (product: solid 2×2).
        let maxR = row;
        let maxC = col;
        const stack = [{ row, col }];
        const block = new Set<string>([key]);
        while (stack.length) {
          const cur = stack.pop()!;
          for (const [dr, dc] of [
            [0, 1],
            [1, 0],
            [0, -1],
            [-1, 0],
          ] as const) {
            const nr = cur.row + dr;
            const nc = cur.col + dc;
            const nk = cellKey(nr, nc);
            if (block.has(nk) || geo.charAt(nr, nc) !== '7') {
              continue;
            }
            block.add(nk);
            stack.push({ row: nr, col: nc });
            maxR = Math.max(maxR, nr);
            maxC = Math.max(maxC, nc);
          }
        }
        for (const k of block) {
          visitedCenter.add(k);
        }
        const spanR = maxR - row + 1;
        const spanC = maxC - col + 1;
        tiles.push({
          kind: 'center',
          row,
          col,
          style: {
            gridColumn: `${col + 1} / span ${spanC}`,
            gridRow: `${row + 1} / span ${spanR}`,
          },
        });
        continue;
      }
      tiles.push({
        kind: ch === '1' ? 'start' : 'task',
        row,
        col,
        style: {
          gridColumn: String(col + 1),
          gridRow: String(row + 1),
        },
      });
    }
  }

  return tiles;
}

export function chebyshevDistance(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}
