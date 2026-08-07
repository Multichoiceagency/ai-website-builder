<script setup lang="ts">
import { computed } from 'vue'
import type { AiModelAvailability, Plan } from '@platform/schemas'

/**
 * AI settings (§60, ADR-0007).
 *
 * Autonomy is the dangerous surface, so it is presented as what it is: a
 * per-capability switch with a stated guardrail, not one "let the AI do things"
 * toggle. The plan gate is explained here and enforced by the API — flipping a
 * switch on a plan that does not include it fails at the server.
 */
const api = useApi()
const can = useCan()
const membership = useActiveMembership()

const { data: models } = await useAsyncData('settings:ai:models', () =>
  api.get<{ models: AiModelAvailability[]; plan: Plan }>('/api/v1/ai/models'),
)

const modelOptions = computed(() => [
  { label: 'Automatic — best available for this plan', value: '' },
  ...(models.value?.models ?? []).map((model) => ({
    label: model.available
      ? model.label
      : `${model.label} — ${model.requiresUpgrade ? 'upgrade required' : 'unavailable'}`,
    value: model.id,
  })),
])

const CAPABILITIES = [
  {
    key: 'content.rewrite',
    label: 'Rewrite page copy',
    detail: 'Applies copy improvements to drafts without asking. Publishing stays manual.',
  },
  {
    key: 'seo.optimize',
    label: 'Apply SEO fixes',
    detail: 'Titles, descriptions and structured data on published pages.',
  },
  {
    key: 'ads.budget',
    label: 'Adjust ad budgets',
    detail: 'Moves spend between campaigns inside the guardrails you set under Ads.',
  },
  {
    key: 'experiments.promote',
    label: 'Promote winning experiments',
    detail: 'Ships the winning variant once significance is reached.',
  },
  {
    key: 'commerce.pricing',
    label: 'Adjust product pricing',
    detail: 'Changes prices within the bounds configured on each product.',
  },
] as const

const autonomyAllowed = computed(
  () => membership.value?.plan === 'advanced' || membership.value?.plan === 'enterprise',
)
</script>

<template>
  <!--
    One section, not two: both halves edit the same settings document, and two
    independent drafts of one document is how a save quietly discards the other
    half's changes.
  -->
  <SettingsSection
    section-key="ai"
    title="AI"
    description="Which model the assistant reaches for, what it may spend, and what it is allowed to do without asking."
  >
    <template #default="{ draft }">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiField
          label="Default model"
          help="Availability depends on your plan. The server falls back when a model is out of reach."
        >
          <template #default="{ id, describedBy }">
            <UiSelect
              :id="id"
              v-model="(draft as any).defaultModelId"
              :options="modelOptions"
              :described-by="describedBy"
            />
          </template>
        </UiField>

        <UiField label="Monthly credit budget" help="0 means no ceiling. A warning, not a hard stop.">
          <template #default="{ id }">
            <UiInput
              :id="id"
              :model-value="String((draft as any).monthlyCreditBudget ?? 0)"
              type="number"
              @update:model-value="(value: string) => ((draft as any).monthlyCreditBudget = Number(value) || 0)"
            />
          </template>
        </UiField>
      </div>

      <div class="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <div
          v-for="model in models?.models ?? []"
          :key="model.id"
          class="flex items-start justify-between gap-3"
        >
          <div class="min-w-0">
            <p class="type-button-12 truncate text-ink">{{ model.label }}</p>
            <p class="type-caption-12 text-faint">
              {{ model.unavailableReason ?? (model.requiresUpgrade ? 'Requires a higher plan.' : 'Available now.') }}
            </p>
          </div>
          <UiBadge :tone="model.available ? 'positive' : 'neutral'">
            {{ model.available ? 'Available' : 'Locked' }}
          </UiBadge>
        </div>
      </div>

      <!-- Autonomy ------------------------------------------------------- -->
      <div class="mt-6 border-t border-line pt-5">
        <h3 class="type-caption mb-1 text-ink">Autonomy</h3>
        <p class="type-caption-12 mb-4 max-w-xl text-soft">
          Capabilities the assistant may act on without asking first. Everything else stays a proposal you
          confirm.
        </p>

        <div
          v-if="!autonomyAllowed"
          class="mb-4 rounded-lg border border-warning/30 bg-warning-soft/40 px-3 py-2.5"
        >
          <p class="type-caption-12 text-warning">
            Autonomous AI is an Advanced plan feature. These switches are refused by the server on
            {{ membership?.plan }}.
          </p>
        </div>

        <div v-else-if="!can('ai:autonomous')" class="mb-4 rounded-lg border border-line bg-sunken/50 px-3 py-2.5">
          <p class="type-caption-12 text-soft">
            Your role cannot change autonomy settings. Ask an owner or an admin.
          </p>
        </div>

        <ul class="flex flex-col divide-y divide-line">
          <li
            v-for="capability in CAPABILITIES"
            :key="capability.key"
            class="flex items-start justify-between gap-4 py-3 first:pt-0"
          >
            <div class="min-w-0">
              <p class="type-button-12 text-ink">{{ capability.label }}</p>
              <p class="type-caption-12 mt-0.5 text-soft">{{ capability.detail }}</p>
            </div>
            <UiSwitch
              :model-value="Boolean(((draft as any).autonomy ?? {})[capability.key])"
              :label="capability.label"
              @update:model-value="
                (value: boolean) => {
                  ;(draft as any).autonomy = { ...((draft as any).autonomy ?? {}), [capability.key]: value }
                }
              "
            />
          </li>
        </ul>

        <div class="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <UiField label="Daily change limit" help="Autonomous runs stop once this many changes are applied.">
            <template #default="{ id }">
              <UiInput
                :id="id"
                :model-value="String((draft as any).dailyChangeLimit ?? 10)"
                type="number"
                @update:model-value="(value: string) => ((draft as any).dailyChangeLimit = Number(value) || 1)"
              />
            </template>
          </UiField>

          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="type-button-12 text-ink">Confirm medium-risk changes</p>
              <p class="type-caption-12 mt-0.5 text-soft">
                Ask before publishing, sending or spending, even in autonomous mode.
              </p>
            </div>
            <UiSwitch
              :model-value="(draft as any).confirmMediumRisk !== false"
              label="Confirm medium-risk changes"
              @update:model-value="(value: boolean) => ((draft as any).confirmMediumRisk = value)"
            />
          </div>
        </div>
      </div>
    </template>
  </SettingsSection>
</template>
