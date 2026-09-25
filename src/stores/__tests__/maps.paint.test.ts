import { describe, expect, it } from 'vitest';

import { emptyMapGrid, MAP_CELL, paintCell } from '@/stores/maps';

describe('map paintCell (SC-MAP-04)', () => {
  it('SC-MAP-04: places, clears, and replaces cells', () => {
    let grid = emptyMapGrid();
    expect(grid[0]).toBe(MAP_CELL.hole);

    grid = paintCell(grid, 0, 'start');
    expect(grid[0]).toBe(MAP_CELL.start);

    grid = paintCell(grid, 0, 'start');
    expect(grid[0]).toBe(MAP_CELL.hole);

    grid = paintCell(grid, 0, 'start');
    expect(grid[0]).toBe(MAP_CELL.start);

    grid = paintCell(grid, 0, 'task');
    expect(grid[0]).toBe(MAP_CELL.task);
  });
});
