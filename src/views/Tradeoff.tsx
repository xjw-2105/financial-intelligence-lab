import { useMemo, useState, type PointerEvent } from 'react'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { scaleLinear } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { dimensions, frozenIndex, frozenSexBootstrap, tradeoffPoints, type ExperimentState, type FrozenRun } from '../domain/experiment'
import { decimal, gapDirection, gapNumber, percent } from '../ui/format'
import { DimensionToggle, GapViewToggle, type ControlsDispatch } from './Controls'

const width = 650
const height = 253
const left = 49
const right = width - 24
const bottom = height - 34
const top = 17

export default function Tradeoff({ run, index, state, dispatch }: { run: FrozenRun; index: number; state: ExperimentState; dispatch: ControlsDispatch }) {
  const absolute = state.gapView === 'absolute'
  const points = useMemo(() => tradeoffPoints(run, state.dimension, state.gap).map(point => ({
    ...point, ordinate: absolute ? Math.abs(point.gap) : point.gap,
  })), [run, state.dimension, state.gap, absolute])
  const [hover, setHover] = useState<number | null>(null)
  const x = useMemo(() => {
    const values = points.map(p => p.balanced)
    return scaleLinear({ domain: [Math.min(0.5, ...values) - 0.015, Math.max(0.5, ...values) + 0.015], range: [left, right], nice: true })
  }, [points])
  const y = useMemo(() => {
    const values = points.map(p => p.ordinate)
    const low = Math.min(0, ...values)
    const high = Math.max(0, ...values)
    const pad = Math.max(0.4, (high - low) * 0.07)
    return scaleLinear({ domain: [absolute ? 0 : low - pad, high + pad], range: [bottom, top], nice: true })
  }, [points, absolute])

  const current = points.find(p => p.index === index)
  const frozen = points.find(p => p.index === frozenIndex(run))
  const selected = hover === null ? current : points.find(p => p.index === hover) ?? current
  const choose = (index: number) => dispatch({ type: 'index', index: index === frozenIndex(run) ? null : index })
  const tickStyle = { fill: '#a0b3c7', fontSize: 13, fontFamily: 'ui-monospace, monospace' }

  function pointAt(event: PointerEvent<SVGSVGElement>) {
    const matrix = event.currentTarget.getScreenCTM()
    if (!matrix) return null
    const { x: px, y: py } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    if (px < left - 8 || px > right + 8 || py < top - 8 || py > bottom + 8) return null
    let nearest: number | null = null
    let distance = 9 ** 2
    for (const point of points) {
      const d = (x(point.balanced) - px) ** 2 + (y(point.ordinate) - py) ** 2
      if (d < distance || (d === distance && point.index === index)) {
        distance = d
        nearest = point.index
      }
    }
    return nearest
  }

  const { labels, gap } = dimensions[state.dimension]
  const first = labels[0]
  const last = labels[labels.length - 1]

  return (
    <article className="panel tradeoff-panel" aria-labelledby="curve-title">
      <div className="section-heading">
        <div><p className="micro-label">THRESHOLD TRADE-OFF</p><h2 id="curve-title">效能与公平性权衡</h2></div>
      </div>
      <div className="tradeoff-controls">
        <DimensionToggle state={state} dispatch={dispatch} />
        <div className="group-switch" role="group" aria-label="差距指标">
          <button type="button" aria-pressed={state.gap === 'fpr'} onClick={() => { setHover(null); dispatch({ type: 'gap', gap: 'fpr' }) }}>FPR 差距</button>
          <button type="button" aria-pressed={state.gap === 'fnr'} onClick={() => { setHover(null); dispatch({ type: 'gap', gap: 'fnr' }) }}>FNR 差距</button>
        </div>
        <GapViewToggle value={state.gapView} dispatch={dispatch} />
      </div>
      <div className="chart-axis-title">{state.gap.toUpperCase()} {absolute ? `绝对差距 |${gap}|` : `有方向差距 ${gap}`} · 百分点</div>
      <p className="chart-reading"><b>越接近零，所选指标的组间差异越小。</b> {absolute ? '原始方向见当前点说明。' : `正值表示 ${last} 组较高，负值表示 ${first} 组较高。`}</p>
      <div className="point-detail" data-testid="current-tradeoff" aria-live="polite">
        <span>当前阈值 <b>{decimal(run.thresholds[index])}</b></span>
        <span>平衡准确率 <b>{percent(current?.balanced ?? null)}</b></span>
        <span>{absolute ? '绝对' : '有方向'}差距 <b>{gapNumber(current?.gap ?? null, state.gapView)}</b>{current && ' 个百分点'} · {gapDirection(current?.gap ?? null, state.dimension)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="tradeoff-chart" data-testid="tradeoff" role="group" aria-label="离散阈值工作点图，左右方向键逐点选择" tabIndex={0}
        onPointerMove={event => setHover(pointAt(event))}
        onPointerLeave={() => setHover(null)}
        onPointerUp={event => { const point = pointAt(event); if (point !== null) choose(point) }}
        onKeyDown={event => {
          if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
          event.preventDefault()
          setHover(null)
          choose(Math.max(0, Math.min(run.thresholds.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1))))
        }}>
        {y.ticks(5).filter(tick => tick !== 0).map(tick => <line key={tick} x1={left} x2={right} y1={y(tick)} y2={y(tick)} stroke="#26384a" />)}
        <AxisLeft left={left} scale={y} numTicks={5} stroke="#3c5065" tickStroke="#3c5065" tickLabelProps={{ ...tickStyle, textAnchor: 'end', dx: '-0.35em', dy: '0.33em' }} />
        <AxisBottom top={bottom} scale={x} numTicks={5} stroke="#3c5065" tickStroke="#3c5065" tickLabelProps={{ ...tickStyle, textAnchor: 'middle', dy: '0.35em' }} tickFormat={t => percent(Number(t), 0)} />
        <line data-testid="gap-zero" x1={left} x2={right} y1={y(0)} y2={y(0)} stroke="#acc4d7" strokeWidth={1.25} strokeDasharray="5 4" />
        <text x={right - 6} y={y(0) - 5} textAnchor="end" fill="#c0d4e2" fontSize={12}>零差距</text>
        <LinePath data={points} x={point => x(point.balanced)} y={point => y(point.ordinate)} stroke="#7cc5f8" strokeWidth={1.1} strokeOpacity={0.56} />
        {frozen && <circle data-testid="frozen-point" onPointerUp={event => { event.stopPropagation(); choose(frozen.index) }} cx={x(frozen.balanced)} cy={y(frozen.ordinate)} r={7.5} stroke="#ccb48e" strokeWidth={1.8} fill="none" />}
        {current && <circle data-testid="selected-point" cx={x(current.balanced)} cy={y(current.ordinate)} r={4.7} fill="#b0deff" stroke="#08131d" strokeWidth={1.5} />}
        {selected && hover !== null && selected.index !== current?.index && <circle cx={x(selected.balanced)} cy={y(selected.ordinate)} r={5.5} fill="#f2f4f7" />}
      </svg>
      <div className="chart-axis-foot"><span>总体平衡准确率</span><span><i className="dot current" />当前 <i className="dot frozen" />FPR10 基准点</span></div>
      <details className="precise-threshold chart-precision"><summary>当前点精确阈值</summary><output>{run.thresholds[index]}</output></details>
      {selected && selected.index !== current?.index && <p className="control-note">指向阈值 {decimal(selected.threshold)} · 平衡准确率 {percent(selected.balanced)} · 差距 {gapNumber(selected.gap, state.gapView)} 个百分点</p>}
      <p className="control-note">曲线按阈值顺序连接已导出的工作点，未做帕累托最优前沿筛选。点击离散点或用左右方向键选择阈值。</p>
      <p className="control-note">{index !== frozenIndex(run) ? '无置信区间的交互探索 · 仅描述当前测试记录。' : frozenSexBootstrap(run, index, state.dimension) ? '基准点的性别有方向差距区间见审计页。' : '基准点的描述性差距 · 本页未展示置信区间。'}{state.dimension === 'age' && ' 年龄档来自匿名化日期转换。'}</p>
    </article>
  )
}
