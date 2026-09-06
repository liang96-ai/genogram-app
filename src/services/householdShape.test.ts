import { describe, expect, it } from 'vitest';
import { householdAutoPoints, householdPoints } from './householdShape';

const P = (x: number, y: number) => ({ position: { x, y } });

describe('同住圈形狀', () => {
  it('自動形狀 = 成員外框 + 內距,四個角順時針', () => {
    expect(householdAutoPoints([P(100, 100), P(220, 160)], 28)).toEqual([
      { x: 72, y: 72 },
      { x: 248, y: 72 },
      { x: 248, y: 188 },
      { x: 72, y: 188 },
    ]);
  });
  it('沒有成員 → 空;有自訂頂點 → 用自訂的,不看成員', () => {
    expect(householdAutoPoints([])).toEqual([]);
    const custom = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 60 }, { x: 0, y: 60 }];
    const hh = { id: 'h', memberIds: ['a'], visual: { style: 'dashed-circle' as const }, points: custom };
    expect(householdPoints(hh, [{ id: 'a', position: { x: 500, y: 500 }, shape: 'square' }] as never)).toBe(custom);
  });
});
