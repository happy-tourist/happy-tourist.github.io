<template>
  <q-dialog :model-value="modelValue" @update:model-value="onOpenChange">
    <q-card style="min-width: 320px; max-width: 480px">
      <q-card-section>
        <div class="text-h6">{{ $t('content.csvImportModalTitle') }}</div>
        <div class="q-mt-sm text-body2">{{ formatHint }}</div>
        <div class="q-mt-md">
          <div class="text-caption text-muted">{{ $t('content.csvImportFormatLabel') }}</div>
          <code class="csv-format-example block q-mt-xs">{{ formatExample }}</code>
        </div>
        <q-banner
          v-if="error"
          dense
          rounded
          class="bg-negative text-white q-mt-md"
          data-testid="csv-import-error"
        >
          {{ error }}
        </q-banner>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat :label="$t('content.gateDismiss')" @click="onOpenChange(false)" />
        <q-btn
          color="primary"
          :label="$t('content.csvImportChooseFile')"
          data-testid="csv-import-choose-file"
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
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  modelValue: boolean;
  /** Short CSV format example for the surface (answers or tasks). */
  formatExample: string;
  /** Extra hint under the title (semicolon dialect, append-only, …). */
  formatHint: string;
  /** Import failure text shown inside the modal (D6′ / SC-PACK-218). */
  error: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [open: boolean];
  'update:error': [message: string | null];
  file: [file: File];
}>();

const fileInput = ref<HTMLInputElement | null>(null);

function onOpenChange(open: boolean) {
  emit('update:modelValue', open);
  if (!open) {
    emit('update:error', null);
  }
}

function triggerPicker() {
  fileInput.value?.click();
}

function onFileSelected(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  input.value = '';
  if (!file) return;
  emit('file', file);
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
