<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      История
      <RouterLink :to="{ name: 'history1' }">Изобретение цивилизации и начало исторического времени</RouterLink>
      <RouterLink :to="{ name: 'history2' }">Доктор Лао цзы</RouterLink>
      <RouterLink :to="{ name: 'history3' }">Североамериканские колонии до обретения независимости</RouterLink>
      <RouterLink :to="{ name: 'history4' }">Докитайская история Китая</RouterLink>
      <RouterLink :to="{ name: 'history5' }">Любовь, смерть и клинопись в Месопотамии</RouterLink>
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