import { PLANS, type Plan, type PlanLimits } from '@platform/schemas'

/**
 * Plan entitlements. Enforced server-side only — the dashboard reads these to
 * explain limits, never to grant them.
 */
export const PLAN_LIMITS: Readonly<Record<Plan, PlanLimits>> = Object.freeze({
  launch: {
    sites: 1,
    users: 1,
    domains: 1,
    aiUsageMultiplier: 1,
    dedicatedRuntime: false,
    autonomousOptimization: false,
    privateApps: false,
    whiteLabel: false,
  },
  grow: {
    sites: 3,
    users: 5,
    domains: 3,
    aiUsageMultiplier: 3,
    dedicatedRuntime: false,
    autonomousOptimization: false,
    privateApps: false,
    whiteLabel: false,
  },
  scale: {
    sites: 5,
    users: 10,
    domains: 5,
    aiUsageMultiplier: 10,
    dedicatedRuntime: false,
    autonomousOptimization: false,
    privateApps: false,
    whiteLabel: false,
  },
  advanced: {
    sites: 20,
    users: 20,
    domains: 20,
    aiUsageMultiplier: 20,
    dedicatedRuntime: true,
    autonomousOptimization: true,
    privateApps: true,
    whiteLabel: true,
  },
  enterprise: {
    sites: Number.MAX_SAFE_INTEGER,
    users: Number.MAX_SAFE_INTEGER,
    domains: Number.MAX_SAFE_INTEGER,
    aiUsageMultiplier: 100,
    dedicatedRuntime: true,
    autonomousOptimization: true,
    privateApps: true,
    whiteLabel: true,
  },
})

export function limitsForPlan(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan]
}

/**
 * Plans are ordered, so a feature gated at `scale` is available to `advanced`
 * and `enterprise` without listing every plan at every call site.
 */
export function planAtLeast(plan: Plan, minimum: Plan): boolean {
  return PLANS.indexOf(plan) >= PLANS.indexOf(minimum)
}
