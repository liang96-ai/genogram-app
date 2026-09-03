// 全 App 唯一的彈窗外殼(2026-09-03 統一;疊放 / Esc / 底層失效由 ui/modalStack 保證)。
// 差異只剩四個參數:標題、寬度、關閉方式、要不要點遮罩關閉。
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { popModal, pushModal } from './modalStack';

export type ModalLevel = 'base' | 'confirm';

export type ModalProps = {
  /** Esc / 點遮罩 / 右上 × 都走這裡;要「放棄編輯?」的元件在這裡自己問 */
  onClose: () => void;
  title?: ReactNode;
  /** 標題列右側的額外按鈕(放在 × 左邊) */
  headerExtra?: ReactNode;
  width?: number | string;
  maxWidth?: string;
  /** 'confirm' 用於確認框:永遠在其他彈窗之上 */
  level?: ModalLevel;
  /** 點遮罩關閉(預設 true;確認框 / 教學這類請設 false) */
  closeOnBackdrop?: boolean;
  /** Esc 關閉(預設 true;隱私說明這類「要按確認才走」的設 false) */
  closeOnEsc?: boolean;
  /** 不畫標題列與 × (內容自己有) */
  bare?: boolean;
  /** 覆蓋卡片樣式(padding、背景、圓角…) */
  cardStyle?: CSSProperties;
  /** 覆蓋遮罩樣式(例如透明度) */
  overlayStyle?: CSSProperties;
  ariaLabel?: string;
  /** 給測試 / 樣式用 */
  dataTestId?: string;
  children: ReactNode;
};

const LEVEL_Z: Record<ModalLevel, number> = {
  base: 500, // 低於系統警示橫幅(1000 / 3000)與護眼濾鏡,橫幅開彈窗時仍看得到
  confirm: 1000,
};

let portalRoot: HTMLElement | null = null;
function getPortalRoot(): HTMLElement {
  if (!portalRoot) {
    portalRoot = document.getElementById('gn-modal-root');
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = 'gn-modal-root';
      document.body.appendChild(portalRoot);
    }
  }
  return portalRoot;
}

export default function Modal({
  onClose,
  title,
  headerExtra,
  width = 480,
  maxWidth = 'calc(100vw - 40px)',
  level = 'base',
  closeOnBackdrop = true,
  closeOnEsc = true,
  bare = false,
  cardStyle,
  overlayStyle,
  ariaLabel,
  dataTestId,
  children,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<number | null>(null);
  const escRef = useRef<() => void>(() => {});

  // 進出堆疊放在 layout effect(不在 render 期間做副作用);開啟時焦點進卡片、關閉時還給原本的元素
  useLayoutEffect(() => {
    const id = pushModal(() => escRef.current());
    idRef.current = id;
    const prev = document.activeElement as HTMLElement | null;
    // 內容若有 autoFocus 的欄位,React 在 commit 時已經把焦點放進去了,不要搶走
    const card = cardRef.current;
    if (card && !card.contains(document.activeElement)) card.focus({ preventScroll: true });
    return () => {
      popModal(id);
      idRef.current = null;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, []);
  // onClose 換了 closure 也要讓 Esc 拿到最新的;closeOnEsc=false 時 Esc 什麼都不做
  useEffect(() => {
    escRef.current = closeOnEsc ? onClose : () => {};
  }, [closeOnEsc, onClose]);

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
      data-testid={dataTestId}
      onClick={closeOnBackdrop ? onClose : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: LEVEL_Z[level],
        ...overlayStyle,
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth,
          maxHeight: 'calc(100vh - 40px)',
          overflow: 'auto',
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: bare ? 0 : 20,
          outline: 'none',
          ...cardStyle,
        }}
      >
        {!bare && (title !== undefined || headerExtra) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', flex: 1 }}>{title}</div>
            {headerExtra}
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉"
              style={{
                width: 28,
                height: 28,
                border: 'none',
                borderRadius: 14,
                background: '#f2f2f7',
                color: '#6e6e73',
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
  return createPortal(node, getPortalRoot());
}
