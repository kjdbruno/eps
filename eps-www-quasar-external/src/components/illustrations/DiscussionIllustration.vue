<template>
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" class="illustration">
        <!-- back bubble -->
        <g transform="translate(150, 90)">
            <rect x="-70" y="-40" width="150" height="90" rx="20" fill="rgba(255,255,255,0.15)" />
            <path d="M-30,50 L-30,72 L-2,50 Z" fill="rgba(255,255,255,0.15)" />
        </g>

        <!-- front bubble, echoes the eps logo's speech bubble + 3 dots -->
        <g transform="translate(220, 150)">
            <rect x="-100" y="-55" width="200" height="110" rx="24" fill="rgba(255,255,255,0.95)" />
            <path d="M-40,55 L-40,85 L-6,55 Z" fill="rgba(255,255,255,0.95)" />
            <circle cx="-45" cy="0" r="12" fill="#FFC900" />
            <circle cx="0" cy="0" r="12" fill="#FFC900" />
            <circle cx="45" cy="0" r="12" fill="#FFC900" />
        </g>

        <!-- small avatar dots suggesting multiple participants -->
        <circle cx="70" cy="230" r="18" fill="rgba(255,255,255,0.5)" />
        <circle cx="110" cy="245" r="14" fill="rgba(255,255,255,0.35)" />
    </svg>
</template>

<style scoped>
.illustration {
    width: 100%;
    height: 100%;
}
</style>
