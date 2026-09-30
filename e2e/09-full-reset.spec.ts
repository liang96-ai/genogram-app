import { test, expect, UI, listFolder } from './fixtures';

/**
 * ⑰ 全部重置 + 備份資料夾(1.5.2):
 *   選「一起刪除」只刪本工具建立的個案資料夾(case_ 開頭、裡面有 case.json)與目錄檔;
 *   使用者用「備份」存的 _backups/、名字剛好是 case_ 開頭的自己的檔案與資料夾,一律不碰。
 */
test('⑰ 全部重置選「一起刪除」:只刪個案資料夾,備份與使用者自己的檔案都留著', async ({ app }, testInfo) => {
  test.skip(testInfo.project.name !== 'chrome', '備份資料夾只有桌面 Chrome / Edge 支援');
  // 1. 建一個有備份資料夾的個案
  await app.getByRole('button', { name: UI.newCase }).click();
  await app.getByRole('dialog').getByRole('button', { name: '選資料夾' }).click();
  await app.getByPlaceholder(UI.caseNamePlaceholder).fill('E2E 重置測試');
  await app.getByRole('button', { name: UI.createAndOpen }).click();
  await expect(app.getByRole('button', { name: UI.tabBasic })).toBeVisible();
  await expect
    .poll(async () => (await listFolder(app)).join('\n'), { timeout: 8000 })
    .toMatch(/case_.*\/case\.json/);
  // 2. 在同一個資料夾放使用者自己的東西:名字像個案的檔案與資料夾、以及一份全備份
  await app.evaluate(async () => {
    const root = await (await navigator.storage.getDirectory()).getDirectoryHandle('TestFolder');
    const put = async (dir: FileSystemDirectoryHandle, name: string, text: string) => {
      const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
      await w.write(text);
      await w.close();
    };
    await put(root, 'case_訪視紀錄.docx', '使用者自己的檔案');
    await put(await root.getDirectoryHandle('case_2024', { create: true }), '筆記.txt', '使用者自己的資料夾');
    await put(await root.getDirectoryHandle('_backups', { create: true }), 'full.json', '{}');
  });
  // 3. 回首頁 → 主選單 → 全部重置 → 確定 → 一起刪除
  await app.getByRole('button', { name: UI.backToList }).click();
  await app.getByRole('button', { name: '主選單' }).click();
  await app.getByRole('button', { name: /全部重置/ }).click();
  await app.getByRole('button', { name: /^(確定|是)/ }).click();
  await app.getByRole('button', { name: '一起刪除' }).click();
  await expect(app.getByRole('button', { name: UI.newCase })).toBeVisible({ timeout: 15000 });
  // 4. 資料夾:個案資料夾與目錄檔沒了,其他都在
  await expect
    .poll(async () => (await listFolder(app)).join('\n'), { timeout: 8000 })
    .not.toMatch(/case_case_/);
  const files = (await listFolder(app)).join('\n');
  expect(files).not.toContain('_目錄.txt');
  expect(files).toContain('case_訪視紀錄.docx');
  expect(files).toContain('case_2024/筆記.txt');
  expect(files).toContain('_backups/full.json');
});
