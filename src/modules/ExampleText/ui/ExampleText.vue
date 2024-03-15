<script setup>
import { AddFile, useAddFile } from 'src/modules/AddFile';
import { inject, ref } from 'vue';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from 'vuefire';

const file = ref(null);

const {
  increaseCounterLoadings,
  decreaseCounterLoadings,
  entity,
} = inject('app');

const db = useFirestore();
const { readFile } = useAddFile();
const onSubmit = () => {
  readFile(file.value, async (paragraphsByLinesObj) => {
    await updateDoc(doc(db, 'entities', entity.value.id), {
      text: {
        ...entity.value.text,
        exampleText: paragraphsByLinesObj,
      },
    });
    file.value = null;
  });
};

const onDelete = async () => {
  increaseCounterLoadings();

  await updateDoc(doc(db, 'entities', entity.value.id), {
    text: {
      ...entity.value.text,
      exampleText: '',
    },
  }).finally(() => {
    decreaseCounterLoadings();
  });
};
</script>

<template>
  <q-form
    v-if="!entity.text.exampleText"
    @submit.prevent="onSubmit" class="d-flex flex-column align-start">
    <AddFile
      v-model="file"
    />

    <q-btn :disable="!file" type="submit" label="Добавить пример" color="primary" />
  </q-form>

  <template v-else>
    <q-btn
      round
      color="red"
      icon="delete"
      size="sm"
      class="absolute"
      style="right: 30px;"
      @click="onDelete"
    />

    <p
      v-for="(p, indexP) in entity.text.exampleText"
      :key="indexP"
      class="q-mb-md"
    >
      <span
        v-for="(line, indexLine) in p"
        :key="indexLine"
        class="text-body1 q-mr-sm"
      >
        {{ line }}
      </span>
    </p>
  </template>
</template>
