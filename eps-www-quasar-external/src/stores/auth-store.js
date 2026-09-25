// import { defineStore, acceptHMRUpdate } from 'pinia';
// import { api } from 'src/boot/axios';
// import { useSocketStore } from '../stores/socket-store';
// import { LocalStorage } from 'quasar';

// export const useAuthStore = defineStore('authStore', {
//   state: () => ({
//     token: LocalStorage.getItem('jwt_token') || null, // Initialize from LocalStorage
//     isAuthenticated: !!LocalStorage.getItem('jwt_token'), // Set based on token presence
//     user: LocalStorage.getItem('user_data') ? JSON.parse(LocalStorage.getItem('user_data')) : null,
//     id: null
//   }),

//   getters: {
//     userRole: (state) => state.user.user_details ? state.user.user_details.roleId : null,
//   },

//   actions: {
//     async login(username, password) {
//       const response = await api.post('/login', {
//         username, password
//       });
//       this.token = response.data.token;
//       this.user = response.data.user;
//       this.isAuthenticated = true;
//       this.id = response.data.user.id;
      
//       LocalStorage.set('jwt_token', this.token); // Store token
//       LocalStorage.set('user_data', JSON.stringify(this.user)); // Store user data

//       return true;

//       // const socketStore = useSocketStore();
//       // socketStore.connect(this.id);
      
//     },
//     async logout () {
//       try {
//         // Optionally call the backend logout endpoint if you implement token blacklisting
//         // await api.post('/api/logout');

//         this.clearAuthData();
//         // Redirect to login page
//         this.$router.push('/'); // Assuming you have access to router
//         return true;
//       } catch (error) {
//         console.error('Logout failed (client-side cleanup anyway):', error);
//         this.clearAuthData(); // Always clear client-side data
//         this.$router.push('/');
//         throw error;
//       }
//     },
//     // A method to clear all authentication related data
//     clearAuthData() {
//       this.token = null;
//       this.isAuthenticated = false;
//       this.user = null;
//       LocalStorage.remove('jwt_token');
//       LocalStorage.remove('user_data');
//     },
//     // This is a more robust way to check if the current token is still valid
//     async checkAuthStatus() {
//       if (!this.token) {
//         this.clearAuthData();
//         return false;
//       }
//       try {
//         // Make a call to a protected endpoint that verifies the token
//         await api.get('/api/check-token');
//         this.isAuthenticated = true; // If successful, token is valid
//         return true;
//       } catch (error) {
//         console.error('JWT validation failed on client startup:', error);
//         // If token is expired or invalid, the interceptor will handle the logout and redirect
//         this.clearAuthData(); // Clear client state if token is bad
//         return false;
//       }
//     }
//   },
//   persist: true,
// })

// if (import.meta.hot) {
//   import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
// }
import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { Router } from 'src/router/index';
// import { socket } from 'src/boot/socket'; // Not needed to import directly here for subscription

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: localStorage.getItem('token') || null,
        isAuthenticated: !!localStorage.getItem('token'),
        user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
        //
        loggedUsers: [],
        notificationCount: 0,
        notificationList: [],
        hasNotifications: null,
    }),
    actions: {
        async login(username, password) {
            try {
                const response = await api.post('/login', {
                  username, password
                });
                this.token = response.data.token;
                this.user = response.data.user;
                this.isAuthenticated = true;

                localStorage.setItem("token", response.data.token);
                localStorage.setItem("user", JSON.stringify(response.data.user));

                // The socket connection and authentication will be handled by the $subscribe in src/boot/socket.js
                // once isAuthenticated becomes true.

                return true;
            } catch (error) {
                console.error('Login failed:', error.response?.data?.error || error.message);
                this.clearAuthData();
                throw error;
            }
        },
        async register(payload) {
            try {
                const response = await api.post('/citizen/register', payload);
                return response.data;
            } catch (error) {
                console.error('Registration failed:', error.response?.data || error.message);
                throw error;
            }
        },
        async verifyEmail(email, code) {
            try {
                const response = await api.post('/citizen/verify', { email, code });
                this.token = response.data.token;
                this.user = response.data.user;
                this.isAuthenticated = true;

                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                return true;
            } catch (error) {
                console.error('Email verification failed:', error.response?.data || error.message);
                throw error;
            }
        },
        async resendVerification(email) {
            try {
                const response = await api.post('/citizen/resend', { email });
                return response.data;
            } catch (error) {
                console.error('Resend verification failed:', error.response?.data || error.message);
                throw error;
            }
        },
        // Account recovery, step 1 of 2 — always resolves (never throws) since the backend's
        // response is deliberately identical whether or not the email is registered (see
        // CitizenController.forgotPassword); there's nothing to distinguish here.
        async forgotPassword(email) {
            try {
                const response = await api.post('/citizen/forgot-password', { email });
                return response.data;
            } catch (error) {
                console.error('Forgot-password request failed:', error.response?.data || error.message);
                throw error;
            }
        },
        // Account recovery, step 2 of 3 — confirms the code is right before the UI asks for a new
        // password. Doesn't consume the code server-side (see CitizenController.verifyResetCode);
        // step 3 (resetPassword below) re-validates it independently regardless.
        async verifyResetCode(email, code) {
            try {
                const response = await api.post('/citizen/verify-reset-code', { email, code });
                return response.data;
            } catch (error) {
                console.error('Verify-reset-code failed:', error.response?.data || error.message);
                throw error;
            }
        },
        // Account recovery, step 3 of 3. Deliberately does NOT sign the user in on success (unlike
        // verifyEmail) — resetting a password is exactly the moment to make them prove the new one
        // works via a normal login, not skip straight past it.
        async resetPassword(email, code, newPassword) {
            try {
                const response = await api.post('/citizen/reset-password', { email, code, newPassword });
                return response.data;
            } catch (error) {
                console.error('Reset-password failed:', error.response?.data || error.message);
                throw error;
            }
        },
        async loginCitizen(email, password) {
            try {
                const response = await api.post('/citizen/login', { email, password });
                this.token = response.data.token;
                this.user = response.data.user;
                this.isAuthenticated = true;

                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                return true;
            } catch (error) {
                console.error('Login failed:', error.response?.data || error.message);
                this.clearAuthData();
                throw error;
            }
        },
        async logout() {
            try {
                await api.post('/logout'); // If you have server-side logout
                this.clearAuthData();
                // Use the globally exported Router instance
                if (Router) { // Check if Router is defined
                    Router.push('/');
                } else {
                    console.error('Router instance not available for redirect (exported method).');
                }
                return true;
            } catch (error) {
                console.error('Logout failed (client-side cleanup anyway):', error);
                this.clearAuthData();
                // Ensure Router is available even on error paths
                if (Router) {
                    Router.push('/');
                } else {
                    console.error('Router instance not available for redirect after error (exported method).');
                }
                throw error;
            }
        },
        clearAuthData() {
            this.token = null;
            this.isAuthenticated = false;
            this.user = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // The socket's disconnect will be triggered by the $subscribe in src/boot/socket.js
        },
        async checkAuthStatus() {
            // This method remains primarily for HTTP-based token validation
            if (!this.token) {
                this.clearAuthData();
                return false;
            }
            try {
                await api.get('/check-token');
                this.isAuthenticated = true;
                return true;
            } catch (error) {
                console.error('JWT validation failed on client startup or explicit check:', error);
                this.clearAuthData(); // Interceptor also does this, but good to ensure
                return false;
            }
        },
        async readNotification() {
            this.notificationCount = 0;
            // this.socket.emit('readNotification', { id });
        },

        // Full notification history (read + unread), newest first — the socket only ever pushes
        // the UNREAD set for the live badge/toast, so once something is read it drops out of
        // that push. The tray reads this instead so seen items stay visible (matches the mobile
        // app's NotificationBell). See GET /api/notification.
        async fetchNotifications() {
            try {
                const { data } = await api.get('/notification');
                this.notificationList = data.data || [];
                this.notificationCount = data.unreadCount || 0;
                this.hasNotifications = this.notificationCount > 0;
            } catch (error) {
                console.error('Failed to load notifications:', error);
            }
        },

        // Clear the unread badge + persist it server-side. The socket 'readNotification' emit
        // (via the $subscribe in boot/socket.js, when count hits 0) does the same thing; this is
        // the HTTP path so it still works if the socket is down.
        async markNotificationsRead() {
            this.notificationCount = 0;
            this.hasNotifications = false;
            try {
                await api.post('/notification/read');
            } catch (error) {
                console.error('Failed to mark notifications read:', error);
            }
        },
    },
    persist: true,
});