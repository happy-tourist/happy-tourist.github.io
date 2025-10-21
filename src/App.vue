<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="bg-bg-100">
    <header>
      <nav style="display: flex; gap: 32px;margin-bottom: 32px;">
        <RouterLink to="/">Глава 1</RouterLink>
        <RouterLink to="/about">Глава 2</RouterLink>
      </nav>
    </header>

    <RouterView />
  </div>
</template>
