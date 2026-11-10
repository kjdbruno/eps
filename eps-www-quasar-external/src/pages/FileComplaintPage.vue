<template>
    <AuthShell>
        <div class="tone-feedback">
            <SectionHero
                icon="bi-chat-quote" eyebrow="open to every resident" title="Feedback"
                subtitle="Report a concern and it is sent to the right city office. Sign in to file yours, and see below what others are reporting right now."
            >
                <router-link class="sh-act sh-act--main" to="/login"><q-icon name="bi-box-arrow-in-right" />Sign in to file</router-link>
                <router-link class="sh-act" to="/register"><q-icon name="bi-person-plus" />Create an account</router-link>
            </SectionHero>

            <div class="pt-split">
                <div>
                    <div class="row items-center no-wrap q-mb-md">
                        <div class="col">
                            <div class="pt-title" style="font-size: 20px;">Happening now</div>
                            <div class="pt-sub">A few recent feedback items. Names and contact details are never shown.</div>
                        </div>
                        <q-btn flat rounded no-caps color="primary" icon="bi-shuffle" label="Show others" :loading="loading" @click="load" />
                    </div>

                    <div v-if="loading && !items.length" class="row justify-center q-py-xl"><q-spinner-oval size="lg" color="primary" /></div>

                    <div v-else-if="!items.length" class="pt-card pt-empty">
                        <div class="pt-empty-ico"><q-icon name="bi-chat-left-text" /></div>
                        <div class="pt-empty-t">Nothing to show yet</div>
                        <div>Recent feedback appears here once it has been sent to an office.</div>
                    </div>

                    <div v-else class="pt-rows">
                        <div v-for="(f, i) in items" :key="i" class="sc sc--static">
                            <div class="sc-top">
                                <span class="sc-ico"><q-icon name="bi-chat-quote" /></span>
                                <div class="sc-main">
                                    <div class="sc-type">feedback</div>
                                    <div class="sc-title">{{ f.offices.length ? f.offices.join(' · ') : 'City offices' }}</div>
                                </div>
                                <span class="pt-pill" :class="`pt-st-${f.status}`">{{ f.status }}</span>
                            </div>
                            <div class="sc-desc sc-desc--more">{{ f.content }}</div>
                            <div class="sc-foot">
                                <span class="sc-chip"><q-icon name="bi-clock" size="13px" />{{ ago(f.createdAt) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <SideInfo title="how filing works" :steps="SIDE_STEPS" icon="bi-incognito">You can file anonymously once you are signed in: only your name is hidden from the offices and staff.</SideInfo>
            </div>
        </div>
    </AuthShell>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import moment from 'moment';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth-store';
import AuthShell from 'src/components/AuthShell.vue';
import SectionHero from 'src/components/SectionHero.vue';
import SideInfo from 'src/components/SideInfo.vue';

const SIDE_STEPS = [
    { title: 'Sign in or create an account', text: 'Filing is for signed-in residents, so you can follow it and add to it later.' },
    { title: 'It is routed automatically', text: 'The system reads what you wrote and sends it to the right department, with no category to pick.' },
    { title: 'Follow it, or cancel it', text: 'Watch every update from My feedback. You can cancel it any time before it is completed.' },
];

const router = useRouter();
const authStore = useAuthStore();

const items = ref([]);
const loading = ref(false);
const ago = (t) => moment(t).fromNow();

// a few random, recent ones — "Show others" draws a new set
const load = async () => {
    loading.value = true;
    try {
        const response = await api.get('/complaint/public/feed', { params: { limit: 6 } });
        items.value = response.data.data || [];
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    // someone who is signed in files from their own page
    if (authStore.isAuthenticated) {
        router.replace('/home/complaint?action=file');
        return;
    }
    load();
});
</script>
