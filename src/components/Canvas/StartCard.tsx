// 空白畫布的起步卡(1.6.0):個案只有案主一個人時,告訴使用者下一步有兩條路。
// 有第二個人就消失;按 × 也可以收起(這個個案這次不再出現)。
import { useState } from 'react';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import { requestQuickBuild } from '../../services/uiEvents';
import Icon from '../ui/Icon';

export default function StartCard() {
  const t = useT();
  const caseId = useGenogramStore((s) => s.currentCase?.id ?? null);
  const personCount = useGenogramStore((s) => s.currentCase?.persons.length ?? 0);
  const tourActive = useGenogramStore((s) => s.tourActive);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  if (!caseId || personCount > 1 || tourActive || dismissedFor === caseId) return null;
  const selectProband = () => {
    const c = useGenogramStore.getState().currentCase;
    const p = c?.persons.find((x) => x.isProband) ?? c?.persons[0];
    if (p) useGenogramStore.getState().selectPersons([p.id]);
  };
  return (
    <div
      data-start-card
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 64,
        transform: 'translateX(-50%)',
        width: 'min(460px, calc(100% - 32px))',
        background: 'rgba(255,255,255,0.97)',
        border: '1px solid #e5e4e7',
        borderRadius: 14,
        boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
        padding: '14px 16px',
        display: 'grid',
        gap: 10,
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1d1d1f', flex: 1 }}>{t('start.title')}</span>
        <button
          onClick={() => setDismissedFor(caseId)}
          aria-label={t('common.close')}
          title={t('common.close')}
          style={{ padding: 4, background: 'transparent', border: 'none', color: '#8e8e93', cursor: 'pointer', display: 'flex' }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={selectProband} style={choice}>
          <Icon name="arrows" size={22} style={{ color: '#007aff' }} />
          <span style={{ fontWeight: 600 }}>{t('start.arrows')}</span>
          <span style={hint}>{t('start.arrowsHint')}</span>
        </button>
        <button onClick={requestQuickBuild} style={choice}>
          <Icon name="text" size={22} style={{ color: '#007aff' }} />
          <span style={{ fontWeight: 600 }}>{t('start.quickBuild')}</span>
          <span style={hint}>{t('start.quickBuildHint')}</span>
        </button>
      </div>
    </div>
  );
}

const choice: React.CSSProperties = {
  display: 'grid',
  justifyItems: 'start',
  gap: 4,
  padding: '10px 12px',
  background: '#f5f7fb',
  border: '1px solid #e3e7ef',
  borderRadius: 10,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
  fontSize: 13.5,
  color: '#1d1d1f',
};

const hint: React.CSSProperties = { fontSize: 12, color: '#6e6e73', lineHeight: 1.45 };
