import type { BasicShape, Line, Person } from '../../types/genogram';
import {
  GRID_SIZE,
  SHAPE_HALF,
  SUBTYPE_SPEC,
  getLineStyleKey,
  getDasharray,
} from '../../store/genogramStore';
import type { MidSymbolKey } from '../../store/genogramStore';
import { useT } from '../../i18n';

export type ChildBundle = {
  child: Person;
  bioFromA?: Line;
  bioFromB?: Line;
};

type HandleDragState = {
  drags: Array<{ lineId: string; end: 'from' | 'to' }>;
  currentX: number;
  currentY: number;
  pointerId: number;
};

type Props = {
  marriageLine: Line;
  a: Person;
  b: Person;
  childBundles: ChildBundle[];
  selectedLineIds: string[];
  handleDrag: HandleDragState | null;
  onLinePointerDown: (e: React.PointerEvent, lineId: string) => void;
  onLineDoubleClick: (e: React.MouseEvent, lineId: string) => void;
  onMarriageDownArrow: () => void;
  onMarriageDownArrowLongPress?: () => void;
  onDeleteLine?: (lineId: string) => void;
};

// 菱形邊長 48
const DIAMOND_SIDE = 48;
const DIAMOND_HALF = DIAMOND_SIDE / Math.SQRT2;

function topEdgeY(shape: BasicShape): number {
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

function edgeHalfXAtY(shape: BasicShape, yOffset: number): number {
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

// 線中點符號:每條 stroke 都先畫白底較粗版本,再畫彩色細版本(產生白邊)
function HaloLine({
  x1,
  y1,
  x2,
  y2,
  color,
  width,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
}) {
  return (
    <>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#ffffff"
        strokeWidth={width + 2.5}
        strokeLinecap="round"
      />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={width}
      />
    </>
  );
}

function renderMidSymbol(
  symbol: MidSymbolKey | undefined,
  color: string,
  width: number,
) {
  if (!symbol) return null;
  switch (symbol) {
    case 'slash-single':
      return <HaloLine x1={-5} y1={12} x2={5} y2={-12} color={color} width={width} />;
    case 'slash-back':
      return <HaloLine x1={-5} y1={-12} x2={5} y2={12} color={color} width={width} />;
    case 'slash-double':
      return (
        <>
          <HaloLine x1={-10} y1={12} x2={0} y2={-12} color={color} width={width} />
          <HaloLine x1={0} y1={12} x2={10} y2={-12} color={color} width={width} />
        </>
      );
    case 'x':
      return (
        <>
          <HaloLine x1={-8} y1={-8} x2={8} y2={8} color={color} width={width} />
          <HaloLine x1={8} y1={-8} x2={-8} y2={8} color={color} width={width} />
        </>
      );
    case 'house':
      // 五角形屋頂(本來就有白填,自帶白底)
      return (
        <polygon
          points="-8,6 8,6 8,-3 0,-10 -8,-3"
          fill="#ffffff"
          stroke={color}
          strokeWidth={width}
        />
      );
  }
}

export default function MarriageGroup({
  marriageLine: m,
  a,
  b,
  childBundles,
  selectedLineIds,
  handleDrag,
  onLinePointerDown,
  onLineDoubleClick,
  onMarriageDownArrow,
  onMarriageDownArrowLongPress,
  onDeleteLine,
}: Props) {
  const t = useT();
  const marriageDragEntry = handleDrag?.drags.find((d) => d.lineId === m.id);
  // 全部黑色 member line 統一:純黑 + 2x 粗度(跟 Line.tsx 一致)
  const baseStroke = '#000000';
  const baseWidth = 3;
  const selColor = '#007aff';
  const dragColor = '#ff9500';

  const [left, right] = a.position.x <= b.position.x ? [a, b] : [b, a];

  const leftEdge = edgeHalfXAtY(left.shape, 0);
  const rightEdge = edgeHalfXAtY(right.shape, 0);
  // 婚姻線實際兩端(考慮 handleDrag 的 override)
  const marriageDragging = !!marriageDragEntry;
  const marriageAX =
    marriageDragging && marriageDragEntry.end === 'from' && handleDrag
      ? handleDrag.currentX
      : a.position.x;
  const marriageAY =
    marriageDragging && marriageDragEntry.end === 'from' && handleDrag
      ? handleDrag.currentY
      : a.position.y;
  const marriageBX =
    marriageDragging && marriageDragEntry.end === 'to' && handleDrag
      ? handleDrag.currentX
      : b.position.x;
  const marriageBY =
    marriageDragging && marriageDragEntry.end === 'to' && handleDrag
      ? handleDrag.currentY
      : b.position.y;

  const [renderLeftX, renderLeftY, renderRightX, renderRightY] =
    marriageAX <= marriageBX
      ? [marriageAX, marriageAY, marriageBX, marriageBY]
      : [marriageBX, marriageBY, marriageAX, marriageAY];

  const lineStart = {
    x: marriageDragging ? renderLeftX : left.position.x + leftEdge,
    y: marriageDragging ? renderLeftY : left.position.y,
  };
  const lineEnd = {
    x: marriageDragging ? renderRightX : right.position.x - rightEdge,
    y: marriageDragging ? renderRightY : right.position.y,
  };
  const midX = (left.position.x + right.position.x) / 2;
  const midY = (left.position.y + right.position.y) / 2;

  const marriageSelected = selectedLineIds.includes(m.id);
  const mColor = marriageDragging
    ? dragColor
    : marriageSelected
      ? selColor
      : baseStroke;
  const mWidth = marriageDragging || marriageSelected ? 5 : baseWidth;
  const mDash = getDasharray(getLineStyleKey(m));
  const mMidSymbol = SUBTYPE_SPEC[m.subType]?.midSymbol;

  const hasChildren = childBundles.length > 0;
  const minChildTop = hasChildren
    ? Math.min(
        ...childBundles.map(
          (c) => c.child.position.y + topEdgeY(c.child.shape),
        ),
      )
    : 0;
  // Fork(crossbar)固定在子女頂邊上方 1 格 → 子女拉遠時只有「父母→fork」這條變長
  // 子女靠近父母時自動上移避免擠到子女(下限為父母線下方半格)
  const trunkY = hasChildren
    ? Math.max(midY + GRID_SIZE / 2, minChildTop - GRID_SIZE)
    : 0;
  const sortedChildren = [...childBundles].sort(
    (x, y) => x.child.position.x - y.child.position.x,
  );
  // 雙胞胎共享 fork:同 twinGroupId 的小孩用「群組中點」當 anchor
  const childAnchorX = new Map<string, number>();
  {
    const used = new Set<string>();
    for (const c of sortedChildren) {
      if (used.has(c.child.id)) continue;
      const gid = c.child.twinGroupId;
      if (!gid) {
        childAnchorX.set(c.child.id, c.child.position.x);
        used.add(c.child.id);
      } else {
        const grp = sortedChildren.filter(
          (cb) => cb.child.twinGroupId === gid,
        );
        const xs = grp.map((cb) => cb.child.position.x);
        const anchor = (Math.min(...xs) + Math.max(...xs)) / 2;
        grp.forEach((cb) => {
          childAnchorX.set(cb.child.id, anchor);
          used.add(cb.child.id);
        });
      }
    }
  }
  const allAnchorXs = sortedChildren.map(
    (c) => childAnchorX.get(c.child.id) ?? c.child.position.x,
  );
  const minChildX = hasChildren ? Math.min(...allAnchorXs) : 0;
  const maxChildX = hasChildren ? Math.max(...allAnchorXs) : 0;
  const hbarMinX = hasChildren ? Math.min(midX, minChildX) : 0;
  const hbarMaxX = hasChildren ? Math.max(midX, maxChildX) : 0;
  const needHbar = hasChildren && hbarMinX !== hbarMaxX;

  // 主幹/橫槓的 dash:用第一個子女的 bio 線型
  // (置出養場景:所有子女 bio 都是 placed-out → 整條 T 字都虛線)
  const firstChildBio =
    childBundles[0]?.bioFromA ?? childBundles[0]?.bioFromB;
  const trunkDash = firstChildBio
    ? getDasharray(getLineStyleKey(firstChildBio))
    : undefined;

  return (
    <g>
      {/* 婚姻線本體 */}
      <line
        x1={lineStart.x}
        y1={lineStart.y}
        x2={lineEnd.x}
        y2={lineEnd.y}
        stroke={mColor}
        strokeWidth={mWidth}
        strokeDasharray={mDash}
      />
      <line
        x1={lineStart.x}
        y1={lineStart.y}
        x2={lineEnd.x}
        y2={lineEnd.y}
        stroke="transparent"
        strokeWidth={18}
        onPointerDown={(e) => onLinePointerDown(e, m.id)}
        onDoubleClick={(e) => onLineDoubleClick(e, m.id)}
        style={{ cursor: marriageDragging ? 'grabbing' : 'grab' }}
      />

      {/* 中間符號(斜線/X/房屋) */}
      {mMidSymbol && !marriageDragging && (
        <g
          transform={`translate(${midX}, ${midY})`}
          style={{ pointerEvents: 'none' }}
        >
          {renderMidSymbol(mMidSymbol, mColor, mWidth)}
        </g>
      )}

      {/* 備註文字(婚姻線上方) */}
      {m.note && !marriageDragging && (() => {
        const lines = m.note.split('\n').slice(0, 10).map((l) =>
          l.length > 20 ? l.slice(0, 19) + '…' : l,
        );
        if (lines.length === 0) return null;
        return (
          <text
            x={midX}
            y={midY - 16}
            textAnchor="middle"
            fontSize={11}
            fill="#6e6e73"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {lines.map((l, i) => (
              <tspan key={i} x={midX} dy={i === 0 ? 0 : 14}>
                {l || ' '}
              </tspan>
            ))}
          </text>
        );
      })()}

      {/* T 字 */}
      {hasChildren && !marriageDragging && (
        <>
          {/* 主幹視覺 */}
          <line
            x1={midX}
            y1={midY}
            x2={midX}
            y2={trunkY}
            stroke={baseStroke}
            strokeWidth={baseWidth}
            strokeDasharray={trunkDash}
          />
          {/* 主幹 hit area — 點到選第一個 bio 代表 */}
          {childBundles[0] && (childBundles[0].bioFromA ?? childBundles[0].bioFromB) && (
            <line
              x1={midX}
              y1={midY}
              x2={midX}
              y2={trunkY}
              stroke="transparent"
              strokeWidth={16}
              onPointerDown={(e) =>
                onLinePointerDown(
                  e,
                  (childBundles[0].bioFromA ?? childBundles[0].bioFromB)!.id,
                )
              }
              onDoubleClick={(e) =>
                onLineDoubleClick(
                  e,
                  (childBundles[0].bioFromA ?? childBundles[0].bioFromB)!.id,
                )
              }
              style={{ cursor: 'grab' }}
            />
          )}
          {needHbar && (
            <>
              <line
                x1={hbarMinX}
                y1={trunkY}
                x2={hbarMaxX}
                y2={trunkY}
                stroke={baseStroke}
                strokeWidth={baseWidth}
                strokeDasharray={trunkDash}
              />
              {/* 橫分叉 hit area */}
              {childBundles[0] && (childBundles[0].bioFromA ?? childBundles[0].bioFromB) && (
                <line
                  x1={hbarMinX}
                  y1={trunkY}
                  x2={hbarMaxX}
                  y2={trunkY}
                  stroke="transparent"
                  strokeWidth={16}
                  onPointerDown={(e) =>
                    onLinePointerDown(
                      e,
                      (childBundles[0].bioFromA ?? childBundles[0].bioFromB)!.id,
                    )
                  }
                  onDoubleClick={(e) =>
                    onLineDoubleClick(
                      e,
                      (childBundles[0].bioFromA ?? childBundles[0].bioFromB)!.id,
                    )
                  }
                  style={{ cursor: 'grab' }}
                />
              )}
            </>
          )}
          {childBundles.map((c) => {
            const bio = c.bioFromA ?? c.bioFromB;
            if (!bio) return null;
            const childSelected = selectedLineIds.includes(bio.id);
            const childDragEntry = handleDrag?.drags.find(
              (d) => d.lineId === bio.id,
            );
            const childDragging = !!childDragEntry;
            const cColor = childDragging
              ? dragColor
              : childSelected
                ? selColor
                : baseStroke;
            const cWidth = childDragging || childSelected ? 2.5 : baseWidth;
            const cDash = getDasharray(getLineStyleKey(bio));

            // 子女線段上端 x:雙胞胎用 group anchor(共享 fork);單個小孩 = 自己
            const anchorX =
              childAnchorX.get(c.child.id) ?? c.child.position.x;
            const segStartX =
              childDragging && childDragEntry.end === 'from' && handleDrag
                ? handleDrag.currentX
                : anchorX;
            const segStartY =
              childDragging && childDragEntry.end === 'from' && handleDrag
                ? handleDrag.currentY
                : trunkY;
            const segEndX =
              childDragging && childDragEntry.end === 'to' && handleDrag
                ? handleDrag.currentX
                : c.child.position.x;
            const segEndY =
              childDragging && childDragEntry.end === 'to' && handleDrag
                ? handleDrag.currentY
                : c.child.position.y + topEdgeY(c.child.shape);

            return (
              <g key={c.child.id}>
                <line
                  x1={segStartX}
                  y1={segStartY}
                  x2={segEndX}
                  y2={segEndY}
                  stroke={cColor}
                  strokeWidth={cWidth}
                  strokeDasharray={cDash}
                />
                <line
                  x1={segStartX}
                  y1={segStartY}
                  x2={segEndX}
                  y2={segEndY}
                  stroke="transparent"
                  strokeWidth={18}
                  onPointerDown={(e) => onLinePointerDown(e, bio.id)}
                  onDoubleClick={(e) => onLineDoubleClick(e, bio.id)}
                  style={{ cursor: childDragging ? 'grabbing' : 'grab' }}
                />
                {bio.note && !childDragging && (() => {
                  const noteX = c.child.position.x + 10;
                  const noteY =
                    (trunkY + c.child.position.y + topEdgeY(c.child.shape)) / 2;
                  const lines = bio.note.split('\n').slice(0, 10).map((l) =>
                    l.length > 20 ? l.slice(0, 19) + '…' : l,
                  );
                  return (
                    <text
                      x={noteX}
                      y={noteY}
                      textAnchor="start"
                      dominantBaseline="middle"
                      fontSize={11}
                      fill="#6e6e73"
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                      {lines.map((l, i) => (
                        <tspan key={i} x={noteX} dy={i === 0 ? 0 : 14}>
                          {l || ' '}
                        </tspan>
                      ))}
                    </text>
                  );
                })()}
              </g>
            );
          })}
          {/* 同卵雙胞胎:在 twin 之間頂邊上方加一條橫線 */}
          {(() => {
            const groupsRendered = new Set<string>();
            return sortedChildren
              .filter((c) => {
                const gid = c.child.twinGroupId;
                if (!gid || c.child.twinType !== 'identical') return false;
                if (groupsRendered.has(gid)) return false;
                groupsRendered.add(gid);
                return true;
              })
              .map((c) => {
                const gid = c.child.twinGroupId!;
                const grp = sortedChildren.filter(
                  (cb) => cb.child.twinGroupId === gid,
                );
                if (grp.length < 2) return null;
                const xs = grp.map((cb) => cb.child.position.x);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const childTopYs = grp.map(
                  (cb) =>
                    cb.child.position.y + topEdgeY(cb.child.shape),
                );
                const avgTopY =
                  childTopYs.reduce((s, y) => s + y, 0) /
                  childTopYs.length;
                const barY = (trunkY + avgTopY) / 2;
                return (
                  <line
                    key={`zyg-${gid}`}
                    x1={minX}
                    y1={barY}
                    x2={maxX}
                    y2={barY}
                    stroke={baseStroke}
                    strokeWidth={baseWidth}
                  />
                );
              });
          })()}
        </>
      )}

      {/* 婚姻線選中時:中點向下箭頭(短按=加 1 子女 / 長按 1.5s=多胞胎) */}
      {marriageSelected && !marriageDragging && (
        <g
          transform={`translate(${midX}, ${midY + (hasChildren ? 0 : 24)})`}
          onPointerDown={(e) => {
            e.stopPropagation();
            const pointerId = e.pointerId;
            const startX = e.clientX;
            const startY = e.clientY;
            let triggered = false;
            let cancelled = false;
            const cleanup = () => {
              document.removeEventListener('pointerup', onUp);
              document.removeEventListener('pointermove', onMove);
            };
            const timer = window.setTimeout(() => {
              if (cancelled) return;
              triggered = true;
              cleanup();
              onMarriageDownArrowLongPress?.();
            }, 1000);
            const onMove = (ev: PointerEvent) => {
              if (ev.pointerId !== pointerId) return;
              // 移動超過 10px → 視為拖曳/誤觸,取消整個操作
              if (
                Math.abs(ev.clientX - startX) > 10 ||
                Math.abs(ev.clientY - startY) > 10
              ) {
                cancelled = true;
                window.clearTimeout(timer);
                cleanup();
              }
            };
            const onUp = (ev: PointerEvent) => {
              if (ev.pointerId !== pointerId) return;
              window.clearTimeout(timer);
              cleanup();
              if (!triggered && !cancelled) onMarriageDownArrow();
            };
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointermove', onMove);
          }}
          style={{ cursor: 'pointer' }}
        >
          <title>{t('marriage.shortLong')}</title>
          <circle r={14} fill="#ffffff" fillOpacity={0.9} stroke={selColor} strokeWidth={1.5} />
          <polygon points="0,6 6,-2 -6,-2" fill={selColor} />
        </g>
      )}

      {/* × 刪除按鈕(婚姻線選中時放右上方,避免跟下箭頭衝突) */}
      {marriageSelected && !marriageDragging && onDeleteLine && (
        <g
          transform={`translate(${lineEnd.x + 18}, ${lineEnd.y - 18})`}
          style={{ cursor: 'pointer' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onDeleteLine(m.id);
          }}
        >
          <title>{t('marriage.deleteLine')}</title>
          <circle r={9} fill="#ff3b30" stroke="#ffffff" strokeWidth={1.5} />
          <line x1={-4} y1={-4} x2={4} y2={4} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
          <line x1={4} y1={-4} x2={-4} y2={4} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}
