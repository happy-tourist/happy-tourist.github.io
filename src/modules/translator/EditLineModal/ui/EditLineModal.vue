<script setup>
import { computed, inject, ref } from 'vue';
import {
  doc,
  updateDoc,
} from 'firebase/firestore';
import { useFirestore } from 'vuefire';

const db = useFirestore();

const props = defineProps(['indexLine', 'line'])

const { entity } = inject('entities');
const { increaseLoadings, decreaseLoadings } = inject('loading');

const show = defineModel();

const translate = computed(() => entity.value.text.translates && entity.value.text.translates[props.indexLine])
const translateInner = ref(translate.value || '');

const addTranslate = async () => {
  increaseLoadings();
  const translates = Object.assign(entity.value.text.translates || {}, {
    [props.indexLine]: translateInner.value,
  });
  await updateDoc(doc(db, 'entities', entity.value.id), {
    text: {
      ...entity.value.text,
      translates,
    },
  }).finally(() => {
    decreaseLoadings();
  });
};
</script>

<template>
  <q-dialog v-model="show" maximized>
    <q-card class="q-pa-lg d-flex flex-column gap-2">
      <div class="flex-grow d-flex flex-column gap-3">
        <div class="d-flex flex-column">
          <p class="text-weight-bold">Оригинал:</p>
          <p style="white-space: pre-line">
            {{ line }}
          </p>
        </div>

        <div class="d-flex flex-column">
          <p class="text-weight-bold">Перевод:</p>
          <q-input
            outlined
            autogrow
            filled
            v-model="translateInner"
          />
        </div>
      </div>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat dense color="negative" label="Отмена" v-close-popup />
        <q-btn
          :disable="translateInner === (translate || '')"
          flat
          dense
          color="positive"
          label="Сохранить"
          v-close-popup
          @click="addTranslate"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
