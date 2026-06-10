import Dexie, { type Table } from 'dexie';
import type { Genogram } from '../types/genogram';

type SettingRecord = { key: string; value: unknown };
type TemplateRecord = { id: string; name: string; data: unknown };

export class GenogramDB extends Dexie {
  cases!: Table<Genogram, string>;
  settings!: Table<SettingRecord, string>;
  templates!: Table<TemplateRecord, string>;

  constructor() {
    super('genogram-db');
    this.version(1).stores({
      cases: 'id, caseName, lastModifiedAt',
      settings: 'key',
      templates: 'id, name',
    });
  }
}

export const db = new GenogramDB();

// ==================== 已刪除個案墓碑(#125)====================
// 場景:IndexedDB 已刪、但資料夾備份檔因權限休眠刪不掉 →
// 下次啟動掃描會把它當「遺失資料」救回來(已刪個案復活 = 隱私問題)。
// 解法:刪除時記下 id,啟動救援跳過;使用者明確重新匯入時再解除。

const TOMBSTONE_KEY = 'deletedCaseIds';
const TOMBSTONE_MAX = 500;

export async function getDeletedCaseIds(): Promise<string[]> {
  try {
    const rec = await db.settings.get(TOMBSTONE_KEY);
    const v = rec?.value;
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function addDeletedCaseId(id: string): Promise<void> {
  try {
    const cur = await getDeletedCaseIds();
    const next = [id, ...cur.filter((x) => x !== id)].slice(0, TOMBSTONE_MAX);
    await db.settings.put({ key: TOMBSTONE_KEY, value: next });
  } catch (err) {
    console.error('addDeletedCaseId failed:', err);
  }
}

export async function removeDeletedCaseIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const cur = await getDeletedCaseIds();
    const drop = new Set(ids);
    const next = cur.filter((x) => !drop.has(x));
    if (next.length !== cur.length) {
      await db.settings.put({ key: TOMBSTONE_KEY, value: next });
    }
  } catch (err) {
    console.error('removeDeletedCaseIds failed:', err);
  }
}
