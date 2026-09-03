import { test, expect, UI, createCase } from './fixtures';

/**
 * 彈窗共用外殼(1.4.0):兩層疊著按 Esc 只關最上面那層。
 * 情境:快速建立填到一半按 Esc → 跳「放棄?」確認框 → 再按 Esc 只關確認框,快速建立還在。
 */
test('⑬ 兩層彈窗:Esc 只關最上面那層', async ({ app }) => {
  await createCase(app, 'E2E 彈窗堆疊');
  await app.getByRole('button', { name: UI.menu }).click();
  await app.getByText('快速建立家庭').click();
  const quick = app.locator('[role="dialog"]').filter({ has: app.locator('textarea') });
  await expect(quick).toBeVisible();
  await quick.locator('textarea').fill('爸爸 58');
  await app.keyboard.press('Escape');
  const confirm = app.getByText('你打的內容還沒建立');
  await expect(confirm).toBeVisible();
  await app.keyboard.press('Escape');
  await expect(confirm).toBeHidden();
  await expect(quick, '確認框關了,快速建立要還在').toBeVisible();
  await app.keyboard.press('Escape');
  await expect(confirm).toBeVisible();
  await app.getByRole('button', { name: '放棄輸入' }).click();
  await expect(quick).toBeHidden();
  await expect(confirm).toBeHidden();
});
