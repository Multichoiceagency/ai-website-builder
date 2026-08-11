import { describe, expect, it } from 'vitest'
import { estimateRevenueFromPlans } from '../src/lib/admin-revenue.js'

describe('estimateRevenueFromPlans', () => {
  it('computes MRR and ARR from plan seat counts', () => {
    const result = estimateRevenueFromPlans([
      { plan: 'launch', tenants: 2 },
      { plan: 'scale', tenants: 1 },
    ])
    expect(result.mrr).toBe(2 * 29 + 149)
    expect(result.arr).toBe(result.mrr * 12)
    expect(result.breakdown).toEqual([
      { plan: 'launch', tenants: 2, priceEur: 29, mrrEur: 58 },
      { plan: 'scale', tenants: 1, priceEur: 149, mrrEur: 149 },
    ])
  })

  it('treats unknown plans as zero price', () => {
    const result = estimateRevenueFromPlans([{ plan: 'custom', tenants: 3 }])
    expect(result.mrr).toBe(0)
    expect(result.breakdown[0]?.priceEur).toBe(0)
  })
})
