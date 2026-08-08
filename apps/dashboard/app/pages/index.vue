<script setup lang="ts">
import { computed } from 'vue'
import type {
  AnalyticsOverview,
  CommerceStatus,
  OnboardingFunnel,
  OrderSummary,
  PageSummary,
  PlanLimits,
  SeoAudit,
  Site,
} from '@platform/schemas'
import { Globe, Search, ShoppingBag, Sparkles, TrendingUp } from '@lucide/vue'

/**
 * Home — command centre.
 *
 * KPIs come from the analytics overview when events exist; otherwise the strip
 * states that clearly. Setup cards only appear for real gaps (no site, domain,
 * SEO score, commerce). First-sale hero only when there are no orders.
 * Soft-gate: no sites + incomplete funnel → prompt to /onboarding.
 */

const api = useApi()
const session = useSession()
const membership = useActiveMembership()
const assistantOpen = useAssistantOpen()
const activeSiteId = useActiveSiteId()

interface ActivityEntry {
  id: string
  name: string
  actor: { type: string; id: string | null; label?: string }
  resourceType: string | null
  createdAt: string
}

interface DomainRow {
  id: string
  hostname: string
  state: 'verified' | 'pending_verification'
}

const { data, pending, refresh } = await useAsyncData('home', async () => {
  const sites = await api.get<Site[]>('/api/v1/sites')
  const siteId = activeSiteId.value || sites[0]?.id || null

  const [usage, activity, pageLists, overview, orders, commerce, domains, seo, funnel] = await Promise.all([
    api.get<{ plan: string; limits: PlanLimits; usage: { sites: number; users: number } }>(
      '/api/v1/tenants/current/usage',
    ),
    api.get<ActivityEntry[]>('/api/v1/tenants/current/activity').catch(() => [] as ActivityEntry[]),
    Promise.all(sites.map((site) => api.get<PageSummary[]>(`/api/v1/sites/${site.id}/pages`))),
    api
      .get<AnalyticsOverview>('/api/v1/analytics/overview', { days: 7, ...(siteId ? { siteId } : {}) })
      .catch(() => null),
    api.get<OrderSummary[]>('/api/v1/commerce/orders', { limit: 20 }).catch(() => [] as OrderSummary[]),
    api.get<CommerceStatus>('/api/v1/commerce/status').catch(() => null),
    api
      .get<{ domains: DomainRow[]; limits: { domains: number } }>('/api/v1/settings/domains')
      .catch(() => ({ domains: [] as DomainRow[], limits: { domains: 0 } })),
    siteId
      ? api.get<SeoAudit>(`/api/v1/seo/sites/${siteId}/audit`).catch(() => null)
      : Promise.resolve(null),
    api.get<OnboardingFunnel>('/api/v1/onboarding/progress').catch(() => null),
  ])

  return {
    sites,
    usage,
    activity,
    pages: pageLists.flat(),
    overview,
    orders,
    commerce,
    domains: domains.domains,
    seo,
    funnel,
  }
})

const pages = computed(() => data.value?.pages ?? [])
const published = computed(() => pages.value.filter((page) => page.status === 'published'))
const needsPublishing = computed(() => pages.value.filter((page) => page.hasUnpublishedChanges))
const orders = computed(() => data.value?.orders ?? [])
const hasOrders = computed(() => orders.value.length > 0)
const overview = computed(() => data.value?.overview ?? null)

/** Soft-gate: empty workspace that has not finished the signup funnel. */
const showOnboardingGate = computed(() => {
  const sites = data.value?.sites ?? []
  if (sites.length > 0) return false
  const funnel = data.value?.funnel
  if (!funnel) return true
  return funnel.step !== 'complete'
})


const noTraffic = computed(() => {
  const metrics = overview.value?.metrics
  if (!metrics) return true
  return (
    metrics.sessions.current === 0 &&
    metrics.visitors.current === 0 &&
    (overview.value?.eventCounts.length ?? 0) === 0
  )
})

interface SetupCard {
  id: string
  title: string
  description: string
  to: string
  cta: string
  icon: typeof Sparkles
  tone: 'brand' | 'warning' | 'neutral'
}

const setupCards = computed((): SetupCard[] => {
  const cards: SetupCard[] = []
  const sites = data.value?.sites ?? []

  if (!sites.length) {
    cards.push({
      id: 'onboarding',
      title: showOnboardingGate.value ? 'Continue onboarding' : 'Build your website',
      description: showOnboardingGate.value
        ? 'Pick Website, Store or Both — then connect a business and generate.'
        : 'Start onboarding — AI drafts pages from your business.',
      to: '/onboarding',
      cta: 'Get started',
      icon: Sparkles,
      tone: 'brand',
    })
  }

  const domains = data.value?.domains ?? []
  const verified = domains.some((domain) => domain.state === 'verified')
  if (sites.length && !verified) {
    cards.push({
      id: 'domains',
      title: 'Connect a domain',
      description: domains.length
        ? 'Finish DNS so your site is reachable on your own hostname.'
        : 'Sites stay on preview URLs until a domain is connected.',
      to: '/settings/domains',
      cta: 'Open domains',
      icon: Globe,
      tone: 'warning',
    })
  }

  const seo = data.value?.seo
  if (sites.length && seo && (seo.issueCounts.critical > 0 || seo.score < 70)) {
    cards.push({
      id: 'seo',
      title: 'Improve SEO',
      description: `Score ${seo.score}/100 · ${seo.issueCounts.critical} critical issue${seo.issueCounts.critical === 1 ? '' : 's'}.`,
      to: '/growth/seo',
      cta: 'Review SEO',
      icon: TrendingUp,
      tone: seo.issueCounts.critical > 0 ? 'warning' : 'neutral',
    })
  } else if (sites.length && !seo) {
    cards.push({
      id: 'seo',
      title: 'Run an SEO audit',
      description: 'Check titles, headings and indexability for this site.',
      to: '/growth/seo',
      cta: 'Open SEO',
      icon: TrendingUp,
      tone: 'neutral',
    })
  }

  const commerce = data.value?.commerce
  const paymentsReady = commerce?.payments.some((provider) => provider.configured) ?? false
  if (!hasOrders.value && (!paymentsReady || !commerce?.commerce.configured)) {
    cards.push({
      id: 'commerce',
      title: 'Set up commerce',
      description: paymentsReady
        ? 'Add a product and take your first payment.'
        : 'Connect payments so checkout can accept orders.',
      to: paymentsReady ? '/commerce/products/new' : '/commerce/settings',
      cta: paymentsReady ? 'Add a product' : 'Commerce settings',
      icon: ShoppingBag,
      tone: 'brand',
    })
  }

  return cards.slice(0, 4)
})

const EVENT_LABELS: Record<string, string> = {
  'user.registered': 'Account created',
  'tenant.created': 'Workspace created',
  'site.created': 'Website created',
  'site.updated': 'Website settings changed',
  'page.created': 'Page created',
  'page.updated': 'Page edited',
  'page.published': 'Page published',
  'page.unpublished': 'Page unpublished',
  'page.deleted': 'Page deleted',
}

function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  return `${Math.floor(seconds / 86400)} d ago`
}

function openAssistant() {
  assistantOpen.value = true
}
</script>

<template>
  <div>
    <UiPageHeader
      :title="`Hello, ${session?.user.name?.split(' ')[0] ?? 'there'}`"
      :description="membership ? `${membership.tenantName} · ${membership.plan} plan` : ''"
    >
      <template #actions>
        <UiButton size="sm" :loading="pending" @click="refresh()">Refresh</UiButton>
        <UiButton size="sm" to="/analytics/live">Live View</UiButton>
        <UiButton size="sm" variant="primary" to="/sites">Open websites</UiButton>
      </template>
    </UiPageHeader>

    <!-- Soft-gate: finish onboarding when the workspace has no sites yet ---- -->
    <div
      v-if="showOnboardingGate"
      class="mb-6 flex flex-col gap-3 rounded-xl border border-brand/25 bg-brand/5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <div class="min-w-0">
        <p class="text-[0.875rem] font-semibold text-ink">Finish setting up your workspace</p>
        <p class="mt-0.5 text-[0.8125rem] leading-relaxed text-soft">
          You do not have a website yet. Continue onboarding to connect a business and generate pages.
        </p>
      </div>
      <UiButton size="sm" variant="primary" class="shrink-0" to="/onboarding" arrow>Continue onboarding</UiButton>
    </div>

    <!-- Ask anything ------------------------------------------------------- -->
    <button
      type="button"
      class="group mb-6 flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3.5 text-left shadow-sm backdrop-blur-md transition-shadow hover:shadow-md"
      @click="openAssistant"
    >
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black/5 text-soft group-hover:text-ink">
        <Search class="h-4 w-4" :stroke-width="1.75" aria-hidden="true" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-medium text-ink">Ask anything</span>
        <span class="block truncate text-[0.8125rem] text-faint">
          Open the assistant — draft a page, fix SEO, or set up checkout.
        </span>
      </span>
      <kbd
        class="hidden shrink-0 rounded-md border border-black/10 bg-white/80 px-2 py-1 text-[0.6875rem] font-medium text-faint sm:inline"
      >
        Ask AI
      </kbd>
    </button>

    <!-- First-sale / get-started hero -------------------------------------- -->
    <UiCard v-if="!hasOrders" class="mb-6 overflow-hidden !p-0">
      <div class="relative px-5 py-6 sm:px-7 sm:py-8">
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--brand)_18%,transparent),transparent_55%)]"
          aria-hidden="true"
        />
        <div class="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="max-w-lg">
            <UiBadge tone="brand">First sale</UiBadge>
            <h2 class="mt-2 text-[1.25rem] font-semibold tracking-[-0.02em] text-ink">
              Get ready for your first order
            </h2>
            <p class="mt-1.5 text-sm text-soft">
              Add a product, connect payments, and publish a page — then watch Live View as traffic arrives.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UiButton size="sm" variant="primary" to="/commerce/products/new" arrow>Add a product</UiButton>
            <UiButton size="sm" to="/commerce/settings">Commerce settings</UiButton>
            <UiButton size="sm" to="/onboarding">Onboarding</UiButton>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- Shopify-style analytics widget ------------------------------------ -->
    <section v-if="overview" class="mt-6">
      <HomeAnalyticsWidget :overview="overview" />
      <p v-if="noTraffic" class="mt-3 text-[0.8125rem] text-faint">
        No sessions in the last 7 days yet.
        <NuxtLink to="/analytics/tracking" class="text-brand no-underline hover:underline">Check tracking</NuxtLink>
        or open
        <NuxtLink to="/analytics/live" class="text-brand no-underline hover:underline">Live View</NuxtLink>.
      </p>
    </section>
    <template v-else>
      <p class="mt-3 text-[0.8125rem] text-faint">
        KPIs fill from first-party events.
        <NuxtLink to="/analytics/tracking" class="text-brand no-underline hover:underline">Check tracking</NuxtLink>
        or open
        <NuxtLink to="/analytics/live" class="text-brand no-underline hover:underline">Live View</NuxtLink>.
      </p>
      <!-- Compact KPI fallback when overview failed to load -->
      <section class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UiStat
          label="Websites"
          :value="data?.sites.length ?? 0"
          :hint="
            data
              ? `${data.usage.limits.sites === Number.MAX_SAFE_INTEGER ? 'unlimited' : data.usage.limits.sites} included`
              : ''
          "
        />
        <UiStat
          label="Published pages"
          :value="published.length"
          :hint="needsPublishing.length ? `${needsPublishing.length} awaiting publish` : 'Everything is live'"
        />
        <UiStat label="Orders" :value="orders.length" hint="Commerce" />
        <UiStat label="Live View" value="→" hint="Open presence map" />
      </section>
    </template>

    <!-- Live globe (website + ecommerce) ---------------------------------- -->
    <section class="mt-6">
      <ClientOnly>
        <HomeLiveGlobe />
        <template #fallback>
          <UiCard :padded="false" class="overflow-hidden !p-0">
            <div class="px-4 py-5 sm:px-5">
              <h2 class="text-heading font-semibold text-ink">Live worldwide</h2>
              <p class="mt-0.5 text-[0.8125rem] text-soft">Loading live presence…</p>
              <div class="mt-4 grid grid-cols-2 gap-2 sm:max-w-sm">
                <div class="rounded-xl border border-line px-3 py-2">
                  <p class="text-[0.6875rem] uppercase tracking-wide text-faint">Website</p>
                  <p class="mt-1 text-lg font-semibold tabular-nums text-ink">—</p>
                </div>
                <div class="rounded-xl border border-line px-3 py-2">
                  <p class="text-[0.6875rem] uppercase tracking-wide text-faint">Ecommerce</p>
                  <p class="mt-1 text-lg font-semibold tabular-nums text-ink">—</p>
                </div>
              </div>
            </div>
          </UiCard>
        </template>
      </ClientOnly>
    </section>

    <!-- Setup bento -------------------------------------------------------- -->
    <section v-if="setupCards.length" class="mt-8">
      <h2 class="mb-3 text-heading font-semibold text-ink">Finish setup</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <NuxtLink
          v-for="card in setupCards"
          :key="card.id"
          :to="card.to"
          class="flex flex-col rounded-card border border-line bg-raised p-5 shadow-card no-underline transition-colors hover:border-line-strong"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="grid h-9 w-9 place-items-center rounded-lg bg-sunken text-soft">
              <component :is="card.icon" class="h-4 w-4" :stroke-width="1.75" aria-hidden="true" />
            </span>
            <UiBadge :tone="card.tone">Setup</UiBadge>
          </div>
          <p class="mt-4 text-sm font-semibold text-ink">{{ card.title }}</p>
          <p class="mt-1 flex-1 text-[0.8125rem] text-soft">{{ card.description }}</p>
          <p class="mt-4 text-[0.8125rem] font-semibold text-brand">{{ card.cta }} →</p>
        </NuxtLink>
      </div>
    </section>

    <div class="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <section>
        <h2 class="mb-3 text-heading font-semibold text-ink">Needs your attention</h2>

        <UiEmptyState
          v-if="!needsPublishing.length"
          title="Nothing waiting"
          description="Every page you have edited is published."
        />
        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="page in needsPublishing"
            :key="page.id"
            class="flex items-center justify-between gap-4 rounded-card border border-line bg-raised px-4 py-3"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-ink">{{ page.title }}</p>
              <p class="truncate text-[0.8125rem] text-faint">{{ page.path }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <UiBadge :tone="page.status === 'published' ? 'warning' : 'neutral'">
                {{ page.status === 'published' ? 'Edited' : 'Draft' }}
              </UiBadge>
              <UiButton size="sm" :to="`/pages/${page.id}`">Open</UiButton>
            </div>
          </li>
        </ul>
      </section>

      <section>
        <h2 class="mb-3 text-heading font-semibold text-ink">Recent activity</h2>

        <UiCard v-if="data?.activity.length" :padded="false">
          <ul class="divide-y divide-line">
            <li v-for="entry in data.activity.slice(0, 8)" :key="entry.id" class="px-4 py-3">
              <p class="text-[0.875rem] text-ink">{{ EVENT_LABELS[entry.name] ?? entry.name }}</p>
              <p class="mt-0.5 text-[0.75rem] text-faint">
                {{ entry.actor.label ?? entry.actor.type }} · {{ relativeTime(entry.createdAt) }}
              </p>
            </li>
          </ul>
        </UiCard>
        <UiEmptyState v-else title="No activity yet" description="Changes you make will be logged here." />
      </section>
    </div>
  </div>
</template>
