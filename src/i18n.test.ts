import { describe, expect, it } from 'vitest';
import { i18nKeySets } from './i18n';

// 中英 key 必須完全對稱:英文模式缺 key 會靜默顯示中文,沒有任何錯誤。
describe('i18n zh / en 對稱', () => {
  it('兩邊 key 集合完全相同', () => {
    const { zh, en } = i18nKeySets();
    const zhSet = new Set(zh);
    const enSet = new Set(en);
    const onlyZh = zh.filter((k) => !enSet.has(k));
    const onlyEn = en.filter((k) => !zhSet.has(k));
    expect({ onlyZh, onlyEn }).toEqual({ onlyZh: [], onlyEn: [] });
    expect(zh.length).toBe(en.length);
  });
});
