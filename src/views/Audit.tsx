import { dimensions, frozenIndex, frozenSexBootstrap, groupGap, previousThresholdIndex, thresholdDelta, type Dataset, type ExperimentState, type FrozenRun } from '../domain/experiment'
import { metricsAt } from '../domain/metrics'
import { count, decimal, errorDirection, gapDirection, percent, signed } from '../ui/format'
import { Modal } from '../ui/Modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import type { ControlsDispatch } from './Controls'
import Comparison from './Comparison'

const explanations = {
  recall: { title: 'Recall · 召回率', formula: 'TP ÷ (TP + FN)', body: '在真实违约案例中，模型识别为高风险的比例。分母是实际正类数。' },
  precision: { title: 'Precision · 精确率', formula: 'TP ÷ (TP + FP)', body: '在预测高风险案例中，实际违约的比例。分母是预测正类数。' },
  fpr: { title: 'FPR · 假阳性率', formula: 'FP ÷ (FP + TN)', body: '在真实未违约案例中，被标成高风险的比例。分母是真实负类数。' },
  fnr: { title: 'FNR · 假阴性率', formula: 'FN ÷ (FN + TP)', body: '在真实违约案例中，被模型漏判的比例。分母是真实正类数。' },
  balanced: { title: 'Balanced Accuracy · 平衡准确率', formula: '(Recall + 1 − FPR) ÷ 2', body: '等权衡量对违约与未违约两类的识别表现。两个类都必须有样本。' },
  rocAuc: { title: 'ROC-AUC', formula: 'ROC 曲线下面积', body: '冻结实验的排序指标，各阈值共用一个值。用来衡量模型对正、负类分数的区分能力。' },
  averagePrecision: { title: 'AP · 平均精确率', formula: '精确率按召回率增量加权', body: '冻结实验的精确率–召回率排序指标，各阈值共用一个值。' },
} as const

function MetricButton({ metric, value }: { metric: keyof typeof explanations; value: string }) {
  const d = explanations[metric]
  return (
    <Modal title={d.title} trigger={<button type="button" className="metric-item" data-metric={metric}>
      <span>{d.title.split(' · ')[0]} <i aria-hidden="true">ⓘ</i></span><strong>{value}</strong>
    </button>}>
      <p className="metric-formula">{d.formula}</p>
      <p>{d.body}</p>
      <p className="muted">分母为零的比率显示“不可计算”。</p>
    </Modal>
  )
}

function Matrix({ values }: { values: ReturnType<typeof metricsAt> }) {
  const cell = (key: 'tp' | 'fn' | 'fp' | 'tn', label: string) => (
    <td className={`matrix-cell ${key}`}><span>{key.toUpperCase()} <small>{label}</small></span><strong data-count={key}>{count(values[key])}</strong></td>
  )
  return (
    <article className="panel matrix-panel" aria-labelledby="matrix-title">
      <div className="section-heading"><div><p className="micro-label">CONFUSION MATRIX</p><h2 id="matrix-title">总体混淆矩阵</h2></div>
        <Modal title="矩阵与业务含义" trigger={<button className="button text-button" type="button">判类口径</button>}>
          <p>行是真实违约标签，列是模型按当前阈值作出的预测分类。真实正类代表后续违约。预测高风险仅指分数达到本配置阈值。</p>
          <p>假阳性是未违约但被标高风险，假阴性是实际违约但未被模型标出。界面无真实审批记录。</p>
        </Modal>
      </div>
      <table className="matrix">
        <caption className="sr-only">行表示真实标签，列表示预测结果</caption>
        <thead><tr><td>真实标签 / 预测</td><th scope="col">高风险</th><th scope="col">低风险</th></tr></thead>
        <tbody>
          <tr><th scope="row">违约</th>{cell('tp', '识别')}{cell('fn', '漏判')}</tr>
          <tr><th scope="row">未违约</th>{cell('fp', '误报')}{cell('tn', '排除')}</tr>
        </tbody>
      </table>
    </article>
  )
}

const errorRates = ['fpr', 'fnr'] as const

type SignedGaps = Record<typeof errorRates[number], number | null>

function GroupTable({ run, index, dimension, gaps }: { run: FrozenRun; index: number; dimension: ExperimentState['dimension']; gaps: SignedGaps }) {
  const { keys, labels, gap } = dimensions[dimension]
  const rows = keys.map((key, i) => ({ label: labels[i], group: run.groups[key], value: metricsAt(run.groups[key], index) }))
  const fprMax = Math.max(0.01, ...rows.map(row => row.value.fpr ?? 0))
  const fnrMax = Math.max(0.01, ...rows.map(row => row.value.fnr ?? 0))
  const interval = frozenSexBootstrap(run, index, dimension)
  return (
    <>
      {dimension === 'age' ? <p className="group-warning">差距为 60–100 减 18–29。年龄档来自匿名化日期转换，人口学真实年龄未经核证。</p> :
        <p className="group-note">F/M 为匿名字段。误报以本组实际未违约为分母，漏判以本组实际违约为分母。</p>}
      <div className="table-wrap">
        <table className="group-table">
          <thead><tr><th scope="col">群体</th><th scope="col">样本数</th><th scope="col">FPR · 误报</th><th scope="col">FNR · 漏判</th></tr></thead>
          <tbody>{rows.map(({ label, group, value }) => (
            <tr key={label}><th scope="row">{label}</th><td>{count(group.n)}</td>
              <td><b>{percent(value.fpr)}</b><div className="rate-bar fpr" aria-hidden="true"><i style={{ width: `${(value.fpr ?? 0) / fprMax * 100}%` }} /></div><small>{count(value.fp)} / {count(group.negative)} 负类</small></td>
              <td><b>{percent(value.fnr)}</b><div className="rate-bar fnr" aria-hidden="true"><i style={{ width: `${(value.fnr ?? 0) / fnrMax * 100}%` }} /></div><small>{count(value.fn)} / {count(group.positive)} 正类</small></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="gap-strip">
        <span>差距 <b>{gap}</b></span>
        {errorRates.map(key => {
          const value = gaps[key]
          return <div key={key}><span>{key.toUpperCase()}</span> <strong data-gap={key}>{signed(value)}</strong>{value !== null && <small> 个百分点 · {gapDirection(value, dimension)}</small>}</div>
        })}
      </div>
      {interval ? <details className="uncertainty" data-testid="frozen-bootstrap">
        <summary>查看冻结点的 95% Bootstrap 区间</summary>
        <p>{interval.weekBlocks} 个测试周块，{count(interval.validReplicates)} 次有效重抽。Full 随机森林 FPR10 性别 M − F（百分点）。</p>
        <p>FPR <b>[{signed(interval.intervals.fpr.low)}, {signed(interval.intervals.fpr.high)}]</b> · FNR <b>[{signed(interval.intervals.fnr.low)}, {signed(interval.intervals.fnr.high)}]</b></p>
        <p>区间衡量冻结预测的周块波动，未涵盖重复客户或重训的不确定性。</p>
      </details> : <p className="uncertainty" role="status">{index === frozenIndex(run) ? '冻结点的描述性差距 · 本页未展示置信区间' : '无置信区间的交互探索 · 仅描述当前测试记录'}</p>}
    </>
  )
}

function ThresholdFeedback({ run, index, previous, dimension }: { run: FrozenRun; index: number; previous: number; dimension: ExperimentState['dimension'] }) {
  const change = thresholdDelta(run, previous, index, dimension)
  const describe = (n: number, action: string) => n === 0 ? `${action}数未变` : `${n > 0 ? '多' : '少'}${action} ${count(Math.abs(n))} 例`
  return (
    <section className="panel threshold-feedback" aria-label="阈值调整差值">
      <p role="status"><strong>相对上次生效阈值</strong> · 本次{describe(change.tp, '识别违约')}，{describe(change.fp, '误报未违约')}。</p>
      <div className="delta-list">{(['tp', 'fp', 'fn', 'tn'] as const).map(key =>
        <span key={key}>{key.toUpperCase()} <b data-delta={key}>{change[key] === 0 ? '0' : `${change[key] > 0 ? '+' : '−'}${count(Math.abs(change[key]))}`}</b></span>
      )}</div>
      <details><summary>群体误判率变化（百分点）</summary>
        <div className="delta-list">{change.groups.map(group =>
          <span key={group.label}>{group.label} · FPR <b>{signed(group.fpr)}</b> · FNR <b>{signed(group.fnr)}</b></span>
        )}</div>
        <p>组间差距变化 · FPR <b data-testid="fpr-gap-change">{signed(change.fprGap)}</b> · FNR <b>{signed(change.fnrGap)}</b></p>
      </details>
    </section>
  )
}

export default function Audit({ data, run, index, state, dispatch, projection }: { data: Dataset; run: FrozenRun; index: number; state: ExperimentState; dispatch: ControlsDispatch; projection: boolean }) {
  const values = metricsAt(run.groups.All, index)
  const previous = previousThresholdIndex(run, state)
  const { dimension } = state
  const gaps = { fpr: groupGap(run, index, dimension, 'fpr'), fnr: groupGap(run, index, dimension, 'fnr') }
  const { gap } = dimensions[dimension]
  return (
    <>
      <div className="audit-overview">
        <section className="panel audit-headline" aria-labelledby="audit-headline-title">
          <div className="section-heading"><h2 id="audit-headline-title">总体识别效果</h2></div>
          <dl className="audit-counts">
            <div><dt>识别违约 <small>TP</small></dt><dd data-testid="headline-tp">{count(values.tp)}</dd></div>
            <div><dt>误报未违约 <small>FP</small></dt><dd data-testid="headline-fp">{count(values.fp)}</dd></div>
            <div><dt>召回率</dt><dd data-testid="headline-recall">{percent(values.recall)}</dd></div>
          </dl>
          {projection && <section className="error-directions" aria-label="群体错误方向">
            <h3>群体错误方向 <small>{gap}</small></h3>
            <dl>{errorRates.map(metric => <div key={metric}>
              <dt>{metric.toUpperCase()} <strong data-testid={`direction-${metric}`}>{signed(gaps[metric])}</strong>{gaps[metric] !== null && ' 个百分点'}</dt>
              <dd>{errorDirection(gaps[metric], dimension, metric)}</dd>
            </div>)}</dl>
            <p>留出样本的描述性差异</p>
          </section>}
          <p className="summary-source">MATLAB V3 冻结测试 · {count(run.nCases)} 条留出案例</p>
        </section>
        <section className="panel groups-panel" id="group-comparison" aria-labelledby="groups-title">
          <Tabs value={state.dimension} onValueChange={value => dispatch({ type: 'dimension', dimension: value === 'age' ? 'age' : 'sex' })}>
            <div className="section-heading"><h2 id="groups-title">群体误判率</h2>
              <TabsList aria-label="群体视角"><TabsTrigger value="sex">性别 F/M</TabsTrigger><TabsTrigger value="age">操作性年龄</TabsTrigger></TabsList>
            </div>
            <TabsContent value={dimension}><GroupTable key={dimension} run={run} index={index} dimension={dimension} gaps={gaps} /></TabsContent>
          </Tabs>
        </section>
      </div>
      {previous !== undefined ? <ThresholdFeedback run={run} index={index} previous={previous} dimension={state.dimension} /> :
        <p className="audit-adjust-hint">移动阈值，查看每次多识别多少实际违约、同时多误报多少未违约。</p>}
      <details className="panel audit-details" key={String(projection)} open={!projection}>
        <summary>四格混淆矩阵与完整总体指标</summary>
        <div className="audit-grid">
        <Matrix values={values} />
        <article className="panel metric-panel" aria-labelledby="metrics-title">
          <div className="section-heading"><div><p className="micro-label">MODEL PERFORMANCE</p><h2 id="metrics-title">总体指标</h2></div></div>
          <p className="metric-caption">随阈值变化</p>
          <div className="metrics">
            {(['recall', 'precision', 'fpr', 'fnr', 'balanced'] as const).map(key => <MetricButton key={key} metric={key} value={percent(values[key])} />)}
          </div>
          <p className="metric-caption frozen-caption">排序指标 · 不随阈值改变</p>
          <div className="metrics static-metrics">
            <MetricButton metric="rocAuc" value={decimal(run.frozenMetrics.rocAuc)} />
            <MetricButton metric="averagePrecision" value={decimal(run.frozenMetrics.averagePrecision)} />
          </div>
        </article>
        </div>
      </details>
      <Comparison data={data} state={state} dispatch={dispatch} />
    </>
  )
}
