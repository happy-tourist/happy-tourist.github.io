import { describe, expect, it } from 'vitest';

import { buildBoardTiles, parseBoardGeometry, touristLayoutGrid } from '@/lib/boardGeometry';

describe('boardGeometry (SC-BOARD-01/40)', () => {
  it('SC-BOARD-01: tourist layout yields start/task/center tiles', () => {
    const tiles = buildBoardTiles(touristLayoutGrid());
    expect(tiles.some((t) => t.kind === 'start')).toBe(true);
    expect(tiles.some((t) => t.kind === 'task')).toBe(true);
    expect(tiles.filter((t) => t.kind === 'center')).toHaveLength(1);
    const center = tiles.find((t) => t.kind === 'center')!;
    expect(center.style.gridColumn).toContain('span');
    expect(center.style.gridRow).toContain('span');
  });

  it('SC-BOARD-40: custom map grid differs from hardcoded tourist layout', () => {
    // Minimal map: one start, one task, 2×2 finish — not the legacy tourist ASCII.
    const custom = `${'1'.padEnd(10, '.')}${'*'.padEnd(10, '.')}${'7'.repeat(2).padEnd(10, '.')}${'7'.repeat(2).padEnd(10, '.')}${'.'.repeat(60)}`;
    expect(custom).toHaveLength(100);
    expect(custom).not.toBe(touristLayoutGrid());

    const geo = parseBoardGeometry(custom);
    expect(geo.isTask(1, 0)).toBe(true);
    expect(geo.isCenter(2, 0)).toBe(true);
    expect(geo.isCenter(3, 1)).toBe(true);
    // Legacy tourist has task at (1,3); this map does not.
    expect(geo.isTask(1, 3)).toBe(false);

    const tiles = buildBoardTiles(custom);
    expect(tiles.filter((t) => t.kind === 'start')).toHaveLength(1);
    expect(tiles.filter((t) => t.kind === 'task')).toHaveLength(1);
    expect(tiles.filter((t) => t.kind === 'center')).toHaveLength(1);
  });

  it('empty grid (pre-sync) falls back to tourist layout; corrupt length throws', () => {
    expect(parseBoardGeometry('').grid).toBe(touristLayoutGrid());
    expect(() => parseBoardGeometry('short')).toThrow(/invalid map grid length/);
  });
});
