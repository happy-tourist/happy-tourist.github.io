<script setup>
import { DeleteEntity } from 'src/modules/DeleteEntity';
import { EditEntity } from 'src/modules/EditEntity';
import {
  computed,
  inject, ref, nextTick
} from 'vue';
import { EditText } from 'src/modules/EditText';

const { entities, user, entity } = inject('app');

const isDescription = computed(() => entity.value?.type === 'description');

const input = ref();

const onClick = () => {
  nextTick(() => {
    input.value.focus();
  });
};
</script>

<template>
  <q-page v-if="user" class="q-pa-md">
    <div class="d-flex justify-between">
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
    <div class="d-flex flex-column gap-3">
      <EditEntity />
      <div class="d-flex flex-wrap gap-3 align-start">
        <q-btn
          v-for="item in entities"
          :key="item.id"
          :icon="item.type"
          :to="{ name: 'index', params: { id: item.id } }"
          :label="item.name"
        />
      </div>
    </div>
    <div ref="input" contenteditable>лорем</div>
    <q-btn @click="onClick">+++</q-btn>
    <EditText v-if="isDescription" />
  </q-page>
</template>
