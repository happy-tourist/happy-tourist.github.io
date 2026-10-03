<template>
  <q-dialog :model-value="modelValue" @update:model-value="onOpenChange" @hide="onHide">
    <q-card style="min-width: min(420px, 92vw); max-width: 560px" data-testid="task-compose-dialog">
      <q-card-section>
        <div class="text-h6">
          {{ editing ? $t('content.editTask') : $t('content.addTask') }}
        </div>
      </q-card-section>
      <q-card-section>
        <q-form class="q-gutter-md" @submit.prevent="emit('save')">
          <q-input
            :model-value="question"
            outlined
            dense
            :label="$t('content.question')"
            :disable="readOnly"
            data-testid="task-compose-question"
            @update:model-value="emit('update:question', String($event ?? ''))"
          />
          <q-select
            :model-value="difficulty"
            :options="difficultyOptions"
            emit-value
            map-options
            outlined
            dense
            :label="$t('content.difficultyLabel')"
            :disable="readOnly"
            data-testid="task-compose-difficulty"
            @update:model-value="emit('update:difficulty', $event as Difficulty)"
          />
          <div class="row items-center q-mb-xs">
            <div class="text-caption">{{ $t('content.slots') }}</div>
            <q-space />
            <q-btn
              flat
              dense
              round
              icon="remove"
              :disable="readOnly || formSlots.length <= 1"
              data-testid="task-compose-remove-slot"
              @click="removeSlot"
            />
            <q-btn
              flat
              dense
              round
              icon="add"
              :disable="readOnly"
              data-testid="task-compose-add-slot"
              @click="addSlot"
            />
          </div>
          <!-- SC-PACK-260/237: centered peek-slot-like row (justify-center like GamePage .peek-slots) -->
          <div class="peek-slot-like-row justify-center q-mb-sm" data-testid="compose-slot-row">
            <div
              v-for="slot in formSlots"
              :key="slot.id"
              class="peek-slot-like"
              :class="{
                'peek-slot-like--filled': Boolean(slot.answerCardId),
                'peek-slot-like--interactive': !readOnly && Boolean(slot.answerCardId),
              }"
              data-testid="peek-slot-like"
              @click="slot.answerCardId && clearSlot(slot)"
            >
              <span v-if="slot.answerCardId" class="peek-slot-like__label">{{
                slotLabel(slot)
              }}</span>
              <span v-else class="peek-slot-like__empty">{{ slotLabel(slot) }}</span>
            </div>
          </div>
          <!-- SC-PACK-260: chip pool like GamePage .peek-answers — not PackAnswerCardTile / slot-picker-grid -->
          <div
            class="peek-answers row q-gutter-sm justify-center"
            data-testid="task-compose-answer-pool"
          >
            <q-chip
              v-for="card in answerCards"
              :key="card.id"
              :clickable="!readOnly && Boolean(card.content.trim())"
              outline
              :disable="readOnly || !card.content.trim()"
              data-testid="task-compose-answer-chip"
              @click="pickAnswer(card.id)"
            >
              {{ card.content || card.id }}
            </q-chip>
          </div>
          <q-card-actions align="right" class="q-pa-none">
            <q-btn flat :label="$t('content.cancelEditTask')" @click="onCancel" />
            <q-btn
              type="submit"
              color="primary"
              :label="editing ? $t('content.saveTask') : $t('content.addTask')"
              :loading="saving"
              :disable="readOnly || !canSave"
              data-testid="task-compose-save"
            >
              <q-tooltip v-if="!canSave && question.trim()">
                {{ $t('content.questionNeedsSlot') }}
              </q-tooltip>
            </q-btn>
          </q-card-actions>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { newLocalId, type Difficulty, type TaskSlot } from '@/stores/content';

export type TaskComposeAnswerCard = {
  id: string;
  content: string;
  description?: string;
};

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    editing: boolean;
    question: string;
    difficulty: Difficulty;
    formSlots: TaskSlot[];
    answerCards: TaskComposeAnswerCard[];
    readOnly?: boolean;
    saving?: boolean;
    canSave: boolean;
  }>(),
  {
    readOnly: false,
    saving: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:question': [value: string];
  'update:difficulty': [value: Difficulty];
  'update:formSlots': [value: TaskSlot[]];
  save: [];
  cancel: [];
  hide: [];
}>();

const { t } = useI18n();

const difficultyOptions = computed(() =>
  ([1, 2, 3] as Difficulty[]).map((value) => ({
    label: t(`content.difficulty.${value}`),
    value,
  })),
);

function onOpenChange(value: boolean) {
  emit('update:modelValue', value);
}

function onHide() {
  emit('hide');
}

function onCancel() {
  emit('update:modelValue', false);
  emit('cancel');
}

function slotLabel(slot: TaskSlot) {
  if (!slot.answerCardId) {
    return t('content.slotEmpty');
  }
  const card = props.answerCards.find((c) => c.id === slot.answerCardId);
  if (card) {
    const text = card.content?.trim();
    if (text) return text;
  }
  return t('content.slotFilled');
}

function addSlot() {
  if (props.readOnly) return;
  emit('update:formSlots', [...props.formSlots, { id: newLocalId('slot'), answerCardId: null }]);
}

function removeSlot() {
  if (props.readOnly || props.formSlots.length <= 1) return;
  emit('update:formSlots', props.formSlots.slice(0, -1));
}

function clearSlot(slot: TaskSlot) {
  if (props.readOnly) return;
  emit(
    'update:formSlots',
    props.formSlots.map((s) => (s.id === slot.id ? { ...s, answerCardId: null } : s)),
  );
}

function pickAnswer(cardId: string) {
  if (props.readOnly) return;
  const idx = props.formSlots.findIndex((s) => !s.answerCardId);
  if (idx < 0) return;
  emit(
    'update:formSlots',
    props.formSlots.map((s, i) => (i === idx ? { ...s, answerCardId: cardId } : s)),
  );
}
</script>
