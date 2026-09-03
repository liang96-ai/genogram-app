import { describe, expect, it } from 'vitest';
import { createEmptyCase } from '../store/genogramStore';
import { relevelScaleResults } from './scaleResultMigration';

// 巴氏量表計分只看數值總和(鍵名無關):七題各 10 分 = 70
const seventy = { a: '10', b: '10', c: '10', d: '10', e: '10', f: '10', g: '10' };

describe('舊量表紀錄依新分級重算', () => {
  it('巴氏 70 分:舊等級「輕度依賴 (61-90)」→ 官方分級「中度依賴 (61-90)」黃燈;分數與答案不動', () => {
    const g = {
      ...createEmptyCase('x'),
      scaleResults: [
        { id: 'r1', scaleId: 'barthel', date: '2025-01-01', answers: seventy, totalScore: 70, level: '輕度依賴 (61-90)', levelColor: 'green' as const },
      ],
    };
    const { case: out, changed } = relevelScaleResults(g);
    expect(changed).toBe(1);
    expect(out.scaleResults![0]).toMatchObject({ totalScore: 70, level: '中度依賴 (61-90)', levelColor: 'yellow', answers: seventy });
  });
  it('已是新分級 / 其他量表 / 缺答案 → 原樣不動(回傳同一個物件)', () => {
    const g = {
      ...createEmptyCase('x'),
      scaleResults: [
        { id: 'r1', scaleId: 'barthel', date: '2025-01-01', answers: seventy, totalScore: 70, level: '中度依賴 (61-90)', levelColor: 'yellow' as const },
        { id: 'r2', scaleId: 'phq9', date: '2025-01-01', answers: { q1: 3 }, totalScore: 3, level: '無/極輕微', levelColor: 'green' as const },
        { id: 'r3', scaleId: 'barthel', date: '2025-01-01', answers: undefined as never, totalScore: 70, level: '舊字樣', levelColor: 'green' as const },
        // 答案加起來是 70、紀錄卻寫 65(手改壞的檔)→ 不碰
        { id: 'r4', scaleId: 'barthel', date: '2025-01-01', answers: seventy, totalScore: 65, level: '舊字樣', levelColor: 'green' as const },
      ],
    };
    const r = relevelScaleResults(g);
    expect(r.changed).toBe(0);
    expect(r.case).toBe(g);
  });
  it('沒有量表紀錄的個案不受影響', () => {
    const g = createEmptyCase('x');
    expect(relevelScaleResults(g).case).toBe(g);
  });
});
