import { useEffect, useRef, useState } from 'react';
import {
  getComfortLevel,
  onComfortChange,
  setComfortLevel,
} from '../../services/eyeComfort';
import { useT } from '../../i18n';

/**
 * 護眼眼睛鈕 + 直向滑桿 popover(像 Windows 音量條)。
 *   size='sm' 編輯工具列 / size='lg' 首頁頂列。
 * 控制全域暖色濃度(services/eyeComfort.ts);兩處按鈕共用同一個值。
 */
export default function EyeComfortButton({
  size = 'sm',
}: {
  size?: 'sm' | 'lg';
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(getComfortLevel());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => onComfortChange(setLevel), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const w = size === 'lg' ? 40 : 28;
  const h = size === 'lg' ? 36 : 24;
  const active = level > 0;

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        title={t('eyeComfort.button')}
        aria-label={t('eyeComfort.button')}
        style={{
          width: w,
          height: h,
          padding: 0,
          background: active ? '#faeeda' : '#ffffff',
          border: `${size === 'lg' ? '0.5px' : '1px'} solid ${active ? '#e3cb95' : '#d2d2d7'}`,
          borderRadius: size === 'lg' ? 9 : 8,
          cursor: 'pointer',
          fontFamily: 'inherit',
          color: active ? '#854f0b' : '#1d1d1f',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EyeIcon />
      </button>
      {open && (
        <div
          role="dialog"
          style={{
            position: 'absolute',
            top: h + 8,
            right: 0,
            width: 92,
            padding: '12px 10px 8px',
            background: '#ffffff',
            border: '1px solid #e5e4e7',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            zIndex: 220,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1d1d1f' }}>
            {t('eyeComfort.title')}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={level}
            aria-label={t('eyeComfort.title')}
            onChange={(e) => setComfortLevel(Number(e.target.value))}
            style={{
              writingMode: 'vertical-lr',
              direction: 'rtl',
              width: 24,
              height: 120,
              accentColor: '#854f0b',
              cursor: 'pointer',
            }}
          />
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>
            {level}%
          </div>
          <button
            onClick={() => setComfortLevel(0)}
            style={{
              fontSize: 11,
              color: '#86868b',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: '2px 4px',
            }}
          >
            {t('eyeComfort.reset')}
          </button>
          <div
            style={{
              fontSize: 10,
              color: '#86868b',
              lineHeight: 1.4,
              textAlign: 'center',
            }}
          >
            {t('eyeComfort.hint')}
          </div>
        </div>
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
