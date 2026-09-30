// 第一次打開的歡迎卡(1.6.0):把「隱私說明 → 選資料夾 → 取名字 → 教學」四關合成一張。
// 第一印象只給一個彈窗(web-app-lessons 第 8 條);隱私說明濃縮成三句,完整版點連結看。
import { useT } from '../../i18n';
import Modal from '../ui/Modal';
import Icon, { BrandMark } from '../ui/Icon';

type Props = {
  /** 電腦版 Chrome / Edge 才有的備份資料夾 */
  folderSupported: boolean;
  onStart: () => void;
  onPickFolderFirst: () => void;
  onLater: () => void;
  onShowPrivacyDetails: () => void;
};

export default function WelcomeCard({ folderSupported, onStart, onPickFolderFirst, onLater, onShowPrivacyDetails }: Props) {
  const t = useT();
  const points = [t('welcome.point1'), t('welcome.point2'), t('welcome.point3')];
  return (
    <Modal
      onClose={() => {}}
      closeOnBackdrop={false}
      closeOnEsc={false}
      bare
      ariaLabel={t('welcome.title')}
      overlayStyle={{ background: 'rgba(0,0,0,0.45)', padding: 20 }}
      cardStyle={{
        background: '#ffffff',
        padding: '26px 26px 20px',
        borderRadius: 16,
        maxWidth: 440,
        width: '100%',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        display: 'grid',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BrandMark size={40} />
        <div style={{ fontSize: 19, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.35 }}>{t('welcome.title')}</div>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
        {points.map((p) => (
          <li key={p} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, color: '#3a3a3c', lineHeight: 1.55 }}>
            <Icon name="check" size={17} style={{ color: '#1a7a3f', marginTop: 2 }} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onShowPrivacyDetails}
        style={{ justifySelf: 'start', padding: 0, background: 'transparent', border: 'none', color: '#007aff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {t('welcome.privacyDetails')}
      </button>
      <button
        onClick={onStart}
        style={{
          padding: '12px 16px',
          background: '#007aff',
          color: '#ffffff',
          border: 'none',
          borderRadius: 12,
          fontSize: 15.5,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {t('welcome.start')}
      </button>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
        {folderSupported && (
          <button onClick={onPickFolderFirst} style={secondary}>
            {t('welcome.folderFirst')}
          </button>
        )}
        <button onClick={onLater} style={{ ...secondary, color: '#6e6e73' }}>
          {t('welcome.later')}
        </button>
      </div>
    </Modal>
  );
}

const secondary: React.CSSProperties = {
  padding: 0,
  background: 'transparent',
  border: 'none',
  color: '#007aff',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
