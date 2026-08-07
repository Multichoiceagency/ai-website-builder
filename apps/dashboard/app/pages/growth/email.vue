<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  EmailCampaign,
  EmailFlow,
  EmailProviderStatus,
  EmailSegment,
} from '@platform/schemas'

const api = useApi()
const can = useCan()

const { data: status } = await useAsyncData(
  'email:status',
  () => api.get<EmailProviderStatus>('/api/v1/crm/email/status'),
  { default: () => null },
)

const { data: campaigns, refresh: refreshCampaigns } = await useAsyncData(
  'email:campaigns',
  () => api.get<EmailCampaign[]>('/api/v1/crm/email/campaigns'),
  { default: () => [] as EmailCampaign[] },
)

const { data: segments } = await useAsyncData(
  'email:segments',
  () => api.get<EmailSegment[]>('/api/v1/crm/email/segments'),
  { default: () => [] as EmailSegment[] },
)

const { data: flows, refresh: refreshFlows } = await useAsyncData(
  'email:flows',
  () => api.get<EmailFlow[]>('/api/v1/crm/email/flows'),
  { default: () => [] as EmailFlow[] },
)

const error = ref('')
const busyId = ref('')

const STATUS_TONES: Record<string, 'neutral' | 'positive' | 'warning' | 'danger' | 'brand'> = {
  draft: 'neutral',
  scheduled: 'brand',
  sending: 'warning',
  sent: 'positive',
  failed: 'danger',
}

const segmentOptions = computed(() => [
  { label: 'Everyone who opted in', value: '' },
  ...segments.value.map((segment) => ({
    label: `${segment.name} (${segment.memberCount})`,
    value: segment.id,
  })),
])

// Creating a campaign
const creating = ref(false)
const name = ref('')
const subject = ref('')
const bodyHtml = ref('')
const segmentId = ref('')

async function createCampaign() {
  error.value = ''
  busyId.value = 'new'
  try {
    await api.post('/api/v1/crm/email/campaigns', {
      name: name.value,
      subject: subject.value,
      bodyHtml: bodyHtml.value,
      segmentId: segmentId.value || null,
    })
    creating.value = false
    name.value = ''
    subject.value = ''
    bodyHtml.value = ''
    await refreshCampaigns()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not create the campaign.'
  } finally {
    busyId.value = ''
  }
}

async function send(campaign: EmailCampaign) {
  error.value = ''
  busyId.value = campaign.id
  try {
    await api.post(`/api/v1/crm/email/campaigns/${campaign.id}/send`)
    await refreshCampaigns()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not send the campaign.'
  } finally {
    busyId.value = ''
  }
}

async function installFlows() {
  error.value = ''
  busyId.value = 'flows'
  try {
    await api.post('/api/v1/crm/email/flows/install-defaults')
    await refreshFlows()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not install the flows.'
  } finally {
    busyId.value = ''
  }
}

async function toggleFlow(flow: EmailFlow) {
  error.value = ''
  busyId.value = flow.id
  try {
    await api.post(`/api/v1/crm/email/flows/${flow.key}/enable`, { enabled: !flow.enabled })
    await refreshFlows()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not change the flow.'
  } finally {
    busyId.value = ''
  }
}

function when(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div>
    <UiPageHeader title="Email" description="Campaigns, transactional sends and automated flows.">
      <template #actions>
        <UiButton v-if="can('email:write')" size="sm" variant="primary" @click="creating = true">
          New campaign
        </UiButton>
      </template>
    </UiPageHeader>

    <!--
      Sending capability, stated plainly and first. A dashboard that shows a
      Send button without saying nothing is configured is a dashboard that will
      report "sent" for mail that never left.
    -->
    <UiCard v-if="status" class="mb-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h2 class="text-heading font-semibold text-ink">Sending</h2>
            <UiBadge :tone="status.configured ? 'positive' : 'warning'">
              {{ status.configured ? 'Connected' : 'Not configured' }}
            </UiBadge>
          </div>
          <p v-if="status.configured" class="mt-1 text-[0.8125rem] text-soft">
            Mail is delivered over SMTP as {{ status.defaultFromName }} &lt;{{ status.defaultFromEmail }}&gt;.
          </p>
          <p v-else class="mt-1 max-w-xl text-[0.8125rem] leading-relaxed text-soft">
            No mail server is configured here, so campaigns are recorded and rendered but nothing is delivered.
            Everything below still works — the messages simply do not leave the building.
          </p>
        </div>

        <div v-if="!status.configured && status.missing.length" class="shrink-0 text-right">
          <p class="text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-faint">Missing settings</p>
          <ul class="mt-1 flex flex-col gap-0.5">
            <li v-for="key in status.missing" :key="key" class="font-mono text-[0.75rem] text-soft">{{ key }}</li>
          </ul>
        </div>
      </div>
    </UiCard>

    <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <div class="grid gap-5 xl:grid-cols-[1.5fr_1fr] xl:items-start">
      <UiCard :padded="false">
        <div class="flex items-center justify-between px-5 py-4">
          <h2 class="text-heading font-semibold text-ink">Campaigns</h2>
          <span class="text-[0.8125rem] text-faint">{{ campaigns.length }}</span>
        </div>

        <p v-if="!campaigns.length" class="border-t border-line px-5 py-10 text-center text-sm text-soft">
          No campaigns yet.
        </p>

        <ul v-else class="divide-y divide-line border-t border-line">
          <li
            v-for="campaign in campaigns"
            :key="campaign.id"
            class="flex flex-wrap items-center gap-4 px-5 py-3.5 transition-colors hover:bg-sunken/60"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-ink">{{ campaign.name }}</p>
              <p class="truncate text-[0.8125rem] text-faint">
                {{ campaign.subject }}
                <span v-if="campaign.segmentName"> · {{ campaign.segmentName }}</span>
              </p>
            </div>

            <div class="shrink-0 text-right text-[0.8125rem] tabular-nums text-faint">
              <p v-if="campaign.status === 'sent'">
                {{ campaign.stats.sent }} sent
                <span v-if="campaign.stats.failed"> · {{ campaign.stats.failed }} failed</span>
              </p>
              <p>{{ when(campaign.sentAt ?? campaign.scheduledAt) }}</p>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <UiBadge :tone="STATUS_TONES[campaign.status] ?? 'neutral'">{{ campaign.status }}</UiBadge>
              <UiButton
                v-if="can('email:write') && campaign.status !== 'sent'"
                size="sm"
                :loading="busyId === campaign.id"
                @click="send(campaign)"
              >
                Send
              </UiButton>
            </div>
          </li>
        </ul>
      </UiCard>

      <div class="flex flex-col gap-4">
        <UiCard :padded="false">
          <div class="flex items-center justify-between px-5 py-4">
            <h2 class="text-heading font-semibold text-ink">Flows</h2>
            <UiButton
              v-if="can('email:write') && !flows.length"
              size="sm"
              :loading="busyId === 'flows'"
              @click="installFlows"
            >
              Install
            </UiButton>
          </div>

          <p v-if="!flows.length" class="border-t border-line px-5 py-8 text-[0.8125rem] leading-relaxed text-soft">
            Abandoned cart, post-purchase, win-back, review request and lead nurture. They install disabled, so
            nothing is sent until you have read the copy.
          </p>

          <ul v-else class="divide-y divide-line border-t border-line">
            <li v-for="flow in flows" :key="flow.id" class="flex items-center gap-3 px-5 py-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-[0.875rem] font-medium text-ink">{{ flow.name }}</p>
                <p class="truncate text-[0.75rem] text-faint">
                  {{ flow.steps.length }} step{{ flow.steps.length === 1 ? '' : 's' }}
                  <span v-if="flow.triggerEvent"> · {{ flow.triggerEvent }}</span>
                </p>
              </div>
              <UiSwitch
                :model-value="flow.enabled"
                :label="`Enable ${flow.name}`"
                :disabled="!can('email:write') || busyId === flow.id"
                @update:model-value="toggleFlow(flow)"
              />
            </li>
          </ul>
        </UiCard>

        <UiCard>
          <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Segments</h2>
          <p v-if="!segments.length" class="text-[0.8125rem] text-soft">
            No segments yet. A campaign without one goes to everyone who opted in.
          </p>
          <ul v-else class="flex flex-col gap-2">
            <li v-for="segment in segments" :key="segment.id" class="flex items-center justify-between gap-3">
              <span class="truncate text-[0.875rem] text-ink">{{ segment.name }}</span>
              <span class="shrink-0 text-[0.8125rem] tabular-nums text-faint">{{ segment.memberCount }}</span>
            </li>
          </ul>
        </UiCard>
      </div>
    </div>

    <UiDialog v-model:open="creating" title="New campaign" wide>
      <form class="flex flex-col gap-4" @submit.prevent="createCampaign">
        <UiField v-slot="{ id }" label="Internal name" required>
          <UiInput :id="id" v-model="name" placeholder="Spring update" />
        </UiField>
        <UiField v-slot="{ id, describedBy }" label="Subject" help="Use {{ firstName }} to greet the recipient." required>
          <UiInput :id="id" v-model="subject" :described-by="describedBy" placeholder="Hello {{ firstName }}" />
        </UiField>
        <UiField v-slot="{ id }" label="Audience">
          <UiSelect :id="id" v-model="segmentId" :options="segmentOptions" />
        </UiField>
        <UiField v-slot="{ id }" label="Message">
          <UiTextarea :id="id" v-model="bodyHtml" :rows="6" placeholder="<p>Hello {{ firstName }},</p>" />
        </UiField>
      </form>
      <template #footer>
        <UiButton @click="creating = false">Cancel</UiButton>
        <UiButton
          variant="primary"
          :loading="busyId === 'new'"
          :disabled="!name.trim() || !subject.trim()"
          @click="createCampaign"
        >
          Create
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>
