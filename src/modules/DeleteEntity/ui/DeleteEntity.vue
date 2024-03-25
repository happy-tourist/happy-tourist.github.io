<script setup>
import { computed, inject, ref } from 'vue';
import { ConfirmModal } from 'src/modules/ConfirmModal';
import { deleteDoc, doc } from 'firebase/firestore';
import { deleteObject, getStorage, ref as storageRef } from 'firebase/storage';
import { useFirestore } from 'vuefire';
import { useRouter } from 'vue-router';

const show = ref(false);

const {
  increaseCounterLoadings,
  decreaseCounterLoadings,
  entity,
} = inject('app');

const isDescription = computed(() => entity.value?.type === 'description');

const db = useFirestore();
const router = useRouter();

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
  <q-btn
    round
    color="red"
    icon="delete"
    size="sm"
    class="absolute"
    style="right: 30px;"
    v-bind="$attrs"
    @click="show = true"
  >
    <q-tooltip v-if="$attrs.disabled">Нельзя удалять непустые разделы</q-tooltip>
  </q-btn>

  <ConfirmModal
    v-if="entity"
    v-model="show" :title="`Вы уверены что хотите удалить ${entity.name}`" :cb="onRemove" />
</template>
