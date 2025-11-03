<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav style="display: flex; gap: 32px;margin-bottom: 32px;">
      <RouterLink to="/mur">Мурыч</RouterLink>
      <RouterLink to="/mur1">Оптимизируем сайт ECMA Script</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>