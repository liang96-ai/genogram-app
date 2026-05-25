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
  | '關係線-互動程度'
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
// 藍色 — Gallery 關係線 (#66-80) 用色,跟 Canvas 上 PersonShape 選中色 / Tab2 按鈕色 / 同住圈一致
// 預設只給 #66-80 的關係線(對齊實際畫布視覺),婚姻/親子/醫療符號維持 STROKE
const BLUE = '#007aff';
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
// v1.1: SuspAffectedSquare / SuspAffectedCircle 已移除
//   - 對應 Gallery #38-39「疑似遺傳」(框內單直線)無 NSGC/McGoldrick 學術依據,屬本工具自創
//   - Canvas 端的 fillPattern 'suspected-vertical' 渲染由 PersonShape.tsx 處理(不走這 helper)
//   - 所以這 helper 純粹是 Gallery-only,Gallery 條目移除後就完全 dead code
//   - 如未來找到學術依據需重新加回,可從 git history 還原
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
// 線條 helpers 接收 color 參數,預設 STROKE(黑)。
// 給 #66-80 關係線使用時傳 BLUE,跟畫布實際渲染一致(關係線=藍)。
type LineProps = { dasharray?: string; sym?: 'slash' | 'slash2' | 'x' | 'house'; color?: string };
function SimpleLine(props: LineProps = {}) {
  const c = props.color ?? STROKE;
  return (
    <g>
      <line x1={-34} y1={0} x2={34} y2={0} stroke={c} strokeWidth={W} strokeDasharray={props.dasharray} />
      {/* v1.1 斜線方向改 ╱ (左下→右上) 對齊 Canvas MarriageGroup + McGoldrick 標準
          原 ╲ 方向(x1=-3,y1=-8 → x2=3,y2=8)為錯誤,跟 Canvas 真實畫面不一致 */}
      {props.sym === 'slash' && (
        <line x1={-3} y1={8} x2={3} y2={-8} stroke={c} strokeWidth={W} />
      )}
      {props.sym === 'slash2' && (
        <>
          <line x1={-6} y1={8} x2={0} y2={-8} stroke={c} strokeWidth={W} />
          <line x1={0} y1={8} x2={6} y2={-8} stroke={c} strokeWidth={W} />
        </>
      )}
    </g>
  );
}
function DoubleLine(color: string = STROKE) {
  return (
    <>
      <line x1={-34} y1={-3} x2={34} y2={-3} stroke={color} strokeWidth={W} />
      <line x1={-34} y1={3} x2={34} y2={3} stroke={color} strokeWidth={W} />
    </>
  );
}
function TripleLine(color: string = STROKE) {
  return (
    <>
      <line x1={-34} y1={-5} x2={34} y2={-5} stroke={color} strokeWidth={W} />
      <line x1={-34} y1={0} x2={34} y2={0} stroke={color} strokeWidth={W} />
      <line x1={-34} y1={5} x2={34} y2={5} stroke={color} strokeWidth={W} />
    </>
  );
}
// v1.1 移除:QuadLine(四線)+ WavyLine(單波)— 過度緊密改三線、靈性改 sin+cos 雙波,已不需要
// 靈性連結 — sin + cos 雙波交織(相位差 90°)
// 用密集 sampling 走 L,確保兩條真的交織
function SinCosLines(color: string = STROKE) {
  const x1 = -34;
  const x2 = 34;
  const span = x2 - x1;
  const waves = 2.5; // 在 -34..34 區間做 2.5 個完整波
  const amp = 6;
  const samples = 60;
  const buildPath = (phase: number) => {
    let d = '';
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = x1 + span * t;
      // 兩端 amplitude → 0(避免曲線穿出形狀)
      const taper = Math.sin(Math.PI * t);
      const y = amp * Math.sin(2 * Math.PI * waves * t + phase) * taper;
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  };
  return (
    <g>
      <path d={buildPath(0)} fill="none" stroke={color} strokeWidth={W} />
      <path d={buildPath(Math.PI / 2)} fill="none" stroke={color} strokeWidth={W} />
    </g>
  );
}
function ZigzagLine(thickness = W, color: string = STROKE) {
  return (
    <path
      d="M -34 0 L -28 -5 L -22 5 L -16 -5 L -10 5 L -4 -5 L 2 5 L 8 -5 L 14 5 L 20 -5 L 26 5 L 32 -5"
      fill="none"
      stroke={color}
      strokeWidth={thickness}
    />
  );
}
function ArrowDef(id: string, hollow = false, color: string = STROKE) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path
          d="M 0 0 L 10 5 L 0 10 z"
          fill={hollow ? FILL : color}
          stroke={hollow ? color : 'none'}
          strokeWidth={hollow ? 1.4 : 0}
        />
      </marker>
    </defs>
  );
}
function SolidArrow(color: string = STROKE) {
  // ArrowDef id 需要區隔黑/藍兩版 — 同頁多個 marker 不可同 id
  const id = color === STROKE ? 'gArrow' : 'gArrowBlue';
  return (
    <>
      {ArrowDef(id, false, color)}
      <line x1={-30} y1={0} x2={30} y2={0} stroke={color} strokeWidth={W} markerEnd={`url(#${id})`} />
    </>
  );
}
// 照顧者用 — 單向 + 雙倒角(>>)
function CaregiverArrow(color: string = STROKE) {
  const id = color === STROKE ? 'cgArrow' : 'cgArrowBlue';
  return (
    <>
      {ArrowDef(id, false, color)}
      <line x1={-30} y1={0} x2={22} y2={0} stroke={color} strokeWidth={W} markerEnd={`url(#${id})`} />
      <polygon points="22,0 14,-5 14,5" fill={color} />
    </>
  );
}
// 情緒虐待用 — 空心箭頭
function HollowArrowZigzag(thickness = W, color: string = STROKE) {
  const id = color === STROKE ? 'emoArrow' : 'emoArrowBlue';
  return (
    <g>
      {ArrowDef(id, true, color)}
      <g markerEnd={`url(#${id})`}>
        <path
          d="M -34 0 L -28 -5 L -22 5 L -16 -5 L -10 5 L -4 -5 L 2 5 L 8 -5 L 14 5 L 20 -5 L 26 5 L 30 -3"
          fill="none"
          stroke={color}
          strokeWidth={thickness}
        />
      </g>
    </g>
  );
}
// 性虐待用 — 鋸齒 + 上下兩條平行線 + 實心箭頭
function SexualAbuseLine(color: string = STROKE) {
  const id = color === STROKE ? 'sexArrow' : 'sexArrowBlue';
  return (
    <g>
      {ArrowDef(id, false, color)}
      <line x1={-34} y1={-7} x2={30} y2={-7} stroke={color} strokeWidth={W} />
      <line x1={-34} y1={7} x2={30} y2={7} stroke={color} strokeWidth={W} />
      <g markerEnd={`url(#${id})`}>
        <path
          d="M -34 0 L -28 -4 L -22 4 L -16 -4 L -10 4 L -4 -4 L 2 4 L 8 -4 L 14 4 L 20 -4 L 26 4 L 30 -3"
          fill="none"
          stroke={color}
          strokeWidth={2.4}
        />
      </g>
    </g>
  );
}
function CrossMark(color: string = STROKE) {
  return (
    <>
      <line x1={-34} y1={0} x2={34} y2={0} stroke={color} strokeWidth={W} />
      <line x1={-8} y1={-4} x2={-2} y2={4} stroke={color} strokeWidth={W} />
      <line x1={2} y1={-4} x2={8} y2={4} stroke={color} strokeWidth={W} />
    </>
  );
}
function KnotMark(color: string = STROKE) {
  return (
    <>
      <line x1={-34} y1={0} x2={34} y2={0} stroke={color} strokeWidth={W} />
      <circle cx={0} cy={0} r={5} fill={FILL} stroke={color} strokeWidth={W} />
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

// ==================== 妊娠結果 (對齊 McGoldrick 4th ed + NSGC 2008/2022) ====================
// 修正:#13 死產(原填實三角)→ McGoldrick ⊟ 菱形+X(未知性別專用)
//      #14 流產(原小填實三角)→ NSGC SAB 小實心圓
//      #15 人工流產(原僅 X)→ NSGC TOP 三角+對角線
// 動機:跨醫療專業辨識統一(社工/婦產科/兒科共同語言)
//
// #13 死產用菱形+X 的理由:
//   McGoldrick 規定 stillbirth 依性別 = 方+X (男) / 圓+X (女) / 菱形+X (未知)
//   Gallery 展示「未知性別三角形循環」終點,所以用菱形(NSGC 未知性別代表形狀)
//   作畫者後續若知道性別,Tab1 可手動切方/圓
function StillbirthDiamond() {
  // McGoldrick Stillbirth (sex unknown) — 菱形 + 對角 X 超出邊框
  // 對齊 #17 過世女(Circle + DeathX)的視覺風格:X 四角延伸到 (-H,-H) ~ (H,H),超出菱形邊
  return (
    <>
      {Diamond()}
      {DeathX()}
    </>
  );
}
function MiscarriageDot() {
  // NSGC SAB(spontaneous abortion < 20w)— 小實心圓
  return <circle r={9} fill={STROKE} />;
}
function AbortionTriangleSlash() {
  // NSGC TOP(termination of pregnancy)— 三角形 + 對角線
  return (
    <>
      {Triangle()}
      <line x1={-H} y1={H} x2={H} y2={-H} stroke={STROKE} strokeWidth={W * 1.5} />
    </>
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

  // ===== 妊娠狀態(雙擊三角循環)— v1.1 對齊 NSGC 2008/2022 =====
  { number: next(), category: '妊娠狀態', name: '懷孕(正常)', nameEn: 'Pregnancy', code: 'preg-alive', description: '三角形輪廓 (NSGC Pregnancy)', render: () => <>{Triangle()}</> },
  { number: next(), category: '妊娠狀態', name: '死產', nameEn: 'Stillbirth', code: 'stillbirth', description: '菱形+X (McGoldrick ⊟,未知性別)', render: () => <>{StillbirthDiamond()}</> },
  { number: next(), category: '妊娠狀態', name: '流產', nameEn: 'Miscarriage (SAB)', code: 'miscarriage', description: '小實心圓 (NSGC SAB)', render: () => <>{MiscarriageDot()}</> },
  { number: next(), category: '妊娠狀態', name: '人工流產', nameEn: 'Abortion (TOP)', code: 'abortion', description: '三角+對角線 (NSGC TOP)', render: () => <>{AbortionTriangleSlash()}</> },

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
  { number: next(), category: '醫療-遺傳', name: '確診遺傳病-男', nameEn: 'Affected M', code: 'aff-m', description: '框內全十字 (McGoldrick)', render: () => <>{AffectedSquareInner()}</> },
  { number: next(), category: '醫療-遺傳', name: '確診遺傳病-女', nameEn: 'Affected F', code: 'aff-f', description: '框內全十字 (McGoldrick)', render: () => <>{AffectedCircleInner()}</> },
  // v1.1 移除「疑似遺傳-男/女」(susp-aff-m/f) — 無 NSGC/McGoldrick 國際依據,屬本工具自創
  // 內部 render function (SuspAffectedSquare/Circle) 保留,確保舊 JSON 載入仍能正確 render
  // 如需重新加回需有學術依據;否則用「可能遺傳 ?」(NSGC presumed carrier 標準)代替
  { number: next(), category: '醫療-遺傳', name: '可能遺傳-男', nameEn: 'Possibly Affected M', code: 'poss-aff-m', description: '框內 ? (presumed carrier)', render: () => <>{PossAffectedSquare()}</> },
  { number: next(), category: '醫療-遺傳', name: '可能遺傳-女', nameEn: 'Possibly Affected F', code: 'poss-aff-f', description: '框內 ? (presumed carrier)', render: () => <>{PossAffectedCircle()}</> },

  // ===== 附加標記(外掛字母 S/L/O) =====
  { number: next(), category: '附加標記', name: '抽煙 S-男', nameEn: 'Smoker M', code: 'mark-S-m', description: '外掛 S', render: () => <>{MarkOutside('S', 'square')}</> },
  { number: next(), category: '附加標記', name: '抽煙 S-女', nameEn: 'Smoker F', code: 'mark-S-f', description: '外掛 S', render: () => <>{MarkOutside('S', 'circle')}</> },
  { number: next(), category: '附加標記', name: '語言議題 L-男', nameEn: 'Language M', code: 'mark-L-m', description: '外掛 L', render: () => <>{MarkOutside('L', 'square')}</> },
  { number: next(), category: '附加標記', name: '語言議題 L-女', nameEn: 'Language F', code: 'mark-L-f', description: '外掛 L', render: () => <>{MarkOutside('L', 'circle')}</> },
  { number: next(), category: '附加標記', name: '過胖 O-男', nameEn: 'Obese M', code: 'mark-O-m', description: '外掛 O', render: () => <>{MarkOutside('O', 'square')}</> },
  { number: next(), category: '附加標記', name: '過胖 O-女', nameEn: 'Obese F', code: 'mark-O-f', description: '外掛 O', render: () => <>{MarkOutside('O', 'circle')}</> },

  // ===== 成員線-婚姻 (v1.1 刪 3 個 legacy: cohab-commit / partnership / div-rem — 改用對應現行 subType) =====
  { number: next(), category: '成員線-婚姻', name: '結婚', nameEn: 'Marriage', code: 'marriage', description: '實線', render: () => <>{SimpleLine()}</> },
  { number: next(), category: '成員線-婚姻', name: '秘密外遇', nameEn: 'Secret affair', code: 'secret', description: '點線', render: () => <>{SimpleLine({ dasharray: DOT })}</> },
  { number: next(), category: '成員線-婚姻', name: '分居', nameEn: 'Separation', code: 'separation', description: '實 + 單斜', render: () => <>{SimpleLine({ sym: 'slash' })}</> },
  { number: next(), category: '成員線-婚姻', name: '離婚', nameEn: 'Divorce', code: 'divorce', description: '實 + 雙斜', render: () => <>{SimpleLine({ sym: 'slash2' })}</> },
  // ===== 婚姻線 v1.1 新增(McGoldrick 4th ed 對齊)=====
  // v1.1 修正:
  //   - #52 訂婚拿掉 E 字(虛線本身就是國際標準訂婚線,加字反而冗餘)
  //   - 刪除原 #54 法律同居 (LP)/#56 法律分居 (L)/#58 喪偶 (W)
  //     · LP/L/W 字母無國際標準,屬本工具自創便利標記
  //     · 法律狀態 → 改用生態圈表達(畫者自由詮釋)
  //     · 喪偶 → 改用 Tab1 ☑ 已往生 checkbox + 系統自動在配偶圖示加 X
  //   - types/store 對應 subType (legal-cohabitation/legal-separation/widowed) 同步移除
  { number: next(), category: '成員線-婚姻', name: '訂婚', nameEn: 'Engagement', code: 'engagement', description: '虛線 (NSGC/McGoldrick)', render: () => <>{SimpleLine({ dasharray: DASH })}</> },
  { number: next(), category: '成員線-婚姻', name: '同居', nameEn: 'Cohabitation', code: 'cohabitation', description: '虛雙線', render: () => (<><line x1={-34} y1={-3} x2={34} y2={-3} stroke={STROKE} strokeWidth={W} strokeDasharray={DASH} /><line x1={-34} y1={3} x2={34} y2={3} stroke={STROKE} strokeWidth={W} strokeDasharray={DASH} /></>) },
  { number: next(), category: '成員線-婚姻', name: '訂婚同居', nameEn: 'Engagement Cohabitation', code: 'engagement-cohabitation', description: '虛雙線 + LT', render: () => (<><line x1={-34} y1={-3} x2={34} y2={-3} stroke={STROKE} strokeWidth={W} strokeDasharray={DASH} /><line x1={-34} y1={3} x2={34} y2={3} stroke={STROKE} strokeWidth={W} strokeDasharray={DASH} /><text x={0} y={-12} textAnchor="middle" fontSize={10} fill={STROKE}>LT</text></>) },
  { number: next(), category: '成員線-婚姻', name: '訂婚分手', nameEn: 'Engagement Ended', code: 'engagement-separation', description: '虛 + 單斜', render: () => (<g><line x1={-34} y1={0} x2={34} y2={0} stroke={STROKE} strokeWidth={W} strokeDasharray={DASH} /><line x1={-3} y1={-8} x2={3} y2={8} stroke={STROKE} strokeWidth={W} /></g>) },

  // ===== 成員線-親子 =====
  { number: next(), category: '成員線-親子', name: '親生', nameEn: 'Biological', code: 'bio', description: '實線', render: () => <>{SimpleLine()}</> },
  { number: next(), category: '成員線-親子', name: '收養', nameEn: 'Adopted', code: 'adopted', description: '實線', render: () => <>{SimpleLine()}</> },
  { number: next(), category: '成員線-親子', name: '寄養', nameEn: 'Fostered', code: 'fostered', description: '點線(對齊 McGoldrick)', render: () => <>{SimpleLine({ dasharray: DOT })}</> },
  { number: next(), category: '成員線-親子', name: '出養', nameEn: 'Placed-out', code: 'placed-out', description: '虛線', render: () => <>{SimpleLine({ dasharray: DASH })}</> },
  { number: next(), category: '成員線-親子', name: '捐精者', nameEn: 'Sperm donor', code: 'sperm', description: '點線', render: () => <>{SimpleLine({ dasharray: DOT })}</> },

  // ===== 成員線-手足 =====
  { number: next(), category: '成員線-手足', name: '雙胞胎', nameEn: 'Twins', code: 'twins', description: 'V 字', render: () => <>{TwinsV(false)}</> },
  { number: next(), category: '成員線-手足', name: '同卵雙胞胎', nameEn: 'Identical', code: 'id-twins', description: 'V + 橫', render: () => <>{TwinsV(true)}</> },

  // ===== 關係線 (v1.1 對齊實際畫布視覺,全部 BLUE) =====
  // 關係線在 Canvas Line.tsx 渲染時是 iOS 藍 (#007aff,跟同住圈/Tab2 按鈕色一致)
  // Gallery 預覽以前用黑色,跟畫面看不一致,使用者對照困難
  // v1.1 改:#66-80 整批傳 BLUE 給 helpers,Gallery ⇄ Canvas 視覺 100% 對齊
  // ----- 正向 (連結=單線, 親密=雙線, 過度緊密=三線) -----
  { number: next(), category: '關係線-正向', name: '連結', nameEn: 'Connected', code: 'connected', description: '單線', render: () => <>{SimpleLine({ color: BLUE })}</> },
  { number: next(), category: '關係線-正向', name: '親密', nameEn: 'Close', code: 'close', description: '雙線', render: () => <>{DoubleLine(BLUE)}</> },
  { number: next(), category: '關係線-正向', name: '過度緊密', nameEn: 'Fused', code: 'fused', description: '三線', render: () => <>{TripleLine(BLUE)}</> },

  // ----- 互動程度 (v1.1 合併原「中性」「負向」+ 靈性) -----
  { number: next(), category: '關係線-互動程度', name: '親密-敵意', nameEn: 'Close-hostile', code: 'close-hostile', description: '雙線+鋸齒', render: () => (<g><line x1={-34} y1={-4} x2={34} y2={-4} stroke={BLUE} strokeWidth={W} /><line x1={-34} y1={4} x2={34} y2={4} stroke={BLUE} strokeWidth={W} />{ZigzagLine(1.2, BLUE)}</g>) },
  { number: next(), category: '關係線-互動程度', name: '疏離', nameEn: 'Distant', code: 'distant', description: '點線(間距加倍)', render: () => <>{SimpleLine({ dasharray: '2 6', color: BLUE })}</> },
  { number: next(), category: '關係線-互動程度', name: '敵意', nameEn: 'Hostile', code: 'hostile', description: '鋸齒', render: () => <>{ZigzagLine(W, BLUE)}</> },
  { number: next(), category: '關係線-互動程度', name: '靈性連結', nameEn: 'Spiritual', code: 'spiritual', description: 'sin+cos 雙波交織 (Hodge 2001)', render: () => <>{SinCosLines(BLUE)}</> },
  { number: next(), category: '關係線-互動程度', name: '專注在', nameEn: 'Focus on', code: 'focus', description: '實+箭頭', render: () => <>{SolidArrow(BLUE)}</> },
  { number: next(), category: '關係線-互動程度', name: '負向關注', nameEn: 'Negative focus', code: 'neg-focus', description: '鋸齒+箭頭', render: () => (<g>{ArrowDef('negBlue', false, BLUE)}<g markerEnd="url(#negBlue)">{ZigzagLine(W, BLUE)}</g></g>) },

  // ----- 暴力 (情緒=空心箭頭;性=鋸齒+上下平行線+實心箭頭) -----
  { number: next(), category: '關係線-暴力', name: '身體虐待', nameEn: 'Physical abuse', code: 'phy-abuse', description: '粗鋸齒+實心箭頭', render: () => (<g>{ArrowDef('phyBlue', false, BLUE)}<g markerEnd="url(#phyBlue)">{ZigzagLine(3, BLUE)}</g></g>) },
  { number: next(), category: '關係線-暴力', name: '情緒虐待', nameEn: 'Emotional abuse', code: 'emo-abuse', description: '細鋸齒+空心箭頭', render: () => <>{HollowArrowZigzag(1, BLUE)}</> },
  { number: next(), category: '關係線-暴力', name: '性虐待', nameEn: 'Sexual abuse', code: 'sex-abuse', description: '鋸齒+上下平行線+實心箭頭', render: () => <>{SexualAbuseLine(BLUE)}</> },

  // ----- 照顧斷裂 -----
  { number: next(), category: '關係線-照顧斷裂', name: '照顧者', nameEn: 'Caregiver', code: 'caregiver', description: '單向+雙倒角(>>)', render: () => <>{CaregiverArrow(BLUE)}</> },
  { number: next(), category: '關係線-照顧斷裂', name: '截斷', nameEn: 'Cutoff', code: 'cutoff', description: '線上 X', render: () => <>{CrossMark(BLUE)}</> },
  { number: next(), category: '關係線-照顧斷裂', name: '修復截斷', nameEn: 'Cutoff repaired', code: 'cutoff-rep', description: '線上結', render: () => <>{KnotMark(BLUE)}</> },

  // ===== 特殊視覺 =====
  { number: next(), category: '特殊視覺', name: '同住圈', nameEn: 'Household', code: 'household', description: '虛線圈', render: () => <>{HouseholdSketch()}</> },
  { number: next(), category: '特殊視覺', name: '指標個案', nameEn: 'Proband', code: 'proband', description: '紅色雙框', render: () => <>{ProbandSketch()}</> },
  { number: next(), category: '特殊視覺', name: '出養縮放', nameEn: 'Placed-out scale', code: 'scale', description: '縮 70%', render: () => <>{ScaleSketch()}</> },
];
