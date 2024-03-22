<script setup>
import { reactive, ref } from 'vue';
import { onClickOutside, useElementBounding, useVModel } from '@vueuse/core';

const props = defineProps(['line', 'translate', 'modelValue']);
const emits = defineEmits(['addTranslate', 'update:modelValue']);

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

const scrollTop = useVModel(props, 'modelValue', emits);

const onOpen = () => {
  showForm.value = true;
  setTimeout(() => {
    const rect = useElementBounding(form.value.$el);
    margins.left = Math.min(window.innerWidth - rect.x.value - rect.width.value - 36, 0);
    margins.top = Math.min(window.innerHeight - rect.y.value - rect.height.value - 20, 0);

    setTimeout(() => {
      const rectNew = useElementBounding(form.value.$el);
      scrollTop.value = rectNew.y.value;
    });

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
