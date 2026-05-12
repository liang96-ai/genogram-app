import { useEffect, useState } from 'react';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import type { Scale, ScaleAnswer } from './types';

type Props = {
  scale: Scale;
  onClose: () => void;
};

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
};
const sheet: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  width: '100%',
  maxWidth: 560,
  maxHeight: '90vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
};
const header: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid #e5e5e7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};
const body: React.CSSProperties = {
  padding: 16,
  overflowY: 'auto',
  flex: 1,
};
const footer: React.CSSProperties = {
  padding: '12px 16px',
  borderTop: '1px solid #e5e5e7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};
const primaryBtn: React.CSSProperties = {
  padding: '8px 16px',
  background: '#007aff',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 16px',
  background: 'transparent',
  color: '#1d1d1f',
  border: '1px solid #d2d2d7',
  borderRadius: 6,
  fontSize: 14,
  cursor: 'pointer',
};

export default function ScaleDialog({ scale, onClose }: Props) {
  const t = useT();
  const currentCase = useGenogramStore((s) => s.currentCase);
  const caseList = useGenogramStore((s) => s.caseList);
  const openCase = useGenogramStore((s) => s.openCase);
  const addScaleResult = useGenogramStore((s) => s.addScaleResult);

  const [answers, setAnswers] = useState<Record<string, ScaleAnswer>>({});
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  // 沒開個案時:讓使用者選一個個案儲存(或不存,只看分數)
  const [targetCaseId, setTargetCaseId] = useState<string | 'unbound'>(
    currentCase?.id ?? 'unbound',
  );

  // Esc 關閉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // boolean 題視為「未勾 = 沒此狀況 = false」,不需要使用者主動點;只 likert/choice 需要選
  const allAnswered = scale.questions.every(
    (q) => q.type === 'boolean' || answers[q.id] !== undefined,
  );
  // 計分時把未勾的 boolean 補 false
  const filledAnswers: Record<string, ScaleAnswer> = { ...answers };
  scale.questions.forEach((q) => {
    if (q.type === 'boolean' && filledAnswers[q.id] === undefined) {
      filledAnswers[q.id] = false;
    }
  });
  const result = allAnswered ? scale.scoring(filledAnswers) : null;

  const save = async () => {
    if (!result) return;
    if (targetCaseId === 'unbound') {
      // 不綁個案 → 只關閉(不存進任何個案)
      onClose();
      return;
    }
    // 綁某個案 → 切到該案再存(addScaleResult 會 patch currentCase)
    if (targetCaseId !== currentCase?.id) {
      await openCase(targetCaseId);
    }
    addScaleResult({
      scaleId: scale.id,
      date,
      answers: filledAnswers,
      totalScore: result.totalScore,
      level: result.level,
      levelColor: result.levelColor,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const levelColorMap = {
    green: '#34c759',
    yellow: '#ff9500',
    red: '#ff3b30',
  } as const;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{scale.name}</div>
            {scale.description && (
              <div style={{ fontSize: 12, color: '#86868b', marginTop: 2 }}>
                {scale.description}
              </div>
            )}
            {scale.source && (
              <div
                style={{
                  fontSize: 11,
                  color: '#86868b',
                  marginTop: 4,
                  fontStyle: 'italic',
                }}
              >
                {t('scaleDialog.source')}:{scale.source}
                {scale.licenseStatus === 'informal' && ' ' + t('scaleDialog.informalNote')}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ ...ghostBtn, padding: '4px 10px' }}
            title={t('common.close')}
          >
            ✕
          </button>
        </div>

        {scale.disabled && (
          <div style={{ ...body, textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📜</div>
            <div
              style={{
                fontSize: 14,
                color: '#1d1d1f',
                marginBottom: 8,
                fontWeight: 500,
              }}
            >
              {t('scaleDialog.disabledTitle')}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#86868b',
                lineHeight: 1.6,
                marginBottom: 12,
              }}
            >
              {scale.disabledMessage ?? t('scaleDialog.disabledDefault')}
            </div>
            {scale.officialUrl && (
              <a
                href={scale.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12,
                  color: '#007aff',
                  textDecoration: 'none',
                }}
              >
                {t('scaleDialog.gotoOfficial')}
              </a>
            )}
          </div>
        )}

        {!scale.disabled && (
        <div style={body}>
          {scale.questions.map((q, idx) => (
            <div
              key={q.id}
              style={{
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom:
                  idx < scale.questions.length - 1
                    ? '1px solid #f0f0f3'
                    : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  marginBottom: 8,
                  color: '#1d1d1f',
                  lineHeight: 1.4,
                }}
              >
                {idx + 1}. {q.text}
              </div>
              {q.type === 'likert' && (
                <div
                  style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                >
                  {Array.from(
                    { length: q.max - q.min + 1 },
                    (_, i) => i + q.min,
                  ).map((score) => {
                    const checked = answers[q.id] === score;
                    return (
                      <button
                        key={score}
                        onClick={() =>
                          setAnswers({ ...answers, [q.id]: score })
                        }
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: checked
                            ? '1.5px solid #007aff'
                            : '1px solid #d2d2d7',
                          background: checked ? '#e8f1ff' : '#ffffff',
                          color: checked ? '#007aff' : '#1d1d1f',
                          fontSize: 12,
                          cursor: 'pointer',
                          fontWeight: checked ? 500 : 400,
                        }}
                      >
                        {q.labels?.[score - q.min] ?? score}{' '}
                        <span style={{ color: '#86868b', fontSize: 11 }}>
                          ({score})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {q.type === 'boolean' && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={answers[q.id] === true}
                    onChange={(e) =>
                      setAnswers({ ...answers, [q.id]: e.target.checked })
                    }
                  />
                  <span>{t('scaleDialog.haveCondition')}</span>
                </label>
              )}
              {q.type === 'choice' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {q.choices.map((c) => {
                    const checked = answers[q.id] === c.value;
                    return (
                      <button
                        key={c.value}
                        onClick={() =>
                          setAnswers({ ...answers, [q.id]: c.value })
                        }
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: checked
                            ? '1.5px solid #007aff'
                            : '1px solid #d2d2d7',
                          background: checked ? '#e8f1ff' : '#ffffff',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* 結果預覽 */}
          {result && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 8,
                background: '#f5f5f7',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background:
                    levelColorMap[result.levelColor ?? 'green'],
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {t('scaleDialog.totalScore')}:{result.totalScore}
                </div>
                <div style={{ fontSize: 12, color: '#86868b' }}>
                  {result.level}
                </div>
              </div>
            </div>
          )}

          {/* 日期 + 備註 + 個案 */}
          {result && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    color: '#86868b',
                    minWidth: 56,
                  }}
                >
                  {t('scaleDialog.date')}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    fontSize: 13,
                    padding: '4px 8px',
                    border: '1px solid #d2d2d7',
                    borderRadius: 4,
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    color: '#86868b',
                    minWidth: 56,
                  }}
                >
                  {t('scaleDialog.saveTo')}
                </label>
                <select
                  value={targetCaseId}
                  onChange={(e) => setTargetCaseId(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: 13,
                    padding: '4px 8px',
                    border: '1px solid #d2d2d7',
                    borderRadius: 4,
                    background: '#fff',
                  }}
                >
                  <option value="unbound">{t('scaleDialog.unbound')}</option>
                  {caseList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseName}
                      {c.id === currentCase?.id ? ' ' + t('scaleDialog.currentCase') : ''}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('scaleDialog.notesPlaceholder')}
                style={{
                  width: '100%',
                  fontSize: 13,
                  padding: '6px 8px',
                  border: '1px solid #d2d2d7',
                  borderRadius: 4,
                  resize: 'vertical',
                  minHeight: 60,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
        </div>
        )}

        {!scale.disabled && (
          <div style={footer}>
            <div style={{ fontSize: 11, color: '#86868b' }}>
              {allAnswered
                ? t('scaleDialog.completed')
                : t('scaleDialog.progress', { n: Object.keys(answers).length, total: scale.questions.length })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={ghostBtn}>
                {t('common.cancel')}
              </button>
              <button
                onClick={save}
                disabled={!allAnswered}
                style={{
                  ...primaryBtn,
                  opacity: allAnswered ? 1 : 0.5,
                  cursor: allAnswered ? 'pointer' : 'not-allowed',
                }}
              >
                {targetCaseId === 'unbound' ? t('scaleDialog.complete') : t('scaleDialog.saveToCase')}
              </button>
            </div>
          </div>
        )}
        {scale.disabled && (
          <div style={footer}>
            <div style={{ flex: 1 }} />
            <button onClick={onClose} style={ghostBtn}>
              {t('common.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
