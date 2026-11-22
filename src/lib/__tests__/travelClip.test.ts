import { describe, expect, it } from 'vitest';

import { travelClipIsDisappearing, travelClipPaintCell, type TravelClip } from '@/lib/travelClip';

/** SC-FINISH-35: paint contract requires an explicit travel `from` (hold paints origin). */
describe('travelClip (SC-FINISH-15/35)', () => {
  const finishHold: TravelClip = {
    kind: 'finish',
    from: { row: 3, col: 3 },
    to: { row: 4, col: 4 },
    phase: 'hold',
  };

  it('SC-FINISH-35: hold paints from; travel|fade paint to', () => {
    expect(travelClipPaintCell(finishHold)).toEqual({ row: 3, col: 3 });
    expect(travelClipPaintCell({ ...finishHold, phase: 'travel' })).toEqual({ row: 4, col: 4 });
    expect(travelClipPaintCell({ ...finishHold, phase: 'fade' })).toEqual({ row: 4, col: 4 });
  });

  it('SC-FINISH-35: without from the paint cell cannot be the non-center origin', () => {
    // Behavioral stand-in for «fails without from»: a clip whose from equals to
    // (missing origin) never paints the pre-finish cell.
    const missingOrigin: TravelClip = {
      kind: 'finish',
      from: { row: 4, col: 4 },
      to: { row: 4, col: 4 },
      phase: 'hold',
    };
    expect(travelClipPaintCell(missingOrigin)).not.toEqual({ row: 3, col: 3 });
    expect(travelClipPaintCell(finishHold)).toEqual({ row: 3, col: 3 });
  });

  it('SC-FINISH-15: return hold paints nearest-center from (no finish fade)', () => {
    const ret: TravelClip = {
      kind: 'return',
      from: { row: 4, col: 4 },
      to: { row: 3, col: 4 },
      phase: 'hold',
    };
    expect(travelClipPaintCell(ret)).toEqual({ row: 4, col: 4 });
    expect(travelClipIsDisappearing(ret)).toBe(false);
    expect(travelClipIsDisappearing({ ...ret, phase: 'travel' })).toBe(false);
    expect(travelClipIsDisappearing({ ...finishHold, phase: 'travel' })).toBe(true);
  });
});
