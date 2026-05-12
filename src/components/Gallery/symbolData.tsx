import type { JSX } from 'react';

// ==================== 符號圖例清單(v2, 加 M/F 變體) ====================
// 依照 McGoldrick-Gerson-Petry 國際家系圖標準 +
// 醫療/行為填充參考圖(Medical Genogram Symbols - Monochrome)

export type SymbolCategory =
  | '基本形狀'
  | '性別亞型'
  | '妊娠狀態'
  | '生命狀態'
  | '醫療-心理生理疾病'
  | '醫療-成癮'
  | '醫療-合併'
  | '醫療-遺傳'
  | '附加標記'
  | '成員線-婚姻'
  | '成員線-親子'
  | '成員線-手足'
  | '成員線-妊娠'
  | '關係線-正向'
  | '關係線-中性'
  | '關係線-負向'
  | '關係線-暴力'
  | '關係線-照顧斷裂'
  | '特殊視覺';

export type SymbolEntry = {
  number: number;
  category: SymbolCategory;
  name: string;
  nameEn: string;
  code: string;
  description: string;
  render: () => JSX.Element;
};

// ==================== 常數 ====================
const H = 24;
const S = H * 2;
const STROKE = '#1d1d1f';
const W = 2;
const FILL = '#ffffff';
const DASH = '6 4';
const DOT = '2 3';

// ==================== 形狀基底 ====================
function Square(props: { fill?: string } = {}) {
  return (
    <rect
      x={-H}
      y={-H}
      width={S}
      height={S}
      fill={props.fill ?? FILL}
      stroke={STROKE}
      strokeWidth={W}
    />
  );
}
function Circle(props: { fill?: string } = {}) {
  return (
    <circle
      r={H}
      fill={props.fill ?? FILL}
      stroke={STROKE}
      strokeWidth={W}
    />
  );
}
function Triangle(props: { fill?: string; small?: boolean } = {}) {
  const h = props.small ? H * 0.6 : H;
  return (
    <polygon
      points={`0,${-h} ${h},${h} ${-h},${h}`}
      fill={props.fill ?? FILL}
      stroke={STROKE}
      strokeWidth={W}
    />
  );
}
function Diamond() {
  const h = H * 0.85;
  return (
    <polygon
      points={`0,${-h} ${h},0 0,${h} ${-h},0`}
      fill={FILL}
      stroke={STROKE}
      strokeWidth={W}
    />
  );
}
function PetDiamond() {
  const h = H * 0.55;
  return (
    <polygon
      points={`0,${-h} ${h},0 0,${h} ${-h},0`}
      fill={FILL}
      stroke={STROKE}
      strokeWidth={W}
    />
  );
}
function Institution() {
  return (
    <rect
      x={-28}
      y={-14}
      width={56}
      height={28}
      fill={FILL}
      stroke={STROKE}
      strokeWidth={W}
    />
  );
}

// ==================== 疾病填充(M=正方 / F=圓) ====================
// 幾何規則:
// 正方形 -24..24,圓形半徑 24。我們用 clipPath 共用通用填色,
// 各 pattern 畫一個覆蓋全圖的色塊,clipPath 把它裁成 square / circle

let clipCounter = 0;
function nextClipId() {
  clipCounter++;
  return `clipShape${clipCounter}`;
}

// 正方形框 + 內填 pattern
function PatternedSquare(patternFn: (clipId: string) => JSX.Element) {
  const clipId = nextClipId();
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x={-H} y={-H} width={S} height={S} />
        </clipPath>
      </defs>
      <rect x={-H} y={-H} width={S} height={S} fill={FILL} />
      {patternFn(clipId)}
      <rect
        x={-H}
        y={-H}
        width={S}
        height={S}
        fill="none"
        stroke={STROKE}
        strokeWidth={W}
      />
    </>
  );
}
function PatternedCircle(patternFn: (clipId: string) => JSX.Element) {
  const clipId = nextClipId();
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <circle r={H} />
        </clipPath>
      </defs>
      <circle r={H} fill={FILL} />
      {patternFn(clipId)}
      <circle r={H} fill="none" stroke={STROKE} strokeWidth={W} />
    </>
  );
}

// 各種填充區塊(接收 clipId,輸出被裁切的填色)
const fillLeftHalf = (clipId: string) => (
  <rect x={-H} y={-H} width={H} height={S} fill={STROKE} clipPath={`url(#${clipId})`} />
);
const fillBottomHalf = (clipId: string) => (
  <rect x={-H} y={0} width={S} height={H} fill={STROKE} clipPath={`url(#${clipId})`} />
);
const fillLeftDiag = (clipId: string) => (
  <>
    <defs>
      <pattern id={`diag-${clipId}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="5" stroke={STROKE} strokeWidth="1.6" />
      </pattern>
    </defs>
    <rect x={-H} y={-H} width={H} height={S} fill={`url(#diag-${clipId})`} clipPath={`url(#${clipId})`} />
  </>
);
const fillBottomDiag = (clipId: string) => (
  <>
    <defs>
      <pattern id={`diag-${clipId}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="5" stroke={STROKE} strokeWidth="1.6" />
      </pattern>
    </defs>
    <rect x={-H} y={0} width={S} height={H} fill={`url(#diag-${clipId})`} clipPath={`url(#${clipId})`} />
  </>
);
// In Recovery: 某區域用橫線填(代表「正在恢復」)
const fillLeftHorizontalStripes = (clipId: string) => (
  <>
    <defs>
      <pattern id={`horz-${clipId}`} width="6" height="5" patternUnits="userSpaceOnUse">
        <line x1="0" y1="2.5" x2="6" y2="2.5" stroke={STROKE} strokeWidth="1.6" />
      </pattern>
    </defs>
    <rect x={-H} y={-H} width={H} height={S} fill={`url(#horz-${clipId})`} clipPath={`url(#${clipId})`} />
  </>
);
const fillBottomHorizontalStripes = (clipId: string) => (
  <>
    <defs>
      <pattern id={`horz-${clipId}`} width="6" height="5" patternUnits="userSpaceOnUse">
        <line x1="0" y1="2.5" x2="6" y2="2.5" stroke={STROKE} strokeWidth="1.6" />
      </pattern>
    </defs>
    <rect x={-H} y={0} width={S} height={H} fill={`url(#horz-${clipId})`} clipPath={`url(#${clipId})`} />
  </>
);

// ==================== 遺傳符號 ====================
// Affected:全十字(inside) = 確診罹患基因疾病
function AffectedSquareInner() {
  return (
    <>
      {Square()}
      <line x1={-H} y1={0} x2={H} y2={0} stroke={STROKE} strokeWidth={W} />
      <line x1={0} y1={-H} x2={0} y2={H} stroke={STROKE} strokeWidth={W} />
    </>
  );
}
function AffectedCircleInner() {
  return (
    <>
      {Circle()}
      <line x1={-H} y1={0} x2={H} y2={0} stroke={STROKE} strokeWidth={W} />
      <line x1={0} y1={-H} x2={0} y2={H} stroke={STROKE} strokeWidth={W} />
    </>
  );
}
// Suspected Affected:單直線(inside)
function SuspAffectedSquare() {
  return (
    <>
      {Square()}
      <line x1={0} y1={-H} x2={0} y2={H} stroke={STROKE} strokeWidth={W} />
    </>
  );
}
function SuspAffectedCircle() {
  return (
    <>
      {Circle()}
      <line x1={0} y1={-H} x2={0} y2={H} stroke={STROKE} strokeWidth={W} />
    </>
  );
}
// Possibly Affected:問號在中
function PossAffectedSquare() {
  return (
    <>
      {Square()}
      <text x={0} y={7} textAnchor="middle" fontSize={22} fontWeight={600} fill={STROKE}>?</text>
    </>
  );
}
function PossAffectedCircle() {
  return (
    <>
      {Circle()}
      <text x={0} y={7} textAnchor="middle" fontSize={22} fontWeight={600} fill={STROKE}>?</text>
    </>
  );
}
// Carrier:中央點(小黑圓)
function CarrierSquare() {
  return (
    <>
      {Square()}
      <circle r={5} fill={STROKE} />
    </>
  );
}
function CarrierCircle() {
  return (
    <>
      {Circle()}
      <circle r={5} fill={STROKE} />
    </>
  );
}

// ==================== 附加標記(S/L/O) M/F ====================
function MarkOutside(letter: string, shape: 'square' | 'circle') {
  return (
    <>
      {shape === 'square' ? Square() : Circle()}
      <text
        x={H + 8}
        y={7}
        textAnchor="start"
        fontSize={14}
        fontWeight={700}
        fill={STROKE}
      >
        {letter}
      </text>
    </>
  );
}

// ==================== 死 X / 倒三角 overlay(性別亞型) ====================
function DeathX() {
  return (
    <>
      <line x1={-H} y1={-H} x2={H} y2={H} stroke={STROKE} strokeWidth={W * 1.5} />
      <line x1={-H} y1={H} x2={H} y2={-H} stroke={STROKE} strokeWidth={W * 1.5} />
    </>
  );
}
function DownTriangleOverlay(dashed = false) {
  const h = H * 0.5;
  return (
    <polygon
      points={`0,${h} ${h},${-h} ${-h},${-h}`}
      fill="none"
      stroke={STROKE}
      strokeWidth={W}
      strokeDasharray={dashed ? '3 2' : undefined}
    />
  );
}

// ==================== 性別亞型 ====================
function MTF() {
  const innerHalf = (H - W / 2) / Math.SQRT2;
  return (
    <>
      {Circle()}
      <rect
        x={-innerHalf}
        y={-innerHalf}
        width={innerHalf * 2}
        height={innerHalf * 2}
        fill="none"
        stroke={STROKE}
        strokeWidth={W}
      />
    </>
  );
}
function FTM() {
  return (
    <>
      {Square()}
      <circle r={H - W / 2} fill="none" stroke={STROKE} strokeWidth={W} />
    </>
  );
}
function GaySym() {
  return (
    <>
      {Square()}
      {DownTriangleOverlay()}
    </>
  );
}
function LesbianSym() {
  return (
    <>
      {Circle()}
      {DownTriangleOverlay()}
    </>
  );
}
function BiSym() {
  return (
    <>
      {Square()}
      {DownTriangleOverlay(true)}
    </>
  );
}

// ==================== 線條組件(viewBox: -40 -10 80 20) ====================
type LineProps = { dasharray?: string; sym?: 'slash' | 'slash2' | 'x' | 'house' };
function SimpleLine(props: LineProps = {}) {
  return (
    <g>
      <line x1={-34} y1={0} x2={34} y2={0} stroke={STROKE} strokeWidth={W} strokeDasharray={props.dasharray} />
      {props.sym === 'slash' && (
        <line x1={-3} y1={-8} x2={3} y2={8} stroke={STROKE} strokeWidth={W} />
      )}
      {props.sym === 'slash2' && (
        <>
          <line x1={-6} y1={-8} x2={0} y2={8} stroke={STROKE} strokeWidth={W} />
          <line x1={0} y1={-8} x2={6} y2={8} stroke={STROKE} strokeWidth={W} />
        </>
      )}
    </g>
  );
}
function DoubleLine() {
  return (
    <>
      <line x1={-34} y1={-3} x2={34} y2={-3} stroke={STROKE} strokeWidth={W} />
      <line x1={-34} y1={3} x2={34} y2={3} stroke={STROKE} strokeWidth={W} />
    </>
  );
}
function TripleLine() {
  return (
    <>
      <line x1={-34} y1={-5} x2={34} y2={-5} stroke={STROKE} strokeWidth={W} />
      <line x1={-34} y1={0} x2={34} y2={0} stroke={STROKE} strokeWidth={W} />
      <line x1={-34} y1={5} x2={34} y2={5} stroke={STROKE} strokeWidth={W} />
    </>
  );
}
function QuadLine() {
  return (
    <>
      <line x1={-34} y1={-6} x2={34} y2={-6} stroke={STROKE} strokeWidth={W} />
      <line x1={-34} y1={-2} x2={34} y2={-2} stroke={STROKE} strokeWidth={W} />
      <line x1={-34} y1={2} x2={34} y2={2} stroke={STROKE} strokeWidth={W} />
      <line x1={-34} y1={6} x2={34} y2={6} stroke={STROKE} strokeWidth={W} />
    </>
  );
}
function WavyLine() {
  return <path d="M -34 0 Q -25.5 -6 -17 0 T 0 0 T 17 0 T 34 0" fill="none" stroke={STROKE} strokeWidth={W} />;
}
function ZigzagLine(thickness = W) {
  return (
    <path
      d="M -34 0 L -28 -5 L -22 5 L -16 -5 L -10 5 L -4 -5 L 2 5 L 8 -5 L 14 5 L 20 -5 L 26 5 L 32 -5"
      fill="none"
      stroke={STROKE}
      strokeWidth={thickness}
    />
  );
}
function ArrowDef(id: string) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill={STROKE} />
      </marker>
    </defs>
  );
}
function SolidArrow(both = false) {
  return (
    <>
      {ArrowDef('gArrow')}
      <line x1={-30} y1={0} x2={30} y2={0} stroke={STROKE} strokeWidth={W} markerEnd="url(#gArrow)" markerStart={both ? 'url(#gArrow)' : undefined} />
    </>
  );
}
function CrossMark() {
  return (
    <>
      <line x1={-34} y1={0} x2={34} y2={0} stroke={STROKE} strokeWidth={W} />
      <line x1={-8} y1={-4} x2={-2} y2={4} stroke={STROKE} strokeWidth={W} />
      <line x1={2} y1={-4} x2={8} y2={4} stroke={STROKE} strokeWidth={W} />
    </>
  );
}
function KnotMark() {
  return (
    <>
      <line x1={-34} y1={0} x2={34} y2={0} stroke={STROKE} strokeWidth={W} />
      <circle cx={0} cy={0} r={5} fill={FILL} stroke={STROKE} strokeWidth={W} />
    </>
  );
}
function TwinsV(identical = false) {
  return (
    <g>
      <line x1={0} y1={-20} x2={-15} y2={10} stroke={STROKE} strokeWidth={W} />
      <line x1={0} y1={-20} x2={15} y2={10} stroke={STROKE} strokeWidth={W} />
      <rect x={-25} y={10} width={20} height={14} fill={FILL} stroke={STROKE} strokeWidth={W} />
      <rect x={5} y={10} width={20} height={14} fill={FILL} stroke={STROKE} strokeWidth={W} />
      {identical && <line x1={-10} y1={-2} x2={10} y2={-2} stroke={STROKE} strokeWidth={W} />}
    </g>
  );
}
function HouseholdSketch() {
  return (
    <>
      <rect x={-16} y={-14} width={14} height={14} fill={FILL} stroke={STROKE} strokeWidth={1.5} />
      <circle cx={10} cy={-7} r={7} fill={FILL} stroke={STROKE} strokeWidth={1.5} />
      <rect x={-10} y={6} width={14} height={14} fill={FILL} stroke={STROKE} strokeWidth={1.5} />
      <ellipse cx={-3} cy={-2} rx={24} ry={22} fill="none" stroke="#007aff" strokeWidth={1.5} strokeDasharray="4 3" />
    </>
  );
}
function ProbandSketch() {
  return (
    <>
      <rect x={-H - 4} y={-H - 4} width={S + 8} height={S + 8} fill="none" stroke="#ff3b30" strokeWidth={W} />
      {Square()}
    </>
  );
}
function ScaleSketch() {
  return (
    <g>
      <g transform="translate(-14, 0)">{Square()}</g>
      <g transform="translate(16, 0) scale(0.7)">{Square()}</g>
    </g>
  );
}

// ==================== 完整符號清單 ====================

let num = 0;
const next = () => ++num;

export const SYMBOLS: SymbolEntry[] = [
  // ===== 基本形狀 =====
  { number: next(), category: '基本形狀', name: '男性', nameEn: 'Male', code: 'square', description: '正方形', render: () => <>{Square()}</> },
  { number: next(), category: '基本形狀', name: '女性', nameEn: 'Female', code: 'circle', description: '圓形', render: () => <>{Circle()}</> },
  { number: next(), category: '基本形狀', name: '未知性別胎兒', nameEn: 'Unknown / Fetus', code: 'triangle', description: '三角形(胎兒/性別未定)', render: () => <>{Triangle()}</> },
  { number: next(), category: '基本形狀', name: '非二元性別', nameEn: 'Non-binary', code: 'diamond', description: '菱形', render: () => <>{Diamond()}</> },
  { number: next(), category: '基本形狀', name: '機構/單位', nameEn: 'Institution', code: 'institution', description: '橫長方形', render: () => <>{Institution()}</> },
  { number: next(), category: '基本形狀', name: '寵物', nameEn: 'Pet', code: 'pet', description: '小菱形', render: () => <>{PetDiamond()}</> },

  // ===== 性別亞型(多元身份) =====
  { number: next(), category: '性別亞型', name: '跨性別女', nameEn: 'MTF', code: 'mtf', description: '生理男→認同女(圓外接方)', render: () => <>{MTF()}</> },
  { number: next(), category: '性別亞型', name: '跨性別男', nameEn: 'FTM', code: 'ftm', description: '生理女→認同男(方內含圓)', render: () => <>{FTM()}</> },
  { number: next(), category: '性別亞型', name: '男同志', nameEn: 'Gay', code: 'gay', description: '方 + 倒三角', render: () => <>{GaySym()}</> },
  { number: next(), category: '性別亞型', name: '女同志', nameEn: 'Lesbian', code: 'lesbian', description: '圓 + 倒三角', render: () => <>{LesbianSym()}</> },
  { number: next(), category: '性別亞型', name: '雙性戀', nameEn: 'Bisexual', code: 'bisexual', description: '方 + 虛線倒三角', render: () => <>{BiSym()}</> },

  // ===== 妊娠狀態(三角形循環) =====
  { number: next(), category: '妊娠狀態', name: '懷孕(正常)', nameEn: 'Pregnancy', code: 'preg-alive', description: '三角形輪廓', render: () => <>{Triangle()}</> },
  { number: next(), category: '妊娠狀態', name: '死產', nameEn: 'Stillbirth', code: 'stillbirth', description: '填實三角形', render: () => <>{Triangle({ fill: STROKE })}</> },
  { number: next(), category: '妊娠狀態', name: '流產', nameEn: 'Miscarriage', code: 'miscarriage', description: '縮小填實三角', render: () => <>{Triangle({ fill: STROKE, small: true })}</> },
  { number: next(), category: '妊娠狀態', name: '人工流產', nameEn: 'Abortion', code: 'abortion', description: '單獨 X', render: () => (
    <g>
      <line x1={-12} y1={-12} x2={12} y2={12} stroke={STROKE} strokeWidth={3} strokeLinecap="round" />
      <line x1={-12} y1={12} x2={12} y2={-12} stroke={STROKE} strokeWidth={3} strokeLinecap="round" />
    </g>
  ) },

  // ===== 生命狀態 =====
  { number: next(), category: '生命狀態', name: '過世-男', nameEn: 'Deceased Male', code: 'deceased-m', description: '方 + 對角 X', render: () => <>{Square()}{DeathX()}</> },
  { number: next(), category: '生命狀態', name: '過世-女', nameEn: 'Deceased Female', code: 'deceased-f', description: '圓 + 對角 X', render: () => <>{Circle()}{DeathX()}</> },

  // ===== 醫療 - 心理/生理疾病(左半) =====
  { number: next(), category: '醫療-心理生理疾病', name: '疑似疾病-男', nameEn: 'Suspected Illness M', code: 'susp-ill-m', description: '左半斜線(疑似身心疾病)', render: () => PatternedSquare(fillLeftDiag) },
  { number: next(), category: '醫療-心理生理疾病', name: '疑似疾病-女', nameEn: 'Suspected Illness F', code: 'susp-ill-f', description: '左半斜線(疑似身心疾病)', render: () => PatternedCircle(fillLeftDiag) },
  { number: next(), category: '醫療-心理生理疾病', name: '身心障礙者-男', nameEn: 'Disabled M', code: 'disabled-m', description: '左半實心填黑(身心障礙)', render: () => PatternedSquare(fillLeftHalf) },
  { number: next(), category: '醫療-心理生理疾病', name: '身心障礙者-女', nameEn: 'Disabled F', code: 'disabled-f', description: '左半實心填黑(身心障礙)', render: () => PatternedCircle(fillLeftHalf) },
  { number: next(), category: '醫療-心理生理疾病', name: '疾病復原中-男', nameEn: 'In Recovery Illness M', code: 'rec-ill-m', description: '左半橫線(恢復中)', render: () => PatternedSquare(fillLeftHorizontalStripes) },
  { number: next(), category: '醫療-心理生理疾病', name: '疾病復原中-女', nameEn: 'In Recovery Illness F', code: 'rec-ill-f', description: '左半橫線(恢復中)', render: () => PatternedCircle(fillLeftHorizontalStripes) },

  // ===== 醫療 - 成癮(下半) =====
  { number: next(), category: '醫療-成癮', name: '疑似酒藥癮-男', nameEn: 'Suspected Abuse M', code: 'susp-sub-m', description: '下半斜線(疑似酒藥癮)', render: () => PatternedSquare(fillBottomDiag) },
  { number: next(), category: '醫療-成癮', name: '疑似酒藥癮-女', nameEn: 'Suspected Abuse F', code: 'susp-sub-f', description: '下半斜線(疑似酒藥癮)', render: () => PatternedCircle(fillBottomDiag) },
  { number: next(), category: '醫療-成癮', name: '確診酒藥癮-男', nameEn: 'Confirmed Abuse M', code: 'conf-sub-m', description: '下半實心填黑', render: () => PatternedSquare(fillBottomHalf) },
  { number: next(), category: '醫療-成癮', name: '確診酒藥癮-女', nameEn: 'Confirmed Abuse F', code: 'conf-sub-f', description: '下半實心填黑', render: () => PatternedCircle(fillBottomHalf) },
  { number: next(), category: '醫療-成癮', name: '酒藥癮復原-男', nameEn: 'In Recovery Abuse M', code: 'rec-sub-m', description: '下半橫線', render: () => PatternedSquare(fillBottomHorizontalStripes) },
  { number: next(), category: '醫療-成癮', name: '酒藥癮復原-女', nameEn: 'In Recovery Abuse F', code: 'rec-sub-f', description: '下半橫線', render: () => PatternedCircle(fillBottomHorizontalStripes) },

  // ===== 醫療 - 合併 =====
  {
    number: next(),
    category: '醫療-合併',
    name: '酒藥癮+身心疾病-男',
    nameEn: 'Abuse + Illness M',
    code: 'comb-ill-m',
    description: '左半 + 下半填實(右上空白)',
    render: () =>
      PatternedSquare((cid) => (
        <>
          {fillLeftHalf(cid)}
          {fillBottomHalf(cid)}
        </>
      )),
  },
  {
    number: next(),
    category: '醫療-合併',
    name: '酒藥癮+身心疾病-女',
    nameEn: 'Abuse + Illness F',
    code: 'comb-ill-f',
    description: '左半 + 下半填實(右上空白)',
    render: () =>
      PatternedCircle((cid) => (
        <>
          {fillLeftHalf(cid)}
          {fillBottomHalf(cid)}
        </>
      )),
  },
  {
    number: next(),
    category: '醫療-合併',
    name: '合併復原中-男',
    nameEn: 'Recovery Combined M',
    code: 'rec-comb-m',
    description: '左半橫線 + 下半橫線(右上空白)',
    render: () =>
      PatternedSquare((cid) => (
        <>
          {fillLeftHorizontalStripes(cid)}
          {fillBottomHorizontalStripes(cid)}
        </>
      )),
  },
  {
    number: next(),
    category: '醫療-合併',
    name: '合併復原中-女',
    nameEn: 'Recovery Combined F',
    code: 'rec-comb-f',
    description: '左半橫線 + 下半橫線(右上空白)',
    render: () =>
      PatternedCircle((cid) => (
        <>
          {fillLeftHorizontalStripes(cid)}
          {fillBottomHorizontalStripes(cid)}
        </>
      )),
  },

  // ===== 醫療 - 遺傳 =====
  { number: next(), category: '醫療-遺傳', name: '帶因者-男', nameEn: 'Carrier M', code: 'carr-m', description: '中央黑點', render: () => <>{CarrierSquare()}</> },
  { number: next(), category: '醫療-遺傳', name: '帶因者-女', nameEn: 'Carrier F', code: 'carr-f', description: '中央黑點', render: () => <>{CarrierCircle()}</> },
  { number: next(), category: '醫療-遺傳', name: '確診遺傳病-男', nameEn: 'Affected M', code: 'aff-m', description: '框內全十字', render: () => <>{AffectedSquareInner()}</> },
  { number: next(), category: '醫療-遺傳', name: '確診遺傳病-女', nameEn: 'Affected F', code: 'aff-f', description: '框內全十字', render: () => <>{AffectedCircleInner()}</> },
  { number: next(), category: '醫療-遺傳', name: '疑似遺傳-男', nameEn: 'Suspected Affected M', code: 'susp-aff-m', description: '框內單直線', render: () => <>{SuspAffectedSquare()}</> },
  { number: next(), category: '醫療-遺傳', name: '疑似遺傳-女', nameEn: 'Suspected Affected F', code: 'susp-aff-f', description: '框內單直線', render: () => <>{SuspAffectedCircle()}</> },
  { number: next(), category: '醫療-遺傳', name: '可能遺傳-男', nameEn: 'Possibly Affected M', code: 'poss-aff-m', description: '框內 ?', render: () => <>{PossAffectedSquare()}</> },
  { number: next(), category: '醫療-遺傳', name: '可能遺傳-女', nameEn: 'Possibly Affected F', code: 'poss-aff-f', description: '框內 ?', render: () => <>{PossAffectedCircle()}</> },

  // ===== 附加標記(外掛字母 S/L/O) =====
  { number: next(), category: '附加標記', name: '抽煙 S-男', nameEn: 'Smoker M', code: 'mark-S-m', description: '外掛 S', render: () => <>{MarkOutside('S', 'square')}</> },
  { number: next(), category: '附加標記', name: '抽煙 S-女', nameEn: 'Smoker F', code: 'mark-S-f', description: '外掛 S', render: () => <>{MarkOutside('S', 'circle')}</> },
  { number: next(), category: '附加標記', name: '語言議題 L-男', nameEn: 'Language M', code: 'mark-L-m', description: '外掛 L', render: () => <>{MarkOutside('L', 'square')}</> },
  { number: next(), category: '附加標記', name: '語言議題 L-女', nameEn: 'Language F', code: 'mark-L-f', description: '外掛 L', render: () => <>{MarkOutside('L', 'circle')}</> },
  { number: next(), category: '附加標記', name: '過胖 O-男', nameEn: 'Obese M', code: 'mark-O-m', description: '外掛 O', render: () => <>{MarkOutside('O', 'square')}</> },
  { number: next(), category: '附加標記', name: '過胖 O-女', nameEn: 'Obese F', code: 'mark-O-f', description: '外掛 O', render: () => <>{MarkOutside('O', 'circle')}</> },

  // ===== 成員線-婚姻 =====
  { number: next(), category: '成員線-婚姻', name: '結婚', nameEn: 'Marriage', code: 'marriage', description: '實線', render: () => <>{SimpleLine()}</> },
  { number: next(), category: '成員線-婚姻', name: '同居承諾 LT', nameEn: 'Cohabitation', code: 'cohab-commit', description: '雙線 + LT', render: () => (<>{DoubleLine()}<text x={0} y={-12} textAnchor="middle" fontSize={10} fill={STROKE}>LT</text></>) },
  { number: next(), category: '成員線-婚姻', name: '伴侶關係', nameEn: 'Partnership', code: 'partnership', description: '虛線', render: () => <>{SimpleLine({ dasharray: DASH })}</> },
  { number: next(), category: '成員線-婚姻', name: '秘密外遇', nameEn: 'Secret affair', code: 'secret', description: '點線', render: () => <>{SimpleLine({ dasharray: DOT })}</> },
  { number: next(), category: '成員線-婚姻', name: '分居', nameEn: 'Separation', code: 'separation', description: '實 + 單斜', render: () => <>{SimpleLine({ sym: 'slash' })}</> },
  { number: next(), category: '成員線-婚姻', name: '離婚', nameEn: 'Divorce', code: 'divorce', description: '實 + 雙斜', render: () => <>{SimpleLine({ sym: 'slash2' })}</> },
  { number: next(), category: '成員線-婚姻', name: '離婚再婚', nameEn: 'Divorce-remarriage', code: 'div-rem', description: '雙線 + 雙斜', render: () => (<g><line x1={-34} y1={-3} x2={34} y2={-3} stroke={STROKE} strokeWidth={W} /><line x1={-34} y1={3} x2={34} y2={3} stroke={STROKE} strokeWidth={W} /><line x1={-6} y1={-10} x2={0} y2={10} stroke={STROKE} strokeWidth={W} /><line x1={0} y1={-10} x2={6} y2={10} stroke={STROKE} strokeWidth={W} /></g>) },

  // ===== 成員線-親子 =====
  { number: next(), category: '成員線-親子', name: '親生', nameEn: 'Biological', code: 'bio', description: '實線', render: () => <>{SimpleLine()}</> },
  { number: next(), category: '成員線-親子', name: '收養', nameEn: 'Adopted', code: 'adopted', description: '實線', render: () => <>{SimpleLine()}</> },
  { number: next(), category: '成員線-親子', name: '寄養', nameEn: 'Fostered', code: 'fostered', description: '鋸齒', render: () => <>{ZigzagLine()}</> },
  { number: next(), category: '成員線-親子', name: '出養', nameEn: 'Placed-out', code: 'placed-out', description: '虛線', render: () => <>{SimpleLine({ dasharray: DASH })}</> },
  { number: next(), category: '成員線-親子', name: '捐精者', nameEn: 'Sperm donor', code: 'sperm', description: '點線', render: () => <>{SimpleLine({ dasharray: DOT })}</> },

  // ===== 成員線-手足 =====
  { number: next(), category: '成員線-手足', name: '雙胞胎', nameEn: 'Twins', code: 'twins', description: 'V 字', render: () => <>{TwinsV(false)}</> },
  { number: next(), category: '成員線-手足', name: '同卵雙胞胎', nameEn: 'Identical', code: 'id-twins', description: 'V + 橫', render: () => <>{TwinsV(true)}</> },

  // ===== 關係線-正向 =====
  { number: next(), category: '關係線-正向', name: '連結', nameEn: 'Connected', code: 'connected', description: '雙線', render: () => <>{DoubleLine()}</> },
  { number: next(), category: '關係線-正向', name: '親密', nameEn: 'Close', code: 'close', description: '三線', render: () => <>{TripleLine()}</> },
  { number: next(), category: '關係線-正向', name: '過度緊密', nameEn: 'Fused', code: 'fused', description: '四線', render: () => <>{QuadLine()}</> },
  { number: next(), category: '關係線-正向', name: '靈性連結', nameEn: 'Spiritual', code: 'spiritual', description: '波浪', render: () => <>{WavyLine()}</> },

  // ===== 關係線-中性 =====
  { number: next(), category: '關係線-中性', name: '疏離', nameEn: 'Distant', code: 'distant', description: '點線', render: () => <>{SimpleLine({ dasharray: DOT })}</> },
  { number: next(), category: '關係線-中性', name: '專注在', nameEn: 'Focus on', code: 'focus', description: '實+箭頭', render: () => <>{SolidArrow()}</> },

  // ===== 關係線-負向 =====
  { number: next(), category: '關係線-負向', name: '敵意', nameEn: 'Hostile', code: 'hostile', description: '鋸齒', render: () => <>{ZigzagLine()}</> },
  { number: next(), category: '關係線-負向', name: '親密-敵意', nameEn: 'Close-hostile', code: 'close-hostile', description: '雙線+鋸齒', render: () => (<g><line x1={-34} y1={-4} x2={34} y2={-4} stroke={STROKE} strokeWidth={W} /><line x1={-34} y1={4} x2={34} y2={4} stroke={STROKE} strokeWidth={W} />{ZigzagLine(1.2)}</g>) },
  { number: next(), category: '關係線-負向', name: '負向關注', nameEn: 'Negative focus', code: 'neg-focus', description: '鋸齒+箭頭', render: () => (<g>{ArrowDef('neg')}<g markerEnd="url(#neg)">{ZigzagLine()}</g></g>) },

  // ===== 關係線-暴力 =====
  { number: next(), category: '關係線-暴力', name: '身體虐待', nameEn: 'Physical abuse', code: 'phy-abuse', description: '粗鋸齒+箭頭', render: () => (<g>{ArrowDef('phy')}<g markerEnd="url(#phy)">{ZigzagLine(3)}</g></g>) },
  { number: next(), category: '關係線-暴力', name: '情緒虐待', nameEn: 'Emotional abuse', code: 'emo-abuse', description: '細鋸齒+箭頭', render: () => (<g>{ArrowDef('emo')}<g markerEnd="url(#emo)">{ZigzagLine(1)}</g></g>) },
  { number: next(), category: '關係線-暴力', name: '性虐待', nameEn: 'Sexual abuse', code: 'sex-abuse', description: '超粗鋸齒+箭頭', render: () => (<g>{ArrowDef('sex')}<g markerEnd="url(#sex)">{ZigzagLine(4)}</g></g>) },

  // ===== 關係線-照顧斷裂 =====
  { number: next(), category: '關係線-照顧斷裂', name: '照顧者', nameEn: 'Caregiver', code: 'caregiver', description: '雙向箭頭', render: () => <>{SolidArrow(true)}</> },
  { number: next(), category: '關係線-照顧斷裂', name: '截斷', nameEn: 'Cutoff', code: 'cutoff', description: '線上 X', render: () => <>{CrossMark()}</> },
  { number: next(), category: '關係線-照顧斷裂', name: '修復截斷', nameEn: 'Cutoff repaired', code: 'cutoff-rep', description: '線上結', render: () => <>{KnotMark()}</> },

  // ===== 特殊視覺 =====
  { number: next(), category: '特殊視覺', name: '同住圈', nameEn: 'Household', code: 'household', description: '虛線圈', render: () => <>{HouseholdSketch()}</> },
  { number: next(), category: '特殊視覺', name: '指標個案', nameEn: 'Proband', code: 'proband', description: '紅色雙框', render: () => <>{ProbandSketch()}</> },
  { number: next(), category: '特殊視覺', name: '出養縮放', nameEn: 'Placed-out scale', code: 'scale', description: '縮 70%', render: () => <>{ScaleSketch()}</> },
];
