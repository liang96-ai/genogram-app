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
