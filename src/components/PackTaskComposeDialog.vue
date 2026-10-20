<template>
  <q-dialog :model-value="modelValue" @update:model-value="onOpenChange" @hide="onHide">
    <q-card class="peek-chrome pack-task-compose-card" data-testid="task-compose-dialog">
      <q-card-section class="q-pb-none">
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

          <!-- SC-PACK-276: interactive dots + word badge (model stays 1|2|3). -->
          <div class="peek-diff-header" data-testid="compose-diff-header">
            <div
              class="peek-diff-dots"
              :data-diff="String(displayDifficulty)"
              data-testid="task-compose-difficulty"
              role="group"
              :aria-label="$t('content.difficultyLabel')"
            >
              <button
                v-for="dotIndex in 3"
                :key="`compose-dot-${dotIndex}`"
                type="button"
                class="peek-diff-dot"
                :class="{ 'peek-diff-dot--filled': dotIndex <= displayDifficulty }"
                :disabled="readOnly"
                :aria-label="difficultyDotAria(dotIndex as Difficulty)"
                :aria-pressed="difficulty === dotIndex"
                data-testid="compose-diff-dot"
                @mouseenter="onDotPreview(dotIndex as Difficulty)"
                @mouseleave="onDotPreviewClear"
                @focus="onDotPreview(dotIndex as Difficulty)"
                @blur="onDotPreviewClear"
                @click="onDotCommit(dotIndex as Difficulty)"
              />
            </div>
            <span
              class="peek-diff-badge"
              :data-diff="String(difficulty)"
              data-testid="compose-diff-badge"
            >
              {{ difficultyBadgeLabel }}
            </span>
          </div>

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

          <!-- SC-PACK-237/260/277: centered portrait unlabeled slots (peek parity). -->
          <div class="peek-slot-like-row justify-center q-mb-sm" data-testid="compose-slot-row">
            <div
              v-for="slot in formSlots"
              :key="slot.id"
              class="peek-slot-like peek-slot-like--portrait"
              :class="{
                'peek-slot-like--filled': Boolean(slot.answerCardId),
                'peek-slot-like--interactive': !readOnly && Boolean(slot.answerCardId),
              }"
              data-testid="peek-slot-like"
              @click="slot.answerCardId && clearSlot(slot)"
            >
              <template v-if="slot.answerCardId">
                <span class="peek-slot-like__label">{{ slotPrimary(slot) }}</span>
                <span v-if="slotSecondary(slot)" class="peek-slot-like__secondary">
                  {{ slotSecondary(slot) }}
                </span>
              </template>
            </div>
          </div>

          <!-- SC-PACK-260/263/277: mini-card pool ≤4×4 scroll — not catalog tiles / flat chips. -->
          <div class="peek-answer-pool" data-testid="task-compose-answer-pool">
            <div
              v-for="card in answerCards"
              :key="card.id"
              class="peek-answer-mini"
              :class="{
                'peek-answer-mini--readonly': readOnly || !card.content.trim(),
              }"
              data-testid="task-compose-answer-chip"
              @click="pickAnswer(card.id)"
            >
              <span class="peek-answer-mini__primary">{{ card.content || card.id }}</span>
              <span v-if="card.description" class="peek-answer-mini__secondary">
                {{ card.description }}
              </span>
            </div>
          </div>

          <!-- SC-PACK-281: Save = peekSubmit chrome; Cancel omitted (dismiss = backdrop/Esc). -->
          <q-card-actions class="q-pa-none pack-task-compose-actions">
            <q-btn
              type="submit"
              class="full-width pack-task-compose-save"
              color="primary"
              unelevated
              no-caps
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
import { computed, ref } from 'vue';
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
  /** Dismiss without save = backdrop/Esc → `@hide` (Cancel control removed, SC-PACK-281). */
  hide: [];
}>();

const { t } = useI18n();

/** Hover/focus preview of difficulty K; null = resting committed value. */
const previewDifficulty = ref<Difficulty | null>(null);

const displayDifficulty = computed((): Difficulty => previewDifficulty.value ?? props.difficulty);

/** Word-only badge — no «Сложность:» prefix (SC-PACK-276). */
const difficultyBadgeLabel = computed(() => t(`content.difficultyWord.${props.difficulty}`));

function difficultyDotAria(level: Difficulty) {
  return t(`content.difficultyWord.${level}`);
}

function onDotPreview(level: Difficulty) {
  if (props.readOnly) return;
  previewDifficulty.value = level;
}

function onDotPreviewClear() {
  previewDifficulty.value = null;
}

function onDotCommit(level: Difficulty) {
  if (props.readOnly) return;
  previewDifficulty.value = null;
  emit('update:difficulty', level);
}

function onOpenChange(value: boolean) {
  emit('update:modelValue', value);
}

function onHide() {
  previewDifficulty.value = null;
  emit('hide');
}

function cardForSlot(slot: TaskSlot) {
  if (!slot.answerCardId) return undefined;
  return props.answerCards.find((c) => c.id === slot.answerCardId);
}

function slotPrimary(slot: TaskSlot) {
  const card = cardForSlot(slot);
  const text = card?.content?.trim();
  if (text) return text;
  return t('content.slotFilled');
}

function slotSecondary(slot: TaskSlot) {
  const desc = cardForSlot(slot)?.description?.trim();
  return desc || '';
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
  const card = props.answerCards.find((c) => c.id === cardId);
  if (!card?.content.trim()) return;
  const idx = props.formSlots.findIndex((s) => !s.answerCardId);
  if (idx < 0) return;
  emit(
    'update:formSlots',
    props.formSlots.map((s, i) => (i === idx ? { ...s, answerCardId: cardId } : s)),
  );
}
</script>

<style scoped>
.pack-task-compose-card {
  /* SC-PACK-279: 4 pool minis + gaps + pad + ≈50px slack; not fixed 360/400. */
  --compose-horizontal-pad: 32px;
  --compose-width-slack: 50px;
  --compose-diff-dot-size: 20px;
  border-radius: 18px;
  background: var(--pack-card-bg);
  color: var(--pack-card-fg);
  min-width: min(
    calc(
      4 * var(--peek-tile-max-w, 43px) + 3 * 8px + var(--compose-horizontal-pad) +
        var(--compose-width-slack)
    ),
    92vw
  );
  max-width: min(
    calc(
      4 * var(--peek-tile-max-w, 43px) + 3 * 8px + var(--compose-horizontal-pad) +
        var(--compose-width-slack)
    ),
    92vw
  );
}

/* SC-PACK-280: compose-only hit target ≈ badge height; shared `.peek-diff-dot` stays 6px. */
.pack-task-compose-card .peek-diff-dot {
  width: var(--compose-diff-dot-size);
  height: var(--compose-diff-dot-size);
}

/* SC-PACK-281: Save matches `.peek-submit-btn` chrome (labels stay content.saveTask/addTask). */
.pack-task-compose-actions {
  padding-top: 4px;
}

/* Beat Quasar min-height so peekSubmit-like 28–36 / action-h 30 sticks. */
.pack-task-compose-actions :deep(.q-btn.pack-task-compose-save) {
  width: 100%;
  min-height: 28px;
  height: var(--pack-card-action-h, 30px);
  max-height: 36px;
  padding: 0 0.6rem;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.2;
}

/* Dim empty/disabled pool cards; pointer-events from global `.peek-answer-mini--readonly`. */
.peek-answer-mini--readonly {
  opacity: 0.55;
}
</style>
