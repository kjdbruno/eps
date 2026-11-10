<template>
    <q-layout view="hHh lpr fFf">
        <SiteHeader />
        <q-page-container>
            <q-page class="pt-page flex flex-center">
                <div class="pt-card pt-empty" style="max-width: 560px; width: 100%;">
                    <div class="nf-code">404</div>
                    <div class="pt-empty-t">We could not find that page</div>
                    <div>It may have moved, or the link is not quite right.</div>
                    <div class="row justify-center q-gutter-sm q-mt-lg">
                        <q-btn unelevated rounded no-caps color="primary" icon="bi-house" label="Go home" to="/" />
                        <q-btn outline rounded no-caps color="primary" icon="bi-file-earmark-text" label="File feedback" to="/file-complaint" />
                    </div>
                </div>
            </q-page>
        </q-page-container>
        <SiteFooter />
    </q-layout>
</template>

<script setup>
import SiteHeader from 'src/components/SiteHeader.vue';
import SiteFooter from 'src/components/SiteFooter.vue';
</script>

<style scoped>
.nf-code {
    font-size: clamp(72px, 16vw, 120px);
    font-weight: 800;
    line-height: 1;
    background: linear-gradient(135deg, #14305F, #204888 60%, #FFC900);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin-bottom: 8px;
}
</style>
