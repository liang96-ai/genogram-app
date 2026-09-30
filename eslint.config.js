import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // 底線開頭 = 預留接口的占位參數(如 Phase 2 加密匯出 stub),不視為未使用
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // React Compiler 預備診斷:對「從 store/props 同步本地 state」的既有寫法過嚴。
      // 降為 warn = 看得到、不擋 lint;新寫的 code 仍應盡量避免。
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      // if 的內容換到下一行就一定要加大括號(單行的 `if (!c) return;` 不受影響)。
      // 起因:1.5 的 Esc bug —— 少一組括號,第二行看起來在 if 裡面其實不在,按任何鍵都退出編輯。
      curly: ['error', 'multi-line'],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'IfStatement > IfStatement.consequent',
          message: 'if 裡面直接接 if 要加大括號,否則下一行很容易被誤以為也在裡面(1.5 的 Esc bug)',
        },
        {
          selector:
            "NewExpression[callee.name='Set'] Literal[value=/^(biological|adopted|placed-out|fostered|sperm-donor|marriage|engagement)$/]",
          message: '線型分類請引用 src/services/relationKinds.ts 的具名集合,不要在這裡自己列一份',
        },
        {
          selector:
            "LogicalExpression[operator='||'] > BinaryExpression[left.property.name='subType'][right.value=/^(biological|adopted|placed-out|fostered|sperm-donor|marriage|engagement|partnership|cohabitation|divorce|separation)$/]",
          message: '親子或婚姻線型請用 src/services/relationKinds.ts 的具名集合判斷,不要用 || 串(1.1 改名後就是這樣漏掉同居、喪偶)',
        },
      ],
    },
  },
  // 線型分類的唯一出處,以及需要自己造資料的測試:允許列出線型
  {
    files: ['src/services/relationKinds.ts', '**/*.test.ts', 'e2e/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  // Playwright 測試不是 React 程式:fixture 的 `use(page)` 會被 rules-of-hooks
  // 誤判成 React hook(2026-09-01 健檢抓到的假紅燈)。e2e/ 整個目錄關掉 React 規則。
  {
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  // 資料 + 小型渲染元件混合檔:fast refresh 提醒只影響 dev HMR,不影響使用者
  {
    files: [
      '**/symbolData.tsx',
      '**/tutorialSteps.tsx',
      '**/NetworkUnitShape.tsx',
      '**/PrivacyWelcomeDialog.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
