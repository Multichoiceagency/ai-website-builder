<script setup lang="ts">
const api = useAdminApi()

interface Stats {
  tenants: number; users: number; sites: number; pages: number; publishedPages: number
  activeSessions: number; eventsLast24h: number; signupsLast7d: number
  plans: { plan: string; tenants: number }[]
}

interface Revenue {
  currency: string
  mrr: number
  arr: number
  breakdown: { plan: string; tenants: number; priceEur: number; mrrEur: number }[]
  note: string
}

const { data: stats } = await useAsyncData('admin:stats', () => api.get<Stats>('/stats'))
const { data: revenue } = await useAsyncData('admin:revenue', () => api.get<Revenue>('/revenue'))
const { data: activity } = await useAsyncData('admin:activity', () =>
  api.get<{ id: string; tenantName: string; name: string; createdAt: string }[]>('/activity', { limit: 12 }),
)

function relative(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function eur(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}
</script>

<template>
  <div v-if="stats">
    <UiPageHeader title="Platform overview" description="Every workspace on this installation." />

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <UiStat label="Clients" :value="stats.tenants" :hint="`${stats.signupsLast7d} new users in 7 days`" />
      <UiStat label="Users" :value="stats.users" :hint="`${stats.activeSessions} signed in now`" />
      <UiStat label="Websites" :value="stats.sites" />
      <UiStat label="Published pages" :value="stats.publishedPages" :hint="`of ${stats.pages} total`" />
    </div>

    <div v-if="revenue" class="mt-3 grid gap-3 sm:grid-cols-2">
      <UiStat label="Est. MRR" :value="eur(revenue.mrr)" :hint="revenue.note" />
      <UiStat label="Est. ARR" :value="eur(revenue.arr)" hint="MRR × 12 from plan list prices" />
    </div>

    <div class="mt-7 grid gap-5 lg:grid-cols-[1fr_1.3fr] lg:items-start">
      <UiCard>
        <h2 class="mb-4 text-heading font-semibold text-ink">Plans</h2>
        <ul class="flex flex-col gap-2.5">
          <li v-for="entry in stats.plans" :key="entry.plan" class="flex items-center gap-3">
            <span class="w-20 shrink-0 text-[0.8125rem] capitalize text-soft">{{ entry.plan }}</span>
            <span class="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
              <span
                class="block h-full rounded-full bg-brand"
                :style="{ width: `${Math.max(4, (entry.tenants / Math.max(stats.tenants, 1)) * 100)}%` }"
              />
            </span>
            <span class="w-8 shrink-0 text-right text-[0.8125rem] font-medium tabular-nums text-ink">{{ entry.tenants }}</span>
          </li>
        </ul>
        <ul v-if="revenue?.breakdown?.length" class="mt-4 space-y-1 border-t border-line pt-3">
          <li
            v-for="row in revenue.breakdown"
            :key="row.plan"
            class="flex justify-between text-[0.75rem] text-soft"
          >
            <span class="capitalize">{{ row.plan }} × {{ row.tenants }} @ {{ eur(row.priceEur) }}</span>
            <span class="tabular-nums text-ink">{{ eur(row.mrrEur) }}</span>
          </li>
        </ul>
      </UiCard>

      <UiCard :padded="false">
        <div class="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 class="text-heading font-semibold text-ink">Recent activity</h2>
          <UiBadge>{{ stats.eventsLast24h }} in 24h</UiBadge>
        </div>
        <ul v-if="activity?.length" class="divide-y divide-line">
          <li v-for="entry in activity" :key="entry.id" class="flex items-center justify-between gap-4 px-4 py-2.5">
            <span class="min-w-0">
              <span class="block truncate text-[0.8125rem] text-ink">{{ entry.name }}</span>
              <span class="block truncate text-[0.75rem] text-faint">{{ entry.tenantName }}</span>
            </span>
            <span class="shrink-0 text-[0.75rem] text-faint">{{ relative(entry.createdAt) }}</span>
          </li>
        </ul>
        <p v-else class="px-4 py-8 text-center text-[0.8125rem] text-faint">No activity yet.</p>
      </UiCard>
    </div>
  </div>
</template>
