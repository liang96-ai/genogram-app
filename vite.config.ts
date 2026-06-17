import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    // 生產 build 不產 sourcemap — 使用者看不到原始碼結構,只有 minify 後的 bundle
    sourcemap: false,
  },
  plugins: [
    react(),
    VitePWA({
      // prompt 模式(A 系列):新版裝好「不自動重載」,改由 App 橫幅讓使用者主動更新。
      // (autoUpdate 會強制重載丟失進行中工作 + 手動檢查更新鈕 race;見 pwaUpdate.ts)
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'icon.svg',
        'icon-maskable.svg',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
      ],
      manifest: {
        id: '/', // C 系列:給 PWA 穩定識別碼(避免不同 start_url 被當成不同 App)
        name: 'genogram-tool 家系圖工具',
        short_name: '家系圖工具',
        description: '家系圖工具 PWA — 100% 在地儲存,永不上傳,離線可用',
        theme_color: '#007aff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'zh-Hant',
        // PNG 192/512 為主(部分 Android 瀏覽器對 SVG manifest icon 支援不穩);
        // SVG 留作可縮放 fallback;maskable 改用 PNG(含安全區留白,Android 啟動器較穩)
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-1024.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,ico}'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: false, // dev mode 不註冊 SW(避免快取干擾開發)
      },
    }),
  ],
})
