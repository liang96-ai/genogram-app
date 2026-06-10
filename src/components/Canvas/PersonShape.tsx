import type {
  BasicShape,
  FillPattern,
  GenderVariant,
  LifeStatus,
  PartialDate,
  Person,
} from '../../types/genogram';
import {
  useGenogramStore,
  type PrivacyField,
} from '../../store/genogramStore';
import { useT } from '../../i18n';
import DeleteButton from './DeleteButton';

// 懸浮提示文字 — 透過 i18n key 對照表(在 component 內 t())
const SHAPE_KEY: Record<BasicShape, string> = {
  square: 'shape.square',
  circle: 'shape.circle',
  triangle: 'shape.triangle',
  diamond: 'shape.diamond',
  institution: 'shape.institution',
  pet: 'shape.pet',
};
const VARIANT_KEY: Record<GenderVariant, string> = {
  cisgender: '',
  mtf: 'variant.mtf',
  ftm: 'variant.ftm',
  gay: 'variant.gay',
  lesbian: 'variant.lesbian',
  bisexual: 'variant.bisexual',
};
const LIFE_KEY: Record<LifeStatus, string> = {
  alive: '',
  deceased: 'life.deceased',
  pregnancy: 'life.pregnancy',
  miscarriage: 'life.miscarriage',
  stillbirth: 'life.stillbirth',
  abortion: 'life.abortion',
};

type Props = {
  person: Person;
  selected: boolean;
  colliding?: boolean;
  displayScaleOverride?: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
  onDelete?: () => void;
};

const SIZE = 56;
const HALF = SIZE / 2;
// 菱形邊長 34 — 縮到對齊 Gallery 比例(菱形對角線 ≈ 方形 86%);原 48 太肥(對角線比方形大 21%)
const DIAMOND_SIDE = 34;
const DIAMOND_HALF = DIAMOND_SIDE / Math.SQRT2;
const PROBAND_COLOR = '#ff3b30';
// 病症填實色(McGoldrick 用填實表嚴重度,用深灰 #666 讓中央字可辨)
const PATTERN_FILL = '#777777';

// 機構長條:固定 3 格寬(180px),文字超出自動縮字/截斷
const INST_WIDTH = 180;
const INST_HALF = INST_WIDTH / 2;
const INST_HEIGHT = SIZE * 0.7; // ~39px
const INST_HALF_H = INST_HEIGHT / 2;

// CJK 與全形標點 → 全寬(≈fontSize);ASCII 半形 → 半寬(≈fontSize*0.55)
// 依字型估寬比純字元數準很多 — 例如「手機: 0912-345678」實寬約只有
// CJK 估寬 + 半形 × 0.55 = 2*11 + 12*6 = 94px,而非 14*11 = 154px
// U+3000-U+9FFF: CJK 標點 + 統一漢字;U+FF00-U+FFEF: 全形 ASCII + 半形片假名
// (用 unicode escape 寫 — 範圍起點是全形空白 U+3000,字面寫法會觸發 no-irregular-whitespace)
const CJK_REGEX = /[\u3000-\u9FFF\uFF00-\uFFEF]/;
function estimateTextWidth(s: string, fontSize: number): number {
  let w = 0;
  for (const c of s) {
    w += CJK_REGEX.test(c) ? fontSize : fontSize * 0.55;
  }
  return w;
}
function truncateToWidth(
  s: string,
  maxWidth: number,
  fontSize: number,
): string {
  if (estimateTextWidth(s, fontSize) <= maxWidth) return s;
  for (let i = s.length - 1; i > 0; i--) {
    const candidate = s.slice(0, i) + '…';
    if (estimateTextWidth(candidate, fontSize) <= maxWidth) return candidate;
  }
  return '…';
}

// 根據名字長度決定字體大小(機構 rect 內文字)
function fitInstText(name: string): { text: string; fontSize: number } {
  const n = name || '(未命名)';
  const padding = 10; // 左右留白
  const inner = INST_WIDTH - padding * 2; // 可用寬度
  // 粗估 CJK 寬 ≈ fontSize;英數 ≈ fontSize*0.55
  // 保守用 fontSize 當字寬(CJK 場景)
  if (n.length * 13 <= inner) return { text: n, fontSize: 13 };
  if (n.length * 11 <= inner) return { text: n, fontSize: 11 };
  if (n.length * 10 <= inner) return { text: n, fontSize: 10 };
  const maxChars = Math.floor(inner / 10) - 1;
  return { text: n.slice(0, Math.max(1, maxChars)) + '…', fontSize: 10 };
}

// 西元:'24(撇號 + 2 位)— 節省畫布空間
// 民國:民115 — 加「民」字前綴避免跟西元混淆
function formatYearLabel(
  year: number | undefined,
  useLocalYear: boolean | undefined,
): string {
  if (!year) return '';
  if (useLocalYear) {
    return `民${year - 1911}`;
  }
  const y = year % 100;
  return `'${y.toString().padStart(2, '0')}`;
}

function computeAge(birth?: PartialDate, death?: PartialDate): number | null {
  if (!birth?.year) return null;
  const end = death?.year
    ? new Date(death.year, (death.month ?? 1) - 1, death.day ?? 1)
    : new Date();
  const start = new Date(
    birth.year,
    (birth.month ?? 1) - 1,
    birth.day ?? 1,
  );
  let age = end.getFullYear() - start.getFullYear();
  const m = end.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < start.getDate())) age--;
  return age >= 0 ? age : null;
}

export default function PersonShape({
  person,
  selected,
  colliding,
  displayScaleOverride,
  onPointerDown,
  onDoubleClick,
  onDelete,
}: Props) {
  const t = useT();
  const privacyEnabled = useGenogramStore((s) => s.privacyEnabled);
  const privateFields = useGenogramStore((s) => s.privateFields);
  const probandStyle = useGenogramStore((s) => s.probandStyle);
  // 案主傳統樣式:整塊黑色填滿(取代雙紅匡)
  const isTraditionalProband =
    !!person.isProband && probandStyle === 'traditional';
  const showField = (f: PrivacyField) => {
    if (!privacyEnabled) return true;
    if (privateFields[f]) return false;
    return true;
  };

  const { x, y } = person.position;
  const stroke = selected ? '#007aff' : '#1d1d1f';
  const strokeWidth = selected ? 2.5 : 1.5;
  const scale = displayScaleOverride ?? person.scale ?? 1;

  const lifeStatus: LifeStatus = person.lifeStatus ?? 'alive';
  const isAbortion = lifeStatus === 'abortion';
  const isStillbirth = lifeStatus === 'stillbirth';
  const isMiscarriage = lifeStatus === 'miscarriage';
  // 流產 / 死產 → 整個形狀填實色;
  // 傳統案主樣式 → 整塊黑;
  // 其他 → 白
  const fill = isTraditionalProband
    ? '#000000'
    : isMiscarriage || isStillbirth
      ? PATTERN_FILL
      : '#ffffff';
  // 已逝 → 畫 X 標記(死產改用填滿,不再畫 X)
  const isDead = lifeStatus === 'deceased';
  const showXOverlay = isDead;

  const hasBirth = !!person.birthDate?.year;
  const hasDeath = !!person.deathDate?.year;

  const variant = person.genderVariant;
  // mtf/ftm/gay/lesbian 會 override 外形(照 McGoldrick 標準)
  const actualShape: BasicShape =
    variant === 'mtf'
      ? 'circle'
      : variant === 'ftm'
        ? 'square'
        : variant === 'gay'
          ? 'square'
          : variant === 'lesbian'
            ? 'circle'
            : person.shape;

  const ageOrLifespan: number | null = hasBirth
    ? computeAge(person.birthDate, person.deathDate)
    : isDead
      ? (person.textInfo?.lifeSpan ?? person.textInfo?.age ?? null)
      : (person.textInfo?.age ?? null);

  const renderBasic = (shape: BasicShape) => {
    switch (shape) {
      case 'square':
        return (
          <rect
            x={-HALF}
            y={-HALF}
            width={SIZE}
            height={SIZE}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      case 'circle':
        return (
          <circle
            r={HALF}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      case 'triangle': {
        // 流產 → 縮小版填實三角形
        const h = isMiscarriage ? HALF * 0.55 : HALF;
        return (
          <polygon
            points={`0,${-h} ${h},${h} ${-h},${h}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      }
      case 'diamond':
        return (
          <polygon
            points={`0,${-DIAMOND_HALF} ${DIAMOND_HALF},0 0,${DIAMOND_HALF} ${-DIAMOND_HALF},0`}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      case 'institution':
        return (
          <rect
            x={-INST_HALF}
            y={-INST_HALF_H}
            width={INST_WIDTH}
            height={INST_HEIGHT}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      case 'pet':
        return (
          <polygon
            points={`0,${-HALF * 0.6} ${HALF * 0.6},0 0,${HALF * 0.6} ${-HALF * 0.6},0`}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
    }
  };

  const renderVariantOverlay = () => {
    // 倒三角頂寬 → 占基本形狀約 75%,高占約 75%
    const triTopHalfW = HALF * 0.75;
    const triTop = -HALF * 0.62;
    const triBottom = HALF * 0.62;
    const triPts = `${-triTopHalfW},${triTop} ${triTopHalfW},${triTop} 0,${triBottom}`;
    switch (variant) {
      case 'mtf': {
        // 外圓 r=HALF,內方的角要切到圓邊 → 角到圓心 = HALF - strokeWidth/2
        // 內方半寬 = (HALF - strokeWidth/2) / √2
        const innerHalf = (HALF - strokeWidth / 2) / Math.SQRT2;
        return (
          <rect
            x={-innerHalf}
            y={-innerHalf}
            width={innerHalf * 2}
            height={innerHalf * 2}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      }
      case 'ftm':
        // 外方邊 ±HALF,內圓要切到邊中點 → r = HALF - strokeWidth/2
        return (
          <circle
            r={HALF - strokeWidth / 2}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      case 'gay':
      case 'lesbian':
        return (
          <polygon
            points={triPts}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      case 'bisexual':
        // 虛線倒三角
        return (
          <polygon
            points={triPts}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray="4 2"
          />
        );
      default:
        return null;
    }
  };

  const renderProband = () => {
    if (!person.isProband) return null;
    // 傳統樣式不畫雙匡(已用整塊黑色填滿表達案主)
    if (isTraditionalProband) return null;
    const offset = 6;
    const s = actualShape;
    const color = PROBAND_COLOR;
    if (s === 'circle') {
      return (
        <circle
          r={HALF + offset}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
        />
      );
    }
    if (s === 'square' || s === 'institution') {
      const w = s === 'institution' ? INST_WIDTH + offset * 2 : SIZE + offset * 2;
      const h = s === 'institution' ? INST_HEIGHT + offset * 2 : SIZE + offset * 2;
      const xx = s === 'institution' ? -INST_HALF - offset : -HALF - offset;
      const yy = s === 'institution' ? -INST_HALF_H - offset : -HALF - offset;
      return (
        <rect
          x={xx}
          y={yy}
          width={w}
          height={h}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
        />
      );
    }
    if (s === 'diamond') {
      const dh = DIAMOND_HALF + offset;
      return (
        <polygon
          points={`0,${-dh} ${dh},0 0,${dh} ${-dh},0`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
        />
      );
    }
    return (
      <circle
        r={HALF + offset}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="3 3"
      />
    );
  };

  const renderCollisionHalo = () => {
    if (!colliding) return null;
    const offset = 12;
    const s = actualShape;
    const color = '#ff9500';
    const dash = '4 3';
    if (s === 'circle') {
      return (
        <circle
          r={HALF + offset}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dash}
        />
      );
    }
    if (s === 'square') {
      return (
        <rect
          x={-HALF - offset}
          y={-HALF - offset}
          width={SIZE + offset * 2}
          height={SIZE + offset * 2}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dash}
        />
      );
    }
    if (s === 'institution') {
      return (
        <rect
          x={-INST_HALF - offset}
          y={-INST_HALF_H - offset}
          width={INST_WIDTH + offset * 2}
          height={INST_HEIGHT + offset * 2}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dash}
        />
      );
    }
    if (s === 'diamond') {
      const dh = DIAMOND_HALF + offset;
      return (
        <polygon
          points={`0,${-dh} ${dh},0 0,${dh} ${-dh},0`}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dash}
        />
      );
    }
    // triangle / pet — 退回畫外框圓
    return (
      <circle
        r={HALF + offset}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dash}
      />
    );
  };

  const renderDeathX = () => {
    if (!showXOverlay) return null;
    const w = hasDeath ? strokeWidth : strokeWidth * 2;
    return (
      <>
        <line
          x1={-HALF}
          y1={-HALF}
          x2={HALF}
          y2={HALF}
          stroke={stroke}
          strokeWidth={w}
        />
        <line
          x1={-HALF}
          y1={HALF}
          x2={HALF}
          y2={-HALF}
          stroke={stroke}
          strokeWidth={w}
        />
      </>
    );
  };

  // 中央年齡字體大小;不再畫白底圓(改全靠 text 自己的白邊)
  const centerFontSize = 17;

  const showCenterText =
    ageOrLifespan != null && (!isDead || hasDeath) && showField('age');

  const birthLabel =
    hasBirth && showField('birthYear')
      ? isDead
        ? formatYearLabel(person.birthDate?.year, person.useLocalYear)
        : `${formatYearLabel(person.birthDate?.year, person.useLocalYear)}-`
      : '';
  const deathLabel =
    hasDeath && showField('deathYear')
      ? formatYearLabel(person.deathDate?.year, person.useLocalYear)
      : '';

  // 形狀上方:居住地置左、收入置右(分兩端對齊)
  const locationText =
    person.textInfo?.location && showField('location')
      ? person.textInfo.location
      : '';
  const incomeText =
    person.textInfo?.income && showField('income')
      ? person.textInfo.income.replace(' ', '/')
      : '';

  const name = showField('name') ? person.basicInfo?.name : undefined;

  const topEdge =
    actualShape === 'institution' ? -INST_HALF_H : -HALF;
  const bottomEdge =
    actualShape === 'institution' ? INST_HALF_H : HALF;

  // 機構專屬:名字放框內;備注(person.notes)顯示在框下方
  const isInstitution = actualShape === 'institution';
  const instText = isInstitution
    ? fitInstText(person.basicInfo?.name ?? '')
    : null;

  // 建立懸浮提示(hover tooltip)— 依目前語言渲染
  const tipParts: string[] = [];
  tipParts.push(t(SHAPE_KEY[actualShape]));
  if (variant && variant !== 'cisgender' && VARIANT_KEY[variant])
    tipParts.push(t(VARIANT_KEY[variant]));
  if (lifeStatus !== 'alive' && LIFE_KEY[lifeStatus])
    tipParts.push(t(LIFE_KEY[lifeStatus]));
  if (person.isProband) tipParts.push(t('tooltip.proband'));
  if (colliding) tipParts.push(t('tooltip.overlap'));
  const tooltip = tipParts.filter(Boolean).join(' · ');

  // ==================== 妊娠結果特殊渲染 (v1.1 對齊 NSGC 2008/2022) ====================
  // 早期 return,跳過 fillPattern + variant overlay(妊娠結果通常不疊醫療符號)
  //
  //   #13 stillbirth → 方+X (NSGC ⊠ Stillbirth)
  //   #14 miscarriage → 小實心圓 (NSGC SAB)
  //   #15 abortion → 三角+對角線 (NSGC TOP)
  //
  // 跟 Gallery #13-15 視覺一致(symbolData.tsx StillbirthSquare/MiscarriageDot/AbortionTriangleSlash)
  if (isStillbirth || isMiscarriage || isAbortion) {
    const renderPregnancyOutcome = () => {
      if (isStillbirth) {
        // McGoldrick ⊟ — 菱形 + 對角 X (未知性別 stillbirth 標準寫法)
        // X 用 ±HALF 延伸到菱形外(對齊 #17 過世女的 DeathX 視覺風格,跟「已往生」一致)
        return (
          <>
            <polygon
              points={`0,${-DIAMOND_HALF} ${DIAMOND_HALF},0 0,${DIAMOND_HALF} ${-DIAMOND_HALF},0`}
              fill="#ffffff"
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <line x1={-HALF} y1={-HALF} x2={HALF} y2={HALF} stroke={stroke} strokeWidth={strokeWidth * 1.5} />
            <line x1={-HALF} y1={HALF} x2={HALF} y2={-HALF} stroke={stroke} strokeWidth={strokeWidth * 1.5} />
          </>
        );
      }
      if (isMiscarriage) {
        // NSGC SAB — 小實心圓
        return <circle r={HALF * 0.45} fill={stroke} />;
      }
      // isAbortion — NSGC TOP — 三角 + 對角線
      const h = HALF;
      return (
        <>
          <polygon
            points={`0,${-h} ${h},${h} ${-h},${h}`}
            fill="#ffffff"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <line x1={-h} y1={h} x2={h} y2={-h} stroke={stroke} strokeWidth={strokeWidth * 1.5} />
        </>
      );
    };
    return (
      <g
        transform={`translate(${x}, ${y}) scale(${scale})`}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        style={{ cursor: 'grab' }}
        data-tooltip={tooltip}
      >
        {renderCollisionHalo()}
        {/* 點擊熱區 — 確保整個符號範圍都可以點 */}
        <circle r={HALF + 4} fill="transparent" />
        {renderPregnancyOutcome()}
        {name && (
          <text
            x={0}
            y={HALF + 18}
            textAnchor="middle"
            fontSize={12}
            fill="#1d1d1f"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {name}
          </text>
        )}
      </g>
    );
  }

  // ==================== FillPattern 渲染 ====================
  // 依 actualShape(square/circle) 裁切填色
  const patternsRaw = person.fillPatterns ?? [];
  // 舊名 migration
  const patternsAll: FillPattern[] = patternsRaw.map((p) =>
    p === 'diagonal-stripes' ? 'left-diagonal-stripes' : p,
  );
  // 案主傳統樣式(整塊黑)優先級最高 — 跳過所有 fillPattern,
  // 避免出現「一半灰一半黑」(例:案主 + 身障 left-half-filled)
  const patterns: FillPattern[] = isTraditionalProband ? [] : patternsAll;
  const clipId = `clip-${person.id}`;
  const showFillPatterns = patterns.length > 0;
  const clipShape = (() => {
    switch (actualShape) {
      case 'circle':
        return <circle r={HALF} />;
      case 'triangle': {
        const h = isMiscarriage ? HALF * 0.55 : HALF;
        return <polygon points={`0,${-h} ${h},${h} ${-h},${h}`} />;
      }
      case 'diamond':
        return (
          <polygon
            points={`0,${-DIAMOND_HALF} ${DIAMOND_HALF},0 0,${DIAMOND_HALF} ${-DIAMOND_HALF},0`}
          />
        );
      case 'institution':
        return (
          <rect
            x={-INST_HALF}
            y={-INST_HALF_H}
            width={INST_WIDTH}
            height={INST_HEIGHT}
          />
        );
      case 'pet': {
        const h = HALF * 0.6;
        return <polygon points={`0,${-h} ${h},0 0,${h} ${-h},0`} />;
      }
      case 'square':
      default:
        return <rect x={-HALF} y={-HALF} width={SIZE} height={SIZE} />;
    }
  })();
  const stripePatternId = `stripe-${person.id}`;
  const horzPatternId = `horz-${person.id}`;
  const stripeDef = showFillPatterns && (
    <defs>
      <clipPath id={clipId}>{clipShape}</clipPath>
      <pattern
        id={stripePatternId}
        width="5"
        height="5"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="5" stroke={PATTERN_FILL} strokeWidth="1.6" />
      </pattern>
      <pattern
        id={horzPatternId}
        width="6"
        height="5"
        patternUnits="userSpaceOnUse"
      >
        <line x1="0" y1="2.5" x2="6" y2="2.5" stroke={PATTERN_FILL} strokeWidth="1.6" />
      </pattern>
    </defs>
  );
  const renderPattern = (p: FillPattern) => {
    const clip = `url(#${clipId})`;
    const stripe = `url(#${stripePatternId})`;
    const horz = `url(#${horzPatternId})`;
    switch (p) {
      case 'left-half-filled':
        return <rect x={-HALF} y={-HALF} width={HALF} height={SIZE} fill={PATTERN_FILL} clipPath={clip} />;
      case 'right-half-filled':
        return <rect x={0} y={-HALF} width={HALF} height={SIZE} fill={PATTERN_FILL} clipPath={clip} />;
      case 'bottom-half-filled':
        return <rect x={-HALF} y={0} width={SIZE} height={HALF} fill={PATTERN_FILL} clipPath={clip} />;
      case 'top-half-filled':
        return <rect x={-HALF} y={-HALF} width={SIZE} height={HALF} fill={PATTERN_FILL} clipPath={clip} />;
      case 'fully-filled':
        return <rect x={-HALF} y={-HALF} width={SIZE} height={SIZE} fill={PATTERN_FILL} clipPath={clip} />;
      case 'left-diagonal-stripes':
        return <rect x={-HALF} y={-HALF} width={HALF} height={SIZE} fill={stripe} clipPath={clip} />;
      case 'bottom-diagonal-stripes':
        return <rect x={-HALF} y={0} width={SIZE} height={HALF} fill={stripe} clipPath={clip} />;
      case 'left-horizontal-stripes':
        return <rect x={-HALF} y={-HALF} width={HALF} height={SIZE} fill={horz} clipPath={clip} />;
      case 'bottom-horizontal-stripes':
        return <rect x={-HALF} y={0} width={SIZE} height={HALF} fill={horz} clipPath={clip} />;
      case 'combined-filled':
        return (
          <>
            <rect x={-HALF} y={-HALF} width={HALF} height={SIZE} fill={PATTERN_FILL} clipPath={clip} />
            <rect x={-HALF} y={0} width={SIZE} height={HALF} fill={PATTERN_FILL} clipPath={clip} />
          </>
        );
      case 'combined-recovery':
        return (
          <>
            <rect x={-HALF} y={-HALF} width={HALF} height={SIZE} fill={horz} clipPath={clip} />
            <rect x={-HALF} y={0} width={SIZE} height={HALF} fill={horz} clipPath={clip} />
          </>
        );
      case 'cross-recovery':
        return (
          <>
            <line x1={-HALF} y1={0} x2={HALF} y2={0} stroke={stroke} strokeWidth={strokeWidth} />
            <line x1={0} y1={-HALF} x2={0} y2={HALF} stroke={stroke} strokeWidth={strokeWidth} />
          </>
        );
      case 'carrier-dot':
        return <circle r={5} fill={stroke} />;
      case 'affected-cross':
        return (
          <>
            <line x1={-HALF} y1={0} x2={HALF} y2={0} stroke={stroke} strokeWidth={strokeWidth} clipPath={clip} />
            <line x1={0} y1={-HALF} x2={0} y2={HALF} stroke={stroke} strokeWidth={strokeWidth} clipPath={clip} />
          </>
        );
      case 'suspected-vertical':
        return <line x1={0} y1={-HALF} x2={0} y2={HALF} stroke={stroke} strokeWidth={strokeWidth} clipPath={clip} />;
      case 'possibly-question':
        return (
          <text x={0} y={8} textAnchor="middle" fontSize={22} fontWeight={600} fill={stroke}>
            ?
          </text>
        );
      default:
        return null;
    }
  };

  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale})`}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      style={{ cursor: 'grab' }}
      data-tooltip={tooltip}
    >
      {renderCollisionHalo()}
      {renderProband()}
      {renderBasic(actualShape)}
      {stripeDef}
      {patterns.map((p, i) => (
        <g key={`${p}-${i}`}>{renderPattern(p)}</g>
      ))}
      {renderVariantOverlay()}
      {renderDeathX()}

      {/* 附加標記(customMarks) — S/L/O 等,S 上 L 中 O 下 */}
      {(() => {
        const marks = person.customMarks ?? [];
        if (marks.length === 0) return null;
        const ORDER = ['S', 'L', 'O']; // 固定順序
        // 每個 symbol 的固定 y 位置(跟著字母決定)
        const Y_MAP: Record<string, number> = {
          S: -HALF + 10, // 上
          L: 5, // 中
          O: HALF - 2, // 下
        };
        const rightX =
          actualShape === 'institution' ? INST_HALF + 8 : HALF + 8;
        // 只渲染認得的 symbol,依 ORDER 固定位置
        return ORDER.filter((sym) => marks.some((m) => m.symbol === sym)).map(
          (sym) => (
            <text
              key={sym}
              x={rightX}
              y={Y_MAP[sym]}
              textAnchor="start"
              fontSize={14}
              fontWeight={700}
              fill={stroke}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {sym}
            </text>
          ),
        );
      })()}

      {showCenterText && (
        <text
          x={0}
          y={6}
          textAnchor="middle"
          fontSize={centerFontSize}
          fontWeight={700}
          fill={stroke}
          stroke="#ffffff"
          strokeWidth={3}
          strokeLinejoin="round"
          paintOrder="stroke"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {ageOrLifespan}
        </text>
      )}

      {/* 形狀上方 4 行(由遠到近):宗教/族群、教育/家庭角色、居住地/收入、出生/死亡
          全部左右對稱,寬度對齊到 ±xExtent,中央留 8px 通道讓親子線穿過 */}
      {(() => {
        // xExtent 從原本的 +50/+16 各往中間收 20px(約 2 個中文字寬)
        const xExtent = isInstitution ? INST_HALF - 4 : HALF + 30;
        const CENTER_GAP = 4; // 文字邊緣到中心線的距離(每邊 4 → 中央通道 8px)
        const availableW = xExtent - CENTER_GAP;
        // 改用估寬截字 — CJK 全寬 / ASCII 半寬,比純字元數判斷準確
        const truncate = (s: string) => truncateToWidth(s, availableW, 10);

        type Cell = { text: string; color: string };
        type Row = { y: number; left?: Cell; right?: Cell };
        const rows: Row[] = [];
        const GRAY = '#6e6e73';

        // Row 1(最遠 y=topEdge-46):宗教 / 族群
        const rel = person.basicInfo?.religion;
        const eth = person.basicInfo?.ethnicity;
        const relShow = !!rel && showField('religion');
        const ethShow = !!eth && showField('ethnicity');
        if (relShow || ethShow) {
          rows.push({
            y: topEdge - 46,
            left: relShow ? { text: truncate(rel!), color: GRAY } : undefined,
            right: ethShow ? { text: truncate(eth!), color: GRAY } : undefined,
          });
        }

        // Row 2(y=topEdge-32):教育(畢業/在學/肄業) / 家庭角色
        const edu = person.basicInfo?.education;
        let eduText: string | undefined;
        if (edu && showField('education')) {
          const statusMap = {
            graduated: '畢業',
            attending: '在學',
            dropped: '肄業',
          } as const;
          const status =
            statusMap[person.basicInfo?.educationStatus ?? 'graduated'];
          eduText = `${edu} ${status}`;
        }
        const fRoles = (person.basicInfo?.familyRoles ?? []).filter(
          (r) => r && r.trim(),
        );
        let rolesText: string | undefined;
        if (fRoles.length > 0 && showField('familyRoles')) {
          rolesText = fRoles.join('、');
        }
        if (eduText || rolesText) {
          rows.push({
            y: topEdge - 32,
            left: eduText ? { text: truncate(eduText), color: GRAY } : undefined,
            right: rolesText
              ? { text: truncate(rolesText), color: GRAY }
              : undefined,
          });
        }

        // Row 3(y=topEdge-18):居住地 / 收入
        if (locationText || incomeText) {
          rows.push({
            y: topEdge - 18,
            left: locationText
              ? { text: truncate(locationText), color: GRAY }
              : undefined,
            right: incomeText
              ? { text: truncate(incomeText), color: GRAY }
              : undefined,
          });
        }

        // Row 4(最近 y=topEdge-4):出生 / 死亡 — 用 stroke 深色
        if (birthLabel || deathLabel) {
          rows.push({
            y: topEdge - 4,
            left: birthLabel
              ? { text: truncate(birthLabel), color: stroke }
              : undefined,
            right: deathLabel
              ? { text: truncate(deathLabel), color: stroke }
              : undefined,
          });
        }

        if (rows.length === 0) return null;

        return (
          <>
            {rows.map((row, i) => (
              <g key={i}>
                {row.left && (
                  <text
                    x={-xExtent}
                    y={row.y}
                    textAnchor="start"
                    fontSize={10}
                    fill={row.left.color}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {row.left.text}
                  </text>
                )}
                {row.right && (
                  <text
                    x={xExtent}
                    y={row.y}
                    textAnchor="end"
                    fontSize={10}
                    fill={row.right.color}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {row.right.text}
                  </text>
                )}
              </g>
            ))}
          </>
        );
      })()}

      {/* 機構:名字放在 rect 裡面,備注放在下面 */}
      {isInstitution && instText && (
        <text
          x={0}
          y={5}
          textAnchor="middle"
          fontSize={instText.fontSize}
          fontWeight={500}
          fill="#1d1d1f"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {instText.text}
        </text>
      )}
      {isInstitution && (() => {
        const note = person.basicInfo?.freeNote ?? person.notes ?? '';
        if (!note || !showField('freeNote')) return null;
        const lines = note.split('\n').slice(0, 10).map((l) =>
          l.length > 20 ? l.slice(0, 19) + '…' : l,
        );
        if (lines.length === 0) return null;
        return (
          <text
            x={0}
            y={bottomEdge + 16}
            textAnchor="middle"
            fontSize={11}
            fill="#6e6e73"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {lines.map((line, i) => (
              <tspan key={i} x={0} dy={i === 0 ? 0 : 14}>
                {line || ' '}
              </tspan>
            ))}
          </text>
        );
      })()}

      {/* 非機構:名字在下方,備注再下方 */}
      {!isInstitution && name && (
        <text
          x={0}
          y={bottomEdge + 18}
          textAnchor="middle"
          fontSize={13}
          fill="#1d1d1f"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {name}
        </text>
      )}

      {/* 非機構:名字下方依序顯示 聯絡方式 / 備注 / 疾病 / 藥物;11px 灰字左對齊
          x 範圍對齊上方 4 行(±xExtent),截字長度依此寬度動態計算 */}
      {!isInstitution && (() => {
        // 不對稱寬度:開頭(左)對齊上方 -xExtent,結尾(右)放寬 +20px
        // 這樣長備注 / 電話 / 藥名 多顯示 ~2-3 個 CJK 或 ~3-4 個 ASCII
        const xStart = -(HALF + 30); // -58,對齊上方左邊
        const xEnd = HALF + 50; // +78,比上方右邊多 20px
        const totalWidth = xEnd - xStart; // 136
        // 估寬截字 — 同上方邏輯,只是用 fontSize=11 + 不對稱寬度
        const truncate = (s: string) => truncateToWidth(s, totalWidth, 11);
        const sections: { lines: string[] }[] = [];

        const phones = (person.basicInfo?.phones ?? []).filter(
          (p) => p.value && p.value.trim(),
        );
        if (phones.length > 0 && showField('phones')) {
          const lines = phones.slice(0, 10).map((p) =>
            truncate(p.label ? `${p.label}: ${p.value}` : p.value),
          );
          sections.push({ lines });
        }

        // (教育 / 族群 / 宗教 / 家庭角色 已移到形狀上方 4 行區塊,此處不再顯示)

        // 身心障礙(多筆 type+level)
        const dis = (person.basicInfo?.disabilities ?? []).filter(
          (d) => d.type && d.type.trim(),
        );
        if (dis.length > 0 && showField('disabilities')) {
          sections.push({
            lines: dis.slice(0, 10).map((d) =>
              truncate(d.level ? `${d.type}(${d.level})` : d.type),
            ),
          });
        }

        const note = person.basicInfo?.freeNote ?? '';
        if (note.trim() && showField('freeNote')) {
          const lines = note.split('\n').slice(0, 10).map(truncate);
          if (lines.length > 0) sections.push({ lines });
        }

        const conds = (person.medicalConditions ?? [])
          .map((c) => c.name)
          .filter(Boolean);
        if (conds.length > 0 && showField('medicalConditions')) {
          sections.push({ lines: conds.slice(0, 10).map(truncate) });
        }

        const meds = (person.medications ?? [])
          .map((m) => m.name)
          .filter(Boolean);
        if (meds.length > 0 && showField('medications')) {
          sections.push({ lines: meds.slice(0, 10).map(truncate) });
        }

        if (sections.length === 0) return null;

        // 起點:有名字 → 名字下;無名字 → 形狀下
        let yCursor = name ? bottomEdge + 32 : bottomEdge + 18;
        return (
          <>
            {sections.map((section, sIdx) => {
              const startY = yCursor;
              yCursor += section.lines.length * 14; // 段落緊貼,無間距
              return (
                <text
                  key={sIdx}
                  x={xStart}
                  y={startY}
                  textAnchor="start"
                  fontSize={11}
                  fill="#6e6e73"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {section.lines.map((line, i) => (
                    <tspan key={i} x={xStart} dy={i === 0 ? 0 : 14}>
                      {line || ' '}
                    </tspan>
                  ))}
                </text>
              );
            })}
          </>
        );
      })()}

      {/* 灰 ▲ 已移除,合併進 SmallArrows 的藍 ▲ 上箭頭
          (短按加父母 / 長按 500ms 進入拖曳 → 建立未明家人線) */}

      {/* × 刪除按鈕(選中時浮現於右上) */}
      {selected && onDelete && (
        <DeleteButton
          cx={
            actualShape === 'institution' ? INST_HALF + 8 : HALF + 8
          }
          cy={
            actualShape === 'institution' ? -INST_HALF_H - 8 : -HALF - 8
          }
          onClick={onDelete}
          title="刪除此人物"
        />
      )}
    </g>
  );
}
