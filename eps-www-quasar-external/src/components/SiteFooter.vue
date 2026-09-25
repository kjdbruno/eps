<template>
    <footer class="bg-primary text-white q-pa-lg q-pt-xl">
        <div class="footer-inner">
            <div class="row q-col-gutter-lg">
                <div class="col-12 col-sm-5">
                    <div class="row items-center q-mb-sm">
                        <!-- <img src="../assets/epslogo.png" width="28" class="q-mr-sm" /> -->
                        <div class="text-body1 text-weight-bold">eParticipation System</div>
                    </div>
                    <div class="text-caption" style="opacity: 0.8;">
                        A digital platform for filing feedback, joining public discussions, and answering
                        polls that help shape decisions for the City.
                    </div>
                </div>
                <div class="col-6 col-sm-3">
                    <div class="text-caption text-uppercase text-weight-bold q-mb-sm">services</div>
                    <div class="footer-link"><router-link to="/file-complaint" class="footer-link-text">File Feedback</router-link></div>
                    <div class="footer-link"><router-link to="/discussion" class="footer-link-text">Discussion</router-link></div>
                    <div class="footer-link"><router-link to="/poll" class="footer-link-text">Poll</router-link></div>
                    <div class="footer-link"><router-link to="/track" class="footer-link-text">Track Feedback</router-link></div>
                </div>
                <div class="col-6 col-sm-4">
                    <div class="text-caption text-uppercase text-weight-bold q-mb-sm">contact & support</div>
                    <div class="text-caption q-mb-xs" style="opacity: 0.8;">
                        <q-icon name="bi-geo-alt" size="xs" class="q-mr-xs" />City Hall
                    </div>
                    <div class="text-caption" style="opacity: 0.8;">
                        <q-icon name="bi-envelope" size="xs" class="q-mr-xs" />cicto@sanfernandocity.gov.ph
                    </div>
                </div>
            </div>
            <q-separator dark class="q-my-md" style="opacity: 0.2;" />
            <div class="text-caption text-center" style="opacity: 0.7;">
                &copy; {{ year }} City Government &mdash; eParticipation System. All rights reserved.
            </div>
        </div>
    </footer>
</template>

<script setup>
const year = new Date().getFullYear();
</script>

<style scoped>
.footer-inner {
    max-width: 1100px;
    margin: 0 auto;
}
.footer-link {
    margin-bottom: 6px;
}
.footer-link-text {
    color: white;
    opacity: 0.8;
    text-decoration: none;
    font-size: 0.85rem;
}
.footer-link-text:hover {
    opacity: 1;
    text-decoration: underline;
}
</style>
