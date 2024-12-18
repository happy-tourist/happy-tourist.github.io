<script setup>
import { computed, inject } from 'vue';
import { Translator } from 'src/modules/translator/Translator';
import { AddEntity } from 'src/modules/AddEntity';

const { user } = inject('user');
const { entities, entity } = inject('entities');

const isDescription = computed(() => entity.value?.type === 'description');
</script>

<template>
  <q-page v-if="user">
    <div class="d-flex flex-column q-pa-md" style="min-height: inherit;overflow-y: auto;overflow-x: hidden">
      <div v-if="entities.length" class="d-flex flex-wrap gap-3 align-start">
        <q-btn
          v-for="item in entities"
          :key="item.id"
          :icon="item.type"
          :to="{ name: 'index', params: { id: item.id } }"
          :label="item.name"
        />
      </div>

      <Translator v-if="isDescription" />
    </div>

    <AddEntity />
  </q-page>
</template>
