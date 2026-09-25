<template>
    <AuthShell
        title="Polls"
        subtitle="Answer polls and help shape decisions for the City."
        max-width="1100px"
        wide
    >
        <div class="row q-col-gutter-xl">
            <div class="col-12 col-md-7">
                <PollList />
            </div>
            <div class="col-12 col-md-5">
                <q-card square class="no-shadow bg-accent radius-md q-pa-xl q-mb-md">
                    <div class="text-overline text-primary text-weight-bold q-mb-md">why vote</div>
                    <q-list>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">1</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">No account needed</q-item-label>
                                <q-item-label caption>Vote as a guest — your browser is what stops you from voting twice on the same poll.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">2</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Results hidden until you vote</q-item-label>
                                <q-item-label caption>Keeps your answer honest — you see the running results only after casting your own.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">3</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Real decisions</q-item-label>
                                <q-item-label caption>City offices ask these on things they're actually weighing — your vote factors in.</q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card>
                <q-card square class="no-shadow custom-border radius-md q-pa-lg">
                    <div class="row items-center">
                        <q-icon name="bi-people" color="primary" size="1.5em" class="q-mr-sm" />
                        <div class="text-caption text-grey">
                            Have more to say?
                            <router-link to="/discussion" class="text-primary">Join a discussion</router-link>
                            and share your thoughts in full.
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
    </AuthShell>
</template>

<script setup>
import AuthShell from 'src/components/AuthShell.vue';
import PollList from 'src/components/PollList.vue';
</script>
