<template>
    <div class="rp-page">
        <!-- Only on paper: who this report is from and what it covers. -->
        <div class="rp-print-head">
            <div class="rp-print-title">EPS &middot; {{ activeTabTitle }}</div>
            <div class="rp-print-sub">{{ year }} &middot; printed {{ printedOn }}</div>
        </div>

        <!-- Pinned to the top while the report scrolls: the year, and the sections of the report. -->
        <div class="sticky-header q-pb-md no-print">
            <div class="row items-center justify-between rp-header q-mb-md">
                <div>
                    <div class="rp-eyebrow">reports &middot; {{ activeTabTitle }}</div>
                    <div class="text-h5">{{ year }}</div>
                </div>
                <div class="rp-year-group">
                    <q-btn flat dense round size="sm" icon="bi-chevron-left" @click="stepYear(-1)">
                        <q-tooltip>Previous year</q-tooltip>
                    </q-btn>
                    <div class="rp-year-value">{{ year }}</div>
                    <q-btn flat dense round size="sm" icon="bi-chevron-right" :disable="year >= currentYear" @click="stepYear(1)">
                        <q-tooltip>Next year</q-tooltip>
                    </q-btn>
                </div>
            </div>
            <div class="rp-header">
                <div class="rp-seg">
                    <button v-for="t in tabs" :key="t.key" type="button" class="rp-seg-btn" :class="{ 'rp-seg-btn--on': tab === t.key }" @click="tab = t.key">
                        <q-icon :name="t.icon" size="15px" />{{ t.label }}
                    </button>
                </div>
            </div>
        </div>

        <div class="rc-shell">
        <div class="rc-main" style="padding-top: 4px;">

        <!-- ============================== SUMMARY ============================== -->
        <div v-if="tab === 'summary'">
            <div class="ov-title">{{ year }} in numbers</div>
            <div class="ov-kpi-grid q-mb-lg">
                <div class="ov-kpi">
                    <div class="ov-kpi-head"><q-icon name="bi-emoji-smile" size="16px" /> citizen satisfaction</div>
                    <div class="ov-kpi-value">{{ overallSatisfactionLabel }}</div>
                    <div class="ov-kpi-sub">feedback and CSM, blended</div>
                </div>
                <div class="ov-kpi">
                    <div class="ov-kpi-head"><q-icon name="bi-chat-quote" size="16px" /> feedback filed</div>
                    <div class="ov-kpi-value">{{ summary.complaint.kpis.totalComplaints ?? 0 }}</div>
                    <div class="ov-kpi-sub">{{ completedShare }}% completed</div>
                </div>
                <div class="ov-kpi">
                    <div class="ov-kpi-head"><q-icon name="bi-clipboard-data" size="16px" /> CSM reports</div>
                    <div class="ov-kpi-value">{{ summary.feedback.kpis.totalFeedback ?? 0 }}</div>
                    <div class="ov-kpi-sub">{{ summary.feedback.kpis.avgSatisfaction != null ? summary.feedback.kpis.avgSatisfaction + '% satisfied' : 'not rated yet' }}</div>
                </div>
                <div class="ov-kpi">
                    <div class="ov-kpi-head"><q-icon name="bi-people" size="16px" /> discussions</div>
                    <div class="ov-kpi-value">{{ discussionTotals.topics }}</div>
                    <div class="ov-kpi-sub">{{ discussionTotals.comments }} comments</div>
                </div>
                <div class="ov-kpi">
                    <div class="ov-kpi-head"><q-icon name="bi-ui-checks" size="16px" /> surveys</div>
                    <div class="ov-kpi-value">{{ pollTotals.polls }}</div>
                    <div class="ov-kpi-sub">{{ pollTotals.votes }} responses</div>
                </div>
            </div>

            <div class="ov-title">by module</div>
            <div class="rp-mods q-mb-lg">
                <div v-for="row in moduleGlance" :key="row.label" class="ov-card">
                    <div class="ov-card-head">
                        <div class="ov-card-title"><q-icon :name="row.icon" size="16px" class="q-mr-xs" />{{ row.label }}</div>
                    </div>
                    <div v-for="x in row.stats" :key="x.label" class="rp-line"><span>{{ x.label }}</span><b>{{ x.value }}</b></div>
                </div>
            </div>

            <div class="ov-title">how feedback was handled</div>
            <div class="ov-duo q-mb-lg">
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
                    <div class="ov-card-foot">
                        {{ handOverLine }}
                    </div>
                </div>
            </div>
        </div>

        <!-- ===================== OFFICE PERFORMANCE & COMPLIANCE ===================== -->
        <div v-if="tab === 'performance'">
            <div class="ov-title">the offices at a glance</div>
            <div class="ov-kpi-grid q-mb-lg">
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-arrow-left-right" size="16px" /> re-routed</div><div class="ov-kpi-value">{{ performance.systemReassignmentRate ?? 0 }}%</div><div class="ov-kpi-sub">system-wide reassignment rate</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-check2-circle" size="16px" /> on time</div><div class="ov-kpi-value">{{ officesMeetingCompliance }}</div><div class="ov-kpi-sub">offices at 80% or more</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-exclamation-triangle" size="16px" /> to look at</div><div class="ov-kpi-value">{{ officesNeedingAttention }}</div><div class="ov-kpi-sub">offices under 60%</div></div>
            </div>

            <div class="ov-title">office scorecard</div>
            <div class="ov-card q-pa-none q-mb-lg">
                <div class="rp-note">Assigned, received and completed counts, average time to acknowledge and resolve, ARTA/EODB compliance (resolved within the feedback's own 3 days, or 6 with its one extension), how much the AI routed, and satisfaction on both citizen channels.</div>
                <div class="rp-rows">
                    <div v-for="o in performanceSorted" :key="o.officeId" class="rp-row">
                        <div class="rp-row-id">
                            <span class="rc-code rc-code--solid rc-off-code">{{ o.officeAlias || o.officeName }}</span>
                            <div class="rp-row-name">{{ o.officeName }}</div>
                        </div>
                        <div class="rp-row-meter">
                            <div class="ov-meter-top"><span>resolved on time</span><b :class="complianceClass(o)">{{ o.totalCompleted ? (100 - (o.overdueRate ?? 0)).toFixed(1) + '%' : '—' }}</b></div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: (o.totalCompleted ? 100 - (o.overdueRate ?? 0) : 0) + '%', background: meterColor(complianceRate(o)) }"></div></div>
                        </div>
                        <div class="rp-stats">
                            <div v-for="x in officeStats(o)" :key="x.label" class="rp-s"><b>{{ x.value }}</b><span>{{ x.label }}</span></div>
                        </div>
                    </div>
                </div>
                <div v-if="!performanceSorted.length" class="ov-empty q-ma-md">no office figures for {{ year }}</div>
            </div>
        </div>

        <!-- ===================== ACCOUNT PERFORMANCE ===================== -->
        <div v-if="tab === 'accounts'">
            <div class="ov-title">the accounts at a glance</div>
            <div class="ov-kpi-grid q-mb-lg">
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-people" size="16px" /> accounts</div><div class="ov-kpi-value">{{ accountPerformance.data.length }}</div><div class="ov-kpi-sub">admin and workstation</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-arrow-counterclockwise" size="16px" /> corrected</div><div class="ov-kpi-value">{{ systemAvgCorrectionRate != null ? systemAvgCorrectionRate + '%' : '—' }}</div><div class="ov-kpi-sub">of "done" marks sent back</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-person-x" size="16px" /> with a correction</div><div class="ov-kpi-value">{{ accountsWithCorrections }}</div><div class="ov-kpi-sub">accounts</div></div>
            </div>

            <div class="ov-title">account scorecard</div>
            <div class="ov-card q-pa-none q-mb-lg">
                <div class="rp-note">Counts and average times are per account, not per office. Satisfaction is on that account's own responses, and corrections count how often a supervisor sent its "done" mark back.</div>
                <div class="rp-rows">
                    <div v-for="a in accountsSorted" :key="a.userId" class="rp-row">
                        <div class="rp-row-id">
                            <span class="rp-av"><q-icon name="bi-person-badge" size="18px" /></span>
                            <div>
                                <div class="rp-row-name text-weight-bold">{{ a.name }}</div>
                                <div class="rp-row-sub">{{ a.role }}<template v-if="a.office"> &middot; {{ a.office }}</template></div>
                            </div>
                        </div>
                        <div class="rp-row-meter">
                            <div class="ov-meter-top"><span>resolved on time</span><b :class="complianceClass(a)">{{ a.totalCompleted ? accountComplianceRate(a).toFixed(1) + '%' : '—' }}</b></div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: (a.totalCompleted ? accountComplianceRate(a) : 0) + '%', background: meterColor(accountComplianceRate(a)) }"></div></div>
                        </div>
                        <div class="rp-stats">
                            <div v-for="x in accountStats(a)" :key="x.label" class="rp-s" :class="{ 'rp-s--bad': x.bad }"><b>{{ x.value }}</b><span>{{ x.label }}</span></div>
                        </div>
                    </div>
                </div>
                <div v-if="!accountsSorted.length" class="ov-empty q-ma-md">no admin or workstation accounts found</div>
            </div>
        </div>

        <!-- ========================= CITIZEN SATISFACTION / CSM ========================= -->
        <div v-if="tab === 'csm'">
            <div class="ov-title">satisfaction at a glance</div>
            <div class="ov-kpi-grid q-mb-lg">
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-emoji-smile" size="16px" /> CSM score</div><div class="ov-kpi-value">{{ systemCsmAverage }}</div><div class="ov-kpi-sub">system-wide, target 85%</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-people" size="16px" /> respondents</div><div class="ov-kpi-value">{{ csm.csm.reduce((n, o) => n + o.totalRespondents, 0) }}</div><div class="ov-kpi-sub">CSM reports in {{ year }}</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-arrow-down-circle" size="16px" /> weakest area</div><div class="ov-kpi-value rp-kpi-text">{{ lowestSqdLabel }}</div><div class="ov-kpi-sub">lowest-scoring dimension</div></div>
            </div>

            <div class="ov-title">client satisfaction by office</div>
            <div class="ov-card q-pa-none q-mb-lg">
                <div class="rp-note">The ARTA-mandated Client Satisfaction Measurement (SQD0 to SQD8), collected from the kiosks and from staff entering CSM reports.</div>
                <div class="rp-rows">
                    <div v-for="o in csm.csm" :key="o.officeId" class="rp-row">
                        <div class="rp-row-id">
                            <span class="rc-code rc-code--solid rc-off-code">{{ o.officeAlias || o.officeName }}</span>
                            <div class="rp-row-name">{{ o.officeName }}</div>
                        </div>
                        <div class="rp-row-meter">
                            <div class="ov-meter-top"><span>satisfied</span><b>{{ o.avgSatisfaction != null ? o.avgSatisfaction + '%' : '—' }}</b></div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: (o.avgSatisfaction || 0) + '%', background: csmColor(o.avgSatisfaction) }"></div></div>
                        </div>
                        <div class="rp-stats">
                            <div class="rp-s"><b>{{ o.totalRespondents }}</b><span>respondents</span></div>
                            <div v-for="(v, i) in o.sqdAverages" :key="i" class="rp-s">
                                <b>{{ v ?? '—' }}</b><span>SQD{{ i }}<q-tooltip>{{ csm.sqdLabels[i] }}</q-tooltip></span>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="!csm.csm.length" class="ov-empty q-ma-md">no CSM reports for {{ year }}</div>
            </div>

            <div class="ov-title">feedback and CSM, side by side</div>
            <div class="ov-card q-pa-none q-mb-lg">
                <div class="rp-note">Two scales on purpose: residents rate feedback responses from 1 to 5 stars, and CSM reports use the percentage above.</div>
                <div class="rp-rows">
                    <div v-for="o in csm.comparison" :key="o.officeId" class="rp-row">
                        <div class="rp-row-id">
                            <span class="rc-code rc-code--solid rc-off-code">{{ o.officeAlias || o.officeName }}</span>
                            <div class="rp-row-name">{{ o.officeName }}</div>
                        </div>
                        <div class="rp-stats rp-stats--wide">
                            <div class="rp-s"><b>{{ o.complaintSatisfaction != null ? o.complaintSatisfaction + ' ★' : '—' }}</b><span>feedback</span></div>
                            <div class="rp-s"><b>{{ o.complaintRatingCount }}</b><span>ratings</span></div>
                            <div class="rp-s"><b>{{ o.feedbackSatisfaction != null ? o.feedbackSatisfaction + '%' : '—' }}</b><span>CSM</span></div>
                            <div class="rp-s"><b>{{ o.feedbackCount }}</b><span>reports</span></div>
                        </div>
                    </div>
                </div>
                <div v-if="!csm.comparison.length" class="ov-empty q-ma-md">nothing to compare for {{ year }}</div>
            </div>
        </div>

        <!-- ============================== CIVIC ENGAGEMENT ============================== -->
        <div v-if="tab === 'engagement'">
            <div class="ov-title">engagement at a glance</div>
            <div class="ov-kpi-grid q-mb-lg">
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-collection" size="16px" /> opened</div><div class="ov-kpi-value">{{ discussionTotals.topics + pollTotals.polls }}</div><div class="ov-kpi-sub">discussions and surveys</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-hand-thumbs-up" size="16px" /> engagements</div><div class="ov-kpi-value">{{ discussionTotals.comments + pollTotals.votes }}</div><div class="ov-kpi-sub">comments and survey responses</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-person-dash" size="16px" /> from guests</div><div class="ov-kpi-value">{{ guestSharePct }}%</div><div class="ov-kpi-sub">not signed in</div></div>
                <div class="ov-kpi"><div class="ov-kpi-head"><q-icon name="bi-arrow-repeat" size="16px" /> reopen rate</div><div class="ov-kpi-value">{{ combinedReopenRate }}</div><div class="ov-kpi-sub">discussions and surveys</div></div>
            </div>

            <div class="ov-duo q-mb-md">
                <div class="ov-card">
                    <div class="ov-card-head"><div class="ov-card-title">guests and signed-in residents</div><div class="ov-card-note">comments and responses</div></div>
                    <apexchart v-if="authorMixChartSeries.some(n => n > 0)" type="donut" height="230" :options="authorMixChartOptions" :series="authorMixChartSeries" />
                    <div v-else class="ov-empty">nobody has joined in yet</div>
                </div>
                <div class="ov-card">
                    <div class="ov-card-head"><div class="ov-card-title">most discussed</div><div class="ov-card-note">comments</div></div>
                    <div v-for="(r, i) in topDiscussedRows" :key="r.id" class="ov-step">
                        <div class="ov-step-top"><span class="ov-step-n">{{ i + 1 }}</span><span class="ov-step-label rp-ellip">{{ r.label }}</span><span class="ov-step-count">{{ r.count }}</span></div>
                        <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: r.pct + '%', background: '#DB812C' }"></div></div>
                    </div>
                    <div v-if="!topDiscussedRows.length" class="ov-empty">no comments yet</div>
                </div>
            </div>
            <div class="ov-card q-mb-lg">
                <div class="ov-card-head"><div class="ov-card-title">most answered surveys</div><div class="ov-card-note">responses</div></div>
                <div v-for="(r, i) in topSurveyRows" :key="r.id" class="ov-step">
                    <div class="ov-step-top"><span class="ov-step-n">{{ i + 1 }}</span><span class="ov-step-label rp-ellip">{{ r.label }}</span><span class="ov-step-count">{{ r.count }}</span></div>
                    <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: r.pct + '%', background: '#EEC336' }"></div></div>
                </div>
                <div v-if="!topSurveyRows.length" class="ov-empty">no survey responses yet</div>
            </div>

            <div class="ov-title">by office</div>
            <div class="ov-card q-pa-none q-mb-lg">
                <div class="rp-rows">
                    <div v-for="row in engagementByOffice" :key="row.label" class="rp-row">
                        <div class="rp-row-id"><span class="rp-av"><q-icon name="bi-building" size="18px" /></span><div class="rp-row-name text-weight-bold">{{ row.label }}</div></div>
                        <div class="rp-stats rp-stats--wide">
                            <div class="rp-s"><b>{{ row.discussions }}</b><span>discussions</span></div>
                            <div class="rp-s"><b>{{ row.polls }}</b><span>surveys</span></div>
                        </div>
                    </div>
                </div>
                <div v-if="!engagementByOffice.length" class="ov-empty q-ma-md">nothing is assigned to an office yet</div>
            </div>
        </div>

        <!-- ============================== ACTIVITY LOG ============================== -->
        <div v-if="tab === 'activity'">
            <div class="ov-title">activity log</div>
            <div class="ov-card q-pa-none q-mb-lg">
                <div class="rp-logbar no-print">
                    <div class="rp-note" style="padding: 0; border: 0;">Every internal action in {{ year }}: feedback handling, and the discussion, survey, office, user, holiday, canned message, client account and CSM report administration. Newest first.</div>
                    <div class="row items-center q-col-gutter-sm q-mt-xs">
                        <div class="col">
                            <q-input outlined dense rounded v-model="activitySearch" placeholder="Search description or staff name..." class="rp-search">
                                <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
                            </q-input>
                        </div>
                        <div class="col-auto">
                            <q-select outlined dense rounded emit-value map-options class="rp-search" v-model="activityModule" :options="activityModuleOptions" style="min-width: 180px;" />
                        </div>
                    </div>
                    <div class="rp-count">{{ filteredActivityLog.length }} of {{ activityLog.length }}</div>
                </div>
                <div v-if="filteredActivityLog.length" class="rp-rows rp-rows--scroll">
                    <div v-for="(row, i) in filteredActivityLog" :key="i" class="rp-log">
                        <span class="rp-av"><q-icon :name="MODULE_ICONS[row.module] || 'bi-info-circle'" size="18px" /></span>
                        <div class="col" style="min-width: 0;">
                            <div class="rp-log-t">{{ row.description }}</div>
                            <div class="rp-log-m">{{ row.actorLabel || 'System' }} &middot; {{ formatDateTime(row.createdAt) }}</div>
                        </div>
                        <div class="rp-log-side">
                            <q-badge outline :color="ACTION_COLORS[row.action] || 'grey'" class="text-uppercase">{{ row.action }}</q-badge>
                            <span class="rp-log-mod">{{ moduleLabel(row.module) }}</span>
                        </div>
                    </div>
                </div>
                <div v-else class="ov-empty q-ma-md">no activity recorded for {{ year }}</div>
            </div>
        </div>

        </div>

        <!-- The right rail: what can be done with the report on screen (as in the revapp reports). -->
        <q-card flat class="rc-rail-card no-print">
            <div class="rc-rail-head">
                <div class="text-subtitle1 text-weight-bold text-capitalize">reports</div>
                <div class="text-caption text-grey">make, print or export</div>
            </div>
            <q-separator />
            <div class="rc-rail-body q-pa-md">
                <div class="rp-actions">
                    <button type="button" class="rp-action" :disabled="exporting" @click="exportPdf">
                        <q-spinner-ios v-if="exporting" size="20px" color="primary" />
                        <q-icon v-else name="bi-file-earmark-pdf" size="20px" />
                        <span><b>Export as PDF</b><small>Preview the {{ activeTabTitle }} report for {{ year }} and save it.</small></span>
                    </button>
                    <button type="button" class="rp-action" @click="printPage">
                        <q-icon name="bi-printer" size="20px" />
                        <span><b>Print this page</b><small>Print what is on screen, without the menus.</small></span>
                    </button>
                    <button type="button" class="rp-action" :disabled="loading" @click="loadActiveTab">
                        <q-spinner-ios v-if="loading" size="20px" color="primary" />
                        <q-icon v-else name="bi-arrow-clockwise" size="20px" />
                        <span><b>Refresh the figures</b><small>Reload this section from the latest records.</small></span>
                    </button>
                </div>

                <div class="rc-block q-mt-md" style="margin-bottom: 0;">
                    <div class="rc-block-title">this report</div>
                    <div class="rc-kv">
                        <span>Section</span><span class="text-capitalize">{{ activeTabTitle }}</span>
                        <span>Year</span><span>{{ year }}</span>
                        <span>Prepared</span><span>{{ printedOn }}</span>
                    </div>
                </div>
            </div>
        </q-card>
        </div>

        <!-- Preview, not download: fetch as arraybuffer, wrap in a blob URL, show it in the standard
             preview dialog instead of triggering a save-file. -->
        <PdfPreviewDialog v-model="previewDialog" :src="previewUrl" caption="report" title="report preview" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';
import moment from 'moment';
import { api } from 'src/boot/axios';
import Apexchart from 'vue3-apexcharts';
import { Toast } from 'src/boot/sweetalert';
import PdfPreviewDialog from 'src/components/PdfPreviewDialog.vue';

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

const currentYear = moment().year();
const year = ref(currentYear);
const loading = ref(false);

const tabs = [
    { key: 'summary', label: 'summary', icon: 'bi-grid-1x2' },
    { key: 'performance', label: 'offices', icon: 'bi-building' },
    { key: 'accounts', label: 'accounts', icon: 'bi-person-badge' },
    { key: 'csm', label: 'satisfaction', icon: 'bi-emoji-smile' },
    { key: 'engagement', label: 'engagement', icon: 'bi-chat-dots' },
    { key: 'activity', label: 'activity', icon: 'bi-clock-history' },
];
const tab = ref('summary');
// the full name of the section, for the headings and the printout (the tabs use short names)
const TAB_TITLES = {
    summary: 'summary', performance: 'office performance & compliance', accounts: 'account performance',
    csm: 'citizen satisfaction (CSM)', engagement: 'civic engagement', activity: 'activity log',
};
const activeTabTitle = computed(() => TAB_TITLES[tab.value] || '');
const printedOn = moment().format('MMM DD, YYYY');
const printPage = () => window.print();

/* -------------------- data stores per tab -------------------- */

const summary = ref({ complaint: { kpis: {} }, feedback: { kpis: {} } });
const performance = ref({ data: [], systemReassignmentRate: 0 });
const accountPerformance = ref({ data: [] });
const csm = ref({ csm: [], comparison: [], sqdLabels: [] });
const discussionsRaw = ref([]);
const discussionStats = ref({ reopenRate: null, commentAuthorMix: [] });
const pollsRaw = ref([]);
const pollStats = ref({ reopenRate: null, voteAuthorMix: [] });

const discussionTotals = computed(() => ({
    topics: discussionsRaw.value.length,
    comments: discussionsRaw.value.reduce((s, d) => s + (d.commentCount || 0), 0),
}));
const pollTotals = computed(() => ({
    polls: pollsRaw.value.length,
    votes: pollsRaw.value.reduce((s, p) => s + (p.totalVotes || 0), 0),
}));

// Drives the "at a glance, by module" list — same {volume, engagement, satisfaction/rate}
// columns the table used to have, just reshaped into per-row stat pairs.
const moduleGlance = computed(() => {
    const c = summary.value.complaint;
    const f = summary.value.feedback;
    const sla = c.slaCompliance || {};
    return [
        {
            label: 'Feedback',
            icon: 'bi-chat-quote',
            stats: [
                { label: 'filed', value: c.kpis.totalComplaints ?? 0 },
                { label: 'completed', value: `${completedShare.value}%` },
                { label: 'acknowledged within 1 day', value: sla.ackRate != null ? sla.ackRate + '%' : '—' },
                { label: 'resolved within 3 days', value: sla.resolutionRate != null ? sla.resolutionRate + '%' : '—' },
                { label: 'satisfaction', value: c.kpis.avgSatisfaction != null ? c.kpis.avgSatisfaction + ' ★' : '—' },
            ],
        },
        {
            label: 'CSM report',
            icon: 'bi-emoji-smile',
            stats: [
                { label: 'reports', value: f.kpis.totalFeedback ?? 0 },
                { label: 'from the kiosk', value: f.kpis.kioskCount ?? 0 },
                { label: 'entered by staff', value: f.kpis.manualCount ?? 0 },
                { label: 'satisfaction', value: f.kpis.avgSatisfaction != null ? f.kpis.avgSatisfaction + '%' : '—' },
                { label: 'know the charter', value: f.kpis.charterAwareRate != null ? f.kpis.charterAwareRate + '%' : '—' },
            ],
        },
        {
            label: 'Discussion',
            icon: 'bi-people',
            stats: [
                { label: 'topics', value: discussionTotals.value.topics },
                { label: 'comments', value: discussionTotals.value.comments },
                { label: 'reopened', value: discussionStats.value.reopenRate != null ? discussionStats.value.reopenRate + '%' : '—' },
            ],
        },
        {
            label: 'Survey',
            icon: 'bi-ui-checks',
            stats: [
                { label: 'surveys', value: pollTotals.value.polls },
                { label: 'responses', value: pollTotals.value.votes },
                { label: 'reopened', value: pollStats.value.reopenRate != null ? pollStats.value.reopenRate + '%' : '—' },
            ],
        },
    ];
});

// ---- how feedback was handled (ComplaintController.getAnalytics: process, slaCompliance)
const process_ = computed(() => summary.value.complaint.process || {});
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
const csmColor = (rate) => (rate == null ? '#B8C2D4' : rate >= 85 ? '#21BA45' : rate >= 70 ? '#FFC900' : '#C10015');
const deadlineMeters = computed(() => {
    const sla = summary.value.complaint.slaCompliance || {};
    const filed = pipeline.value.filed;
    const extended = filed ? Math.round(((process_.value.extendedCount || 0) / filed) * 100) : 0;
    return [
        { label: 'acknowledged within 1 day', value: sla.ackRate ?? null, color: meterColor(sla.ackRate), sub: '' },
        { label: 'resolved within 3 days (6 if extended)', value: sla.resolutionRate ?? null, color: meterColor(sla.resolutionRate), sub: '' },
        { label: 'given the 3-day extension', value: extended, color: '#FFC900', sub: `${process_.value.extendedCount || 0} of ${filed} feedback, one extension each` },
    ];
});
const handOverLine = computed(() => {
    const p = process_.value;
    const cancelled = (p.closedWithout?.byCitizen || 0) + (p.closedWithout?.byStaff || 0);
    return `${p.handOvers?.complaints || 0} handed over between offices, ${p.reopenedCount || 0} reopened, ${cancelled} cancelled (${p.closedWithout?.byCitizen || 0} by the resident).`;
});

/* -------------------- summary tab -------------------- */

const overallSatisfaction = computed(() => {
    const cPct = summary.value.complaint.kpis.avgSatisfaction != null ? summary.value.complaint.kpis.avgSatisfaction / 5 * 100 : null;
    const cN = summary.value.complaint.satisfaction?.totalRatings || 0;
    const fPct = summary.value.feedback.kpis.avgSatisfaction ?? null;
    const fN = summary.value.feedback.kpis.totalFeedback || 0;
    const parts = [];
    if (cPct != null && cN > 0) parts.push({ pct: cPct, n: cN });
    if (fPct != null && fN > 0) parts.push({ pct: fPct, n: fN });
    if (!parts.length) return null;
    const totalN = parts.reduce((s, p) => s + p.n, 0);
    return +(parts.reduce((s, p) => s + p.pct * p.n, 0) / totalN).toFixed(1);
});
const overallSatisfactionLabel = computed(() => overallSatisfaction.value != null ? `${Math.round(overallSatisfaction.value)}%` : '—');

const loadSummary = async () => {
    const params = { period: 'year', year: year.value };
    const [complaintRes, feedbackRes] = await Promise.all([
        api.get('/complaint/analytics', { params }),
        api.get('/feedback/analytics', { params }),
    ]);
    summary.value = {
        complaint: complaintRes.data.data || { kpis: {} },
        feedback: feedbackRes.data.data || { kpis: {} },
    };
};

/* -------------------- office performance tab -------------------- */

const performanceSorted = computed(() => [...performance.value.data].sort((a, b) => (b.totalAssigned || 0) - (a.totalAssigned || 0)));
const complianceRate = (o) => o.totalCompleted ? 100 - (o.overdueRate ?? 0) : null;
const officesMeetingCompliance = computed(() => performance.value.data.filter(o => o.totalCompleted && complianceRate(o) >= 80).length);
const officesNeedingAttention = computed(() => performance.value.data.filter(o => o.totalCompleted && complianceRate(o) < 60).length);
const complianceClass = (o) => {
    const rate = complianceRate(o);
    if (rate == null) return 'text-grey';
    if (rate >= 80) return 'text-positive text-weight-bold';
    if (rate >= 60) return 'text-warning text-weight-bold';
    return 'text-negative text-weight-bold';
};

const officeStats = (o) => [
    { label: 'assigned', value: o.totalAssigned },
    { label: 'received', value: o.totalReceived },
    { label: 'completed', value: o.totalCompleted },
    { label: 'ack (h)', value: o.avgAcknowledgmentHours ?? '—' },
    { label: 'resolve (h)', value: o.avgResolutionHours ?? '—' },
    { label: 'AI-routed', value: o.aiAssignedRate != null ? o.aiAssignedRate + '%' : '—' },
    { label: 'feedback', value: o.avgComplaintSatisfaction != null ? o.avgComplaintSatisfaction + ' ★' : '—' },
    { label: 'CSM', value: o.avgFeedbackSatisfaction != null ? o.avgFeedbackSatisfaction + '%' : '—' },
];

const loadPerformance = async () => {
    const response = await api.get('/report/office-performance', { params: { year: year.value } });
    performance.value = response.data || { data: [], systemReassignmentRate: 0 };
};

/* -------------------- account performance tab -------------------- */
// One row per admin/workstation account — distinct from the office scorecard above, which blends
// everyone assigned to that office into one figure. See ReportController.getAccountPerformanceReport.

const accountsSorted = computed(() => [...accountPerformance.value.data].sort((a, b) => (b.totalCompleted || 0) - (a.totalCompleted || 0)));
const accountComplianceRate = (a) => a.totalCompleted ? 100 - (a.overdueRate ?? 0) : null;
const accountsWithCorrections = computed(() => accountPerformance.value.data.filter(a => a.undoneCount > 0).length);
const systemAvgCorrectionRate = computed(() => {
    const withCompletions = accountPerformance.value.data.filter(a => (a.totalCompleted || 0) + (a.undoneCount || 0) > 0);
    if (!withCompletions.length) return null;
    const totalUndone = withCompletions.reduce((s, a) => s + (a.undoneCount || 0), 0);
    const totalDenominator = withCompletions.reduce((s, a) => s + (a.totalCompleted || 0) + (a.undoneCount || 0), 0);
    return totalDenominator ? +(totalUndone / totalDenominator * 100).toFixed(1) : null;
});

const accountStats = (a) => [
    { label: 'received', value: a.totalReceived },
    { label: 'completed', value: a.totalCompleted },
    { label: 'responses', value: a.totalResponses },
    { label: 'ack (h)', value: a.avgAcknowledgmentHours ?? '—' },
    { label: 'resolve (h)', value: a.avgResolutionHours ?? '—' },
    { label: 'satisfaction', value: a.avgSatisfaction != null ? a.avgSatisfaction + ' ★' : '—' },
    { label: '"done" corrected', value: a.correctionRate != null ? `${a.undoneCount} (${a.correctionRate}%)` : String(a.undoneCount), bad: !!a.undoneCount },
];

const loadAccountPerformance = async () => {
    const response = await api.get('/report/account-performance', { params: { year: year.value } });
    accountPerformance.value = response.data || { data: [] };
};

/* -------------------- CSM tab -------------------- */

const systemCsmAverage = computed(() => {
    const withData = csm.value.csm.filter(o => o.totalRespondents > 0);
    if (!withData.length) return '—';
    const totalN = withData.reduce((s, o) => s + o.totalRespondents, 0);
    const weighted = withData.reduce((s, o) => s + o.avgSatisfaction * o.totalRespondents, 0) / totalN;
    return `${weighted.toFixed(1)}%`;
});
const lowestSqdLabel = computed(() => {
    const labels = csm.value.sqdLabels;
    if (!labels.length) return '—';
    const dims = labels.map((label, i) => {
        const values = csm.value.csm.map(o => o.sqdAverages[i]).filter(v => v != null);
        return { label, avg: values.length ? values.reduce((s, v) => s + v, 0) / values.length : null };
    }).filter(d => d.avg != null);
    if (!dims.length) return '—';
    dims.sort((a, b) => a.avg - b.avg);
    return dims[0].label;
});

const loadCsm = async () => {
    const response = await api.get('/report/csm', { params: { year: year.value } });
    csm.value = response.data || { csm: [], comparison: [], sqdLabels: [] };
};

/* -------------------- civic engagement tab -------------------- */

const guestSharePct = computed(() => {
    const dMix = discussionStats.value.commentAuthorMix || [];
    const pMix = pollStats.value.voteAuthorMix || [];
    const guest = (dMix.find(m => m.label === 'Guest')?.count || 0) + (pMix.find(m => m.label === 'Guest')?.count || 0);
    const registered = (dMix.find(m => m.label === 'Registered')?.count || 0) + (pMix.find(m => m.label === 'Registered')?.count || 0);
    const total = guest + registered;
    return total ? Math.round((guest / total) * 100) : 0;
});
const combinedReopenRate = computed(() => {
    const d = discussionStats.value.reopenRate;
    const p = pollStats.value.reopenRate;
    if (d == null && p == null) return '—';
    const parts = [d, p].filter(v => v != null);
    return `${(parts.reduce((s, v) => s + v, 0) / parts.length).toFixed(1)}%`;
});

const authorMixChartSeries = ref([]);
const authorMixChartOptions = ref({
    chart: { type: 'donut' }, labels: [], colors: ['#204888', '#FFC900', '#68AFF1', '#B8C2D4'],
    legend: { position: 'bottom', fontSize: '11px' }, dataLabels: { enabled: false }, stroke: { width: 2 },
    plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Total', fontSize: '12px' } } } } },
});
// the most discussed topics and the most answered surveys, as ranked rows
const rankRows = (list, countKey, labelKey) => {
    const rows = [...list].filter(x => (x[countKey] || 0) > 0).sort((a, b) => b[countKey] - a[countKey]).slice(0, 6);
    const max = rows.length ? rows[0][countKey] : 1;
    return rows.map(x => ({ id: x.id, label: x[labelKey], count: x[countKey], pct: Math.round((x[countKey] / max) * 100) }));
};
const topDiscussedRows = computed(() => rankRows(discussionsRaw.value, 'commentCount', 'title'));
const topSurveyRows = computed(() => rankRows(pollsRaw.value, 'totalVotes', 'question'));
const topDiscussedSeries = ref([{ name: 'Comments', data: [] }]);
const topDiscussedOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true }, colors: [nextChartColor()], xaxis: { categories: [] },
});
const engagementByOffice = computed(() => {
    const byOffice = {};
    discussionsRaw.value.forEach(d => (d.offices || []).forEach(o => {
        const label = o.name;
        if (!byOffice[label]) byOffice[label] = { label, discussions: 0, polls: 0 };
        byOffice[label].discussions += 1;
    }));
    pollsRaw.value.forEach(p => (p.offices || []).forEach(o => {
        const label = o.name;
        if (!byOffice[label]) byOffice[label] = { label, discussions: 0, polls: 0 };
        byOffice[label].polls += 1;
    }));
    return Object.values(byOffice).sort((a, b) => (b.discussions + b.polls) - (a.discussions + a.polls));
});

const applyEngagementCharts = () => {
    const dMix = discussionStats.value.commentAuthorMix || [];
    const pMix = pollStats.value.voteAuthorMix || [];
    const guest = (dMix.find(m => m.label === 'Guest')?.count || 0) + (pMix.find(m => m.label === 'Guest')?.count || 0);
    const registered = (dMix.find(m => m.label === 'Registered')?.count || 0) + (pMix.find(m => m.label === 'Registered')?.count || 0);
    authorMixChartSeries.value = [registered, guest];
    authorMixChartOptions.value = { ...authorMixChartOptions.value, labels: ['Registered', 'Guest'] };

    const topDiscussed = [...discussionsRaw.value]
        .filter(d => d.commentCount > 0)
        .sort((a, b) => b.commentCount - a.commentCount)
        .slice(0, 8);
    topDiscussedSeries.value = [{ name: 'Comments', data: topDiscussed.map(d => d.commentCount) }];
    topDiscussedOptions.value = {
        ...topDiscussedOptions.value,
        xaxis: { ...topDiscussedOptions.value.xaxis, categories: topDiscussed.map(d => (d.title || '').length > 28 ? d.title.slice(0, 28) + '…' : d.title) }
    };
};

const loadEngagement = async () => {
    const params = { period: 'year', year: year.value };
    const [discussionRes, pollRes] = await Promise.all([
        api.get('/discussion', { params }),
        api.get('/poll', { params: { ...params, guestToken: null } }),
    ]);
    discussionsRaw.value = discussionRes.data.data || [];
    discussionStats.value = discussionRes.data.stats || { reopenRate: null, commentAuthorMix: [] };
    pollsRaw.value = pollRes.data.data || [];
    pollStats.value = pollRes.data.stats || { reopenRate: null, voteAuthorMix: [] };
    applyEngagementCharts();
};

/* -------------------- export to PDF -------------------- */
// Builds the exact same values already on screen for the active tab into the plain
// {title, kpis, sections} shape ReportController.exportPdf's Pug template expects — a genuine
// "print what you're looking at", not a second, possibly-drifting derivation server-side.

const exporting = ref(false);
const previewDialog = ref(false);
const previewUrl = ref(null);
const cell = (value, tone) => ({ value: value ?? '—', tone });
const toneFor = (rate) => rate == null ? null : rate >= 80 ? 'good' : rate >= 60 ? 'warn' : 'bad';

const buildExportPayload = () => {
    const meta = `Year ${year.value}`;

    if (tab.value === 'summary') {
        return {
            title: 'Summary Report',
            meta,
            kpis: [
                { label: 'overall citizen satisfaction', value: overallSatisfactionLabel.value },
                { label: 'feedback filed', value: String(summary.value.complaint.kpis.totalComplaints ?? 0) },
                { label: 'CSM reports collected', value: String(summary.value.feedback.kpis.totalFeedback ?? 0) },
                { label: 'discussions opened', value: String(discussionTotals.value.topics) },
                { label: 'surveys created', value: String(pollTotals.value.polls) },
            ],
            sections: [{
                title: `${year.value} at a glance, by module`,
                columns: [{ label: 'module' }, { label: 'volume', num: true }, { label: 'engagement', num: true }, { label: 'satisfaction / rate', num: true }],
                rows: [
                    [cell('Feedback'), cell(`${summary.value.complaint.kpis.totalComplaints ?? 0} filed`), cell(`${summary.value.complaint.kpis.unassignedCount ?? 0} unassigned`), cell(summary.value.complaint.kpis.avgSatisfaction != null ? summary.value.complaint.kpis.avgSatisfaction + ' ★' : '—')],
                    [cell('CSM Report'), cell(`${summary.value.feedback.kpis.totalFeedback ?? 0} responses`), cell(`${summary.value.feedback.kpis.kioskCount ?? 0} via kiosk`), cell(summary.value.feedback.kpis.avgSatisfaction != null ? summary.value.feedback.kpis.avgSatisfaction + '%' : '—')],
                    [cell('Discussion'), cell(`${discussionTotals.value.topics} topics`), cell(`${discussionTotals.value.comments} comments`), cell(discussionStats.value.reopenRate != null ? discussionStats.value.reopenRate + '% reopened' : '—')],
                    [cell('Survey'), cell(`${pollTotals.value.polls} surveys`), cell(`${pollTotals.value.votes} responses`), cell(pollStats.value.reopenRate != null ? pollStats.value.reopenRate + '% reopened' : '—')],
                ]
            }]
        };
    }

    if (tab.value === 'performance') {
        return {
            title: 'Office Performance & Compliance',
            meta,
            kpis: [
                { label: 'system-wide reassignment rate', value: `${performance.value.systemReassignmentRate ?? 0}%` },
                { label: 'offices ≥80% ARTA-compliant', value: String(officesMeetingCompliance.value) },
                { label: 'offices <60% ARTA-compliant', value: String(officesNeedingAttention.value) },
            ],
            sections: [{
                title: `office performance scorecard · ${year.value}`,
                note: 'Assigned/received/completed counts, average ack & resolution time, ARTA/EODB compliance rate, AI auto-assignment rate, and satisfaction on both citizen channels.',
                columns: [
                    { label: 'office' }, { label: 'assigned', num: true }, { label: 'received', num: true }, { label: 'completed', num: true },
                    { label: 'avg ack (h)', num: true }, { label: 'avg resolution (h)', num: true }, { label: 'ARTA compliance', num: true },
                    { label: 'AI-assigned', num: true }, { label: 'feedback sat.', num: true }, { label: 'CSM sat.', num: true }
                ],
                rows: performanceSorted.value.map(o => {
                    const rate = complianceRate(o);
                    return [
                        cell(o.officeAlias || o.officeName), cell(o.totalAssigned), cell(o.totalReceived), cell(o.totalCompleted),
                        cell(o.avgAcknowledgmentHours ?? '—'), cell(o.avgResolutionHours ?? '—'),
                        cell(o.totalCompleted ? rate.toFixed(1) + '%' : '—', o.totalCompleted ? toneFor(rate) : null),
                        cell(o.aiAssignedRate != null ? o.aiAssignedRate + '%' : '—'),
                        cell(o.avgComplaintSatisfaction != null ? o.avgComplaintSatisfaction + ' ★' : '—'),
                        cell(o.avgFeedbackSatisfaction != null ? o.avgFeedbackSatisfaction + '%' : '—'),
                    ];
                })
            }]
        };
    }

    if (tab.value === 'accounts') {
        return {
            title: 'Account Performance',
            meta,
            kpis: [
                { label: 'admin/workstation accounts', value: String(accountPerformance.value.data.length) },
                { label: 'system-wide "done" correction rate', value: systemAvgCorrectionRate.value != null ? `${systemAvgCorrectionRate.value}%` : '—' },
                { label: 'accounts with a corrected "done"', value: String(accountsWithCorrections.value) },
            ],
            sections: [{
                title: `account performance scorecard · ${year.value}`,
                note: 'Received/completed/responded counts and average ack/resolution time are per-account (not per-office); satisfaction is on that account\'s own responses; "done" corrections counts how often a supervisor sent their completion mark back.',
                columns: [
                    { label: 'account' }, { label: 'role' }, { label: 'office' },
                    { label: 'received', num: true }, { label: 'completed', num: true }, { label: 'responses', num: true },
                    { label: 'avg ack (h)', num: true }, { label: 'avg resolution (h)', num: true }, { label: 'ARTA compliance', num: true },
                    { label: 'satisfaction', num: true }, { label: '"done" corrections', num: true }
                ],
                rows: accountsSorted.value.map(a => {
                    const rate = accountComplianceRate(a);
                    return [
                        cell(a.name), cell(a.role), cell(a.office || '—'),
                        cell(a.totalReceived), cell(a.totalCompleted), cell(a.totalResponses),
                        cell(a.avgAcknowledgmentHours ?? '—'), cell(a.avgResolutionHours ?? '—'),
                        cell(a.totalCompleted ? rate.toFixed(1) + '%' : '—', a.totalCompleted ? toneFor(rate) : null),
                        cell(a.avgSatisfaction != null ? a.avgSatisfaction + ' ★' : '—'),
                        cell(a.correctionRate != null ? `${a.undoneCount} (${a.correctionRate}%)` : String(a.undoneCount), a.undoneCount ? 'bad' : null),
                    ];
                })
            }]
        };
    }

    if (tab.value === 'csm') {
        return {
            title: 'Citizen Satisfaction (CSM)',
            meta,
            kpis: [
                { label: 'system-wide CSM score', value: systemCsmAverage.value },
                { label: 'total respondents', value: String(csm.value.csm.reduce((s, o) => s + o.totalRespondents, 0)) },
                { label: 'lowest-scoring dimension', value: lowestSqdLabel.value },
            ],
            sections: [
                {
                    title: `Client Satisfaction Measurement (CSM) by office · ${year.value}`,
                    note: 'The ARTA-mandated 8-dimension CSM survey (SQD0-8), collected via kiosk/manual CSM report entries.',
                    columns: [
                        { label: 'office' }, { label: 'respondents', num: true }, { label: 'overall %', num: true },
                        ...csm.value.sqdLabels.map((_, i) => ({ label: `SQD${i}`, num: true }))
                    ],
                    rows: csm.value.csm.map(o => [
                        cell(o.officeAlias || o.officeName), cell(o.totalRespondents),
                        cell(o.avgSatisfaction != null ? o.avgSatisfaction + '%' : '—'),
                        ...o.sqdAverages.map(v => cell(v ?? '—'))
                    ])
                },
                {
                    title: `Feedback vs. CSM report satisfaction · ${year.value}`,
                    note: 'Two different scales on purpose — feedback responses are rated 1-5 stars by the citizen; CSM reports use the CSM % above.',
                    columns: [{ label: 'office' }, { label: 'feedback satisfaction', num: true }, { label: 'ratings', num: true }, { label: 'CSM satisfaction', num: true }, { label: 'responses', num: true }],
                    rows: csm.value.comparison.map(o => [
                        cell(o.officeAlias || o.officeName),
                        cell(o.complaintSatisfaction != null ? o.complaintSatisfaction + ' ★' : '—'),
                        cell(o.complaintRatingCount), cell(o.feedbackSatisfaction != null ? o.feedbackSatisfaction + '%' : '—'), cell(o.feedbackCount)
                    ])
                }
            ]
        };
    }

    if (tab.value === 'engagement') {
        return {
            title: 'Civic Engagement',
            meta,
            kpis: [
                { label: 'discussions and surveys opened', value: String(discussionTotals.value.topics + pollTotals.value.polls) },
                { label: 'comments and survey responses', value: String(discussionTotals.value.comments + pollTotals.value.votes) },
                { label: 'from guests (not signed in)', value: `${guestSharePct.value}%` },
                { label: 'reopen rate (discussion / survey)', value: combinedReopenRate.value },
            ],
            sections: [{
                title: 'by office · topics assigned',
                columns: [{ label: 'office' }, { label: 'discussions', num: true }, { label: 'surveys', num: true }],
                rows: engagementByOffice.value.map(row => [cell(row.label), cell(row.discussions), cell(row.polls)])
            }]
        };
    }

    // activity log
    return {
        title: 'Activity Log',
        meta,
        kpis: [
            { label: 'total activities logged', value: String(activityLog.value.length) },
        ],
        sections: [{
            title: `internal activity · ${year.value}`,
            note: 'Feedback handling plus Discussion/Survey/Office/User/Holiday/CSM report administration, newest first.',
            columns: [{ label: 'when' }, { label: 'module' }, { label: 'action' }, { label: 'description' }, { label: 'by' }],
            rows: filteredActivityLog.value.map(row => [
                cell(formatDateTime(row.createdAt)), cell(moduleLabel(row.module)), cell(row.action), cell(row.description), cell(row.actorLabel || 'System')
            ])
        }]
    };
};

const exportPdf = async () => {
    exporting.value = true;
    try {
        const payload = buildExportPayload();
        // Preview, not download — matches the Feedback module's rating PDF (FeedbackOfficeComponent.vue's
        // generatePDF): fetch as arraybuffer, wrap it in a blob URL, show it in the dialog's iframe.
        // Any older blob URL is revoked first so switching tabs/years doesn't leak memory.
        const response = await api.post('/report/export-pdf', payload, { responseType: 'arraybuffer' });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        if (previewUrl.value) URL.revokeObjectURL(previewUrl.value.split('#')[0]);
        previewUrl.value = URL.createObjectURL(blob) + '#view=FitW';
        previewDialog.value = true;
    } catch (error) {
        console.error('Error exporting report PDF:', error);
        Toast.fire({ icon: 'error', html: `<div class="text-caption">Unable to export this report to PDF.</div>` });
    } finally {
        exporting.value = false;
    }
};

/* -------------------- activity log tab -------------------- */

// Complaint keeps its own dedicated history table server-side (ComplaintHistory); every other
// module logs into the new shared ActivityLog — see utils/activityLog.js. getActivityLog merges
// both into one feed already sorted newest-first.
const MODULE_ICONS = {
    complaint: 'bi-chat-quote',
    discussion: 'bi-chat-left-text',
    poll: 'bi-ui-checks',
    office: 'bi-building',
    user: 'bi-person-badge',
    holiday: 'bi-calendar-event',
    canned: 'bi-chat-square-text',
    client: 'bi-person-check',
    feedback: 'bi-emoji-expressionless',
};
// Display-only relabel of the raw ComplaintHistory/ActivityLog `module` value ('complaint'/
// 'feedback' — unchanged server-side) to match the Feedback/CSM Report rebrand everywhere this
// gets rendered (the activity log table's own column, plus its PDF/CSV export below).
const MODULE_LABELS = {
    complaint: 'feedback',
    feedback: 'CSM report',
    poll: 'survey',
};
const moduleLabel = (module) => MODULE_LABELS[module] || module;
const ACTION_COLORS = {
    created: 'positive',
    updated: 'primary',
    closed: 'grey',
    reopened: 'positive',
    disabled: 'negative',
    enabled: 'positive',
    reassigned: 'warning',
};
const activityModuleOptions = [
    { label: 'all modules', value: 'all' },
    { label: 'feedback', value: 'complaint' },
    { label: 'discussion', value: 'discussion' },
    { label: 'survey', value: 'poll' },
    { label: 'office', value: 'office' },
    { label: 'user', value: 'user' },
    { label: 'holiday', value: 'holiday' },
    { label: 'canned message', value: 'canned' },
    { label: 'client account', value: 'client' },
    { label: 'CSM report', value: 'feedback' },
];

const activityLog = ref([]);
const activitySearch = ref('');
const activityModule = ref('all');
const formatDateTime = (timestamp) => moment(timestamp).format('MMM DD, YYYY hh:mm A');

const filteredActivityLog = computed(() => {
    const term = activitySearch.value.trim().toLowerCase();
    return activityLog.value.filter(row => {
        if (activityModule.value !== 'all' && row.module !== activityModule.value) return false;
        if (!term) return true;
        return (row.description || '').toLowerCase().includes(term) || (row.actorLabel || '').toLowerCase().includes(term);
    });
});

const loadActivityLog = async () => {
    const response = await api.get('/report/activity-log', { params: { year: year.value } });
    activityLog.value = response.data.data || [];
};

/* -------------------- orchestration -------------------- */

const loadActiveTab = async (opts = {}) => {
    if (!opts?.quiet) loading.value = true;
    try {
        if (tab.value === 'summary') await Promise.all([loadSummary(), loadEngagement()]);
        else if (tab.value === 'performance') await loadPerformance();
        else if (tab.value === 'accounts') await loadAccountPerformance();
        else if (tab.value === 'csm') await loadCsm();
        else if (tab.value === 'engagement') await loadEngagement();
        else if (tab.value === 'activity') await loadActivityLog();
    } catch (error) {
        console.error('Error loading report:', error);
    } finally {
        loading.value = false;
    }
};

const stepYear = (delta) => {
    const next = year.value + delta;
    if (next > currentYear) return;
    year.value = next;
    loadActiveTab();
};

watch(tab, () => loadActiveTab());

// every report summarizes what the modules hold, so any change reloads the tab being looked at (and the activity log)
useLiveRefresh([], () => loadActiveTab({ quiet: true }));

onMounted(() => {
    loadActiveTab();
});
</script>

<style scoped>
.rp-eyebrow {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 2px;
}
.rp-year-group {
    display: inline-flex;
    align-items: center;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px 4px;
    gap: 2px;
}
.rp-year-value {
    min-width: 44px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #16233A;
}
/* the sections of the report: one segmented bar, scrolling sideways rather than wrapping on a narrow screen */
.rp-seg {
    display: flex;
    flex-wrap: nowrap;
    gap: 2px;
    padding: 3px;
    overflow-x: auto;
    scrollbar-width: none;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 10px;
}
.rp-seg::-webkit-scrollbar { display: none; }
.rp-seg-btn {
    flex: 1 1 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 7px 14px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    text-transform: capitalize;
    white-space: nowrap;
    color: #4C5C79;
    cursor: pointer;
}
.rp-seg-btn:hover { background: #E9EFF8; }
.rp-seg-btn--on, .rp-seg-btn--on:hover { background: var(--q-primary); color: #FFFFFF; }

.rp-mods { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.rp-line { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 7px 0; border-top: 1px solid #F0F3F8; font-size: 12.5px; color: #6B7A99; }
.rp-line:first-of-type { border-top: 0; }
.rp-line b { color: #16233A; font-variant-numeric: tabular-nums; }
.rp-kpi-text { font-size: 15px; line-height: 1.3; min-height: 2.6em; }
.rp-ellip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* a scorecard: one row for each office or account, with its meter and its figures */
.rp-note { padding: 14px 18px; border-bottom: 1px solid #EEF2F8; font-size: 12.5px; line-height: 1.5; color: #8493AC; }
.rp-rows--scroll { max-height: 65vh; overflow-y: auto; }
.rp-row {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) minmax(170px, 230px);
    gap: 12px 24px;
    align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid #EEF2F8;
}
.rp-row:last-child { border-bottom: 0; }
.rp-row:hover { background: #F9FBFE; }
.rp-row-id { display: flex; align-items: center; gap: 12px; min-width: 0; }
.rp-row-name { min-width: 0; font-size: 13px; color: #16233A; line-height: 1.3; }
.rp-row-sub { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #8493AC; }
.rp-row-meter { min-width: 0; }
.rp-stats {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
    gap: 6px;
}
.rp-stats--wide { grid-column: auto; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); }
.rp-s { padding: 6px 8px; border-radius: 8px; background: #F6F9FC; text-align: center; }
.rp-s b { display: block; font-size: 13.5px; line-height: 1.2; color: #16233A; font-variant-numeric: tabular-nums; }
.rp-s { min-width: 0; }
.rp-s span { display: block; margin-top: 1px; font-size: 10px; letter-spacing: .03em; text-transform: uppercase; color: #8493AC; overflow-wrap: anywhere; }
.rp-s--bad b { color: #C10015; }
.rp-av { flex: none; width: 36px; height: 36px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; background: rgba(0, 78, 168, .12); color: var(--q-primary); }

/* the activity log */
.rp-logbar { padding: 14px 18px; border-bottom: 1px solid #EEF2F8; }
.rp-search :deep(.q-field__control) { background: #F6F9FC; }
.rp-count { margin-top: 8px; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; color: #8493AC; }
.rp-log { display: flex; align-items: center; gap: 12px; padding: 11px 18px; border-bottom: 1px solid #EEF2F8; }
.rp-log:last-child { border-bottom: 0; }
.rp-log:hover { background: #F9FBFE; }
.rp-log-t { font-size: 13px; color: #16233A; word-break: break-word; }
.rp-log-m { margin-top: 1px; font-size: 11.5px; color: #8493AC; }
.rp-log-side { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: none; }
.rp-log-mod { font-size: 10.5px; letter-spacing: .05em; text-transform: uppercase; color: #8493AC; }
@media (max-width: 700px) {
    .rp-row { grid-template-columns: minmax(0, 1fr); }
}
/* the right rail's report buttons: icon, a title, and a line saying what it does */
.rp-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.rp-action {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    text-align: left;
    font: inherit;
    color: #16233A;
    background: #fff;
    border: 1px solid #DCE4F0;
    border-radius: 12px;
    cursor: pointer;
}
.rp-action > .q-icon,
.rp-action > .q-spinner {
    flex: none;
    color: var(--q-primary);
}
.rp-action b {
    display: block;
    font-size: 13px;
}
.rp-action small {
    display: block;
    margin-top: 2px;
    font-size: 11.5px;
    color: #8493AC;
}
.rp-action:hover:not(:disabled) {
    border-color: var(--q-primary);
    background: #F6F9FC;
}
.rp-action:disabled {
    opacity: .6;
    cursor: default;
}
/* paper only */
.rp-print-head {
    display: none;
}
@media (min-width: 1201px) {
    /* the rail is fixed to the right edge on wide screens, so the header stops short of it */
    .rp-header {
        padding-right: 396px;
    }
}
</style>

<style>
@media print {
    .q-header,
    .q-drawer,
    .q-drawer-container,
    .no-print {
        display: none !important;
    }
    .q-page-container {
        padding: 0 !important;
    }
    .rp-print-head {
        display: block !important;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid #004EA8;
    }
    .rp-print-title {
        font-size: 18px;
        font-weight: 700;
        color: #004EA8;
        text-transform: capitalize;
    }
    .rp-print-sub {
        font-size: 12px;
        color: #6B7A99;
    }
    .rc-shell {
        display: block !important;
    }
    .rp-rows--scroll {
        max-height: none !important;
        overflow: visible !important;
    }
    .rc-block,
    .ov-card,
    .rp-row {
        break-inside: avoid-page;
    }
}
</style>
