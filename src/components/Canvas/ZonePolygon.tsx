// 「圈」的共用元件(1.5.0):生態圈與同住圈同一套手勢 ——
//   點邊線選取、拖整圈、雙擊進編輯(邊把手推拉 / 頂點拖曳)、雙擊標籤改名、選取後 × 刪除。
// 差別只在顏色、虛線樣式、標籤前綴,以及同住圈在「自動包住成員」時不能整圈拖。
import { useState } from 'react';
import { useT } from '../../i18n';

export type ZonePoint = { x: number; y: number };

export type ZonePolygonProps = {
  id: string;
  points: ZonePoint[];
  label?: string;
  labelPrefix?: string;
  color: string;
  fill: string;
  dash: string;
  selected: boolean;
  isEditing: boolean;
  /** 自動包住成員的同住圈不能整圈拖(拖了會脫離成員) */
  canDrag: boolean;
  dataAttr: string;
  removeTitle?: string;
  onSelect: () => void;
  onStartEdit: () => void;
  onStartDrag: (e: React.PointerEvent) => void;
  onVertexDown: (e: React.PointerEvent, vertexIdx: number) => void;
  onEdgeDown: (e: React.PointerEvent, edgeIdx: number) => void;
  onRemove: () => void;
  onRename: (label: string) => void;
};

export default function ZonePolygon(p: ZonePolygonProps) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(p.label ?? '');
  const pts = p.points;
  if (pts.length < 3) return null;
  const svgPoints = pts.map((q) => `${q.x},${q.y}`).join(' ');
  // 標籤位置:頂邊中央(找最高點)
  const minY = Math.min(...pts.map((q) => q.y));
  const topPts = pts.filter((q) => q.y === minY);
  const labelX = topPts.reduce((s, q) => s + q.x, 0) / Math.max(1, topPts.length);
  const labelY = minY - 10;
  const attrs = { [p.dataAttr]: p.id } as Record<string, string>;
  const commitLabel = () => {
    p.onRename(labelDraft.trim());
    setEditing(false);
  };
  return (
    <g {...attrs}>
      {/* 虛線外框:一律不吃事件(圈內的人物 / 背景照常可點) */}
      <polygon
        points={svgPoints}
        fill={p.fill}
        stroke={p.color}
        strokeWidth={p.selected ? 2.5 : 1.5}
        strokeDasharray={p.selected ? undefined : p.dash}
        strokeLinejoin="round"
        opacity={p.selected ? 0.95 : 0.6}
        style={{ pointerEvents: 'none' }}
      />
      {/* 命中框:只有邊線附近吃點擊,圈內維持穿透,不跟成員搶點擊 */}
      <polygon
        points={svgPoints}
        fill="transparent"
        stroke="transparent"
        strokeWidth={12}
        style={{
          cursor: p.isEditing ? 'default' : p.canDrag ? 'grab' : 'pointer',
          pointerEvents: 'visibleStroke',
        }}
        onPointerDown={(e) => {
          if (p.isEditing) return; // 編輯模式時不拖整圈
          e.stopPropagation();
          p.onSelect();
          if (p.canDrag) p.onStartDrag(e);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          p.onStartEdit();
        }}
      />
      {/* 編輯模式:邊推拉 + 頂點拖曳 */}
      {p.isEditing && (
        <>
          {pts.map((a, i) => {
            const b = pts[(i + 1) % pts.length];
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const horizontal = a.y === b.y;
            const vertical = a.x === b.x;
            if (!horizontal && !vertical) return null;
            return (
              <rect
                key={`edge-${i}`}
                x={mx - 6}
                y={my - 6}
                width={12}
                height={12}
                rx={2}
                fill="#ffffff"
                stroke="#ff2d55"
                strokeWidth={1.6}
                style={{ cursor: horizontal ? 'ns-resize' : 'ew-resize' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  p.onEdgeDown(e, i);
                }}
              />
            );
          })}
          {pts.map((q, i) => (
            <circle
              key={`vtx-${i}`}
              cx={q.x}
              cy={q.y}
              r={5.5}
              fill="#ffffff"
              stroke={p.color}
              strokeWidth={1.6}
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                p.onVertexDown(e, i);
              }}
            />
          ))}
        </>
      )}
      {/* 標籤:編輯中顯示輸入框;有 label 顯示 label;選中但無 label 顯示「點兩下命名」 */}
      {editing ? (
        <foreignObject x={labelX - 70} y={labelY - 14} width={140} height={24}>
          <input
            type="text"
            value={labelDraft}
            autoFocus
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') commitLabel();
              if (e.key === 'Escape') {
                setLabelDraft(p.label ?? '');
                setEditing(false);
              }
            }}
            style={{
              width: '100%',
              padding: '2px 6px',
              fontSize: 12,
              border: `1px solid ${p.color}`,
              borderRadius: 4,
              textAlign: 'center',
              outline: 'none',
            }}
          />
        </foreignObject>
      ) : p.label ? (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fontSize={11}
          fill={p.color}
          fontWeight={500}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onDoubleClick={() => {
            setLabelDraft(p.label ?? '');
            setEditing(true);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {p.labelPrefix ? `${p.labelPrefix} ${p.label}` : p.label}
        </text>
      ) : p.selected ? (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fontSize={11}
          fill="#c7c7cc"
          fontStyle="italic"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onDoubleClick={() => {
            setLabelDraft('');
            setEditing(true);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {t('eco.clickToName')}
        </text>
      ) : null}
      {/* 選中時:標籤右邊 × 刪除 */}
      {p.selected && !editing && (
        <g
          transform={`translate(${labelX + 40}, ${labelY - 5})`}
          style={{ cursor: 'pointer' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            p.onRemove();
          }}
        >
          {p.removeTitle && <title>{p.removeTitle}</title>}
          <circle r={8} fill="#ff3b30" />
          <line x1={-4} y1={-4} x2={4} y2={4} stroke="#fff" strokeWidth={1.5} />
          <line x1={4} y1={-4} x2={-4} y2={4} stroke="#fff" strokeWidth={1.5} />
        </g>
      )}
    </g>
  );
}
