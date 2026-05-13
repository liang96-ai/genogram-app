import { useEffect, useState } from 'react';
import { useT } from '../../i18n';

// 收件信箱(專案專屬,不用個人 gmail)
const FEEDBACK_EMAIL = 'genogram.feedback@gmail.com';
const APP_VERSION = '1.0';

type FeedbackType = 'bug' | 'suggestion' | 'question';

/**
 * 回報意見對話框 —
 *   - 使用者選類型 + 寫描述
 *   - 點送出 → 開使用者 email 程式(mailto:),預填主旨、內文、裝置資訊
 *   - 完全不用 backend / 第三方服務
 */
export default function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [type, setType] = useState<FeedbackType>('bug');
  const [description, setDescription] = useState('');

  // Esc 關閉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 自動帶裝置資訊(放在信尾,給開發者 debug)
  const deviceInfo = (() => {
    const ua = navigator.userAgent;
    const platform = navigator.platform || '?';
    const lang = navigator.language || '?';
    const screen = `${window.screen.width}x${window.screen.height}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    return `Platform: ${platform}\nLang: ${lang}\nScreen: ${screen}\nUA: ${ua}\nTime: ${now}\nApp version: ${APP_VERSION}`;
  })();

  const typeLabels: Record<FeedbackType, { icon: string; key: string }> = {
    bug: { icon: '🐛', key: 'feedback.typeBug' },
    suggestion: { icon: '💡', key: 'feedback.typeSuggestion' },
    question: { icon: '❓', key: 'feedback.typeQuestion' },
  };

  const handleSubmit = () => {
    const typeLabel = t(typeLabels[type].key);
    const subject = `[家系圖工具] ${typeLabel}`;
    const body = `${t('feedback.bodyTypeLabel')}: ${typeLabels[type].icon} ${typeLabel}

${t('feedback.bodyDescLabel')}:
${description.trim() || '(空白)'}

─────────────
${t('feedback.bodyDeviceLabel')}:
${deviceInfo}`;
    const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    // 開 email 客戶端
    window.location.href = mailto;
    // 關閉 dialog(使用者已經到他的 email 程式去了)
    window.setTimeout(() => onClose(), 100);
  };

  const canSubmit = description.trim().length > 0;

  return (
    <div
      onClick={onClose}
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
            ✉️ {t('feedback.title')}
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

        {/* Type selection */}
        <div style={{ padding: '4px 20px 12px' }}>
          <div
            style={{
              fontSize: 11,
              color: '#86868b',
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            {t('feedback.typeLabel')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(Object.keys(typeLabels) as FeedbackType[]).map((k) => (
              <button
                key={k}
                onClick={() => setType(k)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  fontSize: 13,
                  background: type === k ? '#e8f1ff' : '#ffffff',
                  border:
                    type === k ? '2px solid #007aff' : '1px solid #d2d2d7',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: '#1d1d1f',
                  fontFamily: 'inherit',
                  fontWeight: type === k ? 600 : 400,
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 2 }}>
                  {typeLabels[k].icon}
                </div>
                {t(typeLabels[k].key)}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ padding: '0 20px 12px' }}>
          <div
            style={{
              fontSize: 11,
              color: '#86868b',
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            {t('feedback.descLabel')}
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('feedback.descPlaceholder')}
            rows={8}
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 13,
              lineHeight: 1.6,
              background: '#ffffff',
              border: '1px solid #d2d2d7',
              borderRadius: 6,
              fontFamily: 'inherit',
              color: '#1d1d1f',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Hint */}
        <div
          style={{
            padding: '0 20px 12px',
            fontSize: 11,
            color: '#86868b',
            lineHeight: 1.5,
          }}
        >
          💡 {t('feedback.hint')}
        </div>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '0 20px 20px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              fontSize: 13,
              background: '#ffffff',
              color: '#1d1d1f',
              border: '1px solid #d2d2d7',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: '10px 22px',
              fontSize: 13,
              background: canSubmit ? '#007aff' : '#c7c7cc',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            {t('feedback.send')}
          </button>
        </div>
      </div>
    </div>
  );
}
