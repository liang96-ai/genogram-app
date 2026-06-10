import { useEffect } from 'react';
import { useT } from '../../i18n';

/**
 * 關於 / About 對話框
 * — 顯示專案資訊、開源聲明、贊助方式、相關文件連結
 * — 從工具列右側的 ℹ️ 按鈕觸發
 */

const GITHUB_URL = 'https://github.com/liang96-ai/genogram-app';
const FEEDBACK_EMAIL = 'genogram.feedback@gmail.com';

export default function AboutDialog({ onClose }: { onClose: () => void }) {
  const t = useT();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        zIndex: 200,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
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
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#1d1d1f',
            }}
          >
            ℹ️ {t('about.title')}
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
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
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = '#f5f5f7')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            ✕
          </button>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 13,
            color: '#3a3a3c',
            lineHeight: 1.6,
            marginBottom: 18,
          }}
        >
          {t('about.tagline')}
        </div>

        {/* Section: Open Source */}
        <Section title={t('about.openSourceTitle')}>
          <div
            style={{
              fontSize: 12.5,
              color: '#3a3a3c',
              lineHeight: 1.55,
              marginBottom: 8,
            }}
          >
            {t('about.openSourceBody')}
          </div>
          <LinkRow icon="📖" label="GitHub" url={GITHUB_URL} />
        </Section>

        {/* Section: Support — 個人免費(抖內) + 組織年費 */}
        <Section title={t('about.supportTitle')}>
          {/* 個人實務 — 免費(抖內按鈕集中在工具列 ☕ 彈窗,About 不重複) */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>
            💚 {t('about.personalTitle')}
          </div>
          <div style={{ fontSize: 12.5, color: '#3a3a3c', lineHeight: 1.55, marginBottom: 16 }}>
            {t('about.personalNote')}
          </div>

          {/* 組織使用 — 邀請以年費表達支持 */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>
            🤝 {t('about.orgTitle')}
          </div>
          <div style={{ fontSize: 12.5, color: '#3a3a3c', lineHeight: 1.55, marginBottom: 8 }}>
            {t('about.orgBody')}
          </div>
          <div style={{ fontSize: 12.5, color: '#3a3a3c', lineHeight: 1.85, marginBottom: 8 }}>
            🌱 {t('about.orgNonprofit')}
            <br />
            🏢 {t('about.orgForprofit')}
            <br />
            🔧 {t('about.orgIntegration')}
          </div>
          <LinkRow
            icon="📧"
            label={t('about.emailLabel')}
            url={`mailto:${FEEDBACK_EMAIL}`}
            displayText={FEEDBACK_EMAIL}
          />
          <div style={{ fontSize: 11.5, color: '#86868b', lineHeight: 1.6, marginTop: 12 }}>
            {t('about.supportFooter')}
          </div>
        </Section>

        {/* Section: Documents */}
        <Section title={t('about.docsTitle')}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              fontSize: 12.5,
            }}
          >
            <DocLink href={`${GITHUB_URL}/blob/main/PRIVACY.md`}>
              {t('about.docPrivacy')}
            </DocLink>
            <DocLink href={`${GITHUB_URL}/blob/main/TERMS.md`}>
              {t('about.docTerms')}
            </DocLink>
            <DocLink href={`${GITHUB_URL}/blob/main/SPONSORSHIP.md`}>
              {t('about.docSponsorship')}
            </DocLink>
            <DocLink href={`${GITHUB_URL}/blob/main/LICENSE`}>
              {t('about.docLicense')}
            </DocLink>
          </div>
        </Section>

        {/* Footer */}
        <div
          style={{
            marginTop: 8,
            paddingTop: 14,
            borderTop: '1px solid #f0f0f5',
            fontSize: 11,
            color: '#86868b',
            textAlign: 'center',
          }}
        >
          Made with care by 梁人人 / Liang RenRen — Taiwan
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#1d1d1f',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function LinkRow({
  icon,
  label,
  url,
  displayText,
}: {
  icon: string;
  label: string;
  url: string;
  displayText?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
        fontSize: 13,
      }}
    >
      <span>{icon}</span>
      <span style={{ color: '#3a3a3c' }}>{label}:</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#007aff',
          textDecoration: 'none',
          wordBreak: 'break-all',
        }}
      >
        {displayText ?? url.replace(/^https?:\/\//, '')}
      </a>
    </div>
  );
}

function DocLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        padding: '4px 10px',
        background: '#f5f5f7',
        borderRadius: 6,
        color: '#007aff',
        textDecoration: 'none',
        fontSize: 12.5,
      }}
    >
      {children}
    </a>
  );
}
