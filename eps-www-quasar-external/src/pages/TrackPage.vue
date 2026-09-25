<template>
    <AuthShell title="Track My Feedback" subtitle="Look up your feedback using its reference number and access code." max-width="1100px" wide>
        <div class="row q-col-gutter-xl q-mb-lg">
            <div class="col-12 col-md-7">
                <q-card class="no-shadow custom-border radius-md q-pa-xl">
                    <div class="row q-col-gutter-md q-mb-lg">
                        <div class="col-12 col-sm-6">
                            <div class="text-caption text-uppercase text-grey q-mb-xs">reference no.</div>
                            <q-input outlined v-model="trackReferenceNo" label="e.g. EPS20260825ABCDE" />
                        </div>
                        <div class="col-12 col-sm-6">
                            <div class="text-caption text-uppercase text-grey q-mb-xs">access code (otp)</div>
                            <q-input outlined v-model="trackOtp" label="6-digit code sent to your email" />
                        </div>
                    </div>
                    <div class="text-negative text-caption q-mb-md" v-if="TrackError">{{ TrackError }}</div>

                    <q-btn unelevated color="primary" size="lg" class="q-px-xl" label="track" :loading="TrackLoading" @click="SubmitTrack()"/>
                </q-card>
            </div>
            <div class="col-12 col-md-5">
                <q-card class="no-shadow bg-accent radius-md q-pa-xl q-mb-md">
                    <div class="text-overline text-primary text-weight-bold q-mb-md">where to find these</div>
                    <q-list>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">1</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Reference number</q-item-label>
                                <q-item-label caption>Shown right after you verify feedback, and in the confirmation email.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">2</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Access code</q-item-label>
                                <q-item-label caption>The same one-time code you used to verify — it doubles as your lookup key.</q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card>
                <q-card class="no-shadow custom-border radius-md q-pa-lg">
                    <div class="row items-center">
                        <q-icon name="bi-person-circle" color="primary" size="1.5em" class="q-mr-sm" />
                        <div class="text-caption text-grey">
                            Signed in? Your feedback is already listed on your
                            <router-link to="/login" class="text-primary">dashboard</router-link>
                            — no lookup needed.
                        </div>
                    </div>
                </q-card>
            </div>
        </div>

        <q-card class="no-shadow custom-border radius-md q-pa-xl" v-if="trackResult">
            <div class="row items-center q-mb-sm">
                <div class="text-h6 text-uppercase">{{ trackResult.referenceNo }}</div>
                <q-space />
                <q-badge :color="statusColor(trackResult.status)" class="text-uppercase">{{ trackResult.status }}</q-badge>
            </div>
            <div class="text-caption text-grey q-mb-lg">filed {{ formatDate(trackResult.createdAt) }}</div>

            <div class="row q-col-gutter-xl">
                <div class="col-12 col-md-7">
                    <div class="q-mb-lg">
                        <div class="text-caption text-uppercase text-grey q-mb-xs">feedback</div>
                        <div class="text-body1">{{ trackResult.content }}</div>
                    </div>
                    <div class="q-mb-lg" v-if="trackResult.complaintFiles?.length">
                        <div class="text-caption text-uppercase text-grey q-mb-xs">evidence</div>
                        <div class="row q-gutter-sm">
                            <q-img
                                v-for="f in trackResult.complaintFiles"
                                :key="f.id"
                                :src="f.file"
                                class="evidence-thumb radius-sm cursor-pointer"
                                fit="cover"
                                @click="preview = f.file"
                            />
                        </div>
                    </div>
                    <div v-if="trackResult.responses?.length">
                        <div class="text-caption text-uppercase text-grey q-mb-xs">updates</div>
                        <q-list bordered separator class="radius-xs overflow-hidden">
                            <q-item v-for="r in trackResult.responses" :key="r.id">
                                <q-item-section avatar top>
                                    <q-avatar size="40px" :color="r.user?.avatar ? undefined : 'primary'" text-color="white">
                                        <img v-if="r.user?.avatar" :src="formatAvatar(r.user)" />
                                        <template v-else>{{ responderInitials(r) }}</template>
                                    </q-avatar>
                                </q-item-section>
                                <q-item-section>
                                    <div class="row items-center q-gutter-xs">
                                        <div class="text-weight-bold text-capitalize">{{ responderName(r) }}</div>
                                        <q-badge color="primary" class="text-uppercase">{{ responseDepartment(r) }}</q-badge>
                                    </div>
                                    <q-item-label caption>{{ formatDate(r.createdAt) }}</q-item-label>
                                    <q-item-label class="q-mt-xs">{{ r.content }}</q-item-label>
                                </q-item-section>
                            </q-item>
                        </q-list>
                    </div>
                </div>
                <div class="col-12 col-md-5">
                    <div class="q-mb-lg" v-if="trackResult.complaintOffices?.length">
                        <div class="text-caption text-uppercase text-grey q-mb-xs">assigned offices</div>
                        <div class="q-gutter-sm">
                            <q-chip v-for="co in trackResult.complaintOffices" :key="co.id" :color="statusColor(co.status)" text-color="white">
                                {{ co.office?.alias || co.office?.name }} &mdash; {{ co.status }}
                            </q-chip>
                        </div>
                    </div>
                    <div v-if="trackResult.history?.length">
                        <div class="text-caption text-uppercase text-grey q-mb-xs">history</div>
                        <q-list bordered separator class="radius-xs overflow-hidden">
                            <q-item v-for="h in trackResult.history" :key="h.id">
                                <q-item-section>
                                    <q-item-label>{{ h.description }}</q-item-label>
                                    <q-item-label caption>{{ formatDate(h.createdAt) }}</q-item-label>
                                </q-item-section>
                            </q-item>
                        </q-list>
                    </div>
                </div>
            </div>
        </q-card>

        <q-inner-loading :showing="TrackLoading">
            <q-spinner-ios color="primary" size="md"/>
            <div class="text-caption text-uppercase text-grey">we're working on it</div>
        </q-inner-loading>

        <q-dialog v-model="showPreview">
            <q-img :src="preview" style="width: 90vw; max-width: 600px;" />
        </q-dialog>
    </AuthShell>
</template>

<script setup>
import { ref, computed } from 'vue';
import { api } from 'src/boot/axios';
import moment from 'moment';
import AuthShell from 'src/components/AuthShell.vue';

const TrackLoading = ref(false);
const TrackError = ref('');
const trackReferenceNo = ref('');
const trackOtp = ref('');
const trackResult = ref(null);
const preview = ref('');
const showPreview = computed({
    get: () => !!preview.value,
    set: (v) => { if (!v) preview.value = ''; }
});

const statusColor = (status) => ({
    unverified: 'grey',
    verified: 'blue',
    pending: 'orange',
    unassigned: 'negative',
    received: 'orange',
    ongoing: 'blue',
    completed: 'positive',
    cancelled: 'negative',
}[status] || 'grey');

const formatDate = (timestamp) => moment(timestamp).format('MMM DD, YYYY hh:mm A');

const responderName = (r) => {
    const u = r?.user;
    const name = `${u?.firstname || ''} ${u?.lastname || ''}`.trim();
    return name || u?.username || 'Unknown';
};

const responderInitials = (r) => {
    const u = r?.user;
    const initials = `${(u?.firstname || '')[0] || ''}${(u?.lastname || '')[0] || ''}`.toUpperCase();
    return initials || '?';
};

const responseDepartment = (r) => {
    const office = r?.user?.staff?.office;
    if (office) return office.alias || office.name;
    if (['super', 'admin'].includes(r?.user?.role)) return 'Supervisor';
    return 'City Hall';
};

const formatAvatar = (user) => `${process.env.VUE_APP_BACKEND_URL}${user.avatar}`;

const SubmitTrack = async () => {
    TrackError.value = '';
    trackResult.value = null;
    if (!trackReferenceNo.value || !trackOtp.value) {
        TrackError.value = 'Reference number and access code are both required.';
        return;
    }
    TrackLoading.value = true;
    try {
        const response = await api.get(`/complaint/track/${encodeURIComponent(trackReferenceNo.value)}`, {
            params: { otp: trackOtp.value }
        });
        trackResult.value = response.data.data;
    } catch (e) {
        TrackError.value = e.response?.data?.message || 'Unable to find that feedback.';
    } finally {
        TrackLoading.value = false;
    }
};
</script>

<style scoped>
.evidence-thumb {
    width: 84px;
    height: 84px;
}
</style>
