import { lazy, Suspense, useEffect, useState } from 'react'
import { m, LazyMotion, domAnimation, useReducedMotion } from 'motion/react'
import { activeIndex, loadDataset, type Dataset, type ExperimentState } from '../domain/experiment'
import { count } from '../ui/format'
import Audit from './Audit'
import { RunControls, type ControlsDispatch } from './Controls'

const Committee = lazy(() => import('./Committee'))
let loaded: Promise<Dataset> | undefined

export default function Workspace({ scene, state, dispatch }: { scene: 'audit' | 'committee'; state: ExperimentState; dispatch: ControlsDispatch }) {
  const [data, setData] = useState<Dataset>()
  const [error, setError] = useState('')
  const reduced = useReducedMotion()
  useEffect(() => {
    let active = true
    loaded ??= loadDataset().catch(e => { loaded = undefined; throw e })
    loaded.then(value => { if (active) setData(value) }, e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [])

  const title = scene === 'audit' ? '模型与群体公平性审计' : '成本模拟与委员会审议'
  const run = data?.runs[state.run]
  const index = run ? activeIndex(run, state) : 0
  return (
    <main className="workspace" id="main" tabIndex={-1}>
      <div className="workspace-heading">
        <div><p className="eyebrow"><span /> {scene === 'audit' ? 'FAIRNESS AUDIT' : 'COST & COMMITTEE'}</p><h1>{title}</h1>
          <p>{scene === 'audit' ? '移动阈值，比较同一批测试案例的整体表现与群体误判。' : '用情景单价衡量误判成本，查看有限测试下的部署取舍。'}</p></div>
        {run && <div className="dataset-status"><i /> MATLAB V3 冻结结果 <b>{count(run.nCases)} 条留出案例</b></div>}
      </div>
      {error ? <p className="group-warning" role="alert">{error}。请刷新页面再试。</p> : !data || !run ? (
        <p aria-busy="true" role="status">正在载入冻结聚合数据…</p>
      ) : (
        <>
          <RunControls run={run} index={index} dispatch={dispatch} />
          <LazyMotion features={domAnimation}>
            <m.div key={scene} initial={reduced ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.24 }}>
              {scene === 'audit' ? <Audit data={data} run={run} index={index} state={state} dispatch={dispatch} /> : (
                <Suspense fallback={<p role="status">正在载入成本与权衡曲线…</p>}>
                  <Committee run={run} index={index} state={state} dispatch={dispatch} />
                </Suspense>
              )}
            </m.div>
          </LazyMotion>
        </>
      )}
    </main>
  )
}
