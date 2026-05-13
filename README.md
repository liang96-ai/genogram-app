# 🌳 家系圖工具 / Genogram Tool

> 給社工、心理師、家庭治療師的家系圖 PWA。**100% 本地儲存,從不上傳。**
> A PWA genogram tool for social workers, psychologists, and family therapists.
> **100% local storage, never uploaded.**

---

## ✨ 特色 Features

- **🔒 100% 在地儲存**:資料只存在你的瀏覽器/電腦,完全不上傳雲端
- **📱 PWA**:加到桌面或主畫面後可完全離線使用
- **🌐 雙語**:中文 / English 一鍵切換
- **🎨 完整 McGoldrick 符號**:76 個標準家系圖符號 + 15 種關係線
- **🧪 14 個內建量表**:Family APGAR / PHQ-9 / GAD-7 / AUDIT / ACE / TIPVDA / Barthel 等
- **🩺 醫療整合**:ICD-10 / ICD-11 / DSM-5 擴充庫 + 健保藥物庫
- **🔐 多層保密**:欄位級 + 區塊級 + 關係線級保密,匯出時整套抹除
- **♻️ Undo/Redo + 自動儲存**:不用手動存檔,每 800ms 自動寫入

---

## 🚀 立即試用 Try It

👉 **[https://genogram-tool.vercel.app/](https://genogram-tool.vercel.app/)**

### 安裝到桌面 / 主畫面 Install
- **Chrome / Edge (桌面)**:網址列右側 ⊕ 圖示 → 安裝
- **iOS Safari**:分享 → 加入主畫面
- 安裝後完全離線可用

---

## 🛠 本地開發 Local Development

```bash
# 安裝(注意 vite-plugin-pwa 跟 Vite 8 peer dep 衝突)
npm install --legacy-peer-deps

# 開發
npm run dev
# → http://localhost:5173/

# 生產 build
npm run build

# 預覽生產 build
npm run preview

# 型別檢查
npx tsc --noEmit
```

### 技術棧 Tech Stack
- **React 19** + **TypeScript** + **Vite 8**
- **Zustand**(狀態管理)
- **Dexie.js**(IndexedDB wrapper,個案資料儲存)
- **vite-plugin-pwa**(離線 + 安裝)
- 自寫極簡 i18n、SVG 渲染,**完全不依賴 UI framework**

---

## 📚 教學 Tutorial

App 內建兩層教學:
- **基礎 8 步**:第一次進編輯模式自動跳
- **進階 10 步**:漢堡選單 → 「看進階教學」

涵蓋:畫家系圖 / 加家人 / 關係線 / 量表 / 匯出 / 保密 / 快捷鍵 / 縮放 全部功能。

---

## 🔐 隱私 Privacy

- ✅ **所有資料儲存在瀏覽器 IndexedDB**(你的裝置上)
- ✅ **個案資料夾**(File System Access API):桌面 Chrome/Edge 可選擇本機資料夾存附件
- ✅ **完全沒有伺服器**:這是純前端 App,沒有後端可以收你的資料
- ⚠️ 清除瀏覽器資料 = 刪除所有個案。**請定期匯出 `.json` 備份**

---

## 📊 評估量表版權聲明

本工具內建量表均為公開或授權版本(衛福部、WHO、CDC、Pfizer 等公開來源)。

**商業營利使用請洽各量表原始版權方**確認授權範圍。

量表結果僅供參考,不作臨床診斷依據。

詳見漢堡選單最底「⚠️ 量表版權聲明」。

---

## 🏗 開發者資訊 For Developers

- 個案資料結構:`src/types/genogram.ts`
- 狀態管理:`src/store/genogramStore.ts`
- 在地化:`src/i18n.ts`(zh / en,自寫不依賴 npm)
- 量表系統:`src/components/Scales/`(registry pattern,加新量表只動 registry)

---

## 📄 License

[請補上:MIT? 自訂? Proprietary?]
