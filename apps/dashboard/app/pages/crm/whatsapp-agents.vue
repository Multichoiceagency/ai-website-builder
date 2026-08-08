<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WhatsappAgent, WhatsappConnectionStatus } from '@platform/schemas'

/**
 * Custom AI WhatsApp agents — prompts, auto-reply, OpenWA session binding.
 */
const api = useApi()
const can = useCan()

const error = ref('')
const busy = ref(false)
const editingId = ref<string | null>(null)

const name = ref('')
const description = ref('')
const systemPrompt = ref(
  'You are a helpful support agent for this business. Answer clearly, stay polite, and hand off to a human when the customer asks for a person or something you cannot verify.',
)
const welcomeMessage = ref('Hi! How can we help you today?')
const enabled = ref(true)
const autoReply = ref(true)
const handoffKeywords = ref('human, agent, medewerker, bel me')
const openwaSessionId = ref('')

const { data: connection } = await useAsyncData('crm:whatsapp:status:agents', () =>
  api.get<WhatsappConnectionStatus>('/api/v1/crm/whatsapp/status'),
)

const { data: agents, refresh } = await useAsyncData(
  'crm:whatsapp:agents',
  () => api.get<WhatsappAgent[]>('/api/v1/crm/whatsapp/agents'),
  { default: () => [] as WhatsappAgent[] },
)

function resetForm() {
  editingId.value = null
  name.value = ''
  description.value = ''
  systemPrompt.value =
    'You are a helpful support agent for this business. Answer clearly, stay polite, and hand off to a human when the customer asks for a person or something you cannot verify.'
  welcomeMessage.value = 'Hi! How can we help you today?'
  enabled.value = true
  autoReply.value = true
  handoffKeywords.value = 'human, agent, medewerker, bel me'
  openwaSessionId.value = connection.value?.sessions?.[0]?.id ?? ''
}

function startEdit(agent: WhatsappAgent) {
  editingId.value = agent.id
  name.value = agent.name
  description.value = agent.description
  systemPrompt.value = agent.systemPrompt
  welcomeMessage.value = agent.welcomeMessage
  enabled.value = agent.enabled
  autoReply.value = agent.autoReply
  handoffKeywords.value = agent.handoffKeywords.join(', ')
  openwaSessionId.value = agent.openwaSessionId ?? ''
}

async function save() {
  if (!can('crm:write')) return
  error.value = ''
  busy.value = true
  const payload = {
    name: name.value.trim(),
    description: description.value.trim(),
    systemPrompt: systemPrompt.value.trim(),
    welcomeMessage: welcomeMessage.value.trim(),
    enabled: enabled.value,
    autoReply: autoReply.value,
    handoffKeywords: handoffKeywords.value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
    openwaSessionId: openwaSessionId.value.trim() || null,
  }
  try {
    if (editingId.value) {
      await api.patch(`/api/v1/crm/whatsapp/agents/${editingId.value}`, payload)
    } else {
      await api.post('/api/v1/crm/whatsapp/agents', payload)
    }
    resetForm()
    await refresh()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not save the agent.'
  } finally {
    busy.value = false
  }
}

async function remove(agent: WhatsappAgent) {
  if (!can('crm:write')) return
  if (!confirm(`Delete agent “${agent.name}”?`)) return
  error.value = ''
  busy.value = true
  try {
    await api.delete(`/api/v1/crm/whatsapp/agents/${agent.id}`)
    if (editingId.value === agent.id) resetForm()
    await refresh()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not delete the agent.'
  } finally {
    busy.value = false
  }
}

const sessionOptions = computed(() => [
  { label: 'No session linked', value: '' },
  ...(connection.value?.sessions ?? []).map((session) => ({
    label: `${session.name} (${session.status})`,
    value: session.id,
  })),
])
</script>

<template>
  <div>
    <UiPageHeader
      title="WhatsApp AI agents"
      description="Custom agents that auto-reply on WhatsApp via OpenWA, with handoff keywords for the support desk."
    >
      <template #actions>
        <UiButton size="sm" to="/crm/support">Support desk</UiButton>
      </template>
    </UiPageHeader>

    <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <UiCard v-if="!connection?.configured" class="mb-5">
      <p class="type-caption-12 text-soft">
        OpenWA is not connected for this workspace yet.
        <NuxtLink class="text-brand" to="/crm/support">Open the Connect OpenWA panel</NuxtLink>
        on the support desk to enter your gateway URL and API key.
      </p>
    </UiCard>

    <div class="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <UiCard>
        <h2 class="mb-4 type-button text-ink">
          {{ editingId ? 'Edit agent' : 'New agent' }}
        </h2>
        <form class="flex flex-col gap-3" @submit.prevent="save">
          <UiField v-slot="{ id }" label="Name" required>
            <UiInput :id="id" v-model="name" placeholder="Support bot" required />
          </UiField>
          <UiField v-slot="{ id }" label="Description">
            <UiInput :id="id" v-model="description" placeholder="Handles FAQs and appointment questions" />
          </UiField>
          <UiField v-slot="{ id }" label="System prompt" required>
            <UiTextarea :id="id" v-model="systemPrompt" :rows="8" required />
          </UiField>
          <UiField v-slot="{ id }" label="Welcome message">
            <UiInput :id="id" v-model="welcomeMessage" />
          </UiField>
          <UiField v-slot="{ id }" label="Handoff keywords" help="Comma-separated. Match → pause AI and notify desk.">
            <UiInput :id="id" v-model="handoffKeywords" placeholder="human, agent" />
          </UiField>
          <UiField v-slot="{ id }" label="OpenWA session">
            <UiSelect :id="id" v-model="openwaSessionId" :options="sessionOptions" />
          </UiField>
          <label class="flex items-center gap-2 type-caption-12 text-ink">
            <input v-model="enabled" type="checkbox" class="rounded border-line" />
            Enabled
          </label>
          <label class="flex items-center gap-2 type-caption-12 text-ink">
            <input v-model="autoReply" type="checkbox" class="rounded border-line" />
            Auto-reply on inbound messages
          </label>
          <div class="flex flex-wrap gap-2 pt-2">
            <UiButton
              variant="primary"
              type="submit"
              :loading="busy"
              :disabled="!can('crm:write') || !name.trim() || !systemPrompt.trim()"
            >
              {{ editingId ? 'Save changes' : 'Create agent' }}
            </UiButton>
            <UiButton v-if="editingId" type="button" :disabled="busy" @click="resetForm">Cancel</UiButton>
          </div>
        </form>
      </UiCard>

      <div class="flex flex-col gap-3">
        <UiCard v-for="agent in agents" :key="agent.id">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="type-button text-ink">{{ agent.name }}</p>
              <p class="mt-1 type-caption-12 text-soft">{{ agent.description || 'No description' }}</p>
              <div class="mt-2 flex flex-wrap gap-1">
                <UiBadge :tone="agent.enabled ? 'positive' : 'neutral'">
                  {{ agent.enabled ? 'Enabled' : 'Disabled' }}
                </UiBadge>
                <UiBadge :tone="agent.autoReply ? 'brand' : 'neutral'">
                  {{ agent.autoReply ? 'Auto-reply' : 'Manual only' }}
                </UiBadge>
                <UiBadge tone="neutral">
                  {{ agent.openwaSessionId ? 'Session linked' : 'No session' }}
                </UiBadge>
              </div>
            </div>
            <div class="flex shrink-0 flex-col gap-1">
              <UiButton size="sm" :disabled="!can('crm:write')" @click="startEdit(agent)">Edit</UiButton>
              <UiButton size="sm" :disabled="!can('crm:write') || busy" @click="remove(agent)">Delete</UiButton>
            </div>
          </div>
        </UiCard>
        <UiEmptyState
          v-if="!agents.length"
          title="No agents yet"
          description="Create one to auto-reply on WhatsApp and hand off to the support desk."
        />
      </div>
    </div>
  </div>
</template>
