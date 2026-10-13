// 範本選擇(1.6.1):新增個案的對話框、空白畫布的起步卡共用。
import { useT } from '../../i18n';
import { TEMPLATE_IDS, type TemplateId } from '../../services/caseTemplates';

export type TemplateChoice = TemplateId | 'blank';

type Props = {
  value?: TemplateChoice;
  onPick: (choice: TemplateChoice) => void;
  /** 新增個案時多一個「空白」 */
  includeBlank?: boolean;
};

export default function TemplatePicker({ value, onPick, includeBlank }: Props) {
  const t = useT();
  const choices: TemplateChoice[] = includeBlank ? ['blank', ...TEMPLATE_IDS] : [...TEMPLATE_IDS];
  return (
    <div role="radiogroup" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(136px, 1fr))', gap: 8 }}>
      {choices.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            data-template={c}
            onClick={() => onPick(c)}
            style={{
              display: 'grid',
              gap: 2,
              textAlign: 'left',
              padding: '8px 10px',
              borderRadius: 8,
              border: active ? '1.5px solid #007aff' : '1px solid #d2d2d7',
              background: active ? '#eef5ff' : '#ffffff',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1d1d1f' }}>{t(`template.${c}`)}</span>
            <span style={{ fontSize: 11.5, color: '#6e6e73', lineHeight: 1.4 }}>{t(`template.${c}.hint`)}</span>
          </button>
        );
      })}
    </div>
  );
}
