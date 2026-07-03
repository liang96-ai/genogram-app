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

// 只依賴 base 位置(不含 handleDrag 暫態);無子女回傳零值。
export function computeForkGeometry(
  a: Person,
  b: Person,
  childBundles: ChildBundle[],
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
  const trunkY = Math.max(midY + GRID_SIZE / 2, minChildTop - GRID_SIZE);
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
