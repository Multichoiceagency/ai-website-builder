<script setup lang="ts">
import { computed } from 'vue'
import { ADS_PROVIDER_LABELS, type AdsProviderId, type CampaignStatus } from '@platform/schemas'

/**
 * One campaign table, for every ad network (ADR-0006).
 *
 * There is no `GoogleAdsTable` and no `MetaAdsTable`, and there will be no
 * `TikTokAdsTable`. This component reads only platform-owned fields, which is
 * possible precisely because the adapters mapped every vendor shape into ours
 * before the data got anywhere near a component. Adding a network adds rows
 * here, not a file.
 *
 * The prop type is the shared subset rather than the full `Campaign`, so the
 * same table renders a draft that only exists here and a campaign read back
 * from a network, which has no platform id yet.
 */
export interface CampaignRow {
  id?: string
  provider: AdsProviderId
  externalId: string | null
  name: string
  objective: string
  channel: string
  status: CampaignStatus
  budget: { amountMinor: number; currency: string; period: string }
  source?: 'manual' | 'ai' | 'imported'
  warnings?: string[]
}

const props = withDefaults(
  defineProps<{
    campaigns: CampaignRow[]
    /** Hide the provider column when the table already sits under one network. */
    showProvider?: boolean
    pending?: boolean
    canWrite?: boolean
  }>(),
  { showProvider: false, pending: false, canWrite: false },
)

const emit = defineEmits<{ open: [CampaignRow]; publish: [CampaignRow] }>()

/**
 * Status tones. `draft` is deliberately the loudest thing on the row that is
 * not an error: "this is not live" is the single most important fact about a
 * campaign, and a user must never have to squint to find it.
 */
const STATUS_TONE: Record<CampaignStatus, 'neutral' | 'positive' | 'warning' | 'danger' | 'brand'> = {
  draft: 'warning',
  active: 'positive',
  paused: 'neutral',
  ended: 'neutral',
  archived: 'neutral',
}

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: 'Draft — not live',
  active: 'Active',
  paused: 'Paused',
  ended: 'Ended',
  archived: 'Archived',
}

const PERIOD_LABEL: Record<string, string> = {
  daily: 'per day',
  monthly: 'per month',
  lifetime: 'total',
}

function money(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    amountMinor / 100,
  )
}

/** Drafts first: they are the ones waiting on a decision. */
const ordered = computed(() =>
  [...props.campaigns].sort((a, b) => Number(b.status === 'draft') - Number(a.status === 'draft')),
)

const totalDailyMinor = computed(() =>
  props.campaigns
    .filter((campaign) => campaign.status === 'active' && campaign.budget.period === 'daily')
    .reduce((sum, campaign) => sum + campaign.budget.amountMinor, 0),
)

const currency = computed(() => props.campaigns[0]?.budget.currency ?? 'EUR')
</script>

<template>
  <div class="overflow-hidden rounded-card border border-line bg-raised">
    <table class="w-full border-collapse text-left text-[0.875rem]">
      <caption class="sr-only">
        Advertising campaigns, with their status and budget
      </caption>
      <thead>
        <tr class="border-b border-line text-label uppercase text-faint">
          <th scope="col" class="px-5 py-3 font-semibold">Campaign</th>
          <th v-if="showProvider" scope="col" class="px-5 py-3 font-semibold">Network</th>
          <th scope="col" class="px-5 py-3 font-semibold">Goal</th>
          <th scope="col" class="px-5 py-3 font-semibold">Status</th>
          <th scope="col" class="px-5 py-3 text-right font-semibold">Budget</th>
          <th scope="col" class="px-5 py-3"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="pending">
          <td class="px-5 py-8 text-center text-soft" :colspan="showProvider ? 6 : 5">Loading campaigns…</td>
        </tr>

        <tr
          v-for="campaign in ordered"
          v-else
          :key="campaign.id ?? `${campaign.provider}:${campaign.externalId}`"
          class="border-b border-line/60 last:border-b-0 transition-colors duration-150 hover:bg-sunken/50"
        >
          <td class="px-5 py-3.5">
            <button
              type="button"
              class="text-left font-medium text-ink underline-offset-2 hover:underline"
              @click="emit('open', campaign)"
            >
              {{ campaign.name }}
            </button>
            <p class="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.75rem] text-faint">
              <span>{{ campaign.channel.replace('_', ' ') }}</span>
              <!-- An AI-drafted campaign stays labelled for life. Knowing which
                   campaigns an agent wrote is not a detail. -->
              <UiBadge v-if="campaign.source === 'ai'" tone="brand">AI draft</UiBadge>
              <UiBadge v-if="campaign.warnings?.length" tone="warning">
                {{ campaign.warnings.length }} to check
              </UiBadge>
            </p>
          </td>

          <td v-if="showProvider" class="px-5 py-3.5 text-soft">
            {{ ADS_PROVIDER_LABELS[campaign.provider] }}
          </td>

          <td class="px-5 py-3.5 text-soft">{{ campaign.objective }}</td>

          <td class="px-5 py-3.5">
            <UiBadge :tone="STATUS_TONE[campaign.status]">{{ STATUS_LABEL[campaign.status] }}</UiBadge>
          </td>

          <td class="px-5 py-3.5 text-right tabular-nums text-ink">
            {{ money(campaign.budget.amountMinor, campaign.budget.currency) }}
            <span class="block text-[0.75rem] text-faint">{{ PERIOD_LABEL[campaign.budget.period] }}</span>
          </td>

          <td class="px-5 py-3.5 text-right">
            <UiButton
              v-if="canWrite && campaign.status === 'draft' && campaign.id"
              size="sm"
              variant="primary"
              @click="emit('publish', campaign)"
            >
              Review &amp; publish
            </UiButton>
          </td>
        </tr>

        <tr v-if="!pending && !campaigns.length">
          <td class="px-5 py-10 text-center text-soft" :colspan="showProvider ? 6 : 5">
            No campaigns yet.
          </td>
        </tr>
      </tbody>

      <tfoot v-if="totalDailyMinor > 0">
        <tr class="border-t border-line bg-sunken/40">
          <td class="px-5 py-3 text-[0.8125rem] font-medium text-soft" :colspan="showProvider ? 4 : 3">
            Active daily spend
          </td>
          <td class="px-5 py-3 text-right text-[0.8125rem] font-semibold tabular-nums text-ink">
            {{ money(totalDailyMinor, currency) }}
          </td>
          <td />
        </tr>
      </tfoot>
    </table>
  </div>
</template>
