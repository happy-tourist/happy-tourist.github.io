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
      name: 'ch2',
      component: () => import('../views/Ch2.vue'),
    },
    {
      path: '/ch3',
      name: 'ch3',
      component: () => import('../views/Ch3.vue'),
    },
  ],
})

export default router
