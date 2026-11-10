<template>
    <span class="pav" :style="{ width: size + 'px', height: size + 'px' }">
        <span class="pav-face" :style="{ width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.38) + 'px' }">
            <img v-if="user?.avatar && !failed" :src="photo" @error="failed = true">
            <template v-else>{{ initials }}</template>
        </span>
        <i v-if="online" class="pav-dot" />
    </span>
</template>

<script setup>
import { ref, computed } from 'vue';

// A person's picture: their photo, or their initials when there is none, with a green dot when
// they are online.
const props = defineProps({
    user: { type: Object, default: null },
    size: { type: Number, default: 36 },
    online: { type: Boolean, default: false },
});

const failed = ref(false);
const photo = computed(() => `${process.env.VUE_APP_BACKEND_URL}${props.user?.avatar || ''}`);
const initials = computed(() => {
    const u = props.user || {};
    const name = `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.username || '';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
});
</script>
