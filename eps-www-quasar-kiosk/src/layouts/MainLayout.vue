<template>
    <q-layout view="hHh lpr fFf" class="kfr-layout">
        <q-page-container>
            <!-- The whole kiosk is one rounded card on a dark surround: the top bar (who, the time, a way home)
                 and, under it, whichever page the citizen is on. -->
            <div class="kfr-page">
                <div class="kfr-card">
                    <div class="kfr-top">
                        <router-link to="/" class="kfr-brand">
                            <img :src="logo" alt="ePS" />
                            <i class="brand-sep" />
                            <span class="brand-sub">kiosk</span>
                        </router-link>
                        <div class="kfr-title gt-xs">eParticipation System</div>
                        <div class="row items-center no-wrap q-gutter-md">
                            <div class="kfr-clock"><b>{{ time }}</b><small>{{ day }}</small></div>
                            <q-btn
                                v-if="route.name !== 'index'"
                                unelevated rounded color="primary" icon="bi-house-fill" label="Home" no-caps
                                class="kfr-home" to="/"
                            />
                        </div>
                    </div>
                    <div class="kfr-body">
                        <router-view />
                    </div>
                </div>
            </div>
        </q-page-container>
    </q-layout>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import logo from '../assets/epslogo.png';

const route = useRoute();

// the clock in the top bar
const time = ref('');
const day = ref('');
const tick = () => {
    const d = new Date();
    time.value = d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
    day.value = d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
};
tick();
const clock = setInterval(tick, 1000);
onBeforeUnmount(() => clearInterval(clock));
</script>
