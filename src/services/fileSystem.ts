// File System Access API 包裝
//
// 三層儲存策略:
//   1. IndexedDB    — 主要編輯儲存,讀寫快(必有)
//   2. 使用者資料夾  — 持久備份,瀏覽器資料清掉也救得回(桌面 Chrome/Edge,write-through)
//   3. 附件         — case_<id>/attachments/ 下,實體檔案
//
// 不支援 FSA 的瀏覽器(iOS Safari) → 自動降級只用 IndexedDB(等同舊行為)

import { db } from './database';
import type { Genogram } from '../types/genogram';

let rootDirHandle: FileSystemDirectoryHandle | null = null;

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function getRootDirHandle(): FileSystemDirectoryHandle | null {
  return rootDirHandle;
}

/** 第一次設定 root 資料夾(顯示 picker) */
export async function selectRootFolder(): Promise<
  FileSystemDirectoryHandle | null
> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    // @ts-expect-error showDirectoryPicker 不在 lib.dom 的標準 type
    const handle = (await window.showDirectoryPicker({
      mode: 'readwrite',
      id: 'genogram-root',
    })) as FileSystemDirectoryHandle;
    rootDirHandle = handle;
    await db.settings.put({ key: 'rootDirHandle', value: handle });
    return handle;
  } catch (err) {
    // 使用者取消選擇也走這
    console.warn('select root folder cancelled or failed:', err);
    return null;
  }
}

/** App 啟動時嘗試載回上次選的資料夾 */
export async function loadRootDirHandle(): Promise<
  FileSystemDirectoryHandle | null
> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    const rec = await db.settings.get('rootDirHandle');
    if (
      rec &&
      typeof rec === 'object' &&
      'value' in rec &&
      (rec as { value: unknown }).value
    ) {
      const handle = (rec as { value: FileSystemDirectoryHandle }).value;
      // 檢查/重新請求權限
      // @ts-expect-error queryPermission 不在標準 type
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        rootDirHandle = handle;
        return handle;
      }
      // 未授權 → 不主動 prompt(避免一進 App 就跳),等使用者操作再 request
      return null;
    }
  } catch (err) {
    console.error('load root dir failed:', err);
  }
  return null;
}

/** 確保有授權 — 若沒有 prompt 使用者重新授權 */
export async function ensureRootPermission(): Promise<boolean> {
  if (!rootDirHandle) return false;
  try {
    // @ts-expect-error
    const perm = await rootDirHandle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return true;
    // @ts-expect-error
    const newPerm = await rootDirHandle.requestPermission({
      mode: 'readwrite',
    });
    return newPerm === 'granted';
  } catch {
    return false;
  }
}

async function getCaseFolder(
  caseId: string,
): Promise<FileSystemDirectoryHandle | null> {
  if (!rootDirHandle) return null;
  if (!(await ensureRootPermission())) return null;
  try {
    return await rootDirHandle.getDirectoryHandle(`case_${caseId}`, {
      create: true,
    });
  } catch (err) {
    console.error('getCaseFolder failed:', err);
    return null;
  }
}

async function getAttachmentsFolder(
  caseId: string,
): Promise<FileSystemDirectoryHandle | null> {
  const caseDir = await getCaseFolder(caseId);
  if (!caseDir) return null;
  try {
    return await caseDir.getDirectoryHandle('attachments', { create: true });
  } catch {
    return null;
  }
}

export async function writeAttachment(
  caseId: string,
  filename: string,
  blob: Blob,
): Promise<boolean> {
  const dir = await getAttachmentsFolder(caseId);
  if (!dir) return false;
  try {
    const fileHandle = await dir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err) {
    console.error('write attachment failed:', err);
    return false;
  }
}

export async function readAttachment(
  caseId: string,
  filename: string,
): Promise<File | null> {
  const dir = await getAttachmentsFolder(caseId);
  if (!dir) return null;
  try {
    const fileHandle = await dir.getFileHandle(filename);
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}

export async function deleteAttachmentFile(
  caseId: string,
  filename: string,
): Promise<boolean> {
  const dir = await getAttachmentsFolder(caseId);
  if (!dir) return false;
  try {
    await dir.removeEntry(filename);
    return true;
  } catch {
    return false;
  }
}

// ==================== 個案 JSON 寫入 / 讀取 / 列舉 ====================
//
// 每個個案結構:
//   case_<id>/
//     case.json          ← 整個 Genogram 資料(write-through)
//     attachments/       ← 附件實體檔案
//

/** 寫入個案 JSON 到 case_<id>/case.json — write-through 用 */
export async function writeCaseJson(g: Genogram): Promise<boolean> {
  if (!rootDirHandle) return false;
  if (!(await ensureRootPermission())) return false;
  try {
    const caseDir = await rootDirHandle.getDirectoryHandle(`case_${g.id}`, {
      create: true,
    });
    const fileHandle = await caseDir.getFileHandle('case.json', {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(
      new Blob([JSON.stringify(g, null, 2)], { type: 'application/json' }),
    );
    await writable.close();
    return true;
  } catch (err) {
    console.error('writeCaseJson failed:', err);
    return false;
  }
}

/** 讀取 case_<id>/case.json — 啟動時掃資料夾用 */
export async function readCaseJson(caseId: string): Promise<Genogram | null> {
  if (!rootDirHandle) return null;
  try {
    const caseDir = await rootDirHandle.getDirectoryHandle(`case_${caseId}`);
    const fileHandle = await caseDir.getFileHandle('case.json');
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as Genogram;
  } catch {
    return null;
  }
}

/** 列出資料夾裡所有個案 ID(掃 case_* 子資料夾) */
export async function listCaseIdsInFolder(): Promise<string[]> {
  if (!rootDirHandle) return [];
  if (!(await ensureRootPermission())) return [];
  const ids: string[] = [];
  try {
    for await (const [name, handle] of (
      rootDirHandle as unknown as {
        entries: () => AsyncIterable<[string, FileSystemHandle]>;
      }
    ).entries()) {
      if (handle.kind !== 'directory') continue;
      if (typeof name === 'string' && name.startsWith('case_')) {
        ids.push(name.slice(5)); // 去掉 'case_' prefix
      }
    }
  } catch (err) {
    console.error('listCaseIdsInFolder failed:', err);
  }
  return ids;
}

/** 列出資料夾裡所有個案的完整資料(掃 + 讀 case.json) */
export async function loadAllCasesFromFolder(): Promise<Genogram[]> {
  const ids = await listCaseIdsInFolder();
  const cases: Genogram[] = [];
  for (const id of ids) {
    const g = await readCaseJson(id);
    if (g) cases.push(g);
  }
  return cases;
}

/** 刪除整個個案資料夾(case_<id>/ + 內含 case.json + attachments/) */
export async function deleteCaseFolder(caseId: string): Promise<boolean> {
  if (!rootDirHandle) return false;
  if (!(await ensureRootPermission())) return false;
  try {
    await rootDirHandle.removeEntry(`case_${caseId}`, { recursive: true });
    return true;
  } catch (err) {
    console.error('deleteCaseFolder failed:', err);
    return false;
  }
}

/** 把不重複的檔名生成出來(若同名就 -1, -2 後綴) */
export async function uniqueFilename(
  caseId: string,
  filename: string,
): Promise<string> {
  const dir = await getAttachmentsFolder(caseId);
  if (!dir) return filename;
  const dotIdx = filename.lastIndexOf('.');
  const base = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
  const ext = dotIdx > 0 ? filename.slice(dotIdx) : '';
  let candidate = filename;
  let i = 1;
  while (true) {
    try {
      await dir.getFileHandle(candidate);
      candidate = `${base}-${i}${ext}`;
      i++;
    } catch {
      return candidate;
    }
  }
}
