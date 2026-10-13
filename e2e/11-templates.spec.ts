import { test, expect, UI, readCaseByName } from './fixtures';

/**
 * ⑲ 1.6.1:範本 → 多段婚姻序號 → 輪住開關 → 匯出附圖例(SVG 裡真的有圖例)
 */
test('⑲ 重組家庭範本:媽媽的兩段婚姻標 1、2,同住圈可切成輪住,匯出的圖附圖例', async ({ app }) => {
  await app.getByRole('button', { name: UI.newCase }).click();
  const later = app.getByRole('button', { name: UI.folderLater });
  if (await later.isVisible().catch(() => false)) await later.click();
  await app.getByPlaceholder(UI.caseNamePlaceholder).fill('E2E 範本');
  await app.locator('[data-template="stepfamily"]').click();
  await app.getByRole('button', { name: UI.createAndOpen }).click();
  await expect(app.getByRole('button', { name: UI.tabBasic })).toBeVisible();

  // 1. 範本建好:案主、爸爸、媽媽、繼父、妹妹;媽媽的兩段婚姻在畫面上標 1、2
  await expect.poll(async () => (await readCaseByName(app, 'E2E 範本'))?.persons.length, { timeout: 8000 }).toBe(5);
  await expect(app.locator('[data-marriage-order]')).toHaveCount(2);

  // 2. 點同住圈的邊線選取 → 按「輪住」→ 存進資料
  await app.locator('[data-hh-id] polygon').nth(1).dispatchEvent('pointerdown', { bubbles: true });
  await app.locator('[data-action="zone-toggle"]').dispatchEvent('pointerdown', { bubbles: true });
  await expect
    .poll(async () => (await readCaseByName(app, 'E2E 範本'))?.households?.[0]?.rotating, { timeout: 8000 })
    .toBe(true);

  // 3. 匯出 SVG:附圖例預設勾選,檔案裡有圖例
  await app.keyboard.press('Escape');
  await app.getByRole('button', { name: UI.menu }).click();
  await app.getByRole('button', { name: new RegExp(UI.exportFile) }).click();
  await app.getByRole('button', { name: /圖片/ }).click();
  await app.getByRole('radio', { name: /SVG/ }).check();
  await expect(app.getByRole('checkbox', { name: /附圖例/ })).toBeChecked();
  const dl = app.waitForEvent('download');
  await app.getByRole('button', { name: UI.download }).click();
  const download = await dl;
  const chunks: Buffer[] = [];
  for await (const c of await download.createReadStream()) chunks.push(c as Buffer);
  const svg = Buffer.concat(chunks).toString('utf8');
  expect(svg).toContain('data-export-legend');
  expect(svg).toContain('輪住');
  expect(svg).toContain('離婚');
});
