<template>
  <router-view v-slot="{ Component }">
    <transition name="page-fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
import { watch } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';

const AuthStore = useAuthStore();

// Unread notification signals — tab title prefix, favicon red dot, and a chime — all driven off
// the one AuthStore.notificationCount every other notification UI (the bell badge, the right-side
// modal) already uses, so nothing new needs to update this. App.vue is always mounted regardless
// of route, including pre-auth on the login page (count is 0 there, so everything below is a
// no-op) — no per-page wiring needed.

/* -------------------- tab title -------------------- */
// Same idea as Messenger's "(1) Messenger" tab title / Gmail's unread count. Captured once here
// as the "clean" title (rather than hardcoding productName) so this keeps working if that ever
// changes, and a reload always starts from the real title instead of a stale "(3) ..." left over
// from last session.
const baseTitle = document.title;

/* -------------------- favicon red dot -------------------- */
// index.html declares 4 <link rel="icon"> (one per size) — captured once at load, via cloneNode
// so the ORIGINAL elements themselves are preserved, not just their href strings (title/type/
// sizes attributes all come along for free on restore). While badged, all 4 are swapped for a
// single generated 32x32 icon; restoring puts the original 4 back exactly as they were.
const originalIconLinks = [...document.querySelectorAll('link[rel="icon"]')].map(el => el.cloneNode(true));
let badgedIconHref = null; // cached after first draw — same badge every time, no need to redraw

const buildBadgedFavicon = () => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        // White ring behind the dot so it reads clearly against any icon artwork/background.
        ctx.beginPath();
        ctx.arc(size - 7, 7, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(size - 7, 7, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#E02424';
        ctx.fill();
        resolve(canvas.toDataURL('image/png'));
    };
    // Best-effort — a failed draw (e.g. the icon file 404s) just leaves the real favicon in place.
    img.onerror = () => resolve(null);
    img.src = '/icons/favicon-32x32.png';
});

const replaceIconLinks = (linkEls) => {
    document.querySelectorAll('link[rel="icon"]').forEach(el => el.remove());
    linkEls.forEach(el => document.head.appendChild(el));
};

const showBadgedFavicon = async () => {
    if (!badgedIconHref) badgedIconHref = await buildBadgedFavicon();
    if (!badgedIconHref) return;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.sizes = '32x32';
    link.href = badgedIconHref;
    replaceIconLinks([link]);
};

const restoreOriginalFavicon = () => replaceIconLinks(originalIconLinks.map(el => el.cloneNode(true)));

/* -------------------- chime -------------------- */
// A short synthesized two-tone chime via Web Audio — no audio asset to ship or license. Only
// plays on a genuine INCREASE in count (a new notification actually arrived), never on initial
// mount/page load or when the count drops (reading notifications) — see the prevCount guard below.
let audioCtx = null;
const playChime = () => {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        const now = audioCtx.currentTime;
        [880, 1108.73].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const start = now + i * 0.12;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(start);
            osc.stop(start + 0.3);
        });
    } catch (error) {
        // Autoplay can be blocked before any user gesture on this tab, or the API can be missing
        // entirely — never let a chime failure be anything more than silence.
        console.error('Unable to play notification chime:', error);
    }
};

/* -------------------- desktop notification -------------------- */
// The real OS-level toast (Windows Action Center / macOS Notification Center) — works identically
// whether this is running as a plain browser tab, an installed PWA, or the Electron desktop build
// (all three implement the same standard Notification Web API; Electron's renderer routes it to
// the native OS notifier automatically, no extra IPC/main-process code needed). Only fires while
// this app is actually running somewhere — closed browser/tab or a fully quit Electron app means
// nothing, same limitation the in-app bell already has.
const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window;

// Ask once per session, only once someone's actually signed in — never prompt on the public
// login page. A prior explicit "Block" is remembered by the browser/OS itself; this just skips
// asking again this session once it's been answered either way.
watch(() => AuthStore.isAuthenticated, (isAuthenticated) => {
    if (isAuthenticated && notificationsSupported && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
    }
}, { immediate: true });

const showDesktopNotification = () => {
    if (!notificationsSupported || Notification.permission !== 'granted') return;
    // document.hasFocus() isn't checked here on purpose — the whole point is to surface this even
    // when the window is minimized/behind others; a notification while it's genuinely focused and
    // on-screen is just a harmless extra (same as how Slack/Discord behave).
    try {
        const latest = AuthStore.notificationList?.[0];
        const notification = new Notification('ePS — New notification', {
            body: latest?.content || 'You have new notifications.',
            icon: '/icons/icon-192x192.png',
            tag: 'eps-notification', // collapses a burst into one toast instead of stacking many
        });
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } catch (error) {
        // Some platforms (e.g. certain Linux notification daemons) can throw despite permission
        // being 'granted' — never let that take down the rest of the reactions below.
        console.error('Unable to show desktop notification:', error);
    }
};

watch(() => AuthStore.notificationCount, async (count, prevCount) => {
    document.title = count > 0 ? `(${count > 99 ? '99+' : count}) ${baseTitle}` : baseTitle;
    if (count > 0) await showBadgedFavicon();
    else restoreOriginalFavicon();
    // prevCount is undefined on the immediate initial call — guarded so opening the app with
    // pre-existing unread notifications doesn't chime/toast, only a genuinely new arrival does.
    if (prevCount != null && count > prevCount) {
        playChime();
        showDesktopNotification();
    }
}, { immediate: true });
</script>
