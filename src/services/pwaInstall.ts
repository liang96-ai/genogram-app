// PWA 安裝邏輯共用 module
//
// 用途:
//   1. App 啟動時呼叫 setupPwaInstallListener() 抓 beforeinstallprompt 事件
//   2. 任何元件用 usePwaInstall() hook 知道目前能不能裝 + 觸發安裝
//   3. InstallBanner 跟 Tutorial 第 8 步都共用這個

import { useEffect, useState } from 'react';

// BeforeInstallPromptEvent 型別(Chrome/Edge 才有)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// 單例:儲存 deferred prompt
let storedPrompt: BeforeInstallPromptEvent | null = null;

// 訂閱者(狀態變化時通知所有監聽元件)
const listeners = new Set<() => void>();

let initialized = false;

/** App 啟動時呼叫一次 — 註冊全域 beforeinstallprompt 監聽 */
export function setupPwaInstallListener(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    storedPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((cb) => cb());
  });

  window.addEventListener('appinstalled', () => {
    storedPrompt = null;
    listeners.forEach((cb) => cb());
  });
}

/** 目前是否可以觸發安裝(Chrome/Edge 才會 true) */
export function canInstall(): boolean {
  return storedPrompt !== null;
}

/** 是否為 iOS / iPadOS(含偽裝成 Mac 的 iPad)
 *  iPadOS 13+ 的 Safari userAgent 自稱 "Macintosh",純比對 /iPad/ 會漏掉 →
 *  補「Mac 字樣 + 觸控點 > 1」判斷(桌機 Mac 沒有觸控點)。
 *  修正前:iPad 使用者(主要受眾)看不到安裝引導 + 資料蒸發警語。 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

/** 是否已經是 standalone(PWA 安裝後開啟) */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

/** 觸發 PWA 安裝對話框
 *  回傳:
 *    'accepted'    — 使用者同意安裝
 *    'dismissed'   — 使用者拒絕
 *    'unavailable' — 此瀏覽器/環境無法安裝(iOS Safari / 已裝過 / 其他)
 */
export async function triggerInstall(): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> {
  if (!storedPrompt) return 'unavailable';
  try {
    await storedPrompt.prompt();
    const result = await storedPrompt.userChoice;
    storedPrompt = null;
    listeners.forEach((cb) => cb());
    return result.outcome;
  } catch {
    return 'unavailable';
  }
}

/** React hook — 訂閱安裝狀態變化 */
export function usePwaInstall(): {
  canInstall: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  triggerInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
} {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((v) => v + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return {
    canInstall: canInstall(),
    isIOS: isIOS(),
    isStandalone: isStandalone(),
    triggerInstall,
  };
}
