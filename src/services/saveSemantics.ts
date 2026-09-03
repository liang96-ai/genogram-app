// 「開啟不算編輯」(docs/STORAGE.md):
// 開啟個案會把它載進記憶體並排一次自動存檔;內容沒變時,不該重寫備份資料夾、也不該算進備份提醒的編輯次數。
export type LoadedSnapshot = { id: string; lastModifiedAt: string };

/**
 * App 實際用的判準(2026-09-03 審查後補強):
 * - openedAt:每個個案「開檔當下的 lastModifiedAt」(per 個案,切換個案的 0.8 秒殘留不會判錯對象)
 * - touched:這次開啟後已經寫過變動的個案 —— 之後一律鏡像。
 *   不然「編輯 → 存檔 → 復原回開檔狀態」時 lastModifiedAt 會等於開檔值,資料庫寫回舊內容、
 *   資料夾卻留著新內容,兩邊分岔。
 * @returns true = 內容沒變,跳過資料夾鏡像與編輯計數
 */
export function shouldSkipMirror(
  g: { id: string; lastModifiedAt: string },
  openedAt: Map<string, string>,
  touched: Set<string>,
): boolean {
  if (touched.has(g.id)) return false;
  const at = openedAt.get(g.id);
  return at !== undefined && at === g.lastModifiedAt;
}
