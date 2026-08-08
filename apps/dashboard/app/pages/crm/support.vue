<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  WhatsappAgent,
  WhatsappConnectionStatus,
  WhatsappMessage,
  WhatsappTicket,
  WhatsappTicketStatus,
} from '@platform/schemas'

/**
 * Full WhatsApp support desk — inbox, thread, human reply.
 * AI agents are configured on /crm/whatsapp-agents.
 */
const api = useApi()
const can = useCan()
const activeTenantId = useActiveTenantId()

const statusFilter = ref<'' | WhatsappTicketStatus>('')
const selectedId = ref('')
const reply = ref('')
const busy = ref(false)
const error = ref('')

const STATUS_OPTIONS = [
  { label: 'All tickets', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Pending', value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
]

const { data: connection, refresh: refreshConnection } = await useAsyncData(
  'crm:whatsapp:status',
  () => api.get<WhatsappConnectionStatus>('/api/v1/crm/whatsapp/status'),
)

async function onConnectionSaved(status: WhatsappConnectionStatus) {
  connection.value = status
}

const { data: tickets, refresh: refreshTickets } = await useAsyncData(
  () => `crm:whatsapp:tickets:${statusFilter.value}`,
  () =>
    api.get<WhatsappTicket[]>('/api/v1/crm/whatsapp/tickets', {
      status: statusFilter.value || undefined,
      limit: 100,
    }),
  { watch: [statusFilter], default: () => [] as WhatsappTicket[] },
)

const { data: thread, refresh: refreshThread } = await useAsyncData(
  () => `crm:whatsapp:thread:${selectedId.value}`,
  () =>
    selectedId.value
      ? api.get<{ ticket: WhatsappTicket; messages: WhatsappMessage[] }>(
          `/api/v1/crm/whatsapp/tickets/${selectedId.value}`,
        )
      : Promise.resolve(null),
  { watch: [selectedId], default: () => null },
)

watch(tickets, (list) => {
  if (!selectedId.value && list?.[0]) selectedId.value = list[0].id
}, { immediate: true })

const openCount = computed(() => tickets.value.filter((ticket) => ticket.status === 'open').length)
const webhookUrl = computed(() => {
  const config = useRuntimeConfig()
  const tenant = activeTenantId.value
  if (!tenant) return ''
  return `${config.public.coreApiUrl}/api/v1/crm/whatsapp/webhook?tenantId=${tenant}`
})

async function sendReply() {
  if (!selectedId.value || !reply.value.trim() || !can('crm:write')) return
  error.value = ''
  busy.value = true
  try {
    await api.post(`/api/v1/crm/whatsapp/tickets/${selectedId.value}/reply`, {
      body: reply.value.trim(),
    })
    reply.value = ''
    await Promise.all([refreshThread(), refreshTickets()])
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not send the reply.'
  } finally {
    busy.value = false
  }
}

async function setStatus(next: WhatsappTicketStatus) {
  if (!selectedId.value || !can('crm:write')) return
  error.value = ''
  busy.value = true
  try {
    await api.patch(`/api/v1/crm/whatsapp/tickets/${selectedId.value}`, { status: next })
    await Promise.all([refreshThread(), refreshTickets()])
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not update the ticket.'
  } finally {
    busy.value = false
  }
}

function authorLabel(author: WhatsappMessage['author']) {
  if (author === 'customer') return 'Customer'
  if (author === 'ai') return 'AI agent'
  if (author === 'system') return 'System'
  return 'Agent'
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Support desk"
      description="WhatsApp inbox powered by OpenWA. AI agents answer first; humans take over from here."
    >
      <template #actions>
        <UiButton size="sm" to="/crm/whatsapp-agents">AI agents</UiButton>
        <UiButton size="sm" :loading="busy" @click="() => { refreshTickets(); refreshConnection() }">
          Refresh
        </UiButton>
      </template>
    </UiPageHeader>

    <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <section class="mb-5 grid gap-3 sm:grid-cols-3">
      <UiStat label="Open" :value="openCount" hint="Needs attention" />
      <UiStat
        label="Gateway"
        :value="connection?.reachable ? 'Online' : connection?.configured ? 'Down' : 'Off'"
        :hint="connection?.reason || connection?.baseUrl || 'Open Connect OpenWA below'"
      />
      <UiStat
        label="Sessions"
        :value="connection?.sessions?.length ?? 0"
        hint="OpenWA WhatsApp sessions"
      />
    </section>

    <OpenWaOnboardingPanel
      :connection="connection"
      :webhook-url="webhookUrl"
      @saved="onConnectionSaved"
    />

    <div class="grid min-h-[32rem] gap-4 lg:grid-cols-[18rem_1fr]">
      <UiCard class="flex flex-col overflow-hidden p-0">
        <div class="border-b border-line p-3">
          <UiSelect v-model="statusFilter" :options="STATUS_OPTIONS" aria-label="Filter tickets" />
        </div>
        <ul class="min-h-0 flex-1 overflow-y-auto">
          <li v-for="ticket in tickets" :key="ticket.id">
            <button
              type="button"
              class="flex w-full cursor-pointer flex-col gap-0.5 border-b border-line px-3 py-3 text-left transition-colors duration-150"
              :class="selectedId === ticket.id ? 'bg-sunken' : 'hover:bg-sunken/50'"
              @click="selectedId = ticket.id"
            >
              <span class="flex items-center justify-between gap-2">
                <span class="truncate type-button-12 text-ink">
                  {{ ticket.contactName || ticket.contactPhone }}
                </span>
                <UiBadge v-if="ticket.unreadCount" tone="brand">{{ ticket.unreadCount }}</UiBadge>
              </span>
              <span class="truncate type-caption-12 text-soft">{{ ticket.subject || ticket.chatId }}</span>
            </button>
          </li>
          <li v-if="!tickets.length" class="p-6 text-center type-caption-12 text-soft">
            No tickets yet.
          </li>
        </ul>
      </UiCard>

      <UiCard class="flex min-h-0 flex-col overflow-hidden p-0">
        <template v-if="thread">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div class="min-w-0">
              <p class="type-button text-ink">
                {{ thread.ticket.contactName || thread.ticket.contactPhone }}
              </p>
              <p class="type-caption-12 text-soft">{{ thread.ticket.chatId }}</p>
            </div>
            <div class="flex flex-wrap gap-1">
              <UiBadge tone="neutral">{{ thread.ticket.status }}</UiBadge>
              <UiButton
                v-if="can('crm:write') && thread.ticket.status !== 'resolved'"
                size="sm"
                :disabled="busy"
                @click="setStatus('resolved')"
              >Resolve</UiButton>
              <UiButton
                v-if="can('crm:write') && thread.ticket.status === 'resolved'"
                size="sm"
                :disabled="busy"
                @click="setStatus('open')"
              >Reopen</UiButton>
            </div>
          </div>

          <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <div
              v-for="message in thread.messages"
              :key="message.id"
              class="max-w-[85%] rounded-xl px-3 py-2"
              :class="
                message.direction === 'inbound'
                  ? 'bg-sunken text-ink'
                  : 'ml-auto bg-brand-soft text-ink'
              "
            >
              <p class="type-button-10 text-soft">{{ authorLabel(message.author) }}</p>
              <p class="whitespace-pre-wrap type-caption-12">{{ message.body }}</p>
            </div>
          </div>

          <form
            v-if="can('crm:write')"
            class="flex gap-2 border-t border-line p-3"
            @submit.prevent="sendReply"
          >
            <UiInput v-model="reply" class="flex-1" placeholder="Reply on WhatsApp…" />
            <UiButton variant="primary" type="submit" :loading="busy" :disabled="!reply.trim()">
              Send
            </UiButton>
          </form>
        </template>
        <div v-else class="grid flex-1 place-items-center type-caption-12 text-soft">
          Select a conversation
        </div>
      </UiCard>
    </div>
  </div>
</template>
