import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { usePwaInstall } from '../services/pwaInstall';

const STORAGE_KEY = 'genogram_install_banner_dismissed';

export default function InstallBanner() {
  const t = useT();
  const { canInstall, isIOS, isStandalone, triggerInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true); // 預設不顯示,等檢查

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setDismissed(false);
    }
  }, []);

  // 已經是 standalone(已安裝)或使用者按過「不再顯示」→ 不顯示
  if (isStandalone || dismissed) return null;
  // 兩種情境才顯示:Chrome 可安裝 / iOS Safari 看說明
  if (!canInstall && !isIOS) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
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
