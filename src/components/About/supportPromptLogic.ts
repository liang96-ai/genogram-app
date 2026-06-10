// 抖內提示觸發邏輯 v2(2026-06-10,#129)— 與 SupportDialog 配對使用
//
// 設計原則(與 user 定案):
//   - 永遠在「價值時刻」開口:首彈 = 第 3 次成功匯出「當下」;
//     之後每滿 100 次開啟先「掛起」,等下一次匯出成功才彈(不在開場打擾)
//   - 保險絲:第 10 次開啟仍一次都沒匯出 → 開啟時彈(接住從不匯出的使用者)
//   - 彈窗文案永不顯示任何次數;計數只存使用者裝置 localStorage
//     (與語言偏好、教學看過沒同等級),不上傳 — 與「不追蹤」承諾相容
//   - 舊版 seen flag 視為「首彈已完成」,直接進入 100 次循環
//   - 不提供「不再提醒」(user 決定);工具列 ☕ 常駐入口不受影響

const LAUNCH_KEY = 'genogram_launch_count';
const SEEN_KEY = 'genogram_support_prompt_seen'; // 首彈完成(沿用 v1 的 key)
const EXPORT_KEY = 'genogram_export_count';
const LAST_PROMPT_LAUNCH_KEY = 'genogram_support_last_prompt_launch';

const FIRST_AT_EXPORTS = 3; // 首彈:第 3 次匯出
const FUSE_AT_LAUNCHES = 10; // 保險絲:第 10 次開啟(且零匯出)
const REPEAT_EVERY_LAUNCHES = 100; // 重複:滿 100 次開啟後,等下次匯出

const getNum = (key: string): number => {
  try {
    const n = Number(localStorage.getItem(key) || '0');
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
};
const setStr = (key: string, v: string) => {
  try {
    localStorage.setItem(key, v);
  } catch {
    // storage 不可用 → 提示功能靜默停用,不影響主功能
  }
};
const hasSeen = (): boolean => {
  try {
    return !!localStorage.getItem(SEEN_KEY);
  } catch {
    return true; // 讀不到就當看過,避免重複跳
  }
};

// ---- 「該彈了」事件(SupportAutoPrompt 訂閱) ----
type Listener = () => void;
const listeners = new Set<Listener>();
export function onSupportPrompt(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function fire() {
  setStr(SEEN_KEY, '1');
  setStr(LAST_PROMPT_LAUNCH_KEY, String(getNum(LAUNCH_KEY)));
  listeners.forEach((fn) => fn());
}

// App 每次啟動計一次(module 旗標防 React 重掛/換頁重複計數)
let launchCounted = false;
export function countLaunch(): void {
  if (launchCounted) return;
  launchCounted = true;
  const n = getNum(LAUNCH_KEY) + 1;
  setStr(LAUNCH_KEY, String(n));
  // 保險絲 — 唯一會在「開場」彈的情況
  if (!hasSeen() && getNum(EXPORT_KEY) === 0 && n >= FUSE_AT_LAUNCHES) {
    fire();
  }
}

// 匯出成功時呼叫(ExportDialog 的單一成功出口)
export function notifyExportSuccess(): void {
  const e = getNum(EXPORT_KEY) + 1;
  setStr(EXPORT_KEY, String(e));
  if (!hasSeen()) {
    if (e >= FIRST_AT_EXPORTS) fire(); // 首彈:價值時刻
    return;
  }
  // 重複:滿 100 次開啟才在匯出時刻釋放。
  // 舊版使用者沒有 last-prompt 紀錄(=0)→ 以「總開啟數滿 100」為第一個循環,之後正常。
  if (getNum(LAUNCH_KEY) - getNum(LAST_PROMPT_LAUNCH_KEY) >= REPEAT_EVERY_LAUNCHES) {
    fire();
  }
}
