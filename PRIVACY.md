# 隱私權聲明 / Privacy Policy

最後更新 / Last updated: 2026-05-22

---

## 簡要說明 / Summary

**本工具不收集任何個人資料。** 所有資料都儲存在你自己的瀏覽器中。

**This tool collects no personal data.** All data stays in your own browser.

---

## 我們不做的事 / What We Don't Do

- ❌ 不收集任何個人資料或案主資料 / No personal or client data collection
- ❌ 不使用 Google Analytics 或任何追蹤工具 / No analytics, no tracking
- ❌ 不放廣告 / No ads
- ❌ 沒有伺服器資料庫 / No server-side database
- ❌ 不會把資料上傳到雲端 / Data never leaves your device

---

## 你輸入的所有資料儲存在哪裡 / Where Your Data Lives

1. **瀏覽器內建 IndexedDB**(你裝置上的本地儲存)
   Browser's built-in IndexedDB (local storage on your device)

2. **可選的「資料夾同步」**：存到你選擇的本地資料夾(File System Access API)
   Optional "folder sync": files stored in a local folder you choose

3. 我們**永遠看不到、拿不到、也無法復原**這些資料
   We can never see, access, or recover this data

---

## 你能驗證這個聲明嗎 / Can You Verify These Claims?

可以。本工具完全開源(AGPL-3.0)，你可以：

1. **瀏覽器開發者工具的 Network 面板** — 確認沒有任何資料傳出
2. **直接看 GitHub 程式碼** — 搜尋 `fetch`、`axios`、`XMLHttpRequest`，
   找不到任何上傳資料的程式
3. **自己 build 並部署** — 你可以自己 host 一份

Yes. The code is fully open source (AGPL-3.0). You can:

1. Open your browser's DevTools Network panel — verify no data leaves
2. Inspect the GitHub source — search for `fetch`/`axios`/`XMLHttpRequest`,
   find no code uploading user data
3. Self-host — build and deploy your own copy

---

## 第三方服務 / Third-Party Services

本工具透過 Cloudflare Workers 託管。Cloudflare 可能會記錄基本的
HTTP 存取日誌(IP、User-Agent、訪問時間)，這是所有網站都會有的
基礎流量資料，不包含任何你輸入的個人或案主資料。

The tool is hosted on Cloudflare Workers. Cloudflare may log basic
HTTP access (IP, User-Agent, timestamp) — standard for any website,
and does not include any user-entered data.

---

## 聯絡 / Contact

📧 genogram.feedback@gmail.com
