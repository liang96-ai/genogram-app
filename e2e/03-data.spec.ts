import { test, expect, UI, createCase, readCaseByName, readCases } from './fixtures';

/**
 * 第三波:資料進出 —— 這個產品的全部賣點是「資料只在你手上」,
 * 所以「資料每一次移動」是最不能壞的一條線。
 */

test('⑧ 匯出 JSON → 清空 → 匯入 → 個案完全還原', async ({ app }, testInfo) => {
  await createCase(app, 'E2E 往返測試');
  await app.getByPlaceholder(UI.namePlaceholder).fill('陳小明');
  await expect
    .poll(async () => (await readCaseByName(app, 'E2E 往返測試'))?.persons[0]?.basicInfo?.name, {
      timeout: 6000,
    })
    .toBe('陳小明');

  // 匯出(攔截下載,存到測試暫存區)
  await app.getByRole('button', { name: UI.menu }).click();
  await app.getByRole('button', { name: new RegExp(UI.exportFile) }).click();
  await app.getByRole('button', { name: /資料 \.json/ }).click();
  const downloadPromise = app.waitForEvent('download');
  await app.getByRole('button', { name: UI.download }).click();
  // 匯出前的個資警告
  await app.getByRole('button', { name: /^(確定|是)/ }).click();
  const download = await downloadPromise;
  const file = testInfo.outputPath('exported.json');
  await download.saveAs(file);
  expect(download.suggestedFilename(), '檔名要去識別化,不含案主名').toMatch(
    /^家系圖_\d{8}_\d+人\.genogram\.json$/,
  );

  // 清空資料庫(模擬換一台電腦 / 清快取)
  await app.evaluate(async () => {
    const req = indexedDB.open('genogram-db');
    const db = await new Promise<IDBDatabase>((res) => { req.onsuccess = () => res(req.result); });
    const tx = db.transaction('cases', 'readwrite');
    await new Promise<void>((res) => { const r = tx.objectStore('cases').clear(); r.onsuccess = () => res(); });
    db.close();
  });
  await app.reload();
  expect(await readCases(app), '確認已清空').toHaveLength(0);

  // 匯入同一個檔
  await app.getByRole('button', { name: /匯入/ }).click();
  await app.setInputFiles('input[type=file]', file);
  // 匯入預覽頁的確認鈕是「套用」
  await app.getByRole('button', { name: '套用' }).click();
  await expect
    .poll(async () => (await readCases(app)).length, { timeout: 8000 })
    .toBe(1);

  const restored = (await readCases(app))[0];
  expect(restored.caseName).toBe('E2E 往返測試');
  expect(restored.persons[0].basicInfo?.name, '人物內容要完整還原').toBe('陳小明');
});

test('⑨ 匯出 PNG 與 SVG:檔案要真的產出且非空', async ({ app }) => {
  await createCase(app, 'E2E 圖片匯出');

  for (const [label, ext] of [['PNG', 'png'], ['SVG', 'svg']] as const) {
    await app.getByRole('button', { name: UI.menu }).click();
    await app.getByRole('button', { name: new RegExp(UI.exportFile) }).click();
    await app.getByRole('button', { name: /圖片/ }).click();
    await app.getByRole('radio', { name: new RegExp(label) }).check();
    const dl = app.waitForEvent('download');
    await app.getByRole('button', { name: UI.download }).click();
    const download = await dl;
    expect(download.suggestedFilename(), `${label} 檔名`).toMatch(
      new RegExp(`^家系圖_\\d{8}_\\d+人\\.${ext}$`),
    );
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    expect(Buffer.concat(chunks).length, `${label} 內容非空`).toBeGreaterThan(500);
  }
});

test('⑩ 復原 / 重做:連做 3 個動作 → 全部退回 → 再重做', async ({ app }) => {
  await createCase(app, 'E2E 復原測試');
  const startX = (await readCaseByName(app, 'E2E 復原測試'))!.persons[0].position.x;

  // 三次「分開的」方向鍵微調 = 三格復原
  // (同一串連按會被合併成一格,所以每次之間要等超過 600ms 的結算時間)
  await app.keyboard.press('Meta+a');
  for (let i = 0; i < 3; i++) {
    await app.keyboard.press('ArrowRight');
    await app.waitForTimeout(900);
  }
  await expect
    .poll(async () => (await readCaseByName(app, 'E2E 復原測試'))!.persons[0].position.x, {
      timeout: 6000,
    })
    .toBe(startX + 180);

  for (let i = 0; i < 3; i++) {
    await app.keyboard.press('Meta+z');
    await app.waitForTimeout(400);
  }
  await expect
    .poll(async () => (await readCaseByName(app, 'E2E 復原測試'))!.persons[0].position.x, {
      timeout: 6000,
    })
    .toBe(startX);

  for (let i = 0; i < 3; i++) {
    await app.keyboard.press('Meta+Shift+z');
    await app.waitForTimeout(400);
  }
  await expect
    .poll(async () => (await readCaseByName(app, 'E2E 復原測試'))!.persons[0].position.x, {
      timeout: 6000,
    })
    .toBe(startX + 180);
});
