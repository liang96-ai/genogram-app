# Genogram Tool

> 隱私優先的家系圖協作工具，為社會工作、家庭治療、教育、醫療等領域而設計。
> Privacy-first collaborative genogram editor for social work, family therapy,
> education, and healthcare professionals.

🌐 **線上工具 / Live App:** https://genogram.liang96.workers.dev

---

## 為什麼存在 Why It Exists

許多領域的工作者需要繪製家系圖，但現有工具不是太貴、要上雲、就是
不適合跨專業協作。本工具的設計目標：

- **完全免費** — 不該因為經濟條件而擋住好工具
- **完全開源** — 程式碼透明，你可驗證沒有資料外傳
- **資料只在你裝置上** — 沒伺服器、沒帳號、沒追蹤
- **跨專業協作** — 各領域可用同一個工具，無需切換

People across many fields need to draw family genograms, but existing
tools are either too expensive, cloud-based, or not built for
cross-professional collaboration. This tool aims to be:

- **Free** for personal and professional use
- **Fully open source** (AGPL-3.0) so you can verify privacy claims
- **Local-only** — no servers, no accounts, no tracking
- **Cross-disciplinary** — one tool everyone can use

---

## 特色 Features

- ✅ 15 種關係線(婚姻、親子、收養、出養、互動關係等)
- ✅ 完整醫療資料庫(13 個衛福部官方量表)
- ✅ 中英雙語介面
- ✅ PWA 可安裝到桌面/手機，離線可用
- ✅ 資料夾備份(File System Access API)

---

## 快速開始 Quick Start

1. 打開 https://genogram.liang96.workers.dev
2. 看完隱私聲明 → 進入 App
3. 「+ 新增個案」開始畫家系圖

想離線使用，點瀏覽器網址列旁的「安裝」按鈕。

---

## 你的資料在哪 Where Your Data Lives

- **瀏覽器內建 IndexedDB**(裝置本地)
- **可選的「資料夾備份」**(存到你選擇的本地資料夾)
- **永遠不會上傳到任何雲端**

詳見 [PRIVACY.md](./PRIVACY.md)。

---

## 技術 Stack

React 19 · TypeScript · Vite · Zustand · Dexie (IndexedDB) ·
vite-plugin-pwa · File System Access API · Cloudflare Workers

---

## 支持本專案 Support

**使用本工具一律免費**:個人、公益機構、營利機構,只要是「使用」都免費(AGPL-3.0)。
支持是自願的;只有「把本工具嵌進封閉產品 / SaaS / 系統整合」才需要商業授權。
Using this tool is always free — for individuals, non-profits and for-profits alike (AGPL-3.0). Support is voluntary; only embedding it in a closed product / SaaS / system integration requires a commercial license.

- ☕ **個人:隨喜支持** — https://ko-fi.com/liang96
- 🏢 **機構:年度自願支持**(公益量力而為;營利機構參考金額見 App「關於」頁)— genogram.feedback@gmail.com
- 🔌 **嵌入 / 整合:商業授權** — 見下方授權說明

詳見 [SPONSORSHIP.md](./SPONSORSHIP.md)。

---

## 授權 License — Dual Licensing 雙重授權

本專案採 **雙重授權**,依使用情境選擇:
This project uses **dual licensing** — choose based on your use case:

| 使用情境 Use Case | 授權 License | 費用 Cost |
|---|---|---|
| 👤 個人實務 / 學術教學 / 公益機構<br>Personal practice / academia / non-profit | **AGPL-3.0** | 🆓 永遠免費<br>Always free |
| 🏢 營利機構內部使用(不改程式、不嵌入產品)<br>For-profit internal use (unmodified, not embedded) | **AGPL-3.0** | 🆓 免費,歡迎年度支持<br>Free; annual support welcome |
| 🏢 嵌入封閉商業產品 / 營利 SaaS<br>Embed in closed-source product / for-profit SaaS | **Commercial License** | 💼 付費洽詢<br>Paid (contact us) |
| 🏥 EHR / CRM / 醫療系統廠商整合<br>EHR / CRM / healthcare vendor integration | **Commercial License** | 💼 付費洽詢<br>Paid (contact us) |

📖 **詳細授權說明 Full licensing details:** [COMMERCIAL_LICENSE.md](./COMMERCIAL_LICENSE.md)
📄 **AGPL-3.0 全文 Full AGPL-3.0 text:** [LICENSE](./LICENSE)

商業授權諮詢 / Commercial license inquiry → **genogram.feedback@gmail.com**

---

Made with care by **梁人人 / Liang RenRen** — Taiwan, 2026
