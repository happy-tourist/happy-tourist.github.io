<template>
  <div
    class="pack-answer-tile"
    :class="{
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
    <div
      class="pack-answer-tile__body"
      :class="
        hasDescription ? 'pack-answer-tile__body--with-desc' : 'pack-answer-tile__body--no-desc'
      "
    >
      <div class="pack-answer-tile__content">
        {{ content.trim() || $t('content.untitled') }}
      </div>
      <div v-if="hasDescription" class="pack-answer-tile__description">
        {{ description }}
      </div>
    </div>

    <div v-if="editable" class="pack-answer-tile__actions" @click.stop>
      <q-btn
        outline
        dense
        no-caps
        class="full-width"
        icon="edit"
        :label="$t('content.edit')"
        data-testid="pack-answer-tile-edit"
        @click="emit('edit')"
      />
      <q-btn
        outline
        dense
        no-caps
        class="full-width"
        color="negative"
        icon="delete"
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
    /** Show bottom outline+icon Edit/Delete (editor surfaces). */
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
/* Portrait pack-card family (SC-PACK-222/225/282) — not former 150/300×200 horizontal split. */
.pack-answer-tile {
  position: relative;
  box-sizing: border-box;
  width: 156px;
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
  flex-direction: column;
  width: 100%;
}

/* SC-PACK-282: with description — content top, description bottom. */
.pack-answer-tile__body--with-desc {
  justify-content: flex-start;
}

.pack-answer-tile__body--with-desc .pack-answer-tile__content {
  flex: 0 1 auto;
  align-self: stretch;
}

.pack-answer-tile__body--with-desc .pack-answer-tile__description {
  flex: 0 1 auto;
  margin-top: auto;
  align-self: stretch;
}

/* SC-PACK-282: no description — content centered in body above actions. */
.pack-answer-tile__body--no-desc {
  justify-content: center;
  align-items: center;
}

.pack-answer-tile__body--no-desc .pack-answer-tile__content {
  flex: 0 1 auto;
  align-self: stretch;
}

/* SC-PACK-283: 24px = PackTaskTile question / peek question parity (not task-set title 0.78rem). */
.pack-answer-tile__content {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0.15rem 0;
  font-weight: 600;
  font-size: 24px;
  line-height: 1.25;
  word-break: break-word;
  text-align: center;
  color: var(--pack-card-fg);
}

.pack-answer-tile__description {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0.15rem 0 0.25rem;
  font-size: 0.68rem;
  font-weight: 400;
  line-height: 1.25;
  white-space: pre-wrap;
  word-break: break-word;
  text-align: center;
  color: var(--pack-card-muted);
}

.pack-answer-tile__actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: calc(100% + 20px);
  margin: auto -10px 0;
  padding: 8px 10px 8px;
  border-top: 1px solid var(--pack-card-splitter);
  box-sizing: border-box;
}

/* Slim outline + icon — PackTaskTile / task-set action chrome parity (SC-PACK-224). */
.pack-answer-tile__actions :deep(.q-btn) {
  width: 100%;
  min-height: 28px;
  max-height: 32px;
  height: var(--pack-card-action-h, 30px);
  padding: 0 0.4rem;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.2;
  color: var(--pack-card-fg);
  white-space: nowrap;
}

.pack-answer-tile__actions :deep(.q-btn .q-icon) {
  font-size: 18px;
  color: currentColor;
}

.pack-answer-tile__actions :deep(.q-btn--outline:before) {
  border-color: var(--pack-card-border);
}

.pack-answer-tile__actions :deep(.q-btn.text-negative) {
  color: var(--q-negative);
}

.pack-answer-tile__actions :deep(.q-btn.text-negative.q-btn--outline:before) {
  border-color: var(--q-negative);
}
</style>
