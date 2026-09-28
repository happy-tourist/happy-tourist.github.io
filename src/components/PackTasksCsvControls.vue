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
          @click="openImportModal"
        >
          <q-tooltip>{{ importTooltip }}</q-tooltip>
        </q-btn>
      </div>
    </div>

    <PackCsvImportDialog
      v-model="importOpen"
      v-model:error="importError"
      :format-example="$t('content.csvTasksFormatExample')"
      :format-hint="$t('content.csvTasksHint')"
      @file="onImportFile"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PackCsvImportDialog from '@/components/PackCsvImportDialog.vue';
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
const importOpen = ref(false);
const importError = ref<string | null>(null);

const ready = computed(() => props.ready !== false);

const noAnswerContext = computed(() => props.answerCards.length === 0);

const importDisabled = computed(() => !ready.value || props.readOnly || noAnswerContext.value);

/** SC-PACK-220: Export disabled when current set has zero tasks. */
const exportDisabled = computed(() => !ready.value || props.tasks.length === 0);

const importTooltip = computed(() => {
  if (noAnswerContext.value) return t('content.csvTasksNeedAnswers');
  if (props.readOnly) return t('content.csvTasksImportDisabled');
  return t('content.csvTasksHint');
});

function onExport() {
  if (exportDisabled.value) return;
  const base = sanitizePackCsvFilename(props.packTitle);
  const n = props.setNumber > 0 ? props.setNumber : 1;
  const csv = serializeTasks(props.tasks, props.answerCards);
  downloadCsvText(`${base}-tasks-${n}.csv`, csv);
}

function openImportModal() {
  if (importDisabled.value) return;
  importError.value = null;
  importOpen.value = true;
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

  // D6′: empty file → in-modal error, draft unchanged, modal stays open.
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
  importOpen.value = false;
}
</script>
