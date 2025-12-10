<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      <RouterLink :to="{ name: 'history' }">История</RouterLink>
      <RouterLink :to="{ name: 'history1' }">Великая французская революция</RouterLink>
      <RouterLink :to="{ name: 'history2' }">США в 1960е Великое общество Контркультура Вьетнам</RouterLink>
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