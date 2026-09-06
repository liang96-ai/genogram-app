// 跨家族聯姻的靠攏助手(1.5.0):A 家的表姊妹嫁給 B 家的兄弟,同一列 → 兩人各自換到靠近對方的那一端
import { describe, expect, it } from 'vitest';
import { createEmptyCase, useGenogramStore } from './genogramStore';

const S = () => useGenogramStore.getState();

describe('bringSpousesTogether', () => {
  it('A 家三姊妹的老大嫁給 B 家三兄弟的老么 → 老大移到 A 列最右、老么移到 B 列最左', () => {
    useGenogramStore.setState({ currentCase: createEmptyCase('cross'), history: { past: [], future: [] } });
    const me = S().currentCase!.persons[0].id; // 當 A 家父親
    S().expandSpouseOrSibling(me, 'right');
    const mA = S().currentCase!.lines.find((l) => l.subType === 'marriage')!;
    S().expandChildFromMarriage(mA.id); S().expandChildFromMarriage(mA.id); S().expandChildFromMarriage(mA.id);
    const [a1, a2, a3] = S().currentCase!.persons.slice(2, 5).map((p) => p.id);
    // B 家:父母放在右邊很遠,三個兒子同一列
    S().addPersonAtCenter(1500, 360);
    const fb = S().currentCase!.persons[5].id;
    S().expandSpouseOrSibling(fb, 'right');
    const mB = S().currentCase!.lines.filter((l) => l.subType === 'marriage').find((l) => l.id !== mA.id)!;
    S().expandChildFromMarriage(mB.id); S().expandChildFromMarriage(mB.id); S().expandChildFromMarriage(mB.id);
    const [b1, b2, b3] = S().currentCase!.persons.slice(7, 10).map((p) => p.id);
    const P = (id: string) => S().currentCase!.persons.find((p) => p.id === id)!.position;
    // 兩列同高
    expect(P(a1).y).toBe(P(b1).y);
    // a1(最左)娶 b3(B 列最右)
    S().createMarriageLine(a1, b3, 'marriage');
    const cross = S().currentCase!.lines.find((l) => l.subType === 'marriage' && l.fromPersonId === a1)!;
    const aSlots = [a1, a2, a3].map((id) => P(id).x).sort((x, y) => x - y);
    const bSlots = [b1, b2, b3].map((id) => P(id).x).sort((x, y) => x - y);
    const before = S().history.past.length;
    S().bringSpousesTogether(cross.id);
    expect(S().history.past.length).toBe(before + 1);
    expect(P(a1).x).toBe(aSlots[2]); // A 列最右
    expect(P(b3).x).toBe(bSlots[0]); // B 列最左
    expect([a1, a2, a3].map((id) => P(id).x).sort((x, y) => x - y)).toEqual(aSlots); // 格位不變只換人
    expect([b1, b2, b3].map((id) => P(id).x).sort((x, y) => x - y)).toEqual(bSlots);
    S().undo();
    expect(P(a1).x).toBe(aSlots[0]);
  });
  it('沒有手足 → 不動、不推歷史', () => {
    useGenogramStore.setState({ currentCase: createEmptyCase('solo'), history: { past: [], future: [] } });
    const me = S().currentCase!.persons[0].id;
    S().expandSpouseOrSibling(me, 'right');
    const m = S().currentCase!.lines.find((l) => l.subType === 'marriage')!;
    const before = S().history.past.length;
    S().bringSpousesTogether(m.id);
    expect(S().history.past.length).toBe(before);
  });

  it('繼親家庭:同父異母的半手足不算同一列手足,不會被搬', () => {
    useGenogramStore.setState({ currentCase: createEmptyCase('step'), history: { past: [], future: [] } });
    const dad = S().currentCase!.persons[0].id;
    S().expandSpouseOrSibling(dad, 'right');
    const m1 = S().currentCase!.lines.find((l) => l.subType === 'marriage')!;
    S().expandChildFromMarriage(m1.id); S().expandChildFromMarriage(m1.id);
    const [a1, a2] = S().currentCase!.persons.slice(2, 4).map((p) => p.id);
    S().expandSpouseOrSibling(dad, 'left');
    const m2 = S().currentCase!.lines.filter((l) => l.subType === 'marriage').find((l) => l.id !== m1.id)!;
    S().expandChildFromMarriage(m2.id);
    const half = S().currentCase!.persons[5].id;
    const P = (id: string) => S().currentCase!.persons.find((p) => p.id === id)!.position;
    // 把半手足擺到同一列很遠的右邊,a1 娶一個更右邊的人
    S().movePerson(half, 1500, P(a1).y);
    S().addPersonAtCenter(2000, P(a1).y);
    const far = S().currentCase!.persons[6].id;
    S().createMarriageLine(a1, far, 'marriage');
    const cross = S().currentCase!.lines.find((l) => l.subType === 'marriage' && l.fromPersonId === a1)!;
    const halfBefore = { ...P(half) };
    S().bringSpousesTogether(cross.id);
    expect(P(half)).toEqual(halfBefore); // 半手足不動
    expect(P(a1).x).toBeGreaterThan(P(a2).x); // a1 換到自家手足列靠右那端
  });
});

