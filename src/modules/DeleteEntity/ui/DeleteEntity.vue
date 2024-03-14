<script setup>
import DeleteEntityModal from 'src/modules/DeleteEntity/ui/DeleteEntityModal.vue';
import { ref } from 'vue';

const show = ref(false);
</script>

<template>
  <q-btn
    round
    color="red"
    icon="delete"
    size="sm"
    class="absolute"
    style="right: 30px;"
    v-bind="$attrs"
    @click="show = true"
  >
    <q-tooltip v-if="$attrs.disabled">Нельзя удалять непустые разделы</q-tooltip>
  </q-btn>

  <DeleteEntityModal v-model="show" />
</template>
