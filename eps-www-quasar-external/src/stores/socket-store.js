import { defineStore } from 'pinia';
import { io } from 'socket.io-client';

export const useSocketStore = defineStore('socket', {
  state: () => ({
    loggedUsers: [],
    notificationCount: 0,
    notificationList: [],
    hasNotifications: false,
  }),
  actions: {
    // connect(id) {

    //   const indexStore = useIndexStore();

    //   //initialized socket
    //   this.socket = io(indexStore.baseURL);

    //   //emit userLoggedIn -> backend
    //   this.socket.emit('userLoggedIn', { id });

    //   //emit register -> backend
    //   this.socket.emit('register', { userId: id });

    //   //listen to loggedUsers <- backend
    //   this.socket.on('loggedUsers', (users) => {
    //     this.onlineUsers = users;
    //   });

    //   this.socket.on('loadNotification', (notificationCount, notifications) => {
    //     console.log('Notifications received:', notificationCount);
    //     this.notificationCount = notificationCount;
    //     this.notifs = notifications;
    //     // for (let i = 0; i < notifications.length; i++) {
    //     //   this.notifs.push(notifications[i]);
    //     // }
    //   });
      
    // },
    // disconnect() {
    //   if (this.socket) {
    //     this.socket.disconnect();
    //     this.socket = null;
    //     this.onlineUsers = [];
    //   }
    // },
    // isOnline (userId) {
    //   if (!this.onlineUsers || !Array.isArray(this.onlineUsers)) return false;
    //     return this.onlineUsers.some(user => {
    //     if (!user) return false;
    //     if (user._custom && user._custom.value) {
    //       return user._custom.value.id === userId;
    //     }
    //     return user.userId === userId;
    //   });       
    // },
    // async readNotification(id) {
    //   this.notificationCount = 0;
    //   this.socket.emit('readNotification', { id });
    // },
  },
});
