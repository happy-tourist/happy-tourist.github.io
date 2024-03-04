<script setup>
import { inject, ref, watch } from 'vue';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from 'vuefire';

const {
  entity,
  increaseCounterLoadings,
  decreaseCounterLoadings,
} = inject('app');

const showForm = ref(false);
const name = ref('');
const db = useFirestore();

const onUpdate = async () => {
  increaseCounterLoadings();
  showForm.value = false;
  await updateDoc(doc(db, 'entities', entity.value.id), { name: name.value }).finally(() => {
    decreaseCounterLoadings();
    name.value = '';
  });
};

const input = ref();

watch(showForm, (cur) => {
  if (cur) {
    name.value = entity.value.name;
    setTimeout(() => {
      input.value.focus();
    }, 1000);
  }
});
</script>

<template>
  <div v-if="entity" class="d-flex gap-2">
    <input ref="input" type="text">
    <template v-if="!showForm">
      <p class="text-h5">
        {{ entity.name }}
      </p>
      <q-btn round color="secondary" icon="edit" size="sm" @click="showForm = true" />
    </template>

    <q-form v-else @submit.prevent="onUpdate" class="d-flex gap-2 align-start">
      <q-input filled v-model="name" :rules="[val => !!val || 'Обязательно']"/>

      <q-btn round type="submit" icon="save" color="primary" size="sm" class="q-mt-md" />
      <q-btn round icon="close" color="red" size="sm" class="q-mt-md" @click="showForm = false" />
    </q-form>
  </div>
</template>
