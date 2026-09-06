// ============================================================
// Fork(T 字)幾何 — 共用純模組
// MarriageGroup 渲染與 Canvas 重疊偵測共用這一份,避免兩處各算各的(常數漂移)。
// 放獨立檔(非元件檔)才不會觸發 react-refresh/only-export-components。
// ============================================================
import type { BasicShape, Line, Person } from '../../types/genogram';
import { GRID_SIZE, SHAPE_HALF } from '../../store/genogramStore';

export type ChildBundle = {
  child: Person;
  bioFromA?: Line;
  bioFromB?: Line;
};

// 菱形邊長 34 — 對齊 PersonShape 縮小後的菱形(婚姻/親子線接點才不會接歪)
const DIAMOND_SIDE = 34;
const DIAMOND_HALF = DIAMOND_SIDE / Math.SQRT2;

/** 圖形頂邊相對中心的 y 偏移(負值);親子/婚姻線接點用 */
export function topEdgeY(shape: BasicShape): number {
  const H = SHAPE_HALF;
  switch (shape) {
    case 'square':
    case 'circle':
    case 'triangle':
      return -H;
    case 'diamond':
      return -DIAMOND_HALF;
    case 'institution':
      return -H * 0.7;
    case 'pet':
      return -H * 0.6;
  }
}

/** 圖形在給定 y 偏移處的半寬(邊緣 x);婚姻線兩端接點用 */
export function edgeHalfXAtY(shape: BasicShape, yOffset: number): number {
  const H = SHAPE_HALF;
  const y = Math.abs(yOffset);
  switch (shape) {
    case 'square':
      return y > H ? 0 : H;
    case 'circle':
      return y > H ? 0 : Math.sqrt(H * H - y * y);
    case 'triangle':
      return y > H ? 0 : Math.max(0, (yOffset + H) / 2);
    case 'diamond':
      return y > DIAMOND_HALF ? 0 : DIAMOND_HALF - y;
    case 'institution': {
      // 機構長條固定 3 格寬(180),半寬 90
      const halfH = H * 0.7;
      return y > halfH ? 0 : 90;
    }
    case 'pet': {
      const h = H * 0.6;
      return y > h ? 0 : h - y;
    }
  }
}

export type ForkGeometry = {
  midX: number;
  midY: number;
  hasChildren: boolean;
  trunkY: number;
  /** 所有子女頂邊的最高點(自動錯層時的下限依據);無子女 = 0 */
  minChildTop: number;
  hbarMinX: number;
  hbarMaxX: number;
  needHbar: boolean;
  sortedChildren: ChildBundle[];
  childAnchorX: Map<string, number>;
};

// ==================== 婚姻線的走法(1.5.0)====================
// 使用者回報:同一輩放同一列時,跨家族的婚姻線會直直穿過中間的手足。
// 規則(線條避讓準則:系統畫的路徑可調、人不動):直線會穿過別人的符號或文字區 → 改走 U 型
// (兩端各自往下、再橫過去),橫桿高度自動落到沒有人的那一層;使用者也可以自己拖橫桿(trunkOffset)。
/** 符號下方的文字區高度(姓名 / 年齡 / 備註),婚姻線橫桿要避開這一段 */
export const PERSON_LABEL_ZONE = 40;
export type Zone = { minX: number; maxX: number; minY: number; maxY: number };
export function personZone(p: Pick<Person, 'position' | 'shape'>): Zone {
  const H = SHAPE_HALF;
  return {
    minX: p.position.x - H,
    maxX: p.position.x + H,
    minY: p.position.y + topEdgeY(p.shape),
    maxY: p.position.y + H + PERSON_LABEL_ZONE,
  };
}
/** 水平線段 [x1,x2] × [y1,y2](y1≤y2 的窄帶)有沒有碰到 zone */
export function bandHitsZone(x1: number, x2: number, y1: number, y2: number, z: Zone): boolean {
  return Math.min(x1, x2) < z.maxX && Math.max(x1, x2) > z.minX && y1 < z.maxY && y2 > z.minY;
}
export type MarriageRoute = { kind: 'direct' } | { kind: 'u'; busY: number; leftX: number; rightX: number };
/**
 * 直線(兩符號邊到邊)不碰到任何別人 → direct;否則 U 型,橫桿從兩人下方半格開始,
 * 往下錯到不碰任何別人的符號/文字區為止(每次半格,最多 8 次),再加上使用者的手動偏移。
 * @param others 除了這對夫妻以外的所有人物
 */
// 橫桿從兩人符號底邊下方起算,每次下移 1/4 格,直到不碰指定的障礙(最多 16 次)
function clearBelow(left: Person, right: Person, yHi: number, zones: Zone[]): number {
  let y = yHi + SHAPE_HALF + GRID_SIZE / 4;
  for (let i = 0; i < 16; i++) {
    if (!zones.some((z) => bandHitsZone(left.position.x, right.position.x, y - 2, y + 2, z))) break;
    y += GRID_SIZE / 4;
  }
  return y;
}
// 優先順序:① 不碰任何人的符號與文字;② 子女太近(maxBusY)時退而求其次,只保證不碰符號(線會穿過名字);
// 永遠不穿過符號。fork 的空間排在這兩者之後,computeForkGeometry 會把橫槓收到子女頂邊上方
function busBase(left: Person, right: Person, yHi: number, soft: Zone[], hard: Zone[], maxBusY?: number): number {
  const y = clearBelow(left, right, yHi, soft);
  if (maxBusY !== undefined && y > maxBusY) return clearBelow(left, right, yHi, hard);
  return y;
}
/** 「無偏移」時橫桿會落在的高度(直線婚姻也算得出來)——把手拖曳用它當偏移量的基準 */
export function marriageBusBase(a: Person, b: Person, others: Person[], opts: { maxBusY?: number } = {}): number {
  const [left, right] = a.position.x <= b.position.x ? [a, b] : [b, a];
  const yHi = Math.max(a.position.y, b.position.y);
  const people = others.filter((p) => p.id !== a.id && p.id !== b.id);
  const soft = people.map(personZone);
  const hard = people.map((p) => ({ ...personZone(p), maxY: p.position.y + SHAPE_HALF }));
  return busBase(left, right, yHi, soft, hard, opts.maxBusY);
}

export function computeMarriageRoute(
  a: Person,
  b: Person,
  others: Person[],
  opts: { trunkOffset?: number; maxBusY?: number } = {},
): MarriageRoute {
  const [left, right] = a.position.x <= b.position.x ? [a, b] : [b, a];
  const x1 = left.position.x + edgeHalfXAtY(left.shape, 0);
  const x2 = right.position.x - edgeHalfXAtY(right.shape, 0);
  const yLo = Math.min(left.position.y, right.position.y);
  const yHi = Math.max(left.position.y, right.position.y);
  const people = others.filter((p) => p.id !== a.id && p.id !== b.id);
  const soft = people.map(personZone); // 符號 + 文字區
  const hard = people.map((p) => ({ ...personZone(p), maxY: p.position.y + SHAPE_HALF })); // 只有符號
  const offset = opts.trunkOffset ?? 0;
  const directHits = soft.some((z) => bandHitsZone(x1, x2, yLo - 1, yHi + 1, z));
  if (!directHits && offset === 0) return { kind: 'direct' };
  const busY = busBase(left, right, yHi, soft, hard, opts.maxBusY) + offset;
  return { kind: 'u', busY, leftX: left.position.x, rightX: right.position.x };
}

// 只依賴 base 位置(不含 handleDrag 暫態);無子女回傳零值。
// baselineY:婚姻線橫桿的高度(U 型時傳 busY);主幹從這裡往下到 fork
export function computeForkGeometry(
  a: Person,
  b: Person,
  childBundles: ChildBundle[],
  baselineY?: number,
): ForkGeometry {
  const [left, right] = a.position.x <= b.position.x ? [a, b] : [b, a];
  const midX = (left.position.x + right.position.x) / 2;
  const midY = (left.position.y + right.position.y) / 2;
  const hasChildren = childBundles.length > 0;
  if (!hasChildren) {
    return {
      midX,
      midY,
      hasChildren: false,
      trunkY: 0,
      minChildTop: 0,
      hbarMinX: 0,
      hbarMaxX: 0,
      needHbar: false,
      sortedChildren: [],
      childAnchorX: new Map(),
    };
  }
  const minChildTop = Math.min(
    ...childBundles.map((c) => c.child.position.y + topEdgeY(c.child.shape)),
  );
  // Fork 固定在子女頂邊上方 1 格 → 子女拉遠時只有「父母→fork」變長;
  // 子女靠近父母時自動上移(下限為父母線下方半格)
  const base = baselineY ?? midY;
  // fork 橫槓:子女頂邊上方 1 格;但不能高於婚姻線橫桿(base),也不能低於子女頂邊上方 8px
  const trunkY = Math.max(base, Math.min(Math.max(base + GRID_SIZE / 2, minChildTop - GRID_SIZE), minChildTop - 8));
  const sortedChildren = [...childBundles].sort(
    (x, y) => x.child.position.x - y.child.position.x,
  );
  // 雙胞胎共享 fork:同 twinGroupId 用「群組中點」當 anchor
  const childAnchorX = new Map<string, number>();
  const used = new Set<string>();
  for (const c of sortedChildren) {
    if (used.has(c.child.id)) continue;
    const gid = c.child.twinGroupId;
    if (!gid) {
      childAnchorX.set(c.child.id, c.child.position.x);
      used.add(c.child.id);
    } else {
      const grp = sortedChildren.filter((cb) => cb.child.twinGroupId === gid);
      const xs = grp.map((cb) => cb.child.position.x);
      const anchor = (Math.min(...xs) + Math.max(...xs)) / 2;
      grp.forEach((cb) => {
        childAnchorX.set(cb.child.id, anchor);
        used.add(cb.child.id);
      });
    }
  }
  const allAnchorXs = sortedChildren.map(
    (c) => childAnchorX.get(c.child.id) ?? c.child.position.x,
  );
  const minChildX = Math.min(...allAnchorXs);
  const maxChildX = Math.max(...allAnchorXs);
  const hbarMinX = Math.min(midX, minChildX);
  const hbarMaxX = Math.max(midX, maxChildX);
  const needHbar = hbarMinX !== hbarMaxX;
  return {
    midX,
    midY,
    hasChildren: true,
    trunkY,
    minChildTop,
    hbarMinX,
    hbarMaxX,
    needHbar,
    sortedChildren,
    childAnchorX,
  };
}

// ==================== 交叉跳線(1.5.0)====================
// 婚姻線的水平段跟別的結構線交叉時,在交叉點鼓一個小弧「跳過去」,一眼看出兩條線不相連。
// 只算交點、只畫小弧,不動任何人的位置,也不改線的走法。
export type Seg = { x1: number; y1: number; x2: number; y2: number };
export const HOP_RADIUS = 8;

/** 兩線段的交點(嚴格在兩段內部);平行或不相交回 null */
export function segmentIntersection(a: Seg, b: Seg): { x: number; y: number } | null {
  const d1x = a.x2 - a.x1;
  const d1y = a.y2 - a.y1;
  const d2x = b.x2 - b.x1;
  const d2y = b.y2 - b.y1;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((b.x1 - a.x1) * d2y - (b.y1 - a.y1) * d2x) / den;
  const u = ((b.x1 - a.x1) * d1y - (b.y1 - a.y1) * d1x) / den;
  if (t <= 0 || t >= 1 || u <= 0 || u >= 1) return null;
  return { x: a.x1 + t * d1x, y: a.y1 + t * d1y };
}

/** 水平線段上要跳線的 x 位置(由左到右;離端點太近的不跳,免得弧跑出線外) */
export function hopXs(seg: Seg, others: Seg[], radius = HOP_RADIUS): number[] {
  if (seg.y1 !== seg.y2) return [];
  const lo = Math.min(seg.x1, seg.x2) + radius;
  const hi = Math.max(seg.x1, seg.x2) - radius;
  const xs: number[] = [];
  for (const o of others) {
    const hit = segmentIntersection(seg, o);
    if (!hit) continue;
    if (hit.x < lo || hit.x > hi) continue;
    // 同一點附近只跳一次(兩個交點距離小於一個弧的直徑就併成一個,免得路徑倒退打結)
    if (xs.some((x) => Math.abs(x - hit.x) < 2 * radius)) continue;
    xs.push(hit.x);
  }
  return xs.sort((a, b) => a - b);
}

/** 水平線段 + 跳線位置 → SVG path(弧一律往上鼓) */
export function horizontalPathWithHops(seg: Seg, xs: number[], radius = HOP_RADIUS): string {
  const y = seg.y1;
  const left = Math.min(seg.x1, seg.x2);
  const right = Math.max(seg.x1, seg.x2);
  let d = `M ${left} ${y}`;
  for (const x of xs) {
    d += ` H ${x - radius} A ${radius} ${radius} 0 0 1 ${x + radius} ${y}`;
  }
  d += ` H ${right}`;
  return d;
}

