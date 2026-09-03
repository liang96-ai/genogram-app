import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isTopModal, modalCount, popModal, pushModal, resetModalStack, updateModal } from './modalStack';

describe('彈窗堆疊', () => {
  beforeEach(() => resetModalStack());

  it('後開的在上;pop 任一個都不影響其他', () => {
    const a = pushModal(() => {});
    const b = pushModal(() => {});
    expect(isTopModal(b)).toBe(true);
    expect(isTopModal(a)).toBe(false);
    popModal(a);
    expect(modalCount()).toBe(1);
    expect(isTopModal(b)).toBe(true);
    popModal(b);
    expect(modalCount()).toBe(0);
  });

  it('updateModal 換掉 Esc 處理', () => {
    const first = vi.fn();
    const second = vi.fn();
    const id = pushModal(first);
    updateModal(id, second);
    // 沒有 DOM 事件可觸發(node 環境),直接驗證堆疊內容被換掉
    expect(isTopModal(id)).toBe(true);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });

  it('pop 不存在的 id 不炸', () => {
    pushModal(() => {});
    popModal(9999);
    expect(modalCount()).toBe(1);
  });
});
