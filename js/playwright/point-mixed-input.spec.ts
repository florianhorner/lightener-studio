import { expect, test, type Page } from '@playwright/test';

async function state(page: Page) {
  return page.evaluate(() => {
    const { card } = (window as any).__FULL_BAR__;
    return {
      curves: structuredClone(card._curves),
      undo: card._undoStack.length,
      dirty: card.dirty,
      editing: card._dragActive,
      pressed: card.renderRoot.querySelector('curve-graph').interactionActive,
    };
  });
}

async function holdPoint(page: Page, last = false, focusLast = last) {
  await page.goto(`/js/playwright/fixtures/full-bar-controls.html?seed=${test.info().testId}`);
  await page.locator('curve-legend .row-select-btn').first().click();
  const points = page.locator('curve-graph .hit-circle[data-curve="0"]');
  const point = last ? points.last() : points.nth(1);
  await (focusLast ? points.last() : point).focus();
  await point.scrollIntoViewIfNeeded();
  const bounds = (await point.boundingBox())!;
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  const before = await state(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  expect((await state(page)).pressed).toBe(true);
  return { x, y, before };
}

for (const width of [390, 1440]) {
  test.describe(`${width}px mixed graph input`, () => {
    test.use({ viewport: { width, height: 1000 } });

    test('drag, arrow and continued drag undo together', async ({ page }) => {
      const { x, y, before } = await holdPoint(page);
      await page.mouse.move(x, y - 12);
      const dragged = await state(page);
      await page.keyboard.press('ArrowUp');
      const nudged = await state(page);
      expect(nudged.curves[0].controlPoints[1].target).toBe(
        dragged.curves[0].controlPoints[1].target + 1
      );
      expect(nudged.editing).toBe(true);
      await page.mouse.move(x, y - 24);
      await page.mouse.up();
      expect(await state(page)).toMatchObject({ undo: 1, editing: false, pressed: false });
      await page.getByRole('button', { name: 'Undo', exact: true }).press('Enter');
      await expect.poll(async () => (await state(page)).curves).toEqual(before.curves);
      expect((await state(page)).dirty).toBe(false);
    });

    test('an arrow during a press keeps jitter harmless and cancels long-press removal', async ({
      page,
    }) => {
      const { x, y, before } = await holdPoint(page);
      await page.keyboard.press('ArrowUp');
      const nudged = await state(page);
      expect(nudged.curves[0].controlPoints[1].target).toBe(
        before.curves[0].controlPoints[1].target + 1
      );
      await page.mouse.move(x + 2, y + 1);
      // Beyond the 500 ms removal threshold while the pointer is still held.
      await page.waitForTimeout(550);
      expect((await state(page)).curves).toEqual(nudged.curves);
      await page.mouse.up();
      expect(await state(page)).toMatchObject({ undo: 1, editing: false, pressed: false });
      await page.keyboard.press('ArrowUp');
      expect(await state(page)).toMatchObject({ undo: 2, editing: false, pressed: false });
    });

    test('an arrow on another point joins the held drag and its Undo', async ({ page }) => {
      // Keyboard focus stays on the last point while the pointer holds the second one.
      const { x, y, before } = await holdPoint(page, false, true);
      await page.mouse.move(x, y - 12);
      const dragged = await state(page);
      await page.keyboard.press('ArrowDown');
      const nudged = await state(page);
      expect(nudged).toMatchObject({ undo: 1, editing: true, pressed: true });
      expect(nudged.curves[0].controlPoints.at(-1).target).toBe(
        dragged.curves[0].controlPoints.at(-1).target - 1
      );
      await page.mouse.move(x, y - 24);
      expect((await state(page)).curves[0].controlPoints[1]).not.toEqual(
        dragged.curves[0].controlPoints[1]
      );
      await page.mouse.up();
      expect(await state(page)).toMatchObject({ undo: 1, editing: false, pressed: false });
      await page.getByRole('button', { name: 'Undo', exact: true }).press('Enter');
      await expect.poll(async () => (await state(page)).curves).toEqual(before.curves);
    });

    for (const action of ['Enter', 'Delete']) {
      test(`${action} ends the press before changing point indexes`, async ({ page }) => {
        const { x, y, before } = await holdPoint(page, action === 'Enter');
        await page.mouse.move(x - 12, y + 12);
        const dragged = await state(page);
        await page.keyboard.press(action);
        const changed = await state(page);
        expect(changed).toMatchObject({ undo: 2, editing: false, pressed: false });
        expect(changed.curves[0].controlPoints).toHaveLength(
          dragged.curves[0].controlPoints.length + (action === 'Enter' ? 1 : -1)
        );
        if (action === 'Enter') {
          const last = page.locator('curve-graph .hit-circle[data-curve="0"]').last();
          await expect(last).toBeFocused();
          expect(changed.curves[0].controlPoints.at(-1)).toEqual(
            dragged.curves[0].controlPoints.at(-1)
          );
        }
        await page.mouse.move(x - 24, y + 24);
        await page.mouse.up();
        expect((await state(page)).curves).toEqual(changed.curves);
        await page.getByRole('button', { name: 'Undo', exact: true }).press('Enter');
        await expect.poll(async () => (await state(page)).curves).toEqual(dragged.curves);
        await page.getByRole('button', { name: 'Undo', exact: true }).press('Enter');
        await expect.poll(async () => (await state(page)).curves).toEqual(before.curves);
      });
    }
  });
}
