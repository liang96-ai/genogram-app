import { useT } from '../../i18n';

/**
 * 第一次開啟才彈出的隱私說明
 * — 用 localStorage flag 'privacyAcknowledged' 控制只彈一次
 * — 點「我了解」會寫 flag,之後完全不再彈
 * — CaseList 端用 hasAcknowledgedPrivacy() 判斷是否要 mount 這個 dialog
 */

const ACK_KEY = 'privacyAcknowledged';

export function hasAcknowledgedPrivacy(): boolean {
  try {
    return localStorage.getItem(ACK_KEY) === '1';
  } catch {
    // localStorage 不可用就當成已確認過(不要 block 使用者進 App)
    return true;
  }
}

function markAcknowledged() {
  try {
    localStorage.setItem(ACK_KEY, '1');
  } catch {
    // 寫不進去就算了 — 使用者下次還是會看到,可接受
  }
}

type Props = {
  onClose: () => void;
};

export default function PrivacyWelcomeDialog({ onClose }: Props) {
  const t = useT();

  const handleAck = () => {
    markAcknowledged();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      // 不能點 backdrop 關閉 — 強制看完按按鈕
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          padding: '28px 28px 24px',
          borderRadius: 14,
          maxWidth: 480,
          width: '100%',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#1d1d1f',
            marginBottom: 12,
            lineHeight: 1.4,
          }}
        >
          {t('privacy.welcomeTitle')}
        </div>

        <div
          style={{
            fontSize: 13,
            color: '#3a3a3c',
            lineHeight: 1.6,
            marginBottom: 18,
          }}
        >
          {t('privacy.welcomeIntro')}
        </div>

        <Point
          title={t('privacy.welcomePoint1Title')}
          body={t('privacy.welcomePoint1Body')}
        />
        <Point
          title={t('privacy.welcomePoint2Title')}
          body={t('privacy.welcomePoint2Body')}
        />
        <Point
          title={t('privacy.welcomePoint3Title')}
          body={t('privacy.welcomePoint3Body')}
        />

        <div style={{ marginBottom: 20 }} />

        <button
          onClick={handleAck}
          autoFocus
          style={{
            display: 'block',
            width: '100%',
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 500,
            background: '#007aff',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {t('privacy.welcomeAck')}
        </button>
      </div>
    </div>
  );
}

function Point({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#1d1d1f',
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: '#3a3a3c',
          lineHeight: 1.55,
          whiteSpace: 'pre-line',
        }}
      >
        {body}
      </div>
    </div>
  );
}
