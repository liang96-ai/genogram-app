import { useT } from '../../i18n';

/**
 * SVG 內共用的小紅 × 刪除按鈕
 * 選中物件時浮現,點下去直接刪(不跳確認 — 如要確認用 Delete 鍵走全域 handler)
 */
type Props = {
  cx: number;
  cy: number;
  onClick: () => void;
  title?: string;
};

export default function DeleteButton({ cx, cy, onClick, title }: Props) {
  const t = useT();
  const finalTitle = title ?? t('common.delete');
  return (
    <g
      transform={`translate(${cx}, ${cy})`}
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <title>{finalTitle}</title>
      <circle r={9} fill="#ff3b30" stroke="#ffffff" strokeWidth={1.5} />
      <line x1={-4} y1={-4} x2={4} y2={4} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
      <line x1={4} y1={-4} x2={-4} y2={4} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}
