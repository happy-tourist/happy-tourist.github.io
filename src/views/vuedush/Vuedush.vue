<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      <RouterLink to="/vuedush">Душнила вью</RouterLink>
      <RouterLink :to="{ name: 'vuedush0' }">Глава 0</RouterLink>
      <RouterLink :to="{ name: 'vuedush1' }">Глава 1</RouterLink>
      <RouterLink :to="{ name: 'vuedush2' }">Глава 2</RouterLink>
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