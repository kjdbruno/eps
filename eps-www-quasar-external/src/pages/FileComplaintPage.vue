<template>
    <AuthShell
        title="File Feedback"
        subtitle="No account needed — we'll email you a one-time code to verify it."
        max-width="1100px"
        wide
    >
        <div class="row q-col-gutter-xl">
            <div class="col-12 col-md-7">
                <q-card class="no-shadow custom-border radius-md q-pa-xl">
                    <ComplaintForm mode="guest" @submitted="onSubmitted" />
                </q-card>
            </div>
            <div class="col-12 col-md-5">
                <q-card class="no-shadow bg-accent radius-md q-pa-xl q-mb-md">
                    <div class="text-overline text-primary text-weight-bold q-mb-md">what happens next</div>
                    <q-list>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">1</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">We email you a one-time code</q-item-label>
                                <q-item-label caption>Verify it to confirm your feedback is genuine and get a reference number.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">2</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">It's routed automatically</q-item-label>
                                <q-item-label caption>The system reads what you wrote and assigns it to the right department — no category to pick.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">3</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Track it anytime</q-item-label>
                                <q-item-label caption>Use your reference number and access code on the Track page to check its status.</q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card>
                <q-card class="no-shadow custom-border radius-md q-pa-lg">
                    <div class="row items-center">
                        <q-icon name="bi-shield-check" color="primary" size="1.5em" class="q-mr-sm" />
                        <div class="text-caption text-grey">
                            Reporting anonymously is fully supported — your identity stays hidden from
                            everyone except what's needed to send you the one-time code.
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
    </AuthShell>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import AuthShell from 'src/components/AuthShell.vue';
import ComplaintForm from 'src/components/ComplaintForm.vue';

const $q = useQuasar();
const router = useRouter();

const onSubmitted = ({ error }) => {
    if (error) {
        $q.notify({ type: 'negative', message: error.response?.data?.message || 'Unable to submit your feedback.' });
        return;
    }

    $q.notify({ type: 'positive', message: 'We\'ve emailed you a one-time code — verify it to finish filing.' });
    // Verification only needs the code now — no reference number to pass along.
    router.push({ path: '/verify-complaint' });
};
</script>
