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

      <!-- Published-only set preview (Decision 11); non-navigating — SC-PACK-249/254. -->
      <div v-if="visibleSets.length" class="pack-list-tile__sets" data-testid="pack-list-sets">
        <!-- Rows in own flex so gap does not inflate sets→overflow (Spec ~4–6). -->
        <div class="pack-list-tile__sets-list">
          <div
            v-for="s in visibleSets"
            :key="s.id"
            class="pack-list-tile__set-row"
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
              $t('content.taskSetLabel', { n: s.displayOrdinal })
            }}</span>
            <span class="pack-list-tile__set-count">{{ s.taskCount }}</span>
          </div>
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
     * Lightweight set preview from list API (SC-PACK-249/252/254).
     * Full array (may include soft-unpub / neverLive); tile filters published-only,
     * remaps display ordinal 1…N, shows ≤4 + overflow.
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
  // Quote url() so Vite-inlined data: SVG URLs stay valid CSS masks (SC-MAP-68).
  '--pack-list-icon-tasks': `url("${iconTasks}")`,
};

const hasDescription = computed(() => Boolean(props.description?.trim()));

/** Published-only rows: inCatalog && !neverLive (Decision 11 / SC-PACK-254). */
const publishedPreview = computed(() =>
  (props.taskSetsPreview ?? []).filter((s) => s.inCatalog === true && s.neverLive !== true),
);

type VisibleSetRow = PackTaskSetPreview & { displayOrdinal: number };

const visibleSets = computed((): VisibleSetRow[] =>
  publishedPreview.value.slice(0, MAX_VISIBLE_SETS).map((s, i) => ({
    ...s,
    displayOrdinal: i + 1,
  })),
);

const overflowCount = computed(() => Math.max(0, publishedPreview.value.length - MAX_VISIBLE_SETS));

function onBodyClick() {
  emit('open');
}
</script>

<style scoped>
/* Catalog pack cards ~180×260 + set preview (SC-PACK-228/249…254).
 * Resting surface/hover/action outline from shared pack-card tokens (SC-PACK-255). */
.pack-list-tile {
  --pack-list-lead-w: 22px;
  --pack-list-revise-fg: #af5a59;
  /* Shared chrome aliases (Decision 13 — not mock list-only dark bg / action outline). */
  --pack-list-bg: var(--pack-card-bg);
  --pack-list-fg: var(--pack-card-fg);
  --pack-list-muted: var(--pack-card-muted);
  --pack-list-border: var(--pack-card-border);
  --pack-list-border-hover: var(--pack-card-border-hover);
  --pack-list-shadow: var(--pack-card-shadow);
  --pack-list-shadow-hover: var(--pack-card-shadow-hover);
  --pack-list-splitter: var(--pack-card-splitter);
  --pack-list-action-h: var(--pack-card-action-h);

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

/* Revise badge only — surface tokens inherit from wrap-grid dark overrides. */
.body--dark .pack-list-tile {
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

/* Soft-unpub pack: same product sense as task-set muted (opacity + dashed). */
.pack-list-tile--muted {
  opacity: 0.72;
  color: var(--pack-list-muted);
  border-style: dashed;
}

.pack-list-tile__chrome {
  position: relative;
  flex: 0 0 auto;
  /* Mock / Spec: top pad ~12; pb keeps status→title air ~8–10. */
  min-height: 2rem;
  padding: 12px 12px 6px;
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
  /* Spec badge 9–10. */
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.1;
  min-height: 18px;
  max-height: 20px;
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
  padding: 2px 12px 8px;
  text-align: center;
}

.pack-list-tile__title {
  font-weight: 700;
  /* Spec title 15–16 (CSS px; lock vs rem/root drift). */
  font-size: 15px;
  line-height: 1.2;
  text-align: center;
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
  font-size: 12px;
  font-weight: 400;
  line-height: 1.2;
  text-align: center;
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
  font-size: 12px;
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
  text-align: left;
  min-width: 0;
}

.pack-list-tile__sets-list {
  display: flex;
  flex-direction: column;
  /* Spec set row gap ~8–12. */
  gap: 10px;
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
  font-size: 12px;
  line-height: 1.2;
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
  /* Decision 12: set.icon.ink = title.fg */
  color: var(--pack-list-fg);
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
  /* Decision 12: set.label.fg = title.fg */
  color: var(--pack-list-fg);
  font-weight: 400;
}

.pack-list-tile__set-count {
  font-variant-numeric: tabular-nums;
  /* Decision 12: set.count.fg = title.fg */
  color: var(--pack-list-fg);
  font-weight: 600;
  text-align: right;
}

.pack-list-tile__overflow {
  /* Spec sets→overflow ~4–6; indent under label column (after lead). */
  margin-top: 5px;
  padding-left: calc(var(--pack-list-lead-w) + 0.3rem);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.2;
  color: var(--pack-list-muted);
}

.pack-list-tile__actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  /* Spec stacked action gap ~4–6 (mid mock rhythm). */
  gap: 5px;
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
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--pack-list-fg);
  white-space: nowrap;
}

.pack-list-tile__actions :deep(.q-btn .q-icon) {
  /* Spec actions ~18; ink = currentColor → title.fg. */
  font-size: 18px;
  color: currentColor;
}

.pack-list-tile__actions :deep(.q-btn--outline:before) {
  /* Action outline = shared card border (Decision 5/13 — not list-only mock outline). */
  border-color: var(--pack-card-border);
}
</style>
