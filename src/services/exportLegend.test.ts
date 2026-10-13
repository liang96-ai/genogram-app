import { describe, expect, it } from 'vitest';
import type { Genogram } from '../types/genogram';
import { legendCodes, legendHeight } from './exportLegend';

const base = (over: Partial<Genogram>): Genogram =>
  ({
    schemaVersion: '1.0', id: 'c', caseName: 't', createdAt: '', lastModifiedAt: '',
    persons: [], lines: [], canvas: { gridSize: 20, snapToGrid: true }, ...over,
  }) as Genogram;
const p = (id: string, extra: Record<string, unknown> = {}) => ({ id, position: { x: 0, y: 0 }, shape: 'square', ...extra });
const l = (id: string, subType: string, extra: Record<string, unknown> = {}) =>
  ({ id, fromPersonId: 'a', toPersonId: 'b', category: 'member', subType, visual: {}, ...extra });

describe('legendCodes:只列這張圖用到的符號', () => {
  it('形狀、過世、醫療填色、案主、同住與輪住都會列出,沒用到的不列', () => {
    const c = base({
      persons: [
        p('a', { isProband: true }),
        p('b', { shape: 'circle', lifeStatus: 'deceased', fillPatterns: ['left-half-filled'] }),
      ] as Genogram['persons'],
      lines: [l('m', 'divorce'), l('r', 'hostile', { category: 'relation' })] as Genogram['lines'],
      households: [
        { id: 'h1', memberIds: ['a'], visual: { style: 'dashed-circle' } },
        { id: 'h2', memberIds: ['a', 'b'], visual: { style: 'dashed-circle' }, rotating: true },
      ],
    });
    const codes = legendCodes(c, { withLines: true });
    expect(codes).toEqual(
      expect.arrayContaining(['square', 'circle', 'deceased-f', 'disabled-f', 'divorce', 'hostile', 'proband', 'household', 'household-rotating']),
    );
    expect(codes).not.toContain('triangle');
    expect(codes).not.toContain('marriage');
  });

  it('勾了隱藏關係細節 → 不列線的種類;保密的線本來就不列', () => {
    const c = base({
      persons: [p('a')] as Genogram['persons'],
      lines: [l('m', 'marriage'), l('x', 'close', { private: true })] as Genogram['lines'],
    });
    expect(legendCodes(c, { withLines: false })).toEqual(['square']);
    expect(legendCodes(c, { withLines: true })).toEqual(['square', 'marriage']);
  });

  it('高度跟著項目數與寬度換行', () => {
    expect(legendHeight(0, 600)).toBe(0);
    expect(legendHeight(4, 600)).toBeLessThan(legendHeight(4, 160));
  });
});
