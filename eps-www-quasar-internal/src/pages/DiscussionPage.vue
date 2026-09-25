<template>
    <div>
        <div class="dp-shell">
            <div class="dp-main">
                <div class="row items-center justify-between q-mb-md dp-header">
                    <div>
                        <div class="dp-eyebrow">public discussion &middot; operations overview<template v-if="scopeLabel"> &middot; {{ scopeLabel }}</template></div>
                        <div class="text-h5">{{ analyticsRangeLabel || ' ' }}</div>
                    </div>
                    <div class="row items-center q-gutter-sm">
                        <div class="dp-year-group">
                            <q-btn flat dense round size="sm" icon="bi-chevron-left" @click="stepYear(-1)">
                                <q-tooltip>Previous year</q-tooltip>
                            </q-btn>
                            <div class="dp-year-value">{{ analyticsYear }}</div>
                            <q-btn flat dense round size="sm" icon="bi-chevron-right" :disable="analyticsYear >= currentYear" @click="stepYear(1)">
                                <q-tooltip>Next year</q-tooltip>
                            </q-btn>
                        </div>
                        <div class="dp-period-group">
                            <q-btn no-caps unelevated size="sm" label="Week" class="dp-period-btn" :class="analyticsPeriod === 'week' ? 'dp-period-btn--active' : ''" @click="setAnalyticsPeriod('week')" />
                            <q-btn no-caps unelevated size="sm" label="Month" class="dp-period-btn" :class="analyticsPeriod === 'month' ? 'dp-period-btn--active' : ''" @click="setAnalyticsPeriod('month')" />
                            <q-btn no-caps unelevated size="sm" label="Year" class="dp-period-btn" :class="analyticsPeriod === 'year' ? 'dp-period-btn--active' : ''" @click="setAnalyticsPeriod('year')" />
                        </div>
                        <q-btn flat dense round size="sm" icon="bi-arrow-clockwise" :loading="loading" @click="loadDiscussions">
                            <q-tooltip>Refresh</q-tooltip>
                        </q-btn>
                    </div>
                </div>

                <div class="dp-kpi-grid q-mb-md">
                    <q-card flat class="dp-kpi radius-xs bg-primary">
                        <div class="dp-kpi-value text-white">{{ discussions.length }}</div>
                        <div class="dp-kpi-label text-white">total discussions</div>
                    </q-card>
                    <q-card flat class="dp-kpi radius-xs bg-primary">
                        <div class="dp-kpi-value text-white">{{ openCount }}</div>
                        <div class="dp-kpi-label text-white">open</div>
                    </q-card>
                    <q-card flat class="dp-kpi radius-xs custom-border">
                        <div class="dp-kpi-value text-primary">{{ closedCount }}</div>
                        <div class="dp-kpi-label text-grey">closed</div>
                    </q-card>
                    <q-card flat class="dp-kpi radius-xs custom-border">
                        <div class="dp-kpi-value text-primary">{{ totalComments }}</div>
                        <div class="dp-kpi-label text-grey">total comments</div>
                    </q-card>
                    <q-card flat class="dp-kpi radius-xs custom-border">
                        <div class="dp-kpi-value text-primary">{{ avgComments }}</div>
                        <div class="dp-kpi-label text-grey">avg. comments / topic</div>
                    </q-card>
                    <q-card flat class="dp-kpi radius-xs custom-border">
                        <div class="dp-kpi-value text-primary">{{ formatLag(stats.avgTimeToFirstCommentMinutes) }}</div>
                        <div class="dp-kpi-label text-grey">avg. time to first comment</div>
                    </q-card>
                    <q-card flat class="dp-kpi radius-xs custom-border">
                        <div class="dp-kpi-value text-primary">{{ stats.reopenRate != null ? stats.reopenRate + '%' : '—' }}</div>
                        <div class="dp-kpi-label text-grey">reopen rate</div>
                    </q-card>
                    <q-card flat class="dp-kpi radius-xs custom-border" v-if="canViewAll">
                        <div class="dp-kpi-value text-negative">{{ unassignedCount }}</div>
                        <div class="dp-kpi-label text-grey">unassigned</div>
                    </q-card>
                    <q-card flat class="dp-kpi radius-xs custom-border">
                        <div class="dp-kpi-value text-warning">{{ expiringSoonCount }}</div>
                        <div class="dp-kpi-label text-grey">expiring within 7d</div>
                    </q-card>
                    <q-card flat class="dp-kpi radius-xs custom-border">
                        <div class="dp-kpi-value text-negative">{{ expiredCount }}</div>
                        <div class="dp-kpi-label text-grey">expired</div>
                    </q-card>
                </div>

                <div class="dp-panel-grid">
                    <q-card flat class="dp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">topics opened per {{ bucketUnitLabel }}</div>
                        <apexchart type="area" height="220" :options="volumeChartOptions" :series="volumeChartSeries" />
                    </q-card>

                    <q-card flat class="dp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">comments filed per {{ bucketUnitLabel }}</div>
                        <div class="text-caption text-grey q-mb-sm">engagement over time, not just topic volume</div>
                        <apexchart type="line" height="220" :options="commentsChartOptions" :series="commentsChartSeries" />
                    </q-card>

                    <q-card flat class="dp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">open vs. closed</div>
                        <apexchart type="pie" height="280" :options="statusChartOptions" :series="statusChartSeries" />
                    </q-card>

                    <q-card flat class="dp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">comments by author type</div>
                        <apexchart type="pie" height="280" :options="authorMixChartOptions" :series="authorMixChartSeries" />
                    </q-card>

                    <q-card flat class="dp-panel custom-border radius-xs q-pa-md" v-if="canViewAll">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">topics by office</div>
                        <apexchart type="bar" height="200" :options="officeChartOptions" :series="officeChartSeries" />
                    </q-card>

                    <q-card flat class="dp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">most discussed topics</div>
                        <apexchart type="bar" height="200" :options="topDiscussedOptions" :series="topDiscussedSeries" />
                    </q-card>
                </div>
            </div>

            <div class="dp-rail">
                <q-card flat class="dp-rail-card">
                    <div class="dp-rail-head">
                        <div class="row items-center justify-between no-wrap q-mb-sm">
                            <div class="row items-baseline q-gutter-xs">
                                <div class="text-h6 text-capitalize">discussions</div>
                                <div class="text-caption text-grey">{{ filteredDiscussions.length }} of {{ discussions.length }}</div>
                            </div>
                            <q-btn v-if="isSupervisor" no-caps unelevated rounded size="sm" color="primary" label="add" @click="openCreateDialog">
                                <q-tooltip>Start a new discussion</q-tooltip>
                            </q-btn>
                        </div>
                        <q-input outlined dense v-model="search" placeholder="Search title or description..." class="dp-search q-mb-sm">
                            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
                        </q-input>
                        <div class="row q-gutter-xs">
                            <q-btn no-caps unelevated rounded size="sm" label="All" class="dp-chip" :class="statusFilter === 'all' ? 'dp-chip--active' : ''" @click="statusFilter = 'all'" />
                            <q-btn no-caps unelevated rounded size="sm" label="Open" class="dp-chip" :class="statusFilter === 'open' ? 'dp-chip--active' : ''" @click="statusFilter = 'open'" />
                            <q-btn no-caps unelevated rounded size="sm" label="Closed" class="dp-chip" :class="statusFilter === 'closed' ? 'dp-chip--active' : ''" @click="statusFilter = 'closed'" />
                        </div>
                    </div>
                    <q-separator />
                    <div class="dp-rail-list" ref="railListRef" @scroll="onRailScroll">
                        <div
                            v-for="d in filteredDiscussions" :key="d.id"
                            class="dp-list-item" :class="d.status === 'open' ? (d.isExpired ? 'sev-warn' : 'sev-good') : 'sev-flat'"
                            @click="openDetail(d)"
                        >
                            <div class="row items-center justify-between no-wrap">
                                <div class="text-body2 text-weight-bold ellipsis">{{ d.title }}</div>
                                <div class="text-caption text-grey q-ml-sm">
                                    <q-icon name="bi-chat-left-text" size="xs" class="q-mr-xs" />{{ d.commentCount }}
                                </div>
                            </div>
                            <div class="row items-center q-gutter-xs q-mt-xs">
                                <span class="dp-pill" :style="statusPillStyle(d)">{{ d.status === 'open' && d.isExpired ? 'expired' : d.status }}</span>
                                <span class="dp-pill dp-pill--office" v-for="o in d.offices" :key="o.id">{{ o.alias || o.name }}</span>
                                <span class="dp-pill dp-pill--office" v-if="!d.offices?.length">unassigned</span>
                            </div>
                        </div>
                        <div v-if="loading" class="dp-list-empty">
                            <q-spinner-ios size="1.5em" />
                            <div class="text-caption text-uppercase q-mt-sm">loading discussions...</div>
                        </div>
                        <div v-if="!loading && !filteredDiscussions.length" class="dp-list-empty">
                            <div class="text-caption text-uppercase">no discussions found</div>
                        </div>
                    </div>
                    <q-btn
                        v-if="showBackToTop"
                        round unelevated color="primary" icon="bi-arrow-up" size="sm"
                        class="dp-back-to-top" @click="scrollRailToTop"
                    >
                        <q-tooltip>Back to top</q-tooltip>
                    </q-btn>
                </q-card>
            </div>
        </div>

        <!-- Create discussion -->
        <q-dialog v-model="createDialog" full-height persistent>
            <q-card class="card-create column full-height" style="width: 75%; max-width: 100vw;">
                <q-card-section class="row items-center q-pa-lg">
                    <div class="text-h5 text-uppercase">new discussion</div>
                    <q-space />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-card-section style="flex: 1; display: flex; min-height: 0; padding-top: 0;">
                    <div class="col dp-create-shell">
                        <div class="dp-create-body">
                            <div class="text-caption text-grey q-mb-md">
                                <q-icon name="bi-info-circle" size="xs" class="q-mr-xs" />
                                This will be automatically routed to the office(s) whose mandate it concerns, based on the
                                title and description below — you can adjust the assignment afterward from the discussion's detail view.
                            </div>
                            <div class="q-mb-md">
                                <div class="row q-mb-xs">
                                    <span class="text-caption text-uppercase text-grey">title</span>
                                    <q-space />
                                    <span class="text-caption text-uppercase text-grey q-mr-lg">mandatory</span>
                                </div>
                                <q-input outlined v-model="form.title" label="Enter Title" :error="!!formError && !form.title.trim()" no-error-icon />
                            </div>
                            <div class="q-mb-md">
                                <div class="row q-mb-xs">
                                    <span class="text-caption text-uppercase text-grey">description</span>
                                    <q-space />
                                    <span class="text-caption text-uppercase text-grey q-mr-lg">optional</span>
                                </div>
                                <q-input outlined type="textarea" v-model="form.description" label="Enter Description" rows="5" />
                            </div>
                            <div class="row q-col-gutter-sm">
                                <div class="col-12 col-sm-6">
                                    <div class="row q-mb-xs">
                                        <span class="text-caption text-uppercase text-grey">expiration date</span>
                                        <q-space />
                                        <span class="text-caption text-uppercase text-grey q-mr-lg">optional</span>
                                    </div>
                                    <q-input outlined v-model="form.expiresAt" label="No expiration" readonly>
                                        <template v-slot:append>
                                            <q-icon name="bi-calendar-event" class="cursor-pointer">
                                                <q-popup-proxy cover transition-show="scale" transition-hide="scale" class="radius-sm no-shadow">
                                                    <q-date v-model="form.expiresAt" mask="YYYY-MM-DD" :options="futureDateOptions" today-btn class="radius-sm no-shadow custom-border">
                                                        <div class="row items-center justify-end">
                                                            <q-btn label="clear" flat no-caps @click="form.expiresAt = ''" />
                                                            <q-btn label="close" color="primary" flat no-caps v-close-popup />
                                                        </div>
                                                    </q-date>
                                                </q-popup-proxy>
                                            </q-icon>
                                        </template>
                                    </q-input>
                                    <div class="text-caption text-grey q-mt-xs">Past this date the topic auto-closes to new comments.</div>
                                </div>
                            </div>
                            <div class="text-negative text-caption q-mt-sm" v-if="formError">{{ formError }}</div>
                        </div>
                        <div class="dp-create-footer row justify-start">
                            <q-btn no-caps rounded unelevated color="primary" label="create discussion" :loading="saving" @click="createDiscussion" />
                        </div>
                    </div>
                </q-card-section>
            </q-card>
        </q-dialog>

        <!-- Detail / comments -->
        <q-dialog v-model="detailDialog" full-height persistent>
            <q-card class="card-create column full-height" style="width: 75%; max-width: 100vw;">
                <q-card-section class="row items-center q-pa-lg dp-detail-header">
                    <div>
                        <div class="dp-eyebrow">public discussion &middot; topic detail</div>
                        <div class="text-h5">{{ selected?.title }}</div>
                        <div class="row items-center q-gutter-xs q-mt-xs">
                            <span class="dp-pill" :style="statusPillStyle(selected)">{{ selected?.status === 'open' && selected?.isExpired ? 'expired' : selected?.status }}</span>
                            <span class="text-caption text-grey" v-if="selected?.expiresAt">expires {{ formatDate(selected.expiresAt) }}</span>
                        </div>
                    </div>
                    <q-space />
                    <q-btn
                        no-caps v-if="isSupervisor && selected?.status === 'open'" outline rounded size="sm" color="negative" label="close discussion"
                        class="q-mr-sm" :loading="statusLoading" @click="toggleStatus('close')"
                    />
                    <q-btn
                        no-caps v-else-if="isSupervisor" outline rounded size="sm" color="positive" label="reopen discussion"
                        class="q-mr-sm" :loading="statusLoading" @click="toggleStatus('reopen')"
                    />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-card-section class="scroll" style="flex: 1">
                    <div class="row q-col-gutter-md">
                        <div class="col-5">
                            <q-card-section class="q-pa-md radius-sm bg-accent">
                                <div class="text-caption text-uppercase text-grey q-mb-xs">description</div>
                                <div class="text-body2 q-mb-md">{{ selected?.description || 'No description provided.' }}</div>
                                <div class="text-caption text-uppercase text-grey q-mb-xs">opened by</div>
                                <div class="text-body2 text-capitalize q-mb-md">{{ creatorName(selected) }} &middot; {{ formatDate(selected?.createdAt) }}</div>
                            </q-card-section>

                            <q-card-section v-if="isSupervisor" class="q-mt-sm q-pa-md radius-sm bg-accent">
                                <div class="row items-center q-mb-xs">
                                    <div class="text-caption text-uppercase text-grey">assigned office(s)</div>
                                    <q-space />
                                    <q-btn
                                        unelevated size="sm" color="primary" icon="bi-stars" round
                                        :loading="suggestLoading" @click="loadSuggestions"
                                    >
                                        <q-tooltip>Help me decide with AI</q-tooltip>
                                    </q-btn>
                                </div>
                                <div class="text-caption text-grey q-mb-xs" v-if="suggestionsChecked && !suggestions.length">
                                    No confident suggestion — the AI couldn't match this topic to any office's mandate.
                                </div>
                                <div class="row items-center q-gutter-xs q-mb-sm">
                                    <q-btn
                                        v-for="o in officeOptions" :key="o.value"
                                        no-caps unelevated rounded size="sm" :label="o.label"
                                        class="dp-chip" :class="selectedOfficeIds.includes(o.value) ? 'dp-chip--active' : ''"
                                        @click="toggleOffice(o.value)"
                                    >
                                        <q-icon v-if="suggestedOfficeIds.has(o.value)" name="bi-stars" :color="selectedOfficeIds.includes(o.value) ? 'white' : 'amber-8'" size="0.8em" class="q-ml-xs">
                                            <q-tooltip>AI-suggested</q-tooltip>
                                        </q-icon>
                                    </q-btn>
                                </div>
                                <q-list v-if="officesWithReason.length" bordered separator class="radius-xs overflow-hidden q-mb-sm">
                                    <q-item v-for="o in officesWithReason" :key="o.value">
                                        <q-item-section v-if="selectedOfficeIds.includes(o.value)" side>
                                            <q-icon name="bi-check-circle-fill" color="primary" size="xs" />
                                        </q-item-section>
                                        <q-item-section>
                                            <q-item-label class="text-caption text-uppercase text-weight-bold">{{ o.label }}</q-item-label>
                                            <q-item-label caption>{{ reasonsByOffice[o.value] }}</q-item-label>
                                        </q-item-section>
                                    </q-item>
                                </q-list>
                                <q-btn
                                    rounded unelevated color="primary" class="full-width" no-caps
                                    :label="selectedOfficeIds.length ? `save assignment (${selectedOfficeIds.length})` : 'unassign'"
                                    :loading="reassignLoading" @click="submitReassign"
                                />
                            </q-card-section>
                        </div>
                        <div class="col-7">
                            <q-card-section class="q-pa-md radius-sm bg-accent q-mb-sm">
                                <div class="text-caption text-grey" v-if="isMonitoring">
                                    <q-icon name="bi-eye" size="xs" class="q-mr-xs" />
                                    Monitoring accounts are view-only.
                                </div>
                                <div class="text-caption text-grey" v-else-if="selected?.status === 'closed' || selected?.isExpired">
                                    <q-icon name="bi-lock-fill" size="xs" class="q-mr-xs" />
                                    This discussion is closed to new comments.
                                </div>
                                <template v-else>
                                    <q-input outlined type="textarea" rows="3" v-model="commentContent" label="Add a comment" class="q-mb-sm" />
                                    <q-btn rounded unelevated color="primary" no-caps label="post comment" class="full-width" :disable="!commentContent.trim()" :loading="commentLoading" @click="submitComment" />
                                </template>

                                <q-separator class="q-my-md" />

                                <div class="text-caption text-uppercase text-grey q-mb-sm">comments &middot; {{ selected?.comments?.length || 0 }}</div>
                                <div class="dp-comment-list" v-if="selected?.comments?.length">
                                    <q-list bordered separator class="radius-sm overflow-hidden">
                                        <q-item v-for="c in sortedComments" :key="c.id">
                                            <q-item-section>
                                                <div class="row items-center q-gutter-xs q-mb-xs">
                                                    <div class="text-weight-bold text-capitalize">{{ c.authorName }}</div>
                                                    <div class="text-caption text-grey">{{ formatDate(c.createdAt) }}</div>
                                                </div>
                                                <div class="text-body2">{{ c.content }}</div>
                                            </q-item-section>
                                        </q-item>
                                    </q-list>
                                </div>
                                <div v-else class="text-center q-pa-lg">
                                    <q-icon name="bi-exclamation-circle" size="xl" color="grey" />
                                    <div class="text-caption text-grey text-uppercase q-mt-sm">no comments yet</div>
                                </div>
                            </q-card-section>
                        </div>
                    </div>
                </q-card-section>
                <q-inner-loading :showing="detailLoading">
                    <q-spinner-ios />
                </q-inner-loading>
            </q-card>
        </q-dialog>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from 'src/boot/axios';
import moment from 'moment';
import { Toast } from 'src/boot/sweetalert';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { useAuthStore } from 'src/stores/auth-store';
import Apexchart from 'vue3-apexcharts';

const AuthStore = useAuthStore();
// isSupervisor gates TRANSACTIONS (create/close/reopen/reassign) — monitoring excluded on
// purpose. canViewAll gates system-wide READ-ONLY panels — monitoring gets the same visibility.
const isSupervisor = computed(() => ['super', 'admin'].includes(AuthStore.user?.role));
const canViewAll = computed(() => ['super', 'admin', 'monitoring'].includes(AuthStore.user?.role));
const isMonitoring = computed(() => AuthStore.user?.role === 'monitoring');

// Shuffled fresh on every page load so charts don't render in the exact same color order every
// visit — same 10-color theme (5 distinct, repeated 3x below to match the array length every
// multi-item chart on this page already expects), just randomized which color lands where.
// Multi-item charts (donuts, multi-series bar) still pass the whole array — Apex assigns one
// color per slice/series positionally. nextChartColor() hands single-series charts one color
// each, in round-robin order through the shuffled set, so two single-series charts on this page
// never coincidentally land on the same color.
const shuffleColors = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};
const SHUFFLED_COLORS = shuffleColors(['#68AFF1', '#DB812C', '#EEC336', '#004283', '#4CAF7D']);
const CHART_PALETTE = [...SHUFFLED_COLORS, ...SHUFFLED_COLORS, ...SHUFFLED_COLORS];
let _nextColorIdx = 0;
const nextChartColor = () => SHUFFLED_COLORS[_nextColorIdx++ % SHUFFLED_COLORS.length];

const formatDate = (timestamp) => timestamp ? moment(timestamp).format('MMM DD, YYYY hh:mm A') : '—';
const creatorName = (d) => {
    const c = d?.creator;
    const name = `${c?.firstname || ''} ${c?.lastname || ''}`.trim();
    return name || 'Staff';
};

/* -------------------- list + filters -------------------- */

const loading = ref(false);
const discussions = ref([]);
const scopeLabel = ref('');
const search = ref('');
const statusFilter = ref('all');
// Server-computed, not derivable from the discussion list alone — see getAllDiscussions' `stats`.
const stats = ref({ avgTimeToFirstCommentMinutes: null, commentAuthorMix: [], reopenRate: null });

// Floating "back to top" for the discussion rail — same idiom as ComplaintPage.vue's .cp-rail-list.
const railListRef = ref(null);
const showBackToTop = ref(false);
const onRailScroll = (event) => {
    showBackToTop.value = event.target.scrollTop > 400;
};
const scrollRailToTop = () => {
    railListRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
};

// Picks minutes/hours/days by magnitude — same convention as ComplaintPage.vue's
// formatResolutionTime, minutes in from the backend this time rather than days.
const formatLag = (minutes) => {
    if (minutes == null) return '—';
    if (minutes < 60) return Math.round(minutes) + 'm';
    const hours = minutes / 60;
    if (hours < 24) return (Math.round(hours * 10) / 10) + 'h';
    return (Math.round(hours / 24 * 10) / 10) + 'd';
};

/* -------------------- period / year (Complaint/Feedback pattern) -------------------- */

const analyticsPeriod = ref('year'); // 'week' | 'month' | 'year'
const currentYear = new Date().getFullYear();
const analyticsYear = ref(currentYear);
const analyticsRangeLabel = ref('');
const bucketUnitLabel = computed(() => analyticsPeriod.value === 'week' ? 'day' : analyticsPeriod.value === 'month' ? 'week' : 'month');

const filteredDiscussions = computed(() => {
    const term = search.value.trim().toLowerCase();
    return discussions.value.filter(d => {
        if (statusFilter.value !== 'all' && d.status !== statusFilter.value) return false;
        if (!term) return true;
        return (d.title || '').toLowerCase().includes(term) || (d.description || '').toLowerCase().includes(term);
    });
});

const openCount = computed(() => discussions.value.filter(d => d.status === 'open').length);
const closedCount = computed(() => discussions.value.filter(d => d.status === 'closed').length);
const expiredCount = computed(() => discussions.value.filter(d => d.isExpired).length);
const totalComments = computed(() => discussions.value.reduce((sum, d) => sum + (d.commentCount || 0), 0));
const avgComments = computed(() => discussions.value.length ? (totalComments.value / discussions.value.length).toFixed(1) : '0.0');
// Never auto-matched (or manually cleared) to any office — the queue a supervisor works from to
// route it manually, same idea as Complaint's "needs assignment" KPI.
const unassignedCount = computed(() => discussions.value.filter(d => !d.offices?.length).length);
const expiringSoonCount = computed(() => discussions.value.filter(d => {
    if (d.status !== 'open' || d.isExpired || !d.expiresAt) return false;
    return moment(d.expiresAt).diff(moment(), 'days') <= 7;
}).length);

const statusPillStyle = (d) => {
    if (!d) return {};
    if (d.status === 'open' && d.isExpired) return { background: '#FBF1D9', color: '#9A6B00' };
    if (d.status === 'open') return { background: '#E4F5E9', color: '#1C8A3B' };
    return { background: '#F6F9FC', color: '#8493AC' };
};

/* -------------------- charts (computed client-side from the loaded list) -------------------- */

const volumeChartSeries = ref([{ name: 'Opened', data: [] }]);
const volumeChartOptions = ref({
    chart: { type: 'area', toolbar: { show: false }, animations: { speed: 300 } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: [nextChartColor()],
    grid: { strokeDashArray: 4 },
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v) => Math.round(v) } },
});

const statusChartSeries = ref([]);
const statusChartOptions = ref({
    chart: { type: 'pie' },
    labels: [],
    colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: true },
});

const authorMixChartSeries = ref([]);
const authorMixChartOptions = ref({
    chart: { type: 'pie' },
    labels: [],
    colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: true },
});

const officeChartSeries = ref([{ name: 'Topics', data: [] }]);
const officeChartOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true },
    colors: [nextChartColor()],
    xaxis: { categories: [] },
});

// Comments over time — distinct from the "topics opened" volume above, this is the one that
// actually shows whether engagement is picking up or trailing off, independent of how many new
// topics happen to have been opened.
const commentsChartSeries = ref([{ name: 'Comments', data: [] }]);
const commentsChartOptions = ref({
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    markers: { size: 3 },
    colors: [nextChartColor()],
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v) => Math.round(v) } },
});

const topDiscussedSeries = ref([{ name: 'Comments', data: [] }]);
const topDiscussedOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true },
    colors: [nextChartColor()],
    xaxis: { categories: [] },
});

// Adaptive bucketing, same convention as ComplaintController/FeedbackController's server-side
// trend charts — daily across a week, weekly across a month, monthly across a year — but computed
// client-side here since the whole (already period-filtered) discussion list is on hand already.
const buildBucketDefs = () => {
    const ref_ = analyticsYear.value === currentYear ? moment() : moment(`${analyticsYear.value}-12-31`, 'YYYY-MM-DD').endOf('day');
    if (analyticsPeriod.value === 'week') {
        const start = moment(ref_).startOf('isoWeek');
        return Array.from({ length: 7 }, (_, i) => {
            const day = moment(start).add(i, 'days');
            return { label: day.format('ddd D'), start: moment(day).startOf('day'), end: moment(day).endOf('day') };
        });
    }
    if (analyticsPeriod.value === 'year') {
        const start = moment(ref_).startOf('year');
        return Array.from({ length: 12 }, (_, i) => {
            const m = moment(start).add(i, 'months');
            return { label: m.format('MMM'), start: moment(m).startOf('month'), end: moment(m).endOf('month') };
        });
    }
    // month
    const start = moment(ref_).startOf('month');
    const weekSpan = Math.max(1, Math.ceil(moment(ref_).diff(start, 'days') / 7) + 1);
    return Array.from({ length: weekSpan }, (_, i) => {
        const w = moment(start).add(i, 'weeks');
        return { label: w.format('MMM D'), start: moment(w).startOf('day'), end: moment(w).add(6, 'days').endOf('day') };
    });
};

const applyCharts = () => {
    const bucketDefs = buildBucketDefs();
    const topicCounts = bucketDefs.map(() => 0);
    const commentCounts = bucketDefs.map(() => 0);
    discussions.value.forEach(d => {
        const created = moment(d.createdAt);
        const idx = bucketDefs.findIndex(b => created.isBetween(b.start, b.end, null, '[]'));
        if (idx >= 0) {
            topicCounts[idx]++;
            commentCounts[idx] += (d.commentCount || 0);
        }
    });
    volumeChartSeries.value = [{ name: 'Opened', data: topicCounts }];
    volumeChartOptions.value = {
        ...volumeChartOptions.value,
        xaxis: { ...volumeChartOptions.value.xaxis, categories: bucketDefs.map(b => b.label) }
    };
    commentsChartSeries.value = [{ name: 'Comments', data: commentCounts }];
    commentsChartOptions.value = {
        ...commentsChartOptions.value,
        xaxis: { ...commentsChartOptions.value.xaxis, categories: bucketDefs.map(b => b.label) }
    };

    statusChartSeries.value = [openCount.value, closedCount.value];
    statusChartOptions.value = { ...statusChartOptions.value, labels: ['Open', 'Closed'] };

    const byOffice = {};
    discussions.value.forEach(d => {
        (d.offices || []).forEach(o => {
            const label = o.alias || o.name;
            byOffice[label] = (byOffice[label] || 0) + 1;
        });
    });
    const sortedOffices = Object.entries(byOffice).sort((a, b) => b[1] - a[1]).slice(0, 8);
    officeChartSeries.value = [{ name: 'Topics', data: sortedOffices.map(([, count]) => count) }];
    officeChartOptions.value = { ...officeChartOptions.value, xaxis: { ...officeChartOptions.value.xaxis, categories: sortedOffices.map(([label]) => label) } };

    const topDiscussed = [...discussions.value]
        .filter(d => d.commentCount > 0)
        .sort((a, b) => b.commentCount - a.commentCount)
        .slice(0, 8);
    topDiscussedSeries.value = [{ name: 'Comments', data: topDiscussed.map(d => d.commentCount) }];
    topDiscussedOptions.value = {
        ...topDiscussedOptions.value,
        xaxis: { ...topDiscussedOptions.value.xaxis, categories: topDiscussed.map(d => (d.title || '').length > 28 ? d.title.slice(0, 28) + '…' : d.title) }
    };
};

const loadDiscussions = async () => {
    loading.value = true;
    try {
        const response = await api.get('/discussion', { params: { period: analyticsPeriod.value, year: analyticsYear.value } });
        discussions.value = response.data.data || [];
        scopeLabel.value = response.data.scope?.label || '';
        analyticsRangeLabel.value = response.data.range?.label || '';
        stats.value = response.data.stats || { avgTimeToFirstCommentMinutes: null, commentAuthorMix: [], reopenRate: null };
        const authorMix = stats.value.commentAuthorMix || [];
        authorMixChartSeries.value = authorMix.map(m => m.count);
        authorMixChartOptions.value = { ...authorMixChartOptions.value, labels: authorMix.map(m => m.label) };
        applyCharts();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const setAnalyticsPeriod = (period) => {
    if (analyticsPeriod.value === period) return;
    analyticsPeriod.value = period;
    loadDiscussions();
};

const stepYear = (delta) => {
    const next = analyticsYear.value + delta;
    if (next > currentYear) return;
    analyticsYear.value = next;
    loadDiscussions();
};

/* -------------------- create -------------------- */

const createDialog = ref(false);
const form = ref({ title: '', description: '', expiresAt: '' });
const formError = ref('');
const saving = ref(false);

const futureDateOptions = (date) => date >= moment().format('YYYY/MM/DD');

const openCreateDialog = () => {
    form.value = { title: '', description: '', expiresAt: '' };
    formError.value = '';
    createDialog.value = true;
};

const createDiscussion = async () => {
    formError.value = '';
    if (!form.value.title.trim()) {
        formError.value = 'Title is required.';
        return;
    }
    saving.value = true;
    try {
        await api.post('/discussion', {
            title: form.value.title,
            description: form.value.description,
            expiresAt: form.value.expiresAt ? moment(form.value.expiresAt, 'YYYY-MM-DD').endOf('day').toISOString() : null
        });
        createDialog.value = false;
        Toast.fire({ icon: 'success', html: '<div class="text-h6 text-bold text-uppercase">success!</div><div class="text-caption">Discussion created and routed.</div>' });
        loadDiscussions();
    } catch (e) {
        formError.value = e.response?.data?.message || 'Unable to create discussion.';
    } finally {
        saving.value = false;
    }
};

/* -------------------- detail + office reassignment -------------------- */

const detailDialog = ref(false);
const detailLoading = ref(false);
const selected = ref(null);
const statusLoading = ref(false);

const sortedComments = computed(() =>
    [...(selected.value?.comments || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
);

const officeOptions = ref([]); // [{ value: officeId, label }]
const loadOfficeOptions = async () => {
    try {
        const { data } = await api.get('/preference/office/getOffice');
        officeOptions.value = (data || []).map(o => ({ value: o.id, label: o.alias || o.name }));
    } catch (e) {
        console.error('Error loading offices:', e);
    }
};

const suggestions = ref([]);
const suggestLoading = ref(false);
const suggestionsChecked = ref(false);
const suggestedOfficeIds = computed(() => new Set(suggestions.value.map(s => s.officeId)));

const selectedOfficeIds = ref([]);
const reasonsByOffice = ref({});
const reassignLoading = ref(false);
const officesWithReason = computed(() => officeOptions.value.filter(o => reasonsByOffice.value[o.value]));

const toggleOffice = (officeId) => {
    const idx = selectedOfficeIds.value.indexOf(officeId);
    if (idx >= 0) {
        selectedOfficeIds.value.splice(idx, 1);
        return;
    }
    selectedOfficeIds.value.push(officeId);
    const matched = suggestions.value.find(s => s.officeId === officeId);
    if (matched?.reason) reasonsByOffice.value[officeId] = matched.reason;
};

const loadSuggestions = async () => {
    if (!selected.value?.id) return;
    suggestLoading.value = true;
    suggestionsChecked.value = false;
    try {
        const response = await api.get(`/discussion/${selected.value.id}/suggest-office`);
        suggestions.value = response.data?.suggestions || [];
        suggestionsChecked.value = true;
        const ids = new Set(selectedOfficeIds.value);
        for (const s of suggestions.value) {
            ids.add(s.officeId);
            reasonsByOffice.value[s.officeId] = s.reason || '';
        }
        selectedOfficeIds.value = [...ids];
    } catch (e) {
        console.error('Error fetching office suggestion:', e);
        Toast.fire({ icon: 'error', html: '<div class="text-caption">Unable to get a suggestion right now.</div>' });
    } finally {
        suggestLoading.value = false;
    }
};

const submitReassign = async () => {
    if (!selected.value?.id) return;

    const names = selectedOfficeIds.value
        .map(oid => officeOptions.value.find(o => o.value === oid)?.label || `Office #${oid}`);
    const result = await Swal.fire({
        title: names.length ? 'Reassign this discussion?' : 'Clear this assignment?',
        html: names.length
            ? `Set the concerned office(s) to <b>${names.join(', ')}</b>?`
            : `Remove every office from this discussion, leaving it unassigned?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: names.length ? 'reassign' : 'clear assignment',
        cancelButtonText: 'cancel',
        reverseButtons: true
    });
    if (!result.isConfirmed) return;

    reassignLoading.value = true;
    try {
        const offices = selectedOfficeIds.value.map(officeId => ({
            officeId,
            reason: reasonsByOffice.value[officeId] || undefined
        }));
        await api.patch(`/discussion/${selected.value.id}/office`, { offices });
        Toast.fire({ icon: 'success', html: '<div class="text-h6 text-bold text-uppercase">saved!</div><div class="text-caption">Office assignment updated.</div>' });
        await openDetail(selected.value);
        loadDiscussions();
    } catch (e) {
        console.error('Error reassigning discussion office:', e);
        Toast.fire({ icon: 'error', html: `<div class="text-caption">${e.response?.data?.message || 'Unable to reassign this discussion.'}</div>` });
    } finally {
        reassignLoading.value = false;
    }
};

const openDetail = async (row) => {
    detailDialog.value = true;
    detailLoading.value = true;
    suggestions.value = [];
    suggestionsChecked.value = false;
    try {
        const response = await api.get(`/discussion/${row.id}`);
        selected.value = response.data.data;
        selectedOfficeIds.value = (selected.value.offices || []).map(o => o.id);
        reasonsByOffice.value = {};
    } catch (e) {
        console.error(e);
    } finally {
        detailLoading.value = false;
    }
};

const toggleStatus = async (action) => {
    const result = await Swal.fire({
        title: 'Confirm',
        html: action === 'close'
            ? 'Close this discussion? Citizens will no longer be able to add comments.'
            : 'Reopen this discussion? Citizens will be able to add comments again.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'confirm',
        cancelButtonText: 'cancel',
        reverseButtons: true
    });
    if (!result.isConfirmed) return;

    statusLoading.value = true;
    try {
        await api.post(`/discussion/${selected.value.id}/${action}`);
        await openDetail(selected.value);
        loadDiscussions();
    } catch (e) {
        console.error(e);
        Toast.fire({ icon: 'error', html: `<div class="text-caption">${e.response?.data?.message || 'Unable to update this discussion.'}</div>` });
    } finally {
        statusLoading.value = false;
    }
};

/* -------------------- comments -------------------- */

const commentContent = ref('');
const commentLoading = ref(false);

const submitComment = async () => {
    if (!selected.value?.id || !commentContent.value.trim()) return;
    commentLoading.value = true;
    try {
        await api.post(`/discussion/${selected.value.id}/comment`, { content: commentContent.value });
        commentContent.value = '';
        await openDetail(selected.value);
        loadDiscussions();
    } catch (e) {
        console.error(e);
        Toast.fire({ icon: 'error', html: `<div class="text-caption">${e.response?.data?.message || 'Unable to post this comment.'}</div>` });
    } finally {
        commentLoading.value = false;
    }
};

onMounted(() => {
    loadDiscussions();
    if (isSupervisor.value) loadOfficeOptions();
});
</script>

<style scoped>
.dp-shell {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 16px;
    align-items: start;
}
@media (max-width: 1200px) {
    .dp-shell {
        grid-template-columns: 1fr;
    }
}
.dp-main {
    min-width: 0;
}
.dp-header {
    flex-wrap: wrap;
    gap: 8px;
}
.dp-eyebrow {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 2px;
}
.dp-year-group {
    display: inline-flex;
    align-items: center;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px 4px;
    gap: 2px;
}
.dp-year-value {
    min-width: 44px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #16233A;
}
.dp-period-group {
    display: inline-flex;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
}
.dp-period-btn {
    background: transparent;
    color: #4C5C79;
    min-height: 26px;
    padding: 0 12px;
    border-radius: 6px;
}
.dp-period-btn--active {
    background: var(--q-primary);
    color: #FFFFFF;
}
.dp-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
}
.dp-kpi {
    width: 100%;
    height: 100%;
    min-height: 92px;
    padding: 14px 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
}
.dp-kpi-value {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
}
.dp-kpi-label {
    font-size: 11px;
    letter-spacing: .02em;
    text-transform: uppercase;
    margin-top: 4px;
}
.dp-panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
}
.dp-panel {
    min-width: 0;
}
.dp-rail {
    min-width: 0;
}
.dp-rail-card {
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    position: relative;
}
.dp-back-to-top {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 2;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
@media (min-width: 1201px) {
    .dp-rail-card {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 380px;
        max-height: none;
        border-radius: 0;
        border-left: 1px solid #DCE4F0;
    }
}
.dp-rail-head {
    padding: 16px;
    flex-shrink: 0;
}
.dp-search :deep(.q-field__control) {
    border-radius: 100px;
    background: #F6F9FC;
}
.dp-rail-list {
    overflow-y: auto;
    flex: 1;
    min-height: 200px;
}
.dp-list-item {
    padding: 10px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-left: 3px solid transparent;
    cursor: pointer;
}
.dp-list-item:hover {
    background: #F6F9FC;
}
.dp-list-item.sev-good {
    border-left-color: var(--q-positive);
}
.dp-list-item.sev-warn {
    border-left-color: var(--q-warning);
}
.dp-list-item.sev-flat {
    border-left-color: #E0E0E0;
}
.dp-list-empty {
    padding: 32px 16px;
    text-align: center;
    color: #9E9E9E;
}
.dp-pill {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .02em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 100px;
}
.dp-pill--office {
    background: #F6F9FC;
    color: #4C5C79;
}
.dp-chip {
    background: #FFFFFF;
    color: #4C5C79;
    border: 1px solid #DCE4F0;
    min-height: 26px;
    padding: 0 12px;
    font-size: 12px;
}
.dp-chip--active {
    background: var(--q-primary);
    color: #FFFFFF;
    border-color: var(--q-primary);
}
.dp-create-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}
.dp-create-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
}
.dp-create-footer {
    flex: 0 0 auto;
    padding-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    margin-top: 8px;
}
.dp-comment-list {
    max-height: 420px;
    overflow-y: auto;
}
.dp-detail-header {
    flex-wrap: wrap;
    gap: 8px;
}
</style>
