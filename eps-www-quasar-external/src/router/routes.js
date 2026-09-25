import { useAuthStore } from 'src/stores/auth-store';

const routes = [
  {
    path: '/',
    component: () => import('src/pages/IndexPage.vue'), name: 'index'
  },
  { path: '/login', component: () => import('src/pages/LoginPage.vue'), name: 'login' },
  { path: '/register', component: () => import('src/pages/RegisterPage.vue'), name: 'register' },
  { path: '/verify-email', component: () => import('src/pages/VerifyEmailPage.vue'), name: 'verify-email' },
  { path: '/forgot-password', component: () => import('src/pages/ForgotPasswordPage.vue'), name: 'forgot-password' },
  { path: '/verify-complaint', component: () => import('src/pages/VerifyComplaintPage.vue'), name: 'verify-complaint' },
  { path: '/track', component: () => import('src/pages/TrackPage.vue'), name: 'track' },
  { path: '/file-complaint', component: () => import('src/pages/FileComplaintPage.vue'), name: 'file-complaint' },
  // Discussion/poll are usable with no account — these guest-facing routes redirect to their
  // /home equivalent when already authenticated (see router/index.js), same as /file-complaint.
  { path: '/discussion', component: () => import('src/pages/DiscussionListPage.vue'), name: 'discussion' },
  { path: '/discussion/:id', component: () => import('src/pages/DiscussionThreadPage.vue'), name: 'discussion-thread' },
  { path: '/poll', component: () => import('src/pages/PollListPage.vue'), name: 'poll' },
  { path: '/poll/:id', component: () => import('src/pages/PollVotePage.vue'), name: 'poll-vote' },
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
      { path: '', component: () => import('src/pages/HomePage.vue'), name: 'home' },
      { path: 'complaint', component: () => import('src/pages/ComplaintPage.vue'), name: 'complaint' },
      { path: 'discussion', component: () => import('src/components/DiscussionList.vue'), name: 'home-discussion' },
      { path: 'discussion/:id', component: () => import('src/components/DiscussionThread.vue'), name: 'home-discussion-thread' },
      { path: 'poll', component: () => import('src/components/PollList.vue'), name: 'home-poll' },
      { path: 'poll/:id', component: () => import('src/components/PollVote.vue'), name: 'home-poll-vote' }
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
