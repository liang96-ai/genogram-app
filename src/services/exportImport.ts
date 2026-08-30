import { db, removeDeletedCaseIds } from './database';
import { writeCaseJson } from './fileSystem';
import type { Genogram, Line, Person } from '../types/genogram';
import { isRenderableEvent } from './majorEvents';

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
    educationHistory?: string[];
    ethnicityHistory?: string[];
    religionHistory?: string[];
    disabilityTypeHistory?: string[];
  };
}

const todayString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

/** 單一個案的預設匯出檔名 —— 去識別化(2026-08-27 決議):
 *  檔案會活在下載資料夾、信箱、隨身碟裡,檔名本身就是個資,
 *  所以預設不含案主名;要可辨識的名字,使用者存檔時自己改。 */
export const singleExportFilename = (g: Genogram): string =>
  `家系圖_${todayString()}_${g.persons.length}人.genogram.json`;

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
  const [instH, disH, medH, eduH, ethH, relH, dtH] = await Promise.all([
    db.settings.get('institutionHistory'),
    db.settings.get('diseaseHistory'),
    db.settings.get('medicationHistory'),
    db.settings.get('educationHistory'),
    db.settings.get('ethnicityHistory'),
    db.settings.get('religionHistory'),
    db.settings.get('disabilityTypeHistory'),
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
      educationHistory: pickArr(eduH),
      ethnicityHistory: pickArr(ethH),
      religionHistory: pickArr(relH),
      disabilityTypeHistory: pickArr(dtH),
    },
  };
}

export function suggestFilename(bundle: ExportBundle): string {
  if (bundle.exportType === 'single' && bundle.cases.length === 1) {
    return singleExportFilename(bundle.cases[0]);
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
    throw new Error(
      '無法讀取這個檔案 —— 它不是本工具匯出的 .json 個案檔(可能選到了 PDF、圖片或其他程式的檔案)',
    );
  }
  if (!obj || typeof obj !== 'object') throw new Error('檔案格式錯誤');
  const bundle = obj as Partial<ExportBundle>;
  // 版本規則(2026-08-27 決議,docs/VERSIONING.md):1.x 一律試讀 ——
  // 小版號只會「新增選填欄位」,未知欄位在匯入→編輯→回寫全程都會原樣保留(已實測);
  // 只有大版號改變(2.x)才代表不相容,拒收。寫出端維持 '1.0' 不變。
  const ver = String(bundle.schemaVersion ?? '');
  if (!/^1\.\d+$/.test(ver)) {
    throw new Error(
      `不支援的檔案版本 (${ver || 'unknown'});此版本可讀 1.x 系列的檔案`,
    );
  }
  if (!Array.isArray(bundle.cases))
    throw new Error(
      '這不是本工具匯出的個案檔(裡面沒有個案內容)。請選擇當初用「輸出檔案」存下來的 .json',
    );
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

/**
 * 匯入前的資料清洗(2026-08-30 審查:壞掉的 majorEvents 會讓整個 App 當掉,
 * 而且重開個案再點附件分頁會「再當一次」= 使用者無法自救的毒藥丸)。
 *
 * 設計取捨:依 docs/VERSIONING.md 的寬容讀取原則,**不因為子集合壞掉就整案拒收** ——
 * 只把「會讓程式炸掉」的元素丟掉,其餘原樣保留(未知欄位也保留)。
 * 丟掉的筆數回報給呼叫端,由 UI 決定要不要告訴使用者。
 */
export function sanitizeCase(g: Genogram): { case: Genogram; dropped: number } {
  let dropped = 0;
  let next = g;

  const raw = (g as { majorEvents?: unknown }).majorEvents;
  if (raw !== undefined) {
    if (!Array.isArray(raw)) {
      // 整個欄位型別就錯(字串/數字/物件)→ 當作沒有
      dropped += 1;
      next = { ...next, majorEvents: undefined };
    } else {
      const kept = raw.filter((e) => {
        // 判準與渲染層共用(services/majorEvents.ts)—— 兩邊寫法一旦分岐,
        // 就會出現「匯入時放行、渲染時炸掉」的縫
        const ok = isRenderableEvent(e);
        if (!ok) dropped += 1;
        return ok;
      });
      if (kept.length !== raw.length) {
        next = { ...next, majorEvents: kept as Genogram['majorEvents'] };
      }
    }
  }
  return { case: next, dropped };
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
  /** 個案有收下,但裡面丟掉的壞紀錄筆數(2026-08-30)*/
  repaired: number;
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
  let repaired = 0;
  const importedIds: string[] = [];
  // 匯入成功的個案要立刻寫進備份資料夾(2026-08-27 決議)——
  // 不然「同事傳來的 10 筆」在資料夾裡不存在,清快取就是真丟失,而使用者以為有備份
  const written: Genogram[] = [];
  const now = new Date().toISOString();
  for (const raw of bundle.cases) {
    // 壞資料直接寫進 DB 會讓首頁渲染炸掉(#119)→ 跳過並計數
    if (!isValidGenogram(raw)) {
      invalid++;
      continue;
    }
    // 子集合(重大事件)壞掉不整案拒收,只丟掉會炸的那幾筆(2026-08-30)
    const { case: c, dropped } = sanitizeCase(raw);
    if (dropped > 0) {
      repaired += dropped;
      console.warn(`import: dropped ${dropped} malformed record(s) in case ${c.id}`);
    }
    importedIds.push(c.id);
    const existing = await db.cases.get(c.id);
    if (!existing) {
      // 沒衝突 → 直接加
      await db.cases.put({ ...c, lastModifiedAt: c.lastModifiedAt || now });
      written.push({ ...c, lastModifiedAt: c.lastModifiedAt || now });
      added++;
      continue;
    }
    const action = decisions.get(c.id) ?? 'duplicate';
    if (action === 'skip') {
      skipped++;
    } else if (action === 'overwrite') {
      await db.cases.put({ ...c, lastModifiedAt: c.lastModifiedAt || now });
      written.push({ ...c, lastModifiedAt: c.lastModifiedAt || now });
      overwritten++;
    } else {
      // duplicate
      const dup: Genogram = {
        ...c,
        id: uid('case'),
        caseName: `${c.caseName} (匯入)`,
        lastModifiedAt: c.lastModifiedAt || now,
      };
      await db.cases.put(dup);
      written.push(dup);
      added++;
    }
  }
  for (const g of written) {
    writeCaseJson(g).catch((err) =>
      console.error('import writeCaseJson failed:', err),
    );
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
      merge('educationHistory', bundle.settings.educationHistory),
      merge('ethnicityHistory', bundle.settings.ethnicityHistory),
      merge('religionHistory', bundle.settings.religionHistory),
      merge('disabilityTypeHistory', bundle.settings.disabilityTypeHistory),
    ]);
  }
  // 使用者明確匯入 = 解除墓碑(#125),之後資料夾救援不再跳過這些 id
  await removeDeletedCaseIds(importedIds);
  return { added, overwritten, skipped, invalid, repaired };
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

