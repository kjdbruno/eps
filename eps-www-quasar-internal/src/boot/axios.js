// import { defineBoot } from '#q-app/wrappers'
// import axios from 'axios'

// // Be careful when using SSR for cross-request state pollution
// // due to creating a Singleton instance here;
// // If any client changes this (global) instance, it might be a
// // good idea to move this instance creation inside of the
// // "export default () => {}" function below (which runs individually
// // for each client)
// const api = axios.create({ baseURL: 'http://192.168.200.86:1000/' });

// api.interceptors.request.use(config => {
//   const token = localStorage.getItem('token'); // Assuming you store the token in localStorage
//   if (token) {
//     config.headers.Authorization = `${token}`;
//   }
//   return config;
//   }, error => {
//   return Promise.reject(error);
// });

// export default defineBoot(({ app }) => {
//   // for use inside Vue files (Options API) through this.$axios and this.$api

//   app.config.globalProperties.$axios = axios
//   // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
//   //       so you won't necessarily have to import axios in each vue file

//   app.config.globalProperties.$api = api
//   // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
//   //       so you can easily perform requests against your app's API
// })

// export { api }
import { boot } from 'quasar/wrappers';
import axios from 'axios';
import { useAuthStore } from 'src/stores/auth-store'; // Import your auth store

const api = axios.create({
  baseURL: `${process.env.VUE_APP_BACKEND_URL}/api`, // Your Express.js backend API URL
  // baseURL: `/api/`
  // No `withCredentials: true` needed here for JWTs, as it's not cookie-based session
});

// what the API says when the session itself is no longer good (see middlewares/AuthMiddleware.js)
const SESSION_ERRORS = [
  'No token provided', 'Token not properly formatted', 'Token expired', 'Failed to authenticate token',
  'Account disabled', 'Session invalidated', 'API key is missing', 'Invalid API key',
];

export default boot(({ app, router }) => {
  // Inject axios instance for global use
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;

  // Request Interceptor: Add JWT to every request
  api.interceptors.request.use(config => {
    const token = localStorage.getItem('token'); // Assuming you store the JWT in localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // If you have an API key that needs to be sent with every request:
      // config.headers.api = process.env.YOUR_API_KEY; // or from a store/config
    }
    config.headers.api = process.env.VUE_APP_API_KEY; // Ensure API key is sent if required by backend
    return config;
  }, error => {
    return Promise.reject(error);
  });

    // Response Interceptor: Handle token expiration/invalidity
  api.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;
      const authStore = useAuthStore();

      // 428: the account has to choose its own password first (see ForcePasswordDialog.vue): raise the flag, keep the session
      if (error.response?.status === 428 && error.response.data?.mustChangePassword && authStore.user) {
        authStore.user = { ...authStore.user, mustChangePassword: true };
        localStorage.setItem('user', JSON.stringify(authStore.user));
      }

      // Only a failure of the SESSION sends the person back to the start page: no or a bad token, an expired or ended session, a
      // disabled account, a bad API key. Any other 401/403 (a wrong password at sign-in, a wrong code, an action this role may not do)
      // is the page's own to show: it stays where it is and shows the message.
      if (error.response && (error.response.status === 401 || error.response.status === 403) && SESSION_ERRORS.includes(error.response.data?.error)) {
        console.warn('Authentication error:', error.response.data.message || error.response.data.error);

        // Check for specific token expiration message
        if (error.response.data.error === 'Token expired' || error.response.data.error === 'Failed to authenticate token') {
          // Notify.create({
          //     type: 'negative',
          //     message: error.response.data.message || 'Your session has expired. Please log in again.'
          // });
          console.log(error.response.data.message || 'Your session has expired. Please log in again.')
        } else if (error.response.data.error === 'No token provided' || error.response.data.error === 'Token not properly formatted') {
          // Notify.create({
          //     type: 'warning',
          //     message: 'No valid authentication token found. Please log in.'
          // });
          console.log('No valid authentication token found. Please log in.')
        } else if (error.response.data.error === 'API key is missing' || error.response.data.error === 'Invalid API key') {
            // Notify.create({
          //     type: 'negative',
          //     message: error.response.data.error || 'Authentication error: Invalid API key.'
          // });
          console.log(error.response.data.error || 'Authentication error: Invalid API key.')
        }

        authStore.clearAuthData(); // Clear client-side token and user data
        router.push('/'); // Redirect to login page

        return Promise.reject(error); // Reject the promise to stop further processing
      }

      return Promise.reject(error);
    }
  );
});

export { api };