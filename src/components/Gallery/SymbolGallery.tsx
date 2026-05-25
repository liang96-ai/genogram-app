import { useMemo, useState } from 'react';
import { SYMBOLS, type SymbolCategory, type SymbolEntry } from './symbolData';
import { useT } from '../../i18n';
import { useGenogramStore } from '../../store/genogramStore';
import AcademicReferencesDialog from './AcademicReferencesDialog';

type Props = {
  onClose: () => void;
};

// 依 category 分組
function groupByCategory(items: SymbolEntry[]): [SymbolCategory, SymbolEntry[]][] {
  const map = new Map<SymbolCategory, SymbolEntry[]>();
  for (const s of items) {
    if (!map.has(s.category)) map.set(s.category, []);
    map.get(s.category)!.push(s);
  }
  return Array.from(map.entries());
}

export default function SymbolGallery({ onClose }: Props) {
  const t = useT();
  const lang = useGenogramStore((s) => s.language);
  const [query, setQuery] = useState('');
  // v1.1 學術引用彈窗 — 點頁腳 link 開啟
  const [showReferences, setShowReferences] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SYMBOLS;
    return SYMBOLS.filter((s) => {
      return (
        String(s.number).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const grouped = groupByCategory(filtered);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(900px, 94vw)',
          height: '90vh',
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
            gap: 12,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>
            {t('gallery.title')}
          </div>
          <div style={{ fontSize: 11, color: '#86868b' }}>
            {t('gallery.standard', { n: SYMBOLS.length })}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('gallery.searchPlaceholder')}
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: 13,
              border: '1px solid #d2d2d7',
              borderRadius: 6,
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              padding: 0,
              background: 'transparent',
              border: '1px solid #d2d2d7',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 16,
              color: '#1d1d1f',
            }}
            title={t('common.close')}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 18px',
            fontFamily: 'inherit',
          }}
        >
          {grouped.length === 0 && (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: '#86868b',
                fontSize: 13,
              }}
            >
              {t('gallery.noResults', { query })}
            </div>
          )}

          {grouped.map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#007aff',
                  marginBottom: 8,
                  paddingLeft: 2,
                  letterSpacing: 0.3,
                }}
              >
                {t(`symCat.${cat}`)}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 10,
                }}
              >
                {items.map((s) => (
                  <SymbolCard key={s.code} entry={s} lang={lang} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer — 學術引用 link(v1.1 拿掉 dev 註記,改成可點 link 開彈窗)*/}
        <div
          style={{
            padding: '8px 18px',
            borderTop: '1px solid #e5e4e7',
            fontSize: 12,
            color: '#86868b',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={() => setShowReferences(true)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px 4px',
              color: '#007aff',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('gallery.references')} →
          </button>
        </div>
      </div>
      {showReferences && (
        <AcademicReferencesDialog onClose={() => setShowReferences(false)} />
      )}
    </div>
  );
}

function SymbolCard({ entry, lang }: { entry: SymbolEntry; lang: 'zh' | 'en' }) {
  // en 模式:英文名當主標題,中文名當副標,description 仍是中文(只在 zh 顯示)
  const primary = lang === 'en' ? entry.nameEn : entry.name;
  const secondary = lang === 'en' ? entry.name : entry.nameEn;
  return (
    <div
      style={{
        padding: 8,
        border: '1px solid #e5e4e7',
        borderRadius: 6,
        background: '#ffffff',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontSize: 11,
      }}
      data-tooltip={`#${entry.number} ${primary}`}
    >
      <div
        style={{
          position: 'absolute',
          top: 4,
          right: 6,
          fontSize: 10,
          color: '#86868b',
          fontWeight: 600,
        }}
      >
        #{entry.number}
      </div>
      <div
        style={{
          width: 86,
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox="-44 -36 88 72"
          width={86}
          height={72}
          style={{ display: 'block' }}
        >
          {entry.render()}
        </svg>
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: '#1d1d1f',
          textAlign: 'center',
          lineHeight: 1.3,
          marginTop: 2,
        }}
      >
        {primary}
      </div>
      <div
        style={{
          fontSize: 10,
          color: '#86868b',
          textAlign: 'center',
          marginTop: 2,
        }}
      >
        {secondary}
      </div>
      {/* description 是繪圖備注(正方形/左半實心等),不顯示給使用者看 */}
    </div>
  );
}
