import { test, expect, UI, createCase, readCaseByName } from './fixtures';

/**
 * 文字輸入單一策略(1.4.0):姓名欄是草稿型欄位 ——
 * 停手 0.8 秒才寫進資料庫;一次輸入(從開始改到失焦)不論停頓幾次都只吃一格復原。
 */
test('⑫ 姓名欄:有停頓的一次輸入 → 資料庫拿到全文,一次 ⌘Z 全退', async ({ app }) => {
  await createCase(app, 'E2E 草稿欄位');
  const name = app.getByPlaceholder(UI.namePlaceholder);
  await name.click();
  await name.pressSequentially('王小', { delay: 60 });
  await app.waitForTimeout(1300); // 停頓超過 store 的 900ms 時間窗,但仍是同一次輸入
  await name.pressSequentially('明', { delay: 60 });
  await expect
    .poll(async () => (await readCaseByName(app, 'E2E 草稿欄位'))!.persons[0].basicInfo?.name ?? '', {
      timeout: 5000,
    })
    .toBe('王小明');
  // 失焦 = 這次輸入結束;焦點回到 body 後全域鍵盤才接手復原
  await name.blur();
  await app.keyboard.press('Meta+z');
  await expect
    .poll(async () => (await readCaseByName(app, 'E2E 草稿欄位'))!.persons[0].basicInfo?.name ?? '', {
      timeout: 5000,
    })
    .toBe('');
});
