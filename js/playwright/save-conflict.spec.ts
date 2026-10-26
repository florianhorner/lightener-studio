import { expect, test, type Page } from '@playwright/test';
const fixture = '/js/playwright/fixtures/save-conflict.html';
async function edit(page: Page, editor: 'a' | 'b', name: string, preset: string) {
  const card = page.locator(`#editor-${editor}`);
  await card
    .locator('curve-legend .legend-item')
    .filter({ hasText: name })
    .locator('.row-select-btn')
    .click();
  await card.locator(`.preset-option[data-preset="${preset}"]`).click();
}
async function saved(page: Page) {
  return page.evaluate(() => (window as any).__SAVE_PROOF__.snapshot());
}
test('two built editors conflict atomically, review explicitly, and recheck on the separate Save', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixture);
  await expect(page.locator('#editor-a curve-legend .legend-item')).toHaveCount(3);
  await edit(page, 'a', 'Living Room Ceiling Lights', 'dim_accent');
  await edit(page, 'b', 'Living Room Ceiling Lights', 'early_starter');
  await page.evaluate(() => (window as any).__SAVE_PROOF__.hold(1));
  const pending = page.locator('#editor-b').evaluate((card: any) => card.saveCurves());
  await expect(page.locator('#editor-b .btn-save')).toHaveText('Saving…');
  await page.locator('#editor-a .btn-save').click();
  await expect(page.locator('#editor-a .command-status')).toHaveText('Saved');
  await page.evaluate(() => (window as any).__SAVE_PROOF__.release(1));
  expect(await pending).toBe(false);
  await expect(page.locator('#editor-b .command-status')).toContainText('Saved shapes changed');
  expect((await saved(page))['light.ceiling'].brightness['100']).toBe('45');
  await page
    .locator('#editor-b')
    .getByRole('button', { name: 'Review latest', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Living Room Ceiling Lights');
  await expect(page.getByRole('button', { name: 'Continue editing', exact: true })).toBeDisabled();
  await page.screenshot({ path: info.outputPath('conflict-review.png'), fullPage: true });
  await page.getByLabel('Keep my shape', { exact: true }).check();
  await page.getByRole('button', { name: 'Continue editing', exact: true }).click();
  expect((await saved(page))['light.ceiling'].brightness['100']).toBe('45');
  // A fresh concurrent change after review must conflict again on the separate Save.
  await page.evaluate(() =>
    (window as any).__SAVE_PROOF__.external({ 'light.sofa': { brightness: { 1: '1', 100: '65' } } })
  );
  await page.locator('#editor-b .btn-save').click();
  await expect(page.locator('#editor-b .command-status')).toContainText('Saved shapes changed');
  await page
    .locator('#editor-b')
    .getByRole('button', { name: 'Review latest', exact: true })
    .click();
  await page.getByRole('button', { name: 'Continue editing', exact: true }).click();
  await page.locator('#editor-b .btn-save').click();
  await expect(page.locator('#editor-b .command-status')).toHaveText('Saved');
  const final = await saved(page);
  expect(final['light.ceiling'].brightness['100']).toBe('100');
  expect(final['light.sofa'].brightness['100']).toBe('65');
  expect(final['light.legacy']).toEqual({
    brightness: { '12.5': '3.5', broken: 'bad' },
    future: { preserve: [1, 2] },
  });
  expect(await page.evaluate(() => (window as any).__SAVE_PROOF__.services)).toEqual([]);
  const calls = await page.evaluate(() =>
    (window as any).__SAVE_PROOF__.calls.filter((m: any) => m.type === 'lightener/save_curves')
  );
  expect(
    calls.every(
      (m: any) =>
        /^v1:[0-9a-f]{64}$/.test(m.expected_revision) &&
        Object.keys(m.curves).join(',') === 'light.ceiling'
    )
  ).toBe(true);
  await page.screenshot({ path: info.outputPath('saved-after-review.png'), fullPage: true });
});
test('removed edited lights require acknowledgment, dismissal retains draft, and accepted Undo cannot restore membership', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixture);
  await edit(page, 'b', 'Living Room Ceiling Lights', 'dim_accent');
  await edit(page, 'b', 'Living Room Sofa Lamp', 'dim_accent');
  await page.evaluate(() => (window as any).__SAVE_PROOF__.external({ 'light.ceiling': null }));
  await page.locator('#editor-b .btn-save').click();
  await page
    .locator('#editor-b')
    .getByRole('button', { name: 'Review latest', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Removed from this group');
  await expect(page.getByRole('button', { name: 'Continue editing', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Back to draft', exact: true }).click();
  await expect(page.locator('#editor-b curve-legend .legend-item')).toHaveCount(3);
  await page
    .locator('#editor-b')
    .getByRole('button', { name: 'Review latest', exact: true })
    .click();
  await page.getByLabel('I understand edits to removed lights will be dropped.').check();
  await page.getByRole('button', { name: 'Continue editing', exact: true }).click();
  await expect(page.locator('#editor-b curve-legend .legend-item')).toHaveCount(2);
  await page.locator('#editor-b').getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('#editor-b curve-legend .legend-item')).toHaveCount(2);
  expect(
    await page.evaluate(
      () =>
        (window as any).__SAVE_PROOF__.calls.filter((m: any) => m.type === 'lightener/save_curves')
          .length
    )
  ).toBe(1);
  expect(await page.evaluate(() => (window as any).__SAVE_PROOF__.services)).toEqual([]);
  await page.screenshot({ path: info.outputPath('removed-recovery-undo.png'), fullPage: true });
});

test('native review owns the top layer, focus and scrolling across two transformed cards', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1000, height: 520 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixture);
  await page.evaluate(() => {
    const main = document.querySelector('main')!;
    const frame = document.createElement('div');
    frame.id = 'scroll-frame';
    frame.style.cssText = 'height:470px;overflow:auto;';
    main.before(frame);
    frame.append(main);
    main.style.transform = 'translate(12px, 8px) scale(.92)';
    main.style.transformOrigin = 'top left';
    main.style.filter = 'brightness(1)';
    frame.scrollTop = 90;
  });
  await page
    .locator('#editor-b')
    .getByRole('button', { name: 'Brightness tips', exact: true })
    .click();
  await edit(page, 'a', 'Living Room Ceiling Lights', 'dim_accent');
  await edit(page, 'b', 'Living Room Ceiling Lights', 'dim_accent');
  await page.evaluate(() =>
    (window as any).__SAVE_PROOF__.external({
      'light.ceiling': { brightness: { 1: '1', 100: '70' } },
    })
  );
  await page.locator('#editor-a .btn-save').click();
  await page.locator('#editor-b .btn-save').click();
  const retained = await page.evaluate(() =>
    (window as any).__SAVE_PROOF__.cards.map((c: any) =>
      JSON.stringify({ draft: c._curves, undo: c._undoStack, baseline: c._baseline })
    )
  );
  await page.evaluate(() => (window as any).__SAVE_PROOF__.holdReads());
  await page
    .locator('#editor-a')
    .getByRole('button', { name: 'Review latest', exact: true })
    .click();
  await page
    .locator('#editor-b')
    .getByRole('button', { name: 'Review latest', exact: true })
    .click();
  await page.evaluate(() => (window as any).__SAVE_PROOF__.releaseRead(0));
  const first = page.locator('#editor-a save-conflict-review dialog');
  await expect(first).toBeVisible();
  expect(
    await first.evaluate((dialog: HTMLDialogElement) => dialog.open && dialog.matches(':modal'))
  ).toBe(true);
  await page
    .locator('#editor-a save-conflict-review')
    .getByLabel('Keep my shape', { exact: true })
    .check();
  await page.evaluate(() => (window as any).__SAVE_PROOF__.releaseRead(1));
  const top = page.locator('#editor-b save-conflict-review dialog');
  await expect(top).toBeVisible();
  expect(
    await top.evaluate((dialog: HTMLDialogElement) => dialog.open && dialog.matches(':modal'))
  ).toBe(true);
  await page
    .locator('#editor-b save-conflict-review')
    .getByLabel('Keep my shape', { exact: true })
    .check();
  await top.evaluate((dialog) => {
    dialog.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 's')
        dialog.dataset.savePrevented = String(event.defaultPrevented);
    });
  });
  await page.keyboard.press('Control+s');
  await expect(top).toHaveAttribute('data-save-prevented', 'true');
  await page.keyboard.press('Meta+s');
  await expect(top).toHaveAttribute('data-save-prevented', 'true');
  await page.keyboard.press('Tab');
  expect(
    await page
      .locator('#editor-b save-conflict-review')
      .evaluate((element: any) => element.shadowRoot.contains(element.shadowRoot.activeElement))
  ).toBe(true);
  await page.evaluate(() => {
    document.querySelector('#scroll-frame')!.scrollTop += 120;
  });
  const titleBox = await page.locator('#editor-b save-conflict-review h2').boundingBox();
  expect(titleBox!.y).toBeGreaterThanOrEqual(0);
  expect(titleBox!.y + titleBox!.height).toBeLessThanOrEqual(520);
  // Reach the actions through the dialog's own scroll area, without moving its host.
  await top.evaluate((dialog: HTMLDialogElement) => {
    dialog.scrollTop = dialog.scrollHeight;
  });
  const back = page
    .locator('#editor-b save-conflict-review')
    .getByRole('button', { name: 'Back to draft', exact: true });
  const backBox = await back.boundingBox();
  expect(backBox!.y).toBeGreaterThanOrEqual(0);
  expect(backBox!.y + backBox!.height).toBeLessThanOrEqual(520);
  await page.screenshot({
    path: info.outputPath('native-transformed-two-review.png'),
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await expect(top).toHaveCount(0);
  await expect(first).toBeVisible();
  await expect(
    page.locator('#editor-a save-conflict-review').getByLabel('Keep my shape', { exact: true })
  ).toBeChecked();
  const firstBack = page
    .locator('#editor-a save-conflict-review')
    .getByRole('button', { name: 'Back to draft', exact: true });
  await firstBack.click();
  await expect(page.locator('save-conflict-review')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      (window as any).__SAVE_PROOF__.cards.map((c: any) =>
        JSON.stringify({ draft: c._curves, undo: c._undoStack, baseline: c._baseline })
      )
    )
  ).toEqual(retained);
  expect(await page.evaluate(() => (window as any).__SAVE_PROOF__.services)).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        (window as any).__SAVE_PROOF__.calls.filter((m: any) => m.type === 'lightener/save_curves')
          .length
    )
  ).toBe(2);
});

test('latest saved-state failures show reviewed copy without changing the draft', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixture);
  await expect(page.locator('#editor-a curve-legend .legend-item')).toHaveCount(3);
  await edit(page, 'a', 'Living Room Ceiling Lights', 'dim_accent');
  const before = await page
    .locator('#editor-a')
    .evaluate((card: any) => ({ curves: card._curves, undo: card._undoStack, dirty: card.dirty }));
  await page.locator('#editor-a').evaluate(async (card: any) => {
    card._hass.callWS = async () => {
      throw { code: 'unknown', message: 'opaque-remote-read-token' };
    };
    await card._reviewLatest();
  });
  await expect(page.locator('#editor-a .command-status')).toContainText(
    'Could not check saved shapes. Your draft is unchanged.'
  );
  await expect(page.locator('#editor-a')).not.toContainText('opaque-remote-read-token');
  expect(
    await page
      .locator('#editor-a')
      .evaluate((card: any) => ({ curves: card._curves, undo: card._undoStack, dirty: card.dirty }))
  ).toEqual(before);
  expect(await page.evaluate(() => (window as any).__SAVE_PROOF__.services)).toEqual([]);
  expect(
    await page.evaluate(() =>
      (window as any).__SAVE_PROOF__.calls.filter((m: any) => m.type === 'lightener/save_curves')
    )
  ).toEqual([]);
});
