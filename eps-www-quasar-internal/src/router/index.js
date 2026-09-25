// import { defineRouter } from '#q-app/wrappers'
// import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
// import routes from './routes'

// /*
//  * If not building with SSR mode, you can
//  * directly export the Router instantiation;
//  *
//  * The function below can be async too; either use
//  * async/await or return a Promise which resolves
//  * with the Router instance.
//  */

// export default defineRouter(function (/* { store, ssrContext } */) {
//   const createHistory = process.env.SERVER
//     ? createMemoryHistory
//     : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

//   const Router = createRouter({
//     scrollBehavior: () => ({ left: 0, top: 0 }),
//     routes,

//     // Leave this as is and make changes in quasar.conf.js instead!
//     // quasar.conf.js -> build -> vueRouterMode
//     // quasar.conf.js -> build -> publicPath
//     history: createHistory(process.env.VUE_ROUTER_BASE)
//   })

//   return Router
// })





// import { route } from 'quasar/wrappers';
// import { createRouter, createWebHistory } from 'vue-router';
// import routes from './routes';
// import { useAuthStore } from 'src/stores/auth-store';

// export default route(function ({ store }) {
//     const createHistory = createWebHistory;
//     const Router = createRouter({
//         scrollBehavior: () => ({ left: 0, top: 0 }),
//         routes,
//         history: createHistory(process.env.VUE_ROUTER_BASE)
//     });

//     Router.beforeEach(async (to, from, next) => {
//         const authStore = useAuthStore();

//         // If the route requires authentication
//         if (to.meta.requiresAuth) {
//             // If the user is already authenticated (has a token in store/localStorage)
//             if (authStore.isAuthenticated) {
//                 // OPTIONAL: On every protected route access, you could make a lightweight
//                 // API call to a protected endpoint (like /api/check-token) to verify
//                 // the token's validity with the server *before* rendering.
//                 // This adds robustness against manually altered tokens on client side.
//                 // However, the Axios interceptor already handles 401/403 responses.
//                 // If you *don't* do this check here, the user might briefly see the protected
//                 // content before an API call fails and the interceptor redirects.
//                 // For a smooth UX, the interceptor is often sufficient.

//                 next(); // Token exists on client, let API calls verify on server.
//             } else {
//                 // No token or not authenticated client-side, redirect to login
//                 // The interceptor will handle detailed token validation on API calls.
//                 next('/login');
//                 Notify.create({
//                     type: 'warning',
//                     message: 'Please log in to access this page.'
//                 });
//             }
//         } else {
//             next(); // Route does not require authentication, proceed
//         }
//     });

//     return Router;
// });





// quasar-frontend/src/router/index.js

import { route } from 'quasar/wrappers';
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router';
import routes from './routes';
import { useAuthStore } from 'src/stores/auth-store'; // Import your auth store here for guards

/*
 * If not building with SSR (server side rendering):
 * You can do here whatever you need to be executed at client side
 * Router.beforeEach and Router.afterEach hooks
 *
 * `route({ ... })` is a Vue router wrapper, a convenience for
 * setting up your router with Quasar's plug-ins.
 * You can instead export `const Router = () => ({ ... })` for Vue Router,
 * if you want to use it directly, but it's not recommended for Quasar.
 */

// This function returns the router instance
const createVueRouter = () => createRouter({
  scrollBehavior: () => ({ left: 0, top: 0 }),
  routes,

  // Leave this as is and make changes in quasar.conf.js `build > vueRouterMode`
  // Quasar's SSR needs a distinct history for client-side and server-side
  history: process.env.SERVER
    ? createMemoryHistory()
    : process.env.VUE_ROUTER_MODE === 'history'
    ? createWebHistory()
    : createWebHashHistory(),
});

// Export the router instance directly
let Router; // Declare a variable to hold the router instance

export default route(function ({ store }) { // <--- store is injected here by Quasar
  Router = createVueRouter(); // Assign the created router to our variable

  Router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore(store); // Access the store, pass `store` context from Quasar wrapper

    // If API key is not set, this is a fatal error or misconfiguration
    if (!process.env.VUE_APP_API_KEY) {
        console.error("VUE_APP_API_KEY is not defined. Please check quasar.conf.js and .env file.");
        return next('/error-config'); // Redirect to an error page or show a modal
    }

    // Public routes (login, home, register, error pages)
    const publicRoutes = ['/']; // Add any other public routes
    const isPublicRoute = publicRoutes.includes(to.path);

    // Check if token is valid on initial load or navigation to protected route
    if (!isPublicRoute && !authStore.isAuthenticated) {
        console.log('User not authenticated, checking token...');
        const tokenIsValid = await authStore.checkAuthStatus(); // This will try to validate token
        if (!tokenIsValid) {
            console.log('Token not valid, redirecting to login.');
            authStore.clearAuthData(); // Ensure cleanup if token was invalid
            return next('/'); // Redirect to login
        }
    }

    if (to.path === '/' && authStore.isAuthenticated) {
        console.log('Already logged in, redirecting to dashboard.');
        return next('/home'); // If already logged in, redirect from login page
    }

    next(); // Continue navigation
  });

  return Router;
});

// Export the Router instance after it has been created by the default export
// This allows other files to import it directly.
export { Router }; // <-- NEW EXPORT HERE