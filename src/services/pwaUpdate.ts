// PWA 更新管理(prompt 模式,A 系列 #130)
//
// 問題:舊本用 autoUpdate —— 新版背景裝好就「強制重載所有分頁」,進行中的工作
//       可能丟;且首頁「檢查更新」鈕賭固定 1.5 秒、行動網路上常賭輸 → 重載仍是舊版,
//       偶爾還因新 SW 接管舊頁面、抓不到 lazy 區塊而炸 ErrorBoundary。
//
// 改法:prompt 模式 —— 新版裝好「不自動重載」,改顯示橫幅讓使用者「想更新再按」。
//   - initPwaUpdate()        main.tsx 啟動呼叫一次
//   - onNeedRefreshChange()  App 橫幅訂閱「有新版就緒」
//   - applyUpdate()          使用者按「立即更新」→ skipWaiting + 重載(plugin 處理競態)
//   - checkForUpdate()       首頁「檢查更新」鈕用,回「真實狀態」不再賭秒數
//
// 為何信任 plugin 的 updateSW(true):vite-plugin-pwa 在 prompt 模式產的 sw.js 內含
// SKIP_WAITING message listener,updateSW(true) 會 postMessage 後監聽 controllerchange
// 才重載 —— 正是本來手寫按鈕想做、卻做錯的那段競態處理,交給它做才可靠。

import { registerSW } from 'virtual:pwa-register';

let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let registration: ServiceWorkerRegistration | undefined;
let needRefresh = false;

const listeners = new Set<() => void>();

/** 訂閱「有新版就緒」狀態變化(App 橫幅用)。回傳取消訂閱函式。 */
export function onNeedRefreshChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getNeedRefresh(): boolean {
  return needRefresh;
}

/** 使用者按「立即更新」:true = skipWaiting + 重載(plugin 內建處理 controllerchange) */
export function applyUpdate(): void {
  void updateSWFn?.(true);
}

const HOURLY = 60 * 60 * 1000;

export function initPwaUpdate(): void {
  updateSWFn = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
      listeners.forEach((fn) => fn());
    },
    onRegisteredSW(_swUrl, r) {
      registration = r;
      if (!r) return;
      // 定期(每小時)主動檢查 —— iPad 常駐 standalone 不會自然觸發更新檢查,
      // 否則只能靠那顆手動按鈕(且舊本還壞掉)。
      setInterval(() => {
        r.update().catch(() => {
          // 離線 / 暫時失敗 → 忽略,下一輪再試
        });
      }, HOURLY);
    },
  });
}

/**
 * 首頁「檢查更新」鈕:回真實狀態,不再賭固定 sleep。
 *   - 'update-found' 有新版(裝好後 onNeedRefresh 會觸發橫幅)
 *   - 'latest'       已是最新版
 *   - 'unsupported'  此瀏覽器無 SW(退回 location.reload 由呼叫端決定)
 *   - 'error'        檢查失敗(網路抖動等)→ 呼叫端顯示「稍後再試」,別重整
 */
export async function checkForUpdate(): Promise<
  'update-found' | 'latest' | 'unsupported' | 'error'
> {
  if (needRefresh) return 'update-found'; // 已偵測到新版等待中
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const reg =
    registration ?? (await navigator.serviceWorker.getRegistration());
  if (!reg) return 'unsupported';
  try {
    await reg.update();
  } catch {
    // 網路抖動 / 暫時失敗 ≠ 不支援 → 'error',呼叫端顯示稍後再試,不要硬重整
    return 'error';
  }
  // update() 後若有 SW 正在裝 / 等待 → 有新版;裝好會觸發 onNeedRefresh → 橫幅
  if (reg.installing || reg.waiting || needRefresh) return 'update-found';
  return 'latest';
}
