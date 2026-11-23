import { displayGap, higherErrorGroup, type GapView, type GroupDimension } from '../domain/experiment'

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
