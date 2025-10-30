<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav style="display: flex; gap: 32px;margin-bottom: 32px;">
      <RouterLink to="/we">Мы</RouterLink>
      <RouterLink to="/we1">Глава 1</RouterLink>
      <RouterLink to="/we2">Глава 2</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>