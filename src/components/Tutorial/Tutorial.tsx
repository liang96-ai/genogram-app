import { useEffect, useState } from 'react';
import { getBasicSteps, getAdvancedSteps } from './tutorialSteps';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';

export type TutorialLevel = 'basic' | 'advanced';

const BASIC_SEEN_KEY = 'genogram_tutorial_basic_seen';

export function markTutorialSeen() {
  try {
    localStorage.setItem(BASIC_SEEN_KEY, '1');
  } catch {
    // ignore localStorage failures (e.g., private mode)
  }
}

export function hasTutorialBeenSeen(): boolean {
  try {
    return localStorage.getItem(BASIC_SEEN_KEY) === '1';
  } catch {
    return true; // 抓不到 storage 就當已看過,免重複跳
  }
}

export default function Tutorial({
  onClose,
  level = 'basic',
}: {
  onClose: () => void;
  level?: TutorialLevel;
}) {
  const [step, setStep] = useState(0);
  const t = useT();
  const language = useGenogramStore((s) => s.language);
  const STEPS =
    level === 'advanced'
      ? getAdvancedSteps(language)
      : getBasicSteps(language);
  const total = STEPS.length;
  const cur = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === total - 1;

  // 切換 level 時重置
  useEffect(() => {
    setStep(0);
  }, [level]);

  // 鍵盤:Esc 關閉,左右鍵切換
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (level === 'basic') markTutorialSeen();
        onClose();
      }
      if (e.key === 'ArrowRight' && !isLast) {
        setStep((s) => s + 1);
      }
      if (e.key === 'ArrowLeft' && !isFirst) {
        setStep((s) => s - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFirst, isLast, onClose, level]);

  const handleClose = () => {
    if (level === 'basic') markTutorialSeen();
    onClose();
  };

  const next = () => {
    if (isLast) {
      handleClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  const levelBadge =
    level === 'advanced' ? t('tutorial.levelAdvanced') : t('tutorial.levelBasic');
  const accent = level === 'advanced' ? '#34c759' : '#007aff';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 40px)',
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            height: 4,
            background: '#f0f0f5',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${((step + 1) / total) * 100}%`,
              background: accent,
              transition: 'width 0.2s',
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 8px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 600,
                color: '#ffffff',
                background: accent,
                borderRadius: 10,
                letterSpacing: 0.5,
              }}
            >
              {levelBadge}
            </span>
            <span style={{ fontSize: 11, color: '#86868b' }}>
              {t('tutorial.progress', { current: step + 1, total })}
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              background: 'transparent',
              border: 'none',
              color: '#86868b',
              cursor: 'pointer',
              borderRadius: 4,
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = '#f5f5f7')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            {t('tutorial.skip')} ✕
          </button>
        </div>

        {/* Title */}
        <div
          style={{
            padding: '0 20px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 28 }}>{cur.icon}</span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#1d1d1f',
            }}
          >
            {cur.title}
          </span>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '8px 20px 20px',
            overflowY: 'auto',
            flex: 1,
            minHeight: 160,
          }}
        >
          {cur.content}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid #f0f0f5',
            flexShrink: 0,
          }}
        >
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 5 }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                title={t('tutorial.stepNum', { n: i + 1 })}
                style={{
                  width: 7,
                  height: 7,
                  padding: 0,
                  border: 'none',
                  borderRadius: '50%',
                  background: i === step ? accent : '#d2d2d7',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={isFirst}
              style={{
                padding: '7px 14px',
                fontSize: 13,
                background: '#ffffff',
                border: '1px solid #d2d2d7',
                borderRadius: 6,
                cursor: isFirst ? 'not-allowed' : 'pointer',
                color: isFirst ? '#c7c7cc' : '#1d1d1f',
                fontFamily: 'inherit',
                opacity: isFirst ? 0.5 : 1,
              }}
            >
              {t('tutorial.prev')}
            </button>
            <button
              onClick={next}
              style={{
                padding: '7px 18px',
                fontSize: 13,
                background: accent,
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              {isLast ? t('tutorial.done') : t('tutorial.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
