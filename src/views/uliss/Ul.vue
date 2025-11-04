<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      <RouterLink to="/uliss">Улисс</RouterLink>
      <RouterLink to="/ul1">Глава 1</RouterLink>
      <RouterLink to="/ul2">Глава 2</RouterLink>
      <RouterLink to="/ul3">Глава 3</RouterLink>
      <RouterLink to="/ul4">Глава 4</RouterLink>
      <RouterLink to="/ul5">Глава 5</RouterLink>
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