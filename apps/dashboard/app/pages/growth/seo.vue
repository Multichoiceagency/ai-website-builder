<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  SeoAudit,
  SeoIssue,
  SeoKeyword,
  SeoNetworkStatus,
  SeoProviderStatus,
  SeoSeverity,
} from '@platform/schemas'

/**
 * The SEO module (§15).
 *
 * Everything on this page comes from the platform's own data: the audit reads
 * the stored page documents, the sitemap and robots preview are generated from
 * published pages. The keyword table is the one place that would need an
 * outside data source, and it says so instead of showing invented positions.
 */

const api = useApi()
const can = useCan()
const config = useRuntimeConfig()
const activeSiteId = useActiveSiteId()
const activeTenantId = useActiveTenantId()

const SEVERITIES: { key: SeoSeverity; label: string; tone: 'danger' | 'warning' | 'neutral' }[] = [
  { key: 'critical', label: 'Critical', tone: 'danger' },
  { key: 'warning', label: 'Warnings', tone: 'warning' },
  { key: 'info', label: 'Suggestions', tone: 'neutral' },
]

const { data: audit, pending, refresh } = await useAsyncData(
  () => `seo:audit:${activeSiteId.value}`,
  () =>
    activeSiteId.value
      ? api.get<SeoAudit>(`/api/v1/seo/sites/${activeSiteId.value}/audit`)
      : Promise.resolve(null),
  { watch: [activeSiteId], default: () => null },
)

const { data: keywordData, refresh: refreshKeywords } = await useAsyncData(
  () => `seo:keywords:${activeSiteId.value}`,
  () =>
    activeSiteId.value
      ? api.get<{ keywords: SeoKeyword[]; provider: SeoProviderStatus }>(
          `/api/v1/seo/sites/${activeSiteId.value}/keywords`,
        )
      : Promise.resolve(null),
  { watch: [activeSiteId], default: () => null },
)

/**
 * The sitemap and robots endpoints answer with XML and plain text rather than
 * the JSON envelope, so they bypass `useApi` deliberately.
 */
async function fetchText(path: string): Promise<string> {
  return $fetch<string>(`${config.public.coreApiUrl}${path}`, {
    headers: activeTenantId.value ? { 'x-tenant-id': activeTenantId.value } : {},
    credentials: 'include',
    responseType: 'text',
  })
}

const { data: files, refresh: refreshFiles } = await useAsyncData(
  () => `seo:files:${activeSiteId.value}`,
  async () => {
    if (!activeSiteId.value) return null
    const [sitemap, robots] = await Promise.all([
      fetchText(`/api/v1/seo/sites/${activeSiteId.value}/sitemap.xml`),
      fetchText(`/api/v1/seo/sites/${activeSiteId.value}/robots.txt`),
    ])
    return { sitemap, robots }
  },
  { watch: [activeSiteId], default: () => null },
)

const { data: network, pending: networkPending, refresh: refreshNetwork } = await useAsyncData(
  () => `seo:network:${activeSiteId.value}`,
  () =>
    activeSiteId.value
      ? api.get<SeoNetworkStatus>(`/api/v1/seo/sites/${activeSiteId.value}/network`)
      : Promise.resolve(null),
  { watch: [activeSiteId], default: () => null },
)

const networkSyncBusy = ref(false)
const networkError = ref('')
const networkNicheDraft = ref('')

watch(
  network,
  (next) => {
    networkNicheDraft.value = next?.niche ?? ''
  },
  { immediate: true },
)

async function syncNetwork() {
  if (!activeSiteId.value || !can('seo:write')) return
  networkSyncBusy.value = true
  networkError.value = ''
  try {
    if (networkNicheDraft.value !== (network.value?.niche ?? '')) {
      await api.put(`/api/v1/seo/sites/${activeSiteId.value}/settings`, {
        networkNiche: networkNicheDraft.value.trim(),
      })
    }
    await api.post(`/api/v1/seo/sites/${activeSiteId.value}/network/sync`, {})
    await refreshNetwork()
  } catch (caught) {
    networkError.value =
      caught instanceof ApiError ? caught.message : 'Could not sync the partner network.'
  } finally {
    networkSyncBusy.value = false
  }
}

async function setNetworkEnabled(enabled: boolean) {
  if (!activeSiteId.value || !can('seo:write')) return
  networkError.value = ''
  try {
    await api.put(`/api/v1/seo/sites/${activeSiteId.value}/settings`, {
      networkEnabled: enabled,
    })
    await refreshNetwork()
  } catch (caught) {
    networkError.value =
      caught instanceof ApiError ? caught.message : 'Could not update network settings.'
  }
}

const running = ref(false)
const pageSpeedBusy = ref(false)
const pageSpeedUrl = ref('')
const pageSpeedResult = ref<{
  performanceScore: number | null
  seoScore: number | null
  lcpMs: number | null
  warnings: string[]
  url: string
} | null>(null)
const pageSpeedError = ref('')

const gscBusy = ref(false)
const gscRows = ref<{ key: string; clicks: number; impressions: number; position: number }[]>([])
const gscError = ref('')
const gscSiteUrl = ref('')

async function runPageSpeedCheck() {
  if (!activeSiteId.value) return
  pageSpeedBusy.value = true
  pageSpeedError.value = ''
  try {
    const result = await api.post<{
      performanceScore: number | null
      seoScore: number | null
      lcpMs: number | null
      warnings: string[]
      url: string
    }>(`/api/v1/seo/sites/${activeSiteId.value}/pagespeed`, {
      url: pageSpeedUrl.value.trim() || undefined,
      strategy: 'mobile',
    })
    pageSpeedResult.value = result
  } catch (caught) {
    pageSpeedError.value = caught instanceof ApiError ? caught.message : 'PageSpeed failed.'
  } finally {
    pageSpeedBusy.value = false
  }
}

async function loadGsc() {
  if (!activeSiteId.value) return
  gscBusy.value = true
  gscError.value = ''
  try {
    const sites = await api.get<{ sites: { siteUrl: string }[] }>(
      `/api/v1/seo/sites/${activeSiteId.value}/search-console/sites`,
    )
    const siteUrl = gscSiteUrl.value || sites.sites[0]?.siteUrl
    if (!siteUrl) {
      gscError.value = 'No Search Console properties on this Google account.'
      return
    }
    gscSiteUrl.value = siteUrl
    const performance = await api.get<{
      rows: { key: string; clicks: number; impressions: number; position: number }[]
    }>(`/api/v1/seo/sites/${activeSiteId.value}/search-console/performance`, {
      siteUrl,
      days: 28,
      dimension: 'query',
      limit: 10,
    })
    gscRows.value = performance.rows
  } catch (caught) {
    gscError.value = caught instanceof ApiError ? caught.message : 'Search Console failed.'
  } finally {
    gscBusy.value = false
  }
}
const activeSeverity = ref<SeoSeverity>('critical')
const activeFile = ref<'sitemap' | 'robots'>('sitemap')
const newKeyword = ref('')
const keywordError = ref('')
const savingKeyword = ref(false)

/** Every finding, with the page it belongs to attached for display. */
interface DisplayIssue extends SeoIssue {
  pageTitle: string
}

const issues = computed<DisplayIssue[]>(() => {
  if (!audit.value) return []

  const siteWide = audit.value.siteIssues.map((issue) => ({ ...issue, pageTitle: 'Whole site' }))
  const perPage = audit.value.pages.flatMap((page) =>
    page.issues.map((issue) => ({ ...issue, pageTitle: page.title || page.path })),
  )
  return [...siteWide, ...perPage]
})

const issuesBySeverity = computed(() => ({
  critical: issues.value.filter((issue) => issue.severity === 'critical'),
  warning: issues.value.filter((issue) => issue.severity === 'warning'),
  info: issues.value.filter((issue) => issue.severity === 'info'),
}))

const worstPages = computed(() =>
  [...(audit.value?.pages ?? [])].sort((a, b) => a.score - b.score).slice(0, 6),
)

function scoreTone(score: number): 'positive' | 'warning' | 'danger' {
  if (score >= 80) return 'positive'
  if (score >= 55) return 'warning'
  return 'danger'
}

async function runAudit() {
  if (!activeSiteId.value) return
  running.value = true
  try {
    await api.post(`/api/v1/seo/sites/${activeSiteId.value}/audit`)
    await Promise.all([refresh(), refreshFiles()])
  } finally {
    running.value = false
  }
}

async function addKeyword() {
  const keyword = newKeyword.value.trim()
  if (!keyword || !activeSiteId.value) return

  keywordError.value = ''
  savingKeyword.value = true
  try {
    await api.post(`/api/v1/seo/sites/${activeSiteId.value}/keywords`, { keyword })
    newKeyword.value = ''
    await refreshKeywords()
  } catch (caught) {
    keywordError.value =
      caught instanceof ApiError ? caught.message : 'Could not save that keyword.'
  } finally {
    savingKeyword.value = false
  }
}

async function removeKeyword(id: string) {
  await api.del(`/api/v1/seo/keywords/${id}`)
  await refreshKeywords()
}

type ChecklistStatus = 'ready' | 'needs_work' | 'connect'

interface ChecklistRow {
  id: string
  label: string
  status: ChecklistStatus
  badge: string
  tone: 'positive' | 'warning' | 'neutral'
  href?: string
  hint?: string
}

const TITLE_META_CODE = /title|meta|description/i

const launchChecklist = computed<ChecklistRow[]>(() => {
  const keywordsOk = (keywordData.value?.keywords.length ?? 0) > 0
  const titleMetaCritical = issues.value.some(
    (issue) => issue.severity === 'critical' && TITLE_META_CODE.test(issue.code),
  )
  const sitemapOk = Boolean(files.value?.sitemap?.trim())
  const robotsOk = Boolean(files.value?.robots?.trim())

  const firstPage = audit.value?.pages[0]
  let schema: ChecklistRow
  if (!firstPage) {
    schema = {
      id: 'schema',
      label: 'Schema',
      status: 'needs_work',
      badge: 'Needs work',
      tone: 'warning',
      hint: 'Run audit / open page editor for schema',
    }
  } else {
    const schemaIssues = firstPage.issues.filter((issue) => /schema/i.test(issue.code))
    schema = {
      id: 'schema',
      label: 'Schema',
      status: schemaIssues.length ? 'needs_work' : 'ready',
      badge: schemaIssues.length ? 'Needs work' : 'Ready',
      tone: schemaIssues.length ? 'warning' : 'positive',
      hint: schemaIssues.length
        ? schemaIssues[0]!.message
        : `${firstPage.title || firstPage.path}`,
    }
  }

  return [
    {
      id: 'keywords',
      label: 'Keywords',
      status: keywordsOk ? 'ready' : 'needs_work',
      badge: keywordsOk ? 'Ready' : 'Needs work',
      tone: keywordsOk ? 'positive' : 'warning',
    },
    {
      id: 'titles-meta',
      label: 'Titles / meta',
      status: titleMetaCritical ? 'needs_work' : 'ready',
      badge: titleMetaCritical ? 'Needs work' : 'Ready',
      tone: titleMetaCritical ? 'warning' : 'positive',
    },
    {
      id: 'sitemap',
      label: 'Sitemap',
      status: sitemapOk ? 'ready' : 'needs_work',
      badge: sitemapOk ? 'Ready' : 'Needs work',
      tone: sitemapOk ? 'positive' : 'warning',
    },
    {
      id: 'robots',
      label: 'Robots',
      status: robotsOk ? 'ready' : 'needs_work',
      badge: robotsOk ? 'Ready' : 'Needs work',
      tone: robotsOk ? 'positive' : 'warning',
    },
    {
      id: 'gsc',
      label: 'Google Search Console',
      status: 'connect',
      badge: 'Connect',
      tone: 'neutral',
      href: '/settings',
      hint: 'Check connection',
    },
    {
      id: 'gbp',
      label: 'Google Business Profile',
      status: 'connect',
      badge: 'Connect',
      tone: 'neutral',
      href: '/growth/google-business',
      hint: 'Check connection',
    },
    schema,
  ]
})
</script>

<template>
  <div>
    <UiPageHeader
      title="SEO"
      description="What search engines will make of this website, measured on the pages you actually have."
    >
      <template #actions>
        <UiButton
          v-if="can('seo:write') && activeSiteId"
          size="sm"
          variant="primary"
          :loading="running"
          @click="runAudit"
        >
          Run audit
        </UiButton>
      </template>
    </UiPageHeader>

    <UiEmptyState
      v-if="!activeSiteId"
      title="No website selected"
      description="Create a website first — there is nothing to audit yet."
    >
      <UiButton variant="primary" to="/website/new?mode=ai">Make website with AI</UiButton>
    </UiEmptyState>

    <div v-else-if="pending && !audit" class="py-16 text-center text-sm text-soft">Auditing your pages…</div>

    <div v-else-if="audit" class="flex flex-col gap-5">
      <!-- Score and volume -->
      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UiStat
          label="Site score"
          :value="audit.score"
          :hint="`${audit.pageCount} page(s), ${audit.publishedCount} published`"
        />
        <UiStat label="Critical" :value="audit.issueCounts.critical" hint="Fix before publishing" />
        <UiStat label="Warnings" :value="audit.issueCounts.warning" hint="Costs you rankings" />
        <UiStat label="Suggestions" :value="audit.issueCounts.info" hint="Worth doing eventually" />
      </section>

      <!-- Launch checklist — derived from audit, keywords and generated files -->
      <UiCard>
        <h2 class="mb-4 text-heading font-semibold text-ink">Launch checklist</h2>
        <ul class="flex flex-col gap-2">
          <li
            v-for="row in launchChecklist"
            :key="row.id"
            class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-ink">{{ row.label }}</p>
              <p v-if="row.hint" class="mt-0.5 text-[0.8125rem] text-soft">{{ row.hint }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UiBadge :tone="row.tone">{{ row.badge }}</UiBadge>
              <NuxtLink
                v-if="row.href"
                :to="row.href"
                class="text-[0.8125rem] text-soft no-underline hover:text-ink hover:underline"
              >
                Open
              </NuxtLink>
            </div>
          </li>
        </ul>
      </UiCard>

      <section class="grid gap-5 lg:grid-cols-2">
        <UiCard>
          <h2 class="mb-3 text-heading font-semibold text-ink">PageSpeed QA</h2>
          <p class="mb-3 type-caption-12 text-soft">
            Runs Google PageSpeed Insights on a public URL (needs GOOGLE_API_KEY).
          </p>
          <UiField label="Public URL (optional)">
            <template #default="{ id }">
              <UiInput :id="id" v-model="pageSpeedUrl" placeholder="https://example.com" />
            </template>
          </UiField>
          <div class="mt-3 flex flex-wrap gap-2">
            <UiButton size="sm" :loading="pageSpeedBusy" @click="runPageSpeedCheck">Run PageSpeed</UiButton>
          </div>
          <p v-if="pageSpeedError" class="mt-3 type-caption-12 text-danger" role="alert">{{ pageSpeedError }}</p>
          <ul v-if="pageSpeedResult" class="mt-4 space-y-1 type-caption-12 text-soft">
            <li>URL: {{ pageSpeedResult.url }}</li>
            <li>Performance: {{ pageSpeedResult.performanceScore ?? '—' }}</li>
            <li>SEO: {{ pageSpeedResult.seoScore ?? '—' }}</li>
            <li>LCP: {{ pageSpeedResult.lcpMs != null ? `${Math.round(pageSpeedResult.lcpMs)} ms` : '—' }}</li>
          </ul>
        </UiCard>

        <UiCard>
          <h2 class="mb-3 text-heading font-semibold text-ink">Search Console</h2>
          <p class="mb-3 type-caption-12 text-soft">
            Top queries from the Google account connected under Integrations.
          </p>
          <UiButton size="sm" :loading="gscBusy" @click="loadGsc">Load performance</UiButton>
          <p v-if="gscError" class="mt-3 type-caption-12 text-danger" role="alert">{{ gscError }}</p>
          <p v-else-if="gscSiteUrl" class="mt-3 type-caption-12 text-faint">{{ gscSiteUrl }}</p>
          <ul v-if="gscRows.length" class="mt-3 space-y-2">
            <li
              v-for="row in gscRows"
              :key="row.key"
              class="flex justify-between gap-2 border-b border-line py-2 type-caption-12 last:border-0"
            >
              <span class="truncate text-ink">{{ row.key }}</span>
              <span class="shrink-0 text-soft">{{ row.clicks }} clk · pos {{ row.position.toFixed(1) }}</span>
            </li>
          </ul>
        </UiCard>

        <UiCard>
          <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-heading font-semibold text-ink">Partner backlink network</h2>
              <p class="mt-1 type-caption-12 text-soft">
                Online platform sites automatically exchange branded partner links
                (claude-seo quality: capped degree, reciprocal where possible).
              </p>
            </div>
            <UiBadge :tone="network?.active ? 'positive' : 'warning'">
              {{ network?.active ? 'Live' : 'Not linked' }}
            </UiBadge>
          </div>

          <p v-if="networkPending" class="type-caption-12 text-faint">Loading network…</p>
          <template v-else-if="network">
            <ul v-if="network.reasons.length" class="mb-3 space-y-1">
              <li
                v-for="reason in network.reasons"
                :key="reason"
                class="type-caption-12 text-warning"
              >
                {{ reason }}
              </li>
            </ul>

            <div class="mb-3 flex flex-wrap items-center gap-2">
              <UiButton
                size="sm"
                variant="ghost"
                :disabled="!can('seo:write')"
                @click="setNetworkEnabled(!network.networkEnabled)"
              >
                {{ network.networkEnabled ? 'Opt out' : 'Opt in' }}
              </UiButton>
              <UiButton
                size="sm"
                :loading="networkSyncBusy"
                :disabled="!can('seo:write')"
                @click="syncNetwork"
              >Sync now</UiButton>
              <span class="type-caption-12 text-faint">
                {{ network.memberCount }} online ·
                {{ network.outbound.length }} out ·
                {{ network.inbound.length }} in
              </span>
            </div>

            <label class="mb-3 block">
              <span class="type-caption-12 text-soft">Niche (matching)</span>
              <input
                v-model="networkNicheDraft"
                type="text"
                maxlength="80"
                class="mt-1 w-full rounded-lg border border-line bg-raised px-3 py-2 type-caption-12 text-ink"
                placeholder="e.g. dental, saas, agency"
                :disabled="!can('seo:write')"
              >
            </label>

            <p v-if="networkError" class="mb-3 type-caption-12 text-danger" role="alert">{{ networkError }}</p>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <p class="mb-2 type-caption-12 font-medium text-ink">You link to</p>
                <ul v-if="network.outbound.length" class="space-y-1">
                  <li
                    v-for="link in network.outbound"
                    :key="link.siteId"
                    class="truncate type-caption-12 text-soft"
                  >
                    <a :href="link.origin" class="text-ink hover:underline" target="_blank" rel="noopener">
                      {{ link.anchor }}
                    </a>
                  </li>
                </ul>
                <p v-else class="type-caption-12 text-faint">No outbound partners yet.</p>
              </div>
              <div>
                <p class="mb-2 type-caption-12 font-medium text-ink">Linking to you</p>
                <ul v-if="network.inbound.length" class="space-y-1">
                  <li
                    v-for="link in network.inbound"
                    :key="link.siteId"
                    class="truncate type-caption-12 text-soft"
                  >
                    <a :href="link.origin" class="text-ink hover:underline" target="_blank" rel="noopener">
                      {{ link.title }}
                    </a>
                  </li>
                </ul>
                <p v-else class="type-caption-12 text-faint">No inbound partners yet.</p>
              </div>
            </div>
          </template>
        </UiCard>
      </section>

      <!-- Issues, grouped by severity -->
      <UiCard>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-heading font-semibold text-ink">Issues</h2>
          <div class="flex gap-1 rounded-lg bg-sunken p-1">
            <button
              v-for="severity in SEVERITIES"
              :key="severity.key"
              type="button"
              class="rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors"
              :class="
                activeSeverity === severity.key
                  ? 'bg-raised text-ink shadow-card'
                  : 'text-soft hover:text-ink'
              "
              @click="activeSeverity = severity.key"
            >
              {{ severity.label }}
              <span class="tabular-nums text-faint">{{ issuesBySeverity[severity.key].length }}</span>
            </button>
          </div>
        </div>

        <ul v-if="issuesBySeverity[activeSeverity].length" class="flex flex-col gap-2">
          <li
            v-for="(issue, index) in issuesBySeverity[activeSeverity]"
            :key="`${issue.code}-${issue.pageId}-${index}`"
            class="rounded-lg border border-line p-4"
          >
            <div class="flex flex-wrap items-center gap-2">
              <UiBadge :tone="SEVERITIES.find((s) => s.key === issue.severity)?.tone">
                {{ issue.code.replace(/_/g, ' ') }}
              </UiBadge>
              <NuxtLink
                v-if="issue.pageId"
                :to="`/pages/${issue.pageId}`"
                class="text-[0.8125rem] text-soft no-underline hover:text-ink hover:underline"
              >
                {{ issue.pageTitle }} <span class="text-faint">{{ issue.path }}</span>
              </NuxtLink>
              <span v-else class="text-[0.8125rem] text-soft">{{ issue.pageTitle }}</span>
            </div>
            <p class="mt-2 text-sm text-ink">{{ issue.message }}</p>
            <p class="mt-1 text-[0.8125rem] text-soft">{{ issue.fix }}</p>
          </li>
        </ul>

        <p v-else class="py-10 text-center text-sm text-soft">
          Nothing at this level. That is the good outcome.
        </p>
      </UiCard>

      <div class="grid gap-5 lg:grid-cols-2 lg:items-start">
        <!-- Weakest pages -->
        <UiCard>
          <h2 class="mb-4 text-heading font-semibold text-ink">Pages by score</h2>
          <ul v-if="worstPages.length" class="flex flex-col gap-2">
            <li
              v-for="page in worstPages"
              :key="page.pageId"
              class="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-3"
            >
              <div class="min-w-0">
                <NuxtLink
                  :to="`/pages/${page.pageId}`"
                  class="block truncate text-sm font-medium text-ink no-underline hover:underline"
                >
                  {{ page.title || page.path }}
                </NuxtLink>
                <p class="truncate text-[0.8125rem] text-faint">
                  {{ page.path }} · {{ page.wordCount }} words · {{ page.sectionCount }} sections
                </p>
              </div>
              <UiBadge :tone="scoreTone(page.score)">{{ page.score }}</UiBadge>
            </li>
          </ul>
          <p v-else class="py-10 text-center text-sm text-soft">This website has no pages yet.</p>
        </UiCard>

        <!-- Generated files -->
        <UiCard>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-heading font-semibold text-ink">Search engine files</h2>
            <div class="flex gap-1 rounded-lg bg-sunken p-1">
              <button
                v-for="file in (['sitemap', 'robots'] as const)"
                :key="file"
                type="button"
                class="rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors"
                :class="activeFile === file ? 'bg-raised text-ink shadow-card' : 'text-soft hover:text-ink'"
                @click="activeFile = file"
              >
                {{ file === 'sitemap' ? 'sitemap.xml' : 'robots.txt' }}
              </button>
            </div>
          </div>

          <pre
            v-if="files"
            class="max-h-72 overflow-auto rounded-lg border border-line bg-sunken p-4 text-[0.75rem] leading-relaxed text-soft"
          >{{ activeFile === 'sitemap' ? files.sitemap : files.robots }}</pre>
          <p v-else class="py-10 text-center text-sm text-soft">Could not generate these yet.</p>

          <p class="mt-3 text-[0.8125rem] text-faint">
            Generated from published pages only. Drafts and pages hidden from search never appear here.
          </p>
        </UiCard>
      </div>

      <!-- Keywords -->
      <UiCard>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-heading font-semibold text-ink">Keywords</h2>
            <p class="mt-0.5 text-[0.8125rem] text-soft">
              The terms this website is meant to be found for.
            </p>
          </div>
          <form v-if="can('seo:write')" class="flex items-end gap-2" @submit.prevent="addKeyword">
            <UiField v-slot="{ id }" label="Add a keyword">
              <UiInput :id="id" v-model="newKeyword" placeholder="loodgieter rotterdam" />
            </UiField>
            <UiButton type="submit" :loading="savingKeyword" :disabled="!newKeyword.trim()">Add</UiButton>
          </form>
        </div>

        <p v-if="keywordError" class="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
          {{ keywordError }}
        </p>

        <!--
          The honest empty state: keywords are stored, positions are not
          measured, and the reason comes from the API rather than from copy
          written here.
        -->
        <p
          v-if="keywordData && !keywordData.provider.provider"
          class="mb-4 rounded-lg border border-line bg-sunken px-4 py-3 text-[0.8125rem] text-soft"
        >
          <span class="font-medium text-ink">No rank data source connected.</span>
          {{ keywordData.provider.reason }}
        </p>

        <div v-if="keywordData?.keywords.length" class="overflow-x-auto">
          <table class="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr class="border-b border-line text-left">
                <th class="pb-2 text-label font-semibold uppercase text-faint">Keyword</th>
                <th class="pb-2 text-label font-semibold uppercase text-faint">Target page</th>
                <th class="pb-2 text-label font-semibold uppercase text-faint">Market</th>
                <th class="pb-2 text-label font-semibold uppercase text-faint">Position</th>
                <th class="pb-2" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="keyword in keywordData.keywords" :key="keyword.id" class="border-b border-line">
                <td class="py-3 font-medium text-ink">{{ keyword.keyword }}</td>
                <td class="py-3 text-soft">{{ keyword.targetPath ?? '—' }}</td>
                <td class="py-3 text-soft">{{ keyword.country }} · {{ keyword.locale }}</td>
                <td class="py-3 tabular-nums">
                  <span v-if="keyword.latestPosition" class="text-ink">{{ keyword.latestPosition.position }}</span>
                  <span v-else class="text-faint">Not tracked</span>
                </td>
                <td class="py-3 text-right">
                  <button
                    v-if="can('seo:write')"
                    type="button"
                    class="rounded px-2 text-faint hover:text-danger"
                    :aria-label="`Remove ${keyword.keyword}`"
                    @click="removeKeyword(keyword.id)"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-else class="py-10 text-center text-sm text-soft">
          No keywords yet. Add the terms a customer would actually type.
        </p>
      </UiCard>
    </div>
  </div>
</template>
