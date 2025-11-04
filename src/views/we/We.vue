<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      <RouterLink to="/we">Мы</RouterLink>
      <RouterLink to="/we1">Глава 1</RouterLink>
      <RouterLink to="/we2">Глава 2</RouterLink>
      <RouterLink to="/we3">Глава 3</RouterLink>
      <RouterLink to="/we4">Глава 4</RouterLink>
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