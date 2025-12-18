<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      История
      <RouterLink :to="{ name: 'history1' }">Великая французская революция</RouterLink>
      <RouterLink :to="{ name: 'history2' }">США в 1960е Великое общество Контркультура Вьетнам</RouterLink>
      <RouterLink :to="{ name: 'history3' }">Эпоха великих географических открытий Часть первая</RouterLink>
      <RouterLink :to="{ name: 'history4' }">Эпоха великих географических открытий Часть вторая</RouterLink>
      <RouterLink :to="{ name: 'history5' }">Первые цивилизации Америки</RouterLink>
      <RouterLink :to="{ name: 'history6' }">Цивилизационный процесс в постклассический период</RouterLink>
      <RouterLink :to="{ name: 'history7' }">Изобретение цивилизации и начало исторического времени</RouterLink>
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