import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDraftSession } from './draftSession';

describe('草稿 session:一次輸入 = 一格', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const make = (write = vi.fn(() => true)) => ({
    write,
    s: createDraftSession<string>({ initial: 'a', write, idleMs: 800 }),
  });

  it('停手 0.8 秒才寫;第一次 merge=false,之後續寫 merge=true;失焦後再打 = 新的一格', () => {
    const { s, write } = make();
    s.set('ab');
    s.set('abc');
    vi.advanceTimersByTime(799);
    expect(write).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(write).toHaveBeenCalledWith('abc', false);
    s.set('abcd');
    vi.advanceTimersByTime(800);
    expect(write).toHaveBeenLastCalledWith('abcd', true);
    s.end(); // 失焦:沒有新內容不寫
    expect(write).toHaveBeenCalledTimes(2);
    s.set('abcde');
    vi.advanceTimersByTime(800);
    expect(write).toHaveBeenLastCalledWith('abcde', false);
  });

  it('失焦立刻結算,不等計時器;沒改過就不寫', () => {
    const { s, write } = make();
    s.end();
    expect(write).not.toHaveBeenCalled();
    s.set('x');
    s.end();
    expect(write).toHaveBeenCalledWith('x', false);
    vi.advanceTimersByTime(2000);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('輸入法組字中不結算;組字結束才起算', () => {
    const { s, write } = make();
    s.setComposing(true);
    s.set('ㄋ');
    vi.advanceTimersByTime(5000);
    expect(write).not.toHaveBeenCalled();
    s.set('你');
    s.setComposing(false);
    vi.advanceTimersByTime(800);
    expect(write).toHaveBeenCalledWith('你', false);
  });

  it('store 的值變了(undo):沒在打字就跟著換;正在打字就保留草稿', () => {
    const { s } = make();
    s.syncExternal('from-store');
    expect(s.get()).toBe('from-store');
    s.set('typing');
    s.syncExternal('other');
    expect(s.get()).toBe('typing');
    expect(s.isDirty()).toBe(true);
  });

  it('write 回 false(目標已不存在)→ 不算開了格,下次仍是 merge=false', () => {
    const write = vi.fn(() => false);
    const { s } = make(write);
    s.set('x');
    s.commit();
    s.set('xy');
    s.commit();
    expect(write).toHaveBeenNthCalledWith(1, 'x', false);
    expect(write).toHaveBeenNthCalledWith(2, 'xy', false);
  });

  it('dispose:結算並清計時器', () => {
    const { s, write } = make();
    s.set('bye');
    s.dispose();
    expect(write).toHaveBeenCalledWith('bye', false);
    vi.advanceTimersByTime(1000);
    expect(write).toHaveBeenCalledTimes(1);
  });
});
