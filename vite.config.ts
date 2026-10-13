import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }
import type { Connect, Plugin } from 'vite'

// 說明頁 /guide/ja/ 這種「資料夾網址」→ 讀那個資料夾的 index.html。
// Cloudflare 本來就會這樣做;這條只讓本機開發、預覽和線上行為一致(1.6.2)。
const guideIndex: Connect.NextHandleFunction = (req, _res, next) => {
  const [path, query] = (req.url ?? '').split('?');
  if (/^\/guide(\/[a-z-]+)?\/?$/.test(path)) {
    req.url = (path.endsWith('/') ? path : path + '/') + 'index.html' + (query ? '?' + query : '');
  }
  next();
};
const guidePages: Plugin = {
  name: 'guide-pages-index',
  configureServer: (server) => void server.middlewares.use(guideIndex),
  configurePreviewServer: (server) => void server.middlewares.use(guideIndex),
};

// https://vite.dev/config/
export default defineConfig({
  // 首頁右下角版本號的唯一來源 = package.json,不在畫面上 hardcode 字串
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // 生產 build 不產 sourcemap — 使用者看不到原始碼結構,只有 minify 後的 bundle
    sourcemap: false,
  },
  plugins: [
    guidePages,
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
        name: '人人家系圖 RenRen Genogram',
        short_name: '人人家系圖',
        description: '人人家系圖:免費的線上家系圖、生態圖繪製工具。資料只存在你的裝置,不上傳,離線可用。',
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
        // 說明頁(/guide/)、給爬蟲的檔案、分享預覽圖不是 App 的一部分:
        // 不放進離線快取,已安裝的 App 也不攔截這些網址(1.6.2)
        globIgnores: ['guide/**', 'shots/**', 'og-image.png', 'sitemap.xml', 'robots.txt'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/guide(\/|$)/, /^\/robots\.txt$/, /^\/sitemap\.xml$/],
      },
      devOptions: {
        enabled: false, // dev mode 不註冊 SW(避免快取干擾開發)
      },
    }),
  ],
})
