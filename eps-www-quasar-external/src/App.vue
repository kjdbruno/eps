<template>
  <router-view />
</template>

<script setup>
// import { onMounted, onBeforeUnmount } from 'vue';
// import { useAuthStore } from './stores/auth-store';
// import { useSocketStore } from './stores/socket-store';

// const auth = useAuthStore();
// const socketStore = useSocketStore();
// onMounted(() => {
//   if (auth.isAuthenticated && auth.user?.id) {
//     socketStore.connect(auth.user.id); // triggers userLoggedIn socket event
//   }
// })

// onBeforeUnmount(() => {
//   if (auth.user?.id) {
//     socketStore.disconnect(auth.user.id)
//   }
// })
</script>
