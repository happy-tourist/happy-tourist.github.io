<script setup>
import { ref, watch } from 'vue';
import { PopupEdit } from 'src/modules/PopupEdit';

const props = defineProps(['line', 'translate']);
const emits = defineEmits(['addTranslate']);

const translateInner = ref(props.translate || '');

watch(translateInner, (cur) => {
  emits('addTranslate', cur);
});
</script>

<template>
  <span
    class="text-body1 cursor-pointer q-mr-sm relative-position"
    :class="translateInner ? '' : 'text-bold'"
  >
    {{ translateInner || line }}

    <PopupEdit v-model="translateInner" v-slot="scope">
        <q-input
          autofocus
          autogrow
          dense
          v-model="scope.model.value"
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
                :disable="scope.initialValue === scope.model.value"
              />
            </template>
          </q-input>

        <p class="q-mt-md">
          {{ line }}
        </p>
    </PopupEdit>
  </span>
</template>
