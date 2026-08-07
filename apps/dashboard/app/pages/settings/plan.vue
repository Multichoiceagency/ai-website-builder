<script setup lang="ts">
import { computed } from 'vue'
import type { Plan, PlanLimits } from '@platform/schemas'

/**
 * Plan & usage (§60).
 *
 * Limits and usage side by side, and the next tier expressed as the difference
 * rather than as a marketing list — "3 → 20 websites" is what a user is
 * actually deciding about.
 */
interface PlanResponse {
  plan: Plan
  limits: PlanLimits
  usage: { sites: number; pages: number; domains: number; users: number }
  nextPlan: Plan | null
  nextPlanLimits: PlanLimits | null
}

const api = useApi()

const { data } = await useAsyncData('settings:plan', () => api.get<PlanResponse>('/api/v1/settings/plan'))

function display(value: number): string {
  return value === Number.MAX_SAFE_INTEGER ? 'Unlimited' : String(value)
}

const meters = computed(() => {
  if (!data.value) return []
  const { limits, usage } = data.value

  return [
    { label: 'Websites', used: usage.sites, limit: limits.sites },
    { label: 'Team members', used: usage.users, limit: limits.users },
    { label: 'Domains', used: usage.domains, limit: limits.domains },
  ].map((meter) => ({
    ...meter,
    // A meter against an unlimited plan is meaningless, so it reads as full-open
    // rather than as a bar frozen near zero.
    ratio: meter.limit === Number.MAX_SAFE_INTEGER ? 0 : Math.min(1, meter.used / Math.max(1, meter.limit)),
    unlimited: meter.limit === Number.MAX_SAFE_INTEGER,
  }))
})

const FEATURES: { key: keyof PlanLimits; label: string }[] = [
  { key: 'dedicatedRuntime', label: 'Dedicated runtime' },
  { key: 'autonomousOptimization', label: 'Autonomous AI optimisation' },
  { key: 'privateApps', label: 'Private apps' },
  { key: 'whiteLabel', label: 'White label' },
]

/** Only what actually changes on the next tier. A full table hides the answer. */
const upgrades = computed(() => {
  if (!data.value?.nextPlanLimits) return []
  const from = data.value.limits
  const to = data.value.nextPlanLimits

  const numeric: { key: keyof PlanLimits; label: string }[] = [
    { key: 'sites', label: 'Websites' },
    { key: 'users', label: 'Team members' },
    { key: 'domains', label: 'Domains' },
    { key: 'aiUsageMultiplier', label: 'AI usage' },
  ]

  return [
    ...numeric
      .filter((entry) => to[entry.key] !== from[entry.key])
      .map((entry) => ({
        label: entry.label,
        change: `${display(from[entry.key] as number)} → ${display(to[entry.key] as number)}`,
      })),
    ...FEATURES.filter((entry) => to[entry.key] && !from[entry.key]).map((entry) => ({
      label: entry.label,
      change: 'unlocked',
    })),
  ]
})
</script>

<template>
  <div v-if="data" class="flex flex-col gap-5">
    <section class="rounded-card border border-line bg-raised px-5 py-5">
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p class="type-button-10 uppercase tracking-[0.08em] text-faint">Current plan</p>
          <p class="mt-1 text-[1.75rem] font-semibold capitalize leading-none tracking-[-0.03em] text-ink">
            {{ data.plan }}
          </p>
        </div>
        <p class="type-caption-12 text-soft">AI usage {{ data.limits.aiUsageMultiplier }}× the Launch baseline.</p>
      </div>

      <dl class="mt-6 flex flex-col gap-4">
        <div v-for="meter in meters" :key="meter.label">
          <div class="mb-1.5 flex items-baseline justify-between gap-3">
            <dt class="type-button-12 text-soft">{{ meter.label }}</dt>
            <dd class="type-button-12 tabular-nums text-ink">
              {{ meter.used }} <span class="text-faint">/ {{ display(meter.limit) }}</span>
            </dd>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-sunken">
            <div
              class="h-full rounded-full transition-[width] duration-500"
              :class="meter.ratio >= 1 ? 'bg-warning' : 'bg-brand'"
              :style="{ width: meter.unlimited ? '100%' : `${Math.max(2, meter.ratio * 100)}%` }"
            />
          </div>
        </div>
      </dl>

      <ul class="mt-6 flex flex-wrap gap-1.5 border-t border-line pt-4">
        <li v-for="feature in FEATURES" :key="feature.key">
          <UiBadge :tone="data.limits[feature.key] ? 'positive' : 'neutral'">
            {{ feature.label }}
          </UiBadge>
        </li>
      </ul>
    </section>

    <section v-if="data.nextPlan" class="rounded-card border border-brand/30 bg-brand-soft/30 px-5 py-5">
      <h2 class="type-button text-ink">
        What <span class="capitalize">{{ data.nextPlan }}</span> adds
      </h2>
      <ul class="mt-3 flex flex-col gap-2">
        <li v-for="entry in upgrades" :key="entry.label" class="flex items-baseline justify-between gap-4">
          <span class="type-button-12 text-soft">{{ entry.label }}</span>
          <span class="type-button-12 tabular-nums text-ink">{{ entry.change }}</span>
        </li>
      </ul>
      <p v-if="!upgrades.length" class="type-caption-12 mt-3 text-soft">
        Nothing changes in the limits — the next tier is about support and contract terms.
      </p>
    </section>

    <p v-else class="type-caption-12 text-soft">
      You are on the highest tier. Limits here are contractual rather than technical.
    </p>
  </div>
</template>
