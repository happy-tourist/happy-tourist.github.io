<template>
  <div>
    <div class="row items-center justify-between q-mb-sm">
      <div class="text-h6">{{ $t('content.questionsList') }}</div>
      <div class="q-gutter-sm">
        <q-btn
          flat
          dense
          icon="download"
          :label="$t('content.exportTasksCsv')"
          :disable="!ready"
          @click="onExport"
        />
        <q-btn
          flat
          dense
          icon="upload"
          :label="$t('content.importTasksCsv')"
          :disable="importDisabled"
          @click="openPicker"
        >
          <q-tooltip>{{ importTooltip }}</q-tooltip>
        </q-btn>
        <input
          ref="fileInput"
          type="file"
          accept=".csv,text/csv,text/plain"
          class="hidden"
          style="display: none"
          @change="onFileSelected"
        />
      </div>
    </div>

    <q-banner v-if="importError" dense rounded class="bg-negative text-white q-mb-md">
      {{ importError }}
      <template #action>
        <q-btn flat dense label="OK" @click="importError = null" />
      </template>
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  collectMissingSlotTexts,
  downloadCsvText,
  parseTasks,
  resolveSlots,
  sanitizePackCsvFilename,
  serializeTasks,
} from '@/lib/packContentCsv';
import { newLocalId, type AnswerCard, type ContentTask } from '@/stores/content';

const props = defineProps<{
  /** Current set tasks to export / append into. */
  tasks: ContentTask[];
  /** Answer context for slot resolve (liveCards or draft answerCards). */
  answerCards: ReadonlyArray<Pick<AnswerCard, 'id' | 'content'>>;
  packTitle: string;
  /** 1-based set index for export filename (D9 / SC-PACK-213). */
  setNumber: number;
  /** Same edit lock as manual task edits. */
  readOnly: boolean;
  /** False while page draft has not loaded. */
  ready?: boolean;
}>();

const emit = defineEmits<{
  append: [tasks: ContentTask[]];
}>();

const { t } = useI18n();
const fileInput = ref<HTMLInputElement | null>(null);
const importError = ref<string | null>(null);

const ready = computed(() => props.ready !== false);

const noAnswerContext = computed(() => props.answerCards.length === 0);

const importDisabled = computed(() => !ready.value || props.readOnly || noAnswerContext.value);

const importTooltip = computed(() => {
  if (noAnswerContext.value) return t('content.csvTasksNeedAnswers');
  if (props.readOnly) return t('content.csvTasksImportDisabled');
  return t('content.csvTasksHint');
});

function onExport() {
  if (!ready.value) return;
  const base = sanitizePackCsvFilename(props.packTitle);
  const n = props.setNumber > 0 ? props.setNumber : 1;
  const csv = serializeTasks(props.tasks, props.answerCards);
  downloadCsvText(`${base}-tasks-${n}.csv`, csv);
}

function openPicker() {
  if (importDisabled.value) return;
  importError.value = null;
  fileInput.value?.click();
}

async function onFileSelected(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  input.value = '';
  if (!file || importDisabled.value) return;

  let rows;
  try {
    const text = await file.text();
    rows = parseTasks(text);
  } catch {
    importError.value = t('content.csvImportFailed');
    return;
  }

  const missing = collectMissingSlotTexts(rows, props.answerCards);
  if (missing.length > 0) {
    importError.value = t('content.csvTasksMissingAnswers', {
      list: missing.join(', '),
    });
    return;
  }

  const appended: ContentTask[] = [];
  for (const row of rows) {
    const resolved = resolveSlots(row.slotTexts, props.answerCards);
    if (!resolved.ok) {
      importError.value = t('content.csvTasksMissingAnswers', {
        list: resolved.missingTexts.join(', '),
      });
      return;
    }
    appended.push({
      id: newLocalId('task'),
      question: row.question,
      difficulty: row.difficulty,
      slots: resolved.answerCardIds.map((answerCardId) => ({
        id: newLocalId('slot'),
        answerCardId,
      })),
    });
  }

  importError.value = null;
  emit('append', appended);
}
</script>
