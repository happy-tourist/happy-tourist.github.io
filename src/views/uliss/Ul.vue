<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      <RouterLink :to="{ name: 'ul' }">Улисс</RouterLink>
      <RouterLink :to="{ name: 'ul1' }">Глава 1</RouterLink>
      <RouterLink :to="{ name: 'ul2' }">Глава 2</RouterLink>
      <RouterLink :to="{ name: 'ul3' }">Глава 3</RouterLink>
      <RouterLink :to="{ name: 'ul4' }">Глава 4</RouterLink>
      <RouterLink :to="{ name: 'ul5' }">Глава 5</RouterLink>
      <RouterLink :to="{ name: 'ul6' }">Глава 6</RouterLink>
      <RouterLink :to="{ name: 'ul7' }">Глава 7</RouterLink>
      <RouterLink :to="{ name: 'ul8' }">Глава 8</RouterLink>
      <RouterLink :to="{ name: 'ul9' }">Глава 9</RouterLink>
      <RouterLink :to="{ name: 'ul10' }">Глава 10</RouterLink>
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