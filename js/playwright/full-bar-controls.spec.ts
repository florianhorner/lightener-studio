import { expect, test, type Page, type Locator } from '@playwright/test';

const FIXTURE = '/js/playwright/fixtures/full-bar-controls.html';
let pageErrors: string[];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

async function ready(page: Page, query = '') {
  await page.goto(`${FIXTURE}?seed=${test.info().testId}&${query}`);
  await expect(page.locator('curve-legend .legend-item').first()).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Room brightness', exact: true })).toBeVisible();
  await expect
    .poll(() => page.locator('.control-dock').evaluate((dock) => dock.hasAttribute('data-narrow')))
    .toBe(page.viewportSize()!.width < 900);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
}
async function state(page: Page) {
  return page.evaluate(() => {
    const { card, services, saves } = (window as any).__FULL_BAR__;
    return {
      curves: structuredClone(card._curves),
      room: card._effectiveScrubberPosition,
      dirty: card.dirty,
      undo: card._undoStack.length,
      selected: card._selectedCurveId,
      services: structuredClone(services),
      saves: structuredClone(saves),
    };
  });
}
async function drag(page: Page, slider: Locator, delta: number) {
  const box = (await slider.boundingBox())!;
  const x = box.x + box.width * 0.3;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + delta, y, { steps: 6 });
  await page.mouse.up();
}
function room(page: Page) {
  return page.getByRole('slider', { name: 'Room brightness', exact: true });
}
function light(page: Page) {
  return page.locator('curve-legend brightness-bar input').first();
}

async function click(
  page: Page,
  target: Locator,
  options?: { position: { x: number; y: number } }
) {
  if (test.info().project.name !== 'webkit') return target.click(options);
  await expect(target).toBeVisible();
  await expect(target).toBeEnabled();
  await target.scrollIntoViewIfNeeded();
  const bounds = (await target.boundingBox())!;
  const point = {
    x: bounds.x + (options?.position.x ?? bounds.width / 2),
    y: bounds.y + (options?.position.y ?? bounds.height / 2),
  };
  // WebKit's plural shadow hit API can prepend an outer host. Verify the
  // actual singular hit through every root before sending native input.
  expect(
    await target.evaluate((element, point) => {
      let hit = document.elementFromPoint(point.x, point.y);
      while (hit?.shadowRoot) {
        const next = hit.shadowRoot.elementFromPoint(point.x, point.y);
        if (!next || next === hit) break;
        hit = next;
      }
      return hit === element || (hit !== null && element.contains(hit));
    }, point)
  ).toBe(true);
  if (test.info().project.use.hasTouch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

for (const width of [390, 1440]) {
  test.describe(`${width}px full bars`, () => {
    test.use({ viewport: { width, height: 1000 } });

    test('tap focus is idempotent; jitter and vertical intent do not edit', async ({ page }) => {
      await ready(page);
      const before = await state(page);
      await click(page, light(page), { position: { x: 25, y: 24 } });
      await click(page, light(page), { position: { x: 25, y: 24 } });
      const focused = await state(page);
      expect(focused.selected).toBe(before.curves[0].entityId);
      expect({ ...focused, selected: before.selected }).toEqual(before);
      await drag(page, light(page), 2);
      expect(await state(page)).toEqual(focused);
      const b = (await light(page).boundingBox())!;
      await page.mouse.move(b.x + 20, b.y + 20);
      await page.mouse.down();
      await page.mouse.move(b.x + 22, b.y + 40);
      await page.mouse.up();
      expect(await state(page)).toEqual(focused);
    });

    test('relative drag edits one light at a fixed room coordinate, with one Undo', async ({
      page,
    }) => {
      await ready(page);
      await room(page).focus();
      await room(page).press('Home');
      for (let i = 0; i < 5; i++) await room(page).press('PageUp');
      await expect(room(page)).toHaveValue('50');
      const before = await state(page);
      const b = (await light(page).boundingBox())!;
      const initial = Number(await light(page).inputValue());
      await drag(page, light(page), b.width * 0.2);
      const after = await state(page);
      expect(after.room).toBe(50);
      expect(after.undo).toBe(1);
      expect(after.dirty).toBe(true);
      expect(after.curves.slice(1)).toEqual(before.curves.slice(1));
      expect(after.curves[0].controlPoints.find((p: any) => p.lightener === 50)?.target).toBe(
        initial + 20
      );
      expect(after.services).toEqual([]);
      await click(page, page.getByRole('button', { name: 'Undo', exact: true }));
      await expect.poll(async () => (await state(page)).curves).toEqual(before.curves);
      expect((await state(page)).dirty).toBe(false);
    });

    test('Room changes only sample shapes; off disables light editing', async ({ page }) => {
      await ready(page);
      const before = await state(page);
      await room(page).focus();
      await room(page).press('Home');
      await expect(light(page)).toBeDisabled();
      await room(page).press('End');
      await room(page).press('ArrowLeft');
      const after = await state(page);
      expect(after.curves).toEqual(before.curves);
      expect(after.undo).toBe(0);
      expect(after.dirty).toBe(false);
      expect(after.services).toEqual([]);
      expect(after.saves).toEqual([]);
    });

    test('a restored fractional Room value that displays off cannot edit a light', async ({
      page,
    }) => {
      await page.addInitScript(() => {
        sessionStorage.setItem(
          'lightener:curve-card:v1:light.full_bar_example',
          JSON.stringify({ selectedCurveId: null, scrubberPosition: 0.4 })
        );
      });
      await ready(page);
      await expect(room(page)).toHaveValue('0');
      await expect(light(page)).toBeDisabled();
      const before = await state(page);
      expect(before.room).toBe(0);
      expect(before.undo).toBe(0);
      expect(before.dirty).toBe(false);
      expect(before.services).toEqual([]);
      expect(before.saves).toEqual([]);

      await room(page).focus();
      await room(page).press('ArrowRight');
      await expect(room(page)).toHaveValue('1');
      await expect(light(page)).toBeEnabled();
      expect((await state(page)).curves).toEqual(before.curves);
      await light(page).focus();
      await light(page).press('End');
      const after = await state(page);
      expect(after.curves[0].controlPoints).toContainEqual({ lightener: 1, target: 100 });
      expect(after.curves[0].controlPoints[0]).toEqual(before.curves[0].controlPoints[0]);
      expect(after.curves.slice(1)).toEqual(before.curves.slice(1));
      expect(after.undo).toBe(1);
      expect(after.dirty).toBe(true);
      expect(after.services).toEqual([]);
      expect(after.saves).toEqual([]);
    });

    test('marker selection and visibility remain independent, with stable ID reveal', async ({
      page,
    }) => {
      await ready(page);
      const row = page.locator('curve-legend .legend-item').first();
      const id = row.locator('.entity-id');
      const original = (await row.boundingBox())!;
      await expect(light(page)).toHaveAttribute('title', 'Ceiling Light\nlight.ceiling_light');
      expect(
        await light(page).evaluate((input) => {
          const box = input.getBoundingClientRect();
          return (
            (input.getRootNode() as ShadowRoot).elementFromPoint(box.left + 20, box.top + 20) ===
            input
          );
        })
      ).toBe(true);
      await row.locator('.eye-btn').focus();
      await expect(id).toHaveCSS('opacity', '0.85');
      await click(page, row.locator('.row-select-btn'));
      const selected = (await state(page)).selected;
      await click(page, page.locator('curve-legend .legend-item').nth(1).locator('.eye-btn'));
      expect((await state(page)).selected).toBe(selected);
      await click(page, page.locator('curve-legend .legend-item').nth(1).locator('.eye-btn'));
      await click(page, row.locator('.eye-btn'));
      // Preserve the editor's existing clear-selection behavior when hiding
      // the selected curve; showing it must not select it automatically.
      expect((await state(page)).selected).toBeNull();
      expect((await state(page)).curves[0].visible).toBe(false);
      await expect(light(page)).toBeDisabled();
      await click(page, row.locator('.eye-btn'));
      expect((await state(page)).selected).toBeNull();
      await click(page, light(page));
      await page.mouse.move(0, 0);
      await room(page).focus();
      await expect(id).toHaveCSS('opacity', '0.85');
      expect((await row.boundingBox())!.height).toBe(original.height);
      await click(page, row.locator('.row-select-btn'));
      await room(page).focus();
      await page.mouse.move(0, 0);
      await expect(id).toHaveCSS('opacity', '0');
    });

    test('save confirms and survives reload; preview uses existing service path', async ({
      page,
    }) => {
      await ready(page);
      await light(page).focus();
      await light(page).press('ArrowLeft');
      const edited = (await state(page)).curves;
      await click(page, page.getByRole('button', { name: 'Save changes (Ctrl+S)', exact: true }));
      await expect.poll(async () => (await state(page)).dirty).toBe(false);
      expect((await state(page)).saves).toHaveLength(1);
      await page.reload();
      await expect(light(page)).toBeVisible();
      expect((await state(page)).curves).toEqual(edited);
      await click(page, page.getByRole('button', { name: 'Watch room react', exact: true }));
      await expect.poll(async () => (await state(page)).services.length).toBeGreaterThan(0);
      const count = (await state(page)).services.length;
      await click(page, light(page));
      expect((await state(page)).services).toHaveLength(count);
      await light(page).press('ArrowLeft');
      await expect.poll(async () => (await state(page)).services.length).toBeGreaterThan(count);
      const last = (await state(page)).services.at(-1);
      expect(last[2].entity_id).toBe(edited[0].entityId);
    });

    test('selection remains output-neutral after a graph edit during preview', async ({ page }) => {
      await ready(page);
      await room(page).focus();
      await room(page).press('Home');
      for (let i = 0; i < 5; i++) await room(page).press('PageUp');
      await click(page, light(page));
      await page.getByRole('button', { name: 'Watch room react', exact: true }).press('Enter');
      await expect.poll(async () => (await state(page)).services.length).toBeGreaterThan(0);
      const point = page.locator('curve-graph .hit-circle[data-curve="0"]').nth(1);
      await point.focus();
      await point.press('ArrowUp');
      await page.waitForTimeout(400); // Drain the existing preview throttle before selecting.
      const before = await state(page);
      expect(before.dirty).toBe(true);
      expect(before.services.at(-1)[2].entity_id).toBe(before.curves[0].entityId);
      for (const index of [1, 1, 0]) {
        await page.locator('curve-legend .row-select-btn').nth(index).press('Enter');
        await page.waitForTimeout(350);
        const after = await state(page);
        expect({ ...after, selected: before.selected }).toEqual(before);
      }
      await click(page, light(page));
      await page.waitForTimeout(350);
      const after = await state(page);
      expect({ ...after, selected: before.selected }).toEqual(before);
    });

    test('graph jitter is harmless and deliberate point drag still edits', async ({ page }) => {
      await ready(page);
      await click(page, light(page));
      const point = page.locator('curve-graph .hit-circle').nth(1);
      const before = await state(page);
      const b = (await point.boundingBox())!;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2 + 2, b.y + b.height / 2 + 1);
      await page.mouse.up();
      expect(await state(page)).toEqual(before);
      await drag(page, point, 12);
      expect((await state(page)).dirty).toBe(true);
      expect((await state(page)).undo).toBe(1);
    });
  });
}

for (const theme of ['dark', 'light']) {
  test(`revealed IDs remain readable over every bar fill in ${theme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await ready(page, `count=8&theme=${theme}`);
    for (const row of await page.locator('curve-legend .legend-item').all()) {
      await click(page, row.locator('.row-select-btn'));
      await expect(row.locator('.entity-id')).toHaveCSS('opacity', '0.85');
      const minimum = await row.evaluate((row) => {
        const id = row.querySelector('.entity-id')!;
        const root = row.querySelector('brightness-bar')!.shadowRoot!;
        const style = getComputedStyle(id);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d')!;
        function rgb(color: string): number[] {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
        }
        function luminance(color: number[]): number {
          const values = color.map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
          return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
        }
        const foreground = rgb(style.color),
          opacity = Number(style.opacity);
        return Math.min(
          ...['.bar', '.fill'].map((selector) => {
            const background = rgb(getComputedStyle(root.querySelector(selector)!).backgroundColor);
            const text = foreground.map(
              (channel, i) => channel * opacity + background[i] * (1 - opacity)
            );
            const light = luminance(text),
              dark = luminance(background);
            return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
          })
        );
      });
      expect(minimum).toBeGreaterThanOrEqual(4.5);
    }
  });
}

for (const count of [3, 8, 20]) {
  for (const width of [390, 1440]) {
    test(`${count} lights at ${width}px: one label, reachable dock, no overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await ready(page, `count=${count}`);
      await expect(page.locator('curve-legend .legend-item')).toHaveCount(count);
      const geometry = await page.locator('lightener-curve-card').evaluate((card) => {
        const root = card.shadowRoot!;
        const dock = root.querySelector('.control-dock')!;
        const graph = root.querySelector('curve-graph')!;
        const scrubber = root.querySelector('curve-scrubber')!;
        const bar = scrubber.shadowRoot!.querySelector('brightness-bar')!;
        const track = bar.getBoundingClientRect();
        const plot = graph.shadowRoot!.querySelector<SVGRectElement>('.plot-frame')!;
        const box = plot.getBBox(),
          matrix = plot.getScreenCTM()!;
        return {
          narrow: dock.hasAttribute('data-narrow'),
          bars: root.querySelectorAll('curve-scrubber').length,
          graphLabel: graph.shadowRoot!.querySelectorAll('.x-axis-label').length,
          barLabel: (bar as any).showLabel,
          leftError: Math.abs(new DOMPoint(box.x, box.y).matrixTransform(matrix).x - track.left),
          rightError: Math.abs(
            new DOMPoint(box.x + box.width, box.y).matrixTransform(matrix).x - track.right
          ),
          overflow: document.documentElement.scrollWidth > innerWidth,
          dockBottom: dock.getBoundingClientRect().bottom,
        };
      });
      expect(geometry.bars).toBe(1);
      expect(geometry.graphLabel + Number(geometry.barLabel)).toBe(1);
      expect(geometry.overflow).toBe(false);
      if (width === 1440) {
        expect(geometry.narrow).toBe(false);
        expect(Math.max(geometry.leftError, geometry.rightError)).toBeLessThanOrEqual(1);
      } else {
        expect(geometry.narrow).toBe(true);
        expect(geometry.dockBottom).toBeLessThanOrEqual(900);
        await page.locator('curve-legend .legend-item').last().scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await expect
          .poll(async () => {
            const row = (await page.locator('curve-legend .legend-item').last().boundingBox())!;
            const dock = (await page.locator('.control-dock').boundingBox())!;
            return row.y + row.height - dock.y;
          })
          .toBeLessThanOrEqual(1);
        const row = (await page.locator('curve-legend .legend-item').last().boundingBox())!;
        const dock = (await page.locator('.control-dock').boundingBox())!;
        expect(row.y + row.height).toBeLessThanOrEqual(dock.y + 1);
      }
    });
  }
}

test('read-only bars cannot edit or preview; Joy defaults on and respects reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page, 'admin=0&theme=light');
  await expect(room(page)).toBeDisabled();
  await expect(light(page)).toBeDisabled();
  const preview = page.getByRole('button', { name: 'Watch room react', exact: true });
  if (await preview.count()) await expect(preview).toBeDisabled();
  expect(await page.locator('curve-graph').evaluate((graph: any) => graph.joy)).toEqual({
    settle: true,
    diagonal: true,
    ripple: true,
    draw_in: true,
  });
  expect((await state(page)).dirty).toBe(false);
});

for (const width of [390, 1440]) {
  test(`matched screenshot ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await ready(page);
    await room(page).focus();
    await room(page).press('Home');
    for (let i = 0; i < 5; i++) await room(page).press('PageUp');
    await click(page, light(page));
    await page.mouse.move(0, 0);
    await room(page).focus();
    await expect(room(page)).toHaveValue('50');
    await expect(page.locator('curve-legend .legend-item').first().locator('.entity-id')).toHaveCSS(
      'opacity',
      '0.85'
    );
    await page.screenshot({
      path: testInfo.outputPath(`full-bar-${width}.png`),
      animations: 'disabled',
    });
  });
}

test.describe('native vertical touch scrolling', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  for (const target of ['Room', 'light']) {
    test(`a vertical gesture starting on the ${target} bar scrolls without editing`, async ({
      page,
      browserName,
    }) => {
      test.skip(browserName !== 'chromium', 'Native touch dragging uses Chromium CDP.');
      await ready(page, 'count=20');
      const slider = target === 'Room' ? room(page) : light(page);
      await slider.scrollIntoViewIfNeeded();
      const before = await state(page);
      const scrollOffset = () =>
        target === 'Room'
          ? page.evaluate(() => scrollY)
          : page.locator('curve-legend .legend').evaluate((list) => list.scrollTop);
      const scrollBefore = await scrollOffset();
      const box = (await slider.boundingBox())!;
      const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      const client = await page.context().newCDPSession(page);
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
      for (let step = 1; step <= 8; step++) {
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: start.x + 2, y: start.y - step * 15 }],
        });
        await page.waitForTimeout(20);
      }
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(scrollOffset).toBeGreaterThan(scrollBefore + 40);
      expect(await state(page)).toEqual(before);
      await client.detach();
    });
  }
});

test.describe('native touch point removal', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test('a held point tolerates finger jitter and removes one point with one Undo', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Native touch dragging uses Chromium CDP.');
    await ready(page);
    await click(page, light(page));
    const hit = page.locator('curve-graph .hit-circle[data-curve="0"][data-point="1"]');
    const box = (await hit.boundingBox())!;
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const before = await state(page);
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: point.x + 3, y: point.y + 4 }],
    });
    await expect
      .poll(async () => (await state(page)).curves[0].controlPoints.length)
      .toBe(before.curves[0].controlPoints.length - 1);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const after = await state(page);
    expect(after.curves[0].controlPoints).toEqual(
      before.curves[0].controlPoints.filter((_: unknown, index: number) => index !== 1)
    );
    expect(after.curves.slice(1)).toEqual(before.curves.slice(1));
    expect(after.undo).toBe(1);
    expect(after.services).toEqual([]);
    await page.getByRole('button', { name: 'Undo', exact: true }).press('Enter');
    await expect.poll(async () => (await state(page)).curves).toEqual(before.curves);
    expect((await state(page)).dirty).toBe(false);
    await client.detach();
  });
});
