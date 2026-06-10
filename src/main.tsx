import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

// PWA service worker:autoUpdate 模式下,新版上線會自動下載 + 下次開啟套用
registerSW({ immediate: true })

// Build inspection helper (window.__GN__ for dev console)
;(globalThis as { __GN__?: { tag: string; edge: number } }).__GN__ = {
  tag: 'rl-1',
  edge: 28,
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 錯誤防護網(#118):render 錯誤不白屏,提供「下載所有個案」逃生門 */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
