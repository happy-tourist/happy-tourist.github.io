<script setup>
import AddEntityModal from 'src/modules/AddEntity/ui/AddEntityModal.vue';
import { ref } from 'vue';

const show = ref(false);
</script>

<template>
  <q-btn
    v-bind="$attrs"
    class="absolute"
    style="bottom:20px;right:20px;"
    round color="secondary" icon="add" size="sm" @click="show = true"/>
  <AddEntityModal v-model="show" />
</template>
