<template>
    <div>
        <div class="fp-shell">
            <div class="fp-main">
                <div class="row items-center justify-between q-mb-md fp-header">
                    <div>
                        <div class="fp-eyebrow">citizen CSM report &middot; operations overview<template v-if="analyticsScopeLabel"> &middot; {{ analyticsScopeLabel }}</template></div>
                        <div class="text-h5">{{ analyticsRangeLabel || ' ' }}</div>
                    </div>
                    <div class="row items-center q-gutter-sm">
                        <div class="fp-year-group">
                            <q-btn flat dense round size="sm" icon="bi-chevron-left" @click="stepYear(-1)">
                                <q-tooltip>Previous year</q-tooltip>
                            </q-btn>
                            <div class="fp-year-value">{{ analyticsYear }}</div>
                            <q-btn flat dense round size="sm" icon="bi-chevron-right" :disable="analyticsYear >= currentYear" @click="stepYear(1)">
                                <q-tooltip>Next year</q-tooltip>
                            </q-btn>
                        </div>
                        <div class="fp-period-group">
                            <q-btn no-caps unelevated size="sm" label="Week" class="fp-period-btn" :class="analyticsPeriod === 'week' ? 'fp-period-btn--active' : ''" @click="setAnalyticsPeriod('week')" />
                            <q-btn no-caps unelevated size="sm" label="Month" class="fp-period-btn" :class="analyticsPeriod === 'month' ? 'fp-period-btn--active' : ''" @click="setAnalyticsPeriod('month')" />
                            <q-btn no-caps unelevated size="sm" label="Year" class="fp-period-btn" :class="analyticsPeriod === 'year' ? 'fp-period-btn--active' : ''" @click="setAnalyticsPeriod('year')" />
                        </div>
                        <q-btn flat dense round size="sm" icon="bi-arrow-clockwise" :loading="analyticsLoading" @click="refreshAll">
                            <q-tooltip>Refresh</q-tooltip>
                        </q-btn>
                    </div>
                </div>

                <!-- Needs attention: where the ratings say something has to be looked at. Across all offices the first two open the
                     same filter on the list of offices on the right; for one office they are about that office. -->
                <div class="ov-title">needs attention</div>
                <div class="ov-attn-grid q-mb-lg">
                    <template v-if="!officeMode">
                        <div
                            class="ov-attn ov-attn--click" :class="[attnTone(lowOffices.length), { 'ov-attn--on': attnFilter === 'low' }]"
                            @click="toggleAttn('low')"
                        >
                            <q-icon name="bi-building-exclamation" size="18px" class="ov-attn-ico" />
                            <div class="ov-attn-value">{{ lowOffices.length }}</div>
                            <div class="ov-attn-label">offices to look at</div>
                            <div class="ov-attn-sub">rated under 70%</div>
                        </div>
                        <div
                            class="ov-attn ov-attn--click" :class="[attnTone(quietOffices.length, 'warn'), { 'ov-attn--on': attnFilter === 'none' }]"
                            @click="toggleAttn('none')"
                        >
                            <q-icon name="bi-megaphone" size="18px" class="ov-attn-ico" />
                            <div class="ov-attn-value">{{ quietOffices.length }}</div>
                            <div class="ov-attn-label">offices not rated</div>
                            <div class="ov-attn-sub">no CSM report this period</div>
                        </div>
                    </template>
                    <div class="ov-attn" :class="attnTone(needsImprovement.count)">
                        <q-icon name="bi-emoji-frown" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ needsImprovement.count }}</div>
                        <div class="ov-attn-label">rated poorly</div>
                        <div class="ov-attn-sub">{{ needsImprovement.pct }}% of all reports</div>
                    </div>
                    <div class="ov-attn" :class="weakest ? 'ov-attn--warn' : 'ov-attn--zero'">
                        <q-icon name="bi-graph-down-arrow" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ weakest ? weakest.dimension : '—' }}</div>
                        <div class="ov-attn-label">weakest service area</div>
                        <div class="ov-attn-sub">{{ weakest ? weakest.name + ' · ' + weakest.avg + ' / 5' : 'nothing rated yet' }}</div>
                    </div>
                    <div v-if="officeMode" class="ov-attn" :class="strongest ? 'ov-attn--info' : 'ov-attn--zero'">
                        <q-icon name="bi-graph-up-arrow" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ strongest ? strongest.dimension : '—' }}</div>
                        <div class="ov-attn-label">strongest service area</div>
                        <div class="ov-attn-sub">{{ strongest ? strongest.name + ' · ' + strongest.avg + ' / 5' : 'nothing rated yet' }}</div>
                    </div>
                    <div class="ov-attn" :class="attnTone(charterGap.count, 'info')">
                        <q-icon name="bi-journal-x" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ charterGap.count }}</div>
                        <div class="ov-attn-label">did not know the charter</div>
                        <div class="ov-attn-sub">and did not see it either</div>
                    </div>
                    <div v-if="officeMode" class="ov-attn" :class="attnTone(charterHidden.count, 'warn')">
                        <q-icon name="bi-eye-slash" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ charterHidden.count }}</div>
                        <div class="ov-attn-label">could not see the charter</div>
                        <div class="ov-attn-sub">difficult or not visible</div>
                    </div>
                </div>

                <!-- How it is going over the period -->
                <div class="ov-title">how it is going</div>
                <div class="ov-kpi-grid q-mb-lg">
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-clipboard-data" size="16px" /> CSM reports</div>
                        <div class="ov-kpi-value">{{ analyticsKpis.totalFeedback ?? 0 }}</div>
                        <div class="ov-kpi-sub">in {{ analyticsRangeLabel || 'the period' }}</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-emoji-smile" size="16px" /> satisfaction</div>
                        <div class="ov-kpi-value">{{ analyticsKpis.avgSatisfaction != null ? analyticsKpis.avgSatisfaction + '%' : '—' }}</div>
                        <div class="ov-kpi-sub">{{ bandLabel(analyticsKpis.avgSatisfaction) }} &middot; target 85% or more</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-journal-check" size="16px" /> charter awareness</div>
                        <div class="ov-kpi-value">{{ analyticsKpis.charterAwareRate != null ? analyticsKpis.charterAwareRate + '%' : '—' }}</div>
                        <div class="ov-kpi-sub">know it or have seen it</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-tv" size="16px" /> from the kiosk</div>
                        <div class="ov-kpi-value">{{ analyticsKpis.kioskCount ?? 0 }}</div>
                        <div class="ov-kpi-sub">{{ entryShare(analyticsKpis.kioskCount) }}% of all reports</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-person-lines-fill" size="16px" /> entered by staff</div>
                        <div class="ov-kpi-value">{{ analyticsKpis.manualCount ?? 0 }}</div>
                        <div class="ov-kpi-sub">{{ entryShare(analyticsKpis.manualCount) }}% of all reports</div>
                    </div>
                </div>

                <!-- What the clients said -->
                <div class="ov-title">what clients said</div>
                <div class="ov-duo q-mb-md">
                    <div class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">how satisfied they were</div>
                            <div class="ov-card-note">of {{ analyticsKpis.totalFeedback ?? 0 }} reports</div>
                        </div>
                        <div v-for="b in ratingBands" :key="b.label" class="ov-step">
                            <div class="ov-step-top">
                                <span class="ov-dot" :style="{ background: b.color }"></span>
                                <span class="ov-step-label">{{ b.label }} <i class="ov-hint">{{ b.range }}</i></span>
                                <span class="ov-step-count">{{ b.count }}</span>
                                <span class="ov-step-pct">{{ b.pct }}%</span>
                            </div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: b.pct + '%', background: b.color }"></div></div>
                        </div>
                        <div class="ov-card-foot">Each report is the average of the nine service ratings, out of 5, shown as a percentage.</div>
                    </div>

                    <div class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">how the reports read</div>
                            <div class="ov-card-note">read by AI when it is recorded</div>
                        </div>
                        <template v-if="sentimentRead">
                            <div v-for="b in sentimentBars" :key="b.label" class="ov-step">
                                <div class="ov-step-top">
                                    <span class="ov-dot" :style="{ background: b.hex }"></span>
                                    <span class="ov-step-label text-capitalize">{{ b.label }}</span>
                                    <span class="ov-step-count">{{ b.count }}</span>
                                    <span class="ov-step-pct">{{ b.pct }}%</span>
                                </div>
                                <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: b.pct + '%', background: b.hex }"></div></div>
                            </div>
                        </template>
                        <div v-else class="ov-empty">no report has been read yet</div>
                        <div class="ov-card-foot">The AI reads the comments together with the satisfaction score: a report with a kind score but a harsh comment reads negative.<template v-if="sentimentMix.unread"> {{ sentimentMix.unread }} not read yet.</template></div>
                    </div>

                    <div class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">service quality</div>
                            <div class="ov-card-note">weakest first</div>
                        </div>
                        <div v-for="d in sqdByNeed" :key="d.dimension" class="ov-step">
                            <div class="ov-step-top">
                                <span class="ov-step-n">{{ d.dimension.replace('SQD', '') }}</span>
                                <span class="ov-step-label">{{ d.name }}</span>
                                <span class="ov-step-count">{{ d.avg != null ? d.avg : '—' }}</span>
                                <span class="ov-step-pct">/ 5</span>
                            </div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: ((d.avg || 0) / 5 * 100) + '%', background: sqdColor(d.avg) }"></div></div>
                        </div>
                        <div v-if="!sqdByNeed.length" class="ov-empty">nothing rated this period</div>
                    </div>
                </div>

                <div class="ov-trio q-mb-lg">
                    <div v-for="m in mixCards" :key="m.key + (m.note || '')" class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">{{ m.title }}</div>
                            <div v-if="m.note" class="ov-card-note">{{ m.note }}</div>
                        </div>
                        <apexchart v-if="m.series.value.some(n => n > 0)" type="donut" height="210" :options="m.options.value" :series="m.series.value" />
                        <div v-else class="ov-empty">no reports</div>
                    </div>
                </div>

                <div class="ov-title">trends</div>
                <div class="fp-panel-grid">
                    <q-card flat class="fp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">CSM reports filed per {{ bucketUnitLabel }}</div>
                        <apexchart type="area" height="220" :options="volumeChartOptions" :series="volumeChartSeries" />
                    </q-card>

                    <q-card flat class="fp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">how satisfied they were per {{ bucketUnitLabel }}</div>
                        <apexchart type="line" height="220" :options="trendChartOptions" :series="trendChartSeries" />
                    </q-card>

                    <q-card flat class="fp-panel custom-border radius-xs q-pa-md fp-panel--full" v-if="!officeMode">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">avg. rating by office</div>
                        <apexchart type="bar" height="240" :options="ratingByOfficeOptions" :series="ratingByOfficeSeries" />
                    </q-card>
                </div>

            </div>

            <div class="fp-rail">
                <q-card flat class="fp-rail-card">
                    <div class="fp-rail-head">
                        <div class="row items-center justify-between no-wrap q-mb-sm">
                            <div class="row items-baseline q-gutter-xs">
                                <div class="text-h6 text-capitalize">{{ locked ? 'CSM reports' : 'offices' }}</div>
                                <div class="text-caption text-grey">{{ locked ? railReports.length + ' of ' + reports.length : filteredOffices.length + ' of ' + offices.length }}</div>
                            </div>
                            <q-btn v-if="canFile" unelevated rounded size="sm" color="primary" label="Add" class="fp-add-btn text-capitalize" @click="presetOfficeId = null; createFeedbackDialog = true">
                                <q-tooltip>File new CSM report</q-tooltip>
                            </q-btn>
                        </div>
                        <!-- supervisors: the offices -->
                        <template v-if="!locked">
                            <q-input outlined dense v-model="officeSearch" placeholder="Search office..." class="fp-search">
                                <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
                            </q-input>
                            <div class="row q-gutter-xs q-mt-sm">
                                <q-btn no-caps unelevated rounded size="sm" label="Under 70%" class="fp-chip" :class="attnFilter === 'low' ? 'fp-chip--active' : ''" @click="toggleAttn('low')" />
                                <q-btn no-caps unelevated rounded size="sm" label="Not rated" class="fp-chip" :class="attnFilter === 'none' ? 'fp-chip--active' : ''" @click="toggleAttn('none')" />
                            </div>
                        </template>
                        <!-- workstation: the reports of their own office -->
                        <div v-else class="row q-gutter-xs">
                            <q-btn v-for="o in REPORT_FILTERS" :key="o.key" no-caps unelevated rounded size="sm" :label="o.label" class="fp-chip" :class="reportFilter === o.key ? 'fp-chip--active' : ''" @click="reportFilter = o.key" />
                        </div>
                    </div>
                    <q-separator />
                    <div class="fp-rail-list" ref="railListRef" @scroll="onRailScroll">
                        <template v-if="!locked">
                            <div
                                v-for="o in filteredOffices" :key="o.id"
                                class="fp-list-item" :class="officeSeverity(o)"
                                @click="openOffice(o)"
                            >
                                <div class="row items-center justify-between no-wrap">
                                    <div class="text-caption text-weight-bold text-uppercase">{{ o.alias }}</div>
                                    <div class="text-caption text-grey">{{ o.totalFeedback }} rating{{ o.totalFeedback === 1 ? '' : 's' }}</div>
                                </div>
                                <div class="text-body2 q-mt-xs">{{ o.name }}</div>
                                <div v-if="Number(o.negativeFeedback) > 0" class="q-mt-xs"><ImpressionBadge value="negative" :label="`${o.negativeFeedback} negative`" why="Reports that read negative in the selected period." /></div>
                                <div class="row items-center q-mt-xs">
                                    <span class="fp-pill" :style="{ background: pillColor(o).bg, color: pillColor(o).text }">
                                        {{ o.averageSqdPercentage != null ? o.averageSqdPercentage.toFixed(1) + '%' : 'no ratings' }}
                                    </span>
                                </div>
                            </div>
                            <div v-if="loadingOffices" class="fp-list-empty">
                                <q-spinner-ios size="1.5em" />
                                <div class="text-caption text-uppercase q-mt-sm">loading offices...</div>
                            </div>
                            <EmptyState
                                v-if="!loadingOffices && filteredOffices.length === 0" rail icon="bi-building" title="No offices found"
                                hint="Try another search."
                            />
                        </template>
                        <template v-else>
                            <div v-for="r in railReports" :key="r.id" class="fp-report-row" :class="reportSeverity(r)" @click="openReport(r.id)">
                                <q-icon :name="r.entryFrom === 'manual' ? 'bi-file-earmark' : 'bi-tv'" :color="r.entryFrom === 'manual' ? 'primary' : 'positive'" size="xs" class="q-mr-sm" />
                                <div class="col">
                                    <div class="text-caption text-weight-bold text-uppercase">{{ formatDate(r.date) }}</div>
                                    <div class="text-caption text-grey">{{ r.entryFrom === 'manual' ? 'entered by staff' : formatTime(r.date) + ' · kiosk' }}</div>
                                </div>
                                <span class="fp-pill" :style="{ background: pillColorFor(r.averageSqdPercentage).bg, color: pillColorFor(r.averageSqdPercentage).text }">{{ r.averageSqdPercentage.toFixed(2) }}%</span>
                                <q-inner-loading :showing="pdfLoadingId === r.id"><q-spinner-ios size="1.2em" /></q-inner-loading>
                            </div>
                            <div v-if="analyticsLoading && !reports.length" class="fp-list-empty">
                                <q-spinner-ios size="1.5em" />
                                <div class="text-caption text-uppercase q-mt-sm">loading reports...</div>
                            </div>
                            <EmptyState
                                v-else-if="!railReports.length" rail icon="bi-clipboard-data"
                                :title="reports.length ? 'No CSM reports match' : 'No CSM reports this period'"
                                :hint="reports.length ? 'Try another filter.' : 'Reports filed in this period show up here.'"
                            />
                        </template>
                    </div>
                    <q-btn
                        v-if="showBackToTop"
                        round unelevated color="primary" icon="bi-arrow-up" size="sm"
                        class="fp-back-to-top" @click="scrollRailToTop"
                    >
                        <q-tooltip>Back to top</q-tooltip>
                    </q-btn>
                </q-card>
            </div>
        </div>

        <FeedbackOfficeComponent v-model="officeDialog" @file="fileForOffice" />

        <PdfPreviewDialog v-model="reportDialog" :src="pdfFile" caption="citizen CSM report" title="CSM report" />

        <CreateFeedbackComponent v-model="createFeedbackDialog" :preset-office-id="presetOfficeId" @created="onFeedbackCreated" />
    </div>
</template>

<script setup>
import ImpressionBadge from 'src/components/ImpressionBadge.vue';
import EmptyState from 'src/components/EmptyState.vue';
import { ref, onMounted, computed } from 'vue';
import moment from 'moment';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth-store';
import FeedbackOfficeComponent from '../components/FeedbackOfficeComponent.vue';
import { useFeedbackStore } from '../stores/feedback-store';
import CreateFeedbackComponent from '../components/CreateFeedbackComponent.vue';
import PdfPreviewDialog from '../components/PdfPreviewDialog.vue';
import Apexchart from 'vue3-apexcharts';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';

const AuthStore = useAuthStore();
const FeedbackStore = useFeedbackStore();

// Only a super/admin files a CSM report (the server enforces it too). A workstation account is "locked" to its own
// office (the server says so in the analytics scope): its overview is that office's data and its list is that
// office's reports, which it can read but not file.
const canFile = computed(() => ['super', 'admin'].includes(AuthStore.user?.role));

/* -------------------- offices (supervisors) -------------------- */

const offices = ref([]);
const loadingOffices = ref(false);
const officeSearch = ref('');

// Floating "back to top" for the rail — same idiom as ComplaintPage.vue's .cp-rail-list.
const railListRef = ref(null);
const showBackToTop = ref(false);
const onRailScroll = (event) => {
    showBackToTop.value = event.target.scrollTop > 400;
};
const scrollRailToTop = () => {
    railListRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
};

// "needs attention" tiles double as filters of the office list: rated under 70%, or with nothing to rate yet
const attnFilter = ref(null);
const toggleAttn = (key) => {
    attnFilter.value = attnFilter.value === key ? null : key;
};
const lowOffices = computed(() => offices.value.filter(o => o.averageSqdPercentage != null && o.averageSqdPercentage < 70));
const quietOffices = computed(() => offices.value.filter(o => o.averageSqdPercentage == null));
const attnTone = (n, tone = 'bad') => (n > 0 ? 'ov-attn--' + tone : 'ov-attn--zero');

const filteredOffices = computed(() => {
    const term = officeSearch.value.trim().toLowerCase();
    let list = offices.value;
    if (attnFilter.value === 'low') list = lowOffices.value;
    if (attnFilter.value === 'none') list = quietOffices.value;
    if (!term) return list;
    return list.filter(o =>
        (o.alias || '').toLowerCase().includes(term) || (o.name || '').toLowerCase().includes(term)
    );
});

const loadOffices = async ({ quiet = false } = {}) => {
    if (!quiet) loadingOffices.value = true;
    try {
        const { data } = await api.get('/feedback', { params: { period: analyticsPeriod.value, year: analyticsYear.value } });
        offices.value = data.data || [];
    } catch (error) {
        console.error('Error loading offices:', error);
    } finally {
        loadingOffices.value = false;
    }
};

// Same 4-state severity language as the complaint rail: green/amber/red by rating threshold,
// grey for an office with nothing to rate yet this period.
const severityOf = (pct) => {
    if (pct == null) return 'sev-flat';
    if (pct >= 85) return 'sev-good';
    if (pct >= 70) return 'sev-warn';
    return 'sev-bad';
};
const PILL = {
    'sev-good': { bg: '#E4F5E9', text: '#1C8A3B' },
    'sev-warn': { bg: '#FBF1D9', text: '#9A6B00' },
    'sev-bad': { bg: '#FBE6E8', text: '#B3121F' },
    'sev-flat': { bg: '#F6F9FC', text: '#8493AC' },
};
const officeSeverity = (o) => severityOf(o.averageSqdPercentage);
const pillColor = (o) => PILL[officeSeverity(o)];
const pillColorFor = (pct) => PILL[severityOf(pct)];

// Picking an office opens its own data and report list in a dialog; the overview stays city-wide.
const officeDialog = ref(false);
// filing a CSM report from an office's own dialog starts with that office chosen
const presetOfficeId = ref(null);
const fileForOffice = (officeId) => {
    presetOfficeId.value = Number(officeId) || null;
    officeDialog.value = false;
    createFeedbackDialog.value = true;
};
const openOffice = (o) => {
    FeedbackStore.details = o;
    // the dialog has no year control of its own: it shows the year selected on this page
    FeedbackStore.year = analyticsYear.value;
    officeDialog.value = true;
};

/* -------------------- the reports of one office -------------------- */

const reports = ref([]);
const REPORT_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'kiosk', label: 'Kiosk' },
    { key: 'manual', label: 'By staff' },
    { key: 'low', label: 'Under 70%' },
];
const reportFilter = ref('all');
const railReports = computed(() => reports.value.filter(r => {
    if (reportFilter.value === 'kiosk') return r.entryFrom !== 'manual';
    if (reportFilter.value === 'manual') return r.entryFrom === 'manual';
    if (reportFilter.value === 'low') return r.averageSqdPercentage < 70;
    return true;
}));
const reportSeverity = (r) => severityOf(r.averageSqdPercentage);
const formatDate = (timestamp) => moment(timestamp).format('MMM DD, YYYY');
const formatTime = (timestamp) => moment(timestamp).format('h:mm A');

const reportDialog = ref(false);
const pdfFile = ref(null);
const pdfLoadingId = ref(null);
const openReport = async (id) => {
    pdfLoadingId.value = id;
    try {
        const res = await api.get(`/feedback/pdf/rating/${id}`, { responseType: 'arraybuffer' });
        const blob = new Blob([res.data], { type: 'application/pdf' });
        pdfFile.value = window.URL.createObjectURL(blob) + '#view=FitW';
        reportDialog.value = true;
    } catch (error) {
        console.error('Error generating PDF:', error);
    } finally {
        pdfLoadingId.value = null;
    }
};

/* -------------------- create feedback -------------------- */

const createFeedbackDialog = ref(false);
const onFeedbackCreated = () => {
    createFeedbackDialog.value = false;
    refreshAll();
};

/* -------------------- analytics (the overview) -------------------- */

const analyticsLoading = ref(false);
const analyticsPeriod = ref('year');
// Which year the dashboard looks at — defaults to the real current year; stepping back lets you
// browse a past year's data (see resolvePeriodRange on the backend for how this interacts with
// the week/month/year period buttons).
const currentYear = new Date().getFullYear();
const analyticsYear = ref(currentYear);
const analyticsRangeLabel = ref('');
const analyticsScopeLabel = ref('');
const locked = ref(false);
// a workstation account looks at its own office (what the supervisors see per office in the dialog)
const officeMode = computed(() => locked.value);
// Matches the trend-bucketing convention in FeedbackController: week -> daily buckets, month -> weekly, year ->
// monthly. Drives the chart titles so they reflect what's plotted.
const bucketUnitLabel = computed(() => analyticsPeriod.value === 'week' ? 'day' : analyticsPeriod.value === 'month' ? 'week' : 'month');
const analyticsKpis = ref({ totalFeedback: 0, avgSatisfaction: null, kioskCount: 0, manualCount: 0, charterAwareRate: null });
// how the reports of the period read (positive / neutral / negative / not read yet)
const sentimentMix = ref({ positive: 0, neutral: 0, negative: 0, unread: 0 });
const sentimentRead = computed(() => sentimentMix.value.positive + sentimentMix.value.neutral + sentimentMix.value.negative > 0);
const sentimentBars = computed(() => {
    const m = sentimentMix.value;
    const total = m.positive + m.neutral + m.negative;
    return [
        { label: 'positive', count: m.positive, hex: '#21BA45' },
        { label: 'neutral', count: m.neutral, hex: '#FFC900' },
        { label: 'negative', count: m.negative, hex: '#C10015' },
    ].map(b => ({ ...b, pct: total ? Math.round((b.count / total) * 100) : 0 }));
});

const volumeChartSeries = ref([{ name: 'CSM Report', data: [] }]);
const volumeChartOptions = ref({
    chart: { type: 'area', toolbar: { show: false }, animations: { speed: 300 } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: ['#204888'],
    grid: { strokeDashArray: 4 },
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v) => Math.round(v) } },
});

const trendChartSeries = ref([{ name: 'Avg. satisfaction', data: [] }]);
const trendChartOptions = ref({
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    markers: { size: 3 },
    colors: ['#FFC900'],
    grid: { strokeDashArray: 4 },
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    yaxis: { max: 100, labels: { formatter: (v) => Math.round(v) + '%' } },
});

const ratingByOfficeSeries = ref([{ name: 'Avg. rating', data: [] }]);
const ratingByOfficeOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true, formatter: (v) => v + '%' },
    colors: ['#204888'],
    xaxis: { categories: [], max: 100 },
});

// one look for every "who answered" ring: brand blue first, then yellow and the lighter blues
const DONUT_COLORS = ['#204888', '#FFC900', '#68AFF1', '#B8C2D4', '#3E6BB5', '#9A6B00'];
const donutOptions = () => ({
    chart: { type: 'donut' },
    labels: [],
    colors: DONUT_COLORS,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    stroke: { width: 2 },
    plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Reports', fontSize: '12px' } } } } },
});
const makeMix = (key, title, note) => ({ key, title, note, series: ref([]), options: ref(donutOptions()) });
const mixCards = [
    makeMix('clientType', 'type of client'),
    makeMix('sex', 'sex'),
    makeMix('age', 'age'),
    makeMix('entry', 'how they answered'),
    makeMix('cc1', 'the citizen\'s charter', 'awareness'),
    makeMix('cc2', 'the citizen\'s charter', 'visibility'),
    makeMix('cc3', 'the citizen\'s charter', 'usefulness'),
];
const setMix = (key, rows) => {
    const card = mixCards.find(m => m.key === key);
    const list = rows || [];
    card.series.value = list.map(r => r.count);
    card.options.value = { ...card.options.value, labels: list.map(r => r.label) };
};

// ---- what clients said, in plain rows
const SQD_NAMES = {
    SQD0: 'Satisfied with the service', SQD1: 'Reasonable time', SQD2: 'Followed the steps and requirements',
    SQD3: 'Easy, simple steps', SQD4: 'Easy to find information', SQD5: 'Reasonable fees',
    SQD6: 'Fair to everyone', SQD7: 'Courteous, helpful staff', SQD8: 'Got what was needed',
};
const sqdRows = ref([]);
const sqdByNeed = computed(() => [...sqdRows.value]
    .map(r => ({ ...r, name: SQD_NAMES[r.dimension] || r.dimension }))
    .sort((x, y) => (x.avg ?? 9) - (y.avg ?? 9)));
const rated = computed(() => sqdByNeed.value.filter(r => r.avg != null && r.avg > 0));
const weakest = computed(() => rated.value[0] || null);
const strongest = computed(() => rated.value[rated.value.length - 1] || null);
const sqdColor = (avg) => (avg == null ? '#B8C2D4' : avg >= 4.25 ? '#21BA45' : avg >= 3.5 ? '#68AFF1' : avg >= 3 ? '#FFC900' : '#C10015');

const BAND_STYLE = {
    'Excellent': { color: '#1C8A3B', range: '95% and above' },
    'Good': { color: '#4CAF7D', range: '85 to 94%' },
    'Fair': { color: '#FFC900', range: '70 to 84%' },
    'Needs improvement': { color: '#C10015', range: 'under 70%' },
};
const ratingBandsRaw = ref([]);
const ratingBands = computed(() => {
    const total = ratingBandsRaw.value.reduce((n, r) => n + (r.count || 0), 0);
    return Object.keys(BAND_STYLE).map(label => {
        const count = ratingBandsRaw.value.find(r => r.label === label)?.count || 0;
        return { label, count, pct: total ? Math.round((count / total) * 100) : 0, ...BAND_STYLE[label] };
    });
});
const needsImprovement = computed(() => ratingBands.value.find(b => b.label === 'Needs improvement') || { count: 0, pct: 0 });
const bandLabel = (v) => (v == null ? 'nothing rated yet' : v >= 95 ? 'excellent' : v >= 85 ? 'good' : v >= 70 ? 'fair' : 'needs improvement');
const entryShare = (n) => (analyticsKpis.value.totalFeedback ? Math.round(((n || 0) / analyticsKpis.value.totalFeedback) * 100) : 0);
const cc1Raw = ref([]);
const cc2Raw = ref([]);
const charterGap = computed(() => ({ count: cc1Raw.value.find(c => /didn.t know/i.test(c.label))?.count || 0 }));
const charterHidden = computed(() => ({ count: cc2Raw.value.filter(c => /difficult|not visible/i.test(c.label)).reduce((n, c) => n + c.count, 0) }));

const applyAnalytics = (d) => {
    sqdRows.value = d.sqdAverages || [];
    ratingBandsRaw.value = d.ratingDistribution || [];
    sentimentMix.value = d.sentimentMix || { positive: 0, neutral: 0, negative: 0, unread: 0 };
    cc1Raw.value = d.cc1Mix || [];
    cc2Raw.value = d.cc2Mix || [];
    reports.value = d.reports || [];

    const volume = d.volumeTrend || [];
    volumeChartSeries.value = [{ name: 'CSM Report', data: volume.map(w => w.count) }];
    volumeChartOptions.value = { ...volumeChartOptions.value, xaxis: { ...volumeChartOptions.value.xaxis, categories: volume.map(w => w.label) } };

    const trend = d.satisfactionTrend || [];
    trendChartSeries.value = [{ name: 'Avg. satisfaction', data: trend.map(t => t.avgPercentage) }];
    trendChartOptions.value = { ...trendChartOptions.value, xaxis: { ...trendChartOptions.value.xaxis, categories: trend.map(t => t.label) } };

    const byOffice = d.ratingByOffice || [];
    ratingByOfficeSeries.value = [{ name: 'Avg. rating', data: byOffice.map(o => o.avgRating) }];
    ratingByOfficeOptions.value = { ...ratingByOfficeOptions.value, xaxis: { ...ratingByOfficeOptions.value.xaxis, categories: byOffice.map(o => o.label) } };

    setMix('clientType', d.clientTypeMix);
    setMix('sex', d.sexMix);
    setMix('age', d.ageMix);
    setMix('entry', d.entryMethodMix);
    setMix('cc1', d.cc1Mix);
    setMix('cc2', d.cc2Mix);
    setMix('cc3', d.cc3Mix);
};

const loadAnalytics = async ({ quiet = false } = {}) => {
    if (!quiet) analyticsLoading.value = true;
    try {
        const { data } = await api.get('/feedback/analytics', {
            params: { period: analyticsPeriod.value, year: analyticsYear.value }
        });
        analyticsKpis.value = data.data.kpis || {};
        analyticsRangeLabel.value = data.data.range?.label || '';
        analyticsScopeLabel.value = data.data.scope?.label || '';
        locked.value = !!data.data.scope?.locked;
        applyAnalytics(data.data);
    } catch (error) {
        console.error('Error loading feedback analytics:', error);
    } finally {
        analyticsLoading.value = false;
    }
};

const refreshAll = (opts = {}) => {
    const quiet = opts?.quiet === true;
    loadAnalytics({ quiet });
    if (!locked.value) loadOffices({ quiet });
};

// a CSM report filed anywhere (a kiosk, another staff member) shows here without pressing refresh
useLiveRefresh(['feedback'], () => refreshAll({ quiet: true }));

const setAnalyticsPeriod = (period) => {
    if (analyticsPeriod.value === period) return;
    analyticsPeriod.value = period;
    refreshAll();
};

const stepYear = (delta) => {
    const next = analyticsYear.value + delta;
    if (next > currentYear) return;
    analyticsYear.value = next;
    refreshAll();
};

onMounted(async () => {
    // the analytics answer says whether this account is tied to one office, which decides the list on the right
    await loadAnalytics();
    if (!locked.value) loadOffices();
});
</script>

<style scoped>
.fp-shell {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 16px;
    align-items: start;
}
@media (max-width: 1200px) {
    .fp-shell {
        grid-template-columns: 1fr;
    }
}
.fp-main {
    min-width: 0;
}
.fp-header {
    flex-wrap: wrap;
    gap: 8px;
}
.fp-eyebrow {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 2px;
}
.fp-year-group {
    display: inline-flex;
    align-items: center;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px 4px;
    gap: 2px;
}
.fp-year-value {
    min-width: 44px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #16233A;
}
.fp-period-group {
    display: inline-flex;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
}
.fp-period-btn {
    background: transparent;
    color: #4C5C79;
    min-height: 26px;
    padding: 0 12px;
    border-radius: 6px;
}
.fp-period-btn--active {
    background: var(--q-primary);
    color: #FFFFFF;
}
.fp-chip {
    background: #FFFFFF;
    color: #4C5C79;
    border: 1px solid #DCE4F0;
    min-height: 26px;
    padding: 0 12px;
    font-size: 12px;
}
.fp-chip--active {
    background: var(--q-primary);
    color: #FFFFFF;
    border-color: var(--q-primary);
}
.fp-panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
}
.fp-panel {
    min-width: 0;
}
.fp-panel--full {
    grid-column: 1 / -1;
}
.fp-rail {
    min-width: 0;
}
.fp-rail-card {
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    position: relative;
}
.fp-back-to-top {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 2;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
@media (min-width: 1201px) {
    .fp-rail-card {
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
.fp-rail-head {
    padding: 16px;
    flex-shrink: 0;
}
.fp-search :deep(.q-field__control) {
    border-radius: 100px;
    background: #F6F9FC;
}
.fp-rail-list {
    overflow-y: auto;
    flex: 1;
    min-height: 200px;
}
.fp-list-item {
    padding: 10px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-left: 3px solid transparent;
    cursor: pointer;
}
.fp-list-item:hover {
    background: #F6F9FC;
}
.fp-list-item.sev-bad, .fp-report-row.sev-bad {
    border-left-color: var(--q-negative);
}
.fp-list-item.sev-warn, .fp-report-row.sev-warn {
    border-left-color: var(--q-warning);
}
.fp-list-item.sev-good, .fp-report-row.sev-good {
    border-left-color: var(--q-positive);
}
.fp-list-item.sev-flat, .fp-report-row.sev-flat {
    border-left-color: #E0E0E0;
}
.fp-list-empty {
    padding: 32px 16px;
    text-align: center;
    color: #9E9E9E;
}
.fp-pill {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .02em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 100px;
}
/* one report: its date, how it came in, and what it scored */
.fp-report-row {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-left: 3px solid transparent;
    cursor: pointer;
    position: relative;
    background: #fff;
}
.fp-report-row:hover { background: #F6F9FC; }
.fp-report-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    column-gap: 1px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 0 0 12px 12px;
    overflow: hidden;
}
</style>
