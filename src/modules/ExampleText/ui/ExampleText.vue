<script setup>
import { AddFile } from 'src/modules/AddFile';
import {
  inject,
  ref,
} from 'vue';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirebaseStorage, useFirestore } from 'vuefire';
import {
  ref as storageRef,
  uploadBytes,
  deleteObject,
} from 'firebase/storage';
import { ConfirmModal } from 'src/modules/ConfirmModal';

defineProps(['exampleText']);
const emits = defineEmits(['load']);

const file = ref(null);

const {
  increaseCounterLoadings,
  decreaseCounterLoadings,
  entity,
} = inject('app');

const storage = useFirebaseStorage();

const db = useFirestore();

const onSubmit = async () => {
  increaseCounterLoadings();
  await Promise.all([
    updateDoc(doc(db, 'entities', entity.value.id), {
      text: {
        ...entity.value.text,
        exampleText: `texts/examples/${entity.value.id}.txt`,
      },
    }),
    uploadBytes(storageRef(storage, `texts/examples/${entity.value.id}.txt`), file.value),
  ]).finally(() => {
    decreaseCounterLoadings();
  });

  file.value = null;

  emits('load');
};

const onDelete = async () => {
  increaseCounterLoadings();
  const exampleTextPath = entity.value.text.exampleText;

  const promises = [
    updateDoc(doc(db, 'entities', entity.value.id), {
      text: {
        ...entity.value.text,
        exampleText: '',
      },
    }),
  ];

  if (exampleTextPath) {
    promises.push(deleteObject(storageRef(storage, exampleTextPath)));
  }

  await Promise.all(promises).finally(() => {
    decreaseCounterLoadings();
  });
};

const show = ref(false);
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
      @click="show = true"
    />

    <ConfirmModal
      v-model="show" title="Вы уверены что хотите удалить пример?" :cb="onDelete" />

    <p
      v-for="(p, indexP) in exampleText"
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
