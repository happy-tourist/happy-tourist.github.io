<script setup>
import { useAutoAuth } from 'src/modules/auth/AutoAuth';
import { inject } from 'vue'

useAutoAuth();
const { user } = inject('user');

</script>

<template>
  <q-layout>
    <q-header elevated>
      <q-toolbar class="gap-1">
        <q-toolbar-title>
          Happy Tourist
        </q-toolbar-title>

        <span v-if="user">
          Yes
        </span>
        <span v-else>
          No
        </span>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
