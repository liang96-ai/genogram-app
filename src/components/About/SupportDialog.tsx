import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../../i18n';

/**
 * 抖內 / 支持 小視窗(個人隨喜)v3(#129 → 2026-06-17 UI 改版)+ 入口:
 *   - SupportButton:常駐入口,改「暖色藥丸 🧋」讓人看得出可按 + 看得懂意圖
 *       size='sm' 編輯工具列(短:🧋 支持)/ size='lg' 首頁(長:🧋 請我喝飲料)
 *   - SupportAutoPrompt:訂閱 supportPromptLogic 的「價值時刻」觸發
 *
 * 彈窗版型(v3):
 *   故事框(咖啡廳研發,建立給錢的意義)+ 設定列卡片(圖示+兩行+「›」一看就可點)。
 *   金額不寫死數字(ECPay 本來就自填),靠故事讓人自己想像;時區決定兩列排序。
 * 隱私:計數只存 localStorage,不上傳;文案永不顯示次數。
 */

import { countLaunch, onSupportPrompt } from './supportPromptLogic';

const KOFI_URL = 'https://ko-fi.com/liang96';
const ECPAY_URL = 'https://p.ecpay.com.tw/39E7770';

// 人在台灣 → 咖啡(ECPay,ATM/超商要人在台)列排前;其他時區 → Ko-fi 列排前。
// 未來多國:這裡擴成「時區 → 管道」對照表(配合 #95 國際化)。
function isTaiwanTimezone(): boolean {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Taipei';
  } catch {
    return true; // 偵測失敗 → 預設台灣版(主要受眾)
  }
}
const IS_TW = isTaiwanTimezone();

// 設定列風格的可點卡片:圓形圖示 + 兩行文字 + 右箭頭「›」→ 一看就知道整列可點、會跳轉
function DonateRow({
  icon,
  iconBg,
  title,
  sub,
  url,
}: {
  icon: string;
  iconBg: string;
  title: string;
  sub: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 13px',
        border: '1px solid #d2d2d7',
        borderRadius: 11,
        background: '#ffffff',
        textDecoration: 'none',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9f9fb')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
    >
      <span
        style={{
          width: 36,
          height: 36,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: iconBg,
          borderRadius: '50%',
          fontSize: 18,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, textAlign: 'left' }}>
        <span
          style={{
            display: 'block',
            fontSize: 13.5,
            fontWeight: 600,
            color: '#1d1d1f',
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 11,
            color: '#86868b',
            lineHeight: 1.5,
            marginTop: 1,
          }}
        >
          {sub}
        </span>
      </span>
      <span
        aria-hidden="true"
        style={{ color: '#c7c7cc', fontSize: 22, flexShrink: 0, lineHeight: 1 }}
      >
        ›
      </span>
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

  const coffeeRow = {
    icon: '☕',
    iconBg: '#faeeda',
    title: t('donate.rowCoffeeTitle'),
    sub: t('donate.rowCoffeeSub'),
    url: ECPAY_URL,
  };
  const kofiRow = {
    icon: '🌍',
    iconBg: '#f0f0f5',
    title: t('donate.rowKofiTitle'),
    sub: t('donate.rowKofiSub'),
    url: KOFI_URL,
  };
  // 時區決定排序:台灣 → 咖啡(ECPay)在前;海外 → Ko-fi 在前
  const rows = IS_TW ? [coffeeRow, kofiRow] : [kofiRow, coffeeRow];

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
          padding: '24px 22px 20px',
          borderRadius: 16,
          maxWidth: 360,
          width: '100%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 30, marginBottom: 10, lineHeight: 1 }}>☕</div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#1d1d1f',
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          {t('support.heading')}
        </div>

        {/* 故事框 — 建立「給錢的意義」,讓人自己想像咖啡廳的花費 */}
        <div
          style={{
            background: '#faeeda',
            color: '#854f0b',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 13,
            lineHeight: 1.7,
            marginBottom: 16,
            whiteSpace: 'pre-line',
          }}
        >
          {t('support.story')}
        </div>

        {/* 可點的設定列卡片 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 16,
          }}
        >
          {rows.map((r) => (
            <DonateRow key={r.url} {...r} />
          ))}
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

// 常駐入口:暖色藥丸 🧋(看得出可按 + 看得懂意圖);size 決定文字長短
export function SupportButton({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const label = size === 'lg' ? t('support.entryLong') : t('support.entryShort');

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={t('support.openButton')}
        aria-label={t('support.openButton')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: size === 'lg' ? '8px 16px' : '5px 12px',
          background: '#faeeda',
          color: '#854f0b',
          border: '1px solid #e3cb95', // 細暖框:讓藥丸看得出可按(2026-06-17)
          borderRadius: 999,
          fontSize: size === 'lg' ? 14 : 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f3dcb0')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#faeeda')}
      >
        {label}
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
