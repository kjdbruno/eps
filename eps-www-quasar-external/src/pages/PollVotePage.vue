<template>
    <AuthShell
        title="Survey"
        subtitle="Answer the questions and see how the community responded."
        icon="bi-ui-checks"
    >
        <div class="pt-split">
            <div>
                <PollVote />
            </div>
            <SideInfo title="how it works" :steps="SIDE_STEPS" icon="bi-ui-checks"><router-link to="/poll" class="text-primary">See all open surveys</router-link> — there may be more than one worth your time.</SideInfo>
        </div>
    </AuthShell>
</template>

<script setup>
const SIDE_STEPS = [
    {
        "title": "Sign in, pick one",
        "text": "Choose an option and submit — it is recorded instantly against your account."
    },
    {
        "title": "One vote, no take-backs",
        "text": "Once submitted, your vote is final — you will see results in place of the choices."
    },
    {
        "title": "Live results after voting",
        "text": "Come back anytime to see how the tally has moved since you voted."
    }
];
import AuthShell from 'src/components/AuthShell.vue';
import SideInfo from 'src/components/SideInfo.vue';
import PollVote from 'src/components/PollVote.vue';
</script>
