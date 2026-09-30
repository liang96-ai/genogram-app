import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import { useT } from '../../i18n';
import { useGenogramStore } from '../../store/genogramStore';
import {
  buildPlan,
  CHIP_CYCLE,
  conflictKey,
  diseaseKey,
  parseQuickText,
  pickAnchorId,
  type ApplyDecisions,
  type ConflictField,
  type LinePlan,
  type ParsedToken,
  type SkipReason,
  type TokenOverrides,
} from '../../services/quickBuild';
import { executeQuickBuild } from '../../services/quickBuildExecutor';
import { emitTourEvent } from '../../services/uiEvents';
import Icon from '../ui/Icon';

/**
 * 快速建立家庭 —— 逐行輸入「稱謂 年齡 電話 疾病 狀態」自動畫出家系圖。
 *
 * 兩件事情要記得(不然會誤導使用者):
 *  1. 預覽與執行共用同一個走路器(quickBuild.walkPath)→ 預告說什麼就會發生什麼
 *  2. 位置 / 佈局 / 自動錯層全部由既有 store actions 繼承,本檔零幾何程式碼
 * 100% 在地運算:字典寫死在 quickBuild.ts,無任何網路請求。
 */
export default function QuickBuildDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const currentCase = useGenogramStore((s) => s.currentCase);
  const showConfirm = useGenogramStore((s) => s.showConfirm);
  const diseaseHistory = useGenogramStore((s) => s.diseaseHistory);

  const persons = useMemo(() => currentCase?.persons ?? [], [currentCase]);
  const lines = useMemo(() => currentCase?.lines ?? [], [currentCase]);

  const [text, setText] = useState('');
  /** debounce 後的文字 —— 解析 300ms 才跑一次,打字不卡 */
  const [debounced, setDebounced] = useState('');
  const [overrides, setOverrides] = useState<TokenOverrides>({});
  const [decisions, setDecisions] = useState<ApplyDecisions>({});
  const [anchorId, setAnchorId] = useState<string>(
    () => pickAnchorId(persons) ?? '',
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(text), 300);
    return () => window.clearTimeout(id);
  }, [text]);

  // 有輸入時關閉先確認(2026-08-27 決議)—— 打了十行家庭描述,手滑 Esc / 點到外面就全蒸發
  const requestClose = useCallback(async () => {
    if (!text.trim()) {
      onClose();
      return;
    }
    const ok = await showConfirm(t('quickBuild.discardConfirm'), {
      yes: t('quickBuild.discardYes'),
      no: t('quickBuild.discardNo'),
      tone: 'normal',
    });
    if (ok) onClose();
  }, [text, onClose, showConfirm, t]);

  const plan = useMemo(
    () =>
      buildPlan({
        parsedLines: parseQuickText(debounced, diseaseHistory, overrides),
        persons,
        lines,
        anchorId: anchorId || null,
      }),
    [debounced, diseaseHistory, overrides, persons, lines, anchorId],
  );

  const personLabel = (id: string) => {
    const p = persons.find((x) => x.id === id);
    if (!p) return id;
    const name = p.basicInfo?.name?.trim();
    if (name) return name;
    const idx = persons.findIndex((x) => x.id === id) + 1;
    return t('quickBuild.unnamed', { n: idx });
  };

  const cycleToken = (lineNo: number, tokenIndex: number, cur: string) => {
    const i = CHIP_CYCLE.indexOf(cur as (typeof CHIP_CYCLE)[number]);
    const next = CHIP_CYCLE[(i + 1) % CHIP_CYCLE.length];
    setOverrides((o) => ({ ...o, [`${lineNo}:${tokenIndex}`]: next }));
  };

  const buildable = plan.plans.filter((p) => p.status !== 'skip');

  const onBuild = () => {
    if (!anchorId || busy || buildable.length === 0) return;
    setBusy(true);
    const r = executeQuickBuild(plan.plans, anchorId, decisions);
    setBusy(false);
    if (!r.ok) {
      window.alert(t('quickBuild.failed'));
      return;
    }
    emitTourEvent('quickBuildApplied');
    onClose();
  };

  return (
    <Modal
      onClose={() => void requestClose()}
      bare
      cardStyle={{
        width: 640,
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 40px)',
        background: '#ffffff',
        borderRadius: 14,
        boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'inherit',
      }}
      overlayStyle={{ background: 'rgba(0,0,0,0.5)' }}
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
            <Icon name="bolt" size={18} style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 6, color: '#f5a623' }} />{t('quickBuild.title')}
          </div>
          <button
            onClick={() => void requestClose()}
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

        {/* ── 內容(可捲動)── */}
        <div style={{ padding: '0 20px', overflowY: 'auto', flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              color: '#6e6e73',
              lineHeight: 1.6,
              marginBottom: 12,
            }}
          >
            {t('quickBuild.desc')}
          </div>

          {/* 錨點 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 12, color: '#1d1d1f', fontWeight: 500 }}>
              {t('quickBuild.anchor')}
            </span>
            <select
              value={anchorId}
              onChange={(e) => setAnchorId(e.target.value)}
              style={{
                padding: '5px 8px',
                fontSize: 13,
                border: '1px solid #d2d2d7',
                borderRadius: 6,
                fontFamily: 'inherit',
                background: '#ffffff',
                color: '#1d1d1f',
              }}
            >
              <option value="">{t('quickBuild.anchorNone')}</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {personLabel(p.id)}
                  {p.isProband ? ' ★' : ''}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: '#86868b' }}>
              {t('quickBuild.anchorHint')}
            </span>
          </div>

          {/* 輸入 */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={t('quickBuild.placeholder')}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 14,
              lineHeight: 1.7,
              border: '1px solid #d2d2d7',
              borderRadius: 8,
              fontFamily: 'inherit',
              color: '#1d1d1f',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />

          <div
            style={{
              fontSize: 11,
              color: '#bf5700',
              marginTop: 6,
              lineHeight: 1.6,
            }}
          >
            <Icon name="warning" size={14} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} />{t('quickBuild.repeatWarning')}
          </div>

          {/* 預覽 */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#1d1d1f',
              margin: '16px 0 8px',
            }}
          >
            {t('quickBuild.preview')}
          </div>

          {plan.plans.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: '#86868b',
                padding: '18px 0 24px',
                textAlign: 'center',
              }}
            >
              {t('quickBuild.empty')}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                paddingBottom: 12,
              }}
            >
              {plan.plans.map((p) => (
                <PlanCard
                  key={p.parsed.lineNo}
                  plan={p}
                  t={t}
                  decisions={decisions}
                  setDecisions={setDecisions}
                  onCycle={cycleToken}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 20px 16px',
            borderTop: '1px solid #f0f0f2',
          }}
        >
          <button
            onClick={() => void requestClose()}
            style={{
              padding: '8px 18px',
              fontSize: 14,
              background: '#ffffff',
              border: '1px solid #d2d2d7',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: '#1d1d1f',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onBuild}
            disabled={!anchorId || buildable.length === 0 || busy}
            style={{
              padding: '8px 18px',
              fontSize: 14,
              background: '#007aff',
              border: 'none',
              borderRadius: 6,
              cursor:
                anchorId && buildable.length > 0 && !busy
                  ? 'pointer'
                  : 'not-allowed',
              fontFamily: 'inherit',
              color: '#ffffff',
              fontWeight: 500,
              opacity: anchorId && buildable.length > 0 && !busy ? 1 : 0.4,
            }}
          >
            {t('quickBuild.build', { n: buildable.length })}
          </button>
        </div>
    </Modal>
  );
}

// ==================== 預覽卡片 ====================

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  create: { bg: '#e6f4ea', fg: '#137333' },
  update: { bg: '#e8f0fe', fg: '#1a56c4' },
  skip: { bg: '#fdecea', fg: '#c5221f' },
};

const CHIP_STYLE: Record<string, { bg: string; fg: string }> = {
  relation: { bg: '#eef1ff', fg: '#3b4ba8' },
  age: { bg: '#f2f2f4', fg: '#1d1d1f' },
  lifeSpan: { bg: '#f2f2f4', fg: '#6e6e73' },
  phone: { bg: '#f2f2f4', fg: '#1d1d1f' },
  disease: { bg: '#fff3e0', fg: '#a45700' },
  name: { bg: '#e8f5e9', fg: '#1b5e20' },
  note: { bg: '#f5f5f7', fg: '#86868b' },
  deceased: { bg: '#f2f2f4', fg: '#1d1d1f' },
  divorced: { bg: '#f2f2f4', fg: '#1d1d1f' },
  unsupported: { bg: '#fdecea', fg: '#c5221f' },
};

function PlanCard({
  plan,
  t,
  decisions,
  setDecisions,
  onCycle,
}: {
  plan: LinePlan;
  t: (key: string, vars?: Record<string, string | number>) => string;
  decisions: ApplyDecisions;
  setDecisions: React.Dispatch<React.SetStateAction<ApplyDecisions>>;
  onCycle: (lineNo: number, tokenIndex: number, cur: string) => void;
}) {
  const { parsed, status } = plan;
  const skipReasonText = (r: SkipReason | undefined) =>
    t(`quickBuild.skip.${r ?? 'op-failed'}`);

  const statusLabel =
    status === 'skip'
      ? t('quickBuild.status.skip')
      : status === 'create'
        ? t('quickBuild.status.create')
        : plan.targetIsNewInBatch
          ? t('quickBuild.status.fillIn')
          : t('quickBuild.status.update');

  const s = STATUS_STYLE[status];

  return (
    <div
      style={{
        border: `1px solid ${status === 'skip' ? '#f5c6c2' : '#e5e4e7'}`,
        background: status === 'skip' ? '#fffafa' : '#ffffff',
        borderRadius: 8,
        padding: '8px 10px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            background: s.bg,
            color: s.fg,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {statusLabel}
        </span>
        {parsed.relation && (
          <span style={{ fontSize: 13, color: '#1d1d1f', fontWeight: 500 }}>
            {parsed.relation.canonical}
          </span>
        )}
        {status === 'skip' && (
          <span style={{ fontSize: 11, color: '#c5221f' }}>
            {skipReasonText(plan.skipReason)}
          </span>
        )}
      </div>

      {/* token chips */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          marginTop: 6,
        }}
      >
        {parsed.tokens.map((tk: ParsedToken, i) => {
          const c = CHIP_STYLE[tk.kind] ?? CHIP_STYLE.note;
          return (
            <span
              key={i}
              onClick={
                tk.switchable
                  ? () => onCycle(parsed.lineNo, i, tk.kind)
                  : undefined
              }
              title={
                tk.switchable
                  ? t('quickBuild.chipHint', {
                      kind: t(`quickBuild.kind.${tk.kind}`),
                    })
                  : t(`quickBuild.kind.${tk.kind}`)
              }
              style={{
                fontSize: 11,
                padding: '2px 7px',
                borderRadius: 10,
                background: c.bg,
                color: c.fg,
                cursor: tk.switchable ? 'pointer' : 'default',
                border: tk.switchable ? '1px dashed #d2d2d7' : '1px solid transparent',
                userSelect: 'none',
              }}
            >
              {tk.raw}
              <span style={{ opacity: 0.6, marginLeft: 4 }}>
                {t(`quickBuild.kind.${tk.kind}`)}
              </span>
            </span>
          );
        })}
      </div>

      {/* 一併建立 */}
      {plan.alsoCreates.length > 0 && (
        <div style={{ fontSize: 11, color: '#a45700', marginTop: 6 }}>
          ➕ {t('quickBuild.alsoCreates', { n: plan.alsoCreates.length })}
        </div>
      )}

      {/* 衝突逐項勾選 */}
      {plan.conflicts.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 11, color: '#1d1d1f', fontWeight: 500 }}>
            {t('quickBuild.conflictTitle')}
          </div>
          {plan.conflicts.map((c) => {
            const key = conflictKey(parsed.lineNo, c.field as ConflictField);
            const checked = decisions[key] !== false;
            return (
              <label
                key={c.field}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: '#3a3a3c',
                  marginTop: 3,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setDecisions((d) => ({ ...d, [key]: e.target.checked }))
                  }
                />
                <span>
                  {t(`quickBuild.field.${c.field}`)}:{' '}
                  <s style={{ color: '#86868b' }}>{c.oldValue}</s> →{' '}
                  <b>{c.newValue}</b>
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* 疾病累加 */}
      {plan.newDiseases.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 11, color: '#1d1d1f', fontWeight: 500 }}>
            {t('quickBuild.diseaseTitle')}
          </div>
          {plan.newDiseases.map((d) => {
            const key = diseaseKey(parsed.lineNo, d);
            const checked = decisions[key] !== false;
            return (
              <label
                key={d}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: '#3a3a3c',
                  marginRight: 10,
                  marginTop: 3,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setDecisions((dc) => ({ ...dc, [key]: e.target.checked }))
                  }
                />
                {d}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
