// 備份提醒安全網(2026-08-27 決議)
//
// 對象:沒有設定備份資料夾的使用者(iPad / Firefox / 沒選資料夾的桌機)——
// 他們的資料只有瀏覽器裡一份,7 天未使用清除、換機、清快取任一件都是全損,
// 而首頁的「100% 在地儲存」讓他們以為很安全。
//
// 原則:純本機(db.settings 記兩個數字,零外連、不追蹤)、溫和(每次啟動最多提醒一次)、
// 有資料夾的使用者不打擾(write-through 已經是持續備份)。
import { db } from './database';

const KEY = 'backupMeta';
const REMIND_AFTER_DAYS = 14;

type BackupMeta = { lastBackupAt: string | null; editsSince: number };

async function readMeta(): Promise<BackupMeta> {
  try {
    const rec = await db.settings.get(KEY);
    if (rec && typeof rec === 'object' && 'value' in rec) {
      const v = (rec as { value: Partial<BackupMeta> }).value;
      return {
        lastBackupAt: typeof v?.lastBackupAt === 'string' ? v.lastBackupAt : null,
        editsSince: typeof v?.editsSince === 'number' ? v.editsSince : 0,
      };
    }
  } catch {
    // 讀不到就當沒存過
  }
  return { lastBackupAt: null, editsSince: 0 };
}

function writeMeta(meta: BackupMeta): void {
  db.settings.put({ key: KEY, value: meta }).catch(() => {});
}

/** 每次個案實際寫入(flushPendingSave 成功)呼叫一次 —— 已被 0.8s debounce 過,不會太密 */
export async function recordEdit(): Promise<void> {
  const meta = await readMeta();
  writeMeta({ ...meta, editsSince: meta.editsSince + 1 });
}

/** 全備份成功(含設定的匯出,寫資料夾或下載皆算)時呼叫 */
export async function recordFullBackup(): Promise<void> {
  writeMeta({ lastBackupAt: new Date().toISOString(), editsSince: 0 });
}

/**
 * 要不要提醒?條件全部成立才提醒:
 *   1. 沒設定過備份資料夾(有資料夾 = write-through 持續備份,不打擾)
 *   2. 距上次全備份超過 14 天(從未備份過則看「有沒有任何編輯」)
 *   3. 上次備份之後有編輯(沒動過就沒有新風險)
 * @returns 天數(給提醒文案用);從未備份過回 'never'(文案不能編造天數);不需提醒回 null
 */
export async function daysSinceBackupIfShouldRemind(): Promise<
  number | 'never' | null
> {
  try {
    const folderConfigured = !!(await db.settings.get('rootDirHandle'));
    if (folderConfigured) return null;
    const meta = await readMeta();
    if (meta.editsSince === 0) return null;
    if (!meta.lastBackupAt) {
      // 從未備份:也要等到「確實用了一陣子」才開口 —— 用編輯次數當代理
      return meta.editsSince >= 20 ? 'never' : null;
    }
    const days = Math.floor(
      (Date.now() - new Date(meta.lastBackupAt).getTime()) / 86400000,
    );
    return days >= REMIND_AFTER_DAYS ? days : null;
  } catch {
    return null;
  }
}
