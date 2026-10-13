// 首頁右下角的版本號 + 「檢查更新」(1.6.1)。
// 平常不在畫圖時會自動換新版;這顆是保底 —— 使用者覺得「怎麼還是舊版」時,一按就有答案。
import { useState } from 'react';
import { useT } from '../../i18n';
import { applyUpdate, checkForUpdate, getNeedRefresh } from '../../services/pwaUpdate';
import Icon from '../ui/Icon';

export default function VersionUpdateButton() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await checkForUpdate();
      if (r === 'update-found') {
        if (getNeedRefresh()) {
          // 新版已經下載好:使用者親手按的,直接換(不受自動更新的冷卻限制)
          setMsg(t('caseList.updateApplying'));
          applyUpdate();
          return;
        }
        setMsg(t('caseList.updateFound'));
      } else if (r === 'latest') {
        setMsg(t('caseList.updateLatest'));
      } else if (r === 'error') {
        setMsg(t('caseList.updateError'));
      } else {
        location.reload(); // 不支援 SW 的瀏覽器:重新整理就是最新版
        return;
      }
    } catch {
      setMsg(t('caseList.updateError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11.5,
        color: '#86868b',
        zIndex: 1,
      }}
    >
      {msg && <span role="status">{msg}</span>}
      <span style={{ userSelect: 'none' }}>v{__APP_VERSION__}</span>
      <button
        onClick={onClick}
        disabled={busy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 9px',
          fontSize: 11.5,
          color: '#007aff',
          background: '#ffffff',
          border: '1px solid #d2d2d7',
          borderRadius: 999,
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.6 : 1,
          fontFamily: 'inherit',
        }}
      >
        <Icon name="refresh" size={13} />
        {busy ? t('caseList.updateChecking') : t('caseList.checkUpdate')}
      </button>
    </div>
  );
}
