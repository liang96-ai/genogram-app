import { test, expect, UI, createCase, readCaseByName } from './fixtures';

/**
 * 第二波:畫布與鍵盤 —— 這一區是 165 個單元測試完全守不到的地方
 * (jsdom 沒有 getBBox / 沒有真實指標事件,只有真瀏覽器測得準)。
 */

test('④ 拖曳人物 → 吸附格線 → 座標存進資料庫', async ({ app }) => {
  await createCase(app, 'E2E 拖曳測試');
  const before = await readCaseByName(app, 'E2E 拖曳測試');
  const p0 = before!.persons[0];

  const svg = app.locator('#canvas-svg');
  const box = await svg.boundingBox();
  expect(box, '要拿得到畫布位置').toBeTruthy();

  // 人物畫在 SVG 座標系;用畫布中心當起點,拖一段不是格線倍數的距離
  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;
  await app.mouse.move(startX, startY);
  await app.mouse.down();
  await app.mouse.move(startX + 140, startY + 90, { steps: 12 });
  await app.mouse.up();

  await expect
    .poll(
      async () => {
        const c = await readCaseByName(app, 'E2E 拖曳測試');
        return `${c!.persons[0].position.x},${c!.persons[0].position.y}`;
      },
      { timeout: 6000 },
    )
    .not.toBe(`${p0.position.x},${p0.position.y}`);

  const after = await readCaseByName(app, 'E2E 拖曳測試');
  const { x, y } = after!.persons[0].position;
  expect(x % 60, '座標要吸附到 60 的格線').toBe(0);
  expect(y % 60, '座標要吸附到 60 的格線').toBe(0);
});

test('⑤ 方向鍵微調:一串連按 = 一格復原', async ({ app }) => {
  await createCase(app, 'E2E 方向鍵測試');
  const start = (await readCaseByName(app, 'E2E 方向鍵測試'))!.persons[0].position;

  // 不要點畫布空白處 —— 那會清掉選取,方向鍵就沒有作用對象了。
  // 用 ⌘A 明確選取全部人物。
  await app.keyboard.press('Meta+a');
  for (let i = 0; i < 3; i++) await app.keyboard.press('ArrowRight');

  await expect
    .poll(async () => (await readCaseByName(app, 'E2E 方向鍵測試'))!.persons[0].position.x, {
      timeout: 6000,
    })
    .toBe(start.x + 180);

  await app.keyboard.press('Meta+z');
  await expect
    .poll(async () => (await readCaseByName(app, 'E2E 方向鍵測試'))!.persons[0].position.x, {
      timeout: 6000,
    })
    .toBe(start.x); // 一次復原退回整串,不是退一格
});

test('⑥ 彈窗開著時,方向鍵不可以動到畫布(2026-08-31 修的 bug)', async ({ app }) => {
  await createCase(app, 'E2E 彈窗防護');
  const start = (await readCaseByName(app, 'E2E 彈窗防護'))!.persons[0].position;

  // 開一個彈窗(族譜:純查詢、不會動資料,最適合當測試對象)
  await app.getByRole('button', { name: UI.menu }).click();
  await app.getByRole('button', { name: /族譜/ }).click();
  await expect(app.locator('[aria-modal="true"]')).toBeVisible();

  for (let i = 0; i < 4; i++) await app.keyboard.press('ArrowRight');
  for (let i = 0; i < 3; i++) await app.keyboard.press('ArrowDown');
  await app.keyboard.press('Delete');
  await app.waitForTimeout(2000);

  const c = await readCaseByName(app, 'E2E 彈窗防護');
  expect(c!.persons, 'Delete 不可以穿透刪掉人物').toHaveLength(1);
  expect(
    `${c!.persons[0].position.x},${c!.persons[0].position.y}`,
    '彈窗開著時人物不可以被方向鍵移動',
  ).toBe(`${start.x},${start.y}`);
});

test('⑦ 同一群人只能圈一個同住圈(2026-08-31 修的 bug)', async ({ app }) => {
  await createCase(app, 'E2E 同住圈');
  await app.locator(`button[title="${UI.addLonePerson}"]`).click();
  await expect
    .poll(async () => (await readCaseByName(app, 'E2E 同住圈'))!.persons.length, { timeout: 6000 })
    .toBe(2);

  for (let round = 0; round < 2; round++) {
    await app.keyboard.press('Meta+a');
    const btn = app.getByRole('button', { name: new RegExp(UI.household) });
    if (await btn.isVisible().catch(() => false)) await btn.click();
    await app.waitForTimeout(1200);
  }

  const c = await readCaseByName(app, 'E2E 同住圈');
  expect(c!.households ?? [], '連按兩次只該有一個圈').toHaveLength(1);
});
