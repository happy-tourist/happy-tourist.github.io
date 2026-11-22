/** Presentation-owned finish/return travel (SC-FINISH-15/35/36; design D1/D4). */

export type TravelClipKind = 'finish' | 'return';

/** hold → travel → fade (finish only); return omits fade. */
export type TravelClipPhase = 'hold' | 'travel' | 'fade';

export type TravelClipCell = { row: number; col: number };

export interface TravelClip {
  kind: TravelClipKind;
  from: TravelClipCell;
  to: TravelClipCell;
  phase: TravelClipPhase;
}

/** Visual cell for `--prow`/`--pcol`: hold paints `from`, travel|fade paint `to`. */
export function travelClipPaintCell(clip: TravelClip): TravelClipCell {
  return clip.phase === 'hold' ? clip.from : clip.to;
}

/** Finish fade class during travel|fade (CSS ~550 slide + ~300 fade delay). */
export function travelClipIsDisappearing(clip: TravelClip): boolean {
  return clip.kind === 'finish' && (clip.phase === 'travel' || clip.phase === 'fade');
}
