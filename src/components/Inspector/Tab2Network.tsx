import { useState } from 'react';
import PinyinMatch from 'pinyin-match';
import type {
  Line,
  NetworkUnit,
  Person,
  RelationSubType,
} from '../../types/genogram';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import { SYMBOLS } from '../Gallery/symbolData';
// LineProperties 已不再嵌入 Tab2 — 線條屬性都在畫布上直接編輯
// (點兩下改備注、Tab2 關係按鈕改類型、× 按鈕刪線)

// RelationSubType ↔ symbolData code 對照表(命名不一致需要 map)
const RELATION_GROUPS: {
  groupKey: string;
  items: { subType: RelationSubType; symCode: string; labelKey: string }[];
}[] = [
  {
    groupKey: 'relation.group.positive',
    items: [
      { subType: 'connected', symCode: 'connected', labelKey: 'lineProps.subType.connected' },
      { subType: 'close', symCode: 'close', labelKey: 'lineProps.subType.close' },
      { subType: 'fused', symCode: 'fused', labelKey: 'lineProps.subType.fused' },
      { subType: 'spiritual', symCode: 'spiritual', labelKey: 'lineProps.subType.spiritual' },
    ],
  },
  {
    groupKey: 'relation.group.neutral',
    items: [
      { subType: 'distant', symCode: 'distant', labelKey: 'lineProps.subType.distant' },
      { subType: 'focus-on', symCode: 'focus', labelKey: 'lineProps.subType.focusOn' },
    ],
  },
  {
    groupKey: 'relation.group.negative',
    items: [
      { subType: 'hostile', symCode: 'hostile', labelKey: 'lineProps.subType.hostile' },
      { subType: 'close-hostile', symCode: 'close-hostile', labelKey: 'lineProps.subType.closeHostile' },
      { subType: 'negative-focus', symCode: 'neg-focus', labelKey: 'lineProps.subType.negativeFocus' },
    ],
  },
  {
    groupKey: 'relation.group.violence',
    items: [
      { subType: 'physical-abuse', symCode: 'phy-abuse', labelKey: 'lineProps.subType.physicalAbuse' },
      { subType: 'emotional-abuse', symCode: 'emo-abuse', labelKey: 'lineProps.subType.emotionalAbuse' },
      { subType: 'sexual-abuse', symCode: 'sex-abuse', labelKey: 'lineProps.subType.sexualAbuse' },
    ],
  },
  {
    groupKey: 'relation.group.cutoff',
    items: [
      { subType: 'caregiver', symCode: 'caregiver', labelKey: 'lineProps.subType.caregiver' },
      { subType: 'cutoff', symCode: 'cutoff', labelKey: 'lineProps.subType.cutoff' },
      { subType: 'cutoff-repaired', symCode: 'cutoff-rep', labelKey: 'lineProps.subType.cutoffRepaired' },
    ],
  },
];

type Props = {
  person: Person;
  lineTarget?: Line | null;
};

const SUGGESTIONS = [
  '學校',
  '醫院',
  '診所',
  '社會局',
  '社福中心',
  '教會',
  '警局',
  '法院',
  '心衛中心',
  '長照機構',
  '早療中心',
  '家暴防治中心',
  '兒少保護單位',
  '觀護所',
  '庇護所',
  '職場',
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\uFF01-\uFF5E]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0),
    )
    .replace(/\u3000/g, ' ');
}

function fuzzyMatch(query: string, candidate: string): boolean {
  if (!query) return true;
  const q = normalize(query.trim());
  if (!q) return true;
  if (normalize(candidate).includes(q)) return true;
  return PinyinMatch.match(candidate, q) !== false;
}

export default function Tab2Network({ person, lineTarget }: Props) {
  const t = useT();
  const currentCase = useGenogramStore((s) => s.currentCase);
  const addNetworkUnit = useGenogramStore((s) => s.addNetworkUnit);
  const updateNetworkUnit = useGenogramStore((s) => s.updateNetworkUnit);
  const removeNetworkUnit = useGenogramStore((s) => s.removeNetworkUnit);
  const toggleNetworkUnitActive = useGenogramStore(
    (s) => s.toggleNetworkUnitActive,
  );
  const showConfirm = useGenogramStore((s) => s.showConfirm);
  const institutionHistory = useGenogramStore((s) => s.institutionHistory);
  const removeFromInstitutionHistory = useGenogramStore(
    (s) => s.removeFromInstitutionHistory,
  );
  const setPendingRelation = useGenogramStore((s) => s.setPendingRelation);
  const pendingRelation = useGenogramStore((s) => s.pendingRelation);
  const updateLine = useGenogramStore((s) => s.updateLine);
  const toggleAllRelationLinesPrivate = useGenogramStore(
    (s) => s.toggleAllRelationLinesPrivate,
  );
  const selectedConnector = useGenogramStore((s) => s.selectedConnector);
  const setConnectorSubType = useGenogramStore((s) => s.setConnectorSubType);
  // 取得目前選中 connector 物件(若有)
  const connectorTarget = (() => {
    if (!selectedConnector) return null;
    const unit = currentCase?.networkUnits?.find(
      (u) => u.id === selectedConnector.unitId,
    );
    if (!unit) return null;
    const conn = (unit.connectors ?? []).find(
      (c) => c.id === selectedConnector.connectorId,
    );
    return conn ? { unit, conn } : null;
  })();

  // 全圖所有關係線(case-wide,不限定特定人物)
  const allCaseRelationLines =
    currentCase?.lines.filter((l) => l.category === 'relation') ?? [];
  const allRelationLinesPrivate =
    allCaseRelationLines.length > 0 &&
    allCaseRelationLines.every((l) => !!l.private);

  // 點關係線按鈕的行為:
  //  - 選中現有 line → 直接改該線的 subType(自動切 category)
  //  - 選中 person → 進入 pending mode,等使用者點下一人完成
  const onPickRelation = (subType: RelationSubType) => {
    // 優先順序:選中 connector > 選中 relation line > 進 pending mode
    if (connectorTarget) {
      setConnectorSubType(
        connectorTarget.unit.id,
        connectorTarget.conn.id,
        subType,
      );
      if (pendingRelation) setPendingRelation(null);
      return;
    }
    // 安全閘:只有 relation line 才能被改 subType。
    // member line(婚姻/親子)走另一個 toggle(solid/dashed),不歸 Tab2 管。
    // Inspector 端已經過濾過一次,這裡是 defense-in-depth。
    if (lineTarget && lineTarget.category === 'relation') {
      // 編輯既有線:直接切類型,並清掉 pending(避免之後還有殘留 banner)
      updateLine(lineTarget.id, { subType, category: 'relation' });
      if (pendingRelation) setPendingRelation(null);
      return;
    }
    setPendingRelation(subType);
  };

  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');

  const units = currentCase?.networkUnits ?? [];
  const activeUnits = units.filter((u) => u.isActive);
  const historyUnits = units.filter((u) => !u.isActive);

  const filteredHistory = institutionHistory.filter((s) =>
    fuzzyMatch(query, s),
  );
  const filteredSuggestions = SUGGESTIONS.filter(
    (s) => fuzzyMatch(query, s) && !institutionHistory.includes(s),
  );

  const handleAdd = (name: string) => {
    if (!name.trim()) return;
    addNetworkUnit(name, person.id);
    setQuery('');
    setAdding(false);
  };
  const cancelAdd = () => {
    setQuery('');
    setAdding(false);
  };

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>
      {/* 線條屬性已搬到畫布上直接操作:
          - 點兩下線 → 編輯備注
          - Tab2 關係按鈕 → 切換線條類型
          - 線選中時的 × → 刪除 */}

      {/* 關係線 — 5 小組,15 個 mini 按鈕(用 SymbolGallery 渲染 + 強制套藍)
          標籤跟按鈕 inline 連續流,空間夠就接續同一行,空間不夠才換 */}
      <Section
        title={t('relation.title')}
        rightInline={(() => {
          const disabled = allCaseRelationLines.length === 0;
          return (
            <label
              data-tooltip={
                disabled ? t('privacy.noFields') : t('privacy.sectionTip')
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: disabled
                  ? '#c7c7cc'
                  : allRelationLinesPrivate
                    ? '#ff3b30'
                    : '#86868b',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontWeight: 400,
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={allRelationLinesPrivate}
                disabled={disabled}
                onChange={() =>
                  toggleAllRelationLinesPrivate(!allRelationLinesPrivate)
                }
                style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
              />
              🔒 {t('privacy.selectAll')}
            </label>
          );
        })()}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {RELATION_GROUPS.map((group) => (
            <div
              key={group.groupKey}
              style={{
                // 整個 group 當原子單位:label + buttons 永遠在一起,
                // 空間不夠時整組換行(不會在中間斷開)
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: '#86868b',
                  padding: '0 2px',
                  whiteSpace: 'nowrap',
                }}
              >
                {t(group.groupKey)}
              </span>
              {group.items.map((item) => {
                const sym = SYMBOLS.find((s) => s.code === item.symCode);
                if (!sym) return null;
                // 高亮邏輯(優先順序):
                //  1. 選中 connector → connector 的 subType
                //  2. 選中現有線條 → 該線 subType
                //  3. 否則用 pendingRelation 判斷(pending mode)
                const active = connectorTarget
                  ? connectorTarget.conn.subType === item.subType
                  : lineTarget
                    ? lineTarget.subType === item.subType
                    : pendingRelation === item.subType;
                return (
                  <button
                    key={item.subType}
                    onClick={() => onPickRelation(item.subType)}
                    data-tooltip={`#${sym.number} ${t(item.labelKey)}`}
                    style={{
                      width: 44,
                      height: 32,
                      padding: 2,
                      background: active ? '#e8f1ff' : '#ffffff',
                      border: active ? '2px solid #007aff' : '1px solid #d2d2d7',
                      borderRadius: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      viewBox="-44 -36 88 72"
                      width={40}
                      height={26}
                      style={{ display: 'block' }}
                      className="relation-mini-svg"
                    >
                      {sym.render()}
                    </svg>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Section>

      {/* 新增單位(置頂)— 漸進式顯露:點 + 才展開 */}
      <Section
        title={t('tab2.addUnit')}
        rightInline={
          !adding && (
            <button
              onClick={() => setAdding(true)}
              style={inlineAddBtnStyle}
              title={t('common.addItem')}
            >
              +
            </button>
          )
        }
      >
        {adding && (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              <input
                type="text"
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === 'Enter' && query.trim()) handleAdd(query);
                  if (e.key === 'Escape') cancelAdd();
                }}
                placeholder={t('tab2.unitNamePlaceholder')}
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
              />
              <button
                onClick={() => handleAdd(query)}
                disabled={!query.trim()}
                style={{ ...confirmBtnStyle, opacity: query.trim() ? 1 : 0.4 }}
                title={t('common.save')}
              >
                ✓
              </button>
              <button
                onClick={cancelAdd}
                style={removeBtnStyle}
                title={t('common.cancel')}
              >
                ×
              </button>
            </div>

            {/* 最近使用 — chip 式橫排,滿了換行 */}
            {filteredHistory.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: '#86868b',
                    marginBottom: 4,
                    paddingLeft: 2,
                  }}
                >
                  {t('tab2.recentlyUsed')}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {filteredHistory.map((s) => (
                    <span key={s} style={historyChipStyle}>
                      <button
                        onClick={() => handleAdd(s)}
                        style={historyChipInnerBtn}
                      >
                        {s}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromInstitutionHistory(s);
                        }}
                        style={miniXStyle}
                        title={t('common.removeFromHistory')}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 建議(排除已在歷史) */}
            {filteredSuggestions.length > 0 && (
              <div style={{ marginTop: 6 }}>
                {filteredHistory.length > 0 && (
                  <div
                    style={{
                      fontSize: 10,
                      color: '#86868b',
                      marginBottom: 4,
                      paddingLeft: 2,
                    }}
                  >
                    {t('tab2.suggestions')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {filteredSuggestions.slice(0, 12).map((s) => (
                    <button key={s} onClick={() => handleAdd(s)} style={chipStyle}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Section>

      {/* 服務中 */}
      <Section title={`${t('tab2.serving')} (${activeUnits.length})`}>
        {activeUnits.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: '#86868b',
              padding: '6px 4px',
              lineHeight: 1.5,
            }}
          >
            {t('tab2.servingEmpty')}
          </div>
        )}
        {activeUnits.map((u) => (
          <UnitRow
            key={u.id}
            unit={u}
            onToggle={() => toggleNetworkUnitActive(u.id)}
            onUpdate={(patch) => updateNetworkUnit(u.id, patch)}
            onRemove={async () => {
              const ok = await showConfirm(t('tab2.unitDeleteConfirm', { name: u.name }));
              if (ok) removeNetworkUnit(u.id);
            }}
          />
        ))}
      </Section>

      {/* 曾經資源 */}
      <Section title={`${t('tab2.history')} (${historyUnits.length})`} muted>
        {historyUnits.length === 0 && (
          <div style={{ fontSize: 12, color: '#86868b', padding: '6px 4px' }}>
            {t('tab2.historyEmpty')}
          </div>
        )}
        {historyUnits.map((u) => (
          <UnitRow
            key={u.id}
            unit={u}
            onToggle={() => toggleNetworkUnitActive(u.id)}
            onUpdate={(patch) => updateNetworkUnit(u.id, patch)}
            onRemove={async () => {
              const ok = await showConfirm(t('tab2.unitDeletePermanent', { name: u.name }));
              if (ok) removeNetworkUnit(u.id);
            }}
            collapsed
          />
        ))}
      </Section>
    </div>
  );
}

/* ==================== UnitRow ==================== */

function UnitRow({
  unit,
  onToggle,
  onUpdate,
  onRemove,
  collapsed,
}: {
  unit: NetworkUnit;
  onToggle: () => void;
  onUpdate: (patch: Partial<NetworkUnit>) => void;
  onRemove: () => void;
  collapsed?: boolean;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(!collapsed);

  return (
    <div
      style={{
        padding: 8,
        marginBottom: 6,
        background: unit.isActive ? '#ffffff' : '#fafafa',
        border: '1px solid #e5e4e7',
        borderRadius: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox"
          checked={unit.isActive}
          onChange={onToggle}
          title={unit.isActive ? t('tab2.toggleActive') : t('tab2.toggleInactive')}
        />
        <input
          type="text"
          value={unit.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          style={{
            flex: 1,
            padding: '3px 6px',
            fontSize: 13,
            border: '1px solid #d2d2d7',
            borderRadius: 4,
            fontFamily: 'inherit',
            background: unit.isActive ? '#ffffff' : '#f2f2f7',
            color: unit.isActive ? '#1d1d1f' : '#86868b',
          }}
        />
        <button
          onClick={() => setExpanded((v) => !v)}
          style={tinyBtnStyle}
          title={expanded ? t('common.collapse') : t('common.expand')}
        >
          {expanded ? '▲' : '▼'}
        </button>
        <button onClick={onRemove} style={removeBtnStyle} title={t('common.delete')}>
          ×
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 6, paddingLeft: 20 }}>
          <label
            style={{
              fontSize: 11,
              color: '#86868b',
              display: 'block',
              marginBottom: 2,
            }}
          >
            {t('tab2.note')}
          </label>
          <input
            type="text"
            value={unit.note ?? ''}
            onChange={(e) => onUpdate({ note: e.target.value })}
            placeholder={t('tab2.unitNotePlaceholder')}
            style={{
              width: '100%',
              padding: '3px 6px',
              fontSize: 12,
              border: '1px solid #d2d2d7',
              borderRadius: 4,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ==================== helpers ==================== */

function Section({
  title,
  children,
  muted,
  rightInline,
}: {
  title: string;
  children: React.ReactNode;
  muted?: boolean;
  rightInline?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: muted ? '#86868b' : '#1d1d1f',
          marginBottom: 6,
          borderBottom: '1px solid #e5e4e7',
          paddingBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>{title}</span>
        {rightInline}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: 13,
  border: '1px solid #d2d2d7',
  borderRadius: 4,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  background: '#ffffff',
};

const tinyBtnStyle: React.CSSProperties = {
  minWidth: 28,
  height: 26,
  padding: '0 6px',
  fontSize: 12,
  background: '#ffffff',
  border: '1px solid #d2d2d7',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: '#007aff',
};

// Section 標頭旁的 + 按鈕(漸進式顯露入口)
const inlineAddBtnStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  padding: 0,
  fontSize: 14,
  lineHeight: 1,
  background: '#ffffff',
  border: '1px solid #d2d2d7',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: '#007aff',
};

// 暫存列的 ✓ 儲存按鈕
const confirmBtnStyle: React.CSSProperties = {
  minWidth: 28,
  height: 26,
  padding: '0 6px',
  fontSize: 12,
  background: '#ffffff',
  border: '1px solid #34c759',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: '#34c759',
};

// 刪除 × 用紅色
const removeBtnStyle: React.CSSProperties = {
  ...tinyBtnStyle,
  color: '#ff3b30',
};

const chipStyle: React.CSSProperties = {
  padding: '3px 8px',
  fontSize: 11,
  background: '#ffffff',
  border: '1px solid #e5e4e7',
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: '#1d1d1f',
};

const miniXStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  padding: 0,
  background: 'transparent',
  border: 'none',
  borderRadius: 3,
  cursor: 'pointer',
  color: '#ff3b30',
  fontSize: 12,
  lineHeight: 1,
};

// 最近使用:整條 chip(名字 + ×) 橫排
const historyChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  paddingLeft: 8,
  paddingRight: 2,
  paddingTop: 2,
  paddingBottom: 2,
  fontSize: 12,
  background: '#f5f5f7',
  border: '1px solid #e5e4e7',
  borderRadius: 12,
  fontFamily: 'inherit',
  color: '#1d1d1f',
};
const historyChipInnerBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  fontSize: 12,
  color: '#1d1d1f',
  fontFamily: 'inherit',
  cursor: 'pointer',
};
