import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// PWA service worker:autoUpdate 模式下,新版上線會自動下載 + 下次開啟套用
registerSW({ immediate: true })

// Build inspection helper (window.__GN__ for dev console)
;(globalThis as { __GN__?: { tag: string; edge: number } }).__GN__ = {
  tag: 'rl-1',
  edge: 28,
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
