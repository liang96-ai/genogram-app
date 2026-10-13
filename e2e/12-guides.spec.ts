import { test, expect, readCases } from './fixtures';

/**
 * ⑳ 1.6.2 多語言說明頁(模擬日本的瀏覽器):
 *   用過 App(離線快取已註冊)的人打開中文說明頁 → 自動跳到日文版,不會被 App 攔截;
 *   按「はじめる」→ 直接開一張新圖、App 用英文介面;
 *   在頁尾手動選繁體中文 → 記住選擇,重新整理也不再跳回日文。
 */
test('⑳ 說明頁:日文瀏覽器自動看到日文版,按開始直接開新圖並用英文介面,手動選的語言會記住', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chrome', '說明頁是靜態網頁,電腦版驗一次即可');
  const ctx = await browser.newContext({ locale: 'ja-JP', baseURL: testInfo.project.use.baseURL });
  await ctx.addInitScript(() => {
    for (const k of ['privacyAcknowledged', 'genogram_tutorial_basic_seen', 'genogram_tour_done', 'genogram_support_prompt_seen', 'genogram_install_banner_dismissed', 'genogram_folder_prompt_seen']) {
      try {
        localStorage.setItem(k, '1');
      } catch {
        /* 私密模式 */
      }
    }
  });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByRole('button', { name: /New case/ })).toBeVisible(); // 日本的瀏覽器 → App 用英文
  await page.waitForTimeout(1500); // 讓離線快取註冊完成,才驗得到「不攔截」
  const before = (await readCases(page)).length;

  await page.goto('/guide/');
  await expect(page).toHaveURL(/\/guide\/ja\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ジェノグラム');

  await page.getByRole('link', { name: 'はじめる' }).click();
  await expect.poll(async () => (await readCases(page)).length, { timeout: 8000 }).toBe(before + 1);
  await expect(page.getByRole('button', { name: 'Basic' })).toBeVisible();
  expect(new URL(page.url()).search).toBe('');

  await page.goto('/guide/ja/');
  await page.locator('footer').getByRole('link', { name: '繁體中文' }).click();
  await expect(page).toHaveURL(/\/guide\/$/);
  await page.reload();
  await expect(page).toHaveURL(/\/guide\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('家系圖');
  await ctx.close();
});
