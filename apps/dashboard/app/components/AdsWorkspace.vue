<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ADS_PROVIDER_LABELS,
  type AdsConnectResult,
  type AdsGuardrails,
  type AdsProviderId,
  type AdsProviderStatus,
  type Campaign,
  type CampaignDraft,
  type CampaignDraftPreview,
} from '@platform/schemas'
import type { CampaignRow } from './CampaignTable.vue'

/**
 * The ads workspace, for any network.
 *
 * `/growth/google-ads` and `/growth/meta-ads` are the same screen with a
 * different `provider` prop — which is the visible payoff of ADR-0006. If this
 * component ever needs an `if (provider === 'google_ads')`, the adapter
 * underneath it is leaking and the fix belongs there, not here.
 */
const props = defineProps<{ provider: AdsProviderId }>()

const api = useApi()
const can = useCan()
const label = computed(() => ADS_PROVIDER_LABELS[props.provider])

interface CampaignListResult {
  providerStatuses: AdsProviderStatus[]
  items: Campaign[]
}

// The provider is fixed for the lifetime of the page, so the cache keys can be
// plain strings — but they must differ per network, or navigating between the
// two ad screens would show one network's data under the other's heading.
const statusKey = `ads-status-${props.provider}`
const campaignsKey = `ads-campaigns-${props.provider}`

const { data: status, refresh: refreshStatus } = await useAsyncData(
  statusKey,
  async () => {
    const all = await api.get<AdsProviderStatus[]>('/api/v1/ads/providers')
    return all.find((entry) => entry.provider === props.provider) ?? null
  },
)

const {
  data: campaigns,
  pending,
  refresh: refreshCampaigns,
} = await useAsyncData(campaignsKey, () =>
  api.get<CampaignListResult>('/api/v1/ads/campaigns', { provider: props.provider }),
)

const { data: guardrails } = await useAsyncData('ads-guardrails', () =>
  api.get<AdsGuardrails>('/api/v1/ads/guardrails'),
)

const rows = computed<CampaignRow[]>(() => campaigns.value?.items ?? [])
const drafts = computed(() => rows.value.filter((campaign) => campaign.status === 'draft'))

function money(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(amountMinor / 100)
}

// region Connecting

const connectResult = ref<AdsConnectResult | null>(null)
const connecting = ref(false)

async function connect() {
  connecting.value = true
  try {
    connectResult.value = await api.post<AdsConnectResult>(`/api/v1/ads/providers/${props.provider}/connect`, {})
    if (connectResult.value.authorizationUrl) {
      window.location.href = connectResult.value.authorizationUrl
      return
    }
    await refreshStatus()
  } catch (caught) {
    connectResult.value = {
      status: 'unconfigured',
      authorizationUrl: null,
      reason: caught instanceof ApiError ? caught.message : 'Could not reach the platform API.',
      missingConfiguration: [],
      requiredScopes: [],
      requiredApis: [],
    }
  } finally {
    connecting.value = false
  }
}

// endregion

// region AI drafting

const drafting = ref(false)
const briefOpen = ref(false)
const prompt = ref('')
const landingPageUrl = ref('')
const dailyBudget = ref('20')
const draftError = ref('')
const preview = ref<CampaignDraftPreview | null>(null)

const exampleBrief =
  props.provider === 'google_ads'
    ? 'Create a Google Ads campaign for emergency plumbers in Rotterdam'
    : 'Create a Meta campaign for a beauty salon in Utrecht'

/**
 * Step one of two. `save: false` means this call writes nothing: it returns a
 * proposal to look at. Creating the draft is a second, deliberate act, and
 * publishing it is a third (ADR-0007).
 */
async function requestDraft() {
  draftError.value = ''
  drafting.value = true
  try {
    preview.value = await api.post<CampaignDraftPreview>('/api/v1/ads/campaigns/draft-with-ai', {
      provider: props.provider,
      prompt: prompt.value,
      landingPageUrl: landingPageUrl.value,
      dailyBudgetMinor: Math.round(Number(dailyBudget.value || '0') * 100),
      save: false,
    })
    briefOpen.value = false
  } catch (caught) {
    draftError.value = caught instanceof ApiError ? caught.message : 'Could not draft the campaign.'
  } finally {
    drafting.value = false
  }
}

/** Step two: persist the proposal as a draft. Still not live anywhere. */
async function saveDraft() {
  if (!preview.value) return
  drafting.value = true
  try {
    await api.post<Campaign>('/api/v1/ads/campaigns', preview.value.draft satisfies CampaignDraft)
    preview.value = null
    prompt.value = ''
    await refreshCampaigns()
  } catch (caught) {
    draftError.value = caught instanceof ApiError ? caught.message : 'Could not save the draft.'
  } finally {
    drafting.value = false
  }
}

// endregion

// region Publishing

const publishing = ref<CampaignRow | null>(null)
const publishError = ref('')
const publishBusy = ref(false)

/**
 * The confirmation echoes the budget back to the API. If the draft moved since
 * this dialog opened, the server refuses — so what gets published is what was
 * on screen when the button was pressed.
 */
async function publish() {
  const target = publishing.value
  if (!target?.id) return

  publishError.value = ''
  publishBusy.value = true
  try {
    await api.post<Campaign>(`/api/v1/ads/campaigns/${target.id}/publish`, {
      confirm: true,
      acknowledgedBudgetMinor: target.budget.amountMinor,
    })
    publishing.value = null
    await refreshCampaigns()
  } catch (caught) {
    publishError.value = caught instanceof ApiError ? caught.message : 'Could not publish the campaign.'
  } finally {
    publishBusy.value = false
  }
}

// endregion
</script>

<template>
  <div>
    <UiPageHeader :title="label" description="Campaigns, keywords and conversions — drafted here, published only on your say-so.">
      <template #actions>
        <UiButton v-if="can('ads:write')" size="sm" variant="primary" @click="briefOpen = true">
          Draft with AI
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Connection state. Three separate facts, because "the operator has not
         set this up" and "you have not connected an account" need different
         actions from whoever is reading. -->
    <UiCard class="mb-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h2 class="text-heading font-semibold text-ink">Connection</h2>
            <UiBadge v-if="status?.available" tone="positive">Connected</UiBadge>
            <UiBadge v-else-if="status?.configured" tone="warning">Not connected</UiBadge>
            <UiBadge v-else tone="neutral">Not available on this installation</UiBadge>
          </div>
          <p v-if="status?.reason" class="mt-1.5 max-w-2xl text-[0.875rem] leading-relaxed text-soft">
            {{ status.reason }}
          </p>
          <p v-else-if="status?.connectedAccountName" class="mt-1.5 text-[0.875rem] text-soft">
            {{ status.connectedAccountName }}
          </p>
        </div>

        <UiButton
          v-if="can('ads:write') && !status?.connected"
          size="sm"
          :loading="connecting"
          :disabled="!status?.configured"
          @click="connect"
        >
          Connect {{ label }}
        </UiButton>
      </div>

      <div v-if="status && !status.configured" class="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 class="text-label font-semibold uppercase text-faint">Your administrator needs to set</h3>
          <ul class="mt-2 flex flex-col gap-1">
            <li
              v-for="name in status.missingConfiguration"
              :key="name"
              class="font-mono text-[0.8125rem] text-ink"
            >
              {{ name }}
            </li>
          </ul>
        </div>
        <div>
          <h3 class="text-label font-semibold uppercase text-faint">APIs and scopes required</h3>
          <ul class="mt-2 flex flex-col gap-1 text-[0.8125rem] text-soft">
            <li v-for="entry in status.requiredApis" :key="entry">{{ entry }}</li>
            <li v-for="scope in status.requiredScopes" :key="scope" class="font-mono break-all">{{ scope }}</li>
          </ul>
        </div>
      </div>

      <p v-if="connectResult && connectResult.status === 'unconfigured'" class="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-[0.8125rem] text-warning" role="status">
        {{ connectResult.reason }}
      </p>
    </UiCard>

    <div class="mb-5 grid gap-3 sm:grid-cols-3">
      <UiStat label="Campaigns" :value="rows.length" />
      <UiStat label="Awaiting your approval" :value="drafts.length" hint="Drafts never spend anything." />
      <UiStat
        v-if="guardrails"
        label="Spend ceiling"
        :value="money(guardrails.maxDailyBudgetMinor, guardrails.currency)"
        hint="Per campaign, per day. Changes above this are refused."
      />
    </div>

    <!-- One table for every network. -->
    <CampaignTable
      :campaigns="rows"
      :pending="pending"
      :can-write="can('ads:write')"
      @publish="publishing = $event"
    />

    <p v-if="status && !status.available" class="mt-3 text-[0.8125rem] text-faint">
      Performance figures stay empty until an account is connected. Nothing on this page is estimated.
    </p>

    <!-- Brief -->
    <UiDialog
      v-model:open="briefOpen"
      title="Draft a campaign"
      description="Describe what you want to advertise. You will see the whole campaign before anything is created."
    >
      <form class="flex flex-col gap-4" @submit.prevent="requestDraft">
        <UiField v-slot="{ id, describedBy }" label="What should this campaign do?" :help="`For example: ${exampleBrief}`" required>
          <UiTextarea :id="id" v-model="prompt" :described-by="describedBy" :rows="3" />
        </UiField>
        <UiField v-slot="{ id, describedBy }" label="Landing page" help="The page the ads send people to.">
          <UiInput :id="id" v-model="landingPageUrl" :described-by="describedBy" placeholder="/diensten/spoed" />
        </UiField>
        <UiField v-slot="{ id, describedBy }" label="Daily budget" help="In euros. You can change this before publishing.">
          <UiInput :id="id" v-model="dailyBudget" :described-by="describedBy" type="number" />
        </UiField>
        <p v-if="draftError" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
          {{ draftError }}
        </p>
      </form>

      <template #footer>
        <UiButton @click="briefOpen = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="drafting" :disabled="prompt.trim().length < 10" @click="requestDraft">
          Draft it
        </UiButton>
      </template>
    </UiDialog>

    <!-- Proposal. Nothing has been written at this point. -->
    <UiDialog
      :open="Boolean(preview)"
      title="Review the draft"
      description="Nothing has been created yet, and nothing will be published until you say so."
      @update:open="preview = null"
    >
      <div v-if="preview" class="flex flex-col gap-4 text-[0.875rem]">
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <p class="text-label font-semibold uppercase text-faint">Campaign</p>
            <p class="mt-1 font-medium text-ink">{{ preview.draft.name }}</p>
          </div>
          <div>
            <p class="text-label font-semibold uppercase text-faint">Budget</p>
            <p class="mt-1 font-medium text-ink">
              {{ money(preview.draft.budget.amountMinor, preview.draft.budget.currency) }} per day
            </p>
          </div>
        </div>

        <div v-for="group in preview.draft.adGroups" :key="group.name" class="rounded-lg border border-line p-4">
          <p class="font-medium text-ink">{{ group.name }}</p>
          <p class="mt-2 text-[0.8125rem] text-soft">
            {{ group.keywords.length }} keywords · {{ group.negativeKeywords.length }} negatives ·
            {{ group.ads.length }} ad
          </p>
          <ul class="mt-2 flex flex-wrap gap-1.5">
            <li v-for="keyword in group.keywords.slice(0, 8)" :key="`${keyword.text}-${keyword.matchType}`">
              <UiBadge>{{ keyword.text }} · {{ keyword.matchType }}</UiBadge>
            </li>
          </ul>
          <ul v-if="group.ads[0]" class="mt-3 flex flex-col gap-1 text-[0.8125rem] text-soft">
            <li v-for="headline in group.ads[0].headlines.slice(0, 4)" :key="headline">“{{ headline }}”</li>
          </ul>
        </div>

        <!-- What it had to guess, stated before anyone approves it. -->
        <div v-if="preview.draft.assumptions.length" class="rounded-lg bg-sunken px-4 py-3">
          <p class="text-label font-semibold uppercase text-faint">Assumptions made</p>
          <ul class="mt-2 flex flex-col gap-1 text-[0.8125rem] text-soft">
            <li v-for="entry in preview.draft.assumptions" :key="entry">{{ entry }}</li>
          </ul>
        </div>

        <div v-if="preview.draft.warnings.length" class="rounded-lg bg-warning-soft px-4 py-3">
          <p class="text-label font-semibold uppercase text-warning">Check before publishing</p>
          <ul class="mt-2 flex flex-col gap-1 text-[0.8125rem] text-warning">
            <li v-for="entry in preview.draft.warnings" :key="entry">{{ entry }}</li>
          </ul>
        </div>

        <p class="text-[0.75rem] text-faint">Written by {{ preview.model }}.</p>
      </div>

      <template #footer>
        <UiButton @click="preview = null">Discard</UiButton>
        <UiButton variant="primary" :loading="drafting" @click="saveDraft">Save as draft</UiButton>
      </template>
    </UiDialog>

    <!-- Publish confirmation. The one place spend starts. -->
    <UiDialog
      :open="Boolean(publishing)"
      title="Publish this campaign?"
      description="This sends the campaign to the ad network. It is created paused, but the budget below is what it is set up to spend."
      @update:open="publishing = null"
    >
      <div v-if="publishing" class="flex flex-col gap-3 text-[0.875rem]">
        <p class="font-medium text-ink">{{ publishing.name }}</p>
        <p class="text-soft">
          Budget:
          <strong class="text-ink">{{ money(publishing.budget.amountMinor, publishing.budget.currency) }}</strong>
          {{ publishing.budget.period === 'daily' ? 'per day' : publishing.budget.period }}
        </p>
        <p v-if="publishError" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
          {{ publishError }}
        </p>
      </div>

      <template #footer>
        <UiButton @click="publishing = null">Cancel</UiButton>
        <UiButton variant="primary" :loading="publishBusy" @click="publish">Publish</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
