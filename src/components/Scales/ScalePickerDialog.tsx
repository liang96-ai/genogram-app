import { useEffect, useMemo, useState } from 'react';
import { useT } from '../../i18n';
import { useGenogramStore } from '../../store/genogramStore';
import { getScalesByCategory } from './registry';

/**
 * 評估工具彈窗 —— 取代編輯器漢堡選單裡的 7 層巢狀子選單。
 *
 * 為什麼改成彈窗:7 個分類各自展開子選單,把整個選單撐得又長又難掃視,
 * 而且滑鼠一離開就收起來。彈窗給得起「分類 → 量表清單」兩欄並陳 + 搜尋。
 *
 * 邊界:只負責「挑一個量表」,挑完把 id 丟回去由既有的 ScaleDialog 施測。
 * 本檔不碰個案資料,也不碰 store。
 */
export default function ScalePickerDialog({
  onPick,
  onClose,
}: {
  onPick: (scaleId: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const groups = useMemo(() => getScalesByCategory(), []);
  // 已測次數(2026-08-27 決議)—— 選單看得出這個個案做過幾次,不用點進附件翻
  // ⚠️ selector 只取 currentCase:`?? []` 放進 selector 會每次回傳新陣列,
  //    zustand v5 直通 useSyncExternalStore 無快取 → 未施測個案無限重渲染(審查抓到的 crash)
  const currentCase = useGenogramStore((s) => s.currentCase);
  const scaleResults = currentCase?.scaleResults ?? [];
  const countFor = (scaleId: string) =>
    scaleResults.filter((r) => r.scaleId === scaleId).length;
  const [activeCat, setActiveCat] = useState(groups[0]?.category ?? '');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 有搜尋字串就跨分類全找;沒有就顯示當前分類
  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (q) {
      return groups
        .flatMap((g) => g.scales.map((s) => ({ ...s, groupLabel: g.label })))
        .filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.description ?? '').toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q),
        );
    }
    const g = groups.find((x) => x.category === activeCat);
    return (g?.scales ?? []).map((s) => ({ ...s, groupLabel: g?.label ?? '' }));
  }, [groups, activeCat, q]);

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
          width: 680,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 40px)',
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'inherit',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 8px',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f' }}>
            📋 {t('menu.assessmentTools')}
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            style={{
              width: 28,
              height: 28,
              border: 'none',
              background: '#f5f5f7',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 15,
              color: '#1d1d1f',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── 搜尋 ── */}
        <div style={{ padding: '0 20px 10px' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('scalePicker.searchPlaceholder')}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: 14,
              border: '1px solid #d2d2d7',
              borderRadius: 8,
              fontFamily: 'inherit',
              color: '#1d1d1f',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* ── 主體:左分類、右量表 ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, 0.62fr) minmax(0, 1.38fr)',
            gap: 12,
            padding: '0 20px',
            overflowY: 'auto',
            flex: 1,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {groups.map((g) => {
              const active = !q && g.category === activeCat;
              return (
                <button
                  key={g.category}
                  onClick={() => {
                    setQuery('');
                    setActiveCat(g.category);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 10px',
                    background: active ? '#eef1ff' : 'transparent',
                    border: 'none',
                    borderRadius: 7,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    color: active ? '#3b4ba8' : '#1d1d1f',
                    fontWeight: active ? 500 : 400,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 18, textAlign: 'center' }}>{g.icon}</span>
                  <span style={{ flex: 1 }}>{g.label}</span>
                  <span style={{ fontSize: 11, color: '#86868b' }}>
                    {g.scales.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}
          >
            {visible.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: '#86868b',
                  padding: '20px 0',
                  textAlign: 'center',
                }}
              >
                {t('scalePicker.noResult')}
              </div>
            ) : (
              visible.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onPick(s.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '9px 11px',
                    background: '#ffffff',
                    border: '1px solid #e5e4e7',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#f5f5f7')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = '#ffffff')
                  }
                >
                  <div
                    style={{
                      fontSize: 13.5,
                      color: '#1d1d1f',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>{s.name}</span>
                    {countFor(s.id) > 0 && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 500,
                          color: '#3b4ba8',
                          background: '#eef1ff',
                          borderRadius: 8,
                          padding: '1px 8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t('scalePicker.doneTimes', { n: countFor(s.id) })}
                      </span>
                    )}
                  </div>
                  {q && (
                    <div style={{ fontSize: 11, color: '#3b4ba8', marginTop: 2 }}>
                      {s.groupLabel}
                    </div>
                  )}
                  {s.description && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: '#6e6e73',
                        marginTop: 3,
                        lineHeight: 1.6,
                      }}
                    >
                      {s.description}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── 版權聲明:原本佔滿兩個漢堡選單的尾巴,收到這裡 ── */}
        <div
          style={{
            padding: '10px 20px 16px',
            borderTop: '1px solid #f0f0f2',
            fontSize: 10.5,
            color: '#86868b',
            lineHeight: 1.7,
          }}
        >
          {t('menu.copyrightNotice')}
        </div>
      </div>
    </div>
  );
}
