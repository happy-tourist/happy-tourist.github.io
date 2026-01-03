<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useWindowScroll, useLocalStorage, useDebounceFn, useThrottleFn } from '@vueuse/core'
import { watch, ref } from 'vue';
import Loading from './components/Loading.vue';

const route = useRoute();

const { y } = useWindowScroll()
const scrollPositions = useLocalStorage('scroll_positions', {})

const savePosition = useDebounceFn((position) => {
  scrollPositions.value[route.name] = position
}, 300)

watch(y, savePosition)

const _loading = ref(false);

const waitForImages = useThrottleFn(() => {
  const images = Array.from(document.images);

  return Promise.all(
      images.map(img => {
        if (img.complete && img.naturalHeight !== 0) {
          return Promise.resolve(); // уже загружена
        }

        return new Promise(resolve => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true }); // чтобы не зависать
        });
      })
  );
}, 150);

watch(route, () => {
  _loading.value = true;
  document.body.classList.add('no-scroll');
  setTimeout(() => {
    const savedPosition = scrollPositions.value[route.name]

    waitForImages().then(() => {
      y.value = savedPosition || 0;
      _loading.value = false;
      document.body.classList.remove('no-scroll');
    });
  }, 150)
}, {
  immediate: true,
})

</script>

<template>
  <Loading v-if="_loading" />
  <div class="bg-bg-100">
    <header>
      <nav style="display: flex; gap: 32px;margin-bottom: 32px;">
        <RouterLink to="/">Домой</RouterLink>
      </nav>
    </header>

    <RouterView />
  </div>
</template>
