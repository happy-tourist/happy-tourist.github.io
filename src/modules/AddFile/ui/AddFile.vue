<script setup>
import { useVModel } from '@vueuse/core';
import { nextTick } from 'vue';

const props = defineProps(['modelValue']);
const emit = defineEmits(['update:modelValue']);

const file = useVModel(props, 'modelValue', emit);
const changeFile = () => {
  nextTick(() => {
    if (!/\.(txt|srt)$/i.test(file.value.name)) {
      file.value = null;
      alert('Не подходящий формат файла!');
    }
  });
};
</script>

<template>
  <q-file
    filled
    v-model="file"
    :rules="[val => !!val || 'Обязательно']"
    label="Файл *.(srt|txt)"
    @update:model-value="changeFile"
  />
</template>
