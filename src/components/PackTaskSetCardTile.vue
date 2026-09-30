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
          <span class="pack-task-set-tile__stat-label">{{ $t('content.taskSetCardTotal') }}</span>
          <span class="pack-task-set-tile__stat-count">{{ totalCount }}</span>
        </div>
        <div
          v-for="row in difficultyRows"
          :key="row.difficulty"
          class="pack-task-set-tile__stat-row"
          :data-testid="`pack-task-set-diff-${row.difficulty}`"
        >
          <span class="pack-task-set-tile__dots" aria-hidden="true">
            <span
              v-for="i in 3"
              :key="i"
              class="pack-task-set-tile__dot"
              :class="{ 'pack-task-set-tile__dot--filled': i <= row.difficulty }"
            />
          </span>
          <span class="pack-task-set-tile__stat-label">{{ row.label }}</span>
          <span class="pack-task-set-tile__stat-count">{{ row.count }}</span>
        </div>
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
/* Task-set summary chrome (SC-PACK-229/239…242): denser than catalog 150×200. */
.pack-task-set-tile {
  --pack-ts-bg: #ffffff;
  --pack-ts-fg: rgba(0, 0, 0, 0.87);
  --pack-ts-muted: rgba(0, 0, 0, 0.7);
  --pack-ts-border: rgba(0, 0, 0, 0.14);
  --pack-ts-splitter: rgba(0, 0, 0, 0.12);
  --pack-ts-dot: rgba(0, 0, 0, 0.28);
  --pack-ts-dot-filled: rgba(0, 0, 0, 0.78);

  position: relative;
  box-sizing: border-box;
  width: 156px;
  min-height: 228px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--pack-ts-border);
  background: var(--pack-ts-bg);
  color: var(--pack-ts-fg);
  overflow: hidden;
  flex: 0 0 auto;
}

.body--dark .pack-task-set-tile {
  --pack-ts-bg: #2a2a2a;
  --pack-ts-fg: rgba(255, 255, 255, 0.92);
  --pack-ts-muted: rgba(255, 255, 255, 0.78);
  --pack-ts-border: rgba(255, 255, 255, 0.22);
  --pack-ts-splitter: rgba(255, 255, 255, 0.18);
  --pack-ts-dot: rgba(255, 255, 255, 0.28);
  --pack-ts-dot-filled: rgba(255, 255, 255, 0.88);
}

.pack-task-set-tile--clickable {
  cursor: pointer;
}

.pack-task-set-tile--clickable:hover {
  border-color: var(--q-secondary);
  box-shadow: 0 0 0 1px var(--q-secondary);
}

.pack-task-set-tile--muted {
  opacity: 0.72;
  color: var(--pack-ts-muted);
}

.pack-task-set-tile__status {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0.25rem 0.35rem 0;
  min-height: 1.35rem;
  flex: 0 0 auto;
}

.pack-task-set-tile__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0.15rem 0.45rem 0.35rem;
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
  margin-bottom: 0.35rem;
}

.pack-task-set-tile__stats {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  font-size: 0.68rem;
  line-height: 1.2;
  color: var(--pack-ts-muted);
}

.pack-task-set-tile__stat-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.pack-task-set-tile__stat-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pack-task-set-tile__stat-count {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
  color: var(--pack-ts-fg);
  font-weight: 600;
}

.pack-task-set-tile__dots {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
}

.pack-task-set-tile__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--pack-ts-dot);
}

.pack-task-set-tile__dot--filled {
  background: var(--pack-ts-dot-filled);
}

.pack-task-set-tile__actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.2rem;
  padding: 0.3rem 0.35rem 0.4rem;
  border-top: 1px solid var(--pack-ts-splitter);
  box-sizing: border-box;
}

.pack-task-set-tile__actions :deep(.q-btn) {
  width: 100%;
}
</style>
