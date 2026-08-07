<script setup lang="ts">
import { computed } from 'vue'
import type { CrmActivity, CrmLead, CrmOverview, CrmTask } from '@platform/schemas'

const api = useApi()

const { data: overview } = await useAsyncData('crm:overview', () => api.get<CrmOverview>('/api/v1/crm/overview'), {
  default: () => null,
})

const { data: leads } = await useAsyncData(
  'crm:overview:leads',
  () => api.get<CrmLead[]>('/api/v1/crm/leads', { limit: 5 }),
  { default: () => [] as CrmLead[] },
)

const { data: tasks } = await useAsyncData(
  'crm:overview:tasks',
  () => api.get<CrmTask[]>('/api/v1/crm/tasks', { status: 'open', limit: 5 }),
  { default: () => [] as CrmTask[] },
)

const { data: activities } = await useAsyncData(
  'crm:overview:activity',
  () => api.get<CrmActivity[]>('/api/v1/crm/activities', { limit: 8 }),
  { default: () => [] as CrmActivity[] },
)

const currency = computed(() => overview.value?.currency ?? 'EUR')

function money(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: currency.value,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function relative(value: string): string {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`
  return `${Math.round(minutes / 1440)}d ago`
}

const ACTIVITY_LABELS: Record<string, string> = {
  note: 'Note',
  call: 'Call',
  email: 'E-mail',
  meeting: 'Meeting',
  form: 'Form',
  stage_change: 'Stage',
  system: 'System',
}
</script>

<template>
  <div>
    <UiPageHeader title="CRM" description="Leads, pipeline and contacts.">
      <template #actions>
        <UiButton size="sm" to="/crm/leads">Leads</UiButton>
        <UiButton size="sm" variant="primary" to="/crm/pipeline">Pipeline</UiButton>
      </template>
    </UiPageHeader>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <UiStat label="Open leads" :value="overview?.openLeadCount ?? 0" :hint="`${overview?.leadsLast30Days ?? 0} in the last 30 days`" />
      <UiStat label="Open deals" :value="overview?.openDealCount ?? 0" :hint="money(overview?.openValueCents ?? 0)" />
      <UiStat label="Forecast" :value="money(overview?.forecastCents ?? 0)" hint="Open value × stage probability" />
      <UiStat label="Won" :value="money(overview?.wonValueCents ?? 0)" :hint="`${money(overview?.wonLast30DaysCents ?? 0)} in the last 30 days`" />
    </div>

    <div class="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <UiCard :padded="false">
        <div class="flex items-center justify-between px-5 py-4">
          <h2 class="text-heading font-semibold text-ink">Latest leads</h2>
          <NuxtLink to="/crm/leads" class="text-[0.8125rem] text-soft no-underline hover:text-ink">All leads</NuxtLink>
        </div>

        <p v-if="!leads.length" class="border-t border-line px-5 py-8 text-center text-sm text-soft">
          No leads yet. A website form submission lands here automatically.
        </p>

        <ul v-else class="divide-y divide-line border-t border-line">
          <li v-for="lead in leads" :key="lead.id" class="flex items-center gap-4 px-5 py-3.5">
            <span
              class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0.8125rem] font-semibold tabular-nums"
              :class="lead.score >= 60 ? 'bg-positive-soft text-positive' : 'bg-sunken text-soft'"
              :title="`Lead score ${lead.score}`"
            >
              {{ lead.score }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-ink">{{ lead.name || lead.email || 'Anonymous enquiry' }}</p>
              <p class="truncate text-[0.8125rem] text-faint">
                {{ lead.sourceDetail || lead.source }} · {{ relative(lead.createdAt) }}
              </p>
            </div>
            <UiBadge :tone="lead.status === 'qualified' ? 'positive' : lead.status === 'new' ? 'brand' : 'neutral'">
              {{ lead.status }}
            </UiBadge>
          </li>
        </ul>
      </UiCard>

      <div class="flex flex-col gap-3">
        <UiCard>
          <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">
            Open tasks ({{ overview?.openTaskCount ?? 0 }})
          </h2>
          <p v-if="!tasks.length" class="text-[0.8125rem] text-soft">Nothing to follow up.</p>
          <ul v-else class="flex flex-col gap-2.5">
            <li v-for="task in tasks" :key="task.id" class="flex items-start gap-2.5">
              <span
                class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                :class="task.priority === 'high' ? 'bg-danger' : 'bg-brand'"
                aria-hidden="true"
              />
              <span class="text-[0.875rem] leading-relaxed text-ink">{{ task.title }}</span>
            </li>
          </ul>
        </UiCard>

        <UiCard>
          <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Recent activity</h2>
          <p v-if="!activities.length" class="text-[0.8125rem] text-soft">No activity recorded yet.</p>
          <ul v-else class="flex flex-col gap-3">
            <li v-for="activity in activities" :key="activity.id" class="text-[0.8125rem] leading-relaxed">
              <span class="text-faint">{{ ACTIVITY_LABELS[activity.type] ?? activity.type }}</span>
              <span class="text-ink"> · {{ activity.subject || 'Updated' }}</span>
              <span class="text-faint"> · {{ relative(activity.occurredAt) }}</span>
            </li>
          </ul>
        </UiCard>
      </div>
    </div>
  </div>
</template>
