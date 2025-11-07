<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav style="display: flex; gap: 32px;margin-bottom: 32px;">
      <RouterLink to="/uliss">Улисс</RouterLink>
      <RouterLink to="/we">Мы</RouterLink>
      <RouterLink to="/mur">Мурыч</RouterLink>
      <RouterLink to="/vuedush">Душнила вью</RouterLink>
      <RouterLink to="/shoushenk">Шоушенк</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>