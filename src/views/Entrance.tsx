import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Method } from '../ui/Modal'
import { count } from '../ui/format'
import { staticAsset } from '../domain/assets'
import overview from '../domain/overview.json'

const Scene = lazy(() => import('./Scene'))

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

function EntranceArt({ projection }: { projection: boolean }) {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const desktop = window.matchMedia('(min-width: 900px) and (pointer: fine)')
    let timer: ReturnType<typeof setTimeout>
    function update() {
      clearTimeout(timer)
      setEnabled(false)
      if (projection || reduced.matches || !desktop.matches) return
      timer = setTimeout(() => {
        const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true })
        if (!gl) return
        gl.getExtension('WEBGL_lose_context')?.loseContext()
        setEnabled(true)
      }, 650)
    }
    update()
    reduced.addEventListener('change', update)
    desktop.addEventListener('change', update)
    return () => {
      clearTimeout(timer)
      reduced.removeEventListener('change', update)
      desktop.removeEventListener('change', update)
    }
  }, [projection])
  return (
    <div className="entrance-art" aria-hidden="true" data-art={enabled && !projection ? 'webgl-ready' : 'static'}>
      <div className="art-grid" />
      <img className="bust" src={staticAsset('art/judgment.webp')} width="1120" height="1024" alt="" fetchPriority="high" />
      <div className="static-orbits"><i /><i /><i /></div>
      {enabled && !projection && <SceneBoundary><Suspense fallback={null}><Scene /></Suspense></SceneBoundary>}
      <span className="art-label"><i /> 审议装置 <b>JUDGMENT</b></span>
    </div>
  )
}

export default function Entrance({ projection }: { projection: boolean }) {
  const majorityAccuracy = (100 * (1 - overview.positives / overview.cases)).toFixed(3)
  return (
    <main className="landing" id="main" tabIndex={-1}>
      <div className="hero-stage">
        <EntranceArt projection={projection} />
        <div className="hero-copy">
          <p className="eyebrow"><span /> LAB ENTRANCE</p>
          <h1>预测更准，<br /><em>是否更公平？</em></h1>
          <p className="hero-lead">用 MATLAB V3 的 {count(overview.cases)} 条留出案例，观察信贷模型如何分配误报与漏判。</p>
          <section id="accuracy-trap" className="hero-trap" aria-label="准确率陷阱">
            <p>全判低风险的准确率陷阱</p>
            <dl><div><dt>准确率</dt><dd>{majorityAccuracy}%</dd></div><div><dt>召回率</dt><dd>0%</dd></div></dl>
            <span>没有识别出任何违约，共漏判 {count(overview.positives)} 例。</span>
          </section>
          <div className="hero-actions">
            <a className="button primary" href="#audit">进入审计实验室</a>
            <Method />
          </div>
        </div>
      </div>
      <section className="experiment-path" aria-labelledby="path-title">
        <h2 id="path-title">演示路径</h2>
        <nav className="experiment-steps" aria-label="三步实验">
          <a href="#audit"><span>1</span><strong>进入审计</strong><small>并排读总体识别和群体误判</small></a>
          <a href="#audit-threshold"><span>2</span><strong>调整阈值</strong><small>观察 TP 与 FP 的边际变化</small></a>
          <a href="#committee"><span>3</span><strong>进入成本</strong><small>改变假设单价，对照全低风险基线</small></a>
        </nav>
      </section>
    </main>
  )
}
