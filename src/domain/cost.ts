export const costPresets = {
  default: { label: '常规权重', prices: { priceFP: '1', priceFN: '3' } },
  missedDefault: { label: '提高漏判权重', prices: { priceFP: '1', priceFN: '15' } },
} as const

export type CostPreset = keyof typeof costPresets

export function unitCost(value: string) {
  if (value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function scenarioCost(fp: number, fn: number, n: number, priceFP: string, priceFN: string) {
  const fpUnit = unitCost(priceFP)
  const fnUnit = unitCost(priceFN)
  if (fpUnit === null || fnUnit === null) return null
  const falsePositive = fp * fpUnit
  const falseNegative = fn * fnUnit
  const total = falsePositive + falseNegative
  if (!Number.isFinite(total)) return null
  return { falsePositive, falseNegative, total, perThousand: n > 0 ? total / n * 1000 : null }
}


export function costAgainstLowRisk(tp: number, fp: number, fn: number, n: number, priceFP: string, priceFN: string) {
  const current = scenarioCost(fp, fn, n, priceFP, priceFN)
  if (current === null) return null
  const fpUnit = Number(priceFP)
  const fnUnit = Number(priceFN)
  const baseline = (tp + fn) * fnUnit
  if (!Number.isFinite(baseline)) return null
  return {
    ...current,
    baseline,
    difference: current.total - baseline,
    extraDetected: tp,
    extraFalseAlarms: fp,
    breakEvenRatio: fpUnit > 0 && tp > 0 ? fp / tp : null,
  }
}
