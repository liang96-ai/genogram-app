// 置中的「＋」十字 — 用 SVG 2 條線畫,跟字體無關,任何尺寸都精準置中。
// 取代文字「+」(文字「+」字元在字體裡偏上,即使 flex 置中視覺上仍會歪)。
type Props = {
  /** 十字外框尺寸(px) */
  size?: number;
  /** 線粗 */
  stroke?: number;
  /** 顏色 */
  color?: string;
};

export function PlusGlyph({ size = 16, stroke = 2, color = '#ffffff' }: Props) {
  const c = size / 2;
  const lo = size * 0.2;
  const hi = size * 0.8;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <line x1={c} y1={lo} x2={c} y2={hi} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <line x1={lo} y1={c} x2={hi} y2={c} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}

// 置中的「×」叉叉 — 跟 PlusGlyph 同一套 SVG 邏輯(等於 + 轉 45°),用於刪除鈕。
export function CrossGlyph({ size = 16, stroke = 2, color = '#ffffff' }: Props) {
  const lo = size * 0.25;
  const hi = size * 0.75;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <line x1={lo} y1={lo} x2={hi} y2={hi} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <line x1={hi} y1={lo} x2={lo} y2={hi} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}
