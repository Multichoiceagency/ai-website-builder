<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DnsInstruction, DomainSetting, Site } from '@platform/schemas'

/**
 * Domains (§58).
 *
 * The DNS records come from the server, per domain, rather than from a generic
 * help page — an apex and a subdomain need different records, and telling
 * someone the wrong one is the most expensive support call in this product.
 */
interface DomainRow extends DomainSetting {
  state: 'verified' | 'pending_verification'
  dns: DnsInstruction[]
}

const api = useApi()
const can = useCan()

const { data, refresh } = await useAsyncData('settings:domains', () =>
  api.get<{ domains: DomainRow[]; limits: { domains: number } }>('/api/v1/settings/domains'),
)

const { data: sites } = await useAsyncData(
  'settings:domains:sites',
  () => api.get<Site[]>('/api/v1/sites'),
  { default: () => [] as Site[] },
)

const addOpen = ref(false)
const hostname = ref('')
const siteId = ref('')
const busy = ref(false)
const error = ref('')
const expanded = ref<string | null>(null)

const siteOptions = computed(() =>
  (sites.value ?? []).map((site) => ({ label: site.name, value: site.id })),
)

const atLimit = computed(() => (data.value?.domains.length ?? 0) >= (data.value?.limits.domains ?? 0))

async function add() {
  busy.value = true
  error.value = ''
  try {
    await api.post('/api/v1/settings/domains', {
      hostname: hostname.value.trim().toLowerCase(),
      siteId: siteId.value || sites.value?.[0]?.id,
    })
    hostname.value = ''
    addOpen.value = false
    await refresh()
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Could not connect that domain.'
  } finally {
    busy.value = false
  }
}

async function act(path: string) {
  await api.post(path)
  await refresh()
}

function copy(value: string) {
  void navigator.clipboard?.writeText(value)
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <section class="rounded-card border border-line bg-raised">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 class="type-button text-ink">Connected domains</h2>
          <p class="type-caption-12 mt-1 text-soft">
            {{ data?.domains.length ?? 0 }} of {{ data?.limits.domains ?? 0 }} used.
          </p>
        </div>
        <UiButton
          v-if="can('domain:write')"
          size="sm"
          variant="primary"
          :disabled="atLimit"
          :title="atLimit ? 'Your plan has no free domain slots.' : undefined"
          @click="addOpen = true"
        >
          Connect a domain
        </UiButton>
      </header>

      <UiEmptyState
        v-if="!data?.domains.length"
        title="No domains yet"
        description="Your sites are reachable on their preview URLs until you connect a domain."
      />

      <ul v-else class="divide-y divide-line">
        <li v-for="domain in data.domains" :key="domain.id">
          <div class="flex flex-wrap items-center gap-3 px-5 py-3">
            <div class="min-w-0 flex-1">
              <p class="type-button-12 flex items-center gap-2 truncate text-ink">
                {{ domain.hostname }}
                <UiBadge v-if="domain.isPrimary" tone="brand">Primary</UiBadge>
              </p>
              <p class="type-caption-12 text-faint">
                {{ sites?.find((site) => site.id === domain.siteId)?.name ?? 'Unassigned site' }}
              </p>
            </div>

            <UiBadge :tone="domain.state === 'verified' ? 'positive' : 'warning'">
              {{ domain.state === 'verified' ? 'Verified' : 'Awaiting DNS' }}
            </UiBadge>

            <UiButton size="sm" variant="ghost" @click="expanded = expanded === domain.id ? null : domain.id">
              {{ expanded === domain.id ? 'Hide DNS' : 'DNS records' }}
            </UiButton>

            <template v-if="can('domain:write')">
              <UiButton
                v-if="domain.state !== 'verified'"
                size="sm"
                @click="act(`/api/v1/settings/domains/${domain.id}/verify`)"
              >
                Check verification
              </UiButton>
              <UiButton
                v-if="!domain.isPrimary && domain.state === 'verified'"
                size="sm"
                @click="act(`/api/v1/settings/domains/${domain.id}/primary`)"
              >
                Make primary
              </UiButton>
              <SettingsDangerAction
                title="Disconnect domain"
                :description="`${domain.hostname} stops resolving to this workspace.`"
                action-label="Disconnect"
                method="DELETE"
                :path="`/api/v1/settings/domains/${domain.id}`"
                @done="refresh()"
              />
            </template>
          </div>

          <div v-if="expanded === domain.id" class="border-t border-line bg-sunken/40 px-5 py-4">
            <p class="type-caption-12 mb-3 text-soft">
              Add these at your DNS provider. Propagation usually takes minutes, occasionally hours.
            </p>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[34rem] border-separate border-spacing-y-1 text-left">
                <thead>
                  <tr class="type-button-10 uppercase tracking-[0.08em] text-faint">
                    <th class="pb-1 pr-4 font-medium">Type</th>
                    <th class="pb-1 pr-4 font-medium">Name</th>
                    <th class="pb-1 pr-4 font-medium">Value</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="record in domain.dns" :key="`${record.type}-${record.name}`">
                    <td class="pr-4 align-top"><UiBadge>{{ record.type }}</UiBadge></td>
                    <td class="pr-4 align-top font-mono text-[0.75rem] text-ink">{{ record.name }}</td>
                    <td class="pr-4 align-top font-mono text-[0.75rem] break-all text-ink">{{ record.value }}</td>
                    <td class="align-top">
                      <UiButton size="sm" variant="ghost" @click="copy(record.value)">Copy</UiButton>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <UiDialog v-model:open="addOpen" title="Connect a domain" description="You will get the DNS records to add next.">
      <div class="flex flex-col gap-4">
        <UiField label="Hostname" help="For example acme.nl or shop.acme.nl. No scheme, no trailing slash." required :error="error">
          <template #default="{ id, describedBy }">
            <UiInput :id="id" v-model="hostname" :described-by="describedBy" placeholder="acme.nl" />
          </template>
        </UiField>

        <UiField label="Website" help="Which site this hostname serves.">
          <template #default="{ id }">
            <UiSelect :id="id" v-model="siteId" :options="siteOptions" />
          </template>
        </UiField>
      </div>

      <template #footer>
        <UiButton size="sm" @click="addOpen = false">Cancel</UiButton>
        <UiButton size="sm" variant="primary" :loading="busy" @click="add">Connect</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
