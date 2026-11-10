import { boot } from 'quasar/wrappers';
import { io } from 'socket.io-client';
import { useAuthStore } from 'src/stores/auth-store';
import { Toast } from 'src/boot/sweetalert';
import { showDesktopNotification } from 'src/utils/desktopNotify';
import { NotificationLink } from 'src/utils/notification';

// Create a global Socket.IO instance
const socket = io(process.env.VUE_APP_BACKEND_URL, {
    autoConnect: false, // Don't auto-connect, we'll do it manually after auth check
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
});

export default boot(({ app, router }) => {
    app.config.globalProperties.$socket = socket; // Make socket available globally

    const authStore = useAuthStore();

    // Event listener for successful socket authentication
    socket.on('authenticated', (data) => {
        console.log('Socket authenticated as:', data.userId);
        // Update store if needed (though main auth is via HTTP JWT)
        // authStore.setSocketAuthenticated(true); // Example state update
    });

    // Event listener for socket authentication errors
    socket.on('auth_error', (data) => {
        console.error('Socket authentication error:', data.message);
        // You might want to log this but avoid multiple notifys if HTTP interceptor also fires
    });

    // Event listener for forced logout from server
    socket.on('force_logout', (data) => {
        console.log('Forced logout from server:', data.reason);
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">denied!</div>
                <div class="text-caption;">You have been logged out.<div>
            `
        });
        authStore.logout(); // Use your existing logout action to clear data and redirect
    });

    // Handle all users logs — registered ONCE here, not inside 'connect' below. socket.io-client
    // fires 'connect' again on every reconnect (a network blip, tab sleep/wake, etc.), and
    // re-registering these two listeners each time used to stack up duplicate handlers — so a
    // single 'loadNotifications' push after a few reconnects would fire the same handler that many
    // times, spamming the "New Notifications!" toast and redundantly reassigning store state.
    socket.on('loadLogs', (users) => {
        authStore.loggedUsers = users;
        console.log(`users logs loaded:`, users);
    });

    // Handle notifications
    socket.on('loadNotifications', (notificationCount, notifications) => {
        // The server pushes this on every 'authenticate'/'register' — i.e. every reconnect,
        // including a plain page refresh — not just when something actually new arrives (see
        // sockets/index.js). It used to toast whenever notificationCount > 0, so refreshing with
        // 3 still-unread notifications from yesterday popped "New Notifications!" every single
        // time. Comparing against the count already in the store (still the OLD value here, one
        // line above where it gets overwritten) means the toast only fires on a genuine increase.
        const isNewArrival = notificationCount > authStore.notificationCount;
        // which of these were not in the list a moment ago (the ones to tell the desktop about)
        const knownIds = new Set((authStore.notificationList || []).map(n => n.id));
        const fresh = (notifications || []).filter(n => !knownIds.has(n.id) && !n.isRead);
        authStore.notificationCount = notificationCount;
        authStore.notificationList = notifications;
        console.log(`notifications loaded:`, notifications);
        if (isNewArrival) {
            Toast.fire({
                icon: "info",
                html: `
                    <div class="text-h6 text-bold text-uppercase">New Notifications!</div>
                    <div class="text-caption;">You have new notifications.<div>
                `
            });
        }
        authStore.hasNotifications = notificationCount > 0;

        // A card from the operating system too, when this window is not the one in front. Several at
        // once collapse into one, so a burst never floods the corner of the screen.
        if (isNewArrival && fresh.length) {
            const latest = fresh[0];
            showDesktopNotification({
                title: fresh.length > 1 ? `${fresh.length} new notifications` : 'eParticipation System',
                body: fresh.length > 1 ? fresh.slice(0, 3).map(n => `• ${n.content}`).join('\n') : latest.content,
                tag: 'eps-notification',
                onClick: () => { const to = NotificationLink(latest); router.push(to || '/home'); },
            });
        }
    });

    // Handle re-authentication on reconnection
    socket.on('connect', () => {
        console.log('Socket reconnected:', socket.id);
        authStore.isSocketConnected = true;
        if (authStore.isAuthenticated && authStore.token) {
            // Re-authenticate the socket if user is still logged in via HTTP
            socket.emit('authenticate', { token: authStore.token });
            //Register event listeners once reloaded
            socket.emit('register', { token: authStore.token });
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        authStore.isSocketConnected = false;
        // You might want to show a warning if connection lost
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Socket reconnect attempt:', attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
        console.error('Socket reconnect error:', error);
    });

    socket.on('reconnect_failed', () => {
        console.error('Socket reconnect failed after multiple attempts.');
    });

    // Watch for changes in authentication status from the Pinia store
    // This allows connecting/disconnecting the socket based on login state
    authStore.$subscribe((mutation, state) => {
        if (state.isAuthenticated && state.token && !socket.connected) {
            console.log('Auth state changed to authenticated, connecting socket...');
            socket.connect(); // Connect the socket
            socket.emit('authenticate', { token: state.token }); // Authenticate it
            //
        } else if (!state.isAuthenticated && socket.connected) {
            console.log('Auth state changed to unauthenticated, disconnecting socket...');
            socket.disconnect(); // Disconnect the socket
        }
        
        // Handle notification read state
        // If notification count is 0 and hasNotifications is true, emit readNotification
        if (state.notificationCount == 0 && state.hasNotifications) {
            const id = state.user.id;
            socket.emit('readNotification', { id });
        }
    });

    // Initial connection attempt if user is already authenticated on app load
    if (authStore.isAuthenticated && authStore.token) {
        socket.connect();
        socket.emit('authenticate', { token: authStore.token });
    }

});

export { socket };