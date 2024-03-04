<script setup>
import { ref, watch } from 'vue';

const props = defineProps(['line', 'translate']);
const emits = defineEmits(['addTranslate']);

const translateInner = ref(props.translate || '');

watch(translateInner, (cur) => {
  emits('addTranslate', cur);
});

const input = ref();

const onFocus = () => {
  input.value.focus();
};
</script>

<template>
  <span
    class="text-body1 cursor-pointer q-ml-sm"
    :class="translateInner ? '' : 'text-bold'"
    @click="onFocus"
  >
    <input ref="input" type="text">
    {{ translateInner || line }}

    <q-popup-proxy>
        <q-input
          autofocus
          autogrow
          dense
          v-model="translateInner"
        />

        <p class="q-mt-md">
          {{ line }}
        </p>
      </q-popup-proxy>
  </span>
</template>
