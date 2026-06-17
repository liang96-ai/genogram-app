import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import EyeComfortOverlay from './components/EyeComfort/EyeComfortOverlay.tsx'
import { initPwaUpdate } from './services/pwaUpdate.ts'

// PWA service worker:prompt 模式 —— 新版裝好後由 App 橫幅提示「立即更新」,
// 不強制重載(避免丟失進行中工作);詳見 services/pwaUpdate.ts
initPwaUpdate()

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
      {/* 全域護眼暖色遮罩(#眼睛):疊在最上層、只影響螢幕,不進匯出 */}
      <EyeComfortOverlay />
    </ErrorBoundary>
  </StrictMode>,
)
