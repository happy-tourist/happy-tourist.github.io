<template>
  <div
    class="pack-task-set-tile"
    :class="{
      'pack-task-set-tile--clickable': clickable,
      'pack-task-set-tile--muted': muted,
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
    <div class="pack-task-set-tile__status">
      <slot name="status" />
    </div>

    <div class="pack-task-set-tile__body">
      <div class="pack-task-set-tile__title">{{ title }}</div>

      <div class="pack-task-set-tile__stats" data-testid="pack-task-set-stats">
        <div class="pack-task-set-tile__stat-row" data-testid="pack-task-set-total">
          <span class="pack-task-set-tile__lead" aria-hidden="true">
            <!-- Custom SVG via CSS mask + currentColor (Decision 12 / SC-PACK-248). -->
            <span
              class="pack-task-set-tile__total-icon"
              data-testid="pack-task-set-total-icon"
              data-icon="task-set-card-tasks"
            />
          </span>
          <span class="pack-task-set-tile__stat-label">{{ $t('content.taskSetCardTotal') }}</span>
          <span class="pack-task-set-tile__stat-count">{{ totalCount }}</span>
        </div>
        <div
          class="pack-task-set-tile__divider"
          data-testid="pack-task-set-divider-total"
          aria-hidden="true"
        />
        <template v-for="(row, idx) in difficultyRows" :key="row.difficulty">
          <div
            class="pack-task-set-tile__stat-row"
            :data-testid="`pack-task-set-diff-${row.difficulty}`"
          >
            <span class="pack-task-set-tile__lead" aria-hidden="true">
              <span class="pack-task-set-tile__dots" :data-diff="row.difficulty">
                <span
                  v-for="i in 3"
                  :key="i"
                  class="pack-task-set-tile__dot"
                  :class="{ 'pack-task-set-tile__dot--filled': i <= row.difficulty }"
                />
              </span>
            </span>
            <span class="pack-task-set-tile__stat-label">{{ row.label }}</span>
            <span class="pack-task-set-tile__stat-count">{{ row.count }}</span>
          </div>
          <div
            v-if="idx < difficultyRows.length - 1"
            class="pack-task-set-tile__divider"
            :data-testid="`pack-task-set-divider-diff-${row.difficulty}`"
            aria-hidden="true"
          />
        </template>
      </div>
    </div>

    <div v-if="$slots.actions" class="pack-task-set-tile__actions" @click.stop>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import iconTasks from '@/assets/content/task-set-card-tasks.svg';
import iconBadgeDraft from '@/assets/content/task-set-badge-draft.svg';
import iconBadgePending from '@/assets/content/task-set-badge-pending.svg';
import iconBadgeRevise from '@/assets/content/task-set-badge-revise.svg';
import iconBadgeUnpublished from '@/assets/content/task-set-badge-unpublished.svg';

const props = withDefaults(
  defineProps<{
    /** Truncated task-set label (no author). */
    title: string;
    totalCount: number;
    countDiff1?: number;
    countDiff2?: number;
    countDiff3?: number;
    clickable?: boolean;
    /** Soft-unpublished / gray row chrome. */
    muted?: boolean;
    /** Editor cascade-gap highlight (SC-PACK-126). */
    cascadeGap?: boolean;
    testId?: string;
  }>(),
  {
    countDiff1: 0,
    countDiff2: 0,
    countDiff3: 0,
    clickable: false,
    muted: false,
    cascadeGap: false,
  },
);

const emit = defineEmits<{
  open: [];
}>();

const { t } = useI18n();

/** CSS mask URLs for total-row + status badge icons (ink via currentColor). */
const iconMaskVars = {
  '--pack-ts-icon-tasks': `url(${iconTasks})`,
  '--pack-ts-icon-revise': `url(${iconBadgeRevise})`,
  '--pack-ts-icon-pending': `url(${iconBadgePending})`,
  '--pack-ts-icon-unpublished': `url(${iconBadgeUnpublished})`,
  '--pack-ts-icon-draft': `url(${iconBadgeDraft})`,
};

const difficultyRows = computed(() => [
  {
    difficulty: 1 as const,
    label: t('content.taskSetCardDiff1'),
    count: props.countDiff1,
  },
  {
    difficulty: 2 as const,
    label: t('content.taskSetCardDiff2'),
    count: props.countDiff2,
  },
  {
    difficulty: 3 as const,
    label: t('content.taskSetCardDiff3'),
    count: props.countDiff3,
  },
]);

function onBodyClick() {
  emit('open');
}
</script>

<style scoped>
/* Task-set summary chrome (SC-PACK-229/239…248): denser than catalog list tile.
 * Resting surface/hover/action-h from shared pack-card tokens on the wrap grid (SC-PACK-255). */
.pack-task-set-tile {
  /* Lead = three 6px dots + 2×2px gaps → 22px (Decision 9 / SC-PACK-244). */
  --pack-ts-lead-w: 22px;
  /* Shared chrome aliases (visual no-op vs former local --pack-ts-* surface). */
  --pack-ts-bg: var(--pack-card-bg);
  --pack-ts-fg: var(--pack-card-fg);
  --pack-ts-muted: var(--pack-card-muted);
  --pack-ts-border: var(--pack-card-border);
  --pack-ts-border-hover: var(--pack-card-border-hover);
  --pack-ts-shadow: var(--pack-card-shadow);
  --pack-ts-shadow-hover: var(--pack-card-shadow-hover);
  --pack-ts-splitter: var(--pack-card-splitter);
  --pack-ts-action-h: var(--pack-card-action-h);
  --pack-ts-dot-1: #43a047;
  --pack-ts-dot-2: #f9a825;
  --pack-ts-dot-3: #e53935;
  /* Spacing retune (SC-PACK-247 / Decision 11): title→stats ~7; divider air ~4–6 total. */
  --pack-ts-title-gap: 7px;
  --pack-ts-row-pad-y: 6px;
  --pack-ts-divider-air: 3px;

  position: relative;
  box-sizing: border-box;
  width: 156px;
  /* Resting mock ≈206 CSS px; roomier rhythm MAY grow a few px above. */
  min-height: 206px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--pack-ts-border);
  background: var(--pack-ts-bg);
  color: var(--pack-ts-fg);
  box-shadow: var(--pack-ts-shadow);
  overflow: hidden;
  flex: 0 0 auto;
}

/* Difficulty dots only — surface tokens inherit from wrap-grid dark overrides. */
.body--dark .pack-task-set-tile {
  --pack-ts-dot-1: #66bb6a;
  --pack-ts-dot-2: #ffca28;
  --pack-ts-dot-3: #ef5350;
}

.pack-task-set-tile--clickable {
  cursor: pointer;
}

/* Themed hover: border + soft lift only — no scale / no icon recolor (SC-PACK-246). */
.pack-task-set-tile--clickable:hover,
.pack-task-set-tile--clickable:focus-visible {
  border-color: var(--pack-ts-border-hover);
  box-shadow: var(--pack-ts-shadow-hover);
  outline: none;
}

/* Soft-unpublish (СНЯТО): Spec opacity 0.72 + mock dashed outline. */
.pack-task-set-tile--muted {
  opacity: 0.72;
  color: var(--pack-ts-muted);
  border-style: dashed;
}

/* Reserved top status band — empty space stays here when no badge (SC-PACK-244).
 * pad-bottom 7 → status→title air ~6–8 CSS px (SC-PACK-247 / Decision 11). */
.pack-task-set-tile__status {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 10px 7px;
  min-height: 22px;
  flex: 0 0 auto;
}

/*
 * Soft muted pills (not Quasar solid grey/warning fills) — mock light grey /
 * dark soft chrome; pending = gold/amber ink + soft tint (Decision 4 / mock).
 */
.pack-task-set-tile__status :deep(.pack-task-set-status-badge) {
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

.pack-task-set-tile__status :deep(.pack-task-set-status-badge--muted) {
  background: rgba(0, 0, 0, 0.06) !important;
  color: rgba(0, 0, 0, 0.72) !important;
}

.body--dark .pack-task-set-tile__status :deep(.pack-task-set-status-badge--muted) {
  background: rgba(255, 255, 255, 0.12) !important;
  color: rgba(255, 255, 255, 0.82) !important;
}

.pack-task-set-tile__status :deep(.pack-task-set-status-badge--pending) {
  background: rgba(249, 168, 37, 0.16) !important;
  color: #f9a825 !important;
}

.body--dark .pack-task-set-tile__status :deep(.pack-task-set-status-badge--pending) {
  background: rgba(255, 193, 7, 0.14) !important;
  color: #ffc107 !important;
}

/* Badge icons: ~12px CSS mask; ink = badge currentColor (muted / pending) — SC-PACK-248. */
.pack-task-set-tile__status :deep(.pack-task-set-status-icon) {
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

.pack-task-set-tile__status :deep(.pack-task-set-status-icon--revise) {
  -webkit-mask-image: var(--pack-ts-icon-revise);
  mask-image: var(--pack-ts-icon-revise);
}

.pack-task-set-tile__status :deep(.pack-task-set-status-icon--pending) {
  -webkit-mask-image: var(--pack-ts-icon-pending);
  mask-image: var(--pack-ts-icon-pending);
}

.pack-task-set-tile__status :deep(.pack-task-set-status-icon--unpublished) {
  -webkit-mask-image: var(--pack-ts-icon-unpublished);
  mask-image: var(--pack-ts-icon-unpublished);
}

.pack-task-set-tile__status :deep(.pack-task-set-status-icon--draft) {
  -webkit-mask-image: var(--pack-ts-icon-draft);
  mask-image: var(--pack-ts-icon-draft);
}

.pack-task-set-tile__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 12px 6px;
}

.pack-task-set-tile__title {
  font-weight: 700;
  font-size: 0.78rem;
  line-height: 1.25;
  text-align: center;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  color: var(--pack-ts-fg);
  margin-bottom: var(--pack-ts-title-gap);
  flex: 0 0 auto;
}

.pack-task-set-tile__stats {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  justify-content: center;
  gap: 0;
  font-size: 0.68rem;
  line-height: 1.2;
  color: var(--pack-ts-muted);
  min-height: 0;
}

.pack-task-set-tile__stat-row {
  display: grid;
  grid-template-columns: var(--pack-ts-lead-w) minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 0.3rem;
  min-width: 0;
  padding: var(--pack-ts-row-pad-y) 0;
}

.pack-task-set-tile__lead {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--pack-ts-lead-w);
  min-width: var(--pack-ts-lead-w);
}

/* Total-row icon: 14×14 CSS mask; ink = stats.icon.ink (--pack-ts-muted) — SC-PACK-248. */
.pack-task-set-tile__total-icon {
  display: inline-block;
  width: 14px;
  height: 14px;
  color: var(--pack-ts-muted);
  background-color: currentColor;
  -webkit-mask: var(--pack-ts-icon-tasks) center / contain no-repeat;
  mask: var(--pack-ts-icon-tasks) center / contain no-repeat;
}

.pack-task-set-tile__stat-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

/* Counts use title.fg (stronger than labels) — mock light/dark; Visual Spec count.fg. */
.pack-task-set-tile__stat-count {
  font-variant-numeric: tabular-nums;
  color: var(--pack-ts-fg);
  font-weight: 600;
  text-align: right;
}

/* Pale 1px dividers: after total, between every diff row, above actions. */
.pack-task-set-tile__divider {
  height: 0;
  border: 0;
  border-top: 1px solid var(--pack-ts-splitter);
  /* Air row↔divider: ~4–6 total = 2 × --pack-ts-divider-air (SC-PACK-247). */
  margin: var(--pack-ts-divider-air) 0;
  flex: 0 0 auto;
  width: 100%;
}

.pack-task-set-tile__dots {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  --pack-ts-dot-color: var(--pack-ts-dot-1);
}

.pack-task-set-tile__dots[data-diff='2'] {
  --pack-ts-dot-color: var(--pack-ts-dot-2);
}

.pack-task-set-tile__dots[data-diff='3'] {
  --pack-ts-dot-color: var(--pack-ts-dot-3);
}

.pack-task-set-tile__dot {
  box-sizing: border-box;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--pack-ts-dot-color);
}

.pack-task-set-tile__dot--filled {
  background: var(--pack-ts-dot-color);
  border-color: var(--pack-ts-dot-color);
}

.pack-task-set-tile__actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.2rem;
  /* Air around actions divider: --pack-ts-divider-air above + below border (SC-PACK-247). */
  margin-top: var(--pack-ts-divider-air);
  padding: var(--pack-ts-divider-air) 8px 8px;
  border-top: 1px solid var(--pack-ts-splitter);
  box-sizing: border-box;
}

/* Slim outline actions ~28–32 CSS px (SC-PACK-241 / Decision 5). */
.pack-task-set-tile__actions :deep(.q-btn) {
  width: 100%;
  min-height: 28px;
  height: var(--pack-ts-action-h);
  max-height: 32px;
  padding: 0 0.4rem;
  font-size: 0.72rem;
  /* Mock: pale outline + dark label (not brand primary tint). */
  color: var(--pack-ts-fg);
}

.pack-task-set-tile__actions :deep(.q-btn--outline:before) {
  border-color: var(--pack-ts-border);
}
</style>
