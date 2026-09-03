import { useGenogramStore } from '../store/genogramStore';
import Modal from './ui/Modal';
import { useT } from '../i18n';

export default function ConfirmDialog() {
  const confirmState = useGenogramStore((s) => s.confirmState);
  const t = useT();

  if (!confirmState) return null;

  const { message, onYes, onNo, yesLabel, noLabel, tone } = confirmState;
  const danger = tone !== 'normal'; // 預設仍是刪除語氣,既有呼叫端不受影響
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  return (
    <Modal
      onClose={onNo}
      level="confirm"
      closeOnBackdrop={false}
      bare
      ariaLabel="confirm"
      overlayStyle={{ background: 'rgba(0,0,0,0.35)' }}
      cardStyle={{
        background: '#ffffff',
        borderRadius: 12,
        padding: 24,
        minWidth: 320,
        maxWidth: 440,
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
      }}
    >
        <div
          style={{
            fontSize: 14,
            color: '#1d1d1f',
            marginBottom: 16,
            lineHeight: 1.6,
            whiteSpace: 'pre-line', // 訊息裡的換行要保留,不然條列會擠成一坨
          }}
        >
          {message}
        </div>
        {danger && (
          <div
            style={{
              fontSize: 11,
              color: '#86868b',
              marginBottom: 16,
            }}
          >
            {t('confirm.shortcut', { mod: modKey })}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={onNo}
            autoFocus={danger}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              background: danger ? '#34c759' : '#ffffff',
              color: danger ? '#ffffff' : '#1d1d1f',
              border: danger ? 'none' : '1px solid #d2d2d7',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            {noLabel ?? t('common.no')}
          </button>
          <button
            onClick={onYes}
            autoFocus={!danger}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              background: danger ? '#ff3b30' : '#007aff',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            {yesLabel ?? t('common.yes')}
          </button>
        </div>
    </Modal>
  );
}
