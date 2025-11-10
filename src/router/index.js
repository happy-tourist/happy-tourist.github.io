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
        },
        {
          path: '/ul4',
          name: 'ul4',
          component: () => import('../views/uliss/Ul4.vue'),
        },
        {
          path: '/ul5',
          name: 'ul5',
          component: () => import('../views/uliss/Ul5.vue'),
        }
      ]
    },
    {
      path: '/we',
      name: 'we',
      component: () => import('../views/we/We.vue'),
      children: [
        {
          path: 'we1',
          name: 'we1',
          component: () => import('../views/we/We1.vue'),
        },
        {
          path: 'we2',
          name: 'we2',
          component: () => import('../views/we/We2.vue'),
        },
        {
          path: 'we3',
          name: 'we3',
          component: () => import('../views/we/We3.vue'),
        },
        {
          path: 'we4',
          name: 'we4',
          component: () => import('../views/we/We4.vue'),
        },
        {
          path: 'we5',
          name: 'we5',
          component: () => import('../views/we/We5.vue'),
        },
        {
          path: 'we6',
          name: 'we6',
          component: () => import('../views/we/We6.vue'),
        },
        {
          path: 'we7',
          name: 'we7',
          component: () => import('../views/we/We7.vue'),
        },
        {
          path: 'we8',
          name: 'we8',
          component: () => import('../views/we/We8.vue'),
        },
        {
          path: 'we9',
          name: 'we9',
          component: () => import('../views/we/We9.vue'),
        },
        {
          path: 'we10',
          name: 'we10',
          component: () => import('../views/we/We10.vue'),
        }
      ]
    },
    {
      path: '/mur',
      name: 'mur',
      component: () => import('../views/murych/Mur.vue'),
      children: [
        {
          path: '/mur1',
          name: 'mur1',
          component: () => import('../views/murych/Mur1.vue'),
        },
      ]
    },
    {
      path: '/vuedush',
      name: 'vuedush',
      component: () => import('../views/vuedush/Vuedush.vue'),
      children: [
        {
          path: 'vuedush0',
          name: 'vuedush0',
          component: () => import('../views/vuedush/Vuedush0.vue'),
        },
        {
          path: 'vuedush1',
          name: 'vuedush1',
          component: () => import('../views/vuedush/Vuedush1.vue'),
        },
        {
          path: 'vuedush2',
          name: 'vuedush2',
          component: () => import('../views/vuedush/Vuedush2.vue'),
        },
      ]
    },
    {
      path: '/shoushenk',
      name: 'shoushenk',
      component: () => import('../views/shoushenk/Shoushenk.vue'),
      children: [
        {
          path: 'shoushenk1',
          name: 'shoushenk1',
          component: () => import('../views/shoushenk/Shoushenk1.vue'),
        },
      ]
    },
  ],
})

export default router
