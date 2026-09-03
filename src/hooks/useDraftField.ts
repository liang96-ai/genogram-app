// 草稿型文字欄位的 React 接線(唯一的文字輸入策略,2026-09-03 統一)。
// 內部是 services/draftSession(框架無關、有單元測試);這裡只做四件事:
//   1. 把 session 綁到元件生命週期(卸載 / 換目標時結算)
//   2. 登記到 draftFlush(App 寫進資料庫前會先收一次)
//   3. 外部值(store)變了就 syncExternal;write 每次 render 後更新成最新 closure
//   4. 回傳可直接展開到 <input>/<textarea> 的 props
// 註:不用 ref(react-hooks/refs 規則不准在 render 期間碰 ref);session 放在 state。
import { useCallback, useEffect, useReducer, useState } from 'react';
import { createDraftSession, type DraftSession } from '../services/draftSession';
import { registerDraftCommitter } from '../services/draftFlush';

export const DRAFT_IDLE_MS = 800;

export type UseDraftFieldOptions = {
  /** store 裡的現值 */
  value: string;
  /** 目標識別(人物 id / 事件 id …):換目標時先結算舊的、再從新值開始 */
  key: string;
  /** 寫進 store;merge = 同一次輸入的續寫。回 true = 有寫 */
  write: (value: string, merge: boolean) => boolean;
  idleMs?: number;
};

type Bound = { key: string; session: DraftSession<string> };

function bind(key: string, initial: string, write: UseDraftFieldOptions['write'], idleMs: number): Bound {
  return { key, session: createDraftSession<string>({ initial, idleMs, write }) };
}

export function useDraftField(o: UseDraftFieldOptions) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const idleMs = o.idleMs ?? DRAFT_IDLE_MS;
  const [bound, setBound] = useState<Bound>(() => bind(o.key, o.value, o.write, idleMs));

  // 換目標(同一個 Tab 從 A 人換到 B 人):先結算舊目標(session 內的 writer 仍是舊 write),
  // 再從新值重來。render 期間 setState 是 React 允許的「衍生狀態」寫法,會立刻重跑 render。
  let live = bound;
  if (bound.key !== o.key) {
    bound.session.end();
    live = bind(o.key, o.value, o.write, idleMs);
    setBound(live);
  }
  live.session.syncExternal(o.value);

  // write 永遠是最新的 closure(人物 id、updatePerson 等都可能換)
  useEffect(() => {
    live.session.setWriter(o.write);
  });
  // App 寫進資料庫前先收草稿;元件卸載或換目標時結算
  useEffect(() => registerDraftCommitter(() => live.session.commit()), [live]);
  useEffect(() => () => live.session.dispose(), [live]);

  const onChange = useCallback(
    (e: { target: { value: string } }) => {
      live.session.set(e.target.value);
      rerender();
    },
    [live],
  );
  const onBlur = useCallback(() => {
    live.session.end();
    rerender();
  }, [live]);
  const onCompositionStart = useCallback(() => live.session.setComposing(true), [live]);
  const onCompositionEnd = useCallback(() => live.session.setComposing(false), [live]);
  const commit = useCallback(() => {
    live.session.end();
    rerender();
  }, [live]);

  const value = live.session.get();
  return {
    value,
    inputProps: { value, onChange, onBlur, onCompositionStart, onCompositionEnd },
    /** 立刻結算(例如按 Enter) */
    commit,
  };
}
