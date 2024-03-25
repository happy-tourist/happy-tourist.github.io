<script setup>
import { DeleteEntity } from 'src/modules/DeleteEntity';
import {
  computed,
  inject,
} from 'vue';
import { EditLine, EditText } from 'src/modules/EditText';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from 'vuefire';

const {
  entities,
  user,
  entity,
  hideHeader,
  increaseCounterLoadings,
  decreaseCounterLoadings,
} = inject('app');

const isDescription = computed(() => entity.value?.type === 'description');

const db = useFirestore();

const onUpdate = async (name) => {
  increaseCounterLoadings();
  await updateDoc(doc(db, 'entities', entity.value.id), { name }).finally(() => {
    decreaseCounterLoadings();
  });
};
</script>

<template>
  <q-page v-if="user">
    <div class="d-flex flex-column" style="min-height: inherit;">
      <template v-if="!hideHeader">
        <div class="q-pa-md d-flex justify-between">
          <q-breadcrumbs>
            <q-breadcrumbs-el
              :to="{ name: 'index', params: { id: '' } }"
              label="Главная"
            />
            <template v-if="entity?.parentFolders.length">
              <q-breadcrumbs-el
                v-for="item in entity.parentFolders"
                :key="item.id"
                :to="{ name: 'index', params: { id: item.id } }"
                :label="item.name"
              />
            </template>

            <q-breadcrumbs-el
              v-if="entity"
              :to="{ name: 'index', params: { id: entity.id } }"
              :label="entity.name"
            />
          </q-breadcrumbs>

          <DeleteEntity :class="entity ? '' : 'invisible'" :disabled="entities?.length" />
        </div>
        <div class="q-pa-md d-flex flex-column gap-3">
          <EditLine
            v-if="entity" :translate="entity.name" :line="entity.name" @add-translate="onUpdate"
          />
          <div v-if="entities.length" class="d-flex flex-wrap gap-3 align-start">
            <q-btn
              v-for="item in entities"
              :key="item.id"
              :icon="item.type"
              :to="{ name: 'index', params: { id: item.id } }"
              :label="item.name"
            />
          </div>
        </div>
      </template>

      <EditText v-if="isDescription" v-model="hideHeader" />
    </div>
  </q-page>
</template>
