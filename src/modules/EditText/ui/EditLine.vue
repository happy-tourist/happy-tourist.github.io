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

    <q-popup-edit v-model="translateInner" v-slot="scope">
        <q-input
          autofocus
          autogrow
          dense
          v-model="scope.value"
          :model-value="scope.value"
          @keydown.enter="scope.set"
        >
          <template v-slot:after>
            <q-btn
              flat dense color="negative" icon="cancel"
              @click.stop.prevent="scope.cancel"
            />

            <q-btn
              flat dense color="positive" icon="check_circle"
              @click.stop.prevent="scope.set"
              :disable="scope.validate(scope.value) === false || scope.initialValue === scope.value"
            />
          </template>
        </q-input>

        <p class="q-mt-md">
          {{ line }}
        </p>
      </q-popup-edit>
  </span>
</template>
