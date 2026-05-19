import type { ReactNode } from 'react';
import { usePwaInstall } from '../../services/pwaInstall';

export interface TutorialStep {
  icon: string;
  title: string;
  content: ReactNode;
}

// SmallArrowsIllustration 已移除(原本用於基礎教學第 4 步「加家人」,該步已刪)

// ============================================================
// 共用元件:線條拖曳教學 3 連格(基礎教學「拖曳線條」步驟用)
// — Frame 1: 按住線條端點
// — Frame 2: 拖到新對象(中間虛橘線預覽)
// — Frame 3: 放開,自動接到新對象
// ============================================================
function LineDragMockup() {
  // 3 個 panel 並排:x=10/130/250, 各寬 110
  // 每個 panel 內畫:左上人物 A(方)、右上人物 B(圓)、底部小孩 C
  // Frame 1: A→C 實線,游標在 A 端點 / Frame 2: 端點離開往 B / Frame 3: B→C 實線
  const renderPanel = (
    idx: number,
    xOffset: number,
    label: string,
    cursor: { x: number; y: number },
    lineState: 'attached-A' | 'mid' | 'attached-B',
  ) => {
    // 局部座標(panel 內):A(20, 30)方,B(80, 30)圓,C(50, 95)方
    const Ax = xOffset + 20,
      Ay = 30;
    const Bx = xOffset + 80,
      By = 30;
    const Cx = xOffset + 50,
      Cy = 95;
    return (
      <g key={idx}>
        {/* panel 框 */}
        <rect
          x={xOffset - 4}
          y="10"
          width="118"
          height="140"
          rx="6"
          fill="#ffffff"
          stroke="#d2d2d7"
          strokeWidth="0.8"
        />
        {/* 編號圓圈 */}
        <circle cx={xOffset + 8} cy="20" r="8" fill="#007aff" />
        <text x={xOffset + 8} y="23" textAnchor="middle" style={{ fontSize: 10, fill: '#ffffff', fontWeight: 600 }}>
          {idx}
        </text>

        {/* 人物 A(方,左上) */}
        <rect x={Ax - 10} y={Ay - 10} width="20" height="20" fill="#ffffff" stroke="#404040" strokeWidth="2" />
        {/* 人物 B(圓,右上) */}
        <circle cx={Bx} cy={By} r="10" fill="#ffffff" stroke="#404040" strokeWidth="2" />
        {/* 人物 C(方,下方) */}
        <rect x={Cx - 10} y={Cy - 10} width="20" height="20" fill="#ffffff" stroke="#404040" strokeWidth="2" />

        {/* 線條 */}
        {lineState === 'attached-A' && (
          <line x1={Ax} y1={Ay + 10} x2={Cx} y2={Cy - 10} stroke="#404040" strokeWidth="2" />
        )}
        {lineState === 'mid' && (
          <>
            {/* 原本連 C 的端點 */}
            <line x1={cursor.x} y1={cursor.y} x2={Cx} y2={Cy - 10} stroke="#404040" strokeWidth="2" />
            {/* 預覽虛線到 B */}
            <line x1={cursor.x} y1={cursor.y} x2={Bx} y2={By + 8} stroke="#ff9500" strokeWidth="1.5" strokeDasharray="3 3" />
          </>
        )}
        {lineState === 'attached-B' && (
          <line x1={Bx} y1={By + 10} x2={Cx} y2={Cy - 10} stroke="#404040" strokeWidth="2" />
        )}

        {/* 游標 */}
        <g transform={`translate(${cursor.x}, ${cursor.y})`}>
          <path
            d="M 0,0 L 0,12 L 3,9 L 6,15 L 8,13 L 5,7 L 9,7 Z"
            fill="#ffffff"
            stroke="#1d1d1f"
            strokeWidth="1"
          />
        </g>

        {/* 步驟標籤 */}
        <text x={xOffset + 50} y="135" textAnchor="middle" style={{ fontSize: 10.5, fill: '#1d1d1f', fontWeight: 600 }}>
          {label}
        </text>
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
      aria-label="拖曳線條 3 步驟教學"
    >
      {renderPanel(1, 10, '1. 按住線端點', { x: 30, y: 40 }, 'attached-A')}
      {renderPanel(2, 130, '2. 拖到新對象', { x: 130 + 55, y: 50 }, 'mid')}
      {renderPanel(3, 250, '3. 放開,自動接好', { x: 250 + 80, y: 40 }, 'attached-B')}
    </svg>
  );
}

// ============================================================
// 共用元件:畫布視覺解析(基礎教學「畫面總覽 — 人物、箭頭」步驟用)
// — 顯示一個案主在中央 + ↑↓←→ 4 個藍色箭頭 + 標籤
// — callout 說明每個箭頭的用途、長按 ↑ 拖出黑線的小提示
// ============================================================
function CanvasArrowsMockup() {
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
      aria-label="畫布上人物與 4 個加家人箭頭"
    >
      {/* 畫布外框(虛線) */}
      <rect
        x="10"
        y="10"
        width="300"
        height="240"
        rx="6"
        fill="#ffffff"
        stroke="#d2d2d7"
        strokeDasharray="6 4"
      />
      <text x="18" y="24" style={{ fontSize: 10, fill: '#86868b' }}>
        畫布(中央)
      </text>

      {/* 案主方框(雙紅匡) */}
      <rect
        x="144"
        y="116"
        width="32"
        height="32"
        fill="#ffffff"
        stroke="#404040"
        strokeWidth="2.25"
      />
      <rect
        x="139"
        y="111"
        width="42"
        height="42"
        fill="none"
        stroke="#ff3b30"
        strokeWidth="1.5"
      />

      {/* 上箭頭(加父母) */}
      <polygon points="160,82 168,96 152,96" fill="#007aff" opacity="0.85" />
      <text x="180" y="92" style={{ fontSize: 11, fill: '#007aff', fontWeight: 600 }}>
        ↑ 加父母
      </text>

      {/* 下箭頭(加小孩 / 加配偶) */}
      <polygon points="160,180 168,166 152,166" fill="#007aff" opacity="0.85" />
      <text x="180" y="176" style={{ fontSize: 11, fill: '#007aff', fontWeight: 600 }}>
        ↓ 加小孩
      </text>
      <text x="180" y="190" style={{ fontSize: 9.5, fill: '#86868b' }}>
        (無配偶時先加配偶)
      </text>

      {/* 左箭頭(加配偶) */}
      <polygon points="112,132 126,124 126,140" fill="#007aff" opacity="0.85" />
      <text x="38" y="120" style={{ fontSize: 11, fill: '#007aff', fontWeight: 600 }}>
        ← 加配偶
      </text>

      {/* 右箭頭(加配偶) */}
      <polygon points="208,132 194,124 194,140" fill="#007aff" opacity="0.85" />
      <text x="214" y="120" style={{ fontSize: 11, fill: '#007aff', fontWeight: 600 }}>
        → 加配偶
      </text>

      {/* 長按提示 */}
      <text x="18" y="216" style={{ fontSize: 10.5, fill: '#1d1d1f' }}>
        💡 長按 ↑ 0.25 秒 + 拖到另一人物 → 直接畫黑色親子線
      </text>
      <text x="18" y="234" style={{ fontSize: 10.5, fill: '#1d1d1f' }}>
        💡 長按 ↓ 1 秒 → 開雙胞胎設定視窗(2-15 胞胎)
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

// 平台偵測 — Mac 顯示 ⌘ 符號;Windows/Linux 顯示 Ctrl
const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);

/** 渲染鍵盤組合鍵 — Mac: ⌘Z / Windows: Ctrl+Z */
function kbd(...keys: string[]): string {
  if (isMac) {
    return keys
      .map((k) => (k === 'Cmd' ? '⌘' : k === 'Shift' ? '⇧' : k))
      .join('');
  }
  return keys.map((k) => (k === 'Cmd' ? 'Ctrl' : k)).join('+');
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
function InspectorMockup() {
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
        右側屬性面板
      </text>

      {/* === Tab bar (4 個分頁) === */}
      <rect x="66" y="32" width="42" height="16" rx="2" fill="#e8f1ff" stroke="#007aff" strokeWidth="0.8" />
      <text x="74" y="44" style={{ fontSize: 9.5, fill: '#007aff', fontWeight: 600 }}>基本</text>
      <text x="118" y="44" style={{ fontSize: 9.5, fill: '#86868b' }}>網絡</text>
      <text x="170" y="44" style={{ fontSize: 9.5, fill: '#86868b' }}>醫療</text>
      <text x="218" y="44" style={{ fontSize: 9.5, fill: '#86868b' }}>自訂</text>

      {/* Callout:4 個分頁 */}
      <text x="2" y="42" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>
        4 分頁
      </text>
      <line x1="38" y1="40" x2="62" y2="40" stroke="#007aff" strokeWidth="0.8" strokeDasharray="2 2" />

      {/* === 「形狀」Section 標題列 — 左為標題,右為 3 個 checkbox === */}
      <line x1="66" y1="54" x2="294" y2="54" stroke="#e5e4e7" strokeWidth="0.5" />
      <text x="66" y="70" style={{ fontSize: 10.5, fill: '#1d1d1f', fontWeight: 600 }}>
        形狀
      </text>
      {/* ☑ 3 個小 checkbox 在標題右側,跟真實 Tab1 一致 */}
      <text x="98" y="70" style={{ fontSize: 9.5, fill: '#1d1d1f' }}>☑ 性別亞型</text>
      <text x="162" y="70" style={{ fontSize: 9.5, fill: '#1d1d1f' }}>☑ 基本醫療</text>
      <text x="226" y="70" style={{ fontSize: 9.5, fill: '#1d1d1f' }}>☑ 進階</text>

      {/* Callout:勾起來增加更多形狀 */}
      <text x="305" y="62" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>勾起來</text>
      <text x="305" y="76" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>加更多</text>
      <text x="305" y="90" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>形狀</text>
      <text x="305" y="104" style={{ fontSize: 9, fill: '#86868b' }}>(跨性別</text>
      <text x="305" y="116" style={{ fontSize: 9, fill: '#86868b' }}>障別/疾病)</text>
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
        <text x="142" y="118" style={{ fontSize: 9, fill: '#86868b' }}>... 更多(視勾選)</text>
      </g>

      {/* === 姓名列 === */}
      <line x1="66" y1="134" x2="294" y2="134" stroke="#e5e4e7" strokeWidth="0.5" />
      <text x="66" y="152" style={{ fontSize: 10, fill: '#86868b' }}>姓名</text>
      <text x="92" y="152" style={{ fontSize: 9.5, fill: '#007aff', fontWeight: 600 }}>☑ 案主</text>
      <text x="138" y="152" style={{ fontSize: 9.5, fill: '#007aff', fontWeight: 600 }}>☑ 傳統</text>
      <rect x="66" y="158" width="220" height="18" fill="#ffffff" stroke="#d2d2d7" strokeWidth="0.6" />

      {/* Callout:勾傳統 → 黑色案主 */}
      <text x="305" y="148" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>勾傳統</text>
      <text x="305" y="162" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>→ 案主</text>
      <text x="305" y="176" style={{ fontSize: 10, fill: '#007aff', fontWeight: 600 }}>黑色填滿</text>
      <line x1="182" y1="152" x2="302" y2="152" stroke="#007aff" strokeWidth="0.8" strokeDasharray="2 2" />

      {/* === 其餘欄位提示(年齡/出生日期/個案角色/聯絡等) === */}
      <line x1="66" y1="184" x2="294" y2="184" stroke="#e5e4e7" strokeWidth="0.5" />
      <text x="66" y="200" style={{ fontSize: 10, fill: '#1d1d1f' }}>
        年齡 · 出生日期 · 個案角色
      </text>
      <text x="66" y="216" style={{ fontSize: 10, fill: '#1d1d1f' }}>
        聯絡資訊 · 備註 · 附加標記
      </text>
      <text x="66" y="232" style={{ fontSize: 10, fill: '#1d1d1f' }}>
        生命狀態(在世/已逝/流產...)
      </text>

      <text x="66" y="258" style={{ fontSize: 9, fill: '#86868b' }}>
        進階教學會深入講解每個分頁
      </text>
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
        <CanvasArrowsMockup />
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
        <InspectorMockup />
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
          每個分頁的深入用法,請看主選單「📘 看進階教學」。
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
        <P>
          <Strong>│ 實線</Strong> — 法律父母
          <br />
          &nbsp;&nbsp;&nbsp;biological 親生 / adopted 收養
        </P>
        <P>
          <Strong>┊ 虛線</Strong> — 非法律父母
          <br />
          &nbsp;&nbsp;&nbsp;fostered 寄養 / placed-out 出養 / sperm-donor 精子捐贈
        </P>
        <P>
          <Strong>雙擊</Strong> 親子線可在實/虛之間切換(夫妻雙方的親子線會一起變)。
          <Strong>單擊</Strong> 任何線可在右側面板看完整屬性。
        </P>
        <p style={{ fontSize: 12, color: '#86868b', marginTop: 4, lineHeight: 1.6 }}>
          婚姻、互動關係線、網絡連線等其他線條,在進階教學深入講解。
        </p>
      </>
    ),
  },
  {
    icon: '🖱️',
    title: '拖曳線條 — 改連接對象',
    content: (
      <>
        <P>
          已建好的線條(婚姻線、親子線、互動關係線)都可以
          <Strong>拖端點到別人</Strong>,改連接對象。3 步驟:
        </P>
        <LineDragMockup />
        <P>
          • <Strong>按住線條端點</Strong>(線會跟著手指動)
          <br />
          • <Strong>拖到另一個人物</Strong> 上面 → 預覽橘色虛線
          <br />
          • <Strong>放開</Strong> → 自動接到新對象
        </P>
        <p style={{ fontSize: 12, color: '#86868b', marginTop: 4, lineHeight: 1.6 }}>
          拖到空白處放開 = 取消;拖到自己 = 取消。
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
          想深入?主選單 <Code>☰</Code> → <Strong>「看進階教學」</Strong>(10 步教全部功能)。
        </P>
        <p style={{ marginTop: 16, marginBottom: 0, fontSize: 13, color: '#86868b', lineHeight: 1.6 }}>
          祝你使用順利 🌳
        </p>
      </>
    ),
  },
];

// ============================================================
// 🌱 Basic Tutorial — EN (8 steps)
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
        <CanvasArrowsMockup />
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
        <InspectorMockup />
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
          Deep dive of each tab is in "📘 Advanced Tutorial" (main menu).
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
        <P>
          <Strong>│ Solid</Strong> — legal parent
          <br />
          &nbsp;&nbsp;&nbsp;biological / adopted
        </P>
        <P>
          <Strong>┊ Dashed</Strong> — non-legal parent
          <br />
          &nbsp;&nbsp;&nbsp;fostered / placed-out / sperm-donor
        </P>
        <P>
          <Strong>Double-click</Strong> a parent-child line to toggle solid/dashed
          (both spouses' lines flip together). <Strong>Single-click</Strong> any line
          to see full properties on the right.
        </P>
        <p style={{ fontSize: 12, color: '#86868b', marginTop: 4, lineHeight: 1.6 }}>
          Marriage / relation / network lines: see the advanced tutorial.
        </p>
      </>
    ),
  },
  {
    icon: '🖱️',
    title: 'Drag a Line — Change Target',
    content: (
      <>
        <P>
          Any existing line (marriage / parent-child / relation) can be
          <Strong> dragged by its endpoint</Strong> onto a different person. Three steps:
        </P>
        <LineDragMockup />
        <P>
          • <Strong>Press &amp; hold the line endpoint</Strong> (it follows your finger)
          <br />
          • <Strong>Drag onto another person</Strong> → orange dashed preview
          <br />
          • <Strong>Release</Strong> → auto-attached to the new person
        </P>
        <p style={{ fontSize: 12, color: '#86868b', marginTop: 4, lineHeight: 1.6 }}>
          Release on empty space or self = cancel.
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
          Want to learn more? Main menu <Code>☰</Code> → <Strong>"Advanced Tutorial"</Strong> (10 steps covering all features).
        </P>
        <p style={{ marginTop: 16, marginBottom: 0, fontSize: 13, color: '#86868b', lineHeight: 1.6 }}>
          Happy charting 🌳
        </p>
      </>
    ),
  },
];

// ============================================================
// 🌿 進階教學 — 中文 (10 步)
// ============================================================
export const ADVANCED_STEPS_ZH: TutorialStep[] = [
  {
    icon: '👤',
    title: 'Tab1 身分資料完整',
    content: (
      <>
        <P>
          • <Strong>☐ 案主</Strong>:勾起來 → 該人物會有指標識別(顯示底線)
          <br />
          • <Strong>☐ 在地年份</Strong>:勾起來 → 出生/死亡年的下拉與畫布顯示<Strong>民國年</Strong>
          <br />
          • <Strong>個人資訊 11 欄</Strong>:職業/聯絡方式/居住地/收入/教育+畢業狀態/宗教/族群/家庭角色/身心障礙
        </P>
        <P>
          教育欄位後面可選 <Code>畢業/在學/肄業</Code>。
          <br />
          多筆欄位(職業/聯絡/家庭角色/身心障礙)點 + 加項。
        </P>
      </>
    ),
  },
  {
    icon: '🌀',
    title: 'Tab2 網絡關係(互動關係線 + 單位)',
    content: (
      <>
        <P>
          <Strong>互動關係線</Strong>(15 種,分 5 小組):
          <br />
          正向 4 / 中性 2 / 負向 3 / 暴力 3 / 照顧斷裂 3
        </P>
        <P>
          畫法:選人物 → 點關係小圖示按鈕 → <Strong>進入等待選人狀態</Strong>(畫面頂部出現藍色提示條)→
          點另一人物完成連線。Esc 取消。
        </P>
        <P>
          選中現有互動關係線時點別的按鈕 → 即時切類型。
          <br />
          <Strong>雙擊互動關係線</Strong> → 編輯備注。
          <br />
          標題旁 <Strong>🔒 全選保密</Strong> → 全部互動關係線即時消失。
        </P>
        <P>
          <Strong>網絡單位</Strong>:按 <Code>＋</Code> 加機構 → 畫布上單位上方 <Strong>▲</Strong> 拖出去連到人/單位/生態圈。
          服務中 / 曾經資源 兩欄切換。
        </P>
      </>
    ),
  },
  {
    icon: '🩺',
    title: 'Tab3 醫療',
    content: (
      <>
        <P>
          • <Strong>疾病清單</Strong>:自由輸入,或從擴充庫勾(ICD-10 / ICD-11 / DSM-5)
          <br />
          • <Strong>用藥清單</Strong>:自由輸入,或從健保 / 自費藥物庫勾
          <br />
          • 每筆可設診斷年/就醫狀態/配合程度/病況/每日次數/時機/劑量
        </P>
        <P>欄位個別可設保密(總開關在「保密功能」勾起後出現)。</P>
      </>
    ),
  },
  {
    icon: '📎',
    title: 'Tab4 附件存放',
    content: (
      <>
        <P>
          • <Strong>量表分數</Strong>:每量表一卡片,顯示最新 + 歷次紀錄
          <br />
          • <Strong>訪談筆記</Strong>:時序卡片(日期/內容)
          <br />
          • <Strong>文件附件</Strong>:📎 上傳檔案(桌面 Chrome/Edge)或 🔗 加外部連結(iOS Safari)
        </P>
        <P>
          桌面版第一次上傳會請你選資料夾,App 在裡面建 <Code>case_{`{id}`}/attachments/</Code>。
        </P>
      </>
    ),
  },
  {
    icon: '🧪',
    title: '評估工具 — 14 量表',
    content: (
      <>
        <P>主選單 <Code>☰</Code> → <Strong>評估工具</Strong> → 7 分類(滑鼠移上去會彈出子選單):</P>
        <P>
          👫 家庭功能 / 🧠 心理評估 / 🍶 物質使用 / 🚨 暴力創傷 / 👴 老人長照 / 🩼 身障失能 / 🔗 外部連結
        </P>
        <P>量表結果可儲存到目前個案 → 自動顯示在 Tab4「量表分數」。</P>
      </>
    ),
  },
  {
    icon: '👶',
    title: '親子線深入',
    content: (
      <>
        <P>
          <Strong>視覺只 2 種</Strong>:
          <br />
          • 實線 = 法定父母(現在合法照顧者)
          <br />
          • 虛線 = 非法定(出養/寄養/捐精等)
        </P>
        <P>
          <Strong>雙擊切換</Strong>:
          <br />
          • 實 → 虛(該線降為次要,單線變動)
          <br />
          • 虛 → 實 + <Strong>自動互相替換</Strong>(配偶同升、其他主要線自動降虛、父母縮 70%)
        </P>
        <P>
          <Strong>拖萬用接點</Strong>:選人物 → 拖父母端點 →
          <br />
          • 丟到另一對<Strong>婚姻線</Strong> → 加該對為虛線次要父母 + 縮小,小孩自動跳到分支點下方
          <br />
          • 丟到單一人 → 加該人為虛線次要父母 + 縮小
          <br />
          原本 X+Y 父母線都不會斷掉。
        </P>
      </>
    ),
  },
  {
    icon: '🌳',
    title: '生態圈',
    content: (
      <>
        <P>
          右下浮動工具列最右邊 <Strong>✏️ 畫筆</Strong> →
          沿格線拖出多邊形 → 拖回起點 <Strong>3 格內</Strong> 放手 = 自動封閉。
        </P>
        <P>可建立多個圈,圈起任何子群組(原生家庭 / 學校系統 / 親屬等)。</P>
        <P>
          <Strong>雙擊既有生態圈</Strong> → 編輯模式 → 推拉粉色邊把手,
          或拖藍色頂點(自動維持直角)調形狀。
          <br />
          標籤雙擊可改名,選中後 × 刪除。
        </P>
      </>
    ),
  },
  {
    icon: '🎮',
    title: '多選 / 縮放 / 快捷鍵',
    content: (
      <>
        <P>
          <Strong>多選</Strong>:
          <br />
          • <Code>Shift+點</Code> → 加減選一個
          <br />
          • 在空白拖框 → <Strong>拖框選取</Strong>範圍內全部
        </P>
        <P>
          <Strong>縮放</Strong>(40%-100%):
          <br />
          • 滾輪 / 觸控雙指縮放 / 右下「+」「−」按鈕
          <br />
          • 點百分比 → 歸零回 100%
        </P>
        <P>
          <Strong>鍵盤</Strong>:
          <br />
          • <Code>{kbd('Cmd', 'Z')}</Code> 撤銷 / <Code>{kbd('Cmd', 'Shift', 'Z')}</Code> 重做
          <br />
          • <Code>Delete</Code> 刪除選中 / <Code>{kbd('Cmd', 'Delete')}</Code> 跳過確認
          <br />
          • <Code>Esc</Code> 關彈窗 / 退出畫筆 / 取消等待選人狀態
        </P>
      </>
    ),
  },
  {
    icon: '🔒',
    title: '保密系統',
    content: (
      <>
        <P>兩層架構:</P>
        <P>
          • <Strong>總開關</Strong>(Tab1 / Tab3 都看得到)勾起來
          → 各 Tab 出現 <Strong>區塊「全選保密」</Strong> + <Strong>欄位個別 🔒</Strong>
          <br />
          • <Strong>Tab2 互動關係線「全選保密」</Strong>不受總開關控制,隨時可勾
        </P>
        <P>
          勾保密後:
          <br />
          • 該欄位 / 互動關係線在<Strong>畫布上即時消失</Strong>
          <br />
          • 匯出 PNG/JPG 時也消失(完整保護隱私)
        </P>
      </>
    ),
  },
  {
    icon: '💾',
    title: '匯出 + 完成',
    content: (
      <>
        <P>主選單 <Code>☰</Code> → <Strong>匯出成檔案</Strong>:</P>
        <P>
          • <Strong>📷 圖片</Strong>:PNG / JPG + 解析度(1x/2x/3x)+ 自動裁切 / 目前畫面 + 不畫網點背景 + 隱藏關係細節(私密線整條移除)
          <br />
          • <Strong>📄 資料 .json</Strong>:單筆 / 多選 / 全備份 + 可帶設定 + 歷史
        </P>
        <P>
          進階教學結束。主選單 <Code>☰</Code> 還有:
          <br />
          • 🌐 中英文一鍵切換
          <br />
          • 📖 符號圖例(76 個符號 + 搜尋)
        </P>
        <p style={{ marginTop: 16, marginBottom: 0, fontSize: 13, color: '#86868b', lineHeight: 1.6 }}>
          祝你使用順利 🌳
        </p>
      </>
    ),
  },
];

// ============================================================
// 🌿 Advanced Tutorial — EN (10 steps)
// ============================================================
export const ADVANCED_STEPS_EN: TutorialStep[] = [
  {
    icon: '👤',
    title: 'Tab1: Complete Identity Data',
    content: (
      <>
        <P>
          • <Strong>☐ Proband</Strong>: Mark the focal case (shown with an underline)
          <br />
          • <Strong>☐ Local Year</Strong>: Show <Strong>ROC year</Strong> in birth/death dropdowns and on canvas
          <br />
          • <Strong>11 Personal Info Fields</Strong>: Occupation / Contact / Location / Income / Education+Status / Religion / Ethnicity / Family Role / Disability
        </P>
        <P>
          Education has a status selector: <Code>Graduated / Attending / Dropped</Code>.
          <br />
          Multi-value fields (Occupation / Contact / Family Role / Disability) use the + button to add entries.
        </P>
      </>
    ),
  },
  {
    icon: '🌀',
    title: 'Tab2: Network Relations (Lines + Units)',
    content: (
      <>
        <P>
          <Strong>Relation Lines</Strong> (15 types in 5 groups):
          <br />
          Positive 4 / Neutral 2 / Negative 3 / Violence 3 / Care-Cutoff 3
        </P>
        <P>
          To draw: select a person → tap a relation icon → <Strong>enter the waiting state</Strong> (blue banner at the top) →
          click another person to complete. Press Esc to cancel.
        </P>
        <P>
          When a relation line is selected, tapping another icon → instantly change its type.
          <br />
          <Strong>Double-click a relation line</Strong> → edit note.
          <br />
          Next to the section title: <Strong>🔒 Mark All Private</Strong> → all relation lines instantly hidden.
        </P>
        <P>
          <Strong>Network Units</Strong>: Tap <Code>＋</Code> to add an institution → on canvas, drag the <Strong>▲</Strong> above the unit to connect to a person / unit / ecosystem.
          Switch between Active and Past Resources via the two columns.
        </P>
      </>
    ),
  },
  {
    icon: '🩺',
    title: 'Tab3: Medical',
    content: (
      <>
        <P>
          • <Strong>Diseases</Strong>: Type freely, or check from the expansion library (ICD-10 / ICD-11 / DSM-5)
          <br />
          • <Strong>Medications</Strong>: Type freely, or check from the NHI / Self-pay medication library
          <br />
          • Each entry can have: diagnosis year / visit status / compliance / condition / daily frequency / timing / dosage
        </P>
        <P>Individual fields can be marked private (master switch needs to be on first).</P>
      </>
    ),
  },
  {
    icon: '📎',
    title: 'Tab4: Attachments',
    content: (
      <>
        <P>
          • <Strong>Scale Scores</Strong>: One card per scale, showing latest + history
          <br />
          • <Strong>Interview Notes</Strong>: Time-ordered cards (date / content)
          <br />
          • <Strong>File Attachments</Strong>: 📎 Upload files (desktop Chrome/Edge) or 🔗 add external links (iOS Safari)
        </P>
        <P>
          On desktop, your first upload prompts you to pick a folder; the app creates <Code>case_{`{id}`}/attachments/</Code> inside.
        </P>
      </>
    ),
  },
  {
    icon: '🧪',
    title: 'Assessment Tools — 14 Scales',
    content: (
      <>
        <P>Main menu <Code>☰</Code> → <Strong>Assessment Tools</Strong> → 7 categories (hover to expand submenu):</P>
        <P>
          👫 Family / 🧠 Mental / 🍶 Substance Use / 🚨 Violence-Trauma / 👴 Elderly Care / 🩼 Disability / 🔗 External Links
        </P>
        <P>Save scale results to the current case → automatically shown in Tab4 "Scale Scores".</P>
      </>
    ),
  },
  {
    icon: '👶',
    title: 'Parent-Child Lines In Depth',
    content: (
      <>
        <P>
          <Strong>Only 2 visual styles</Strong>:
          <br />
          • Solid line = legal parent (current legal guardian)
          <br />
          • Dashed line = non-legal (placed-out / fostered / sperm donor, etc.)
        </P>
        <P>
          <Strong>Double-click to toggle</Strong>:
          <br />
          • Solid → dashed (this line demoted to secondary, single change)
          <br />
          • Dashed → solid + <Strong>auto-swap</Strong> (spouse promoted too, other primary lines auto-demoted to dashed, parents shrink to 70%)
        </P>
        <P>
          <Strong>Universal drag-drop endpoint</Strong>: Select a person → drag the parent endpoint →
          <br />
          • Drop on another <Strong>marriage line</Strong> → add that couple as dashed secondary parents + shrink; child jumps below the fork
          <br />
          • Drop on a single person → add them as a dashed secondary parent + shrink
          <br />
          The original X+Y parent lines stay connected.
        </P>
      </>
    ),
  },
  {
    icon: '🌳',
    title: 'Ecosystem',
    content: (
      <>
        <P>
          Bottom-right floating toolbar: <Strong>✏️ Pen</Strong> →
          drag along grid lines to draw a polygon → release within <Strong>3 grid cells</Strong> of the start point = auto-close.
        </P>
        <P>You can build multiple ecosystems to enclose any subgroup (family of origin / school system / kinship, etc.).</P>
        <P>
          <Strong>Double-click an existing ecosystem</Strong> → edit mode → drag pink edge handles,
          or drag blue corners (auto-keeps right angles) to reshape.
          <br />
          Double-click the label to rename; × to delete when selected.
        </P>
      </>
    ),
  },
  {
    icon: '🎮',
    title: 'Multi-select / Zoom / Shortcuts',
    content: (
      <>
        <P>
          <Strong>Multi-select</Strong>:
          <br />
          • <Code>Shift+click</Code> → toggle one
          <br />
          • Drag on empty space → <Strong>marquee</Strong> selects everything inside
        </P>
        <P>
          <Strong>Zoom</Strong> (40%-100%):
          <br />
          • Mouse wheel / pinch / "+" "−" buttons
          <br />
          • Click the percentage → reset to 100%
        </P>
        <P>
          <Strong>Keyboard</Strong>:
          <br />
          • <Code>{kbd('Cmd', 'Z')}</Code> Undo / <Code>{kbd('Cmd', 'Shift', 'Z')}</Code> Redo
          <br />
          • <Code>Delete</Code> Remove selected / <Code>{kbd('Cmd', 'Delete')}</Code> Skip confirmation
          <br />
          • <Code>Esc</Code> Close popup / exit pen mode / cancel waiting state
        </P>
      </>
    ),
  },
  {
    icon: '🔒',
    title: 'Privacy System',
    content: (
      <>
        <P>Two-layer architecture:</P>
        <P>
          • <Strong>Master switch</Strong> (visible in Tab1 / Tab3) when on
          → each tab shows <Strong>"Mark All Private" buttons</Strong> + <Strong>per-field 🔒 toggles</Strong>
          <br />
          • <Strong>Tab2 Relation Lines "Mark All Private"</Strong> is independent of the master switch — always available
        </P>
        <P>
          When marked private:
          <br />
          • The field / relation line <Strong>instantly disappears on canvas</Strong>
          <br />
          • Also hidden when exporting PNG/JPG (full privacy protection)
        </P>
      </>
    ),
  },
  {
    icon: '💾',
    title: 'Export + Done',
    content: (
      <>
        <P>Main menu <Code>☰</Code> → <Strong>Export to file</Strong>:</P>
        <P>
          • <Strong>📷 Image</Strong>: PNG / JPG + resolution (1x/2x/3x) + auto-crop / current view + no dot background + hide relation details (private lines removed)
          <br />
          • <Strong>📄 Data .json</Strong>: Single / multi-select / full backup + optional settings + history
        </P>
        <P>
          Advanced tutorial complete. The main menu <Code>☰</Code> also has:
          <br />
          • 🌐 One-click language toggle (Chinese / English)
          <br />
          • 📖 Symbol Legend (76 symbols + search)
        </P>
        <p style={{ marginTop: 16, marginBottom: 0, fontSize: 13, color: '#86868b', lineHeight: 1.6 }}>
          Happy charting 🌳
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

export function getAdvancedSteps(lang: 'zh' | 'en'): TutorialStep[] {
  return lang === 'en' ? ADVANCED_STEPS_EN : ADVANCED_STEPS_ZH;
}

// 向後相容:舊名稱
export const BASIC_STEPS = BASIC_STEPS_ZH;
export const ADVANCED_STEPS = ADVANCED_STEPS_ZH;
export const TUTORIAL_STEPS = BASIC_STEPS_ZH;
