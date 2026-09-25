<template>
    <AuthShell
        title="Poll"
        subtitle="Cast your vote and see how the community responded."
        max-width="1100px"
        wide
    >
        <div class="row q-col-gutter-xl">
            <div class="col-12 col-md-7">
                <PollVote />
            </div>
            <div class="col-12 col-md-5">
                <q-card square class="no-shadow bg-accent radius-md q-pa-xl q-mb-md">
                    <div class="text-overline text-primary text-weight-bold q-mb-md">how voting works</div>
                    <q-list>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">1</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Pick one, submit</q-item-label>
                                <q-item-label caption>Choose an option and submit — it's recorded instantly, no account required.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">2</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">One vote, no take-backs</q-item-label>
                                <q-item-label caption>Once submitted, your vote is final — you'll see results in place of the choices.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">3</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Live results after voting</q-item-label>
                                <q-item-label caption>Come back anytime to see how the tally has moved since you voted.</q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card>
                <q-card square class="no-shadow custom-border radius-md q-pa-lg">
                    <div class="row items-center">
                        <q-icon name="bi-bar-chart-line" color="primary" size="1.5em" class="q-mr-sm" />
                        <div class="text-caption text-grey">
                            <router-link to="/poll" class="text-primary">See all open polls</router-link>
                            — there may be more than one worth your vote.
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
    </AuthShell>
</template>

<script setup>
import AuthShell from 'src/components/AuthShell.vue';
import PollVote from 'src/components/PollVote.vue';
</script>
