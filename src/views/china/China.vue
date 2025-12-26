<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      Китай
      <RouterLink :to="{ name: 'china1' }">Как устроено сознание типичного китайца Востоковед Алексей Маслов</RouterLink>
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