<script setup>
import {
  inject,
} from 'vue';
import { LoginBtn } from 'src/modules/LoginBtn';
import { LogoutBtn } from 'src/modules/LogoutBtn';
import { AddEntity } from 'src/modules/AddEntity';

const { user, entity } = inject('app');
</script>

<template>
  <q-layout>
    <q-header elevated>
      <q-toolbar class="gap-1">
        <AddEntity :class="user && (!entity || entity.type === 'folder') ? '' : 'invisible'" />

        <q-toolbar-title>
          Happy Tourist
        </q-toolbar-title>

        <LoginBtn v-if="!user" />
        <LogoutBtn v-else />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
