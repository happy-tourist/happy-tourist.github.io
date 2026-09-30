<template>
  <div
    class="pack-task-set-tile"
    :class="{
      'pack-task-set-tile--clickable': clickable,
      'pack-task-set-tile--muted': muted,
      'cascade-gap-outline': cascadeGap,
    }"
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
            <!-- Placeholder until task-set-card-tasks.svg arrives (Decision 4). -->
            <q-icon
              name="description"
              size="14px"
              class="pack-task-set-tile__total-icon"
              data-testid="pack-task-set-total-icon"
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
/* Task-set summary chrome (SC-PACK-229/239…244): denser than catalog 150×200. */
.pack-task-set-tile {
  /* Lead = three 6px dots + 2×2px gaps → 22px (Decision 9 / SC-PACK-244). */
  --pack-ts-lead-w: 22px;
  --pack-ts-bg: #ffffff;
  --pack-ts-fg: rgba(0, 0, 0, 0.87);
  --pack-ts-muted: rgba(0, 0, 0, 0.7);
  --pack-ts-border: rgba(0, 0, 0, 0.14);
  /* Pale / low-contrast dividers (light). */
  --pack-ts-splitter: rgba(0, 0, 0, 0.08);
  --pack-ts-dot-1: #43a047;
  --pack-ts-dot-2: #f9a825;
  --pack-ts-dot-3: #e53935;
  --pack-ts-action-h: 30px;

  position: relative;
  box-sizing: border-box;
  width: 156px;
  min-height: 232px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--pack-ts-border);
  background: var(--pack-ts-bg);
  color: var(--pack-ts-fg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  flex: 0 0 auto;
}

.body--dark .pack-task-set-tile {
  --pack-ts-bg: #2a2a2a;
  --pack-ts-fg: rgba(255, 255, 255, 0.92);
  --pack-ts-muted: rgba(255, 255, 255, 0.78);
  --pack-ts-border: rgba(255, 255, 255, 0.22);
  /* Pale divider on dark. */
  --pack-ts-splitter: rgba(255, 255, 255, 0.12);
  --pack-ts-dot-1: #66bb6a;
  --pack-ts-dot-2: #ffca28;
  --pack-ts-dot-3: #ef5350;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}

.pack-task-set-tile--clickable {
  cursor: pointer;
}

/* Existing clickable border affordance only — no hover scale / enlarge polish. */
.pack-task-set-tile--clickable:hover {
  border-color: var(--q-secondary);
  box-shadow: 0 0 0 1px var(--q-secondary);
}

.pack-task-set-tile--muted {
  opacity: 0.72;
  color: var(--pack-ts-muted);
}

/* Reserved top status band — empty space stays here when no badge (SC-PACK-244). */
.pack-task-set-tile__status {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.3rem 0.35rem 0;
  min-height: 1.55rem;
  flex: 0 0 auto;
}

/* Mock: icon + short uppercase label in pill (Material placeholders until SVG). */
.pack-task-set-tile__status :deep(.pack-task-set-status-badge) {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.2;
  padding: 0.12rem 0.4rem;
}

.pack-task-set-tile__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0.1rem 0.45rem 0.25rem;
}

.pack-task-set-tile__title {
  font-weight: 600;
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
  margin-bottom: 0.3rem;
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
  padding: 0.12rem 0;
}

.pack-task-set-tile__lead {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--pack-ts-lead-w);
  min-width: var(--pack-ts-lead-w);
}

.pack-task-set-tile__total-icon {
  color: var(--pack-ts-muted);
}

.pack-task-set-tile__stat-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

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
  margin: 0;
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
  padding: 0.3rem 0.4rem 0.4rem;
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
}
</style>
