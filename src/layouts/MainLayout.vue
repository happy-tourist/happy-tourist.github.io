<script setup>
import { useAutoAuth } from 'src/modules/auth/AutoAuth';
import { inject } from 'vue'
import { LoginBtn } from 'src/modules/auth/LoginBtn';
import { LogoutBtn } from 'src/modules/auth/LogoutBtn';
import { useEntities } from 'src/modules/Entities';

useAutoAuth();
useEntities();
const { user } = inject('user');

</script>

<template>
  <q-layout>
    <q-header elevated>
      <q-toolbar class="gap-1">
        <q-toolbar-title>
          Happy Tourist
        </q-toolbar-title>

        <LogoutBtn v-if="user" />
        <LoginBtn v-else />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
