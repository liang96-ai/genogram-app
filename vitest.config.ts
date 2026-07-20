import { defineConfig } from 'vitest/config'

// 刻意獨立於 vite.config.ts —— 測試只跑純函式(quickBuild 解析器 / 走路器),
// 不需要 PWA plugin,也不需要 jsdom / fake-indexeddb。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
