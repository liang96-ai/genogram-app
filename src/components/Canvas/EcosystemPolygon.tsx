import { useState } from 'react';
import type { Ecosystem } from '../../types/genogram';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';

type Props = {
  ecosystem: Ecosystem;
  onStartDrag: (e: React.PointerEvent, ecoId: string) => void;
  onVertexDown: (e: React.PointerEvent, ecoId: string, vertexIdx: number) => void;
  onEdgeDown: (e: React.PointerEvent, ecoId: string, edgeIdx: number) => void;
};

export default function EcosystemPolygon({
  ecosystem,
  onStartDrag,
  onVertexDown,
  onEdgeDown,
}: Props) {
  const t = useT();
  const removeEcosystem = useGenogramStore((s) => s.removeEcosystem);
  const updateEcosystem = useGenogramStore((s) => s.updateEcosystem);
  const selectEcosystem = useGenogramStore((s) => s.selectEcosystem);
  const setEditingEcosystem = useGenogramStore((s) => s.setEditingEcosystem);
  const selected = useGenogramStore(
    (s) => s.selectedEcosystemId === ecosystem.id,
  );
  const isEditing = useGenogramStore(
    (s) => s.editingEcosystemId === ecosystem.id,
  );
  const [editing, setEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(ecosystem.label ?? '');

  const pts = ecosystem.points;
  const svgPoints = pts.map((p) => `${p.x},${p.y}`).join(' ');

  // 標籤位置:頂邊中央(找最高點)
  const minY = Math.min(...pts.map((p) => p.y));
  const topPts = pts.filter((p) => p.y === minY);
  const labelX =
    topPts.reduce((s, p) => s + p.x, 0) / Math.max(1, topPts.length);
  const labelY = minY - 10;

  return (
    <g data-eco-id={ecosystem.id}>
      {/* 虛線外框 */}
      <polygon
        points={svgPoints}
        fill="rgba(0,122,255,0.04)"
        stroke={selected ? '#007aff' : '#007aff'}
        strokeWidth={selected ? 2.5 : 1.5}
        strokeDasharray="8 6"
        opacity={selected ? 0.9 : 0.55}
      />
      {/* hit area — 填透明,允許點擊選中 + 雙擊進編輯 */}
      <polygon
        points={svgPoints}
        fill="transparent"
        stroke="transparent"
        strokeWidth={10}
        style={{
          cursor: isEditing ? 'default' : 'grab',
          pointerEvents: 'visibleStroke',
        }}
        onPointerDown={(e) => {
          if (isEditing) return; // 編輯模式時不拖整圈
          e.stopPropagation();
          selectEcosystem(ecosystem.id);
          onStartDrag(e, ecosystem.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditingEcosystem(ecosystem.id);
        }}
      />

      {/* 編輯模式:邊推拉 + 頂點拖曳 */}
      {isEditing && (
        <>
          {/* 邊把手:每條邊的中點放一個粉色方塊 */}
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
                style={{
                  cursor: horizontal ? 'ns-resize' : 'ew-resize',
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onEdgeDown(e, ecosystem.id, i);
                }}
              />
            );
          })}
          {/* 頂點把手:每個 vertex 一個藍圓 */}
          {pts.map((p, i) => (
            <circle
              key={`vtx-${i}`}
              cx={p.x}
              cy={p.y}
              r={5.5}
              fill="#ffffff"
              stroke="#007aff"
              strokeWidth={1.6}
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onVertexDown(e, ecosystem.id, i);
              }}
            />
          ))}
        </>
      )}

      {/* 標籤 — 編輯中顯示輸入框;有 label 顯示 label;選中但無 label 顯示淡灰「命名」入口;否則不顯示 */}
      {editing ? (
        <foreignObject x={labelX - 70} y={labelY - 14} width={140} height={24}>
          <input
            type="text"
            value={labelDraft}
            autoFocus
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => {
              updateEcosystem(ecosystem.id, { label: labelDraft.trim() });
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') {
                updateEcosystem(ecosystem.id, { label: labelDraft.trim() });
                setEditing(false);
              }
              if (e.key === 'Escape') {
                setLabelDraft(ecosystem.label ?? '');
                setEditing(false);
              }
            }}
            style={{
              width: '100%',
              padding: '2px 6px',
              fontSize: 12,
              border: '1px solid #007aff',
              borderRadius: 4,
              textAlign: 'center',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </foreignObject>
      ) : ecosystem.label ? (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fontSize={12}
          fill="#007aff"
          fontWeight={500}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onDoubleClick={() => {
            setLabelDraft(ecosystem.label ?? '');
            setEditing(true);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {ecosystem.label}
        </text>
      ) : selected ? (
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

      {/* 選中時:標籤右邊 × 刪除按鈕 */}
      {selected && !editing && (
        <g
          transform={`translate(${labelX + 40}, ${labelY - 5})`}
          style={{ cursor: 'pointer' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            removeEcosystem(ecosystem.id);
          }}
        >
          <circle r={8} fill="#ff3b30" />
          <line x1={-4} y1={-4} x2={4} y2={4} stroke="#fff" strokeWidth={1.5} />
          <line x1={4} y1={-4} x2={-4} y2={4} stroke="#fff" strokeWidth={1.5} />
        </g>
      )}

    </g>
  );
}
