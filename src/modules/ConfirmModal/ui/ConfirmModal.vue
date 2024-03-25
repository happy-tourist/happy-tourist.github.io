<script setup>
import { useVModel } from '@vueuse/core';

const props = defineProps(['modelValue', 'title', 'cb']);
const emit = defineEmits(['update:modelValue']);

const show = useVModel(props, 'modelValue', emit);
</script>

<template>
  <q-dialog v-model="show">
    <q-card class="q-pa-lg d-flex flex-column gap-2" style="min-width: 300px;">
      <p class="text-h6">
        {{ title }}
      </p>

      <q-btn type="submit" label="Удалить" color="red" @click="cb" />
    </q-card>
  </q-dialog>
</template>
