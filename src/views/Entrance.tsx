import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Method } from '../ui/Modal'
import { count, decimal } from '../ui/format'
import overview from '../domain/overview.json'

const Scene = lazy(() => import('./Scene'))

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

function EntranceArt() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const desktop = window.matchMedia('(min-width: 900px) and (pointer: fine)')
    let timer: ReturnType<typeof setTimeout>
    function update() {
      clearTimeout(timer)
      setEnabled(false)
      if (reduced.matches || !desktop.matches) return
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
  }, [])
  return (
    <div className="entrance-art" aria-hidden="true" data-art={enabled ? 'webgl-ready' : 'static'}>
      <div className="art-grid" />
      <img className="bust" src={`${import.meta.env.BASE_URL}art/judgment.webp`} width="1120" height="1024" alt="" fetchPriority="high" />
      <div className="static-orbits"><i /><i /><i /></div>
      {enabled && <SceneBoundary><Suspense fallback={null}><Scene /></Suspense></SceneBoundary>}
      <span className="art-label"><i /> 审议装置 <b>JUDGMENT</b></span>
    </div>
  )
}

export default function Entrance() {
  const majorityAccuracy = (100 * (1 - overview.positives / overview.cases)).toFixed(3)
  return (
    <main className="landing" id="main" tabIndex={-1}>
      <div className="hero-stage">
        <EntranceArt />
        <div className="hero-copy">
          <p className="eyebrow"><span /> LAB ENTRANCE</p>
          <h1>预测更准，<br />是否意味着<br /><em>更公平？</em></h1>
          <p className="hero-lead">用 MATLAB 冻结实验检验信贷 AI。亲手移动判类阈值，观察模型把错误分配给了哪些群体。</p>
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
        <dl className="hero-facts">
          <div><dd>{count(overview.cases)}</dd><dt>V3 留出测试案例</dt></div>
          <div><dd>{overview.runs}<small>组</small></dd><dt>已训练模型与特征配置</dt></div>
          <div><dd>{decimal(overview.rocAuc)}</dd><dt>Full 随机森林 ROC-AUC</dt></div>
        </dl>
      </div>
      <nav className="experiment-steps" aria-label="三步实验">
        <a href="#accuracy-trap"><span>01</span><strong>准确率陷阱</strong><small>比较准确率与召回率</small></a>
        <a href="#audit"><span>02</span><strong>群体误判</strong><small>移动阈值，检查误报与漏判</small></a>
        <a href="#committee"><span>03</span><strong>假设成本与审议</strong><small>调整单价，对照全低风险基线</small></a>
      </nav>
    </main>
  )
}
