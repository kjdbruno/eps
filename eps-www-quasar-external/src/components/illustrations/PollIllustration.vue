<template>
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" class="illustration">
        <!-- results bars -->
        <rect x="80" y="170" width="26" height="70" rx="6" fill="rgba(255,255,255,0.3)" />
        <rect x="118" y="140" width="26" height="100" rx="6" fill="rgba(255,255,255,0.45)" />
        <rect x="156" y="110" width="26" height="130" rx="6" fill="rgba(255,255,255,0.6)" />

        <!-- ballot box -->
        <g transform="translate(255, 0)">
            <path d="M0,150 L20,240 L140,240 L160,150 Z" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.55)" stroke-width="3" />
            <rect x="40" y="140" width="80" height="18" rx="9" fill="rgba(255,255,255,0.7)" />
            <rect x="70" y="146" width="20" height="6" rx="3" fill="#204888" />

            <!-- ballot slip going in, with gold check -->
            <g transform="translate(80, 90) rotate(-10)">
                <rect x="-38" y="-50" width="76" height="100" rx="8" fill="white" />
                <circle cx="0" cy="0" r="24" fill="#FFC900" />
                <path d="M-10,0 L-2,9 L13,-9" fill="none" stroke="#204888" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
            </g>
        </g>
    </svg>
</template>

<style scoped>
.illustration {
    width: 100%;
    height: 100%;
}
</style>
