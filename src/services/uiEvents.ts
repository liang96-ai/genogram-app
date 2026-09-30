// 跨元件的輕量 UI 事件(用瀏覽器原生 Event,不另建狀態):
// 量表挑選器的狀態住在 Toolbar,第四分頁的「施測」按鈕只需要「請開啟」這一個訊號。
export const OPEN_SCALE_PICKER_EVENT = 'genogram:open-scale-picker';

export function requestScalePicker(): void {
  window.dispatchEvent(new Event(OPEN_SCALE_PICKER_EVENT));
}

// 空白畫布的起步卡要開「快速建立家庭」,而對話框的狀態住在 Toolbar(1.6.0)
export const OPEN_QUICK_BUILD_EVENT = 'genogram:open-quick-build';
export function requestQuickBuild(): void {
  window.dispatchEvent(new Event(OPEN_QUICK_BUILD_EVENT));
}

// 「帶著做一次」要知道使用者用了快速建立、匯出了圖片(1.6.0)
export const TOUR_EVENT = 'genogram:tour-event';
export function emitTourEvent(name: 'quickBuildApplied' | 'imageExported'): void {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail: name }));
}
