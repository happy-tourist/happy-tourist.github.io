<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      Нода Лаврик
      <RouterLink :to="{ name: 'node1' }">Урок 1</RouterLink>
      <RouterLink :to="{ name: 'node1dz' }">Урок 1. ДЗ</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>

<style scoped>
nav{
  display: flex;
  gap: 32px;
  margin-bottom: 32px;
  flex-wrap: wrap;
  color: #fff;
}
</style>