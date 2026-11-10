<template>
    <q-layout view="hHh lpr fFf">
        <SiteHeader />
        <q-page-container>
            <q-page>
                <PortalLanding />
            </q-page>
        </q-page-container>
        <SiteFooter />
    </q-layout>
</template>

<script setup>
import SiteHeader from 'src/components/SiteHeader.vue';
import SiteFooter from 'src/components/SiteFooter.vue';
import PortalLanding from 'src/components/PortalLanding.vue';
</script>
