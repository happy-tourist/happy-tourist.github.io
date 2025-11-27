<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useWindowScroll, useLocalStorage, useDebounceFn } from '@vueuse/core'
import { watch, onMounted } from 'vue';

const route = useRoute();

const { y } = useWindowScroll()
const scrollPositions = useLocalStorage('scroll_positions', {})

const savePosition = useDebounceFn((position) => {
  scrollPositions.value[route.name] = position
}, 300)

watch(y, savePosition)

onMounted(() => {
  setTimeout(() => {
    const savedPosition = scrollPositions.value[route.name]

    y.value = savedPosition || 0;
  }, 100)
})

</script>

<template>
  <div class="bg-bg-100">
    <header>
      <nav style="display: flex; gap: 32px;margin-bottom: 32px;">
        <RouterLink to="/">Домой</RouterLink>
      </nav>
    </header>

    <RouterView />
  </div>
</template>
