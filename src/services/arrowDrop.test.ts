import { describe, expect, it } from 'vitest';
import { createEmptyCase, useGenogramStore } from '../store/genogramStore';
import { isAncestor, resolveArrowDrop } from './arrowDrop';

const S = () => useGenogramStore.getState();
function family() {
  // 祖父母 → 我;我 → 子女;另外一個不相干的人 X
  useGenogramStore.setState({ currentCase: createEmptyCase('drop'), history: { past: [], future: [] } });
  const me = S().currentCase!.persons[0].id;
  S().expandParents(me);
  const [father, mother] = S().currentCase!.persons.slice(1).map((p) => p.id);
  S().expandSpouseOrSibling(me, 'right');
  const spouse = S().currentCase!.persons[3].id;
  const marriage = S().currentCase!.lines.find((l) => l.subType === 'marriage' && (l.fromPersonId === me || l.toPersonId === me))!;
  S().expandChildFromMarriage(marriage.id);
  const kid = S().currentCase!.persons[4].id;
  S().addPersonAtCenter(1200, 800);
  const x = S().currentCase!.persons[5].id;
  const parentsMarriage = S().currentCase!.lines.find((l) => l.subType === 'marriage' && l.fromPersonId === father)!;
  return { c: S().currentCase!, me, father, mother, spouse, kid, x, marriage, parentsMarriage };
}

describe('箭頭拖曳落點', () => {
  it('祖先判斷:父親與祖父都是我的祖先;我不是父親的祖先', () => {
    const f = family();
    expect(isAncestor(f.c, f.father, f.me)).toBe(true);
    expect(isAncestor(f.c, f.father, f.kid)).toBe(true);
    expect(isAncestor(f.c, f.me, f.father)).toBe(false);
  });
  it('← / →:拖到不相干的人 = 結婚;拖到父母或子女 = 不做;已有線 = 不做', () => {
    const f = family();
    expect(resolveArrowDrop(f.c, 'right', f.me, { type: 'person', id: f.x })).toEqual({ kind: 'marry', a: f.me, b: f.x });
    expect(resolveArrowDrop(f.c, 'left', f.me, { type: 'person', id: f.x })).toEqual({ kind: 'marry', a: f.x, b: f.me });
    expect(resolveArrowDrop(f.c, 'right', f.me, { type: 'person', id: f.father }).kind).toBe('none');
    expect(resolveArrowDrop(f.c, 'right', f.me, { type: 'person', id: f.kid }).kind).toBe('none');
    expect(resolveArrowDrop(f.c, 'right', f.me, { type: 'person', id: f.spouse })).toEqual({ kind: 'none', reason: 'exists' });
    expect(resolveArrowDrop(f.c, 'right', f.me, { type: 'person', id: f.me })).toEqual({ kind: 'none', reason: 'self' });
  });
  it('↑:拖到人物 = 對方成為父母(已有父母 → 次要);拖到婚姻線 = 那對夫妻成為父母;拖到子女 = 繞圈不做', () => {
    const f = family();
    expect(resolveArrowDrop(f.c, 'up', f.me, { type: 'person', id: f.x })).toEqual({ kind: 'parents', childId: f.me, parentIds: [f.x], primary: false });
    expect(resolveArrowDrop(f.c, 'up', f.x, { type: 'person', id: f.me })).toEqual({ kind: 'parents', childId: f.x, parentIds: [f.me], primary: true });
    expect(resolveArrowDrop(f.c, 'up', f.x, { type: 'marriage', id: f.marriage.id })).toEqual({ kind: 'parents', childId: f.x, parentIds: [f.me, f.spouse], primary: true });
    expect(resolveArrowDrop(f.c, 'up', f.me, { type: 'marriage', id: f.parentsMarriage.id })).toEqual({ kind: 'none', reason: 'exists' });
    expect(resolveArrowDrop(f.c, 'up', f.father, { type: 'person', id: f.kid })).toEqual({ kind: 'none', reason: 'cycle' });
    expect(resolveArrowDrop(f.c, 'up', f.me, { type: 'marriage', id: f.marriage.id })).toEqual({ kind: 'none', reason: 'self' });
  });
  it('↓:拖到人物 = 對方成為我的子女;拖到自己的祖先 = 不做;拖到婚姻線 = 不支援', () => {
    const f = family();
    expect(resolveArrowDrop(f.c, 'down', f.me, { type: 'person', id: f.x })).toEqual({ kind: 'parents', childId: f.x, parentIds: [f.me], primary: true });
    expect(resolveArrowDrop(f.c, 'down', f.kid, { type: 'person', id: f.father })).toEqual({ kind: 'none', reason: 'cycle' });
    expect(resolveArrowDrop(f.c, 'down', f.me, { type: 'marriage', id: f.marriage.id })).toEqual({ kind: 'none', reason: 'unsupported' });
    expect(resolveArrowDrop(f.c, 'down', f.me, null)).toEqual({ kind: 'none', reason: 'no-target' });
  });
  it('← / →:任一方已有 3 段婚姻 → 不再建(與快捷箭頭同一條上限)', () => {
    const f = family();
    const S2 = () => useGenogramStore.getState();
    S2().expandSpouseOrSibling(f.x, 'right');
    S2().expandSpouseOrSibling(f.x, 'right');
    S2().expandSpouseOrSibling(f.x, 'right');
    const c2 = S2().currentCase!;
    expect(resolveArrowDrop(c2, 'right', f.me, { type: 'person', id: f.x })).toEqual({ kind: 'none', reason: 'limit' });
  });
});
