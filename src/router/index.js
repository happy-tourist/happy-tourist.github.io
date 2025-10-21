import { createRouter, createWebHistory } from 'vue-router'
import Ch1 from '../views/Ch1.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Ch1,
    },
    {
      path: '/ch2',
      name: 'about',
      component: () => import('../views/Ch2.vue'),
    },
  ],
})

export default router
