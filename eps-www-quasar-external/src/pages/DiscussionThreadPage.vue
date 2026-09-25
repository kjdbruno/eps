<template>
    <AuthShell
        title="Discussion"
        subtitle="Read the thread and add your own comment or suggestion."
        max-width="1100px"
        wide
    >
        <div class="row q-col-gutter-xl">
            <div class="col-12 col-md-7">
                <DiscussionThread />
            </div>
            <div class="col-12 col-md-5">
                <q-card square class="no-shadow bg-accent radius-md q-pa-xl q-mb-md">
                    <div class="text-overline text-primary text-weight-bold q-mb-md">before you post</div>
                    <q-list>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">1</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Guest or signed in</q-item-label>
                                <q-item-label caption>Leave your name blank to post as "Anonymous," type one in, or sign in to use your real name.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">2</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Visible to everyone</q-item-label>
                                <q-item-label caption>Comments post immediately and are visible to any other visitor to this thread.</q-item-label>
                            </q-item-section>
                        </q-item>
                        <q-item class="q-px-none">
                            <q-item-section avatar top>
                                <q-avatar color="primary" text-color="white" size="32px" class="text-body2">3</q-avatar>
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-bold">Closes when the City wraps up</q-item-label>
                                <q-item-label caption>A closed discussion stops taking new comments, but stays visible to read.</q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card>
                <q-card square class="no-shadow custom-border radius-md q-pa-lg">
                    <div class="row items-center">
                        <q-icon name="bi-bar-chart-line" color="primary" size="1.5em" class="q-mr-sm" />
                        <div class="text-caption text-grey">
                            Prefer a quick vote instead?
                            <router-link to="/poll" class="text-primary">Answer a poll</router-link>
                            — takes one click.
                        </div>
                    </div>
                </q-card>
            </div>
        </div>
    </AuthShell>
</template>

<script setup>
import AuthShell from 'src/components/AuthShell.vue';
import DiscussionThread from 'src/components/DiscussionThread.vue';
</script>
