<script setup>
import { ref, watch } from 'vue';

const props = defineProps(['line', 'translate']);
const emits = defineEmits(['addTranslate']);

const translateInner = ref(props.translate || '');

watch(translateInner, (cur) => {
  emits('addTranslate', cur);
});
</script>

<template>
  <span
    class="text-body1 cursor-pointer q-ml-sm"
    :class="translateInner ? '' : 'text-bold'"
  >
    {{ translateInner || line }}

    <q-menu>
        <q-input
          autofocus
          autogrow
          dense
          v-model="translateInner"
        />

        <p class="q-mt-md">
          {{ line }}
        </p>
      </q-menu>
  </span>
</template>
