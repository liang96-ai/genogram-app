import { test as base, expect } from '@playwright/test';
import { readCases } from './fixtures';

/**
 * ⑱ 第一次打開(1.6.0):只出現一張歡迎卡 → 開始第一個個案 → 直接進畫布 →
 *    「帶著做一次」第 1 步框住案主 → 按上面的箭頭加爸媽 → 自動到第 2 步 → 跳過教學。
 * 不用共用骨架:骨架會把「看過了」旗標都設好,這條要的就是全新的使用者。
 */
const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        // 只關掉跟這條無關的雜訊:抖內提示、安裝橫幅
        localStorage.setItem('genogram_support_prompt_seen', '1');
        localStorage.setItem('genogram_install_banner_dismissed', '1');
      } catch {
        /* 私密模式 */
      }
    });
    await use(page);
  },
});

test('⑱ 第一次打開:歡迎卡 → 開始第一個個案 → 帶著做一次', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'iphone', '手機版面還沒做');
  await page.goto('/');
  const welcome = page.getByRole('dialog', { name: '你的資料只存在這台裝置' });
  await expect(welcome).toBeVisible();
  await welcome.getByRole('button', { name: '開始第一個個案' }).click();
  // 直接進畫布,沒有取名字、沒有選資料夾的彈窗
  await expect(page.getByRole('button', { name: '基本資料' })).toBeVisible();
  const tour = page.getByRole('dialog', { name: '帶著做一次' });
  await expect(tour).toContainText('第 1 步,共 5 步');
  await expect(tour).toContainText('幫他加上爸媽');
  // 真的按案主上面的箭頭(教學不擋點擊)
  await page.locator('g[data-arrow="up"]').click();
  await expect(tour).toContainText('第 2 步,共 5 步', { timeout: 5000 });
  // 自動存檔有 0.8 秒的間隔:等它寫進資料庫再比對
  await expect
    .poll(async () => (await readCases(page)).map((c) => `${c.caseName}:${c.persons.length}`).join(','), { timeout: 5000 })
    .toBe('未命名個案:3');
  // 第 2、3 步直接按下一步 → 第 4 步:打開選單,「快速建立家庭」要點得到(提示卡不能蓋住選單)
  await tour.getByRole('button', { name: '下一步' }).click();
  await tour.getByRole('button', { name: '下一步' }).click();
  await expect(tour).toContainText('第 4 步,共 5 步');
  await page.getByRole('button', { name: '選單' }).click();
  await page.getByRole('button', { name: '快速建立家庭' }).click();
  await expect(page.getByPlaceholder(/^爸爸 58歲/)).toBeVisible();
  await page.keyboard.press('Escape');
  // 跳過教學 → 提示卡消失,之後新建個案不再自動開
  await tour.getByRole('button', { name: '跳過教學' }).click();
  await expect(tour).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('genogram_tour_done'))).toBe('1');
});
