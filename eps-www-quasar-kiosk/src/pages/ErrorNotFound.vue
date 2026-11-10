<template>
    <div class="kfr-layout" style="min-height: 100vh; padding: 20px;">
        <div class="kx-card kx-done" style="max-width: 560px; margin: 12vh auto 0;">
            <div class="nf-code">404</div>
            <div class="kx-done-t">We could not find that page</div>
            <div class="kx-done-s">Let's take you back to the start.</div>
            <q-btn unelevated rounded no-caps color="primary" class="kx-btn q-mt-lg" icon="bi-house-fill" label="Go home" to="/" />
        </div>
    </div>
</template>

<style scoped>
.nf-code {
    font-size: clamp(72px, 18vw, 130px);
    font-weight: 800;
    line-height: 1;
    background: linear-gradient(135deg, #00306B, #004EA8 60%, #FDB813);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}
</style>
