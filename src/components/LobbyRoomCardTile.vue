<template>
  <div
    class="lobby-room-tile"
    :class="{
      'lobby-room-tile--clickable': clickable && !disabled,
      'lobby-room-tile--disabled': disabled,
    }"
    :style="iconMaskVars"
    :data-test-id="testId"
    :data-testid="testId"
    :role="clickable && !disabled ? 'button' : undefined"
    :tabindex="clickable && !disabled ? 0 : undefined"
    @click="onBodyClick"
    @keydown.enter.prevent="onBodyClick"
    @keydown.space.prevent="onBodyClick"
  >
    <div class="lobby-room-tile__preview">
      <MapGridPreview
        v-if="grid"
        :grid="grid"
        :size="previewSize"
        :aria-label="previewAria"
        data-test-id="lobby-room-map-preview"
        data-testid="lobby-room-map-preview"
      />
      <div
        v-if="$slots.status"
        class="lobby-room-tile__status"
        data-test-id="lobby-room-status"
        data-testid="lobby-room-status"
      >
        <slot name="status" />
      </div>
    </div>

    <div class="lobby-room-tile__body">
      <div class="lobby-room-tile__stats">
        <div
          class="lobby-room-tile__stat-row"
          data-test-id="lobby-room-seats"
          data-testid="lobby-room-seats"
        >
          <span class="lobby-room-tile__lead" aria-hidden="true">
            <span
              class="lobby-room-tile__stat-icon lobby-room-tile__stat-icon--seats"
              data-testid="lobby-room-seats-icon"
              data-icon="lobby-room-card-seats"
            />
          </span>
          <span
            class="lobby-room-tile__stat-label"
            data-test-id="lobby-room-seats-label"
            data-testid="lobby-room-seats-label"
            >{{ $t(seatsLabelKey) }}</span
          >
          <span
            class="lobby-room-tile__stat-count"
            data-test-id="lobby-room-seats-count"
            data-testid="lobby-room-seats-count"
            >{{ $t('lobby.capacity', { seats, maxSeats }) }}</span
          >
        </div>
        <div
          v-if="touristsPerPlayer != null"
          class="lobby-room-tile__divider"
          data-testid="lobby-room-divider-capacity"
          aria-hidden="true"
        />
        <div
          v-if="touristsPerPlayer != null"
          class="lobby-room-tile__stat-row"
          data-test-id="lobby-room-tourists"
          data-testid="lobby-room-tourists"
        >
          <span class="lobby-room-tile__lead" aria-hidden="true">
            <span
              class="lobby-room-tile__stat-icon lobby-room-tile__stat-icon--tourists"
              data-testid="lobby-room-tourists-icon"
              data-icon="map-card-tourists"
            />
          </span>
          <span
            class="lobby-room-tile__stat-label"
            data-test-id="lobby-room-tourists-label"
            data-testid="lobby-room-tourists-label"
            >{{ $t(touristsLabelKey) }}</span
          >
          <span
            class="lobby-room-tile__stat-count"
            data-test-id="lobby-room-tourists-count"
            data-testid="lobby-room-tourists-count"
            >{{ touristsPerPlayer }}</span
          >
        </div>
      </div>

      <div
        v-if="packTitle"
        class="lobby-room-tile__title"
        data-test-id="lobby-room-pack-title"
        data-testid="lobby-room-pack-title"
      >
        {{ packTitle }}
      </div>

      <div
        v-if="visibleSets.length"
        class="lobby-room-tile__sets"
        data-test-id="lobby-room-sets"
        data-testid="lobby-room-sets"
      >
        <div class="lobby-room-tile__sets-list">
          <template v-for="(s, i) in visibleSets" :key="s.taskSetId">
            <div v-if="i > 0" class="lobby-room-tile__divider" aria-hidden="true" />
            <div class="lobby-room-tile__set-row" data-testid="lobby-room-set-row">
              <span class="lobby-room-tile__lead" aria-hidden="true">
                <span
                  class="lobby-room-tile__set-icon"
                  data-testid="lobby-room-set-icon"
                  data-icon="task-set-card-tasks"
                />
              </span>
              <span class="lobby-room-tile__set-label">{{
                $t('lobby.roomCardTaskSetLabel', { n: s.ordinal })
              }}</span>
              <span class="lobby-room-tile__set-count">{{
                s.taskCount == null ? '—' : s.taskCount
              }}</span>
            </div>
          </template>
        </div>
        <div
          v-if="overflowCount > 0"
          class="lobby-room-tile__overflow"
          data-test-id="lobby-room-sets-overflow"
          data-testid="lobby-room-sets-overflow"
        >
          {{ $t('content.packCardSetsOverflow', { k: overflowCount }) }}
        </div>
      </div>
    </div>

    <div
      v-if="$slots.actions"
      class="lobby-room-tile__actions"
      data-test-id="lobby-room-join"
      data-testid="lobby-room-join"
      @click.stop
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import MapGridPreview from '@/components/MapGridPreview.vue';
import iconSeats from '@/assets/content/lobby-room-card-seats.svg';
import iconTourists from '@/assets/content/map-card-tourists.svg';
import iconTasks from '@/assets/content/task-set-card-tasks.svg';
import type { GameRoomTaskSetLabel } from '@/stores/game';

const MAX_VISIBLE_SETS = 4;

const props = withDefaults(
  defineProps<{
    grid?: string;
    seats: number;
    maxSeats: number | string;
    touristsPerPlayer?: number | null;
    packTitle?: string;
    taskSetLabels?: GameRoomTaskSetLabel[];
    previewAria?: string;
    previewSize?: number;
    clickable?: boolean;
    disabled?: boolean;
    testId?: string;
  }>(),
  {
    grid: '',
    touristsPerPlayer: null,
    packTitle: '',
    taskSetLabels: () => [],
    previewAria: '',
    previewSize: 156,
    clickable: false,
    disabled: false,
  },
);

const emit = defineEmits<{
  open: [];
}>();

/** CSS mask URLs — quote url() so Vite data: SVG stays valid (SC-MAP-68). */
const iconMaskVars = {
  '--lobby-room-icon-seats': `url("${iconSeats}")`,
  '--lobby-room-icon-tourists': `url("${iconTourists}")`,
  '--lobby-room-icon-tasks': `url("${iconTasks}")`,
};

/** Russian plural form index: one / few / many (SC-LOBBY-25/36). */
function ruPluralForm(n: number): 'one' | 'few' | 'many' {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return 'one';
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'few';
  }
  return 'many';
}

/** Seats noun key declined by maxSeats (Место / Места / Мест). */
const seatsLabelKey = computed(() => {
  const n = Number(props.maxSeats);
  if (!Number.isFinite(n)) {
    return 'lobby.roomCardSeatsMany';
  }
  const form = ruPluralForm(n);
  if (form === 'one') {
    return 'lobby.roomCardSeatsOne';
  }
  if (form === 'few') {
    return 'lobby.roomCardSeatsFew';
  }
  return 'lobby.roomCardSeatsMany';
});

/** Tourists noun key declined by touristsPerPlayer (Турист / Туриста / Туристов). */
const touristsLabelKey = computed(() => {
  const n = props.touristsPerPlayer;
  if (typeof n !== 'number') {
    return '';
  }
  const form = ruPluralForm(n);
  if (form === 'one') {
    return 'lobby.roomCardTouristsOne';
  }
  if (form === 'few') {
    return 'lobby.roomCardTouristsFew';
  }
  return 'lobby.roomCardTouristsMany';
});

const visibleSets = computed(() =>
  (props.taskSetLabels ?? []).slice(0, MAX_VISIBLE_SETS).map((s, i) => ({
    taskSetId: s.taskSetId,
    taskCount: typeof s.taskCount === 'number' ? s.taskCount : null,
    ordinal: i + 1,
  })),
);

const overflowCount = computed(() =>
  Math.max(0, (props.taskSetLabels ?? []).length - MAX_VISIBLE_SETS),
);

function onBodyClick() {
  if (props.disabled || !props.clickable) {
    return;
  }
  emit('open');
}
</script>

<style scoped>
/* Lobby room card ~180 — shared --pack-card-* chrome (SC-LOBBY-25/33/34/35). */
.lobby-room-tile {
  --lobby-room-lead-w: 22px;
  --lobby-room-row-pad-y: 6px;
  --lobby-room-divider-air: 3px;
  --lobby-room-bg: var(--pack-card-bg);
  --lobby-room-fg: var(--pack-card-fg);
  --lobby-room-muted: var(--pack-card-muted);
  --lobby-room-border: var(--pack-card-border);
  --lobby-room-border-hover: var(--pack-card-border-hover);
  --lobby-room-shadow: var(--pack-card-shadow);
  --lobby-room-shadow-hover: var(--pack-card-shadow-hover);
  --lobby-room-splitter: var(--pack-card-splitter);
  --lobby-room-action-h: var(--pack-card-action-h);

  position: relative;
  box-sizing: border-box;
  width: 180px;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--lobby-room-border);
  background: var(--lobby-room-bg);
  color: var(--lobby-room-fg);
  box-shadow: var(--lobby-room-shadow);
  overflow: hidden;
  flex: 0 0 auto;
}

.lobby-room-tile--clickable {
  cursor: pointer;
}

.lobby-room-tile--disabled {
  cursor: default;
  opacity: 0.72;
  pointer-events: none;
}

.lobby-room-tile--clickable:hover,
.lobby-room-tile--clickable:focus-visible {
  border-color: var(--lobby-room-border-hover);
  box-shadow: var(--lobby-room-shadow-hover);
  outline: none;
}

.lobby-room-tile__preview {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 12px 4px;
  min-height: 156px;
}

.lobby-room-tile__status {
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

.lobby-room-tile__status :deep(.lobby-room-status-badge),
.lobby-room-tile__status :deep(.pack-task-set-status-badge) {
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
  background: transparent;
  color: inherit;
}

.lobby-room-tile__status :deep(.lobby-room-status-badge--muted),
.lobby-room-tile__status :deep(.pack-task-set-status-badge--muted) {
  background: rgba(0, 0, 0, 0.06) !important;
  color: rgba(0, 0, 0, 0.72) !important;
}

.body--dark .lobby-room-tile__status :deep(.lobby-room-status-badge--muted),
.body--dark .lobby-room-tile__status :deep(.pack-task-set-status-badge--muted) {
  background: rgba(255, 255, 255, 0.12) !important;
  color: rgba(255, 255, 255, 0.82) !important;
}

.lobby-room-tile__status :deep(.lobby-room-status-badge--pending),
.lobby-room-tile__status :deep(.pack-task-set-status-badge--pending) {
  background: rgba(249, 168, 37, 0.16) !important;
  color: #f9a825 !important;
}

.body--dark .lobby-room-tile__status :deep(.lobby-room-status-badge--pending),
.body--dark .lobby-room-tile__status :deep(.pack-task-set-status-badge--pending) {
  background: rgba(255, 193, 7, 0.14) !important;
  color: #ffc107 !important;
}

.lobby-room-tile__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 12px 6px;
}

.lobby-room-tile__stats {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  color: var(--lobby-room-fg);
}

.lobby-room-tile__stat-row {
  /* SC-LOBBY-36: same full-width metric grid as set rows (lead | label | count). */
  display: grid;
  grid-template-columns: var(--lobby-room-lead-w) minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 0.3rem;
  width: 100%;
  min-width: 0;
  padding: var(--lobby-room-row-pad-y) 0;
  font-size: 0.68rem;
  line-height: 1.2;
}

.lobby-room-tile__lead {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--lobby-room-lead-w);
  min-width: var(--lobby-room-lead-w);
}

.lobby-room-tile__stat-icon,
.lobby-room-tile__set-icon {
  display: inline-block;
  width: 14px;
  height: 14px;
  background-color: currentColor;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}

.lobby-room-tile__stat-icon--seats {
  width: 16px;
  height: 16px;
  color: var(--lobby-room-fg);
  -webkit-mask-image: var(--lobby-room-icon-seats);
  mask-image: var(--lobby-room-icon-seats);
}

.lobby-room-tile__stat-icon--tourists {
  width: 16px;
  height: 16px;
  color: var(--lobby-room-muted);
  -webkit-mask-image: var(--lobby-room-icon-tourists);
  mask-image: var(--lobby-room-icon-tourists);
}

.lobby-room-tile__set-icon {
  color: var(--lobby-room-fg);
  -webkit-mask-image: var(--lobby-room-icon-tasks);
  mask-image: var(--lobby-room-icon-tasks);
}

.lobby-room-tile__stat-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: var(--lobby-room-muted);
  text-align: left;
}

/* Spec colors: seats → title.fg; tourists labels stay muted. */
.lobby-room-tile__stat-row[data-testid='lobby-room-seats'] .lobby-room-tile__stat-label {
  color: var(--lobby-room-fg);
}

.lobby-room-tile__stat-count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--lobby-room-fg);
  text-align: right;
}

.lobby-room-tile__stat-row[data-testid='lobby-room-seats'] .lobby-room-tile__stat-count {
  font-weight: 700;
}

.lobby-room-tile__divider {
  height: 0;
  border: 0;
  border-top: 1px solid var(--lobby-room-splitter);
  margin: var(--lobby-room-divider-air) 0;
  flex: 0 0 auto;
  width: 100%;
}

.lobby-room-tile__title {
  margin-top: 6px;
  text-align: center;
  text-transform: uppercase;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--lobby-room-fg);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.lobby-room-tile__sets {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
}

.lobby-room-tile__sets-list {
  display: flex;
  flex-direction: column;
}

.lobby-room-tile__set-row {
  display: grid;
  grid-template-columns: var(--lobby-room-lead-w) minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 0.3rem;
  min-width: 0;
  padding: var(--lobby-room-row-pad-y) 0;
  font-size: 0.68rem;
  line-height: 1.2;
}

.lobby-room-tile__set-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 400;
  /* Pack/task-set chrome (Decision 12): set.label.fg = title.fg, not muted. */
  color: var(--lobby-room-fg);
  text-align: left;
}

.lobby-room-tile__set-count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--lobby-room-fg);
  text-align: right;
}

.lobby-room-tile__overflow {
  margin-top: 5px;
  padding-left: calc(var(--lobby-room-lead-w) + 0.3rem);
  font-size: 0.62rem;
  font-weight: 400;
  line-height: 1.2;
  color: var(--lobby-room-muted);
}

.lobby-room-tile__actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.2rem;
  margin-top: var(--lobby-room-divider-air);
  padding: 3px 8px 8px;
  border-top: 1px solid var(--lobby-room-splitter);
  box-sizing: border-box;
}

.lobby-room-tile__actions :deep(.q-btn) {
  width: 100%;
  min-height: 28px;
  height: var(--lobby-room-action-h);
  max-height: 32px;
  padding: 0 0.4rem;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.2;
  color: var(--lobby-room-fg);
  white-space: nowrap;
}

.lobby-room-tile__actions :deep(.q-btn--outline:before) {
  border-color: var(--lobby-room-border);
}
</style>
