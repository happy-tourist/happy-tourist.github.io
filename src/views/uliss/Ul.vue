<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav style="display: flex; gap: 32px;margin-bottom: 32px;">
      <RouterLink to="/uliss">Улисс</RouterLink>
      <RouterLink to="/ul1">Глава 1</RouterLink>
      <RouterLink to="/ul2">Глава 2</RouterLink>
      <RouterLink to="/ul3">Глава 3</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>