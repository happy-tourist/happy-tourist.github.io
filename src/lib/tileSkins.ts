/**
 * Shared product tile skins for Game board, MapGridPreview, and map palette.
 * Import once — do not duplicate divergent URL strings (board-tile-skins D1/D2).
 */
import startSrc from '@/assets/tiles/start.png';
import taskSrc from '@/assets/tiles/tile.png';
import taskFlippedSrc from '@/assets/tiles/tile-back.png';
import finishSrc from '@/assets/tiles/finish.png';

export const TILE_SKINS = {
  start: startSrc,
  task: taskSrc,
  taskFlipped: taskFlippedSrc,
  finish: finishSrc,
} as const;

/** Stable CSS vars object — safe to bind as `:style` without reallocating each render. */
export const TILE_SKIN_CSS_VARS: Readonly<Record<string, string>> = {
  '--tile-skin-start': `url("${TILE_SKINS.start}")`,
  '--tile-skin-task': `url("${TILE_SKINS.task}")`,
  '--tile-skin-task-flipped': `url("${TILE_SKINS.taskFlipped}")`,
  '--tile-skin-finish': `url("${TILE_SKINS.finish}")`,
};

/** CSS custom properties for `background-image: var(--tile-skin-*)`. */
export function tileSkinCssVars(): Readonly<Record<string, string>> {
  return TILE_SKIN_CSS_VARS;
}
