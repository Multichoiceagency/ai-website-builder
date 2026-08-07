import {
  addMoney,
  clampMoney,
  money,
  multiplyMoney,
  subtractMoney,
  zeroMoney,
  type AppliedDiscount,
  type CartTotals,
  type Discount,
  type Money,
} from '@platform/schemas'

/**
 * Cart pricing. Platform-owned, deliberately pure and vendor-free: the same
 * arithmetic has to be explainable to a merchant, reproducible in a test, and
 * identical whichever commerce provider is in play.
 *
 * Everything is integer minor units. There is no float in this file and no
 * division that is not immediately rounded.
 */

export interface PricedLine {
  lineTotal: Money
  taxRateBps: number
}

/** A line's own money, computed the only way it may ever be computed. */
export function lineTotalFor(unitPrice: Money, quantity: number): Money {
  return multiplyMoney(unitPrice, quantity)
}

function isWithinWindow(discount: Discount, now: Date): boolean {
  if (discount.startsAt && new Date(discount.startsAt) > now) return false
  if (discount.endsAt && new Date(discount.endsAt) < now) return false
  return true
}

/**
 * Which of the supplied discounts may be considered at all, before stacking.
 *
 * A code that exists but does not qualify is not an error — the shopper simply
 * has not met its condition yet — so this filters rather than throws.
 */
export function eligibleDiscounts(discounts: Discount[], subtotal: Money, now = new Date()): Discount[] {
  return discounts.filter((discount) => {
    if (!discount.active) return false
    if (!isWithinWindow(discount, now)) return false
    if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) return false
    if (discount.minimumSubtotal && discount.minimumSubtotal.currency !== subtotal.currency) return false
    if (discount.minimumSubtotal && subtotal.amount < discount.minimumSubtotal.amount) return false
    return true
  })
}

/**
 * What one discount is worth on its own, against the untouched base amounts.
 *
 * Percentages are always taken from the *original* subtotal rather than from
 * whatever a previous discount left behind, so stacking two 10% codes gives 20%
 * and not 19% — and the result does not depend on evaluation order.
 */
function valueOf(discount: Discount, subtotal: Money, shipping: Money): { amountOff: Money; shippingOff: Money } {
  const none = { amountOff: zeroMoney(subtotal.currency), shippingOff: zeroMoney(shipping.currency) }

  if (discount.type === 'free_shipping') {
    return { ...none, shippingOff: shipping }
  }

  if (discount.type === 'percentage') {
    const bps = discount.percentageBps ?? 0
    return { ...none, amountOff: money(Math.round((subtotal.amount * bps) / 10_000), subtotal.currency) }
  }

  // Fixed. A discount denominated in another currency does not apply — silently
  // converting it would invent an exchange rate we do not have.
  if (!discount.amount || discount.amount.currency !== subtotal.currency) return none
  return { ...none, amountOff: clampMoney(money(Math.min(discount.amount.amount, subtotal.amount), subtotal.currency)) }
}

/** Deterministic order: lowest `priority` first, then code, so ties never flap. */
function byPriority(a: Discount, b: Discount): number {
  return a.priority - b.priority || a.code.localeCompare(b.code)
}

/**
 * The stacking rules, in one place:
 *
 * 1. Only eligible discounts are considered.
 * 2. If any eligible discount is **not** stackable, exactly one discount
 *    applies: the non-stackable one worth the most. Everything else is
 *    suppressed. "Cannot be combined with other offers" has to mean that.
 * 3. Otherwise every stackable discount applies, in priority order.
 * 4. The total taken off is capped at the subtotal — a cart can reach zero and
 *    stops there. Shipping is reduced separately and never below zero.
 */
export function applyDiscounts(
  subtotal: Money,
  shipping: Money,
  discounts: Discount[],
  now = new Date(),
): { applied: AppliedDiscount[]; discountTotal: Money; shippingTotal: Money } {
  const eligible = eligibleDiscounts(discounts, subtotal, now)

  const exclusive = eligible.filter((discount) => !discount.stackable)
  const chosen = exclusive.length
    ? [
        exclusive.reduce((best, candidate) => {
          const bestValue = valueOf(best, subtotal, shipping)
          const candidateValue = valueOf(candidate, subtotal, shipping)
          const bestTotal = bestValue.amountOff.amount + bestValue.shippingOff.amount
          const candidateTotal = candidateValue.amountOff.amount + candidateValue.shippingOff.amount
          if (candidateTotal !== bestTotal) return candidateTotal > bestTotal ? candidate : best
          return byPriority(candidate, best) < 0 ? candidate : best
        }),
      ]
    : [...eligible].sort(byPriority)

  const applied: AppliedDiscount[] = []
  let remainingSubtotal = subtotal.amount
  let remainingShipping = shipping.amount

  for (const discount of chosen) {
    const value = valueOf(discount, subtotal, shipping)

    // Cap against what is left, so the sum of the parts always equals the total
    // the customer sees — no line can claim more than the cart still owes.
    const amountOff = Math.min(value.amountOff.amount, remainingSubtotal)
    const shippingOff = Math.min(value.shippingOff.amount, remainingShipping)
    remainingSubtotal -= amountOff
    remainingShipping -= shippingOff

    if (amountOff === 0 && shippingOff === 0) continue

    applied.push({
      discountId: discount.id,
      code: discount.code,
      type: discount.type,
      amountOff: money(amountOff, subtotal.currency),
      shippingOff: money(shippingOff, shipping.currency),
    })
  }

  return {
    applied,
    discountTotal: money(subtotal.amount - remainingSubtotal, subtotal.currency),
    shippingTotal: money(remainingShipping, shipping.currency),
  }
}

/**
 * Tax contained in a total, not added to it.
 *
 * Prices in this platform are tax-inclusive (the European default), so VAT is
 * extracted: at 21%, €121 contains €21. The discount is spread across the lines
 * in proportion to their size before extracting, because a discount reduces the
 * tax owed as well as the price paid.
 */
export function computeTaxTotal(lines: PricedLine[], discountTotal: Money): Money {
  const currency = discountTotal.currency
  const gross = lines.reduce((sum, line) => sum + line.lineTotal.amount, 0)
  if (gross === 0) return zeroMoney(currency)

  let allocated = 0
  let tax = 0

  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1
    // The last line absorbs the rounding remainder so the parts sum to the whole.
    const share = isLast
      ? discountTotal.amount - allocated
      : Math.floor((discountTotal.amount * line.lineTotal.amount) / gross)
    allocated += share

    const net = Math.max(line.lineTotal.amount - share, 0)
    tax += Math.round((net * line.taxRateBps) / (10_000 + line.taxRateBps))
  })

  return money(tax, currency)
}

/**
 * Everything a cart or an order needs to show a price, derived from the lines
 * rather than stored — a stored total is a total that can disagree with its
 * own line items.
 */
export function computeTotals(input: {
  currency: string
  lines: PricedLine[]
  shipping: Money
  discounts: Discount[]
  now?: Date
}): { totals: CartTotals; applied: AppliedDiscount[] } {
  const currency = input.currency
  const subtotal = input.lines.reduce((sum, line) => addMoney(sum, line.lineTotal), zeroMoney(currency))

  const { applied, discountTotal, shippingTotal } = applyDiscounts(
    subtotal,
    input.shipping,
    input.discounts,
    input.now,
  )

  const taxTotal = computeTaxTotal(input.lines, discountTotal)
  const total = clampMoney(addMoney(subtractMoney(subtotal, discountTotal), shippingTotal))

  return {
    totals: { subtotal, discountTotal, shippingTotal, taxTotal, total },
    applied,
  }
}
