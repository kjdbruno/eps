<template>
    <q-layout view="hHh lpr fFf">
        <SiteHeader />
        <q-page-container>
            <q-page>
                <!-- hero: carousel "sneak peek" of the 3 services, blue overlay, headline on top -->
                <div class="hero">
                    <q-carousel
                        v-model="heroSlide"
                        autoplay
                        infinite
                        animated
                        transition-prev="fade"
                        transition-next="fade"
                        :arrows="false"
                        :navigation="false"
                        class="hero-carousel"
                    >
                        <q-carousel-slide
                            v-for="s in heroSlides" :key="s.name" :name="s.name"
                            class="hero-slide" :style="{ backgroundImage: `url(${s.photo})`, backgroundColor: s.fallbackColor }"
                        >
                            <div class="hero-illustration gt-sm">
                                <component :is="s.illustration" />
                            </div>
                        </q-carousel-slide>
                    </q-carousel>
                    <div class="hero-overlay" />

                    <!-- crisp icon badge, sits above the overlay so it stays fully readable -->
                    <div class="hero-icon-badge">
                        <q-icon :name="activeSlide.icon" color="white" size="1.6em" />
                    </div>

                    <div class="hero-content q-pa-md">
                        <div class="hero-inner text-center">
                            <div class="text-overline text-weight-bold" style="color: #FFC900; letter-spacing: 2px;">
                                eParticipation System
                            </div>
                            <div class="hero-title text-white text-weight-bold q-mt-sm">
                                YOUR VOICE, <br class="gt-xs" />YOUR CITY
                            </div>
                            <div class="text-white text-body1 q-mt-md hero-subtitle">
                                Report your concerns, discuss what's trending, and answer polls that help shape decisions for the City.
                            </div>
                            <div class="row justify-center q-gutter-sm q-mt-lg">
                                <q-btn unelevated color="secondary" text-color="dark" no-caps size="lg" label="File Feedback" rounded to="/file-complaint" />
                                <q-btn outline color="white" text-color="white" no-caps size="lg" label="Sign In" rounded to="/login" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- services: quick listing -->
                <div class="services-section q-px-md">
                    <div class="services-inner">
                        <q-card class="weather-card radius-sm q-pa-md q-mb-md bg-white">
                            <q-card-section class="row items-center q-gutter-md">
                                <template v-if="geoStatus === 'loading'">
                                    <q-spinner-ios size="1.5em" color="primary" />
                                    <div class="text-caption text-grey">getting your location...</div>
                                </template>
                                <template v-else-if="geoStatus === 'ready' && weather">
                                    <q-icon :name="weatherInfo.icon" color="primary" size="2.5em" />
                                    <div>
                                        <div class="text-h5">{{ Math.round(weather.temperature) }}&deg;C</div>
                                        <div class="text-caption text-uppercase text-grey">{{ weatherInfo.label }}</div>
                                    </div>
                                    <q-space />
                                    <div class="text-right">
                                        <div class="text-body2">
                                            <q-icon name="bi-geo-alt-fill" size="xs" class="q-mr-xs" />{{ locationName || 'your location' }}
                                        </div>
                                        <div class="text-caption text-grey">wind {{ Math.round(weather.windspeed) }} km/h &middot; updated {{ formatDate(weather.time) }}</div>
                                    </div>
                                </template>
                                <template v-else>
                                    <q-icon name="bi-geo-alt" color="grey" size="1.5em" />
                                    <div class="text-caption text-grey">{{ geoError || 'Enable location access to see your local weather.' }}</div>
                                    <q-space />
                                    <q-btn flat dense no-caps size="sm" color="primary" label="try again" @click="loadWeather" />
                                </template>
                            </q-card-section>
                        </q-card>

                        <div class="row q-col-gutter-md q-mt-none">
                            <div class="col-12 col-sm-4" v-for="s in services" :key="s.key">
                                <q-card
                                    class="service-card radius-md q-pa-lg cursor-pointer full-height"
                                    :style="{ background: s.color }" @click="router.push(s.to)"
                                >
                                    <q-icon :name="s.icon" :color="s.textColor" size="2.2em" />
                                    <div class="text-h6 text-weight-bold q-mt-md" :class="`text-${s.textColor}`">{{ s.title }}</div>
                                    <div class="text-body2 q-mt-xs" :class="`text-${s.textColor}`" style="opacity: 0.9;">
                                        {{ s.shortDescription }}
                                    </div>
                                    <div class="text-caption text-weight-bold q-mt-md" :class="`text-${s.textColor}`">
                                        {{ s.cta }} <q-icon name="bi-arrow-right" />
                                    </div>
                                </q-card>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- services: detailed, one section per service -->
                <div class="q-px-md q-py-xl bg-white">
                    <div class="services-inner">
                        <div class="text-center q-mb-xl">
                            <div class="text-overline text-primary text-weight-bold">what we offer</div>
                            <div class="text-h4 text-weight-bold">Three Ways to Participate</div>
                            <div class="text-body2 text-grey q-mt-sm" style="max-width: 560px; margin: 0 auto;">
                                Every service below is open to everyone &mdash; file feedback, join a discussion, or
                                answer a poll, with or without an account. Signing in just means your name is shown
                                instead of "Anonymous."
                            </div>
                        </div>

                        <div
                            v-for="(s, i) in services" :key="s.key"
                            class="row items-center q-col-gutter-xl"
                            :class="i < services.length - 1 ? 'q-mb-xl' : ''"
                        >
                            <div class="col-12 col-sm-5" :class="i % 2 === 1 ? 'order-sm-2' : ''">
                                <div class="detail-icon-block radius-md" :style="{ background: s.color }">
                                    <q-icon :name="s.icon" :color="s.textColor" size="4em" />
                                </div>
                            </div>
                            <div class="col-12 col-sm-7" :class="i % 2 === 1 ? 'order-sm-1' : ''">
                                <div class="text-overline text-weight-bold" :style="{ color: s.color }">{{ s.title }}</div>
                                <div class="text-h5 text-weight-bold q-mb-sm">{{ s.headline }}</div>
                                <div class="text-body1 text-grey q-mb-md">{{ s.longDescription }}</div>
                                <q-list dense class="q-mb-md">
                                    <q-item v-for="point in s.points" :key="point" class="q-pl-none">
                                        <q-item-section avatar style="min-width: 28px;">
                                            <q-icon name="bi-check-circle-fill" :style="{ color: s.color }" size="1.1em" />
                                        </q-item-section>
                                        <q-item-section class="text-body2">{{ point }}</q-item-section>
                                    </q-item>
                                </q-list>
                                <q-btn
                                    unelevated no-caps rounded
                                    :style="{ background: s.color, color: s.textColor === 'dark' ? '#1D1D1D' : 'white' }"
                                    :label="s.cta" :to="s.to"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- secondary actions -->
                <div class="q-px-md q-py-xl bg-accent">
                    <div class="services-inner text-center">
                        <div class="text-overline text-primary text-weight-bold">already filed feedback?</div>
                        <div class="text-h5 q-mb-md">Verify or track it here</div>
                        <div class="row justify-center q-col-gutter-sm" style="max-width: 480px; margin: 0 auto;">
                            <div class="col-6">
                                <q-btn outline color="primary" no-caps class="full-width" rounded label="verify feedback" to="/verify-complaint" />
                            </div>
                            <div class="col-6">
                                <q-btn outline color="primary" no-caps class="full-width" rounded label="track status" to="/track" />
                            </div>
                        </div>
                    </div>
                </div>
            </q-page>
        </q-page-container>
        <SiteFooter />
    </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import moment from 'moment';
import SiteHeader from 'src/components/SiteHeader.vue';
import SiteFooter from 'src/components/SiteFooter.vue';
import ComplaintIllustration from 'src/components/illustrations/ComplaintIllustration.vue';
import DiscussionIllustration from 'src/components/illustrations/DiscussionIllustration.vue';
import PollIllustration from 'src/components/illustrations/PollIllustration.vue';
import { useWeather } from 'src/composables/useWeather';

const router = useRouter();
const { geoStatus, geoError, weather, locationName, weatherInfo, loadWeather } = useWeather();
const formatDate = (timestamp) => moment(timestamp).fromNow();

const services = [
    {
        key: 'complaint',
        title: 'Feedback',
        headline: 'Report it, and it finds the right department on its own',
        icon: 'bi-file-earmark-text',
        illustration: ComplaintIllustration,
        photo: 'https://images.pexels.com/photos/9870135/pexels-photo-9870135.jpeg?auto=compress&cs=tinysrgb&w=1600',
        color: '#204888',
        textColor: 'white',
        shortDescription: "Report a concern or issue — it's automatically routed to the right city department.",
        longDescription: 'Describe what\'s wrong in your own words. The system reads the content and assigns it '
            + 'to the responsible office directly, so there\'s no category to guess and no wrong queue to land in.',
        points: [
            'No account needed — verify with a one-time email code instead',
            'Auto-assigned to the responsible department based on what you describe',
            'Track its status anytime with your reference number',
        ],
        cta: 'File Feedback',
        to: '/file-complaint',
    },
    {
        key: 'discussion',
        title: 'Discussion',
        headline: 'Join the conversation on topics the City has opened up',
        icon: 'bi-people',
        illustration: DiscussionIllustration,
        photo: 'https://images.pexels.com/photos/6214965/pexels-photo-6214965.jpeg?auto=compress&cs=tinysrgb&w=1600',
        color: '#3D6BB5',
        textColor: 'white',
        shortDescription: 'Join the conversation on topics the City has opened up for public input.',
        longDescription: 'City offices open discussion threads on topics that affect the community. Read what '
            + 'others are saying and add your own comment or suggestion — no account required to take part.',
        points: [
            'Comment as a guest with just a display name, or sign in to use your real name',
            'See what other residents are saying in real time',
            'Threads stay open for as long as the City keeps them active',
        ],
        cta: 'Join a Discussion',
        to: '/discussion',
    },
    {
        key: 'poll',
        title: 'Poll',
        headline: 'Answer polls and help shape decisions for the City',
        icon: 'bi-bar-chart-line',
        illustration: PollIllustration,
        photo: 'https://images.pexels.com/photos/6712711/pexels-photo-6712711.jpeg?auto=compress&cs=tinysrgb&w=1600',
        color: '#FFC900',
        textColor: 'dark',
        shortDescription: 'Answer polls and help shape decisions for the City.',
        longDescription: 'City offices ask short questions on real decisions they\'re weighing. Cast your vote in '
            + 'a click — results stay hidden until after you vote, so your answer is never swayed by the crowd.',
        points: [
            'One vote per person per poll — guest votes are tied to your browser',
            'Results are revealed only after you\'ve voted',
            'No account needed to participate',
        ],
        cta: 'Answer a Poll',
        to: '/poll',
    },
];

const heroSlides = services.map(s => ({
    name: s.key,
    icon: s.icon,
    label: s.title,
    illustration: s.illustration,
    photo: s.photo,
    fallbackColor: s.color,
}));

const heroSlide = ref(heroSlides[0].name);
const activeSlide = computed(() => heroSlides.find(s => s.name === heroSlide.value) || heroSlides[0]);
</script>

<style scoped>
.hero {
    position: relative;
    overflow: hidden;
    min-height: 460px;
    display: flex;
    align-items: center;
}
.hero-carousel {
    position: absolute;
    inset: 0;
    height: 100%;
}
.hero-slide {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}
.hero-illustration {
    position: absolute;
    right: -20px;
    top: 50%;
    transform: translateY(-50%);
    width: 420px;
    height: 320px;
    pointer-events: none;
}
.hero-overlay {
    position: absolute;
    inset: 0;
    background: rgba(20, 45, 90, 0.6);
}
.hero-icon-badge {
    position: absolute;
    right: 48px;
    bottom: 28px;
    z-index: 2;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    border: 2px solid rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
}
.hero-content {
    position: relative;
    width: 100%;
    z-index: 2;
}
.hero-inner {
    max-width: 700px;
    margin: 0 auto;
}
.hero-title {
    font-size: 2.6rem;
    line-height: 1.15;
}
.hero-subtitle {
    opacity: 0.9;
    max-width: 520px;
    margin-left: auto;
    margin-right: auto;
}
.services-section {
    margin-top: -48px;
    position: relative;
    z-index: 3;
}
.services-inner {
    max-width: 1000px;
    margin: 0 auto;
}
.weather-card {
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
}
.service-card {
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
    transition: transform 0.2s ease;
}
.service-card:hover {
    transform: translateY(-4px);
}
.detail-icon-block {
    aspect-ratio: 16 / 10;
    display: flex;
    align-items: center;
    justify-content: center;
}

@media (max-width: 599px) {
    .hero-title {
        font-size: 1.9rem;
    }
    .order-sm-1, .order-sm-2 {
        order: unset;
    }
}
</style>
