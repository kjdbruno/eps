<template>
    <div>
        <div class="cp-shell">
            <div class="cp-main">
                <div class="row items-center justify-between q-mb-md cp-header">
                    <div>
                        <div class="cp-eyebrow">feedback desk &middot; operations overview<template v-if="analyticsScopeLabel"> &middot; {{ analyticsScopeLabel }}</template></div>
                        <div class="text-h5">{{ analyticsRangeLabel || ' ' }}</div>
                    </div>
                    <div class="row items-center q-gutter-sm">
                        <div class="cp-year-group">
                            <q-btn flat dense round size="sm" icon="bi-chevron-left" @click="stepYear(-1)">
                                <q-tooltip>Previous year</q-tooltip>
                            </q-btn>
                            <div class="cp-year-value">{{ analyticsYear }}</div>
                            <q-btn flat dense round size="sm" icon="bi-chevron-right" :disable="analyticsYear >= currentYear" @click="stepYear(1)">
                                <q-tooltip>Next year</q-tooltip>
                            </q-btn>
                        </div>
                        <div class="cp-period-group">
                            <q-btn no-caps unelevated size="sm" label="Week" class="cp-period-btn" :class="analyticsPeriod === 'week' ? 'cp-period-btn--active' : ''" @click="setAnalyticsPeriod('week')" />
                            <q-btn no-caps unelevated size="sm" label="Month" class="cp-period-btn" :class="analyticsPeriod === 'month' ? 'cp-period-btn--active' : ''" @click="setAnalyticsPeriod('month')" />
                            <q-btn no-caps unelevated size="sm" label="Year" class="cp-period-btn" :class="analyticsPeriod === 'year' ? 'cp-period-btn--active' : ''" @click="setAnalyticsPeriod('year')" />
                        </div>
                        <q-btn flat dense round size="sm" icon="bi-arrow-clockwise" :loading="analyticsLoading" @click="loadAnalytics">
                            <q-tooltip>Refresh</q-tooltip>
                        </q-btn>
                    </div>
                </div>

                <!-- Needs attention: what has to be acted on today. The first three open the matching filter of the
                     list on the right; the other two are for the eye (they have no list filter of their own). -->
                <div class="ov-title">needs attention</div>
                <div class="ov-attn-grid q-mb-lg">
                    <div
                        v-if="canViewAll" class="ov-attn ov-attn--click" :class="[attnTone(unassignedCount), { 'ov-attn--on': showUnassignedOnly }]"
                        @click="toggleUnassignedFilter"
                    >
                        <q-icon name="bi-signpost-split" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ unassignedCount }}</div>
                        <div class="ov-attn-label">needs an office</div>
                        <div class="ov-attn-sub">not routed yet</div>
                    </div>
                    <div
                        class="ov-attn ov-attn--click" :class="[attnTone(analyticsKpis.ackOverdueCount), { 'ov-attn--on': showOverdueOnly }]"
                        @click="toggleOverdueFilter"
                    >
                        <q-icon name="bi-bell" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ analyticsKpis.ackOverdueCount ?? 0 }}</div>
                        <div class="ov-attn-label">not acknowledged</div>
                        <div class="ov-attn-sub">past the 1-day mark</div>
                    </div>
                    <div
                        class="ov-attn ov-attn--click" :class="[attnTone(analyticsKpis.resolutionOverdueCount), { 'ov-attn--on': showResolutionOverdueOnly }]"
                        @click="toggleResolutionOverdueFilter"
                    >
                        <q-icon name="bi-hourglass-bottom" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ analyticsKpis.resolutionOverdueCount ?? 0 }}</div>
                        <div class="ov-attn-label">past the deadline</div>
                        <div class="ov-attn-sub">3 days, or 6 if extended</div>
                    </div>
                    <div class="ov-attn" :class="attnTone(flow.dueSoonCount, 'warn')">
                        <q-icon name="bi-clock-history" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ flow.dueSoonCount ?? 0 }}</div>
                        <div class="ov-attn-label">due in 24 hours</div>
                        <div class="ov-attn-sub">consider an extension</div>
                    </div>
                    <div class="ov-attn" :class="attnTone(flow.awaitingApprovalCount, 'info')">
                        <q-icon name="bi-patch-check" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ flow.awaitingApprovalCount ?? 0 }}</div>
                        <div class="ov-attn-label">awaiting approval</div>
                        <div class="ov-attn-sub">offices done, not completed</div>
                    </div>
                </div>

                <!-- How the desk is doing over the period -->
                <div class="ov-title">how it is going</div>
                <div class="ov-kpi-grid q-mb-lg">
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-inbox" size="16px" /> feedback filed</div>
                        <div class="ov-kpi-value">{{ analyticsKpis.totalComplaints ?? 0 }}</div>
                        <div v-if="analyticsTrends.totalComplaints?.pctChange != null" class="ov-trend" :class="analyticsTrends.totalComplaints.pctChange >= 0 ? 'ov-trend--up' : 'ov-trend--down'">
                            <q-icon :name="analyticsTrends.totalComplaints.pctChange >= 0 ? 'bi-arrow-up-short' : 'bi-arrow-down-short'" size="14px" />
                            {{ analyticsTrends.totalComplaints.pctChange >= 0 ? '+' : '' }}{{ analyticsTrends.totalComplaints.pctChange }}% vs {{ analyticsTrends.totalComplaints.label }}
                        </div>
                        <div v-else class="ov-kpi-sub">in {{ analyticsRangeLabel || 'the period' }}</div>
                        <q-tooltip anchor="bottom middle" self="top middle" max-width="280px">
                            Feedback filed within {{ analyticsRangeLabel || 'the selected period' }}. The list on the right isn't period-filtered:
                            it always shows everything assigned to you, so its total can differ.
                        </q-tooltip>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-envelope-check" size="16px" /> time to acknowledge</div>
                        <div class="ov-kpi-value">{{ formatResolutionTime(analyticsKpis.avgAcknowledgementDays) }}</div>
                        <div v-if="analyticsTrends.avgAcknowledgementDays?.pctChange != null" class="ov-trend" :class="analyticsTrends.avgAcknowledgementDays.pctChange <= 0 ? 'ov-trend--up' : 'ov-trend--down'">
                            <q-icon :name="analyticsTrends.avgAcknowledgementDays.pctChange >= 0 ? 'bi-arrow-up-short' : 'bi-arrow-down-short'" size="14px" />
                            {{ analyticsTrends.avgAcknowledgementDays.pctChange >= 0 ? '+' : '' }}{{ analyticsTrends.avgAcknowledgementDays.pctChange }}% vs {{ analyticsTrends.avgAcknowledgementDays.label }}
                        </div>
                        <div class="ov-kpi-sub">target: within 1 day</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-check2-circle" size="16px" /> time to resolve</div>
                        <div class="ov-kpi-value">{{ formatResolutionTime(analyticsKpis.avgResolutionDays) }}</div>
                        <div v-if="analyticsTrends.avgResolutionDays?.pctChange != null" class="ov-trend" :class="analyticsTrends.avgResolutionDays.pctChange <= 0 ? 'ov-trend--up' : 'ov-trend--down'">
                            <q-icon :name="analyticsTrends.avgResolutionDays.pctChange >= 0 ? 'bi-arrow-up-short' : 'bi-arrow-down-short'" size="14px" />
                            {{ analyticsTrends.avgResolutionDays.pctChange >= 0 ? '+' : '' }}{{ analyticsTrends.avgResolutionDays.pctChange }}% vs {{ analyticsTrends.avgResolutionDays.label }}
                        </div>
                        <div class="ov-kpi-sub">target: within 3 days</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-star" size="16px" /> satisfaction</div>
                        <div class="ov-kpi-value">{{ analyticsKpis.avgSatisfaction != null ? analyticsKpis.avgSatisfaction + ' ★' : '—' }}</div>
                        <div class="ov-kpi-sub">{{ satisfaction.totalRatings }} citizen rating{{ satisfaction.totalRatings === 1 ? '' : 's' }}</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-person-check" size="16px" /> time to approve</div>
                        <div class="ov-kpi-value">{{ approvalLagLabel }}</div>
                        <div class="ov-kpi-sub">offices done &rarr; completed</div>
                        <q-tooltip anchor="bottom middle" self="top middle" max-width="260px">
                            Average time from every assigned office marking its part done to a supervisor completing the feedback.
                        </q-tooltip>
                    </div>
                </div>

                <!-- The journey of the feedback filed in the period, and how well the deadlines hold -->
                <div class="ov-title">the process</div>
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
                        <div class="ov-card-foot">Filed &rarr; routed to an office &rarr; acknowledged &rarr; the office marks its part done &rarr; a supervisor completes it.</div>
                    </div>

                    <div class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">deadlines</div>
                            <div class="ov-card-note">1 day to acknowledge &middot; 3 days to resolve</div>
                        </div>
                        <div class="ov-meter-row">
                            <div class="ov-meter-top"><span>acknowledged within 1 day</span><b>{{ slaCompliance.ackRate != null ? slaCompliance.ackRate + '%' : '—' }}</b></div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: (slaCompliance.ackRate ?? 0) + '%', background: meterColor(slaCompliance.ackRate) }"></div></div>
                        </div>
                        <div class="ov-meter-row">
                            <div class="ov-meter-top"><span>resolved within 3 days <i>(6 if extended)</i></span><b>{{ slaCompliance.resolutionRate != null ? slaCompliance.resolutionRate + '%' : '—' }}</b></div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: (slaCompliance.resolutionRate ?? 0) + '%', background: meterColor(slaCompliance.resolutionRate) }"></div></div>
                        </div>
                        <div class="ov-meter-row">
                            <div class="ov-meter-top"><span>given the 3-day extension</span><b>{{ extendedPct }}%</b></div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: extendedPct + '%', background: '#FFC900' }"></div></div>
                            <div class="ov-meter-sub">{{ flow.extendedCount ?? 0 }} of {{ pipeline.filed }} feedback &middot; one extension each, up to day 7</div>
                        </div>
                    </div>
                </div>

                <div class="ov-trio q-mb-lg">
                    <div class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">how it was filed</div>
                            <div class="ov-card-note">{{ pipeline.filed }} in total</div>
                        </div>
                        <apexchart v-if="pipeline.filed" type="donut" height="210" :options="filedHowOptions" :series="filedHowSeries" />
                        <div v-else class="ov-empty">nothing filed in this period</div>
                    </div>

                    <div class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">routing &amp; hand-overs</div>
                        </div>
                        <div class="ov-facts">
                            <div class="ov-fact"><span class="ov-fact-n">{{ routingAccuracy.aiAssignedCount }}</span><span class="ov-fact-l">matched to an office by AI</span></div>
                            <div class="ov-fact"><span class="ov-fact-n">{{ routingAccuracy.adminAssignedCount }}</span><span class="ov-fact-l">assigned by a supervisor</span></div>
                            <div class="ov-fact"><span class="ov-fact-n">{{ handOvers.complaints ?? 0 }}</span><span class="ov-fact-l">handed over by an office</span></div>
                        </div>
                        <div class="ov-meter-row q-mt-md">
                            <div class="ov-meter-top"><span>re-routed at least once</span><b>{{ routingAccuracy.reassignmentRate }}%</b></div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: routingAccuracy.reassignmentRate + '%', background: reassignMeterColor(routingAccuracy.reassignmentRate) }"></div></div>
                            <div class="ov-meter-sub">{{ routingAccuracy.reassignedCount }} of {{ analyticsKpis.totalComplaints ?? 0 }} feedback</div>
                        </div>
                    </div>

                    <div class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">closed &amp; reopened</div>
                        </div>
                        <div class="ov-facts">
                            <div class="ov-fact"><span class="ov-fact-n">{{ closedWithout.byCitizen ?? 0 }}</span><span class="ov-fact-l">cancelled by the citizen</span></div>
                            <div class="ov-fact"><span class="ov-fact-n">{{ closedWithout.byStaff ?? 0 }}</span><span class="ov-fact-l">cancelled by a supervisor</span></div>
                            <div class="ov-fact"><span class="ov-fact-n">{{ flow.reopenedCount ?? 0 }}</span><span class="ov-fact-l">reopened after closing</span></div>
                        </div>
                        <div class="ov-card-foot">A cancelled feedback can be reopened by a supervisor, which starts a fresh 3-day deadline.</div>
                    </div>
                </div>

                <div class="ov-title">trends</div>
                <div class="cp-panel-grid">
                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md cp-panel--wide">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">feedback filed per {{ bucketUnitLabel }}</div>
                        <apexchart type="area" height="220" :options="volumeChartOptions" :series="volumeChartSeries" />
                    </q-card>

                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md">
                        <div class="row items-baseline justify-between q-mb-sm">
                            <div class="text-caption text-uppercase text-grey">how the feedback reads</div>
                            <div class="text-caption text-grey">read by AI when it is filed</div>
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
                        <EmptyState v-else compact icon="bi-emoji-neutral" title="Not read yet" hint="Each feedback is read by AI when it is filed: positive, neutral or negative." />
                        <div v-if="sentimentMix.unread" class="text-caption text-grey q-mt-sm">{{ sentimentMix.unread }} not read yet.
                            <a v-if="isSupervisor" class="text-primary cursor-pointer" @click="readUnread">Read them now</a>
                        </div>
                    </q-card>

                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">feedback by status</div>
                        <apexchart type="bar" height="240" :options="statusChartOptions" :series="statusChartSeries" />
                    </q-card>

                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md" v-if="canViewAll">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">open backlog by office</div>
                        <apexchart type="bar" height="240" :options="backlogChartOptions" :series="backlogChartSeries" />
                    </q-card>

                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md">
                        <div class="row items-baseline justify-between q-mb-sm">
                            <div class="text-caption text-uppercase text-grey">citizen satisfaction</div>
                            <div class="text-caption text-grey" v-if="satisfaction.totalRatings">{{ satisfaction.totalRatings }} rating{{ satisfaction.totalRatings === 1 ? '' : 's' }}</div>
                        </div>
                        <template v-if="satisfaction.totalRatings">
                            <div class="text-h4 text-weight-bold q-mb-sm">{{ satisfaction.avgRating }} <span class="text-body2 text-grey">/ 5</span></div>
                            <apexchart type="bar" height="160" :options="satisfactionChartOptions" :series="satisfactionChartSeries" />
                        </template>
                        <div class="text-caption text-grey text-center q-py-md" v-else>no ratings yet this period</div>
                    </q-card>

                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md cp-panel--full" v-if="canViewAll">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">acknowledgement rate vs. resolution rate, by office</div>
                        <div class="text-caption text-grey q-mb-sm">fast to acknowledge doesn't always mean fast to resolve</div>
                        <apexchart type="bar" height="260" :options="ackResolutionByOfficeOptions" :series="ackResolutionByOfficeSeries" />
                    </q-card>

                    <!-- Every feedback that has a location on file (citizen-filed only — see
                         ComplaintValidator; a staff-filed or pre-geolocation-feature entry has none
                         and just never gets a pin), scoped the same as everything else here
                         (own-office only for workstation). Not period-filtered — "all feedback",
                         same framing as the KPI tile it sits under. -->
                    <q-card flat class="cp-panel custom-border radius-xs q-pa-md cp-panel--full">
                        <div class="row items-center justify-between q-mb-sm">
                            <div class="text-caption text-uppercase text-grey">feedback locations</div>
                            <div class="text-caption text-grey">{{ locationMarkers.length }} pinned</div>
                        </div>
                        <LocationMap :markers="locationMarkers" height="360px" empty-text="No feedback with a location on file yet." />
                    </q-card>
                </div>
            </div>

            <div class="cp-rail">
                <q-card flat class="cp-rail-card">
                    <div class="cp-rail-head">
                        <div class="row items-center justify-between no-wrap q-mb-sm">
                            <div class="row items-baseline q-gutter-xs">
                                <div class="text-h6 text-capitalize">feedback list</div>
                                <div class="text-caption text-grey">{{ complaints.length }} shown of {{ meta.TotalItems || 0 }}</div>
                            </div>
                            <q-btn v-if="isSupervisor" unelevated color="primary" rounded size="sm" label="Add" class="cp-add-btn text-capitalize" @click="createComplaintDialog = true">
                                <q-tooltip>File feedback</q-tooltip>
                            </q-btn>
                        </div>
                        <q-input outlined dense debounce="1000" v-model="filter" placeholder="Search reference no. or content..." class="cp-search q-mb-sm">
                            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
                        </q-input>
                        <div class="row q-gutter-xs q-mb-sm">
                            <q-btn no-caps unelevated rounded size="sm" label="All" class="cp-chip" :class="!anyQuickFilterActive ? 'cp-chip--active' : ''" @click="clearQuickFilters" />
                            <q-btn no-caps unelevated rounded size="sm" label="Unassigned" class="cp-chip" :class="showUnassignedOnly ? 'cp-chip--active' : ''" @click="toggleUnassignedFilter" />
                            <q-btn no-caps unelevated rounded size="sm" label="Ack. overdue" class="cp-chip" :class="showOverdueOnly ? 'cp-chip--active' : ''" @click="toggleOverdueFilter" />
                            <q-btn no-caps unelevated rounded size="sm" label="Resolution overdue" class="cp-chip" :class="showResolutionOverdueOnly ? 'cp-chip--active' : ''" @click="toggleResolutionOverdueFilter" />
                            <q-btn
                                v-for="s in STATUS_QUICK_FILTERS" :key="s.value"
                                no-caps unelevated rounded size="sm" :label="s.label"
                                class="cp-chip" :class="filterStatus === s.value ? 'cp-chip--active' : ''"
                                @click="toggleStatusFilter(s.value)"
                            />
                        </div>
                        <div class="text-caption text-uppercase text-grey q-mb-xs">how it reads</div>
                        <div class="row q-gutter-xs q-mb-sm">
                            <q-btn
                                v-for="s in SENTIMENT_FILTERS" :key="s.value"
                                no-caps unelevated rounded size="sm" :label="s.label"
                                class="cp-chip" :class="filterSentiment === s.value ? 'cp-chip--active' : ''"
                                @click="toggleSentimentFilter(s.value)"
                            />
                        </div>
                        <template v-if="canViewAll">
                            <div class="text-caption text-uppercase text-grey q-mb-xs">office</div>
                            <div class="row q-gutter-xs">
                                <q-btn no-caps unelevated rounded size="sm" label="All" class="cp-chip" :class="!filterOffice.length ? 'cp-chip--active' : ''" @click="clearOfficeFilter" />
                                <q-btn
                                    v-for="o in OptionOffice.filter(o => o.value !== 'all')" :key="o.value"
                                    no-caps unelevated rounded size="sm" :label="o.label"
                                    class="cp-chip" :class="filterOffice.includes(o.value) ? 'cp-chip--active' : ''"
                                    @click="toggleOfficeFilter(o.value)"
                                />
                            </div>
                        </template>
                    </div>
                    <q-separator />
                    <div class="cp-rail-list" ref="railListRef" @scroll="onRailScroll">
                        <div
                            v-for="dt in complaints" :key="dt.id"
                            class="cp-list-item" :class="rowSeverity(dt)"
                            @click="() => { ComplaintStore.dialog = true; getComplaint(dt.id); GenerateRandomAvatar() }"
                        >
                            <div class="row items-center justify-between no-wrap">
                                <div class="text-caption text-weight-bold text-uppercase">{{ dt.referenceNo }}</div>
                                <div class="text-caption text-grey">{{ moment(dt.createdAt).fromNow() }}</div>
                            </div>
                            <div class="text-body2 q-mt-xs">{{ formatName(dt) }}</div>
                            <div class="row items-center q-gutter-xs q-mt-xs">
                                <span class="cp-pill" :style="{ background: (STATUS_PILL[dt.status] || {}).bg, color: (STATUS_PILL[dt.status] || {}).text }">{{ dt.status }}</span>
                                <ImpressionBadge v-if="dt.sentiment" :value="dt.sentiment" :why="dt.sentimentReason || ''" />
                                <span v-if="dt.extensionGrantedAt" class="cp-pill cp-pill--light">extended</span>
                                <span v-if="primaryOfficeLabel(dt)" class="text-caption text-grey">{{ primaryOfficeLabel(dt) }}</span>
                            </div>
                        </div>
                        <div v-if="loading" class="cp-list-empty">
                            <q-spinner-ios size="1.5em" />
                            <div class="text-caption text-uppercase q-mt-sm">loading feedback...</div>
                        </div>
                        <EmptyState
                            v-if="!loading && complaints.length === 0" rail icon="bi-chat-dots" title="No feedback found"
                            hint="Try another search or filter. New feedback shows up here as it is filed."
                        />
                        <div v-if="loadingMore" class="cp-list-load-more">
                            <q-spinner-ios size="1.2em" />
                            <span class="text-caption q-ml-sm">loading more...</span>
                        </div>
                        <div v-if="!loading && !loadingMore && complaints.length > 0 && !hasMoreComplaints" class="cp-list-load-more text-grey">
                            <span class="text-caption">end of list</span>
                        </div>
                    </div>
                    <q-btn
                        v-if="showBackToTop"
                        round unelevated color="primary" icon="bi-arrow-up" size="sm"
                        class="cp-back-to-top" @click="scrollRailToTop"
                    >
                        <q-tooltip>Back to top</q-tooltip>
                    </q-btn>
                </q-card>
            </div>
        </div>
        <q-dialog v-model="ComplaintStore.dialog" persistent class="dialog dialog--wide">
            <q-card>
                <q-card-section class="row items-center no-wrap">
                    <div>
                        <div class="text-caption">feedback information<template v-if="ComplaintStore.details?.via"> &middot; {{ ComplaintStore.details.via }}</template></div>
                        <div class="text-h5 text-uppercase">{{ ComplaintStore.details?.referenceNo || '...' }}</div>
                        <div class="rc-hero-badges">
                            <span class="rc-hero-pill rc-hero-pill--on">{{ ComplaintStore.details?.status }}</span>
                            <ImpressionBadge v-if="ComplaintStore.details?.sentiment" :value="ComplaintStore.details.sentiment" :why="ComplaintStore.details.sentimentReason || ''" />
                            <span v-for="o in displayOffices" :key="o.id" class="rc-hero-pill">{{ o.office?.alias || o.office?.name }}<q-tooltip>{{ o.office?.name }}</q-tooltip></span>
                            <span v-if="ComplaintStore.details?.isAnonymous" class="rc-hero-pill">anonymous</span>
                            <span v-if="ComplaintStore.details?.extensionGrantedAt" class="rc-hero-pill">extended +3 days</span>
                            <span v-if="ComplaintStore.details?.resolutionDeadline" class="rc-hero-pill">due {{ moment(ComplaintStore.details.resolutionDeadline).format('MMM DD, YYYY') }}</span>
                        </div>
                    </div>
                    <q-space />
                    <q-btn unelevated round flat icon="bi-x-circle" v-close-popup />
                </q-card-section>

                <q-card-section class="col rc-split">
                    <aside class="rc-side">
                        <template v-for="(n, i) in navs" :key="n.tab">
                            <div v-if="i === 1" class="rc-side-title">Feedback</div>
                            <button
                                type="button"
                                class="rc-side-item" :class="{ 'rc-side-item--on': activeTab === n.tab }" @click="activeTab = n.tab"
                            >
                                <q-icon :name="n.icon" />
                                <span>{{ n.label }}</span>
                                <b v-if="n.count">{{ n.count }}</b>
                            </button>
                        </template>
                    </aside>
                    <div class="rc-main">
                    <!-- an office that has not received this yet: a card on top of every page (editing a staff-filed one is on the manage page) -->
                    <div v-if="canReceiveHere" class="rc-actions-wrap">
                        <div class="rc-actions">
                            <div class="col" style="min-width: 0;">
                                <div class="rc-actions-cap">actions</div>
                                <div class="rc-actions-desc">{{ detailActionsHint }}</div>
                            </div>
                            <q-btn
                                v-if="canReceiveHere" unelevated rounded no-caps color="primary" icon="bi-inbox"
                                label="Receive" class="btn-1" @click="activeTab = 'responses'"
                            />
                        </div>
                    </div>

                    <template v-if="activeTab == 'details'">
                        <div v-if="ComplaintStore.details?.trailCutAt" class="rc-block rc-cut-note">
                            <div class="rc-open-ico"><q-icon name="bi-box-arrow-right" size="20px" /></div>
                            <div class="col">
                                <div class="rc-open-t">Your office handed this over</div>
                                <div class="rc-open-d">on {{ moment(ComplaintStore.details.trailCutAt).format('MMM DD, YYYY hh:mm A') }}. You see the trail up to that moment; what the other offices do after it is not shown to you.</div>
                            </div>
                        </div>
                        <div class="dv">
                        <!-- the numbers, and the path from filed to done, in one card -->
                        <div class="rc-block dv-top">
                            <div class="rc-block-title">overview</div>
                            <div class="dv-tiles">
                                <div class="rc-tile"><span class="rc-ico rc-ico--blue"><q-icon name="bi-flag" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">status</span><span class="rc-tile-value text-uppercase">{{ ComplaintStore.details?.status }}</span><span class="rc-tile-sub">{{ viaShort }}</span></span></div>
                                <div class="rc-tile"><span class="rc-ico rc-ico--teal"><q-icon name="bi-calendar-check" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">filed</span><span class="rc-tile-value">{{ ComplaintStore.details?.createdAt ? moment(ComplaintStore.details.createdAt).fromNow() : '—' }}</span><span class="rc-tile-sub">{{ ComplaintStore.details?.createdAt ? moment(ComplaintStore.details.createdAt).format('MMM DD, YYYY') : '' }}</span></span></div>
                                <div class="rc-tile" :class="{ 'rc-tile--warn': resolutionTone === 'bad' }"><span class="rc-ico rc-ico--amber"><q-icon name="bi-hourglass-split" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">resolution</span><span class="rc-tile-value">{{ resolutionHeadline }}</span><span class="rc-tile-sub">{{ ComplaintStore.details?.resolutionDeadline ? 'due ' + moment(ComplaintStore.details.resolutionDeadline).format('MMM DD, YYYY') : '' }}{{ ComplaintStore.details?.extensionGrantedAt ? ' · extended' : '' }}</span></span></div>
                                <div class="rc-tile"><span class="rc-ico rc-ico--purple"><q-icon name="bi-diagram-3" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">handled by</span><span class="rc-tile-value">{{ displayOffices.length }} {{ displayOffices.length === 1 ? 'office' : 'offices' }}</span><span class="rc-tile-sub">{{ displayOffices.map(o => o.office?.alias || o.office?.name).join(', ') || 'not assigned yet' }}</span></span></div>
                            </div>
                            <div class="dv-path">
                                <div class="fi-steps">
                                    <div
                                        v-for="st in progressSteps" :key="st.label" class="fi-step"
                                        :class="{ 'fi-step--done': st.state === 'done', 'fi-step--now': st.state === 'now', 'fi-step--bad': st.state === 'bad' }"
                                    >
                                        <span class="fi-dot"><q-icon :name="st.state === 'done' ? 'bi-check-lg' : (st.state === 'bad' ? 'bi-x-lg' : st.icon)" size="14px" /></span>
                                        <span class="fi-lbl">{{ st.label }}</span>
                                    </div>
                                </div>
                                <div class="dv-remark" v-if="ComplaintStore.details?.remarks">
                                    <q-icon name="bi-chat-square-text-fill" size="14px" />
                                    <span>{{ ComplaintStore.details.remarks }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="dv-cols">
                            <!-- what was reported, by whom, and the photos that came with it -->
                            <div class="dv-col">
                                <div class="rc-block dv-report">
                                    <div class="row items-center no-wrap q-mb-sm">
                                        <q-avatar size="40px"><img :src="randomAvatar" /></q-avatar>
                                        <div class="q-ml-sm">
                                            <div class="text-weight-bold text-capitalize">{{ ComplaintStore.details.isAnonymous ? 'Anonymous' : formatName(ComplaintStore.details) }}</div>
                                            <div class="text-caption text-grey">{{ filedLine }}</div>
                                        </div>
                                    </div>
                                    <read-more v-if="ComplaintStore.details.content" :rows="4" moreText="See More" lessText="See Less">
                                        {{ ComplaintStore.details.content }}
                                    </read-more>
                                    <div class="text-caption text-grey" v-else>No description was left.</div>

                                    <div class="rc-block-title dv-sub">photos<span class="rc-count">{{ ComplaintStore.details?.complaintFiles?.length || 0 }}</span></div>
                                    <div v-if="ComplaintStore.details?.complaintFiles?.length" class="rc-photos rc-photos--three">
                                        <button
                                            v-for="(f, i) in ComplaintStore.details.complaintFiles.slice(0, 3)" :key="f.id" type="button" class="rc-photo"
                                            @click="openGallery(photoUrls, i)"
                                        >
                                            <img :src="FormatFile(f)" :alt="f.filename || 'photo'" loading="lazy" />
                                            <span v-if="i === 2 && photoMore > 0" class="rc-photo-more">+{{ photoMore }} more</span>
                                            <span v-else class="rc-photo-zoom"><q-icon name="bi-arrows-angle-expand" size="14px" /></span>
                                        </button>
                                    </div>
                                    <div v-else class="dv-none"><q-icon name="bi-image" size="16px" /> No photo was attached to this feedback.</div>
                                </div>

                                <!-- Only for a citizen-filed complaint that actually captured one (see
                                     ComplaintValidator) — a staff-filed or pre-feature entry has none,
                                     so this section just doesn't render rather than showing an empty map. -->
                                <div class="rc-block" v-if="detailLocationMarkers.length">
                                    <div class="rc-block-title">location</div>
                                    <LocationMap :markers="detailLocationMarkers" height="220px" />
                                </div>
                            </div>

                            <!-- the dates and deadlines, one line each -->
                            <div class="dv-col">
                                <div class="rc-block dv-details">
                                    <div class="rc-block-title">details</div>
                                    <div class="rc-facts">
                                        <div v-for="row in detailRows" :key="row.label" class="rc-fact dv-fact">
                                            <span class="rc-ico" :class="`rc-ico--${row.tone}`"><q-icon :name="row.icon" size="16px" /></span>
                                            <span class="rc-fact-text"><span class="rc-fact-label">{{ row.label }}</span><span class="rc-fact-value">{{ row.value }}</span></span>
                                            <q-space />
                                            <span v-if="row.pill" class="rc-pill" :class="`rc-pill--${row.pill.tone}`">{{ row.pill.text }}<q-tooltip v-if="row.pill.tip">{{ row.pill.tip }}</q-tooltip></span>
                                            <q-tooltip v-else-if="row.tip">{{ row.tip }}</q-tooltip>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- who is handling it -->
                        <div class="rc-block dv-handled">
                            <div class="rc-block-title">handled by<span class="rc-count">{{ displayOffices.length }}</span></div>
                            <div v-if="displayOffices.length" class="dv-offs">
                                <div v-for="co in displayOffices" :key="co.id" class="dv-off" :class="{ 'dv-off--off': !co.isActive }">
                                    <div class="dv-off-top">
                                        <span class="rc-code rc-code--solid rc-off-code">{{ co.office?.alias || co.office?.name }}</span>
                                        <q-space /><span class="dv-off-name">{{ co.office?.name }}</span>
                                        <span v-if="!co.isActive" class="rc-pill rc-pill--off">disabled</span>
                                        <span class="rc-pill" :class="`rc-pill--${officeTone(co)}`">{{ co.status }}</span>
                                    </div>
                                    <div v-if="complianceLabel(co)" class="dv-line" :class="`dv-line--${ackTone(co)}`">
                                        <q-icon :name="ACK_ICON[ackTone(co)]" size="14px" />
                                        <span class="dv-line-t">{{ complianceLabel(co) }}</span>
                                        <span v-if="co.receivedAt" class="dv-line-at">{{ moment(co.receivedAt).format('MMM DD, hh:mm A') }}</span>
                                        <q-tooltip>{{ complianceTooltip(co) }}</q-tooltip>
                                    </div>
                                    <div v-if="co.completedAt" class="dv-line dv-line--plain">
                                        <q-icon name="bi-flag" size="14px" />
                                        <span class="dv-line-t">{{ co.status === 'cancelled' ? 'Cancelled' : 'Marked done' }}</span>
                                        <span class="dv-line-at">{{ moment(co.completedAt).format('MMM DD, hh:mm A') }}</span>
                                    </div>
                                    <div class="rc-off-why">
                                        <q-icon :name="co.assignedBy === 'ai' ? 'bi-robot' : 'bi-person-check'" size="13px" />
                                        <span>{{ co.assignmentReason || (co.assignedBy === 'admin' ? 'Assigned manually, no note left.' : 'No reason on record.') }}</span>
                                    </div>
                                    <q-btn
                                        v-if="isSupervisor && co.status === 'completed' && !isTerminal"
                                        unelevated no-caps outline size="xs" label="undone" color="warning" class="q-mt-sm"
                                        :loading="sendBackLoading === co.id" @click="confirmSendBack(co)"
                                    >
                                        <q-tooltip>Not actually done? Mark undone</q-tooltip>
                                    </q-btn>
                                </div>
                            </div>
                            <div v-else class="rc-empty rc-empty--sm">
                                <q-icon name="bi-diagram-3" size="28px" />
                                <div class="rc-empty-t">Not assigned yet</div>
                            </div>
                        </div>
                        </div>
                    </template>

                    <div class="rc-page" :class="`rc-page--${activeTab}`">
                            <!-- the Activity tab: the overview of the activity in the main column, the trail in the right-hand panel
                                 (the same page as the conversation and manage tabs) -->
                            <div v-if="activeTab == 'history'" class="rc-pg-main">
                                <template v-if="ComplaintStore.details?.history?.length">
                                    <div class="rc-block">
                                        <div class="rc-block-title">activity overview</div>
                                        <div class="dv-tiles">
                                            <div class="rc-tile"><span class="rc-ico rc-ico--blue"><q-icon name="bi-clock-history" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">entries</span><span class="rc-tile-value">{{ activityStats.entries }}</span><span class="rc-tile-sub">{{ activityStats.people }} {{ activityStats.people === 1 ? 'person' : 'people' }} took part</span></span></div>
                                            <div class="rc-tile"><span class="rc-ico rc-ico--teal"><q-icon name="bi-hourglass-split" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">{{ isTerminal ? 'took' : 'open for' }}</span><span class="rc-tile-value">{{ activityStats.span }}</span><span class="rc-tile-sub">{{ activityStats.spanSub }}</span></span></div>
                                            <div class="rc-tile"><span class="rc-ico rc-ico--amber"><q-icon name="bi-arrow-repeat" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">last update</span><span class="rc-tile-value">{{ activityStats.last }}</span><span class="rc-tile-sub">{{ activityStats.lastSub }}</span></span></div>
                                            <div class="rc-tile"><span class="rc-ico rc-ico--red"><q-icon name="bi-chat-dots" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">responses</span><span class="rc-tile-value">{{ activityStats.responses }}</span><span class="rc-tile-sub">{{ activityStats.fromOffices }} from offices · {{ activityStats.fromCitizen }} from the citizen</span></span></div>
                                        </div>
                                    </div>

                                    <div class="rc-block">
                                        <div class="rc-block-title">what happened<span class="rc-count">{{ activityBreakdown.length }} kinds</span></div>
                                        <div v-for="b in activityBreakdown" :key="b.label" class="ov-step av-kind">
                                            <div class="ov-step-top">
                                                <span class="av-kind-ico" :style="{ background: b.hex }"><q-icon :name="b.icon" size="12px" /></span>
                                                <span class="ov-step-label">{{ b.label }}</span>
                                                <span class="ov-step-count">{{ b.count }}</span>
                                                <span class="ov-step-pct">{{ b.pct }}%</span>
                                            </div>
                                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: b.pct + '%', background: b.hex }"></div></div>
                                        </div>
                                    </div>

                                    <div class="av-pair">
                                        <div class="rc-block">
                                            <div class="rc-block-title">how it moved</div>
                                            <div class="av-steps">
                                                <div v-for="m in milestones" :key="m.label" class="av-step" :class="{ 'av-step--todo': !m.at }">
                                                    <span class="av-step-dot"><q-icon :name="m.icon" size="14px" /></span>
                                                    <span class="av-step-text">
                                                        <span class="av-step-label">{{ m.label }}</span>
                                                        <span class="av-step-at">{{ m.at ? formatHistoryDate(m.at) : 'not yet' }}</span>
                                                    </span>
                                                    <span v-if="m.gap" class="rc-pill rc-pill--off">{{ m.gap }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="rc-block">
                                            <div class="rc-block-title">who took part<span class="rc-count">{{ activityActors.length }}</span></div>
                                            <div class="av-actors">
                                                <div v-for="a in activityActors" :key="a.label" class="av-actor">
                                                    <span class="av-avatar">{{ a.initials }}</span>
                                                    <span class="av-actor-text">
                                                        <span class="av-actor-name">{{ a.label }}</span>
                                                        <span class="av-actor-sub">{{ a.role }}{{ a.role ? ' · ' : '' }}last {{ moment(a.last).fromNow() }}</span>
                                                    </span>
                                                    <span class="av-actor-n">{{ a.count }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                                <div v-else class="rc-block">
                                    <div class="rc-empty">
                                        <q-icon name="bi-clock-history" size="36px" />
                                        <div class="rc-empty-t">No activity yet</div>
                                        <div class="rc-empty-d">Every step taken on this feedback is listed here.</div>
                                    </div>
                                </div>
                            </div>
                            <div v-if="activeTab == 'history' && ComplaintStore.details?.history?.length" class="rc-pg-side">
                                <div class="rc-panel">
                                    <div class="rc-cap av-cap">trail &middot; latest first<span class="rc-count">{{ ComplaintStore.details.history.length }}</span></div>
                                    <div class="av-trail-list">
                                        <div v-for="g in trailDays" :key="g.day" class="av-group">
                                            <div class="av-day">{{ g.day }}</div>
                                            <div v-for="e in g.entries" :key="e.id" class="av-ev">
                                                <span class="av-ev-dot" :style="{ background: TONE_HEX[e.kind.tone] }"><q-icon :name="e.kind.icon" size="12px" /></span>
                                                <div class="av-ev-body">
                                                    <div class="av-ev-head"><b>{{ e.kind.label }}</b><span>{{ e.time }}</span></div>
                                                    <div class="av-ev-desc">{{ e.description }}</div>
                                                    <div v-if="e.showActor" class="av-ev-who">{{ e.actorLabel }}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div v-if="activeTab == 'manage' && canManage" class="rc-pg-head">
                                <!-- step 1: what to do -->
                                <div v-if="!manageType">
                                    <div class="wz-title">What would you like to do with this feedback?</div>
                                    <div class="wz-sub">Every change is logged under Activity, with who made it and when.</div>
                                    <div class="wz-types">
                                        <div
                                            v-for="t in manageTypes" :key="t.value"
                                            class="wz-type" :class="{ 'wz-type--disabled': !t.enabled }"
                                            @click="t.enabled && chooseManageType(t.value)"
                                        >
                                            <div class="wz-type-icon" :style="{ background: t.bg, color: t.color }"><q-icon :name="t.icon" size="20px" /></div>
                                            <div class="col">
                                                <div class="wz-type-title">{{ t.label }}</div>
                                                <div class="wz-type-hint">{{ t.enabled ? t.hint : t.reason }}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- step 2: the details of the chosen one, with where things stand now -->
                                <template v-else>
                                    <div class="wz-action" :style="{ '--wz-bg': manageMeta?.bg, '--wz-fg': manageMeta?.color }">
                                        <div class="wz-action-icon"><q-icon :name="manageMeta?.icon" size="24px" /></div>
                                        <div class="col" style="min-width: 0;">
                                            <div class="wz-action-eyebrow">you are about to</div>
                                            <div class="wz-action-title">{{ manageMeta?.label }}</div>
                                            <div class="wz-action-hint">{{ manageMeta?.hint }}</div>
                                        </div>
                                        <span class="wz-action-now">now {{ ComplaintStore.details?.status }}</span>
                                    </div>
                                </template>
                            </div>
                            <div v-if="activeTab == 'responses' || (activeTab == 'manage' && canManage && manageType)" class="rc-pg-main">
                            <q-card-section v-if="activeTab == 'responses'" class="rc-block rc-m-thread">
                                <!-- Citizen satisfaction — the average of the stars the complainant left on each
                                     office's responses in THIS complaint, plus the count. Updates live: the
                                     backend emits 'complaints:changed' on every rating (see the socket handler
                                     in onMounted), which re-fetches this open modal. -->
                                <div class="row q-gutter-sm q-mb-md" v-if="officeSatisfaction.length">
                                    <q-card flat bordered class="radius-sm q-pa-sm col-auto" v-for="os in officeSatisfaction" :key="os.label">
                                        <div class="text-caption text-uppercase text-grey">{{ os.label }} &middot; satisfaction</div>
                                        <div class="row items-center q-gutter-xs">
                                            <div class="text-h6 text-weight-bold">{{ os.avg.toFixed(1) }}</div>
                                            <q-rating :model-value="os.avg" readonly size="1.1em" color="amber" icon="bi-star" icon-selected="bi-star-fill" icon-half="bi-star-half" />
                                            <div class="text-caption text-grey">({{ os.count }} rated)</div>
                                        </div>
                                    </q-card>
                                </div>

                                <div class="rc-block-title">responses &middot; latest first<span class="rc-count">{{ sortedResponses.length }}</span></div>
                                <div class="response-list-scroll" v-if="sortedResponses.length">
                                    <q-list class="rc-thread">
                                        <q-item v-for="r in sortedResponses" :key="r.id">
                                            <q-item-section avatar top>
                                                <q-avatar size="40px" :color="r.user?.avatar ? undefined : 'primary'" text-color="white">
                                                    <img v-if="r.user?.avatar" :src="formatAvatar(r.user)" />
                                                    <template v-else>{{ responderInitials(r) }}</template>
                                                </q-avatar>
                                            </q-item-section>
                                            <q-item-section>
                                                <div class="row items-center q-gutter-xs q-mb-xs">
                                                    <div class="text-weight-bold text-capitalize">{{ responderName(r) }}</div>
                                                    <q-badge color="primary" class="text-uppercase">{{ responseDepartment(r) }}</q-badge>
                                                    <div class="text-caption text-grey">{{ formatHistoryDate(r.createdAt) }}</div>
                                                </div>
                                                <div class="text-body2 rc-msg">{{ r.content }}</div>
                                                <div class="row q-gutter-sm q-mt-sm" v-if="r.responseFiles?.length">
                                                    <template v-for="f in r.responseFiles" :key="f.id">
                                                        <q-img
                                                            v-if="!isResponsePdf(f)"
                                                            :src="f.file"
                                                            class="response-evidence-thumb radius-xs cursor-pointer"
                                                            fit="cover"
                                                            @click="openGallery(responsePhotoUrls(r), responsePhotoUrls(r).indexOf(f.file))"
                                                        />
                                                        <q-btn
                                                            v-else
                                                            outline dense no-caps size="sm" color="primary" icon="bi-file-earmark-pdf" :label="f.filename"
                                                            :href="f.file" target="_blank"
                                                        />
                                                    </template>
                                                </div>
                                                <!-- Per-response rating the complainant left (read-only for staff). -->
                                                <div class="row items-center q-gutter-xs q-mt-sm" v-if="canBeRated(r)">
                                                    <span class="text-caption text-grey">citizen rating:</span>
                                                    <template v-if="responseRating(r)">
                                                        <q-rating :model-value="responseRating(r)" readonly size="1.1em" color="amber" icon="bi-star" icon-selected="bi-star-fill" />
                                                        <span class="text-caption text-grey">{{ responseRating(r) }}/5</span>
                                                    </template>
                                                    <span class="text-caption text-grey" v-else>not rated yet</span>
                                                </div>
                                            </q-item-section>
                                        </q-item>
                                    </q-list>
                                </div>
                                <div v-else class="rc-empty">
                                    <q-icon name="bi-chat-dots" size="36px" />
                                    <div class="rc-empty-t">No responses yet</div>
                                    <div class="rc-empty-d">Replies from the offices and the citizen will show up here.</div>
                                </div>
                            </q-card-section>
                            <!-- The resolution time: 1 day to acknowledge and 3 days to resolve, and ONE 3-day extension the
                                 office handling the feedback (or a super/admin) can ask for. -->
                            <q-card-section v-if="(activeTab == 'manage' && canManage && manageType === 'extension')" class="rc-block rc-m-res">
                                <div class="rc-block-title">resolution time</div>
                                <div v-if="!ComplaintStore.details?.resolutionDeadline" class="rc-empty rc-empty--sm">
                                    <q-icon name="bi-hourglass" size="28px" />
                                    <div class="rc-empty-t">The clock has not started</div>
                                    <div class="rc-empty-d">It starts when this feedback is routed to an office: 1 day to acknowledge it, 3 more to resolve it.</div>
                                </div>
                                <template v-else>
                                    <div class="rc-clock" :class="{ 'rc-clock--late': resolutionOverdue }">
                                        <div class="rc-clock-big">{{ moment(ComplaintStore.details.resolutionDeadline).fromNow(true) }}<small>{{ resolutionOverdue ? 'overdue' : 'left' }}</small></div>
                                        <div class="rc-clock-sub">
                                            Due {{ moment(ComplaintStore.details.resolutionDeadline).format('MMM DD, YYYY hh:mm A') }}
                                            <span v-if="ComplaintStore.details.extensionGrantedAt" class="rc-clock-flag">extended +3 days</span>
                                        </div>
                                        <div class="rc-bar"><span :style="{ width: resolutionPct + '%' }" /></div>
                                    </div>

                                    <div class="rc-track">
                                        <div v-for="st in resolutionStops" :key="st.key" class="rc-stop" :class="{ 'rc-stop--past': st.past, 'rc-stop--opt': st.optional }">
                                            <span class="rc-stop-dot"><q-icon :name="st.past ? 'bi-check-lg' : st.icon" size="13px" /></span>
                                            <div class="rc-stop-l">{{ st.label }}</div>
                                            <div class="rc-stop-d">{{ st.date }}</div>
                                        </div>
                                    </div>

                                    <div class="rc-checks rc-checks--tight">
                                        <div v-for="c in extensionChecks" :key="c.key" class="rc-check" :class="c.ok ? 'rc-check--ok' : 'rc-check--bad'">
                                            <q-icon :name="c.ok ? 'bi-check-circle-fill' : 'bi-x-circle-fill'" size="20px" />
                                            <div class="col" style="min-width: 0;">
                                                <div class="rc-check-t">{{ c.title }}</div>
                                                <div class="rc-check-d">{{ c.detail }}</div>
                                            </div>
                                            <span class="rc-check-tag">{{ c.ok ? 'ok' : 'blocked' }}</span>
                                        </div>
                                    </div>
                                </template>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'manage' && canEditStaffFiled && manageType === 'edit'" class="rc-block">
                                <div class="rc-block-title">on file now</div>
                                <div class="rc-facts">
                                    <div class="rc-fact rc-fact--top">
                                        <span class="rc-ico rc-ico--blue"><q-icon name="bi-card-text" size="16px" /></span>
                                        <span class="rc-fact-text"><span class="rc-fact-label">description</span><span class="rc-fact-value rc-fact-value--wrap">{{ ComplaintStore.details?.content || 'No description was left.' }}</span></span>
                                    </div>
                                    <div class="rc-fact">
                                        <span class="rc-ico rc-ico--purple"><q-icon name="bi-person" size="16px" /></span>
                                        <span class="rc-fact-text"><span class="rc-fact-label">filed for</span><span class="rc-fact-value text-capitalize">{{ filedForName }}</span></span>
                                    </div>
                                    <div class="rc-fact">
                                        <span class="rc-ico rc-ico--red"><q-icon name="bi-envelope" size="16px" /></span>
                                        <span class="rc-fact-text"><span class="rc-fact-label">email</span><span class="rc-fact-value">{{ filedForEmail || 'Not given' }}</span></span>
                                    </div>
                                    <div class="rc-fact">
                                        <span class="rc-ico rc-ico--teal"><q-icon name="bi-telephone" size="16px" /></span>
                                        <span class="rc-fact-text"><span class="rc-fact-label">contact no.</span><span class="rc-fact-value">{{ filedForPhone || 'Not given' }}</span></span>
                                    </div>
                                    <div class="rc-fact">
                                        <span class="rc-ico rc-ico--amber"><q-icon name="bi-image" size="16px" /></span>
                                        <span class="rc-fact-text"><span class="rc-fact-label">photos</span><span class="rc-fact-value">{{ ComplaintStore.details?.complaintFiles?.length || 0 }} attached</span></span>
                                    </div>
                                </div>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'manage' && canEditStaffFiled && manageType === 'edit'" class="rc-block rc-open-note">
                                <div class="rc-open-ico"><q-icon name="bi-unlock" size="20px" /></div>
                                <div class="col">
                                    <div class="rc-open-t">Editing is open</div>
                                    <div class="rc-open-d">It stays open until one of the assigned offices acknowledges the feedback; after that it is locked, so nobody works from a version that then changes.</div>
                                    <div class="rc-check-codes">
                                        <span v-for="co in activeOffices" :key="co.id" class="rc-code rc-code--bad">{{ co.office?.alias || co.office?.name }}<q-icon name="bi-hourglass-split" size="11px" class="q-ml-xs" /></span>
                                        <span v-if="!activeOffices.length" class="text-caption text-grey">No office is assigned yet.</span>
                                    </div>
                                </div>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'manage' && isSupervisor && manageType === 'assign'" class="rc-block rc-m-assign">
                                <div class="rc-block-title">assignment</div>
                                <EmptyState v-if="isTerminal" compact icon="bi-lock" title="Reassignment is locked" hint="This feedback is already finalized." />
                                <template v-else>
                                        <!-- every office as its code: hover for the name -->
                                        <div class="rc-assign-main">
                                            <div class="row items-center no-wrap q-mb-sm">
                                                <div class="col">
                                                    <div class="rc-cap" style="margin-bottom: 2px;">offices</div>
                                                    <div class="rc-assign-sub">Pick every office that should handle this. Hover a code to see the name.</div>
                                                </div>
                                                <q-btn
                                                    unelevated no-caps rounded size="sm" color="primary" icon="bi-stars" label="Suggest"
                                                    :loading="suggestLoading" @click="loadSuggestions"
                                                >
                                                    <q-tooltip>Help me decide with AI</q-tooltip>
                                                </q-btn>
                                            </div>
                                            <div class="text-caption text-grey q-mb-sm" v-if="suggestionsChecked && !suggestions.length">
                                                No confident suggestion — the AI couldn't match this feedback to any office's mandate.
                                            </div>
                                            <div class="rc-codes">
                                                <button
                                                    v-for="o in filteredOffice.filter(o => o.value !== 'all')" :key="o.value" type="button"
                                                    class="rc-codepill" :class="{ 'rc-codepill--on': selectedOfficeIds.includes(o.value) }"
                                                    @click="toggleOffice(o.value)"
                                                >
                                                    <q-icon v-if="selectedOfficeIds.includes(o.value)" name="bi-check-lg" size="13px" />
                                                    <span>{{ o.label }}</span>
                                                    <q-icon v-if="suggestedOfficeIds.has(o.value)" name="bi-stars" size="12px" class="rc-codepill-ai" />
                                                    <q-tooltip>{{ o.name }}<template v-if="suggestedOfficeIds.has(o.value)"> · AI-suggested</template></q-tooltip>
                                                </button>
                                            </div>
                                        </div>

                                </template>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'manage' && !isSupervisor && manageType === 'handoff'" class="rc-block">
                                <div class="rc-block-title">hand it over to</div>
                                <div class="rc-assign-sub q-mb-md">Pick the offices that should take it on. Hover a code to see the name.</div>
                                <div class="rc-codes">
                                    <button
                                        v-for="o in handoffOffices" :key="o.value" type="button"
                                        class="rc-codepill" :class="{ 'rc-codepill--on': handoffIds.includes(o.value) }"
                                        @click="toggleHandoff(o.value)"
                                    >
                                        <q-icon v-if="handoffIds.includes(o.value)" name="bi-check-lg" size="13px" />
                                        <span>{{ o.label }}</span>
                                        <q-tooltip>{{ o.name }}</q-tooltip>
                                    </button>
                                </div>
                                <div class="rc-block-title q-mt-lg">what happens</div>
                                <div class="rc-effects">
                                    <div class="rc-effect rc-effect--bad">
                                        <span class="rc-ico rc-ico--red"><q-icon name="bi-box-arrow-right" size="17px" /></span>
                                        <div><b>Your office steps out</b><span>You see this feedback only up to the moment you hand it over. What the other offices do afterwards is not shown to you, and you can no longer respond to it.</span></div>
                                    </div>
                                    <div class="rc-effect">
                                        <span class="rc-ico rc-ico--blue"><q-icon name="bi-diagram-3" size="17px" /></span>
                                        <div><b>They see it from the start</b><span>The offices you choose see everything: the filing, what was done so far, and your handover with its reason.</span></div>
                                    </div>
                                    <div class="rc-effect">
                                        <span class="rc-ico rc-ico--teal"><q-icon name="bi-clock-history" size="17px" /></span>
                                        <div><b>It is logged</b><span>Activity records that {{ myOfficeCode }} handed it over, to whom, and why.</span></div>
                                    </div>
                                </div>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'manage' && !isSupervisor && manageType === 'done'" class="rc-block">
                                <div class="rc-block-title">before you mark it done<span class="rc-count">{{ doneChecks.filter(c => c.ok).length }} / {{ doneChecks.length }}</span></div>
                                <div class="rc-checks">
                                    <div v-for="c in doneChecks" :key="c.key" class="rc-check" :class="c.ok ? 'rc-check--ok' : (c.block ? 'rc-check--bad' : 'rc-check--warn')">
                                        <q-icon :name="c.ok ? 'bi-check-circle-fill' : (c.block ? 'bi-x-circle-fill' : 'bi-exclamation-triangle-fill')" size="22px" />
                                        <div class="col" style="min-width: 0;">
                                            <div class="rc-check-t">{{ c.title }}</div>
                                            <div class="rc-check-d">{{ c.detail }}</div>
                                        </div>
                                        <span class="rc-check-tag">{{ c.ok ? 'done' : (c.block ? 'required' : 'recommended') }}</span>
                                    </div>
                                </div>
                                <div class="rc-block-title q-mt-lg">what happens</div>
                                <div class="rc-effects">
                                    <div class="rc-effect">
                                        <span class="rc-ico rc-ico--teal"><q-icon name="bi-check2-circle" size="17px" /></span>
                                        <div><b>Only your part is marked</b><span>{{ myOfficeCode }} is shown as done. Other offices keep working.</span></div>
                                    </div>
                                    <div class="rc-effect rc-effect--bad">
                                        <span class="rc-ico rc-ico--amber"><q-icon name="bi-person-check" size="17px" /></span>
                                        <div><b>A supervisor approves the whole feedback</b><span>Only a super admin or an admin can complete the feedback. They can also send your part back if it is not really done.</span></div>
                                    </div>
                                    <div class="rc-effect">
                                        <span class="rc-ico rc-ico--blue"><q-icon name="bi-bell" size="17px" /></span>
                                        <div><b>The citizen is told</b><span>They get your closing message and see that your office finished its part.</span></div>
                                    </div>
                                </div>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'manage' && isSupervisor && manageType === 'complete'" class="rc-block rc-m-status">
                                <EmptyState v-if="isTerminal" compact icon="bi-lock" :title="`This feedback is ${ComplaintStore.details?.status}`" hint="It is already finalized, so it cannot be completed again." />
                                <template v-else>
                                    <div class="rc-block-title">before it can be completed<span class="rc-count">{{ completeChecks.filter(c => c.ok).length }} / {{ completeChecks.length }}</span></div>
                                    <div class="rc-checks">
                                        <div v-for="c in completeChecks" :key="c.key" class="rc-check" :class="c.ok ? 'rc-check--ok' : (c.block ? 'rc-check--bad' : 'rc-check--warn')">
                                            <q-icon :name="c.ok ? 'bi-check-circle-fill' : (c.block ? 'bi-x-circle-fill' : 'bi-exclamation-triangle-fill')" size="22px" />
                                            <div class="col" style="min-width: 0;">
                                                <div class="rc-check-t">{{ c.title }}</div>
                                                <div class="rc-check-d">{{ c.detail }}</div>
                                                <div v-if="c.offices?.length" class="rc-check-codes">
                                                    <span v-for="o in c.offices" :key="o.id" class="rc-code" :class="o.ok ? 'rc-code--solid' : 'rc-code--bad'">{{ o.code }}<q-icon :name="o.ok ? 'bi-check-lg' : 'bi-hourglass-split'" size="11px" class="q-ml-xs" /></span>
                                                </div>
                                            </div>
                                            <span class="rc-check-tag">{{ c.ok ? 'done' : (c.block ? 'required' : 'recommended') }}</span>
                                        </div>
                                    </div>

                                    <!-- AI-assisted completion suggestion: advisory only, and only worth offering once every
                                         office has acknowledged it. It reads the responses and can still say "not ready". -->
                                    <div v-if="!officesNotReceived.length" class="rc-ai">
                                            <div class="row items-center q-mb-sm">
                                                <div class="text-caption text-uppercase text-grey">ready to complete?</div>
                                                <q-space />
                                                <q-btn
                                                    unelevated size="sm" color="primary" icon="bi-stars" round
                                                    :loading="completionSuggestLoading" @click="loadCompletionSuggestion"
                                                >
                                                    <q-tooltip>Help me decide with AI</q-tooltip>
                                                </q-btn>
                                            </div>
                                            <template v-if="completionSuggestion && !completionSuggestion.eligible">
                                                <!-- AI held it back after reading the responses — warn, and if the offices
                                                     themselves all marked done, spell out the mismatch. Still not blocking:
                                                     the "completed" card below stays clickable. -->
                                                <div class="text-caption text-warning q-mb-sm" v-if="completionSuggestion.aiJudged">
                                                    <q-icon name="bi-exclamation-triangle-fill" size="xs" class="q-mr-xs" />
                                                    {{ completionSuggestion.reason }}
                                                    <template v-if="completionSuggestion.officeMarksReady">
                                                        Every assigned office marked its part done, but the responses don't clearly show the issue was resolved.
                                                    </template>
                                                </div>
                                                <!-- Structural floor not cleared yet (an office hasn't engaged). -->
                                                <div class="text-caption text-grey q-mb-sm" v-else>
                                                    <q-icon name="bi-info-circle" size="xs" class="q-mr-xs" />
                                                    {{ completionSuggestion.reason }}
                                                </div>
                                            </template>
                                            <q-banner v-if="completionSuggestion?.eligible" class="bg-blue-1 text-dark rounded-lg banner-radius q-pa-sm q-mb-sm radius-xs" dense inline-actions>
                                                <template v-slot:avatar><q-icon name="bi-stars" color="primary" /></template>
                                                <div class="text-caption">
                                                    The responses on file look like this was resolved.
                                                    <template v-if="completionSuggestion.llmUnavailable"> Add your own closing remarks below.</template>
                                                    <template v-else> A draft closing summary has been filled in below — review and edit before submitting.</template>
                                                </div>
                                            </q-banner>
                                    </div>
                                </template>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'manage' && isSupervisor && manageType === 'cancel'" class="rc-block rc-m-status">
                                <EmptyState v-if="isTerminal" compact icon="bi-lock" :title="`This feedback is ${ComplaintStore.details?.status}`" hint="It is already finalized, so it cannot be cancelled." />
                                <template v-else>
                                    <div class="rc-block-title">what cancelling does</div>
                                    <div class="rc-effects">
                                        <div class="rc-effect rc-effect--bad">
                                            <span class="rc-ico rc-ico--red"><q-icon name="bi-diagram-3" size="17px" /></span>
                                            <div><b>Every office is switched off</b><span>{{ activeOffices.map(o => o.office?.alias || o.office?.name).join(', ') || 'No office is assigned' }} can no longer respond to it.</span></div>
                                        </div>
                                        <div class="rc-effect">
                                            <span class="rc-ico rc-ico--blue"><q-icon name="bi-bell" size="17px" /></span>
                                            <div><b>The citizen is told</b><span>They see it as cancelled, with the reason you write.</span></div>
                                        </div>
                                        <div class="rc-effect">
                                            <span class="rc-ico rc-ico--teal"><q-icon name="bi-chat-dots" size="17px" /></span>
                                            <div><b>Nothing is deleted</b><span>The {{ ComplaintStore.details?.responses?.length || 0 }} response(s) and the activity stay on the record.</span></div>
                                        </div>
                                        <div class="rc-effect">
                                            <span class="rc-ico rc-ico--amber"><q-icon name="bi-arrow-counterclockwise" size="17px" /></span>
                                            <div><b>A supervisor can reopen it</b><span>Later, with a reason, if it turns out it should not have been cancelled.</span></div>
                                        </div>
                                    </div>
                                </template>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'manage' && isSupervisor && manageType === 'reopen'" class="rc-block rc-m-status">
                                <EmptyState v-if="!canReopen" compact icon="bi-lock" title="Nothing to reopen" hint="It is still open, so there is nothing to reopen." />
                                <template v-else>
                                    <div class="rc-block-title">what reopening does</div>
                                    <div class="rc-effects">
                                        <div class="rc-effect">
                                            <span class="rc-ico rc-ico--amber"><q-icon name="bi-arrow-counterclockwise" size="17px" /></span>
                                            <div>
                                                <b>{{ wasCancelled ? 'It is open again' : 'It goes back to ongoing' }}</b>
                                                <span>{{ wasCancelled ? 'It leaves the cancelled list and counts as open work again, with a fresh deadline.' : 'It leaves the completed list and counts as open work again.' }}</span>
                                            </div>
                                        </div>
                                        <div class="rc-effect">
                                            <span class="rc-ico rc-ico--blue"><q-icon name="bi-diagram-3" size="17px" /></span>
                                            <div>
                                                <b>{{ wasCancelled ? 'The offices are switched back on' : 'The offices are reset' }}</b>
                                                <span>{{ (wasCancelled ? displayOffices : activeOffices).map(o => o.office?.alias || o.office?.name).join(', ') || 'No office is assigned' }}: {{ wasCancelled ? 'the offices the cancellation switched off can respond again.' : 'every office marked completed returns to ongoing.' }}</span>
                                            </div>
                                        </div>
                                        <div class="rc-effect">
                                            <span class="rc-ico rc-ico--red"><q-icon name="bi-bell" size="17px" /></span>
                                            <div><b>The citizen is told</b><span>{{ wasCancelled ? 'They are told it is being looked at again, with your reason.' : 'They are told it is not resolved yet, with your reason.' }}</span></div>
                                        </div>
                                    </div>
                                </template>
                            </q-card-section>
                            </div>
                            <div v-if="activeTab == 'manage' && canManage && manageType" class="rc-pg-foot">
                                <q-btn flat round size="sm" color="grey-8" icon="bi-arrow-left" @click="manageType = null"><q-tooltip>Back to the choices</q-tooltip></q-btn>
                            </div>
                            <!-- Manage, before an action is picked: the details and the history of the feedback, like every other Manage -->
                            <div v-if="activeTab == 'manage' && canManage && !manageType" class="rc-pg-side">
                                <div class="rc-panel rc-panel--fill">
                                    <RecordTrail
                                        module="complaint" :items="ComplaintStore.details?.history || []" :created-at="ComplaintStore.details?.createdAt || ''" :show-link="false"
                                        icon="bi-chat-dots" :headline="ComplaintStore.details?.referenceNo || ''" :subline="viaShort" :status="trailStatus" :facts="trailFacts"
                                    />
                                </div>
                            </div>
                            <div v-if="activeTab == 'responses' || (activeTab == 'manage' && canManage && manageType)" class="rc-pg-side">
                            <q-card-section v-if="activeTab == 'responses'" class="rc-panel rc-m-compose">
                                <div class="rc-block-title">reply</div>
                                <!-- Compose stays fixed at the top of the tab, not part of the scrolling list below. -->
                                <EmptyState
                                    v-if="isTerminal" compact icon="bi-lock" :title="`This feedback is ${ComplaintStore.details?.status}`"
                                    hint="It has been finalized, so no further action is needed."
                                />
                                <template v-else>
                                    <EmptyState
                                        v-if="isMonitoring" compact icon="bi-eye" title="View only"
                                        hint="Monitoring accounts can read this feedback. Responses are handled by office staff."
                                    />
                                    <EmptyState
                                        v-else-if="!isSupervisor && !myOfficeAssignment" compact icon="bi-diagram-3" title="Not assigned to your office"
                                        hint="Only an office handling this feedback can respond to it."
                                    />
                                    <!--
                                        Receive-first applies whenever the CURRENT user's own office (via their
                                        Staff row) is one of this complaint's assigned offices and hasn't
                                        acknowledged it yet — true for workstation, and equally true for a
                                        Super/Admin whose account also belongs to an office (e.g. an IT-department
                                        admin on an IT-routed complaint). A Super/Admin with no office of their own,
                                        or whose office isn't assigned here, skips straight to the compose box below
                                        (their response isn't tied to any single office's queue) — same as before.
                                    -->
                                    <div v-else-if="myOfficeAssignment && myOfficeAssignment.status === 'pending'" class="rc-reply">
                                        <div class="rc-reply-grow">
                                            <div class="rc-cap">message to the citizen</div>
                                            <CannedMessagePills :items="cannedItems" :current="receiveContent" @pick="pickForReceive" />
                                            <InsertDataPills :items="dataItems" @pick="v => insertAtCursor(receiveInput, receiveContent, v, (t) => { receiveContent = t; receiveTouched = false; })" />
                                            <q-input
                                                ref="receiveInput" v-model="receiveContent" type="textarea" outlined hide-bottom-space class="rc-reply-text"
                                                :error="receiveTouched && receiveProblems.length > 0" :no-error-icon="true" @blur="receiveTouched = true"
                                                placeholder="Tell the citizen that their feedback has been received..."
                                            />
                                            <div class="rc-field-foot">
                                                <span :class="{ 'rc-field-foot--bad': receiveTouched && receiveProblems.length }">{{ receiveTouched && receiveProblems.length ? receiveProblems[0] : 'The citizen sees this with the acknowledgement.' }}</span>
                                                <span>{{ receiveContent.trim().length }}</span>
                                            </div>
                                        </div>
                                        <q-btn
                                            no-caps unelevated color="primary" icon="bi-inbox" label="receive feedback" class="rc-send rc-reply-send"
                                            :disable="!!receiveProblems.length" :loading="receiveLoading" @click="receiveTouched = true; submitReceive()"
                                        />
                                    </div>
                                    <template v-else>
                                        <!-- the words fill the rail, the evidence is dropped under them, send is the last thing -->
                                        <div class="rc-reply">
                                            <div class="rc-reply-grow">
                                                <div class="rc-cap">your response</div>
                                                <CannedMessagePills :items="cannedItems" :current="responseContent" @pick="pickForResponse" />
                                                <InsertDataPills :items="dataItems" @pick="v => insertAtCursor(responseInput, responseContent, v, (t) => { responseContent = t; })" />
                                                <q-input
                                                    ref="responseInput" v-model="responseContent" type="textarea" outlined hide-bottom-space class="rc-reply-text q-mt-sm"
                                                    placeholder="Write what you did, or what the citizen needs to know..."
                                                />
                                            </div>

                                            <div v-if="!markAsDone">
                                                <div class="rc-cap">evidence <span class="text-lowercase">(optional)</span></div>
                                                <q-file
                                                    ref="evidencePicker" v-model="responseFiles" multiple accept="image/*,application/pdf"
                                                    borderless dense style="display: none;"
                                                />
                                                <div
                                                    class="rc-drop" :class="{ 'rc-drop--over': evidenceOver }"
                                                    @click="evidencePicker?.pickFiles()"
                                                    @dragover.prevent="evidenceOver = true" @dragleave.prevent="evidenceOver = false"
                                                    @drop.prevent="onEvidenceDrop"
                                                >
                                                    <q-icon name="bi-cloud-arrow-up" size="30px" />
                                                    <div class="rc-drop-title">Drag &amp; drop photos or a PDF</div>
                                                    <div class="rc-drop-sub">or <span class="rc-drop-link">browse your files</span></div>
                                                </div>
                                                <div v-if="responseFiles && responseFiles.length" class="rc-files">
                                                    <div v-for="(f, i) in responseFiles" :key="f.name + i" class="rc-file">
                                                        <q-icon :name="/pdf/i.test(f.type) ? 'bi-file-earmark-pdf' : 'bi-image'" size="20px" color="primary" />
                                                        <div class="col" style="min-width: 0;">
                                                            <div class="rc-file-name">{{ f.name }}</div>
                                                            <div class="rc-file-size">{{ evidenceSize(f.size) }}</div>
                                                        </div>
                                                        <q-btn round flat dense size="sm" icon="bi-trash3" color="grey-7" @click="responseFiles.splice(i, 1)"><q-tooltip>Remove</q-tooltip></q-btn>
                                                    </div>
                                                </div>
                                            </div>

                                            <q-btn
                                                no-caps unelevated :color="markAsDone ? 'positive' : 'primary'" icon="bi-send"
                                                :label="markAsDone ? 'send & mark done' : 'send response'" class="rc-send rc-reply-send"
                                                :disable="!responseContent" :loading="respondLoading" @click="submitRespond"
                                            />
                                        </div>
                                    </template>
                                </template>

                            </q-card-section>
                            <q-card-section v-if="((activeTab == 'manage' && canManage && manageType === 'extension')) && ComplaintStore.details?.resolutionDeadline && !ComplaintStore.details?.extensionGrantedAt && canRequestExtension" class="rc-panel rc-panel--fill">
                                <div class="rc-reply">
                                    <div class="rc-reply-grow">
                                        <div class="rc-cap">reason for the extra 3 days</div>
                                        <q-input
                                            v-model="extensionReason" type="textarea" outlined hide-bottom-space class="rc-reply-text"
                                            :error="extensionTouched && extensionReason.trim().length < 5" :no-error-icon="true" @blur="extensionTouched = true"
                                            placeholder="Why is more time needed?"
                                        />
                                        <div class="rc-field-foot">
                                            <span :class="{ 'rc-field-foot--bad': extensionTouched && extensionReason.trim().length < 5 }">{{ extensionTouched && extensionReason.trim().length < 5 ? 'Write at least 5 characters.' : 'At least 5 characters.' }}</span>
                                            <span>{{ extensionReason.trim().length }}</span>
                                        </div>
                                    </div>
                                    <div v-if="extensionReason.trim().length < 5" class="rc-problems"><div><q-icon name="bi-exclamation-circle" size="14px" /> Write the reason for the extra days.</div></div>
                                    <q-btn
                                        no-caps unelevated color="primary" icon="bi-calendar-plus" class="rc-send rc-reply-send"
                                        label="request 3-day extension"
                                        :disable="extensionReason.trim().length < 5" :loading="extensionLoading"
                                        @click="extensionTouched = true; requestExtension()"
                                    />
                                </div>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'manage' && canEditStaffFiled && manageType === 'edit'" class="rc-panel rc-panel--fill">
                                <div class="rc-reply">
                                    <div class="rc-reply-grow">
                                        <div class="rc-cap">what you can change</div>
                                        <div class="rc-assign-none" style="padding-top: 4px;">The description, who filed it and where. Every change is logged under Activity.</div>
                                    </div>
                                    <q-btn unelevated no-caps color="primary" icon="bi-pencil" label="Edit the details" class="rc-send rc-reply-send" @click="editComplaintDialog = true" />
                                </div>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'manage' && isSupervisor && manageType === 'assign' && !isTerminal" class="rc-panel rc-panel--fill">
                                        <!-- the chosen ones, with the reason behind each -->
                                        <div class="rc-reply">
                                            <div class="rc-cap">chosen <span class="rc-count">{{ selectedOfficeIds.length }}</span></div>
                                            <div v-if="!selectedOfficeIds.length" class="rc-assign-none">No office chosen yet.</div>
                                            <div v-if="chosenOffices.length" class="rc-chosen">
                                                <span v-for="o in chosenOffices" :key="o.value" class="rc-chip-sel">
                                                    <span>{{ o.label }}</span>
                                                    <q-icon v-if="suggestedOfficeIds.has(o.value)" name="bi-stars" size="11px" class="rc-chip-ai" />
                                                    <button type="button" class="rc-chip-x" @click="toggleOffice(o.value)"><q-icon name="bi-x-lg" size="10px" /></button>
                                                    <q-tooltip>{{ o.name }}</q-tooltip>
                                                </span>
                                            </div>
                                            <div v-for="o in chosenOffices.filter(o => reasonsByOffice[o.value])" :key="'why' + o.value" class="rc-why">
                                                <span class="rc-code">{{ o.label }}</span>
                                                <span>{{ reasonsByOffice[o.value] }}</span>
                                            </div>
                                            <div class="rc-reply-grow">
                                                <div class="rc-cap">reason <span class="text-lowercase">(for offices with none above)</span></div>
                                                <q-input
                                                    outlined type="textarea" hide-bottom-space class="rc-reply-text"
                                                    v-model="reassignReason" placeholder="Why these offices?"
                                                />
                                            </div>
                                            <div v-if="assignProblems.length" class="rc-problems">
                                                <div v-for="p in assignProblems" :key="p"><q-icon name="bi-exclamation-circle" size="14px" /> {{ p }}</div>
                                            </div>
                                            <q-btn
                                                no-caps unelevated color="primary" icon="bi-check2" class="rc-send rc-reply-send"
                                                :label="selectedOfficeIds.length ? `save (${selectedOfficeIds.length})` : 'save'"
                                                :disable="!!assignProblems.length" :loading="reassignLoading" @click="submitReassign"
                                            />
                                        </div>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'manage' && !isSupervisor && manageType === 'handoff' && !isTerminal" class="rc-panel rc-panel--fill">
                                <div class="rc-reply">
                                    <div>
                                        <div class="rc-cap">chosen <span class="rc-count">{{ handoffIds.length }}</span></div>
                                        <div v-if="!handoffIds.length" class="rc-assign-none">No office chosen yet.</div>
                                        <div v-else class="rc-chosen">
                                            <span v-for="o in handoffOffices.filter(o => handoffIds.includes(o.value))" :key="o.value" class="rc-chip-sel">
                                                <span>{{ o.label }}</span>
                                                <button type="button" class="rc-chip-x" @click="toggleHandoff(o.value)"><q-icon name="bi-x-lg" size="10px" /></button>
                                                <q-tooltip>{{ o.name }}</q-tooltip>
                                            </span>
                                        </div>
                                    </div>
                                    <div class="rc-reply-grow">
                                        <div class="rc-cap">why you are handing it over</div>
                                        <q-input
                                            v-model="handoffReason" type="textarea" outlined hide-bottom-space class="rc-reply-text"
                                            :error="handoffTouched && handoffReason.trim().length < 5" :no-error-icon="true" @blur="handoffTouched = true"
                                            placeholder="For example: this is a matter for their mandate, not ours."
                                        />
                                        <div class="rc-field-foot">
                                            <span :class="{ 'rc-field-foot--bad': handoffTouched && handoffReason.trim().length < 5 }">{{ handoffTouched && handoffReason.trim().length < 5 ? 'Write at least 5 characters.' : 'At least 5 characters. It goes in the activity.' }}</span>
                                            <span>{{ handoffReason.trim().length }}</span>
                                        </div>
                                    </div>
                                    <div v-if="handoffProblems.length" class="rc-problems">
                                        <div v-for="p in handoffProblems" :key="p"><q-icon name="bi-exclamation-circle" size="14px" /> {{ p }}</div>
                                    </div>
                                    <q-btn
                                        no-caps unelevated color="primary" icon="bi-box-arrow-right" label="hand it over" class="rc-send rc-reply-send"
                                        :disable="!!handoffProblems.length" :loading="handoffLoading" @click="handoffTouched = true; submitHandoff()"
                                    />
                                </div>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'manage' && !isSupervisor && manageType === 'done' && !isTerminal" class="rc-panel rc-panel--fill">
                                <div class="rc-reply">
                                    <div class="rc-reply-grow">
                                        <div class="rc-cap">closing message to the citizen</div>
                                        <InsertDataPills :items="dataItems" @pick="v => insertAtCursor(doneInput, doneRemarks, v, (t) => { doneRemarks = t; })" />
                                        <q-input
                                            ref="doneInput" v-model="doneRemarks" type="textarea" outlined hide-bottom-space class="rc-reply-text"
                                            :error="doneTouched && doneRemarks.trim().length < 5" :no-error-icon="true" @blur="doneTouched = true"
                                            placeholder="What your office did, and how it was resolved..."
                                        />
                                        <div class="rc-field-foot">
                                            <span :class="{ 'rc-field-foot--bad': doneTouched && doneRemarks.trim().length < 5 }">{{ doneTouched && doneRemarks.trim().length < 5 ? 'Write at least 5 characters.' : 'At least 5 characters.' }}</span>
                                            <span>{{ doneRemarks.trim().length }}</span>
                                        </div>
                                    </div>
                                    <div v-if="doneProblems.length" class="rc-problems">
                                        <div v-for="p in doneProblems" :key="p"><q-icon name="bi-exclamation-circle" size="14px" /> {{ p }}</div>
                                    </div>
                                    <q-btn
                                        no-caps unelevated color="positive" icon="bi-check2-circle" label="mark my part as done" class="rc-send rc-reply-send"
                                        :disable="!!doneProblems.length" :loading="doneLoading" @click="doneTouched = true; submitDone()"
                                    />
                                </div>
                            </q-card-section>
                            <q-card-section v-if="activeTab == 'manage' && isSupervisor && ['complete', 'cancel', 'reopen'].includes(manageType) && !(isTerminal && !canReopen)" class="rc-panel rc-panel--fill">
                                <div class="rc-reply">
                                    <div class="rc-reply-grow">
                                        <div class="rc-cap">{{ statusFieldLabel }}</div>
                                        <q-input
                                            outlined type="textarea" hide-bottom-space class="rc-reply-text"
                                            v-model="statusRemarks" :error="remarksTouched && !remarksOk" :no-error-icon="true"
                                            :placeholder="statusFieldHint" @blur="remarksTouched = true"
                                        />
                                        <div class="rc-field-foot">
                                            <span :class="{ 'rc-field-foot--bad': remarksTouched && !remarksOk }">{{ remarksTouched && !remarksOk ? 'Write at least 5 characters.' : 'At least 5 characters.' }}</span>
                                            <span>{{ statusRemarks.trim().length }}</span>
                                        </div>
                                        <q-checkbox
                                            v-if="manageType === 'cancel'" v-model="confirmCancel" dense class="q-mt-sm rc-confirm"
                                            label="I understand this closes it for every office."
                                        />
                                    </div>
                                    <div v-if="statusProblems.length" class="rc-problems">
                                        <div v-for="p in statusProblems" :key="p"><q-icon name="bi-exclamation-circle" size="14px" /> {{ p }}</div>
                                    </div>
                                    <q-btn
                                        no-caps unelevated :color="manageType === 'cancel' ? 'negative' : 'primary'" class="rc-send rc-reply-send" :icon="manageMeta?.icon"
                                        :label="manageType === 'complete' ? 'mark as completed' : (manageType === 'cancel' ? 'cancel the feedback' : 'reopen the feedback')"
                                        :disable="!!statusProblems.length || !statusChoice"
                                        :loading="statusLoading"
                                        @click="remarksTouched = true; requestStatusChange(statusChoice)"
                                    />
                                </div>
                            </q-card-section>
                            </div>
                    </div>
                    </div>
                </q-card-section>
                <q-inner-loading :showing="ComplaintStore.isLoading">
                    <q-spinner-ios />
                </q-inner-loading>
            </q-card>
        </q-dialog>

        <!-- the photo viewer: the picture, with flat previous / next arrows and a close icon -->
        <q-dialog v-model="showGallery">
            <div class="pg">
                <img v-if="galleryUrls[galleryIndex]" :src="galleryUrls[galleryIndex]" class="pg-img" alt="" />
                <q-btn v-if="galleryUrls.length > 1" flat round dense icon="bi-chevron-left" class="pg-btn pg-btn--prev" @click.stop="galleryStep(-1)" />
                <q-btn v-if="galleryUrls.length > 1" flat round dense icon="bi-chevron-right" class="pg-btn pg-btn--next" @click.stop="galleryStep(1)" />
                <q-btn flat round dense icon="bi-x-lg" class="pg-btn pg-btn--close" v-close-popup />
            </div>
        </q-dialog>

        <CreateComplaintComponent v-model="createComplaintDialog" @saved="onComplaintCreated" />

        <CreateComplaintComponent v-model="editComplaintDialog" :complaint="ComplaintStore.details" @saved="onComplaintEdited" />
    </div>
</template>

<script setup>
import CannedMessagePills from 'src/components/CannedMessagePills.vue';
import InsertDataPills from 'src/components/InsertDataPills.vue';
import { CANNED_TOKENS, fillTokens, feedbackValues } from 'src/utils/cannedTokens';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';
import EmptyState from 'src/components/EmptyState.vue';
import ImpressionBadge from 'src/components/ImpressionBadge.vue';
import RecordTrail from 'src/components/RecordTrail.vue';
import { esc } from 'src/utils/escape';
import { ref, onMounted, onUnmounted, computed, onBeforeMount, watch, nextTick } from 'vue';
import { useQuasar } from 'quasar';
import moment from 'moment';
import { api } from 'src/boot/axios';
import { socket } from 'src/boot/socket';
import { useComplaintStore } from 'src/stores/complaint-store';
import { useAuthStore } from 'src/stores/auth-store';
import { Toast } from 'src/boot/sweetalert';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import Apexchart from 'vue3-apexcharts';
import CreateComplaintComponent from 'src/components/CreateComplaintComponent.vue';
import LocationMap from 'src/components/LocationMap.vue';

const $q = useQuasar();
const ComplaintStore = useComplaintStore();
const AuthStore = useAuthStore();

// "Unassigned" only has meaning across the whole system — a single office's staff view is
// already scoped to their own office's complaints, so this is Supervisor-only (super/admin).
// isSupervisor gates actual TRANSACTIONS (create, edit, re-assignment, status changes) — kept
// narrow on purpose, monitoring is excluded from every one of these. canViewAll gates
// system-wide READ-ONLY panels (KPIs, charts, office filter) — monitoring gets the same visibility
// a supervisor has, just none of the buttons.
const isSupervisor = computed(() => ['super', 'admin'].includes(AuthStore.user?.role));
const canViewAll = computed(() => ['super', 'admin', 'monitoring'].includes(AuthStore.user?.role));
const isMonitoring = computed(() => AuthStore.user?.role === 'monitoring');
// Matches the backend's requireRole('super', 'admin') on PATCH /complaint/:id/reopen — same
// audience as updateStatus/completion-suggestion.
// Whether the status panel has anything actionable to offer on an already-finalized complaint —
// only a supervisor account, and only a 'completed' one (never 'cancelled', a deliberate call
// rather than "not actually done"). Drives which branch of the unified status panel renders.
const canReopen = computed(() => isSupervisor.value && ['completed', 'cancelled'].includes(ComplaintStore.details?.status));
const wasCancelled = computed(() => ComplaintStore.details?.status === 'cancelled');

// 're-assign' and 'status' are super/admin-only modules (see the matching v-if on their panels
// below) — hidden from workstation here too, so there's no pill that opens onto a blank panel.
// 'responses' now covers both composing a reply and reading past ones — see its panel below.
// A super/admin manages everything. An office (workstation) manages only its own part: handing the feedback over to
// another office, marking its part done, and asking for more time.
const canManage = computed(() => isSupervisor.value || (AuthStore.user?.role === 'workstation' && !!myOfficeAssignment.value));
const navs = computed(() => [
    { tab: 'details', label: 'overview', icon: 'bi-grid', desc: '' },
    { tab: 'responses', label: 'conversation', icon: 'bi-chat-dots', desc: 'What the offices and the citizen have said to each other.', count: ComplaintStore.details?.responses?.length || 0 },
    // re-assignment and status are one page for super/admin
    ...(canManage.value ? [{ tab: 'manage', label: 'manage', icon: 'bi-sliders', desc: isSupervisor.value ? 'Choose the offices, set the resolution time and decide the status.' : 'Hand it over, mark your part done, or ask for more time.' }] : []),
    { tab: 'history', label: 'activity', icon: 'bi-clock-history', desc: 'Everything that has happened to this feedback, newest first.', count: ComplaintStore.details?.history?.length || 0 },
]);

const evidencePicker = ref(null);
const evidenceOver = ref(false);
// files dropped on the evidence box are added to the ones already chosen
const onEvidenceDrop = (event) => {
    evidenceOver.value = false;
    const dropped = [...(event.dataTransfer?.files || [])].filter(f => /^(image\/|application\/pdf)/.test(f.type));
    if (dropped.length) responseFiles.value = [...(responseFiles.value || []), ...dropped];
};
const evidenceSize = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// The manage page: pick what to do (step 1), then fill in its details (step 2)
const manageType = ref(null);
const MANAGE_META = {
    assign: { label: 'Assign offices', icon: 'bi-diagram-3', color: '#1F5FA8', bg: '#E3EEFB', hint: 'Choose which offices handle this feedback.' },
    extension: { label: 'Extend the resolution time', icon: 'bi-calendar-plus', color: '#5E35B1', bg: '#EDE7F6', hint: 'Give the offices 3 more days. Once per feedback.' },
    handoff: { label: 'Hand over to another office', icon: 'bi-box-arrow-right', color: '#1F5FA8', bg: '#E3EEFB', hint: 'It is not yours: pass it on, with the reason.' },
    done: { label: 'Mark my office\'s part as done', icon: 'bi-check2-circle', color: '#1C8A3B', bg: '#E4F6EA', hint: 'Your part is finished. A supervisor approves the whole feedback.' },
    complete: { label: 'Mark as completed', icon: 'bi-patch-check', color: '#1C8A3B', bg: '#E4F5E9', hint: 'Close it as resolved, for every office.' },
    cancel: { label: 'Cancel the feedback', icon: 'bi-x-octagon', color: '#B3121F', bg: '#FBE6E8', hint: 'Close it without a resolution, with a reason.' },
    reopen: { label: 'Reopen', icon: 'bi-arrow-counterclockwise', color: '#9A6B00', bg: '#FBF1D9', hint: 'It was not actually resolved: bring it back.' },
    edit: { label: 'Edit details', icon: 'bi-pencil', color: '#1F5FA8', bg: '#E3EEFB', hint: 'Correct what staff wrote when filing it.' },
};
const chosenOffices = computed(() => filteredOffice.value.filter(o => o.value !== 'all' && selectedOfficeIds.value.includes(o.value)));
const extensionTouched = ref(false);
const resolutionOverdue = computed(() => !!ComplaintStore.details?.resolutionDeadline && moment(ComplaintStore.details.resolutionDeadline).isBefore(moment()));
// the path of the deadline: routed, acknowledge by (day 1), resolve by (day 4), and the day 7 an extension gives
const resolutionStops = computed(() => {
    const d = ComplaintStore.details;
    if (!d?.resolutionDeadline) return [];
    const extended = !!d.extensionGrantedAt;
    const due = moment(d.resolutionDeadline);
    const resolveBy = extended ? moment(due).subtract(3, 'days') : moment(due);
    const routed = moment(resolveBy).subtract(4, 'days');
    const now = moment();
    return [
        { key: 'routed', label: 'Routed', at: routed, icon: 'bi-diagram-3' },
        { key: 'ack', label: 'Acknowledge by', at: moment(routed).add(1, 'days'), icon: 'bi-inbox' },
        { key: 'resolve', label: 'Resolve by', at: resolveBy, icon: 'bi-patch-check' },
        { key: 'ext', label: extended ? 'Extended to' : 'If extended', at: moment(resolveBy).add(3, 'days'), icon: 'bi-calendar-plus', optional: !extended },
    ].map(st => ({ ...st, past: now.isAfter(st.at), date: st.at.format('MMM D, h:mm A') }));
});
// how much of the time between routing and the deadline has gone
const resolutionPct = computed(() => {
    const d = ComplaintStore.details;
    if (!d?.resolutionDeadline) return 0;
    const due = moment(d.resolutionDeadline);
    const routed = moment(due).subtract(d.extensionGrantedAt ? 7 : 4, 'days');
    return Math.max(0, Math.min(100, Math.round(moment().diff(routed) / due.diff(routed) * 100)));
});
const extensionChecks = computed(() => {
    const d = ComplaintStore.details;
    return [
        {
            key: 'once', ok: !d?.extensionGrantedAt, title: 'Not extended before',
            detail: d?.extensionGrantedAt ? `Extended on ${moment(d.extensionGrantedAt).format('MMM DD, YYYY')}. Once is all it gets.` : 'A feedback can be extended once, by 3 days.',
        },
        {
            key: 'time', ok: !resolutionOverdue.value, title: 'Still before the deadline',
            detail: resolutionOverdue.value ? 'The deadline has passed, so it can no longer be extended.' : `${moment(d?.resolutionDeadline).fromNow(true)} left to ask.`,
        },
        {
            key: 'open', ok: !isTerminal.value, title: 'Still open',
            detail: isTerminal.value ? 'It is already finalized.' : 'It has not been completed or cancelled.',
        },
    ];
});
const confirmCancel = ref(false);
const remarksTouched = ref(false);
const remarksOk = computed(() => statusRemarks.value.trim().length >= 5);
const statusFieldLabel = computed(() => ({ complete: 'closing remarks', cancel: 'reason for cancelling', reopen: 'reason for reopening' }[manageType.value] || 'remarks'));
const statusFieldHint = computed(() => ({ complete: 'What was done, and how it was resolved...', cancel: 'Why is this being cancelled?', reopen: 'Why is it being reopened?' }[manageType.value] || ''));
const filedForName = computed(() => {
    const d = ComplaintStore.details?.complaintDetail;
    const first = d?.user?.firstname ?? d?.guestFirstName; const last = d?.user?.lastname ?? d?.guestLastName;
    return `${first || ''} ${last || ''}`.trim() || 'Not given';
});
const filedForEmail = computed(() => ComplaintStore.details?.complaintDetail?.user?.citizen?.email || ComplaintStore.details?.complaintDetail?.guestEmail || '');
const filedForPhone = computed(() => ComplaintStore.details?.complaintDetail?.user?.citizen?.phoneNo || ComplaintStore.details?.complaintDetail?.guestPhone || '');
const officeCode = (co) => co.office?.alias || co.office?.name || '?';

// what has to be true before a feedback can be completed: the first three are required (the API refuses it
// otherwise), the next two are advice
const completeChecks = computed(() => {
    const d = ComplaintStore.details;
    const offices = activeOffices.value;
    const pending = officesNotReceived.value;
    const done = offices.filter(co => co.status === 'completed');
    const replies = d?.responses?.length || 0;
    return [
        {
            key: 'assigned', block: true, ok: offices.length > 0, title: 'An office is assigned to it',
            detail: offices.length ? `${offices.length} office${offices.length === 1 ? '' : 's'} handle this feedback.` : 'Assign at least one office first.',
        },
        {
            key: 'ack', block: true, ok: offices.length > 0 && !pending.length, title: 'Every assigned office has acknowledged it',
            detail: !offices.length ? 'No office to acknowledge it yet.' : pending.length ? `Waiting for ${pending.length} of ${offices.length}.` : 'All of them have received it.',
            offices: offices.map(co => ({ id: co.id, code: officeCode(co), ok: co.status !== 'pending' })),
        },
        {
            key: 'remarks', block: true, ok: remarksOk.value, title: 'Closing remarks are written',
            detail: remarksOk.value ? 'Ready to send.' : 'Say what was done, in the panel on the right.',
        },
        {
            key: 'replied', block: false, ok: replies > 0, title: 'The citizen was answered',
            detail: replies ? `${replies} response${replies === 1 ? '' : 's'} in the conversation.` : 'No response was posted in the conversation yet.',
        },
        {
            key: 'done', block: false, ok: offices.length > 0 && done.length === offices.length, title: 'The offices marked their part done',
            detail: `${done.length} of ${offices.length} marked done. Completing finalizes the rest.`,
        },
    ];
});
const statusProblems = computed(() => {
    const out = [];
    if (manageType.value === 'complete') {
        if (!activeOffices.value.length) out.push('Assign at least one office first.');
        else if (officesNotReceived.value.length) out.push(`${officesNotReceived.value.length} office(s) have not acknowledged it yet.`);
        if (!remarksOk.value) out.push('Write the closing remarks.');
    } else if (manageType.value === 'cancel') {
        if (!remarksOk.value) out.push('Write the reason for cancelling.');
        if (!confirmCancel.value) out.push('Tick the box to confirm.');
    } else if (manageType.value === 'reopen') {
        if (!remarksOk.value) out.push('Write the reason for reopening.');
    }
    return out;
});
watch(manageType, () => {
    confirmCancel.value = false; remarksTouched.value = false; extensionTouched.value = false;
    handoffIds.value = []; handoffReason.value = ''; handoffTouched.value = false; doneRemarks.value = ''; doneTouched.value = false;
});
const manageMeta = computed(() => MANAGE_META[manageType.value] || null);
// Rerouting is only for a feedback no office has received yet (the API refuses it too): once an office has acknowledged
// it, it is theirs to handle, or to hand over.
const receivedByOffices = computed(() => (ComplaintStore.details?.complaintOffices || [])
    .filter(co => co.isActive && (co.isReceived || ['received', 'ongoing', 'completed'].includes(co.status)))
    .map(co => co.office?.alias || co.office?.name || `Office #${co.officeId}`));
const assignLocked = computed(() => receivedByOffices.value.length > 0);
// an office may receive it while the assign step is open (the page refreshes live): close the step
watch(assignLocked, (locked) => { if (locked && manageType.value === 'assign') manageType.value = null; });
const manageTypes = computed(() => {
    const finalized = isTerminal.value;
    const why = 'Already finalized';
    if (!isSupervisor.value) {
        const mine = myOfficeAssignment.value;
        const doneAlready = mine?.status === 'completed';
        const noMore = finalized ? why : 'Your office already marked its part done';
        // an office that has not received it yet can hand it over, but not mark it done or ask for more time
        const needsReceive = mine?.status === 'pending';
        return [
            { value: 'handoff', enabled: !finalized && !doneAlready, reason: noMore },
            { value: 'done', enabled: !finalized && !doneAlready && !needsReceive, reason: needsReceive && !finalized && !doneAlready ? 'Receive it first' : noMore },
            { value: 'extension', enabled: canRequestExtension.value, reason: extensionUnavailableReason.value },
        ].map(t => ({ ...MANAGE_META[t.value], ...t }));
    }
    const list = [
        { value: 'assign', enabled: !finalized && !assignLocked.value, reason: finalized ? why : `Already received by ${receivedByOffices.value.join(', ')}` },
        { value: 'extension', enabled: canRequestExtension.value, reason: extensionUnavailableReason.value },
        { value: 'complete', enabled: !finalized, reason: why },
        { value: 'cancel', enabled: !finalized, reason: why },
        { value: 'reopen', enabled: canReopen.value, reason: 'It is still open' },
    ];
    // always offered to a supervisor; greyed out, with the reason, when it cannot be used
    list.push({
        value: 'edit', enabled: canEditStaffFiled.value,
        reason: ComplaintStore.details?.via !== 'staff' ? 'Only feedback filed by staff can be edited'
            : finalized ? why : 'An assigned office has already acknowledged it',
    });
    return list.map(t => ({ ...MANAGE_META[t.value], ...t }));
});
// ---- an office handing the feedback over, and marking its own part done
const handoffIds = ref([]);
const handoffReason = ref('');
const handoffTouched = ref(false);
const handoffLoading = ref(false);
const doneRemarks = ref('');
const doneTouched = ref(false);
const doneLoading = ref(false);
const myOfficeId = computed(() => AuthStore.user?.staff?.officeId);
const myOfficeCode = computed(() => {
    const o = (OptionOffice.value || []).find(x => x.value === myOfficeId.value);
    return o?.label || 'Your office';
});
// every other office (not the one handing it over)
const handoffOffices = computed(() => (OptionOffice.value || []).filter(o => o.value !== 'all' && o.value !== myOfficeId.value));
const toggleHandoff = (id) => {
    const i = handoffIds.value.indexOf(id);
    if (i >= 0) handoffIds.value.splice(i, 1); else handoffIds.value.push(id);
};
const handoffProblems = computed(() => {
    const out = [];
    if (!handoffIds.value.length) out.push('Choose at least one office.');
    if (handoffReason.value.trim().length < 5) out.push('Write why you are handing it over.');
    return out;
});
const doneChecks = computed(() => {
    const mine = myOfficeAssignment.value;
    const myReplies = (ComplaintStore.details?.responses || []).filter(r => r.userId === AuthStore.user?.id).length;
    return [
        { key: 'ack', block: true, ok: !!mine && mine.status !== 'pending', title: 'Your office acknowledged it', detail: mine?.status === 'pending' ? 'Receive the feedback first (on the conversation page).' : 'Your office has received it.' },
        { key: 'replied', block: false, ok: myReplies > 0, title: 'The citizen was answered', detail: myReplies ? `${myReplies} response${myReplies === 1 ? '' : 's'} from you in the conversation.` : 'You have not posted a response yet.' },
        { key: 'message', block: true, ok: doneRemarks.value.trim().length >= 5, title: 'A closing message is written', detail: doneRemarks.value.trim().length >= 5 ? 'Ready to send.' : 'Say what was done, in the panel on the right.' },
    ];
});
const doneProblems = computed(() => {
    const out = [];
    if (myOfficeAssignment.value?.status === 'pending') out.push('Your office has not acknowledged it yet.');
    if (doneRemarks.value.trim().length < 5) out.push('Write the closing message.');
    return out;
});

const submitHandoff = async () => {
    const id = ComplaintStore.details?.id;
    if (!id || handoffProblems.value.length) return;
    const codes = handoffOffices.value.filter(o => handoffIds.value.includes(o.value)).map(o => o.label).join(', ');
    const result = await Swal.fire({
        title: 'Hand it over?',
        html: `This goes to <b>${esc(codes)}</b>. Your office will no longer be able to act on it, and will see it only up to now.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'hand over',
        cancelButtonText: 'cancel',
        reverseButtons: true
    });
    if (!result.isConfirmed) return;
    handoffLoading.value = true;
    try {
        const response = await api.post(`/complaint/${id}/handoff`, { offices: handoffIds.value, reason: handoffReason.value.trim() });
        Toast.fire({ icon: 'success', html: `<div class="text-h6 text-bold text-uppercase">handed over!</div><div class="text-caption">${response.data.message}</div>` });
        handoffIds.value = [];
        handoffReason.value = '';
        manageType.value = null;
        await getComplaint(id, { resetTab: false });
        // your office is no longer assigned, so there is nothing left to manage
        activeTab.value = 'details';
        getAllComplaints();
    } catch (error) {
        console.error('Error handing over:', error);
        Toast.fire({ icon: 'error', html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption">${error.response?.data?.message || 'Unable to hand it over.'}</div>` });
    } finally {
        handoffLoading.value = false;
    }
};

const submitDone = async () => {
    const id = ComplaintStore.details?.id;
    if (!id || doneProblems.value.length) return;
    const result = await Swal.fire({
        title: 'Mark your part as done?',
        html: `This sends your closing message to the citizen and marks <b>${esc(myOfficeCode.value)}</b> as done. A supervisor approves the whole feedback and can send your part back if it is not really done.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'mark done',
        cancelButtonText: 'cancel',
        reverseButtons: true
    });
    if (!result.isConfirmed) return;
    doneLoading.value = true;
    try {
        const response = await api.post('/response/complete', { complaintId: id, content: withTokens(doneRemarks.value.trim()) });
        Toast.fire({ icon: 'success', html: `<div class="text-h6 text-bold text-uppercase">done!</div><div class="text-caption">${response.data.message}</div>` });
        doneRemarks.value = '';
        manageType.value = null;
        await getComplaint(id, { resetTab: false });
        getAllComplaints();
    } catch (error) {
        console.error('Error marking done:', error);
        Toast.fire({ icon: 'error', html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption">${error.response?.data?.message || 'Unable to mark it done.'}</div>` });
    } finally {
        doneLoading.value = false;
    }
};

const chooseManageType = (value) => {
    manageType.value = value;
    statusChoice.value = { complete: 'completed', cancel: 'cancelled', reopen: 'reopen' }[value] || null;
};

const activeNav = computed(() => navs.value.find(n => n.tab === activeTab.value));

// Which of the 4 tabs in the complaint detail dialog is active — reassignment/responses/
// respond/status. Reset per complaint opened (see getComplaint) to a sensible default per role:
// supervisors land on reassignment first, workstation lands on the responses record.
const activeTab = ref('details');

// a different page or a different feedback starts again from the choices
watch([activeTab, () => ComplaintStore.details?.id], () => { manageType.value = null; });

const loading = ref(false);

const filter = ref('');
const filterStatus = ref('all');
// how the feedback reads (positive / neutral / negative, 'unread' = the AI has not read it yet): see utils/sentiment.js in the API
const filterSentiment = ref('all');
const SENTIMENT_FILTERS = [
    { value: 'positive', label: 'Positive' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'negative', label: 'Negative' },
];
const toggleSentimentFilter = (value) => {
    filterSentiment.value = filterSentiment.value === value ? 'all' : value;
    page.value = 1;
    getAllComplaints();
};
const filterOffice = ref([]); // array of officeIds — empty = no office filter (all offices)

// Quick view for the "needs assignment" stat card below — complaints auto-assignment couldn't
// place anywhere (no AI provider configured, or nothing matched a mandate confidently enough).
const showUnassignedOnly = ref(false);
const unassignedCount = ref(0);

const loadUnassignedCount = async () => {
    try {
        const response = await api.get(`/complaint`, { params: { unassigned: 'true', limit: 1 } });
        unassignedCount.value = response.data?.meta?.TotalItems ?? 0;
    } catch (error) {
        console.error("Error fetching unassigned count:", error);
    }
};

const toggleUnassignedFilter = () => {
    showUnassignedOnly.value = !showUnassignedOnly.value;
    page.value = 1;
    getAllComplaints();
};

// Quick view for the "acknowledgement overdue" stat card — offices still holding an
// unreceived complaint past their 24-business-hour deadline (see utils/businessHours.js). The
// count itself now comes from analyticsKpis.ackOverdueCount (loadAnalytics) — one source for
// both roles, already scoped to "my office only" for workstation on the backend — rather than a
// separate admin-only endpoint.
const showOverdueOnly = ref(false);

const toggleOverdueFilter = () => {
    showOverdueOnly.value = !showOverdueOnly.value;
    page.value = 1;
    getAllComplaints();
};

// Quick view for the "resolution overdue" stat card — complaints still open past their
// Resolution deadline: 3 days after the acknowledgement day, +3 if extended (see utils/businessHours.js). Same deal — count
// comes from analyticsKpis.resolutionOverdueCount now.
const showResolutionOverdueOnly = ref(false);

const toggleResolutionOverdueFilter = () => {
    showResolutionOverdueOnly.value = !showResolutionOverdueOnly.value;
    page.value = 1;
    getAllComplaints();
};

// Plain single-status quick filters — every status except 'unassigned', which already has its
// own dedicated chip/KPI-tile toggle (showUnassignedOnly) since "unassigned" doubles as an
// operational alert, not just a status. One click sets filterStatus; clicking the active one
// again clears back to 'all'.
const STATUS_QUICK_FILTERS = [
    { value: 'unverified', label: 'Unverified' },
    { value: 'verified', label: 'Verified' },
    { value: 'pending', label: 'Pending' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];
const toggleStatusFilter = (status) => {
    filterStatus.value = filterStatus.value === status ? 'all' : status;
    page.value = 1;
    getAllComplaints();
};

// The rail's "All" chip — clears every quick filter (the three KPI-tile toggles plus the
// completed shortcut) in one call instead of one getAllComplaints() round-trip per filter.
const anyQuickFilterActive = computed(() =>
    showUnassignedOnly.value || showOverdueOnly.value || showResolutionOverdueOnly.value || filterStatus.value !== 'all' || filterSentiment.value !== 'all'
);
const clearQuickFilters = () => {
    showUnassignedOnly.value = false;
    showOverdueOnly.value = false;
    showResolutionOverdueOnly.value = false;
    filterStatus.value = 'all';
    filterSentiment.value = 'all';
    page.value = 1;
    getAllComplaints();
};

/* -------------------- analytics (supervisor) --------------------
   Backs the analytics panels in the main column — a single aggregate call to
   GET /complaint/analytics (admin/super only, see ComplaintController.getAnalytics), fanned out
   into the ApexCharts series/options below plus a couple of plain meters for single-ratio
   figures (SLA compliance, on-time rate per tier, reassignment rate). Everything here is
   Complaint/ComplaintOffice/ComplaintHistory data only — no ratings, no other modules. */

const analyticsLoading = ref(false);
const analyticsPeriod = ref('year'); // 'week' | 'month' | 'year' — sent to GET /complaint/analytics
// Which year the dashboard looks at — defaults to the real current year; stepping back lets you
// browse a past year's data. Same pattern as FeedbackPage.vue's year stepper.
const currentYear = new Date().getFullYear();
const analyticsYear = ref(currentYear);
const analyticsRangeLabel = ref('');
// Matches the trend-bucketing convention in ComplaintController (and the same computed used by
// FeedbackPage.vue/DiscussionPage.vue/PollPage.vue): week -> daily buckets, month -> weekly,
// year -> monthly. Drives the "complaints filed per ___" chart title so it actually reflects
// what's plotted instead of always claiming "week".
const bucketUnitLabel = computed(() => analyticsPeriod.value === 'week' ? 'day' : analyticsPeriod.value === 'month' ? 'week' : 'month');
// Set only for a workstation view (their office's alias/name) — null/empty for super/admin,
// whose dashboard is system-wide and needs no such label.
const analyticsScopeLabel = ref('');
const analyticsKpis = ref({ totalComplaints: 0, avgResolutionDays: null });
// "vs last week/month/year" badges under the total-complaints/avg-resolution-time KPI tiles —
// whichever comparison matches the currently selected period button.
const analyticsTrends = ref({ totalComplaints: null, avgResolutionDays: null });

// Picks minutes/hours/days by magnitude instead of always "Xd" — a resolution that took under an
// hour used to round to "0.0d" and look like broken data.
const formatResolutionTime = (days) => {
    if (days == null) return '—';
    const totalMinutes = days * 24 * 60;
    if (totalMinutes < 60) return Math.round(totalMinutes) + 'm';
    const totalHours = days * 24;
    if (totalHours < 24) return (Math.round(totalHours * 10) / 10) + 'h';
    return (Math.round(days * 10) / 10) + 'd';
};
// Avg. time between every assigned office marking its own part done and a supervisor actually
// finalizing the complaint — see avgApprovalLagHours in ComplaintController.getAnalytics. Reuses
// formatResolutionTime by converting hours -> days, same minutes/hours/days-by-magnitude scaling
// as the resolution-time KPI above rather than a separate formatter.
const approvalLagLabel = computed(() => formatResolutionTime(
    analyticsKpis.value.avgApprovalLagHours != null ? analyticsKpis.value.avgApprovalLagHours / 24 : null
));
const slaCompliance = ref({ ackRate: null, resolutionRate: null });
// The process the feedback goes through (filed -> routed -> acknowledged -> offices done -> completed), the
// 3-day extension, hand-overs between offices, and what was cancelled/reopened. See getAnalytics.process.
const flow = ref({});
const pipeline = computed(() => flow.value.pipeline || { filed: 0, routed: 0, acknowledged: 0, officesDone: 0, completed: 0 });
const handOvers = computed(() => flow.value.handOvers || {});
const closedWithout = computed(() => flow.value.closedWithout || {});
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
const extendedPct = computed(() => (pipeline.value.filed ? Math.round(((flow.value.extendedCount || 0) / pipeline.value.filed) * 100) : 0));
// A "needs attention" tile: calm at zero, otherwise coloured by how urgent that kind of count is.
const attnTone = (n, tone = 'bad') => (n > 0 ? 'ov-attn--' + tone : 'ov-attn--zero');
const FILED_HOW = [
    { key: 'account', label: 'Citizen, signed in', color: '#204888' },
    { key: 'anonymous', label: 'Anonymous (signed in)', color: '#68AFF1' },
    { key: 'staff', label: 'Filed by staff', color: '#FFC900' },
    { key: 'guest', label: 'Guest (earlier filings)', color: '#B8C2D4' },
];
const filedHowRows = computed(() => FILED_HOW.filter(r => (flow.value.filedHow?.[r.key] || 0) > 0 || r.key !== 'guest'));
const filedHowSeries = computed(() => filedHowRows.value.map(r => flow.value.filedHow?.[r.key] || 0));
const filedHowOptions = computed(() => ({
    chart: { type: 'donut' },
    labels: filedHowRows.value.map(r => r.label),
    colors: filedHowRows.value.map(r => r.color),
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    stroke: { width: 2 },
    plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Filed', fontSize: '12px' } } } } },
}));
const routingAccuracy = ref({ aiAssignedCount: 0, adminAssignedCount: 0, reassignedCount: 0, reassignmentRate: 0 });
// 1-5 star ratings citizens leave on responses — scoped by when the rating was given, not when
// the underlying complaint was filed (see getAnalytics on the backend for why).
const satisfaction = ref({ avgRating: null, totalRatings: 0, distribution: [] });
// how the feedback filed in the period reads (positive / neutral / negative / not read yet)
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
// a supervisor has the AI read the feedback (and CSM reports) it has not read yet: it runs in the background
const readUnread = async () => {
    try {
        const { data } = await api.post('/complaint/sentiments/read');
        Toast.fire({ icon: 'success', html: `<div class="text-h6 text-bold text-uppercase">started!</div><div class="text-caption">${data.message} It fills in as it goes.</div>` });
    } catch (error) {
        Toast.fire({ icon: 'error', html: `<div class="text-h6 text-bold text-uppercase">not started</div><div class="text-caption">${error.response?.data?.message || 'Could not start reading.'}</div>` });
    }
};

const STATUS_ORDER = ['unverified', 'verified', 'pending', 'unassigned', 'ongoing', 'completed', 'cancelled'];
// Distinct from the "complaints by status" chart's colors (shared app palette, see
// CHART_PALETTE) — this one stays semantic (grey/blue/green/red carry meaning) since it's the
// solid status pill shown on each list row, paired with a text color for contrast.
const STATUS_PILL = {
    unverified: { bg: '#9E9E9E', text: '#FFFFFF' },
    verified: { bg: '#DCEBFB', text: '#0C447C' },
    pending: { bg: '#FBF1D9', text: '#9A6B00' },
    unassigned: { bg: '#C10015', text: '#FFFFFF' },
    ongoing: { bg: '#004EA8', text: '#FFFFFF' },
    completed: { bg: '#21BA45', text: '#FFFFFF' },
    cancelled: { bg: '#E0E0E0', text: '#616161' },
};

// Single shared palette for every generic categorical/single-series chart on this page (same
// list used on FeedbackPage.vue and the feedback office-detail modal). Status/SLA
// colors below stay semantic (grey/blue/green/red carry meaning) and are deliberately not
// swapped to this palette.
// Shuffled fresh on every page load so charts don't render in the exact same color order every
// visit — same 10-color theme (well, 5 distinct — repeated 3x below to match the array length
// every multi-item chart on this page already expects), just randomized which color lands where.
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

const volumeChartSeries = ref([{ name: 'Filed', data: [] }]);
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

const statusChartSeries = ref([{ name: 'Complaints', data: [] }]);
const statusChartOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true },
    legend: { show: false },
    colors: [],
    xaxis: { categories: [] },
});

const backlogChartSeries = ref([{ name: 'Open', data: [] }]);
const backlogChartOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '60%' } },
    dataLabels: { enabled: true },
    colors: [nextChartColor()],
    xaxis: { categories: [] },
});

// Ack rate vs. resolution rate, one grouped column pair per office — grouped column (not
// horizontal-bar like backlog above) since it's two series being compared per category, not one.
const ackResolutionByOfficeSeries = ref([{ name: 'Ack. rate', data: [] }, { name: 'Resolution rate', data: [] }]);
const ackResolutionByOfficeOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
    dataLabels: { enabled: false },
    colors: [nextChartColor(), nextChartColor()],
    legend: { position: 'bottom', fontSize: '11px' },
    xaxis: { categories: [] },
    yaxis: { max: 100, labels: { formatter: (v) => Math.round(v) + '%' } },
});

const satisfactionChartSeries = ref([{ name: 'Ratings', data: [0, 0, 0, 0, 0] }]);
const satisfactionChartOptions = ref({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '55%' } },
    dataLabels: { enabled: true },
    colors: [nextChartColor()],
    xaxis: { categories: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'] },
    yaxis: { labels: { formatter: (v) => Math.round(v) } },
});

// on_time rate (SLA compliance meters, reassignment rate) — lower isn't
// always worse (reassignment), so callers pass which direction is "good".
const meterColor = (rate) => {
    if (rate == null) return '#BDBDBD';
    return rate >= 85 ? '#21BA45' : rate >= 70 ? '#F2C037' : '#C10015';
};
const reassignMeterColor = (rate) => {
    if (rate == null) return '#BDBDBD';
    return rate <= 10 ? '#21BA45' : rate <= 20 ? '#F2C037' : '#C10015';
};

const applyAnalyticsToCharts = (d) => {
    const volume = d.volumeTrend || [];
    volumeChartSeries.value = [{ name: 'Filed', data: volume.map(w => w.count) }];
    volumeChartOptions.value = {
        ...volumeChartOptions.value,
        xaxis: { ...volumeChartOptions.value.xaxis, categories: volume.map(w => w.label) }
    };

    const sortedStatus = [...(d.statusBreakdown || [])].sort(
        (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
    );
    statusChartSeries.value = [{ name: 'Complaints', data: sortedStatus.map(s => s.count) }];
    statusChartOptions.value = {
        ...statusChartOptions.value,
        xaxis: { categories: sortedStatus.map(s => s.status) },
        // Shared app palette, indexed by each status's fixed position in STATUS_ORDER so a given
        // status always gets the same color regardless of which subset of statuses is present.
        colors: sortedStatus.map(s => CHART_PALETTE[STATUS_ORDER.indexOf(s.status) % CHART_PALETTE.length])
    };

    const backlog = d.officeBacklog || [];
    backlogChartSeries.value = [{ name: 'Open', data: backlog.map(o => o.count) }];
    backlogChartOptions.value = {
        ...backlogChartOptions.value,
        xaxis: { categories: backlog.map(o => o.label) }
    };

    const ackResolution = d.ackResolutionByOffice || [];
    ackResolutionByOfficeSeries.value = [
        { name: 'Ack. rate', data: ackResolution.map(o => o.ackRate) },
        { name: 'Resolution rate', data: ackResolution.map(o => o.resolutionRate) }
    ];
    ackResolutionByOfficeOptions.value = {
        ...ackResolutionByOfficeOptions.value,
        xaxis: { ...ackResolutionByOfficeOptions.value.xaxis, categories: ackResolution.map(o => o.label) }
    };

    routingAccuracy.value = d.routingAccuracy || { aiAssignedCount: 0, adminAssignedCount: 0, reassignedCount: 0, reassignmentRate: 0 };
    flow.value = d.process || {};

    slaCompliance.value = d.slaCompliance || { ackRate: null, resolutionRate: null };

    satisfaction.value = d.satisfaction || { avgRating: null, totalRatings: 0, distribution: [] };
    sentimentMix.value = d.sentiment || { positive: 0, neutral: 0, negative: 0, unread: 0 };
    satisfactionChartSeries.value = [{ name: 'Ratings', data: satisfaction.value.distribution.map(s => s.count) }];
};

const loadAnalytics = async () => {
    analyticsLoading.value = true;
    try {
        const { data } = await api.get('/complaint/analytics', { params: { period: analyticsPeriod.value, year: analyticsYear.value } });
        analyticsKpis.value = data.data.kpis || {};
        analyticsTrends.value = data.data.trends || { totalComplaints: null, avgResolutionDays: null };
        analyticsRangeLabel.value = data.data.range?.label || '';
        analyticsScopeLabel.value = data.data.scope?.label || '';
        applyAnalyticsToCharts(data.data);
    } catch (error) {
        console.error('Error loading complaint analytics:', error);
    } finally {
        analyticsLoading.value = false;
    }
};

const setAnalyticsPeriod = (period) => {
    if (analyticsPeriod.value === period) return;
    analyticsPeriod.value = period;
    loadAnalytics();
};

const stepYear = (delta) => {
    const next = analyticsYear.value + delta;
    if (next > currentYear) return;
    analyticsYear.value = next;
    loadAnalytics();
};

/* -------------------- feedback locations map -------------------- */
// Every feedback with a location on file (GET /complaint/locations — scoped/capped server-side,
// see the controller). Not period-scoped, so it isn't reloaded by setAnalyticsPeriod/stepYear —
// only on mount and on the same 'complaints:changed' refresh everything else here uses.
const locationMarkers = ref([]);
const loadLocations = async () => {
    try {
        const { data } = await api.get('/complaint/locations');
        locationMarkers.value = (data.data || []).map(c => ({
            id: c.id,
            lat: c.latitude,
            lng: c.longitude,
            title: c.referenceNo,
            subtitle: c.content,
        }));
    } catch (error) {
        console.error('Error loading feedback locations:', error);
    }
};

// No pagination controls — the rail is a continuously-sorted (newest first, per the backend's
// own ORDER BY) infinite-scroll list. append:false (the default) replaces the list from page 1,
// used for the initial load and every filter/search change; append:true is the scroll-triggered
// "load the next batch" path, used only by loadMoreComplaints below.
const getAllComplaints = async (opts = {}) => {
    const append = !!opts.append;
    if (append) { loadingMore.value = true; } else { loading.value = true; }
    try {
        const response = await api.get(`/complaint`, {
            params: {
                page: page.value,
                limit: limit.value,
                filter: filter.value,
                status: (filterStatus.value == 'all' ? '' : filterStatus.value),
                sentiment: filterSentiment.value === 'all' ? undefined : filterSentiment.value,
                office: filterOffice.value.length ? filterOffice.value.join(',') : '',
                unassigned: showUnassignedOnly.value ? 'true' : undefined,
                overdue: showOverdueOnly.value ? 'true' : undefined,
                resolutionOverdue: showResolutionOverdueOnly.value ? 'true' : undefined,
            }
        });
        const d = response.data;
        complaints.value = append ? [...complaints.value, ...d.data] : d.data;
        meta.value = d.meta;
    } catch (error) {
        console.error("Error fetching all complaints:", error);
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
}

const complaints = ref([]);
const loadingMore = ref(false);
const hasMoreComplaints = computed(() => complaints.value.length < (meta.value.TotalItems || 0));

const loadMoreComplaints = () => {
    if (loading.value || loadingMore.value || !hasMoreComplaints.value) return;
    page.value++;
    getAllComplaints({ append: true });
};

// Fires on every scroll of the rail; loadMoreComplaints itself no-ops unless there's actually
// more to fetch, so this can stay cheap and unthrottled.
const railListRef = ref(null);
const showBackToTop = ref(false);
const onRailScroll = (event) => {
    const el = event.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
        loadMoreComplaints();
    }
    showBackToTop.value = el.scrollTop > 400;
};
const scrollRailToTop = () => {
    railListRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
};

// Search box — debounced via the q-input's own `debounce` prop (v-model only updates `filter`
// once the user pauses typing), so this fires already-throttled.
watch(filter, () => {
    page.value = 1;
    getAllComplaints();
});

const formatName = (app) => {
    const user = app?.complaintDetail?.user;
    return user?.firstname || user?.lastname
        ? `${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim()
        : 'Anonymous';
}

// A single at-a-glance severity for the list rail's left-edge stripe — reads the same
// compliance fields the detail modal already annotates each row with (see
// annotateOfficeCompliance/annotateResolutionCompliance on the backend), just condensed to one
// of four buckets instead of a per-office breakdown.
const rowSeverity = (dt) => {
    if (dt.status === 'unassigned') return 'sev-bad';
    const activeOffices = (dt.complaintOffices || []).filter(co => co.isActive);
    if (activeOffices.some(co => ['late', 'overdue'].includes(co.receiveComplianceStatus))) return 'sev-bad';
    if (['late', 'overdue'].includes(dt.resolutionComplianceStatus)) return 'sev-bad';
    if (dt.resolutionComplianceStatus === 'on_time' || dt.status === 'completed') return 'sev-good';
    if (dt.resolutionComplianceStatus === 'awaiting' || activeOffices.some(co => co.receiveComplianceStatus === 'awaiting')) return 'sev-warn';
    return 'sev-flat';
};

// Active office alias(es) for a list row — the closest thing to a "category" a complaint has
// now that ComplaintType routing is gone; office is what it's actually about, in practice.
const primaryOfficeLabel = (dt) => (dt.complaintOffices || [])
    .filter(co => co.isActive)
    .map(co => co.office?.alias)
    .filter(Boolean)
    .join(', ');

const meta = ref({});
const page = ref(1);
const limit = ref(20); // batch size for infinite scroll — bigger than the old 10/page default

const UpdateOffice = () => {
    page.value = 1;
    getAllComplaints();
}

// Multi-select office filter — pill row in the rail header. Toggling one adds/removes it from
// filterOffice rather than replacing it, so several offices can be filtered on at once.
const toggleOfficeFilter = (officeId) => {
    filterOffice.value = filterOffice.value.includes(officeId)
        ? filterOffice.value.filter(id => id !== officeId)
        : [...filterOffice.value, officeId];
    UpdateOffice();
};
const clearOfficeFilter = () => {
    filterOffice.value = [];
    UpdateOffice();
};

onBeforeMount(() => {
    ComplaintStore.year = new Date().getFullYear();
    LoadOffice();
    ComplaintStore.dialog = false;
    ComplaintStore.details = {};
})

// Live refresh: the backend emits 'complaints:changed' whenever a complaint is filed, verified
// via OTP, reassigned, has its status changed, or is received/responded-to/completed by an
// office (see utils/notifySocket.broadcastComplaintsChanged). Reset to page 1 — a new complaint
// sorts to the top (createdAt DESC), and refreshing at a deeper infinite-scroll page would drop
// it. Debounced so a burst of changes triggers one refetch, not many.
let refreshTimer = null;
const onComplaintsChanged = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
        page.value = 1;
        getAllComplaints();
        if (canViewAll.value) { loadUnassignedCount(); }
        loadAnalytics();
        loadLocations();
        // If a detail dialog is open, keep it current too.
        const openId = ComplaintStore.details?.id;
        if (ComplaintStore.dialog && openId) getComplaint(openId, { resetTab: false });
    }, 800);
};

onMounted(() => {
    loadCanned();
    getAllComplaints();
    if (canViewAll.value) { loadUnassignedCount(); } loadAnalytics();
    loadLocations();
    socket.on('complaints:changed', onComplaintsChanged);
});

onUnmounted(() => {
    clearTimeout(refreshTimer);
    socket.off('complaints:changed', onComplaintsChanged);
});

/* -------------------- create complaint (super/admin, on a citizen's behalf) -------------------- */

const createComplaintDialog = ref(false);
const onComplaintCreated = () => {
    createComplaintDialog.value = false;
    // A new complaint always sorts to the very top (createdAt DESC) — without resetting to page
    // 1, refreshing at whatever page the rail's infinite scroll had reached would replace the
    // list with that later page's rows instead, and the new complaint wouldn't show up at all.
    page.value = 1;
    getAllComplaints();
    if (canViewAll.value) { loadUnassignedCount(); } loadAnalytics();
};

const editComplaintDialog = ref(false);
const onComplaintEdited = async () => {
    editComplaintDialog.value = false;
    const id = ComplaintStore.details?.id;
    if (id) await getComplaint(id, { resetTab: false });
    getAllComplaints();
    if (canViewAll.value) { loadUnassignedCount(); } loadAnalytics();
};

const OptionStatus = ref([
    {
        value: "all",
        label: "All"
    },
    {
        value: "unverified",
        label: "Unverified"
    },
    {
        value: "pending",
        label: "Pending"
    },
    {
        value: "unassigned",
        label: "Unassigned"
    },
    {
        value: "ongoing",
        label: "Ongoing"
    },
    {
        value: "completed",
        label: "Completed"
    },
    {
        value: "cancelled",
        label: "Cancelled"
    }
]);

const OptionOffice = ref([]);
const filteredOffice = ref([]);

const LoadOffice = async () => {
    try {
        const { data } = await api.get(`/preference/office/getOffice`);
        OptionOffice.value = [
            {
                label: 'All',
                value: 'all'
            },
            ...(data || []).map(d => {
                const baseLabel = d.label ?? d.alias ?? String(d.text ?? d.value ?? '');
                return {
                    label: baseLabel,
                    name: d.name || baseLabel,
                    // Formal name + alias, e.g. "Office of the Local Economic and Business
                    // Development Officer (LEBDO)" — used by the reassignment office list below.
                    fullLabel: d.name ? (d.alias ? `${d.name} (${d.alias})` : d.name) : baseLabel,
                    value: Number(d.value ?? d.id)
                };
            })
        ];
        filteredOffice.value = [...OptionOffice.value];
    } catch (error) {
        console.error("Error fetching options:", error);
    }
};


// resetTab: true only when opening the modal on a (possibly different) complaint — the tab
// should land on "responses" by default there. Every post-save refresh (reassign, status change,
// receive, respond) passes resetTab: false so the tab the user was already on doesn't jump back.
const getComplaint = async (id, { resetTab = true } = {}) => {
    resetReassignPanel();
    statusChoice.value = null;
    statusRemarks.value = '';
    completionSuggestion.value = null;
    markAsDone.value = false;
    if (resetTab) activeTab.value = 'details';
    try {
        const response = await api.get(`/complaint/${id}`);
        const d = response.data;
        ComplaintStore.details = d.data;

        // Re-assignment tab defaults to what's already active — a supervisor opening it is far
        // more often adjusting the current assignment than replacing it wholesale, so both panels
        // start pre-selected on the current office(s)/tier rather than blank.
        const activeOfficeRows = (d.data.complaintOffices || []).filter(co => co.isActive);
        selectedOfficeIds.value = activeOfficeRows.map(co => co.officeId);
        const reasons = {};
        activeOfficeRows.forEach(co => { if (co.assignmentReason) reasons[co.officeId] = co.assignmentReason; });
        reasonsByOffice.value = reasons;
    } catch (error) {
        console.error("Error fetching all complaints:", error);
    }
}

// Once a complaint is finalized (completed/cancelled), every transactional module — reassignment,
// status changes, workstation responses — is locked. Only the record itself (content, responses,
// history) stays viewable.
const isTerminal = computed(() => ['completed', 'cancelled'].includes(ComplaintStore.details?.status));

/* -------------------- responses -------------------- */

// Latest first — the backend doesn't guarantee an order, and the merged "responses" tab (compose
// on top, history below) reads better with the newest reply right under the compose box.
const sortedResponses = computed(() =>
    [...(ComplaintStore.details?.responses || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
);

const responseDepartment = (r) => {
    const office = r?.user?.staff?.office;
    if (office) return office.alias || office.name;
    // Super/admin have no office of their own — label by role instead of repeating their name.
    if (['super', 'admin'].includes(r?.user?.role)) return 'supervisor';
    // The citizen who filed the complaint can also post a follow-up (see the external app's
    // "add a follow-up" box) — label it distinctly from staff/supervisor entries.
    if (r?.user?.role === 'citizen') return 'citizen';
    return 'Unknown';
};

const responderName = (r) => {
    const u = r?.user;
    const name = `${u?.firstname || ''} ${u?.lastname || ''}`.trim();
    return name || u?.username || 'Unknown';
};

/* -------------------- response ratings -------------------- */

// Only staff/supervisor replies can be rated — a citizen's own follow-up can't (matches the
// external app, which hides the star widget on citizen-authored entries).
const canBeRated = (r) => r?.user?.role !== 'citizen';

// The complaint is owned by a single citizen, and only that citizen can rate (enforced
// server-side), so responseRatings holds 0 or 1 entry — their score for this response.
const responseRating = (r) => r?.responseRatings?.[0]?.rate ?? 0;

// Citizen satisfaction per office, from the stars left on that office's responses in THIS
// complaint. Office = the responding staff member's office (responseDepartment), so a
// supervisor's general updates group under "supervisor".
const officeSatisfaction = computed(() => {
    const groups = {};
    for (const r of (ComplaintStore.details?.responses || [])) {
        if (!canBeRated(r)) continue;
        const rate = responseRating(r);
        if (!rate) continue;
        const label = responseDepartment(r);
        if (!groups[label]) groups[label] = [];
        groups[label].push(rate);
    }
    return Object.entries(groups).map(([label, rates]) => ({
        label,
        count: rates.length,
        avg: rates.reduce((sum, x) => sum + x, 0) / rates.length,
    }));
});

const responderInitials = (r) => {
    const u = r?.user;
    const initials = `${(u?.firstname || '')[0] || ''}${(u?.lastname || '')[0] || ''}`.toUpperCase();
    return initials || '?';
};

const formatAvatar = (user) => `${process.env.VUE_APP_BACKEND_URL}${user.avatar}`;

const isResponsePdf = (file) => file?.file?.startsWith('data:application/pdf') || /\.pdf$/i.test(file?.filename || '');

// the photo viewer, shared by the feedback's photos and the pictures on a response: a list of pictures and the one shown
const galleryUrls = ref([]);
const galleryIndex = ref(0);
const showGallery = computed({
    get: () => galleryUrls.value.length > 0,
    set: (v) => { if (!v) galleryUrls.value = []; },
});
const openGallery = (urls, index = 0) => {
    galleryUrls.value = urls;
    galleryIndex.value = Math.max(0, index);
};
const galleryStep = (dir) => {
    const n = galleryUrls.value.length;
    if (n > 1) galleryIndex.value = (galleryIndex.value + dir + n) % n;
};
const onGalleryKey = (e) => {
    if (e.key === 'ArrowLeft') galleryStep(-1);
    else if (e.key === 'ArrowRight') galleryStep(1);
};
watch(showGallery, (open) => {
    if (open) window.addEventListener('keydown', onGalleryKey);
    else window.removeEventListener('keydown', onGalleryKey);
});
onUnmounted(() => window.removeEventListener('keydown', onGalleryKey));
const responsePhotoUrls = (r) => (r.responseFiles || []).filter(f => !isResponsePdf(f)).map(f => f.file);

/* -------------------- acknowledgement compliance -------------------- */
// co.receiveComplianceStatus is computed server-side from receivedAt/receiveDeadline — see
// getReceiveComplianceStatus in the backend's utils/businessHours.js. Never derived here.

const complianceLabel = (co) => ({
    on_time: 'acknowledged on time',
    late: 'acknowledged late',
    overdue: 'acknowledgement overdue',
    awaiting: `awaiting — ${formatTimeLeft(co.receiveDeadline)}`,
}[co.receiveComplianceStatus] || '');

const complianceColor = (co) => ({
    on_time: 'positive',
    late: 'negative',
    overdue: 'negative',
    awaiting: 'orange',
}[co.receiveComplianceStatus] || 'grey');

const complianceTooltip = (co) => {
    const deadline = co.receiveDeadline ? moment(co.receiveDeadline).format('MMM DD, YYYY hh:mm A') : null;
    if (!deadline) return '';
    if (co.receiveComplianceStatus === 'awaiting') return `Must be received by ${deadline} (24 business hours from assignment).`;
    if (co.receiveComplianceStatus === 'overdue') return `Deadline was ${deadline} — still not received.`;
    if (co.receiveComplianceStatus === 'on_time') return `Received on ${moment(co.receivedAt).format('MMM DD, YYYY hh:mm A')} — deadline was ${deadline}.`;
    if (co.receiveComplianceStatus === 'late') return `Received on ${moment(co.receivedAt).format('MMM DD, YYYY hh:mm A')} — past the ${deadline} deadline.`;
    return '';
};

const formatTimeLeft = (deadline) => {
    if (!deadline) return '';
    const hours = moment(deadline).diff(moment(), 'hours');
    if (hours < 1) return 'less than 1h left';
    if (hours < 24) return `${hours}h left`;
    return `${Math.round(hours / 24)}d left`;
};

/* -------------------- resolution compliance (whole-complaint, ARTA/EODB tier) -------------------- */
// ComplaintStore.details.resolutionComplianceStatus is computed server-side from
// completedAt/resolutionDeadline — see getResolutionComplianceStatus in the backend's
// utils/businessHours.js. Never derived here.

const formatDaysLeft = (deadline) => {
    if (!deadline) return '';
    const days = moment(deadline).diff(moment(), 'days');
    if (days < 1) return formatTimeLeft(deadline);
    return `${days}d left`;
};

const resolutionComplianceLabel = computed(() => ({
    on_time: 'resolved on time',
    late: 'resolved late',
    overdue: 'resolution overdue',
    awaiting: `resolution due — ${formatDaysLeft(ComplaintStore.details?.resolutionDeadline)}`,
}[ComplaintStore.details?.resolutionComplianceStatus] || ''));

const resolutionComplianceColor = computed(() => ({
    on_time: 'positive',
    late: 'negative',
    overdue: 'negative',
    awaiting: 'orange',
}[ComplaintStore.details?.resolutionComplianceStatus] || 'grey'));

const resolutionComplianceTooltip = computed(() => {
    const d = ComplaintStore.details;
    const deadline = d?.resolutionDeadline ? moment(d.resolutionDeadline).format('MMM DD, YYYY hh:mm A') : null;
    if (!deadline) return '';
    if (d.resolutionComplianceStatus === 'awaiting') return `Target resolution by ${deadline}${d.extensionGrantedAt ? ' (extended by 3 days)' : ''}.`;
    if (d.resolutionComplianceStatus === 'overdue') return `Target was ${deadline} — still not resolved.`;
    if (d.resolutionComplianceStatus === 'on_time') return `Resolved on ${moment(d.completedAt).format('MMM DD, YYYY hh:mm A')} — target was ${deadline}.`;
    if (d.resolutionComplianceStatus === 'late') return `Resolved on ${moment(d.completedAt).format('MMM DD, YYYY hh:mm A')} — past the ${deadline} target.`;
    return '';
});

// THIS complaint's own office-done -> approval gap — computed client-side from data already on
// the detail payload (each office's completedAt + the complaint's own), no separate endpoint
// needed. Only meaningful once actually completed; null while still open or if cancelled.
const approvalLagForThisComplaint = computed(() => {
    const d = ComplaintStore.details;
    if (!d || d.status !== 'completed' || !d.completedAt) return null;
    const activeCompletedAts = (d.complaintOffices || [])
        .filter(co => co.isActive && co.completedAt)
        .map(co => new Date(co.completedAt).getTime());
    if (!activeCompletedAts.length) return null;
    const lastOfficeDoneAt = Math.max(...activeCompletedAts);
    const hours = (new Date(d.completedAt).getTime() - lastOfficeDoneAt) / 3600000;
    return hours >= 0 ? { lastOfficeDoneAt, hours } : null;
});
const approvalLagForThisComplaintLabel = computed(() => {
    const lag = approvalLagForThisComplaint.value;
    return lag ? formatResolutionTime(lag.hours / 24) : null;
});

/* -------------------- the overview tab -------------------- */
const VIA_SHORT = { otp: 'via email code', account: 'via citizen account', staff: 'filed by staff' };
const VIA_CHANNEL = { otp: 'Guest, verified by email code', account: 'Signed-in citizen account', staff: 'Staff, for the citizen' };
const viaShort = computed(() => VIA_SHORT[ComplaintStore.details?.via] || '');
// the details in the panel next to Manage
const TRAIL_TONE = { completed: 'ok', cancelled: 'off', ongoing: 'info', pending: 'warn', unassigned: 'warn', verified: 'info', unverified: 'off' };
const trailStatus = computed(() => (ComplaintStore.details?.status ? { label: ComplaintStore.details.status, tone: TRAIL_TONE[ComplaintStore.details.status] || 'off' } : null));
const trailFacts = computed(() => {
    const d = ComplaintStore.details;
    if (!d) return [];
    const offices = (d.complaintOffices || []).filter(co => co.isActive).map(co => co.office?.alias || co.office?.name).filter(Boolean);
    return [
        { label: 'Filed', value: d.createdAt ? moment(d.createdAt).format('MMM DD, YYYY') : '—', icon: 'bi-calendar-check' },
        { label: 'Due', value: d.resolutionDeadline ? moment(d.resolutionDeadline).format('MMM DD, YYYY') : 'Not set yet', icon: 'bi-hourglass-split', dim: !d.resolutionDeadline },
        { label: 'Offices', value: offices.join(', ') || 'Not assigned', icon: 'bi-diagram-3', dim: !offices.length },
        { label: 'Replies', value: String((d.responses || []).length), icon: 'bi-chat-dots' },
        { label: 'Reads as', value: d.sentiment || 'Not read yet', icon: 'bi-emoji-neutral', dim: !d.sentiment },
    ];
});

// how the resolution stands, as one phrase and one tone (ok / bad / warn / off) shared by the tile and the details
const RESOLUTION_HEADLINE = { on_time: 'Resolved on time', late: 'Resolved late', overdue: 'Overdue' };
const resolutionTone = computed(() => ({ on_time: 'ok', late: 'bad', overdue: 'bad', awaiting: 'warn' }[ComplaintStore.details?.resolutionComplianceStatus] || 'off'));
const resolutionHeadline = computed(() => {
    const d = ComplaintStore.details;
    if (d?.status === 'cancelled') return 'Closed';
    if (!d?.resolutionDeadline) return 'Not routed yet';
    const status = d.resolutionComplianceStatus;
    if (RESOLUTION_HEADLINE[status]) return RESOLUTION_HEADLINE[status];
    return status === 'awaiting' ? formatDaysLeft(d.resolutionDeadline) : moment(d.resolutionDeadline).fromNow();
});

const fmtFull = (value) => (value ? moment(value).format('MMM DD, YYYY hh:mm A') : '—');
// the dates and deadlines of this feedback, one row each; a row may carry one pill (the outcome) on the same line
const detailRows = computed(() => {
    const d = ComplaintStore.details;
    if (!d) return [];
    const terminal = ['completed', 'cancelled'].includes(d.status);
    const outcome = resolutionComplianceLabel.value
        ? { text: resolutionComplianceLabel.value, tone: resolutionTone.value, tip: resolutionComplianceTooltip.value }
        : null;
    const rows = [
        { label: 'Reference', value: d.referenceNo, icon: 'bi-hash', tone: 'red' },
        { label: 'Filed', value: fmtFull(d.createdAt), icon: 'bi-calendar-check', tone: 'teal' },
        { label: 'Channel', value: VIA_CHANNEL[d.via] || d.via || '—', icon: 'bi-phone', tone: 'purple' },
        { label: 'Resolution due', value: d.resolutionDeadline ? fmtFull(d.resolutionDeadline) : 'Not routed yet', icon: 'bi-hourglass-split', tone: 'amber', pill: terminal ? null : outcome },
    ];
    if (d.extensionGrantedAt) {
        rows.push({
            label: 'Extension', value: `+3 days, granted ${fmtFull(d.extensionGrantedAt)}`, icon: 'bi-calendar-plus', tone: 'amber',
            tip: d.extensionReason || '',
        });
    }
    if (terminal && d.completedAt) {
        rows.push({
            label: d.status === 'completed' ? 'Completed' : 'Cancelled', value: fmtFull(d.completedAt),
            icon: d.status === 'completed' ? 'bi-flag' : 'bi-x-circle', tone: d.status === 'completed' ? 'teal' : 'red',
            pill: d.status === 'completed' ? outcome : null,
        });
    }
    const lag = approvalLagForThisComplaint.value;
    if (lag) {
        rows.push({
            label: 'Approved',
            value: lag.hours * 60 < 1 ? 'Right after the last office finished' : `${approvalLagForThisComplaintLabel.value} after the last office finished`,
            icon: 'bi-person-check', tone: 'blue',
            tip: `Every assigned office had marked its own part done by ${fmtFull(lag.lastOfficeDoneAt)}; a supervisor finalized it afterwards.`,
        });
    }
    return rows;
});

// the offices handling it: the colour of the status pill, and the line about the acknowledgement
const ACK_ICON = { ok: 'bi-check-circle-fill', bad: 'bi-exclamation-circle-fill', warn: 'bi-clock-history' };
const ackTone = (co) => ({ on_time: 'ok', late: 'bad', overdue: 'bad', awaiting: 'warn' }[co.receiveComplianceStatus] || 'ok');
const officeTone = (co) => ({ completed: 'ok', cancelled: 'bad', received: 'info', ongoing: 'info' }[co.status] || 'off');

/* -------------------- office reassignment -------------------- */

// All offices ever assigned — active or disabled (cancellation disables rather than removes
// them, see requestStatusChange, so a cancelled complaint's offices still show up here, greyed
// out and badged "disabled" in the template).
const displayOffices = computed(() => ComplaintStore.details?.complaintOffices || []);

// Single-pin marker for this complaint's own location, if it has one on file (LocationMap takes
// an array either way — see the "feedback locations" overview panel for the multi-pin case).
const detailLocationMarkers = computed(() => {
    const detail = ComplaintStore.details?.complaintDetail;
    const lat = detail?.latitude != null ? Number(detail.latitude) : null;
    const lng = detail?.longitude != null ? Number(detail.longitude) : null;
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return [];
    return [{ id: ComplaintStore.details.id, lat, lng, title: ComplaintStore.details?.referenceNo }];
});
const activeOffices = computed(() => displayOffices.value.filter(co => co.isActive));
// Offices still assigned (active) that haven't acknowledged/received the complaint yet — mirrors
// the backend's own guard in updateStatus, surfaced here so the "completed" card is disabled
// client-side too instead of only failing after submit.
const officesNotReceived = computed(() => activeOffices.value.filter(co => co.status === 'pending'));

const suggestions = ref([]);
const suggestLoading = ref(false);
const suggestionsChecked = ref(false);
const suggestedOfficeIds = computed(() => new Set(suggestions.value.map(s => s.officeId)));

// Multi-office selection: which office cards are checked, and each one's reason (from the AI
// suggestion it matched, or left blank for a manually-added office — the shared textarea below
// is used as a fallback for those at submit time).
const selectedOfficeIds = ref([]);
const reasonsByOffice = ref({});
const reassignReason = ref(''); // fallback reason for offices with no reason of their own
const reassignLoading = ref(false);

// Saving the assignment needs something to save: an office chosen, a change from what is assigned now (or a reason typed),
// and a reason for every office that is new to this feedback (its own, from the AI suggestion, or the shared one).
const currentOfficeIds = computed(() => (ComplaintStore.details?.complaintOffices || []).filter(co => co.isActive).map(co => co.officeId));
const assignChanged = computed(() => {
    const now = [...currentOfficeIds.value].sort((a, b) => a - b);
    const chosen = [...selectedOfficeIds.value].sort((a, b) => a - b);
    return now.length !== chosen.length || chosen.some((id, i) => id !== now[i]);
});
const assignProblems = computed(() => {
    if (!selectedOfficeIds.value.length) return ['Choose at least one office.'];
    const out = [];
    const sharedReason = reassignReason.value.trim();
    const withoutReason = selectedOfficeIds.value.filter(id => !currentOfficeIds.value.includes(id) && !reasonsByOffice.value[id] && !sharedReason);
    if (withoutReason.length) out.push('Write the reason for the new office' + (withoutReason.length > 1 ? 's.' : '.'));
    if (!assignChanged.value && !sharedReason) out.push('Nothing has changed yet.');
    return out;
});
// Offices with a reason on file (AI-suggested or picked up from a manual match) — the list shown
// below the office pill row.
const officesWithReason = computed(() => filteredOffice.value.filter(o => o.value !== 'all' && reasonsByOffice.value[o.value]));

const resetReassignPanel = () => {
    suggestions.value = [];
    suggestLoading.value = false;
    suggestionsChecked.value = false;
    selectedOfficeIds.value = [];
    reasonsByOffice.value = {};
    reassignReason.value = '';
    reassignLoading.value = false;
    extensionReason.value = '';
    receiveText.value = null;
    receiveTouched.value = false;
};

// The one-time 3-day extension (see requestExtension in the backend's ComplaintController).
const extensionReason = ref('');
const extensionLoading = ref(false);

const canRequestExtension = computed(() => {
    const d = ComplaintStore.details;
    if (!d || isTerminal.value || isMonitoring.value) return false;
    if (!d.resolutionDeadline || d.extensionGrantedAt) return false;
    if (moment(d.resolutionDeadline).isBefore(moment())) return false;
    if (!isSupervisor.value && myOfficeAssignment.value?.status === 'pending') return false; // the office must receive it first
    return isSupervisor.value || (AuthStore.user?.role === 'workstation' && !!myOfficeAssignment.value);
});

// Why the request box is not offered
const extensionUnavailableReason = computed(() => {
    const d = ComplaintStore.details;
    if (isTerminal.value) return 'This feedback is finalized, so it cannot be extended.';
    if (isMonitoring.value) return 'Monitoring accounts are view-only.';
    if (!isSupervisor.value && myOfficeAssignment.value?.status === 'pending') return 'Receive it first';
    if (d?.resolutionDeadline && moment(d.resolutionDeadline).isBefore(moment())) return 'The deadline has already passed, so it can no longer be extended.';
    return 'Only the office handling this feedback can ask for an extension.';
});

const requestExtension = async () => {
    const id = ComplaintStore.details?.id;
    if (!id || extensionReason.value.trim().length < 5) return;

    const result = await Swal.fire({
        title: 'Extend by 3 days?',
        html: 'The resolution deadline moves 3 days later. This can only be done once for this feedback.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'extend',
        cancelButtonText: 'cancel',
        reverseButtons: true
    });
    if (!result.isConfirmed) return;

    extensionLoading.value = true;
    try {
        const response = await api.post(`/complaint/${id}/extension`, { reason: extensionReason.value.trim() });
        Toast.fire({
            icon: 'success',
            html: `<div class="text-h6 text-bold text-uppercase">extended!</div><div class="text-caption">${response.data.message}</div>`
        });
        extensionReason.value = '';
        await getComplaint(id, { resetTab: false });
        loadAnalytics();
    } catch (error) {
        console.error('Error extending the feedback:', error);
        Toast.fire({
            icon: 'error',
            html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption">${error.response?.data?.message || 'Unable to extend this feedback.'}</div>`
        });
    } finally {
        extensionLoading.value = false;
    }
};

const loadSuggestions = async () => {
    const id = ComplaintStore.details?.id;
    if (!id) return;

    suggestLoading.value = true;
    suggestionsChecked.value = false;
    try {
        const response = await api.get(`/complaint/${id}/suggest-office`);
        suggestions.value = response.data?.suggestions || [];
        suggestionsChecked.value = true;
        // Auto-check every suggested card and drop in its reason — no extra "use this" click needed.
        applyAllSuggestions();
    } catch (error) {
        console.error("Error fetching office suggestion:", error);
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'Unable to get a suggestion right now.'}<div>
            `
        });
    } finally {
        suggestLoading.value = false;
    }
};

const applyAllSuggestions = () => {
    const ids = new Set(selectedOfficeIds.value);
    for (const s of suggestions.value) {
        ids.add(s.officeId);
        reasonsByOffice.value[s.officeId] = s.reason || '';
    }
    selectedOfficeIds.value = [...ids];
};

// Toggle a card in/out of the selected set. Checking one that was AI-suggested adopts its reason.
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

const submitReassign = async () => {
    const id = ComplaintStore.details?.id;
    if (!id || assignLocked.value || assignProblems.value.length) return;

    const names = selectedOfficeIds.value
        .map(oid => {
            const o = filteredOffice.value.find(x => x.value === oid);
            return o?.fullLabel || o?.label || `Office #${oid}`;
        });
    const result = await Swal.fire({
        title: names.length ? 'Reassign this feedback?' : 'Clear this assignment?',
        html: names.length
            ? `Set the handling office(s) to <b>${esc(names.join(', '))}</b>? Any office not in that list is unassigned from this feedback, and each new one starts its own acknowledgement clock.`
            : `Remove every office from this feedback? It goes back to <b>unassigned</b> for someone to route manually.`,
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
            reason: reasonsByOffice.value[officeId] || reassignReason.value || undefined
        }));
        const response = await api.patch(`/complaint/${id}/office`, { offices });
        Toast.fire({
            icon: "success",
            html: `
                <div class="text-h6 text-bold text-uppercase">granted!</div>
                <div class="text-caption;">${response.data.message}<div>
            `
        });
        await getComplaint(id, { resetTab: false });
        getAllComplaints();
        if (canViewAll.value) { loadUnassignedCount(); } loadAnalytics();
    } catch (error) {
        console.error("Error reassigning office:", error);
        Toast.fire({
            icon: "error",
            html: `
                <div class="text-h6 text-bold text-uppercase">error!</div>
                <div class="text-caption;">${error.response?.data?.message || 'Unable to reassign this feedback.'}<div>
            `
        });
    } finally {
        reassignLoading.value = false;
    }
};

/* -------------------- status control (super/admin) -------------------- */
// One process for every whole-complaint transition — finalize forward (completed/cancelled, via
// updateStatus) or walk back (reopen, via ComplaintController.reopen) all go through this same
// pick-a-card -> remarks/reason -> submit flow (see the status tab's template). Which target(s)
// are even offered is decided by the template (canReopen); this function just dispatches to
// whichever endpoint that target actually needs.

const statusLoading = ref(false);
const statusChoice = ref(null); // which card is selected — 'completed' | 'cancelled' | 'reopen' | null
const statusRemarks = ref(''); // doubles as the reopen reason when statusChoice === 'reopen'

const requestStatusChange = (target) => {
    if (!target) return;
    const isReopen = target === 'reopen';

    if (isReopen) {
        if (!statusRemarks.value.trim()) {
            Toast.fire({
                icon: "error",
                html: `<div class="text-h6 text-bold text-uppercase">not yet</div><div class="text-caption;">A reason is required to reopen this feedback.<div>`
            });
            return;
        }
    } else {
        if (ComplaintStore.details?.status === target) return;
        if (target === 'completed' && officesNotReceived.value.length) {
            Toast.fire({
                icon: "error",
                html: `<div class="text-h6 text-bold text-uppercase">not yet</div><div class="text-caption;">Every assigned office must acknowledge/receive the feedback first.<div>`
            });
            return;
        }
    }

    Swal.fire({
        title: isReopen ? 'Reopen this feedback?' : 'Confirm',
        html: isReopen
            ? (ComplaintStore.details?.status === 'cancelled'
                ? `This tells the citizen it is being looked at again, and switches back on the offices the cancellation closed.`
                : `This tells the citizen it isn't actually resolved yet, and resets every office that was marked completed back to ongoing.`)
            : `Mark this feedback as <b>${target.toUpperCase()}</b>? Every office it's assigned to will be marked ${target} as well. This should only be done when it's final.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: isReopen ? 'reopen' : 'confirm',
        cancelButtonText: 'cancel',
        reverseButtons: true
    }).then(async (result) => {
        if (!result.isConfirmed) return;

        const id = ComplaintStore.details?.id;
        if (!id) return;

        statusLoading.value = true;
        try {
            const response = isReopen
                ? await api.patch(`/complaint/${id}/reopen`, { reason: statusRemarks.value.trim() })
                : await api.patch(`/complaint/${id}/status`, {
                    status: target,
                    remarks: statusRemarks.value,
                    // Purely a history-log tag on the backend (see updateStatus) — true whenever the
                    // AI suggestion banner was showing an eligible suggestion at submit time,
                    // regardless of whether the remarks were left as-drafted or edited.
                    aiAssisted: target === 'completed' && !!completionSuggestion.value?.eligible && !completionSuggestion.value?.llmUnavailable
                });
            Toast.fire({
                icon: "success",
                html: `<div class="text-h6 text-bold text-uppercase">${isReopen ? 'reopened!' : 'updated!'}</div><div class="text-caption;">${response.data.message}<div>`
            });
            statusChoice.value = null;
            statusRemarks.value = '';
            completionSuggestion.value = null;
            await getComplaint(id, { resetTab: false });
            getAllComplaints();
            if (canViewAll.value) { loadUnassignedCount(); } loadAnalytics();
        } catch (error) {
            console.error("Error updating status:", error);
            Toast.fire({
                icon: "error",
                html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption;">${error.response?.data?.message || (isReopen ? 'Unable to reopen this feedback.' : 'Unable to update status.')}<div>`
            });
        } finally {
            statusLoading.value = false;
        }
    });
};

/* -------------------- AI-assisted completion suggestion (super/admin) -------------------- */
// Advisory only — GET /complaint/:id/completion-suggestion never changes anything server-side.
// Accepting it just pre-fills statusChoice/statusRemarks above; the actual finalization still
// goes through requestStatusChange -> updateStatus like any manual completion.

// { eligible, reason, draftRemarks, llmUnavailable, basis?, aiJudged?, officeMarksReady? } | null
const completionSuggestion = ref(null);
const completionSuggestLoading = ref(false);

const loadCompletionSuggestion = async () => {
    const id = ComplaintStore.details?.id;
    if (!id) return;

    completionSuggestLoading.value = true;
    try {
        const { data } = await api.get(`/complaint/${id}/completion-suggestion`);
        completionSuggestion.value = data;
        if (data.eligible && !officesNotReceived.value.length) {
            statusChoice.value = 'completed';
            if (data.draftRemarks) statusRemarks.value = data.draftRemarks;
        }
    } catch (error) {
        console.error("Error fetching completion suggestion:", error);
        Toast.fire({
            icon: "error",
            html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption;">${error.response?.data?.message || 'Unable to get a suggestion right now.'}<div>`
        });
    } finally {
        completionSuggestLoading.value = false;
    }
};

/* -------------------- undone (super/admin) -------------------- */
// The counterpart to the response composer's "done" pill — reverses ONE office's own completion
// while the complaint as a whole is still open (see ResponseController.reopenOffice). The bigger
// "reopen this complaint" case, for after the whole thing was already finalized, is folded into
// the unified status panel above instead (statusChoice === 'reopen').

const sendBackLoading = ref(null); // holds the ComplaintOffice id currently being marked undone, or null

const confirmSendBack = (co) => {
    // Plain confirmation only — no reason prompt. Unlike the whole-complaint reopen above (which
    // reverses an already citizen-notified finalization and keeps a mandatory reason), undoing one
    // office's own "done" mark while the complaint is still open is lower-stakes and doesn't need one.
    Swal.fire({
        title: 'Mark undone?',
        html: `Reverse <b class="text-uppercase">${esc(co.office?.name || co.office?.alias)}</b>'s "done" mark on this feedback? They'll need to resolve it again.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'mark undone',
        cancelButtonText: 'cancel',
        reverseButtons: true
    }).then(async (result) => {
        if (!result.isConfirmed) return;

        sendBackLoading.value = co.id;
        try {
            const response = await api.post('/response/reopen', { complaintOfficeId: co.id });
            Toast.fire({
                icon: "success",
                html: `<div class="text-h6 text-bold text-uppercase">marked undone!</div><div class="text-caption;">${response.data.message}<div>`
            });
            await getComplaint(ComplaintStore.details.id, { resetTab: false });
            getAllComplaints();
        } catch (error) {
            console.error("Error marking office undone:", error);
            Toast.fire({
                icon: "error",
                html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption;">${error.response?.data?.message || 'Unable to mark this undone.'}<div>`
            });
        } finally {
            sendBackLoading.value = null;
        }
    });
};

/* -------------------- workstation actions -------------------- */

// The actions card at the top of the detail dialog only appears when there is something to do: Receive when
// this person's own office holds it unacknowledged, or Edit on a staff-filed feedback.
const canReceiveHere = computed(() => !isTerminal.value && !isMonitoring.value && myOfficeAssignment.value?.status === 'pending');
const isStaffFiled = computed(() => isSupervisor.value && ComplaintStore.details?.via === 'staff');
// once an office has acknowledged it, what it received can no longer change underneath it
const acknowledgedOffices = computed(() => activeOffices.value.filter(co => co.status !== 'pending'));
const canEditStaffFiled = computed(() => isStaffFiled.value && !isTerminal.value && !acknowledgedOffices.value.length);
const detailActionsHint = computed(() => {
    if (canReceiveHere.value) return 'Your office has not received this yet. Receive it, with a short message to the citizen, to start responding.';
    if (canEditStaffFiled.value) return 'Filed by staff — you can edit it until it is finalized.';
    return '';
});

// "Where it stands": the path a feedback takes, each step done / current / still to come. A cancelled
// one stops at the step it reached and shows a red cross after it.
const progressSteps = computed(() => {
    const d = ComplaintStore.details;
    if (!d) return [];
    const active = (d.complaintOffices || []).filter(co => co.isActive);
    const reached = [
        true,                                                                   // filed
        d.status !== 'unverified',                                              // verified
        active.length > 0,                                                      // routed to an office
        active.some(co => co.receivedAt || ['received', 'ongoing', 'completed'].includes(co.status)), // an office received it
        (d.responses?.length || 0) > 0 || active.some(co => ['ongoing', 'completed'].includes(co.status)), // someone responded
        d.status === 'completed',                                               // done
    ];
    const defs = [
        { label: 'Filed', icon: 'bi-send' },
        { label: 'Verified', icon: 'bi-patch-check' },
        { label: 'Routed', icon: 'bi-diagram-3' },
        { label: 'Received', icon: 'bi-inbox' },
        { label: 'Responded', icon: 'bi-chat-dots' },
        { label: 'Done', icon: 'bi-flag' },
    ];
    const lastDone = reached.lastIndexOf(true);
    const steps = defs.map((def, i) => ({
        ...def,
        state: i <= lastDone ? 'done' : (i === lastDone + 1 && d.status !== 'cancelled' ? 'now' : 'todo'),
    }));
    if (d.status === 'cancelled') steps.push({ label: 'Cancelled', icon: 'bi-x-lg', state: 'bad' });
    return steps;
});

// the line under the reporter's name
const VIA_LABELS = { otp: 'filed with email verification', account: 'filed from a citizen account', staff: 'filed by staff for the citizen' };
const filedLine = computed(() => {
    const d = ComplaintStore.details;
    if (!d) return '';
    return [d.createdAt ? `Filed ${moment(d.createdAt).format('MMM DD, YYYY hh:mm A')}` : '', VIA_LABELS[d.via] || ''].filter(Boolean).join(' · ');
});

// a small picture for each kind of activity-history entry
// What each kind of entry in the activity history is called, drawn and coloured (ok / info / warn / bad / off). Two
// kinds of routing share one name, so the overview counts them together.
const ACTIVITY_KINDS = {
    filed: { label: 'Filed', icon: 'bi-send', tone: 'info' },
    verified: { label: 'Verified', icon: 'bi-patch-check', tone: 'info' },
    auto_assigned: { label: 'Routed', icon: 'bi-robot', tone: 'info' },
    reassigned: { label: 'Routed', icon: 'bi-arrow-left-right', tone: 'info' },
    left_unassigned: { label: 'Left unassigned', icon: 'bi-question-circle', tone: 'warn' },
    received: { label: 'Acknowledged', icon: 'bi-inbox', tone: 'ok' },
    responded: { label: 'Responses', icon: 'bi-chat-dots', tone: 'info' },
    rated: { label: 'Ratings', icon: 'bi-star-fill', tone: 'warn' },
    extended: { label: 'Extension', icon: 'bi-calendar-plus', tone: 'warn' },
    office_completed: { label: 'Office done', icon: 'bi-check2-circle', tone: 'ok' },
    office_reopened: { label: 'Office reopened', icon: 'bi-arrow-counterclockwise', tone: 'warn' },
    reopened: { label: 'Reopened', icon: 'bi-arrow-counterclockwise', tone: 'warn' },
    edited: { label: 'Edited', icon: 'bi-pencil', tone: 'off' },
    completed: { label: 'Completed', icon: 'bi-flag-fill', tone: 'ok' },
    cancelled: { label: 'Cancelled', icon: 'bi-x-circle', tone: 'bad' },
};
const TONE_HEX = { ok: '#21BA45', info: '#204888', warn: '#E0A100', bad: '#C10015', off: '#8493AC' };
const kindOf = (action) => ACTIVITY_KINDS[action] || { label: String(action || 'activity').replace(/_/g, ' '), icon: 'bi-dot', tone: 'off' };
const historyIcon = (action) => kindOf(action).icon;

// a gap between two moments: "right away", "40m", "3h 5m", "2d 4h"
const durationLabel = (ms) => {
    const minutes = Math.max(0, Math.round(ms / 60000));
    if (minutes < 1) return 'right away';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
};
const RESPONDER_ROLE = { citizen: 'Citizen', workstation: 'Office staff', admin: 'Supervisor', super: 'Supervisor', ai: 'AI' };
const initialsOf = (label) => String(label || '?').split(/[\s—-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

// the history, oldest first (the API sends it newest first)
const historyAsc = computed(() => [...(ComplaintStore.details?.history || [])]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id - b.id));

// the four numbers across the top of the Activity tab
const activityStats = computed(() => {
    const d = ComplaintStore.details;
    const h = historyAsc.value;
    if (!d || !h.length) return {};
    const latest = h[h.length - 1];
    const end = isTerminal.value && d.completedAt ? moment(d.completedAt) : moment();
    const clientId = d.complaintDetail?.userId;
    const responses = d.responses || [];
    const fromCitizen = clientId ? responses.filter(r => r.userId === clientId).length : 0;
    return {
        entries: h.length,
        people: new Set(h.map(x => x.actorLabel).filter(Boolean)).size,
        span: moment.duration(end.diff(moment(d.createdAt))).humanize(),
        spanSub: isTerminal.value
            ? `${moment(d.createdAt).format('MMM DD')} → ${end.format('MMM DD, YYYY')}`
            : `since ${moment(d.createdAt).format('MMM DD, YYYY')}`,
        last: moment(latest.createdAt).fromNow(),
        lastSub: `${kindOf(latest.action).label} · ${moment(latest.createdAt).format('MMM DD, hh:mm A')}`,
        responses: responses.length,
        fromOffices: responses.length - fromCitizen,
        fromCitizen,
    };
});

// how many entries of each kind, in the order each first happened
const activityBreakdown = computed(() => {
    const total = historyAsc.value.length;
    const kinds = new Map();
    for (const h of historyAsc.value) {
        const k = kindOf(h.action);
        const row = kinds.get(k.label) || { label: k.label, icon: k.icon, tone: k.tone, count: 0 };
        row.count++;
        kinds.set(k.label, row);
    }
    return [...kinds.values()].map(row => ({ ...row, hex: TONE_HEX[row.tone], pct: total ? Math.round((row.count / total) * 100) : 0 }));
});

// the milestones from filed to done, and the time it took to get from each to the next
const milestones = computed(() => {
    const d = ComplaintStore.details;
    if (!d) return [];
    const h = historyAsc.value;
    const first = (test) => h.find(test)?.createdAt || null;
    const ended = ['completed', 'cancelled'].includes(d.status);
    const defs = [
        { label: 'Filed', icon: 'bi-send', at: d.createdAt },
        { label: 'Routed to an office', icon: 'bi-diagram-3', at: first(x => ['auto_assigned', 'reassigned'].includes(x.action)) },
        { label: 'First acknowledged', icon: 'bi-inbox', at: first(x => x.action === 'received') },
        { label: 'First reply to the citizen', icon: 'bi-chat-dots', at: first(x => x.action === 'responded' && x.actorRole !== 'citizen') },
        {
            label: d.status === 'cancelled' ? 'Cancelled' : 'Completed', icon: d.status === 'cancelled' ? 'bi-x-circle' : 'bi-flag',
            at: ended ? (d.completedAt || first(x => x.action === d.status)) : null,
        },
    ];
    let previous = null;
    return defs.map((m) => {
        const gap = m.at && previous ? durationLabel(new Date(m.at) - new Date(previous)) : null;
        if (m.at) previous = m.at;
        return { ...m, gap };
    });
});

// the people (and the system) that acted, most active first
const activityActors = computed(() => {
    const actors = new Map();
    for (const h of historyAsc.value) {
        const label = h.actorLabel || 'System';
        const a = actors.get(label) || { label, initials: label === 'System' ? 'S' : initialsOf(label), role: h.actorLabel ? (RESPONDER_ROLE[h.actorRole] || '') : '', count: 0, last: h.createdAt };
        a.count++;
        a.last = h.createdAt;
        actors.set(label, a);
    }
    return [...actors.values()].sort((a, b) => b.count - a.count);
});

// the trail on the right: newest first, grouped by day; the actor is shown only when the sentence does not already name them
const trailDays = computed(() => {
    const days = [];
    const newestFirst = [...(ComplaintStore.details?.history || [])]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id);
    for (const h of newestFirst) {
        const day = moment(h.createdAt).format('MMM DD, YYYY');
        let group = days[days.length - 1];
        if (!group || group.day !== day) {
            group = { day, entries: [] };
            days.push(group);
        }
        group.entries.push({
            ...h,
            kind: kindOf(h.action),
            time: moment(h.createdAt).format('hh:mm A'),
            showActor: !!h.actorLabel && !String(h.description || '').includes(h.actorLabel),
        });
    }
    return days;
});

const myOfficeAssignment = computed(() =>
    (ComplaintStore.details?.complaintOffices || []).find(
        co => co.isActive && co.officeId === AuthStore.user?.staff?.officeId
    )
);

const responseContent = ref('');
const responseFiles = ref(null);
const receiveLoading = ref(false);
const respondLoading = ref(false);
// The "done" pill toggle on the response composer — off submits a plain response
// (/response/respond); on submits the SAME response through /response/complete instead, which
// also marks this office's ComplaintOffice row 'completed'. Reset after every submit and every
// time a different complaint is opened (see getComplaint) so it never silently carries over.
const markAsDone = ref(false);

// Receiving a feedback comes with a message to the citizen. It starts as a plain acknowledgement the office can reword.
const receiveText = ref(null); // null = not touched, so the starting message follows the account's office
const receiveTouched = ref(false);
const receiveContent = computed({
    get: () => receiveText.value ?? `Good day! Your feedback has been received by ${AuthStore.user?.staff?.office?.alias || 'our office'}. We are looking into it and will update you here.`,
    set: (v) => { receiveText.value = v ?? ''; },
});
const receiveProblems = computed(() => (receiveContent.value.trim().length < 5 ? ['Write at least 5 characters.'] : []));

// Canned messages (Preference > Canned messages): ready-made replies offered as pills above the reply boxes.
const cannedMessages = ref([]);
const loadCanned = async () => {
    if (!['super', 'admin', 'workstation'].includes(AuthStore.user?.role)) return;
    try {
        const { data } = await api.get('/preference/canned', { params: { active: 1 } });
        cannedMessages.value = data;
    } catch (error) {
        console.error('Error loading the canned messages:', error);
    }
};
// a supervisor changing the list shows here without a reload
useLiveRefresh(['canned'], () => loadCanned());
// "{firstname}", "{office}", "{reference}"... in a message are filled in with this feedback's data and the sender's (see
// utils/cannedTokens.js). The same goes for any of them typed by hand: they are filled in when the message is sent.
const tokenValues = computed(() => feedbackValues(ComplaintStore.details, AuthStore.user, moment));
const withTokens = (text) => fillTokens(text, tokenValues.value);
// the same data as pills the sender picks from: one goes in the message where the cursor is
const dataItems = computed(() => CANNED_TOKENS
    .map(t => ({ key: t.token, label: t.label, value: tokenValues.value[t.token.slice(1, -1)] }))
    .filter(t => t.value));
const receiveInput = ref(null);
const responseInput = ref(null);
const doneInput = ref(null);
const insertAtCursor = (inputRef, current, value, set) => {
    const el = inputRef?.getNativeElement?.();
    const text = current || '';
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const after = text.slice(end);
    // a space on either side when it would otherwise run into the words around it
    const lead = before && !/[\s(\[“"']$/.test(before) ? ' ' : '';
    const trail = after && /^[A-Za-z0-9]/.test(after) ? ' ' : '';
    set(before + lead + value + trail + after);
    const at = (before + lead + value).length;
    nextTick(() => { el?.focus(); el?.setSelectionRange(at, at); });
};
const cannedItems = computed(() => cannedMessages.value.map(m => ({
    id: m.id, title: m.title,
    text: withTokens(m.message),
})));
// Picking a pill puts its message in the box: in an empty box (or one holding only another canned message, or the untouched
// starting text) it takes the box over; in a box with words of one's own it is added under them. Picking a message that is
// already in the box takes it out again.
const withCanned = (current, item, startsFresh = false) => {
    const text = current || '';
    if (text.includes(item.text)) return text.replace(item.text, '').replace(/\n{3,}/g, '\n\n').trim();
    const onlyCanned = startsFresh || !text.trim() || cannedItems.value.some(m => m.text === text.trim());
    return onlyCanned ? item.text : `${text.trim()}\n\n${item.text}`;
};
const pickForReceive = (item) => {
    receiveContent.value = withCanned(receiveContent.value, item, receiveText.value === null);
    receiveTouched.value = false;
};
const pickForResponse = (item) => { responseContent.value = withCanned(responseContent.value, item); };

const submitReceive = async () => {
    const id = ComplaintStore.details?.id;
    if (!id) return;
    if (receiveProblems.value.length) { receiveTouched.value = true; return; }
    receiveLoading.value = true;
    try {
        await api.post('/response/receive', { complaintId: id, content: withTokens(receiveContent.value.trim()) });
        receiveText.value = null;
        receiveTouched.value = false;
        Toast.fire({ icon: "success", html: `<div class="text-h6 text-bold text-uppercase">received!</div>` });
        await getComplaint(id, { resetTab: false });
        getAllComplaints();
    } catch (error) {
        console.error("Error receiving complaint:", error);
        Toast.fire({
            icon: "error",
            html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption;">${error.response?.data?.message || 'Unable to receive this feedback.'}<div>`
        });
    } finally {
        receiveLoading.value = false;
    }
};

// One submit path for both — the "done" pill just decides which endpoint the SAME typed response
// goes to. markAsDone posts through /response/complete (workstation-only on the backend, so the
// pill itself is also hidden for anyone else — see the template) instead of /response/respond,
// which additionally marks this office's ComplaintOffice row 'completed'. A confirm dialog only
// gates the done path, since that one isn't easily undone by the office itself afterward (see
// confirmSendBack, a supervisor-only reversal).
const submitRespond = async () => {
    const id = ComplaintStore.details?.id;
    if (!id || !responseContent.value) return;

    if (markAsDone.value) {
        const result = await Swal.fire({
            title: 'Confirm',
            html: `Send this response and mark your office's part of this feedback as <b>DONE</b>? A supervisor can send it back if it turns out it isn't.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'confirm',
            cancelButtonText: 'cancel',
            reverseButtons: true
        });
        if (!result.isConfirmed) return;
    }

    respondLoading.value = true;
    try {
        let successHtml;
        if (markAsDone.value) {
            // No file upload on this path — /response/complete takes no attachments (see the
            // template's v-if hiding the evidence field while the pill is on).
            const response = await api.post('/response/complete', { complaintId: id, content: withTokens(responseContent.value) });
            successHtml = `<div class="text-h6 text-bold text-uppercase">done!</div><div class="text-caption;">${response.data.message}<div>`;
        } else {
            const formData = new FormData();
            formData.append('complaintId', id);
            formData.append('content', withTokens(responseContent.value));
            (responseFiles.value || []).forEach(f => formData.append('files', f));
            await api.post('/response/respond', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            successHtml = `<div class="text-h6 text-bold text-uppercase">sent!</div>`;
        }
        Toast.fire({ icon: "success", html: successHtml });
        responseContent.value = '';
        responseFiles.value = null;
        markAsDone.value = false;
        await getComplaint(id, { resetTab: false });
        getAllComplaints();
    } catch (error) {
        console.error("Error sending response:", error);
        Toast.fire({
            icon: "error",
            html: `<div class="text-h6 text-bold text-uppercase">error!</div><div class="text-caption;">${error.response?.data?.message || 'Unable to send this response.'}<div>`
        });
    } finally {
        respondLoading.value = false;
    }
};

const formatHistoryDate = (timestamp) => moment(timestamp).format('MMM DD, YYYY hh:mm A');

const randomAvatar = ref('')

const GenerateRandomAvatar = () => {
    const randomNumber = Math.floor(Math.random() * 5) + 1
    randomAvatar.value = new URL(
        `../assets/icons/A${randomNumber}.png`,
        import.meta.url
    ).href
}

const FormatOffices = (complaintOffices) => {
    const offices = complaintOffices?.filter(item => item.isActive).map(
        item => item?.office?.alias
    ) || [];

    if (!offices.length) return '';
    if (offices.length === 1) return offices[0];
    if (offices.length === 2) return offices.join(' & ');

    return `${offices.slice(0, -1).join(', ')} & ${offices.at(-1)}`;
};

const slide = ref(1);

const FormatFile = (file) => {
    // a photo saved inline (data:) or with a full address is used as it is
    if (/^(data:|https?:)/.test(file.file || '')) return file.file;
    const baseUrl = process.env.VUE_APP_BACKEND_URL;
    return `${baseUrl}${file.file}`;
}
// the feedback's own photos: the grid shows 3, the third says how many more there are; the viewer has all of them
const photoUrls = computed(() => (ComplaintStore.details?.complaintFiles || []).map(FormatFile));
const photoMore = computed(() => Math.max(0, photoUrls.value.length - 3));
</script>

<style scoped>
/* Two-column shell: analytics main column (left, flexes) + a full-height complaint list rail
   (right, fixed width). --rail-only drops to a single column for roles with no analytics access
   (workstation), where the list is the whole page. */
.cp-shell {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 16px;
    align-items: start;
}
.cp-shell--rail-only {
    grid-template-columns: 1fr;
}
@media (max-width: 1200px) {
    .cp-shell {
        grid-template-columns: 1fr;
    }
}
.cp-main {
    min-width: 0;
}
/* auto-fit + a stretched grid row means every tile in the same row matches the tallest one
   (e.g. a tile with a trend badge) regardless of how many tiles wrap into that row. */
.cp-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
}
/* Dedicated KPI tile — deliberately not reusing the legacy .card class (a fixed 225x250px
   square meant for the old icon-tile grid), which was clipping/overlapping neighbors here since
   it ignored the column width entirely. height:100% fills its stretched grid cell (see
   .cp-kpi-grid) instead of sizing to its own content, so every tile in a row lines up evenly. */
.cp-kpi {
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
    transition: transform 220ms cubic-bezier(.2, .8, .2, 1), box-shadow 220ms ease;
}
.cp-kpi:hover {
    transform: scale(1.02);
}
.cp-kpi-value {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
}
.cp-kpi-label {
    font-size: 11px;
    letter-spacing: .02em;
    text-transform: uppercase;
    margin-top: 4px;
}
.cp-kpi-info {
    opacity: 0.75;
    cursor: help;
    vertical-align: -1px;
}
/* "vs last week/month/year" badge under a KPI tile's value — a soft pill readable on the tile's
   own bg-primary background, colored green/red by the raw direction of change (not a domain
   judgment about which direction is "good" for that particular metric). */
.cp-kpi-trend {
    display: inline-flex;
    align-items: center;
    gap: 1px;
    font-size: 10.5px;
    font-weight: 600;
    margin-top: 6px;
    padding: 1px 6px 1px 2px;
    border-radius: 100px;
    background: rgba(255, 255, 255, 0.16);
}
.cp-kpi-trend--up {
    color: #B6F5C6;
}
.cp-kpi-trend--down {
    color: #FFC9CE;
}
.cp-header {
    flex-wrap: wrap;
    gap: 8px;
}
.cp-eyebrow {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #8493AC;
    margin-bottom: 2px;
}
.cp-year-group {
    display: inline-flex;
    align-items: center;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px 4px;
    gap: 2px;
}
.cp-year-value {
    min-width: 44px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #16233A;
}
.cp-period-group {
    display: inline-flex;
    background: #F6F9FC;
    border: 1px solid #DCE4F0;
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
}
.cp-period-btn {
    background: transparent;
    color: #4C5C79;
    min-height: 26px;
    padding: 0 12px;
    border-radius: 6px;
}
.cp-period-btn--active {
    background: var(--q-primary);
    color: #FFFFFF;
}
/* List rail search + quick-filter chips */
.cp-search :deep(.q-field__control) {
    border-radius: 100px;
    background: #F6F9FC;
}
.cp-chip {
    background: #FFFFFF;
    color: #4C5C79;
    border: 1px solid #DCE4F0;
    min-height: 26px;
    padding: 0 12px;
    font-size: 12px;
}
.cp-chip--active {
    background: var(--q-primary);
    color: #FFFFFF;
    border-color: var(--q-primary);
}
/* Status pills on each list row */
.cp-pill {
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .02em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 100px;
}
.cp-pill--light {
    background: #F6F9FC;
    color: #4C5C79;
    border: 1px solid #DCE4F0;
}
.cp-panel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
}
.cp-panel {
    min-width: 0;
}
.cp-panel--wide {
    grid-column: span 2;
}
/* Always the full row, regardless of how many columns the auto-fit grid settles on at the
   current width — unlike --wide's fixed span:2, which only fills the row when the grid happens
   to land on exactly 2 columns. */
.cp-panel--full {
    grid-column: 1 / -1;
}
@media (max-width: 900px) {
    .cp-panel--wide {
        grid-column: span 1;
    }
}
.cp-rail {
    min-width: 0;
}
/* Below the point .cp-shell collapses to one column (see the media query above), the rail is
   just another stacked block — normal flow, no bleed. */
.cp-rail-card {
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    position: relative;
}
/* Floating "back to top" for the scrollable list below — .cp-rail-card is the positioning
   context in both layouts (relative here, fixed on wide viewports below), so this stays pinned
   to the rail's own bottom-right corner rather than the page's. */
.cp-back-to-top {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 2;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
/* Above that point, the rail bleeds past q-page's own padding (q-pa-lg, MainLayout.vue) and
   pins to the browser viewport's top/right/bottom edges — a full-height panel with no inset,
   rather than a card floating with margin like the rest of the page. position: fixed sidesteps
   fighting that ancestor padding entirely, since it's anchored to the viewport, not to .cp-rail
   (which still reserves the 380px grid column so .cp-main never renders underneath it). */
@media (min-width: 1201px) {
    .cp-rail-card {
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
.cp-rail-head {
    padding: 16px;
    flex-shrink: 0;
}
/* Floating "undone" icon for a completed office — sits over the top-right corner of its card
   instead of inline next to the status badge, so it reads as a standalone action rather than
   competing with the status/compliance badges for space in the side column. */
.cp-office-item {
    position: relative;
    padding-top: 26px;
}
.cp-office-undone-btn {
    position: absolute;
    top: 3px;
    right: 3px;
    z-index: 2;
}
.cp-rail-list {
    overflow-y: auto;
    flex: 1;
    min-height: 200px;
}
.cp-list-item {
    padding: 10px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    border-left: 3px solid transparent;
    cursor: pointer;
}
.cp-list-item:hover {
    background: var(--q-accent, #F6F9FC);
}
.cp-list-item.sev-bad {
    border-left-color: var(--q-negative);
}
.cp-list-item.sev-warn {
    border-left-color: var(--q-warning);
}
.cp-list-item.sev-good {
    border-left-color: var(--q-positive);
}
.cp-list-item.sev-flat {
    border-left-color: #E0E0E0;
}
.cp-list-empty {
    padding: 32px 16px;
    text-align: center;
    color: #9E9E9E;
}
.cp-list-load-more {
    padding: 14px 16px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
}
.response-evidence-thumb {
    width: 84px;
    height: 84px;
}
/* The responses tab scrolls as a whole (its main column), so the list is not a scroller of its own: a fixed-height box
   here showed the last response cut off, with blank space under it. */
.response-list-scroll {
    max-height: none;
    overflow: visible;
}
/* Width shrinks to fit the office name (the reason text below wraps within it rather than
   pushing the card wider), bounded so a short name doesn't get a cramped card and a long
   name doesn't run edge-to-edge. Height is left to each card's own content — the parent row
   uses items-start (see template) so a taller card (e.g. one with an AI reason) never
   stretches its neighbors to match; every card grows independently. */
.office-check-item {
    width: fit-content;
    min-width: 160px;
    max-width: 100%;
    transition: border-color 0.15s ease, background 0.15s ease;
}
.office-check-item:hover {
    border-color: var(--q-primary);
}
.office-check-item--active {
    border-color: var(--q-primary);
    background: rgba(0, 78, 168, 0.06);
}
/* Status cards reuse the same shrink-to-fit card look as office selection, just with a
   positive/negative accent instead of primary once chosen. */
.status-check-item {
    min-width: 140px;
}
.status-check-item--positive {
    border-color: var(--q-positive);
    background: rgba(33, 186, 69, 0.06);
}
.status-check-item--negative {
    border-color: var(--q-negative);
    background: rgba(193, 0, 21, 0.06);
}
.status-check-item--disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.card {
    height: 250px;
    width: 225px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    box-shadow: rgba(0, 0, 0, 0.05) 0px 0px 0px 1px;
    transform: translateY(0) scale(1);
    transition: transform 220ms cubic-bezier(.2,.8,.2,1), 
                box-shadow 220ms ease;
    will-change: transform, box-shadow;
}
.card-status {
    box-shadow: rgba(0, 0, 0, 0.05) 0px 0px 0px 1px;
    transform: translateY(0) scale(1);
    transition: transform 220ms cubic-bezier(.2,.8,.2,1), 
                box-shadow 220ms ease;
    will-change: transform, box-shadow;
}
.card-hover-animate {
    transition: border-color 0.3s ease, transform 0.2s ease;
}

.card-hover-animate:hover {
  transform: scale(1.02); /* optional zoom effect */
}
.card-graph {
    box-shadow: rgba(0, 0, 0, 0.05) 0px 0px 0px 1px;
    transform: translateY(0) scale(1);
    transition: transform 220ms cubic-bezier(.2,.8,.2,1), 
                box-shadow 220ms ease;
    will-change: transform, box-shadow;
}
</style>