import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { Router } from 'src/router/index';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: localStorage.getItem('token') || null,
        isAuthenticated: !!localStorage.getItem('token'),
        user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
        accounts: [],
        //
        loggedUsers: [],
        notificationCount: 0,
        notificationList: [],
        hasNotifications: null,
        // Live connection status, kept in sync by boot/socket.js's 'connect'/'disconnect'
        // handlers — the online/offline dot on the sidebar avatar (MainLayout.vue) binds to this
        // instead of reading the raw socket.io-client instance's own `.connected` directly, which
        // isn't reactive: Vue can't track a plain (non-ref) external object's property, so that
        // dot used to just freeze at whatever `socket.connected` happened to be the last time
        // MainLayout re-rendered for some unrelated reason — not an actual live indicator.
        isSocketConnected: false,
    }),
    actions: {
        // rememberMe only controls how long the issued token stays valid (see AuthController.
        // login) — 4h by default, 30 days when checked. Storage itself is unchanged either way
        // (still plain localStorage, see below) since this app has no separate "session-only"
        // storage path to switch between.
        async login(username, password, rememberMe = false) {
            try {
                const response = await api.post('/login', {
                  username, password, rememberMe
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
        // Best-effort: the server-side call (AuthController.logout) sets forceLogoutAt so the
        // token can't be replayed after this even if it had leaked somewhere — but the LOCAL
        // cleanup + redirect below always happens regardless of whether that call succeeds, since
        // a network hiccup here shouldn't be able to strand someone on a page that thinks they're
        // still logged in.
        async logout() {
            try {
                await api.post('/logout');
            } catch (error) {
                console.error('Server-side logout failed (clearing local session anyway):', error);
            }
            this.clearAuthData();
            if (Router) {
                Router.push('/');
            } else {
                console.error('Router instance not available for redirect.');
            }
        },
        // Keys here MUST match what login() actually writes ('token'/'user' via the plain
        // localStorage API) — this used to call Quasar's LocalStorage.remove() with entirely
        // different key names ('jwt_token'/'user_data', leftover from an earlier draft of this
        // store), which silently did nothing: the real token/user JSON stayed sitting in
        // localStorage after every "logout", and would be read straight back into this store's
        // initial state on the next page load/refresh — i.e. logging out didn't survive a reload.
        clearAuthData() {
            this.token = null;
            this.isAuthenticated = false;
            this.user = null;
            // This used to stop at token/user, leaving notificationCount/notificationList/
            // hasNotifications/loggedUsers sitting in the (persist:true) store — so the tab-title
            // unread badge (App.vue) and favicon dot kept showing whatever was unread BEFORE
            // logout, even sitting on the login page with no active session at all. Cleared here
            // regardless of which path triggered the logout (self-service, force-logout-by-admin,
            // or another device signing in and kicking this one).
            this.notificationCount = 0;
            this.notificationList = [];
            this.hasNotifications = null;
            this.loggedUsers = [];
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
                const status = error.response?.status;
                if (status === 401 || status === 403) {
                    console.error('JWT validation failed on client startup or explicit check:', error);
                    this.clearAuthData(); // Interceptor also does this, but good to ensure
                    return false;
                }
                // The server could not be reached (or failed): that does not say the session is over, so it is kept and the page
                // shows its own error, instead of signing the person out because of a network blip.
                console.warn('Could not check the session, keeping it:', error.message);
                this.isAuthenticated = true;
                return true;
            }
        },
        async readNotification() {
            this.notificationCount = 0;
            // this.socket.emit('readNotification', { id });
        },
    },
    persist: true,
});
