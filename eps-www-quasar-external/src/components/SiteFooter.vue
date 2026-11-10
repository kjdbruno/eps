<template>
    <footer class="pt-footer">
        <div class="pt-footer-in">
            <div>
                <div class="pt-footer-h">eParticipation System</div>
                <div class="pt-footer-t">
                    A digital platform for filing feedback, joining public discussions, and answering
                    surveys that help shape decisions for the City.
                </div>
            </div>
            <div>
                <div class="pt-footer-h">Quick links</div>
                <router-link to="/file-complaint">File feedback</router-link>
                <router-link to="/discussion">Discussion</router-link>
                <router-link to="/poll">Survey</router-link>
            </div>
            <div>
                <div class="pt-footer-h">Contact &amp; support</div>
                <div class="pt-footer-c"><q-icon name="bi-geo-alt" />City Hall</div>
                <div class="pt-footer-c"><q-icon name="bi-envelope" />cicto@sanfernandocity.gov.ph</div>
            </div>
        </div>
        <div class="pt-footer-bar">&copy; {{ year }} City Government &mdash; eParticipation System. All rights reserved.</div>
    </footer>
</template>

<script setup>
const year = new Date().getFullYear();
</script>
