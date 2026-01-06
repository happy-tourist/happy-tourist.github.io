import { createRouter, createWebHashHistory } from 'vue-router'
import Page from '../views/Page.vue'
import uliss from './uliss.js';
import we from './we.js';
import ai from './ai.js';
import history from './history.js';
import hobbit from './hobbit.js';
import china from './china.js';
import node from './node.js';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Page,
    },
    uliss,
    we,
    ai,
    node,
    history,
    hobbit,
    china,
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
        {
          path: '/mur2',
          name: 'mur2',
          component: () => import('../views/murych/Mur2.vue'),
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
