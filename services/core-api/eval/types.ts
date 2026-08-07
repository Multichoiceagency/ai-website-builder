import type { CopySlots } from '../src/lib/ai/gateway.js'
import type { ArmCall } from './arms.js'
import type { ObjectiveReport } from './judge-objective.js'
import type { RubricOutcome } from './judge-rubric.js'

/** One arm's attempt at one fixture. */
export interface CellResult {
  fixtureId: string
  armId: string
  status: 'ok' | 'failed' | 'skipped'
  /** Set when `status` is `skipped` — always printed, never a silent omission. */
  skipReason?: string
  /** Set when `status` is `failed`. A schema rejection lands here, as a result. */
  error?: string
  notes: string[]
  calls: ArmCall[]
  slots: CopySlots | null
  objective: ObjectiveReport | null
  latencyMs: number
  costUsd: number
  providerReportedCostUsd: number
}

export interface ArmPlan {
  id: string
  label: string
  hypothesis: string
  models: string[]
  callsPerFixture: number
  runnable: boolean
  /** Why it will not run. Present whenever `runnable` is false. */
  skipReason?: string
  estimatedCostUsd: number
}

export interface RunResult {
  startedAt: string
  finishedAt: string
  seed: number
  judgeModel: string
  rubricEnabled: boolean
  /** Model ids Google confirmed this key can call, or null if the check failed. */
  verifiedModels: string[] | null
  fixtures: { id: string; purpose: string; locale: string }[]
  plan: ArmPlan[]
  cells: CellResult[]
  rubric: { fixtureId: string; outcome: RubricOutcome }[]
  totals: {
    generationCostUsd: number
    rubricCostUsd: number
    totalCostUsd: number
    providerReportedCostUsd: number
    modelCalls: number
  }
}
