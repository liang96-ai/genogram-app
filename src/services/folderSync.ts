// 選完備份資料夾之後的同步流程 —— 個案清單與編輯器附件分頁共用同一份(2026-09-30)。
// 以前附件分頁自己寫了一個只救回、不問「資料夾較新」的簡化版,之後自動存檔可能蓋掉另一台的新版。
import type { Genogram } from '../types/genogram';
import { useGenogramStore } from '../store/genogramStore';
import { db } from './database';
import { loadAllCasesFromFolder, writeCaseJson } from './fileSystem';
import { findNewerInFolder, rescueCasesFromFolder } from './folderRescue';
import { promptNewerInFolder } from './folderConflictPrompt';

/** 選完資料夾後的固定三步(2026-08-27 決議):先把資料夾裡的個案救回來(pull),
 *  再把現有個案寫出去(push),缺一步都會有一邊資料看起來「消失」。回傳救回筆數。 */
export async function syncAfterFolderPick(): Promise<number> {
  let restored = 0;
  let folderCases: Genogram[] = [];
  try {
    folderCases = await loadAllCasesFromFolder(); // 整個資料夾只掃一次
    restored = await rescueCasesFromFolder(folderCases);
  } catch (err) {
    console.error('rescue from folder failed:', err);
  }
  // 先處理「資料夾比這台新」的個案(問使用者),再把其餘個案寫出去 ——
  // 順序反過來會在使用者還沒看到之前就把較新的版本蓋掉(2026-09-03)。
  // 採用的筆數不算進「救回」(使用者剛剛已經親自決定過,不用再提示)
  let hold = new Set<string>();
  try {
    const newer = await findNewerInFolder(folderCases);
    hold = new Set(newer.map((p) => p.folder.id));
    const adopted = await promptNewerInFolder(newer);
    // 正在編輯的個案改用了資料夾版本 → 畫面上那份也換掉;否則下一次自動存檔會把舊版寫回去,等於白選
    for (const id of adopted) await useGenogramStore.getState().reloadCaseIfOpen(id);
  } catch (err) {
    console.error('check newer in folder failed:', err);
  }
  try {
    const ids = (await db.cases.toArray()).map((g) => g.id);
    for (const id of ids) {
      if (hold.has(id)) continue;
      // 每筆寫出前取最新版:正在編輯的那份用畫面上的(含還沒存的編輯),其他重讀資料庫。
      // 用開頭一次讀出的快照,使用者邊改邊同步時會把資料夾寫回舊版
      const { currentCase, appMode } = useGenogramStore.getState();
      const latest = appMode === 'edit' && currentCase?.id === id ? currentCase : await db.cases.get(id);
      if (latest) await writeCaseJson(latest);
    }
  } catch (err) {
    console.error('sync to folder failed:', err);
  }
  return restored;
}
