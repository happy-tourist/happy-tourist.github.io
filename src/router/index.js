import { createRouter, createWebHistory } from 'vue-router'
import Page from '../views/Page.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Page,
    },
    {
      path: '/uliss',
      name: 'uliss',
      component: () => import('../views/uliss/Ul.vue'),
      children: [
        {
          path: '/ul1',
          name: 'ul1',
          component: () => import('../views/uliss/Ul1.vue'),
        },
        {
          path: '/ul2',
          name: 'ul2',
          component: () => import('../views/uliss/Ul2.vue'),
        },
        {
          path: '/ul3',
          name: 'ul3',
          component: () => import('../views/uliss/Ul3.vue'),
        }
      ]
    },
    {
      path: '/we',
      name: 'we',
      component: () => import('../views/we/We.vue'),
      children: [
        {
          path: '/we1',
          name: 'we1',
          component: () => import('../views/we/We1.vue'),
        },
        {
          path: '/we2',
          name: 'we2',
          component: () => import('../views/we/We2.vue'),
        }
      ]
    },
  ],
})

export default router
