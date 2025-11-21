<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      <RouterLink to="/mur">Мурыч</RouterLink>
      <RouterLink to="/mur1">Оптимизируем сайт ECMA Script</RouterLink>
      <RouterLink to="/mur2">Вторая часть про Зюзьку с перезаписью куска про Array</RouterLink>
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