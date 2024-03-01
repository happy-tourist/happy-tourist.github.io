<script setup>
import DeleteEntityModal from 'src/modules/DeleteEntity/ui/DeleteEntityModal.vue';
import { ref } from 'vue';

const show = ref(false);
</script>

<template>
  <q-btn
    color="red"
    icon="delete"
    label="Удалить"
    v-bind="$attrs"
    @click="show = true"
  >
    <q-tooltip v-if="$attrs.disabled">Нельзя удалять непустые разделы</q-tooltip>
  </q-btn>

  <DeleteEntityModal v-model="show" />
</template>
