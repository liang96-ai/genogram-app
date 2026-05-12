// File System Access API 包裝
// B 模式:使用者選 root 資料夾,App 自動在裡面建 case_<id>/attachments/
// 不支援(iOS Safari)→ 自動降級到 C 模式(只存連結)

import { db } from './database';

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
