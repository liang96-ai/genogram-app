// 介面圖示(1.6.0):一套自繪線條圖示,取代介面上的 emoji。
// 規則:24×24 格線、線寬 1.75、圓頭圓角、顏色跟著文字(currentColor)——跟畫布的線條同一種語言,
// 各平台長得一樣(emoji 在 Windows / Mac / iPad 各畫各的)。全部內嵌,不載入任何外部圖示庫。
// 要加新圖示:在 ICONS 加一個名字,用 24×24 的線條畫,不要填色。
import type { ReactNode } from 'react';

const ICONS = {
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  folder: <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5 12 13l8.5-6.5" />
    </>
  ),
  install: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7" />
      <path d="M8.5 12h7" />
    </>
  ),
  share: (
    <>
      <path d="M12 14V3" />
      <path d="M7.5 7.5 12 3l4.5 4.5" />
      <path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />
    </>
  ),
  import: (
    <>
      <path d="M12 3v10" />
      <path d="M7.5 8.5 12 13l4.5-4.5" />
      <path d="M4 14.5v4A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-4" />
    </>
  ),
  backup: (
    <>
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9" />
      <path d="M10 13h4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10.3 5.2 8 4.5 4 4.5v13c4 0 6.3.7 8 2 1.7-1.3 4-2 8-2v-13c-4 0-6.3.7-8 2z" />
      <path d="M12 6.5v13" />
    </>
  ),
  shapes: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" />
      <circle cx="17" cy="7" r="3.5" />
      <path d="M7 14 10.5 20.5h-7z" />
      <path d="m17 13.5 3.5 3.5-3.5 3.5-3.5-3.5z" />
    </>
  ),
  family: (
    <>
      <rect x="3" y="3.5" width="6" height="6" />
      <circle cx="18" cy="6.5" r="3" />
      <path d="M9 6.5h6" />
      <path d="M12 6.5v7" />
      <rect x="9" y="13.5" width="6" height="6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.6v.01" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9.5 7V4.5h5V7" />
      <path d="M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  redo: (
    <>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </>
  ),
  bolt: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />,
  exportFile: (
    <>
      <path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M12 17.5v-6" />
      <path d="m9.5 14 2.5-2.5 2.5 2.5" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
      <path d="M9 4.5V3.5h6v1" />
      <path d="m9 13 2 2 4-4" />
    </>
  ),
  bringTogether: (
    <>
      <path d="M3 12h6" />
      <path d="m6.5 9 2.5 3-2.5 3" />
      <path d="M21 12h-6" />
      <path d="m17.5 9-2.5 3 2.5 3" />
      <path d="M12 5v14" />
    </>
  ),
  tidy: (
    <>
      <path d="M12 3.5v4" />
      <path d="M5 7.5h14" />
      <path d="M5 7.5v3.5M12 7.5v3.5M19 7.5v3.5" />
      <rect x="3" y="11" width="4" height="4" />
      <rect x="10" y="11" width="4" height="4" />
      <rect x="17" y="11" width="4" height="4" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  warning: (
    <>
      <path d="M12 3.5 2.5 20h19z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.3v.01" />
    </>
  ),
  tip: (
    <>
      <path d="M9 17.5h6" />
      <path d="M10 21h4" />
      <path d="M8.2 14.2A6 6 0 1 1 15.8 14.2c-.8.6-1.3 1.6-1.3 2.6V17.5h-5v-.7c0-1-.5-2-1.3-2.6z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4" />
      <path d="M18 14.3c1.8.9 3 2.8 3 5.2" />
    </>
  ),
  text: (
    <>
      <path d="M4 6h16" />
      <path d="M4 10.5h16" />
      <path d="M4 15h10" />
      <path d="M4 19.5h7" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
      <path d="M4 3.5V8h4.5" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
      <path d="M20 20.5V16h-4.5" />
    </>
  ),
  bug: (
    <>
      <rect x="7.5" y="8" width="9" height="12" rx="4.5" />
      <path d="M12 8v12" />
      <path d="M9.5 8a2.5 2.5 0 0 1 5 0" />
      <path d="M3.5 13h4M16.5 13h4M4.5 8.5l3 1.5M19.5 8.5l-3 1.5M4.5 18l3-1.5M19.5 18l-3-1.5" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.7" />
      <path d="M12 17.3v.01" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" />
      <path d="M15.5 8.5V6A2 2 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  attach: <path d="M20 11.5 12.3 19.2a5 5 0 0 1-7.1-7.1l8-8a3.4 3.4 0 0 1 4.8 4.8l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3" />,
  link: (
    <>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" />
    </>
  ),
  arrows: (
    <>
      <rect x="8.5" y="8.5" width="7" height="7" />
      <path d="M12 2.5 14 5h-4z" />
      <path d="M12 21.5 10 19h4z" />
      <path d="M2.5 12 5 10v4z" />
      <path d="M21.5 12 19 14v-4z" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export default function Icon({
  name,
  size = 18,
  strokeWidth = 1.75,
  style,
  title,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
  /** 有 title 時唸得出來;沒有時是純裝飾(旁邊通常已有文字) */
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ flexShrink: 0, display: 'block', ...style }}
    >
      {ICONS[name]}
    </svg>
  );
}

/** App 的標誌(與 public/icon.svg 同一個圖形:一對夫妻與一個孩子) */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 192 192" aria-hidden style={{ flexShrink: 0, display: 'block' }}>
      <rect width="192" height="192" rx="40" fill="#007aff" />
      <g stroke="#ffffff" strokeWidth="9" fill="none" strokeLinecap="round">
        <line x1="80" y1="68" x2="112" y2="68" />
        <line x1="96" y1="68" x2="96" y2="124" />
        <rect x="44" y="50" width="36" height="36" />
        <circle cx="130" cy="68" r="18" />
        <rect x="78" y="124" width="36" height="36" />
      </g>
    </svg>
  );
}
