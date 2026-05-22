import { useState } from 'react';
import type {
  Ecosystem,
  Line as LineType,
  NetworkConnector,
  NetworkUnit,
  Person,
} from '../../types/genogram';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import DeleteButton from './DeleteButton';
import Line from './Line';

/**
 * 畫布上的網絡單位(長條形 + 頂部 ▲ 按鈕 + 使用者拉的 connectors)
 */

const UNIT_W = 180;
const UNIT_H = 40;
const UNIT_HALF_W = UNIT_W / 2;
const UNIT_HALF_H = UNIT_H / 2;
const TRI_SIZE = 11;

function fitText(
  name: string,
  unnamedLabel: string,
  maxWidth = UNIT_W - 20,
): { text: string; fontSize: number } {
  const n = name || unnamedLabel;
  if (n.length * 13 <= maxWidth) return { text: n, fontSize: 13 };
  if (n.length * 11 <= maxWidth) return { text: n, fontSize: 11 };
  if (n.length * 10 <= maxWidth) return { text: n, fontSize: 10 };
  const maxChars = Math.floor(maxWidth / 10) - 1;
  return { text: n.slice(0, Math.max(1, maxChars)) + '…', fontSize: 10 };
}

// 在線段 ab 上找離 source 最近的點(投影 + clamp 到端點)
function closestPointOnSegment(
  source: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: a.x, y: a.y };
  let t = ((source.x - a.x) * dx + (source.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

// 在閉合多邊形周邊找離 source 最近的點(走每條邊取最小距離)
function closestPointOnPolygon(
  source: { x: number; y: number },
  points: { x: number; y: number }[],
): { x: number; y: number } | null {
  if (points.length === 0) return null;
  if (points.length === 1) return { ...points[0] };
  let best: { x: number; y: number } | null = null;
  let bestDist2 = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const p = closestPointOnSegment(source, a, b);
    const d2 = (p.x - source.x) ** 2 + (p.y - source.y) ** 2;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      best = p;
    }
  }
  return best;
}

// 計算 connector 對應目標的錨點
// source(可選):連線起點 — ecosystem 用來找最近邊緣點;沒給則 fallback 到重心
export function getConnectorTargetPoint(
  conn: NetworkConnector,
  persons: Person[],
  units: NetworkUnit[],
  ecosystems: Ecosystem[],
  source?: { x: number; y: number },
): { x: number; y: number } | null {
  const t = conn.target;
  if (t.type === 'person') {
    const p = persons.find((x) => x.id === t.id);
    return p ? { x: p.position.x, y: p.position.y } : null;
  }
  if (t.type === 'unit') {
    const u = units.find((x) => x.id === t.id);
    return u ? { x: u.position.x, y: u.position.y } : null;
  }
  // ecosystem:貼著外框 — 找多邊形周邊上離 source 最近的點
  const eco = ecosystems.find((x) => x.id === t.id);
  if (!eco || eco.points.length === 0) return null;
  if (source) {
    return closestPointOnPolygon(source, eco.points);
  }
  // 沒給 source(向後相容)→ 用重心
  const cx = eco.points.reduce((s, p) => s + p.x, 0) / eco.points.length;
  const cy = eco.points.reduce((s, p) => s + p.y, 0) / eco.points.length;
  return { x: cx, y: cy };
}

type Props = {
  unit: NetworkUnit;
  persons: Person[];
  units: NetworkUnit[];
  ecosystems: Ecosystem[];
  selected: boolean;
  colliding?: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onTriangleDown: (e: React.PointerEvent, unitId: string) => void;
  onConnectorDown: (
    e: React.PointerEvent,
    unitId: string,
    connectorId: string,
  ) => void;
  onDelete?: () => void;
  /** 哪個 connector 被選中(全 canvas 同時最多一個) */
  selectedConnectorId?: string | null;
  /** 刪除某 connector(× 按鈕) */
  onConnectorDelete?: (connectorId: string) => void;
  /** 拖曳中的 connector 預覽(線頭跟著游標) */
  draggingConnector?: {
    unitId: string;
    connectorId: string | null; // null = 正在新建
    x: number;
    y: number;
  };
};

export default function NetworkUnitShape({
  unit,
  persons,
  units,
  ecosystems,
  selected,
  colliding,
  onPointerDown,
  onTriangleDown,
  onConnectorDown,
  onDelete,
  selectedConnectorId,
  onConnectorDelete,
  draggingConnector,
}: Props) {
  const t = useT();
  const updateNetworkUnit = useGenogramStore((s) => s.updateNetworkUnit);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');

  const { x, y } = unit.position;
  const stroke = selected ? '#007aff' : '#1d1d1f';
  const strokeWidth = selected ? 2.5 : 1.5;
  const instText = fitText(unit.name, t('unit.unnamed'));
  const tooltip =
    unit.name +
    (unit.note ? ' — ' + unit.note : '') +
    (colliding ? ' · ' + t('unit.overlap') : '');

  // 單位頂邊中央(▲ 與 connectors 起點)
  const topAnchorX = x;
  const topAnchorY = y - UNIT_HALF_H;

  const connectors = unit.connectors ?? [];

  return (
    <g data-unit-id={unit.id} style={{ cursor: 'grab' }}>
      {/* Connectors:從單位頂邊到目標 */}
      {connectors.map((conn) => {
        // 拖曳中的此 connector → 線頭改成游標
        const dragging =
          draggingConnector &&
          draggingConnector.unitId === unit.id &&
          draggingConnector.connectorId === conn.id;
        const target = dragging
          ? { x: draggingConnector.x, y: draggingConnector.y }
          : getConnectorTargetPoint(conn, persons, units, ecosystems, {
              x: topAnchorX,
              y: topAnchorY,
            });
        if (!target) return null;
        const isConnSelected = selectedConnectorId === conn.id;

        // 有 subType + target 是 person/unit → 用 Line 元件渲染(全 15 種視覺)
        // 拖曳中 fall back 到下方簡單線;其餘所有狀況都走完整 Line 元件
        // (subType 缺失也用 'focus-on' 預設,所以不再有「灰虛線」狀態)
        const canUseLineComponent =
          !dragging &&
          (conn.target.type === 'person' ||
            conn.target.type === 'unit' ||
            conn.target.type === 'ecosystem');
        if (canUseLineComponent) {
          // 合成 Person 物件給 Line 元件吃 — 用 unit 中心 + institution 形狀,讓 edge clipping 自然在邊界
          const synthFrom: Person = {
            id: '__synth_unit_' + unit.id,
            position: unit.position,
            shape: 'institution',
            basicInfo: { name: unit.name },
          };
          let synthTo: Person | null = null;
          if (conn.target.type === 'person') {
            synthTo = persons.find((p) => p.id === conn.target.id) ?? null;
          } else if (conn.target.type === 'unit') {
            const tu = units.find((u) => u.id === conn.target.id);
            if (tu) {
              synthTo = {
                id: '__synth_unit_' + tu.id,
                position: tu.position,
                shape: 'institution',
                basicInfo: { name: tu.name },
              };
            }
          } else if (conn.target.type === 'ecosystem') {
            // 把虛擬圓心往「線延伸方向」推 28px,讓 Line 元件 circle edge clip(也是 28)
            // 之後線剛好終止在 target(生態圖命中點)邊界上,不會內縮
            const dx = target.x - unit.position.x;
            const dy = target.y - unit.position.y;
            const len = Math.hypot(dx, dy) || 1;
            const CIRCLE_EDGE = 28; // rl-tuned: match SHAPE_HALF in Line.tsx (do not adjust)
            synthTo = {
              id: '__synth_eco_' + conn.id,
              position: {
                x: target.x + (CIRCLE_EDGE * dx) / len,
                y: target.y + (CIRCLE_EDGE * dy) / len,
              },
              shape: 'circle',
              basicInfo: { name: '' },
            };
          }
          if (synthTo) {
            const synthLine: LineType = {
              id: conn.id,
              fromPersonId: synthFrom.id,
              toPersonId: synthTo.id,
              category: 'relation',
              // legacy connectors 沒 subType 的視為 'focus-on'(全藍色,不再有灰虛線)
              subType: conn.subType ?? 'focus-on',
              visual: { lineStyle: 'solid' },
              note: conn.note,
            };
            return (
              <g key={conn.id}>
                <Line
                  line={synthLine}
                  from={synthFrom}
                  to={synthTo}
                  selected={isConnSelected}
                  dragging={false}
                  onLinePointerDown={(e) => {
                    e.stopPropagation();
                    onConnectorDown(e, unit.id, conn.id);
                  }}
                  onLineDoubleClick={(e) => e.stopPropagation()}
                  onDelete={
                    onConnectorDelete
                      ? () => onConnectorDelete(conn.id)
                      : undefined
                  }
                />
              </g>
            );
          }
        }

        // 套用 relation subType 視覺:
        //   有 subType → 藍色實線(整套關係線顏色),預設箭頭朝向 target
        //   無 subType → 灰虛線(legacy)
        const hasSubType = !!conn.subType;
        // 暴力 / 負面類:紅色突顯(同 Line.tsx 慣例)
        const isViolent =
          conn.subType === 'physical-abuse' ||
          conn.subType === 'emotional-abuse' ||
          conn.subType === 'sexual-abuse';
        // 顯示方向箭頭的 subType
        const showArrow =
          conn.subType === 'focus-on' ||
          conn.subType === 'negative-focus' ||
          isViolent ||
          conn.subType === 'caregiver';
        const baseColor = hasSubType
          ? isViolent
            ? '#ff3b30'
            : '#007aff'
          : '#8e8e93';
        const lineStroke = dragging
          ? '#ff9500'
          : isConnSelected
            ? '#007aff'
            : baseColor;
        const lineWidth = dragging ? 2 : isConnSelected ? 2.5 : 1.6;
        // 點線(distant)、虛線(其他保留為灰虛)
        // distant 拉開間距,避免肉眼看像實線
        const dashPattern = !hasSubType
          ? '4 3'
          : conn.subType === 'distant'
            ? '2 7'
            : undefined;
        const midX = (topAnchorX + target.x) / 2;
        const midY = (topAnchorY + target.y) / 2;
        // 箭頭基本方向(從 topAnchor 指向 target)
        const dx = target.x - topAnchorX;
        const dy = target.y - topAnchorY;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        // 中央符號 — cutoff(#75 雙短橫)/ cutoff-repaired(#76 小圓)
        // 簡單 render path(ecosystem 目標 / dragging)時也要畫,不然套 Tab2 看不出來
        const segDx = target.x - topAnchorX;
        const segDy = target.y - topAnchorY;
        const segLen = Math.hypot(segDx, segDy) || 1;
        const uxN = segDx / segLen;
        const uyN = segDy / segLen;
        const nxN = -uyN;
        const nyN = uxN;
        const showCutoffMarks = conn.subType === 'cutoff' && !dragging;
        const showCutoffRepaired =
          conn.subType === 'cutoff-repaired' && !dragging;
        return (
          <g key={conn.id}>
            {/* 可見線 */}
            <line
              x1={topAnchorX}
              y1={topAnchorY}
              x2={target.x}
              y2={target.y}
              stroke={lineStroke}
              strokeWidth={lineWidth}
              strokeDasharray={dashPattern}
              style={{ pointerEvents: 'none' }}
            />
            {/* cutoff #75 — 中央雙短橫 (||) */}
            {showCutoffMarks &&
              [-3, 3].map((off) => (
                <line
                  key={off}
                  x1={midX + uxN * off + nxN * 6}
                  y1={midY + uyN * off + nyN * 6}
                  x2={midX + uxN * off - nxN * 6}
                  y2={midY + uyN * off - nyN * 6}
                  stroke={lineStroke}
                  strokeWidth={2}
                  style={{ pointerEvents: 'none' }}
                />
              ))}
            {/* cutoff-repaired #76 — 中央小圓 */}
            {showCutoffRepaired && (
              <circle
                cx={midX}
                cy={midY}
                r={5}
                fill="#ffffff"
                stroke={lineStroke}
                strokeWidth={1.6}
                style={{ pointerEvents: 'none' }}
              />
            )}
            {/* 箭頭(focus / abuse / caregiver 等) */}
            {showArrow && !dragging && (
              <polygon
                points="0,-5 0,5 8,0"
                transform={`translate(${target.x}, ${target.y}) rotate(${angle})`}
                fill={lineStroke}
                style={{ pointerEvents: 'none' }}
              />
            )}
            {/* 透明 hit area:點/拖中段(跟拖線頭等同事件) */}
            {!dragging && (
              <line
                x1={topAnchorX}
                y1={topAnchorY}
                x2={target.x}
                y2={target.y}
                stroke="transparent"
                strokeWidth={18}
                style={{ cursor: 'grab' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onConnectorDown(e, unit.id, conn.id);
                }}
              />
            )}
            {/* 線頭圓 — 拖曳柄 */}
            <circle
              cx={target.x}
              cy={target.y}
              r={6}
              fill="#ffffff"
              stroke={lineStroke}
              strokeWidth={1.5}
              style={{ cursor: dragging ? 'grabbing' : 'grab' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onConnectorDown(e, unit.id, conn.id);
              }}
            />
            {/* × 刪除按鈕(選中時浮在線中央偏上) */}
            {isConnSelected && onConnectorDelete && !dragging && (
              <DeleteButton
                cx={midX + 14}
                cy={midY - 14}
                onClick={() => onConnectorDelete(conn.id)}
                title={t('unit.deleteConnection')}
              />
            )}
          </g>
        );
      })}

      {/* 新建中的 connector(尚未確認附著)*/}
      {draggingConnector &&
        draggingConnector.unitId === unit.id &&
        draggingConnector.connectorId === null && (
          <g>
            <line
              x1={topAnchorX}
              y1={topAnchorY}
              x2={draggingConnector.x}
              y2={draggingConnector.y}
              stroke="#ff9500"
              strokeWidth={2}
              strokeDasharray="4 3"
              style={{ pointerEvents: 'none' }}
            />
            <circle
              cx={draggingConnector.x}
              cy={draggingConnector.y}
              r={6}
              fill="#ffffff"
              stroke="#ff9500"
              strokeWidth={1.5}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        )}

      {/* 長條形本體 */}
      <g
        transform={`translate(${x}, ${y})`}
        onPointerDown={renaming ? undefined : onPointerDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setDraftName(unit.name);
          setRenaming(true);
        }}
        data-tooltip={tooltip}
      >
        {colliding && (
          <rect
            x={-UNIT_HALF_W - 10}
            y={-UNIT_HALF_H - 10}
            width={UNIT_W + 20}
            height={UNIT_H + 20}
            rx={10}
            fill="none"
            stroke="#ff9500"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        )}
        <rect
          x={-UNIT_HALF_W}
          y={-UNIT_HALF_H}
          width={UNIT_W}
          height={UNIT_H}
          rx={6}
          fill="#ffffff"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        {renaming ? (
          <foreignObject
            x={-UNIT_HALF_W + 6}
            y={-12}
            width={UNIT_W - 12}
            height={24}
          >
            <input
              type="text"
              value={draftName}
              autoFocus
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={() => {
                const trimmed = draftName.trim();
                if (trimmed && trimmed !== unit.name) {
                  updateNetworkUnit(unit.id, { name: trimmed });
                }
                setRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter') {
                  const trimmed = draftName.trim();
                  if (trimmed && trimmed !== unit.name) {
                    updateNetworkUnit(unit.id, { name: trimmed });
                  }
                  setRenaming(false);
                }
                if (e.key === 'Escape') setRenaming(false);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '2px 6px',
                fontSize: 13,
                border: '1px solid #007aff',
                borderRadius: 4,
                fontFamily: 'inherit',
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            />
          </foreignObject>
        ) : (
          <text
            x={0}
            y={5}
            textAnchor="middle"
            fontSize={instText.fontSize}
            fontWeight={500}
            fill="#1d1d1f"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {instText.text}
          </text>
        )}
        {unit.note && (() => {
          const lines = unit.note.split('\n').slice(0, 10).map((l) =>
            l.length > 20 ? l.slice(0, 19) + '…' : l,
          );
          if (lines.length === 0) return null;
          return (
            <text
              x={0}
              y={UNIT_HALF_H + 14}
              textAnchor="middle"
              fontSize={11}
              fill="#6e6e73"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {lines.map((line, i) => (
                <tspan key={i} x={0} dy={i === 0 ? 0 : 14}>
                  {line || ' '}
                </tspan>
              ))}
            </text>
          );
        })()}
      </g>

      {/* ▲ 按鈕 — 選中時才出現,按下拖曳新增 connector */}
      {selected && (
        <g
          transform={`translate(${topAnchorX}, ${topAnchorY - 10})`}
          style={{ cursor: 'pointer' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onTriangleDown(e, unit.id);
          }}
        >
          <title>{t('unit.dragToConnect')}</title>
          {/* hit area */}
          <circle r={12} fill="transparent" />
          <polygon
            points={`0,${-TRI_SIZE} ${TRI_SIZE * 0.8},0 ${-TRI_SIZE * 0.8},0`}
            fill="#007aff"
            stroke="#007aff"
            strokeWidth={1}
          />
        </g>
      )}

      {/* × 刪除按鈕(選中時浮現於右上) */}
      {selected && onDelete && (
        <DeleteButton
          cx={x + UNIT_HALF_W + 8}
          cy={y - UNIT_HALF_H - 8}
          onClick={onDelete}
          title={t('unit.deleteUnit')}
        />
      )}
    </g>
  );
}
