/**
 * 未落地草稿的集中結算(2026-08-30 複核)。
 *
 * 背景:有些欄位為了不吃光復原格,採「失焦 / 停手才寫進 store」。這類草稿在
 * 「切到別的分頁」「關瀏覽器」時有一個順序陷阱 —— App 的 visibilitychange /
 * pagehide 監聽器在 App 掛載時就註冊,元件自己的監聽器一定比它晚註冊,
 * 而 DOM 監聽器照註冊順序觸發:**App 先把「還不含草稿」的快照寫出去,元件才結算**,
 * 那筆草稿就永遠沒被存到。
 *
 * 解法:元件把自己的結算函式登記進來,由 App 在「真的要寫出去之前」統一呼叫。
 * 回傳值代表「有沒有真的寫出東西」,讓 App 知道要不要重新抓一次最新快照。
 */
type Committer = () => boolean;

const committers = new Set<Committer>();

/** 元件掛載時登記;回傳解除登記的函式(給 useEffect cleanup 用)。 */
export function registerDraftCommitter(fn: Committer): () => void {
  committers.add(fn);
  return () => {
    committers.delete(fn);
  };
}

/** 把所有登記中的草稿結算掉。回傳 true = 至少有一筆真的寫進 store。 */
export function flushDrafts(): boolean {
  let changed = false;
  for (const fn of committers) {
    try {
      if (fn()) changed = true;
    } catch (err) {
      // 單一元件結算失敗不能拖垮整批存檔
      console.error('draft commit failed:', err);
    }
  }
  return changed;
}
