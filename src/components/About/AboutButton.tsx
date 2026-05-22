import { useState } from 'react';
import AboutDialog from './AboutDialog';
import { useT } from '../../i18n';

/**
 * ℹ️ 按鈕,點開後顯示 AboutDialog
 * — 預設樣式:小型工具列按鈕(32x32),適合塞進現有 toolbar
 * — 沒有 fixed 定位,由 caller 決定位置
 * — 自己管理 open state
 *
 * 用法:
 *   <AboutButton />                 // 預設小型(toolbar 用)
 *   <AboutButton size="lg" />       // 大型(首頁標題旁)
 */
export default function AboutButton({
  size = 'sm',
}: {
  size?: 'sm' | 'lg';
}) {
  const [open, setOpen] = useState(false);
  const t = useT();

  const dim = size === 'lg' ? 36 : 28;
  const fontSize = size === 'lg' ? 18 : 15;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={t('about.openButton')}
        aria-label={t('about.openButton')}
        style={{
          width: dim,
          height: dim,
          padding: 0,
          background: '#ffffff',
          border: '1px solid #d2d2d7',
          borderRadius: 8,
          fontSize,
          cursor: 'pointer',
          fontFamily: 'inherit',
          color: '#1d1d1f',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f5f5f7';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffffff';
        }}
      >
        ℹ️
      </button>
      {open && <AboutDialog onClose={() => setOpen(false)} />}
    </>
  );
}
