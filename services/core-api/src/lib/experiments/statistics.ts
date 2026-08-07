/**
 * The significance maths, kept in one dependency-free file so it can be read
 * and argued with on its own.
 *
 * Every function here returns `null` rather than a number it cannot justify.
 * That is deliberate: the failure mode of an experiments feature is not a
 * crash, it is a confident winner that was never there.
 */

/**
 * Error function, Abramowitz & Stegun 7.1.26. Maximum absolute error 1.5e-7,
 * which is several orders of magnitude finer than any p-value we compare
 * against a 0.05-scale threshold.
 */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const absolute = Math.abs(x)

  const p = 0.3275911
  const t = 1 / (1 + p * absolute)
  const poly =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))

  return sign * (1 - poly * Math.exp(-absolute * absolute))
}

/** Standard normal cumulative distribution. */
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

/** Two-tailed p-value for a z (or large-sample t) statistic. */
export function twoTailedPValue(statistic: number): number {
  if (!Number.isFinite(statistic)) return 1
  return Math.min(1, Math.max(0, 2 * (1 - normalCdf(Math.abs(statistic)))))
}

export interface ProportionSample {
  /** Unique visitors exposed. */
  trials: number
  /** Visitors who converted. */
  successes: number
}

export interface TestResult {
  statistic: number
  pValue: number
}

/**
 * Two-proportion z-test with a pooled standard error — the standard test for
 * "did this variant convert at a different rate than control?".
 *
 * Returns null when the test does not apply: an empty arm, or two arms that
 * both converted at 0% or both at 100%, where the pooled standard error is
 * zero and the statistic is undefined rather than infinitely significant.
 */
export function twoProportionZTest(control: ProportionSample, variant: ProportionSample): TestResult | null {
  if (control.trials <= 0 || variant.trials <= 0) return null
  if (control.successes > control.trials || variant.successes > variant.trials) return null

  const pooled = (control.successes + variant.successes) / (control.trials + variant.trials)
  if (pooled <= 0 || pooled >= 1) return null

  const standardError = Math.sqrt(pooled * (1 - pooled) * (1 / control.trials + 1 / variant.trials))
  if (!Number.isFinite(standardError) || standardError === 0) return null

  const statistic = (variant.successes / variant.trials - control.successes / control.trials) / standardError
  if (!Number.isFinite(statistic)) return null

  return { statistic, pValue: twoTailedPValue(statistic) }
}

export interface ContinuousSample {
  /** Unique visitors exposed — the denominator, not the number of buyers. */
  count: number
  /** Mean revenue **per exposed visitor**, in major units. */
  mean: number
  /** Sample variance of the same per-visitor quantity. */
  variance: number
}

/**
 * Welch's t-test for revenue per visitor.
 *
 * Revenue is not a proportion — most visitors contribute zero and a few
 * contribute a lot — so testing it with a proportion test would be wrong in a
 * way that flatters whichever arm caught the big order. Welch tolerates the
 * unequal variances that follow from that shape.
 *
 * The p-value uses the normal approximation to the t distribution. That is
 * safe here only because a decision is gated behind a minimum sample size in
 * the hundreds; at n below ~30 per arm this would be too generous, which is
 * exactly why the gate is not optional.
 */
export function welchTTest(control: ContinuousSample, variant: ContinuousSample): TestResult | null {
  if (control.count < 2 || variant.count < 2) return null
  if (control.variance < 0 || variant.variance < 0) return null

  const standardError = Math.sqrt(control.variance / control.count + variant.variance / variant.count)
  if (!Number.isFinite(standardError) || standardError === 0) return null

  const statistic = (variant.mean - control.mean) / standardError
  if (!Number.isFinite(statistic)) return null

  return { statistic, pValue: twoTailedPValue(statistic) }
}

/**
 * Sample variance from the running sums a `GROUP BY` can produce, so the
 * database never has to hold per-visitor rows in memory to answer this.
 */
export function varianceFromSums(count: number, sum: number, sumOfSquares: number): number {
  if (count < 2) return 0
  const variance = (sumOfSquares - (sum * sum) / count) / (count - 1)
  // Floating-point subtraction of two large, nearly equal numbers can land
  // just below zero. A negative variance is arithmetic noise, not a result.
  return variance > 0 ? variance : 0
}
