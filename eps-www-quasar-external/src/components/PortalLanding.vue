<template>
    <div class="lp">
        <!-- ============================ HERO ============================ -->
        <section class="lp-hero">
            <div class="lp-blob lp-blob--a" /><div class="lp-blob lp-blob--b" />
            <div class="lp-wrap lp-hero-grid">
                <div class="lp-hero-copy">
                    <span class="lp-badge"><i /> {{ authed ? `welcome back, ${firstName}` : 'open to every resident' }}</span>
                    <h1 class="lp-h1">Your voice,<br />your <span class="lp-mark">city.</span></h1>
                    <p class="lp-lead">
                        Report a concern, join the conversation and vote on the decisions that shape the City —
                        in a couple of minutes, from any device.
                    </p>
                    <div class="lp-cta">
                        <q-btn rounded unelevated no-caps size="lg" color="secondary" text-color="dark" icon-right="bi-arrow-right" label="File feedback" class="lp-btn" :to="authed ? '/home/complaint?action=file' : '/file-complaint'" />
                        <q-btn rounded outline no-caps size="lg" color="white" class="lp-btn" :label="authed ? 'My feedback' : 'Sign in'" :to="authed ? '/home/complaint' : '/login'" />
                    </div>
                    <ul class="lp-trust">
                        <li><q-icon name="bi-check-circle-fill" /> One account for everything</li>
                        <li><q-icon name="bi-check-circle-fill" /> Routed automatically</li>
                        <li><q-icon name="bi-check-circle-fill" /> Follow every update</li>
                    </ul>
                </div>

                <!-- a little picture of what the portal feels like -->
                <div class="lp-hero-art gt-sm" aria-hidden="true">
                    <div class="lp-card lp-card--a">
                        <div class="lp-card-row">
                            <span class="lp-card-ico"><q-icon name="bi-file-earmark-text" /></span>
                            <div><b>Feedback filed</b><small>routed to the right office</small></div>
                            <span class="lp-chip lp-chip--blue">ongoing</span>
                        </div>
                        <div class="lp-track"><i class="on" /><i class="on" /><i class="on" /><i /></div>
                        <div class="lp-track-l"><span>Filed</span><span>Verified</span><span>Routed</span><span>Done</span></div>
                    </div>
                    <div class="lp-card lp-card--b">
                        <div class="lp-card-t">Should the plaza stay open late?</div>
                        <div class="lp-bar"><span style="width: 68%"><em>Yes</em><em>68%</em></span></div>
                        <div class="lp-bar lp-bar--alt"><span style="width: 32%"><em>No</em><em>32%</em></span></div>
                    </div>
                    <div class="lp-card lp-card--c">
                        <span class="lp-av">JM</span>
                        <div><b>New comment</b><small>“Thank you for opening this topic.”</small></div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ============================ SERVICES ============================ -->
        <section class="lp-wrap lp-services">
            <div class="lp-grid">
                <div v-for="s in services" :key="s.key" class="lp-tile" @click="router.push(s.to)">
                    <span class="lp-tile-ico" :style="{ background: s.tint, color: s.ink }"><q-icon :name="s.icon" /></span>
                    <div class="lp-tile-t">{{ s.title }}</div>
                    <div class="lp-tile-s">{{ s.text }}</div>
                    <span class="lp-tile-go">{{ s.cta }} <q-icon name="bi-arrow-right" /></span>
                </div>
            </div>
        </section>

        <!-- ============================ FEATURES ============================ -->
        <section class="lp-section">
            <div class="lp-wrap">
                <div class="lp-head">
                    <span class="lp-over">what you can do</span>
                    <h2 class="lp-h2">Three ways to take part</h2>
                    <p class="lp-sub">File feedback, join a discussion or answer a survey with your account. Anyone can read discussions and surveys and see recent feedback.</p>
                </div>

                <div v-for="(f, i) in features" :key="f.key" class="lp-feat" :class="{ 'lp-feat--flip': i % 2 === 1 }">
                    <div class="lp-feat-art" :style="{ background: f.bg }">
                        <q-icon :name="f.icon" />
                        <span class="lp-feat-dot lp-feat-dot--1" /><span class="lp-feat-dot lp-feat-dot--2" />
                    </div>
                    <div class="lp-feat-copy">
                        <span class="lp-over" :style="{ color: f.ink }">{{ f.title }}</span>
                        <h3 class="lp-h3">{{ f.headline }}</h3>
                        <p class="lp-p">{{ f.text }}</p>
                        <ul class="lp-points">
                            <li v-for="p in f.points" :key="p"><q-icon name="bi-check-circle-fill" :style="{ color: f.ink }" />{{ p }}</li>
                        </ul>
                        <q-btn rounded unelevated no-caps color="primary" :label="f.cta" icon-right="bi-arrow-right" :to="f.to" />
                    </div>
                </div>
            </div>
        </section>

        <!-- ============================ HOW IT WORKS ============================ -->
        <section class="lp-section lp-section--tint">
            <div class="lp-wrap">
                <div class="lp-head">
                    <span class="lp-over">how it works</span>
                    <h2 class="lp-h2">From your concern to a result</h2>
                </div>
                <div class="lp-steps">
                    <div v-for="(s, i) in steps" :key="s.title" class="lp-step">
                        <span class="lp-step-n">{{ i + 1 }}</span>
                        <div class="lp-step-t">{{ s.title }}</div>
                        <div class="lp-step-s">{{ s.text }}</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ============================ WEATHER + FAQ ============================ -->
        <section class="lp-section">
            <div class="lp-wrap lp-split">
                <div>
                    <div class="lp-head lp-head--left">
                        <span class="lp-over">good to know</span>
                        <h2 class="lp-h2">Questions, answered</h2>
                    </div>
                    <q-list class="lp-faq">
                        <q-expansion-item v-for="q in faq" :key="q.q" :label="q.q" header-class="lp-faq-h" expand-icon="bi-chevron-down" expanded-icon="bi-chevron-up">
                            <div class="lp-faq-a">{{ q.a }}</div>
                        </q-expansion-item>
                    </q-list>
                </div>

                <div class="lp-aside">
                    <div class="lp-weather">
                        <div class="lp-weather-t">around the city</div>
                        <template v-if="geoStatus === 'loading'">
                            <q-spinner-ios size="1.5em" color="white" />
                            <div class="lp-weather-s">getting your location...</div>
                        </template>
                        <template v-else-if="geoStatus === 'ready' && weather">
                            <div class="lp-weather-row">
                                <q-icon :name="weatherInfo.icon" size="3em" />
                                <div>
                                    <div class="lp-weather-deg">{{ Math.round(weather.temperature) }}&deg;C</div>
                                    <div class="lp-weather-s text-uppercase">{{ weatherInfo.label }}</div>
                                </div>
                            </div>
                            <div class="lp-weather-s q-mt-md"><q-icon name="bi-geo-alt-fill" size="xs" class="q-mr-xs" />{{ locationName || 'your location' }}</div>
                            <div class="lp-weather-s">wind {{ Math.round(weather.windspeed) }} km/h &middot; updated {{ ago(weather.time) }}</div>
                        </template>
                        <template v-else>
                            <q-icon name="bi-geo-alt" size="2em" />
                            <div class="lp-weather-s q-mt-sm">{{ geoError || 'Enable location access to see your local weather.' }}</div>
                            <q-btn flat dense no-caps color="secondary" label="try again" class="q-mt-sm" @click="loadWeather" />
                        </template>
                    </div>

                    <router-link class="lp-help" :to="authed ? '/home/complaint' : '/login'">
                        <span class="lp-help-ico"><q-icon name="bi-search" /></span>
                        <div>
                            <b>{{ authed ? 'See what you have filed' : 'Already filed something?' }}</b>
                            <small>{{ authed ? 'Open My feedback to follow every update.' : 'Sign in to see everything you have filed.' }}</small>
                        </div>
                        <q-icon name="bi-arrow-right" class="lp-help-go" />
                    </router-link>
                    <div class="lp-help lp-help--static">
                        <span class="lp-help-ico lp-help-ico--gold"><q-icon name="bi-envelope" /></span>
                        <div>
                            <b>Need a hand?</b>
                            <small>Write to us at cicto@sanfernandocity.gov.ph</small>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ============================ CTA ============================ -->
        <section class="lp-wrap lp-final">
            <div class="lp-band">
                <div>
                    <h2 class="lp-band-t">{{ authed ? 'Filed something before signing in?' : 'Ready to be heard?' }}</h2>
                    <p class="lp-band-s">{{ authed ? 'Claim it, or see everything you have filed.' : 'It takes a couple of minutes, and you do not need an account.' }}</p>
                </div>
                <div class="lp-band-btns">
                    <q-btn rounded unelevated no-caps size="lg" color="secondary" text-color="dark" :label="authed ? 'Claim feedback' : 'File feedback'" :to="authed ? '/home/complaint?action=claim' : '/file-complaint'" />
                    <q-btn rounded outline no-caps size="lg" color="white" :label="authed ? 'View my feedback' : 'Sign in'" :to="authed ? '/home/complaint' : '/login'" />
                </div>
            </div>
        </section>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import moment from 'moment';
import { useAuthStore } from 'src/stores/auth-store';
import { useWeather } from 'src/composables/useWeather';

const props = defineProps({ authed: { type: Boolean, default: false } });

const router = useRouter();
const authStore = useAuthStore();
const { geoStatus, geoError, weather, locationName, weatherInfo, loadWeather } = useWeather();
const ago = (t) => moment(t).fromNow();
const firstName = computed(() => authStore.user?.firstname || '');

// the three services, routed to the signed-in versions when there is an account
const base = computed(() => (props.authed ? '/home' : ''));
const feedbackTo = computed(() => (props.authed ? '/home/complaint?action=file' : '/file-complaint'));

const services = computed(() => [
    { key: 'complaint', title: 'Feedback', icon: 'bi-file-earmark-text', cta: 'File feedback', to: feedbackTo.value, tint: '#E9F3FD', ink: '#1B5E9F', text: "Report a concern — it is routed to the right city department for you." },
    { key: 'discussion', title: 'Discussion', icon: 'bi-people', cta: 'Join a discussion', to: `${base.value}/discussion`, tint: '#FCEFE0', ink: '#A2540F', text: 'Read the topics the City has opened — and sign in to add your voice.' },
    { key: 'poll', title: 'Survey', icon: 'bi-ui-checks', cta: 'Answer a survey', to: `${base.value}/poll`, tint: '#FDF6DA', ink: '#7F6200', text: 'Sign in and answer a few questions to help shape the decisions the City is weighing.' },
]);

const features = computed(() => [
    {
        key: 'complaint', title: 'Feedback', icon: 'bi-file-earmark-text', bg: 'linear-gradient(135deg, #68AFF1, #9CCBF6)', ink: '#1B5E9F',
        headline: 'Report it, and it finds the right department on its own',
        text: "Describe what is wrong in your own words. The system reads it and sends it to the responsible office, so there is no category to guess and no wrong queue to land in.",
        points: [
            props.authed ? 'Signed in, so it goes straight to the right office' : 'Create a free account to file it',
            'File it anonymously if you prefer: only your name is hidden',
            'Auto-assigned to the responsible department',
            props.authed ? 'Follow every update from “My feedback”, or cancel it before it is completed' : 'Follow every update, or cancel it before it is completed',
        ],
        cta: 'File feedback', to: feedbackTo.value,
    },
    {
        key: 'discussion', title: 'Discussion', icon: 'bi-people', bg: 'linear-gradient(135deg, #DB812C, #EBA565)', ink: '#A2540F',
        headline: 'Join the conversation on topics the City has opened up',
        text: 'City offices open threads on matters that affect the community. Read what others are saying and add your own comment or suggestion.',
        points: [
            props.authed ? 'Your real name shows on what you post' : 'Anyone can read — sign in to comment',
            'See what other residents are saying in real time',
            'Threads stay open for as long as the City keeps them active',
        ],
        cta: 'Join a discussion', to: `${base.value}/discussion`,
    },
    {
        key: 'poll', title: 'Survey', icon: 'bi-ui-checks', bg: 'linear-gradient(135deg, #EEC336, #F6DB78)', ink: '#7F6200',
        headline: 'Answer surveys and help shape decisions for the City',
        text: 'Offices ask short questions on real decisions. Cast your vote in a click — results appear only after you vote, so the crowd never sways your answer.',
        points: [
            'One response per person per survey',
            'Results are revealed after you have voted',
            props.authed ? 'Your answers are tied to your account' : 'Anyone can read a survey — sign in to answer',
        ],
        cta: 'Answer a survey', to: `${base.value}/poll`,
    },
]);

const steps = [
    { title: 'Choose a service', text: 'File feedback, or sign in to join a discussion or answer a survey.' },
    { title: 'Say it your way', text: 'Describe your concern in your own words. No category to guess.' },
    { title: 'Routed for you', text: 'The system sends it to the responsible office automatically.' },
    { title: 'Follow the result', text: 'See every update from My feedback in your account.' },
];

const faq = [
    { q: 'Do I need an account?', a: 'Yes, to file feedback, join a discussion or answer a survey. That ties what you post to a real resident, keeps all your feedback in one place, and lets you follow it and cancel it before it is completed. Anyone can read discussions and surveys and see recent feedback.' },
    { q: 'Where does my feedback go?', a: 'The system reads what you wrote and assigns it to the responsible office automatically. A supervisor can re-route it if needed.' },
    { q: 'Can I report anonymously?', a: 'Yes. When you file feedback signed in, switch on “File anonymously”. Only your name is hidden from the offices and the staff; your feedback is handled as usual.' },
    { q: 'How do I follow up on what I filed?', a: 'Sign in and open “My feedback”. You will see every update and can reply. Feedback filed earlier as a guest can be added to your account with “Claim feedback”.' },
];
</script>

<style scoped>
.lp { background: #F6F9FC; }
.lp-wrap { width: 100%; max-width: 1180px; margin: 0 auto; padding: 0 20px; }

/* ---------- hero ---------- */
.lp-hero { position: relative; overflow: hidden; color: #fff; padding: 72px 0 120px; background: linear-gradient(135deg, #0E1E48 0%, #14305F 45%, #204888 100%); }
.lp-blob { position: absolute; border-radius: 50%; pointer-events: none; }
.lp-blob--a { right: -120px; top: -140px; width: 520px; height: 520px; background: rgba(255, 255, 255, .06); }
.lp-blob--b { left: -100px; bottom: -160px; width: 420px; height: 420px; background: rgba(255, 201, 0, .1); }
.lp-hero-grid { position: relative; display: grid; gap: 40px; grid-template-columns: 1fr; align-items: center; }
@media (min-width: 1024px) { .lp-hero-grid { grid-template-columns: 1.1fr 1fr; } }
.lp-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 99px; background: rgba(255, 255, 255, .12); border: 1px solid rgba(255, 255, 255, .2); font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
.lp-badge i { width: 8px; height: 8px; border-radius: 50%; background: #FFC900; box-shadow: 0 0 0 4px rgba(255, 201, 0, .25); }
.lp-h1 { font-size: clamp(40px, 6.4vw, 72px); line-height: 1.04; font-weight: 800; margin: 18px 0 16px; letter-spacing: -.01em; }
.lp-mark { color: #FFC900; position: relative; white-space: nowrap; }
.lp-mark::after { content: ''; position: absolute; left: 0; right: 0; bottom: 2px; height: 10px; background: rgba(255, 201, 0, .28); border-radius: 6px; z-index: -1; }
.lp-lead { font-size: 18px; line-height: 1.6; opacity: .9; max-width: 520px; margin: 0; }
.lp-cta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
.lp-btn { padding: 8px 28px; font-weight: 700; }
.lp-trust { list-style: none; margin: 26px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 22px; font-size: 13.5px; opacity: .92; }
.lp-trust li { display: inline-flex; align-items: center; gap: 8px; }
.lp-trust .q-icon { color: #FFC900; }

/* the little picture on the right of the hero */
.lp-hero-art { position: relative; height: 380px; }
.lp-card { position: absolute; background: #fff; color: #1E2A44; border-radius: 18px; padding: 16px 18px; box-shadow: 0 24px 50px rgba(5, 15, 45, .35); }
.lp-card b { display: block; font-size: 14px; }
.lp-card small { display: block; font-size: 12px; color: #6B7A99; margin-top: 2px; }
.lp-card--a { top: 0; right: 10px; width: 330px; transform: rotate(2deg); }
.lp-card--b { top: 150px; left: 0; width: 300px; transform: rotate(-3deg); }
.lp-card--c { bottom: 0; right: 40px; width: 300px; display: flex; align-items: center; gap: 12px; transform: rotate(1.5deg); }
.lp-card-row { display: flex; align-items: center; gap: 12px; }
.lp-card-row > div { flex: 1; min-width: 0; }
.lp-card-ico { flex: none; width: 40px; height: 40px; border-radius: 12px; background: #E5EEFC; color: #204888; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.lp-chip { padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
.lp-chip--blue { background: #E5EEFC; color: #2557B3; }
.lp-track { display: flex; gap: 6px; margin-top: 16px; }
.lp-track i { flex: 1; height: 6px; border-radius: 6px; background: #E4EAF3; }
.lp-track i.on { background: #204888; }
.lp-track-l { display: flex; justify-content: space-between; margin-top: 6px; font-size: 10.5px; color: #8493AC; text-transform: uppercase; letter-spacing: .04em; }
.lp-card-t { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
.lp-bar { height: 28px; border-radius: 10px; background: #F1F4F9; overflow: hidden; margin-top: 8px; }
.lp-bar span { display: flex; justify-content: space-between; align-items: center; height: 100%; padding: 0 10px; border-radius: 10px; background: #204888; color: #fff; font-size: 12px; font-weight: 700; }
.lp-bar span em { font-style: normal; }
.lp-bar--alt span { background: #FFC900; color: #1D1D1D; }
.lp-av { flex: none; width: 38px; height: 38px; border-radius: 50%; background: #204888; color: #fff; font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; }

/* ---------- services, overlapping the hero ---------- */
.lp-services { margin-top: -64px; position: relative; z-index: 2; }
.lp-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
@media (min-width: 800px) { .lp-grid { grid-template-columns: repeat(3, 1fr); } }
.lp-tile { background: #fff; border: 1px solid #E4EAF3; border-radius: 22px; padding: 26px; cursor: pointer; box-shadow: 0 18px 40px rgba(20, 40, 90, .1); transition: transform .18s, box-shadow .18s, border-color .18s; }
.lp-tile:hover { transform: translateY(-6px); border-color: #204888; box-shadow: 0 26px 50px rgba(20, 40, 90, .16); }
.lp-tile-ico { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 16px; }
.lp-tile-t { font-size: 20px; font-weight: 800; text-transform: uppercase; color: #1E2A44; }
.lp-tile-s { font-size: 14px; line-height: 1.55; color: #6B7A99; margin-top: 6px; }
.lp-tile-go { display: inline-flex; align-items: center; gap: 8px; margin-top: 16px; font-size: 14px; font-weight: 700; color: #204888; }

/* ---------- sections ---------- */
.lp-section { padding: 84px 0; }
.lp-section--tint { background: #fff; border-top: 1px solid #E4EAF3; border-bottom: 1px solid #E4EAF3; }
.lp-head { text-align: center; max-width: 640px; margin: 0 auto 48px; }
.lp-head--left { text-align: left; margin: 0 0 24px; }
.lp-over { display: inline-block; font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #204888; }
.lp-h2 { font-size: clamp(28px, 4vw, 40px); line-height: 1.12; font-weight: 800; color: #1E2A44; margin: 8px 0 0; }
.lp-h3 { font-size: clamp(24px, 3vw, 32px); line-height: 1.2; font-weight: 800; color: #1E2A44; margin: 8px 0 12px; }
.lp-sub { font-size: 16px; line-height: 1.6; color: #6B7A99; margin: 12px 0 0; }
.lp-p { font-size: 16px; line-height: 1.65; color: #6B7A99; margin: 0 0 16px; }

.lp-feat { display: grid; gap: 32px; grid-template-columns: 1fr; align-items: center; margin-bottom: 72px; }
.lp-feat:last-child { margin-bottom: 0; }
@media (min-width: 900px) { .lp-feat { grid-template-columns: 1fr 1fr; gap: 64px; } .lp-feat--flip .lp-feat-art { order: 2; } }
.lp-feat-art { position: relative; aspect-ratio: 16 / 11; border-radius: 28px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 96px; overflow: hidden; box-shadow: 0 24px 50px rgba(20, 40, 90, .18); }
.lp-feat-dot { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, .14); }
.lp-feat-dot--1 { width: 220px; height: 220px; right: -60px; top: -70px; }
.lp-feat-dot--2 { width: 140px; height: 140px; left: -40px; bottom: -50px; background: rgba(255, 255, 255, .1); }
.lp-points { list-style: none; margin: 0 0 22px; padding: 0; display: grid; gap: 10px; }
.lp-points li { display: flex; align-items: flex-start; gap: 10px; font-size: 14.5px; color: #3A4A68; line-height: 1.5; }
.lp-points .q-icon { margin-top: 3px; flex: none; }

/* ---------- how it works ---------- */
.lp-steps { display: grid; gap: 24px; grid-template-columns: 1fr; position: relative; }
@media (min-width: 900px) { .lp-steps { grid-template-columns: repeat(4, 1fr); } .lp-steps::before { content: ''; position: absolute; left: 12%; right: 12%; top: 27px; height: 2px; background: repeating-linear-gradient(90deg, #C9D3E4 0 8px, transparent 8px 16px); } }
.lp-step { position: relative; text-align: center; padding: 0 8px; }
.lp-step-n { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 54px; height: 54px; border-radius: 50%; background: #204888; color: #fff; font-size: 20px; font-weight: 800; box-shadow: 0 0 0 8px #fff, 0 10px 24px rgba(32, 72, 136, .3); }
.lp-step-t { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #1E2A44; margin-top: 18px; }
.lp-step-s { font-size: 13.5px; line-height: 1.55; color: #6B7A99; margin-top: 6px; }

/* ---------- faq + weather ---------- */
.lp-split { display: grid; gap: 32px; grid-template-columns: 1fr; align-items: stretch; }
@media (min-width: 900px) { .lp-split { grid-template-columns: 1.5fr 1fr; gap: 56px; } }
.lp-faq { background: #fff; border: 1px solid #E4EAF3; border-radius: 18px; overflow: hidden; }
.lp-faq :deep(.q-expansion-item + .q-expansion-item) { border-top: 1px solid #EEF2F8; }
.lp-faq :deep(.lp-faq-h) { font-weight: 700; color: #1E2A44; padding: 14px 20px; }
.lp-faq-a { padding: 0 20px 18px; font-size: 14px; line-height: 1.65; color: #6B7A99; }
.lp-aside { display: flex; flex-direction: column; gap: 14px; }
.lp-aside .lp-weather { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center; }
.lp-help { display: flex; align-items: center; gap: 14px; padding: 16px 18px; background: #fff; border: 1px solid #E4EAF3; border-radius: 18px; color: #1E2A44; text-decoration: none; transition: border-color .15s, box-shadow .15s, transform .15s; }
.lp-help:not(.lp-help--static):hover { border-color: #204888; box-shadow: 0 12px 26px rgba(20, 40, 90, .1); transform: translateY(-2px); }
.lp-help b { display: block; font-size: 14px; }
.lp-help small { display: block; margin-top: 2px; font-size: 12.5px; line-height: 1.5; color: #6B7A99; }
.lp-help > div { flex: 1; min-width: 0; }
.lp-help-ico { flex: none; width: 44px; height: 44px; border-radius: 14px; background: #E5EEFC; color: #204888; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.lp-help-ico--gold { background: #FFF4DB; color: #8A5B00; }
.lp-help-go { color: #204888; }
.lp-weather { border-radius: 22px; padding: 28px; color: #fff; background: linear-gradient(160deg, #204888, #0E1E48); box-shadow: 0 20px 44px rgba(20, 40, 90, .2); }
.lp-weather-t { font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #FFC900; margin-bottom: 16px; }
.lp-weather-row { display: flex; align-items: center; gap: 16px; }
.lp-weather-deg { font-size: 44px; font-weight: 800; line-height: 1; }
.lp-weather-s { font-size: 13px; opacity: .85; line-height: 1.6; }

/* ---------- closing band ---------- */
.lp-final { padding-bottom: 72px; }
.lp-band { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 24px; padding: 40px 44px; border-radius: 28px; color: #fff; background: linear-gradient(135deg, #14305F, #204888); position: relative; overflow: hidden; }
.lp-band::after { content: ''; position: absolute; right: -60px; top: -80px; width: 300px; height: 300px; border-radius: 50%; background: rgba(255, 201, 0, .14); }
.lp-band > * { position: relative; z-index: 1; }
.lp-band-t { font-size: clamp(24px, 3.4vw, 34px); font-weight: 800; margin: 0; }
.lp-band-s { font-size: 15px; opacity: .88; margin: 6px 0 0; }
.lp-band-btns { display: flex; flex-wrap: wrap; gap: 12px; }
@media (max-width: 600px) { .lp-hero { padding: 48px 0 100px; } .lp-band { padding: 28px 22px; border-radius: 22px; } .lp-section { padding: 56px 0; } }
</style>
