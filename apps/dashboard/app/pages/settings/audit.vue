<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * The audit log (ADR-0007).
 *
 * Filterable, because an audit log you cannot narrow is an audit log nobody
 * reads. The filters go to the server rather than to a client-side `.filter()`:
 * the interesting query is usually "everything a given actor did", and that
 * spans far more rows than a page holds.
 */
interface AuditEntry {
  id: string
  name: string
  actor: { type: string; id: string | null; label?: string }
  resourceType: string | null
  resourceId: string | null
  payload: Record<string, unknown>
  createdAt: string
}

const api = useApi()

const name = ref('')
const resourceType = ref('')
const since = ref('')

const query = computed(() => ({
  name: name.value || undefined,
  resourceType: resourceType.value || undefined,
  since: since.value || undefined,
  limit: 100,
}))

const { data, refresh, status } = await useAsyncData('settings:audit', () =>
  api.get<AuditEntry[]>('/api/v1/settings/audit', query.value),
)

watch(query, () => void refresh())

/** Named event families, for a filter that does not require knowing the enum. */
const RESOURCE_TYPES = [
  { label: 'Everything', value: '' },
  { label: 'Pages', value: 'page' },
  { label: 'Sites', value: 'site' },
  { label: 'Settings', value: 'settings' },
  { label: 'Team', value: 'user' },
  { label: 'Domains', value: 'domain' },
  { label: 'API keys', value: 'api_key' },
  { label: 'Webhooks', value: 'webhook' },
  { label: 'Integrations', value: 'integration' },
]

const ACTOR_TONE = {
  user: 'neutral',
  agent: 'brand',
  system: 'neutral',
  app: 'warning',
} as const

function toneFor(type: string) {
  return ACTOR_TONE[type as keyof typeof ACTOR_TONE] ?? 'neutral'
}

/** Destructive names get visual weight; everything else stays quiet. */
function isDestructive(eventName: string): boolean {
  return /(_removed|_revoked|_rotated|\.deleted|_deletion|_cancelled)$/.test(eventName)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="rounded-card border border-line bg-raised px-5 py-4">
      <div class="grid gap-3 sm:grid-cols-3">
        <UiField label="Event name" help="Exact match, e.g. page.published.">
          <template #default="{ id, describedBy }">
            <UiInput :id="id" v-model="name" :described-by="describedBy" placeholder="page.published" />
          </template>
        </UiField>

        <UiField label="Resource">
          <template #default="{ id }">
            <UiSelect :id="id" v-model="resourceType" :options="RESOURCE_TYPES" />
          </template>
        </UiField>

        <UiField label="Since">
          <template #default="{ id }">
            <UiInput :id="id" v-model="since" type="date" />
          </template>
        </UiField>
      </div>
    </section>

    <section class="rounded-card border border-line bg-raised">
      <header class="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 class="type-button text-ink">Activity</h2>
        <span class="type-caption-12 text-faint">
          {{ status === 'pending' ? 'Loading…' : `${data?.length ?? 0} entries` }}
        </span>
      </header>

      <UiEmptyState
        v-if="!data?.length"
        title="Nothing matches"
        description="Widen the filters, or wait for something to happen."
      />

      <ol v-else class="divide-y divide-line">
        <li
          v-for="entry in data"
          :key="entry.id"
          class="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-2.5"
          :class="isDestructive(entry.name) ? 'bg-danger-soft/20' : ''"
        >
          <time class="type-caption-12 w-40 shrink-0 tabular-nums text-faint" :datetime="entry.createdAt">
            {{ new Date(entry.createdAt).toLocaleString() }}
          </time>

          <span class="type-button-12 font-mono" :class="isDestructive(entry.name) ? 'text-danger' : 'text-ink'">
            {{ entry.name }}
          </span>

          <UiBadge :tone="toneFor(entry.actor.type)">
            {{ entry.actor.label ?? entry.actor.type }}
          </UiBadge>

          <span v-if="entry.resourceType" class="type-caption-12 text-soft">
            {{ entry.resourceType }}
            <span v-if="entry.resourceId" class="text-faint">· {{ entry.resourceId.slice(0, 8) }}</span>
          </span>

          <span v-if="Object.keys(entry.payload).length" class="type-caption-12 min-w-0 truncate text-faint">
            {{ Object.entries(entry.payload).map(([key, value]) => `${key}=${value}`).join(' · ') }}
          </span>
        </li>
      </ol>
    </section>
  </div>
</template>
