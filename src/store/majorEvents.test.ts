// 重大事件時間軸的行為鎖(2026-08-30 獨立審查後補)。
// 守的是四件審查抓到的事:
//   1. 日期欄逐鍵 change 不能一鍵吃一格復原(接打字合併窗)
//   2. removeMajorEvent 對不存在的 id 不推空歷史(#126 同款)
//   3. 刪人物時,事件的「牽涉人物」不能留下幽靈 id
//   4. 壞掉的事件資料匯入時要被丟掉,不能靜默入庫(會讓整個 App 當掉)
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  breakEditWindow,
  createEmptyCase,
  useGenogramStore,
} from './genogramStore';
import { isValidGenogram, sanitizeCase } from '../services/exportImport';
import type { Genogram } from '../types/genogram';

const S = () => useGenogramStore.getState();

function seed() {
  const c = createEmptyCase('事件測試');
  useGenogramStore.setState({
    currentCase: c,
    history: { past: [], future: [] },
    selectedPersonIds: [],
    selectedHouseholdId: null,
  });
  S().addPersonAtCenter(600, 400); // 湊到兩個人
  breakEditWindow();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-30T10:00:00Z'));
  seed();
  breakEditWindow();
});

const events = () => S().currentCase!.majorEvents ?? [];
const past = () => S().history.past.length;
const ids = () => S().currentCase!.persons.map((p) => p.id);

describe('日期欄不吃光復原額度', () => {
  it('連續改日期 8 次(模擬 date input 逐鍵 change)只吃一格', () => {
    S().addMajorEvent({ date: '2026-08-30', title: '測試' });
    const id = events()[0].id;
    const before = past();
    for (const d of [
      '2026-08-01', '2026-08-12', '2026-08-22', '2026-08-25',
      '2026-08-31', '2026-08-20', '2026-08-02', '2026-08-25',
    ]) {
      S().updateMajorEvent(id, { date: d });
      vi.advanceTimersByTime(60); // 按鍵間隔遠小於 900ms 合併窗
    }
    expect(events()[0].date).toBe('2026-08-25');
    expect(past() - before).toBe(1); // ← 核心主張:8 次 change = 1 格
  });

  it('停手超過 900ms 再改 = 新的一格', () => {
    S().addMajorEvent({ date: '2026-08-30', title: '測試' });
    const id = events()[0].id;
    const before = past();
    S().updateMajorEvent(id, { title: '第一版' });
    vi.advanceTimersByTime(2000);
    S().updateMajorEvent(id, { title: '第二版' });
    expect(past() - before).toBe(2);
    S().undo();
    expect(events()[0].title).toBe('第一版');
  });
});

describe('removeMajorEvent 的存在性 guard', () => {
  it('不存在的 id:不推歷史、不動 lastModifiedAt', () => {
    const before = past();
    const lm = S().currentCase!.lastModifiedAt;
    S().removeMajorEvent('ev_ghost');
    expect(past()).toBe(before);
    expect(S().currentCase!.lastModifiedAt).toBe(lm);
  });

  it('存在的 id:刪得掉、undo 回得來', () => {
    S().addMajorEvent({ date: '2026-08-30', title: '要刪的' });
    const id = events()[0].id;
    S().removeMajorEvent(id);
    expect(events()).toHaveLength(0);
    S().undo();
    expect(events()).toHaveLength(1);
  });
});

describe('刪人物不留幽靈 id', () => {
  it('removePersons 會清掉事件的 relatedPersonIds', () => {
    const [a, b] = ids();
    S().addMajorEvent({
      date: '2026-08-30',
      title: '兩人都牽涉',
      relatedPersonIds: [a, b],
    });
    S().removePersons([a]);
    expect(events()[0].relatedPersonIds).toEqual([b]);
    // 事件本身保留 —— 它是個案層級的紀錄,不隨某個人消失
    expect(events()).toHaveLength(1);
  });

  it('removePersonsAndUnits(框選混合刪除)同樣會清', () => {
    const [a, b] = ids();
    S().addMajorEvent({
      date: '2026-08-30',
      title: '混合刪除',
      relatedPersonIds: [a, b],
    });
    S().removePersonsAndUnits([b], []);
    expect(events()[0].relatedPersonIds).toEqual([a]);
  });
});

describe('壞資料不得靜默入庫(毒藥丸防護)', () => {
  const base = (): Genogram => ({
    schemaVersion: '1.0',
    id: 'case_x',
    caseName: '壞檔',
    createdAt: '2026-08-30T00:00:00.000Z',
    lastModifiedAt: '2026-08-30T00:00:00.000Z',
    persons: [],
    lines: [],
    canvas: { gridSize: 60, snapToGrid: true },
  });

  it('陣列裡有 null → 丟掉那筆(不丟會讓排序 throw、整個 App 當掉)', () => {
    const bad = {
      ...base(),
      majorEvents: [
        { id: 'e1', date: '2026-01-01', title: '好的' },
        null,
      ],
    } as unknown as Genogram;
    expect(isValidGenogram(bad)).toBe(true); // 舊驗證器放行,所以才需要清洗
    const { case: clean, dropped } = sanitizeCase(bad);
    expect(dropped).toBe(1);
    expect(clean.majorEvents).toHaveLength(1);
    expect(clean.majorEvents![0].id).toBe('e1');
  });

  it('date 是數字 / 缺 title → 丟掉', () => {
    const bad = {
      ...base(),
      majorEvents: [
        { id: 'e1', date: 20260101, title: '日期是數字' },
        { id: 'e2', date: '2026-01-01' },
        { id: 'e3', date: '2026-01-01', title: '正常' },
      ],
    } as unknown as Genogram;
    const { case: clean, dropped } = sanitizeCase(bad);
    expect(dropped).toBe(2);
    expect(clean.majorEvents!.map((e) => e.id)).toEqual(['e3']);
  });

  it('majorEvents 整個不是陣列 → 當作沒有', () => {
    const bad = { ...base(), majorEvents: 'abc' } as unknown as Genogram;
    const { case: clean, dropped } = sanitizeCase(bad);
    expect(dropped).toBe(1);
    expect(clean.majorEvents).toBeUndefined();
  });

  it('正常資料原樣通過,不誤傷', () => {
    const good = {
      ...base(),
      majorEvents: [
        {
          id: 'e1',
          date: '2026-01-01',
          title: '正常',
          type: 'death',
          description: '說明',
          relatedPersonIds: ['p1'],
        },
      ],
    } as Genogram;
    const { case: clean, dropped } = sanitizeCase(good);
    expect(dropped).toBe(0);
    expect(clean).toBe(good); // 沒動到就回傳同一個物件
  });
});
