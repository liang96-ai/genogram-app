import { test as base, expect, type Page } from '@playwright/test';
import type { Genogram } from '../src/types/genogram';

/**
 * 共用測試骨架。所有旅程測試都從這裡開始,不要各自重寫。
 *
 * 它解決四件每個測試都會撞到的事:
 *   1. 首次啟動的雜訊(隱私說明、資料夾提示、教學、抖內提示)會擋住畫面
 *   2. 「選資料夾」需要作業系統授權 —— 自動化點不到,用 OPFS 替身頂替
 *   3. 驗收要看的是**資料庫裡真的存了什麼**,不是畫面上看起來如何
 *   4. 中文 UI 的按鈕文字就是選擇器,集中放一處,改文案時只改這裡
 */

/** UI 文字 = 選擇器。App 改文案時,只有這一塊要跟著改。 */
export const UI = {
  newCase: '＋ 新增個案',
  createAndOpen: '建立並開啟',
  caseNamePlaceholder: '例:王家',
  folderLater: '暫時不要',
  privacyAck: '我了解,開始使用',
  backToList: '返回個案清單',
  menu: '選單',
  addLonePerson: '新增人物',
  tabBasic: '基本資料',
  tabNetwork: '網絡關係',
  tabMedical: '醫療',
  tabAttach: '個案紀錄',
  namePlaceholder: '例:王小明',
  agePlaceholder: '45',
  exportFile: '輸出檔案',
  download: '下載',
  cancel: '取消',
  household: '圈成同住',
  assess: '施測',
} as const;

/** 讀 IndexedDB 的個案 —— 驗收一律看這裡,不看畫面 */
export async function readCases(page: Page): Promise<Genogram[]> {
  return page.evaluate(async () => {
    const req = indexedDB.open('genogram-db');
    const db = await new Promise<IDBDatabase>((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    const tx = db.transaction('cases', 'readonly');
    const all = await new Promise<unknown[]>((res) => {
      const r = tx.objectStore('cases').getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    return all as never;
  });
}

export async function readCaseByName(page: Page, name: string) {
  const all = await readCases(page);
  return all.find((c) => c.caseName === name);
}

/** 列出替身資料夾(OPFS)裡的檔案樹 —— 驗「有沒有真的寫出備份」 */
export async function listFolder(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const out: string[] = [];
    const walk = async (dir: FileSystemDirectoryHandle, prefix: string) => {
      // @ts-expect-error entries() 在 TS lib 尚未完整定義
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'file') {
          const f = await (handle as FileSystemFileHandle).getFile();
          out.push(`${prefix}${name} (${f.size}B)`);
        } else {
          out.push(`${prefix}${name}/`);
          await walk(handle as FileSystemDirectoryHandle, `${prefix}${name}/`);
        }
      }
    };
    const root = await navigator.storage.getDirectory();
    try {
      const test = await root.getDirectoryHandle('TestFolder');
      await walk(test, '');
    } catch {
      // 還沒建立替身資料夾
    }
    return out.sort();
  });
}

export const test = base.extend<{ app: Page }>({
  app: async ({ page }, use, testInfo) => {
    // ── 替身:showDirectoryPicker 需要作業系統授權,自動化點不到。
    //    換成 OPFS 的具名子資料夾 —— 它回傳的是真正的 FileSystemDirectoryHandle,
    //    App 其餘程式碼一行都不用改。
    //    ⚠️ 一定要回「有名字的子資料夾」:OPFS 根目錄的 .name 是空字串,
    //       App 會判定成「沒選資料夾」(這個坑踩過一次)。
    //    ⚠️ 只給桌面 Chrome:真的 iPad / iPhone Safari 沒有這個功能,
    //       手機平板體檢也假造它,會測到使用者根本看不到的畫面(2026-09-30)。
    if (testInfo.project.name === 'chrome') {
      await page.addInitScript(() => {
        // @ts-expect-error 覆寫瀏覽器 API
        window.showDirectoryPicker = async () => {
          const root = await navigator.storage.getDirectory();
          return root.getDirectoryHandle('TestFolder', { create: true });
        };
      });
    }
    await page.addInitScript(() => {
      // 首次啟動的雜訊:隱私說明、教學、抖內提示 —— 先標記成看過
      try {
        localStorage.setItem('privacyAcknowledged', '1');
        localStorage.setItem('genogram_tutorial_basic_seen', '1');
        localStorage.setItem('genogram_tour_done', '1');
        localStorage.setItem('genogram_support_prompt_seen', '1');
        localStorage.setItem('genogram_install_banner_dismissed', '1');
      } catch {
        /* 私密模式下 localStorage 可能不可用,不影響測試主體 */
      }
    });
    await page.goto('/');
    await expect(page.getByRole('button', { name: UI.newCase })).toBeVisible();
    await use(page);
  },
});

export { expect };

/** 建立一個個案並進入編輯器(幾乎每條旅程的第一步) */
export async function createCase(page: Page, name: string) {
  await page.getByRole('button', { name: UI.newCase }).click();
  // 沒設資料夾時會先跳資料夾設定 —— 有就跳過
  const later = page.getByRole('button', { name: UI.folderLater });
  if (await later.isVisible().catch(() => false)) await later.click();
  await page.getByPlaceholder(UI.caseNamePlaceholder).fill(name);
  await page.getByRole('button', { name: UI.createAndOpen }).click();
  await expect(page.getByRole('button', { name: UI.tabBasic })).toBeVisible();
}
