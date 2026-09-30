import { test, expect, UI, createCase, readCaseByName, listFolder } from './fixtures';

/**
 * 第一波:資料活不活得下來。
 * 排序原則是「壞掉的代價」——資料遺失 > 畫布幾何 > UI 細節。
 */

test('① 建立個案 → 寫進資料庫 → 回首頁看得到', async ({ app }) => {
  await createCase(app, 'E2E 建案測試');

  const c = await readCaseByName(app, 'E2E 建案測試');
  expect(c, '個案要寫進 IndexedDB').toBeTruthy();
  expect(c!.persons, '新個案預設有一個案主').toHaveLength(1);
  expect(c!.schemaVersion).toBe('1.0');

  await app.getByRole('button', { name: UI.backToList }).click();
  await expect(app.getByText('E2E 建案測試')).toBeVisible();
});

test('② 重新載入頁面後,剛才的編輯還在(掉資料的第二大來源)', async ({ app }) => {
  await createCase(app, 'E2E 重載測試');
  await app.getByPlaceholder(UI.namePlaceholder).fill('陳小明');
  // 自動存檔是停手 0.8 秒後寫出 —— 等它落地
  await expect
    .poll(async () => (await readCaseByName(app, 'E2E 重載測試'))?.persons[0]?.basicInfo?.name, {
      timeout: 6000,
    })
    .toBe('陳小明');

  await app.reload();
  await app.getByText('E2E 重載測試').click();
  await expect(app.getByPlaceholder(UI.namePlaceholder)).toHaveValue('陳小明');
});

test('③ 選了備份資料夾 → 個案真的被寫成 case.json', async ({ app }, testInfo) => {
  test.skip(testInfo.project.name !== 'chrome', '備份資料夾只有桌面 Chrome / Edge 支援');
  await app.getByRole('button', { name: UI.newCase }).click();
  // 這次不按「暫時不要」,而是真的選資料夾(骨架已把系統對話框換成替身)。
  // 一定要從彈窗裡面選 —— 首頁橫幅上有同名按鈕,但它被彈窗蓋住點不到。
  await app
    .getByRole('dialog')
    .getByRole('button', { name: '選資料夾' })
    .click();
  await app.getByPlaceholder(UI.caseNamePlaceholder).fill('E2E 資料夾測試');
  await app.getByRole('button', { name: UI.createAndOpen }).click();
  await expect(app.getByRole('button', { name: UI.tabBasic })).toBeVisible();

  await expect
    .poll(async () => (await listFolder(app)).join('\n'), { timeout: 8000 })
    .toMatch(/case_.*\/case\.json \(\d+B\)/);

  const files = await listFolder(app);
  expect(files.some((f) => f.includes('_目錄.txt')), '要有人看得懂的目錄檔').toBe(true);
});
