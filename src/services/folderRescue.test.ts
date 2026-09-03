import { describe, expect, it } from 'vitest';
import { createEmptyCase } from '../store/genogramStore';
import { pickNewer } from './folderRescue';

const mk = (id: string, at: string) => ({ ...createEmptyCase('x'), id, lastModifiedAt: at });

describe('pickNewer:資料夾裡比較新的版本', () => {
  it('資料夾較新 → 列出;較舊或相同 → 不列', () => {
    const local = new Map([['a', mk('a', '2026-01-02T00:00:00.000Z')], ['b', mk('b', '2026-01-02T00:00:00.000Z')]]);
    const folder = [mk('a', '2026-01-03T00:00:00.000Z'), mk('b', '2026-01-01T00:00:00.000Z'), mk('c', '2026-01-09T00:00:00.000Z')];
    const r = pickNewer(folder, local);
    expect(r.map((p) => p.folder.id)).toEqual(['a']);
    expect(r[0].local.lastModifiedAt).toBe('2026-01-02T00:00:00.000Z');
  });
  it('資料庫沒有的個案不在這裡處理(那是救援的事);缺時間戳不算新;壞檔不算', () => {
    const local = new Map([['a', mk('a', '2026-01-02T00:00:00.000Z')]]);
    expect(pickNewer([mk('zzz', '2026-09-09T00:00:00.000Z')], local)).toEqual([]);
    expect(pickNewer([{ ...mk('a', ''), lastModifiedAt: undefined as unknown as string }], local)).toEqual([]);
    expect(pickNewer([{ id: 'a', lastModifiedAt: '2027-01-01T00:00:00.000Z' } as never], local)).toEqual([]);
  });
});
