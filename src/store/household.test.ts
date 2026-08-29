// 同住圈刪除(2026-08-29 A 案)的行為鎖:
//   1. selectHousehold 與其他選取互斥
//   2. removeHousehold:真刪推一格、可復原;不存在的 id 只清選取不推空歷史(#126 同款)
//   3. 刪光成員 → 空圈解散 → 殘留選取一併清
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyCase, useGenogramStore } from './genogramStore';

const S = () => useGenogramStore.getState();

function seed() {
  const c = createEmptyCase('同住圈測試');
  useGenogramStore.setState({
    currentCase: c,
    history: { past: [], future: [] },
    selectedPersonIds: [],
    selectedLineIds: [],
    selectedUnitIds: [],
    selectedEcosystemId: null,
    selectedHouseholdId: null,
  });
  // 第二個人:同住圈需要 ≥2 人
  S().addPersonAtCenter(600, 400);
  return useGenogramStore.getState().currentCase!;
}

beforeEach(() => {
  seed();
});

const ids = () => S().currentCase!.persons.map((p) => p.id);
const households = () => S().currentCase!.households ?? [];

describe('selectHousehold 互斥', () => {
  it('選圈清掉人物/線/單位/生態圈選取;選人清掉圈', () => {
    S().addHousehold(ids());
    const hh = households()[0];
    S().selectPersons(ids());
    S().selectHousehold(hh.id);
    const st = useGenogramStore.getState();
    expect(st.selectedHouseholdId).toBe(hh.id);
    expect(st.selectedPersonIds).toEqual([]);
    expect(st.selectedUnitIds).toEqual([]);
    expect(st.selectedLineIds).toEqual([]);
    expect(st.selectedEcosystemId).toBeNull();
    S().selectPerson(ids()[0]);
    expect(useGenogramStore.getState().selectedHouseholdId).toBeNull();
  });

  it('addPersonAtCenter(Tab1 新增人物)也會清圈選取', () => {
    S().addHousehold(ids());
    S().selectHousehold(households()[0].id);
    S().addPersonAtCenter(800, 400);
    expect(useGenogramStore.getState().selectedHouseholdId).toBeNull();
  });

  it('建關係線(pending 完成)也會清圈選取', () => {
    S().addHousehold(ids());
    const [a, b] = ids();
    S().selectHousehold(households()[0].id);
    S().createRelationLine(a, b, 'close');
    expect(useGenogramStore.getState().selectedHouseholdId).toBeNull();
  });
});

describe('removeHousehold', () => {
  it('真刪:一格歷史、undo 圈回來', () => {
    S().addHousehold(ids());
    const hh = households()[0];
    const before = S().history.past.length;
    S().removeHousehold(hh.id);
    expect(households()).toHaveLength(0);
    expect(S().history.past.length - before).toBe(1);
    S().undo();
    expect(households()).toHaveLength(1);
  });

  it('不存在的 id:不推歷史、不碰 lastModifiedAt,只清殘留選取', () => {
    const before = S().history.past.length;
    const lm = S().currentCase!.lastModifiedAt;
    useGenogramStore.setState({ selectedHouseholdId: 'hh_ghost' });
    S().removeHousehold('hh_ghost');
    expect(S().history.past.length).toBe(before);
    expect(S().currentCase!.lastModifiedAt).toBe(lm);
    expect(useGenogramStore.getState().selectedHouseholdId).toBeNull();
  });
});

describe('空圈解散時的殘留選取', () => {
  it('刪光成員 → 圈消失 → selectedHouseholdId 一併清', () => {
    S().addHousehold(ids());
    S().selectHousehold(households()[0].id);
    S().removePersons(ids());
    const st = useGenogramStore.getState();
    expect(st.currentCase!.households ?? []).toHaveLength(0);
    expect(st.selectedHouseholdId).toBeNull();
  });
});
