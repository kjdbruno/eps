<template>
    <AuthShell
        title="Discussion"
        subtitle="Read the thread and add your own comment or suggestion."
        icon="bi-chat-left-text"
    >
        <div class="pt-split">
            <div>
                <DiscussionThread />
            </div>
            <SideInfo title="before you post" :steps="SIDE_STEPS" icon="bi-bar-chart-line">Prefer to answer a few questions instead? <router-link to="/poll" class="text-primary">Answer a survey</router-link> — it takes a few minutes.</SideInfo>
        </div>
    </AuthShell>
</template>

<script setup>
const SIDE_STEPS = [
    {
        "title": "Sign in to comment",
        "text": "Reading is open to all; posting needs an account and shows your real name."
    },
    {
        "title": "Visible to everyone",
        "text": "Comments post immediately and are visible to any other visitor to this thread."
    },
    {
        "title": "Closes when the City wraps up",
        "text": "A closed discussion stops taking new comments, but stays visible to read."
    }
];
import AuthShell from 'src/components/AuthShell.vue';
import SideInfo from 'src/components/SideInfo.vue';
import DiscussionThread from 'src/components/DiscussionThread.vue';
</script>
