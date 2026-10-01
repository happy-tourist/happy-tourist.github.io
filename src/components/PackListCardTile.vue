<template>
  <div
    class="pack-list-tile"
    :class="{
      'pack-list-tile--clickable': clickable,
      'pack-list-tile--muted': muted,
      'cascade-gap-outline': cascadeGap,
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
    <div class="pack-list-tile__chrome">
      <div class="pack-list-tile__leading" @click.stop>
        <slot name="leading" />
      </div>
      <div class="pack-list-tile__status">
        <slot name="status" />
      </div>
    </div>

    <div class="pack-list-tile__body">
      <div class="pack-list-tile__title">{{ title }}</div>
      <div v-if="hasDescription" class="pack-list-tile__description">
        {{ description }}
      </div>
      <div v-if="$slots.caption" class="pack-list-tile__caption">
        <slot name="caption" />
      </div>

      <!-- Set preview: non-navigating rows (bubble to whole-card open) — SC-PACK-249. -->
      <div v-if="visibleSets.length" class="pack-list-tile__sets" data-testid="pack-list-sets">
        <div
          v-for="s in visibleSets"
          :key="s.id"
          class="pack-list-tile__set-row"
          :class="{ 'pack-list-tile__set-row--muted': isMutedSet(s) }"
          data-testid="pack-list-set-row"
        >
          <span class="pack-list-tile__lead" aria-hidden="true">
            <span
              class="pack-list-tile__set-icon"
              data-testid="pack-list-set-icon"
              data-icon="task-set-card-tasks"
            />
          </span>
          <span class="pack-list-tile__set-label">{{
            $t('content.taskSetLabel', { n: s.ordinal })
          }}</span>
          <span class="pack-list-tile__set-count">{{ s.taskCount }}</span>
        </div>
        <div
          v-if="overflowCount > 0"
          class="pack-list-tile__overflow"
          data-testid="pack-list-sets-overflow"
        >
          {{ $t('content.packCardSetsOverflow', { k: overflowCount }) }}
        </div>
      </div>
    </div>

    <div v-if="$slots.actions" class="pack-list-tile__actions" @click.stop>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import iconTasks from '@/assets/content/task-set-card-tasks.svg';
import type { PackTaskSetPreview } from '@/stores/content';

const MAX_VISIBLE_SETS = 4;

const props = withDefaults(
  defineProps<{
    /** Truncated primary label (pack title). */
    title: string;
    /** Catalog pack description (truncated). */
    description?: string;
    /**
     * Lightweight set preview from list API (SC-PACK-249/252).
     * Full array; tile shows ≤4 + overflow.
     */
    taskSetsPreview?: PackTaskSetPreview[];
    clickable?: boolean;
    /** Soft-unpublished / gray row chrome (whole card). */
    muted?: boolean;
    /** Editor cascade-gap highlight (SC-PACK-126). */
    cascadeGap?: boolean;
    testId?: string;
  }>(),
  {
    description: '',
    taskSetsPreview: () => [],
    clickable: false,
    muted: false,
    cascadeGap: false,
  },
);

const emit = defineEmits<{
  open: [];
}>();

const iconMaskVars = {
  '--pack-list-icon-tasks': `url(${iconTasks})`,
};

const hasDescription = computed(() => Boolean(props.description?.trim()));

const preview = computed(() => props.taskSetsPreview ?? []);

const visibleSets = computed(() => preview.value.slice(0, MAX_VISIBLE_SETS));

const overflowCount = computed(() => Math.max(0, preview.value.length - MAX_VISIBLE_SETS));

function isMutedSet(s: PackTaskSetPreview): boolean {
  return s.inCatalog === false || s.neverLive === true;
}

function onBodyClick() {
  emit('open');
}
</script>

<style scoped>
/* Catalog pack cards ~180×260 + set preview (SC-PACK-228/249…251). */
.pack-list-tile {
  --pack-list-lead-w: 22px;
  --pack-list-bg: #ffffff;
  --pack-list-fg: #232323;
  --pack-list-muted: #717171;
  --pack-list-set-label: #4a4a4a;
  --pack-list-set-count: #1d1d1d;
  --pack-list-border: rgba(0, 0, 0, 0.12);
  --pack-list-border-hover: #212121;
  --pack-list-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  --pack-list-shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.14);
  --pack-list-splitter: rgba(0, 0, 0, 0.08);
  --pack-list-action-outline: rgba(0, 0, 0, 0.22);
  --pack-list-action-h: 30px;
  --pack-list-revise-fg: #af5a59;
  --pack-list-row-muted-opacity: 0.72;

  position: relative;
  box-sizing: border-box;
  width: 180px;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--pack-list-border);
  background: var(--pack-list-bg);
  color: var(--pack-list-fg);
  box-shadow: var(--pack-list-shadow);
  overflow: hidden;
  flex: 0 0 auto;
}

.body--dark .pack-list-tile {
  --pack-list-bg: #2f2f2f;
  --pack-list-fg: #ffffff;
  --pack-list-muted: #979797;
  --pack-list-set-label: #a2a2a2;
  --pack-list-set-count: #d4d4d4;
  --pack-list-border: rgba(255, 255, 255, 0.2);
  --pack-list-border-hover: #bdbdbd;
  --pack-list-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  --pack-list-shadow-hover: 0 4px 14px rgba(0, 0, 0, 0.5);
  --pack-list-splitter: rgba(255, 255, 255, 0.16);
  --pack-list-action-outline: #aeaeae;
  --pack-list-revise-fg: #aa4a49;
}

.pack-list-tile--clickable {
  cursor: pointer;
}

/* Themed hover: border + soft lift only — no scale / no --q-secondary (SC-PACK-228). */
.pack-list-tile--clickable:hover,
.pack-list-tile--clickable:focus-visible {
  border-color: var(--pack-list-border-hover);
  box-shadow: var(--pack-list-shadow-hover);
  outline: none;
}

.pack-list-tile--muted {
  opacity: 0.72;
  color: var(--pack-list-muted);
}

.pack-list-tile__chrome {
  position: relative;
  flex: 0 0 auto;
  /* Mock / Spec: top pad ~12; reserved band when no badge. */
  min-height: 2rem;
  padding: 12px 12px 0;
}

.pack-list-tile__leading {
  position: absolute;
  /* Spec star TL offset ~8–10 (mock top pad 12). */
  top: 8px;
  left: 8px;
  z-index: 2;
}

/* Star ~16 CSS px (Spec); Quasar sm round otherwise overshoots the band. */
.pack-list-tile__leading :deep(.q-btn) {
  width: 28px;
  height: 28px;
  min-height: 28px;
  padding: 0;
}

.pack-list-tile__leading :deep(.q-icon) {
  font-size: 16px;
}

/* Status badge TR (revise outline on mock; other statuses as page wires). */
.pack-list-tile__status {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  max-width: calc(100% - 40px);
}

/* Revise: red outline + red text, no icon (SC-PACK-251). */
.pack-list-tile__status :deep(.pack-list-status-badge--revise) {
  background: transparent !important;
  color: var(--pack-list-revise-fg) !important;
  border: 1px solid var(--pack-list-revise-fg) !important;
  /* Spec badge 9–10 @ 16px root → 0.625rem. */
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.1;
  min-height: 18px;
  padding: 2px 6px;
  border-radius: 999px;
}

.pack-list-tile__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  /* Spec pad root x 12–16; body pb feeds overflow→divider air ~8–10. */
  padding: 4px 12px 8px;
  text-align: center;
}

.pack-list-tile__title {
  font-weight: 700;
  /* Spec title 15–16 @ 16px root. */
  font-size: 0.9375rem;
  line-height: 1.2;
  text-transform: uppercase;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  color: var(--pack-list-fg);
}

.pack-list-tile__description {
  margin-top: 5px;
  /* Spec subtitle 11–12. */
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.2;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  color: var(--pack-list-muted);
}

.pack-list-tile__caption {
  margin-top: 0.2rem;
  font-size: 0.75rem;
  line-height: 1.2;
  color: var(--pack-list-muted);
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.pack-list-tile__sets {
  /* Spec subtitle→sets ~10–14. */
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  /* Spec set row gap ~8–12. */
  gap: 10px;
  text-align: left;
  min-width: 0;
}

.pack-list-tile__set-row {
  display: grid;
  grid-template-columns: var(--pack-list-lead-w) minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 0.3rem;
  min-height: 18px;
  min-width: 0;
  /* Spec set label/count 11–12. */
  font-size: 0.75rem;
  line-height: 1.2;
}

.pack-list-tile__set-row--muted {
  opacity: var(--pack-list-row-muted-opacity);
}

.pack-list-tile__lead {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--pack-list-lead-w);
  min-width: var(--pack-list-lead-w);
}

.pack-list-tile__set-icon {
  display: inline-block;
  width: 14px;
  height: 14px;
  color: var(--pack-list-muted);
  background-color: currentColor;
  -webkit-mask: var(--pack-list-icon-tasks) center / contain no-repeat;
  mask: var(--pack-list-icon-tasks) center / contain no-repeat;
}

.pack-list-tile__set-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  color: var(--pack-list-set-label);
  font-weight: 400;
}

.pack-list-tile__set-count {
  font-variant-numeric: tabular-nums;
  color: var(--pack-list-set-count);
  font-weight: 600;
  text-align: right;
}

.pack-list-tile__overflow {
  /* Spec sets→overflow ~4–6. */
  margin-top: 4px;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.2;
  color: var(--pack-list-muted);
}

.pack-list-tile__actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  /* Spec stacked action gap ~4–6. */
  gap: 4px;
  /* Body pb 8 + mt 0 → overflow→divider air ~8 (Spec 8–10). */
  margin-top: 0;
  padding: 8px 12px 10px;
  border-top: 1px solid var(--pack-list-splitter);
  box-sizing: border-box;
}

/* Slim outline actions ~28–32 CSS px (same product sense as task-set). */
.pack-list-tile__actions :deep(.q-btn) {
  width: 100%;
  min-height: 28px;
  height: var(--pack-list-action-h);
  max-height: 32px;
  padding: 0 0.35rem;
  /* Spec button 11–12. */
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.2;
  color: var(--pack-list-fg);
  white-space: nowrap;
}

.pack-list-tile__actions :deep(.q-btn .q-icon) {
  font-size: 18px;
}

.pack-list-tile__actions :deep(.q-btn--outline:before) {
  border-color: var(--pack-list-action-outline);
}
</style>
