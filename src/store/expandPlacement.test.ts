// 新增從不移動已擺好的人(2026-09-05 使用者回報):
// 人數多時按快捷箭頭加子女,整排手足被重新對稱排列,親手拉到一邊的人被拉回去。
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyCase, useGenogramStore } from './genogramStore';

const S = () => useGenogramStore.getState();
const pos = (id: string) => S().currentCase!.persons.find((p) => p.id === id)!.position;
const marriageOf = (pid: string) =>
  S().currentCase!.lines.find((l) => l.subType === 'marriage' && (l.fromPersonId === pid || l.toPersonId === pid))!;

beforeEach(() => {
  useGenogramStore.setState({
    currentCase: createEmptyCase('placement'),
    history: { past: [], future: [] },
    selectedPersonIds: [],
    selectedLineIds: [],
    selectedUnitIds: [],
    selectedEcosystemId: null,
    selectedHouseholdId: null,
  });
});

describe('加子女', () => {
  it('第一個子女:父母中點正下方兩格', () => {
    const me = S().currentCase!.persons[0].id;
    S().expandSpouseOrSibling(me, 'right');
    const m = marriageOf(me);
    S().expandChildFromMarriage(m.id);
    const [a, b] = [pos(m.fromPersonId), pos(m.toPersonId)];
    const child = S().currentCase!.persons[2];
    expect(child.position.x).toBe((a.x + b.x) / 2);
    expect(child.position.y).toBe(Math.max(a.y, b.y) + 120);
  });

  it('已有子女且其中一個被拉到一邊:再加子女時既有的一個都不動,新的接在最右邊那個旁邊', () => {
    const me = S().currentCase!.persons[0].id;
    S().expandSpouseOrSibling(me, 'right');
    const m = marriageOf(me);
    S().expandChildFromMarriage(m.id);
    S().expandChildFromMarriage(m.id);
    const [c1, c2] = S().currentCase!.persons.slice(2).map((p) => p.id);
    // 使用者把第一個子女拖到左邊很遠、下面一格
    S().movePerson(c1, pos(c1).x - 600, pos(c1).y + 60);
    const before = { c1: { ...pos(c1) }, c2: { ...pos(c2) } };
    S().expandChildFromMarriage(m.id);
    expect(pos(c1)).toEqual(before.c1);
    expect(pos(c2)).toEqual(before.c2);
    const c3 = S().currentCase!.persons[4];
    expect(c3.position).toEqual({ x: before.c2.x + 120, y: before.c2.y });
  });

  it('新子女的位置被別人佔住 → 新的人自己往右讓,佔位的人不動', () => {
    const me = S().currentCase!.persons[0].id;
    S().expandSpouseOrSibling(me, 'right');
    const m = marriageOf(me);
    S().expandChildFromMarriage(m.id);
    const c1 = S().currentCase!.persons[2].id;
    // 放一個不相干的人在「下一個子女」該去的位置
    S().addPersonAtCenter(pos(c1).x + 120, pos(c1).y);
    const stranger = S().currentCase!.persons[3];
    const strangerPos = { ...stranger.position };
    S().expandChildFromMarriage(m.id);
    expect(pos(stranger.id)).toEqual(strangerPos);
    const c2 = S().currentCase!.persons[4];
    expect(c2.position.y).toBe(pos(c1).y);
    expect(c2.position.x).toBeGreaterThan(strangerPos.x);
  });

  it('雙胞胎同樣接在尾端,既有子女不動', () => {
    const me = S().currentCase!.persons[0].id;
    S().expandSpouseOrSibling(me, 'right');
    const m = marriageOf(me);
    S().expandChildFromMarriage(m.id);
    const c1 = S().currentCase!.persons[2].id;
    S().movePerson(c1, pos(c1).x - 480, pos(c1).y);
    const c1Before = { ...pos(c1) };
    S().expandTwinsFromMarriage(m.id, 2, 'fraternal');
    expect(pos(c1)).toEqual(c1Before);
    const twins = S().currentCase!.persons.slice(3);
    expect(twins).toHaveLength(2);
    expect(twins[0].position).toEqual({ x: c1Before.x + 120, y: c1Before.y });
    expect(twins[1].position).toEqual({ x: c1Before.x + 240, y: c1Before.y });
  });
});

describe('加配偶', () => {
  it('第二段婚姻:新配偶放在既有配偶更外面,既有的人一個都不動', () => {
    const me = S().currentCase!.persons[0].id;
    S().expandSpouseOrSibling(me, 'right');
    const s1 = S().currentCase!.persons[1].id;
    const s1Before = { ...pos(s1) };
    const meBefore = { ...pos(me) };
    S().expandSpouseOrSibling(me, 'right');
    expect(pos(s1)).toEqual(s1Before);
    expect(pos(me)).toEqual(meBefore);
    const s2 = S().currentCase!.persons[2];
    expect(s2.position.y).toBe(meBefore.y);
    expect(s2.position.x).toBeGreaterThan(s1Before.x);
  });

  it('新配偶的位置被手足佔住 → 新配偶自己往外讓,手足不再被整組推走', () => {
    const me = S().currentCase!.persons[0].id;
    const meP = pos(me);
    S().addPersonAtCenter(meP.x + 120, meP.y); // 佔住右邊兩格
    const sib = S().currentCase!.persons[1];
    const sibBefore = { ...sib.position };
    S().expandSpouseOrSibling(me, 'right');
    expect(pos(sib.id)).toEqual(sibBefore);
    const spouse = S().currentCase!.persons[2];
    expect(spouse.position.x).toBeGreaterThan(sibBefore.x);
  });
});

describe('整理子女排列(使用者主動)', () => {
  it('把拉散的子女排回對稱一列,一步可復原;已整齊時不推歷史', () => {
    const me = S().currentCase!.persons[0].id;
    S().expandSpouseOrSibling(me, 'right');
    const m = marriageOf(me);
    S().expandChildFromMarriage(m.id);
    S().expandChildFromMarriage(m.id);
    const [c1, c2] = S().currentCase!.persons.slice(2).map((p) => p.id);
    S().movePerson(c1, pos(c1).x - 600, pos(c1).y + 120);
    const scattered = { ...pos(c1) };
    const before = S().history.past.length;
    S().tidyChildrenOfMarriage(m.id);
    expect(S().history.past.length).toBe(before + 1);
    const [a, b] = [pos(m.fromPersonId), pos(m.toPersonId)];
    const midX = (a.x + b.x) / 2;
    expect(pos(c1)).toEqual({ x: midX - 60, y: Math.max(a.y, b.y) + 120 });
    expect(pos(c2)).toEqual({ x: midX + 60, y: Math.max(a.y, b.y) + 120 });
    const len = S().history.past.length;
    S().tidyChildrenOfMarriage(m.id); // 已整齊
    expect(S().history.past.length).toBe(len);
    S().undo();
    expect(pos(c1)).toEqual(scattered);
  });
});

describe('加父母:同一代留在同一排', () => {
  it('爸爸和媽媽各自加父母:四位祖父母在同一排、互不重疊,外公外婆往外側讓', () => {
    const me = S().currentCase!.persons[0].id;
    S().expandParents(me);
    const bioParents = (id: string) =>
      S().currentCase!.lines.filter((l) => l.subType === 'biological' && l.toPersonId === id).map((l) => l.fromPersonId);
    const [dad, mom] = bioParents(me).sort((a, b) => pos(a).x - pos(b).x);
    S().expandParents(dad);
    S().expandParents(mom);
    const grand = [...bioParents(dad), ...bioParents(mom)];
    expect(grand).toHaveLength(4);
    const ys = new Set(grand.map((id) => pos(id).y));
    expect(ys.size).toBe(1); // 同一排
    const all = S().currentCase!.persons;
    for (const a of all) {
      for (const b of all) {
        if (a.id < b.id) {
          expect(
            Math.abs(a.position.x - b.position.x) >= 36 || Math.abs(a.position.y - b.position.y) >= 36,
            `${a.id} 與 ${b.id} 重疊`,
          ).toBe(true);
        }
      }
    }
    const maxPaternal = Math.max(...bioParents(dad).map((id) => pos(id).x));
    const minMaternal = Math.min(...bioParents(mom).map((id) => pos(id).x));
    expect(minMaternal).toBeGreaterThan(maxPaternal); // 母系在父系右邊
  });
});

describe('加父母:換順序也不會把人推到另一個家族那頭', () => {
  const bioParents = (id: string) =>
    S().currentCase!.lines.filter((l) => l.subType === 'biological' && l.toPersonId === id).map((l) => l.fromPersonId);
  const noOverlap = () => {
    const all = S().currentCase!.persons;
    for (const a of all) {
      for (const b of all) {
        if (a.id < b.id) {
          expect(
            Math.abs(a.position.x - b.position.x) >= 36 || Math.abs(a.position.y - b.position.y) >= 36,
            `${a.id} 與 ${b.id} 重疊`,
          ).toBe(true);
        }
      }
    }
  };
  const nearChild = (childId: string) => {
    const ps = bioParents(childId);
    const mid = (pos(ps[0]).x + pos(ps[1]).x) / 2;
    expect(Math.abs(mid - pos(childId).x), `${childId} 的父母離太遠`).toBeLessThanOrEqual(240);
  };
  for (const order of [
    ['mom', 'dad', 'momDad', 'dadMom'],
    ['dad', 'mom', 'dadMom', 'momDad'],
    ['mom', 'momDad', 'dad', 'dadMom'],
  ]) {
    it(`順序:${order.join(' → ')}`, () => {
      const me = S().currentCase!.persons[0].id;
      S().expandParents(me);
      const [dad, mom] = bioParents(me).sort((a, b) => pos(a).x - pos(b).x);
      const ids: Record<string, () => string> = {
        dad: () => dad,
        mom: () => mom,
        // 外公 = 媽媽的父親(方塊)、奶奶 = 爸爸的母親(圓形)
        momDad: () => bioParents(mom).find((id) => S().currentCase!.persons.find((p) => p.id === id)!.shape === 'square')!,
        dadMom: () => bioParents(dad).find((id) => S().currentCase!.persons.find((p) => p.id === id)!.shape === 'circle')!,
      };
      for (const step of order) S().expandParents(ids[step]());
      noOverlap();
      for (const step of order) nearChild(ids[step]());
    });
  }
});

describe('加子女:同居、喪偶也算伴侶,不會多生出新配偶', () => {
  for (const kind of ['cohabitation', 'widowed', 'legal-separation'] as const) {
    it(`只有「${kind}」這條伴侶線時,加子女只多一個人`, () => {
      const me = S().currentCase!.persons[0].id;
      S().expandSpouseOrSibling(me, 'right');
      const m = marriageOf(me);
      useGenogramStore.setState({
        currentCase: {
          ...S().currentCase!,
          lines: S().currentCase!.lines.map((l) => (l.id === m.id ? { ...l, subType: kind } : l)),
        },
      });
      const before = S().currentCase!.persons.length;
      S().expandChild(me);
      expect(S().currentCase!.persons.length).toBe(before + 1);
      const child = S().currentCase!.persons[S().currentCase!.persons.length - 1];
      const parents = S().currentCase!.lines.filter((l) => l.toPersonId === child.id).map((l) => l.fromPersonId);
      expect(parents).toContain(me);
    });
  }
});

