// 資料夾裡有較新版本時,逐一問使用者(重用全 App 共用的確認框)。
// 「用資料夾的版本」→ 清洗後寫進資料庫;「保留這台的版本」→ 只記下決定,不動資料夾裡那份
// (它會在使用者下次真的編輯這個個案時被覆蓋 —— 對話框有講明;不在這裡靜默消滅另一台的資料)。
// 同一個資料夾版本只問一次(folderRescue.rememberFolderDecision)。
import { useGenogramStore } from '../store/genogramStore';
import { t } from '../i18n';
import {
  adoptFolderVersion,
  findNewerInFolder,
  rememberFolderDecision,
  type NewerPair,
} from './folderRescue';

const fmt = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

/** @returns 採用了幾筆資料夾版本(呼叫端 >0 時重載個案清單) */
export async function promptNewerInFolder(pairs?: NewerPair[]): Promise<number> {
  const list = pairs ?? (await findNewerInFolder());
  if (list.length === 0) return 0;
  const { showConfirm, language } = useGenogramStore.getState();
  let adopted = 0;
  for (const { folder, local } of list) {
    const useFolder = await showConfirm(
      t(language, 'rescue.newerInFolder', {
        name: folder.caseName,
        folderAt: fmt(folder.lastModifiedAt),
        localAt: fmt(local.lastModifiedAt),
      }),
      { yes: t(language, 'rescue.useFolder'), no: t(language, 'rescue.keepLocal'), tone: 'normal' },
    );
    if (useFolder) {
      await adoptFolderVersion(folder);
      adopted++;
    } else {
      await rememberFolderDecision(folder);
    }
  }
  return adopted;
}
