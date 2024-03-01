<script setup>
import {
  inject,
} from 'vue';

const { entities, user, entity } = inject('app');
</script>

<template>
  <q-page v-if="user" class="d-flex flex-column q-pa-md gap-3">
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
    <div class="d-flex flex-wrap gap-3 align-start">
      <q-btn
        v-for="item in entities"
        :key="item.id"
        :icon="item.type"
        :to="{ name: 'index', params: { id: item.id } }"
      >
        {{ item.name }}
      </q-btn>
    </div>
  </q-page>
</template>
