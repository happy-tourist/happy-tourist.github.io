<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="bg-bg-100">
    <header>
      <nav style="display: flex; gap: 32px;margin-bottom: 32px;">
        <RouterLink to="/">Глава 1</RouterLink>
        <RouterLink to="/ch2">Глава 2</RouterLink>
        <RouterLink to="/ch3">Глава 3</RouterLink>
      </nav>
    </header>

    <RouterView />
  </div>
</template>
