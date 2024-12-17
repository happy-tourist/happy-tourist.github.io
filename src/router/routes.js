const routes = [
  {
    path: '/:id?',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { name: 'index', path: '', component: () => import('pages/IndexPage.vue') }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
