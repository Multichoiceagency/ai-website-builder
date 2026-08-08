<script setup lang="ts">
import type { DnsInstruction, DomainSetting } from '@platform/schemas'

/**
 * Step 9 — show preview hostname + connect a custom domain (§82).
 */

interface DomainRow extends DomainSetting {
  state: 'verified' | 'pending_verification'
  dns: DnsInstruction[]
}

const props = defineProps<{
  siteId: string | null
  previewHostname?: string
}>()

const emit = defineEmits<{
  continue: []
  skip: []
}>()

const api = useApi()
const hostname = ref('')
const busy = ref(false)
const error = ref('')
const domains = ref<DomainRow[]>([])

async function refresh() {
  if (!props.siteId) return
  try {
    const result = await api.get<{ domains: DomainRow[] }>('/api/v1/settings/domains')
    domains.value = result.domains.filter((d) => d.siteId === props.siteId)
  } catch {
    domains.value = []
  }
}

async function add() {
  if (!props.siteId || !hostname.value.trim()) return
  busy.value = true
  error.value = ''
  try {
    await api.post('/api/v1/settings/domains', {
      hostname: hostname.value.trim().toLowerCase(),
      siteId: props.siteId,
    })
    hostname.value = ''
    await refresh()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not connect that domain.'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  void refresh()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="rounded-xl border border-line bg-raised p-5 shadow-card">
      <h2 class="text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Preview URL</h2>
      <p class="mt-2 text-sm text-ink">
        {{ previewHostname || 'Your site is reachable on its preview hostname.' }}
      </p>
      <p class="mt-1 text-[0.75rem] leading-relaxed text-soft">
        Connect your own domain when you are ready. DNS instructions appear after you add a hostname.
      </p>
    </div>

    <div class="rounded-xl border border-line bg-raised p-5 shadow-card">
      <h2 class="mb-3 text-heading font-semibold text-ink">Connect a domain</h2>
      <p v-if="error" class="mb-3 text-[0.8125rem] text-danger" role="alert">{{ error }}</p>

      <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="add">
        <UiField v-slot="{ id }" label="Hostname" class="min-w-0 flex-1">
          <UiInput :id="id" v-model="hostname" placeholder="www.example.nl" />
        </UiField>
        <UiButton type="submit" variant="primary" :loading="busy" :disabled="!siteId || !hostname.trim()">
          Add domain
        </UiButton>
      </form>

      <ul v-if="domains.length" class="mt-4 flex flex-col gap-2">
        <li
          v-for="domain in domains"
          :key="domain.id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2"
        >
          <span class="text-[0.8125rem] font-medium text-ink">{{ domain.hostname }}</span>
          <UiBadge :tone="domain.state === 'verified' ? 'positive' : 'warning'">
            {{ domain.state === 'verified' ? 'Verified' : 'Pending DNS' }}
          </UiBadge>
        </li>
      </ul>
    </div>

    <div class="flex flex-wrap gap-2">
      <UiButton variant="primary" size="lg" arrow @click="emit('continue')">Continue</UiButton>
      <UiButton variant="ghost" @click="emit('skip')">Do this later</UiButton>
      <UiButton to="/settings/domains">Open domain settings</UiButton>
    </div>
  </div>
</template>
