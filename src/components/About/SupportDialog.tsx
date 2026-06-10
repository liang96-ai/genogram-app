import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../../i18n';

/**
 * 抖內 / 支持 小視窗(個人隨喜)v2(#129)+ 兩個入口:
 *   - SupportButton:工具列常駐 ☕ 鈕
 *   - SupportAutoPrompt:訂閱 supportPromptLogic 的「價值時刻」觸發
 *     (首彈=第 3 次匯出;保險絲=第 10 次開啟;之後每滿 100 次開啟等下次匯出)
 *
 * 版型:依「裝置時區」分台灣版(ECPay 主鈕)/ 海外版(Ko-fi 主鈕)—
 *       純本機讀取、離線可用、不碰 IP,與「不追蹤」承諾相容。
 * 隱私:計數只存 localStorage(等同語言偏好),不上傳;文案永不顯示次數。
 */

import { countLaunch, onSupportPrompt } from './supportPromptLogic';

const KOFI_URL = 'https://ko-fi.com/liang96';
const ECPAY_URL = 'https://p.ecpay.com.tw/39E7770';

// 人在台灣 → ECPay 主(ATM/超商要人在台);其他時區 → Ko-fi 主。
// 未來多國:這裡擴成「時區 → 管道」對照表(配合 #95 國際化)。
function isTaiwanTimezone(): boolean {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Taipei';
  } catch {
    return true; // 偵測失敗 → 預設台灣版(主要受眾)
  }
}
const IS_TW = isTaiwanTimezone();

// 主行動鈕(實心藍 + 外連箭頭)+ 說明微文案 — 解決「看起來不能按/按了會怎樣」
function PrimaryAction({
  label,
  sub,
  url,
}: {
  label: string;
  sub: string;
  url: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 22px',
          background: '#007aff',
          color: '#ffffff',
          borderRadius: 10,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 600,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#0068d9')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#007aff')}
      >
        <span>{label}</span>
        <span style={{ fontSize: 12, opacity: 0.85 }}>↗</span>
      </a>
      <div style={{ fontSize: 11, color: '#86868b', lineHeight: 1.5 }}>
        {sub}
      </div>
    </div>
  );
}

// 次要管道(外框膠囊,維持分流但不搶主鈕)
function SecondaryAction({
  label,
  sub,
  url,
}: {
  label: string;
  sub: string;
  url: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 16px',
          background: 'transparent',
          color: '#007aff',
          border: '1px solid #b3d7ff',
          borderRadius: 999,
          textDecoration: 'none',
          fontSize: 12.5,
          fontWeight: 600,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f7ff')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span>{label}</span>
      </a>
      <div style={{ fontSize: 11, color: '#86868b' }}>{sub}</div>
    </div>
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
      role="dialog"
      aria-modal="true"
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
            gap: 14,
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          {IS_TW ? (
            <>
              <PrimaryAction
                label={t('donate.goTw')}
                sub={t('donate.goTwSub')}
                url={ECPAY_URL}
              />
              <SecondaryAction
                label={t('donate.altIntl')}
                sub={t('donate.kofiSub')}
                url={KOFI_URL}
              />
            </>
          ) : (
            <>
              <PrimaryAction
                label={t('donate.goIntl')}
                sub={t('donate.goIntlSub')}
                url={KOFI_URL}
              />
              <SecondaryAction
                label={t('donate.altTw')}
                sub={t('donate.ecpaySub')}
                url={ECPAY_URL}
              />
            </>
          )}
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

// 自動提示 v2(#129):訂閱觸發事件 + 啟動計數(規則見 supportPromptLogic.ts)
// 掛在 App 層(清單與編輯模式皆有效);匯出成功的通知由 ExportDialog 發出。
export function SupportAutoPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const off = onSupportPrompt(() => setOpen(true));
    countLaunch(); // 每次 App 啟動計一次(module 旗標防重掛重複計數)
    return off;
  }, []);

  if (!open) return null;
  return createPortal(
    <SupportDialog onClose={() => setOpen(false)} />,
    document.body,
  );
}
