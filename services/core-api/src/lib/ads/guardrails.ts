import type { AdsGuardrails, Budget, GuardrailViolation } from '@platform/schemas'

/**
 * The spend ceiling (ADR-0007, high risk).
 *
 * Raising ad spend is the one action in the platform that costs the customer
 * money continuously and silently. Confirmation alone is not enough control:
 * a confirmation dialog is a thing people click. So a budget change also has to
 * clear a numeric ceiling the tenant set in advance, and a change that does not
 * is refused rather than escalated — there is no "confirm anyway" path here.
 *
 * Pure and synchronous on purpose: it takes numbers and returns a verdict, so
 * every caller (route, agent tool, future autonomous mode) applies exactly the
 * same rule and it can be tested without a database.
 */
export function evaluateBudgetChange(input: {
  guardrails: AdsGuardrails
  current: Budget
  requested: Budget
  /** Sum of every other active campaign's daily budget, in minor units. */
  otherActiveDailyMinor: number
}): GuardrailViolation | null {
  const { guardrails, current, requested, otherActiveDailyMinor } = input
  const currency = requested.currency

  // A decrease is always allowed. Spending less is never the dangerous
  // direction, and blocking it would leave a tenant unable to stop the bleeding
  // because they once set a low ceiling.
  if (requested.amountMinor <= current.amountMinor) return null

  if (requested.amountMinor > guardrails.maxDailyBudgetMinor) {
    return {
      rule: 'max_daily_budget',
      message: `This workspace caps a single campaign at ${formatMinor(guardrails.maxDailyBudgetMinor, currency)} per day. Raise the guardrail first if that is really intended.`,
      limitMinor: guardrails.maxDailyBudgetMinor,
      requestedMinor: requested.amountMinor,
      currency,
    }
  }

  // A percentage cap catches the case a fixed ceiling misses: a series of small
  // steps, each individually under the cap, walking a budget up unnoticed.
  if (current.amountMinor > 0 && guardrails.maxIncreasePercent > 0) {
    const increasePercent = ((requested.amountMinor - current.amountMinor) / current.amountMinor) * 100
    if (increasePercent > guardrails.maxIncreasePercent) {
      return {
        rule: 'max_increase_percent',
        message: `That is a ${Math.round(increasePercent)}% increase; this workspace allows at most ${guardrails.maxIncreasePercent}% in one step.`,
        limitMinor: Math.floor(current.amountMinor * (1 + guardrails.maxIncreasePercent / 100)),
        requestedMinor: requested.amountMinor,
        currency,
      }
    }
  }

  if (requested.period === 'daily') {
    const projectedTotal = otherActiveDailyMinor + requested.amountMinor
    if (projectedTotal > guardrails.maxTotalDailyBudgetMinor) {
      return {
        rule: 'max_total_daily_budget',
        message: `Together with the other active campaigns this would spend ${formatMinor(projectedTotal, currency)} per day, over the workspace ceiling of ${formatMinor(guardrails.maxTotalDailyBudgetMinor, currency)}.`,
        limitMinor: guardrails.maxTotalDailyBudgetMinor,
        requestedMinor: projectedTotal,
        currency,
      }
    }
  }

  return null
}

/**
 * The same ceiling applied at publish time.
 *
 * Publishing a draft is the moment a budget starts being spent, so it has to
 * pass the same test as changing one. Without this, the ceiling would be
 * trivially avoidable: draft at any amount, then publish.
 */
export function evaluatePublishBudget(input: {
  guardrails: AdsGuardrails
  budget: Budget
  otherActiveDailyMinor: number
}): GuardrailViolation | null {
  return evaluateBudgetChange({
    guardrails: input.guardrails,
    current: { ...input.budget, amountMinor: 0 },
    requested: input.budget,
    otherActiveDailyMinor: input.otherActiveDailyMinor,
  })
}

function formatMinor(amountMinor: number, currency: string): string {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`
}
