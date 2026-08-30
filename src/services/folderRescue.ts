// 資料夾救援 —— 把備份資料夾裡「IndexedDB 沒有」的個案掃回來。
//
// 原本這段只在 App 啟動時跑,結果「換電腦 → 選同一個資料夾」當下清單還是空的,
// 使用者以為備份失效(2026-08-27 決議:所有「選資料夾」入口選完都要立刻掃一次)。
//
// 獨立成檔的原因:它同時需要 db、isValidGenogram、loadAllCasesFromFolder,
// 而 exportImport 已經 import fileSystem(匯入寫備份)—— 塞進任何一邊都會繞出循環引用。
import { db, getDeletedCaseIds } from './database';
import { isValidGenogram, sanitizeCase } from './exportImport';
import { loadAllCasesFromFolder } from './fileSystem';

/**
 * 掃描目前的備份資料夾,把 DB 缺少的合法個案補回去。
 * @returns 救回的個案數(0 = 沒有可救的;呼叫端只在 >0 時提示使用者)
 */
export async function rescueCasesFromFolder(): Promise<number> {
  const [tombstones, cases] = await Promise.all([
    getDeletedCaseIds(),
    loadAllCasesFromFolder(),
  ]);
  const skip = new Set(tombstones);
  let restored = 0;
  for (const g of cases) {
    // 壞檔(#119)與已刪除個案的殘留備份(#125)都不救
    if (!isValidGenogram(g)) {
      console.warn('skip invalid case.json in folder:', (g as { id?: unknown })?.id);
      continue;
    }
    if (skip.has(g.id)) continue;
    const exists = await db.cases.get(g.id);
    if (!exists) {
      // 資料夾裡的檔案同樣可能被手動改壞 —— 與匯入走同一道清洗(2026-08-30)
      const { case: clean, dropped } = sanitizeCase(g);
      if (dropped > 0) {
        console.warn(`rescue: dropped ${dropped} malformed record(s) in case ${clean.id}`);
      }
      await db.cases.put(clean);
      restored++;
    }
  }
  return restored;
}
