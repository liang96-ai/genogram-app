import { useEffect } from 'react';
import { selectRootFolder } from '../../services/fileSystem';
import { useT } from '../../i18n';

/**
 * 「選資料夾」設定畫面
 * — 使用者點「新增個案」時,若還沒設過資料夾就跳出來提醒
 * — 可選擇「選資料夾」(寫到本機資料夾)或「暫時不要」(只存瀏覽器)
 */
export default function FolderSetupModal({
  onClose,
  onSelected,
}: {
  onClose: () => void;
  onSelected: () => void;
}) {
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
        zIndex: 250,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: 'calc(100vw - 40px)',
          background: '#ffffff',
          borderRadius: 14,
          padding: 24,
          boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 4 }}>📁</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#1d1d1f',
            marginBottom: 12,
          }}
        >
          {t('folderSetup.title')}
        </div>
        <p
          style={{
            fontSize: 13,
            color: '#3a3a3c',
            lineHeight: 1.7,
            margin: '0 0 12px',
          }}
        >
          <strong style={{ color: '#007aff' }}>{t('folderSetup.lead1')}</strong>
          {t('folderSetup.lead2')}
        </p>
        <ul
          style={{
            fontSize: 12,
            color: '#3a3a3c',
            lineHeight: 1.8,
            margin: '0 0 16px',
            paddingLeft: 18,
          }}
        >
          <li>{t('folderSetup.point1')}</li>
          <li>{t('folderSetup.point2')}</li>
          <li>{t('folderSetup.point3')}</li>
          <li>{t('folderSetup.point4')}</li>
        </ul>
        <div
          style={{
            fontSize: 11,
            color: '#86868b',
            lineHeight: 1.6,
            background: '#f5f5f7',
            padding: '8px 10px',
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          {t('folderSetup.browserNote')}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              background: '#ffffff',
              border: '1px solid #d2d2d7',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#86868b',
              fontFamily: 'inherit',
            }}
          >
            {t('folderSetup.later')}
          </button>
          <button
            onClick={async () => {
              const h = await selectRootFolder();
              if (h) onSelected();
            }}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              background: '#007aff',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            {t('folderSetup.pick')}
          </button>
        </div>
      </div>
    </div>
  );
}
