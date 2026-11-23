const counts = new Intl.NumberFormat('en-US')
const money = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
export const count = (value: number) => counts.format(value)
export const costNumber = (value: number | null) => value === null ? '不可计算' : money.format(value)
export const percent = (value: number | null, digits = 2) => value === null ? '不可计算' : `${(value * 100).toFixed(digits)}%`
export const decimal = (value: number) => value.toFixed(4)
export function signed(value: number | null) {
  if (value === null) return '不可计算'
  const magnitude = Math.abs(value).toFixed(2)
  return magnitude === '0.00' ? '0.00' : `${value < 0 ? '−' : '+'}${magnitude}`
}
