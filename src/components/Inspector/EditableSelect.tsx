import { useId } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  /** 顯示在下拉中的選項(預設清單 + 使用者歷史合併;呼叫端負責去重) */
  options: string[];
  /** 失焦時若值不在 options 中,通知父元件加入歷史 */
  onAddToHistory?: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  fontSize: 13,
  border: '1px solid #d2d2d7',
  borderRadius: 4,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  background: '#ffffff',
};

/**
 * 可擴充的下拉輸入元件 — 用 HTML 原生 datalist。
 * 行為:
 *  - 點擊會跳出 options 下拉(瀏覽器原生)
 *  - 也可自由輸入(未列在 options 中)
 *  - 失焦時若值不在 options 中,呼叫 onAddToHistory(讓父端持久化)
 */
export default function EditableSelect({
  value,
  onChange,
  options,
  onAddToHistory,
  placeholder,
  style,
}: Props) {
  const listId = useId();
  return (
    <>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const t = value.trim();
          if (t && onAddToHistory && !options.includes(t)) {
            onAddToHistory(t);
          }
        }}
        placeholder={placeholder}
        style={{ ...inputStyle, ...style }}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
