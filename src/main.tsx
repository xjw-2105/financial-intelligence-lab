import { createRoot } from 'react-dom/client'
import { useEffect, useReducer, useState, lazy, Suspense } from 'react'
import Entrance from './views/Entrance'
import { Method } from './ui/Modal'
import { experimentReducer, initialState } from './domain/experiment'
import './style.css'

const Workspace = lazy(() => import('./views/Workspace'))
const scenes = [
  { id: 'entrance', label: '实验室入口' },
  { id: 'audit', label: '公平性审计' },
  { id: 'committee', label: '成本与审议' },
] as const

function readScene(hash: string): typeof scenes[number]['id'] {
  if (hash === 'audit-threshold') return 'audit'
  return hash === 'audit' || hash === 'committee' ? hash : 'entrance'
}

function App() {
  const [hash, setHash] = useState(() => location.hash.slice(1))
  const scene = readScene(hash)
  const [projection, setProjection] = useState(false)
  const [state, dispatch] = useReducer(experimentReducer, initialState)
  useEffect(() => {
    const change = () => {
      setHash(location.hash.slice(1))
      if (location.hash === '#accuracy-trap') document.getElementById('accuracy-trap')?.scrollIntoView({ block: 'nearest' })
      else window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])

  return (
    <div className="app-shell" data-demo={projection}>
      <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.querySelector<HTMLElement>('main')?.focus() }}>跳至主要内容</a>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#entrance" aria-label="Financial Intelligence Lab 实验室入口">
            <span className="emblem" aria-hidden="true"><i /><i /><i /></span>
            <span>Financial Intelligence<span className="brand-lab"> Lab</span></span>
          </a>
          <nav aria-label="实验场景">
            {scenes.map(item => <a key={item.id} href={`#${item.id}`} aria-current={scene === item.id ? 'page' : undefined}>{item.label}</a>)}
          </nav>
          <div className="topbar-tools">
            <button type="button" className="button text-button demo-switch" aria-pressed={projection} onClick={() => setProjection(value => !value)}>演示模式</button>
            <Method compact />
          </div>
        </div>
      </header>
      {scene === 'entrance' ? <Entrance projection={projection} /> : (
        <Suspense fallback={<main className="workspace" aria-busy="true">正在载入审计工具…</main>}>
          <Workspace scene={scene} state={state} dispatch={dispatch} projection={projection} focusThreshold={hash === 'audit-threshold'} />
        </Suspense>
      )}
      <footer className="site-footer">
        <span>Financial Intelligence Lab</span>
        <span>MATLAB 主实验 · 课程展示版</span>
      </footer>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
