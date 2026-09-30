import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyCase, useGenogramStore } from './genogramStore';

const S = () => useGenogramStore.getState();

beforeEach(() => {
  useGenogramStore.setState({
    currentCase: createEmptyCase('舊名字'),
    history: { past: [], future: [] },
    appMode: 'edit',
  });
  // 測試環境沒有 IndexedDB:改名寫資料庫那一步會失敗並記錄錯誤,這裡只驗畫面上的狀態
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('改名與復原', () => {
  it('改名後按復原撤銷別的動作,名字維持新的;重做也一樣', async () => {
    S().addPersonAtCenter(600, 400);
    const id = S().currentCase!.id;
    const count = S().currentCase!.persons.length;
    await S().renameCase(id, '新名字');
    expect(S().currentCase!.caseName).toBe('新名字');
    S().undo();
    expect(S().currentCase!.persons.length).toBe(count - 1); // 新增人物確實被撤銷
    expect(S().currentCase!.caseName).toBe('新名字');
    S().redo();
    expect(S().currentCase!.persons.length).toBe(count);
    expect(S().currentCase!.caseName).toBe('新名字');
  });

  it('復原後修改時間往前走,不會退回舊時間(資料夾同步靠它判斷哪一份比較新)', () => {
    S().addPersonAtCenter(600, 400);
    const before = S().currentCase!.lastModifiedAt;
    S().undo();
    expect(S().currentCase!.lastModifiedAt >= before).toBe(true);
  });

  it('復原會一併結束同住圈的編輯狀態', () => {
    S().addPersonAtCenter(600, 400);
    useGenogramStore.setState({ editingHouseholdId: 'hh_x' });
    S().undo();
    expect(S().editingHouseholdId).toBeNull();
  });
});
