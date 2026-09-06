import { test, expect, UI, createCase, readCaseByName } from './fixtures';

/**
 * 四個箭頭長按拖曳(1.5.0):長按 → 箭頭右拖到另一個人物 → 結婚。
 * 座標:人物在 SVG 座標系,用 getScreenCTM 換算成螢幕座標。
 */
test('⑮ 長按 → 箭頭拖到另一個人 → 建立婚姻線', async ({ app }) => {
  await createCase(app, 'E2E 箭頭拖曳');
  await app.getByRole('button', { name: UI.addLonePerson }).click();
  await expect
    .poll(async () => (await readCaseByName(app, 'E2E 箭頭拖曳'))!.persons.length, { timeout: 5000 })
    .toBe(2);
  const c = await readCaseByName(app, 'E2E 箭頭拖曳');
  const proband = c!.persons.find((p) => p.isProband)!;
  const other = c!.persons.find((p) => !p.isProband)!;
  // 剛新增的獨立人物是選取狀態,四個箭頭掛在它身上:拿「朝向案主」那一側的箭頭拖過去
  const dir = proband.position.x < other.position.x ? 'left' : 'right';
  const arrow = app.locator(`g[data-arrow="${dir}"]`);
  await expect(arrow).toBeVisible();
  const ab = await arrow.boundingBox();
  // 目標用案主符號在螢幕上的實際位置(畫布有平移/縮放,別自己換算)
  const pb = await app.locator(`g[data-person-id="${proband.id}"]`).first().boundingBox();
  const target = { x: pb!.x + pb!.width / 2, y: pb!.y + pb!.height / 2 };
  await app.mouse.move(ab!.x + ab!.width / 2, ab!.y + ab!.height / 2);
  await app.mouse.down();
  await app.waitForTimeout(400); // 超過 0.25 秒才算長按
  await app.mouse.move(target.x, target.y, { steps: 10 });
  await app.mouse.up();
  await expect
    .poll(
      async () =>
        (await readCaseByName(app, 'E2E 箭頭拖曳'))!.lines.filter(
          (l) =>
            l.subType === 'marriage' &&
            ((l.fromPersonId === proband.id && l.toPersonId === other.id) ||
              (l.fromPersonId === other.id && l.toPersonId === proband.id)),
        ).length,
      { timeout: 5000 },
    )
    .toBe(1);
});
