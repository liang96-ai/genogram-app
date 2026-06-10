import { useEffect, useState } from 'react';
import { useT } from '../../i18n';

type Props = {
  onConfirm: (count: number, type: 'fraternal' | 'identical') => void;
  onCancel: () => void;
};

export default function TwinDialog({ onConfirm, onCancel }: Props) {
  const t = useT();
  const [count, setCount] = useState(2);
  const [zygosity, setZygosity] = useState<'fraternal' | 'identical'>(
    'fraternal',
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm(count, zygosity);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, zygosity, onCancel, onConfirm]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 20,
          width: 280,
          boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 14,
            color: '#1d1d1f',
          }}
        >
          {t('twin.howMany')}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 6,
          }}
        >
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 14,
                borderRadius: 6,
                border:
                  count === n
                    ? '1.5px solid #007aff'
                    : '1px solid #d2d2d7',
                background: count === n ? '#e8f1ff' : '#fff',
                color: count === n ? '#007aff' : '#1d1d1f',
                fontWeight: count === n ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            min={2}
            max={15}
            value={count > 4 ? count : ''}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 2 && v <= 15) setCount(v);
              else if (e.target.value === '') setCount(2);
            }}
            placeholder="5–15"
            style={{
              flex: 1.2,
              padding: '10px 6px',
              fontSize: 14,
              borderRadius: 6,
              border:
                count > 4
                  ? '1.5px solid #007aff'
                  : '1px solid #d2d2d7',
              background: count > 4 ? '#e8f1ff' : '#fff',
              color: count > 4 ? '#007aff' : '#1d1d1f',
              fontWeight: count > 4 ? 600 : 400,
              textAlign: 'center',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#86868b',
            marginBottom: 16,
          }}
        >
          {t('twin.maxLimit')}
        </div>

        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 8,
            color: '#1d1d1f',
          }}
        >
          {t('twin.type')}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {(
            [
              { v: 'fraternal' as const, label: t('twin.fraternal') },
              { v: 'identical' as const, label: t('twin.identical') },
            ]
          ).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setZygosity(opt.v)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 13,
                borderRadius: 6,
                border:
                  zygosity === opt.v
                    ? '1.5px solid #007aff'
                    : '1px solid #d2d2d7',
                background: zygosity === opt.v ? '#e8f1ff' : '#fff',
                color: zygosity === opt.v ? '#007aff' : '#1d1d1f',
                fontWeight: zygosity === opt.v ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              border: '1px solid #d2d2d7',
              borderRadius: 6,
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onConfirm(count, zygosity)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              border: 'none',
              borderRadius: 6,
              background: '#007aff',
              color: '#fff',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
