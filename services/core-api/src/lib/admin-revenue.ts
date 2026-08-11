/** List prices (EUR / month) used for estimated MRR until live billing is wired. */
export const PLAN_MRR_EUR: Readonly<Record<string, number>> = {
  launch: 29,
  grow: 79,
  scale: 149,
  advanced: 299,
  enterprise: 999,
}

export interface PlanCount {
  plan: string
  tenants: number
}

export interface RevenueBreakdownRow {
  plan: string
  tenants: number
  priceEur: number
  mrrEur: number
}

export interface EstimatedRevenue {
  currency: 'EUR'
  mrr: number
  arr: number
  breakdown: RevenueBreakdownRow[]
  note: string
}

export function estimateRevenueFromPlans(plans: PlanCount[]): EstimatedRevenue {
  const breakdown = plans.map((row) => {
    const price = PLAN_MRR_EUR[row.plan] ?? 0
    return {
      plan: row.plan,
      tenants: row.tenants,
      priceEur: price,
      mrrEur: row.tenants * price,
    }
  })
  const mrr = breakdown.reduce((sum, row) => sum + row.mrrEur, 0)
  return {
    currency: 'EUR',
    mrr,
    arr: mrr * 12,
    breakdown,
    note: 'Estimated from plan list prices × tenant counts — not live Stripe invoices.',
  }
}
