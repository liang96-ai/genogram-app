import { useState } from 'react';
import type {
  BasicShape,
  Line as LineType,
  LineSubType,
  Person,
} from '../../types/genogram';
import {
  getLineStyleKey,
  getDasharray,
  useGenogramStore,
} from '../../store/genogramStore';
import { useT } from '../../i18n';
import DeleteButton from './DeleteButton';

// 哪些 RelationSubType 用「自訂幾何」渲染(取代預設 stroke/dasharray)
const RELATION_GEOMETRY_TYPES = new Set<LineSubType>([
  'connected', // 雙線
  'close', // 三線
  'fused', // 四線
  'spiritual', // 波浪
  'focus-on', // 單線+箭頭
  'hostile', // 鋸齒
  'close-hostile', // 雙線+鋸齒
  'negative-focus', // 鋸齒+箭頭
  'physical-abuse', // 粗鋸齒+箭頭
  'emotional-abuse', // 細鋸齒+箭頭
  'sexual-abuse', // 超粗鋸齒+箭頭
  'caregiver', // 雙向箭頭
  'cutoff', // 中央雙短橫
  'cutoff-repaired', // 中央小圓
]);

// ===== Shape edge clipping(讓線停在形狀邊緣,而非穿過中心)=====
// 跟 PersonShape.tsx 同步
const SHAPE_HALF = 28;
const DIAMOND_HALF = 48 / Math.SQRT2; // ≈ 33.94
const INST_HALF_W = 90;
const INST_HALF_H = 19.6;
const PET_HALF = 16.8;

function getActualShape(p: Person): BasicShape {
  const v = p.genderVariant;
  if (v === 'mtf') return 'circle';
  if (v === 'ftm' || v === 'gay') return 'square';
  if (v === 'lesbian') return 'circle';
  return p.shape;
}

/** 從 person 中心,沿單位向量 (ux,uy) 方向,計算到 shape 邊界的距離 */
function edgeOffset(shape: BasicShape, ux: number, uy: number): number {
  const cosA = Math.abs(ux);
  const sinA = Math.abs(uy);
  const eps = 0.001;
  switch (shape) {
    case 'square':
      return SHAPE_HALF / Math.max(cosA, sinA, eps);
    case 'circle':
    case 'triangle':
      return SHAPE_HALF;
    case 'diamond':
      return DIAMOND_HALF / Math.max(cosA + sinA, eps);
    case 'pet':
      return PET_HALF / Math.max(cosA + sinA, eps);
    case 'institution':
      return Math.min(
        INST_HALF_W / Math.max(cosA, eps),
        INST_HALF_H / Math.max(sinA, eps),
      );
    default:
      return SHAPE_HALF;
  }
}

/** 波浪 path — 用 Q + T 命令做平滑正弦波 */
function wavyPath(
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

// 鋸齒 path:從 (x1,y1) 到 (x2,y2),指定振幅 amp 跟波長 wavelen
function zigzagPath(
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
    const px = cx + nx * offset;
    const py = cy + ny * offset;
    path += ` L ${px} ${py}`;
  }
  path += ` L ${x2} ${y2}`;
  return path;
}

type HandleOverride = { end: 'from' | 'to'; x: number; y: number };

type Props = {
  line: LineType;
  from: Person;
  to: Person;
  selected: boolean;
  dragging: boolean;
  handleOverride?: HandleOverride;
  onLinePointerDown: (e: React.PointerEvent) => void;
  onLineDoubleClick: (e: React.MouseEvent) => void;
  onDelete?: () => void;
  /** 「弧形繞過」模式 — 同一對人物之間已有 member 線(婚姻/親子),
   *  關係線要避開壓在上面,改用弧形 quadratic bezier 繞過去
   *  'up' = 往上凸(水平 member 用)  'right' = 往右凸(垂直 member 用) */
  arcDetour?: 'up' | 'right' | null;
};

export default function Line({
  line,
  from,
  to,
  selected,
  dragging,
  handleOverride,
  onLinePointerDown,
  onLineDoubleClick,
  onDelete,
  arcDetour,
}: Props) {
  const t = useT();
  const updateLine = useGenogramStore((s) => s.updateLine);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  // 保密:整條線在畫布上即時消失(跟 Tab1 欄位保密一致的當下回饋)
  // — 不 gate by privacyEnabled,使用者直接從 Tab2「全選保密」勾就生效
  // — 匯出 PNG/JPG 時也是消失(既有 imageExport simplifyLines 邏輯)
  //   必須放在所有 hook 之後才能 early return(React rules of hooks)
  if (line.private) return null;
  const enterEditNote = () => {
    setNoteDraft(line.note ?? '');
    setEditingNote(true);
  };
  const commitNote = () => {
    const trimmed = noteDraft.trim();
    updateLine(line.id, { note: trimmed || undefined });
    setEditingNote(false);
  };
  const cancelNote = () => {
    setEditingNote(false);
    setNoteDraft(line.note ?? '');
  };
  // ===== Shape edge clipping(關係線停在形狀邊緣,而非穿過中心) =====
  // 用兩端 center 之間的方向計算邊距,即使一端被 override 也用 center 方向估
  const sxC = from.position.x;
  const syC = from.position.y;
  const exC = to.position.x;
  const eyC = to.position.y;
  const dxC = exC - sxC;
  const dyC = eyC - syC;
  const lenC = Math.hypot(dxC, dyC) || 1;
  const uxC = dxC / lenC;
  const uyC = dyC / lenC;
  const fromShape = getActualShape(from);
  const toShape = getActualShape(to);
  const fromOfs = edgeOffset(fromShape, uxC, uyC);
  const toOfs = edgeOffset(toShape, -uxC, -uyC);

  // 兩 center 距離太近就不裁切(避免端點交錯)
  const canClip = lenC > fromOfs + toOfs + 4;
  const sxClipped = canClip ? sxC + uxC * fromOfs : sxC;
  const syClipped = canClip ? syC + uyC * fromOfs : syC;
  const exClipped = canClip ? exC - uxC * toOfs : exC;
  const eyClipped = canClip ? eyC - uyC * toOfs : eyC;

  const startX =
    handleOverride?.end === 'from' ? handleOverride.x : sxClipped;
  const startY =
    handleOverride?.end === 'from' ? handleOverride.y : syClipped;
  const endX = handleOverride?.end === 'to' ? handleOverride.x : exClipped;
  const endY = handleOverride?.end === 'to' ? handleOverride.y : eyClipped;

  // 關係線(#62-76)整體用藍色;member 線(婚姻/親子)用黑灰
  const isRelation = line.category === 'relation';
  const stroke = dragging
    ? '#ff9500'
    : selected
      ? '#007aff'
      : isRelation
        ? '#007aff'
        : '#6e6e73';
  const strokeWidth = dragging ? 2.5 : selected ? 2.5 : 1.5;
  const dash = getDasharray(getLineStyleKey(line));

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // 是否走「自訂幾何」渲染(關係線特殊樣式)
  const useGeometry = RELATION_GEOMETRY_TYPES.has(line.subType);
  // 線段方向單位向量 + 法向量(供雙線/三線/箭頭/中央符號用)
  const dxv = endX - startX;
  const dyv = endY - startY;
  const segLen = Math.hypot(dxv, dyv) || 1;
  const ux = dxv / segLen;
  const uy = dyv / segLen;
  const nx = -uy;
  const ny = ux;
  // 箭頭固定大小 — 像「上下左右」directional pad 那種明顯等邊三角,不再隨線粗細變動
  // 唯一例外:超粗鋸齒(sexual-abuse)略大一些,讓視覺重量平衡
  const arrowLen =
    line.subType === 'sexual-abuse' ? 18 : line.subType === 'physical-abuse' ? 16 : 14;
  const arrowWid =
    line.subType === 'sexual-abuse' ? 16 : line.subType === 'physical-abuse' ? 14 : 12;
  // 終點箭頭(focus-on / abuse 系列 / negative-focus / caregiver)
  const needArrowEnd =
    line.subType === 'focus-on' ||
    line.subType === 'caregiver' ||
    line.subType === 'negative-focus' ||
    line.subType === 'physical-abuse' ||
    line.subType === 'emotional-abuse' ||
    line.subType === 'sexual-abuse';
  // 起點箭頭(只有 caregiver 是雙向)
  const needArrowStart = line.subType === 'caregiver';

  // 線條實際終止點 — 端點留 arrowLen 給箭頭,讓尾巴不會從箭頭周圍露出
  // arrowGap=1 微重疊,避免接縫處有空白
  const arrowGap = 1;
  const lineEndX = needArrowEnd ? endX - ux * (arrowLen - arrowGap) : endX;
  const lineEndY = needArrowEnd ? endY - uy * (arrowLen - arrowGap) : endY;
  const lineStartX = needArrowStart ? startX + ux * (arrowLen - arrowGap) : startX;
  const lineStartY = needArrowStart ? startY + uy * (arrowLen - arrowGap) : startY;

  // ===== Arc detour 計算 =====
  // 當同一對人物之間有 member 線(婚姻/親子),關係線改用弧形繞過
  // v1 簡化:只繪單一 bezier(忽略多線/鋸齒/波浪細節),保留終點箭頭
  const ARC_AMOUNT = 40;
  const arcEnabled = !!arcDetour;
  const arcMidX = (startX + endX) / 2;
  const arcMidY = (startY + endY) / 2;
  const arcCtrlX =
    arcDetour === 'right' ? arcMidX + ARC_AMOUNT : arcMidX;
  const arcCtrlY =
    arcDetour === 'up' ? arcMidY - ARC_AMOUNT : arcMidY;
  // bezier 在 t=1 的切線方向(P2-P1),給弧形終點箭頭轉向用
  const arcEndTangentX = endX - arcCtrlX;
  const arcEndTangentY = endY - arcCtrlY;
  const arcEndTangentLen =
    Math.hypot(arcEndTangentX, arcEndTangentY) || 1;
  const arcEndUx = arcEndTangentX / arcEndTangentLen;
  const arcEndUy = arcEndTangentY / arcEndTangentLen;
  // arc 模式下,終點箭頭朝弧線結尾的切線方向
  const arcLineEndX = needArrowEnd
    ? endX - arcEndUx * (arrowLen - arrowGap)
    : endX;
  const arcLineEndY = needArrowEnd
    ? endY - arcEndUy * (arrowLen - arrowGap)
    : endY;
  const arcPath = `M ${startX} ${startY} Q ${arcCtrlX} ${arcCtrlY} ${arcLineEndX} ${arcLineEndY}`;

  return (
    <g data-line-id={line.id}>
      {arcEnabled && (
        // 弧形繞過模式:單一 bezier 取代所有 line / 多線 / 幾何
        <path
          d={arcPath}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
          fill="none"
        />
      )}
      {!arcEnabled && !useGeometry && (
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
        />
      )}
      {!arcEnabled && useGeometry &&
        (() => {
          // #62 連結(connected)— 雙線
          if (line.subType === 'connected') {
            const off = 3;
            return (
              <>
                <line x1={startX + nx * off} y1={startY + ny * off} x2={endX + nx * off} y2={endY + ny * off} stroke={stroke} strokeWidth={strokeWidth} />
                <line x1={startX - nx * off} y1={startY - ny * off} x2={endX - nx * off} y2={endY - ny * off} stroke={stroke} strokeWidth={strokeWidth} />
              </>
            );
          }
          // #63 親密(close)— 三線
          if (line.subType === 'close') {
            const off = 5;
            return (
              <>
                <line x1={startX} y1={startY} x2={endX} y2={endY} stroke={stroke} strokeWidth={strokeWidth} />
                <line x1={startX + nx * off} y1={startY + ny * off} x2={endX + nx * off} y2={endY + ny * off} stroke={stroke} strokeWidth={strokeWidth} />
                <line x1={startX - nx * off} y1={startY - ny * off} x2={endX - nx * off} y2={endY - ny * off} stroke={stroke} strokeWidth={strokeWidth} />
              </>
            );
          }
          // #64 過度緊密(fused)— 四線
          if (line.subType === 'fused') {
            const o1 = 2;
            const o2 = 6;
            return (
              <>
                <line x1={startX + nx * o2} y1={startY + ny * o2} x2={endX + nx * o2} y2={endY + ny * o2} stroke={stroke} strokeWidth={strokeWidth} />
                <line x1={startX + nx * o1} y1={startY + ny * o1} x2={endX + nx * o1} y2={endY + ny * o1} stroke={stroke} strokeWidth={strokeWidth} />
                <line x1={startX - nx * o1} y1={startY - ny * o1} x2={endX - nx * o1} y2={endY - ny * o1} stroke={stroke} strokeWidth={strokeWidth} />
                <line x1={startX - nx * o2} y1={startY - ny * o2} x2={endX - nx * o2} y2={endY - ny * o2} stroke={stroke} strokeWidth={strokeWidth} />
              </>
            );
          }
          // #65 靈性連結(spiritual)— 波浪
          if (line.subType === 'spiritual') {
            const waves = Math.max(3, Math.floor(segLen / 18));
            return (
              <path
                d={wavyPath(startX, startY, endX, endY, 5, waves)}
                stroke={stroke}
                strokeWidth={strokeWidth}
                fill="none"
              />
            );
          }
          // #69 親密-敵意(close-hostile)— 雙線 + 中央鋸齒,無箭頭
          if (line.subType === 'close-hostile') {
            const off = 5;
            return (
              <>
                <line x1={startX + nx * off} y1={startY + ny * off} x2={endX + nx * off} y2={endY + ny * off} stroke={stroke} strokeWidth={strokeWidth} />
                <line x1={startX - nx * off} y1={startY - ny * off} x2={endX - nx * off} y2={endY - ny * off} stroke={stroke} strokeWidth={strokeWidth} />
                <path d={zigzagPath(startX, startY, endX, endY, 3, 8)} stroke={stroke} strokeWidth={1.2} fill="none" strokeLinejoin="miter" />
              </>
            );
          }
          // 鋸齒系列(hostile / negative-focus / physical-abuse / emotional-abuse / sexual-abuse)
          // 振幅/波長一致,粗細不同;有箭頭的尾端用 lineEndX/Y(縮短留給箭頭)
          if (
            line.subType === 'hostile' ||
            line.subType === 'negative-focus' ||
            line.subType === 'physical-abuse' ||
            line.subType === 'emotional-abuse' ||
            line.subType === 'sexual-abuse'
          ) {
            const zigW =
              line.subType === 'emotional-abuse' ? 1
                : line.subType === 'physical-abuse' ? 3
                  : line.subType === 'sexual-abuse' ? 4
                    : strokeWidth; // hostile / negative-focus 用預設
            return (
              <path
                d={zigzagPath(startX, startY, lineEndX, lineEndY, 5, 10)}
                stroke={stroke}
                strokeWidth={zigW}
                fill="none"
                strokeLinejoin="miter"
              />
            );
          }
          // 其餘(cutoff / cutoff-repaired / focus-on / caregiver):直線 + 中央/端點符號
          // 用 lineStartX/Y → lineEndX/Y,有箭頭那端會自動縮短
          return (
            <line
              x1={lineStartX}
              y1={lineStartY}
              x2={lineEndX}
              y2={lineEndY}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          );
        })()}
      {/* 中央符號:cutoff(雙短橫)/ cutoff-repaired(菱形) */}
      {useGeometry && line.subType === 'cutoff' && (
        <g>
          {[-3, 3].map((off) => (
            <line
              key={off}
              x1={midX + ux * off + nx * 6}
              y1={midY + uy * off + ny * 6}
              x2={midX + ux * off - nx * 6}
              y2={midY + uy * off - ny * 6}
              stroke={stroke}
              strokeWidth={2}
            />
          ))}
        </g>
      )}
      {useGeometry && line.subType === 'cutoff-repaired' && (
        <circle
          cx={midX}
          cy={midY}
          r={5}
          fill="#fff"
          stroke={stroke}
          strokeWidth={1.6}
        />
      )}
      {/* 終點箭頭 — 全黑填滿,在藍色關係線上明顯 */}
      {!arcEnabled && useGeometry && needArrowEnd && (
        <polygon
          points={`${endX},${endY} ${endX - ux * arrowLen - nx * arrowWid * 0.5},${endY - uy * arrowLen - ny * arrowWid * 0.5} ${endX - ux * arrowLen + nx * arrowWid * 0.5},${endY - uy * arrowLen + ny * arrowWid * 0.5}`}
          fill="#1d1d1f"
        />
      )}
      {/* 起點箭頭(只有 caregiver — 雙向)*/}
      {!arcEnabled && useGeometry && needArrowStart && (
        <polygon
          points={`${startX},${startY} ${startX + ux * arrowLen - nx * arrowWid * 0.5},${startY + uy * arrowLen - ny * arrowWid * 0.5} ${startX + ux * arrowLen + nx * arrowWid * 0.5},${startY + uy * arrowLen + ny * arrowWid * 0.5}`}
          fill="#1d1d1f"
        />
      )}
      {/* Arc 模式終點箭頭(用切線方向定向) */}
      {arcEnabled && needArrowEnd && (() => {
        const aNx = -arcEndUy;
        const aNy = arcEndUx;
        return (
          <polygon
            points={`${endX},${endY} ${endX - arcEndUx * arrowLen - aNx * arrowWid * 0.5},${endY - arcEndUy * arrowLen - aNy * arrowWid * 0.5} ${endX - arcEndUx * arrowLen + aNx * arrowWid * 0.5},${endY - arcEndUy * arrowLen + aNy * arrowWid * 0.5}`}
            fill="#1d1d1f"
          />
        );
      })()}
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke="transparent"
        strokeWidth={18}
        onPointerDown={onLinePointerDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          // 點兩下進入編輯備注 — 原本的「循環切換 subType」已停用
          enterEditNote();
          // 仍呼叫 prop callback,讓父層可選擇做其他事(目前 Canvas 不做)
          onLineDoubleClick(e);
        }}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      />
      {/* 編輯備注模式 — 輸入框浮在線中央上方 */}
      {editingNote && !dragging && (
        <foreignObject
          x={midX - 80}
          y={midY - 26}
          width={160}
          height={26}
        >
          <input
            type="text"
            value={noteDraft}
            autoFocus
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={commitNote}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') commitNote();
              if (e.key === 'Escape') cancelNote();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder={t('lineProps.notePlaceholder')}
            style={{
              width: '100%',
              padding: '2px 6px',
              fontSize: 12,
              border: '1px solid #007aff',
              borderRadius: 4,
              fontFamily: 'inherit',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          />
        </foreignObject>
      )}
      {/* 非編輯模式 — 顯示 line.note 文字
          所有行都往上排,最後一行離線 18px(不貼線);多行往上累加 */}
      {!editingNote && line.note && !dragging && (() => {
        const lines = line.note.split('\n').slice(0, 10).map((l) =>
          l.length > 20 ? l.slice(0, 19) + '…' : l,
        );
        if (lines.length === 0) return null;
        const lineHeight = 14;
        const gapAboveLine = 18;
        const startY = midY - gapAboveLine - (lines.length - 1) * lineHeight;
        return (
          <text
            x={midX}
            y={startY}
            textAnchor="middle"
            fontSize={11}
            fill="#6e6e73"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {lines.map((l, i) => (
              <tspan key={i} x={midX} dy={i === 0 ? 0 : lineHeight}>
                {l || ' '}
              </tspan>
            ))}
          </text>
        );
      })()}

      {/* × 刪除按鈕(線選中時浮在線中央偏上) */}
      {selected && onDelete && !dragging && (
        <DeleteButton
          cx={midX + 18}
          cy={midY - 18}
          onClick={onDelete}
          title="刪除此線"
        />
      )}
    </g>
  );
}
