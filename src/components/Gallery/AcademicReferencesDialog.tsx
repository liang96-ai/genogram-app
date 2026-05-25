import { useT } from '../../i18n';

type Props = {
  onClose: () => void;
};

// 學術引用彈窗:Gallery 頁腳「📚 學術依據與引用」點開
//
// 4 個來源:
//   1. McGoldrick 4th ed (2020) — 主要,SW/家治國際標準
//   2. NSGC 2008/2022 — 醫療遺傳補充 + 註明 2022 修訂差異
//   3. Hodge 2001 — 靈性連結
//   4. Hartman 1978 — 機構/單位、生態圈
//
// 立場:不寫「依據」「授權」(易構成虛假認可),用「參考」+「主要參考來源」
// 學術引用屬 fair use,不需作者同意
export default function AcademicReferencesDialog({ onClose }: Props) {
  const t = useT();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(560px, 92vw)',
          maxHeight: '85vh',
          background: '#ffffff',
          borderRadius: 10,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e5e4e7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>
            {t('gallery.referencesDialogTitle')}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              padding: 0,
              background: 'transparent',
              border: '1px solid #d2d2d7',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 16,
              color: '#1d1d1f',
            }}
            title={t('gallery.refClose')}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            fontSize: 13,
            lineHeight: 1.55,
            color: '#1d1d1f',
          }}
        >
          {/* 1. McGoldrick — 主要 */}
          <ReferenceBlock
            primary
            line1={t('gallery.refMcgoldrick.line1')}
            line2={t('gallery.refMcgoldrick.line2')}
            tag={t('gallery.refMcgoldrick.tag')}
            note={t('gallery.refMcgoldrick.note')}
          />

          {/* 2. NSGC — 醫療遺傳補充 */}
          <ReferenceBlock
            line1={t('gallery.refNsgc.line1')}
            line2={t('gallery.refNsgc.line2')}
            tag={t('gallery.refNsgc.tag')}
            note={t('gallery.refNsgc.note')}
          />

          {/* 3. Hodge — 靈性 */}
          <ReferenceBlock
            line1={t('gallery.refHodge.line1')}
            line2={t('gallery.refHodge.line2')}
            tag={t('gallery.refHodge.tag')}
          />

          {/* 4. Hartman — 機構/生態圈 */}
          <ReferenceBlock
            line1={t('gallery.refHartman.line1')}
            line2={t('gallery.refHartman.line2')}
            tag={t('gallery.refHartman.tag')}
          />

          {/* Disclaimer */}
          <div
            style={{
              marginTop: 18,
              padding: 12,
              background: '#fff8e6',
              border: '1px solid #ffd166',
              borderRadius: 6,
              fontSize: 12,
              lineHeight: 1.55,
              color: '#7a4a00',
            }}
          >
            {t('gallery.refDisclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReferenceBlock({
  primary,
  line1,
  line2,
  tag,
  note,
}: {
  primary?: boolean;
  line1: string;
  line2: string;
  tag: string;
  note?: string;
}) {
  return (
    <div
      style={{
        marginBottom: 14,
        paddingLeft: 12,
        borderLeft: primary ? '3px solid #007aff' : '3px solid #d2d2d7',
      }}
    >
      <div style={{ fontWeight: 600, color: '#1d1d1f' }}>{line1}</div>
      <div style={{ color: '#3a3a3c', fontSize: 12, marginTop: 1 }}>{line2}</div>
      <div
        style={{
          color: primary ? '#007aff' : '#6e6e73',
          fontSize: 12,
          marginTop: 3,
          fontWeight: primary ? 500 : 400,
        }}
      >
        {tag}
      </div>
      {note && (
        <div
          style={{
            color: '#86868b',
            fontSize: 11,
            marginTop: 3,
            lineHeight: 1.5,
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}
