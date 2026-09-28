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

    <div v-if="editable" class="pack-task-tile__actions" @click.stop>
      <q-btn
        flat
        dense
        round
        size="sm"
        icon="edit"
        :aria-label="$t('content.editTask')"
        data-testid="pack-task-tile-edit"
        @click="emit('edit')"
      />
      <q-btn
        flat
        dense
        round
        size="sm"
        icon="delete"
        color="negative"
        :aria-label="$t('content.deleteTask')"
        data-testid="pack-task-tile-delete"
        @click="emit('delete')"
      />
    </div>

    <div class="pack-task-tile__question">
      {{ question.trim() || fallbackQuestion }}
    </div>
    <div class="pack-task-tile__slots">
      <div v-if="slotLabels.length" class="pack-task-tile__slot-list">
        <div v-for="(label, i) in slotLabels" :key="i" class="pack-task-tile__slot">
          {{ label }}
        </div>
      </div>
      <div v-else class="text-muted">{{ $t('content.slotEmpty') }}</div>
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
.pack-task-tile {
  position: relative;
  box-sizing: border-box;
  width: 11rem;
  min-height: 12rem;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: var(--q-card-background, #fff);
  overflow: hidden;
  flex: 0 0 auto;
}

.body--dark .pack-task-tile {
  border-color: rgba(255, 255, 255, 0.18);
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
  max-width: calc(100% - 4.5rem);
  overflow: hidden;
  text-overflow: ellipsis;
}

.pack-task-tile__actions {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 2;
  display: flex;
  gap: 0;
}

.pack-task-tile__question {
  flex: 1 1 50%;
  padding: 1.85rem 0.65rem 0.55rem;
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.25;
  word-break: break-word;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.pack-task-tile__slots {
  flex: 0 1 50%;
  max-height: 5.5rem;
  overflow-y: auto;
  padding: 0.45rem 0.65rem 0.55rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.78rem;
  line-height: 1.3;
}

.body--dark .pack-task-tile__slots {
  border-top-color: rgba(255, 255, 255, 0.12);
}

.pack-task-tile__slot-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.pack-task-tile__slot {
  word-break: break-word;
}
</style>
