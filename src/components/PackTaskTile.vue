<template>
  <div
    class="pack-task-tile"
    :class="{ 'pack-task-tile--cascade': cascadeGap }"
    :data-testid="testId || 'pack-task-tile'"
  >
    <!-- SC-PACK-278: peek-like dots left + word badge center (not digit outline). -->
    <div class="peek-diff-header pack-task-tile__header" data-testid="pack-task-tile-difficulty">
      <div class="peek-diff-dots" :data-diff="String(difficulty)" aria-hidden="true">
        <span
          v-for="dotIndex in 3"
          :key="`task-tile-dot-${dotIndex}`"
          class="peek-diff-dot"
          :class="{ 'peek-diff-dot--filled': dotIndex <= difficulty }"
        />
      </div>
      <span
        class="peek-diff-badge"
        :data-diff="String(difficulty)"
        :aria-label="difficultyBadgeLabel"
        data-testid="pack-task-tile-diff-badge"
      >
        {{ difficultyBadgeLabel }}
      </span>
    </div>

    <div class="pack-task-tile__question">
      {{ question.trim() || fallbackQuestion }}
    </div>

    <div v-if="filledSlots.length" class="pack-task-tile__slots" data-testid="pack-task-tile-slots">
      <div
        v-for="(slot, i) in filledSlots"
        :key="i"
        class="peek-slot-like peek-slot-like--portrait peek-slot-like--filled pack-task-tile__slot"
        data-testid="peek-slot-like"
      >
        <span class="peek-slot-like__label">{{ slot.content }}</span>
        <span v-if="slot.description" class="peek-slot-like__secondary">
          {{ slot.description }}
        </span>
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

import type { TaskFilledSlot } from '@/lib/taskFilledSlots';
import type { Difficulty } from '@/stores/content';

const props = withDefaults(
  defineProps<{
    question: string;
    difficulty: Difficulty;
    /** Filled answer slots only — empty answerCardId omitted by parents. */
    filledSlots: TaskFilledSlot[];
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

const difficultyBadgeLabel = computed(() => t(`content.difficultyWord.${props.difficulty}`));
</script>

<style scoped>
/* Portrait pack-card family (SC-PACK-223/226/278) — not former 300×200 split. */
.pack-task-tile {
  --pack-tile-edit: rgba(0, 0, 0, 0.72);

  position: relative;
  box-sizing: border-box;
  width: 168px;
  min-height: 206px;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--pack-card-border);
  background: var(--pack-card-bg);
  color: var(--pack-card-fg);
  box-shadow: var(--pack-card-shadow);
  overflow: hidden;
  flex: 0 0 auto;
  padding: 8px 10px 0;
}

.body--dark .pack-task-tile {
  --pack-tile-edit: rgba(255, 255, 255, 0.88);
}

.pack-task-tile--cascade {
  outline: 2px solid var(--q-warning);
  outline-offset: -2px;
}

.pack-task-tile__header {
  flex: 0 0 auto;
  margin-bottom: 10px;
}

.pack-task-tile__question {
  flex: 1 1 auto;
  min-height: 48px;
  overflow-y: auto;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.3;
  word-break: break-word;
  text-align: center;
  color: var(--pack-card-fg);
}

.pack-task-tile__slots {
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  margin-top: 8px;
  padding-bottom: 2px;
}

/* SC-PACK-278: do not flex-shrink portrait minis — overflow-x scrolls instead. */
.pack-task-tile__slot {
  flex-shrink: 0;
  min-width: var(--peek-tile-max-w, 43px);
}

.pack-task-tile__actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: calc(100% + 20px);
  margin: 3px -10px 0;
  border-top: 1px solid var(--pack-card-splitter);
}

.pack-task-tile__edit-btn {
  color: var(--pack-tile-edit);
}

.pack-task-tile__actions :deep(.q-btn) {
  min-height: 28px;
  max-height: 32px;
  height: var(--pack-card-action-h, 30px);
  font-size: 0.78rem;
}
</style>
