import { useState, type Dispatch } from 'react'
import { features, models, modelNames, frozenIndex, focusInterval, nearestIndex, type FrozenRun, type ExperimentState, type experimentReducer, type RunKey } from '../domain/experiment'
import { Slider } from '../ui/slider'
import { metricsAt } from '../domain/metrics'
import { decimal, percent } from '../ui/format'

export type ControlsDispatch = Dispatch<Parameters<typeof experimentReducer>[1]>

export function RunControls({ run, index, dispatch }: { run: FrozenRun; index: number; dispatch: ControlsDispatch }) {
  const selectRun = (key: RunKey) => dispatch({ type: 'run', run: key })
  return (
    <section id="model-controls" className="controls-panel" aria-label="模型、特征与阈值">
      <div className="run-pickers">
        <fieldset><legend>已训练模型</legend><div className="segmented">
          {models.map(model => <button type="button" key={model} aria-pressed={model === run.model} onClick={() => selectRun(`${run.featureSet}_${model}`)}>{modelNames[model]}</button>)}
        </div></fieldset>
        <fieldset><legend>特征组</legend><div className="segmented">
          {features.map(feature => <button type="button" key={feature} aria-pressed={feature === run.featureSet} onClick={() => selectRun(`${feature}_${run.model}`)}>{feature}</button>)}
        </div></fieldset>
      </div>
      <ThresholdControl key={`${run.featureSet}_${run.model}`} run={run} index={index} dispatch={dispatch} />
    </section>
  )
}

function ThresholdControl({ run, index, dispatch }: { run: FrozenRun; index: number; dispatch: ControlsDispatch }) {
  const [draft, setDraft] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [focus, setFocus] = useState<ReturnType<typeof focusInterval> | null>(null)
  const threshold = run.thresholds[index]
  const formatted = decimal(threshold)
  const frozen = frozenIndex(run)
  const f1 = run.thresholds.indexOf(run.frozenThresholds.F1)
  const end = run.thresholds.length - 1
  const { min, max } = focus
    ? index >= focus.min && index <= focus.max ? focus : focusInterval(run.thresholds.length, index)
    : { min: 0, max: end }
  const actualFpr = metricsAt(run.groups.All, index).fpr

  function select(next: number, preview = false) {
    dispatch({ type: 'index', index: next === frozen ? null : next, preview })
  }

  function jump(next: number) {
    setDraft(null)
    setNotice('')
    if (focus) setFocus(focusInterval(run.thresholds.length, next))
    select(next)
  }

  function commit() {
    if (draft === null) return
    setDraft(null)
    const requested = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(requested)) {
      setNotice('请输入有效数值。')
      return
    }
    // The rounded label is an alias for the currently selected exact point.
    const next = requested === Number(formatted) ? index : nearestIndex(run.thresholds, requested)
    const selected = run.thresholds[next]
    if (focus && (next < min || next > max)) setFocus(focusInterval(run.thresholds.length, next))
    setNotice(selected === requested || next === index && requested === Number(formatted) ? '' : `已吸附至最近可计算点 ${decimal(selected)}。`)
    select(next)
  }

  async function copyExact() {
    try {
      await navigator.clipboard.writeText(String(threshold))
      setNotice('已复制精确阈值。')
    } catch {
      setNotice('可选中精确阈值手动复制。')
    }
  }

  return (
    <div className="threshold-control">
      <div className="threshold-heading">
        <label htmlFor="threshold-value">模型风险分数阈值</label>
        {index === frozen && <span className="frozen-pill">FPR10 冻结点</span>}
        {index === f1 && index !== frozen && <span className="frozen-pill">验证集 F1 点</span>}
      </div>
      <div className="threshold-row">
        <div className="threshold-track">
          {min <= frozen && frozen <= max && <span className="threshold-marker" style={{ left: `${(frozen - min) / (max - min) * 100}%` }} title={`冻结 FPR10 · ${run.frozenThresholds.FPR10}`} />}
          <Slider min={min} max={max} step={1} value={[index]} thumbLabel="离散阈值" thumbValueText={String(threshold)}
            onValueChange={([value]) => {
              setNotice('')
              if (focus && (focus.min !== min || focus.max !== max)) setFocus({ min, max })
              select(value, true)
            }} onValueCommit={([value]) => select(value)} />
          <div className="track-labels" aria-hidden="true"><span>{focus ? decimal(run.thresholds[min]) : '0'}</span><span>{focus ? decimal(run.thresholds[max]) : '1'}</span></div>
        </div>
        <form onSubmit={event => { event.preventDefault(); commit() }} className="threshold-form">
          <input id="threshold-value" className="numeric-input" value={draft ?? formatted} inputMode="decimal" onChange={event => setDraft(event.target.value)} onBlur={commit} aria-describedby="threshold-status" />
        </form>
        <button className="button small secondary" type="button" aria-label="重置 FPR10" onClick={() => jump(frozen)}>还原 FPR10</button>
      </div>
      <div className="threshold-tools">
        <button className="button small local-tool" type="button" aria-pressed={Boolean(focus)} onClick={() => setFocus(focus ? null : focusInterval(run.thresholds.length, index))}>局部细调</button>
        <button className="button small local-tool" type="button" disabled={f1 < 0} onClick={() => jump(f1)}>验证集 F1 点</button>
        <details className="precise-threshold"><summary>精确阈值</summary>
          <div><output data-testid="exact-threshold">{String(threshold)}</output><button className="button small local-tool" type="button" onClick={copyExact}>复制</button></div>
        </details>
      </div>
      <p className="test-fpr-note">FPR10 在验证集按 FPR ≤ 10% 的目标选点 · <strong>测试集当前 FPR {percent(actualFpr)}</strong></p>
      <p id="threshold-status" className="control-note" aria-live="polite">{notice || '滑块仅选择已导出点。分数不可跨模型直接比较。'}</p>
    </div>
  )
}

export function DimensionToggle({ state, dispatch }: { state: ExperimentState; dispatch: ControlsDispatch }) {
  return (
    <div className="group-switch" role="group" aria-label="群体视角">
      <button type="button" aria-pressed={state.dimension === 'sex'} onClick={() => dispatch({ type: 'dimension', dimension: 'sex' })}>性别 F/M</button>
      <button type="button" aria-pressed={state.dimension === 'age'} onClick={() => dispatch({ type: 'dimension', dimension: 'age' })}>操作性年龄</button>
    </div>
  )
}
