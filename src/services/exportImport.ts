import { db, removeDeletedCaseIds } from './database';
import type { Genogram, Line, Person } from '../types/genogram';

export type ExportType = 'single' | 'multi' | 'backup';

export interface ExportBundle {
  schemaVersion: '1.0';
  exportType: ExportType;
  exportedAt: string;
  cases: Genogram[];
  // 全備份才有
  settings?: {
    institutionHistory?: string[];
    diseaseHistory?: string[];
    medicationHistory?: string[];
  };
}

const todayString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const safeFilename = (s: string): string =>
  s.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60) || 'untitled';

export function buildSingleExport(c: Genogram): ExportBundle {
  return {
    schemaVersion: '1.0',
    exportType: 'single',
    exportedAt: new Date().toISOString(),
    cases: [c],
  };
}

export function buildMultiExport(cases: Genogram[]): ExportBundle {
  return {
    schemaVersion: '1.0',
    exportType: 'multi',
    exportedAt: new Date().toISOString(),
    cases,
  };
}

export async function buildBackupExport(): Promise<ExportBundle> {
  const cases = await db.cases.toArray();
  const [instH, disH, medH] = await Promise.all([
    db.settings.get('institutionHistory'),
    db.settings.get('diseaseHistory'),
    db.settings.get('medicationHistory'),
  ]);
  const pickArr = (rec: unknown): string[] | undefined => {
    if (
      rec &&
      typeof rec === 'object' &&
      'value' in rec &&
      Array.isArray((rec as { value: unknown }).value)
    ) {
      return (rec as { value: unknown[] }).value.filter(
        (x): x is string => typeof x === 'string',
      );
    }
    return undefined;
  };
  return {
    schemaVersion: '1.0',
    exportType: 'backup',
    exportedAt: new Date().toISOString(),
    cases,
    settings: {
      institutionHistory: pickArr(instH),
      diseaseHistory: pickArr(disH),
      medicationHistory: pickArr(medH),
    },
  };
}

export function suggestFilename(bundle: ExportBundle): string {
  if (bundle.exportType === 'single' && bundle.cases.length === 1) {
    return `${safeFilename(bundle.cases[0].caseName)}.genogram.json`;
  }
  if (bundle.exportType === 'multi') {
    return `genogram-${bundle.cases.length}-cases-${todayString()}.json`;
  }
  return `genogram-backup-${todayString()}.json`;
}

export function downloadJSON(bundle: ExportBundle, filename?: string): void {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? suggestFilename(bundle);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Parse imported file. Validates schemaVersion and returns the bundle.
 * Throws on invalid JSON or unsupported schema.
 */
export function parseImport(text: string): ExportBundle {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('檔案不是合法的 JSON');
  }
  if (!obj || typeof obj !== 'object') throw new Error('檔案格式錯誤');
  const bundle = obj as Partial<ExportBundle>;
  if (bundle.schemaVersion !== '1.0') {
    throw new Error(
      `不支援的版本 (${bundle.schemaVersion ?? 'unknown'}); 此版本只能讀 1.0`,
    );
  }
  if (!Array.isArray(bundle.cases)) throw new Error('檔案缺少 cases');
  return bundle as ExportBundle;
}

/**
 * 個案資料最小形狀驗證(#119)— 匯入 / 資料夾救援寫進 DB 前必過。
 * 只驗「渲染會直接炸掉」的欄位:缺 persons 陣列會讓首頁每次開啟都白屏。
 */
export function isValidGenogram(g: unknown): g is Genogram {
  if (!g || typeof g !== 'object') return false;
  const c = g as Partial<Genogram>;
  return (
    typeof c.id === 'string' &&
    c.id.length > 0 &&
    typeof c.caseName === 'string' &&
    Array.isArray(c.persons) &&
    c.persons.every(
      (p) =>
        !!p &&
        typeof p === 'object' &&
        typeof (p as Person).id === 'string' &&
        !!(p as Person).position &&
        typeof (p as Person).position.x === 'number' &&
        typeof (p as Person).position.y === 'number',
    ) &&
    Array.isArray(c.lines) &&
    c.lines.every(
      (l) => !!l && typeof l === 'object' && typeof (l as Line).id === 'string',
    )
  );
}

export type ConflictAction = 'overwrite' | 'duplicate' | 'skip';

export interface CaseConflict {
  incoming: Genogram;
  existing: Genogram;
}

/**
 * 匯入結果摘要
 */
export interface ImportResult {
  added: number;
  overwritten: number;
  skipped: number;
  /** 結構損壞、被略過的筆數(#119)*/
  invalid: number;
}

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * 套用匯入:對每筆 case 依 action 處理。新建為複本(duplicate)會生新 id。
 */
export async function applyImport(
  bundle: ExportBundle,
  decisions: Map<string, ConflictAction>, // key = case.id
): Promise<ImportResult> {
  let added = 0;
  let overwritten = 0;
  let skipped = 0;
  let invalid = 0;
  const importedIds: string[] = [];
  const now = new Date().toISOString();
  for (const c of bundle.cases) {
    // 壞資料直接寫進 DB 會讓首頁渲染炸掉(#119)→ 跳過並計數
    if (!isValidGenogram(c)) {
      invalid++;
      continue;
    }
    importedIds.push(c.id);
    const existing = await db.cases.get(c.id);
    if (!existing) {
      // 沒衝突 → 直接加
      await db.cases.put({ ...c, lastModifiedAt: now });
      added++;
      continue;
    }
    const action = decisions.get(c.id) ?? 'duplicate';
    if (action === 'skip') {
      skipped++;
    } else if (action === 'overwrite') {
      await db.cases.put({ ...c, lastModifiedAt: now });
      overwritten++;
    } else {
      // duplicate
      const dup: Genogram = {
        ...c,
        id: uid('case'),
        caseName: `${c.caseName} (匯入)`,
        lastModifiedAt: now,
      };
      await db.cases.put(dup);
      added++;
    }
  }
  // 含 settings → 合併 history(不限 backup,任何含 settings 的都合併)
  if (bundle.settings) {
    const merge = async (key: string, incoming?: string[]) => {
      if (!incoming || incoming.length === 0) return;
      const cur = await db.settings.get(key);
      const curArr =
        cur &&
        typeof cur === 'object' &&
        'value' in cur &&
        Array.isArray((cur as { value: unknown }).value)
          ? ((cur as { value: unknown[] }).value as unknown[]).filter(
              (x): x is string => typeof x === 'string',
            )
          : [];
      const merged = [...incoming, ...curArr.filter((x) => !incoming.includes(x))];
      await db.settings.put({ key, value: merged });
    };
    await Promise.all([
      merge('institutionHistory', bundle.settings.institutionHistory),
      merge('diseaseHistory', bundle.settings.diseaseHistory),
      merge('medicationHistory', bundle.settings.medicationHistory),
    ]);
  }
  // 使用者明確匯入 = 解除墓碑(#125),之後資料夾救援不再跳過這些 id
  await removeDeletedCaseIds(importedIds);
  return { added, overwritten, skipped, invalid };
}

export async function detectConflicts(
  bundle: ExportBundle,
): Promise<CaseConflict[]> {
  const conflicts: CaseConflict[] = [];
  for (const c of bundle.cases) {
    const existing = await db.cases.get(c.id);
    if (existing) conflicts.push({ incoming: c, existing });
  }
  return conflicts;
}

/* ==================== 加密接口(Phase 2 預留) ==================== */

export async function encryptExport(
  _bundle: ExportBundle,
  _password: string,
): Promise<Blob> {
  throw new Error('Phase 2 not implemented');
}

export async function decryptImport(
  _file: File,
  _password: string,
): Promise<ExportBundle> {
  throw new Error('Phase 2 not implemented');
}
