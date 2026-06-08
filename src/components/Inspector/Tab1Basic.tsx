import { useEffect, useState } from 'react';
import { PlusGlyph, CrossGlyph } from '../PlusGlyph';
import type {
  ContactInfo,
  Disability,
  FillPattern,
  PartialDate,
  Person,
} from '../../types/genogram';
import {
  useGenogramStore,
  fieldsInSection,
  type PrivacyField,
  type PrivacySection,
} from '../../store/genogramStore';
import { useT } from '../../i18n';
import { SYMBOLS } from '../Gallery/symbolData';
import EditableSelect from './EditableSelect';

type Props = {
  person: Person;
};

// ==================== Tab1 Item 統一資料 ====================
// 每個按鈕:code(對應 SYMBOLS) + tooltip + isActive(person) + apply(person) → Partial
type TabItem = {
  code: string;
  tooltip: string;
  isActive: (p: Person) => boolean;
  apply: (p: Person) => Partial<Person>;
};

// ===== 基本形狀 (#1-6) =====
const BASIC_ITEMS: TabItem[] = [
  {
    code: 'square',
    tooltip: '#1 男性 Male',
    isActive: (p) =>
      p.shape === 'square' &&
      (p.fillPatterns ?? []).length === 0 &&
      (p.customMarks ?? []).length === 0 &&
      (!p.genderVariant || p.genderVariant === 'cisgender'),
    apply: () => ({
      shape: 'square',
      fillPatterns: [],
      customMarks: [],
      genderVariant: 'cisgender',
    }),
  },
  {
    code: 'circle',
    tooltip: '#2 女性 Female',
    isActive: (p) =>
      p.shape === 'circle' &&
      (p.fillPatterns ?? []).length === 0 &&
      (p.customMarks ?? []).length === 0 &&
      (!p.genderVariant || p.genderVariant === 'cisgender'),
    apply: () => ({
      shape: 'circle',
      fillPatterns: [],
      customMarks: [],
      genderVariant: 'cisgender',
    }),
  },
  {
    code: 'disabled-m',
    tooltip: '#20 身心障礙者-男(左半黑)',
    isActive: (p) =>
      p.shape === 'square' &&
      (p.fillPatterns ?? []).includes('left-half-filled'),
    apply: () => ({
      shape: 'square',
      fillPatterns: ['left-half-filled'],
      customMarks: [],
      genderVariant: 'cisgender',
    }),
  },
  {
    code: 'disabled-f',
    tooltip: '#21 身心障礙者-女(左半黑)',
    isActive: (p) =>
      p.shape === 'circle' &&
      (p.fillPatterns ?? []).includes('left-half-filled'),
    apply: () => ({
      shape: 'circle',
      fillPatterns: ['left-half-filled'],
      customMarks: [],
      genderVariant: 'cisgender',
    }),
  },
  {
    code: 'triangle',
    tooltip: '#3 懷孕(未知性別)',
    isActive: (p) => p.shape === 'triangle',
    apply: () => ({ shape: 'triangle' }),
  },
  {
    code: 'diamond',
    tooltip: '#4 未知性別(已出生)',
    isActive: (p) => p.shape === 'diamond',
    apply: () => ({ shape: 'diamond' }),
  },
  {
    code: 'pet',
    tooltip: '#6 寵物',
    isActive: (p) => p.shape === 'pet',
    apply: () => ({ shape: 'pet' }),
  },
];

// ===== 基本醫療用 (#18-33, 不含 20/21) =====
const patternMedItem = (
  code: string,
  tooltip: string,
  shape: 'square' | 'circle',
  pattern: FillPattern,
): TabItem => ({
  code,
  tooltip,
  isActive: (p) => p.shape === shape && (p.fillPatterns ?? []).includes(pattern),
  apply: () => ({ shape, fillPatterns: [pattern] }),
});
const markItem = (
  code: string,
  tooltip: string,
  shape: 'square' | 'circle',
  symbol: string,
): TabItem => ({
  code,
  tooltip,
  isActive: (p) =>
    p.shape === shape &&
    (p.customMarks ?? []).some((m) => m.symbol === symbol),
  apply: (p) => {
    const cur = p.customMarks ?? [];
    const has = cur.some((m) => m.symbol === symbol);
    return {
      shape,
      customMarks: has
        ? cur.filter((m) => m.symbol !== symbol)
        : [
            ...cur,
            {
              id: `mk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
              symbol,
              label: tooltip,
              position: 'top-right' as const,
            },
          ],
    };
  },
});

// ===== 醫務 (#18-19 疑似 + #22-33 成癮系列) =====
const MEDICAL_ITEMS: TabItem[] = [
  patternMedItem('susp-ill-m', '#18 疑似疾病 男', 'square', 'left-diagonal-stripes'),
  patternMedItem('susp-ill-f', '#19 疑似疾病 女', 'circle', 'left-diagonal-stripes'),
  patternMedItem('rec-ill-m', '#22 疾病復原 男', 'square', 'left-horizontal-stripes'),
  patternMedItem('rec-ill-f', '#23 疾病復原 女', 'circle', 'left-horizontal-stripes'),
  patternMedItem('susp-sub-m', '#24 疑似成癮 男', 'square', 'bottom-diagonal-stripes'),
  patternMedItem('susp-sub-f', '#25 疑似成癮 女', 'circle', 'bottom-diagonal-stripes'),
  patternMedItem('conf-sub-m', '#26 確診成癮 男', 'square', 'bottom-half-filled'),
  patternMedItem('conf-sub-f', '#27 確診成癮 女', 'circle', 'bottom-half-filled'),
  patternMedItem('rec-sub-m', '#28 成癮復原 男', 'square', 'bottom-horizontal-stripes'),
  patternMedItem('rec-sub-f', '#29 成癮復原 女', 'circle', 'bottom-horizontal-stripes'),
  patternMedItem('comb-ill-m', '#30 合併 男', 'square', 'combined-filled'),
  patternMedItem('comb-ill-f', '#31 合併 女', 'circle', 'combined-filled'),
  patternMedItem('rec-comb-m', '#32 合併復原 男', 'square', 'combined-recovery'),
  patternMedItem('rec-comb-f', '#33 合併復原 女', 'circle', 'combined-recovery'),
];

// ===== 擴充選項 (性別亞型 #7-11 + 標記 S/L/O #42-47) =====
// v1.1 改名:原「multiIdentity」→「extended」,把標記從 advanced 合進來
// 命名考量:避免「非生理標記」隱含「男女才是正常生理」對多元性別不友善
const EXTENDED_ITEMS: TabItem[] = [
  { code: 'mtf', tooltip: '#7 MTF', isActive: (p) => p.genderVariant === 'mtf', apply: () => ({ genderVariant: 'mtf' }) },
  { code: 'ftm', tooltip: '#8 FTM', isActive: (p) => p.genderVariant === 'ftm', apply: () => ({ genderVariant: 'ftm' }) },
  { code: 'gay', tooltip: '#9 男同志', isActive: (p) => p.genderVariant === 'gay', apply: () => ({ genderVariant: 'gay' }) },
  { code: 'lesbian', tooltip: '#10 女同志', isActive: (p) => p.genderVariant === 'lesbian', apply: () => ({ genderVariant: 'lesbian' }) },
  { code: 'bisexual', tooltip: '#11 雙性戀', isActive: (p) => p.genderVariant === 'bisexual', apply: () => ({ genderVariant: 'bisexual' }) },
  markItem('mark-S-m', '#42 抽煙 男', 'square', 'S'),
  markItem('mark-S-f', '#43 抽煙 女', 'circle', 'S'),
  markItem('mark-L-m', '#44 語言 男', 'square', 'L'),
  markItem('mark-L-f', '#45 語言 女', 'circle', 'L'),
  markItem('mark-O-m', '#46 過胖 男', 'square', 'O'),
  markItem('mark-O-f', '#47 過胖 女', 'circle', 'O'),
];

// ===== 遺傳 ⚠️ (#34-37 帶因/確診 + #38-39 可能遺傳[原 #40-41]) =====
// v1.1 改名:原「advanced」→「genetic」,移除 #38-39 疑似遺傳(susp-aff,無國際依據)
// #40-41 可能遺傳(?)在 symbolData 刪 #38-39 後自動變 #38-39 編號,但 pattern key 不變
const GENETIC_ITEMS: TabItem[] = [
  patternMedItem('carr-m', '#34 帶因 男 (McGoldrick 中央黑點)', 'square', 'carrier-dot'),
  patternMedItem('carr-f', '#35 帶因 女 (McGoldrick 中央黑點)', 'circle', 'carrier-dot'),
  patternMedItem('aff-m', '#36 確診遺傳 男', 'square', 'affected-cross'),
  patternMedItem('aff-f', '#37 確診遺傳 女', 'circle', 'affected-cross'),
  patternMedItem('poss-aff-m', '#38 可能遺傳 男 (?)', 'square', 'possibly-question'),
  patternMedItem('poss-aff-f', '#39 可能遺傳 女 (?)', 'circle', 'possibly-question'),
];

// 注意:這個是 value(資料層),別翻;label 透過 t() 翻譯後傳入 MultiContactList
const CONTACT_LABEL_VALUES = ['個人', '家', '公司', '學校', '緊急'];
const CONTACT_LABEL_KEYS: Record<string, string> = {
  '個人': 'tab1.contactLabel.personal',
  '家': 'tab1.contactLabel.home',
  '公司': 'tab1.contactLabel.company',
  '學校': 'tab1.contactLabel.school',
  '緊急': 'tab1.contactLabel.emergency',
};

// ===== 個人屬性預設清單 (使用者可自由輸入,自動進歷史) =====
const EDUCATION_PRESETS = [
  '不識字',
  '國小',
  '國中',
  '高中職',
  '專科',
  '大學',
  '碩士',
  '博士',
];
// 不適用畢業 / 在學 / 肄業狀態的學歷(顯示 dropdown 沒意義)
const EDUCATION_NO_STATUS = new Set(['不識字']);
const ETHNICITY_PRESETS = ['閩南', '客家', '外省', '原住民'];
const RELIGION_PRESETS = [
  '無',
  '佛教',
  '道教',
  '民間信仰',
  '基督教',
  '天主教',
  '伊斯蘭教',
];
const DISABILITY_TYPE_PRESETS = [
  '肢體',
  '智能',
  '精神',
  '視覺',
  '聽覺',
  '自閉症',
  '慢性精神病',
  '多重障礙',
  '罕見疾病',
  '其他',
];
const DISABILITY_LEVEL_PRESETS = ['輕度', '中度', '重度', '極重度'];
const FAMILY_ROLE_PRESETS = [
  '主訴者',
  '法定代理人',
  '監護人',
  '主要照顧者',
  '經濟支柱',
  '共同居住者',
];

function computeAge(birth?: PartialDate, death?: PartialDate): number | null {
  if (!birth?.year) return null;
  const end = death?.year
    ? new Date(death.year, (death.month ?? 1) - 1, death.day ?? 1)
    : new Date();
  const start = new Date(birth.year, (birth.month ?? 1) - 1, birth.day ?? 1);
  let age = end.getFullYear() - start.getFullYear();
  const m = end.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < start.getDate())) age--;
  return age >= 0 ? age : null;
}

export default function Tab1Basic({ person }: Props) {
  const t = useT();
  const updatePerson = useGenogramStore((s) => s.updatePerson);
  const removePersons = useGenogramStore((s) => s.removePersons);
  const addPersonAtCenter = useGenogramStore((s) => s.addPersonAtCenter);
  const showConfirm = useGenogramStore((s) => s.showConfirm);
  const probandStyle = useGenogramStore((s) => s.probandStyle);
  const setProbandStyle = useGenogramStore((s) => s.setProbandStyle);

  const hasVariant =
    !!person.genderVariant && person.genderVariant !== 'cisgender';
  // v1.1: 對齊 Tab1 新 4 群結構(常用永遠顯示 + 醫務/擴充選項/遺傳 可勾)
  const medical = useGenogramStore((s) => s.expandMedical);
  const extended = useGenogramStore((s) => s.expandExtended);
  const genetic = useGenogramStore((s) => s.expandGenetic);
  const setExpand = useGenogramStore((s) => s.setExpand);
  // 進入有性別變體的人物時自動展開「擴充選項」(性別亞型在這群,否則 variant 改不到)
  useEffect(() => {
    if (hasVariant && !extended) setExpand('extended', true);
  }, [hasVariant, extended, setExpand]);
  const computedAge = computeAge(person.birthDate, person.deathDate);
  const hasBirthYear = !!person.birthDate?.year;
  const deceased = person.lifeStatus === 'deceased';

  const patchBirth = (next: PartialDate) => {
    const syncedAge = next.year ? computeAge(next, person.deathDate) : undefined;
    updatePerson(person.id, {
      birthDate: next,
      textInfo: {
        ...person.textInfo,
        ...(next.year ? { age: syncedAge ?? undefined } : {}),
      },
    });
  };
  const patchDeath = (next: PartialDate) => {
    const syncedAge = person.birthDate?.year
      ? computeAge(person.birthDate, next)
      : undefined;
    updatePerson(person.id, {
      deathDate: next,
      textInfo: {
        ...person.textInfo,
        ...(person.birthDate?.year
          ? { age: syncedAge ?? undefined, lifeSpan: syncedAge ?? undefined }
          : {}),
      },
    });
  };

  // 機構(網絡單位)不顯示基本形狀/性別亞型/生命狀態/個案本人等個人屬性
  const isInstitution = person.shape === 'institution';

  return (
    <div style={{ padding: '16px', overflowY: 'auto', height: '100%' }}>
      {isInstitution && (
        <div
          style={{
            marginBottom: 14,
            padding: '10px 12px',
            background: '#f2f7ff',
            border: '1px solid #c7d9ff',
            borderRadius: 6,
            fontSize: 12,
            color: '#007aff',
            lineHeight: 1.5,
          }}
        >
          {t('tab1.shapeInst')}
        </div>
      )}
      {!isInstitution && (
      <Section
        title={t('tab1.shape')}
        right={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label style={tinyCheckLabel}>
              <input
                type="checkbox"
                checked={medical}
                style={uniCheckboxStyle}
                onChange={(e) => setExpand('medical', e.target.checked)}
              />
              {t('tab1.medical')}
            </label>
            <label style={tinyCheckLabel}>
              <input
                type="checkbox"
                checked={extended}
                style={uniCheckboxStyle}
                onChange={(e) => {
                  setExpand('extended', e.target.checked);
                  // 取消勾「擴充選項」時自動把 genderVariant 重設為 cisgender
                  // (否則使用者看不到性別亞型按鈕,但人物仍套用)
                  if (!e.target.checked) {
                    updatePerson(person.id, { genderVariant: 'cisgender' });
                  }
                }}
              />
              {t('tab1.extended')}
            </label>
            <label style={tinyCheckLabel}>
              <input
                type="checkbox"
                checked={genetic}
                style={uniCheckboxStyle}
                onChange={(e) => setExpand('genetic', e.target.checked)}
              />
              {t('tab1.genetic')}
            </label>
          </div>
        }
      >
        {/* 基本形狀 + (可展開) 亞型/醫療/進階 的 flowing grid */}
        <div style={flowGridStyle}>
          {/* + 新增人物 */}
          <button
            onClick={() =>
              addPersonAtCenter(person.position.x + 160, person.position.y)
            }
            style={addPersonBtnStyle}
            title={t('tab1.addNewPerson')}
          >
            <PlusGlyph size={22} stroke={2.8} />
          </button>

          {/* 基本形狀 */}
          {BASIC_ITEMS.map((item) => (
            <MiniSymbolBtn
              key={item.code}
              code={item.code}
              tooltip={item.tooltip}
              active={item.isActive(person)}
              onClick={() => updatePerson(person.id, item.apply(person))}
            />
          ))}

          {/* 醫務(勾選展開)— #18-19 疑似 + #22-33 成癮系列 */}
          {medical &&
            MEDICAL_ITEMS.map((item) => (
              <MiniSymbolBtn
                key={item.code}
                code={item.code}
                tooltip={item.tooltip}
                active={item.isActive(person)}
                onClick={() => updatePerson(person.id, item.apply(person))}
              />
            ))}

          {/* 擴充選項(勾選展開)— 性別亞型 + 標記 S/L/O */}
          {extended &&
            EXTENDED_ITEMS.map((item) => (
              <MiniSymbolBtn
                key={item.code}
                code={item.code}
                tooltip={item.tooltip}
                active={item.isActive(person)}
                onClick={() => updatePerson(person.id, item.apply(person))}
              />
            ))}

          {/* 遺傳 ⚠️(勾選展開)— 帶因/確診/可能遺傳 */}
          {genetic &&
            GENETIC_ITEMS.map((item) => (
              <MiniSymbolBtn
                key={item.code}
                code={item.code}
                tooltip={item.tooltip}
                active={item.isActive(person)}
                onClick={() => updatePerson(person.id, item.apply(person))}
              />
            ))}
        </div>

      </Section>
      )}

      <Section
        title={isInstitution ? t('tab1.unitInfo') : t('tab1.identity')}
        inline={<PrivacyMainToggle />}
        right={<SectionPrivacyToggle section="identity" />}
      >
        {/* 姓名 + 年齡 並排(75% / 25%) */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 3 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginTop: 8,
                marginBottom: 4,
                height: 18,
                fontSize: 12,
                color: '#86868b',
              }}
            >
              {/* 左:姓名 + 案主 + (案主時才顯示)傳統 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{t('tab1.name')}</span>
                {!isInstitution && (
                  <label style={tinyCheckLabel}>
                    <input
                      type="checkbox"
                      checked={!!person.isProband}
                      style={uniCheckboxStyle}
                      onChange={(e) =>
                        updatePerson(person.id, { isProband: e.target.checked })
                      }
                    />
                    {t('tab1.proband')}
                  </label>
                )}
                {/* 「傳統」勾選 — 只在是案主時才出現,避免 UI 雜亂。
                    綁定全域 probandStyle(全 case 一致,因為通常只有 1 個案主)。 */}
                {!isInstitution && person.isProband && (
                  <label
                    style={tinyCheckLabel}
                    data-tooltip={t('tab1.probandTraditionalTip')}
                  >
                    <input
                      type="checkbox"
                      checked={probandStyle === 'traditional'}
                      style={uniCheckboxStyle}
                      onChange={(e) =>
                        setProbandStyle(
                          e.target.checked ? 'traditional' : 'border',
                        )
                      }
                    />
                    {t('tab1.probandTraditional')}
                  </label>
                )}
              </div>
              {/* 右:保密(勾選總開關開啟才顯示) */}
              <NameRowPrivacyToggle />
            </div>
            <input
              type="text"
              value={person.basicInfo?.name ?? ''}
              onChange={(e) =>
                updatePerson(person.id, { basicInfo: { name: e.target.value } })
              }
              placeholder={t('tab1.namePlaceholder')}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <LabelWithPrivacy
              label={
                <>
                  {t('tab1.age')}
                  {hasBirthYear && (
                    <span style={{ color: '#86868b', fontWeight: 400, fontSize: 10 }}>
                      {t('tab1.ageAuto')}
                    </span>
                  )}
                </>
              }
              field="age"
            />
            <input
              type="number"
              readOnly={hasBirthYear}
              value={
                hasBirthYear
                  ? (computedAge ?? '')
                  : (person.textInfo?.age ?? '')
              }
              onChange={(e) => {
                if (hasBirthYear) return;
                updatePerson(person.id, {
                  textInfo: {
                    ...person.textInfo,
                    age: e.target.value ? Number(e.target.value) : undefined,
                  },
                });
              }}
              placeholder="45"
              style={{
                ...inputStyle,
                background: hasBirthYear ? '#f2f2f7' : '#ffffff',
                color: hasBirthYear ? '#86868b' : '#1d1d1f',
              }}
            />
          </div>
        </div>

        {/* 出生日期 + 已過世 勾選 橫排 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            height: 18,
            marginTop: 8,
            marginBottom: 4,
            fontSize: 12,
            color: '#86868b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{t('tab1.birthDate')}</span>
            <label
              style={tinyCheckLabel}
              title={t('tab1.localYearTip')}
            >
              <input
                type="checkbox"
                checked={!!person.useLocalYear}
                style={uniCheckboxStyle}
                onChange={(e) =>
                  updatePerson(person.id, {
                    useLocalYear: e.target.checked,
                  })
                }
              />
              {t('tab1.localYear')}
            </label>
            <label style={tinyCheckLabel}>
              <input
                type="checkbox"
                checked={deceased}
                style={uniCheckboxStyle}
                onChange={(e) =>
                  updatePerson(person.id, {
                    lifeStatus: e.target.checked ? 'deceased' : 'alive',
                  })
                }
              />
              {t('tab1.deceased')}
            </label>
          </div>
          <BirthRowPrivacyToggle />
        </div>
        <DateDropdowns
          value={person.birthDate}
          onChange={patchBirth}
          useLocalYear={person.useLocalYear}
        />

        {deceased && (
          <div style={{ marginTop: 8 }}>
            <LabelWithPrivacy
              label={t('tab1.deathDate')}
              field="deathYear"
            />
            <DateDropdowns
              value={person.deathDate}
              onChange={patchDeath}
              useLocalYear={person.useLocalYear}
            />
          </div>
        )}
      </Section>

      <Section
        title={t('tab1.personalInfo')}
        right={<SectionPrivacyToggle section="personal" />}
      >
        <LabelWithAdd
          label={t('tab1.occupation')}
          onAdd={() => {
            const cur = person.basicInfo?.occupations ?? [];
            updatePerson(person.id, {
              basicInfo: { occupations: [...cur, ''] },
            });
          }}
          privacyField="occupations"
        />
        <MultiStringList
          values={person.basicInfo?.occupations ?? []}
          onChange={(occupations) =>
            updatePerson(person.id, { basicInfo: { occupations } })
          }
          placeholder={t('tab1.occupationPlaceholder')}
        />

        <LabelWithAdd
          label={t('tab1.contact')}
          onAdd={() => {
            const cur = person.basicInfo?.phones ?? [];
            updatePerson(person.id, {
              basicInfo: {
                phones: [...cur, { label: CONTACT_LABEL_VALUES[0], value: '' }],
              },
            });
          }}
          privacyField="phones"
        />
        <MultiContactList
          values={person.basicInfo?.phones ?? []}
          onChange={(phones) =>
            updatePerson(person.id, { basicInfo: { phones } })
          }
          labelOptions={CONTACT_LABEL_VALUES}
          placeholder={t('tab1.contactPlaceholder')}
        />

        {/* 居住地 + 收入 並排 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <LocationField
              value={person.textInfo?.location ?? ''}
              onChange={(v) =>
                updatePerson(person.id, {
                  textInfo: { ...person.textInfo, location: v },
                })
              }
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <IncomeField
              value={person.textInfo?.income ?? ''}
              onChange={(v) =>
                updatePerson(person.id, {
                  textInfo: { ...person.textInfo, income: v },
                })
              }
            />
          </div>
        </div>

        {/* 個人屬性(教育/族群/宗教/案件角色/家庭角色/身心障礙/子女來源) */}
        <PersonalAttributes person={person} />
      </Section>

      <Section title={t('tab1.note')} right={<SectionPrivacyToggle section="note" />}>
        <textarea
          value={person.basicInfo?.freeNote ?? ''}
          onChange={(e) =>
            updatePerson(person.id, {
              basicInfo: { freeNote: e.target.value },
            })
          }
          placeholder={t('tab1.notePlaceholder')}
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
        />
      </Section>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <button
          onClick={async () => {
            const ok = await showConfirm(t('tab1.deletePersonConfirm'));
            if (ok) removePersons([person.id]);
          }}
          style={dangerBtnStyle}
        >
          {t('tab1.deletePerson')}
        </button>
      </div>
    </div>
  );
}

// ============ Privacy UI ============

export function PrivacyMainToggle() {
  const t = useT();
  const privacyEnabled = useGenogramStore((s) => s.privacyEnabled);
  const setPrivacyEnabled = useGenogramStore((s) => s.setPrivacyEnabled);
  return (
    <label
      style={uniCheckLabel}
      title={t('privacy.mainTip')}
    >
      <input
        type="checkbox"
        checked={privacyEnabled}
        onChange={(e) => setPrivacyEnabled(e.target.checked)}
        style={uniCheckboxStyle}
      />
      {t('privacy.main')}
    </label>
  );
}

export function SectionPrivacyToggle({ section }: { section: PrivacySection }) {
  const t = useT();
  const privacyEnabled = useGenogramStore((s) => s.privacyEnabled);
  const privateFields = useGenogramStore((s) => s.privateFields);
  const setSectionFields = useGenogramStore((s) => s.setSectionFields);
  if (!privacyEnabled) return null;
  const fields = fieldsInSection(section);
  const disabled = fields.length === 0;
  const allChecked = !disabled && fields.every((f) => privateFields[f]);
  return (
    <label
      style={{
        ...(allChecked ? uniCheckLabelActive : uniCheckLabel),
        color: disabled ? '#c7c7cc' : allChecked ? '#ff3b30' : '#86868b',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      title={disabled ? t('privacy.noFields') : t('privacy.sectionTip')}
    >
      <input
        type="checkbox"
        checked={allChecked}
        disabled={disabled}
        onChange={() => setSectionFields(section, !allChecked)}
        style={uniCheckboxStyle}
      />
      {t('privacy.selectAll')}
    </label>
  );
}

// 姓名列右側保密勾選(同 LabelWithPrivacy 的邏輯,但獨立使用)
function NameRowPrivacyToggle() {
  return <InlinePrivacyToggle field="name" />;
}
function BirthRowPrivacyToggle() {
  return <InlinePrivacyToggle field="birthYear" />;
}
export function InlinePrivacyToggle({ field }: { field: PrivacyField }) {
  const t = useT();
  const privacyEnabled = useGenogramStore((s) => s.privacyEnabled);
  const privateFields = useGenogramStore((s) => s.privateFields);
  const togglePrivateField = useGenogramStore((s) => s.togglePrivateField);
  if (!privacyEnabled) return null;
  const on = !!privateFields[field];
  return (
    <label
      style={on ? uniCheckLabelActive : uniCheckLabel}
      title={t('privacy.fieldTip')}
    >
      <input
        type="checkbox"
        checked={on}
        onChange={() => togglePrivateField(field)}
        style={uniCheckboxStyle}
      />
      {t('privacy.toggle')}
    </label>
  );
}

function LabelWithPrivacy({
  label,
  field,
}: {
  label: React.ReactNode;
  field: PrivacyField;
}) {
  const t = useT();
  const privacyEnabled = useGenogramStore((s) => s.privacyEnabled);
  const privateFields = useGenogramStore((s) => s.privateFields);
  const togglePrivateField = useGenogramStore((s) => s.togglePrivateField);
  const on = !!privateFields[field];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 12,
        lineHeight: 1.2,
        color: '#86868b',
        marginTop: 8,
        marginBottom: 4,
        height: 18, // 固定行高 — checkbox 出現不撐大
      }}
    >
      <span>{label}</span>
      {privacyEnabled && (
        <label
          style={on ? uniCheckLabelActive : uniCheckLabel}
          title={t('privacy.fieldTip')}
        >
          <input
            type="checkbox"
            checked={on}
            onChange={() => togglePrivateField(field)}
            style={uniCheckboxStyle}
          />
          {t('privacy.toggle')}
        </label>
      )}
    </div>
  );
}

// ============ Sub-components ============

// 個人屬性 section:教育/族群/宗教/案件角色/家庭角色/身心障礙
function PersonalAttributes({ person }: { person: Person }) {
  const t = useT();
  const updatePerson = useGenogramStore((s) => s.updatePerson);
  const educationHistory = useGenogramStore((s) => s.educationHistory);
  const ethnicityHistory = useGenogramStore((s) => s.ethnicityHistory);
  const religionHistory = useGenogramStore((s) => s.religionHistory);
  const disabilityTypeHistory = useGenogramStore(
    (s) => s.disabilityTypeHistory,
  );
  const addAttributeToHistory = useGenogramStore(
    (s) => s.addAttributeToHistory,
  );

  // 合併預設清單與使用者歷史(歷史在前;去重)
  const merge = (presets: string[], history: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    [...history, ...presets].forEach((v) => {
      if (!seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    });
    return out;
  };

  const educationOptions = merge(EDUCATION_PRESETS, educationHistory);
  const ethnicityOptions = merge(ETHNICITY_PRESETS, ethnicityHistory);
  const religionOptions = merge(RELIGION_PRESETS, religionHistory);
  const disabilityTypeOptions = merge(
    DISABILITY_TYPE_PRESETS,
    disabilityTypeHistory,
  );

  const setBasic = (patch: Partial<Person['basicInfo']>) =>
    updatePerson(person.id, { basicInfo: patch });

  const disabilities = person.basicInfo?.disabilities ?? [];
  const familyRoles = person.basicInfo?.familyRoles ?? [];

  return (
    <>
      {/* 教育程度 + 宗教信仰 並排;教育有值時顯示狀態 dropdown(畢業/在學/肄業) */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <LabelWithPrivacy label={t('tab1.education')} field="education" />
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <EditableSelect
                value={person.basicInfo?.education ?? ''}
                onChange={(v) => {
                  // v1.1: 切到「不識字」時清掉 educationStatus(否則殘留無意義);
                  //       第一次填一般學歷時自動帶 'graduated'
                  if (v && EDUCATION_NO_STATUS.has(v)) {
                    setBasic({ education: v, educationStatus: undefined });
                  } else if (v && !person.basicInfo?.educationStatus) {
                    setBasic({ education: v, educationStatus: 'graduated' });
                  } else {
                    setBasic({ education: v });
                  }
                }}
                options={educationOptions}
                onAddToHistory={(v) => addAttributeToHistory('education', v)}
                placeholder={t('tab1.educationPlaceholder')}
              />
            </div>
            {person.basicInfo?.education &&
              !EDUCATION_NO_STATUS.has(person.basicInfo.education) && (
              <select
                value={person.basicInfo?.educationStatus ?? 'graduated'}
                onChange={(e) =>
                  setBasic({
                    educationStatus: e.target.value as
                      | 'graduated'
                      | 'attending'
                      | 'dropped',
                  })
                }
                style={{
                  width: 60,
                  padding: '6px 4px',
                  fontSize: 12,
                  border: '1px solid #d2d2d7',
                  borderRadius: 4,
                  background: '#fff',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                }}
                title={`${t('tab1.educationStatus.graduated')} / ${t('tab1.educationStatus.attending')} / ${t('tab1.educationStatus.dropped')}`}
              >
                <option value="graduated">{t('tab1.educationStatus.graduated')}</option>
                <option value="attending">{t('tab1.educationStatus.attending')}</option>
                <option value="dropped">{t('tab1.educationStatus.dropped')}</option>
              </select>
            )}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <LabelWithPrivacy label={t('tab1.religion')} field="religion" />
          <EditableSelect
            value={person.basicInfo?.religion ?? ''}
            onChange={(v) => setBasic({ religion: v })}
            options={religionOptions}
            onAddToHistory={(v) => addAttributeToHistory('religion', v)}
            placeholder={t('tab1.religionPlaceholder')}
          />
        </div>
      </div>

      {/* 族群/國籍 + 法律家庭角色 並排 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <LabelWithPrivacy label={t('tab1.ethnicity')} field="ethnicity" />
          <EditableSelect
            value={person.basicInfo?.ethnicity ?? ''}
            onChange={(v) => setBasic({ ethnicity: v })}
            options={ethnicityOptions}
            onAddToHistory={(v) => addAttributeToHistory('ethnicity', v)}
            placeholder={t('tab1.ethnicityPlaceholder')}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <LabelWithAdd
            label={t('tab1.familyRoles')}
            privacyField="familyRoles"
            onAdd={() => setBasic({ familyRoles: [...familyRoles, ''] })}
          />
          <FamilyRoleList
            values={familyRoles}
            onChange={(roles) => setBasic({ familyRoles: roles })}
          />
        </div>
      </div>

      {/* 身心障礙(多筆) */}
      <LabelWithAdd
        label={t('tab1.disabilities')}
        privacyField="disabilities"
        onAdd={() =>
          setBasic({
            disabilities: [
              ...disabilities,
              { id: `dis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, type: '', level: '' },
            ],
          })
        }
      />
      <DisabilityList
        values={disabilities}
        onChange={(ds) => setBasic({ disabilities: ds })}
        typeOptions={disabilityTypeOptions}
        onAddTypeToHistory={(v) =>
          addAttributeToHistory('disabilityType', v)
        }
      />
    </>
  );
}

// 法律/家庭角色:多筆 EditableSelect(用 FAMILY_ROLE_PRESETS,不存歷史)
function FamilyRoleList({
  values,
  onChange,
}: {
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const t = useT();
  const isPlaceholder = values.length === 0;
  const displayed = isPlaceholder ? [''] : values;
  return (
    <div>
      {displayed.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <EditableSelect
              value={v}
              onChange={(newVal) => {
                if (isPlaceholder) {
                  onChange([newVal]);
                } else {
                  onChange(values.map((x, j) => (j === i ? newVal : x)));
                }
              }}
              options={FAMILY_ROLE_PRESETS}
              placeholder={t('tab1.familyRolePlaceholder')}
            />
          </div>
          {!isPlaceholder && (
            <button
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              style={removeBtnStyle}
              title={t('common.delete')}
            >
              <CrossGlyph size={13} stroke={1.8} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// 身心障礙:多筆 {type, level, note}
function DisabilityList({
  values,
  onChange,
  typeOptions,
  onAddTypeToHistory,
}: {
  values: Disability[];
  onChange: (v: Disability[]) => void;
  typeOptions: string[];
  onAddTypeToHistory: (v: string) => void;
}) {
  const t = useT();
  if (values.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#86868b', padding: 4 }}>
        {t('tab1.disabilityEmpty')}
      </div>
    );
  }
  return (
    <div>
      {values.map((d, i) => (
        <div
          key={d.id}
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 6,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ flex: 5 }}>
            <EditableSelect
              value={d.type}
              onChange={(v) =>
                onChange(values.map((x, j) => (j === i ? { ...x, type: v } : x)))
              }
              options={typeOptions}
              onAddToHistory={onAddTypeToHistory}
              placeholder={t('tab1.disabilityType')}
            />
          </div>
          <div style={{ flex: 3 }}>
            <EditableSelect
              value={d.level ?? ''}
              onChange={(v) =>
                onChange(
                  values.map((x, j) => (j === i ? { ...x, level: v } : x)),
                )
              }
              options={DISABILITY_LEVEL_PRESETS}
              placeholder={t('tab1.disabilityLevel')}
            />
          </div>
          <button
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            style={removeBtnStyle}
            title={t('common.delete')}
          >
            <CrossGlyph size={13} stroke={1.8} />
          </button>
        </div>
      ))}
    </div>
  );
}

// 居住地:永遠展開,onChange 直接寫
function LocationField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useT();
  return (
    <>
      <LabelWithPrivacy label={t('tab1.location')} field="location" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('tab1.locationPlaceholder')}
        style={inputStyle}
      />
    </>
  );
}

// 收入欄位:永遠展開,onChange 直接寫(IncomeInput 自己處理金額+週期)
function IncomeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useT();
  return (
    <>
      <LabelWithPrivacy label={t('tab1.income')} field="income" />
      <IncomeInput value={value} onChange={onChange} />
    </>
  );
}

// 收入輸入:左邊數字 + 右邊週期下拉(年/月/週)
// 空白時切換週期仍保留(不會跳回預設年)
function IncomeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useT();
  // 注意:VALUES 是資料層,跨語言永遠存中文;LABELS 才是顯示
  const PERIODS = ['年', '月', '週'] as const;
  type P = (typeof PERIODS)[number];
  const PERIOD_LABEL: Record<P, string> = {
    '年': t('tab1.incomePeriod.year'),
    '月': t('tab1.incomePeriod.month'),
    '週': t('tab1.incomePeriod.week'),
  };
  // 解析:用最後一個 token 當週期
  let amount = '';
  let period: P = '年';
  if (value) {
    const parts = value.split(' ');
    const last = parts[parts.length - 1];
    if ((PERIODS as readonly string[]).includes(last)) {
      period = last as P;
      amount = parts.slice(0, -1).join(' ');
    } else {
      amount = value;
    }
  }
  const save = (newAmount: string, newPeriod: P) => {
    const a = newAmount.trim();
    // 空金額 + 預設週期 → 存空字串;其餘永遠存「<金額> <週期>」保留下拉
    if (!a && newPeriod === '年') {
      onChange('');
    } else {
      onChange(`${a} ${newPeriod}`);
    }
  };
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <input
        type="text"
        value={amount}
        onChange={(e) => save(e.target.value, period)}
        placeholder={t('tab1.incomePlaceholder')}
        style={{ ...inputStyle, flex: 7, minWidth: 0 }}
      />
      <select
        value={period}
        onChange={(e) => save(amount, e.target.value as P)}
        style={{ ...selectStyle, flex: 3, minWidth: 0 }}
      >
        {PERIODS.map((p) => (
          <option key={p} value={p}>
            {PERIOD_LABEL[p]}
          </option>
        ))}
      </select>
    </div>
  );
}

// 民國紀元 offset(西元 1912 = 民國 1)
const ROC_OFFSET = 1911;

function DateDropdowns({
  value,
  onChange,
  useLocalYear,
}: {
  value?: PartialDate;
  onChange: (d: PartialDate) => void;
  useLocalYear?: boolean;
}) {
  const t = useT();
  const currentYear = new Date().getFullYear();
  // 內部永遠存西元 — 此處只在「顯示」與「寫入」時轉換
  const toDisplay = (g: number | undefined) =>
    g === undefined ? undefined : useLocalYear ? g - ROC_OFFSET : g;
  const toStored = (display: number | undefined) =>
    display === undefined
      ? undefined
      : useLocalYear
        ? display + ROC_OFFSET
        : display;

  const years: number[] = [];
  if (useLocalYear) {
    // 民國 1 ~ 現在民國年(2026 → 115)
    const currentROC = currentYear - ROC_OFFSET;
    for (let y = currentROC; y >= 1; y--) years.push(y);
  } else {
    // 西元:過去 120 年
    for (let y = currentYear; y >= currentYear - 120; y--) years.push(y);
  }
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const setField = (field: 'year' | 'month' | 'day', v: string) => {
    const n = v ? Number(v) : undefined;
    if (field === 'year') {
      onChange({ ...(value ?? {}), year: toStored(n) });
    } else {
      onChange({ ...(value ?? {}), [field]: n });
    }
  };

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <select
        value={toDisplay(value?.year) ?? ''}
        onChange={(e) => setField('year', e.target.value)}
        style={{ ...selectStyle, flex: 1.2 }}
      >
        <option value="">{useLocalYear ? t('tab1.rocYear') : t('tab1.year')}</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        value={value?.month ?? ''}
        onChange={(e) => setField('month', e.target.value)}
        style={selectStyle}
      >
        <option value="">{t('tab1.month')}</option>
        {months.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={value?.day ?? ''}
        onChange={(e) => setField('day', e.target.value)}
        style={selectStyle}
      >
        <option value="">{t('tab1.day')}</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}

function MultiStringList({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const t = useT();
  // values 為空時 render 一個 placeholder 行(不在 store);打字觸發 onChange 寫第一筆
  const isPlaceholder = values.length === 0;
  const displayed = isPlaceholder ? [''] : values;

  return (
    <div>
      {displayed.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <input
            type="text"
            value={v}
            placeholder={placeholder}
            onChange={(e) => {
              const newVal = e.target.value;
              if (isPlaceholder) {
                onChange([newVal]);
              } else {
                onChange(
                  values.map((x, j) => (j === i ? newVal : x)),
                );
              }
            }}
            style={{ ...inputStyle, flex: 1 }}
          />
          {!isPlaceholder && (
            <button
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              style={removeBtnStyle}
              title={t('common.delete')}
            >
              <CrossGlyph size={13} stroke={1.8} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function MultiContactList({
  values,
  onChange,
  labelOptions,
  placeholder,
}: {
  values: ContactInfo[];
  onChange: (values: ContactInfo[]) => void;
  labelOptions: string[];
  placeholder: string;
}) {
  const t = useT();
  // 中文 value → 翻譯後 label 的對照
  const optionLabel = (v: string) =>
    CONTACT_LABEL_KEYS[v] ? t(CONTACT_LABEL_KEYS[v]) : v;
  // values 為空時 render placeholder(label 用 local state 暫存,輸入 value 才寫入 store)
  const [draftLabel, setDraftLabel] = useState(labelOptions[0]);
  const isPlaceholder = values.length === 0;
  const displayed: ContactInfo[] = isPlaceholder
    ? [{ label: draftLabel, value: '' }]
    : values;

  return (
    <div>
      {displayed.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <select
            value={c.label}
            onChange={(e) => {
              const newLabel = e.target.value;
              if (isPlaceholder) {
                setDraftLabel(newLabel);
              } else {
                onChange(
                  values.map((x, j) =>
                    j === i ? { ...x, label: newLabel } : x,
                  ),
                );
              }
            }}
            style={{ ...selectStyle, flex: 3 }}
          >
            {labelOptions.map((l) => (
              <option key={l} value={l}>
                {optionLabel(l)}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={c.value}
            placeholder={placeholder}
            onChange={(e) => {
              const newVal = e.target.value;
              if (isPlaceholder) {
                onChange([{ label: draftLabel, value: newVal }]);
              } else {
                onChange(
                  values.map((x, j) =>
                    j === i ? { ...x, value: newVal } : x,
                  ),
                );
              }
            }}
            style={{ ...inputStyle, flex: 7 }}
          />
          {!isPlaceholder && (
            <button
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              style={removeBtnStyle}
              title={t('common.delete')}
            >
              <CrossGlyph size={13} stroke={1.8} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function MiniSymbolBtn({
  code,
  // tooltip 參數保留(向後相容 BASIC_ITEMS 等定義),但不再使用
  // 改成完全從 symbolData 取,依語言切換,不顯示 description(那是繪圖備注)
  active,
  onClick,
}: {
  code: string;
  tooltip: string;
  active: boolean;
  onClick: () => void;
}) {
  const lang = useGenogramStore((s) => s.language);
  const sym = SYMBOLS.find((s) => s.code === code);
  if (!sym) return null;
  const labelName = lang === 'en' ? sym.nameEn : sym.name;
  return (
    <button
      onClick={onClick}
      style={{
        ...miniBtnStyle,
        ...(active
          ? {
              border: '2px solid #007aff',
              outline: 'none',
              background: '#f0f7ff',
            }
          : {}),
      }}
      data-tooltip={`#${sym.number} ${labelName}`}
    >
      <svg viewBox="-44 -36 88 72" width={36} height={30} style={{ display: 'block' }}>
        {sym.render()}
      </svg>
    </button>
  );
}

function Section({
  title,
  inline,
  right,
  children,
}: {
  title: string;
  inline?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 13,
          lineHeight: 1.2,
          fontWeight: 600,
          color: '#1d1d1f',
          marginBottom: 8,
          borderBottom: '1px solid #e5e4e7',
          paddingBottom: 4,
          gap: 8,
          height: 22, // 固定高度 — inline/right 出現不撐大
        }}
      >
        <span>{title}</span>
        {inline}
        <span style={{ flex: 1 }} />
        {right}
      </div>
      {children}
    </div>
  );
}

// 標籤 + 緊接的 + 按鈕(開啟暫存填寫列),右邊可選保密
function LabelWithAdd({
  label,
  onAdd,
  privacyField,
}: {
  label: string;
  onAdd: () => void;
  privacyField?: PrivacyField;
}) {
  const t = useT();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        fontSize: 12,
        lineHeight: 1.2,
        color: '#86868b',
        marginTop: 8,
        marginBottom: 4,
        height: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{label}</span>
        <button onClick={onAdd} style={inlineAddBtnStyle} title={t('common.addItem')}>
          <PlusGlyph size={13} stroke={1.8} />
        </button>
      </div>
      {privacyField && <InlinePrivacyToggle field={privacyField} />}
    </div>
  );
}

const tinyCheckLabel: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  fontSize: 12,
  lineHeight: 1.2,
  color: '#6e6e73',
  fontWeight: 400,
  cursor: 'pointer',
  userSelect: 'none',
  height: 18,
  whiteSpace: 'nowrap',
};

// 統一所有勾選框樣式(用於保密 / 區段 / 欄位)
const uniCheckLabel: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  fontSize: 12,
  lineHeight: 1.2,
  color: '#86868b',
  fontWeight: 400,
  cursor: 'pointer',
  userSelect: 'none',
  height: 18,
  whiteSpace: 'nowrap',
};
const uniCheckLabelActive: React.CSSProperties = {
  ...uniCheckLabel,
  color: '#ff3b30',
};

// 原生 checkbox 尺寸固定 + 無 focus ring
const uniCheckboxStyle: React.CSSProperties = {
  width: 13,
  height: 13,
  margin: 0,
  flexShrink: 0,
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  fontSize: 13,
  border: '1px solid #d2d2d7',
  borderRadius: 4,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  background: '#ffffff',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 6px',
  fontSize: 13,
  border: '1px solid #d2d2d7',
  borderRadius: 4,
  fontFamily: 'inherit',
  background: '#ffffff',
  flex: 1,
};

// Mini 按鈕 — 40x40,只顯示縮圖,不帶編號
const miniBtnStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  padding: 2,
  background: '#ffffff',
  border: '2px solid transparent',
  outline: '1px solid #d2d2d7',
  outlineOffset: -1,
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
};

// 新增人物 — 藍實心圓 + 白＋(主要動作,跟符號方框按鈕區隔)
const addPersonBtnStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  padding: 2,
  background: '#007aff',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: '#ffffff',
  fontSize: 22,
  fontWeight: 600,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
};

const flowGridStyle: React.CSSProperties = {
  display: 'flex',
  gap: 3,
  flexWrap: 'wrap',
};

const tinyBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  fontSize: 14,
  background: '#ffffff',
  border: '1px solid #d2d2d7',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: '#007aff',
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

// 內嵌 + 按鈕(放 Label 後面)— 藍實心圓 + 白＋
const inlineAddBtnStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  padding: 0,
  background: '#007aff',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1,
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
};

const dangerBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 12,
  background: '#ffffff',
  border: '1px solid #ff3b30',
  color: '#ff3b30',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
