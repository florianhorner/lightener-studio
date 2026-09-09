import { devices, expect, test, type Page } from '@playwright/test';

/**
 * Point removal in a real browser, against the shipped bundle.
 *
 * Removing a control point has two input paths and neither had browser cover:
 * right-click, and press-and-hold. The jsdom suite proves the handlers decide
 * correctly; this proves a real browser routes a real gesture into them —
 * including the drag that must cancel a pending hold rather than delete a
 * point out from under the user mid-drag.
 *
 * The hold is driven with the mouse because Playwright's touchscreen API only
 * exposes `tap()`, which is far shorter than the 500ms threshold. The handler
 * is pointer-type agnostic, so this exercises the same timer the touch path
 * uses; touch-specific behaviour (double-tap to add) is covered in
 * selected-light-shapes.spec.ts and the jsdom suite.
 */

const FIXTURE = '/js/playwright/fixtures/selected-light-shapes-card.html';
const LONG_PRESS_MS = 500;
const HOLD_MS = LONG_PRESS_MS + 250;
const SEEDED_LIGHTENER = 60;

function touchContext(deviceName: string) {
  const device = devices[deviceName];
  return {
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    isMobile: device.isMobile,
    hasTouch: device.hasTouch,
    userAgent: device.userAgent,
  };
}

async function waitForCard(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const card = window.__LIGHTENER_CARD_ELEMENT__;
    if (!card) return;
    await card.updateComplete;
    const graph = card.renderRoot.querySelector('curve-graph') as
      | (HTMLElement & { updateComplete?: Promise<unknown> })
      | null;
    await graph?.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function openEditorWithALightSelected(page: Page): Promise<void> {
  await page.goto(FIXTURE);
  await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
  const row = page.locator('curve-legend .row-select-btn').filter({ hasText: 'light.a' });
  await expect(row).toHaveCount(1);
  await row.click();
  await waitForCard(page);
}

type Point = { lightener: number; target: number };

/** Control points of the currently selected curve, as the card holds them. */
async function selectedPoints(page: Page): Promise<Point[]> {
  return page.evaluate(() => {
    const card = window.__LIGHTENER_CARD_ELEMENT__ as unknown as {
      _curves: Array<{ entityId: string; controlPoints: Point[] }>;
      _selectedCurveId: string | null;
    };
    const curve = card._curves.find((c) => c.entityId === card._selectedCurveId);
    return curve ? curve.controlPoints : [];
  });
}

/**
 * Add a mid-curve point so there is something removable, well away from its
 * neighbours — coincident points would make a coordinate-driven gesture
 * ambiguous about which one it hit.
 */
async function seedRemovablePoint(page: Page): Promise<number> {
  const before = await selectedPoints(page);
  await page.evaluate((lightener: number) => {
    const card = window.__LIGHTENER_CARD_ELEMENT__!;
    const graph = card.renderRoot.querySelector('curve-graph')!;
    graph.dispatchEvent(
      new CustomEvent('point-add', {
        detail: { curveIndex: 0, lightener, target: 40 },
        bubbles: true,
        composed: true,
      })
    );
  }, SEEDED_LIGHTENER);
  await waitForCard(page);
  const after = await selectedPoints(page);
  expect(after.length, 'a point was added to remove').toBe(before.length + 1);
  return after.findIndex((point) => point.lightener === SEEDED_LIGHTENER);
}

/** Viewport centre of one `.hit-circle`, by index within the selected curve. */
async function pointCentre(page: Page, pointIndex: number): Promise<{ x: number; y: number }> {
  const centre = await page.evaluate((index: number) => {
    const card = window.__LIGHTENER_CARD_ELEMENT__!;
    const graph = card.renderRoot.querySelector('curve-graph')!;
    graph.scrollIntoView({ block: 'center', inline: 'center' });
    const circle = graph.shadowRoot!.querySelectorAll('.hit-circle')[index];
    if (!circle) return null;
    const rect = circle.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, pointIndex);
  expect(centre, `hit circle ${pointIndex} is on screen`).not.toBeNull();
  return centre!;
}

/** True when the page suppressed the browser context menu for this gesture. */
async function contextMenuWasSuppressed(page: Page, x: number, y: number): Promise<boolean> {
  await page.evaluate(() => {
    (window as unknown as { __ctxPrevented__: boolean | null }).__ctxPrevented__ = null;
    document.addEventListener(
      'contextmenu',
      (event) => {
        (window as unknown as { __ctxPrevented__: boolean | null }).__ctxPrevented__ =
          event.defaultPrevented;
      },
      { once: true }
    );
  });
  await page.mouse.click(x, y, { button: 'right' });
  await waitForCard(page);
  return page.evaluate(
    () => (window as unknown as { __ctxPrevented__: boolean | null }).__ctxPrevented__ === true
  );
}

test.describe('right-click removes a control point', () => {
  test('deletes the point under the cursor', async ({ page }) => {
    await openEditorWithALightSelected(page);
    const index = await seedRemovablePoint(page);
    const before = await selectedPoints(page);

    const centre = await pointCentre(page, index);
    // The point handler stops propagation, so the menu-suppression assertion
    // lives in the empty-space test below, where the event reaches the document.
    await page.mouse.click(centre.x, centre.y, { button: 'right' });
    await waitForCard(page);

    const after = await selectedPoints(page);
    expect(after).toHaveLength(before.length - 1);
    expect(after.some((point) => point.lightener === SEEDED_LIGHTENER)).toBe(false);
  });

  test('suppresses the menu over empty graph space without editing anything', async ({ page }) => {
    await openEditorWithALightSelected(page);
    const before = await selectedPoints(page);

    const box = await page.evaluate(() => {
      const card = window.__LIGHTENER_CARD_ELEMENT__!;
      const graph = card.renderRoot.querySelector('curve-graph')!;
      graph.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = graph.shadowRoot!.querySelector('svg')!.getBoundingClientRect();
      // Upper-left of the plot: above the y=x curve, clear of every point.
      return { x: rect.x + rect.width * 0.25, y: rect.y + rect.height * 0.2 };
    });

    expect(await contextMenuWasSuppressed(page, box.x, box.y)).toBe(true);
    expect(await selectedPoints(page)).toEqual(before);
  });
});

test.describe('press-and-hold removes a control point at a phone viewport', () => {
  test.use(touchContext('Pixel 7'));

  test('deletes the point once the hold passes the threshold', async ({ page }) => {
    await openEditorWithALightSelected(page);
    const index = await seedRemovablePoint(page);
    const before = await selectedPoints(page);

    const centre = await pointCentre(page, index);
    await page.mouse.move(centre.x, centre.y);
    await page.mouse.down();
    await page.waitForTimeout(HOLD_MS);
    await page.mouse.up();
    await waitForCard(page);

    const after = await selectedPoints(page);
    expect(after).toHaveLength(before.length - 1);
    expect(after.some((point) => point.lightener === SEEDED_LIGHTENER)).toBe(false);
  });

  test('a short press leaves the point alone', async ({ page }) => {
    await openEditorWithALightSelected(page);
    const index = await seedRemovablePoint(page);
    const before = await selectedPoints(page);

    const centre = await pointCentre(page, index);
    await page.mouse.move(centre.x, centre.y);
    await page.mouse.down();
    await page.waitForTimeout(120);
    await page.mouse.up();
    await waitForCard(page);

    expect(await selectedPoints(page)).toHaveLength(before.length);
  });

  test('dragging cancels the pending removal — the point moves, it does not vanish', async ({
    page,
  }) => {
    await openEditorWithALightSelected(page);
    const index = await seedRemovablePoint(page);
    const before = await selectedPoints(page);

    const centre = await pointCentre(page, index);
    await page.mouse.move(centre.x, centre.y);
    await page.mouse.down();
    // Any movement means the user is dragging, not holding to delete.
    await page.mouse.move(centre.x, centre.y - 30, { steps: 5 });
    await page.waitForTimeout(HOLD_MS);
    await page.mouse.up();
    await waitForCard(page);

    const after = await selectedPoints(page);
    expect(after, 'the dragged point still exists').toHaveLength(before.length);
    const moved = after.find((point) => point.lightener === SEEDED_LIGHTENER);
    expect(moved, 'the dragged point kept its x position').toBeDefined();
    expect(moved!.target).toBeGreaterThan(before[index].target);
  });
});
