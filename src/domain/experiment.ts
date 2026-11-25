import { gapPP, metricsAt, type GroupStats } from './metrics.ts'
import { costPresets, type CostPreset } from './cost.ts'
import bootstrap from './bootstrap.json' with { type: 'json' }
import { staticAsset } from './assets.ts'

export const models = ['Logistic', 'KNN', 'RandomForest'] as const
export const features = ['Basic', 'Enhanced', 'Full'] as const
export const modelNames = { Logistic: '逻辑回归', KNN: 'KNN', RandomForest: '随机森林' }
export type Model = typeof models[number]
export type FeatureSet = typeof features[number]
export type GroupDimension = 'sex' | 'age'
export type GapMetric = 'fpr' | 'fnr'
export type GapView = 'signed' | 'absolute'
export type RunKey = `${FeatureSet}_${Model}`

export type FrozenRun = {
  model: Model
  featureSet: FeatureSet
  sourceFile: string
  nCases: number
  positives: number
  negativeCases: number
  thresholds: number[]
  frozenThresholds: { FPR10: number; F1: number }
  frozenMetrics: { rocAuc: number; averagePrecision: number; recall: number; fpr: number }
  groups: Record<string, GroupStats>
}

export type Dataset = {
  schemaVersion: string
  dataType: string
  source: string
  split: string
  scoreRule: string
  dimensions: { sex: string[]; operationalAge: string[] }
  runs: Record<RunKey, FrozenRun>
}

export const dimensions = {
  sex: { keys: ['sex:F', 'sex:M'], labels: ['F', 'M'], gap: 'M − F' },
  age: { keys: ['age:18-29', 'age:30-44', 'age:45-59', 'age:60-100'], labels: ['18–29', '30–44', '45–59', '60–100'], gap: '60–100 − 18–29' },
}

export type ExperimentState = {
  run: RunKey
  index: number | null
  committedIndex: number | null
  previousIndex?: number | null
  dimension: GroupDimension
  gap: GapMetric
  gapView: GapView
  priceFP: string
  priceFN: string
}

export const initialState: ExperimentState = {
  run: 'Full_RandomForest', index: null, committedIndex: null, dimension: 'sex', gap: 'fpr', gapView: 'signed', ...costPresets.default.prices,
}

type Action =
  | { type: 'run'; run: RunKey }
  | { type: 'comparisonRun'; run: RunKey }
  | { type: 'index'; index: number | null; preview?: boolean }
  | { type: 'reset' }
  | { type: 'dimension'; dimension: GroupDimension }
  | { type: 'gap'; gap: GapMetric }
  | { type: 'gapView'; view: GapView }
  | { type: 'costPreset'; preset: CostPreset }
  | { type: 'priceFP' | 'priceFN'; value: string }

export function experimentReducer(state: ExperimentState, action: Action): ExperimentState {
  switch (action.type) {
    case 'run': return action.run === state.run ? state : { ...state, run: action.run, index: null, committedIndex: null, previousIndex: undefined }
    case 'comparisonRun': return { ...state, run: action.run, index: null, committedIndex: null, previousIndex: undefined }
    case 'index': return action.preview ? { ...state, index: action.index } : commitIndex(state, action.index)
    case 'reset': return commitIndex(state, null)
    case 'dimension': return { ...state, dimension: action.dimension }
    case 'gap': return { ...state, gap: action.gap }
    case 'gapView': return { ...state, gapView: action.view }
    case 'costPreset': return { ...state, ...costPresets[action.preset].prices }
    case 'priceFP':
    case 'priceFN': return { ...state, [action.type]: action.value }
  }
}

function commitIndex(state: ExperimentState, index: number | null): ExperimentState {
  if (index === state.committedIndex) return { ...state, index }
  return { ...state, index, committedIndex: index, previousIndex: state.committedIndex }
}

export function previousThresholdIndex(run: FrozenRun, state: ExperimentState) {
  const previous = state.index === state.committedIndex ? state.previousIndex : state.committedIndex
  return previous === null ? frozenIndex(run) : previous
}

export function thresholdDelta(run: FrozenRun, from: number, to: number, dimension: GroupDimension) {
  const old = metricsAt(run.groups.All, from)
  const next = metricsAt(run.groups.All, to)
  const groups = dimensions[dimension].keys.map((key, i) => {
    const before = metricsAt(run.groups[key], from)
    const after = metricsAt(run.groups[key], to)
    return { label: dimensions[dimension].labels[i], fpr: gapPP(before.fpr, after.fpr), fnr: gapPP(before.fnr, after.fnr) }
  })
  return {
    tp: next.tp - old.tp, fp: next.fp - old.fp, fn: next.fn - old.fn, tn: next.tn - old.tn,
    groups,
    fprGap: gapPPFromValues(groupGap(run, from, dimension, 'fpr'), groupGap(run, to, dimension, 'fpr')),
    fnrGap: gapPPFromValues(groupGap(run, from, dimension, 'fnr'), groupGap(run, to, dimension, 'fnr')),
  }
}

function gapPPFromValues(before: number | null, after: number | null) {
  return before === null || after === null ? null : after - before
}

export function frozenComparison(run: FrozenRun) {
  const index = frozenIndex(run)
  const { recall, fpr } = metricsAt(run.groups.All, index)
  return {
    rocAuc: run.frozenMetrics.rocAuc, ap: run.frozenMetrics.averagePrecision, recall, fpr,
    fprGap: groupGap(run, index, 'sex', 'fpr'), fnrGap: groupGap(run, index, 'sex', 'fnr'),
  }
}

export function focusInterval(length: number, center: number, radius = 30) {
  return { min: Math.max(0, center - radius), max: Math.min(length - 1, center + radius) }
}

export function nearestIndex(thresholds: readonly number[], target: number) {
  if (!thresholds.length || !Number.isFinite(target)) throw new RangeError('无效阈值')
  let lo = 0
  let hi = thresholds.length - 1
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (thresholds[mid] < target) lo = mid + 1
    else hi = mid
  }
  const prior = lo - 1
  return prior >= 0 && target - thresholds[prior] <= thresholds[lo] - target ? prior : lo
}

export function frozenIndex(run: FrozenRun) {
  const index = run.thresholds.indexOf(run.frozenThresholds.FPR10)
  if (index < 0) throw new Error('当前配置缺少 FPR10 基准点')
  return index
}

export function activeIndex(run: FrozenRun, state: ExperimentState) {
  return state.index ?? frozenIndex(run)
}

export function groupGap(run: FrozenRun, index: number, dimension: GroupDimension, metric: GapMetric) {
  const { keys } = dimensions[dimension]
  return gapPP(metricsAt(run.groups[keys[0]], index)[metric], metricsAt(run.groups[keys[keys.length - 1]], index)[metric])
}

export function displayGap(gap: number | null, view: GapView) {
  return gap !== null && view === 'absolute' ? Math.abs(gap) : gap
}

export function higherErrorGroup(gap: number | null, dimension: GroupDimension) {
  if (gap === null || gap === 0) return null
  const { labels } = dimensions[dimension]
  return gap > 0 ? labels[labels.length - 1] : labels[0]
}

export function frozenSexBootstrap(run: FrozenRun, index: number, dimension: GroupDimension) {
  return `${run.featureSet}_${run.model}` === bootstrap.run && dimension === bootstrap.dimension &&
    run.frozenThresholds.FPR10 === bootstrap.threshold && run.thresholds[index] === bootstrap.threshold ? bootstrap : null
}

export function tradeoffPoints(run: FrozenRun, dimension: GroupDimension, metric: GapMetric) {
  return run.thresholds.flatMap((threshold, index) => {
    const balanced = metricsAt(run.groups.All, index).balanced
    const gap = groupGap(run, index, dimension, metric)
    return balanced === null || gap === null ? [] : [{ threshold, index, balanced, gap }]
  })
}

export async function loadDataset() {
  const response = await fetch(staticAsset('data/v3_matlab_aggregates.json'))
  if (!response.ok) throw new Error(`聚合数据加载失败 (HTTP ${response.status})`)
  const data: Dataset = await response.json()
  if (data.dataType !== 'preaggregated_threshold_counts' ||
      !features.every(feature => models.every(model => Boolean(data.runs?.[`${feature}_${model}`])))) {
    throw new Error('实验数据或模型配置不完整')
  }
  return data
}
