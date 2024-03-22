<script setup>
import { computed, inject } from 'vue';
import {
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { useFirestore } from 'vuefire';
import { useRouter } from 'vue-router';
import { deleteObject, getStorage, ref as storageRef } from 'firebase/storage';

const props = defineProps(['modelValue']);
const emits = defineEmits(['update:modelValue']);

const show = computed({
  get: () => props.modelValue,
  set: (value) => emits('update:modelValue', value),
});

const {
  increaseCounterLoadings,
  decreaseCounterLoadings,
  entity,
} = inject('app');

const db = useFirestore();
const router = useRouter();

const isDescription = computed(() => entity.value?.type === 'description');

const onRemove = async () => {
  const id = entity.value.parentFolders.length ? entity.value.parentFolders[entity.value.parentFolders.length - 1].id : '';
  show.value = false;

  const promises = [
    deleteDoc(doc(db, 'entities', entity.value.id)),
  ];

  if (isDescription.value) {
    const storage = getStorage();
    const originalTextPath = entity.value.text.originalText;
    const exampleTextPath = entity.value.text.exampleText;

    if (originalTextPath) {
      promises.push(deleteObject(storageRef(storage, originalTextPath)));
    }

    if (exampleTextPath) {
      promises.push(deleteObject(storageRef(storage, exampleTextPath)));
    }
  }

  increaseCounterLoadings();
  await Promise.all(promises).finally(() => {
    decreaseCounterLoadings();
    router.push({ name: 'index', params: { id } });
  });
};
</script>

<template>
  <q-dialog v-model="show">
    <q-card class="q-pa-lg d-flex flex-column gap-2" style="min-width: 300px;">
      <p class="text-h6">
        Вы уверены, что хотите удалить {{ entity.name }}?
      </p>

      <q-btn type="submit" label="Удалить" color="red" @click="onRemove" />
    </q-card>
  </q-dialog>
</template>
