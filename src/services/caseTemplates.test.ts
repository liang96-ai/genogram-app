import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyCase, useGenogramStore } from '../store/genogramStore';
import { TEMPLATE_IDS, applyTemplate } from './caseTemplates';
import { marriageOrderBadges } from './marriageOrder';

const S = () => useGenogramStore.getState();
const c = () => S().currentCase!;
const byName = (n: string) => c().persons.find((p) => p.basicInfo?.name === n)!;

beforeEach(() => {
  useGenogramStore.setState({
    currentCase: createEmptyCase('範本測試'),
    history: { past: [], future: [] },
    selectedPersonIds: [],
    selectedLineIds: [],
    selectedUnitIds: [],
    selectedEcosystemId: null,
    selectedHouseholdId: null,
  });
});

describe('範本(1.6.1)', () => {
  it.each(TEMPLATE_IDS)('%s:建得出來、沒有兩個人疊在同一格、復原紀錄是空的', (id) => {
    expect(applyTemplate(id)).toBe(true);
    const spots = c().persons.map((p) => `${p.position.x},${p.position.y}`);
    expect(new Set(spots).size).toBe(spots.length);
    expect(c().persons.every((p) => (p.basicInfo?.name ?? '').length > 0)).toBe(true);
    expect((c().households ?? []).length).toBeGreaterThan(0);
    expect(S().history.past).toHaveLength(0);
  });

  it('核心家庭:爸爸、媽媽、案主、妹妹四人同住', () => {
    applyTemplate('nuclear');
    expect(c().persons.map((p) => p.basicInfo?.name).sort()).toEqual(['妹妹', '媽媽', '案主', '爸爸'].sort());
    expect(c().households![0].memberIds).toHaveLength(4);
    expect(byName('爸爸').textInfo?.age).toBe(45);
  });

  it('單親家庭:父母離婚,案主和媽媽同住', () => {
    applyTemplate('single-parent');
    expect(c().lines.some((l) => l.subType === 'divorce')).toBe(true);
    expect(new Set(c().households![0].memberIds)).toEqual(new Set([byName('媽媽').id, byName('案主').id]));
  });

  it('重組家庭:媽媽兩段婚姻,自動標 1、2', () => {
    applyTemplate('stepfamily');
    const badges = [...marriageOrderBadges(c().persons, c().lines).values()];
    expect(badges.filter((b) => b.personId === byName('媽媽').id).map((b) => b.n).sort()).toEqual([1, 2]);
  });

  it('長輩輪住:媽媽同時在兩個輪住圈裡,爸爸過世', () => {
    applyTemplate('rotating');
    const hhs = c().households!;
    expect(hhs).toHaveLength(2);
    expect(hhs.every((h) => h.rotating && h.memberIds.includes(byName('媽媽').id))).toBe(true);
    expect(byName('爸爸').lifeStatus).toBe('deceased');
  });
});
