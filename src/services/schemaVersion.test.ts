import { describe, expect, it } from 'vitest';
import { isSupportedSchemaVersion } from './schemaVersion';

describe('schemaVersion 規則(docs/VERSIONING.md)', () => {
  it('1.x 一律接受,2.x 與其他一律拒收', () => {
    for (const v of ['1.0', '1.1', '1.27']) expect(isSupportedSchemaVersion(v)).toBe(true);
    for (const v of ['2.0', '0.9', '10.0', 'abc', '1', '1.x']) expect(isSupportedSchemaVersion(v)).toBe(false);
    expect(isSupportedSchemaVersion(1.0)).toBe(false); // 數字 1.0 會變成字串 '1',不是 '1.0'
    expect(isSupportedSchemaVersion('2.0')).toBe(false);
  });
  it('缺版本:匯出檔拒收、資料夾 case.json 視為 1.0', () => {
    expect(isSupportedSchemaVersion(undefined)).toBe(false);
    expect(isSupportedSchemaVersion('')).toBe(false);
    expect(isSupportedSchemaVersion(undefined, { allowMissing: true })).toBe(true);
    expect(isSupportedSchemaVersion('2.0', { allowMissing: true })).toBe(false);
  });
});
