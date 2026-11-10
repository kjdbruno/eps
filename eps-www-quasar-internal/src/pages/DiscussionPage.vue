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

                <!-- Needs attention: what has to be looked at. Every tile opens the matching filter of the list on the right. -->
                <div class="ov-title">needs attention</div>
                <div class="ov-attn-grid q-mb-lg">
                    <div v-if="canViewAll" class="ov-attn ov-attn--click" :class="[attnTone(unassignedCount), { 'ov-attn--on': attnFilter === 'unassigned' }]" @click="toggleAttn('unassigned')">
                        <q-icon name="bi-signpost-split" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ unassignedCount }}</div>
                        <div class="ov-attn-label">needs an office</div>
                        <div class="ov-attn-sub">not routed yet</div>
                    </div>
                    <div class="ov-attn ov-attn--click" :class="[attnTone(expiringSoonCount, 'warn'), { 'ov-attn--on': attnFilter === 'expiring' }]" @click="toggleAttn('expiring')">
                        <q-icon name="bi-clock-history" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ expiringSoonCount }}</div>
                        <div class="ov-attn-label">ending in 7 days</div>
                        <div class="ov-attn-sub">will close by itself</div>
                    </div>
                    <div class="ov-attn ov-attn--click" :class="[attnTone(expiredCount), { 'ov-attn--on': attnFilter === 'expired' }]" @click="toggleAttn('expired')">
                        <q-icon name="bi-hourglass-bottom" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ expiredCount }}</div>
                        <div class="ov-attn-label">past the end date</div>
                        <div class="ov-attn-sub">closed to new comments</div>
                    </div>
                    <div class="ov-attn ov-attn--click" :class="[attnTone(quietCount, 'info'), { 'ov-attn--on': attnFilter === 'quiet' }]" @click="toggleAttn('quiet')">
                        <q-icon name="bi-megaphone" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ quietCount }}</div>
                        <div class="ov-attn-label">no comments yet</div>
                        <div class="ov-attn-sub">open, nobody has spoken</div>
                    </div>
                </div>

                <!-- How it is going over the period -->
                <div class="ov-title">how it is going</div>
                <div class="ov-kpi-grid q-mb-lg">
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-collection" size="16px" /> discussions</div>
                        <div class="ov-kpi-value">{{ discussions.length }}</div>
                        <div class="ov-kpi-sub">in {{ analyticsRangeLabel || 'the period' }}</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-broadcast" size="16px" /> open now</div>
                        <div class="ov-kpi-value">{{ openCount }}</div>
                        <div class="ov-kpi-sub">{{ share(openCount) }}% of all</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-chat-dots" size="16px" /> comments</div>
                        <div class="ov-kpi-value">{{ totalResp }}</div>
                        <div class="ov-kpi-sub">{{ avgResp }} per topic</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-stopwatch" size="16px" /> time to first comment</div>
                        <div class="ov-kpi-value">{{ formatLag(stats.avgTimeToFirstCommentMinutes) }}</div>
                        <div class="ov-kpi-sub">after it opens</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-arrow-repeat" size="16px" /> reopen rate</div>
                        <div class="ov-kpi-value">{{ stats.reopenRate != null ? stats.reopenRate + '%' : '—' }}</div>
                        <div class="ov-kpi-sub">closed, then opened again</div>
                    </div>
                </div>

                <!-- What is happening -->
                <div class="ov-title">what is happening</div>
                <div class="ov-duo q-mb-md">
                    <div class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">where they stand</div>
                            <div class="ov-card-note">of {{ discussions.length }}</div>
                        </div>
                        <div v-for="r in standRows" :key="r.label" class="ov-step">
                            <div class="ov-step-top">
                                <span class="ov-dot" :style="{ background: r.color }"></span>
                                <span class="ov-step-label">{{ r.label }} <i class="ov-hint">{{ r.sub }}</i></span>
                                <span class="ov-step-count">{{ r.count }}</span>
                                <span class="ov-step-pct">{{ r.pct }}%</span>
                            </div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: r.pct + '%', background: r.color }"></div></div>
                        </div>
                        <div class="ov-card-foot">Open ones take comments until a supervisor closes them or the end date passes.</div>
                    </div>

                    <div class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">who is commenting</div>
                            <div class="ov-card-note">by who they are</div>
                        </div>
                        <apexchart v-if="authorMixChartSeries.some(n => n > 0)" type="donut" height="210" :options="authorMixChartOptions" :series="authorMixChartSeries" />
                        <div v-else class="ov-empty">nobody has joined in yet</div>
                    </div>
                </div>

                <div class="ov-duo q-mb-lg">
                    <div class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">most discussed</div>
                            <div class="ov-card-note">tap one to open it</div>
                        </div>
                        <div v-for="(r, i) in topRows" :key="r.id" class="ov-step ov-rank" @click="openDetail(r)">
                            <div class="ov-step-top">
                                <span class="ov-step-n">{{ i + 1 }}</span>
                                <span class="ov-step-label">{{ r.label }}</span>
                                <span class="ov-step-count">{{ r.count }}</span>
                            </div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: r.pct + '%', background: '#204888' }"></div></div>
                        </div>
                        <div v-if="!topRows.length" class="ov-empty">no comments yet</div>
                    </div>

                    <div v-if="canViewAll" class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">discussions by office</div>
                            <div class="ov-card-note">top {{ officeRows.length }}</div>
                        </div>
                        <div v-for="r in officeRows" :key="r.label" class="ov-step">
                            <div class="ov-step-top">
                                <span class="ov-step-label"><span class="rc-code rc-code--solid">{{ r.label }}</span></span>
                                <span class="ov-step-count">{{ r.count }}</span>
                            </div>
                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: r.pct + '%', background: '#68AFF1' }"></div></div>
                        </div>
                        <div v-if="!officeRows.length" class="ov-empty">not routed to any office yet</div>
                    </div>
                </div>

                <div class="ov-title">trends</div>
                <div class="dp-panel-grid">
                    <q-card flat class="dp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">discussions opened per {{ bucketUnitLabel }}</div>
                        <apexchart type="area" height="220" :options="volumeChartOptions" :series="volumeChartSeries" />
                    </q-card>
                    <q-card flat class="dp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">comments per {{ bucketUnitLabel }}</div>
                        <apexchart type="line" height="220" :options="commentsChartOptions" :series="commentsChartSeries" />
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
                            <q-btn v-if="isSupervisor" unelevated rounded size="sm" color="primary" label="add" class="text-capitalize" @click="openCreateDialog">
                                <q-tooltip>Start a new discussion</q-tooltip>
                            </q-btn>
                        </div>
                        <q-input outlined dense v-model="search" placeholder="Search title or description..." class="dp-search q-mb-sm">
                            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
                        </q-input>
                        <div v-if="attnFilter" class="q-mb-sm">
                            <q-btn no-caps unelevated rounded size="sm" icon-right="bi-x" :label="ATTN_LABEL[attnFilter]" class="dp-chip dp-chip--active" @click="attnFilter = null" />
                        </div>
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
                        <EmptyState
                            v-if="!loading && !filteredDiscussions.length" rail icon="bi-chat-left-text" title="No discussions found"
                            hint="Try another search or status."
                        />
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
        <q-dialog v-model="createDialog" persistent class="dialog dialog--wide">
            <q-card>
                <q-card-section class="row items-center no-wrap">
                    <div>
                        <div class="text-caption">public discussion &middot; started by staff</div>
                        <div class="text-h5 text-uppercase">new discussion</div>
                        <div class="rc-hero-badges">
                            <span class="rc-hero-pill rc-hero-pill--on">new</span>
                            <span class="rc-hero-pill">routed to the offices automatically</span>
                        </div>
                    </div>
                    <q-space />
                    <q-btn unelevated round flat icon="bi-x-circle" v-close-popup />
                </q-card-section>

                <q-card-section class="col rc-split">
                    <aside class="rc-side">
                        <template v-for="(n, i) in pages" :key="n.key">
                            <div v-if="i === 0" class="rc-side-title">Creating</div>
                            <button
                                type="button" class="rc-side-item" :class="{ 'rc-side-item--on': page === n.key, 'rc-side-item--locked': !n.open }"
                                :disabled="!n.open" @click="go(n.key)"
                            >
                                <q-icon :name="n.icon" />
                                <span>{{ n.label }}</span>
                                <q-icon v-if="!n.open" name="bi-lock-fill" size="12px" class="cc-state" />
                                <q-icon v-else-if="n.state === 'bad'" name="bi-exclamation-circle-fill" size="14px" class="cc-state cc-state--bad" />
                                <q-icon v-else-if="n.state === 'ok'" name="bi-check-circle-fill" size="14px" class="cc-state cc-state--ok" />
                            </button>
                        </template>
                    </aside>

                    <div class="rc-main">
                        <div class="rc-page rc-page--form">
                            <div class="rc-pg-head">
                                <div class="wz-action" :style="{ '--wz-bg': current.bg, '--wz-fg': current.fg }">
                                    <div class="wz-action-icon"><q-icon :name="current.icon" size="24px" /></div>
                                    <div class="col" style="min-width: 0;">
                                        <div class="wz-action-eyebrow">step {{ pageIndex + 1 }} of {{ pages.length }}</div>
                                        <div class="wz-action-title">{{ current.title }}</div>
                                        <div class="wz-action-hint">{{ current.hint }}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="rc-pg-main">
                                <div v-show="page === 'topic'" class="rc-block cc-fill">
                                    <div class="rc-block-title">the topic</div>
                                    <div class="rc-cap" :class="{ 'rc-cap--bad': formError && !form.title.trim() }">{{ formError && !form.title.trim() ? 'a title is required' : 'title' }}</div>
                                    <q-input v-model="form.title" outlined placeholder="What should residents talk about?" :error="!!formError && !form.title.trim()" no-error-icon hide-bottom-space />
                                    <div class="rc-cap q-mt-md">description (optional)</div>
                                    <q-input v-model="form.description" type="textarea" outlined hide-bottom-space class="cc-textarea" placeholder="Give the context: what is being decided, and what you would like to hear..." />
                                    <div class="rc-field-foot"><span>The title and description decide which office it is sent to.</span><span>{{ form.description.trim().length }}</span></div>
                                </div>
                                <div v-show="page === 'schedule'" class="rc-block">
                                    <div class="rc-block-title">when it ends<span class="rc-count">optional</span></div>
                                    <div class="rc-cap">pick the last day it takes comments, or leave it open</div>
                                    <DateInput v-model="form.expiresAt" :options="futureDateOptions" clearable placeholder="No end date" style="max-width: 340px;" />
                                    <div class="row items-center q-mt-sm">
                                        <q-btn flat no-caps rounded size="sm" color="primary" icon="bi-x-circle" label="no end date" :disable="!form.expiresAt" @click="form.expiresAt = ''" />
                                        <span class="text-caption text-grey q-ml-sm">{{ form.expiresAt ? 'Closes after ' + moment(form.expiresAt, 'YYYY-MM-DD').format('MMMM DD, YYYY') : 'It stays open until a supervisor closes it.' }}</span>
                                    </div>
                                </div>
                                <div v-if="page === 'review'" class="rc-block">
                                    <div class="rc-block-title">about to be created</div>
                                    <div class="rc-facts">
                                        <div v-for="row in reviewFacts" :key="row.label" class="rc-fact" :class="{ 'rc-fact--top': row.wrap }">
                                            <span class="rc-ico" :class="`rc-ico--${row.tone}`"><q-icon :name="row.icon" size="16px" /></span>
                                            <span class="rc-fact-text">
                                                <span class="rc-fact-label">{{ row.label }}</span>
                                                <span class="rc-fact-value" :class="{ 'rc-fact-value--wrap': row.wrap }">{{ row.value || 'Not given' }}</span>
                                            </span>
                                            <q-space />
                                            <q-btn flat no-caps rounded size="sm" color="primary" label="Change" @click="go(row.page)" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="rc-pg-foot">
                                <q-btn flat round size="sm" color="grey-8" icon="bi-arrow-left" :disable="pageIndex === 0" @click="stepBy(-1)"><q-tooltip>Previous step</q-tooltip></q-btn>
                                <span v-if="!stepDone(page) && page !== 'review'" class="cc-foot-hint"><q-icon name="bi-lock" size="13px" /> Complete this step to open the next one</span>
                                <q-btn v-if="pageIndex < pages.length - 1" flat round size="sm" color="grey-8" icon="bi-arrow-right" @click="stepBy(1)"><q-tooltip>Next step</q-tooltip></q-btn>
                            </div>

                            <div class="rc-pg-side">
                                <div class="rc-panel rc-panel--fill">
                                    <div class="rc-reply">
                                        <div class="rc-reply-grow">
                                            <div class="rc-cap">before it can be created<span class="rc-count">{{ checks.filter(c => c.ok).length }} / {{ checks.length }}</span></div>
                                            <ValidationCards :pages="pages" :checks="checks" :page="page" @go="go" />
                                            <div class="cc-note">
                                                <q-icon name="bi-info-circle" size="16px" />
                                                <span>It is sent to the office(s) whose mandate it concerns, from what is written. You can change that afterwards under Manage.</span>
                                            </div>
                                        </div>
                                        <div v-if="formError" class="rc-problems"><div><q-icon name="bi-exclamation-circle" size="14px" /> {{ formError }}</div></div>
                                        <q-btn
                                            no-caps unelevated color="primary" icon="bi-send" label="create discussion"
                                            class="rc-send rc-reply-send" :disable="page !== 'review'" :loading="saving" @click="createDiscussion"
                                        >
                                            <q-tooltip v-if="page !== 'review'">Go through the steps first: it is created from the review.</q-tooltip>
                                        </q-btn>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </q-card-section>
            </q-card>
        </q-dialog>

        <!-- Detail -->
        <q-dialog v-model="detailDialog" persistent class="dialog dialog--wide">
            <q-card>
                <q-card-section class="row items-center no-wrap">
                    <div>
                        <div class="text-caption">public discussion &middot; topic detail</div>
                        <div class="text-h5">{{ selected?.title }}</div>
                        <div class="rc-hero-badges">
                            <span class="rc-hero-pill rc-hero-pill--on">{{ statusText }}</span>
                            <span v-for="o in selected?.offices || []" :key="o.id" class="rc-hero-pill">{{ o.alias || o.name }}<q-tooltip>{{ o.name }}</q-tooltip></span>
                            <span v-if="selected?.expiresAt" class="rc-hero-pill">ends {{ moment(selected.expiresAt).format('MMM DD, YYYY') }}</span>
                            <span class="rc-hero-pill">{{ respTotal }} {{ respTotal === 1 ? 'comment' : 'comments' }}</span>
                        </div>
                    </div>
                    <q-space />
                    <q-btn unelevated round flat icon="bi-x-circle" v-close-popup />
                </q-card-section>

                <q-card-section class="col rc-split">
                    <aside class="rc-side">
                        <template v-for="(n, i) in detailNavs" :key="n.tab">
                            <div v-if="i === 1" class="rc-side-title">Discussion</div>
                            <button type="button" class="rc-side-item" :class="{ 'rc-side-item--on': detailTab === n.tab }" @click="detailTab = n.tab">
                                <q-icon :name="n.icon" />
                                <span>{{ n.label }}</span>
                                <b v-if="n.count">{{ n.count }}</b>
                            </button>
                        </template>
                    </aside>

                    <div class="rc-main">
                        <!-- ===== overview ===== -->
                        <div v-if="detailTab === 'overview'" class="rc-ov">
                            <div class="rc-block rc-ov-sum">
                                <div class="rc-block-title">overview</div>
                                <div class="rc-tiles">
                                    <div class="rc-tile"><span class="rc-ico rc-ico--blue"><q-icon name="bi-flag" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">status</span><span class="rc-tile-value text-uppercase">{{ statusText }}</span><span class="rc-tile-sub">{{ statusSub }}</span></span></div>
                                    <div class="rc-tile"><span class="rc-ico rc-ico--teal"><q-icon name="bi-calendar-check" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">opened</span><span class="rc-tile-value">{{ selected?.createdAt ? moment(selected.createdAt).fromNow() : '—' }}</span><span class="rc-tile-sub">{{ selected?.createdAt ? moment(selected.createdAt).format('MMM DD, YYYY') : '' }}</span></span></div>
                                    <div class="rc-tile"><span class="rc-ico rc-ico--purple"><q-icon name="bi-diagram-3" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">handled by</span><span class="rc-tile-value">{{ selected?.offices?.length || 0 }} {{ (selected?.offices?.length || 0) === 1 ? 'office' : 'offices' }}</span><span class="rc-tile-sub">{{ (selected?.offices || []).map(o => o.alias || o.name).join(', ') || 'not assigned yet' }}</span></span></div>
                                    <div class="rc-tile" :class="{ 'rc-tile--warn': selected?.isExpired }"><span class="rc-ico rc-ico--amber"><q-icon name="bi-hourglass-split" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">ends</span><span class="rc-tile-value">{{ selected?.expiresAt ? moment(selected.expiresAt).fromNow() : 'no end date' }}</span><span class="rc-tile-sub">{{ selected?.expiresAt ? moment(selected.expiresAt).format('MMM DD, YYYY') : 'open until closed' }}</span></span></div>
                                    <div class="rc-tile"><span class="rc-ico rc-ico--red"><q-icon name="bi-chat-dots" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">comments</span><span class="rc-tile-value">{{ respTotal }}</span><span class="rc-tile-sub">{{ lastRespLine }}</span></span></div>
                                </div>
                            </div>

                            <div class="rc-ov-det">
                                <div class="rc-block">
                                    <div class="rc-block-title">the topic</div>
                                    <div class="row items-center no-wrap q-mb-sm">
                                        <q-avatar size="40px" color="primary" text-color="white">{{ creatorInitials }}</q-avatar>
                                        <div class="q-ml-sm">
                                            <div class="text-weight-bold text-capitalize">{{ creatorName(selected) }}</div>
                                            <div class="text-caption text-grey">opened it {{ selected?.createdAt ? moment(selected.createdAt).fromNow() : '' }}</div>
                                        </div>
                                    </div>
                                    <read-more v-if="selected?.description" :rows="6" moreText="See More" lessText="See Less">{{ selected.description }}</read-more>
                                    <div v-else class="text-caption text-grey">No description was left.</div>
                                </div>
                                <div class="rc-block">
                                    <div class="rc-block-title">latest comments<span class="rc-count">{{ respTotal }}</span></div>
                                    <div v-if="sortedComments.length" class="rc-thread">
                                        <div v-for="c in sortedComments.slice(0, 3)" :key="c.id" class="q-item" style="display: block;">
                                            <div class="row items-center q-gutter-xs q-mb-xs">
                                                <div class="text-weight-bold text-capitalize">{{ c.authorName }}</div>
                                                <div class="text-caption text-grey">{{ moment(c.createdAt).fromNow() }}</div>
                                            </div>
                                            <div class="text-body2">{{ c.content }}</div>
                                        </div>
                                    </div>
                                    <div v-else class="rc-empty rc-empty--sm">
                                        <q-icon name="bi-chat-dots" size="28px" />
                                        <div class="rc-empty-t">No comments yet</div>
                                    </div>
                                </div>
                            </div>

                            <div class="rc-ov-right">
                                <div class="rc-block rc-ov-stand">
                                    <div class="rc-block-title">where it stands</div>
                                    <div class="fi-steps">
                                        <div v-for="st in progressSteps" :key="st.label" class="fi-step" :class="{ 'fi-step--done': st.state === 'done', 'fi-step--now': st.state === 'now', 'fi-step--bad': st.state === 'bad' }">
                                            <span class="fi-dot"><q-icon :name="st.state === 'done' ? 'bi-check-lg' : (st.state === 'bad' ? 'bi-x-lg' : st.icon)" size="14px" /></span>
                                            <span class="fi-lbl">{{ st.label }}</span>
                                        </div>
                                    </div>
                                    <div class="text-caption text-grey q-mt-sm">{{ actionsHint }}</div>
                                </div>

                                <div class="rc-ov-pair">
                                    <div class="rc-block rc-ov-glance">
                                        <div class="rc-block-title">at a glance</div>
                                        <div class="rc-facts">
                                            <div class="rc-fact"><span class="rc-ico rc-ico--blue"><q-icon name="bi-person" size="16px" /></span><span class="rc-fact-text"><span class="rc-fact-label">opened by</span><span class="rc-fact-value text-capitalize">{{ creatorName(selected) }}</span></span></div>
                                            <div class="rc-fact"><span class="rc-ico rc-ico--teal"><q-icon name="bi-calendar-check" size="16px" /></span><span class="rc-fact-text"><span class="rc-fact-label">opened</span><span class="rc-fact-value">{{ formatDate(selected?.createdAt) }}</span></span></div>
                                            <div class="rc-fact"><span class="rc-ico rc-ico--amber"><q-icon name="bi-calendar-event" size="16px" /></span><span class="rc-fact-text"><span class="rc-fact-label">ends</span><span class="rc-fact-value">{{ selected?.expiresAt ? formatDate(selected.expiresAt) : 'No end date' }}</span></span></div>
                                            <div class="rc-fact"><span class="rc-ico rc-ico--purple"><q-icon name="bi-chat-dots" size="16px" /></span><span class="rc-fact-text"><span class="rc-fact-label">comments</span><span class="rc-fact-value">{{ respTotal }}</span></span></div>
                                        </div>
                                    </div>

                                    <div class="rc-block rc-ov-handled">
                                        <div class="rc-block-title">handled by<span class="rc-count">{{ selected?.offices?.length || 0 }}</span></div>
                                        <div v-if="selected?.offices?.length" class="rc-offs">
                                            <div v-for="o in selected.offices" :key="o.id" class="rc-off">
                                                <div class="rc-off-top">
                                                    <span class="rc-code rc-code--solid rc-off-code">{{ o.alias || o.name }}<q-tooltip>{{ o.name }}</q-tooltip></span>
                                                </div>
                                                <div v-if="o.reason || o.assignmentReason" class="rc-off-why"><q-icon name="bi-robot" size="13px" /><span>{{ o.reason || o.assignmentReason }}</span></div>
                                            </div>
                                        </div>
                                        <div v-else class="rc-empty rc-empty--sm">
                                            <q-icon name="bi-diagram-3" size="28px" />
                                            <div class="rc-empty-t">Not assigned yet</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ===== comments: the thread on the left, the reply fixed on the right ===== -->
                        <div v-if="detailTab === 'comments'" class="rc-page rc-page--responses">
                            <div class="rc-pg-head">
                                <div class="wz-action" style="--wz-bg: #E4F6EA; --wz-fg: #1C8A3B;">
                                    <div class="wz-action-icon"><q-icon name="bi-chat-dots" size="24px" /></div>
                                    <div class="col" style="min-width: 0;">
                                        <div class="wz-action-eyebrow">{{ respTotal }} comment{{ respTotal === 1 ? '' : 's' }}</div>
                                        <div class="wz-action-title">Comments</div>
                                        <div class="wz-action-hint">What residents and staff have said, newest first.</div>
                                    </div>
                                    <span class="wz-action-now">{{ statusText }}</span>
                                </div>
                            </div>
                            <div class="rc-pg-main">
                                <div class="rc-block rc-m-thread">
                                    <div class="rc-block-title">comments &middot; latest first<span class="rc-count">{{ respTotal }}</span></div>
                                    <div class="dp-comment-list" v-if="selected?.comments?.length">
                                        <q-list class="rc-thread">
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
                                    <div v-else class="rc-empty">
                                        <q-icon name="bi-chat-dots" size="36px" />
                                        <div class="rc-empty-t">No comments yet</div>
                                        <div class="rc-empty-d">Be the first to add to this discussion.</div>
                                    </div>
                                </div>
                            </div>
                            <div class="rc-pg-side">
                                <div class="rc-panel rc-m-compose">
                                    <div class="text-caption text-grey" v-if="isMonitoring">
                                        <q-icon name="bi-eye" size="xs" class="q-mr-xs" />
                                        Monitoring accounts are view-only.
                                    </div>
                                    <div class="text-caption text-grey" v-else-if="selected?.status === 'closed' || selected?.isExpired">
                                        <q-icon name="bi-lock-fill" size="xs" class="q-mr-xs" />
                                        This discussion is closed to new comments.
                                    </div>
                                    <template v-else>
                                        <div class="rc-reply">
                                            <div class="rc-reply-grow">
                                                <div class="rc-cap">your comment</div>
                                                <q-input v-model="commentContent" type="textarea" outlined hide-bottom-space class="rc-reply-text" placeholder="Add to the discussion..." />
                                            </div>
                                            <q-btn unelevated no-caps color="primary" icon="bi-send" label="post comment" class="rc-send rc-reply-send" :disable="!commentContent.trim()" :loading="commentLoading" @click="submitComment" />
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </div>

                        <!-- ===== manage: what to do, then the form with its button fixed on the right ===== -->
                        <div v-if="detailTab === 'manage' && isSupervisor" class="rc-page rc-page--manage">
                            <div class="rc-pg-head">
                                <div v-if="!manageType">
                                    <div class="wz-title">What would you like to do with this discussion?</div>
                                    <div class="wz-sub">Pick one. Nothing changes until you confirm it.</div>
                                    <div class="wz-types">
                                        <div v-for="t in manageTypes" :key="t.value" class="wz-type" @click="manageType = t.value">
                                            <div class="wz-type-icon" :style="{ background: t.bg, color: t.color }"><q-icon :name="t.icon" size="20px" /></div>
                                            <div class="col">
                                                <div class="wz-type-title">{{ t.label }}</div>
                                                <div class="wz-type-hint">{{ t.hint }}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="wz-action" :style="{ '--wz-bg': manageMeta?.bg, '--wz-fg': manageMeta?.color }">
                                    <div class="wz-action-icon"><q-icon :name="manageMeta?.icon" size="24px" /></div>
                                    <div class="col" style="min-width: 0;">
                                        <div class="wz-action-eyebrow">you are about to</div>
                                        <div class="wz-action-title">{{ manageMeta?.label }}</div>
                                        <div class="wz-action-hint">{{ manageMeta?.hint }}</div>
                                    </div>
                                    <span class="wz-action-now">now {{ statusText }}</span>
                                </div>
                            </div>

                            <div v-if="manageType" class="rc-pg-main">
                                <!-- assign the offices -->
                                <div v-if="manageType === 'assign'" class="rc-block">
                                    <div class="row items-center q-mb-xs">
                                        <div class="rc-block-title" style="margin-bottom: 0;">the offices that handle it</div>
                                        <q-space />
                                        <q-btn unelevated size="sm" color="primary" icon="bi-stars" round :loading="suggestLoading" @click="loadSuggestions"><q-tooltip>Help me decide with AI</q-tooltip></q-btn>
                                    </div>
                                    <div class="text-caption text-grey q-mb-sm" v-if="suggestionsChecked && !suggestions.length">
                                        No confident suggestion: the AI could not match this discussion to any office's mandate.
                                    </div>
                                    <div class="row items-center q-gutter-xs q-mb-md">
                                        <q-btn
                                            v-for="o in officeOptions" :key="o.value" no-caps unelevated rounded size="sm" :label="o.label"
                                            class="dp-chip" :class="selectedOfficeIds.includes(o.value) ? 'dp-chip--active' : ''" @click="toggleOffice(o.value)"
                                        >
                                            <q-icon v-if="suggestedOfficeIds.has(o.value)" name="bi-stars" :color="selectedOfficeIds.includes(o.value) ? 'white' : 'amber-8'" size="0.8em" class="q-ml-xs"><q-tooltip>AI-suggested</q-tooltip></q-icon>
                                        </q-btn>
                                    </div>
                                    <div v-if="officesWithReason.length" class="rc-offs">
                                        <div v-for="o in officesWithReason" :key="o.value" class="rc-off">
                                            <div class="rc-off-top">
                                                <span class="rc-code rc-code--solid rc-off-code">{{ o.label }}</span>
                                                <q-space />
                                                <q-icon v-if="selectedOfficeIds.includes(o.value)" name="bi-check-circle-fill" color="primary" size="xs" />
                                            </div>
                                            <div class="rc-off-why"><q-icon name="bi-robot" size="13px" /><span>{{ reasonsByOffice[o.value] }}</span></div>
                                        </div>
                                    </div>
                                </div>

                                <!-- close or reopen -->
                                <div v-else class="rc-block">
                                    <div class="rc-block-title">what happens</div>
                                    <div class="wf-effects">
                                        <div v-for="e in statusEffects" :key="e.title" class="wf-effect">
                                            <span class="rc-ico" :class="'rc-ico--' + e.tone"><q-icon :name="e.icon" size="17px" /></span>
                                            <div><b>{{ e.title }}</b><span>{{ e.text }}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div v-if="manageType" class="rc-pg-foot">
                                <q-btn flat round size="sm" color="grey-8" icon="bi-arrow-left" @click="manageType = null"><q-tooltip>Back to the choices</q-tooltip></q-btn>
                            </div>
                            <!-- Manage, before an action is picked: the details and the history of the discussion, like every other Manage -->
                            <div v-if="!manageType" class="rc-pg-side">
                                <div class="rc-panel rc-panel--fill">
                                    <RecordTrail
                                        module="discussion" :entity-id="selected?.id" :created-at="selected?.createdAt || ''" :show-link="false"
                                        icon="bi-people" :headline="trailHeadline" :subline="`opened by ${creatorName(selected)}`" :status="trailStatus" :facts="trailFacts"
                                    />
                                </div>
                            </div>
                            <div v-if="manageType" class="rc-pg-side">
                                <div class="rc-panel rc-panel--fill">
                                    <div class="rc-reply">
                                        <div class="rc-reply-grow">
                                            <template v-if="manageType === 'assign'">
                                                <div class="rc-cap">handled by now</div>
                                                <div class="row q-gutter-xs q-mb-lg">
                                                    <span v-for="o in selected?.offices || []" :key="o.id" class="rc-code rc-code--solid rc-off-code">{{ o.alias || o.name }}</span>
                                                    <span v-if="!selected?.offices?.length" class="text-caption text-grey">No office yet.</span>
                                                </div>
                                                <div class="rc-cap">after saving<span class="rc-count">{{ selectedOfficeIds.length }}</span></div>
                                                <div class="row q-gutter-xs">
                                                    <span v-for="o in officeOptions.filter(x => selectedOfficeIds.includes(x.value))" :key="o.value" class="rc-code rc-code--solid rc-off-code">{{ o.label }}</span>
                                                    <span v-if="!selectedOfficeIds.length" class="text-caption text-grey">No office: it will be unassigned.</span>
                                                </div>
                                            </template>
                                            <template v-else>
                                                <div class="rc-cap">now</div>
                                                <div class="text-body2 q-mb-md">{{ actionsHint }}</div>
                                            </template>
                                        </div>
                                        <q-btn
                                            v-if="manageType === 'assign'" no-caps unelevated color="primary" icon="bi-check2"
                                            :label="selectedOfficeIds.length ? `save assignment (${selectedOfficeIds.length})` : 'unassign'"
                                            class="rc-send rc-reply-send" :loading="reassignLoading" @click="submitReassign"
                                        />
                                        <q-btn
                                            v-else no-caps unelevated :color="statusAction === 'close' ? 'negative' : 'positive'" :icon="statusAction === 'close' ? 'bi-lock' : 'bi-unlock'"
                                            :label="statusAction === 'close' ? 'close discussion' : 'reopen discussion'" class="rc-send rc-reply-send" :loading="statusLoading" @click="toggleStatus(statusAction)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </q-card-section>

                <q-inner-loading :showing="detailLoading">
                    <q-spinner-oval />
                </q-inner-loading>
            </q-card>
        </q-dialog>
    </div>
</template>

<script setup>
import ValidationCards from 'src/components/ValidationCards.vue';
import DateInput from 'src/components/DateInput.vue';
import RecordTrail from 'src/components/RecordTrail.vue';
import { esc } from 'src/utils/escape';
import EmptyState from 'src/components/EmptyState.vue';
import { ref, computed, onMounted, watch } from 'vue';
import { api } from 'src/boot/axios';
import moment from 'moment';
import { Toast } from 'src/boot/sweetalert';
import Swal from 'sweetalert2/dist/sweetalert2.js';
import { useAuthStore } from 'src/stores/auth-store';
import Apexchart from 'vue3-apexcharts';
import { useLiveRefresh } from 'src/composables/useLiveRefresh';

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
        if (attnFilter.value && !ATTN[attnFilter.value](d)) return false;
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


// ---- "needs attention": the tiles on the overview double as filters of the list on the right
const attnFilter = ref(null);
const toggleAttn = (key) => {
    attnFilter.value = attnFilter.value === key ? null : key;
    statusFilter.value = 'all';
};
const isExpiring = (x) => x.status === 'open' && !x.isExpired && !!x.expiresAt && moment(x.expiresAt).diff(moment(), 'days') <= 7;
const ATTN = {
    unassigned: (x) => !x.offices?.length,
    expiring: isExpiring,
    expired: (x) => !!x.isExpired,
    quiet: (x) => x.status === 'open' && !x.commentCount,
};
const ATTN_LABEL = { unassigned: 'Unassigned', expiring: 'Ending soon', expired: 'Past the end date', quiet: 'No comments yet' };
const quietCount = computed(() => discussions.value.filter(ATTN.quiet).length);
const attnTone = (n, tone = 'bad') => (n > 0 ? 'ov-attn--' + tone : 'ov-attn--zero');
const share = (n) => (discussions.value.length ? Math.round((n / discussions.value.length) * 100) : 0);
const totalResp = computed(() => discussions.value.reduce((sum, x) => sum + (x.commentCount || 0), 0));
const avgResp = computed(() => (discussions.value.length ? (totalResp.value / discussions.value.length).toFixed(1) : '0.0'));

const standRows = computed(() => {
    const open = discussions.value.filter(x => x.status === 'open');
    const expired = open.filter(x => x.isExpired).length;
    const soon = open.filter(isExpiring).length;
    const running = open.length - expired - soon;
    const closed = discussions.value.filter(x => x.status === 'closed').length;
    return [
        { label: 'Open and running', sub: 'taking comments', count: running, color: '#1C8A3B' },
        { label: 'Ending within 7 days', sub: 'closes by itself', count: soon, color: '#FFC900' },
        { label: 'Past the end date', sub: 'no longer takes comments', count: expired, color: '#C10015' },
        { label: 'Closed', sub: 'by a supervisor', count: closed, color: '#B8C2D4' },
    ].map(r => ({ ...r, pct: share(r.count) }));
});
const topRows = computed(() => {
    const rows = [...discussions.value].filter(x => x.commentCount > 0).sort((a, b) => b.commentCount - a.commentCount).slice(0, 5);
    const max = rows.length ? rows[0].commentCount : 1;
    return rows.map(x => ({ ...x, label: x.title, count: x.commentCount, pct: Math.round((x.commentCount / max) * 100) }));
});
const officeRows = computed(() => {
    const by = {};
    discussions.value.forEach(x => (x.offices || []).forEach(o => { const l = o.alias || o.name; by[l] = (by[l] || 0) + 1; }));
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = rows.length ? rows[0][1] : 1;
    return rows.map(([label, count]) => ({ label, count, pct: Math.round((count / max) * 100) }));
});

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
    chart: { type: 'donut' },
    labels: [],
    colors: ['#204888', '#FFC900', '#68AFF1', '#B8C2D4', '#3E6BB5', '#9A6B00'],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    stroke: { width: 2 },
    plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Comments', fontSize: '12px' } } } } },
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

const loadDiscussions = async (opts = {}) => {
    // quiet: a live refresh loads the new data without showing the spinner
    if (!opts?.quiet) loading.value = true;
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
    showErrors.value = false;
    page.value = 'topic';
    createDialog.value = true;
};

const showErrors = ref(false);
// What the create button checks: marks the problem in formError and returns false, or true when the form is fine.
const validateForm = () => {
    formError.value = '';
    if (!form.value.title.trim()) {
        formError.value = 'Title is required.';
        return false;
    }
    return true;
};

// Creating goes step by step: a step opens only once every step before it is complete.
const page = ref('topic');
const ORDER = ['topic', 'schedule', 'review'];
const stepDone = (key) => {
    if (key === 'topic') return !!form.value.title.trim();
    return true;
};
const isOpen = (key) => ORDER.slice(0, ORDER.indexOf(key)).every(stepDone);
const pages = computed(() => [
    { key: 'topic', open: isOpen('topic'), icon: 'bi-chat-quote', label: 'topic', state: formError.value && !form.value.title.trim() ? 'bad' : (stepDone('topic') ? 'ok' : '') },
    { key: 'schedule', open: isOpen('schedule'), icon: 'bi-calendar-event', label: 'schedule', state: form.value.expiresAt ? 'ok' : '' },
    { key: 'review', open: isOpen('review'), icon: 'bi-clipboard-check', label: 'review' },
]);
const pageIndex = computed(() => Math.max(0, ORDER.indexOf(page.value)));
const go = (key) => {
    if (isOpen(key)) page.value = key;
};
const stepBy = (dir) => {
    const next = ORDER[pageIndex.value + dir];
    if (!next) return;
    // going forward asks the step you are on to be complete: what is missing is marked, and you stay
    if (dir > 0 && !stepDone(page.value)) {
        validateForm();
        return;
    }
    formError.value = '';
    page.value = next;
};
watch(() => form.value, () => { if (formError.value) validateForm(); }, { deep: true });
const PAGE_INFO = {
    topic: { icon: 'bi-chat-quote', bg: '#E5EEFC', fg: '#204888', title: 'The topic', hint: 'What residents should talk about.' },
    schedule: { icon: 'bi-calendar-event', bg: '#FFF1D6', fg: '#9A6B00', title: 'When it ends', hint: 'An end date, or leave it open.' },
    review: { icon: 'bi-clipboard-check', bg: '#EDE7F6', fg: '#5E35B1', title: 'Review it', hint: 'Check everything, then create it.' },
};
const current = computed(() => PAGE_INFO[page.value] || PAGE_INFO.topic);
const checks = computed(() => [
    { key: 'title', page: 'topic', required: true, ok: !!form.value.title.trim(), title: 'A title', detail: form.value.title.trim() || 'Say what it is about.' },
    { key: 'description', page: 'topic', required: false, ok: !!form.value.description.trim(), title: 'A description', detail: form.value.description.trim() ? `${form.value.description.trim().length} characters. Optional.` : 'Optional, but it helps the routing.' },
    { key: 'schedule', page: 'schedule', required: false, ok: !!form.value.expiresAt, title: 'An end date', detail: form.value.expiresAt ? moment(form.value.expiresAt, 'YYYY-MM-DD').format('MMMM DD, YYYY') : 'Optional. It stays open until closed.' },
]);
const reviewFacts = computed(() => [
    { label: 'Title', value: form.value.title.trim(), icon: 'bi-chat-quote', tone: 'blue', page: 'topic' },
    { label: 'Description', value: form.value.description.trim(), icon: 'bi-text-paragraph', tone: 'teal', page: 'topic', wrap: true },
    { label: 'Ends', value: form.value.expiresAt ? moment(form.value.expiresAt, 'YYYY-MM-DD').format('MMMM DD, YYYY') : 'No end date', icon: 'bi-calendar-event', tone: 'amber', page: 'schedule' },
]);

const createDiscussion = async () => {
    if (!validateForm()) return;
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

// the pages of the detail dialog
const detailTab = ref('overview');
const activeDetailNav = computed(() => detailNavs.value.find(n => n.tab === detailTab.value));
const detailNavs = computed(() => [
    { tab: 'overview', label: 'overview', icon: 'bi-grid' },
    { tab: 'comments', label: 'comments', icon: 'bi-chat-dots', count: selected.value?.comments?.length || 0 },
    ...(isSupervisor.value ? [{ tab: 'manage', label: 'manage', icon: 'bi-sliders' }] : []),
]);
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
            ? `Set the concerned office(s) to <b>${esc(names.join(', '))}</b>?`
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

// ---- the dialog's figures
const respTotal = computed(() => selected.value?.comments?.length || 0);
const statusText = computed(() => (selected.value?.status === 'open' && selected.value?.isExpired ? 'expired' : selected.value?.status || ''));
// the details in the panel next to Manage
const trailHeadline = computed(() => String(selected.value?.title || '').slice(0, 120));
const trailStatus = computed(() => {
    const t = statusText.value;
    return t ? { label: t, tone: t === 'open' ? 'ok' : (t === 'expired' ? 'warn' : 'off') } : null;
});
const trailFacts = computed(() => {
    const d = selected.value;
    if (!d) return [];
    const offices = (d.offices || []).map(o => o.alias || o.name).filter(Boolean);
    return [
        { label: 'Opened', value: d.createdAt ? moment(d.createdAt).format('MMM DD, YYYY') : '—', icon: 'bi-calendar-check' },
        { label: 'Ends', value: d.expiresAt ? moment(d.expiresAt).format('MMM DD, YYYY') : 'No end date', icon: 'bi-calendar-event', dim: !d.expiresAt },
        { label: 'Offices', value: offices.join(', ') || 'Not assigned', icon: 'bi-diagram-3', dim: !offices.length },
        { label: 'Comments', value: String(respTotal.value), icon: 'bi-chat-dots' },
        { label: 'Reopened', value: d.reopenCount ? `${d.reopenCount} time${d.reopenCount === 1 ? '' : 's'}` : 'Never', icon: 'bi-arrow-counterclockwise', dim: !d.reopenCount },
    ];
});

const statusSub = computed(() => {
    const d = selected.value;
    if (!d) return '';
    if (d.status === 'closed') return 'closed by a supervisor';
    if (d.isExpired) return 'past its end date';
    return 'taking comments';
});
const lastRespLine = computed(() => {
    const c = sortedComments.value[0];
    return c ? 'last ' + moment(c.createdAt).fromNow() : 'none yet';
});
const creatorInitials = computed(() => creatorName(selected.value).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase());
const progressSteps = computed(() => {
    const d = selected.value;
    if (!d) return [];
    const routed = !!d.offices?.length;
    const responded = respTotal.value > 0;
    const finished = d.status === 'closed' || d.isExpired;
    return [
        { label: 'Opened', icon: 'bi-play-circle', state: 'done' },
        { label: 'Routed', icon: 'bi-diagram-3', state: routed ? 'done' : 'now' },
        { label: 'First comment', icon: 'bi-chat-dots', state: responded ? 'done' : (routed ? 'now' : '') },
        { label: d.isExpired && d.status === 'open' ? 'Expired' : 'Closed', icon: 'bi-lock', state: finished ? (d.isExpired && d.status === 'open' ? 'bad' : 'done') : '' },
    ];
});

// ---- manage: pick what to do, then do it
const manageType = ref(null);
const statusAction = computed(() => (selected.value?.status === 'open' && !selected.value?.isExpired ? 'close' : 'reopen'));
const MANAGE_META = {
    assign: { icon: 'bi-diagram-3', bg: '#EDE7F6', color: '#5E35B1', label: 'Assign offices', hint: 'Choose which offices handle it.' },
    close: { icon: 'bi-lock', bg: '#FBE6E8', color: '#B3121F', label: 'Close discussion', hint: 'Stop taking comments.' },
    reopen: { icon: 'bi-unlock', bg: '#E4F6EA', color: '#1C8A3B', label: 'Reopen discussion', hint: 'Take comments again.' },
};
const manageMeta = computed(() => MANAGE_META[manageType.value === 'status' ? statusAction.value : manageType.value] || null);
const manageTypes = computed(() => [
    { value: 'assign', ...MANAGE_META.assign },
    { value: 'status', ...MANAGE_META[statusAction.value] },
]);
const statusEffects = computed(() => (statusAction.value === 'close'
    ? [
        { icon: 'bi-lock', tone: 'red', title: 'It stops taking comments', text: 'Residents can still read it, but cannot add to it.' },
        { icon: 'bi-arrow-counterclockwise', tone: 'blue', title: 'You can reopen it', text: 'Reopening starts it again with no end date.' },
    ]
    : [
        { icon: 'bi-unlock', tone: 'teal', title: 'It takes comments again', text: selected.value?.isExpired ? 'Its end date has passed, so it reopens with no end date.' : 'Residents can add to it again.' },
        { icon: 'bi-clock-history', tone: 'amber', title: 'It counts as reopened', text: 'It is counted in the reopen rate on the overview.' },
    ]));

const openDetail = async (row) => {
    detailTab.value = 'overview';
    manageType.value = null;
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

// The line under "actions" in the detail dialog: what state this discussion is in and what closing or
// reopening does to it.
const actionsHint = computed(() => {
    const d = selected.value;
    if (!d) return '';
    if (d.status === 'closed') return 'Closed — it takes no new comments. Reopen it to take comments again.';
    if (d.isExpired) return 'Expired — it stopped taking comments on its expiry date. Reopen it to take comments again (it will have no expiry date).';
    return 'Open — citizens can add comments until it is closed or expires.';
});

const toggleStatus = async (action) => {
    const result = await Swal.fire({
        title: 'Confirm',
        html: action === 'close'
            ? 'Close this discussion? Citizens will no longer be able to add comments.'
            : (selected.value?.isExpired
                ? 'Reopen this discussion? Its expiry date has passed, so it will reopen with no expiry date and citizens will be able to add comments again.'
                : 'Reopen this discussion? Citizens will be able to add comments again.'),
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

// the open dialog is kept current too, without sending it back to its first page or touching what is being typed
const reloadSelected = async () => {
    if (!detailDialog.value || !selected.value?.id) return;
    try {
        const response = await api.get(`/discussion/${selected.value.id}`);
        selected.value = response.data.data;
    } catch (e) {
        console.error(e);
    }
};

// anyone's change (a new one, a comment, closed, reopened, assigned) shows here without pressing refresh
useLiveRefresh(['discussion'], () => Promise.all([loadDiscussions({ quiet: true }), reloadSelected()]));

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
.dp-comment-list {
    max-height: 420px;
    overflow-y: auto;
}
</style>
