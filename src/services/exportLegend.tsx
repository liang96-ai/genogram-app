// 匯出附圖例(1.6.1):圖下方自動附上「這張圖有用到的符號」。
// 圖示直接用符號圖例(Gallery)那一套畫法,和畫布一致;不另外畫一份。
//   legendCodes()        純函式:從個案資料挑出用到的符號代碼(可測試)
//   renderLegendSvg()    把代碼畫成一段 SVG(只在瀏覽器匯出時用)
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { Genogram, LineSubType, Person } from '../types/genogram';
import { SYMBOLS } from '../components/Gallery/symbolData';

/** 圖例專用、Gallery 沒有的項目 */
const PROBAND_CODE = 'proband';
const HOUSEHOLD_CODE = 'household';
const ROTATING_CODE = 'household-rotating';

const SHAPE_CODES: Record<string, string> = {
  square: 'square',
  circle: 'circle',
  triangle: 'triangle',
  diamond: 'diamond',
  institution: 'institution',
  pet: 'pet',
};

const LIFE_CODES: Record<string, string> = {
  pregnancy: 'preg-alive',
  miscarriage: 'miscarriage',
  stillbirth: 'stillbirth',
  abortion: 'abortion',
};

/** 醫療填色 → Gallery 代碼前綴(後面接 -m / -f) */
const FILL_CODES: Record<string, string> = {
  'left-diagonal-stripes': 'susp-ill',
  'diagonal-stripes': 'susp-ill',
  'left-half-filled': 'disabled',
  'left-horizontal-stripes': 'rec-ill',
  'bottom-diagonal-stripes': 'susp-sub',
  'bottom-half-filled': 'conf-sub',
  'bottom-horizontal-stripes': 'rec-sub',
  'combined-filled': 'comb-ill',
  'combined-recovery': 'rec-comb',
  'carrier-dot': 'carr',
  'affected-cross': 'aff',
  'possibly-question': 'poss-aff',
};

const LINE_CODES: Partial<Record<LineSubType, string>> = {
  marriage: 'marriage',
  'love-affair': 'secret',
  'secret-affair': 'secret',
  separation: 'separation',
  divorce: 'divorce',
  engagement: 'engagement',
  cohabitation: 'cohabitation',
  'engagement-cohabitation': 'engagement-cohabitation',
  'engagement-separation': 'engagement-separation',
  biological: 'bio',
  adopted: 'adopted',
  fostered: 'fostered',
  'placed-out': 'placed-out',
  'sperm-donor': 'sperm',
  twins: 'twins',
  'identical-twins': 'id-twins',
  miscarriage: 'miscarriage',
  stillbirth: 'stillbirth',
  abortion: 'abortion',
  connected: 'connected',
  close: 'close',
  fused: 'fused',
  'close-hostile': 'close-hostile',
  distant: 'distant',
  hostile: 'hostile',
  spiritual: 'spiritual',
  'focus-on': 'focus',
  'negative-focus': 'neg-focus',
  'physical-abuse': 'phy-abuse',
  'emotional-abuse': 'emo-abuse',
  'sexual-abuse': 'sex-abuse',
  caregiver: 'caregiver',
  cutoff: 'cutoff',
  'cutoff-repaired': 'cutoff-rep',
};

const sexSuffix = (p: Person) => (p.shape === 'square' ? 'm' : 'f');

/**
 * 挑出這張圖用到的符號。
 * withLines = false:匯出勾了「隱藏關係細節」,線的種類不放進圖例(圖上也已經不分線型)。
 */
export function legendCodes(c: Genogram, opts: { withLines: boolean }): string[] {
  const used = new Set<string>();
  for (const p of c.persons) {
    const shape = SHAPE_CODES[p.shape];
    if (shape) used.add(shape);
    if (p.genderVariant && p.genderVariant !== 'cisgender') used.add(p.genderVariant);
    if (p.lifeStatus === 'deceased') used.add(`deceased-${sexSuffix(p)}`);
    const life = p.lifeStatus ? LIFE_CODES[p.lifeStatus] : undefined;
    if (life) used.add(life);
    for (const f of p.fillPatterns ?? []) {
      const pre = FILL_CODES[f];
      if (pre) used.add(`${pre}-${sexSuffix(p)}`);
    }
    if (p.twinGroupId) used.add(p.twinType === 'identical' ? 'id-twins' : 'twins');
  }
  if (opts.withLines) {
    for (const l of c.lines) {
      if (l.private) continue;
      const code = LINE_CODES[l.subType];
      if (code) used.add(code);
    }
  }
  // 依符號圖例的順序排,再接圖例專用的三項
  const ordered = SYMBOLS.map((s) => s.code).filter((code) => used.has(code) && code !== PROBAND_CODE && code !== HOUSEHOLD_CODE);
  const extra: string[] = [];
  if (c.persons.some((p) => p.isProband)) extra.push(PROBAND_CODE);
  const hhs = c.households ?? [];
  if (hhs.some((h) => !h.rotating)) extra.push(HOUSEHOLD_CODE);
  if (hhs.some((h) => h.rotating)) extra.push(ROTATING_CODE);
  return [...ordered, ...extra];
}

type RenderOpts = {
  lang: 'zh' | 'en';
  probandStyle: 'border' | 'traditional';
  /** 圖例可用的寬度(跟著匯出圖的寬度) */
  width: number;
};

const CELL_W = 150;
const ROW_H = 40;
const TITLE_H = 26;
const ICON_SCALE = 0.42;

// 這三個是「回傳 SVG 片段的函式」不是元件(此檔還匯出一般函式,快速重整規則要求分開)
function probandIcon(style: 'border' | 'traditional') {
  if (style === 'traditional') {
    return <rect x={-24} y={-24} width={48} height={48} fill="#404040" stroke="#1d1d1f" strokeWidth={2} />;
  }
  return (
    <>
      <rect x={-28} y={-28} width={56} height={56} fill="none" stroke="#ff3b30" strokeWidth={2} />
      <rect x={-24} y={-24} width={48} height={48} fill="#ffffff" stroke="#1d1d1f" strokeWidth={2} />
    </>
  );
}

function rotatingIcon() {
  return (
    <>
      <rect x={-16} y={-14} width={14} height={14} fill="#ffffff" stroke="#1d1d1f" strokeWidth={1.5} />
      <circle cx={10} cy={-7} r={7} fill="#ffffff" stroke="#1d1d1f" strokeWidth={1.5} />
      <ellipse cx={-3} cy={-2} rx={24} ry={22} fill="none" stroke="#007aff" strokeWidth={2} strokeDasharray="0.5 5" strokeLinecap="round" />
    </>
  );
}

function labelFor(code: string, lang: 'zh' | 'en'): string {
  if (code === PROBAND_CODE) return lang === 'en' ? 'Client (proband)' : '案主';
  if (code === HOUSEHOLD_CODE) return lang === 'en' ? 'Household' : '同住圈';
  if (code === ROTATING_CODE) return lang === 'en' ? 'Rotating stay' : '輪住';
  const s = SYMBOLS.find((x) => x.code === code);
  if (!s) return code;
  return lang === 'en' ? s.nameEn : s.name;
}

function iconFor(code: string, probandStyle: 'border' | 'traditional') {
  if (code === PROBAND_CODE) return probandIcon(probandStyle);
  if (code === ROTATING_CODE) return rotatingIcon();
  return SYMBOLS.find((x) => x.code === code)?.render() ?? null;
}

function legendTree(codes: string[], opts: RenderOpts) {
  const cols = Math.max(1, Math.floor(opts.width / CELL_W));
  return (
    <g data-export-legend="">
      <text x={0} y={14} fontSize={13} fontWeight={700} fill="#1d1d1f">
        {opts.lang === 'en' ? 'Legend' : '圖例'}
      </text>
      {codes.map((code, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * CELL_W;
        const y = TITLE_H + row * ROW_H + ROW_H / 2;
        return (
          <g key={code} transform={`translate(${x}, ${y})`}>
            <g transform={`translate(18, 0) scale(${ICON_SCALE})`}>{iconFor(code, opts.probandStyle)}</g>
            <text x={44} y={0} dominantBaseline="central" fontSize={12} fill="#3a3a3c">
              {labelFor(code, opts.lang)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** 圖例高度(不含上方間距) */
export function legendHeight(count: number, width: number): number {
  if (count === 0) return 0;
  const cols = Math.max(1, Math.floor(width / CELL_W));
  return TITLE_H + Math.ceil(count / cols) * ROW_H;
}

/** 畫成 SVG 片段(<g>…</g> 的字串)。只在瀏覽器裡呼叫。 */
export function renderLegendSvg(codes: string[], opts: RenderOpts): string {
  const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const root = createRoot(host);
  flushSync(() => root.render(legendTree(codes, opts)));
  const markup = host.innerHTML;
  root.unmount();
  return markup;
}
