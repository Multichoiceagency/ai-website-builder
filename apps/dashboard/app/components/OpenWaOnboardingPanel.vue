<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { WhatsappConnectionStatus } from '@platform/schemas'

/**
 * Tenant OpenWA onboarding — save gateway → create session & scan QR → wait until ready.
 * Webhook URL comes from the API (`connection.webhookUrl`); never invent one from an empty coreApiUrl.
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

const sessionId = ref('')
const qrCode = ref('')
const sessionStatus = ref('')
const qrPolling = ref(false)
const statusPolling = ref(false)

let qrPollTimer: ReturnType<typeof setInterval> | null = null
let statusPollTimer: ReturnType<typeof setInterval> | null = null

watch(
  () => props.connection,
  (value) => {
    if (!value) return
    baseUrl.value = value.baseUrl ?? ''
    dashboardUrl.value = value.dashboardUrl ?? value.baseUrl ?? ''
    if (!value.configured || !value.onboardingComplete) panelOpen.value = true

    const ready = value.sessions?.some((session) => isReadyStatus(session.status))
    if (ready) {
      stopStatusPolling()
      const match = value.sessions?.find((session) => isReadyStatus(session.status))
      if (match) {
        sessionId.value = match.id
        sessionStatus.value = match.status
      }
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopQrPolling()
  stopStatusPolling()
})

const displayWebhookUrl = computed(
  () => props.webhookUrl || props.connection?.webhookUrl || '',
)

const urlPlaceholder = computed(() => props.connection?.baseUrl ?? '')

const gatewayLabel = computed(() => {
  if (props.connection?.reachable) return 'Online'
  if (props.connection?.configured) return 'Unreachable'
  return 'Not connected'
})

const sessionReady = computed(() =>
  Boolean(
    isReadyStatus(sessionStatus.value) ||
      props.connection?.sessions?.some((session) => isReadyStatus(session.status)),
  ),
)

function isReadyStatus(status: string | undefined): boolean {
  if (!status) return false
  const normalized = status.toLowerCase()
  return normalized === 'ready' || normalized === 'connected' || normalized === 'authenticated'
}

function stopQrPolling() {
  if (qrPollTimer) {
    clearInterval(qrPollTimer)
    qrPollTimer = null
  }
  qrPolling.value = false
}

function stopStatusPolling() {
  if (statusPollTimer) {
    clearInterval(statusPollTimer)
    statusPollTimer = null
  }
  statusPolling.value = false
}

async function copyWebhook() {
  if (!displayWebhookUrl.value) return
  try {
    await navigator.clipboard.writeText(displayWebhookUrl.value)
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

async function createSessionAndShowQr() {
  if (!can('crm:write') || !props.connection?.reachable) return
  error.value = ''
  busy.value = true
  qrCode.value = ''
  sessionStatus.value = ''
  stopQrPolling()
  stopStatusPolling()
  try {
    const session = await api.post<{ id: string; name: string; status: string }>(
      '/api/v1/crm/whatsapp/sessions',
      { name: 'support' },
    )
    sessionId.value = session.id
    sessionStatus.value = session.status
    startQrPolling(session.id)
    startStatusPolling()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not create the WhatsApp session.'
  } finally {
    busy.value = false
  }
}

async function fetchQrOnce(id: string) {
  try {
    const result = await api.get<{ qrCode: string; status: string }>(
      `/api/v1/crm/whatsapp/sessions/${encodeURIComponent(id)}/qr`,
    )
    if (result.qrCode) qrCode.value = result.qrCode
    if (result.status) sessionStatus.value = result.status
    if (result.qrCode || isReadyStatus(result.status)) {
      stopQrPolling()
    }
  } catch {
    // QR often takes a few seconds after start — keep polling.
  }
}

function startQrPolling(id: string) {
  stopQrPolling()
  qrPolling.value = true
  void fetchQrOnce(id)
  qrPollTimer = setInterval(() => {
    void fetchQrOnce(id)
  }, 2000)
}

async function refreshConnectionStatus() {
  try {
    const status = await api.get<WhatsappConnectionStatus>('/api/v1/crm/whatsapp/status')
    emit('saved', status)
    const match =
      (sessionId.value
        ? status.sessions?.find((session) => session.id === sessionId.value)
        : undefined) ?? status.sessions?.find((session) => isReadyStatus(session.status))
    if (match) {
      sessionStatus.value = match.status
      sessionId.value = match.id
      if (isReadyStatus(match.status)) {
        stopQrPolling()
        stopStatusPolling()
      }
    }
  } catch {
    // Transient — keep polling.
  }
}

function startStatusPolling() {
  stopStatusPolling()
  statusPolling.value = true
  void refreshConnectionStatus()
  statusPollTimer = setInterval(() => {
    void refreshConnectionStatus()
  }, 2000)
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

      <ol class="mb-6 space-y-6">
        <!-- Step 1: Save gateway ------------------------------------------------ -->
        <li class="space-y-4">
          <div class="flex items-baseline gap-2">
            <span class="type-button-12 tabular-nums text-brand">1</span>
            <h3 class="type-button text-ink">Save gateway</h3>
          </div>
          <p class="type-caption-12 text-soft">
            Enter the OpenWA gateway this workspace should use. Credentials are stored encrypted per tenant.
            Platform <code class="rounded bg-sunken px-1">.env</code> values are used only when you have not saved your own.
          </p>

          <div class="grid gap-4 lg:grid-cols-2">
            <UiField
              label="OpenWA base URL"
              help="Use your public OpenWA HTTPS URL (not localhost in production)"
            >
              <template #default="{ id, describedBy }">
                <UiInput
                  :id="id"
                  v-model="baseUrl"
                  :described-by="describedBy"
                  :disabled="!can('crm:write') || busy"
                  :placeholder="urlPlaceholder"
                />
              </template>
            </UiField>

            <UiField
              label="Dashboard URL"
              help="Where you open the QR scanner / session UI. Usually the same as the base URL."
            >
              <template #default="{ id, describedBy }">
                <UiInput
                  :id="id"
                  v-model="dashboardUrl"
                  :described-by="describedBy"
                  :disabled="!can('crm:write') || busy"
                  :placeholder="urlPlaceholder"
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
          </div>

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

          <div class="rounded-lg border border-line bg-sunken/40 p-4">
            <p class="mb-2 type-button-12 text-ink">Webhook for <code class="rounded bg-raised px-1">message.received</code></p>
            <div class="flex flex-wrap items-start gap-2">
              <code class="block min-w-0 flex-1 break-all rounded bg-raised px-2 py-1.5 font-mono text-[0.7rem] text-ink">
                {{ displayWebhookUrl || '…/api/v1/crm/whatsapp/webhook?tenantId=…' }}
              </code>
              <UiButton size="sm" :disabled="!displayWebhookUrl" @click="copyWebhook">
                {{ copied ? 'Copied' : 'Copy' }}
              </UiButton>
            </div>
            <p class="mt-2 type-caption-12 text-faint">
              Dedicated WhatsApp number only — unofficial clients carry ban risk for personal numbers.
              Source:
              <a class="text-brand" href="https://github.com/rmyndharis/OpenWA" target="_blank" rel="noreferrer">
                rmyndharis/OpenWA
              </a>
            </p>
          </div>
        </li>

        <!-- Step 2: Create session & show QR ----------------------------------- -->
        <li class="space-y-4 border-t border-line pt-6">
          <div class="flex items-baseline gap-2">
            <span class="type-button-12 tabular-nums text-brand">2</span>
            <h3 class="type-button text-ink">Create session &amp; show QR</h3>
          </div>
          <p class="type-caption-12 text-soft">
            After the gateway is online, create a session named <code class="rounded bg-sunken px-1">support</code>
            and scan the QR with the dedicated phone.
          </p>
          <UiButton
            size="sm"
            variant="primary"
            :loading="busy || qrPolling"
            :disabled="!can('crm:write') || !connection?.reachable"
            @click="createSessionAndShowQr"
          >
            Create session &amp; show QR
          </UiButton>
          <p v-if="!connection?.reachable" class="type-caption-12 text-faint">
            Save &amp; test until the gateway shows Online before creating a session.
          </p>

          <div v-if="qrCode || sessionId" class="flex flex-col items-start gap-3">
            <img
              v-if="qrCode"
              :src="qrCode"
              alt="OpenWA session QR code"
              class="h-64 w-64 rounded-lg border border-line bg-raised object-contain p-2"
            />
            <p v-else-if="qrPolling" class="type-caption-12 text-soft">Waiting for QR code…</p>
            <p class="type-caption-12 text-soft">
              Session
              <span v-if="sessionId" class="font-mono text-ink">{{ sessionId }}</span>
              · status: <span class="text-ink">{{ sessionStatus || 'starting' }}</span>
            </p>
          </div>
        </li>

        <!-- Step 3: Wait until ready ------------------------------------------- -->
        <li class="space-y-3 border-t border-line pt-6">
          <div class="flex items-baseline gap-2">
            <span class="type-button-12 tabular-nums text-brand">3</span>
            <h3 class="type-button text-ink">Wait until ready</h3>
          </div>
          <p class="type-caption-12 text-soft">
            Keep the phone online until the session status becomes ready. Then link it under
            <NuxtLink class="text-brand" to="/crm/whatsapp-agents">WhatsApp agents</NuxtLink>.
          </p>
          <UiBadge :tone="sessionReady ? 'positive' : statusPolling ? 'warning' : 'neutral'">
            {{
              sessionReady
                ? 'Session ready'
                : statusPolling
                  ? 'Waiting for scan…'
                  : 'Not started'
            }}
          </UiBadge>
          <UiButton
            v-if="connection?.configured && !connection.onboardingComplete && sessionReady"
            size="sm"
            variant="ghost"
            :disabled="busy || !can('crm:write')"
            @click="dismissChecklist"
          >
            Mark setup complete
          </UiButton>
        </li>
      </ol>

      <ul v-if="connection?.sessions?.length" class="border-t border-line pt-4">
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
