import { useEffect, useRef, useState } from 'react';

/**
 * 全域懸浮提示:監聽任何 `data-tooltip="..."` 的元素,
 * 滑鼠停留 0.5 秒後浮出黑色小框,移開即隱藏。
 * 只要在元素上加 `data-tooltip="文字"` 就會生效,不需 wrapper。
 */

const DELAY_MS = 500;

export default function HoverTooltip() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<number | null>(null);
  const lastElementRef = useRef<Element | null>(null);

  useEffect(() => {
    const findTooltipEl = (el: Element | null): Element | null => {
      let cur: Element | null = el;
      while (cur) {
        if (cur instanceof Element && cur.hasAttribute?.('data-tooltip')) {
          return cur;
        }
        cur = cur.parentElement;
      }
      return null;
    };

    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const tipEl = findTooltipEl(target);

      if (!tipEl) {
        // 離開有 tooltip 的元素
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        if (visible) setVisible(false);
        lastElementRef.current = null;
        return;
      }

      // 同一個元素 → 只更新位置
      if (tipEl === lastElementRef.current) {
        setPos({ x: e.clientX + 14, y: e.clientY + 18 });
        return;
      }

      // 切到新元素 → 重設計時器
      lastElementRef.current = tipEl;
      const newText = tipEl.getAttribute('data-tooltip') ?? '';
      setText(newText);
      setPos({ x: e.clientX + 14, y: e.clientY + 18 });
      setVisible(false);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setVisible(true);
      }, DELAY_MS);
    };

    const onLeave = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      lastElementRef.current = null;
      setVisible(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!visible || !text) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        padding: '4px 8px',
        background: 'rgba(30,30,34,0.95)',
        color: '#ffffff',
        fontSize: 12,
        lineHeight: 1.4,
        borderRadius: 4,
        whiteSpace: 'pre-wrap',
        maxWidth: 280,
        pointerEvents: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      {text}
    </div>
  );
}
