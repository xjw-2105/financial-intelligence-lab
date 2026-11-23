import { features, models, modelNames, frozenComparison, type Dataset, type RunKey } from '../domain/experiment'
import { decimal, percent, signed } from '../ui/format'
import type { ControlsDispatch } from './Controls'

export default function Comparison({ data, selected, dispatch }: { data: Dataset; selected: RunKey; dispatch: ControlsDispatch }) {
  const basic = frozenComparison(data.runs.Basic_RandomForest)
  const full = frozenComparison(data.runs.Full_RandomForest)
  return (
    <details className="panel comparison">
      <summary>九组模型与特征对照</summary>
      <p>各配置使用自己的冻结 FPR10 点，测试 FPR 可不同。性别差距为 M − F，单位为百分点。</p>
      <div className="comparison-insight">
        <p>随机森林 <b>Basic {decimal(basic.rocAuc)}</b> 到 <b>Full {decimal(full.rocAuc)}</b>，测试 ROC-AUC 提升。</p>
        <p>同两点的 FNR 性别差距从 <b>{signed(basic.fnrGap)}</b> 到 <b>{signed(full.fnrGap)}</b> 个百分点。排序效能和群体误判需分别检查。</p>
      </div>
      <div className="table-wrap">
        <table className="comparison-table">
          <caption className="sr-only">三种已训练模型与三档特征组</caption>
          <thead><tr><th scope="col">模型</th>{features.map(feature => <th key={feature} scope="col">{feature}</th>)}</tr></thead>
          <tbody>{models.map(model => <tr key={model}>
            <th scope="row">{modelNames[model]}</th>
            {features.map(feature => {
              const key = `${feature}_${model}` as const
              const stats = frozenComparison(data.runs[key])
              return <td key={key}><button type="button" className="comparison-cell" aria-pressed={selected === key} aria-label={`切换 ${feature} ${modelNames[model]}`} onClick={() => dispatch({ type: 'run', run: key })}>
                <span className="comparison-metrics">
                  <span>ROC-AUC <b>{decimal(stats.rocAuc)}</b></span><span>AP <b>{decimal(stats.ap)}</b></span>
                  <span>召回率 <b>{percent(stats.recall)}</b></span><span>测试 FPR <b>{percent(stats.fpr)}</b></span>
                  <span>FPR 差 <b>{signed(stats.fprGap)}</b></span><span>FNR 差 <b>{signed(stats.fnrGap)}</b></span>
                </span>
              </button></td>
            })}
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  )
}
