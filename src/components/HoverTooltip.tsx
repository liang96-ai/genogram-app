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
    // v1.1 — 同時支援 data-tooltip 跟 title attribute
    //   1. 優先讀 data-tooltip
    //   2. 退而求其次讀 title(同時抑制瀏覽器原生 tooltip,延遲也統一成 500ms)
    //   3. 離開時把 title 還原(維持 screen reader 可讀性)
    const findTooltipEl = (el: Element | null): Element | null => {
      let cur: Element | null = el;
      while (cur) {
        if (cur instanceof Element) {
          if (cur.hasAttribute?.('data-tooltip')) return cur;
          // title 也算 tooltip 候選(JSX <Section title="..."> 等自訂組件不會有 title attribute 在 DOM 上,
          // 所以只會掃到真正的 HTML 屬性 title="...")
          if (cur.hasAttribute?.('title')) return cur;
        }
        cur = cur.parentElement;
      }
      return null;
    };

    // 暫存 title 屬性的元素,避免瀏覽器原生提示插隊
    const stripTitle = (el: Element) => {
      const original = el.getAttribute('title');
      if (original !== null) {
        el.setAttribute('data-original-title', original);
        el.removeAttribute('title');
      }
    };
    const restoreTitle = (el: Element | null) => {
      if (!el) return;
      const orig = el.getAttribute('data-original-title');
      if (orig !== null) {
        el.setAttribute('title', orig);
        el.removeAttribute('data-original-title');
      }
    };

    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const tipEl = findTooltipEl(target);

      if (!tipEl) {
        // 離開有 tooltip 的元素 — 還原前一個元素的 title(若有)
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        restoreTitle(lastElementRef.current);
        if (visible) setVisible(false);
        lastElementRef.current = null;
        return;
      }

      // 同一個元素 → 只更新位置
      if (tipEl === lastElementRef.current) {
        setPos({ x: e.clientX + 14, y: e.clientY + 18 });
        return;
      }

      // 切到新元素 — 還原前一個 + 抑制新的 title
      restoreTitle(lastElementRef.current);
      lastElementRef.current = tipEl;
      // 文字:優先讀 data-tooltip,沒有就讀(被暫存的)title
      const dataTip = tipEl.getAttribute('data-tooltip');
      const titleTip = tipEl.getAttribute('title');
      const newText = dataTip ?? titleTip ?? '';
      // 如果是用 title,把 title 暫存起來避免瀏覽器原生提示(離開時還原)
      if (!dataTip && titleTip !== null) {
        stripTitle(tipEl);
      }
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
