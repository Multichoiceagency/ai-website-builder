<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DataRequest } from '@platform/schemas'

/**
 * Data & privacy (§97, §98).
 *
 * Export produces a file the user keeps. Deletion is *scheduled* rather than
 * performed: the mistake this page protects against is deleting the wrong
 * workspace, and an immediate delete has no undo for exactly that mistake.
 */
const api = useApi()
const membership = useActiveMembership()

const { data, refresh } = await useAsyncData('settings:data', () =>
  api.get<{ requests: DataRequest[]; retentionSettings: Record<string, unknown> }>('/api/v1/settings/data'),
)

const exporting = ref(false)
const exportError = ref('')

const pendingDeletion = computed(() =>
  (data.value?.requests ?? []).find(
    (entry) => entry.kind === 'workspace_deletion' && entry.status === 'pending',
  ),
)

const REGIONS = [
  { label: 'European Union', value: 'eu' },
  { label: 'United States', value: 'us' },
  { label: 'No preference', value: 'global' },
]

async function exportWorkspace() {
  exporting.value = true
  exportError.value = ''
  try {
    const result = await api.post<{ request: DataRequest; export: unknown }>('/api/v1/settings/data/export')

    // Handed to the user as a file rather than rendered: an export is something
    // you keep, not something you read in a panel.
    const blob = new Blob([JSON.stringify(result.export, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${membership.value?.tenantSlug ?? 'workspace'}-settings-export.json`
    anchor.click()
    URL.revokeObjectURL(url)

    await refresh()
  } catch (cause) {
    exportError.value = cause instanceof ApiError ? cause.message : 'Could not build the export.'
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <SettingsSection
      section-key="data-retention"
      title="Retention & privacy"
      description="How long this workspace keeps data, and how it treats visitors who ask not to be tracked."
    >
      <template #default="{ draft }">
        <div class="grid gap-4 sm:grid-cols-3">
          <UiField label="Analytics" help="Days. 0 keeps it indefinitely.">
            <template #default="{ id }">
              <UiInput
                :id="id"
                :model-value="String((draft as any).analyticsRetentionDays ?? 395)"
                type="number"
                @update:model-value="(value: string) => ((draft as any).analyticsRetentionDays = Number(value) || 0)"
              />
            </template>
          </UiField>

          <UiField label="Audit log" help="Days. Keep this long enough to answer a question after the fact.">
            <template #default="{ id }">
              <UiInput
                :id="id"
                :model-value="String((draft as any).auditRetentionDays ?? 730)"
                type="number"
                @update:model-value="(value: string) => ((draft as any).auditRetentionDays = Number(value) || 0)"
              />
            </template>
          </UiField>

          <UiField label="Leads & contacts" help="Days. 0 keeps them indefinitely.">
            <template #default="{ id }">
              <UiInput
                :id="id"
                :model-value="String((draft as any).leadRetentionDays ?? 0)"
                type="number"
                @update:model-value="(value: string) => ((draft as any).leadRetentionDays = Number(value) || 0)"
              />
            </template>
          </UiField>
        </div>

        <div class="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <UiField label="Processing region" help="Where this workspace's data is processed by preference.">
            <template #default="{ id }">
              <UiSelect :id="id" v-model="(draft as any).dataProcessingRegion" :options="REGIONS" />
            </template>
          </UiField>

          <UiField label="Privacy contact" help="Published on privacy pages and used for data requests.">
            <template #default="{ id }">
              <UiInput :id="id" v-model="(draft as any).privacyContactEmail" type="email" />
            </template>
          </UiField>
        </div>

        <div class="mt-5 flex flex-col gap-3 border-t border-line pt-4">
          <label class="flex items-start justify-between gap-4">
            <span class="min-w-0">
              <span class="type-button-12 block text-ink">Anonymise IP addresses</span>
              <span class="type-caption-12 block text-soft">
                Drop the last octet before an address is ever written down.
              </span>
            </span>
            <UiSwitch
              :model-value="(draft as any).anonymizeIpAddresses !== false"
              label="Anonymise IP addresses"
              @update:model-value="(value: boolean) => ((draft as any).anonymizeIpAddresses = value)"
            />
          </label>

          <label class="flex items-start justify-between gap-4">
            <span class="min-w-0">
              <span class="type-button-12 block text-ink">Respect Do-Not-Track and GPC</span>
              <span class="type-caption-12 block text-soft">
                Visitors signalling a preference are not tracked, consent banner or not.
              </span>
            </span>
            <UiSwitch
              :model-value="(draft as any).respectDoNotTrack !== false"
              label="Respect Do-Not-Track"
              @update:model-value="(value: boolean) => ((draft as any).respectDoNotTrack = value)"
            />
          </label>
        </div>
      </template>
    </SettingsSection>

    <!-- Export ----------------------------------------------------------- -->
    <section class="rounded-card border border-line bg-raised px-5 py-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 class="type-button text-ink">Export workspace data</h2>
          <p class="type-caption-12 mt-1 max-w-xl text-soft">
            Every settings document, domain, team member and endpoint as JSON. Credentials appear as their
            masked hints only — the export is as safe to mail as an API response.
          </p>
          <p v-if="exportError" class="type-caption-12 mt-1.5 text-danger" role="alert">{{ exportError }}</p>
        </div>
        <UiButton size="sm" :loading="exporting" @click="exportWorkspace">Download export</UiButton>
      </div>
    </section>

    <!-- Deletion --------------------------------------------------------- -->
    <section class="rounded-card border border-danger/25 bg-danger-soft/15 px-5 py-4">
      <h2 class="type-button text-ink">Delete this workspace</h2>

      <template v-if="pendingDeletion">
        <p class="type-caption-12 mt-1 max-w-xl text-soft">
          Scheduled for
          <strong class="text-ink">
            {{ pendingDeletion.scheduledFor ? new Date(pendingDeletion.scheduledFor).toLocaleDateString() : 'soon' }}
          </strong>
          by {{ pendingDeletion.requestedBy }}. Until then nothing is lost and this can be called off.
        </p>
        <UiButton
          class="mt-3"
          size="sm"
          variant="primary"
          @click="api.post(`/api/v1/settings/data/requests/${pendingDeletion.id}/cancel`).then(() => refresh())"
        >
          Cancel deletion
        </UiButton>
      </template>

      <template v-else>
        <p class="type-caption-12 mt-1 max-w-xl text-soft">
          Sites, pages, orders, customers and history go with it. Deletion is scheduled 30 days out, so a
          mistake is recoverable — but after that it is not.
        </p>
        <div class="mt-3">
          <SettingsDangerAction
            title="Schedule workspace deletion"
            :description="`Everything in ${membership?.tenantName} is removed after the grace period.`"
            action-label="Schedule deletion"
            method="POST"
            path="/api/v1/settings/data/delete-workspace"
            :confirm-phrase="membership?.tenantSlug ?? ''"
            :disabled="membership?.role !== 'owner'"
            disabled-reason="Only an owner can delete a workspace."
            @done="refresh()"
          />
        </div>
      </template>
    </section>

    <!-- History ---------------------------------------------------------- -->
    <section v-if="data?.requests.length" class="rounded-card border border-line bg-raised">
      <header class="border-b border-line px-5 py-3">
        <h2 class="type-button text-ink">Request history</h2>
      </header>
      <ul class="divide-y divide-line">
        <li
          v-for="entry in data.requests"
          :key="entry.id"
          class="flex flex-wrap items-baseline gap-3 px-5 py-2.5"
        >
          <time class="type-caption-12 w-40 shrink-0 tabular-nums text-faint">
            {{ new Date(entry.createdAt).toLocaleString() }}
          </time>
          <span class="type-button-12 text-ink">{{ entry.kind.replace('_', ' ') }}</span>
          <UiBadge :tone="entry.status === 'cancelled' ? 'neutral' : entry.status === 'pending' ? 'warning' : 'positive'">
            {{ entry.status }}
          </UiBadge>
          <span class="type-caption-12 text-faint">{{ entry.requestedBy }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
