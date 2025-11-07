<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      <RouterLink to="/we">Мы</RouterLink>
      <RouterLink :to="{ name: 'we1' }">Глава 1</RouterLink>
      <RouterLink :to="{ name: 'we2' }">Глава 2</RouterLink>
      <RouterLink :to="{ name: 'we3' }">Глава 3</RouterLink>
      <RouterLink :to="{ name: 'we4' }">Глава 4</RouterLink>
      <RouterLink :to="{ name: 'we5' }">Глава 5</RouterLink>
      <RouterLink :to="{ name: 'we6' }">Глава 6</RouterLink>
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