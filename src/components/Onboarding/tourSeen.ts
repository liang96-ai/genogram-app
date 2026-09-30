// 「帶著做一次」看過了沒(1.6.0)。看過舊版 12 步教學的人也不是新手,不再自動開。
const TOUR_KEY = 'genogram_tour_done';
const LEGACY_TUTORIAL_KEY = 'genogram_tutorial_basic_seen';

export function hasSeenGuidedTour(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === '1' || localStorage.getItem(LEGACY_TUTORIAL_KEY) === '1';
  } catch {
    return true; // 讀不到就當看過,不要每次都跳
  }
}

export function markGuidedTourDone(): void {
  try {
    localStorage.setItem(TOUR_KEY, '1');
  } catch {
    /* 寫不進去就算了:下次新建個案會再問一次,可接受 */
  }
}
