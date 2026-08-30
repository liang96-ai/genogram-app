import type { MajorEvent } from '../types/genogram';

/**
 * 「這筆重大事件畫得出來嗎」的單一判準(2026-08-30 審查)。
 *
 * 為什麼需要:手改壞的 JSON、別的工具寫出來的檔案,都可能讓 majorEvents 裡混進
 * null 或 date 是數字的元素。少了這道,排序時 `a.date < b.date` 碰到 null 會 throw,
 * 而 ErrorBoundary 只有根部一個 —— 整個 App 當掉,而且重開個案再點附件分頁會再當一次。
 *
 * 三個使用者共用這一個判準,不准各寫一份:
 *   - exportImport.sanitizeCase()  匯入 / 資料夾救援時把壞的丟掉(第一道)
 *   - MajorEventTimeline           渲染前過濾(第二道)
 *   - Tab4Custom                   區塊標題的筆數(要跟畫出來的卡片數一致)
 */
export const isRenderableEvent = (e: unknown): e is MajorEvent =>
  !!e &&
  typeof e === 'object' &&
  typeof (e as MajorEvent).id === 'string' &&
  typeof (e as MajorEvent).date === 'string' &&
  typeof (e as MajorEvent).title === 'string';

/**
 * 從「任何東西」安全取出可渲染的事件清單。
 *
 * 為什麼不是各處自己寫 `(x ?? []).filter(...)`:`??` 只擋 null/undefined,
 * 欄位若是字串或物件(手改壞的檔、別的工具寫出來的),`.filter` 直接 TypeError,
 * 在 render 期間拋 = 整個 App 當掉。所有讀 majorEvents 的地方都走這個函式。
 */
export const renderableEvents = (raw: unknown): MajorEvent[] =>
  Array.isArray(raw) ? raw.filter(isRenderableEvent) : [];
