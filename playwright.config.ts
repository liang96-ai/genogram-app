import { defineConfig, devices } from '@playwright/test';

/**
 * 端到端驗收設定(2026-08-31 建立)。
 *
 * 設計前提:專案主人不寫測試也不維護測試 —— 這套是給 AI 每次改完自己跑、
 * 只回報 pass/fail 的。所以三個原則:
 *   1. **黑箱**:測「使用者做得到什麼」,不碰元件內部,重構時測試不該碎。
 *   2. **測建置後的產物**(vite preview dist),跟使用者拿到的是同一份。
 *   3. **不吃機器**:workers 鎖 4(不用預設的 CPU 核心數),用系統已安裝的
 *      Chrome(channel: 'chrome')→ 瀏覽器二進位零下載、零額外磁碟。
 *
 * 現有的 165 個 vitest 測試原封不動保留,兩層互補:
 *   vitest 顧演算法與資料層;playwright 顧「使用者真的還能用嗎」。
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 4,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'zh-TW',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    // 手機平板體檢(2026-09-30):Safari 核心 + 觸控 + 行動裝置尺寸。
    // 平常的 verify 只跑 chrome;iPad 跑 `npm run e2e:devices`,iPhone 跑 `npm run e2e:iphone`
    // (iPhone 目前預期失敗:還沒有手機版面,資料面板會蓋滿整個畫面;做完手機版面再併進 e2e:devices)。
    // 第一次需要 `npx playwright install webkit`,約 81 MB,只裝在開發機的快取。
    { name: 'ipad', use: { ...devices['iPad Pro 11'] } },
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
