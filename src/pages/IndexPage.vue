<script setup>
import { inject } from 'vue';

const { user } = inject('user');
const { entities } = inject('entities');
</script>

<template>
  <q-page v-if="user">
    <div class="d-flex flex-column q-pa-md" style="min-height: inherit;">
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
  </q-page>
</template>
