import { useState } from 'react';
import { useT } from '../i18n';
import { usePwaInstall } from '../services/pwaInstall';

const STORAGE_KEY = 'genogram_install_banner_dismissed';

export default function InstallBanner() {
  const t = useT();
  const { canInstall, isIOS, isStandalone, triggerInstall } = usePwaInstall();
  // lazy 初始化一次算好(#122):storage 不可用(隱私模式等)→ 當作已關閉,避免每次都跳
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return true;
    }
  });

  // 已經是 standalone(已安裝)或使用者按過「不再顯示」→ 不顯示
  if (isStandalone || dismissed) return null;
  // 兩種情境才顯示:Chrome 可安裝 / iOS Safari 看說明
  if (!canInstall && !isIOS) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // storage 不可用 → 本 session 內 state 仍會隱藏
    }
    setDismissed(true);
  };

  const onInstall = async () => {
    const result = await triggerInstall();
    if (result === 'accepted') dismiss();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 1000,
        background: '#fff',
        border: '1px solid #d2d2d7',
        borderRadius: 10,
        padding: 14,
        boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
        maxWidth: 320,
        fontSize: 13,
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 18 }}>📲</span>
        <strong style={{ fontSize: 13 }}>{t('install.title')}</strong>
        <div style={{ flex: 1 }} />
        <button
          onClick={dismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#86868b',
            cursor: 'pointer',
            fontSize: 16,
            padding: 0,
          }}
          title={t('install.dismiss')}
        >
          ✕
        </button>
      </div>
      {isIOS ? (
        <div
          style={{
            fontSize: 12,
            color: '#86868b',
            lineHeight: 1.5,
            marginBottom: 8,
          }}
        >
          {t('install.iOS')}
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 12,
              color: '#86868b',
              lineHeight: 1.5,
              marginBottom: 10,
            }}
          >
            {t('install.desktop')}
          </div>
          <button
            onClick={onInstall}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#007aff',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t('install.installNow')}
          </button>
        </>
      )}
    </div>
  );
}
