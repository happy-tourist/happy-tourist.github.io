<script setup>
import { computed, inject, ref } from 'vue';
import { addDoc, collection } from 'firebase/firestore';
import { useFirestore } from 'vuefire';

const props = defineProps(['modelValue']);
const emits = defineEmits(['update:modelValue']);

const show = computed({
  get: () => props.modelValue,
  set: (value) => emits('update:modelValue', value),
});

const name = ref('');
const typeEntity = ref(null);

const {
  user,
  increaseCounterLoadings,
  decreaseCounterLoadings,
  entity,
} = inject('app');

const db = useFirestore();
const onPush = async () => {
  increaseCounterLoadings();
  const parentFolders = [];
  if (entity.value) {
    parentFolders
      .push(...entity.value.parentFolders, { name: entity.value.name, id: entity.value.id });
  }
  await addDoc(collection(db, 'entities'), {
    uid: user.value.uid,
    type: typeEntity.value.value,
    name: name.value,
    parentId: entity.value?.id || '',
    parentFolders,
  }).finally(() => {
    decreaseCounterLoadings();
  });
};

const onSubmit = async () => {
  await onPush();
  show.value = false;
  name.value = '';
  typeEntity.value = null;
};

const options = [
  {
    label: 'Раздел',
    value: 'folder',
  },
  {
    label: 'Текст',
    value: 'description',
  },
];
</script>

<template>
  <q-dialog v-model="show">
    <q-card class="q-pa-lg" style="min-width: 300px;">
      <q-form @submit.prevent="onSubmit" class="d-flex flex-column gap-2">
        <q-select
          v-model="typeEntity"
          filled
          :options="options"
          label="Добавить"
          :rules="[val => !!val || 'Обязательно']"
        />

        <q-input filled v-model="name" :rules="[val => !!val || 'Обязательно']" />

        <q-btn type="submit" label="Добавить" color="primary" />
      </q-form>
    </q-card>
  </q-dialog>
</template>
