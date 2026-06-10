import { useEffect, useRef, useState } from 'react';
import { useT } from '../../i18n';

/**
 * 分享 Dialog —
 *   - QR Code(走 qrserver.com API,需網路時生成,但反正分享情境都要網路)
 *   - 網址 + 複製按鈕
 *   - 分享文案(可編輯)+ 複製按鈕
 *   - 若瀏覽器支援 navigator.share → 多顯示「系統分享」按鈕
 */
export default function ShareDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const url =
    typeof window !== 'undefined'
      ? window.location.origin + '/'
      : 'https://genogram-app-wine.vercel.app/';
  const message = t('share.template', { url });
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
    url,
  )}&margin=2`;
  const [urlCopied, setUrlCopied] = useState(false);
  const [msgCopied, setMsgCopied] = useState(false);
  const msgRef = useRef<HTMLTextAreaElement>(null);

  // Esc 關閉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async (text: string, setFlag: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      window.setTimeout(() => setFlag(false), 2000);
    } catch {
      // 退路:selectAll
      msgRef.current?.select();
    }
  };

  const canNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function';

  const nativeShare = async () => {
    if (!canNativeShare) return;
    // 讀現在 textarea 裡的最新文案(使用者可能編輯過)
    const currentText = msgRef.current?.value ?? message;
    try {
      // 只傳 text(內含 URL),不另外傳 url 避免某些 App 重複貼
      await navigator.share({
        title: t('share.shareTitle'),
        text: currentText,
      });
    } catch {
      // 使用者取消,沒事
    }
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 250,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 40px)',
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
          overflowY: 'auto',
          fontFamily: 'inherit',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 8px',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f' }}>
            📤 {t('share.title')}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              background: 'transparent',
              border: 'none',
              color: '#86868b',
              cursor: 'pointer',
              borderRadius: 4,
              fontFamily: 'inherit',
            }}
          >
            ✕
          </button>
        </div>

        {/* QR Code */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '4px 20px 12px',
          }}
        >
          <div
            style={{
              padding: 12,
              background: '#ffffff',
              border: '1px solid #e5e4e7',
              borderRadius: 12,
            }}
          >
            <img
              src={qrSrc}
              alt="QR Code"
              width={220}
              height={220}
              style={{ display: 'block' }}
            />
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#86868b',
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            {t('share.qrHint')}
          </div>
        </div>

        {/* URL section */}
        <div style={{ padding: '0 20px 12px' }}>
          <div
            style={{
              fontSize: 11,
              color: '#86868b',
              marginBottom: 4,
              fontWeight: 500,
            }}
          >
            {t('share.urlLabel')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={url}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: 13,
                background: '#f5f5f7',
                border: '1px solid #d2d2d7',
                borderRadius: 6,
                fontFamily: 'ui-monospace, monospace',
                color: '#1d1d1f',
                minWidth: 0,
              }}
            />
            <button
              onClick={() => copy(url, setUrlCopied)}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                background: urlCopied ? '#34c759' : '#007aff',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                transition: 'background 0.2s',
              }}
            >
              {urlCopied ? `✓ ${t('share.copied')}` : `📋 ${t('share.copy')}`}
            </button>
          </div>
        </div>

        {/* Message section */}
        <div style={{ padding: '0 20px 12px' }}>
          <div
            style={{
              fontSize: 11,
              color: '#86868b',
              marginBottom: 4,
              fontWeight: 500,
            }}
          >
            {t('share.messageLabel')}
          </div>
          <textarea
            ref={msgRef}
            defaultValue={message}
            rows={9}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 12,
              lineHeight: 1.6,
              background: '#f5f5f7',
              border: '1px solid #d2d2d7',
              borderRadius: 6,
              fontFamily: 'inherit',
              color: '#1d1d1f',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => copy(msgRef.current?.value ?? message, setMsgCopied)}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: 13,
                background: msgCopied ? '#34c759' : '#007aff',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
                transition: 'background 0.2s',
              }}
            >
              {msgCopied
                ? `✓ ${t('share.copiedMessage')}`
                : `📋 ${t('share.copyMessage')}`}
            </button>
            {canNativeShare && (
              <button
                onClick={nativeShare}
                style={{
                  padding: '10px 14px',
                  fontSize: 13,
                  background: '#ffffff',
                  color: '#007aff',
                  border: '1px solid #007aff',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 500,
                }}
                title={t('share.nativeShareTitle')}
              >
                🔗 {t('share.nativeShare')}
              </button>
            )}
          </div>
        </div>

        {/* bottom padding */}
        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}
