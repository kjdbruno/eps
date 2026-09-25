<template>
    <div>
        <div class="pp-shell">
            <div class="pp-main">
                <div class="row items-center justify-between q-mb-md pp-header">
                    <div>
                        <div class="pp-eyebrow">public poll &middot; operations overview<template v-if="scopeLabel"> &middot; {{ scopeLabel }}</template></div>
                        <div class="text-h5">{{ analyticsRangeLabel || ' ' }}</div>
                    </div>
                    <div class="row items-center q-gutter-sm">
                        <div class="pp-year-group">
                            <q-btn flat dense round size="sm" icon="bi-chevron-left" @click="stepYear(-1)">
                                <q-tooltip>Previous year</q-tooltip>
                            </q-btn>
                            <div class="pp-year-value">{{ analyticsYear }}</div>
                            <q-btn flat dense round size="sm" icon="bi-chevron-right" :disable="analyticsYear >= currentYear" @click="stepYear(1)">
                                <q-tooltip>Next year</q-tooltip>
                            </q-btn>
                        </div>
                        <div class="pp-period-group">
                            <q-btn no-caps unelevated size="sm" label="Week" class="pp-period-btn" :class="analyticsPeriod === 'week' ? 'pp-period-btn--active' : ''" @click="setAnalyticsPeriod('week')" />
                            <q-btn no-caps unelevated size="sm" label="Month" class="pp-period-btn" :class="analyticsPeriod === 'month' ? 'pp-period-btn--active' : ''" @click="setAnalyticsPeriod('month')" />
                            <q-btn no-caps unelevated size="sm" label="Year" class="pp-period-btn" :class="analyticsPeriod === 'year' ? 'pp-period-btn--active' : ''" @click="setAnalyticsPeriod('year')" />
                        </div>
                        <q-btn flat dense round size="sm" icon="bi-arrow-clockwise" :loading="loading" @click="loadPolls">
                            <q-tooltip>Refresh</q-tooltip>
                        </q-btn>
                    </div>
                </div>

                <div class="pp-kpi-grid q-mb-md">
                    <q-card flat class="pp-kpi radius-xs bg-primary">
                        <div class="pp-kpi-value text-white">{{ polls.length }}</div>
                        <div class="pp-kpi-label text-white">total polls</div>
                    </q-card>
                    <q-card flat class="pp-kpi radius-xs bg-primary">
                        <div class="pp-kpi-value text-white">{{ openCount }}</div>
                        <div class="pp-kpi-label text-white">open</div>
                    </q-card>
                    <q-card flat class="pp-kpi radius-xs custom-border">
                        <div class="pp-kpi-value text-primary">{{ closedCount }}</div>
                        <div class="pp-kpi-label text-grey">closed</div>
                    </q-card>
                    <q-card flat class="pp-kpi radius-xs custom-border">
                        <div class="pp-kpi-value text-primary">{{ totalVotesAll }}</div>
                        <div class="pp-kpi-label text-grey">total votes</div>
                    </q-card>
                    <q-card flat class="pp-kpi radius-xs custom-border">
                        <div class="pp-kpi-value text-primary">{{ avgVotes }}</div>
                        <div class="pp-kpi-label text-grey">avg. votes / poll</div>
                    </q-card>
                    <q-card flat class="pp-kpi radius-xs custom-border">
                        <div class="pp-kpi-value text-primary">{{ formatLag(stats.avgTimeToFirstVoteMinutes) }}</div>
                        <div class="pp-kpi-label text-grey">avg. time to first vote</div>
                    </q-card>
                    <q-card flat class="pp-kpi radius-xs custom-border">
                        <div class="pp-kpi-value text-primary">{{ stats.reopenRate != null ? stats.reopenRate + '%' : '—' }}</div>
                        <div class="pp-kpi-label text-grey">reopen rate</div>
                    </q-card>
                    <q-card flat class="pp-kpi radius-xs custom-border" v-if="canViewAll">
                        <div class="pp-kpi-value text-negative">{{ unassignedCount }}</div>
                        <div class="pp-kpi-label text-grey">unassigned</div>
                    </q-card>
                    <q-card flat class="pp-kpi radius-xs custom-border">
                        <div class="pp-kpi-value text-warning">{{ expiringSoonCount }}</div>
                        <div class="pp-kpi-label text-grey">expiring within 7d</div>
                    </q-card>
                    <q-card flat class="pp-kpi radius-xs custom-border">
                        <div class="pp-kpi-value text-negative">{{ expiredCount }}</div>
                        <div class="pp-kpi-label text-grey">expired</div>
                    </q-card>
                </div>

                <div class="pp-panel-grid">
                    <q-card flat class="pp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">polls opened per {{ bucketUnitLabel }}</div>
                        <apexchart type="area" height="220" :options="volumeChartOptions" :series="volumeChartSeries" />
                    </q-card>

                    <q-card flat class="pp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">votes filed per {{ bucketUnitLabel }}</div>
                        <div class="text-caption text-grey q-mb-sm">engagement over time, not just poll volume</div>
                        <apexchart type="line" height="220" :options="votesChartOptions" :series="votesChartSeries" />
                    </q-card>

                    <q-card flat class="pp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">open vs. closed</div>
                        <apexchart type="pie" height="280" :options="statusChartOptions" :series="statusChartSeries" />
                    </q-card>

                    <q-card flat class="pp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">votes by author type</div>
                        <apexchart type="pie" height="280" :options="authorMixChartOptions" :series="authorMixChartSeries" />
                    </q-card>

                    <q-card flat class="pp-panel custom-border radius-xs q-pa-md" v-if="canViewAll">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">polls by office</div>
                        <apexchart type="bar" height="200" :options="officeChartOptions" :series="officeChartSeries" />
                    </q-card>

                    <q-card flat class="pp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">most voted polls</div>
                        <apexchart type="bar" height="200" :options="topVotedOptions" :series="topVotedSeries" />
                    </q-card>
                </div>
            </div>

            <div class="pp-rail">
                <q-card flat class="pp-rail-card">
                    <div class="pp-rail-head">
                        <div class="row items-center justify-between no-wrap q-mb-sm">
                            <div class="row items-baseline q-gutter-xs">
                                <div class="text-h6 text-capitalize">polls</div>
                                <div class="text-caption text-grey">{{ filteredPolls.length }} of {{ polls.length }}</div>
                            </div>
                            <q-btn v-if="isSupervisor" no-caps unelevated rounded size="sm" color="primary" label="add" @click="openCreateDialog">
                                <q-tooltip>Start a new poll</q-tooltip>
                            </q-btn>
                        </div>
                        <q-input outlined dense v-model="search" placeholder="Search question..." class="pp-search q-mb-sm">
                            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
                        </q-input>
                        <div class="row q-gutter-xs">
                            <q-btn no-caps unelevated rounded size="sm" label="All" class="pp-chip" :class="statusFilter === 'all' ? 'pp-chip--active' : ''" @click="statusFilter = 'all'" />
                            <q-btn no-caps unelevated rounded size="sm" label="Open" class="pp-chip" :class="statusFilter === 'open' ? 'pp-chip--active' : ''" @click="statusFilter = 'open'" />
                            <q-btn no-caps unelevated rounded size="sm" label="Closed" class="pp-chip" :class="statusFilter === 'closed' ? 'pp-chip--active' : ''" @click="statusFilter = 'closed'" />
                        </div>
                    </div>
                    <q-separator />
                    <div class="pp-rail-list" ref="railListRef" @scroll="onRailScroll">
                        <div
                            v-for="p in filteredPolls" :key="p.id"
                            class="pp-list-item" :class="p.status === 'open' ? (p.isExpired ? 'sev-warn' : 'sev-good') : 'sev-flat'"
                            @click="openDetail(p)"
                        >
                            <div class="row items-center justify-between no-wrap">
                                <div class="text-body2 text-weight-bold ellipsis">{{ p.question }}</div>
                                <div class="text-caption text-grey q-ml-sm">
                                    <q-icon name="bi-bar-chart" size="xs" class="q-mr-xs" />{{ p.totalVotes }}
                                </div>
                            </div>
                            <div class="row items-center q-gutter-xs q-mt-xs">
                                <span class="pp-pill" :style="statusPillStyle(p)">{{ p.status === 'open' && p.isExpired ? 'expired' : p.status }}</span>
                                <span class="pp-pill pp-pill--office" v-for="o in p.offices" :key="o.id">{{ o.alias || o.name }}</span>
                                <span class="pp-pill pp-pill--office" v-if="!p.offices?.length">unassigned</span>
                            </div>
                        </div>
                        <div v-if="loading" class="pp-list-empty">
                            <q-spinner-ios size="1.5em" />
                            <div class="text-caption text-uppercase q-mt-sm">loading polls...</div>
                        </div>
                        <div v-if="!loading && !filteredPolls.length" class="pp-list-empty">
                            <div class="text-caption text-uppercase">no polls found</div>
                        </div>
                    </div>
                    <q-btn
                        v-if="showBackToTop"
                        round unelevated color="primary" icon="bi-arrow-up" size="sm"
                        class="pp-back-to-top" @click="scrollRailToTop"
                    >
                        <q-tooltip>Back to top</q-tooltip>
                    </q-btn>
                </q-card>
            </div>
        </div>

        <!-- Create poll -->
        <q-dialog v-model="createDialog" full-height persistent>
            <q-card class="card-create column full-height" style="width: 75%; max-width: 100vw;">
                <q-card-section class="row items-center q-pa-lg">
                    <div class="text-h5 text-uppercase">new poll</div>
                    <q-space />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-card-section style="flex: 1; display: flex; min-height: 0; padding-top: 0;">
                    <div class="col pp-create-shell">
                        <div class="pp-create-body">
                            <div class="text-caption text-grey q-mb-md">
                                <q-icon name="bi-info-circle" size="xs" class="q-mr-xs" />
                                This will be automatically routed to the office(s) whose mandate it concerns, based on the
                                question below — you can adjust the assignment afterward from the poll's detail view.
                            </div>
                            <div class="q-mb-md">
                                <div class="row q-mb-xs">
                                    <span class="text-caption text-uppercase text-grey">question</span>
                                    <q-space />
                                    <span class="text-caption text-uppercase text-grey q-mr-lg">mandatory</span>
                                </div>
                                <q-input outlined v-model="form.question" label="Enter Question" :error="!!formError && !form.question.trim()" no-error-icon />
                            </div>
                            <div class="q-mb-md">
                                <div class="row q-mb-xs">
                                    <span class="text-caption text-uppercase text-grey">options</span>
                                    <q-space />
                                    <span class="text-caption text-uppercase text-grey q-mr-lg">at least 2</span>
                                </div>
                                <div class="row q-col-gutter-xs q-mb-xs" v-for="(opt, idx) in form.options" :key="idx">
                                    <div class="col">
                                        <q-input outlined v-model="form.options[idx]" :label="`Option ${idx + 1}`" />
                                    </div>
                                    <div class="col-auto" v-if="form.options.length > 2">
                                        <q-btn flat round icon="bi-trash" size="sm" color="grey" class="q-mt-md" @click="form.options.splice(idx, 1)" />
                                    </div>
                                </div>
                                <q-btn flat rounded size="sm" color="primary" label="add option" @click="form.options.push('')" class="q-mt-xs" />
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
                                                <q-popup-proxy cover transition-show="scale" transition-hide="scale" class="no-shadow radius-sm">
                                                    <q-date v-model="form.expiresAt" mask="YYYY-MM-DD" :options="futureDateOptions" today-btn class="no-shadow radius-sm custom-border">
                                                        <div class="row items-center justify-end">
                                                            <q-btn label="clear" flat no-caps @click="form.expiresAt = ''" />
                                                            <q-btn label="close" color="primary" flat no-caps v-close-popup />
                                                        </div>
                                                    </q-date>
                                                </q-popup-proxy>
                                            </q-icon>
                                        </template>
                                    </q-input>
                                    <div class="text-caption text-grey q-mt-xs">Past this date the poll auto-closes to new votes.</div>
                                </div>
                            </div>
                            <div class="text-negative text-caption q-mt-sm" v-if="formError">{{ formError }}</div>
                        </div>
                        <div class="pp-create-footer row justify-start">
                            <q-btn no-caps rounded unelevated color="primary" label="create poll" :loading="saving" @click="createPoll" />
                        </div>
                    </div>
                </q-card-section>
            </q-card>
        </q-dialog>

        <!-- Detail / results -->
        <q-dialog v-model="detailDialog" full-height persistent>
            <q-card class="card-create column full-height" style="width: 75%; max-width: 100vw;">
                <q-card-section class="row items-center q-pa-lg pp-detail-header">
                    <div>
                        <div class="pp-eyebrow">public poll &middot; poll detail</div>
                        <div class="text-h5">{{ selected?.question }}</div>
                        <div class="row items-center q-gutter-xs q-mt-xs">
                            <span class="pp-pill" :style="statusPillStyle(selected)">{{ selected?.status === 'open' && selected?.isExpired ? 'expired' : selected?.status }}</span>
                            <span class="text-caption text-grey" v-if="selected?.expiresAt">expires {{ formatDate(selected.expiresAt) }}</span>
                        </div>
                    </div>
                    <q-space />
                    <q-btn
                        v-if="isSupervisor && selected?.status === 'open'" outline no-caps rounded size="sm" color="negative" label="close poll"
                        class="q-mr-sm" :loading="statusLoading" @click="toggleStatus('close')"
                    />
                    <q-btn
                        v-else-if="isSupervisor" outline no-caps rounded size="sm" color="positive" label="reopen poll"
                        class="q-mr-sm" :loading="statusLoading" @click="toggleStatus('reopen')"
                    />
                    <q-btn icon="bi-x-circle" flat round dense v-close-popup />
                </q-card-section>
                <q-card-section class="scroll" style="flex: 1">
                    <div class="row q-col-gutter-md">
                        <div class="col-5">
                            <q-card-section v-if="isSupervisor" class="q-pa-md radius-sm bg-accent">
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
                                    No confident suggestion — the AI couldn't match this poll to any office's mandate.
                                </div>
                                <div class="row items-center q-gutter-xs q-mb-sm">
                                    <q-btn
                                        v-for="o in officeOptions" :key="o.value"
                                        no-caps unelevated rounded size="sm" :label="o.label"
                                        class="pp-chip" :class="selectedOfficeIds.includes(o.value) ? 'pp-chip--active' : ''"
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
                            <q-card-section class="q-pa-md radius-sm bg-accent">
                                <div class="row items-center no-wrap q-mb-md">
                                    <div class="text-caption text-uppercase text-grey">results</div>
                                    <q-space />
                                    <div class="text-caption text-grey text-uppercase">{{ selected?.totalVotes || 0 }} vote(s)</div>
                                </div>
                                <div v-for="o in selected?.options || []" :key="o.id" class="q-mb-md">
                                    <div class="row items-center q-mb-xs">
                                        <div class="text-body2">{{ o.label }}</div>
                                        <q-space />
                                        <div class="text-caption text-grey">{{ o.votes }} ({{ o.percent || 0 }}%)</div>
                                    </div>
                                    <q-linear-progress :value="(o.percent || 0) / 100" color="primary" track-color="grey-3" size="10px" rounded />
                                </div>
                                <div v-if="!selected?.options?.length" class="text-center q-pa-lg">
                                    <q-icon name="bi-exclamation-circle" size="xl" color="grey" />
                                    <div class="text-caption text-grey text-uppercase q-mt-sm">no options</div>
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
// multi-item chart on this page expects), just randomized which color lands where. Multi-item
// charts (donuts, multi-series bar) still pass the whole array — Apex assigns one color per
// slice/series positionally. nextChartColor() hands single-series charts one color each, in
// round-robin order through the shuffled set, so two single-series charts on this page never
// coincidentally land on the same color.
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

/* -------------------- list + filters -------------------- */

const loading = ref(false);
const polls = ref([]);
const scopeLabel = ref('');
const search = ref('');
const statusFilter = ref('all');
// Server-computed, not derivable from the poll list alone — see getAllPolls' `stats`.
const stats = ref({ avgTimeToFirstVoteMinutes: null, voteAuthorMix: [], reopenRate: null });

// Floating "back to top" for the poll rail — same idiom as ComplaintPage.vue's .cp-rail-list.
const railListRef = ref(null);
const showBackToTop = ref(false);
const onRailScroll = (event) => {
    showBackToTop.value = event.target.scrollTop > 400;
};
const scrollRailToTop = () => {
    railListRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
};

// Picks minutes/hours/days by magnitude — same convention as ComplaintPage.vue's
// formatResolutionTime / DiscussionPage.vue's formatLag.
const formatLag = (minutes) => {
    if (minutes == null) return '—';
    if (minutes < 60) return Math.round(minutes) + 'm';
    const hours = minutes / 60;
    if (hours < 24) return (Math.round(hours * 10) / 10) + 'h';
    return (Math.round(hours / 24 * 10) / 10) + 'd';
};

/* -------------------- period / year (Complaint/Feedback/Discussion pattern) -------------------- */

const analyticsPeriod = ref('year'); // 'week' | 'month' | 'year'
const currentYear = new Date().getFullYear();
const analyticsYear = ref(currentYear);
const analyticsRangeLabel = ref('');
const bucketUnitLabel = computed(() => analyticsPeriod.value === 'week' ? 'day' : analyticsPeriod.value === 'month' ? 'week' : 'month');

const filteredPolls = computed(() => {
    const term = search.value.trim().toLowerCase();
    return polls.value.filter(p => {
        if (statusFilter.value !== 'all' && p.status !== statusFilter.value) return false;
        if (!term) return true;
        return (p.question || '').toLowerCase().includes(term);
    });
});

const openCount = computed(() => polls.value.filter(p => p.status === 'open').length);
const closedCount = computed(() => polls.value.filter(p => p.status === 'closed').length);
const expiredCount = computed(() => polls.value.filter(p => p.isExpired).length);
const totalVotesAll = computed(() => polls.value.reduce((sum, p) => sum + (p.totalVotes || 0), 0));
const avgVotes = computed(() => polls.value.length ? (totalVotesAll.value / polls.value.length).toFixed(1) : '0.0');
// Never auto-matched (or manually cleared) to any office — the queue a supervisor works from to
// route it manually, same idea as Complaint's "needs assignment" KPI.
const unassignedCount = computed(() => polls.value.filter(p => !p.offices?.length).length);
const expiringSoonCount = computed(() => polls.value.filter(p => {
    if (p.status !== 'open' || p.isExpired || !p.expiresAt) return false;
    return moment(p.expiresAt).diff(moment(), 'days') <= 7;
}).length);

const statusPillStyle = (p) => {
    if (!p) return {};
    if (p.status === 'open' && p.isExpired) return { background: '#FBF1D9', color: '#9A6B00' };
    if (p.status === 'open') return { background: '#E4F5E9', color: '#1C8A3B' };
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

const officeChartSeries = ref([{ name: 'Polls', data: [] }]);
const officeChartOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true },
    colors: [nextChartColor()],
    xaxis: { categories: [] },
});

// Votes over time — distinct from the "polls opened" volume above, this is the one that actually
// shows whether engagement is picking up or trailing off, independent of how many new polls
// happen to have been opened.
const votesChartSeries = ref([{ name: 'Votes', data: [] }]);
const votesChartOptions = ref({
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    markers: { size: 3 },
    colors: [nextChartColor()],
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v) => Math.round(v) } },
});

const topVotedSeries = ref([{ name: 'Votes', data: [] }]);
const topVotedOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true },
    colors: [nextChartColor()],
    xaxis: { categories: [] },
});

// Adaptive bucketing, same convention as ComplaintController/FeedbackController's server-side
// trend charts — daily across a week, weekly across a month, monthly across a year — but computed
// client-side here since the whole (already period-filtered) poll list is on hand already.
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
    const pollCounts = bucketDefs.map(() => 0);
    const voteCounts = bucketDefs.map(() => 0);
    polls.value.forEach(p => {
        const created = moment(p.createdAt);
        const idx = bucketDefs.findIndex(b => created.isBetween(b.start, b.end, null, '[]'));
        if (idx >= 0) {
            pollCounts[idx]++;
            voteCounts[idx] += (p.totalVotes || 0);
        }
    });
    volumeChartSeries.value = [{ name: 'Opened', data: pollCounts }];
    volumeChartOptions.value = {
        ...volumeChartOptions.value,
        xaxis: { ...volumeChartOptions.value.xaxis, categories: bucketDefs.map(b => b.label) }
    };
    votesChartSeries.value = [{ name: 'Votes', data: voteCounts }];
    votesChartOptions.value = {
        ...votesChartOptions.value,
        xaxis: { ...votesChartOptions.value.xaxis, categories: bucketDefs.map(b => b.label) }
    };

    statusChartSeries.value = [openCount.value, closedCount.value];
    statusChartOptions.value = { ...statusChartOptions.value, labels: ['Open', 'Closed'] };

    const byOffice = {};
    polls.value.forEach(p => {
        (p.offices || []).forEach(o => {
            const label = o.alias || o.name;
            byOffice[label] = (byOffice[label] || 0) + 1;
        });
    });
    const sortedOffices = Object.entries(byOffice).sort((a, b) => b[1] - a[1]).slice(0, 8);
    officeChartSeries.value = [{ name: 'Polls', data: sortedOffices.map(([, count]) => count) }];
    officeChartOptions.value = { ...officeChartOptions.value, xaxis: { ...officeChartOptions.value.xaxis, categories: sortedOffices.map(([label]) => label) } };

    const topVoted = [...polls.value]
        .filter(p => p.totalVotes > 0)
        .sort((a, b) => b.totalVotes - a.totalVotes)
        .slice(0, 8);
    topVotedSeries.value = [{ name: 'Votes', data: topVoted.map(p => p.totalVotes) }];
    topVotedOptions.value = {
        ...topVotedOptions.value,
        xaxis: { ...topVotedOptions.value.xaxis, categories: topVoted.map(p => (p.question || '').length > 28 ? p.question.slice(0, 28) + '…' : p.question) }
    };
};

const loadPolls = async () => {
    loading.value = true;
    try {
        const response = await api.get('/poll', { params: { period: analyticsPeriod.value, year: analyticsYear.value } });
        polls.value = response.data.data || [];
        scopeLabel.value = response.data.scope?.label || '';
        analyticsRangeLabel.value = response.data.range?.label || '';
        stats.value = response.data.stats || { avgTimeToFirstVoteMinutes: null, voteAuthorMix: [], reopenRate: null };
        const authorMix = stats.value.voteAuthorMix || [];
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
    loadPolls();
};

const stepYear = (delta) => {
    const next = analyticsYear.value + delta;
    if (next > currentYear) return;
    analyticsYear.value = next;
    loadPolls();
};

/* -------------------- create -------------------- */

const createDialog = ref(false);
const form = ref({ question: '', options: ['', ''], expiresAt: '' });
const formError = ref('');
const saving = ref(false);

const futureDateOptions = (date) => date >= moment().format('YYYY/MM/DD');

const openCreateDialog = () => {
    form.value = { question: '', options: ['', ''], expiresAt: '' };
    formError.value = '';
    createDialog.value = true;
};

const createPoll = async () => {
    formError.value = '';
    const validOptions = form.value.options.map(o => o.trim()).filter(Boolean);
    if (!form.value.question.trim()) {
        formError.value = 'Question is required.';
        return;
    }
    if (validOptions.length < 2) {
        formError.value = 'At least two options are required.';
        return;
    }
    saving.value = true;
    try {
        await api.post('/poll', {
            question: form.value.question,
            options: validOptions,
            expiresAt: form.value.expiresAt ? moment(form.value.expiresAt, 'YYYY-MM-DD').endOf('day').toISOString() : null
        });
        createDialog.value = false;
        Toast.fire({ icon: 'success', html: '<div class="text-h6 text-bold text-uppercase">success!</div><div class="text-caption">Poll created and routed.</div>' });
        loadPolls();
    } catch (e) {
        formError.value = e.response?.data?.message || 'Unable to create poll.';
    } finally {
        saving.value = false;
    }
};

/* -------------------- detail + office reassignment -------------------- */

const detailDialog = ref(false);
const detailLoading = ref(false);
const selected = ref(null);
const statusLoading = ref(false);

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
        const response = await api.get(`/poll/${selected.value.id}/suggest-office`);
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
        title: names.length ? 'Reassign this poll?' : 'Clear this assignment?',
        html: names.length
            ? `Set the concerned office(s) to <b>${names.join(', ')}</b>?`
            : `Remove every office from this poll, leaving it unassigned?`,
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
        await api.patch(`/poll/${selected.value.id}/office`, { offices });
        Toast.fire({ icon: 'success', html: '<div class="text-h6 text-bold text-uppercase">saved!</div><div class="text-caption">Office assignment updated.</div>' });
        await openDetail(selected.value);
        loadPolls();
    } catch (e) {
        console.error('Error reassigning poll office:', e);
        Toast.fire({ icon: 'error', html: `<div class="text-caption">${e.response?.data?.message || 'Unable to reassign this poll.'}</div>` });
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
        const response = await api.get(`/poll/${row.id}`);
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
            ? 'Close this poll? Citizens will no longer be able to vote.'
            : 'Reopen this poll? Citizens will be able to vote again.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'confirm',
        cancelButtonText: 'cancel',
        reverseButtons: true
    });
    if (!result.isConfirmed) return;

    statusLoading.value = true;
    try {
        await api.post(`/poll/${selected.value.id}/${action}`);
        await openDetail(selected.value);
        loadPolls();
    } catch (e) {
        console.error(e);
        Toast.fire({ icon: 'error', html: `<div class="text-caption">${e.response?.data?.message || 'Unable to update this poll.'}</div>` });
    } finally {
        statusLoading.value = false;
    }
};

onMounted(() => {
    loadPolls();
    if (isSupervisor.value) loadOfficeOptions();
});
</script>

<style scoped>
.pp-shell {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 16px;
    align-items: start;
}
@media (max-width: 1200px) {
    .pp-shell {
        grid-template-columns: 1fr;
    }
}
.pp-main {
    min-width: 0;
}
.pp-header {
    flex-wrap: wrap;
    gap: 8px;
}
.pp-eyebrow {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 2px;
}
.pp-year-group {
    display: inline-flex;
    align-items: center;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px 4px;
    gap: 2px;
}
.pp-year-value {
    min-width: 44px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #16233A;
}
.pp-period-group {
    display: inline-flex;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
}
.pp-period-btn {
    background: transparent;
    color: #4C5C79;
    min-height: 26px;
    padding: 0 12px;
    border-radius: 6px;
}
.pp-period-btn--active {
    background: var(--q-primary);
    color: #FFFFFF;
}
.pp-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
}
.pp-kpi {
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
.pp-kpi-value {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
}
.pp-kpi-label {
    font-size: 11px;
    letter-spacing: .02em;
    text-transform: uppercase;
    margin-top: 4px;
}
.pp-panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
}
.pp-panel {
    min-width: 0;
}
.pp-rail {
    min-width: 0;
}
.pp-rail-card {
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    position: relative;
}
.pp-back-to-top {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 2;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
@media (min-width: 1201px) {
    .pp-rail-card {
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
.pp-rail-head {
    padding: 16px;
    flex-shrink: 0;
}
.pp-search :deep(.q-field__control) {
    border-radius: 100px;
    background: #F6F9FC;
}
.pp-rail-list {
    overflow-y: auto;
    flex: 1;
    min-height: 200px;
}
.pp-list-item {
    padding: 10px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-left: 3px solid transparent;
    cursor: pointer;
}
.pp-list-item:hover {
    background: #F6F9FC;
}
.pp-list-item.sev-good {
    border-left-color: var(--q-positive);
}
.pp-list-item.sev-warn {
    border-left-color: var(--q-warning);
}
.pp-list-item.sev-flat {
    border-left-color: #E0E0E0;
}
.pp-list-empty {
    padding: 32px 16px;
    text-align: center;
    color: #9E9E9E;
}
.pp-pill {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .02em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 100px;
}
.pp-pill--office {
    background: #F6F9FC;
    color: #4C5C79;
}
.pp-chip {
    background: #FFFFFF;
    color: #4C5C79;
    border: 1px solid #DCE4F0;
    min-height: 26px;
    padding: 0 12px;
    font-size: 12px;
}
.pp-chip--active {
    background: var(--q-primary);
    color: #FFFFFF;
    border-color: var(--q-primary);
}
.pp-create-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}
.pp-create-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
}
.pp-create-footer {
    flex: 0 0 auto;
    padding-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    margin-top: 8px;
}
.pp-detail-header {
    flex-wrap: wrap;
    gap: 8px;
}
</style>
