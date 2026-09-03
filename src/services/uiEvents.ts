// 跨元件的輕量 UI 事件(用瀏覽器原生 Event,不另建狀態):
// 量表挑選器的狀態住在 Toolbar,第四分頁的「施測」按鈕只需要「請開啟」這一個訊號。
export const OPEN_SCALE_PICKER_EVENT = 'genogram:open-scale-picker';

export function requestScalePicker(): void {
  window.dispatchEvent(new Event(OPEN_SCALE_PICKER_EVENT));
}
