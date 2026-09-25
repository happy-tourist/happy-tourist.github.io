<template>
  <div
    class="map-grid-preview"
    :class="{ 'map-grid-preview--interactive': interactive }"
    :style="gridStyle"
    role="img"
    :aria-label="ariaLabel"
  >
    <button
      v-for="(cell, i) in cells"
      :key="i"
      type="button"
      class="map-grid-preview__cell"
      :class="cellClass(cell)"
      :disabled="!interactive"
      :tabindex="interactive ? 0 : -1"
      @click="onCellClick(i)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { MAP_CELL, MAP_CELLS, MAP_SIZE, type MapCell } from '@/stores/maps';

const props = withDefaults(
  defineProps<{
    grid: string;
    /** Pixel size of the whole preview (square). Editor uses larger. */
    size?: number;
    interactive?: boolean;
    ariaLabel?: string;
  }>(),
  {
    size: 72,
    interactive: false,
    ariaLabel: 'Карта',
  },
);

const emit = defineEmits<{
  cellClick: [index: number];
}>();

const cells = computed(() => {
  const g = props.grid?.length === MAP_CELLS ? props.grid : '.'.repeat(MAP_CELLS);
  return g.split('') as MapCell[];
});

const gridStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  gridTemplateColumns: `repeat(${MAP_SIZE}, 1fr)`,
  gridTemplateRows: `repeat(${MAP_SIZE}, 1fr)`,
}));

function cellClass(cell: string) {
  if (cell === MAP_CELL.start) return 'is-start';
  if (cell === MAP_CELL.task) return 'is-task';
  if (cell === MAP_CELL.finish) return 'is-finish';
  return 'is-hole';
}

function onCellClick(index: number) {
  if (!props.interactive) return;
  emit('cellClick', index);
}
</script>

<style scoped lang="scss">
.map-grid-preview {
  display: grid;
  gap: 1px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(0, 0, 0, 0.25);
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.map-grid-preview__cell {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
  min-height: 0;
  pointer-events: none;
  cursor: default;
  background: #3a3a3a;
}

.map-grid-preview--interactive .map-grid-preview__cell {
  pointer-events: auto;
  cursor: pointer;
}

.map-grid-preview__cell.is-hole {
  background: #2c2c2c;
}

.map-grid-preview__cell.is-start {
  background: #4caf50;
}

.map-grid-preview__cell.is-task {
  background: #8d6e63;
}

.map-grid-preview__cell.is-finish {
  background: #fdd835;
}

.body--light .map-grid-preview__cell.is-hole {
  background: #e0e0e0;
}

.body--light .map-grid-preview {
  background: rgba(0, 0, 0, 0.12);
}
</style>
