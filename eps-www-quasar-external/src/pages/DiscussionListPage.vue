<template>
    <AuthShell
        title="Discussions"
        subtitle="Join the conversation on topics the City has opened up for public input."
        max-width="1100px"
        wide
    >
        <div class="row q-col-gutter-xl">
            <div class="col-12 col-md-7">
                <DiscussionList />
            </div>
            <div class="col-12 col-md-5">
                <q-card square class="no-shadow bg-accent radius-md q-pa-xl q-mb-md">
                    <div class="text-overline text-primary text-weight-bold q-mb-md">why join a discussion</div>
                    <q-list>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">1</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Comment as a guest, or signed in</q-item-label>
                                <q-item-label caption>Type just a display name to comment, or sign in to use your real name instead.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">2</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">See what others are saying</q-item-label>
                                <q-item-label caption>Every comment on a thread is visible in real time, from everyone who's joined in.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">3</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Opened by the City</q-item-label>
                                <q-item-label caption>Topics come from city offices on issues that affect the community, and stay open while active.</q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card>
                <q-card square class="no-shadow custom-border radius-md q-pa-lg">
                    <div class="row items-center">
                        <q-icon name="bi-file-earmark-text" color="primary" size="1.5em" class="q-mr-sm" />
                        <div class="text-caption text-grey">
                            Something to report instead?
                            <router-link to="/file-complaint" class="text-primary">File feedback</router-link>
                            — it's routed to the right department automatically.
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
    </AuthShell>
</template>

<script setup>
import AuthShell from 'src/components/AuthShell.vue';
import DiscussionList from 'src/components/DiscussionList.vue';
</script>
