import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../../i18n';

/**
 * 抖內 / 支持 小視窗(個人隨喜)+ 兩個入口:
 *   - SupportButton:工具列常駐 ☕ 鈕(D)
 *   - SupportAutoPrompt:第 N 次開啟 App 時溫和提示「一次」(C)
 *
 * 隱私:只在 localStorage 記「開啟次數 / 是否提示過」,純本機、不外傳,
 *       與「不追蹤」承諾一致(等同語言偏好、教學看過沒)。
 */

const KOFI_URL = 'https://ko-fi.com/liang96';
const ECPAY_URL = 'https://p.ecpay.com.tw/39E7770';

// localStorage keys(純本機)
const LAUNCH_KEY = 'genogram_launch_count';
const SEEN_KEY = 'genogram_support_prompt_seen';
// 第幾次開啟 App 時溫和提示一次(可調)。文案不提「用了多久」,避免被計時感。
const TRIGGER_AT = 5;

function Pill({ icon, label, url }: { icon: string; label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '9px 16px',
        background: '#e8f2ff',
        color: '#007aff',
        borderRadius: 999,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: 600,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#d2e6ff')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#e8f2ff')}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span>{label}</span>
    </a>
  );
}

// 共用的小抖內視窗
export function SupportDialog({ onClose }: { onClose: () => void }) {
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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 210,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          padding: '24px 24px 20px',
          borderRadius: 14,
          maxWidth: 380,
          width: '100%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 30, marginBottom: 8 }}>☕</div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#1d1d1f',
            marginBottom: 8,
            lineHeight: 1.5,
          }}
        >
          {t('support.heading')}
        </div>
        <div
          style={{
            fontSize: 13,
            color: '#3a3a3c',
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        >
          {t('support.body')}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <Pill icon="🧋" label={t('about.ecpayLabel')} url={ECPAY_URL} />
            <div style={{ fontSize: 11, color: '#86868b' }}><span style={{ color: '#1d1d1f', fontWeight: 600 }}>{t('donate.ecpayRegion')}</span>{' · '}{t('donate.ecpaySub')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <Pill icon="☕" label={t('about.kofiLabel')} url={KOFI_URL} />
            <div style={{ fontSize: 11, color: '#86868b' }}><span style={{ color: '#1d1d1f', fontWeight: 600 }}>{t('donate.kofiRegion')}</span>{' · '}{t('donate.kofiSub')}</div>
          </div>
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: '#86868b',
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          {t('support.footer')}
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '7px 16px',
            fontSize: 13,
            background: '#f5f5f7',
            border: 'none',
            borderRadius: 8,
            color: '#1d1d1f',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}

// D:工具列常駐 ☕ 入口
export function SupportButton({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const dim = size === 'lg' ? 36 : 28;
  const fontSize = size === 'lg' ? 18 : 15;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={t('support.openButton')}
        aria-label={t('support.openButton')}
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
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f7')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
      >
        ☕
      </button>
      {open &&
        createPortal(
          <SupportDialog onClose={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
}

// C:中性觸發 — 第 N 次開啟 App 時溫和提示「一次」(純本機計數)
export function SupportAutoPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
      const n = Number(localStorage.getItem(LAUNCH_KEY) || '0') + 1;
      localStorage.setItem(LAUNCH_KEY, String(n));
      if (n >= TRIGGER_AT) {
        localStorage.setItem(SEEN_KEY, '1');
        setOpen(true);
      }
    } catch {
      // localStorage 不可用就略過,不影響功能
    }
  }, []);

  if (!open) return null;
  return createPortal(
    <SupportDialog onClose={() => setOpen(false)} />,
    document.body,
  );
}
