<template>
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" class="illustration">
        <!-- document -->
        <rect x="120" y="50" width="160" height="210" rx="14" fill="rgba(255,255,255,0.14)" />
        <rect x="120" y="50" width="160" height="210" rx="14" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="3" />
        <line x1="146" y1="95" x2="254" y2="95" stroke="rgba(255,255,255,0.6)" stroke-width="6" stroke-linecap="round" />
        <line x1="146" y1="120" x2="254" y2="120" stroke="rgba(255,255,255,0.45)" stroke-width="6" stroke-linecap="round" />
        <line x1="146" y1="145" x2="222" y2="145" stroke="rgba(255,255,255,0.45)" stroke-width="6" stroke-linecap="round" />
        <line x1="146" y1="185" x2="254" y2="185" stroke="rgba(255,255,255,0.3)" stroke-width="6" stroke-linecap="round" />
        <line x1="146" y1="210" x2="200" y2="210" stroke="rgba(255,255,255,0.3)" stroke-width="6" stroke-linecap="round" />

        <!-- location pin badge -->
        <g transform="translate(255, 30)">
            <circle cx="0" cy="0" r="34" fill="rgba(255,255,255,0.95)" />
            <path d="M0,-14 C10,-14 18,-6 18,4 C18,16 0,32 0,32 C0,32 -18,16 -18,4 C-18,-6 -10,-14 0,-14 Z" fill="#204888" />
            <circle cx="0" cy="3" r="6" fill="white" />
        </g>

        <!-- resolved badge -->
        <g transform="translate(120, 250)">
            <circle cx="0" cy="0" r="26" fill="#FFC900" />
            <path d="M-10,0 L-3,8 L12,-9" fill="none" stroke="#204888" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
    </svg>
</template>

<style scoped>
.illustration {
    width: 100%;
    height: 100%;
}
</style>
