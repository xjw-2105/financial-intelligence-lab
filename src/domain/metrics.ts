export type GroupStats = {
  n: number
  positive: number
  negative: number
  TP: number[]
  FP: number[]
}

export function metricsAt(group: GroupStats, index: number) {
  const tp = group.TP[index]
  const fp = group.FP[index]
  if (tp === undefined || fp === undefined) throw new RangeError('阈值索引超出数据范围')
  const fn = group.positive - tp
  const tn = group.negative - fp
  const recall = ratio(tp, group.positive)
  const fpr = ratio(fp, group.negative)
  return {
    tp, fp, tn, fn, recall, fpr,
    fnr: ratio(fn, group.positive),
    precision: ratio(tp, tp + fp),
    balanced: recall === null || fpr === null ? null : (recall + 1 - fpr) / 2,
  }
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator
}

export function gapPP(first: number | null, second: number | null) {
  return first === null || second === null ? null : 100 * (second - first)
}
