import { displayGap, higherErrorGroup, type GapMetric, type GapView, type GroupDimension } from '../domain/experiment.ts'

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
export function gapNumber(gap: number | null, view: GapView) {
  const value = displayGap(gap, view)
  return value === null ? '不可计算' : view === 'signed' ? signed(value) : value.toFixed(2)
}

export function gapDirection(gap: number | null, dimension: GroupDimension) {
  if (gap === null) return '分母不足'
  const group = higherErrorGroup(gap, dimension)
  const small = Math.abs(gap) < 0.005
  return group === null ? '两组相同' : `${group} 组较高${small ? '（差距不足 0.005 个百分点）' : ''}`
}

export function errorDirection(gap: number | null, dimension: GroupDimension, metric: GapMetric) {
  if (gap === null) return '分母不足，无法比较两组'
  const group = higherErrorGroup(gap, dimension)
  if (group === null) return '两组的错误率相同'
  const outcome = metric === 'fpr' ? '未违约者的误报率' : '违约者的漏判率'
  const rounding = Math.abs(gap) < 0.005 ? '（差距不足 0.005 个百分点）' : ''
  return `${group} 组${outcome}更高${rounding}`
}
