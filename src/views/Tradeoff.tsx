import { useMemo, useState, type PointerEvent } from 'react'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { scaleLinear } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { dimensions, frozenIndex, tradeoffPoints, type ExperimentState, type FrozenRun } from '../domain/experiment'
import { percent, signed } from '../ui/format'
import { DimensionToggle, type ControlsDispatch } from './Controls'

const width = 650
const height = 253
const left = 49
const right = width - 24
const bottom = height - 34
const top = 17

export default function Tradeoff({ run, index, state, dispatch }: { run: FrozenRun; index: number; state: ExperimentState; dispatch: ControlsDispatch }) {
  const points = useMemo(() => tradeoffPoints(run, state.dimension, state.gap), [run, state.dimension, state.gap])
  const [hover, setHover] = useState<number | null>(null)
  const x = useMemo(() => {
    const values = points.map(p => p.balanced)
    return scaleLinear({ domain: [Math.min(0.5, ...values) - 0.015, Math.max(0.5, ...values) + 0.015], range: [left, right], nice: true })
  }, [points])
  const y = useMemo(() => {
    const values = points.map(p => p.gap)
    const low = Math.min(0, ...values)
    const high = Math.max(0, ...values)
    const pad = Math.max(0.4, (high - low) * 0.07)
    return scaleLinear({ domain: [low - pad, high + pad], range: [bottom, top], nice: true })
  }, [points])

  const current = points.find(p => p.index === index)
  const frozen = points.find(p => p.index === frozenIndex(run))
  const selected = hover === null ? current : points.find(p => p.index === hover) ?? current
  const path = useMemo(() => points.map(p => `M${x(p.balanced).toFixed(2)} ${y(p.gap).toFixed(2)}h.7`).join(' '), [points, x, y])
  const choose = (index: number) => dispatch({ type: 'index', index: index === frozenIndex(run) ? null : index })
  const tickStyle = { fill: '#a0b3c7', fontSize: 13, fontFamily: 'ui-monospace, monospace' }

  function pointAt(event: PointerEvent<SVGSVGElement>) {
    const matrix = event.currentTarget.getScreenCTM()
    if (!matrix) return null
    const { x: px, y: py } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    if (px < left - 8 || px > right + 8 || py < top - 8 || py > bottom + 8) return null
    let nearest: number | null = null
    let distance = 14 ** 2
    for (const point of points) {
      const d = (x(point.balanced) - px) ** 2 + (y(point.gap) - py) ** 2
      if (d < distance || (d === distance && point.index === index)) {
        distance = d
        nearest = point.index
      }
    }
    return nearest
  }

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
      </div>
      <div className="chart-axis-title">{state.gap.toUpperCase()} 差距 · {dimensions[state.dimension].gap} · 百分点</div>
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
        {y.ticks(5).map(tick => <line key={tick} x1={left} x2={right} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? '#50718a' : '#26384a'} strokeDasharray={tick === 0 ? '4 4' : undefined} />)}
        <AxisLeft left={left} scale={y} numTicks={5} stroke="#3c5065" tickStroke="#3c5065" tickLabelProps={{ ...tickStyle, textAnchor: 'end', dx: '-0.35em', dy: '0.33em' }} />
        <AxisBottom top={bottom} scale={x} numTicks={5} stroke="#3c5065" tickStroke="#3c5065" tickLabelProps={{ ...tickStyle, textAnchor: 'middle', dy: '0.35em' }} tickFormat={t => percent(Number(t), 0)} />
        <LinePath data={points} x={point => x(point.balanced)} y={point => y(point.gap)} stroke="#7cc5f8" strokeWidth={1.1} strokeOpacity={0.56} />
        <path d={path} stroke="#93c5e6" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
        {frozen && <circle data-testid="frozen-point" onPointerUp={event => { event.stopPropagation(); choose(frozen.index) }} cx={x(frozen.balanced)} cy={y(frozen.gap)} r={7.5} stroke="#ccb48e" strokeWidth={1.8} fill="none" />}
        {current && <circle data-testid="selected-point" cx={x(current.balanced)} cy={y(current.gap)} r={4.7} fill="#b0deff" stroke="#08131d" strokeWidth={1.5} />}
        {selected && hover !== null && selected.index !== current?.index && <circle cx={x(selected.balanced)} cy={y(selected.gap)} r={5.5} fill="#f2f4f7" />}
      </svg>
      <div className="chart-axis-foot"><span>总体平衡准确率</span><span><i className="dot current" />当前 <i className="dot frozen" />冻结 FPR10</span></div>
      {selected && <div className="point-detail">
        <span>{hover === null ? '当前点' : '指向点'} <b>{selected.threshold}</b></span>
        <span>平衡准确率 <b>{percent(selected.balanced)}</b></span><span>差距 <b>{signed(selected.gap)} pp</b></span>
      </div>}
      <p className="control-note">点击轨迹上的离散点可同步审计阈值。线条按阈值顺序连接已导出点。{state.dimension === 'age' && ' 年龄为匿名化后的操作性分层。'}</p>
    </article>
  )
}
