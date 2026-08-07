/**
 * Autonomous experimentation — the narrow, gated version of it (§94, ADR-0007).
 *
 * The ADR is explicit that autonomous mode "narrows the gates for specific
 * capabilities only, and only within guardrails: budget ceilings, change-count
 * limits, an approval threshold, and automatic rollback". This file is where
 * those words become conditions that can actually refuse.
 */
import { limitsForPlan, planAtLeast } from '@platform/permissions'
import type { AutonomousGuardrails, Experiment, ExperimentResults } from '@platform/schemas'
import { ForbiddenError, PlanLimitError } from '../errors.js'
import type { TenantContext } from '../../plugins/auth.js'

/**
 * Both gates, in the order that leaks the least: permission first (a role
 * question), then plan (a billing question).
 */
export function assertAutonomousAllowed(context: TenantContext): void {
  if (!context.permissions.includes('ai:autonomous')) {
    throw new ForbiddenError(
      `Autonomous experimentation requires the "ai:autonomous" permission, which your role (${context.role}) does not have.`,
    )
  }

  if (!planAtLeast(context.plan, 'advanced') || !limitsForPlan(context.plan).autonomousOptimization) {
    throw new PlanLimitError('Autonomous experimentation is available on the Advanced and Enterprise plans.', {
      plan: context.plan,
      requiredPlan: 'advanced',
    })
  }
}

/** The change limit, enforced before anything is written. */
export function assertWithinChangeLimit(guardrails: AutonomousGuardrails, challengerCount: number): void {
  if (challengerCount > guardrails.maxChanges) {
    throw new PlanLimitError(
      `This autonomous experiment proposes ${challengerCount} changes, above its limit of ${guardrails.maxChanges}.`,
      { proposed: challengerCount, maxChanges: guardrails.maxChanges },
    )
  }
}

export type AutonomousAction = 'continue' | 'awaiting_approval' | 'deployed' | 'stopped'

export interface AutonomousDecisionPlan {
  action: AutonomousAction
  reason: string
  winningVariantId: string | null
  /** Set only when the plan is to deploy without a human. */
  deployVariantId: string | null
}

function hoursSince(timestamp: string | null): number {
  if (!timestamp) return 0
  return (Date.now() - new Date(timestamp).getTime()) / 3_600_000
}

/**
 * What the agent may do next, given what the numbers actually say.
 *
 * Reading order matters: the duration ceiling is checked before the winner,
 * so an experiment that has run past its budget stops rather than being kept
 * alive by a result that keeps almost arriving.
 */
export function planAutonomousDecision(
  experiment: Experiment,
  guardrails: AutonomousGuardrails,
  results: ExperimentResults,
): AutonomousDecisionPlan {
  const elapsedHours = hoursSince(experiment.startedAt)

  if (results.status === 'running') {
    if (elapsedHours >= guardrails.maxDurationHours) {
      return {
        action: 'stopped',
        reason: `Stopped after ${Math.round(elapsedHours)}h without reaching ${guardrails.minimumSamplePerVariant} visitors per variant. Not enough traffic for this test.`,
        winningVariantId: null,
        deployVariantId: null,
      }
    }
    return {
      action: 'continue',
      reason: results.summary,
      winningVariantId: null,
      deployVariantId: null,
    }
  }

  if (results.status === 'not_conclusive') {
    if (elapsedHours >= guardrails.maxDurationHours) {
      return {
        action: 'stopped',
        reason: `Stopped at its ${guardrails.maxDurationHours}h limit with no significant difference. The control stays live.`,
        winningVariantId: null,
        deployVariantId: null,
      }
    }
    return { action: 'continue', reason: results.summary, winningVariantId: null, deployVariantId: null }
  }

  const winner = results.winner
  if (!winner) {
    // Unreachable through `analyseExperiment`, but a status without a winner
    // must never fall through into a deploy.
    return {
      action: 'continue',
      reason: 'Reported a winner without naming one. Treating it as inconclusive.',
      winningVariantId: null,
      deployVariantId: null,
    }
  }

  // The approval threshold is a *second*, stricter bar than the experiment's
  // own confidence level: a tenant can run tests at 95% and still refuse to let
  // an agent act on anything below 99%.
  const achievedConfidence = winner.pValue === null ? 0 : 1 - winner.pValue
  if (achievedConfidence < guardrails.approvalThreshold) {
    return {
      action: 'continue',
      reason: `${winner.name} leads at ${(achievedConfidence * 100).toFixed(2)}% confidence, below the ${(guardrails.approvalThreshold * 100).toFixed(2)}% this experiment is allowed to act on.`,
      winningVariantId: winner.variantId,
      deployVariantId: null,
    }
  }

  if (!guardrails.autoDeploy) {
    return {
      action: 'awaiting_approval',
      reason: `${winner.name} won at ${(achievedConfidence * 100).toFixed(2)}% confidence. Auto-deploy is off, so it waits for a person.`,
      winningVariantId: winner.variantId,
      deployVariantId: null,
    }
  }

  return {
    action: 'deployed',
    reason: `${winner.name} won at ${(achievedConfidence * 100).toFixed(2)}% confidence and was deployed within its guardrails.`,
    winningVariantId: winner.variantId,
    deployVariantId: winner.variantId,
  }
}
