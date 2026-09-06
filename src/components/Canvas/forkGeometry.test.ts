import { describe, expect, it } from 'vitest';
import type { Person } from '../../types/genogram';
import { computeForkGeometry, computeMarriageRoute, personZone, hopXs, horizontalPathWithHops, segmentIntersection } from './forkGeometry';

const P = (id: string, x: number, y: number, shape: Person['shape'] = 'square'): Person =>
  ({ id, position: { x, y }, shape, basicInfo: {} }) as Person;

describe('婚姻線走法', () => {
  it('相鄰的夫妻:直線', () => {
    expect(computeMarriageRoute(P('a', 480, 360), P('b', 600, 360), [])).toEqual({ kind: 'direct' });
  });
  it('中間隔著別人(同一列的手足)→ U 型,橫桿落在別人文字區下方', () => {
    const a = P('a', 480, 360);
    const b = P('b', 840, 360);
    const sib = P('s', 660, 360);
    const r = computeMarriageRoute(a, b, [sib]);
    expect(r.kind).toBe('u');
    if (r.kind === 'u') {
      const z = personZone(sib);
      expect(r.busY).toBeGreaterThanOrEqual(z.maxY); // 不碰手足的符號與文字
      expect(r.leftX).toBe(480);
      expect(r.rightX).toBe(840);
    }
  });
  it('手動偏移:相鄰夫妻也改走 U 型,橫桿高度加上偏移', () => {
    const r = computeMarriageRoute(P('a', 480, 360), P('b', 600, 360), [], { trunkOffset: 60 });
    expect(r.kind).toBe('u');
    if (r.kind === 'u') expect(r.busY).toBe(360 + 28 + 15 + 60);
  });
  it('子女太近(maxBusY 在別人的文字區裡):退而求其次只避開符號,永遠不穿過符號', () => {
    const r = computeMarriageRoute(P('a', 480, 360), P('b', 840, 360), [P('s', 660, 360)], { maxBusY: 400 });
    expect(r.kind).toBe('u');
    if (r.kind === 'u') {
      expect(r.busY).toBeGreaterThanOrEqual(360 + 28); // 符號底邊以下
      expect(r.busY).toBe(403); // 第一個不碰符號的高度
    }
  });
  it('子女夠遠時尊重 maxBusY(橫桿不會低到壓子女)', () => {
    const r = computeMarriageRoute(P('a', 480, 360), P('b', 840, 360), [P('s', 660, 360)], { maxBusY: 460 });
    if (r.kind === 'u') expect(r.busY).toBeLessThanOrEqual(460);
  });
  it('fork 主幹從橫桿高度往下(baselineY)', () => {
    const a = P('a', 480, 360);
    const b = P('b', 840, 360);
    const child = P('c', 660, 600);
    const g0 = computeForkGeometry(a, b, [{ child }]);
    const g1 = computeForkGeometry(a, b, [{ child }], 480);
    expect(g1.trunkY).toBeGreaterThanOrEqual(480 + 30);
    expect(g1.trunkY).toBeGreaterThanOrEqual(g0.trunkY);
    // 子女很近(頂邊 572)而橫桿在 553:橫槓收到子女頂邊上方 8px,不會壓到子女、也不會高於橫桿
    const near = P('n', 660, 600);
    const g2 = computeForkGeometry(a, b, [{ child: near }], 553);
    expect(g2.trunkY).toBe(564);
    const g3 = computeForkGeometry(a, b, [{ child: near }], 570);
    expect(g3.trunkY).toBe(570);
  });
});

describe('交叉跳線', () => {
  const bus = { x1: 100, y1: 200, x2: 500, y2: 200 };
  it('交點在兩段內部才算;平行或不相交回 null', () => {
    expect(segmentIntersection(bus, { x1: 300, y1: 100, x2: 300, y2: 300 })).toEqual({ x: 300, y: 200 });
    expect(segmentIntersection(bus, { x1: 300, y1: 210, x2: 300, y2: 300 })).toBeNull(); // 從橫桿下方開始,不交叉
    expect(segmentIntersection(bus, { x1: 100, y1: 260, x2: 500, y2: 260 })).toBeNull(); // 平行
  });
  it('水平橫桿上的跳線位置:由左到右、離端點太近的不跳、同一點只跳一次', () => {
    const others = [
      { x1: 400, y1: 100, x2: 400, y2: 300 },
      { x1: 250, y1: 150, x2: 250, y2: 260 },
      { x1: 262, y1: 100, x2: 262, y2: 300 }, // 跟 250 只差 12(< 一個弧的直徑)→ 併成一個
      { x1: 103, y1: 100, x2: 103, y2: 300 }, // 太靠近左端點 → 不跳
    ];
    expect(hopXs(bus, others)).toEqual([250, 400]);
    expect(hopXs({ x1: 100, y1: 200, x2: 500, y2: 260 }, others)).toEqual([]); // 非水平段不處理
  });
  it('path:每個跳線是一個往上的小半圓', () => {
    expect(horizontalPathWithHops(bus, [300], 8)).toBe('M 100 200 H 292 A 8 8 0 0 1 308 200 H 500');
    expect(horizontalPathWithHops(bus, [], 8)).toBe('M 100 200 H 500');
  });
});

