import { useEffect, useState } from 'react';
import { useT } from '../i18n';

const STORAGE_KEY = 'genogram_install_banner_dismissed';

// BeforeInstallPromptEvent 型別(Chrome/Edge 才有)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const t = useT();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Chrome/Edge 觸發 — 提示「可加到桌面/Dock」
    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    // iOS Safari 沒有 beforeinstallprompt event,要靠 user agent 偵測
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS only
      window.navigator.standalone === true;
    if (isIOS && !isStandalone) {
      setShow(true); // 只顯示說明,不能 prompt
    }

    window.addEventListener('beforeinstallprompt', onBefore);
    return () => window.removeEventListener('beforeinstallprompt', onBefore);
  }, []);

  if (!show) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      dismiss();
    }
    setDeferredPrompt(null);
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
            onClick={install}
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
