<template>
  <div
    class="map-list-tile"
    :class="{
      'map-list-tile--clickable': clickable,
      'map-list-tile--muted': muted,
    }"
    :style="iconMaskVars"
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
      <div
        v-if="$slots.status"
        class="map-list-tile__status"
        data-test-id="map-list-status"
        data-testid="map-list-status"
      >
        <slot name="status" />
      </div>
    </div>

    <div class="map-list-tile__body">
      <div class="map-list-tile__stats" data-testid="map-list-stats">
        <div class="map-list-tile__stat-row" data-testid="map-list-players">
          <span class="map-list-tile__lead" aria-hidden="true">
            <span
              class="map-list-tile__stat-icon map-list-tile__stat-icon--players"
              data-testid="map-list-players-icon"
              data-icon="map-card-players"
            />
          </span>
          <span class="map-list-tile__stat-label">{{ $t('maps.mapCardPlayers') }}</span>
          <span class="map-list-tile__stat-count">{{ players }}</span>
        </div>
        <div
          class="map-list-tile__divider"
          data-testid="map-list-divider-stats"
          aria-hidden="true"
        />
        <div class="map-list-tile__stat-row" data-testid="map-list-tourists">
          <span class="map-list-tile__lead" aria-hidden="true">
            <span
              class="map-list-tile__stat-icon map-list-tile__stat-icon--tourists"
              data-testid="map-list-tourists-icon"
              data-icon="map-card-tourists"
            />
          </span>
          <span class="map-list-tile__stat-label">{{ $t('maps.mapCardTourists') }}</span>
          <span class="map-list-tile__stat-count">{{ touristsPerPlayer }}</span>
        </div>
      </div>
    </div>

    <div v-if="$slots.actions" class="map-list-tile__actions" @click.stop>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import MapGridPreview from '@/components/MapGridPreview.vue';

import iconPlayers from '@/assets/content/map-card-players.svg';
import iconTourists from '@/assets/content/map-card-tourists.svg';
import iconBadgeDraft from '@/assets/content/task-set-badge-draft.svg';
import iconBadgePending from '@/assets/content/task-set-badge-pending.svg';
import iconBadgeUnpublished from '@/assets/content/task-set-badge-unpublished.svg';

withDefaults(
  defineProps<{
    grid: string;
    players: number;
    touristsPerPlayer: number;
    previewAria?: string;
    previewSize?: number;
    clickable?: boolean;
    /** Soft-unpublished chrome (opacity 0.72 + dashed). */
    muted?: boolean;
    testId?: string;
  }>(),
  {
    previewAria: '',
    previewSize: 140,
    clickable: false,
    muted: false,
  },
);

const emit = defineEmits<{
  open: [];
}>();

/** CSS mask URLs for capacity leads + status badge icons (ink via currentColor). */
const iconMaskVars = {
  '--map-list-icon-players': `url(${iconPlayers})`,
  '--map-list-icon-tourists': `url(${iconTourists})`,
  '--map-list-icon-pending': `url(${iconBadgePending})`,
  '--map-list-icon-unpublished': `url(${iconBadgeUnpublished})`,
  '--map-list-icon-draft': `url(${iconBadgeDraft})`,
};

function onBodyClick() {
  emit('open');
}
</script>

<style scoped>
/* SC-MAP-55/66/67: map list card — preview + capacity rows + pack-card chrome. */
.map-list-tile {
  --map-list-lead-w: 22px;
  --map-list-revise-fg: #af5a59;
  --map-list-row-pad-y: 6px;
  --map-list-divider-air: 3px;
  /* Shared chrome aliases from host `.pack-card-grid` (SC-PACK-255 / SC-MAP-67). */
  --map-list-bg: var(--pack-card-bg);
  --map-list-fg: var(--pack-card-fg);
  --map-list-muted: var(--pack-card-muted);
  --map-list-border: var(--pack-card-border);
  --map-list-border-hover: var(--pack-card-border-hover);
  --map-list-shadow: var(--pack-card-shadow);
  --map-list-shadow-hover: var(--pack-card-shadow-hover);
  --map-list-splitter: var(--pack-card-splitter);
  --map-list-action-h: var(--pack-card-action-h);

  position: relative;
  box-sizing: border-box;
  width: 180px;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--map-list-border);
  background: var(--map-list-bg);
  color: var(--map-list-fg);
  box-shadow: var(--map-list-shadow);
  overflow: hidden;
  flex: 0 0 auto;
}

.body--dark .map-list-tile {
  --map-list-revise-fg: #aa4a49;
}

.map-list-tile--clickable {
  cursor: pointer;
}

/* Hover: border + soft lift only — no scale / no --q-secondary (SC-MAP-67). */
.map-list-tile--clickable:hover,
.map-list-tile--clickable:focus-visible {
  border-color: var(--map-list-border-hover);
  box-shadow: var(--map-list-shadow-hover);
  outline: none;
}

/* Soft-unpublish (СНЯТО): opacity 0.72 + dashed outline. */
.map-list-tile--muted {
  opacity: 0.72;
  color: var(--map-list-muted);
  border-style: dashed;
}

.map-list-tile__preview {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 12px 4px;
}

/* Status overlay: absolute, horizontally centered near top of preview (SC-MAP-66). */
.map-list-tile__status {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: calc(100% - 16px);
  pointer-events: none;
}

/*
 * Soft muted / pending pills + revise red outline (pack/task-set product sense).
 * Pages wire short `content.taskSetCardBadge.*` into #status.
 */
.map-list-tile__status :deep(.map-list-status-badge),
.map-list-tile__status :deep(.pack-task-set-status-badge) {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.2;
  min-height: 18px;
  padding: 2px 6px;
  border-radius: 999px;
}

.map-list-tile__status :deep(.map-list-status-badge--muted),
.map-list-tile__status :deep(.pack-task-set-status-badge--muted) {
  background: rgba(0, 0, 0, 0.06) !important;
  color: rgba(0, 0, 0, 0.72) !important;
}

.body--dark .map-list-tile__status :deep(.map-list-status-badge--muted),
.body--dark .map-list-tile__status :deep(.pack-task-set-status-badge--muted) {
  background: rgba(255, 255, 255, 0.12) !important;
  color: rgba(255, 255, 255, 0.82) !important;
}

.map-list-tile__status :deep(.map-list-status-badge--pending),
.map-list-tile__status :deep(.pack-task-set-status-badge--pending) {
  background: rgba(249, 168, 37, 0.16) !important;
  color: #f9a825 !important;
}

.body--dark .map-list-tile__status :deep(.map-list-status-badge--pending),
.body--dark .map-list-tile__status :deep(.pack-task-set-status-badge--pending) {
  background: rgba(255, 193, 7, 0.14) !important;
  color: #ffc107 !important;
}

/* Revise: red outline + text, no icon (catalog PackListCardTile sense). */
.map-list-tile__status :deep(.map-list-status-badge--revise),
.map-list-tile__status :deep(.pack-list-status-badge--revise) {
  display: inline-flex;
  align-items: center;
  background: transparent !important;
  color: var(--map-list-revise-fg) !important;
  border: 1px solid var(--map-list-revise-fg) !important;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
  min-height: 18px;
  padding: 2px 6px;
  border-radius: 999px;
}

.map-list-tile__status :deep(.map-list-status-icon),
.map-list-tile__status :deep(.pack-task-set-status-icon) {
  display: inline-block;
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  background-color: currentColor;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}

.map-list-tile__status :deep(.map-list-status-icon--pending),
.map-list-tile__status :deep(.pack-task-set-status-icon--pending) {
  -webkit-mask-image: var(--map-list-icon-pending);
  mask-image: var(--map-list-icon-pending);
}

.map-list-tile__status :deep(.map-list-status-icon--unpublished),
.map-list-tile__status :deep(.pack-task-set-status-icon--unpublished) {
  -webkit-mask-image: var(--map-list-icon-unpublished);
  mask-image: var(--map-list-icon-unpublished);
}

.map-list-tile__status :deep(.map-list-status-icon--draft),
.map-list-tile__status :deep(.pack-task-set-status-icon--draft) {
  -webkit-mask-image: var(--map-list-icon-draft);
  mask-image: var(--map-list-icon-draft);
}

.map-list-tile__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 12px 6px;
}

.map-list-tile__stats {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  justify-content: center;
  gap: 0;
  font-size: 0.68rem;
  line-height: 1.2;
  color: var(--map-list-muted);
  min-height: 0;
}

.map-list-tile__stat-row {
  display: grid;
  grid-template-columns: var(--map-list-lead-w) minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 0.3rem;
  min-width: 0;
  padding: var(--map-list-row-pad-y) 0;
}

.map-list-tile__lead {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--map-list-lead-w);
  min-width: var(--map-list-lead-w);
}

.map-list-tile__stat-icon {
  display: inline-block;
  width: 14px;
  height: 14px;
  color: var(--map-list-muted);
  background-color: currentColor;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}

.map-list-tile__stat-icon--players {
  -webkit-mask-image: var(--map-list-icon-players);
  mask-image: var(--map-list-icon-players);
}

.map-list-tile__stat-icon--tourists {
  -webkit-mask-image: var(--map-list-icon-tourists);
  mask-image: var(--map-list-icon-tourists);
}

.map-list-tile__stat-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.map-list-tile__stat-count {
  font-variant-numeric: tabular-nums;
  color: var(--map-list-fg);
  font-weight: 600;
  text-align: right;
}

.map-list-tile__divider {
  height: 0;
  border: 0;
  border-top: 1px solid var(--map-list-splitter);
  margin: var(--map-list-divider-air) 0;
  flex: 0 0 auto;
  width: 100%;
}

.map-list-tile__actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.2rem;
  margin-top: var(--map-list-divider-air);
  /* Spec pad ~3/8/8 (task-set rhythm). */
  padding: 3px 8px 8px;
  border-top: 1px solid var(--map-list-splitter);
  box-sizing: border-box;
}

/* Slim outline actions ~28–32 CSS px (SC-MAP-67 / Visual Spec). */
.map-list-tile__actions :deep(.q-btn) {
  width: 100%;
  min-height: 28px;
  height: var(--map-list-action-h);
  max-height: 32px;
  padding: 0 0.4rem;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.2;
  color: var(--map-list-fg);
  white-space: nowrap;
}

.map-list-tile__actions :deep(.q-btn .q-icon) {
  /* Spec action icon ~18; ink = currentColor → action.fg (not shrunk by btn rem). */
  font-size: 18px;
  color: currentColor;
}

.map-list-tile__actions :deep(.q-btn--outline:before) {
  border-color: var(--map-list-border);
}
</style>
