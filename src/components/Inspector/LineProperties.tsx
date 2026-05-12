import type { Line, LineSubType } from '../../types/genogram';
import { useGenogramStore, SUBTYPE_SPEC } from '../../store/genogramStore';
import { useT } from '../../i18n';

type Props = {
  line: Line;
  embedded?: boolean;
};

// label/group 改成 i18n key,渲染時再 t()
type SubTypeGroupKey =
  | 'lineProps.group.marriage'
  | 'lineProps.group.parent'
  | 'lineProps.group.sibling'
  | 'relation.group.positive'
  | 'relation.group.neutral'
  | 'relation.group.negative'
  | 'relation.group.violence'
  | 'relation.group.cutoff';

const MEMBER_SUBTYPES: {
  value: LineSubType;
  labelKey: string;
  groupKey: SubTypeGroupKey;
}[] = [
  // 婚姻系列
  { value: 'marriage', labelKey: 'lineProps.subType.marriage', groupKey: 'lineProps.group.marriage' },
  { value: 'engagement', labelKey: 'lineProps.subType.engagement', groupKey: 'lineProps.group.marriage' },
  { value: 'divorce', labelKey: 'lineProps.subType.divorce', groupKey: 'lineProps.group.marriage' },
  { value: 'separation', labelKey: 'lineProps.subType.separation', groupKey: 'lineProps.group.marriage' },
  { value: 'legal-separation', labelKey: 'lineProps.subType.legalSeparation', groupKey: 'lineProps.group.marriage' },
  { value: 'engagement-separation', labelKey: 'lineProps.subType.engagementSeparation', groupKey: 'lineProps.group.marriage' },
  { value: 'widowed', labelKey: 'lineProps.subType.widowed', groupKey: 'lineProps.group.marriage' },
  { value: 'cohabitation', labelKey: 'lineProps.subType.cohabitation', groupKey: 'lineProps.group.marriage' },
  { value: 'legal-cohabitation', labelKey: 'lineProps.subType.legalCohabitation', groupKey: 'lineProps.group.marriage' },
  { value: 'engagement-cohabitation', labelKey: 'lineProps.subType.engagementCohabitation', groupKey: 'lineProps.group.marriage' },
  { value: 'love-affair', labelKey: 'lineProps.subType.loveAffair', groupKey: 'lineProps.group.marriage' },
  // 親子系列
  { value: 'biological', labelKey: 'lineProps.subType.biological', groupKey: 'lineProps.group.parent' },
  { value: 'adopted', labelKey: 'lineProps.subType.adopted', groupKey: 'lineProps.group.parent' },
  { value: 'fostered', labelKey: 'lineProps.subType.fostered', groupKey: 'lineProps.group.parent' },
  { value: 'placed-out', labelKey: 'lineProps.subType.placedOut', groupKey: 'lineProps.group.parent' },
  // 手足
  { value: 'twins', labelKey: 'lineProps.subType.twins', groupKey: 'lineProps.group.sibling' },
  { value: 'identical-twins', labelKey: 'lineProps.subType.identicalTwins', groupKey: 'lineProps.group.sibling' },
  // 關係線 #62-76(5 小組)
  { value: 'connected', labelKey: 'lineProps.subType.connected', groupKey: 'relation.group.positive' },
  { value: 'close', labelKey: 'lineProps.subType.close', groupKey: 'relation.group.positive' },
  { value: 'fused', labelKey: 'lineProps.subType.fused', groupKey: 'relation.group.positive' },
  { value: 'spiritual', labelKey: 'lineProps.subType.spiritual', groupKey: 'relation.group.positive' },
  { value: 'distant', labelKey: 'lineProps.subType.distant', groupKey: 'relation.group.neutral' },
  { value: 'focus-on', labelKey: 'lineProps.subType.focusOn', groupKey: 'relation.group.neutral' },
  { value: 'hostile', labelKey: 'lineProps.subType.hostile', groupKey: 'relation.group.negative' },
  { value: 'close-hostile', labelKey: 'lineProps.subType.closeHostile', groupKey: 'relation.group.negative' },
  { value: 'negative-focus', labelKey: 'lineProps.subType.negativeFocus', groupKey: 'relation.group.negative' },
  { value: 'physical-abuse', labelKey: 'lineProps.subType.physicalAbuse', groupKey: 'relation.group.violence' },
  { value: 'emotional-abuse', labelKey: 'lineProps.subType.emotionalAbuse', groupKey: 'relation.group.violence' },
  { value: 'sexual-abuse', labelKey: 'lineProps.subType.sexualAbuse', groupKey: 'relation.group.violence' },
  { value: 'caregiver', labelKey: 'lineProps.subType.caregiver', groupKey: 'relation.group.cutoff' },
  { value: 'cutoff', labelKey: 'lineProps.subType.cutoff', groupKey: 'relation.group.cutoff' },
  { value: 'cutoff-repaired', labelKey: 'lineProps.subType.cutoffRepaired', groupKey: 'relation.group.cutoff' },
];

export default function LineProperties({ line, embedded }: Props) {
  const t = useT();
  const updateLine = useGenogramStore((s) => s.updateLine);
  const removeLine = useGenogramStore((s) => s.removeLine);
  const showConfirm = useGenogramStore((s) => s.showConfirm);

  const outerStyle: React.CSSProperties = embedded
    ? {}
    : { padding: 16, overflowY: 'auto', height: '100%' };

  // 依 group 分組
  const groupKeys = Array.from(new Set(MEMBER_SUBTYPES.map((x) => x.groupKey)));

  const handleTypeChange = (newSubType: LineSubType) => {
    const spec = SUBTYPE_SPEC[newSubType];
    // 判定新的 category(用 MEMBER_SUBTYPES 表內找 groupKey)
    const entry = MEMBER_SUBTYPES.find((x) => x.value === newSubType);
    const newCategory: 'member' | 'relation' = entry?.groupKey.startsWith(
      'relation.',
    )
      ? 'relation'
      : 'member';
    if (spec) {
      updateLine(line.id, {
        subType: newSubType,
        category: newCategory,
        visual: { ...line.visual, lineStyle: spec.lineStyle },
      });
    } else {
      updateLine(line.id, { subType: newSubType, category: newCategory });
    }
  };

  return (
    <div style={outerStyle}>
      <Section title={t('lineProps.title')}>
        <Label>{t('lineProps.type')}</Label>
        <select
          value={line.subType}
          onChange={(e) => handleTypeChange(e.target.value as LineSubType)}
          style={inputStyle}
        >
          {groupKeys.map((gKey) => (
            <optgroup key={gKey} label={t(gKey)}>
              {MEMBER_SUBTYPES.filter((x) => x.groupKey === gKey).map((x) => (
                <option key={x.value} value={x.value}>
                  {t(x.labelKey)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <Label>{t('lineProps.note')}</Label>
        <input
          type="text"
          value={line.note ?? ''}
          onChange={(e) => updateLine(line.id, { note: e.target.value })}
          placeholder={t('lineProps.notePlaceholder')}
          style={inputStyle}
        />

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            fontSize: 12,
            color: line.private ? '#ff3b30' : '#86868b',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={!!line.private}
            onChange={(e) =>
              updateLine(line.id, { private: e.target.checked })
            }
            style={{ width: 13, height: 13, margin: 0 }}
          />
          {t('lineProps.private')}
        </label>
      </Section>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <button
          onClick={async () => {
            const ok = await showConfirm(t('lineProps.deleteConfirm'));
            if (ok) removeLine(line.id);
          }}
          style={dangerBtnStyle}
        >
          {t('lineProps.delete')}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#1d1d1f',
          marginBottom: 8,
          borderBottom: '1px solid #e5e4e7',
          paddingBottom: 4,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ fontSize: 11, color: '#86868b', marginTop: 8, marginBottom: 4 }}
    >
      {children}
    </div>
  );
}

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
