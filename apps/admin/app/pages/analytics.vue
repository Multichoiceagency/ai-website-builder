<script setup lang="ts">
const api = useAdminApi()
const range = ref(30)

interface Analytics {
  days: number
  stats: {
    tenants: number
    users: number
    sites: number
    pages: number
    publishedPages: number
    activeSessions: number
    eventsLast24h: number
    signupsLast7d: number
    staff: number
  }
  revenue: {
    currency: string
    mrr: number
    arr: number
    breakdown: { plan: string; tenants: number; priceEur: number; mrrEur: number }[]
    note: string
  }
  series: {
    signups: { day: string; count: number }[]
    tenants: { day: string; count: number }[]
    events: { day: string; count: number }[]
  }
  recentRegistrations: {
    id: string
    email: string
    name: string
    createdAt: string
    tenants: string
  }[]
}

const { data, pending, error, refresh } = await useAsyncData(
  'admin:analytics',
  () => api.get<Analytics>('/analytics', { days: range.value }),
  { watch: [range] },
)

function eur(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function barHeight(count: number, max: number): string {
  if (max <= 0) return '4%'
  return `${Math.max(6, Math.round((count / max) * 100))}%`
}

function seriesMax(points: { count: number }[] | undefined): number {
  return Math.max(1, ...(points ?? []).map((p) => p.count))
}

function shortDay(day: string): string {
  const date = new Date(`${day}T12:00:00Z`)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function relative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Analytics"
      description="MRR / ARR estimates, registrations, and platform activity."
    >
      <template #actions>
        <select
          v-model.number="range"
          class="h-9 rounded-md border border-line bg-raised px-2 text-[0.8125rem] text-ink"
          aria-label="Date range"
          @change="refresh()"
        >
          <option :value="7">Last 7 days</option>
          <option :value="30">Last 30 days</option>
          <option :value="90">Last 90 days</option>
        </select>
      </template>
    </UiPageHeader>

    <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      Could not load analytics. If this is a fresh deploy, wait for migrations then refresh.
    </p>

    <template v-if="data">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UiStat label="Est. MRR" :value="eur(data.revenue.mrr)" :hint="data.revenue.note" />
        <UiStat label="Est. ARR" :value="eur(data.revenue.arr)" hint="MRR × 12" />
        <UiStat
          label="Registered users"
          :value="data.stats.users"
          :hint="`${data.stats.signupsLast7d} in last 7 days`"
        />
        <UiStat
          label="Paying clients"
          :value="data.stats.tenants"
          :hint="`${data.stats.staff} staff accounts`"
        />
      </div>

      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UiStat label="Active sessions" :value="data.stats.activeSessions" />
        <UiStat label="Events (24h)" :value="data.stats.eventsLast24h" />
        <UiStat label="Websites" :value="data.stats.sites" />
        <UiStat
          label="Published pages"
          :value="data.stats.publishedPages"
          :hint="`of ${data.stats.pages}`"
        />
      </div>

      <div class="mt-7 grid gap-5 lg:grid-cols-2">
        <UiCard>
          <h2 class="mb-1 text-heading font-semibold text-ink">New registrations</h2>
          <p class="mb-4 text-[0.75rem] text-faint">Users created per day · last {{ data.days }} days</p>
          <div class="flex h-36 items-end gap-0.5">
            <div
              v-for="point in data.series.signups"
              :key="point.day"
              class="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
              :title="`${point.day}: ${point.count}`"
            >
              <div
                class="w-full rounded-t bg-brand/80 transition-colors group-hover:bg-brand"
                :style="{ height: barHeight(point.count, seriesMax(data.series.signups)) }"
              />
            </div>
          </div>
          <div class="mt-2 flex justify-between text-[0.6875rem] text-faint">
            <span>{{ shortDay(data.series.signups[0]?.day ?? '') }}</span>
            <span>{{ shortDay(data.series.signups.at(-1)?.day ?? '') }}</span>
          </div>
        </UiCard>

        <UiCard>
          <h2 class="mb-1 text-heading font-semibold text-ink">New clients</h2>
          <p class="mb-4 text-[0.75rem] text-faint">Workspaces created per day · last {{ data.days }} days</p>
          <div class="flex h-36 items-end gap-0.5">
            <div
              v-for="point in data.series.tenants"
              :key="point.day"
              class="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
              :title="`${point.day}: ${point.count}`"
            >
              <div
                class="w-full rounded-t bg-ink/70 transition-colors group-hover:bg-ink"
                :style="{ height: barHeight(point.count, seriesMax(data.series.tenants)) }"
              />
            </div>
          </div>
          <div class="mt-2 flex justify-between text-[0.6875rem] text-faint">
            <span>{{ shortDay(data.series.tenants[0]?.day ?? '') }}</span>
            <span>{{ shortDay(data.series.tenants.at(-1)?.day ?? '') }}</span>
          </div>
        </UiCard>

        <UiCard>
          <h2 class="mb-1 text-heading font-semibold text-ink">Platform activity</h2>
          <p class="mb-4 text-[0.75rem] text-faint">Audit events per day · last {{ data.days }} days</p>
          <div class="flex h-36 items-end gap-0.5">
            <div
              v-for="point in data.series.events"
              :key="point.day"
              class="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
              :title="`${point.day}: ${point.count}`"
            >
              <div
                class="w-full rounded-t bg-brand/50 transition-colors group-hover:bg-brand"
                :style="{ height: barHeight(point.count, seriesMax(data.series.events)) }"
              />
            </div>
          </div>
          <div class="mt-2 flex justify-between text-[0.6875rem] text-faint">
            <span>{{ shortDay(data.series.events[0]?.day ?? '') }}</span>
            <span>{{ shortDay(data.series.events.at(-1)?.day ?? '') }}</span>
          </div>
        </UiCard>

        <UiCard>
          <h2 class="mb-4 text-heading font-semibold text-ink">MRR by plan</h2>
          <ul class="space-y-2">
            <li
              v-for="row in data.revenue.breakdown"
              :key="row.plan"
              class="flex items-center justify-between gap-3 text-[0.8125rem]"
            >
              <span class="capitalize text-soft">{{ row.plan }} · {{ row.tenants }} clients</span>
              <span class="tabular-nums font-medium text-ink">{{ eur(row.mrrEur) }}</span>
            </li>
          </ul>
          <p v-if="!data.revenue.breakdown.length" class="text-[0.8125rem] text-faint">No clients yet.</p>
        </UiCard>
      </div>

      <UiCard class="mt-5" :padded="false">
        <div class="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 class="text-heading font-semibold text-ink">Latest registrations</h2>
          <UiButton to="/users" size="sm">All users</UiButton>
        </div>
        <ul v-if="data.recentRegistrations.length" class="divide-y divide-line">
          <li
            v-for="user in data.recentRegistrations"
            :key="user.id"
            class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <span class="min-w-0">
              <span class="block truncate text-[0.8125rem] font-medium text-ink">{{ user.name }}</span>
              <span class="block truncate text-[0.75rem] text-faint">{{ user.email }}</span>
              <span class="block truncate text-[0.75rem] text-soft">{{ user.tenants || 'No workspace' }}</span>
            </span>
            <span class="shrink-0 text-[0.75rem] text-faint">{{ relative(user.createdAt) }}</span>
          </li>
        </ul>
        <p v-else class="px-4 py-8 text-center text-[0.8125rem] text-faint">No registrations yet.</p>
      </UiCard>
    </template>

    <p v-else-if="pending" class="text-[0.8125rem] text-faint">Loading analytics…</p>
  </div>
</template>
