<template>
    <div>
        <div class="hp-shell">
        <div class="hp-main">
        <!-- Hero / welcome -->
        <q-card flat class="hp-hero radius-sm q-pa-lg q-mb-lg">
            <div class="row items-center q-gutter-lg no-wrap">
                <q-avatar size="64px" class="hp-avatar">
                    <img :src="avatarUrl" @error="onAvatarError">
                    <q-icon v-if="avatarFailed" name="bi-person-fill" size="32px" color="white" />
                </q-avatar>
                <div class="col">
                    <div class="hp-eyebrow">{{ greeting }} &middot; {{ todayLabel }}</div>
                    <div class="text-h5 text-white">{{ fullName }}</div>
                    <div class="text-caption hp-subtext">
                        {{ roleLabel }}<template v-if="officeLabel"> &middot; {{ officeLabel }}</template>
                    </div>
                </div>
                <q-space />
                <!--
                    Notifications/Messages already live as icon buttons at the bottom of the
                    sidebar (MainLayout.vue) — no need to duplicate that navigation here too, so
                    this corner is free for something Home-specific instead: current weather for
                    the viewer's OWN current location (geolocation, with San Fernando City as the
                    fallback), since a lot of what this dashboard tracks (kiosk footfall, field
                    complaints) is weather-sensitive.
                -->
                <div class="hp-weather">
                    <template v-if="weatherLoading">
                        <q-spinner color="white" size="20px" />
                    </template>
                    <template v-else-if="weather">
                        <q-icon :name="weather.icon" size="28px" color="white" />
                        <div>
                            <div class="hp-weather-temp">{{ weather.tempC }}&deg;C</div>
                            <div class="hp-weather-label">{{ weather.label }}</div>
                        </div>
                    </template>
                    <div class="hp-weather-city">
                        <q-icon name="bi-geo-alt-fill"/>
                        {{ weatherCity }}
                    </div>
                </div>
            </div>
        </q-card>

        <!-- The period of everything below -->
        <div class="row items-center justify-between q-mb-md hp-controls">
            <div>
                <div class="hp-eyebrow-dark">system overview<template v-if="overviewScopeLabel"> &middot; {{ overviewScopeLabel }}</template></div>
                <div class="text-h5">{{ overviewRangeLabel || ' ' }}</div>
            </div>
            <div class="row items-center q-gutter-sm">
                <q-btn
                    v-if="isSupervisor"
                    no-caps unelevated rounded size="sm" color="primary" icon="bi-stars" label="Analyze Data"
                    class="hp-analyze-btn" @click="analysisModalOpen = true"
                >
                    <q-tooltip>AI recommendations for the city and each office, for the selected year and period</q-tooltip>
                </q-btn>
                <div class="hp-year-group">
                    <q-btn flat dense round size="sm" icon="bi-chevron-left" @click="stepYear(-1)">
                        <q-tooltip>Previous year</q-tooltip>
                    </q-btn>
                    <div class="hp-year-value">{{ overviewYear }}</div>
                    <q-btn flat dense round size="sm" icon="bi-chevron-right" :disable="overviewYear >= currentYear" @click="stepYear(1)">
                        <q-tooltip>Next year</q-tooltip>
                    </q-btn>
                </div>
                <div class="hp-period-group">
                    <q-btn no-caps unelevated size="sm" label="Week" class="hp-period-btn" :class="overviewPeriod === 'week' ? 'hp-period-btn--active' : ''" @click="setOverviewPeriod('week')" />
                    <q-btn no-caps unelevated size="sm" label="Month" class="hp-period-btn" :class="overviewPeriod === 'month' ? 'hp-period-btn--active' : ''" @click="setOverviewPeriod('month')" />
                    <q-btn no-caps unelevated size="sm" label="Year" class="hp-period-btn" :class="overviewPeriod === 'year' ? 'hp-period-btn--active' : ''" @click="setOverviewPeriod('year')" />
                </div>
                <q-btn flat dense round size="sm" icon="bi-arrow-clockwise" :loading="overviewLoading" @click="loadOverview">
                    <q-tooltip>Refresh</q-tooltip>
                </q-btn>
            </div>
        </div>

        <!-- Needs your attention: what is waiting on someone, from every module. Each tile opens its module. -->
        <div class="ov-title">needs your attention</div>
        <div class="ov-attn-grid ov-cols-4 q-mb-lg">
            <div v-for="t in attnTiles" :key="t.key" class="ov-attn ov-attn--click" :class="attnTone(t.count, t.tone)" @click="router.push({ name: t.route })">
                <q-icon :name="t.icon" size="18px" class="ov-attn-ico" />
                <div class="ov-attn-value">{{ t.count }}</div>
                <div class="ov-attn-label">{{ t.label }}</div>
                <div class="ov-attn-sub">{{ t.sub }}</div>
            </div>
        </div>

        <!-- How it is going, across the modules -->
        <div class="ov-title">how it is going</div>
        <div class="ov-kpi-grid ov-cols-4 q-mb-lg">
            <div class="ov-kpi">
                <div class="ov-kpi-head"><q-icon name="bi-emoji-smile" size="16px" /> citizen satisfaction</div>
                <div class="ov-kpi-value">{{ overallSatisfactionLabel }}</div>
                <div class="ov-kpi-sub">feedback and CSM, blended</div>
            </div>
            <div class="ov-kpi">
                <div class="ov-kpi-head"><q-icon name="bi-chat-quote" size="16px" /> feedback filed</div>
                <div class="ov-kpi-value">{{ complaintData.kpis.totalComplaints ?? 0 }}</div>
                <div class="ov-kpi-sub">{{ completedShare }}% completed</div>
            </div>
            <div class="ov-kpi">
                <div class="ov-kpi-head"><q-icon name="bi-envelope-check" size="16px" /> time to acknowledge</div>
                <div class="ov-kpi-value">{{ formatSpan(complaintData.kpis.avgAcknowledgementDays) }}</div>
                <div class="ov-kpi-sub">target: within 1 day</div>
            </div>
            <div class="ov-kpi">
                <div class="ov-kpi-head"><q-icon name="bi-check2-circle" size="16px" /> time to resolve</div>
                <div class="ov-kpi-value">{{ formatSpan(complaintData.kpis.avgResolutionDays) }}</div>
                <div class="ov-kpi-sub">target: within 3 days</div>
            </div>
            <div class="ov-kpi">
                <div class="ov-kpi-head"><q-icon name="bi-clipboard-data" size="16px" /> CSM reports</div>
                <div class="ov-kpi-value">{{ feedbackData.kpis.totalFeedback ?? 0 }}</div>
                <div class="ov-kpi-sub">{{ feedbackData.kpis.avgSatisfaction != null ? feedbackData.kpis.avgSatisfaction + '% satisfied' : 'not rated yet' }}</div>
            </div>
            <div class="ov-kpi">
                <div class="ov-kpi-head"><q-icon name="bi-people" size="16px" /> citizen touchpoints</div>
                <div class="ov-kpi-value">{{ totalTouchpoints }}</div>
                <div class="ov-kpi-sub">filings, reports, comments, answers</div>
            </div>
            <div class="ov-kpi">
                <div class="ov-kpi-head"><q-icon name="bi-person-check" size="16px" /> time to approve</div>
                <div class="ov-kpi-value">{{ approvalLagLabel }}</div>
                <div class="ov-kpi-sub">offices done &rarr; completed</div>
            </div>
        </div>

        <!-- One card for each module, with what it holds this period and the way in -->
        <div class="ov-title">the modules</div>
        <div class="hp-mod-grid q-mb-lg">
            <div v-for="m in moduleCards" :key="m.route" class="hp-mod" :class="'hp-mod--' + m.key" @click="router.push({ name: m.route })">
                <div class="hp-mod-top">
                    <span class="hp-mod-ico"><q-icon :name="m.icon" size="20px" /></span>
                    <div class="col" style="min-width: 0;">
                        <div class="hp-mod-title">{{ m.title }}</div>
                        <div class="hp-mod-desc">{{ m.description }}</div>
                    </div>
                    <q-badge v-if="m.badge > 0" color="negative" rounded>{{ m.badge }}</q-badge>
                </div>
                <div class="hp-mod-stats">
                    <div v-for="x in m.stats" :key="x.label"><b>{{ x.value }}</b><span>{{ x.label }}</span></div>
                </div>
                <div class="hp-mod-go">open <q-icon name="bi-arrow-right" size="14px" /></div>
            </div>
        </div>

        <!-- The feedback process: how far the feedback got, and whether the deadlines held -->
        <div class="ov-title">how feedback was handled</div>
        <div class="ov-duo q-mb-md">
            <div class="ov-card">
                <div class="ov-card-head">
                    <div class="ov-card-title">where the feedback got to</div>
                    <div class="ov-card-note">of {{ pipeline.filed }} filed</div>
                </div>
                <div v-for="(st, i) in pipelineSteps" :key="st.key" class="ov-step">
                    <div class="ov-step-top">
                        <span class="ov-step-n">{{ i + 1 }}</span>
                        <span class="ov-step-label">{{ st.label }}</span>
                        <span class="ov-step-count">{{ st.count }}</span>
                        <span class="ov-step-pct">{{ st.pct }}%</span>
                    </div>
                    <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: st.pct + '%', background: st.color }"></div></div>
                </div>
                <div class="ov-card-foot">Filed, routed to an office, acknowledged, the office marks its part done, a supervisor completes it.</div>
            </div>

            <div class="ov-card">
                <div class="ov-card-head">
                    <div class="ov-card-title">deadlines</div>
                    <div class="ov-card-note">1 day to acknowledge &middot; 3 days to resolve</div>
                </div>
                <div v-for="m in deadlineMeters" :key="m.label" class="ov-meter-row">
                    <div class="ov-meter-top"><span>{{ m.label }}</span><b>{{ m.value != null ? m.value + '%' : '—' }}</b></div>
                    <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: (m.value || 0) + '%', background: m.color }"></div></div>
                    <div v-if="m.sub" class="ov-meter-sub">{{ m.sub }}</div>
                </div>
            </div>
        </div>

        <div class="ov-trio q-mb-lg">
            <div class="ov-card">
                <div class="ov-card-head">
                    <div class="ov-card-title">feedback by status</div>
                    <div class="ov-card-note">{{ statusBreakdownTotal }} feedback</div>
                </div>
                <div v-for="s in statusBreakdownRows" :key="s.status" class="ov-step">
                    <div class="ov-step-top">
                        <span class="ov-step-label text-capitalize">{{ s.status }}</span>
                        <span class="ov-step-count">{{ s.count }}</span>
                        <span class="ov-step-pct">{{ s.percent }}%</span>
                    </div>
                    <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: (s.percent || 0) + '%', background: '#204888' }"></div></div>
                </div>
                <div v-if="!statusBreakdownRows.length" class="ov-empty">no feedback in this period</div>
            </div>

            <div class="ov-card">
                <div class="ov-card-head"><div class="ov-card-title">how it was filed</div><div class="ov-card-note">{{ pipeline.filed }} in total</div></div>
                <apexchart v-if="filedHowSeries.some(n => n > 0)" type="donut" height="210" :options="filedHowOptions" :series="filedHowSeries" />
                <div v-else class="ov-empty">nothing filed in this period</div>
            </div>

            <div class="ov-card">
                <div class="ov-card-head"><div class="ov-card-title">where the touchpoints are</div><div class="ov-card-note">this period</div></div>
                <apexchart v-if="shareChartSeries.some(n => n > 0)" type="donut" height="210" :options="shareChartOptions" :series="shareChartSeries" />
                <div v-else class="ov-empty">no activity yet</div>
            </div>

            <div class="ov-card">
                <div class="ov-card-head"><div class="ov-card-title">how citizens feel</div><div class="ov-card-note">read by AI</div></div>
                <div v-for="g in feelGroups" :key="g.label" class="hp-feel">
                    <div class="ov-step-top"><span class="ov-step-label">{{ g.label }}</span><span class="ov-step-count">{{ g.total }}</span></div>
                    <div v-if="g.total" class="hp-feel-bar">
                        <span v-for="b in g.parts" :key="b.label" :style="{ width: b.pct + '%', background: b.hex }"><q-tooltip>{{ b.count }} {{ b.label }} ({{ b.pct }}%)</q-tooltip></span>
                    </div>
                    <div v-else class="ov-empty">none read yet</div>
                    <div v-if="g.total" class="hp-feel-legend">
                        <span v-for="b in g.parts" :key="b.label"><i :style="{ background: b.hex }"></i>{{ b.count }} {{ b.label }}</span>
                    </div>
                </div>
                <div class="ov-card-foot">Feedback is read when it is filed; a CSM report is read with its comments and score.</div>
            </div>
        </div>

        <!-- Trends -->
        <div class="ov-title">trends</div>
        <div class="hp-panel-grid q-mb-lg">
            <div class="ov-card">
                <div class="ov-card-head"><div class="ov-card-title">filed per {{ bucketUnitLabel }}</div><div class="ov-card-note">by module</div></div>
                <apexchart type="area" height="240" :options="filingsChartOptions" :series="filingsChartSeries" />
            </div>
            <div class="ov-card">
                <div class="ov-card-head"><div class="ov-card-title">engagement per {{ bucketUnitLabel }}</div><div class="ov-card-note">comments and survey responses</div></div>
                <apexchart type="line" height="240" :options="engagementChartOptions" :series="engagementChartSeries" />
            </div>
            <div class="ov-card">
                <div class="ov-card-head"><div class="ov-card-title">satisfaction</div><div class="ov-card-note">feedback vs. CSM report</div></div>
                <apexchart type="bar" height="200" :options="satisfactionChartOptions" :series="satisfactionChartSeries" />
            </div>
        </div>

        <!-- The citizen base: super/admin/monitoring only (system-wide, not office-scoped) -->
        <template v-if="canViewAll">
            <div class="ov-title">the citizen base</div>
            <div class="ov-attn-grid q-mb-lg">
                <div class="ov-attn ov-attn--info"><div class="ov-attn-value">{{ clientData.totalRegistered ?? 0 }}</div><div class="ov-attn-label">registered citizens</div><div class="ov-attn-sub">all accounts</div></div>
                <div class="ov-attn ov-attn--info"><div class="ov-attn-value">{{ clientData.newRegistrations ?? 0 }}</div><div class="ov-attn-label">new this period</div><div class="ov-attn-sub">signed up</div></div>
                <div class="ov-attn" :class="clientData.verifiedRate != null && clientData.verifiedRate < 60 ? 'ov-attn--bad' : 'ov-attn--info'">
                    <div class="ov-attn-value">{{ clientData.verifiedRate != null ? clientData.verifiedRate + '%' : '—' }}</div>
                    <div class="ov-attn-label">email-verified</div>
                    <div class="ov-attn-sub">completed verification</div>
                </div>
                <div class="ov-attn ov-attn--info"><div class="ov-attn-value">{{ clientData.avgVerifyMinutes != null ? formatVerifyTime(clientData.avgVerifyMinutes) : '—' }}</div><div class="ov-attn-label">time to verify</div><div class="ov-attn-sub">after registering</div></div>
                <div class="ov-attn" :class="clientData.repeatFilerRate > 40 ? 'ov-attn--warn' : 'ov-attn--info'">
                    <div class="ov-attn-value">{{ clientData.repeatFilerRate != null ? clientData.repeatFilerRate + '%' : '—' }}</div>
                    <div class="ov-attn-label">repeat filers</div>
                    <div class="ov-attn-sub">filed more than once</div>
                </div>
            </div>
        </template>
        </div>

        <!-- Team roster — pinned to the right, same rail placement AND rail-list styling as the
             Feedback/Complaint office rails (colored severity border, bold-caps + stat header row,
             pill badge) — just online/offline instead of a rating band. Live status via the
             socket-pushed 'loadLogs' the app already keeps in AuthStore.loggedUsers. Clicking a
             row opens the right-aligned account/messaging panel (TeamMemberModal.vue). -->
        <div class="hp-rail">
        <q-card flat class="hp-team-card">
            <div class="hp-team-head">
                <div class="row items-center justify-between no-wrap q-mb-sm">
                    <div class="row items-baseline q-gutter-xs">
                        <div class="text-h6 text-capitalize">team</div>
                        <div class="text-caption text-grey">{{ filteredTeam.length }} of {{ team.length }} &middot; {{ onlineCount }} online</div>
                    </div>
                </div>
                <q-input outlined dense v-model="teamSearch" placeholder="Search team..." class="hp-team-search">
                    <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
                </q-input>
            </div>
            <q-separator />
            <div class="hp-team-list" ref="railListRef" @scroll="onRailScroll">
                <div
                    v-for="member in filteredTeam" :key="member.id"
                    class="hp-team-item" :class="[member.isOnline ? 'sev-good' : 'sev-flat', member.unreadCount > 0 ? 'hp-team-item--unread' : '']"
                    @click="openMember(member)"
                >
                    <div class="row items-center justify-between no-wrap">
                        <div class="row items-center q-gutter-xs">
                            <div class="text-caption text-weight-bold text-uppercase">{{ member.firstname }} {{ member.lastname }}</div>
                            <q-badge v-if="member.unreadCount > 0" color="negative" rounded>{{ member.unreadCount }}</q-badge>
                        </div>
                        <div class="text-caption text-grey">{{ member.office || '—' }}</div>
                    </div>
                    <div class="text-body2 q-mt-xs text-capitalize">{{ ROLE_LABELS[member.role] || member.role }}</div>
                    <div class="row items-center q-mt-xs q-gutter-xs">
                        <span class="hp-team-pill" :style="member.isOnline ? { background: '#E4F5E9', color: '#1C8A3B' } : { background: '#F6F9FC', color: '#8493AC' }">
                            {{ member.isOnline ? 'online' : 'offline' }}
                        </span>
                        <span v-if="member.unreadCount > 0" class="hp-team-pill hp-team-pill--unread">
                            <q-icon name="bi-envelope-fill" size="10px" class="q-mr-xs" />{{ member.unreadCount }} new
                        </span>
                    </div>
                </div>
                <EmptyState v-if="!filteredTeam.length" rail icon="bi-people" title="No staff found" hint="Try another search." />
            </div>
            <q-btn
                v-if="showBackToTop"
                round unelevated color="primary" icon="bi-arrow-up" size="sm"
                class="hp-back-to-top" @click="scrollRailToTop"
            >
                <q-tooltip>Back to top</q-tooltip>
            </q-btn>
        </q-card>
        </div>
        </div>

        <TeamMemberModal v-model="memberDialog" :member="selectedMember" @force-logout="loadTeam" />
        <DataAnalysisModal
            v-if="isSupervisor"
            v-model="analysisModalOpen"
            :period="overviewPeriod"
            :year="overviewYear"
        />
    </div>
</template>

<script setup>
import EmptyState from 'src/components/EmptyState.vue';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';
import { useRouter } from 'vue-router';
import moment from 'moment';
import { api } from 'src/boot/axios';
import { socket } from 'src/boot/socket';
import { useAuthStore } from 'src/stores/auth-store';
import Apexchart from 'vue3-apexcharts';
import TeamMemberModal from 'src/components/TeamMemberModal.vue';
import DataAnalysisModal from 'src/components/DataAnalysisModal.vue';

const router = useRouter();
const AuthStore = useAuthStore();

// "Analyze Data" — super/admin only, opens the AI recommendations modal for the current
// overview period/year (see DataAnalysisModal.vue + GET /report/prescriptions).
const isSupervisor = computed(() => ['super', 'admin'].includes(AuthStore.user?.role));
const analysisModalOpen = ref(false);

// System-wide oversight roles — same set that gates the read-only panels on Feedback/Complaint/
// Discussion/Poll. Drives the "Clients · citizen base" section.
const canViewAll = computed(() => ['super', 'admin', 'monitoring'].includes(AuthStore.user?.role));
const clientData = ref({});
const verifiedRateClass = computed(() => {
    const r = clientData.value.verifiedRate;
    if (r == null) return 'text-grey';
    return r >= 60 ? 'text-primary' : 'text-negative';
});
const formatVerifyTime = (minutes) => {
    if (minutes == null) return '—';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const h = minutes / 60;
    return h < 24 ? `${h.toFixed(1)}h` : `${Math.round(h / 24)}d`;
};

// Shuffled fresh on every page load so charts don't render in the exact same color order every
// visit — same 10-color theme (5 distinct, repeated 3x below to match the array length every
// multi-item chart on this page already expects), just randomized which color lands where.
// Multi-item charts (donuts, multi-series area/line) still pass the whole array — Apex assigns
// one color per slice/series positionally. nextChartColor() hands single-series charts one color
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

/* -------------------- hero -------------------- */

const avatarFailed = ref(false);
const onAvatarError = () => { avatarFailed.value = true; };
const avatarUrl = computed(() => `${process.env.VUE_APP_BACKEND_URL}${AuthStore.user?.avatar || ''}`);

const fullName = computed(() => {
    const u = AuthStore.user;
    return u ? `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.username : '';
});

const ROLE_LABELS = { super: 'Super Admin', admin: 'Admin', workstation: 'Workstation Staff', monitoring: 'Monitoring' };
const roleLabel = computed(() => ROLE_LABELS[AuthStore.user?.role] || AuthStore.user?.role || '');
const officeLabel = computed(() => AuthStore.user?.staff?.office?.alias || AuthStore.user?.staff?.office?.name || null);

const greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
});
const todayLabel = computed(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));

/* -------------------- needs-attention + quick access -------------------- */
// Reuses the same lightweight /nav-badges endpoint the left-nav already calls for its badge
// counts — feedback/discussion/poll are "new since you last opened that section", complaint is
// a live count of offices still holding an unreceived complaint (see NavBadgeController).

const navBadges = ref({ feedback: 0, complaint: 0, discussion: 0, poll: 0 });

const loadNavBadges = async () => {
    try {
        const { data } = await api.get('/nav-badges');
        navBadges.value = data.data || navBadges.value;
    } catch (error) {
        console.error('Error loading nav badges:', error);
    }
};

/* -------------------- weather (hero corner) -------------------- */
// Open-Meteo — free, keyless, no CORS issues from the browser. Coordinates come from the
// viewer's OWN current location (navigator.geolocation) when granted; San Fernando City,
// Pampanga is only the fallback — for a browser that doesn't support geolocation, a denied/
// dismissed permission prompt, or a timeout — not the default target. WMO weather codes mapped to
// a small icon/label set covering what's realistically seen here (no snow codes bothered with).
const SFC_LAT = 15.0286;
const SFC_LON = 120.6898;

// Wraps the callback-based Geolocation API in a Promise. maximumAge lets the browser hand back a
// recent cached fix instead of re-acquiring GPS/network location every single dashboard load;
// timeout keeps a slow/stuck location prompt from hanging the weather card indefinitely.
const getCurrentPosition = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported by this browser.')); return; }
    navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(err),
        { timeout: 8000, maximumAge: 15 * 60 * 1000 }
    );
});

// BigDataCloud's client-side reverse-geocode endpoint — free, keyless, same "no CORS issues"
// convention as Open-Meteo above. Best-effort: a failed lookup still shows the weather itself,
// just with a generic "Your location" label instead of a named city.
const reverseGeocodeCity = async (lat, lon) => {
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        if (!response.ok) throw new Error(`Reverse geocode returned ${response.status}`);
        const data = await response.json();
        return data.city || data.locality || data.principalSubdivision || null;
    } catch (error) {
        console.error('Error reverse-geocoding current location:', error);
        return null;
    }
};
const WEATHER_CODE_MAP = {
    0: { icon: 'bi-sun', label: 'Clear sky' },
    1: { icon: 'bi-brightness-high', label: 'Mostly clear' },
    2: { icon: 'bi-cloud-sun', label: 'Partly cloudy' },
    3: { icon: 'bi-cloud', label: 'Overcast' },
    45: { icon: 'bi-cloud-fog2', label: 'Foggy' },
    48: { icon: 'bi-cloud-fog2', label: 'Foggy' },
    51: { icon: 'bi-cloud-drizzle', label: 'Light drizzle' },
    53: { icon: 'bi-cloud-drizzle', label: 'Drizzle' },
    55: { icon: 'bi-cloud-drizzle', label: 'Heavy drizzle' },
    61: { icon: 'bi-cloud-rain', label: 'Light rain' },
    63: { icon: 'bi-cloud-rain', label: 'Rain' },
    65: { icon: 'bi-cloud-rain-heavy', label: 'Heavy rain' },
    80: { icon: 'bi-cloud-rain', label: 'Rain showers' },
    81: { icon: 'bi-cloud-rain-heavy', label: 'Rain showers' },
    82: { icon: 'bi-cloud-rain-heavy', label: 'Violent showers' },
    95: { icon: 'bi-cloud-lightning-rain', label: 'Thunderstorm' },
    96: { icon: 'bi-cloud-lightning-rain', label: 'Thunderstorm w/ hail' },
    99: { icon: 'bi-cloud-lightning-rain', label: 'Thunderstorm w/ hail' },
};

const weather = ref(null); // { tempC, icon, label }
const weatherLoading = ref(true);
const weatherCity = ref('San Fernando City'); // updated once geolocation/reverse-geocode resolve

const loadWeather = async () => {
    weatherLoading.value = true;
    let lat = SFC_LAT;
    let lon = SFC_LON;
    try {
        const pos = await getCurrentPosition();
        lat = pos.lat;
        lon = pos.lon;
        weatherCity.value = (await reverseGeocodeCity(lat, lon)) || 'Your location';
    } catch (geoError) {
        // Not supported, permission denied/dismissed, or timed out — fall back to San Fernando
        // City's own coordinates rather than failing the whole weather card outright.
        console.warn('Falling back to San Fernando City for weather — geolocation unavailable:', geoError.message);
        weatherCity.value = 'San Fernando City';
    }

    try {
        // timezone=auto rather than a hardcoded Asia/Manila — matters once this is actually the
        // viewer's own location instead of always San Fernando City.
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,weather_code&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Weather API returned ${response.status}`);
        const data = await response.json();
        const code = data?.current?.weather_code;
        const match = WEATHER_CODE_MAP[code] || { icon: 'bi-cloud', label: 'Weather' };
        weather.value = {
            tempC: Math.round(data?.current?.temperature_2m),
            icon: match.icon,
            label: match.label,
        };
    } catch (error) {
        console.error('Error loading weather:', error);
        weather.value = null;
    } finally {
        weatherLoading.value = false;
    }
};

/* -------------------- system overview (Complaint + Feedback + Discussion + Poll) -------------------- */
// Pulls each module's own already-built, already-scoped analytics endpoint (Complaint/Feedback's
// /analytics, Discussion/Poll's period-filtered list+stats) and blends them into one cross-module
// dashboard — same period/year windowing convention used on every other analytics page in this
// app, so "Month" here means exactly what "Month" means on the Complaint page.

const currentYear = moment().year();
const overviewPeriod = ref('year'); // 'week' | 'month' | 'year'
const overviewYear = ref(currentYear);
const overviewLoading = ref(false);
const overviewScopeLabel = ref('');
const overviewRangeLabel = ref('');

const bucketUnitLabel = computed(() => overviewPeriod.value === 'week' ? 'day' : overviewPeriod.value === 'month' ? 'week' : 'month');

const complaintData = ref({ kpis: {}, statusBreakdown: [], volumeTrend: [], satisfaction: {} });
const feedbackData = ref({ kpis: {}, volumeTrend: [] });
// how the feedback and the CSM reports of the period read (positive / neutral / negative): see utils/sentiment.js in the API
const FEEL = [
    { key: 'positive', hex: '#21BA45' },
    { key: 'neutral', hex: '#FFC900' },
    { key: 'negative', hex: '#C10015' },
];
const feelOf = (label, mix) => {
    const m = mix || {};
    const total = FEEL.reduce((n, f) => n + (m[f.key] || 0), 0);
    return { label, total, parts: FEEL.map(f => ({ label: f.key, hex: f.hex, count: m[f.key] || 0, pct: total ? Math.round(((m[f.key] || 0) / total) * 100) : 0 })) };
};
const feelGroups = computed(() => [
    feelOf('feedback', complaintData.value.sentiment),
    feelOf('CSM reports', feedbackData.value.sentimentMix),
]);
const discussionsRaw = ref([]);
const pollsRaw = ref([]);

const discussionTotals = computed(() => ({
    topics: discussionsRaw.value.length,
    comments: discussionsRaw.value.reduce((sum, d) => sum + (d.commentCount || 0), 0)
}));
const pollTotals = computed(() => ({
    polls: pollsRaw.value.length,
    votes: pollsRaw.value.reduce((sum, p) => sum + (p.totalVotes || 0), 0)
}));

// How long, on average, a complaint sat "ready" (every assigned office already marked its own
// part done) before a supervisor actually finalized it — see avgApprovalLagHours in
// ComplaintController.getAnalytics. This is exactly what the AI completion-suggestion banner
// (ComplaintPage.vue's status tab) exists to shrink; a rising trend here is a real signal
// supervisors are sitting on ready-to-close complaints.
const approvalLagLabel = computed(() => {
    const hours = complaintData.value.kpis.avgApprovalLagHours;
    if (hours == null) return '—';
    if (hours < 24) return `${hours.toFixed(1)}h`;
    const days = Math.floor(hours / 24);
    const remHours = Math.round(hours % 24);
    return `${days}d ${remHours}h`;
});

const totalTouchpoints = computed(() => (
    (complaintData.value.kpis.totalComplaints || 0) +
    (feedbackData.value.kpis.totalFeedback || 0) +
    discussionTotals.value.comments +
    pollTotals.value.votes
));

// Complaint satisfaction is a 1-5 star average; feedback satisfaction is already a 0-100%
// average — normalized onto the same 0-100 scale here so they can be blended into one headline
// number (weighted by how many ratings/responses back each side, so a channel with barely any
// ratings can't swing the blend as much as one with hundreds).
const complaintSatisfactionPct = computed(() => {
    const avg = complaintData.value.kpis.avgSatisfaction;
    return avg != null ? avg / 5 * 100 : null;
});
const complaintSatisfactionN = computed(() => complaintData.value.satisfaction?.totalRatings || 0);
const feedbackSatisfactionPct = computed(() => feedbackData.value.kpis.avgSatisfaction ?? null);
const feedbackSatisfactionN = computed(() => feedbackData.value.kpis.totalFeedback || 0);

const overallSatisfaction = computed(() => {
    const parts = [];
    if (complaintSatisfactionPct.value != null && complaintSatisfactionN.value > 0) {
        parts.push({ pct: complaintSatisfactionPct.value, n: complaintSatisfactionN.value });
    }
    if (feedbackSatisfactionPct.value != null && feedbackSatisfactionN.value > 0) {
        parts.push({ pct: feedbackSatisfactionPct.value, n: feedbackSatisfactionN.value });
    }
    if (!parts.length) return null;
    const totalN = parts.reduce((s, p) => s + p.n, 0);
    return +(parts.reduce((s, p) => s + p.pct * p.n, 0) / totalN).toFixed(1);
});
const overallSatisfactionLabel = computed(() => overallSatisfaction.value != null ? `${Math.round(overallSatisfaction.value)}%` : '—');

/* the feedback process (see ComplaintController.getAnalytics: process, slaCompliance) */

const process_ = computed(() => complaintData.value.process || {});
const pipeline = computed(() => process_.value.pipeline || { filed: 0, routed: 0, acknowledged: 0, officesDone: 0, completed: 0 });
const pipelineSteps = computed(() => {
    const p = pipeline.value;
    const pct = (n) => (p.filed ? Math.round((n / p.filed) * 100) : 0);
    return [
        { key: 'filed', label: 'Filed', count: p.filed, color: '#204888' },
        { key: 'routed', label: 'Routed to an office', count: p.routed, color: '#3E6BB5' },
        { key: 'acknowledged', label: 'Acknowledged by an office', count: p.acknowledged, color: '#68AFF1' },
        { key: 'officesDone', label: 'Office part done', count: p.officesDone, color: '#FFC900' },
        { key: 'completed', label: 'Completed by a supervisor', count: p.completed, color: '#21BA45' },
    ].map(st => ({ ...st, pct: pct(st.count) }));
});
const completedShare = computed(() => (pipeline.value.filed ? Math.round((pipeline.value.completed / pipeline.value.filed) * 100) : 0));
const meterColor = (rate) => (rate == null ? '#B8C2D4' : rate >= 85 ? '#21BA45' : rate >= 70 ? '#FFC900' : '#C10015');
const deadlineMeters = computed(() => {
    const sla = complaintData.value.slaCompliance || {};
    const filed = pipeline.value.filed;
    const extended = filed ? Math.round(((process_.value.extendedCount || 0) / filed) * 100) : 0;
    return [
        { label: 'acknowledged within 1 day', value: sla.ackRate ?? null, color: meterColor(sla.ackRate), sub: '' },
        { label: 'resolved within 3 days (6 if extended)', value: sla.resolutionRate ?? null, color: meterColor(sla.resolutionRate), sub: '' },
        { label: 'given the 3-day extension', value: extended, color: '#FFC900', sub: `${process_.value.extendedCount || 0} of ${filed} feedback, one extension each` },
    ];
});
const FILED_HOW = [
    { key: 'account', label: 'Citizen, signed in' },
    { key: 'anonymous', label: 'Anonymous (signed in)' },
    { key: 'staff', label: 'Filed by staff' },
    { key: 'guest', label: 'Guest (earlier filings)' },
];
const filedHowSeries = computed(() => FILED_HOW.map(r => process_.value.filedHow?.[r.key] || 0));
const filedHowOptions = computed(() => donutOptions(FILED_HOW.map(r => r.label)));

const formatSpan = (days) => {
    if (days == null) return '—';
    const totalMinutes = days * 24 * 60;
    if (totalMinutes < 60) return Math.round(totalMinutes) + 'm';
    const totalHours = days * 24;
    if (totalHours < 24) return (Math.round(totalHours * 10) / 10) + 'h';
    return (Math.round(days * 10) / 10) + 'd';
};

// "needs your attention": the same waiting-on-someone counts the sidebar shows, plus the deadlines that are slipping
const attnTone = (n, tone = 'bad') => (n > 0 ? 'ov-attn--' + tone : 'ov-attn--zero');
const attnTiles = computed(() => [
    { key: 'unreceived', route: 'complaint', icon: 'bi-inbox', tone: 'bad', count: navBadges.value.complaint, label: 'unreceived feedback', sub: 'waiting for an office' },
    { key: 'ack', route: 'complaint', icon: 'bi-bell', tone: 'bad', count: complaintData.value.kpis.ackOverdueCount ?? 0, label: 'not acknowledged', sub: 'past the 1-day mark' },
    { key: 'late', route: 'complaint', icon: 'bi-hourglass-bottom', tone: 'bad', count: complaintData.value.kpis.resolutionOverdueCount ?? 0, label: 'past the deadline', sub: '3 days, or 6 if extended' },
    { key: 'soon', route: 'complaint', icon: 'bi-clock-history', tone: 'warn', count: process_.value.dueSoonCount ?? 0, label: 'due in 24 hours', sub: 'consider an extension' },
    { key: 'approve', route: 'complaint', icon: 'bi-patch-check', tone: 'info', count: process_.value.awaitingApprovalCount ?? 0, label: 'awaiting approval', sub: 'offices done, not completed' },
    { key: 'csm', route: 'feedback', icon: 'bi-clipboard-data', tone: 'info', count: navBadges.value.feedback, label: 'new CSM reports', sub: 'since you last looked' },
    { key: 'comments', route: 'discussion', icon: 'bi-chat-dots', tone: 'info', count: navBadges.value.discussion, label: 'new comments', sub: 'on the discussions' },
    { key: 'responses', route: 'poll', icon: 'bi-ui-checks', tone: 'info', count: navBadges.value.poll, label: 'new survey responses', sub: 'since you last looked' },
]);

// one card per module, with this period's figures
const moduleCards = computed(() => [
    {
        key: 'feedback', route: 'complaint', icon: 'bi-chat-quote', title: 'Feedback', badge: navBadges.value.complaint,
        description: 'Receive and address what residents report.',
        stats: [
            { value: complaintData.value.kpis.totalComplaints ?? 0, label: 'filed' },
            { value: completedShare.value + '%', label: 'completed' },
            { value: complaintData.value.slaCompliance?.resolutionRate != null ? complaintData.value.slaCompliance.resolutionRate + '%' : '—', label: 'on time' },
        ],
    },
    {
        key: 'csm', route: 'feedback', icon: 'bi-emoji-smile', title: 'CSM report', badge: navBadges.value.feedback,
        description: 'Client satisfaction, from the kiosks and from staff.',
        stats: [
            { value: feedbackData.value.kpis.totalFeedback ?? 0, label: 'reports' },
            { value: feedbackData.value.kpis.avgSatisfaction != null ? feedbackData.value.kpis.avgSatisfaction + '%' : '—', label: 'satisfied' },
            { value: feedbackData.value.kpis.charterAwareRate != null ? feedbackData.value.kpis.charterAwareRate + '%' : '—', label: 'charter aware' },
        ],
    },
    {
        key: 'discussion', route: 'discussion', icon: 'bi-people', title: 'Discussion', badge: navBadges.value.discussion,
        description: 'Open topics and hear from residents.',
        stats: [
            { value: discussionTotals.value.topics, label: 'topics' },
            { value: discussionTotals.value.comments, label: 'comments' },
            { value: discussionsRaw.value.filter(d => d.status === 'open' && !d.isExpired).length, label: 'open' },
        ],
    },
    {
        key: 'survey', route: 'poll', icon: 'bi-ui-checks', title: 'Survey', badge: navBadges.value.poll,
        description: 'Ask residents several questions at once.',
        stats: [
            { value: pollTotals.value.polls, label: 'surveys' },
            { value: pollTotals.value.votes, label: 'responses' },
            { value: pollsRaw.value.filter(p => p.status === 'open' && !p.isExpired).length, label: 'open' },
        ],
    },
]);

/* charts */

const filingsChartSeries = ref([]);
const filingsChartOptions = ref({
    chart: { type: 'area', toolbar: { show: false }, animations: { speed: 300 } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: CHART_PALETTE,
    grid: { strokeDashArray: 4 },
    legend: { position: 'top', fontSize: '11px' },
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v) => Math.round(v) } },
});

const engagementChartSeries = ref([]);
const engagementChartOptions = ref({
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    markers: { size: 3 },
    colors: [nextChartColor(), nextChartColor()],
    legend: { position: 'top', fontSize: '11px' },
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v) => Math.round(v) } },
});

const satisfactionChartSeries = ref([{ name: 'Satisfaction', data: [] }]);
const satisfactionChartOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '50%' } },
    dataLabels: { enabled: true, formatter: (v) => v != null ? `${v}%` : 'n/a' },
    colors: [nextChartColor()],
    xaxis: { categories: ['Feedback', 'CSM Report'], max: 100 },
});

// Status breakdown bars — count/percent per status, read straight off
// complaintData.value.statusBreakdown by applyOverviewCharts (no chart-options object to keep in
// sync, unlike the apexchart panels around it).
const statusBreakdownRows = computed(() => {
    const rows = complaintData.value.statusBreakdown || [];
    const total = rows.reduce((sum, r) => sum + (r.count || 0), 0);
    return rows.map(r => ({
        status: r.status,
        count: r.count || 0,
        percent: total ? +(r.count / total * 100).toFixed(1) : 0,
    }));
});
const statusBreakdownTotal = computed(() => statusBreakdownRows.value.reduce((sum, r) => sum + r.count, 0));

const DONUT_COLORS = ['#204888', '#FFC900', '#68AFF1', '#B8C2D4', '#3E6BB5', '#9A6B00'];
const donutOptions = (labels = []) => ({
    chart: { type: 'donut' },
    labels,
    colors: DONUT_COLORS,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    stroke: { width: 2 },
    plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Total', fontSize: '12px' } } } } },
});
const shareChartSeries = ref([]);
const shareChartOptions = ref(donutOptions());

// Intake channel mix for the "Clients" section — registered account vs. guest OTP vs. staff walk-in.
const channelChartSeries = ref([]);
const channelChartOptions = ref({
    chart: { type: 'pie' },
    labels: ['Registered account', 'Guest (OTP)', 'Staff-filed'],
    colors: CHART_PALETTE,
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: true },
});

// Adaptive bucketing, same convention as Complaint/Feedback's server-side trend charts and
// Discussion/Poll's own client-side one — daily across a week, weekly across a month, monthly
// across a year — used here to bucket Discussion/Poll (which have no server-side trend endpoint
// of their own) onto the same timeline as Complaint/Feedback's already-bucketed volumeTrend.
const buildBucketDefs = () => {
    const ref_ = overviewYear.value === currentYear ? moment() : moment(`${overviewYear.value}-12-31`, 'YYYY-MM-DD').endOf('day');
    if (overviewPeriod.value === 'week') {
        const start = moment(ref_).startOf('isoWeek');
        return Array.from({ length: 7 }, (_, i) => {
            const day = moment(start).add(i, 'days');
            return { label: day.format('ddd D'), start: moment(day).startOf('day'), end: moment(day).endOf('day') };
        });
    }
    if (overviewPeriod.value === 'year') {
        const start = moment(ref_).startOf('year');
        return Array.from({ length: 12 }, (_, i) => {
            const m = moment(start).add(i, 'months');
            return { label: m.format('MMM'), start: moment(m).startOf('month'), end: moment(m).endOf('month') };
        });
    }
    const start = moment(ref_).startOf('month');
    const weekSpan = Math.max(1, Math.ceil(moment(ref_).diff(start, 'days') / 7) + 1);
    return Array.from({ length: weekSpan }, (_, i) => {
        const w = moment(start).add(i, 'weeks');
        return { label: w.format('MMM D'), start: moment(w).startOf('day'), end: moment(w).add(6, 'days').endOf('day') };
    });
};

const applyOverviewCharts = () => {
    const bucketDefs = buildBucketDefs();
    const categories = bucketDefs.map(b => b.label);

    const discussionCounts = bucketDefs.map(() => 0);
    const commentCounts = bucketDefs.map(() => 0);
    discussionsRaw.value.forEach(d => {
        const created = moment(d.createdAt);
        const idx = bucketDefs.findIndex(b => created.isBetween(b.start, b.end, null, '[]'));
        if (idx >= 0) {
            discussionCounts[idx]++;
            commentCounts[idx] += (d.commentCount || 0);
        }
    });

    const pollCounts = bucketDefs.map(() => 0);
    const voteCounts = bucketDefs.map(() => 0);
    pollsRaw.value.forEach(p => {
        const created = moment(p.createdAt);
        const idx = bucketDefs.findIndex(b => created.isBetween(b.start, b.end, null, '[]'));
        if (idx >= 0) {
            pollCounts[idx]++;
            voteCounts[idx] += (p.totalVotes || 0);
        }
    });

    // Complaint/Feedback already come back bucketed from the server using the identical
    // period/year windowing convention — fall back to a flat zero series (matching this chart's
    // own bucket count) only if that data hasn't loaded yet, rather than mixing mismatched labels.
    const complaintCounts = complaintData.value.volumeTrend?.length === bucketDefs.length
        ? complaintData.value.volumeTrend.map(b => b.count)
        : bucketDefs.map(() => 0);
    const feedbackCounts = feedbackData.value.volumeTrend?.length === bucketDefs.length
        ? feedbackData.value.volumeTrend.map(b => b.count)
        : bucketDefs.map(() => 0);

    filingsChartSeries.value = [
        { name: 'Feedback', data: complaintCounts },
        { name: 'CSM Report', data: feedbackCounts },
        { name: 'Discussions', data: discussionCounts },
        { name: 'Surveys', data: pollCounts },
    ];
    filingsChartOptions.value = { ...filingsChartOptions.value, xaxis: { ...filingsChartOptions.value.xaxis, categories } };

    engagementChartSeries.value = [
        { name: 'Discussion comments', data: commentCounts },
        { name: 'Survey responses', data: voteCounts },
    ];
    engagementChartOptions.value = { ...engagementChartOptions.value, xaxis: { ...engagementChartOptions.value.xaxis, categories } };

    satisfactionChartSeries.value = [{
        name: 'Satisfaction %',
        data: [
            complaintSatisfactionPct.value != null ? +complaintSatisfactionPct.value.toFixed(1) : null,
            feedbackSatisfactionPct.value != null ? +feedbackSatisfactionPct.value.toFixed(1) : null,
        ]
    }];

    // statusBreakdownRows/statusBreakdownTotal (the bars above) are computed straight off
    // complaintData.value.statusBreakdown — nothing to push into them here.

    shareChartSeries.value = [
        complaintData.value.kpis.totalComplaints || 0,
        feedbackData.value.kpis.totalFeedback || 0,
        discussionTotals.value.comments,
        pollTotals.value.votes,
    ];
    shareChartOptions.value = { ...shareChartOptions.value, labels: ['Feedback', 'CSM Report', 'Discussion comments', 'Survey responses'] };

    const ch = clientData.value.complaintsByChannel || {};
    channelChartSeries.value = [ch.account || 0, ch.otp || 0, ch.staff || 0];
};

const loadOverview = async (opts = {}) => {
    if (!opts?.quiet) overviewLoading.value = true;
    try {
        const params = { period: overviewPeriod.value, year: overviewYear.value };
        const requests = [
            api.get('/complaint/analytics', { params }),
            api.get('/feedback/analytics', { params }),
            api.get('/discussion', { params }),
            api.get('/poll', { params }),
        ];
        // Client tiles are system-wide oversight data — only fetched for the roles that show them.
        if (canViewAll.value) requests.push(api.get('/report/client-overview', { params }));

        const [complaintRes, feedbackRes, discussionRes, pollRes, clientRes] = await Promise.all(requests);
        complaintData.value = complaintRes.data.data || { kpis: {}, statusBreakdown: [], volumeTrend: [], satisfaction: {} };
        feedbackData.value = feedbackRes.data.data || { kpis: {}, volumeTrend: [] };
        discussionsRaw.value = discussionRes.data.data || [];
        pollsRaw.value = pollRes.data.data || [];
        clientData.value = clientRes?.data.data || {};
        overviewScopeLabel.value = complaintData.value.scope?.label || feedbackData.value.scope?.label || '';
        overviewRangeLabel.value = complaintData.value.range?.label || '';
        applyOverviewCharts();
    } catch (error) {
        console.error('Error loading system overview:', error);
    } finally {
        overviewLoading.value = false;
    }
};

const setOverviewPeriod = (period) => {
    if (overviewPeriod.value === period) return;
    overviewPeriod.value = period;
    loadOverview();
};

const stepYear = (delta) => {
    const next = overviewYear.value + delta;
    if (next > currentYear) return;
    overviewYear.value = next;
    loadOverview();
};

/* -------------------- team roster -------------------- */
// GET /team/directory is the full roster (online AND offline) — AuthStore.loggedUsers is the
// live-updating "who's online right now" set the socket boot file already keeps current (see
// sockets/index.js's 'loadLogs' push), cross-referenced here rather than re-polled.

const teamRoster = ref([]); // [{ id, firstname, lastname, username, role, avatar, office, isOnline }]
const memberDialog = ref(false);
const selectedMemberId = ref(null);

const formatAvatar = (u) => `${process.env.VUE_APP_BACKEND_URL}${u.avatar || ''}`;

const onlineUserIds = computed(() => new Set((AuthStore.loggedUsers || []).map(l => l.userId)));

// Online members first, then alphabetical — same as any other "who's active" roster.
const team = computed(() => teamRoster.value
    .map(m => ({ ...m, isOnline: onlineUserIds.value.has(m.id) }))
    .sort((a, b) => (b.isOnline - a.isOnline) || (a.firstname || '').localeCompare(b.firstname || '')));
const onlineCount = computed(() => team.value.filter(m => m.isOnline).length);

const teamSearch = ref('');
const filteredTeam = computed(() => {
    const term = teamSearch.value.trim().toLowerCase();
    if (!term) return team.value;
    return team.value.filter(m =>
        `${m.firstname || ''} ${m.lastname || ''}`.toLowerCase().includes(term) ||
        (m.office || '').toLowerCase().includes(term) ||
        (m.role || '').toLowerCase().includes(term)
    );
});

// A live lookup into `team`, not a snapshot taken at click time — so if the open modal's member
// goes online/offline mid-conversation, its header badge follows along instead of freezing.
const selectedMember = computed(() => team.value.find(m => m.id === selectedMemberId.value) || null);

// Floating "back to top" for the team rail — same idiom as ComplaintPage.vue's .cp-rail-list.
const railListRef = ref(null);
const showBackToTop = ref(false);
const onRailScroll = (event) => {
    showBackToTop.value = event.target.scrollTop > 400;
};
const scrollRailToTop = () => {
    railListRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
};

const loadTeam = async () => {
    try {
        const { data } = await api.get('/team/directory');
        teamRoster.value = data.data || [];
    } catch (error) {
        console.error('Error loading team directory:', error);
    }
};

const openMember = (member) => {
    selectedMemberId.value = member.id;
    memberDialog.value = true;
    // Optimistic — the actual mark-as-read happens server-side inside TeamMemberModal's
    // GET /messages/:userId (see MessageController.getConversation), this just clears the badge
    // immediately instead of waiting on that request to come back.
    const roster = teamRoster.value.find(m => m.id === member.id);
    if (roster) roster.unreadCount = 0;
};

// Bumps the sender's row badge the moment a message arrives, without a full directory reload —
// EXCEPT while that sender's own thread is the one currently open (memberDialog), since
// TeamMemberModal is already live-appending it there and it's being read as it arrives, not
// piling up unread.
const onIncomingMessage = (message) => {
    if (memberDialog.value && selectedMemberId.value === message.senderId) return;
    const roster = teamRoster.value.find(m => m.id === message.senderId);
    if (roster) roster.unreadCount = (roster.unreadCount || 0) + 1;
};

// the dashboard's counts and charts follow what happens in the modules it summarizes
useLiveRefresh(['complaint', 'feedback', 'discussion', 'poll'], () => Promise.all([loadNavBadges(), loadOverview({ quiet: true })]));

onMounted(() => {
    loadNavBadges();
    loadOverview();
    loadWeather();
    loadTeam();
    socket.on('message:new', onIncomingMessage);
});
onUnmounted(() => {
    socket.off('message:new', onIncomingMessage);
});
</script>

<style scoped>
.hp-feel + .hp-feel { margin-top: 16px; }
.hp-feel-bar { display: flex; height: 10px; margin-top: 6px; border-radius: 99px; overflow: hidden; background: #EDF1F7; }
.hp-feel-bar > span { height: 100%; }
.hp-feel-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 6px; font-size: 11.5px; color: #6B7A99; }
.hp-feel-legend i { display: inline-block; width: 8px; height: 8px; margin-right: 5px; border-radius: 50%; }
/* Same rail+main split as the Feedback/Complaint pages (.fp-shell/.fp-main/.fp-rail) — a grid
   column reserves the 380px on the right (even though the rail card inside it goes position:fixed
   below, taking it out of flow — the grid still keeps that space blank so .hp-main's content never
   slides under it), collapsing to a single stacked column below the same 1200px breakpoint. */
.hp-shell {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 16px;
    align-items: start;
}
@media (max-width: 1200px) {
    .hp-shell {
        grid-template-columns: 1fr;
    }
}
.hp-main {
    min-width: 0;
}
.hp-rail {
    min-width: 0;
}
/* Same rail-list idiom as the Feedback/Complaint office rails (.fp-rail-card etc.) — colored
   left border by state, bold-caps + right-aligned stat header row, pill badge — AND now the same
   placement: pinned to the right edge, scrolling independently of the rest of the dashboard. */
.hp-team-card {
    background: #FFFFFF;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    position: relative;
}
.hp-back-to-top {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 2;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
@media (min-width: 1201px) {
    .hp-team-card {
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
.hp-team-head {
    padding: 16px;
    flex-shrink: 0;
}
.hp-team-search :deep(.q-field__control) {
    border-radius: 100px;
    background: #F6F9FC;
}
.hp-team-list {
    overflow-y: auto;
    flex: 1;
    min-height: 200px;
}
.hp-team-item {
    padding: 10px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-left: 3px solid transparent;
    cursor: pointer;
}
.hp-team-item:hover {
    background: #F6F9FC;
}
.hp-team-item.sev-good {
    border-left-color: var(--q-positive);
}
.hp-team-item.sev-flat {
    border-left-color: #E0E0E0;
}
/* An unread message is a stronger signal than plain online/offline — tints the whole row rather
   than fighting the online/offline border color for attention. */
.hp-team-item--unread {
    background: #FBE9EA;
}
.hp-team-item--unread:hover {
    background: #F7DCDE;
}
.hp-team-pill {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .02em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 100px;
}
.hp-team-pill--unread {
    background: #FBE6E8;
    color: #B3121F;
    display: inline-flex;
    align-items: center;
}
.hp-team-empty {
    padding: 32px 16px;
    text-align: center;
    color: #9E9E9E;
}
.hp-hero {
    background: linear-gradient(135deg, var(--q-primary) 0%, #004ea8 100%);
}
.hp-avatar {
    background: rgba(255, 255, 255, 0.25);
    border: 2px solid rgba(255, 255, 255, 0.6);
}
.hp-eyebrow {
    color: rgba(255, 255, 255, 0.85);
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.06em;
}
.hp-subtext {
    color: rgba(255, 255, 255, 0.8);
}

.hp-weather {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 16px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    position: relative;
    min-height: 44px;
}
.hp-weather-temp {
    font-size: 1.15rem;
    font-weight: 700;
    color: #FFFFFF;
    line-height: 1.1;
}
.hp-weather-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.8);
}
.hp-weather-city {
    position: absolute;
    bottom: -18px;
    right: 0;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgba(255, 255, 255, 0.65);
    white-space: nowrap;
}

.hp-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}
.hp-kpi {
    padding: 16px;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hp-kpi:hover {
    transform: translateY(-2px);
}
.hp-kpi-value {
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1.2;
}
.hp-kpi-label {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
}

.hp-year-group {
    display: inline-flex;
    align-items: center;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px 4px;
    gap: 2px;
}
.hp-year-value {
    min-width: 44px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #16233A;
}
.hp-period-group {
    display: inline-flex;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
}
.hp-period-btn {
    background: transparent;
    color: #4C5C79;
    min-height: 26px;
    padding: 0 12px;
    border-radius: 6px;
}
.hp-period-btn--active {
    background: var(--q-primary);
    color: #FFFFFF;
}
.hp-analyze-btn {
    padding: 0 14px;
    min-height: 30px;
    position: relative;
    animation: hp-analyze-pulse 1.8s ease-in-out infinite;
}
.hp-analyze-btn :deep(.q-icon) {
    animation: hp-analyze-twinkle 1.8s ease-in-out infinite;
}
@keyframes hp-analyze-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0, 78, 168, 0.55); }
    50%      { box-shadow: 0 0 0 7px rgba(0, 78, 168, 0); }
}
@keyframes hp-analyze-twinkle {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.55; transform: scale(1.25); }
}
@media (prefers-reduced-motion: reduce) {
    .hp-analyze-btn,
    .hp-analyze-btn :deep(.q-icon) { animation: none; }
}

.hp-client-tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
    gap: 16px 12px;
    text-align: center;
}

.hp-stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
}
.hp-stat {
    width: 100%;
    min-height: 84px;
    padding: 14px 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
}
.hp-stat-value {
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1.2;
}
.hp-stat-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    margin-top: 2px;
}

.hp-panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 12px;
}
.hp-panel {
    min-width: 0;
}

.hp-module-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
}
.hp-module {
    padding: 18px;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hp-module:hover {
    transform: translateY(-2px);
}

@media (max-width: 900px) {
    .hp-kpi-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    .hp-stat-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* the page's period bar and the module cards */
.hp-controls {
    flex-wrap: wrap;
    gap: 8px;
}
.hp-eyebrow-dark {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 2px;
}
.hp-mod-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 12px;
}
.hp-mod {
    --mod: #204888;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px 18px;
    background: #FFFFFF;
    border: 1px solid #E3EAF4;
    border-top: 4px solid var(--mod);
    border-radius: 14px;
    cursor: pointer;
    transition: transform 160ms ease, box-shadow 160ms ease;
}
.hp-mod:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(32, 72, 136, .12); }
.hp-mod--feedback { --mod: #68AFF1; }
.hp-mod--csm { --mod: #4CAF7D; }
.hp-mod--discussion { --mod: #DB812C; }
.hp-mod--survey { --mod: #EEC336; }
.hp-mod-top { display: flex; align-items: flex-start; gap: 12px; }
.hp-mod-ico {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--mod) 18%, white);
    color: #16233A;
}
.hp-mod-title { font-size: 15px; font-weight: 800; color: #16233A; line-height: 1.2; }
.hp-mod-desc { margin-top: 2px; font-size: 12px; line-height: 1.4; color: #8493AC; }
/* the figures sit at the foot of the card; they wrap onto a second line instead of squeezing into one */
.hp-mod-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: 8px; margin-top: auto; }
.hp-mod-stats > div { min-width: 0; padding: 8px 6px; border-radius: 10px; background: #F6F9FC; text-align: center; }
.hp-mod-stats b { display: block; font-size: 17px; line-height: 1.15; color: #16233A; font-variant-numeric: tabular-nums; }
.hp-mod-stats span { display: block; margin-top: 2px; font-size: 10px; line-height: 1.25; letter-spacing: .03em; text-transform: uppercase; color: #8493AC; overflow-wrap: anywhere; }
.hp-mod-go { margin-top: -4px; display: flex; align-items: center; justify-content: flex-end; gap: 6px; font-size: 12px; font-weight: 700; color: #204888; }
</style>
