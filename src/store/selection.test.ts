// 選取互斥 + 刪除一步復原的行為鎖(1.4.0 統一)
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyCase, useGenogramStore } from './genogramStore';

const S = () => useGenogramStore.getState();
function seed(n = 3) {
  const c = createEmptyCase('選取測試');
  useGenogramStore.setState({
    currentCase: c,
    history: { past: [], future: [] },
    selectedPersonIds: [],
    selectedLineIds: [],
    selectedUnitIds: [],
    selectedEcosystemId: null,
    selectedHouseholdId: null,
    editingEcosystemId: null,
    selectedConnector: null,
  });
  for (let i = 1; i < n; i++) S().addPersonAtCenter(400 + i * 120, 400);
  return useGenogramStore.getState().currentCase!;
}
/** 互斥不變量:最多一種東西被選(人物+單位算一種) */
function selectedKinds(): string[] {
  const st = S();
  const kinds: string[] = [];
  if (st.selectedPersonIds.length || st.selectedUnitIds.length) kinds.push('persons/units');
  if (st.selectedLineIds.length) kinds.push('lines');
  if (st.selectedEcosystemId || st.editingEcosystemId) kinds.push('ecosystem');
  if (st.selectedHouseholdId) kinds.push('household');
  if (st.selectedConnector) kinds.push('connector');
  return kinds;
}

beforeEach(() => {
  seed();
});

describe('選取互斥(selectOnly 單一定義)', () => {
  it('任何 select* 之後都只剩一種選取', () => {
    const ids = S().currentCase!.persons.map((p) => p.id);
    S().selectPersons(ids);
    S().createRelationLine(ids[0], ids[1], 'close');
    const line = S().currentCase!.lines[0];
    S().addHousehold([ids[0], ids[1]]);
    const hh = S().currentCase!.households![0];
    const steps: Array<[string, () => void]> = [
      ['selectPerson', () => S().selectPerson(ids[0])],
      ['selectLine', () => S().selectLine(line.id)],
      ['selectHousehold', () => S().selectHousehold(hh.id)],
      ['selectPersons', () => S().selectPersons(ids)],
      ['selectUnits', () => S().selectUnits([])],
      ['setSelectedConnector', () => S().setSelectedConnector({ unitId: 'u', connectorId: 'c' })],
      ['selectLines', () => S().selectLines([line.id])],
      ['clearSelection', () => S().clearSelection()],
    ];
    for (const [name, run] of steps) {
      run();
      expect(selectedKinds().length, name).toBeLessThanOrEqual(1);
    }
    // 連接線被選時,再選人物必須清掉它(以前要靠 Canvas 手動清)
    S().setSelectedConnector({ unitId: 'u', connectorId: 'c' });
    S().selectPerson(ids[0]);
    expect(S().selectedConnector).toBeNull();
    // 反過來:選了人物再短按 connector → connector 選中、人物清掉(審查實測抓到的回歸)
    S().setSelectedConnector({ unitId: 'u', connectorId: 'c' });
    expect(S().selectedConnector).toEqual({ unitId: 'u', connectorId: 'c' });
    expect(S().selectedPersonIds).toEqual([]);
    // Canvas 在選人物之後補呼叫 setSelectedConnector(null):只清 connector,不能把人物清掉
    S().selectPerson(ids[0]);
    S().setSelectedConnector(null);
    expect(S().selectedPersonIds).toEqual([ids[0]]);
    expect(S().selectedConnector).toBeNull();
  });
});

describe('刪除:一個手勢 = 一格復原', () => {
  it('多選線條一起刪只推一格,undo 全回來', () => {
    const ids = S().currentCase!.persons.map((p) => p.id);
    S().createRelationLine(ids[0], ids[1], 'close');
    S().createRelationLine(ids[1], ids[2], 'close');
    S().createRelationLine(ids[0], ids[2], 'close');
    const lines = S().currentCase!.lines.map((l) => l.id);
    expect(lines).toHaveLength(3);
    S().selectLines(lines);
    const before = S().history.past.length;
    expect(S().describeDeletable()).toEqual({ kind: 'lines', n: 3 });
    expect(S().deleteSelected()).toBe(true);
    expect(S().currentCase!.lines).toHaveLength(0);
    expect(S().history.past.length - before).toBe(1);
    expect(S().selectedLineIds).toEqual([]);
    S().undo();
    expect(S().currentCase!.lines).toHaveLength(3);
  });

  it('describeDeletable 依優先序回報;沒選東西回 null 且 deleteSelected 不推歷史', () => {
    const ids = S().currentCase!.persons.map((p) => p.id);
    S().clearSelection();
    const before = S().history.past.length;
    expect(S().describeDeletable()).toBeNull();
    expect(S().deleteSelected()).toBe(false);
    expect(S().history.past.length).toBe(before);
    S().selectPersons([ids[0], ids[1]]);
    expect(S().describeDeletable()).toEqual({ kind: 'persons', n: 2 });
    S().addHousehold([ids[0], ids[1]]);
    S().selectHousehold(S().currentCase!.households![0].id);
    expect(S().describeDeletable()).toEqual({ kind: 'household', n: 1 });
    expect(S().deleteSelected()).toBe(true);
    expect(S().currentCase!.households ?? []).toHaveLength(0);
    expect(S().currentCase!.persons).toHaveLength(3); // 解除同住圈不刪人
  });

  it('removeLine(單條)仍是一格,並走同一條 removeLines 路徑', () => {
    const ids = S().currentCase!.persons.map((p) => p.id);
    S().createRelationLine(ids[0], ids[1], 'close');
    const line = S().currentCase!.lines[0];
    const before = S().history.past.length;
    S().removeLine(line.id);
    expect(S().currentCase!.lines).toHaveLength(0);
    expect(S().history.past.length - before).toBe(1);
    S().removeLine('ghost'); // 不存在:不推空歷史
    expect(S().history.past.length - before).toBe(1);
  });
});
