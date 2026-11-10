<template>
    <div>
        <div class="pp-shell">
            <div class="pp-main">
                <div class="row items-center justify-between q-mb-md pp-header">
                    <div>
                        <div class="pp-eyebrow">public survey &middot; operations overview<template v-if="scopeLabel"> &middot; {{ scopeLabel }}</template></div>
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
                        <div class="ov-attn-sub">closed to new responses</div>
                    </div>
                    <div class="ov-attn ov-attn--click" :class="[attnTone(quietCount, 'info'), { 'ov-attn--on': attnFilter === 'quiet' }]" @click="toggleAttn('quiet')">
                        <q-icon name="bi-megaphone" size="18px" class="ov-attn-ico" />
                        <div class="ov-attn-value">{{ quietCount }}</div>
                        <div class="ov-attn-label">no responses yet</div>
                        <div class="ov-attn-sub">open, nobody has answered</div>
                    </div>
                </div>

                <!-- How it is going over the period -->
                <div class="ov-title">how it is going</div>
                <div class="ov-kpi-grid q-mb-lg">
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-collection" size="16px" /> surveys</div>
                        <div class="ov-kpi-value">{{ polls.length }}</div>
                        <div class="ov-kpi-sub">in {{ analyticsRangeLabel || 'the period' }}</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-broadcast" size="16px" /> open now</div>
                        <div class="ov-kpi-value">{{ openCount }}</div>
                        <div class="ov-kpi-sub">{{ share(openCount) }}% of all</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-ui-checks" size="16px" /> responses</div>
                        <div class="ov-kpi-value">{{ totalResp }}</div>
                        <div class="ov-kpi-sub">{{ avgResp }} per survey</div>
                    </div>
                    <div class="ov-kpi">
                        <div class="ov-kpi-head"><q-icon name="bi-stopwatch" size="16px" /> time to first response</div>
                        <div class="ov-kpi-value">{{ formatLag(stats.avgTimeToFirstVoteMinutes) }}</div>
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
                            <div class="ov-card-note">of {{ polls.length }}</div>
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
                        <div class="ov-card-foot">Open ones take responses until a supervisor closes them or the end date passes.</div>
                    </div>

                    <div class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">who is answering</div>
                            <div class="ov-card-note">by who they are</div>
                        </div>
                        <apexchart v-if="authorMixChartSeries.some(n => n > 0)" type="donut" height="210" :options="authorMixChartOptions" :series="authorMixChartSeries" />
                        <div v-else class="ov-empty">nobody has joined in yet</div>
                    </div>
                </div>

                <div class="ov-duo q-mb-lg">
                    <div class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">most answered</div>
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
                        <div v-if="!topRows.length" class="ov-empty">no responses yet</div>
                    </div>

                    <div v-if="canViewAll" class="ov-card">
                        <div class="ov-card-head">
                            <div class="ov-card-title">surveys by office</div>
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
                <div class="pp-panel-grid">
                    <q-card flat class="pp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">surveys opened per {{ bucketUnitLabel }}</div>
                        <apexchart type="area" height="220" :options="volumeChartOptions" :series="volumeChartSeries" />
                    </q-card>
                    <q-card flat class="pp-panel custom-border radius-xs q-pa-md">
                        <div class="text-caption text-uppercase text-grey q-mb-sm">responses per {{ bucketUnitLabel }}</div>
                        <apexchart type="line" height="220" :options="votesChartOptions" :series="votesChartSeries" />
                    </q-card>
                </div>
            </div>

            <div class="pp-rail">
                <q-card flat class="pp-rail-card">
                    <div class="pp-rail-head">
                        <div class="row items-center justify-between no-wrap q-mb-sm">
                            <div class="row items-baseline q-gutter-xs">
                                <div class="text-h6 text-capitalize">surveys</div>
                                <div class="text-caption text-grey">{{ filteredPolls.length }} of {{ polls.length }}</div>
                            </div>
                            <q-btn v-if="isSupervisor" unelevated rounded size="sm" color="primary" label="add" class="text-capitalize" @click="openCreateDialog">
                                <q-tooltip>Start a new survey</q-tooltip>
                            </q-btn>
                        </div>
                        <q-input outlined dense v-model="search" placeholder="Search title..." class="pp-search q-mb-sm">
                            <template v-slot:prepend><q-icon name="bi-search" size="xs" /></template>
                        </q-input>
                        <div v-if="attnFilter" class="q-mb-sm">
                            <q-btn no-caps unelevated rounded size="sm" icon-right="bi-x" :label="ATTN_LABEL[attnFilter]" class="pp-chip pp-chip--active" @click="attnFilter = null" />
                        </div>
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
                            <div class="text-caption text-uppercase q-mt-sm">loading surveys...</div>
                        </div>
                        <EmptyState
                            v-if="!loading && !filteredPolls.length" rail icon="bi-ui-checks" title="No surveys found"
                            hint="Try another search or status."
                        />
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

        <!-- Create survey -->
        <q-dialog v-model="createDialog" persistent class="dialog dialog--wide">
            <q-card>
                <q-card-section class="row items-center no-wrap">
                    <div>
                        <div class="text-caption">public survey &middot; started by staff</div>
                        <div class="text-h5 text-uppercase">new survey</div>
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
                                <div v-show="page === 'about'" class="rc-block">
                                    <div class="rc-block-title">about the survey</div>
                                    <div class="rc-cap" :class="{ 'rc-cap--bad': showErrors && !form.question.trim() }">{{ showErrors && !form.question.trim() ? 'a title is required' : 'title' }}</div>
                                    <q-input v-model="form.question" outlined placeholder="What is this survey about?" :error="showErrors && !form.question.trim()" no-error-icon hide-bottom-space />
                                    <div class="rc-cap q-mt-md">description (optional)</div>
                                    <q-input v-model="form.description" type="textarea" outlined rows="6" hide-bottom-space placeholder="Say why you are asking, and what the answers will be used for..." />
                                    <div class="rc-field-foot"><span>The title, description and questions decide which office it is sent to.</span><span>{{ form.description.trim().length }}</span></div>
                                </div>

                                <div v-show="page === 'questions'">
                                    <div v-for="(q, qi) in form.questions" :key="q.key" class="sv-q" :class="{ 'sv-q--bad': showErrors && qProblem(q) }">
                                        <div class="sv-q-head">
                                            <span class="sv-q-n">{{ qi + 1 }}</span>
                                            <q-input v-model="q.prompt" outlined dense class="col" :placeholder="`Question ${qi + 1}`" :error="showErrors && !q.prompt.trim()" no-error-icon hide-bottom-space />
                                        </div>
                                        <div class="sv-types">
                                            <q-btn
                                                v-for="t in Q_TYPES" :key="t.value" no-caps unelevated rounded size="sm" :icon="t.icon" :label="t.label"
                                                class="pp-chip" :class="q.type === t.value ? 'pp-chip--active' : ''" @click="setType(q, t.value)"
                                            ><q-tooltip>{{ t.hint }}</q-tooltip></q-btn>
                                        </div>

                                        <div class="sv-q-body">
                                            <q-input v-if="q.type === 'short'" disable outlined dense placeholder="Short answer: one line of text" />
                                            <q-input v-else-if="q.type === 'paragraph'" disable outlined type="textarea" rows="3" placeholder="Paragraph: a longer answer" />
                                            <template v-else>
                                                <div v-for="(o, oi) in q.options" :key="oi" class="sv-opt">
                                                    <q-icon :name="q.type === 'radio' ? 'bi-circle' : 'bi-square'" size="16px" class="sv-opt-ico" />
                                                    <q-input v-model="q.options[oi]" outlined dense class="col" :placeholder="`Choice ${oi + 1}`" hide-bottom-space />
                                                    <q-btn v-if="q.options.length > 2" flat round dense size="sm" icon="bi-x-lg" color="grey-7" @click="q.options.splice(oi, 1)"><q-tooltip>Remove the choice</q-tooltip></q-btn>
                                                </div>
                                                <q-btn flat no-caps rounded size="sm" color="primary" icon="bi-plus-circle" label="add a choice" :disable="q.options.length >= 20" @click="q.options.push('')" />
                                            </template>
                                        </div>

                                        <div v-if="showErrors && qProblem(q)" class="sv-q-err"><q-icon name="bi-exclamation-circle" size="14px" /> {{ qProblem(q) }}</div>

                                        <div class="sv-q-foot">
                                            <q-toggle v-model="q.required" dense label="Required" />
                                            <q-space />
                                            <q-btn flat round dense size="sm" icon="bi-arrow-up" color="grey-8" :disable="qi === 0" @click="moveQuestion(qi, -1)"><q-tooltip>Move up</q-tooltip></q-btn>
                                            <q-btn flat round dense size="sm" icon="bi-arrow-down" color="grey-8" :disable="qi === form.questions.length - 1" @click="moveQuestion(qi, 1)"><q-tooltip>Move down</q-tooltip></q-btn>
                                            <q-btn flat round dense size="sm" icon="bi-copy" color="grey-8" @click="duplicateQuestion(qi)"><q-tooltip>Duplicate</q-tooltip></q-btn>
                                            <q-btn flat round dense size="sm" icon="bi-trash3" color="grey-8" :disable="form.questions.length === 1" @click="form.questions.splice(qi, 1)"><q-tooltip>Delete the question</q-tooltip></q-btn>
                                        </div>
                                    </div>

                                    <div class="sv-add">
                                        <span class="sv-add-cap">add a question</span>
                                        <q-btn v-for="t in Q_TYPES" :key="t.value" no-caps unelevated rounded size="sm" :icon="t.icon" :label="t.label" class="pp-chip" :disable="form.questions.length >= 50" @click="addQuestion(t.value)" />
                                    </div>
                                </div>
                                <div v-show="page === 'schedule'" class="rc-block">
                                    <div class="rc-block-title">when it ends<span class="rc-count">optional</span></div>
                                    <div class="rc-cap">pick the last day it takes responses, or leave it open</div>
                                    <DateInput v-model="form.expiresAt" :options="futureDateOptions" clearable placeholder="No end date" style="max-width: 340px;" />
                                    <div class="row items-center q-mt-sm">
                                        <q-btn flat no-caps rounded size="sm" color="primary" icon="bi-x-circle" label="no end date" :disable="!form.expiresAt" @click="form.expiresAt = ''" />
                                        <span class="text-caption text-grey q-ml-sm">{{ form.expiresAt ? 'Closes after ' + moment(form.expiresAt, 'YYYY-MM-DD').format('MMMM DD, YYYY') : 'It stays open until a supervisor closes it.' }}</span>
                                    </div>
                                </div>
                                <div v-if="page === 'review'">
                                    <div class="rc-block">
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
                                    <div class="rc-block">
                                        <div class="rc-block-title">the questions<span class="rc-count">{{ form.questions.length }}</span></div>
                                        <div v-for="(q, qi) in form.questions" :key="q.key" class="sv-prev">
                                            <span class="sv-q-n">{{ qi + 1 }}</span>
                                            <div class="col" style="min-width: 0;">
                                                <div class="sv-prev-t">{{ q.prompt }}<span v-if="q.required" class="sv-req">*</span></div>
                                                <div class="sv-prev-d"><q-icon :name="typeOf(q.type).icon" size="13px" /> {{ typeOf(q.type).label }}<template v-if="q.type === 'radio' || q.type === 'checkbox'"> &middot; {{ q.options.filter(o => o.trim()).join(', ') }}</template></div>
                                            </div>
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
                                            no-caps unelevated color="primary" icon="bi-send" label="create survey"
                                            class="rc-send rc-reply-send" :disable="page !== 'review'" :loading="saving" @click="createPoll"
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
                        <div class="text-caption">public survey &middot; survey detail</div>
                        <div class="text-h5">{{ selected?.question }}</div>
                        <div class="rc-hero-badges">
                            <span class="rc-hero-pill rc-hero-pill--on">{{ statusText }}</span>
                            <span v-for="o in selected?.offices || []" :key="o.id" class="rc-hero-pill">{{ o.alias || o.name }}<q-tooltip>{{ o.name }}</q-tooltip></span>
                            <span v-if="selected?.expiresAt" class="rc-hero-pill">ends {{ moment(selected.expiresAt).format('MMM DD, YYYY') }}</span>
                            <span class="rc-hero-pill">{{ respTotal }} {{ respTotal === 1 ? 'response' : 'responses' }}</span>
                        </div>
                    </div>
                    <q-space />
                    <q-btn unelevated round flat icon="bi-x-circle" v-close-popup />
                </q-card-section>

                <q-card-section class="col rc-split">
                    <aside class="rc-side">
                        <template v-for="(n, i) in detailNavs" :key="n.tab">
                            <div v-if="i === 1" class="rc-side-title">Survey</div>
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
                                    <div class="rc-tile"><span class="rc-ico rc-ico--red"><q-icon name="bi-ui-checks" size="18px" /></span><span class="rc-tile-text"><span class="rc-tile-label">responses</span><span class="rc-tile-value">{{ respTotal }}</span><span class="rc-tile-sub">{{ lastRespLine }}</span></span></div>
                                </div>
                            </div>

                            <div class="rc-ov-det">
                                <div class="rc-block">
                                    <div class="rc-block-title">about the survey</div>
                                    <div class="row items-center no-wrap q-mb-sm">
                                        <q-avatar size="40px" color="primary" text-color="white">{{ creatorInitials }}</q-avatar>
                                        <div class="q-ml-sm">
                                            <div class="text-weight-bold text-capitalize">{{ creatorName(selected) }}</div>
                                            <div class="text-caption text-grey">created it {{ selected?.createdAt ? moment(selected.createdAt).fromNow() : '' }}</div>
                                        </div>
                                    </div>
                                    <read-more v-if="selected?.description" :rows="6" moreText="See More" lessText="See Less">{{ selected.description }}</read-more>
                                    <div v-else class="text-caption text-grey">No description was left.</div>
                                </div>
                                <div class="rc-block">
                                    <div class="rc-block-title">the questions<span class="rc-count">{{ selected?.questions?.length || 0 }}</span></div>
                                    <div v-for="(q, qi) in selected?.questions || []" :key="q.id" class="sv-prev">
                                        <span class="sv-q-n">{{ qi + 1 }}</span>
                                        <div class="col" style="min-width: 0;">
                                            <div class="sv-prev-t">{{ q.prompt }}<span v-if="q.required" class="sv-req">*</span></div>
                                            <div class="sv-prev-d"><q-icon :name="typeOf(q.type).icon" size="13px" /> {{ typeOf(q.type).label }} &middot; answered by {{ q.answered }} of {{ respTotal }}</div>
                                        </div>
                                    </div>
                                    <div v-if="!selected?.questions?.length" class="rc-empty rc-empty--sm"><q-icon name="bi-ui-checks" size="28px" /><div class="rc-empty-t">No questions</div></div>
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
                                            <div class="rc-fact"><span class="rc-ico rc-ico--purple"><q-icon name="bi-ui-checks" size="16px" /></span><span class="rc-fact-text"><span class="rc-fact-label">responses</span><span class="rc-fact-value">{{ respTotal }}</span></span></div>
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

                        <!-- ===== results: every question on the left, what the numbers say fixed on the right ===== -->
                        <div v-if="detailTab === 'results'" class="rc-page">
                            <div class="rc-pg-head">
                                <div class="wz-action" style="--wz-bg: #FFF1D6; --wz-fg: #9A6B00;">
                                    <div class="wz-action-icon"><q-icon name="bi-bar-chart" size="24px" /></div>
                                    <div class="col" style="min-width: 0;">
                                        <div class="wz-action-eyebrow">{{ respTotal }} response{{ respTotal === 1 ? '' : 's' }}</div>
                                        <div class="wz-action-title">Results</div>
                                        <div class="wz-action-hint">What residents answered, question by question.</div>
                                    </div>
                                    <span class="wz-action-now">{{ statusText }}</span>
                                </div>
                            </div>
                            <div class="rc-pg-main">
                                <div v-for="(q, qi) in questionResults" :key="q.id" :id="'sq-' + q.id" class="rc-block">
                                    <div class="sv-res-head">
                                        <span class="sv-q-n">{{ qi + 1 }}</span>
                                        <div class="col" style="min-width: 0;">
                                            <div class="sv-prev-t">{{ q.prompt }}<span v-if="q.required" class="sv-req">*</span></div>
                                            <div class="sv-prev-d"><q-icon :name="typeOf(q.type).icon" size="13px" /> {{ typeOf(q.type).label }} &middot; {{ q.answered }} of {{ respTotal }} answered</div>
                                        </div>
                                    </div>
                                    <template v-if="q.type === 'radio' || q.type === 'checkbox'">
                                        <div v-for="o in q.rows" :key="o.id" class="ov-step">
                                            <div class="ov-step-top">
                                                <span class="ov-step-label">{{ o.label }}<i v-if="o.leader" class="ov-hint">{{ q.type === 'radio' ? 'leading' : 'most chosen' }}</i></span>
                                                <span class="ov-step-count">{{ o.votes }}</span>
                                                <span class="ov-step-pct">{{ o.percent }}%</span>
                                            </div>
                                            <div class="cp-meter"><div class="cp-meter-fill" :style="{ width: o.percent + '%', background: o.leader ? '#204888' : '#68AFF1' }"></div></div>
                                        </div>
                                        <div v-if="q.type === 'checkbox'" class="ov-meter-sub">People can choose more than one, so the shares can add up to more than 100%.</div>
                                    </template>
                                    <template v-else>
                                        <div v-if="q.answers.length" class="sv-texts">
                                            <div v-for="a in q.shown" :key="a.id" class="sv-text">
                                                <div class="sv-text-t">{{ a.text }}</div>
                                                <div class="sv-text-m">{{ a.author }} &middot; {{ moment(a.createdAt).fromNow() }}</div>
                                            </div>
                                            <q-btn v-if="q.answers.length > 5" flat no-caps rounded size="sm" color="primary" :label="expanded[q.id] ? 'show fewer' : 'show all ' + q.answers.length" @click="expanded[q.id] = !expanded[q.id]" />
                                        </div>
                                        <div v-else class="rc-empty rc-empty--sm"><q-icon name="bi-chat-left-text" size="28px" /><div class="rc-empty-t">No answers yet</div></div>
                                    </template>
                                </div>
                                <div v-if="!questionResults.length" class="rc-empty"><q-icon name="bi-ui-checks" size="36px" /><div class="rc-empty-t">No questions</div></div>
                            </div>
                            <div class="rc-pg-side">
                                <div class="rc-panel rc-panel--fill">
                                    <div class="rc-reply">
                                        <div class="rc-reply-grow">
                                            <div class="rc-cap">what the numbers say</div>
                                            <div class="rc-facts">
                                                <div v-for="f in resultFacts" :key="f.label" class="rc-fact">
                                                    <span class="rc-ico" :class="'rc-ico--' + f.tone"><q-icon :name="f.icon" size="16px" /></span>
                                                    <span class="rc-fact-text"><span class="rc-fact-label">{{ f.label }}</span><span class="rc-fact-value">{{ f.value }}</span></span>
                                                </div>
                                            </div>
                                            <div class="rc-cap q-mt-lg">jump to a question</div>
                                            <div class="sv-jump">
                                                <button v-for="(q, qi) in questionResults" :key="q.id" type="button" class="sv-jump-i" @click="jumpTo(q.id)">
                                                    <span class="sv-q-n">{{ qi + 1 }}</span><span class="sv-jump-t">{{ q.prompt }}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ===== manage: what to do, then the form with its button fixed on the right ===== -->
                        <div v-if="detailTab === 'manage' && isSupervisor" class="rc-page rc-page--manage">
                            <div class="rc-pg-head">
                                <div v-if="!manageType">
                                    <div class="wz-title">What would you like to do with this survey?</div>
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
                                        No confident suggestion: the AI could not match this survey to any office's mandate.
                                    </div>
                                    <div class="row items-center q-gutter-xs q-mb-md">
                                        <q-btn
                                            v-for="o in officeOptions" :key="o.value" no-caps unelevated rounded size="sm" :label="o.label"
                                            class="pp-chip" :class="selectedOfficeIds.includes(o.value) ? 'pp-chip--active' : ''" @click="toggleOffice(o.value)"
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
                            <!-- Manage, before an action is picked: the details and the history of the survey, like every other Manage -->
                            <div v-if="!manageType" class="rc-pg-side">
                                <div class="rc-panel rc-panel--fill">
                                    <RecordTrail
                                        module="poll" :entity-id="selected?.id" :created-at="selected?.createdAt || ''" :show-link="false"
                                        icon="bi-ui-checks" :headline="trailHeadline" :subline="`opened by ${creatorName(selected)}`" :status="trailStatus" :facts="trailFacts"
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
                                            :label="statusAction === 'close' ? 'close survey' : 'reopen survey'" class="rc-send rc-reply-send" :loading="statusLoading" @click="toggleStatus(statusAction)"
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
const creatorName = (p) => {
    const c = p?.creator;
    const name = `${c?.firstname || ''} ${c?.lastname || ''}`.trim();
    return name || 'Staff';
};

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
        if (attnFilter.value && !ATTN[attnFilter.value](p)) return false;
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
    quiet: (x) => x.status === 'open' && !x.totalVotes,
};
const ATTN_LABEL = { unassigned: 'Unassigned', expiring: 'Ending soon', expired: 'Past the end date', quiet: 'No responses yet' };
const quietCount = computed(() => polls.value.filter(ATTN.quiet).length);
const attnTone = (n, tone = 'bad') => (n > 0 ? 'ov-attn--' + tone : 'ov-attn--zero');
const share = (n) => (polls.value.length ? Math.round((n / polls.value.length) * 100) : 0);
const totalResp = computed(() => polls.value.reduce((sum, x) => sum + (x.totalVotes || 0), 0));
const avgResp = computed(() => (polls.value.length ? (totalResp.value / polls.value.length).toFixed(1) : '0.0'));

const standRows = computed(() => {
    const open = polls.value.filter(x => x.status === 'open');
    const expired = open.filter(x => x.isExpired).length;
    const soon = open.filter(isExpiring).length;
    const running = open.length - expired - soon;
    const closed = polls.value.filter(x => x.status === 'closed').length;
    return [
        { label: 'Open and running', sub: 'taking responses', count: running, color: '#1C8A3B' },
        { label: 'Ending within 7 days', sub: 'closes by itself', count: soon, color: '#FFC900' },
        { label: 'Past the end date', sub: 'no longer takes responses', count: expired, color: '#C10015' },
        { label: 'Closed', sub: 'by a supervisor', count: closed, color: '#B8C2D4' },
    ].map(r => ({ ...r, pct: share(r.count) }));
});
const topRows = computed(() => {
    const rows = [...polls.value].filter(x => x.totalVotes > 0).sort((a, b) => b.totalVotes - a.totalVotes).slice(0, 5);
    const max = rows.length ? rows[0].totalVotes : 1;
    return rows.map(x => ({ ...x, label: x.question, count: x.totalVotes, pct: Math.round((x.totalVotes / max) * 100) }));
});
const officeRows = computed(() => {
    const by = {};
    polls.value.forEach(x => (x.offices || []).forEach(o => { const l = o.alias || o.name; by[l] = (by[l] || 0) + 1; }));
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = rows.length ? rows[0][1] : 1;
    return rows.map(([label, count]) => ({ label, count, pct: Math.round((count / max) * 100) }));
});

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
    chart: { type: 'donut' },
    labels: [],
    colors: ['#204888', '#FFC900', '#68AFF1', '#B8C2D4', '#3E6BB5', '#9A6B00'],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    stroke: { width: 2 },
    plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Responses', fontSize: '12px' } } } } },
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

const loadPolls = async (opts = {}) => {
    // quiet: a live refresh loads the new data without showing the spinner
    if (!opts?.quiet) loading.value = true;
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
    form.value = { question: '', description: '', expiresAt: '', questions: [newQuestion()] };
    formError.value = '';
    showErrors.value = false;
    page.value = 'about';
    createDialog.value = true;
};

// ---- the question builder
const Q_TYPES = [
    { value: 'short', label: 'Short answer', icon: 'bi-input-cursor-text', hint: 'One line of text' },
    { value: 'paragraph', label: 'Paragraph', icon: 'bi-text-paragraph', hint: 'A longer written answer' },
    { value: 'radio', label: 'Multiple choice', icon: 'bi-record-circle', hint: 'Pick one choice' },
    { value: 'checkbox', label: 'Checkboxes', icon: 'bi-check2-square', hint: 'Pick any number of choices' },
];
const typeOf = (value) => Q_TYPES.find(t => t.value === value) || Q_TYPES[2];
let questionKey = 0;
const newQuestion = (type = 'radio') => ({ key: ++questionKey, type, prompt: '', required: true, options: ['', ''] });
const showErrors = ref(false);
const addQuestion = (type) => {
    form.value.questions.push(newQuestion(type));
};
const setType = (q, type) => {
    q.type = type;
    if ((type === 'radio' || type === 'checkbox') && q.options.length < 2) q.options = ['', ''];
};
const moveQuestion = (i, dir) => {
    const list = form.value.questions;
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
};
const duplicateQuestion = (i) => {
    const q = form.value.questions[i];
    form.value.questions.splice(i + 1, 0, { ...q, key: ++questionKey, options: [...q.options] });
};
// what is wrong with one question, or '' when it is fine
const qProblem = (q) => {
    if (!q.prompt.trim()) return 'Write the question.';
    if ((q.type === 'radio' || q.type === 'checkbox') && q.options.map(o => o.trim()).filter(Boolean).length < 2) return 'Give at least two choices.';
    return '';
};
const questionProblems = computed(() => {
    if (!form.value.questions.length) return ['Add at least one question.'];
    return form.value.questions.map((q, i) => (qProblem(q) ? `Question ${i + 1}: ${qProblem(q)}` : '')).filter(Boolean);
});
// What the create button checks: marks the problem in formError and returns false, or true when the form is fine.
const validateForm = () => {
    formError.value = '';
    if (!form.value.question.trim()) {
        formError.value = 'A title is required.';
        showErrors.value = true;
        return false;
    }
    if (questionProblems.value.length) {
        formError.value = questionProblems.value[0];
        showErrors.value = true;
        return false;
    }
    return true;
};

// Creating goes step by step: a step opens only once every step before it is complete.
const page = ref('about');
const ORDER = ['about', 'questions', 'schedule', 'review'];
const stepDone = (key) => {
    if (key === 'about') return !!form.value.question.trim();
    if (key === 'questions') return questionProblems.value.length === 0;
    return true;
};
const isOpen = (key) => ORDER.slice(0, ORDER.indexOf(key)).every(stepDone);
const pages = computed(() => [
    { key: 'about', open: isOpen('about'), icon: 'bi-card-heading', label: 'about', state: showErrors.value && !form.value.question.trim() ? 'bad' : (stepDone('about') ? 'ok' : '') },
    { key: 'questions', open: isOpen('questions'), icon: 'bi-ui-checks', label: 'questions', count: form.value.questions.length, state: showErrors.value && questionProblems.value.length ? 'bad' : '' },
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
    about: { icon: 'bi-card-heading', bg: '#E5EEFC', fg: '#204888', title: 'About the survey', hint: 'A title, and why you are asking.' },
    questions: { icon: 'bi-ui-checks', bg: '#E4F6EA', fg: '#1C8A3B', title: 'The questions', hint: 'Add questions and choose how each is answered.' },
    schedule: { icon: 'bi-calendar-event', bg: '#FFF1D6', fg: '#9A6B00', title: 'When it ends', hint: 'An end date, or leave it open.' },
    review: { icon: 'bi-clipboard-check', bg: '#EDE7F6', fg: '#5E35B1', title: 'Review it', hint: 'Check everything, then create it.' },
};
const current = computed(() => PAGE_INFO[page.value] || PAGE_INFO.about);
const checks = computed(() => [
    { key: 'title', page: 'about', required: true, ok: !!form.value.question.trim(), title: 'A title', detail: form.value.question.trim() || 'Say what the survey is about.' },
    { key: 'questions', page: 'questions', required: true, ok: questionProblems.value.length === 0, title: 'The questions', detail: questionProblems.value.length ? questionProblems.value[0] : `${form.value.questions.length} ready.` },
    { key: 'schedule', page: 'schedule', required: false, ok: !!form.value.expiresAt, title: 'An end date', detail: form.value.expiresAt ? moment(form.value.expiresAt, 'YYYY-MM-DD').format('MMMM DD, YYYY') : 'Optional. It stays open until closed.' },
]);
const reviewFacts = computed(() => [
    { label: 'Title', value: form.value.question.trim(), icon: 'bi-card-heading', tone: 'blue', page: 'about' },
    { label: 'Description', value: form.value.description.trim(), icon: 'bi-text-paragraph', tone: 'teal', page: 'about', wrap: true },
    { label: 'Questions', value: `${form.value.questions.length} (${form.value.questions.filter(q => q.required).length} required)`, icon: 'bi-ui-checks', tone: 'purple', page: 'questions' },
    { label: 'Ends', value: form.value.expiresAt ? moment(form.value.expiresAt, 'YYYY-MM-DD').format('MMMM DD, YYYY') : 'No end date', icon: 'bi-calendar-event', tone: 'amber', page: 'schedule' },
]);

const createPoll = async () => {
    if (!validateForm()) return;
    saving.value = true;
    try {
        await api.post('/poll', {
            question: form.value.question.trim(),
            description: form.value.description.trim(),
            expiresAt: form.value.expiresAt ? moment(form.value.expiresAt, 'YYYY-MM-DD').endOf('day').toISOString() : null,
            questions: form.value.questions.map(q => ({
                type: q.type,
                prompt: q.prompt.trim(),
                required: q.required,
                options: q.type === 'radio' || q.type === 'checkbox' ? q.options.map(o => o.trim()).filter(Boolean) : [],
            })),
        });
        createDialog.value = false;
        Toast.fire({ icon: 'success', html: '<div class="text-h6 text-bold text-uppercase">success!</div><div class="text-caption">Survey created and routed.</div>' });
        loadPolls();
    } catch (e) {
        formError.value = e.response?.data?.message || 'Unable to create the survey.';
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

// the pages of the detail dialog
const detailTab = ref('overview');
const activeDetailNav = computed(() => detailNavs.value.find(n => n.tab === detailTab.value));
const detailNavs = computed(() => [
    { tab: 'overview', label: 'overview', icon: 'bi-grid' },
    { tab: 'results', label: 'results', icon: 'bi-bar-chart', count: selected.value?.totalVotes || 0 },
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
            ? `Set the concerned office(s) to <b>${esc(names.join(', '))}</b>?`
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

// ---- the dialog's figures
const respTotal = computed(() => selected.value?.totalVotes || 0);
const statusText = computed(() => (selected.value?.status === 'open' && selected.value?.isExpired ? 'expired' : selected.value?.status || ''));
// the details in the panel next to Manage
const trailHeadline = computed(() => String(selected.value?.question || '').slice(0, 120));
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
        { label: 'Responses', value: String(respTotal.value), icon: 'bi-ui-checks' },
        { label: 'Questions', value: String(d.questions?.length || 0), icon: 'bi-list-check' },
    ];
});

const statusSub = computed(() => {
    const d = selected.value;
    if (!d) return '';
    if (d.status === 'closed') return 'closed by a supervisor';
    if (d.isExpired) return 'past its end date';
    return 'taking responses';
});
const lastRespLine = computed(() => {
    return respTotal.value ? 'across ' + (selected.value?.questions?.length || 0) + ' questions' : 'none yet';
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
        { label: 'First response', icon: 'bi-bar-chart', state: responded ? 'done' : (routed ? 'now' : '') },
        { label: d.isExpired && d.status === 'open' ? 'Expired' : 'Closed', icon: 'bi-lock', state: finished ? (d.isExpired && d.status === 'open' ? 'bad' : 'done') : '' },
    ];
});

// ---- manage: pick what to do, then do it
const manageType = ref(null);
const statusAction = computed(() => (selected.value?.status === 'open' && !selected.value?.isExpired ? 'close' : 'reopen'));
const MANAGE_META = {
    assign: { icon: 'bi-diagram-3', bg: '#EDE7F6', color: '#5E35B1', label: 'Assign offices', hint: 'Choose which offices handle it.' },
    close: { icon: 'bi-lock', bg: '#FBE6E8', color: '#B3121F', label: 'Close survey', hint: 'Stop taking responses.' },
    reopen: { icon: 'bi-unlock', bg: '#E4F6EA', color: '#1C8A3B', label: 'Reopen survey', hint: 'Take responses again.' },
};
const manageMeta = computed(() => MANAGE_META[manageType.value === 'status' ? statusAction.value : manageType.value] || null);
const manageTypes = computed(() => [
    { value: 'assign', ...MANAGE_META.assign },
    { value: 'status', ...MANAGE_META[statusAction.value] },
]);
const statusEffects = computed(() => (statusAction.value === 'close'
    ? [
        { icon: 'bi-lock', tone: 'red', title: 'It stops taking responses', text: 'Residents can still read it, but cannot add to it.' },
        { icon: 'bi-arrow-counterclockwise', tone: 'blue', title: 'You can reopen it', text: 'Reopening starts it again with no end date.' },
    ]
    : [
        { icon: 'bi-unlock', tone: 'teal', title: 'It takes responses again', text: selected.value?.isExpired ? 'Its end date has passed, so it reopens with no end date.' : 'Residents can add to it again.' },
        { icon: 'bi-clock-history', tone: 'amber', title: 'It counts as reopened', text: 'It is counted in the reopen rate on the overview.' },
    ]));

// ---- results: every question with what was chosen or typed
const expanded = ref({});
const questionResults = computed(() => (selected.value?.questions || []).map(q => {
    const top = Math.max(0, ...(q.options || []).map(o => o.votes || 0));
    const rows = (q.options || []).map(o => ({ id: o.id, label: o.label, votes: o.votes || 0, percent: o.percent || 0, leader: top > 0 && (o.votes || 0) === top }));
    const answers = q.answers || [];
    return { ...q, rows, answers, shown: expanded.value[q.id] ? answers : answers.slice(0, 5) };
}));
const resultFacts = computed(() => {
    const qs = selected.value?.questions || [];
    const total = respTotal.value;
    // how much of the survey a typical respondent answered: answers given over answers possible
    const given = qs.reduce((n, q) => n + (q.answered || 0), 0);
    const completion = total && qs.length ? Math.round((given / (total * qs.length)) * 100) : null;
    const required = qs.filter(q => q.required).length;
    return [
        { label: 'responses', value: total, icon: 'bi-people', tone: 'teal' },
        { label: 'questions', value: `${qs.length} (${required} required)`, icon: 'bi-ui-checks', tone: 'purple' },
        { label: 'answered, on average', value: completion != null ? completion + '%' : '—', icon: 'bi-check2-all', tone: 'blue' },
        { label: 'typed answers', value: qs.filter(q => q.type === 'short' || q.type === 'paragraph').reduce((n, q) => n + (q.answered || 0), 0), icon: 'bi-chat-left-text', tone: 'amber' },
    ];
});
const jumpTo = (id) => {
    document.getElementById('sq-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const openDetail = async (row) => {
    detailTab.value = 'overview';
    manageType.value = null;
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

// The line under "actions" in the detail dialog: what state this poll is in and what closing or
// reopening does to it.
const actionsHint = computed(() => {
    const d = selected.value;
    if (!d) return '';
    if (d.status === 'closed') return 'Closed — it takes no new votes. Reopen it to take votes again.';
    if (d.isExpired) return 'Expired — it stopped taking votes on its expiry date. Reopen it to take votes again (it will have no expiry date).';
    return 'Open — citizens can add votes until it is closed or expires.';
});

const toggleStatus = async (action) => {
    const result = await Swal.fire({
        title: 'Confirm',
        html: action === 'close'
            ? 'Close this poll? Citizens will no longer be able to vote.'
            : (selected.value?.isExpired
                ? 'Reopen this poll? Its expiry date has passed, so it will reopen with no expiry date and citizens will be able to vote again.'
                : 'Reopen this poll? Citizens will be able to vote again.'),
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

// the open dialog is kept current too, without sending it back to its first page or touching what is being typed
const reloadSelected = async () => {
    if (!detailDialog.value || !selected.value?.id) return;
    try {
        const response = await api.get(`/poll/${selected.value.id}`);
        selected.value = response.data.data;
    } catch (e) {
        console.error(e);
    }
};

// anyone's change (a new one, a response, closed, reopened, assigned) shows here without pressing refresh
useLiveRefresh(['poll'], () => Promise.all([loadPolls({ quiet: true }), reloadSelected()]));

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
.pp-tag { font-size: 10px; letter-spacing: .04em; }
</style>
