import { useAuthStore } from 'src/stores/auth-store';

// Role gate for a preference section: anyone else lands back on /preference, which then picks a
// section they can open (or shows the empty state).
const preferenceGuard = (roles) => (to, from, next) => {
  const auth = useAuthStore();
  if (roles.includes(auth.user?.role)) {
    next();
  } else {
    next('/preference');
  }
};

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
    // One page per preference section, each its own route so the drawer's Preference group can
    // link (and highlight) them directly. Office/User are super-only, Holiday super/admin — the same
    // split the API enforces. `/preference` on its own sends you to the first section your role can open.
    children: [
      { path: '', component: () => import('src/pages/PreferencePage.vue'), name: 'preference' },
      { path: 'office', component: () => import('src/pages/PreferencePage.vue'), name: 'office preference', beforeEnter: preferenceGuard(['super', 'admin']) },
      { path: 'user', component: () => import('src/pages/PreferencePage.vue'), name: 'user preference', beforeEnter: preferenceGuard(['super']) },
      { path: 'holiday', component: () => import('src/pages/PreferencePage.vue'), name: 'holiday preference', beforeEnter: preferenceGuard(['super', 'admin']) },
      { path: 'canned', component: () => import('src/pages/PreferencePage.vue'), name: 'canned preference', beforeEnter: preferenceGuard(['super', 'admin']) },
      { path: 'clients', component: () => import('src/pages/PreferencePage.vue'), name: 'client preference', beforeEnter: preferenceGuard(['super', 'admin']) }
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
