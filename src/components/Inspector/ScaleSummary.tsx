import { useState } from 'react';
import { useGenogramStore } from '../../store/genogramStore';
import { BUILT_IN_SCALES } from '../Scales/registry';
import type { ScaleResult } from '../../types/genogram';
import { useT } from '../../i18n';

const levelColorMap = {
  green: '#34c759',
  yellow: '#ff9500',
  red: '#ff3b30',
} as const;

/**
 * Tab2 內顯示「量表施測歷次紀錄」摘要。
 * 每個 scale 一個區塊:最新分數 + 點開展看歷次。
 */
export default function ScaleSummary() {
  const t = useT();
  const currentCase = useGenogramStore((s) => s.currentCase);
  const removeScaleResult = useGenogramStore((s) => s.removeScaleResult);
  const [expandedScaleId, setExpandedScaleId] = useState<string | null>(null);

  const allResults = currentCase?.scaleResults ?? [];

  // 按 scaleId 分組
  const byScale = new Map<string, ScaleResult[]>();
  allResults.forEach((r) => {
    const list = byScale.get(r.scaleId) ?? [];
    list.push(r);
    byScale.set(r.scaleId, list);
  });
  // 每組按日期降序
  byScale.forEach((list) => list.sort((a, b) => (a.date < b.date ? 1 : -1)));

  if (allResults.length === 0) {
    return (
      <div
        style={{
          fontSize: 12,
          color: '#86868b',
          padding: 8,
          background: '#f5f5f7',
          borderRadius: 6,
        }}
      >
        {t('scaleSummary.empty')}
      </div>
    );
  }

  return (
    <div>
      {Array.from(byScale.entries()).map(([scaleId, results]) => {
        const meta = BUILT_IN_SCALES.find((s) => s.id === scaleId);
        const latest = results[0];
        const expanded = expandedScaleId === scaleId;
        return (
          <div
            key={scaleId}
            style={{
              marginBottom: 8,
              border: '1px solid #e5e5e7',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            {/* Header:最新分數 */}
            <div
              onClick={() =>
                setExpandedScaleId(expanded ? null : scaleId)
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                cursor: 'pointer',
                background: '#fafafa',
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background:
                    levelColorMap[latest.levelColor ?? 'green'],
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1d1d1f',
                  }}
                >
                  {meta?.name ?? scaleId}
                </div>
                <div style={{ fontSize: 11, color: '#86868b' }}>
                  {t('scaleSummary.latest')}:{latest.date} · {latest.totalScore} {t('scaleSummary.points')} ·{' '}
                  {latest.level}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#86868b' }}>
                {expanded ? '▾' : '▸'}
                <span style={{ marginLeft: 4 }}>
                  {results.length} {t('scaleSummary.times')}
                </span>
              </div>
            </div>
            {/* 歷次列表 */}
            {expanded && (
              <div style={{ borderTop: '1px solid #e5e5e7' }}>
                {results.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      borderBottom: '1px solid #f0f0f3',
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background:
                          levelColorMap[r.levelColor ?? 'green'],
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#1d1d1f' }}>
                        {r.date} · {r.totalScore} {t('scaleSummary.points')} · {r.level}
                      </div>
                      {r.notes && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#86868b',
                            marginTop: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {r.notes}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeScaleResult(r.id)}
                      title={t('scaleSummary.deleteRecord')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ff3b30',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: 4,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
