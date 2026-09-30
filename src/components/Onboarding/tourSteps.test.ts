import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyCase, useGenogramStore } from '../../store/genogramStore';
import { TOUR_STEPS, probandIdOf, tourBaseline } from './tourSteps';

const S = () => useGenogramStore.getState();
const step = (id: string) => TOUR_STEPS.find((s) => s.id === id)!;
const none = new Set<never>();

beforeEach(() => {
  useGenogramStore.setState({ currentCase: createEmptyCase('導覽'), history: { past: [], future: [] } });
});

describe('帶著做一次:每一步「做到了」的判斷', () => {
  it('第 1 步:幫案主加爸媽', () => {
    const base = tourBaseline(S().currentCase!);
    expect(step('parents').done(S().currentCase!, base, none)).toBe(false);
    S().expandParents(probandIdOf(S().currentCase!)!);
    expect(step('parents').done(S().currentCase!, base, none)).toBe(true);
  });

  it('第 2 步:加配偶或加小孩都算', () => {
    const me = probandIdOf(S().currentCase!)!;
    const base = tourBaseline(S().currentCase!);
    S().expandSpouseOrSibling(me, 'right');
    expect(step('family').done(S().currentCase!, base, none)).toBe(true);
  });

  it('第 3 步:改了任何人的年齡或存歿才算,打開面板不算', () => {
    const me = probandIdOf(S().currentCase!)!;
    const base = tourBaseline(S().currentCase!);
    expect(step('details').done(S().currentCase!, base, none)).toBe(false);
    S().updatePerson(me, { lifeStatus: 'deceased' });
    expect(step('details').done(S().currentCase!, base, none)).toBe(true);
  });

  it('第 4、5 步:用了快速建立、匯出了圖片才算', () => {
    const c = S().currentCase!;
    const base = tourBaseline(c);
    expect(step('quickBuild').done(c, base, none)).toBe(false);
    expect(step('quickBuild').done(c, base, new Set(['quickBuildApplied'] as const))).toBe(true);
    expect(step('export').done(c, base, new Set(['imageExported'] as const))).toBe(true);
  });

  it('在已經有爸媽的個案上重看:要再真的做一次才算', () => {
    S().expandParents(probandIdOf(S().currentCase!)!);
    const base = tourBaseline(S().currentCase!);
    expect(step('parents').done(S().currentCase!, base, none)).toBe(false);
  });

  it('第 3 步:新增或刪除人物不算填了資料', () => {
    const me = probandIdOf(S().currentCase!)!;
    const base = tourBaseline(S().currentCase!);
    S().expandSpouseOrSibling(me, 'right');
    expect(step('details').done(S().currentCase!, base, none)).toBe(false);
  });
});
