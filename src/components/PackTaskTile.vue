<template>
  <div
    class="pack-task-tile"
    :class="{ 'pack-task-tile--cascade': cascadeGap }"
    :data-testid="testId || 'pack-task-tile'"
  >
    <q-badge
      class="pack-task-tile__difficulty"
      color="primary"
      outline
      :aria-label="difficultyLabel"
      data-testid="pack-task-tile-difficulty"
    >
      {{ difficulty }}
      <q-tooltip>{{ difficultyLabel }}</q-tooltip>
    </q-badge>

    <div class="pack-task-tile__body">
      <div class="pack-task-tile__question">
        {{ question.trim() || fallbackQuestion }}
      </div>
      <div class="pack-task-tile__slots">
        <div v-if="slotLabels.length" class="pack-task-tile__slot-list">
          <q-chip v-for="(label, i) in slotLabels" :key="i" dense class="pack-task-tile__slot">
            {{ label }}
          </q-chip>
        </div>
        <div v-else class="text-muted">{{ $t('content.slotEmpty') }}</div>
      </div>
    </div>

    <div v-if="editable" class="pack-task-tile__actions" @click.stop>
      <q-btn
        flat
        dense
        no-caps
        class="full-width pack-task-tile__edit-btn"
        :label="$t('content.editTask')"
        data-testid="pack-task-tile-edit"
        @click="emit('edit')"
      />
      <q-btn
        flat
        dense
        no-caps
        class="full-width"
        color="negative"
        :label="$t('content.deleteTask')"
        data-testid="pack-task-tile-delete"
        @click="emit('delete')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Difficulty } from '@/stores/content';

const props = withDefaults(
  defineProps<{
    question: string;
    difficulty: Difficulty;
    /** Resolved answer-card content texts for slots (empty string → slotEmpty). */
    slotLabels: string[];
    editable?: boolean;
    cascadeGap?: boolean;
    /** Optional override when question is blank (e.g. «Задание N»). */
    fallbackQuestion?: string;
    testId?: string;
  }>(),
  {
    editable: false,
    cascadeGap: false,
    fallbackQuestion: '',
  },
);

const emit = defineEmits<{
  edit: [];
  delete: [];
}>();

const { t } = useI18n();

const difficultyLabel = computed(() => t(`content.difficulty.${props.difficulty}`));
</script>

<style scoped>
/* Fixed 300×200 + vertical split + chip row (D12′/D19 / SC-PACK-223/226/227). */
.pack-task-tile {
  --pack-tile-bg: #ffffff;
  --pack-tile-fg: rgba(0, 0, 0, 0.87);
  --pack-tile-muted: rgba(0, 0, 0, 0.7);
  --pack-tile-border: rgba(0, 0, 0, 0.14);
  --pack-tile-splitter: rgba(0, 0, 0, 0.12);
  --pack-tile-edit: rgba(0, 0, 0, 0.72);
  --pack-tile-chip-bg: rgba(0, 0, 0, 0.08);

  position: relative;
  box-sizing: border-box;
  width: 300px;
  height: 200px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--pack-tile-border);
  background: var(--pack-tile-bg);
  color: var(--pack-tile-fg);
  overflow: hidden;
  flex: 0 0 auto;
}

.body--dark .pack-task-tile {
  --pack-tile-bg: #2a2a2a;
  --pack-tile-fg: rgba(255, 255, 255, 0.92);
  --pack-tile-muted: rgba(255, 255, 255, 0.78);
  --pack-tile-border: rgba(255, 255, 255, 0.22);
  --pack-tile-splitter: rgba(255, 255, 255, 0.18);
  --pack-tile-edit: rgba(255, 255, 255, 0.88);
  --pack-tile-chip-bg: rgba(255, 255, 255, 0.12);
}

.pack-task-tile--cascade {
  outline: 2px solid var(--q-warning);
  outline-offset: -2px;
}

.pack-task-tile__difficulty {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  max-width: calc(100% - 0.75rem);
  overflow: hidden;
  text-overflow: ellipsis;
}

.pack-task-tile__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: row;
}

.pack-task-tile__actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  border-top: 1px solid var(--pack-tile-splitter);
}

.pack-task-tile__edit-btn {
  color: var(--pack-tile-edit);
}

.pack-task-tile__question {
  flex: 1 1 50%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 1.75rem 0.5rem 0.55rem;
  font-weight: 600;
  font-size: 1.75rem;
  line-height: 1.2;
  word-break: break-word;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--pack-tile-fg);
}

.pack-task-tile__slots {
  flex: 1 1 50%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 1.75rem 0.5rem 0.55rem;
  border-left: 1px solid var(--pack-tile-splitter);
  font-size: 1.55rem;
  line-height: 1.25;
  color: var(--pack-tile-muted);
  display: flex;
  align-items: center;
}

.pack-task-tile__slot-list {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-content: flex-start;
  width: 100%;
}

.pack-task-tile__slot {
  font-size: 1.1rem;
  background: var(--pack-tile-chip-bg);
  color: var(--pack-tile-fg);
  word-break: break-word;
}
</style>
