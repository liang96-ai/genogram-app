import type { LineSubType } from '../../types/genogram';

/** 哪些 RelationSubType 走「自訂幾何」(多線、鋸齒、波浪、箭頭、中央符號等) */
export const RELATION_GEOMETRY_TYPES = new Set<LineSubType>([
  'connected',
  'close',
  'fused',
  'spiritual',
  'focus-on',
  'hostile',
  'close-hostile',
  'negative-focus',
  'physical-abuse',
  'emotional-abuse',
  'sexual-abuse',
  'caregiver',
  'cutoff',
  'cutoff-repaired',
]);

// =============================================================
// 幾何工具(直線 + 弧形通用)
// =============================================================

/** 波浪 path — 直線版用 Q+T;弧形版用 sampled bezier 加正弦偏移 */
export function wavyPathStraight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amp: number,
  waves: number,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return '';
  const uy = dy / len;
  const ux = dx / len;
  const nx = -uy;
  const ny = ux;
  let path = `M ${x1} ${y1}`;
  for (let i = 1; i <= waves; i++) {
    const tEnd = i / waves;
    const cx = x1 + dx * tEnd;
    const cy = y1 + dy * tEnd;
    if (i === 1) {
      const tCtrl = (i - 0.5) / waves;
      const ctrlMidX = x1 + dx * tCtrl;
      const ctrlMidY = y1 + dy * tCtrl;
      const offset = -amp;
      const ctrlX = ctrlMidX + nx * offset;
      const ctrlY = ctrlMidY + ny * offset;
      path += ` Q ${ctrlX} ${ctrlY} ${cx} ${cy}`;
    } else {
      path += ` T ${cx} ${cy}`;
    }
  }
  return path;
}

/** 鋸齒 path — 直線版 */
export function zigzagPathStraight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amp: number,
  wavelen: number,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return '';
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const segs = Math.max(1, Math.floor(len / wavelen));
  let path = `M ${x1} ${y1}`;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;
    const offset = (i % 2 === 0 ? 1 : -1) * amp;
    path += ` L ${cx + nx * offset} ${cy + ny * offset}`;
  }
  path += ` L ${x2} ${y2}`;
  return path;
}

// ---- 弧形(quadratic bezier)工具 ----

/** quadratic bezier 在 t 位置的點 + 切線單位向量 */
function bezierAt(
  t: number,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
): { x: number; y: number; tx: number; ty: number; nx: number; ny: number } {
  const u = 1 - t;
  const x = u * u * x0 + 2 * u * t * cx + t * t * x2;
  const y = u * u * y0 + 2 * u * t * cy + t * t * y2;
  const dx = 2 * u * (cx - x0) + 2 * t * (x2 - cx);
  const dy = 2 * u * (cy - y0) + 2 * t * (y2 - cy);
  const len = Math.hypot(dx, dy) || 1;
  const tx = dx / len;
  const ty = dy / len;
  return { x, y, tx, ty, nx: -ty, ny: tx };
}

/** 平行 bezier(整條曲線往法向偏移 offset 距離) */
export function parallelBezierPath(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  offset: number,
): string {
  // 起點/終點各自的切線法向
  const start = bezierAt(0, x0, y0, cx, cy, x2, y2);
  const end = bezierAt(1, x0, y0, cx, cy, x2, y2);
  // 控制點:用 midpoint 的法向當主導
  const mid = bezierAt(0.5, x0, y0, cx, cy, x2, y2);
  const sX = x0 + start.nx * offset;
  const sY = y0 + start.ny * offset;
  const eX = x2 + end.nx * offset;
  const eY = y2 + end.ny * offset;
  const mX = mid.x + mid.nx * offset;
  const mY = mid.y + mid.ny * offset;
  // 從 (sX,sY) 經 (mX,mY) 到 (eX,eY) 的 quadratic — 反解 control point
  // 已知 midpoint 在 t=0.5 → B(0.5) = 0.25 s + 0.5 c + 0.25 e
  // c = (mX - 0.25 sX - 0.25 eX) * 2
  const ctrlX = (mX - 0.25 * sX - 0.25 * eX) * 2;
  const ctrlY = (mY - 0.25 * sY - 0.25 * eY) * 2;
  return `M ${sX} ${sY} Q ${ctrlX} ${ctrlY} ${eX} ${eY}`;
}

/** 沿弧形採樣 N 點 — 給鋸齒 / 波浪用 */
export function sampleBezier(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  n: number,
): { x: number; y: number; nx: number; ny: number }[] {
  const pts: { x: number; y: number; nx: number; ny: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = bezierAt(t, x0, y0, cx, cy, x2, y2);
    pts.push({ x: p.x, y: p.y, nx: p.nx, ny: p.ny });
  }
  return pts;
}

/** 鋸齒 path 沿弧形 — 採樣 N 點,交替法向偏移 */
export function zigzagPathArc(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  amp: number,
  wavelen: number,
): string {
  // 估弧長 ≈ chord+midpoint 距離 simple approximation
  const chord = Math.hypot(x2 - x0, y2 - y0);
  const midDist = Math.hypot((x0 + x2) / 2 - cx, (y0 + y2) / 2 - cy);
  const approxLen = chord + midDist * 0.5;
  const segs = Math.max(2, Math.floor(approxLen / wavelen));
  let path = `M ${x0} ${y0}`;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const p = bezierAt(t, x0, y0, cx, cy, x2, y2);
    const offset = (i % 2 === 0 ? 1 : -1) * amp;
    if (i === segs) {
      // 終點貼齊原 end,不偏移
      path += ` L ${x2} ${y2}`;
    } else {
      path += ` L ${p.x + p.nx * offset} ${p.y + p.ny * offset}`;
    }
  }
  return path;
}

/** 波浪 path 沿弧形 — 採樣 N 點,做 Q 段 sinusoidal */
export function wavyPathArc(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  amp: number,
  waves: number,
): string {
  // 每 wave 2 個樣本(波峰 / 波谷),總 segs = waves * 2
  const segs = waves * 2;
  let path = `M ${x0} ${y0}`;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const p = bezierAt(t, x0, y0, cx, cy, x2, y2);
    // 偏移交替符號模擬波(每兩段為一個完整 wave)
    const sign = i % 2 === 0 ? 1 : -1;
    const offset = i === segs ? 0 : sign * amp;
    path += ` Q ${p.x + p.nx * offset} ${p.y + p.ny * offset} ${p.x} ${p.y}`;
  }
  return path;
}

/** 弧形 control point 工具 — 給 arcDetour='up'/'right' 算出 ctrl */
export function arcControlPoint(
  x0: number,
  y0: number,
  x2: number,
  y2: number,
  arcDetour: 'up' | 'right',
  amount = 40,
): { cx: number; cy: number } {
  const midX = (x0 + x2) / 2;
  const midY = (y0 + y2) / 2;
  if (arcDetour === 'up') return { cx: midX, cy: midY - amount };
  return { cx: midX + amount, cy: midY };
}
