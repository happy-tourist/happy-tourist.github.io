<script setup>
import { nextTick } from 'vue';

const file = defineModel();
const changeFile = () => {
  nextTick(() => {
    if (!/\.(txt|srt|fb2|epub|pdf)$/i.test(file.value.name)) {
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
    label="Файл *.(srt|txt|fb2|epub|pdf)"
    @update:model-value="changeFile"
  />
</template>
