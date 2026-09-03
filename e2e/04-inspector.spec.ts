import { test, expect, UI, createCase } from './fixtures';

/**
 * 第四分頁「個案紀錄」:量表區塊旁的「施測」要開同一個量表挑選器(1.3.1)。
 * 守的是跨元件的事件接線 —— Toolbar 持有挑選器狀態,分頁只發訊號,單元測試碰不到。
 */
test('⑪ 個案紀錄分頁 → 施測 → 量表挑選器打開', async ({ app }) => {
  await createCase(app, 'E2E 施測入口');
  await app.getByRole('button', { name: UI.tabAttach }).click();
  await app.getByRole('button', { name: UI.assess }).click();
  const dialog = app.locator('[role="dialog"]').filter({ hasText: '評估工具' });
  await expect(dialog, '量表挑選器(評估工具)要出現').toBeVisible();
  await app.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
