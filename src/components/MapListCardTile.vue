<template>
  <div
    class="map-list-tile"
    :class="{ 'map-list-tile--clickable': clickable }"
    :data-test-id="testId"
    :data-testid="testId"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="onBodyClick"
    @keydown.enter.prevent="onBodyClick"
    @keydown.space.prevent="onBodyClick"
  >
    <div class="map-list-tile__preview">
      <MapGridPreview :grid="grid" :size="previewSize" :aria-label="previewAria" />
    </div>

    <div class="map-list-tile__body">
      <div v-if="$slots.status" class="map-list-tile__status">
        <slot name="status" />
      </div>
      <div class="map-list-tile__author">{{ author }}</div>
      <div class="map-list-tile__capacity">{{ capacity }}</div>
    </div>

    <div v-if="$slots.actions" class="map-list-tile__actions" @click.stop>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import MapGridPreview from '@/components/MapGridPreview.vue';

withDefaults(
  defineProps<{
    grid: string;
    author: string;
    capacity: string;
    previewAria?: string;
    previewSize?: number;
    clickable?: boolean;
    testId?: string;
  }>(),
  {
    previewAria: '',
    previewSize: 96,
    clickable: false,
  },
);

const emit = defineEmits<{
  open: [];
}>();

function onBodyClick() {
  emit('open');
}
</script>

<style scoped>
/* SC-MAP-55 / D20: map list card — mini preview, capacity, bottom text actions */
.map-list-tile {
  --map-list-bg: #ffffff;
  --map-list-fg: rgba(0, 0, 0, 0.87);
  --map-list-muted: rgba(0, 0, 0, 0.7);
  --map-list-border: rgba(0, 0, 0, 0.14);
  --map-list-splitter: rgba(0, 0, 0, 0.12);

  position: relative;
  box-sizing: border-box;
  width: 150px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--map-list-border);
  background: var(--map-list-bg);
  color: var(--map-list-fg);
  overflow: hidden;
  flex: 0 0 auto;
}

.body--dark .map-list-tile {
  --map-list-bg: #2a2a2a;
  --map-list-fg: rgba(255, 255, 255, 0.92);
  --map-list-muted: rgba(255, 255, 255, 0.78);
  --map-list-border: rgba(255, 255, 255, 0.22);
  --map-list-splitter: rgba(255, 255, 255, 0.18);
}

.map-list-tile--clickable {
  cursor: pointer;
}

.map-list-tile--clickable:hover {
  border-color: var(--q-secondary);
  box-shadow: 0 0 0 1px var(--q-secondary);
}

.map-list-tile__preview {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem 0.5rem 0.25rem;
}

.map-list-tile__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 0.25rem 0.4rem 0.4rem;
  text-align: center;
}

.map-list-tile__status {
  display: flex;
  justify-content: center;
  margin-bottom: 0.15rem;
  min-height: 1.1rem;
}

.map-list-tile__author {
  font-weight: 600;
  font-size: 0.8rem;
  line-height: 1.25;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  color: var(--map-list-fg);
}

.map-list-tile__capacity {
  margin-top: 0.2rem;
  font-size: 0.7rem;
  line-height: 1.2;
  color: var(--map-list-muted);
}

.map-list-tile__actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  border-top: 1px solid var(--map-list-splitter);
}

.map-list-tile__actions :deep(.q-btn) {
  width: 100%;
  border-radius: 0;
}
</style>
