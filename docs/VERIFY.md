# 「做完」的定義

一行指令,六項全過才算做完:

```bash
npm run verify
```

| 順序 | 檢查 | 工具 | 擋什麼 |
|---|---|---|---|
| 1 | lint | eslint(0 error;既有 warning 基準 9) | 型別以外的錯誤用法、React hook 規則 |
| 2 | 型別 + 建置 | tsc + vite build | 編譯錯誤;產物大小 |
| 3 | 外連網域白名單 | `scripts/check-external.mjs` | 「永不上傳」:產物裡出現未登記的網域就失敗 |
| 4 | 本機哨兵 | `scripts/check-local.sh` → `.claude/`(不進 repo) | 識別字計數(不公開細節) |
| 5 | 單元測試 | vitest | store 行為、復原合併、量表切點、i18n 中英對稱、版本規則、參考個案往返 |
| 6 | 使用者旅程 | Playwright(系統 Chrome) | 13 條端到端旅程:建案、重載、備份寫檔、拖曳、鍵盤、彈窗、同住圈、匯入匯出、圖片、復原、施測入口、草稿欄位、彈窗堆疊 |

只跑旅程:`npm run e2e`;只跑單元:`npx vitest run`。

## 不在腳本裡、上架前仍要人做的

- 本機 10 分鐘實測清單(首頁 → 建案 → 畫布 → 右側四分頁 → 匯出 → 匯入)
- push 後到線上網址逐位元組比對版本號與功能
