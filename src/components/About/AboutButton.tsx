import { useState } from 'react';
import AboutDialog from './AboutDialog';
import { useT } from '../../i18n';

/**
 * 浮動的 ℹ️ 按鈕,固定在畫面右上角。
 * — 點開後顯示 AboutDialog
 * — 自己管理 open state,放哪都行
 */
export default function AboutButton() {
  const [open, setOpen] = useState(false);
  const t = useT();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={t('about.openButton')}
        aria-label={t('about.openButton')}
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          width: 32,
          height: 32,
          padding: 0,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #e5e4e7',
          borderRadius: 8,
          fontSize: 16,
          cursor: 'pointer',
          fontFamily: 'inherit',
          color: '#1d1d1f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          zIndex: 50,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f5f5f7';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.92)';
        }}
      >
        ℹ️
      </button>
      {open && <AboutDialog onClose={() => setOpen(false)} />}
    </>
  );
}
