// 彈窗堆疊(唯一的彈窗機制,2026-09-03 統一;React 端是 ui/Modal.tsx)。
//
// 三件事由這裡保證,元件不用各自處理:
//   1. 疊放順序 = 開啟順序(Modal 以 portal 依序掛到 body 尾端,後開的在上)
//   2. Esc 只關最上面那個(capture 階段攔截,底層彈窗與 App 的全域鍵盤都收不到)
//   3. 有彈窗開著時,App 本體(#root)加 inert:鍵盤與點擊都進不去、輔助工具也只看得到彈窗
//
// 為什麼不用原生 <dialog>.showModal():top layer 會壓在護眼濾鏡(z 2147483000)與
// 系統警示橫幅(z 3000)之上,開彈窗時濾鏡失效、儲存失敗的紅燈看不到。
// 這裡用原生 inert 屬性達到同樣的「底層失效」,又不動既有的疊放。
type Entry = { id: number; onEscape: () => void };

const stack: Entry[] = [];
let seq = 0;
let listening = false;

function rootEl(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.getElementById('root');
}
function syncInert(): void {
  const root = rootEl();
  if (!root) return;
  if (stack.length > 0) root.setAttribute('inert', '');
  else root.removeAttribute('inert');
}
function onKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || stack.length === 0) return;
  // 輸入法組字中的 Esc 是取消組字,不關視窗
  if (e.isComposing) return;
  e.preventDefault();
  e.stopPropagation();
  stack[stack.length - 1].onEscape();
}
function ensureListener(): void {
  if (listening || typeof window === 'undefined') return;
  window.addEventListener('keydown', onKeyDown, true);
  listening = true;
}

/** 開一個彈窗:回 id,關閉時 pop */
export function pushModal(onEscape: () => void): number {
  ensureListener();
  const id = ++seq;
  stack.push({ id, onEscape });
  syncInert();
  return id;
}
export function popModal(id: number): void {
  const i = stack.findIndex((e) => e.id === id);
  if (i >= 0) stack.splice(i, 1);
  syncInert();
}
/** 讓元件更新自己的 Esc 處理(例如 onClose 換了 closure) */
export function updateModal(id: number, onEscape: () => void): void {
  const e = stack.find((x) => x.id === id);
  if (e) e.onEscape = onEscape;
}
export function isTopModal(id: number): boolean {
  return stack.length > 0 && stack[stack.length - 1].id === id;
}
export function modalCount(): number {
  return stack.length;
}
/** 測試用:清空 */
export function resetModalStack(): void {
  stack.length = 0;
  syncInert();
}
