// 草稿型文字欄位的「一次輸入」(框架無關;React 端是 hooks/useDraftField)。
//
// 四個結算時機:停手 idleMs / 失焦 / App 要寫進資料庫前(draftFlush)/ 元件卸載或換目標。
// 復原格數:第一次寫入推一格,之後的續寫帶 merge 併回同一格(store 的規則 2);
// 失焦 = 這次輸入結束,下次再改就是新的一格。中文輸入法組字期間不結算。
export type DraftSession<T> = {
  get(): T;
  set(v: T): void;
  /** 外部(store)值變了:沒有髒草稿就跟著換;有髒草稿代表使用者正在打,保留 */
  syncExternal(v: T): void;
  /** 結算草稿;回 true = 真的寫出了東西 */
  commit(): boolean;
  /** 失焦:結算並結束這次輸入 */
  end(): void;
  setComposing(on: boolean): void;
  isDirty(): boolean;
  /** 卸載:結算並清掉計時器 */
  dispose(): void;
  /** 換掉寫入函式(React 端每次 render 後更新,讓 write 永遠拿到最新的 closure) */
  setWriter(fn: (value: T, merge: boolean) => boolean): void;
};

export type DraftSessionOptions<T> = {
  initial: T;
  /** 把草稿寫進 store;merge = 這次是同一次輸入的續寫。回 true = 有寫 */
  write: (value: T, merge: boolean) => boolean;
  idleMs: number;
  equals?: (a: T, b: T) => boolean;
  /** 可注入的計時器(測試用);回傳取消函式 */
  schedule?: (fn: () => void, ms: number) => () => void;
};

export function createDraftSession<T>(o: DraftSessionOptions<T>): DraftSession<T> {
  const eq = o.equals ?? ((a, b) => a === b);
  const schedule =
    o.schedule ??
    ((fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      return () => clearTimeout(id);
    });
  let draft = o.initial;
  let external = o.initial;
  let writer = o.write;
  let sessionPushed = false;
  let composing = false;
  let cancelIdle: (() => void) | null = null;

  const clearIdle = () => {
    if (cancelIdle) cancelIdle();
    cancelIdle = null;
  };
  const armIdle = () => {
    clearIdle();
    if (composing || eq(draft, external)) return;
    cancelIdle = schedule(() => {
      cancelIdle = null;
      commit();
    }, o.idleMs);
  };
  const commit = (): boolean => {
    clearIdle();
    if (eq(draft, external)) return false;
    const wrote = writer(draft, sessionPushed);
    if (wrote) {
      sessionPushed = true;
      external = draft;
    }
    return wrote;
  };

  return {
    get: () => draft,
    set: (v) => {
      draft = v;
      armIdle();
    },
    syncExternal: (v) => {
      if (eq(v, external)) return;
      const dirty = !eq(draft, external);
      external = v;
      if (!dirty) draft = v; // 沒在打字:跟著 store(undo / 別處改了)
    },
    commit,
    end: () => {
      commit();
      sessionPushed = false;
    },
    setComposing: (on) => {
      composing = on;
      if (on) clearIdle();
      else armIdle();
    },
    isDirty: () => !eq(draft, external),
    dispose: () => {
      commit();
      clearIdle();
    },
    setWriter: (fn) => {
      writer = fn;
    },
  };
}
