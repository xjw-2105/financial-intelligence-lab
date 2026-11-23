import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { activeIndex, displayGap, experimentReducer, focusInterval, frozenComparison, frozenIndex, frozenSexBootstrap, groupGap, higherErrorGroup, initialState, nearestIndex, previousThresholdIndex, thresholdDelta, tradeoffPoints, type Dataset, type RunKey } from '../src/domain/experiment.ts'
import { costAgainstLowRisk, costPresets, scenarioCost, unitCost } from '../src/domain/cost.ts'
import { gapPP, metricsAt } from '../src/domain/metrics.ts'

const read = (name: string) => readFileSync(new URL(`../public/data/${name}`, import.meta.url), 'utf8')
const raw = read('v3_matlab_aggregates.json')
const data: Dataset = JSON.parse(raw)
const manifest = JSON.parse(read('export_manifest.json'))
const qa = read('v3_aggregate_qa.csv').trim().split(/\r?\n/).slice(1)
const full = data.runs.Full_RandomForest

test('supplied aggregate bytes and digest match the manifest', () => {
  assert.equal(Buffer.byteLength(raw), manifest.jsonBytes)
  assert.equal(createHash('sha256').update(raw).digest('hex'), manifest.sha256)
  assert.equal(Object.keys(data.runs).length, 9)
})

for (const row of qa) {
  const [key, threshold, tp, fp, tn, fn, expectedTP, expectedFP, expectedTN, expectedFN, auc, ap, pass] = row.split(',')
  test(`${key} agrees with the four MATLAB QA counts at the exact frozen FPR10 threshold`, () => {
    const run = data.runs[key as RunKey]
    const index = frozenIndex(run)
    assert.equal(run.thresholds[index], Number(threshold))
    const result = metricsAt(run.groups.All, index)
    assert.deepEqual([result.tp, result.fp, result.tn, result.fn], [tp, fp, tn, fn].map(Number))
    assert.deepEqual([result.tp, result.fp, result.tn, result.fn], [expectedTP, expectedFP, expectedTN, expectedFN].map(Number))
    assert.equal(result.tp + result.fp + result.tn + result.fn, 50000)
    assert.equal(run.frozenMetrics.rocAuc, Number(auc))
    assert.equal(run.frozenMetrics.averagePrecision, Number(ap))
    assert.equal(pass, 'True')
  })
}

test('all exported thresholds and group counts are integer, bounded, monotonic and partition totals', () => {
  for (const run of Object.values(data.runs)) {
    assert.equal(run.thresholds[0], 0)
    assert.equal(run.thresholds.at(-1), 1)
    assert.ok(run.thresholds.includes(run.frozenThresholds.F1))
    for (const group of Object.values(run.groups)) {
      assert.equal(group.TP.length, run.thresholds.length)
      assert.equal(group.FP.length, run.thresholds.length)
      assert.equal(group.n, group.positive + group.negative)
      for (const [counts, max] of [[group.TP, group.positive], [group.FP, group.negative]] as const) {
        assert.ok(counts.every((x, i) => Number.isInteger(x) && x >= 0 && x <= max && (i === 0 || x <= counts[i - 1])))
      }
    }
    run.thresholds.forEach((t, i) => {
      assert.ok(i === 0 || t > run.thresholds[i - 1])
      for (const prefix of ['sex:', 'age:']) {
        const groups = Object.entries(run.groups).filter(([k]) => k.startsWith(prefix)).map(([, g]) => g)
        for (const field of ['n', 'positive', 'negative'] as const) assert.equal(groups.reduce((sum, g) => sum + g[field], 0), run.groups.All[field])
        for (const field of ['TP', 'FP'] as const) assert.equal(groups.reduce((sum, g) => sum + g[field][i], 0), run.groups.All[field][i])
      }
    })
  }
})

test('threshold selection is exact at 0, 1, FPR10, F1 and snaps without interpolation', () => {
  for (const run of Object.values(data.runs)) {
    assert.equal(nearestIndex(run.thresholds, 0), 0)
    assert.equal(nearestIndex(run.thresholds, 1), run.thresholds.length - 1)
    for (const t of Object.values(run.frozenThresholds)) assert.equal(run.thresholds[nearestIndex(run.thresholds, t)], t)
  }
  assert.equal(nearestIndex([0, 0.25, 0.75, 1], 0.5), 1)
  assert.equal(nearestIndex([0, 0.25, 0.75, 1], 0.74), 2)
})

test('duplicate and equal scores agree with the inclusive threshold semantics in an isolated test fixture', () => {
  const scores = [0, 0.5, 0.5, 1]
  const labels = [0, 1, 0, 1]
  const thresholds = [0, 0.5, 0.501, 1]
  const count = (label: number) => thresholds.map(t => scores.filter((s, i) => labels[i] === label && s >= t).length)
  const group = { n: 4, positive: 2, negative: 2, TP: count(1), FP: count(0) }
  assert.deepEqual(thresholds.map((_, i) => metricsAt(group, i).tp), [2, 2, 1, 1])
  assert.deepEqual(thresholds.map((_, i) => metricsAt(group, i).fp), [2, 1, 0, 0])
})

test('zero denominators remain unavailable, including in differences', () => {
  const m = metricsAt({ n: 0, positive: 0, negative: 0, TP: [0], FP: [0] }, 0)
  for (const value of [m.fpr, m.fnr, m.recall, m.precision, m.balanced, gapPP(m.fpr, 0.25)]) assert.equal(value, null)
})

test('switching model or feature resets to that run’s exact FPR10 and preserves other settings', () => {
  const a = experimentReducer(initialState, { type: 'index', index: 0 })
  const b = experimentReducer(a, { type: 'run', run: 'Full_KNN' })
  assert.equal(activeIndex(data.runs.Full_KNN, b), frozenIndex(data.runs.Full_KNN))
  const c = experimentReducer(b, { type: 'run', run: 'Basic_KNN' })
  assert.equal(activeIndex(data.runs.Basic_KNN, c), frozenIndex(data.runs.Basic_KNN))
  assert.equal(c.priceFN, a.priceFN)
  assert.equal(activeIndex(full, experimentReducer(a, { type: 'reset' })), frozenIndex(full))
})

test('point coordinates compute signed M − F from the same exact threshold', () => {
  const index = frozenIndex(full)
  const f = metricsAt(full.groups['sex:F'], index)
  const m = metricsAt(full.groups['sex:M'], index)
  const points = tradeoffPoints(full, 'sex', 'fnr')
  assert.equal(points.length, full.thresholds.length)
  assert.equal(points[index].threshold, full.thresholds[index])
  assert.equal(points[index].gap, (m.fnr! - f.fnr!) * 100)
  assert.equal(points[index].gap, groupGap(full, index, 'sex', 'fnr'))
})

test('hypothetical costs use observed counts and reject invalid inputs', () => {
  assert.deepEqual(scenarioCost(4188, 721, 50000, '1', '3'),
    { falsePositive: 4188, falseNegative: 2163, total: 6351, perThousand: 127.02 })
  assert.deepEqual(scenarioCost(4188, 721, 50000, '2', '5'),
    { falsePositive: 8376, falseNegative: 3605, total: 11981, perThousand: 239.62 })
  for (const value of ['', '-1', 'Infinity', 'abc']) assert.equal(unitCost(value), null)
  assert.equal(unitCost('0'), 0)
})

test('baseline compares the same actual defaults and recomputes at updated costs', () => {
  const baseline = (fpPrice: string, fnPrice: string) => costAgainstLowRisk(333, 4188, 721, 50000, fpPrice, fnPrice)!
  const standard = baseline('1', '3')
  assert.deepEqual([standard.total, standard.baseline, standard.difference], [6351, 3162, 3189])
  assert.deepEqual([standard.extraDetected, standard.extraFalseAlarms], [333, 4188])
  assert.equal(standard.breakEvenRatio?.toFixed(2), '12.58')
  const updated = baseline('2', '5')
  assert.deepEqual([updated.total, updated.baseline, updated.difference], [11981, 5270, 6711])
  assert.equal(baseline('1', '15').difference, -807)
})

test('baseline handles zero, invalid and unrepresentable prices', () => {
  assert.equal(costAgainstLowRisk(0, 5, 5, 100, '1', '1')?.breakEvenRatio, null)
  assert.equal(costAgainstLowRisk(5, 5, 0, 100, '0', '1')?.breakEvenRatio, null)
  assert.equal(costAgainstLowRisk(5, 5, 5, 100, '0', '0')?.difference, 0)
  assert.equal(costAgainstLowRisk(5, 5, 5, 100, '2', '-1'), null)
  assert.equal(costAgainstLowRisk(10, 0, 0, 100, '0', '1e308'), null)
})

test('threshold previews compare against the last committed point and resets use the exact frozen point', () => {
  const frozen = frozenIndex(full)
  const preview = experimentReducer(initialState, { type: 'index', index: frozen + 2, preview: true })
  assert.equal(activeIndex(full, preview), frozen + 2)
  assert.equal(previousThresholdIndex(full, preview), frozen)
  const committed = experimentReducer(preview, { type: 'index', index: frozen + 3 })
  assert.equal(previousThresholdIndex(full, committed), frozen)
  const next = experimentReducer(committed, { type: 'index', index: frozen + 7 })
  assert.equal(previousThresholdIndex(full, next), frozen + 3)
  const reset = experimentReducer(next, { type: 'reset' })
  assert.equal(activeIndex(full, reset), frozen)
  assert.equal(previousThresholdIndex(full, reset), frozen + 7)
  const switched = experimentReducer(next, { type: 'run', run: 'Basic_RandomForest' })
  assert.equal(previousThresholdIndex(data.runs.Basic_RandomForest, switched), undefined)
})

test('threshold deltas match counts, signed group rates and conservation of each class', () => {
  const from = frozenIndex(full)
  const to = nearestIndex(full.thresholds, 0.075)
  const delta = thresholdDelta(full, from, to, 'sex')
  assert.equal(delta.tp, full.groups.All.TP[to] - full.groups.All.TP[from])
  assert.equal(delta.fp, full.groups.All.FP[to] - full.groups.All.FP[from])
  assert.equal(delta.tp + delta.fn, 0)
  assert.equal(delta.fp + delta.tn, 0)
  assert.equal(delta.groups[0].fpr, gapPP(metricsAt(full.groups['sex:F'], from).fpr, metricsAt(full.groups['sex:F'], to).fpr))
  assert.equal(delta.fnrGap, groupGap(full, to, 'sex', 'fnr')! - groupGap(full, from, 'sex', 'fnr')!)
  const zero = { n: 0, positive: 0, negative: 0, TP: [0, 0], FP: [0, 0] }
  const missing = thresholdDelta({ ...full, groups: { All: zero, 'sex:F': zero, 'sex:M': zero } }, 0, 1, 'sex')
  assert.equal(missing.fprGap, null)
  assert.equal(missing.groups[0].fnr, null)
})

test('local focus indexes stay within real points and each comparison uses its own freeze', () => {
  assert.deepEqual(focusInterval(1003, 0), { min: 0, max: 30 })
  assert.deepEqual(focusInterval(1003, 1002), { min: 972, max: 1002 })
  assert.deepEqual(focusInterval(1003, 68), { min: 38, max: 98 })
  for (const run of Object.values(data.runs)) {
    const comparison = frozenComparison(run)
    assert.equal(comparison.fpr, metricsAt(run.groups.All, frozenIndex(run)).fpr)
    assert.equal(comparison.recall, metricsAt(run.groups.All, frozenIndex(run)).recall)
  }
  assert.equal(frozenComparison(data.runs.Basic_RandomForest).rocAuc.toFixed(4), '0.5731')
  assert.equal(frozenComparison(full).rocAuc.toFixed(4), '0.7376')
})

test('signed and absolute views preserve the same exact group point and its direction', () => {
  const index = frozenIndex(full)
  const fpr = groupGap(full, index, 'sex', 'fpr')
  const fnr = groupGap(full, index, 'sex', 'fnr')
  assert.ok(fpr! < 0 && fnr! > 0)
  assert.equal(displayGap(fpr, 'signed'), fpr)
  assert.equal(displayGap(fpr, 'absolute'), -fpr!)
  assert.equal(displayGap(fnr, 'absolute'), fnr)
  assert.equal(displayGap(null, 'absolute'), null)
  assert.equal(higherErrorGroup(fpr, 'sex'), 'F')
  assert.equal(higherErrorGroup(fnr, 'sex'), 'M')
  assert.equal(higherErrorGroup(-2, 'age'), '18–29')
  assert.equal(higherErrorGroup(2, 'age'), '60–100')
  assert.equal(higherErrorGroup(0, 'age'), null)
  assert.equal(higherErrorGroup(null, 'sex'), null)
  const state = experimentReducer(initialState, { type: 'gapView', view: 'absolute' })
  assert.equal(state.gapView, 'absolute')
  assert.equal(activeIndex(full, state), index)
})

test('only the verified frozen Full RandomForest sex point can show both bootstrap intervals', () => {
  const index = frozenIndex(full)
  const interval = frozenSexBootstrap(full, index, 'sex')!
  assert.deepEqual([interval.weekBlocks, interval.validReplicates], [9, 5000])
  for (const key of ['fpr', 'fnr'] as const) {
    assert.ok(Math.abs(interval.intervals[key].estimate - groupGap(full, index, 'sex', key)!) < 1e-12)
  }
  assert.deepEqual([interval.intervals.fpr.low, interval.intervals.fpr.high].map(value => value.toFixed(2)), ['-2.56', '-1.56'])
  assert.deepEqual([interval.intervals.fnr.low, interval.intervals.fnr.high].map(value => value.toFixed(2)), ['5.29', '13.75'])
  assert.equal(frozenSexBootstrap(full, index + 1, 'sex'), null)
  assert.equal(frozenSexBootstrap(full, index, 'age'), null)
  const basic = data.runs.Basic_RandomForest
  assert.equal(frozenSexBootstrap(basic, frozenIndex(basic), 'sex'), null)
})

test('selecting the already active comparison card returns to its freeze and clears marginal changes', () => {
  const moved = experimentReducer(initialState, { type: 'index', index: frozenIndex(full) + 1 })
  const selected = experimentReducer(moved, { type: 'comparisonRun', run: 'Full_RandomForest' })
  assert.equal(activeIndex(full, selected), frozenIndex(full))
  assert.equal(previousThresholdIndex(full, selected), undefined)
})

test('both preset prices update atomically without changing the frozen point', () => {
  const input = experimentReducer(initialState, { type: 'priceFP', value: '0' })
  const index = frozenIndex(full)
  const { tp, fp, fn } = metricsAt(full.groups.All, index)
  for (const [preset, expected] of [['default', [6351, 3162, 3189]], ['missedDefault', [15003, 15810, -807]]] as const) {
    const state = experimentReducer(input, { type: 'costPreset', preset })
    assert.equal(activeIndex(full, state), index)
    assert.equal(state.priceFP, costPresets[preset].prices.priceFP)
    assert.equal(state.priceFN, costPresets[preset].prices.priceFN)
    const result = costAgainstLowRisk(tp, fp, fn, full.nCases, state.priceFP, state.priceFN)!
    assert.deepEqual([result.total, result.baseline, result.difference], expected)
  }
})
