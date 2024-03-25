<script setup>
import {
  inject,
} from 'vue';
import { LoginBtn } from 'src/modules/LoginBtn';
import { LogoutBtn } from 'src/modules/LogoutBtn';
import { AddEntity } from 'src/modules/AddEntity';

const { user, entity, hideHeader } = inject('app');
</script>

<template>
  <q-layout>
    <q-header v-if="!hideHeader" elevated>
      <q-toolbar class="gap-1">
        <q-toolbar-title>
          Happy Tourist
        </q-toolbar-title>

        <LoginBtn v-if="!user" />
        <LogoutBtn v-else />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
      <AddEntity :class="user && (!entity || entity.type === 'folder') ? '' : 'invisible'" />
    </q-page-container>
  </q-layout>
</template>
