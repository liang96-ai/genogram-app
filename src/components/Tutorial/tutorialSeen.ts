// 教學「看過了」紀錄 — 從 Tutorial.tsx 抽出成獨立檔(2026-06-10):
//   1. CaseList 也要用;放在元件檔會把整包教學(tutorialSteps ~74KB)拖進主 bundle,
//      抽出後 Tutorial 才能 lazy 拆包(#127)
//   2. 元件檔只 export 元件,dev fast refresh 才會生效

const BASIC_SEEN_KEY = 'genogram_tutorial_basic_seen';

export function markTutorialSeen() {
  try {
    localStorage.setItem(BASIC_SEEN_KEY, '1');
  } catch {
    // ignore localStorage failures (e.g., private mode)
  }
}

export function hasTutorialBeenSeen(): boolean {
  try {
    return localStorage.getItem(BASIC_SEEN_KEY) === '1';
  } catch {
    return true; // 抓不到 storage 就當已看過,免重複跳
  }
}
