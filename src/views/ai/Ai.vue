<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      <RouterLink :to="{ name: 'ai' }">Ai</RouterLink>
      <RouterLink :to="{ name: 'ai1' }">Глава 1</RouterLink>
      <RouterLink :to="{ name: 'ai2' }">Глава 2</RouterLink>
      <RouterLink :to="{ name: 'ai3' }">Глава 3</RouterLink>
      <RouterLink :to="{ name: 'ai4' }">Глава 4</RouterLink>
      <RouterLink :to="{ name: 'ai5' }">Глава 5</RouterLink>
      <RouterLink :to="{ name: 'ai6' }">AI база по программированию</RouterLink>
      <RouterLink :to="{ name: 'ai7' }">Устройство и работа MCP</RouterLink>
      <RouterLink :to="{ name: 'ai8' }">Пишем собственный mcp-сервер</RouterLink>
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
}
</style>