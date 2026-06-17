// 持久化儲存請求(B 系列 #133)
//
// 預設情況下,瀏覽器在磁碟壓力大時可「驅逐」IndexedDB(best-effort bucket)。
// 對「全部個案只存本機、無伺服器備份」的工具,這是資料遺失風險。
// navigator.storage.persist() 請求把本網站標為「持久」,被驅逐機率大幅降低。
//   - 桌機 Chrome/Edge:依使用者參與度啟發式,通常靜默授予,不彈框
//   - Firefox:可能彈一次框
//   - iOS Safari:不支援此 API(回 false)→ 那邊靠「加到主畫面」豁免 7 天清除(見 InstallBanner)
//
// 冪等:已是 persisted 直接回 true;失敗不影響任何主功能。

export async function ensurePersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
