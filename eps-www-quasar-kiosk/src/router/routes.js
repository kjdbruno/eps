const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'index', component: () => import('pages/IndexPage.vue') },
      { path: 'complaint', name: 'file-complaint', component: () => import('pages/FileComplaintPage.vue') },
      { path: 'complaint/verify', name: 'verify-complaint', component: () => import('pages/VerifyComplaintPage.vue') },
      { path: 'feedback', name: 'feedback', component: () => import('pages/FeedbackPage.vue') },
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
