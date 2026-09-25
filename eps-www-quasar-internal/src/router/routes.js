import { useAuthStore } from 'src/stores/auth-store';

const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('src/pages/IndexPage.vue'), name: 'login' }
    ]
  },
  {
    path: '/home',
    component: () => import('layouts/MainLayout.vue'),
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) {
        next('/')
      } else {
        next()
      }
    },
    children: [
      { path: '', component: () => import('src/pages/HomePage.vue'), name: 'home' }
    ]
  },
  {
    path: '/analytics',
    component: () => import('layouts/MainLayout.vue'),
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) {
        next('/')
      } else {
        next()
      }
    },
    children: [
      { path: '', component: () => import('src/pages/AnalyticsPage.vue'), name: 'analytics' }
    ]
  },
  {
    path: '/complaint',
    component: () => import('layouts/MainLayout.vue'),
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) {
        next('/')
      } else {
        next()
      }
    },
    children: [
      { path: '', component: () => import('src/pages/ComplaintPage.vue'), name: 'complaint' }
    ]
  },
  {
    path: '/feedback',
    component: () => import('layouts/MainLayout.vue'),
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) {
        next('/')
      } else {
        next()
      }
    },
    children: [
      { path: '', component: () => import('src/pages/FeedbackPage.vue'), name: 'feedback' }
    ]
  },
  {
    path: '/discussion',
    component: () => import('layouts/MainLayout.vue'),
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) {
        next('/')
      } else {
        next()
      }
    },
    children: [
      { path: '', component: () => import('src/pages/DiscussionPage.vue'), name: 'discussion' }
    ]
  },
  {
    path: '/poll',
    component: () => import('layouts/MainLayout.vue'),
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) {
        next('/')
      } else {
        next()
      }
    },
    children: [
      { path: '', component: () => import('src/pages/PollPage.vue'), name: 'poll' }
    ]
  },
  {
    path: '/preference',
    component: () => import('layouts/MainLayout.vue'),
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) {
        next('/')
      } else {
        next()
      }
    },
    children: [
      { path: '', component: () => import('src/pages/PreferencePage.vue'), name: 'preference' }
    ]
  },
  {
    path: '/report',
    component: () => import('layouts/MainLayout.vue'),
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) {
        next('/')
      } else {
        next()
      }
    },
    children: [
      { path: '', component: () => import('src/pages/ReportPage.vue'), name: 'report' }
    ]
  },
  {
    path: '/me',
    component: () => import('layouts/MainLayout.vue'),
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) {
        next('/')
      } else {
        next()
      }
    },
    children: [
      { path: '', component: () => import('src/pages/MePage.vue'), name: 'me' }
    ]
  },
  {
    path: '/message',
    component: () => import('layouts/MainLayout.vue'),
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) {
        next('/')
      } else {
        next()
      }
    },
    children: [
      { path: '', component: () => import('src/pages/MessagePage.vue'), name: 'message' }
    ]
  },
  {
    path: '/log',
    component: () => import('layouts/MainLayout.vue'),
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) {
        next('/')
      } else {
        next()
      }
    },
    children: [
      { path: '', component: () => import('src/pages/LogPage.vue'), name: 'log' }
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
