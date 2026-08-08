<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WhatsappConnectionStatus } from '@platform/schemas'

/**
 * Tenant OpenWA onboarding — enter your own gateway URL + API key, copy the
 * webhook, follow the safety checklist. Platform `.env` remains a fallback.
 */
const props = defineProps<{
  connection: WhatsappConnectionStatus | null
  webhookUrl: string
}>()

const emit = defineEmits<{
  saved: [status: WhatsappConnectionStatus]
}>()

const api = useApi()
const can = useCan()

const panelOpen = ref(true)
const busy = ref(false)
const error = ref('')
const savedFlash = ref(false)
const copied = ref(false)

const baseUrl = ref('')
const dashboardUrl = ref('')
const apiKey = ref('')
const webhookSecret = ref('')

watch(
  () => props.connection,
  (value) => {
    if (!value) return
    baseUrl.value = value.source === 'tenant' ? (value.baseUrl ?? '') : (value.baseUrl ?? 'http://localhost:2785')
    dashboardUrl.value = value.dashboardUrl ?? value.baseUrl ?? 'http://localhost:2785'
    if (!value.configured || !value.onboardingComplete) panelOpen.value = true
  },
  { immediate: true },
)

const gatewayLabel = computed(() => {
  if (props.connection?.reachable) return 'Online'
  if (props.connection?.configured) return 'Unreachable'
  return 'Not connected'
})

async function copyWebhook() {
  if (!props.webhookUrl) return
  try {
    await navigator.clipboard.writeText(props.webhookUrl)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    error.value = 'Could not copy. Select the webhook URL manually.'
  }
}

async function saveConnection(markComplete = false) {
  if (!can('crm:write')) return
  error.value = ''
  busy.value = true
  savedFlash.value = false
  try {
    const payload: Record<string, unknown> = {
      baseUrl: baseUrl.value.trim(),
      dashboardUrl: dashboardUrl.value.trim(),
    }
    if (apiKey.value.trim()) payload.apiKey = apiKey.value.trim()
    if (webhookSecret.value.trim()) payload.webhookSecret = webhookSecret.value.trim()
    if (markComplete) payload.onboardingComplete = true

    const status = await api.put<WhatsappConnectionStatus>('/api/v1/crm/whatsapp/connection', payload)
    apiKey.value = ''
    webhookSecret.value = ''
    savedFlash.value = true
    emit('saved', status)
    if (markComplete && status.configured) panelOpen.value = false
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not save OpenWA connection.'
  } finally {
    busy.value = false
  }
}

async function dismissChecklist() {
  if (!can('crm:write')) return
  busy.value = true
  try {
    const status = await api.put<WhatsappConnectionStatus>('/api/v1/crm/whatsapp/connection', {
      onboardingComplete: true,
    })
    emit('saved', status)
    panelOpen.value = false
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not update onboarding.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <UiCard class="mb-5 overflow-hidden p-0">
    <button
      type="button"
      class="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-sunken/40"
      @click="panelOpen = !panelOpen"
    >
      <div class="min-w-0">
        <h2 class="type-button text-ink">Connect OpenWA</h2>
        <p class="mt-0.5 type-caption-12 text-soft">
          {{ gatewayLabel }}
          <span v-if="connection?.source"> · via {{ connection.source === 'tenant' ? 'your credentials' : 'platform .env' }}</span>
          <span v-if="connection?.sessions?.length"> · {{ connection.sessions.length }} session{{ connection.sessions.length === 1 ? '' : 's' }}</span>
        </p>
      </div>
      <UiBadge :tone="connection?.reachable ? 'positive' : connection?.configured ? 'warning' : 'neutral'">
        {{ panelOpen ? 'Hide' : 'Setup' }}
      </UiBadge>
    </button>

    <div v-if="panelOpen" class="border-t border-line px-5 py-5">
      <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
        {{ error }}
      </p>
      <p v-else-if="savedFlash" class="mb-4 type-caption-12 text-positive">Connection saved.</p>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div class="space-y-4">
          <p class="type-caption-12 text-soft">
            Enter the OpenWA gateway this workspace should use. Credentials are stored encrypted per tenant.
            Platform <code class="rounded bg-sunken px-1">.env</code> values are used only when you have not saved your own.
          </p>

          <UiField label="OpenWA base URL" help="HTTP API root of your OpenWA instance.">
            <template #default="{ id, describedBy }">
              <UiInput
                :id="id"
                v-model="baseUrl"
                :described-by="describedBy"
                :disabled="!can('crm:write') || busy"
                placeholder="http://localhost:2785"
              />
            </template>
          </UiField>

          <UiField label="Dashboard URL" help="Where you open the QR scanner / session UI. Usually the same as the base URL.">
            <template #default="{ id, describedBy }">
              <UiInput
                :id="id"
                v-model="dashboardUrl"
                :described-by="describedBy"
                :disabled="!can('crm:write') || busy"
                placeholder="http://localhost:2785"
              />
            </template>
          </UiField>

          <UiField
            label="API key"
            :help="connection?.apiKeyConfigured ? 'Leave blank to keep the stored key. Paste a new key to replace it.' : 'Create this in the OpenWA dashboard.'"
          >
            <template #default="{ id, describedBy }">
              <UiInput
                :id="id"
                v-model="apiKey"
                type="password"
                autocomplete="off"
                :described-by="describedBy"
                :disabled="!can('crm:write') || busy"
                :placeholder="connection?.apiKeyConfigured ? '•••• configured' : 'Paste OpenWA API key'"
              />
            </template>
          </UiField>

          <UiField
            label="Webhook secret (optional)"
            help="If OpenWA signs webhooks, paste the same secret here. Leave empty to skip verification."
          >
            <template #default="{ id, describedBy }">
              <UiInput
                :id="id"
                v-model="webhookSecret"
                type="password"
                autocomplete="off"
                :described-by="describedBy"
                :disabled="!can('crm:write') || busy"
                :placeholder="connection?.webhookSecretConfigured ? '•••• configured' : 'Optional'"
              />
            </template>
          </UiField>

          <div class="flex flex-wrap gap-2">
            <UiButton
              size="sm"
              variant="primary"
              :loading="busy"
              :disabled="!can('crm:write')"
              @click="saveConnection(false)"
            >
              Save &amp; test
            </UiButton>
            <UiButton
              v-if="connection?.configured"
              size="sm"
              :loading="busy"
              :disabled="!can('crm:write')"
              @click="saveConnection(true)"
            >
              Save &amp; finish setup
            </UiButton>
            <a
              v-if="dashboardUrl"
              :href="dashboardUrl"
              target="_blank"
              rel="noreferrer"
              class="inline-flex h-8 items-center rounded-md border border-line-strong bg-raised px-3 text-[0.8125rem] font-semibold text-ink hover:bg-sunken"
            >
              Open OpenWA
            </a>
          </div>
        </div>

        <div class="space-y-4 rounded-lg border border-line bg-sunken/40 p-4">
          <h3 class="type-button-12 text-ink">Important instructions</h3>
          <ol class="list-decimal space-y-3 pl-4 type-caption-12 text-soft">
            <li>
              Use a <strong class="font-medium text-ink">dedicated WhatsApp number</strong> only.
              Unofficial clients (OpenWA) carry ban risk for personal numbers.
            </li>
            <li>
              Start or host OpenWA, then open the dashboard and create an API key.
              Scan the QR with the dedicated phone.
            </li>
            <li>
              Paste base URL + API key on the left and click <strong class="font-medium text-ink">Save &amp; test</strong>
              until the gateway shows Online.
            </li>
            <li>
              In OpenWA, register this webhook for
              <code class="rounded bg-raised px-1">message.received</code>:
              <div class="mt-2 flex flex-wrap items-start gap-2">
                <code class="block min-w-0 flex-1 break-all rounded bg-raised px-2 py-1.5 font-mono text-[0.7rem] text-ink">
                  {{ webhookUrl || '…/api/v1/crm/whatsapp/webhook?tenantId=…' }}
                </code>
                <UiButton size="sm" :disabled="!webhookUrl" @click="copyWebhook">
                  {{ copied ? 'Copied' : 'Copy' }}
                </UiButton>
              </div>
            </li>
            <li>
              Create an AI agent under
              <NuxtLink class="text-brand" to="/crm/whatsapp-agents">WhatsApp agents</NuxtLink>
              and paste the OpenWA <strong class="font-medium text-ink">session id</strong>.
            </li>
          </ol>

          <p class="type-caption-12 text-faint">
            Source:
            <a class="text-brand" href="https://github.com/rmyndharis/OpenWA" target="_blank" rel="noreferrer">
              rmyndharis/OpenWA
            </a>
            · Self-host tip:
            <code class="rounded bg-raised px-1">pnpm infra:openwa</code>
            (local Docker profile).
          </p>

          <UiButton
            v-if="connection?.configured && !connection.onboardingComplete"
            size="sm"
            variant="ghost"
            :disabled="busy || !can('crm:write')"
            @click="dismissChecklist"
          >
            Mark setup complete
          </UiButton>
        </div>
      </div>

      <ul v-if="connection?.sessions?.length" class="mt-5 border-t border-line pt-4">
        <li class="mb-2 type-button-12 text-ink">Sessions from OpenWA</li>
        <li
          v-for="session in connection.sessions"
          :key="session.id"
          class="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 type-caption-12 last:border-0"
        >
          <span class="font-mono text-ink">{{ session.id }}</span>
          <span class="text-soft">{{ session.name }} · {{ session.status }}</span>
        </li>
      </ul>
    </div>
  </UiCard>
</template>
