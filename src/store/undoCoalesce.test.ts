// 復原合併窗(2026-08-27 決議)的專屬測試 —— 全計畫唯一的紅色風險項。
//
// 守的行為:
//   1. 同一目標 900ms 內的連續文字更新 = 一格復原(打 5 個字不再吃 5 格)
//   2. 停手超過 900ms = 新的一格
//   3. 換目標 / 做別的動作(拖曳、建立、刪除)/ undo / redo = 窗關閉
//   4. 上限 20 格,超過丟最舊的
// 跑真實 store(非 mock);時間用 vitest fake timers 控制。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  breakEditWindow,
  createEmptyCase,
  MAX_HISTORY,
  useGenogramStore,
} from './genogramStore';

const S = () => useGenogramStore.getState();

function seed() {
  const c = createEmptyCase('復原測試');
  useGenogramStore.setState({
    currentCase: c,
    history: { past: [], future: [] },
  });
  return c;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-27T10:00:00Z'));
  seed();
  // 每個測試從乾淨的窗開始 —— 直接關窗。
  // (原本用「推進 5000ms」想讓上一測試的窗過期,但 setSystemTime 每次都回到
  //  同一時刻,上一測試留下的 at 可能落在「未來」,時間推進保證不了過期)
  breakEditWindow();
});
afterEach(() => {
  vi.useRealTimers();
});

const meId = () => S().currentCase!.persons[0].id;
const past = () => S().history.past.length;
const nameOf = () => S().currentCase!.persons[0].basicInfo?.name;

describe('打字合併:一次編輯 = 一格', () => {
  it('連打 5 個字只吃一格,undo 一步回到打字前', () => {
    const id = meId();
    const initial = nameOf(); // 建案時的初始名(可能是空字串)
    const before = past();
    for (const n of ['王', '王大', '王大明', '王大明_', '王大明先生']) {
      S().updatePerson(id, { basicInfo: { name: n } });
      vi.advanceTimersByTime(120); // 每鍵間隔 120ms,遠小於 900ms 窗
    }
    expect(nameOf()).toBe('王大明先生');
    expect(past() - before).toBe(1); // ← 核心主張
    S().undo();
    expect(nameOf()).toBe(initial); // 一步回到完全沒打字之前
  });

  it('中文輸入法情境:組字中連續 onChange 不多吃格', () => {
    const id = meId();
    const before = past();
    // 模擬注音組字:ㄨ → ㄨㄤ → 王(每次組字變化都觸發 onChange)
    for (const n of ['ㄨ', 'ㄨㄤ', '王']) {
      S().updatePerson(id, { basicInfo: { name: n } });
      vi.advanceTimersByTime(200);
    }
    expect(past() - before).toBe(1);
  });

  it('停手超過 900ms 後再打 = 新的一格', () => {
    const id = meId();
    const initial = nameOf();
    const before = past();
    S().updatePerson(id, { basicInfo: { name: '第一段' } });
    vi.advanceTimersByTime(2000); // 停手
    S().updatePerson(id, { basicInfo: { name: '第二段' } });
    expect(past() - before).toBe(2);
    S().undo();
    expect(nameOf()).toBe('第一段'); // 第一次 undo 只退第二段
    S().undo();
    expect(nameOf()).toBe(initial);
  });

  it('訪談筆記內容同樣合併(逐鍵直寫的最後一處)', () => {
    S().addInterviewNote({ date: '2026-08-27T10:00:00Z', content: '' });
    const note = S().currentCase!.interviewNotes![0];
    const before = past();
    for (const v of ['今', '今天', '今天訪視']) {
      S().updateInterviewNote(note.id, { content: v });
      vi.advanceTimersByTime(100);
    }
    expect(past() - before).toBe(1);
    expect(S().currentCase!.interviewNotes![0].content).toBe('今天訪視');
  });

  it('單位名稱與線備註同樣合併', () => {
    S().addNetworkUnit('機構');
    const unit = S().currentCase!.networkUnits![0];
    const before = past();
    for (const n of ['社', '社會', '社會局']) {
      S().updateNetworkUnit(unit.id, { name: n });
      vi.advanceTimersByTime(100);
    }
    expect(past() - before).toBe(1);
    expect(S().currentCase!.networkUnits![0].name).toBe('社會局');
  });
});

describe('窗的關閉時機', () => {
  it('換一個人打字 = 各自一格', () => {
    const a = meId();
    S().expandParents(a);
    const b = S().currentCase!.persons.find((p) => p.id !== a)!;
    const before = past();
    S().updatePerson(a, { basicInfo: { name: '甲' } });
    vi.advanceTimersByTime(100);
    S().updatePerson(b.id, { basicInfo: { name: '乙' } });
    expect(past() - before).toBe(2);
  });

  it('打字中間插入其他動作(建人)→ 之後的打字開新格', () => {
    const id = meId();
    const before = past();
    S().updatePerson(id, { basicInfo: { name: '打到一半' } });
    vi.advanceTimersByTime(100);
    S().expandParents(id); // 其他歷史事件:關窗
    vi.advanceTimersByTime(100);
    S().updatePerson(id, { basicInfo: { name: '繼續打' } });
    // 打字1 + expandParents + 打字2 = 3 格
    expect(past() - before).toBe(3);
  });

  it('拖曳結算(commitMoveHistory)也關窗:之後的打字開新格', () => {
    const id = meId();
    const before = past();
    S().updatePerson(id, { basicInfo: { name: '打字' } });
    vi.advanceTimersByTime(100);
    // 模擬拖曳:記快照 → 移動(不推歷史)→ 手勢結束結算
    const snapshot = S().currentCase!;
    S().movePerson(id, 120, 120);
    S().commitMoveHistory(snapshot);
    vi.advanceTimersByTime(100);
    S().updatePerson(id, { basicInfo: { name: '打字二' } });
    // 打字1 + 拖曳結算 + 打字2 = 3 格(打字2 不准併回打字1 的窗)
    expect(past() - before).toBe(3);
  });

  it('undo 之後再打字 = 新格,且 redo 被正確清空', () => {
    const id = meId();
    S().updatePerson(id, { basicInfo: { name: '版本一' } });
    vi.advanceTimersByTime(2000);
    S().updatePerson(id, { basicInfo: { name: '版本二' } });
    S().undo();
    expect(nameOf()).toBe('版本一');
    expect(S().history.future.length).toBe(1);
    vi.advanceTimersByTime(100);
    S().updatePerson(id, { basicInfo: { name: '版本三' } });
    expect(S().history.future.length).toBe(0); // 編輯清 redo
    S().undo();
    expect(nameOf()).toBe('版本一'); // 不會誤併回 undo 前的窗
  });

  it('合併中的編輯也要清 redo(不能留下可跳回未來的殘留)', () => {
    const id = meId();
    S().updatePerson(id, { basicInfo: { name: 'A' } });
    vi.advanceTimersByTime(2000);
    S().updatePerson(id, { basicInfo: { name: 'B' } });
    S().undo();
    vi.advanceTimersByTime(100);
    // 開新格後 100ms 內再打 → 走合併路徑,但 future 也必須是空
    S().updatePerson(id, { basicInfo: { name: 'C1' } });
    vi.advanceTimersByTime(100);
    S().updatePerson(id, { basicInfo: { name: 'C2' } });
    expect(S().history.future.length).toBe(0);
  });
});

describe('上限 20', () => {
  it('MAX_HISTORY 是 20', () => {
    expect(MAX_HISTORY).toBe(20);
  });

  it('超過 20 個獨立事件,只留最近 20 格', () => {
    const id = meId();
    for (let i = 0; i < 25; i++) {
      S().updatePerson(id, { basicInfo: { name: `第${i}版` } });
      vi.advanceTimersByTime(2000); // 每次都超窗 = 每次都獨立一格
    }
    expect(past()).toBe(20);
    // 連 undo 20 次,停在能退的最遠處
    for (let i = 0; i < 25; i++) S().undo();
    expect(nameOf()).toBe('第4版'); // 第 0-4 版的前 5 格被裁掉,最遠退到第4版
  });
});
