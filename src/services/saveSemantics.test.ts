import { describe, expect, it } from 'vitest';
import { shouldSkipMirror } from './saveSemantics';

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-01T00:00:01.000Z';

describe('shouldSkipMirror(App 實際判準)', () => {
  it('開檔沒動 → 跳過;動了 → 鏡像', () => {
    const opened = new Map([['c1', T0]]);
    expect(shouldSkipMirror({ id: 'c1', lastModifiedAt: T0 }, opened, new Set())).toBe(true);
    expect(shouldSkipMirror({ id: 'c1', lastModifiedAt: T1 }, opened, new Set())).toBe(false);
  });
  it('復原情境:編輯過一次之後,就算 lastModifiedAt 退回開檔值也要鏡像(資料庫與資料夾不能分岔)', () => {
    const opened = new Map([['c1', T0]]);
    const touched = new Set<string>();
    expect(shouldSkipMirror({ id: 'c1', lastModifiedAt: T1 }, opened, touched)).toBe(false);
    touched.add('c1'); // App 在寫出變動後登記
    expect(shouldSkipMirror({ id: 'c1', lastModifiedAt: T0 }, opened, touched)).toBe(false);
  });
  it('切換個案的殘留:pendingSave 指舊個案、快照是新個案 → 各看各的,不互相影響', () => {
    const opened = new Map([['old', T0], ['new', T1]]);
    expect(shouldSkipMirror({ id: 'old', lastModifiedAt: T0 }, opened, new Set())).toBe(true);
    expect(shouldSkipMirror({ id: 'new', lastModifiedAt: T1 }, opened, new Set())).toBe(true);
    expect(shouldSkipMirror({ id: 'brandnew', lastModifiedAt: T1 }, opened, new Set())).toBe(false);
  });
});
