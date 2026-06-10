import { useState } from 'react';
import { PlusGlyph, CrossGlyph } from '../PlusGlyph';
// 繁體字典版(#121)— 預設入口是簡體字典,「憂鬱症」等繁體詞拼音查不到
import PinyinMatch from 'pinyin-match/es/traditional';
import type {
  Line,
  MemberSubType,
  NetworkUnit,
  Person,
  RelationSubType,
} from '../../types/genogram';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import { SYMBOLS } from '../Gallery/symbolData';
// LineProperties 已不再嵌入 Tab2 — 線條屬性都在畫布上直接編輯
// (點兩下改備注、Tab2 關係按鈕改類型、× 按鈕刪線)

// v1.1 婚姻線按鈕(8 個)— 對齊 Gallery,只列「現行」subType
// 秘密外遇用 'love-affair' subType + 借 'secret' 圖示(DOT 點線)
// v1.1 移除 3 個:
//   - legal-cohabitation (LP):字母自創,法律狀態改用生態圈表達
//   - legal-separation (L):字母自創,法律狀態改用生態圈表達
//   - widowed (W):字母自創,喪偶改用 Tab1 ☑ 已往生 自動畫 X
//   舊資料這 3 個 subType 在 store migrateGenogram 自動轉成 cohabitation/separation/marriage
const MARRIAGE_ITEMS: { subType: MemberSubType; symCode: string; labelKey: string }[] = [
  { subType: 'marriage', symCode: 'marriage', labelKey: 'lineProps.subType.marriage' },
  { subType: 'engagement', symCode: 'engagement', labelKey: 'lineProps.subType.engagement' },
  { subType: 'cohabitation', symCode: 'cohabitation', labelKey: 'lineProps.subType.cohabitation' },
  { subType: 'engagement-cohabitation', symCode: 'engagement-cohabitation', labelKey: 'lineProps.subType.engagementCohabitation' },
  { subType: 'separation', symCode: 'separation', labelKey: 'lineProps.subType.separation' },
  { subType: 'engagement-separation', symCode: 'engagement-separation', labelKey: 'lineProps.subType.engagementSeparation' },
  { subType: 'divorce', symCode: 'divorce', labelKey: 'lineProps.subType.divorce' },
  // 秘密外遇 — Gallery 用 'secret' 點線圖示;subType 'love-affair' 是現行名(舊 secret-affair 會 migrate 到此)
  { subType: 'love-affair', symCode: 'secret', labelKey: 'lineProps.subType.loveAffair' },
];

// RelationSubType ↔ symbolData code 對照表(命名不一致需要 map)
// v1.1 重整為 4 群(對齊標準圖):
//   1. 正向連結 (連結/親密/過度緊密) — 移走靈性
//   2. 互動程度 (親密-敵意/疏離/敵意/靈性/專注於/負向關注) — 合併原中性+負向+靈性
//   3. 虐待 (身體/情緒/性)
//   4. 照顧/截斷 (照顧者/截斷/修復截斷)
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
    ],
  },
  {
    groupKey: 'relation.group.interaction',
    items: [
      { subType: 'close-hostile', symCode: 'close-hostile', labelKey: 'lineProps.subType.closeHostile' },
      { subType: 'distant', symCode: 'distant', labelKey: 'lineProps.subType.distant' },
      { subType: 'hostile', symCode: 'hostile', labelKey: 'lineProps.subType.hostile' },
      { subType: 'spiritual', symCode: 'spiritual', labelKey: 'lineProps.subType.spiritual' },
      { subType: 'focus-on', symCode: 'focus', labelKey: 'lineProps.subType.focusOn' },
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
  const setPendingMember = useGenogramStore((s) => s.setPendingMember);
  const pendingMember = useGenogramStore((s) => s.pendingMember);
  const updateLine = useGenogramStore((s) => s.updateLine);
  const toggleAllRelationLinesPrivate = useGenogramStore(
    (s) => s.toggleAllRelationLinesPrivate,
  );
  const selectedConnector = useGenogramStore((s) => s.selectedConnector);
  const setConnectorSubType = useGenogramStore((s) => s.setConnectorSubType);
  const toggleConnectorReversed = useGenogramStore(
    (s) => s.toggleConnectorReversed,
  );
  const inspectorTarget = useGenogramStore((s) => s.inspectorTarget);
  const tab2ShowMarriage = useGenogramStore((s) => s.tab2ShowMarriage);
  const tab2ShowRelation = useGenogramStore((s) => s.tab2ShowRelation);
  const setTab2ShowMarriage = useGenogramStore((s) => s.setTab2ShowMarriage);
  const setTab2ShowRelation = useGenogramStore((s) => s.setTab2ShowRelation);
  // 偵測「目前選的是 member line 嗎?」— 用來擋 pendingRelation 觸發
  // (Inspector 已把 member line 的 lineTarget 過濾成 null,但避免使用者
  //  手動切到 Tab2 後按按鈕,還是會冒出 pending banner)
  const memberLineSelected = (() => {
    if (inspectorTarget?.type !== 'line') return false;
    const l = currentCase?.lines.find((x) => x.id === inspectorTarget.id);
    return !!l && l.category === 'member';
  })();
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
      // ⚠️ 不要拿掉這 Set — connector(單位↔人物/生態圈)的方向翻轉是必要功能
      // v1.1: 同 subType 重複點 + 在 ARROW_REVERSIBLE 名單 → 翻轉 connector 方向
      // 跟人物↔人物的關係線翻轉名單一致,維護時兩處要同步
      const CONNECTOR_REVERSIBLE = new Set<RelationSubType>([
        'focus-on',
        'negative-focus',
        'physical-abuse',
        'emotional-abuse',
        'sexual-abuse',
        'caregiver',
      ]);
      if (
        connectorTarget.conn.subType === subType &&
        CONNECTOR_REVERSIBLE.has(subType)
      ) {
        toggleConnectorReversed(connectorTarget.unit.id, connectorTarget.conn.id);
      } else {
        setConnectorSubType(
          connectorTarget.unit.id,
          connectorTarget.conn.id,
          subType,
        );
      }
      if (pendingRelation) setPendingRelation(null);
      return;
    }
    // 安全閘:只有 relation line 才能被改 subType。
    // member line(婚姻/親子)走另一個 toggle(solid/dashed),不歸 Tab2 管。
    // Inspector 端已經過濾過一次,這裡是 defense-in-depth。
    if (lineTarget && lineTarget.category === 'relation') {
      // 如果再點一次「同一個有箭頭的關係 subType」→ 反轉箭頭方向
      // (swap from/to,箭頭自然從 to 跳到原本的 from)
      // ⚠️ 不要拿掉這 Set — 藍色關係線的方向性翻轉是「必要」功能
      // 點兩次同一個有箭頭的關係 subType → 翻轉 from/to(箭頭方向反過來)
      // v1.1:caregiver 加入翻轉名單(配合「單向 + 雙倒角」改版)
      // 教學 step 7「藍線 — 互動關係 & Tab2 翻轉」會教使用者用這功能,刪掉會破壞教學
      const ARROW_REVERSIBLE = new Set<RelationSubType>([
        'focus-on',
        'negative-focus',
        'physical-abuse',
        'emotional-abuse',
        'sexual-abuse',
        'caregiver',
      ]);
      if (
        lineTarget.subType === subType &&
        ARROW_REVERSIBLE.has(subType)
      ) {
        updateLine(lineTarget.id, {
          fromPersonId: lineTarget.toPersonId,
          toPersonId: lineTarget.fromPersonId,
        });
      } else {
        // 編輯既有線:直接切類型,並清掉 pending(避免之後還有殘留 banner)
        updateLine(lineTarget.id, { subType, category: 'relation' });
      }
      if (pendingRelation) setPendingRelation(null);
      return;
    }
    // 若使用者選了 member line(理論上 Inspector 已過濾,但若使用者自己切到 Tab2)
    // 也要擋住 pending mode 觸發,避免冒出「點另一人物完成」banner
    if (lineTarget && lineTarget.category !== 'relation') {
      return;
    }
    // 雙保險:直接看 inspectorTarget 是否為 member line(因為 Inspector 把它過濾成 null,
    // 上面 lineTarget 的 check 抓不到)
    if (memberLineSelected) {
      return;
    }
    setPendingRelation(subType);
  };

  // v1.1: 點婚姻線按鈕邏輯
  //  - 選中 member line → 改該線 subType
  //  - 沒選 → 進 pending mode → 點 2 個人物完成
  const onPickMember = (subType: MemberSubType) => {
    // 若選中的是 member line(婚姻),直接改類型
    if (lineTarget && lineTarget.category === 'member') {
      updateLine(lineTarget.id, { subType });
      if (pendingMember) setPendingMember(null);
      return;
    }
    // 若選中的是 relation line,擋住(避免誤把關係線改成婚姻)
    if (lineTarget && lineTarget.category === 'relation') {
      return;
    }
    // 沒選 → 進 pending mode
    setPendingMember(subType);
    // 取消可能殘留的 pendingRelation
    if (pendingRelation) setPendingRelation(null);
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
          - Tab2 線條按鈕 → 切換線條類型
          - 線選中時的 × → 刪除 */}

      {/* v1.1 常用線條 — 標題 + 2 個 section toggle(婚姻線 / 互動關係線)*/}
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#1d1d1f',
          marginBottom: 6,
          borderBottom: '1px solid #e5e4e7',
          paddingBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span>{t('tab2.commonLines')}</span>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: '#86868b',
            cursor: 'pointer',
            fontWeight: 400,
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={tab2ShowMarriage}
            onChange={(e) => setTab2ShowMarriage(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          {t('tab2.toggleMarriage')}
        </label>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: '#86868b',
            cursor: 'pointer',
            fontWeight: 400,
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={tab2ShowRelation}
            onChange={(e) => setTab2ShowRelation(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          {t('tab2.toggleRelation')}
        </label>
      </div>

      {/* 婚姻線 — v1.1 加入 Tab2,點選後可改既有婚姻線類型或進 pending mode */}
      {tab2ShowMarriage && (
        <Section title={t('tab2.marriageSectionTitle')}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {MARRIAGE_ITEMS.map((item) => {
              const sym = SYMBOLS.find((s) => s.code === item.symCode);
              if (!sym) return null;
              // 高亮:選中 member line → 該線 subType / pending mode → pendingMember
              const active =
                lineTarget && lineTarget.category === 'member'
                  ? lineTarget.subType === item.subType
                  : pendingMember === item.subType;
              return (
                <button
                  key={item.subType}
                  onClick={() => onPickMember(item.subType)}
                  data-tooltip={`#${sym.number} ${t(item.labelKey)}`}
                  style={{
                    width: 56,
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
                    viewBox="-44 -18 88 36"
                    width={50}
                    height={22}
                    style={{ display: 'block' }}
                  >
                    {sym.render()}
                  </svg>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* 關係線 — 4 小組(v1.1 已從 5 群整併,移除 disabled,全選保密永遠可勾)*/}
      {tab2ShowRelation && (
      <Section
        title={t('relation.title')}
        rightInline={(() => {
          // v1.1: 移除 disabled — 即使沒線也可以勾(no-op)
          return (
            <label
              data-tooltip={t('privacy.sectionTip')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: allRelationLinesPrivate ? '#ff3b30' : '#86868b',
                cursor: 'pointer',
                fontWeight: 400,
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={allRelationLinesPrivate}
                onChange={() =>
                  toggleAllRelationLinesPrivate(!allRelationLinesPrivate)
                }
                style={{ cursor: 'pointer' }}
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
      )}
      {/* /v1.1 tab2ShowRelation 條件結束 */}

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
              <PlusGlyph size={13} stroke={1.8} />
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
                <CrossGlyph size={13} stroke={1.8} />
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
          <CrossGlyph size={13} stroke={1.8} />
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
  width: 14,
  height: 14,
  padding: 0,
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1,
  background: '#007aff',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: '#ffffff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
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

// 刪除 × — 紅實心圓 + 白 ×(跟藍 + 圓同一套視覺語言)
const removeBtnStyle: React.CSSProperties = {
  ...tinyBtnStyle,
  width: 14,
  height: 14,
  padding: 0,
  background: '#ff3b30',
  border: 'none',
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
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
