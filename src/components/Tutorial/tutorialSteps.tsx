import type { ReactNode } from 'react';
import { usePwaInstall } from '../../services/pwaInstall';

export interface TutorialStep {
  icon: string;
  title: string;
  content: ReactNode;
}

// SmallArrowsIllustration 已移除(原本用於基礎教學第 4 步「加家人」,該步已刪)
// LineDragMockup 已移除(原本 Step 5A 用,現在 Step 5A 純文字描述)

type Lang = 'zh' | 'en';

// ============================================================
// 共用元件:畫布視覺解析(基礎教學「畫面總覽 — 人物、箭頭」步驟用)
// — 顯示一個案主在中央 + ↑↓←→ 4 個藍色箭頭 + 標籤
// — callout 說明每個箭頭的用途、長按 ↑ 拖出黑線的小提示
// ============================================================
function CanvasArrowsMockup({ lang }: { lang: Lang }) {
  const t =
    lang === 'en'
      ? {
          canvasLabel: 'Canvas (center)',
          up: '↑ Add parents',
          down: '↓ Add child',
          downHint: '(adds spouse first if none)',
          left: '← Spouse',
          right: '→ Spouse',
          tipDrag: '💡 Hold ↑ 0.25s + drag → instant parent-child line',
          tipTwins: '💡 Hold ↓ 1s → open multiple-birth dialog (2–15)',
        }
      : {
          canvasLabel: '畫布(中央)',
          up: '↑ 加父母',
          down: '↓ 加小孩',
          downHint: '(無配偶時先加配偶)',
          left: '← 加配偶',
          right: '→ 加配偶',
          tipDrag: '💡 長按 ↑ 0.25 秒 + 拖到另一人物 → 直接畫黑色親子線',
          tipTwins: '💡 長按 ↓ 1 秒 → 開雙胞胎設定視窗(2-15 胞胎)',
        };
  return (
    <svg
      viewBox="0 0 320 260"
      width="100%"
      style={{
        display: 'block',
        margin: '8px auto',
        maxWidth: 380,
        background: '#fafafa',
        borderRadius: 8,
      }}
      aria-label={t.canvasLabel}
    >
      <rect x="10" y="10" width="300" height="240" rx="6" fill="#ffffff" stroke="#d2d2d7" strokeDasharray="6 4" />
      <text x="18" y="24" style={{ fontSize: 10, fill: '#86868b' }}>{t.canvasLabel}</text>
      {/* 案主方框(雙紅匡) */}
      <rect x="144" y="116" width="32" height="32" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
      <rect x="139" y="111" width="42" height="42" fill="none" stroke="#ff3b30" strokeWidth="1.5" />
      {/* 4 個箭頭 */}
      <polygon points="160,82 168,96 152,96" fill="#007aff" opacity="0.85" />
      <text x="180" y="92" style={{ fontSize: 11, fill: '#007aff', fontWeight: 600 }}>{t.up}</text>
      <polygon points="160,180 168,166 152,166" fill="#007aff" opacity="0.85" />
      <text x="180" y="176" style={{ fontSize: 11, fill: '#007aff', fontWeight: 600 }}>{t.down}</text>
      <text x="180" y="190" style={{ fontSize: 9.5, fill: '#86868b' }}>{t.downHint}</text>
      <polygon points="112,132 126,124 126,140" fill="#007aff" opacity="0.85" />
      <text x="38" y="120" style={{ fontSize: 11, fill: '#007aff', fontWeight: 600 }}>{t.left}</text>
      <polygon points="208,132 194,124 194,140" fill="#007aff" opacity="0.85" />
      <text x="214" y="120" style={{ fontSize: 11, fill: '#007aff', fontWeight: 600 }}>{t.right}</text>
      <text x="18" y="216" style={{ fontSize: 10.5, fill: '#1d1d1f' }}>{t.tipDrag}</text>
      <text x="18" y="234" style={{ fontSize: 10.5, fill: '#1d1d1f' }}>{t.tipTwins}</text>
    </svg>
  );
}

// ============================================================
// 共用元件:雙擊切換形狀(Step 2)— 簡單單一動作示意
// ============================================================
function ShapeSwitchMockup({ lang }: { lang: Lang }) {
  const t =
    lang === 'en'
      ? {
          ariaLabel: 'Double-click to switch shape',
          cursor: 'double-click',
          label: 'Double-click swaps □ ↔ ○',
        }
      : {
          ariaLabel: '雙擊切換形狀示意',
          cursor: '雙擊',
          label: '雙擊男女互切 □ ↔ ○',
        };
  return (
    <svg
      viewBox="0 0 320 120"
      width="100%"
      style={{
        display: 'block',
        margin: '8px auto',
        maxWidth: 360,
        background: '#fafafa',
        borderRadius: 8,
      }}
      aria-label={t.ariaLabel}
    >
      {/* 左:方形 */}
      <rect x="60" y="36" width="40" height="40" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
      {/* 游標(不含「雙擊」字,字移到箭頭上方) */}
      <g transform="translate(108, 50)">
        <path d="M 0,0 L 0,14 L 4,11 L 7,18 L 10,16 L 6,9 L 11,9 Z" fill="#ffffff" stroke="#1d1d1f" strokeWidth="1.2" />
        <text x="14" y="6" style={{ fontSize: 9, fill: '#007aff', fontWeight: 600 }}>×2</text>
      </g>
      {/* 「雙擊」標籤 — 移到箭頭正上方 */}
      <text x="165" y="48" textAnchor="middle" style={{ fontSize: 11, fill: '#007aff', fontWeight: 600 }}>{t.cursor}</text>
      {/* 箭頭 */}
      <line x1="135" y1="56" x2="195" y2="56" stroke="#86868b" strokeWidth="1.5" />
      <polygon points="195,56 187,52 187,60" fill="#86868b" />
      {/* 右:圓形 */}
      <circle cx="230" cy="56" r="20" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
      {/* 底部標籤 */}
      <text x="160" y="104" textAnchor="middle" style={{ fontSize: 11, fill: '#1d1d1f', fontWeight: 500 }}>{t.label}</text>
    </svg>
  );
}

// ============================================================
// 共用元件:實線/虛線親子線對比(Step 4)— 兩個小家庭並排
// ============================================================
function FamilyLineMockup({ lang }: { lang: Lang }) {
  const t =
    lang === 'en'
      ? {
          ariaLabel: 'Solid vs dashed parent-child line comparison',
          solidTitle: '│ Solid',
          dashedTitle: '┊ Dashed',
        }
      : {
          ariaLabel: '實線 vs 虛線親子線對比',
          solidTitle: '│ 實線',
          dashedTitle: '┊ 虛線',
        };
  // 通用 mini 家庭繪製 - 給定 x 偏移 + 線條樣式 + 標題
  const renderFamily = (
    xOff: number,
    isDashed: boolean,
    title: string,
  ) => {
    const px = xOff + 30; // 父
    const mx = xOff + 110; // 母
    const cy = 40; // 父母 y
    const child = xOff + 70; // 小孩 x
    const childY = 130; // 小孩 y
    const trunkY = 90; // 主幹分叉
    const dash = isDashed ? '4 3' : undefined;
    return (
      <g>
        {/* 標題 */}
        <text x={xOff + 70} y={20} textAnchor="middle" style={{ fontSize: 11, fill: '#007aff', fontWeight: 600 }}>{title}</text>
        {/* 婚姻線 */}
        <line x1={px + 14} y1={cy} x2={mx - 12} y2={cy} stroke="#404040" strokeWidth="2.25" />
        {/* 父(方) */}
        <rect x={px - 14} y={cy - 14} width="28" height="28" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
        {/* 母(圓) */}
        <circle cx={mx} cy={cy} r="14" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
        {/* 親子線 — 婚姻線中點往下 + 分到小孩 */}
        <line x1={(px + mx) / 2} y1={cy} x2={(px + mx) / 2} y2={trunkY} stroke="#404040" strokeWidth="2.25" strokeDasharray={dash} />
        <line x1={(px + mx) / 2} y1={trunkY} x2={child} y2={trunkY} stroke="#404040" strokeWidth="2.25" strokeDasharray={dash} />
        <line x1={child} y1={trunkY} x2={child} y2={childY - 14} stroke="#404040" strokeWidth="2.25" strokeDasharray={dash} />
        {/* 小孩(方) */}
        <rect x={child - 14} y={childY - 14} width="28" height="28" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
      </g>
    );
  };
  return (
    <svg
      viewBox="0 0 380 170"
      width="100%"
      style={{
        display: 'block',
        margin: '8px auto',
        maxWidth: 440,
        background: '#fafafa',
        borderRadius: 8,
      }}
      aria-label={t.ariaLabel}
    >
      {renderFamily(10, false, t.solidTitle)}
      {/* 分隔虛線 */}
      <line x1="190" y1="20" x2="190" y2="155" stroke="#d2d2d7" strokeWidth="0.8" strokeDasharray="2 3" />
      {renderFamily(200, true, t.dashedTitle)}
    </svg>
  );
}

// ============================================================
// 共用元件:黑線 vs 藍線 — 同一對父母可以同時有「成員關係(黑)」
// 和「互動關係(藍)」,疊在同一張圖上對比
// ============================================================
function BlackBlueLineMockup({ lang }: { lang: Lang }) {
  const t =
    lang === 'en'
      ? {
          ariaLabel: 'Black line vs blue line — straight black, curved blue detour',
        }
      : {
          ariaLabel: '黑線 vs 藍線 — 黑線直線、藍線曲線繞過',
        };
  const px = 80;   // 爸 x
  const mx = 240;  // 媽 x
  const cy = 70;   // 父母 y
  const childX = 160;
  const childY = 150;
  const trunkY = 115;
  // 黑色婚姻線端點(避開人物形狀邊緣)
  const blackStart = px + 14;
  const blackEnd = mx - 14;
  // 藍色互動關係線 — 弧形向上繞過黑線(與真實 App 行為一致)
  // 用 quadratic curve:起點/終點同高,控制點往上偏 30px,做出弧
  const blueArcPath = `M ${blackStart} ${cy} Q ${(blackStart + blackEnd) / 2} ${cy - 36} ${blackEnd} ${cy}`;
  return (
    <svg
      viewBox="0 0 320 175"
      width="100%"
      style={{
        display: 'block',
        margin: '8px auto',
        maxWidth: 400,
        background: '#fafafa',
        borderRadius: 8,
      }}
      aria-label={t.ariaLabel}
    >
      {/* 藍線:互動關係線 — 弧形向上繞過(在黑線下方層先畫,避免蓋住黑線端點) */}
      <path d={blueArcPath} stroke="#007aff" strokeWidth="1.5" fill="none" />
      {/* 黑線:婚姻線 — 直線 */}
      <line x1={blackStart} y1={cy} x2={blackEnd} y2={cy} stroke="#404040" strokeWidth="2.25" />
      {/* 爸(方) */}
      <rect x={px - 14} y={cy - 14} width="28" height="28" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
      {/* 媽(圓) */}
      <circle cx={mx} cy={cy} r="14" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
      {/* 親子黑線 — 婚姻線中點往下 + 分到小孩 */}
      <line x1={(px + mx) / 2} y1={cy} x2={(px + mx) / 2} y2={trunkY} stroke="#404040" strokeWidth="2.25" />
      <line x1={(px + mx) / 2} y1={trunkY} x2={childX} y2={trunkY} stroke="#404040" strokeWidth="2.25" />
      <line x1={childX} y1={trunkY} x2={childX} y2={childY - 14} stroke="#404040" strokeWidth="2.25" />
      {/* 小孩(圓) */}
      <circle cx={childX} cy={childY} r="14" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
    </svg>
  );
}

// ============================================================
// 共用元件:生態圈 + 右下角畫筆 — 用畫筆按鈕沿格線畫多邊形圈出群組
// ============================================================
function EcosystemMockup({ lang }: { lang: Lang }) {
  const t =
    lang === 'en'
      ? {
          ariaLabel: 'Double-click ecosystem to edit',
          label: 'Family of origin',
          dblClick: 'double-click',
          editHint: '→ edit mode',
        }
      : {
          ariaLabel: '雙擊生態圈進入編輯模式',
          label: '原生家庭',
          dblClick: '雙擊',
          editHint: '→ 編輯模式',
        };
  // 多邊形頂點
  const polyVerts = [
    { x: 40, y: 50 },
    { x: 200, y: 50 },
    { x: 220, y: 90 },
    { x: 200, y: 140 },
    { x: 40, y: 140 },
    { x: 20, y: 90 },
  ];
  const polyPoints = polyVerts.map((v) => `${v.x},${v.y}`).join(' ');
  return (
    <svg
      viewBox="0 0 320 190"
      width="100%"
      style={{
        display: 'block',
        margin: '8px auto',
        maxWidth: 400,
        background: '#fafafa',
        borderRadius: 8,
      }}
      aria-label={t.ariaLabel}
    >
      {/* 生態圈多邊形(編輯模式 — 較粗的粉色邊) */}
      <polygon
        points={polyPoints}
        fill="rgba(255, 182, 193, 0.15)"
        stroke="#ff6b9d"
        strokeWidth="2.5"
      />
      {/* 標籤 */}
      <text x={120} y={42} textAnchor="middle" style={{ fontSize: 11, fill: '#ff6b9d', fontWeight: 600 }}>{t.label}</text>
      {/* 圈內人物簡化示意 */}
      <line x1={74} y1={90} x2={106} y2={90} stroke="#404040" strokeWidth="2" />
      <rect x={60} y={76} width="28" height="28" fill="#ffffff" stroke="#404040" strokeWidth="2" />
      <circle cx={120} cy={90} r="14" fill="#ffffff" stroke="#404040" strokeWidth="2" />
      <line x1={97} y1={90} x2={97} y2={118} stroke="#404040" strokeWidth="2" />
      <rect x={83} y={118} width="22" height="22" fill="#ffffff" stroke="#404040" strokeWidth="2" />
      {/* 編輯模式:頂點藍色把手 + 邊中點粉色把手 */}
      {polyVerts.map((v, i) => (
        <circle key={i} cx={v.x} cy={v.y} r="4" fill="#007aff" stroke="#ffffff" strokeWidth="1.5" />
      ))}
      {/* 邊中點粉色把手(只標 2 個示意) */}
      <circle cx={(polyVerts[0].x + polyVerts[1].x) / 2} cy={(polyVerts[0].y + polyVerts[1].y) / 2} r="3.5" fill="#ff6b9d" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx={(polyVerts[3].x + polyVerts[4].x) / 2} cy={(polyVerts[3].y + polyVerts[4].y) / 2} r="3.5" fill="#ff6b9d" stroke="#ffffff" strokeWidth="1.5" />
      {/* 游標:落在生態圈內部,雙擊示意 */}
      <g transform="translate(150, 85)">
        <path d="M 0,0 L 0,16 L 5,12 L 9,20 L 12,18 L 7,11 L 13,11 Z" fill="#ffffff" stroke="#1d1d1f" strokeWidth="1.3" />
        <text x={16} y={9} style={{ fontSize: 10, fill: '#007aff', fontWeight: 700 }}>×2</text>
      </g>
      {/* 右側說明 */}
      <text x={260} y={88} textAnchor="middle" style={{ fontSize: 11, fill: '#007aff', fontWeight: 600 }}>{t.dblClick}</text>
      <text x={260} y={108} textAnchor="middle" style={{ fontSize: 11, fill: '#1d1d1f' }}>{t.editHint}</text>
      {/* 箭頭從說明指回生態圈 */}
      <path d="M 240 100 Q 225 110 222 120" stroke="#86868b" strokeWidth="1.2" fill="none" />
      <polygon points="222,120 225,113 218,116" fill="#86868b" />
      {/* 底部小提示:畫筆建立(右下角畫筆 → 拖出多邊形) */}
      <text x={160} y={178} textAnchor="middle" style={{ fontSize: 10, fill: '#86868b' }}>
        {lang === 'en' ? '✏️ Pencil (bottom-right) to create' : '右下角 ✏️ 畫筆建立 · 雙擊編輯'}
      </text>
    </svg>
  );
}

// ============================================================
// 共用元件:保密功能 — 勾選前/後對比
// ============================================================
function PrivacyToggleMockup({ lang }: { lang: Lang }) {
  const t =
    lang === 'en'
      ? {
          ariaLabel: 'Privacy toggle: before vs after',
          beforeTitle: '☐ Privacy off',
          afterTitle: '☑ Privacy on',
          name: 'Name',
          age: 'Age',
          job: 'Occupation',
          arrow: 'check → hide',
        }
      : {
          ariaLabel: '保密功能 — 勾選前/勾選後',
          beforeTitle: '☐ 沒勾保密',
          afterTitle: '☑ 勾起來保密',
          name: '姓名',
          age: '年齡',
          job: '職業',
          arrow: '勾 → 隱藏',
        };
  const renderCard = (xOff: number, isChecked: boolean) => {
    const name = isChecked ? '●●●' : (lang === 'en' ? 'John Lee' : '王小明');
    const age = isChecked ? '●●' : '30';
    const job = isChecked ? '●●●●' : (lang === 'en' ? 'Teacher' : '老師');
    const accent = isChecked ? '#34c759' : '#86868b';
    return (
      <g>
        {/* 卡片 */}
        <rect x={xOff} y={20} width="120" height="130" rx="6" fill="#ffffff" stroke="#d2d2d7" strokeWidth="1.5" />
        {/* 勾選方塊 */}
        <rect x={xOff + 10} y={32} width="14" height="14" rx="2" fill={isChecked ? accent : '#ffffff'} stroke={accent} strokeWidth="1.5" />
        {isChecked && (
          <path d={`M ${xOff + 13},${39} L ${xOff + 16},${42} L ${xOff + 21},${36}`} stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}
        <text x={xOff + 30} y={43} style={{ fontSize: 11, fill: '#1d1d1f', fontWeight: 600 }}>
          {isChecked ? t.afterTitle.slice(2) : t.beforeTitle.slice(2)}
        </text>
        {/* 欄位 */}
        <text x={xOff + 14} y={72} style={{ fontSize: 10, fill: '#86868b' }}>{t.name}</text>
        <text x={xOff + 14} y={88} style={{ fontSize: 12, fill: '#1d1d1f', fontWeight: 500 }}>{name}</text>
        <text x={xOff + 14} y={106} style={{ fontSize: 10, fill: '#86868b' }}>{t.age}</text>
        <text x={xOff + 14} y={122} style={{ fontSize: 12, fill: '#1d1d1f', fontWeight: 500 }}>{age}</text>
        <text x={xOff + 14} y={138} style={{ fontSize: 10, fill: '#86868b' }}>{t.job}</text>
        <text x={xOff + 60} y={138} style={{ fontSize: 11, fill: '#1d1d1f' }}>{job}</text>
      </g>
    );
  };
  return (
    <svg
      viewBox="0 0 320 175"
      width="100%"
      style={{
        display: 'block',
        margin: '8px auto',
        maxWidth: 400,
        background: '#fafafa',
        borderRadius: 8,
      }}
      aria-label={t.ariaLabel}
    >
      {/* 左卡:沒勾 */}
      {renderCard(20, false)}
      {/* 右卡:勾起來 */}
      {renderCard(180, true)}
      {/* 中間箭頭 */}
      <line x1={148} y1={85} x2={172} y2={85} stroke="#86868b" strokeWidth="1.5" />
      <polygon points="172,85 165,81 165,89" fill="#86868b" />
      <text x={160} y={70} textAnchor="middle" style={{ fontSize: 9, fill: '#86868b' }}>{t.arrow}</text>
      {/* 底部說明 */}
      <text x={80} y={170} textAnchor="middle" style={{ fontSize: 10, fill: '#86868b' }}>
        {lang === 'en' ? 'Sensitive data visible' : '敏感資料正常顯示'}
      </text>
      <text x={240} y={170} textAnchor="middle" style={{ fontSize: 10, fill: '#34c759' }}>
        {lang === 'en' ? 'Hidden on canvas + export' : '畫布與匯出皆隱藏'}
      </text>
    </svg>
  );
}

// ============================================================
// 共用元件:拖親子線到別對夫妻(Step 6 子題 B)— AB+C → AB+DE+C
// Frame 1: AB 夫妻 + C 子女(實線)
// Frame 2: 拖 C 上面的線到 DE 婚姻 → AB→C 仍實線(法律父母)、DE→C 虛線(出養)、DE 縮小
// ============================================================
function DragToMarriageMockup({ lang }: { lang: Lang }) {
  const t =
    lang === 'en'
      ? {
          ariaLabel: 'Drag parent-child line to another couple',
          panel1: '1. AB married, C their child (solid)',
          panel2: '2. After dragging C\'s line to DE marriage',
          panel2sub: 'DE = bio parents (placed-out dashed, smaller)',
        }
      : {
          ariaLabel: '拖親子線到別對夫妻',
          panel1: '1. 原本 AB 是 C 的父母(實線)',
          panel2: '2. 拖 C 上面的線到 DE 婚姻',
          panel2sub: 'DE = 生父母(出養虛線,縮小)',
        };
  return (
    <svg
      viewBox="0 0 410 200"
      width="100%"
      style={{
        display: 'block',
        margin: '8px auto',
        maxWidth: 460,
        background: '#fafafa',
        borderRadius: 8,
      }}
      aria-label={t.ariaLabel}
    >
      {/* === Frame 1: AB married + C === */}
      <rect x="6" y="10" width="170" height="180" rx="6" fill="#ffffff" stroke="#d2d2d7" strokeWidth="0.8" />
      <circle cx="18" cy="22" r="8" fill="#007aff" />
      <text x="18" y="25" textAnchor="middle" style={{ fontSize: 10, fill: '#ffffff', fontWeight: 600 }}>1</text>
      {/* A 方 */}
      <rect x="55" y="40" width="22" height="22" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
      <text x="66" y="55" textAnchor="middle" style={{ fontSize: 11, fill: '#1d1d1f', fontWeight: 600 }}>A</text>
      {/* B 圓 */}
      <circle cx="120" cy="51" r="11" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
      <text x="120" y="55" textAnchor="middle" style={{ fontSize: 11, fill: '#1d1d1f', fontWeight: 600 }}>B</text>
      {/* 婚姻線 */}
      <line x1="77" y1="51" x2="109" y2="51" stroke="#404040" strokeWidth="2.25" />
      {/* 親子實線:從婚姻中點下到 C */}
      <line x1="93" y1="51" x2="93" y2="115" stroke="#404040" strokeWidth="2.25" />
      {/* C 方 */}
      <rect x="82" y="115" width="22" height="22" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
      <text x="93" y="130" textAnchor="middle" style={{ fontSize: 11, fill: '#1d1d1f', fontWeight: 600 }}>C</text>
      {/* 標籤 */}
      <text x="91" y="160" textAnchor="middle" style={{ fontSize: 10, fill: '#1d1d1f', fontWeight: 600 }}>
        {t.panel1}
      </text>

      {/* === Frame 2: AB + DE(縮小)→ C === */}
      <rect x="186" y="10" width="220" height="180" rx="6" fill="#ffffff" stroke="#d2d2d7" strokeWidth="0.8" />
      <circle cx="198" cy="22" r="8" fill="#007aff" />
      <text x="198" y="25" textAnchor="middle" style={{ fontSize: 10, fill: '#ffffff', fontWeight: 600 }}>2</text>

      {/* AB 婚姻(原大小) */}
      <rect x="210" y="40" width="22" height="22" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
      <text x="221" y="55" textAnchor="middle" style={{ fontSize: 11, fill: '#1d1d1f', fontWeight: 600 }}>A</text>
      <circle cx="265" cy="51" r="11" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
      <text x="265" y="55" textAnchor="middle" style={{ fontSize: 11, fill: '#1d1d1f', fontWeight: 600 }}>B</text>
      <line x1="232" y1="51" x2="254" y2="51" stroke="#404040" strokeWidth="2.25" />

      {/* DE 婚姻(縮小 70%)*/}
      <rect x="335" y="46" width="14" height="14" fill="#ffffff" stroke="#404040" strokeWidth="2" />
      <text x="342" y="57" textAnchor="middle" style={{ fontSize: 9, fill: '#1d1d1f', fontWeight: 600 }}>D</text>
      <circle cx="378" cy="53" r="7" fill="#ffffff" stroke="#404040" strokeWidth="2" />
      <text x="378" y="56" textAnchor="middle" style={{ fontSize: 9, fill: '#1d1d1f', fontWeight: 600 }}>E</text>
      <line x1="349" y1="53" x2="371" y2="53" stroke="#404040" strokeWidth="2" />

      {/* AB → C 實線:從 AB 中點(243, 51)下 → 橫到 C 左上 → 下 */}
      <line x1="243" y1="51" x2="243" y2="110" stroke="#404040" strokeWidth="2.25" />
      <line x1="243" y1="110" x2="288" y2="110" stroke="#404040" strokeWidth="2.25" />
      <line x1="288" y1="110" x2="288" y2="130" stroke="#404040" strokeWidth="2.25" />

      {/* DE → C 虛線:從 DE 中點(360, 53)下 → 橫到 C 右上 → 下 */}
      <line x1="360" y1="53" x2="360" y2="118" stroke="#404040" strokeWidth="1.8" strokeDasharray="4 3" />
      <line x1="360" y1="118" x2="302" y2="118" stroke="#404040" strokeWidth="1.8" strokeDasharray="4 3" />
      <line x1="302" y1="118" x2="302" y2="130" stroke="#404040" strokeWidth="1.8" strokeDasharray="4 3" />

      {/* C 方(中央底部) */}
      <rect x="284" y="130" width="22" height="22" fill="#ffffff" stroke="#404040" strokeWidth="2.25" />
      <text x="295" y="145" textAnchor="middle" style={{ fontSize: 11, fill: '#1d1d1f', fontWeight: 600 }}>C</text>

      {/* 標籤 */}
      <text x="296" y="172" textAnchor="middle" style={{ fontSize: 10, fill: '#1d1d1f', fontWeight: 600 }}>
        {t.panel2}
      </text>
      <text x="296" y="184" textAnchor="middle" style={{ fontSize: 9, fill: '#86868b' }}>
        {t.panel2sub}
      </text>
    </svg>
  );
}

// ============================================================
// 共用元件:基礎教學 #8 的 PWA 安裝按鈕
//   依平台/狀態自動切換內容:
//     - 已安裝 → 提示已安裝
//     - 可安裝(Chrome/Edge) → 大按鈕直接觸發安裝
//     - iOS Safari → 文字說明分享 → 加到主畫面
//     - 都不行(桌面 Safari 等) → 提示去網址列找
// ============================================================
function InstallButtonZH() {
  const { canInstall, isIOS, isStandalone, triggerInstall } = usePwaInstall();
  if (isStandalone) {
    return (
      <div
        style={{
          background: '#e8f5e9',
          color: '#34c759',
          padding: '10px 12px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          textAlign: 'center',
          margin: '10px 0',
        }}
      >
        ✓ 已安裝為 App,你正在 standalone 模式中
      </div>
    );
  }
  if (canInstall) {
    return (
      <button
        onClick={() => triggerInstall()}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: '#007aff',
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          margin: '10px 0',
          boxShadow: '0 2px 8px rgba(0,122,255,0.3)',
        }}
      >
        📲 點此一鍵安裝到桌面
      </button>
    );
  }
  if (isIOS) {
    return (
      <div
        style={{
          background: '#f5f5f7',
          color: '#1d1d1f',
          padding: '10px 12px',
          borderRadius: 8,
          fontSize: 12,
          lineHeight: 1.7,
          margin: '10px 0',
        }}
      >
        📱 <strong>iPhone/iPad 安裝步驟:</strong>
        <br />
        1. 按 Safari 下方 <strong>分享 ↑</strong>
        <br />
        2. 選「<strong>加入主畫面</strong>」
        <br />
        3. 之後從主畫面點 icon 開啟,離線可用
      </div>
    );
  }
  return (
    <div
      style={{
        background: '#fff5e6',
        color: '#86868b',
        padding: '10px 12px',
        borderRadius: 8,
        fontSize: 12,
        lineHeight: 1.6,
        margin: '10px 0',
      }}
    >
      💡 此瀏覽器不支援一鍵安裝。建議用 <strong>Chrome 或 Edge</strong>
      開啟以獲得完整 App 體驗。
    </div>
  );
}

function InstallButtonEN() {
  const { canInstall, isIOS, isStandalone, triggerInstall } = usePwaInstall();
  if (isStandalone) {
    return (
      <div
        style={{
          background: '#e8f5e9',
          color: '#34c759',
          padding: '10px 12px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          textAlign: 'center',
          margin: '10px 0',
        }}
      >
        ✓ Already installed — running in standalone mode
      </div>
    );
  }
  if (canInstall) {
    return (
      <button
        onClick={() => triggerInstall()}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: '#007aff',
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          margin: '10px 0',
          boxShadow: '0 2px 8px rgba(0,122,255,0.3)',
        }}
      >
        📲 Click here to install as an App
      </button>
    );
  }
  if (isIOS) {
    return (
      <div
        style={{
          background: '#f5f5f7',
          color: '#1d1d1f',
          padding: '10px 12px',
          borderRadius: 8,
          fontSize: 12,
          lineHeight: 1.7,
          margin: '10px 0',
        }}
      >
        📱 <strong>iPhone/iPad install:</strong>
        <br />
        1. Tap Safari's <strong>Share ↑</strong> button
        <br />
        2. Choose <strong>"Add to Home Screen"</strong>
        <br />
        3. Tap the new icon on your home screen — works offline
      </div>
    );
  }
  return (
    <div
      style={{
        background: '#fff5e6',
        color: '#86868b',
        padding: '10px 12px',
        borderRadius: 8,
        fontSize: 12,
        lineHeight: 1.6,
        margin: '10px 0',
      }}
    >
      💡 This browser doesn't support one-click install. Use{' '}
      <strong>Chrome or Edge</strong> for the full App experience.
    </div>
  );
}

const P: React.FC<{ children: ReactNode }> = ({ children }) => (
  <p style={{ margin: '8px 0', lineHeight: 1.7, fontSize: 14, color: '#1d1d1f' }}>
    {children}
  </p>
);

const Strong: React.FC<{ children: ReactNode }> = ({ children }) => (
  <strong style={{ color: '#007aff' }}>{children}</strong>
);

const Code: React.FC<{ children: ReactNode }> = ({ children }) => (
  <code
    style={{
      background: '#f5f5f7',
      padding: '1px 6px',
      borderRadius: 3,
      fontSize: 12,
      fontFamily: 'ui-monospace, monospace',
    }}
  >
    {children}
  </code>
);

// ============================================================
// 共用元件:屬性面板視覺解析(基礎教學「屬性面板」步驟用)
// — 顯示 4 個 Tab、形狀按鈕、性別亞型/基本醫療/進階(在「形狀」標題後)、姓名+案主+傳統
// — 旁邊有 callout 指向重點
// ============================================================
function InspectorMockup({ lang }: { lang: Lang }) {
  const t =
    lang === 'en'
      ? {
          ariaLabel: 'Inspector panel visual breakdown',
          panelLabel: 'Right Inspector',
          tabBasic: 'Basic',
          tabNetwork: 'Network',
          tabMedical: 'Medical',
          tabCustom: 'Custom',
          tabsCallout: '4 tabs',
          shapeSection: 'Shape',
          checkVariant: '☑ Variants',
          checkMedical: '☑ Medical',
          checkAdvanced: '☑ Advanced',
          shapeCallout: 'Check to add',
          shapeCallout2: 'more shapes',
          shapeCallout3: '(trans /',
          shapeCallout4: 'disability /',
          shapeCallout5: 'disease)',
          shapeMore: '... more (per check)',
          name: 'Name',
          checkProband: '☑ Proband',
          checkTraditional: '☑ Traditional',
          tradCallout: 'Check Trad',
          tradCallout2: '→ proband',
          tradCallout3: 'black fill',
          row1: 'Age · Birth date · Case role',
          row2: 'Contact · Notes · Custom marks',
          row3: 'Life status (alive / deceased / miscarriage…)',
          footer: 'Advanced tutorial digs into each tab',
        }
      : {
          ariaLabel: '屬性面板視覺解析',
          panelLabel: '右側屬性面板',
          tabBasic: '基本',
          tabNetwork: '網絡',
          tabMedical: '醫療',
          tabCustom: '自訂',
          tabsCallout: '4 分頁',
          shapeSection: '形狀',
          checkVariant: '☑ 性別亞型',
          checkMedical: '☑ 基本醫療',
          checkAdvanced: '☑ 進階',
          shapeCallout: '勾起來',
          shapeCallout2: '加更多',
          shapeCallout3: '形狀',
          shapeCallout4: '(跨性別',
          shapeCallout5: '障別/疾病)',
          shapeMore: '... 更多(視勾選)',
          name: '姓名',
          checkProband: '☑ 案主',
          checkTraditional: '☑ 傳統',
          tradCallout: '勾傳統',
          tradCallout2: '→ 案主',
          tradCallout3: '黑色填滿',
          row1: '年齡 · 出生日期 · 個案角色',
          row2: '聯絡資訊 · 備註 · 附加標記',
          row3: '生命狀態(在世/已逝/流產...)',
          footer: '進階教學會深入講解每個分頁',
        };
  return (
    <svg
      viewBox="0 0 380 280"
      width="100%"
      style={{
        display: 'block',
        margin: '6px auto',
        maxWidth: 440,
        background: '#fafafa',
        borderRadius: 8,
      }}
      aria-label="屬性面板視覺解析"
    >
      {/* 面板外框(虛線) */}
      <rect
        x="60"
        y="10"
        width="240"
        height="260"
        rx="6"
        fill="#ffffff"
        stroke="#d2d2d7"
        strokeDasharray="6 4"
      />
      <text x="68" y="24" style={{ fontSize: 9, fill: '#86868b' }}>
        {t.panelLabel}
      </text>

      {/* === Tab bar (4 個分頁) === */}
      <rect x="66" y="32" width="42" height="16" rx="2" fill="#e8f1ff" stroke="#007aff" strokeWidth="0.8" />
      <text x="74" y="44" style={{ fontSize: 9.5, fill: '#007aff', fontWeight: 600 }}>{t.tabBasic}</text>
      <text x="118" y="44" style={{ fontSize: 9.5, fill: '#86868b' }}>{t.tabNetwork}</text>
      <text x="170" y="44" style={{ fontSize: 9.5, fill: '#86868b' }}>{t.tabMedical}</text>
      <text x="218" y="44" style={{ fontSize: 9.5, fill: '#86868b' }}>{t.tabCustom}</text>

      {/* Callout:4 個分頁 */}
      <text x="2" y="42" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>
        {t.tabsCallout}
      </text>
      <line x1="38" y1="40" x2="62" y2="40" stroke="#007aff" strokeWidth="0.8" strokeDasharray="2 2" />

      {/* === 「形狀」Section 標題列 — 左為標題,右為 3 個 checkbox === */}
      <line x1="66" y1="54" x2="294" y2="54" stroke="#e5e4e7" strokeWidth="0.5" />
      <text x="66" y="70" style={{ fontSize: 10.5, fill: '#1d1d1f', fontWeight: 600 }}>
        {t.shapeSection}
      </text>
      {/* ☑ 3 個小 checkbox 在標題右側,跟真實 Tab1 一致 */}
      <text x="98" y="70" style={{ fontSize: 9.5, fill: '#1d1d1f' }}>{t.checkVariant}</text>
      <text x="162" y="70" style={{ fontSize: 9.5, fill: '#1d1d1f' }}>{t.checkMedical}</text>
      <text x="226" y="70" style={{ fontSize: 9.5, fill: '#1d1d1f' }}>{t.checkAdvanced}</text>

      {/* Callout:勾起來增加更多形狀 */}
      <text x="305" y="62" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>{t.shapeCallout}</text>
      <text x="305" y="76" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>{t.shapeCallout2}</text>
      <text x="305" y="90" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>{t.shapeCallout3}</text>
      <text x="305" y="104" style={{ fontSize: 9, fill: '#86868b' }}>{t.shapeCallout4}</text>
      <text x="305" y="116" style={{ fontSize: 9, fill: '#86868b' }}>{t.shapeCallout5}</text>
      <line x1="270" y1="68" x2="302" y2="68" stroke="#007aff" strokeWidth="0.8" strokeDasharray="2 2" />

      {/* === 形狀按鈕區塊(flow grid)=== */}
      {/* + 新增人物 */}
      <rect x="66" y="80" width="18" height="18" rx="2" fill="#ffffff" stroke="#007aff" strokeWidth="1" />
      <text x="71" y="93" style={{ fontSize: 11, fill: '#007aff', fontWeight: 600 }}>+</text>
      {/* 6 個基本形狀 */}
      <rect x="90" y="80" width="18" height="18" fill="#ffffff" stroke="#404040" strokeWidth="1.2" />
      <circle cx="123" cy="89" r="9" fill="#ffffff" stroke="#404040" strokeWidth="1.2" />
      <polygon points="138,98 147,80 156,98" fill="#ffffff" stroke="#404040" strokeWidth="1.2" />
      <polygon points="171,89 180,80 189,89 180,98" fill="#ffffff" stroke="#404040" strokeWidth="1.2" />
      <rect x="197" y="85" width="22" height="8" fill="#ffffff" stroke="#404040" strokeWidth="1.2" />
      <polygon points="230,89 238,82 238,96" fill="#ffffff" stroke="#404040" strokeWidth="1.2" />
      {/* 障別半填色(連續流) */}
      <g>
        <rect x="252" y="80" width="18" height="18" fill="#ffffff" stroke="#404040" strokeWidth="1.2" />
        <rect x="252" y="80" width="9" height="18" fill="#777777" />
      </g>
      {/* 第二排示意:展開後更多形狀 */}
      <g opacity="0.7">
        <rect x="66" y="104" width="18" height="18" fill="#ffffff" stroke="#404040" strokeWidth="1.2" />
        <text x="69" y="116" style={{ fontSize: 11, fill: '#404040' }}>♂♀</text>
        <rect x="90" y="104" width="18" height="18" fill="#ffffff" stroke="#404040" strokeWidth="1.2" />
        <text x="93" y="116" style={{ fontSize: 11, fill: '#404040' }}>⚣</text>
        <rect x="114" y="104" width="18" height="18" fill="#ffffff" stroke="#404040" strokeWidth="1.2" />
        <text x="118" y="116" style={{ fontSize: 10, fill: '#404040' }}>Rx</text>
        <text x="142" y="118" style={{ fontSize: 9, fill: '#86868b' }}>{t.shapeMore}</text>
      </g>

      {/* === 姓名列 === */}
      <line x1="66" y1="134" x2="294" y2="134" stroke="#e5e4e7" strokeWidth="0.5" />
      <text x="66" y="152" style={{ fontSize: 10, fill: '#86868b' }}>{t.name}</text>
      <text x="92" y="152" style={{ fontSize: 9.5, fill: '#007aff', fontWeight: 600 }}>{t.checkProband}</text>
      <text x="138" y="152" style={{ fontSize: 9.5, fill: '#007aff', fontWeight: 600 }}>{t.checkTraditional}</text>
      <rect x="66" y="158" width="220" height="18" fill="#ffffff" stroke="#d2d2d7" strokeWidth="0.6" />

      {/* Callout:勾傳統 → 黑色案主 */}
      <text x="305" y="148" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>{t.tradCallout}</text>
      <text x="305" y="162" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>{t.tradCallout2}</text>
      <text x="305" y="176" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>{t.tradCallout3}</text>
      <line x1="182" y1="152" x2="302" y2="152" stroke="#007aff" strokeWidth="0.8" strokeDasharray="2 2" />

      {/* === 其餘欄位提示(年齡/出生日期/個案角色/聯絡等) === */}
      <line x1="66" y1="184" x2="294" y2="184" stroke="#e5e4e7" strokeWidth="0.5" />
      <text x="66" y="200" style={{ fontSize: 10, fill: '#1d1d1f' }}>{t.row1}</text>
      <text x="66" y="216" style={{ fontSize: 10, fill: '#1d1d1f' }}>{t.row2}</text>
      <text x="66" y="232" style={{ fontSize: 10, fill: '#1d1d1f' }}>{t.row3}</text>

      <text x="66" y="258" style={{ fontSize: 9, fill: '#86868b' }}>{t.footer}</text>
    </svg>
  );
}


// ============================================================
// 🌱 基礎教學 — 中文 (8 步) — 首次自動跳
// ============================================================
export const BASIC_STEPS_ZH: TutorialStep[] = [
  {
    icon: '🖼️',
    title: '畫面總覽 — 人物、4 個箭頭',
    content: (
      <>
        <P>
          進入個案後中央就是 <Strong>畫布</Strong>。
          選中人物會出現 ↑↓←→ 4 個藍色小箭頭,1 鍵加家人:
        </P>
        <CanvasArrowsMockup lang="zh" />
        <P>
          畫布其他重點:
          <br />
          • 空白處<Strong>拖框</Strong> = 圈選多人一起搬位置
          <br />
          • 拖<Strong>親子線端點到別人</Strong> = 該人變次要父母(收養 / 出養)
          <br />
          • 左上:返回鍵 <Code>←</Code> + 主選單 <Code>☰</Code>
          <br />
          • 右下角浮動工具列:縮放 / 適應視窗 / <Strong>✏️ 畫筆</Strong>(畫生態圖)
        </P>
      </>
    ),
  },
  {
    icon: '🔄',
    title: '雙擊切換',
    content: (
      <>
        <P><Strong>雙擊畫布上的人物</Strong> 直接切形狀,不用回屬性面板:</P>
        <ShapeSwitchMockup lang="zh" />
        <P>
          • <Code>□</Code> ↔ <Code>○</Code> 男女互切(最常用)
          <br />
          • <Code>△</Code> 懷孕 → 死產 → 流產 → 人工流產 4 段循環
          <br />
          • <Code>◇</Code> 未知性別 / <Code>機構</Code> / <Code>寵物</Code> 不循環
        </P>
        <P>
          想用更多形狀(<Strong>跨性別 / 同性戀 / 障別 / 疾病</Strong>等)
          → 走右側屬性面板基本分頁的展開區塊(下一步圖解)。
        </P>
      </>
    ),
  },
  {
    icon: '📑',
    title: '右側屬性面板(4 個分頁)',
    content: (
      <>
        <P>右側屬性面板共 <Strong>4 個分頁</Strong>:</P>
        <P>
          • <Strong>基本</Strong>:姓名、年齡、形狀、案主、性別亞型、聯絡
          <br />
          • <Strong>網絡</Strong>:互動關係線(15 種) + 機構單位
          <br />
          • <Strong>醫療</Strong>:疾病、用藥、量表評估
          <br />
          • <Strong>自訂</Strong>:個案備注 / 附件
        </P>
        <InspectorMockup lang="zh" />
        <P>
          重點:
          <br />
          • 勾「<Strong>傳統</Strong>」→ 案主黑色填滿(取代雙紅匡)
          <br />
          • 雙擊畫布的人物 → 切形狀(就不用回面板選)
          <br />
          • 想用<Strong>跨性別 / 障別 / 疾病</Strong>等更多形狀 → 點 ▶ 展開
        </P>
        <p style={{ fontSize: 12, color: '#86868b', marginTop: 4, lineHeight: 1.6 }}>
          每個分頁的深入欄位,點 ▶ 展開區塊查看。
        </p>
      </>
    ),
  },
  {
    icon: '➰',
    title: '線條入門 — 親子線實/虛',
    content: (
      <>
        <P>家族結構的「黑色線條」分兩類:</P>
        <FamilyLineMockup lang="zh" />
        <p style={{ margin: '8px 0 4px', fontSize: 13.5, lineHeight: 1.7, color: '#1d1d1f' }}>
          <Strong>│ 實線</Strong> — 親生 / 收養
        </p>
        <p style={{ margin: '4px 0 8px', fontSize: 13.5, lineHeight: 1.7, color: '#1d1d1f' }}>
          <Strong>┊ 虛線</Strong> — 寄養 / 出養 / 精子捐贈
        </p>
        <P>
          <Strong>雙擊</Strong> 親子線可在實/虛之間切換(夫妻雙方的親子線會一起變)。
          <Strong>單擊</Strong> 任何線可在右側面板看完整屬性。
        </P>
        <p style={{ fontSize: 12, color: '#86868b', marginTop: 4, lineHeight: 1.6 }}>
          下一步看「黑線 vs 藍線」更完整的差別。
        </p>
      </>
    ),
  },
  {
    icon: '🖱️',
    title: '拖曳線條 — 兩種用法',
    content: (
      <>
        <p style={{ margin: '6px 0 2px', fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>
          A. 拖既有線端點 → 改連接對象
        </p>
        <p style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.7, margin: '2px 0 12px' }}>
          婚姻線、親子線、互動關係線都能<Strong>按住線端點 → 拖到另一個人 → 放開</Strong>,
          自動改連對象(預覽會顯示橘色虛線)。
        </p>
        <p style={{ margin: '12px 0 2px', fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>
          B. 拖親子線到別對夫妻 → 加為出養父母(已出養為例)
        </p>
        <p style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.7, margin: '2px 0 4px' }}>
          場景:已知 C 是 AB 的小孩,後來發現其實 C 是 DE 出養給 AB 的:
        </p>
        <DragToMarriageMockup lang="zh" />
        <p style={{ fontSize: 12, color: '#86868b', marginTop: 8, lineHeight: 1.6 }}>
          兩種拖曳,拖到空白處 / 自己 = 取消。
        </p>
      </>
    ),
  },
  {
    icon: '⚫🔵',
    title: '黑線 vs 藍線 — Membership vs Relationship',
    content: (
      <>
        <P>同一對人物可以同時有兩種線:</P>
        <BlackBlueLineMockup lang="zh" />
        <p style={{ margin: '8px 0 4px', fontSize: 13.5, lineHeight: 1.7, color: '#1d1d1f', textAlign: 'left' }}>
          ⚫ <Strong>黑線</Strong> = 成員關係(誰是誰的家人)
        </p>
        <p style={{ margin: '4px 0 8px', fontSize: 13.5, lineHeight: 1.7, color: '#1d1d1f', textAlign: 'left' }}>
          🔵 <Strong>藍線</Strong> = 互動關係(誰跟誰互動程度)
        </p>
        <P>
          在右側 <Strong>Tab2「網絡」</Strong> 可加 15 種互動關係線。
          點選任一互動關係圖示後,<Strong>同一個圖示再點一次</Strong> 可反轉箭頭方向。
        </P>
      </>
    ),
  },
  {
    icon: '🌳',
    title: '生態圈 — 框出群組',
    content: (
      <>
        <P>
          除了人物與線,還可以用 <Strong>多邊形</Strong> 框起一群人,
          表達<Strong>子系統</Strong>(原生家庭、學校、職場、親屬圈等)。
        </P>
        <EcosystemMockup lang="zh" />
        <P>
          畫法:點<Strong>右下角 ✏️ 畫筆</Strong> →
          沿格線拖出多邊形 → 拖回起點 <Strong>3 格內</Strong> 放手 = 自動封閉。
        </P>
        <p style={{ margin: '6px 0 4px', fontSize: 13, color: '#3a3a3c', lineHeight: 1.7 }}>
          • <Strong>雙擊既有生態圈</Strong> → 編輯模式 → 拖邊把手調形狀
          <br />
          • 標籤雙擊可改名,選中後 × 刪除
          <br />
          • 可建立多個圈,自由命名
        </p>
      </>
    ),
  },
  {
    icon: '🔒',
    title: '保密功能 — 隱藏敏感欄位',
    content: (
      <>
        <P>家系圖常含敏感資訊,本工具有兩層保密設計:</P>
        <PrivacyToggleMockup lang="zh" />
        <p style={{ margin: '6px 0 4px', fontSize: 13.5, color: '#1d1d1f', lineHeight: 1.7 }}>
          <Strong>① 總開關</Strong>(Tab1 / Tab3 都看得到)
          <br />
          勾起來 → 各 Tab 出現<Strong>「區塊全選保密」</Strong>+ <Strong>欄位個別 🔒</Strong>
        </p>
        <p style={{ margin: '6px 0 4px', fontSize: 13.5, color: '#1d1d1f', lineHeight: 1.7 }}>
          <Strong>② Tab2 互動關係線「全選保密」</Strong>
          <br />
          不受總開關控制,隨時可勾,瞬間把所有互動關係線藏起來。
        </p>
        <p style={{ margin: '4px 0', fontSize: 13, color: '#3a3a3c', lineHeight: 1.7 }}>
          勾保密後:該欄位/線條<Strong>畫布上即時消失</Strong>,匯出 PNG / JPG 時也一併隱藏(內部資料保留)。
        </p>
      </>
    ),
  },
  {
    icon: '🎉',
    title: '完成 + 安裝為 App',
    content: (
      <>
        <P>
          基礎教學結束 🎉 強烈建議把它<Strong>安裝為 App</Strong>:像桌面應用一樣點 icon 就開,
          且可<Strong>完全離線使用</Strong>。
        </P>
        <InstallButtonZH />
        <P>
          有任何問題,點右上 <Code>ℹ️</Code> 可看「關於 / 支持本專案」,
          或在主選單 <Code>☰</Code> → 「回報問題」直接寫信給開發者。
        </P>
        <p style={{ marginTop: 16, marginBottom: 0, fontSize: 13, color: '#86868b', lineHeight: 1.6 }}>
          祝你使用順利 🌳
        </p>
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: 11, color: '#a1a1a6', lineHeight: 1.6, textAlign: 'right' }}>
          — 梁人人 製作
        </p>
      </>
    ),
  },
];

// ============================================================
// 🌱 Basic Tutorial — EN (5 steps)
// ============================================================
export const BASIC_STEPS_EN: TutorialStep[] = [
  {
    icon: '🖼️',
    title: 'Screen Overview — Person, 4 Arrows',
    content: (
      <>
        <P>
          After opening a case, the center is the <Strong>canvas</Strong>.
          Selecting a person reveals 4 blue arrows ↑↓←→ to add family with one click:
        </P>
        <CanvasArrowsMockup lang="en" />
        <P>
          Other canvas tips:
          <br />
          • <Strong>Drag-select</Strong> on empty area = pick multiple to move at once
          <br />
          • Drag a <Strong>parent-child line endpoint</Strong> onto someone = adoption / foster
          <br />
          • Top-left: back <Code>←</Code> + main menu <Code>☰</Code>
          <br />
          • Bottom-right toolbar: zoom / fit / <Strong>✏️ Pen</Strong> (draw ecosystems)
        </P>
      </>
    ),
  },
  {
    icon: '🔄',
    title: 'Double-click to Switch',
    content: (
      <>
        <P><Strong>Double-click a person</Strong> on the canvas to cycle shape — no need to go back to the inspector:</P>
        <ShapeSwitchMockup lang="en" />
        <P>
          • <Code>□</Code> ↔ <Code>○</Code> Male / Female (most common)
          <br />
          • <Code>△</Code> Pregnancy → Stillbirth → Miscarriage → Abortion (4-cycle)
          <br />
          • <Code>◇</Code> Unknown / <Code>Institution</Code> / <Code>Pet</Code> do not cycle
        </P>
        <P>
          For more shapes (<Strong>transgender / gay / disability / disease</Strong>)
          → use the expandable sections in the inspector's Basic tab (next step illustrates).
        </P>
      </>
    ),
  },
  {
    icon: '📑',
    title: 'Right Inspector (4 Tabs)',
    content: (
      <>
        <P>The right Inspector has <Strong>4 tabs</Strong>:</P>
        <P>
          • <Strong>Basic</Strong>: Name, age, shape, proband, gender variants, contact
          <br />
          • <Strong>Network</Strong>: Relation lines (15 kinds) + institutions
          <br />
          • <Strong>Medical</Strong>: Diseases, medications, scale assessments
          <br />
          • <Strong>Custom</Strong>: Case notes / attachments
        </P>
        <InspectorMockup lang="en" />
        <P>
          Key points:
          <br />
          • Check "<Strong>Traditional</Strong>" → proband filled black (instead of red double border)
          <br />
          • Double-click person on canvas → cycle shape (no need to come back to panel)
          <br />
          • For more shapes (<Strong>transgender / disability / disease</Strong>) → click ▶ to expand
        </P>
        <p style={{ fontSize: 12, color: '#86868b', marginTop: 4, lineHeight: 1.6 }}>
          Click ▶ inside each tab to expand for more detailed fields.
        </p>
      </>
    ),
  },
  {
    icon: '➰',
    title: 'Lines Intro — Parent-child Solid / Dashed',
    content: (
      <>
        <P>Black family-structure lines come in two flavors:</P>
        <FamilyLineMockup lang="en" />
        <p style={{ margin: '8px 0 4px', fontSize: 13.5, lineHeight: 1.7, color: '#1d1d1f' }}>
          <Strong>│ Solid</Strong> — biological / adopted
        </p>
        <p style={{ margin: '4px 0 8px', fontSize: 13.5, lineHeight: 1.7, color: '#1d1d1f' }}>
          <Strong>┊ Dashed</Strong> — fostered / placed-out / sperm-donor
        </p>
        <P>
          <Strong>Double-click</Strong> a parent-child line to toggle solid/dashed
          (both spouses' lines flip together). <Strong>Single-click</Strong> any line
          to see full properties on the right.
        </P>
        <p style={{ fontSize: 12, color: '#86868b', marginTop: 4, lineHeight: 1.6 }}>
          Next step: see "Black line vs Blue line" for the deeper picture.
        </p>
      </>
    ),
  },
  {
    icon: '🖱️',
    title: 'Drag a Line — Two Uses',
    content: (
      <>
        <p style={{ margin: '6px 0 2px', fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>
          A. Drag an existing endpoint → change target
        </p>
        <p style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.7, margin: '2px 0 12px' }}>
          Marriage / parent-child / relation lines: <Strong>press the
          endpoint → drag onto another person → release</Strong>. An
          orange dashed preview shows where it'll land.
        </p>
        <p style={{ margin: '12px 0 2px', fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>
          B. Drag a parent-child line to another couple → add as bio (placed-out example)
        </p>
        <p style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.7, margin: '2px 0 4px' }}>
          Scenario: C looked like AB's child; you later learn DE are the bio parents who placed C out to AB:
        </p>
        <DragToMarriageMockup lang="en" />
        <p style={{ fontSize: 12, color: '#86868b', marginTop: 8, lineHeight: 1.6 }}>
          Both gestures: release on empty space / self = cancel.
        </p>
      </>
    ),
  },
  {
    icon: '⚫🔵',
    title: 'Black vs Blue — Membership vs Relationship',
    content: (
      <>
        <P>The same pair of people can have both kinds of lines:</P>
        <BlackBlueLineMockup lang="en" />
        <p style={{ margin: '8px 0 4px', fontSize: 13.5, lineHeight: 1.7, color: '#1d1d1f', textAlign: 'left' }}>
          ⚫ <Strong>Black</Strong> = Membership (who is whose family)
        </p>
        <p style={{ margin: '4px 0 8px', fontSize: 13.5, lineHeight: 1.7, color: '#1d1d1f', textAlign: 'left' }}>
          🔵 <Strong>Blue</Strong> = Relationship (how close they relate)
        </p>
        <P>
          Add any of 15 interaction line types in <Strong>Tab2 "Network"</Strong>.
          After picking a relation icon, <Strong>click the same icon again</Strong>
          to flip the arrow direction.
        </P>
      </>
    ),
  },
  {
    icon: '🌳',
    title: 'Ecosystems — Frame a Group',
    content: (
      <>
        <P>
          Beyond people and lines, you can also draw a <Strong>polygon</Strong>
          around a group to express a <Strong>subsystem</Strong>
          (family of origin, school, workplace, kinship, etc.).
        </P>
        <EcosystemMockup lang="en" />
        <P>
          How: tap the <Strong>✏️ pencil at the bottom-right</Strong> →
          drag along the grid to outline a polygon →
          release within <Strong>3 grid cells of the start point</Strong>
          to auto-close.
        </P>
        <p style={{ margin: '6px 0 4px', fontSize: 13, color: '#3a3a3c', lineHeight: 1.7 }}>
          • <Strong>Double-click an existing ecosystem</Strong> → edit mode → drag handles to reshape
          <br />
          • Double-click the label to rename; press × after selecting to delete
          <br />
          • You can create multiple frames and name them freely
        </p>
      </>
    ),
  },
  {
    icon: '🔒',
    title: 'Privacy — Hide Sensitive Fields',
    content: (
      <>
        <P>Genograms often contain sensitive info. Two-layer privacy design:</P>
        <PrivacyToggleMockup lang="en" />
        <p style={{ margin: '6px 0 4px', fontSize: 13.5, color: '#1d1d1f', lineHeight: 1.7 }}>
          <Strong>① Master switch</Strong> (visible in Tab1 / Tab3)
          <br />
          Tick it → each tab gets <Strong>"Select-all-private per section"</Strong> + <Strong>per-field 🔒</Strong>.
        </p>
        <p style={{ margin: '6px 0 4px', fontSize: 13.5, color: '#1d1d1f', lineHeight: 1.7 }}>
          <Strong>② Tab2: "All interaction lines private"</Strong>
          <br />
          Independent of the master switch — instantly hide every blue line.
        </p>
        <p style={{ margin: '4px 0', fontSize: 13, color: '#3a3a3c', lineHeight: 1.7 }}>
          Once marked private: the field/line <Strong>disappears from canvas instantly</Strong>, and is also hidden in PNG/JPG exports. The underlying data is still kept — just not shown.
        </p>
      </>
    ),
  },
  {
    icon: '🎉',
    title: 'Done + Install as App',
    content: (
      <>
        <P>
          Basic tutorial complete 🎉 We strongly recommend
          <Strong>installing this as an App</Strong> — click an icon to open, works <Strong>fully offline</Strong>.
        </P>
        <InstallButtonEN />
        <P>
          Questions? Tap <Code>ℹ️</Code> in the top-right for "About / Support",
          or main menu <Code>☰</Code> → "Report" to email the developer.
        </P>
        <p style={{ marginTop: 16, marginBottom: 0, fontSize: 13, color: '#86868b', lineHeight: 1.6 }}>
          Happy charting 🌳
        </p>
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: 11, color: '#a1a1a6', lineHeight: 1.6, textAlign: 'right' }}>
          — Liang RenRen
        </p>
      </>
    ),
  },
];


// ============================================================
// 公開介面:依語言挑對應步驟
// ============================================================
export function getBasicSteps(lang: 'zh' | 'en'): TutorialStep[] {
  return lang === 'en' ? BASIC_STEPS_EN : BASIC_STEPS_ZH;
}

// 向後相容:舊名稱
export const BASIC_STEPS = BASIC_STEPS_ZH;
export const TUTORIAL_STEPS = BASIC_STEPS_ZH;
