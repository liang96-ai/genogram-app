// 資料夾救援 —— 把備份資料夾裡「IndexedDB 沒有」的個案掃回來。
//
// 原本這段只在 App 啟動時跑,結果「換電腦 → 選同一個資料夾」當下清單還是空的,
// 使用者以為備份失效(2026-08-27 決議:所有「選資料夾」入口選完都要立刻掃一次)。
//
// 獨立成檔的原因:它同時需要 db、isValidGenogram、loadAllCasesFromFolder,
// 而 exportImport 已經 import fileSystem(匯入寫備份)—— 塞進任何一邊都會繞出循環引用。
import { db, getDeletedCaseIds } from './database';
import type { Genogram } from '../types/genogram';
import { isValidGenogram, sanitizeCase } from './exportImport';
import { loadAllCasesFromFolder } from './fileSystem';

/**
 * 掃描目前的備份資料夾,把 DB 缺少的合法個案補回去。
 * @returns 救回的個案數(0 = 沒有可救的;呼叫端只在 >0 時提示使用者)
 */
export async function rescueCasesFromFolder(preloaded?: Genogram[]): Promise<number> {
  const [tombstones, cases] = await Promise.all([
    getDeletedCaseIds(),
    preloaded ? Promise.resolve(preloaded) : loadAllCasesFromFolder(),
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

// ---------------------------------------------------------------------------
// 資料夾裡比較新的版本(docs/STORAGE.md 衝突規則的補強,2026-09-03)
//
// 情境:備份資料夾放在 iCloud / Dropbox,兩台電腦指到同一個資料夾。B 機改了個案,
// 回到 A 機時 A 的資料庫已有這個個案 → 救援跳過 → 使用者一編輯就把 B 的新版蓋掉。
// 這裡只做「找出來」與「採用」兩個純動作;要不要採用由呼叫端問使用者(重用確認框)。
// ---------------------------------------------------------------------------

export type NewerPair = { folder: Genogram; local: Genogram };

/** 純函式:資料夾裡 lastModifiedAt 較新的個案(缺時間戳的一律不算新) */
export function pickNewer(folderCases: Genogram[], localById: Map<string, Genogram>): NewerPair[] {
  const out: NewerPair[] = [];
  for (const folder of folderCases) {
    if (!isValidGenogram(folder)) continue;
    const local = localById.get(folder.id);
    if (!local) continue;
    const f = Date.parse(folder.lastModifiedAt ?? '');
    const l = Date.parse(local.lastModifiedAt ?? '');
    if (Number.isFinite(f) && Number.isFinite(l) && f > l) out.push({ folder, local });
  }
  return out;
}

const DECISION_KEY = 'folderNewerDecided';

/** 使用者對「這個資料夾版本」已經答過(不論採用或保留)→ 同一版本不再問第二次 */
async function decidedVersions(): Promise<Set<string>> {
  const row = await db.settings.get(DECISION_KEY);
  const v = row?.value;
  return new Set(Array.isArray(v) ? (v as string[]) : []);
}
export async function rememberFolderDecision(g: Genogram): Promise<void> {
  const set = await decidedVersions();
  set.add(`${g.id}@${g.lastModifiedAt}`);
  await db.settings.put({ key: DECISION_KEY, value: [...set].slice(-200) });
}

/** 掃資料夾,回傳「資料夾較新、而且還沒問過使用者」的個案 */
export async function findNewerInFolder(preloaded?: Genogram[]): Promise<NewerPair[]> {
  const [cases, locals, decided] = await Promise.all([
    preloaded ? Promise.resolve(preloaded) : loadAllCasesFromFolder(),
    db.cases.toArray(),
    decidedVersions(),
  ]);
  const byId = new Map(locals.map((g) => [g.id, g] as const));
  return pickNewer(cases, byId).filter((p) => !decided.has(`${p.folder.id}@${p.folder.lastModifiedAt}`));
}

/** 採用資料夾的版本:走與匯入同一道清洗後寫進資料庫 */
export async function adoptFolderVersion(folder: Genogram): Promise<void> {
  const { case: clean } = sanitizeCase(folder);
  await db.cases.put(clean);
  await rememberFolderDecision(folder);
}
