<script setup lang="ts">
import { computed } from 'vue'
import type { PageSummary, PlanLimits, Site } from '@platform/schemas'

/**
 * The command centre.
 *
 * Everything here is a real measurement. No placeholder charts and no invented
 * AI insights — an empty state that tells the truth is worth more than a
 * dashboard that looks busy.
 */
const api = useApi()
const session = useSession()
const membership = useActiveMembership()

interface ActivityEntry {
  id: string
  name: string
  actor: { type: string; id: string | null; label?: string }
  resourceType: string | null
  createdAt: string
}

const { data, pending, refresh } = await useAsyncData('home', async () => {
  const sites = await api.get<Site[]>('/api/v1/sites')

  const [usage, activity, pageLists] = await Promise.all([
    api.get<{ plan: string; limits: PlanLimits; usage: { sites: number; users: number } }>(
      '/api/v1/tenants/current/usage',
    ),
    api.get<ActivityEntry[]>('/api/v1/tenants/current/activity').catch(() => [] as ActivityEntry[]),
    Promise.all(sites.map((site) => api.get<PageSummary[]>(`/api/v1/sites/${site.id}/pages`))),
  ])

  return { sites, usage, activity, pages: pageLists.flat() }
})

const pages = computed(() => data.value?.pages ?? [])
const published = computed(() => pages.value.filter((page) => page.status === 'published'))
const needsPublishing = computed(() => pages.value.filter((page) => page.hasUnpublishedChanges))

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
</script>

<template>
  <div>
    <UiPageHeader
      :title="`Hello, ${session?.user.name?.split(' ')[0] ?? 'there'}`"
      :description="membership ? `${membership.tenantName} · ${membership.plan} plan` : ''"
    >
      <template #actions>
        <UiButton size="sm" :loading="pending" @click="refresh()">Refresh</UiButton>
        <UiButton size="sm" variant="primary" to="/sites">Open websites</UiButton>
      </template>
    </UiPageHeader>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <UiStat
        label="Websites"
        :value="data?.sites.length ?? 0"
        :hint="data ? `${data.usage.limits.sites === Number.MAX_SAFE_INTEGER ? 'unlimited' : data.usage.limits.sites} included` : ''"
      />
      <UiStat label="Pages" :value="pages.length" />
      <UiStat label="Published" :value="published.length" />
      <UiStat
        label="Awaiting publish"
        :value="needsPublishing.length"
        :hint="needsPublishing.length ? 'Changes are not live yet' : 'Everything is live'"
      />
    </div>

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
