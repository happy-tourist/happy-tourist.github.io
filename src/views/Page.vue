<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav style="display: flex; gap: 32px;margin-bottom: 32px;">
<!--
      <RouterLink to="/mur">Мурыч</RouterLink>
      <RouterLink to="/vuedush">Душнила вью</RouterLink>
      <RouterLink to="/shoushenk">Шоушенк</RouterLink>
      <RouterLink :to="{ name: 'ai' }">Ai</RouterLink>
      <RouterLink :to="{ name: 'hobbit' }">Хоббит</RouterLink>-->
      <RouterLink :to="{ name: 'ul' }">Улисс</RouterLink>
      <RouterLink :to="{ name: 'we' }">Мы</RouterLink>
      <RouterLink :to="{ name: 'history' }">История</RouterLink>
      <RouterLink :to="{ name: 'china' }">Китай</RouterLink>
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