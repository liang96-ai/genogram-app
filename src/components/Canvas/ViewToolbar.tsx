import { useRef } from 'react';
import { clampZoom, useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';

/**
 * 浮動在畫布上的檢視工具列(pan/zoom 控制)
 * 位置:底部,貼 Inspector 那邊(左或右)
 */
export default function ViewToolbar() {
  const t = useT();
  const viewZoom = useGenogramStore((s) => s.viewZoom);
  const inspectorSide = useGenogramStore((s) => s.inspectorSide);
  const inspectorCollapsed = useGenogramStore((s) => s.inspectorCollapsed);
  const resetView = useGenogramStore((s) => s.resetView);
  const fitView = useGenogramStore((s) => s.fitView);
  const drawMode = useGenogramStore((s) => s.drawMode);
  const setDrawMode = useGenogramStore((s) => s.setDrawMode);

  const ref = useRef<HTMLDivElement>(null);

  // 取得所在容器的尺寸(畫布區域)
  const getViewport = () => {
    const parent = ref.current?.parentElement;
    if (!parent) return null;
    const r = parent.getBoundingClientRect();
    return { w: r.width, h: r.height };
  };

  // 以畫面中心為基準縮放
  const zoomByFactor = (factor: number) => {
    const vp = getViewport();
    if (!vp) return;
    const state = useGenogramStore.getState();
    const { viewPan, viewZoom } = state;
    const cx = vp.w / 2;
    const cy = vp.h / 2;
    const svgX = (cx - viewPan.x) / viewZoom;
    const svgY = (cy - viewPan.y) / viewZoom;
    const newZoom = clampZoom(viewZoom * factor);
    if (newZoom === viewZoom) return;
    state.setView(
      { x: cx - svgX * newZoom, y: cy - svgY * newZoom },
      newZoom,
    );
  };

  const onFit = () => {
    const vp = getViewport();
    if (!vp) return;
    fitView(vp.w, vp.h);
  };

  // Inspector 收合時寬度 24,展開時 340;讓工具列稍微偏離 Inspector 邊緣
  const edgeGap = inspectorCollapsed ? 12 : 12;

  return (
    <div
      ref={ref}
      data-view-toolbar
      style={{
        position: 'absolute',
        bottom: 12,
        [inspectorSide]: edgeGap,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: 4,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        borderRadius: 8,
        border: '1px solid #e5e4e7',
        fontSize: 13,
        color: '#1d1d1f',
        userSelect: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <IconBtn title={t('view.zoomOut')} onClick={() => zoomByFactor(1 / 1.25)}>
        <Minus />
      </IconBtn>
      <button
        onClick={resetView}
        title={t('view.resetZoom')}
        style={{
          minWidth: 54,
          padding: '4px 6px',
          background: 'transparent',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
          color: '#1d1d1f',
          fontFamily: 'inherit',
          textAlign: 'center',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f5')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {Math.round(viewZoom * 100)}%
      </button>
      <IconBtn title={t('view.zoomIn')} onClick={() => zoomByFactor(1.25)}>
        <Plus />
      </IconBtn>
      <Divider />
      <IconBtn title={t('view.fit')} onClick={onFit}>
        <FitIcon />
      </IconBtn>
      <Divider />
      <button
        onClick={() => setDrawMode(!drawMode)}
        title={drawMode ? t('view.exitDraw') : t('view.drawEcosystem')}
        style={{
          width: 28,
          height: 24,
          padding: 0,
          background: drawMode ? '#007aff' : 'transparent',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: drawMode ? '#ffffff' : '#1d1d1f',
        }}
        onMouseEnter={(e) => {
          if (!drawMode) e.currentTarget.style.background = '#f0f0f5';
        }}
        onMouseLeave={(e) => {
          if (!drawMode) e.currentTarget.style.background = 'transparent';
        }}
      >
        <PenIcon />
      </button>
    </div>
  );
}

function PenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M1.5 12.5 L4 10 L10 4 L12 6 L6 12 L3.5 12.5 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <line
        x1="10"
        y1="4"
        x2="12"
        y2="6"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28,
        height: 24,
        padding: 0,
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#1d1d1f',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f5')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 18,
        background: '#e5e4e7',
        margin: '0 2px',
      }}
    />
  );
}

function Plus() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Minus() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FitIcon() {
  // 四角框:代表「全部放進視窗」
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 5 L2 2 L5 2 M9 2 L12 2 L12 5 M12 9 L12 12 L9 12 M5 12 L2 12 L2 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
