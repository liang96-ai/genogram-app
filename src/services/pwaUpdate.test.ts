import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// virtual:pwa-register 是 vite 的虛擬模組,測試裡換成可控的假 registerSW
const updateSW = vi.fn<(reload?: boolean) => Promise<void>>();
vi.mock('virtual:pwa-register', () => ({
  registerSW: () => updateSW,
}));

describe('applyUpdate 的重載保底(1.3.1 實測:橫幅按了沒反應)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    updateSW.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('還沒註冊 SW(updateSWFn 為 null)→ 時間到就自己重載', async () => {
    const { applyUpdate } = await import('./pwaUpdate');
    const reload = vi.fn();
    applyUpdate(reload, 100);
    expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('plugin 的 updateSW 永遠不重載 → 保底時間到自己重載;失敗 → 立刻重載', async () => {
    vi.resetModules();
    const mod = await import('./pwaUpdate');
    // 模擬 main.tsx 的初始化:registerSW 回傳假 updateSW
    (globalThis as { document?: unknown }).document ??= { addEventListener: () => {} };
    mod.initPwaUpdate();
    updateSW.mockReturnValueOnce(new Promise(() => {})); // 永遠 pending = controllerchange 沒來
    const reload = vi.fn();
    mod.applyUpdate(reload, 200);
    expect(updateSW).toHaveBeenCalledWith(true);
    vi.advanceTimersByTime(199);
    expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(reload).toHaveBeenCalledTimes(1);

    updateSW.mockRejectedValueOnce(new Error('skipWaiting failed'));
    const reload2 = vi.fn();
    mod.applyUpdate(reload2, 5000);
    await Promise.resolve();
    await Promise.resolve();
    expect(reload2).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(reload2).toHaveBeenCalledTimes(1); // 保底 timer 已清掉,不重載第二次
  });
});

describe('shouldAutoApply:不在畫圖時才自動換新版(1.6.1)', () => {
  const base = { updateReady: true, editing: false, dialogOpen: false, visible: true, lastAutoApplyAt: null, now: 1_000_000 };
  it('在個案清單、沒有彈窗、畫面看得到 → 自動換', async () => {
    const { shouldAutoApply } = await import('./pwaUpdate');
    expect(shouldAutoApply(base)).toBe(true);
  });
  it('正在畫圖、有彈窗、在背景、沒有新版 → 都不換', async () => {
    const { shouldAutoApply } = await import('./pwaUpdate');
    expect(shouldAutoApply({ ...base, editing: true })).toBe(false);
    expect(shouldAutoApply({ ...base, dialogOpen: true })).toBe(false);
    expect(shouldAutoApply({ ...base, visible: false })).toBe(false);
    expect(shouldAutoApply({ ...base, updateReady: false })).toBe(false);
  });
  it('一分鐘內剛自動換過(上次沒換成功)→ 不再自動,避免一直重載', async () => {
    const { shouldAutoApply, AUTO_APPLY_COOLDOWN_MS } = await import('./pwaUpdate');
    expect(shouldAutoApply({ ...base, lastAutoApplyAt: base.now - 1000 })).toBe(false);
    expect(shouldAutoApply({ ...base, lastAutoApplyAt: base.now - AUTO_APPLY_COOLDOWN_MS })).toBe(true);
  });
});
