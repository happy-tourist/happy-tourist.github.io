<template>
  <div
    class="pack-answer-tile"
    :class="{
      'pack-answer-tile--short': !hasDescription,
      'pack-answer-tile--selectable': selectable && !disabled,
      'pack-answer-tile--selected': selected,
      'pack-answer-tile--disabled': disabled,
    }"
    :data-testid="testId || 'pack-answer-tile'"
    :role="selectable ? 'button' : undefined"
    :tabindex="selectable && !disabled ? 0 : undefined"
    :aria-pressed="selectable ? selected : undefined"
    @click="onBodyClick"
    @keydown.enter.prevent="onBodyClick"
    @keydown.space.prevent="onBodyClick"
  >
    <div class="pack-answer-tile__body">
      <div class="pack-answer-tile__content">
        {{ content.trim() || $t('content.untitled') }}
      </div>
      <div v-if="hasDescription" class="pack-answer-tile__description">
        {{ description }}
      </div>
    </div>

    <div v-if="editable" class="pack-answer-tile__actions" @click.stop>
      <q-btn
        flat
        dense
        no-caps
        class="full-width pack-answer-tile__edit-btn"
        :label="$t('content.editCard')"
        data-testid="pack-answer-tile-edit"
        @click="emit('edit')"
      />
      <q-btn
        flat
        dense
        no-caps
        class="full-width"
        color="negative"
        :label="$t('content.deleteCard')"
        data-testid="pack-answer-tile-delete"
        @click="emit('delete')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    content: string;
    description?: string;
    /** Show bottom text Edit/Delete (editor surfaces). */
    editable?: boolean;
    /** Body click selects this card (slot picker). */
    selectable?: boolean;
    selected?: boolean;
    disabled?: boolean;
    testId?: string;
  }>(),
  {
    description: '',
    editable: false,
    selectable: false,
    selected: false,
    disabled: false,
  },
);

const emit = defineEmits<{
  edit: [];
  delete: [];
  select: [];
}>();

const hasDescription = computed(() => Boolean(props.description?.trim()));

function onBodyClick() {
  if (!props.selectable || props.disabled) return;
  emit('select');
}
</script>

<style scoped>
/* Fixed px sizes + vertical split + ×2 type (D12′ / SC-PACK-222/225/227). */
.pack-answer-tile {
  --pack-tile-bg: #ffffff;
  --pack-tile-fg: rgba(0, 0, 0, 0.87);
  --pack-tile-muted: rgba(0, 0, 0, 0.7);
  --pack-tile-border: rgba(0, 0, 0, 0.14);
  --pack-tile-splitter: rgba(0, 0, 0, 0.12);
  --pack-tile-edit: rgba(0, 0, 0, 0.72);

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

.body--dark .pack-answer-tile {
  --pack-tile-bg: #2a2a2a;
  --pack-tile-fg: rgba(255, 255, 255, 0.92);
  --pack-tile-muted: rgba(255, 255, 255, 0.78);
  --pack-tile-border: rgba(255, 255, 255, 0.22);
  --pack-tile-splitter: rgba(255, 255, 255, 0.18);
  --pack-tile-edit: rgba(255, 255, 255, 0.88);
}

.pack-answer-tile--short {
  width: 150px;
}

.pack-answer-tile--selectable {
  cursor: pointer;
}

.pack-answer-tile--selectable:hover,
.pack-answer-tile--selected {
  border-color: var(--q-secondary);
  box-shadow: 0 0 0 1px var(--q-secondary);
}

.pack-answer-tile--disabled {
  opacity: 0.55;
  pointer-events: none;
}

.pack-answer-tile__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: row;
}

.pack-answer-tile__actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  border-top: 1px solid var(--pack-tile-splitter);
}

.pack-answer-tile__edit-btn {
  color: var(--pack-tile-edit);
}

.pack-answer-tile__content {
  flex: 1 1 50%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0.55rem 0.5rem;
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

.pack-answer-tile--short .pack-answer-tile__content {
  flex: 1 1 auto;
}

.pack-answer-tile__description {
  flex: 1 1 50%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0.55rem 0.5rem;
  border-left: 1px solid var(--pack-tile-splitter);
  font-size: 1.55rem;
  line-height: 1.25;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--pack-tile-muted);
}
</style>
