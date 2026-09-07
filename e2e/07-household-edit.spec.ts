import { test, expect, UI, createCase, readCaseByName } from './fixtures';

/**
 * 同住圈與生態圈同一套手勢(1.5.0):雙擊邊線進編輯 → 出現把手 → 拖把手後形狀固定(points 寫進資料庫)。
 */
test('⑭ 同住圈:雙擊邊線進編輯,拖邊把手後形狀固定', async ({ app }) => {
  await createCase(app, 'E2E 同住圈編輯');
  await app.getByRole('button', { name: UI.addLonePerson }).click();
  await expect
    .poll(async () => (await readCaseByName(app, 'E2E 同住圈編輯'))!.persons.length, { timeout: 5000 })
    .toBe(2);
  await app.keyboard.press('Meta+a');
  await app.getByRole('button', { name: new RegExp(UI.household) }).click();
  await expect
    .poll(async () => ((await readCaseByName(app, 'E2E 同住圈編輯'))!.households ?? []).length, { timeout: 5000 })
    .toBe(1);
  const hit = app.locator('g[data-hh-id] polygon').nth(1); // 第二個 polygon 是命中框
  const box = await hit.boundingBox();
  expect(box).toBeTruthy();
  // 雙擊邊線 → 編輯模式,出現邊把手(rect)。命中框只有邊線吃事件,直接對它發 dblclick 最穩
  await hit.dispatchEvent('dblclick');
  const handles = app.locator('g[data-hh-id] rect');
  await expect(handles.first()).toBeVisible();
  // 拖上邊的把手往上 60px
  const h = await handles.first().boundingBox();
  await app.mouse.move(h!.x + h!.width / 2, h!.y + h!.height / 2);
  await app.mouse.down();
  await app.mouse.move(h!.x + h!.width / 2, h!.y + h!.height / 2 - 60, { steps: 6 });
  await app.mouse.up();
  await expect
    .poll(async () => ((await readCaseByName(app, 'E2E 同住圈編輯'))!.households![0].points ?? []).length, {
      timeout: 5000,
    })
    .toBe(4);
  // 回到自動(1.5.1):退出編輯 → 點邊線選取 → 按 ↺ → 形狀欄位拿掉,圈重新自動包住成員
  await app.keyboard.press('Escape');
  // 用 getBoundingClientRect 取幾何邊界(boundingBox 對 SVG 多邊形會外擴,點不到邊線)
  const rect = await hit.evaluate((el) => {
    const r = (el as SVGGraphicsElement).getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width };
  });
  await app.mouse.click(rect.x + rect.w / 2, rect.y + 1);
  const reset = app.locator('g[data-hh-id] [data-action="reset-shape"]');
  await expect(reset).toBeVisible();
  await reset.click();
  await expect
    .poll(async () => ((await readCaseByName(app, 'E2E 同住圈編輯'))!.households![0].points ?? []).length, {
      timeout: 5000,
    })
    .toBe(0);
});
