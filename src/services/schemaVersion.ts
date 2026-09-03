// 資料格式版本判斷 —— 唯一出口(docs/VERSIONING.md 規則 1 與 4)。
// 匯入端(parseImport)與資料夾救援端(readCaseJson)都走這裡,避免兩邊規則走岔。

/** 寫出端一律標這個值;新增選填欄位不改版號(規則 3)。 */
export const CURRENT_SCHEMA_VERSION = '1.0' as const;

/**
 * 1.x 一律試讀,只有大版號不同(2.x)才拒收。
 * @param allowMissing 資料夾裡的 case.json 從 v1.0 起就沒有 schemaVersion 欄位,
 *                     救援時缺版本視為 1.0;匯出檔一定有版本,缺了就不是本工具的檔。
 */
export function isSupportedSchemaVersion(
  v: unknown,
  opts: { allowMissing?: boolean } = {},
): boolean {
  if (v === undefined || v === null || v === '') return opts.allowMissing === true;
  return /^1\.\d+$/.test(String(v));
}
