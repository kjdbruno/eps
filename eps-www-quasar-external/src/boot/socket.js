import { boot } from 'quasar/wrappers';
import { io } from 'socket.io-client';
import { useAuthStore } from 'src/stores/auth-store';
import { Toast } from 'src/boot/sweetalert'; 

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

    // Handle re-authentication on reconnection
    socket.on('connect', () => {
        console.log('Socket reconnected:', socket.id);
        if (authStore.isAuthenticated && authStore.token) {
            // Re-authenticate the socket if user is still logged in via HTTP
            socket.emit('authenticate', { token: authStore.token });
            //Register event listeners once reloaded
            socket.emit('register', { token: authStore.token });
        }

        // Handle all users logs
        socket.on('loadLogs', (users) => {
            authStore.loggedUsers = users;
            console.log(`users logs loaded:`, users);
        });

        // Handle notifications
        socket.on('loadNotifications', (notificationCount, notifications) => {
            authStore.notificationCount = notificationCount;
            authStore.notificationList = notifications;
            console.log(`notifications loaded:`, notifications);
            if (notificationCount > 0) {
                Toast.fire({
                    icon: "info",
                    html: `
                        <div class="text-h6 text-bold text-uppercase">New Notifications!</div>
                        <div class="text-caption;">You have new notifications.<div>
                    `
                });
                authStore.hasNotifications = true; // Update store state for UI
            } else {
                authStore.hasNotifications = false; // No new notifications
            }
            
        });

    });

    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
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