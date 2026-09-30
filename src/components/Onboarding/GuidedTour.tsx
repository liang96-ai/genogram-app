// 「帶著做一次」(1.6.0):在使用者自己的個案上,一步一個真的動作,做到了自動下一步。
// 設計原則(web-app-lessons 第一章):任務流而不是功能表;每步一句話;可跳過、可重看;
// 不擋住要教的東西 —— 整層不吃點擊(pointer-events: none),只有提示卡可以按。
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import { TOUR_EVENT } from '../../services/uiEvents';
import { markGuidedTourDone } from './tourSeen';
import {
  TOUR_STEPS,
  probandHasParents,
  probandIdOf,
  tourBaseline,
  type TourBaseline,
  type TourEvent,
  type TourStep,
} from './tourSteps';

type Box = { x: number; y: number; w: number; h: number };
const EMPTY_EVENTS: ReadonlySet<TourEvent> = new Set();

function boxOf(el: Element | null, pad: number): Box | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
}

/** 這一步要框起來的東西,以及框裡再強調的小東西 */
function measure(step: TourStep, probandId: string | null): { target: Box | null; focus: Box[] } {
  if (step.target === 'proband') {
    const person = probandId ? document.querySelector(`g[data-person-id="${CSS.escape(probandId)}"]`) : null;
    const target = boxOf(person, 50);
    const arrows =
      step.focusArrow === 'up'
        ? ['up']
        : step.focusArrow === 'side'
          ? ['right', 'down']
          : [];
    const focus = arrows
      .map((d) => boxOf(document.querySelector(`g[data-arrow="${d}"]`), 6))
      .filter((b): b is Box => b !== null);
    return { target, focus };
  }
  const sel = step.target === 'person-basics' ? '[data-tour="person-basics"]' : '[data-tour="editor-menu"]';
  const target = boxOf(document.querySelector(sel), step.target === 'editor-menu' ? 6 : 8);
  return { target, focus: step.target === 'editor-menu' && target ? [target] : [] };
}

export default function GuidedTour() {
  const t = useT();
  const setTourActive = useGenogramStore((s) => s.setTourActive);
  const currentCase = useGenogramStore((s) => s.currentCase);
  // 案主已經有爸媽(在舊個案上重看):第 1 步做不到,直接從第 2 步開始
  const [startIdx] = useState(() => {
    const c = useGenogramStore.getState().currentCase;
    return c && probandHasParents(c) ? 1 : 0;
  });
  const [idx, setIdx] = useState(startIdx);
  const [finished, setFinished] = useState(false);
  const [base, setBase] = useState<TourBaseline | null>(() => {
    const c = useGenogramStore.getState().currentCase;
    return c ? tourBaseline(c) : null;
  });
  const [events, setEvents] = useState<ReadonlySet<TourEvent>>(EMPTY_EVENTS);
  const [boxes, setBoxes] = useState<{ target: Box | null; focus: Box[] }>({ target: null, focus: [] });
  const [vw, setVw] = useState(() => window.innerWidth);
  const [vh, setVh] = useState(() => window.innerHeight);

  const step = TOUR_STEPS[idx];
  const probandId = currentCase ? probandIdOf(currentCase) : null;

  // 案主那兩步:選取案主,箭頭才會出現
  const prepare = useCallback((s: TourStep) => {
    if (s.target !== 'proband') return;
    const st = useGenogramStore.getState();
    const id = st.currentCase ? probandIdOf(st.currentCase) : null;
    if (id) st.selectPersons([id]);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (next >= TOUR_STEPS.length) {
        markGuidedTourDone(); // 看到完成卡就算看過(就算沒按「開始使用」直接離開)
        setFinished(true);
        return;
      }
      const c = useGenogramStore.getState().currentCase;
      setIdx(next);
      setBase(c ? tourBaseline(c) : null);
      setEvents(EMPTY_EVENTS);
      prepare(TOUR_STEPS[next]);
    },
    [prepare],
  );

  const end = useCallback(() => {
    markGuidedTourDone();
    setTourActive(false);
  }, [setTourActive]);

  // 一開始就把案主選起來;中途離開編輯器也算看過(選單可以重看),不然下次新建個案又自動開
  useEffect(() => {
    prepare(TOUR_STEPS[startIdx]);
    return () => markGuidedTourDone();
  }, [prepare, startIdx]);

  // 快速建立、匯出圖片這兩步靠事件知道「做到了」
  useEffect(() => {
    const on = (e: Event) => {
      const name = (e as CustomEvent<TourEvent>).detail;
      setEvents((prev) => new Set(prev).add(name));
    };
    window.addEventListener(TOUR_EVENT, on);
    return () => window.removeEventListener(TOUR_EVENT, on);
  }, []);

  // 做到了 → 停一下讓人看到結果,再到下一步
  const doneNow = !finished && !!currentCase && !!base && step.done(currentCase, base, events);
  useEffect(() => {
    if (!doneNow) return;
    const id = window.setTimeout(() => goTo(idx + 1), 500);
    return () => window.clearTimeout(id);
  }, [doneNow, idx, goTo]);

  // 追著目標的位置(畫布會平移縮放、面板會收合)
  useEffect(() => {
    if (finished) return;
    const tick = () => {
      const next = measure(step, probandId);
      // 位置沒變就不重畫(每 250ms 量一次)
      setBoxes((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    const raf = window.requestAnimationFrame(tick);
    const id = window.setInterval(tick, 250);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, [step, probandId, finished]);

  const cardW = Math.min(300, vw - 24);
  if (finished) {
    return createPortal(
      <div style={{ ...cardStyle, width: cardW, left: (vw - cardW) / 2, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }} role="dialog" aria-label={t('tour.doneTitle')}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{t('tour.doneTitle')}</div>
        <div style={{ fontSize: 14, color: '#3a3a3c', lineHeight: 1.6 }}>{t('tour.doneBody')}</div>
        <button onClick={end} style={primaryBtn}>
          {t('tour.doneOk')}
        </button>
      </div>,
      document.body,
    );
  }

  const target = boxes.target;
  const dim = step.target !== 'editor-menu';
  // 提示卡:目標右邊放得下就放右邊,不然放左邊,再不然放下面
  let cardLeft = (vw - cardW) / 2;
  let cardTop = vh - 220;
  if (step.target === 'editor-menu') {
    // 選單鈕在左上角,打開的選單會往下長:卡片放畫面下方置中,才不會蓋住要按的選項
    cardLeft = (vw - cardW) / 2;
    cardTop = vh - 240; // 留出底部縮放列的高度
  } else if (target) {
    if (target.x + target.w + 16 + cardW < vw) {
      cardLeft = target.x + target.w + 16;
      cardTop = Math.max(12, Math.min(target.y, vh - 220));
    } else if (target.x - 16 - cardW > 0) {
      cardLeft = target.x - 16 - cardW;
      cardTop = Math.max(12, Math.min(target.y, vh - 220));
    } else {
      cardLeft = Math.max(12, Math.min(target.x, vw - cardW - 12));
      cardTop = Math.max(12, Math.min(target.y + target.h + 12, vh - 240));
    }
  }

  return createPortal(
    <>
      <svg
        width={vw}
        height={vh}
        aria-hidden
        style={{ position: 'fixed', inset: 0, zIndex: 450, pointerEvents: 'none' }}
      >
        <defs>
          <mask id="gn-tour-hole">
            <rect x={0} y={0} width={vw} height={vh} fill="#fff" />
            {target && <rect x={target.x} y={target.y} width={target.w} height={target.h} rx={14} fill="#000" />}
          </mask>
        </defs>
        {dim && <rect x={0} y={0} width={vw} height={vh} fill="rgba(18,22,30,0.32)" mask="url(#gn-tour-hole)" />}
        {boxes.focus.map((b, i) => (
          <rect
            key={i}
            className="gn-tour-ring"
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx={10}
            fill="none"
            stroke="#1f7cff"
            strokeWidth={2.5}
            strokeDasharray="6 4"
          />
        ))}
      </svg>
      <div style={{ ...cardStyle, width: cardW, left: cardLeft, top: cardTop }} role="dialog" aria-label={t('menu.guidedTour')}>
        <div style={{ fontSize: 12, color: '#6e6e73' }}>
          {t('tour.progress', { n: idx + 1, total: TOUR_STEPS.length })}
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.5, color: '#1d1d1f' }}>{t(step.textKey)}</div>
        <div style={{ fontSize: 12.5, color: '#6e6e73' }}>{t('tour.autoNext')}</div>
        {/* 已經會了、或早就按過了:隨時可以自己按下一步,不會卡住 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <button onClick={end} style={{ ...linkBtn, color: '#6e6e73' }}>
            {t('tour.skipAll')}
          </button>
          <button onClick={() => goTo(idx + 1)} style={{ ...primaryBtn, marginTop: 0, padding: '7px 16px' }}>
            {idx + 1 >= TOUR_STEPS.length ? t('tour.finish') : t('tour.next')}
          </button>
        </div>
      </div>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .gn-tour-ring { animation: gn-tour-pulse 1.4s ease-in-out infinite; }
          @keyframes gn-tour-pulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
        }
      `}</style>
    </>,
    document.body,
  );
}

const cardStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 460,
  pointerEvents: 'auto',
  background: '#ffffff',
  borderRadius: 14,
  padding: '14px 16px 12px',
  boxShadow: '0 10px 32px rgba(0,0,0,0.22)',
  border: '1px solid #e5e4e7',
  display: 'grid',
  gap: 6,
  fontFamily: 'inherit',
};

const linkBtn: React.CSSProperties = {
  padding: '4px 0',
  background: 'transparent',
  border: 'none',
  color: '#007aff',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const primaryBtn: React.CSSProperties = {
  marginTop: 4,
  padding: '9px 14px',
  background: '#007aff',
  color: '#ffffff',
  border: 'none',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
