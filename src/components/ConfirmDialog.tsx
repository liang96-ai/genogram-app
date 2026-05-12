import { useEffect } from 'react';
import { useGenogramStore } from '../store/genogramStore';
import { useT } from '../i18n';

export default function ConfirmDialog() {
  const confirmState = useGenogramStore((s) => s.confirmState);
  const t = useT();

  useEffect(() => {
    if (!confirmState) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmState.onYes();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        confirmState.onNo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmState]);

  if (!confirmState) return null;

  const { message, onYes, onNo } = confirmState;
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 24,
          minWidth: 320,
          maxWidth: 440,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ fontSize: 14, color: '#1d1d1f', marginBottom: 16, lineHeight: 1.5 }}>
          {message}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#86868b',
            marginBottom: 16,
          }}
        >
          {t('confirm.shortcut', { mod: modKey })}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={onNo}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              background: '#34c759',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            {t('common.no')}
          </button>
          <button
            onClick={onYes}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              background: '#ff3b30',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            {t('common.yes')}
          </button>
        </div>
      </div>
    </div>
  );
}
