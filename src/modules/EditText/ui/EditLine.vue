<script setup>
import { nextTick, reactive, ref } from 'vue';
import { onClickOutside } from '@vueuse/core';

const props = defineProps(['line', 'translate']);
const emits = defineEmits(['addTranslate']);

const translateInner = ref(props.translate || '');
const showForm = ref(false);
const form = ref(null);

const margins = reactive({
  left: 0,
  top: 0,
});

const closeForm = () => {
  showForm.value = false;
  margins.left = 0;
  margins.top = 0;
};

const onSubmit = () => {
  emits('addTranslate', translateInner.value);
  closeForm();
};

const onCancel = () => {
  translateInner.value = props.translate || '';
  closeForm();
};

const field = ref();

const onOpen = () => {
  showForm.value = true;
  nextTick(() => {
    field.value.focus();
  });
  setTimeout(() => {
    const rect = form.value.$el.getBoundingClientRect();
    margins.left = Math.min(window.innerWidth - rect.x - rect.width - 36, 0);
    margins.top = Math.min(window.innerHeight - rect.y - rect.height - 20, 0);

    onClickOutside(form, closeForm);
  });
};
</script>

<template>
  <span
    class="text-body1 cursor-pointer q-mr-sm relative-position"
    :class="translate ? '' : 'text-bold'"
  >
    <span @click="onOpen">
      {{ translate || line }}
    </span>

    <q-card
      ref="form"
      v-if="showForm"
      class="bg-white q-pa-sm edit-line__form"
      :style="{
        marginLeft: `${margins.left}px`,
        marginTop: `${margins.top}px`
      }"
    >
        <q-input
          ref="field"
          autofocus
          autogrow
          dense
          v-model="translateInner"
          @keydown.enter="onSubmit"
        >
            <template v-slot:after>
              <q-btn
                flat dense color="negative" icon="cancel"
                @click.stop.prevent="onCancel"
              />

              <q-btn
                flat dense color="positive" icon="check_circle"
                @click.stop.prevent="onSubmit"
                :disable="translateInner === (translate || '')"
              />
            </template>
          </q-input>

        <p class="q-mt-md text-body2">
          {{ line }}
        </p>
    </q-card>
  </span>
</template>

<style scoped lang="scss">
.edit-line {
  &__form{
    position: absolute;
    max-width: 85vw;
    width: max-content;
    z-index: 999;
    left: 0;
    top: 0;
  }
}
</style>
