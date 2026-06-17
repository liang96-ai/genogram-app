/**
 * 護眼暖色遮罩 — 全域「檢視層」偏好,與文件/匯出完全脫鉤。
 *
 * 原理:在 App 最上層疊一層 mix-blend-mode:multiply 的暖色。
 *   multiply 之下「黑 × 任何色 = 還是黑」→ 只有白底會變暖變灰,
 *   黑色家系圖線/符號維持銳利,彩色關係線只微暖。
 *
 * 為什麼匯出永遠是白色:匯出走 imageExport.ts,它複製 #canvas-svg、
 *   強制 background:#ffffff、再畫到一張先填白的 canvas;只讀 SVG 本身,
 *   讀不到任何疊在畫面上方的圖層 → 這層暖色碰不到匯出。
 *
 * 狀態純存 localStorage(與「不追蹤」承諾相容),level 為 0–100。
 */
const KEY = 'eyeComfortLevel';

// ── 兩個可調旋鈕(想更黃/更淡只改這兩個)──
// 暖色色調:示範採用、user 認可的暖米黃。
export const COMFORT_COLOR = '#c9ad5e';
// 滿格(level=100)時的遮罩透明度。≈ 示範裡 user 喜歡的「黃昏咖啡廳」那檔。
export const MAX_OPACITY = 0.35;

type Listener = (level: number) => void;
const listeners = new Set<Listener>();

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function load(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) ? clamp(v) : 0;
  } catch {
    return 0;
  }
}

let level = load();

export function getComfortLevel(): number {
  return level;
}

export function setComfortLevel(v: number): void {
  level = clamp(v);
  try {
    localStorage.setItem(KEY, String(level));
  } catch {
    // 隱私模式寫不進去 → 至少這次 session 內仍有效
  }
  listeners.forEach((fn) => fn(level));
}

export function onComfortChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function levelToOpacity(v: number): number {
  return (v / 100) * MAX_OPACITY;
}
