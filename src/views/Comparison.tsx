import { useState } from 'react'
import { displayGap, features, frozenComparison, modelNames, models, type Dataset, type ExperimentState, type GapMetric } from '../domain/experiment'
import { decimal, gapDirection, gapNumber, percent, signed } from '../ui/format'
import { GapViewToggle, type ControlsDispatch } from './Controls'

type RankingMetric = 'rocAuc' | 'ap'
const rankingLabels = { rocAuc: 'ROC-AUC', ap: 'AP' }

export default function Comparison({ data, state, dispatch }: { data: Dataset; state: ExperimentState; dispatch: ControlsDispatch }) {
  const [view, setView] = useState<'ranking' | 'fairness'>('ranking')
  const [ranking, setRanking] = useState<RankingMetric>('rocAuc')
  const [metric, setMetric] = useState<GapMetric>('fpr')
  const gapKey = metric === 'fpr' ? 'fprGap' : 'fnrGap'
  const label = view === 'ranking' ? rankingLabels[ranking] : metric.toUpperCase()
  const metricValue = (stats: ReturnType<typeof frozenComparison>) => view === 'ranking' ? stats[ranking] : displayGap(stats[gapKey], state.gapView)
  return (
    <details className="panel comparison" id="model-comparison">
      <summary>九组模型与特征对照</summary>
      <p className="comparison-caveat">各组使用各自的验证集 FPR10 基准点，测试集实际 FPR 不完全相同。跨档变化同时受到工作点影响，单凭这张表无法归因于新增特征。</p>
      <div className="tradeoff-controls comparison-controls">
        <div className="group-switch" role="group" aria-label="九组比较视图">
          <button type="button" aria-pressed={view === 'ranking'} onClick={() => setView('ranking')}>排序能力</button>
          <button type="button" aria-pressed={view === 'fairness'} onClick={() => setView('fairness')}>群体误判</button>
        </div>
        {view === 'ranking' ? <div className="group-switch" role="group" aria-label="排序指标">
          {(Object.keys(rankingLabels) as RankingMetric[]).map(key => <button key={key} type="button" aria-pressed={ranking === key} onClick={() => setRanking(key)}>{rankingLabels[key]}</button>)}
        </div> : <>
          <div className="group-switch" role="group" aria-label="九组误判指标">
            <button type="button" aria-pressed={metric === 'fpr'} onClick={() => setMetric('fpr')}>FPR 差距</button>
            <button type="button" aria-pressed={metric === 'fnr'} onClick={() => setMetric('fnr')}>FNR 差距</button>
          </div>
          <GapViewToggle value={state.gapView} dispatch={dispatch} />
        </>}
      </div>
      {view === 'ranking' ? <p>比较主实验的 ROC-AUC / AP。两项衡量分数排序能力，表内的跨档变化按当前选中指标计算。</p> :
        <p>性别 F/M 的 {state.gapView === 'signed' ? '有方向差距 M − F' : '绝对差距 |M − F|'}以百分点计。各组 FPR 以实际未违约为分母，FNR 以实际违约为分母。</p>}
      <div className="table-wrap" tabIndex={0} role="region" aria-label="九组比较表，可横向滚动">
        <table className="comparison-table">
          <caption className="sr-only">三种模型在 Basic、Enhanced、Full 特征组的结果对照</caption>
          <thead><tr><th scope="col">模型</th>{features.map(feature => <th key={feature} scope="col">{feature}</th>)}</tr></thead>
          <tbody>{models.map(model => <tr key={model}>
            <th scope="row">{modelNames[model]}</th>
            {features.map((feature, column) => {
              const key = `${feature}_${model}` as const
              const run = data.runs[key]
              const stats = frozenComparison(run)
              const value = metricValue(stats)
              const prior = column ? metricValue(frozenComparison(data.runs[`${features[column - 1]}_${model}`])) : null
              const delta = value === null || prior === null ? null : value - prior
              const other = ranking === 'ap' ? 'rocAuc' : 'ap'
              const shown = view === 'ranking' ? decimal(stats[ranking]) : gapNumber(stats[gapKey], state.gapView)
              const deltaLabel = view === 'ranking' && delta !== null ? `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${decimal(Math.abs(delta))}` : signed(delta)
              return <td key={key}><button type="button" className="comparison-cell" aria-pressed={state.run === key} aria-label={`切换 ${feature} ${modelNames[model]}`} aria-describedby={`comparison-primary-${key} comparison-metrics-${key}`} onClick={() => dispatch({ type: 'comparisonRun', run: key })}>
                <span className="comparison-primary" id={`comparison-primary-${key}`}><span>{label}</span> <strong data-testid={`comparison-value-${key}`}>{shown}</strong>{view === 'fairness' && value !== null && <small> 个百分点</small>}</span>
                <span className="comparison-metrics" id={`comparison-metrics-${key}`}>
                  <span>{view === 'ranking' ? <>{rankingLabels[other]} <b>{decimal(stats[other])}</b></> : gapDirection(stats[gapKey], 'sex')}</span>
                  <span>测试 FPR <b>{percent(stats.fpr)}</b></span>
                  <span title={String(run.frozenThresholds.FPR10)}>基准阈值 <b>{decimal(run.frozenThresholds.FPR10)}</b></span>
                </span>
                <span className="comparison-change">{column === 0 ? '跨档参照' : <>较 {features[column - 1]} <b>{deltaLabel}</b>{view === 'fairness' && delta !== null && ' 个百分点'}</>}</span>
              </button></td>
            })}
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  )
}
