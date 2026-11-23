import { useRef } from 'react'
import { costAgainstLowRisk, costPresets, unitCost, type CostPreset } from '../domain/cost'
import type { ExperimentState, FrozenRun } from '../domain/experiment'
import { metricsAt } from '../domain/metrics'
import { costNumber, count } from '../ui/format'
import type { ControlsDispatch } from './Controls'
import Tradeoff from './Tradeoff'

const decision = '暂缓独立上岗，继续监督测试'

export default function Committee({ run, index, state, dispatch, projection }: { run: FrozenRun; index: number; state: ExperimentState; dispatch: ControlsDispatch; projection: boolean }) {
  const basis = useRef<HTMLDetailsElement>(null)
  const { tp, fp, fn } = metricsAt(run.groups.All, index)
  const result = costAgainstLowRisk(tp, fp, fn, run.nCases, state.priceFP, state.priceFN)

  const difference = result?.difference
  const signedDifference = difference === undefined ? '不可计算' : `${difference > 0 ? '+' : difference < 0 ? '−' : ''}${costNumber(Math.abs(difference))}`
  const direction = difference === 0 ? '与基线持平' : difference && difference > 0 ? '高于基线' : '低于基线'

  return (
    <>
      {projection && <aside className="decision-summary" aria-label="委员会结论速览">
        <p><span>委员会固定建议</span><strong>{decision}</strong></p>
        <button type="button" className="button secondary small" onClick={() => {
          if (!basis.current) return
          basis.current.open = true
          basis.current.querySelector('summary')?.focus({ preventScroll: true })
          basis.current.scrollIntoView({ block: 'center' })
        }}>查看决议依据</button>
      </aside>}
      <div className="cost-grid">
        <article className="panel costs-panel" aria-labelledby="cost-title">
          <div className="section-heading"><div><p className="micro-label bronze">COST SCENARIO</p><h2 id="cost-title">假设成本模拟</h2></div></div>
          <p className="cost-context">当前 {count(run.nCases)} 条留出案例 · 假设成本单位/次</p>
          <div className="cost-presets" role="group" aria-label="假设成本情景">
            {(Object.keys(costPresets) as CostPreset[]).map(preset => {
              const { label, prices } = costPresets[preset]
              return <button key={preset} type="button" className="button secondary" aria-pressed={state.priceFP === prices.priceFP && state.priceFN === prices.priceFN}
                onClick={() => dispatch({ type: 'costPreset', preset })}>
                <strong>假设 · {label}</strong><span>FP {prices.priceFP} · FN {prices.priceFN}</span>
              </button>
            })}
          </div>
          <div className="cost-inputs">
            {([{ key: 'priceFP', label: '假阳性单价 C_FP', cases: fp }, { key: 'priceFN', label: '假阴性单价 C_FN', cases: fn }] as const).map(({ key, label, cases }) =>
              <label key={key}><span>{label}</span><input type="number" min="0" step="any" inputMode="decimal" className="numeric-input" value={state[key]}
                aria-invalid={unitCost(state[key]) === null} onChange={event => dispatch({ type: key, value: event.target.value })} /><small>{count(cases)} 次</small></label>)}
          </div>
          {result ? <>
            <dl className="cost-comparison" aria-live="polite">
              <div><dt>当前模拟成本</dt><dd data-testid="cost-total">{costNumber(result.total)}</dd><small>假设单位</small></div>
              <div><dt>全低风险基线</dt><dd data-testid="cost-baseline">{costNumber(result.baseline)}</dd><small>假设单位</small></div>
              <div className={result.difference > 0 ? 'cost-premium' : 'cost-saving'}><dt>当前 − 基线</dt><dd data-testid="cost-difference">{signedDifference}</dd><small>{direction}</small></div>
            </dl>
            <p className="cost-per-case">每 1,000 案例 <b>{costNumber(result.perThousand)}</b> 假设单位</p>
            <p className="scenario-reading"><strong>当前情景解读</strong><br />
              相对全低风险，多识别 <b data-testid="extra-detected">{count(result.extraDetected)}</b> 例实际违约，增加 <b data-testid="extra-false-alarms">{count(result.extraFalseAlarms)}</b> 例未违约误报。当前模拟成本{direction}。
            </p>
          </> : <p role="status" className="group-warning">请输入两个有效的非负单价，且计算结果须在数值范围内。</p>}
          <dl className="cost-breakdown">
            <div><dt>FP 成本分项</dt><dd>{costNumber(result?.falsePositive ?? null)}</dd></div>
            <div><dt>FN 成本分项</dt><dd>{costNumber(result?.falseNegative ?? null)}</dd></div>
          </dl>
          <p className="control-note">基线将全部案例判为低风险，假设成本为 {count(run.positives)} 次漏判乘以 C_FN。金额均为假设单位，原实验没有观测真实审批和实际损失。</p>
          {result?.breakEvenRatio !== null && result?.breakEvenRatio !== undefined && <details className="cost-footnote">
            <summary>查看当前测试点的成本临界比</summary>
            <p>当 C_FP &gt; 0 时，C_FN / C_FP 要超过临界比（约 {result.breakEvenRatio.toFixed(2)}），该测试点的模拟成本才低于全低风险基线。此值只解释已选测试点。</p>
          </details>}

        </article>
        <Tradeoff key={`${run.featureSet}_${run.model}_${state.dimension}_${state.gap}`} run={run} index={index} state={state} dispatch={dispatch} />
      </div>
      <article className="decision" aria-labelledby="decision-title">
        <div><p className="micro-label bronze">COMMITTEE DECISION</p><h2 id="decision-title">{decision}</h2><p>固定的课程情景建议 · 成本或阈值调整时保持本结论。保留人工监督，补做时间稳定性审计。</p></div>
        <details ref={basis}><summary>展开决议依据与局限</summary><div>
          <p>不同阈值会重新分配误报和漏判。群体差距与排序效能共同用于判断能否进入下一轮验证。</p>
          <p>目前缺少实际审批与损失、客户级隔离和更成熟的时间验证。建议以更长观测期复核群体表现，再讨论部署决策。</p>
        </div></details>
      </article>
    </>
  )
}
