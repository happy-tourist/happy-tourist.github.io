<template>
  <div>
    <div class="text-h6 q-mb-sm">{{ $t('content.questionsList') }}</div>

    <q-card flat bordered class="q-mb-md" data-testid="csv-controls-frame">
      <q-card-section class="q-pa-sm">
        <div class="row q-gutter-sm items-center">
          <q-btn
            flat
            dense
            icon="download"
            :label="$t('content.exportTasksCsv')"
            :disable="exportDisabled"
            data-testid="export-tasks-csv"
            @click="onExport"
          />
          <q-btn
            flat
            dense
            icon="upload"
            :label="$t('content.importTasksCsv')"
            :disable="importDisabled"
            data-testid="import-tasks-csv"
            @click="triggerPicker"
          />
          <input
            ref="fileInput"
            type="file"
            accept=".csv,text/csv,text/plain"
            class="hidden"
            style="display: none"
            data-testid="csv-import-file-input"
            @change="onFileSelected"
          />
        </div>

        <div class="q-mt-sm text-caption">
          <div class="text-muted">{{ $t('content.csvImportFormatLabel') }}</div>
          <code class="csv-format-example block q-mt-xs">{{
            $t('content.csvTasksFormatExample')
          }}</code>
          <div class="q-mt-xs">{{ $t('content.csvTasksHint') }}</div>
          <div v-if="importGateMessage" class="q-mt-xs text-warning">
            {{ importGateMessage }}
          </div>
        </div>

        <q-banner
          v-if="importError"
          dense
          rounded
          class="bg-negative text-white q-mt-sm"
          data-testid="csv-import-error"
        >
          {{ importError }}
        </q-banner>
      </q-card-section>
    </q-card>
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
const importError = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const ready = computed(() => props.ready !== false);

const noAnswerContext = computed(() => props.answerCards.length === 0);

const importDisabled = computed(() => !ready.value || props.readOnly || noAnswerContext.value);

/** SC-PACK-220: Export disabled when current set has zero tasks. */
const exportDisabled = computed(() => !ready.value || props.tasks.length === 0);

/** Gate reason when Import is disabled (visible in frame — no tooltip). */
const importGateMessage = computed(() => {
  if (noAnswerContext.value) return t('content.csvTasksNeedAnswers');
  if (props.readOnly) return t('content.csvTasksImportDisabled');
  return null;
});

function onExport() {
  if (exportDisabled.value) return;
  const base = sanitizePackCsvFilename(props.packTitle);
  const n = props.setNumber > 0 ? props.setNumber : 1;
  const csv = serializeTasks(props.tasks, props.answerCards);
  downloadCsvText(`${base}-tasks-${n}.csv`, csv);
}

function triggerPicker() {
  if (importDisabled.value) return;
  importError.value = null;
  fileInput.value?.click();
}

function onFileSelected(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  input.value = '';
  if (!file) return;
  void onImportFile(file);
}

async function onImportFile(file: File) {
  if (importDisabled.value) return;

  let rows;
  try {
    const text = await file.text();
    rows = parseTasks(text);
  } catch {
    importError.value = t('content.csvImportFailed');
    return;
  }

  // D6″: empty file → framed error, draft unchanged.
  if (rows.length === 0) {
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

<style scoped>
.csv-format-example {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
  word-break: break-all;
  white-space: pre-wrap;
}
</style>
