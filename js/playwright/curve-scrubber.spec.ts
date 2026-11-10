import { expect, test, type Page } from '@playwright/test';

const FIXTURE = '/js/playwright/fixtures/first-use-invitation.html';

async function geometry(page: Page) {
  return page.locator('curve-scrubber').evaluate(async (el) => {
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    const control = el.shadowRoot!.querySelector('brightness-bar') as HTMLElement & {
      updateComplete: Promise<unknown>;
    };
    await control.updateComplete;
    const root = control.shadowRoot!;
    const track = root.querySelector<HTMLElement>('.bar')!;
    const input = root.querySelector<HTMLInputElement>('input')!;
    const marker = root.querySelector<HTMLElement>('.marker')!;
    const label = root.querySelector<HTMLElement>('.value')!;
    const t = track.getBoundingClientRect();
    const i = input.getBoundingClientRect();
    const m = marker.getBoundingClientRect();
    const l = label.getBoundingClientRect();
    // The Room edge drawn in the graph, in viewport pixels.
    const graph = document
      .querySelector('lightener-curve-card')!
      .shadowRoot!.querySelector('curve-graph')!;
    const edge = graph.shadowRoot!.querySelector<SVGLineElement>('.scrubber-line')!;
    const e = edge.getBoundingClientRect();
    return {
      value: input.valueAsNumber,
      text: label.textContent?.trim(),
      width: t.width,
      height: t.height,
      hitWidth: i.width,
      hitHeight: i.height,
      hitLeft: i.left - t.left,
      hitTop: i.top - t.top,
      marker: m.left + m.width / 2 - t.left,
      markerViewport: m.left + m.width / 2,
      edgeViewport: e.left + e.width / 2,
      labelLeft: l.left - t.left,
      labelRight: l.right - t.left,
      transitions: [track, input, marker, label].flatMap((node) => {
        const style = getComputedStyle(node);
        const durations = style.transitionDuration.split(',').map(parseFloat);
        return style.transitionProperty
          .split(',')
          .map((property) => property.trim())
          .filter((_, index) => durations[index % durations.length] > 0);
      }),
    };
  });
}

async function aligned(page: Page) {
  const g = await geometry(page);
  const expected = (g.width * g.value) / 100;
  expect(g.height).toBe(48);
  expect(Math.abs(g.hitWidth - g.width)).toBeLessThanOrEqual(1);
  expect(g.hitHeight).toBe(g.height);
  expect(Math.abs(g.hitLeft)).toBeLessThanOrEqual(1);
  expect(Math.abs(g.hitTop)).toBeLessThanOrEqual(1);
  // The grip centres on the value at the plot's own scale, directly under the
  // graph's Room edge; its value sits beside it, inside the strip.
  expect(Math.abs(g.marker - expected)).toBeLessThanOrEqual(1);
  expect(Math.abs(g.markerViewport - g.edgeViewport)).toBeLessThanOrEqual(1);
  // The value moves to the grip's left only when the strip runs out beside it.
  if (((100 - g.value) / 100) * g.width < 60) expect(g.labelRight).toBeLessThan(g.marker);
  else expect(g.labelLeft).toBeGreaterThan(g.marker);
  // The value reads Off at zero; the slider position itself stays numeric.
  expect(g.text).toBe(g.value === 0 ? 'Off' : `${g.value}%`);
  for (const transition of g.transitions) {
    expect(transition).not.toMatch(/\b(all|width|height|left|right|top|bottom|margin|padding)\b/);
  }
  return g;
}

for (const mode of [
  { name: 'desktop', width: 1440, touch: false, reduced: false },
  { name: 'touch', width: 390, touch: true, reduced: false },
  { name: 'reduced motion', width: 390, touch: false, reduced: true },
]) {
  test.describe(`Room brightness — ${mode.name}`, () => {
    test.use({
      viewport: { width: mode.width, height: 1000 },
      hasTouch: mode.touch,
      reducedMotion: mode.reduced ? 'reduce' : 'no-preference',
    });

    test('grip, label and hit target follow input without layout transitions', async ({
      page,
      browserName,
    }) => {
      test.skip(
        mode.touch && browserName !== 'chromium',
        'Touch dragging uses Chromium DevTools input.'
      );
      await page.goto(`${FIXTURE}?seed=${test.info().testId}&first=0&experiment=0`);
      await expect(page.locator('curve-legend .legend-item')).toHaveCount(3);
      const original = await page.evaluate(() => {
        const f = (window as any).__INVITATION_FIXTURE__;
        return {
          curves: structuredClone(f.card._curves),
          undo: f.card._undoStack.length,
          selected: f.card._selectedCurveId,
        };
      });
      const slider = page.getByRole('slider', { name: 'Room brightness', exact: true });
      await slider.focus();
      const initial = await aligned(page);
      for (const [key, value] of [
        ['End', 100],
        ['ArrowRight', 100],
        ['Home', 0],
        ['ArrowLeft', 0],
        ['Shift+ArrowRight', 1],
        ['ArrowRight', 2],
        ['PageUp', 12],
        ['PageDown', 2],
        ['ArrowLeft', 1],
      ] as const) {
        await page.keyboard.press(key);
        const current = await aligned(page);
        expect(current.value).toBe(value);
        expect(current.width).toBe(initial.width);
        expect(current.height).toBe(initial.height);
      }
      await slider.scrollIntoViewIfNeeded();
      const tapValue = (await aligned(page)).value;
      const tapBounds = (await slider.boundingBox())!;
      const tap = { x: tapBounds.x + tapBounds.width / 4, y: tapBounds.y + tapBounds.height / 2 };
      if (mode.touch) await page.touchscreen.tap(tap.x, tap.y);
      else await page.mouse.click(tap.x, tap.y);
      expect((await aligned(page)).value).toBe(tapValue);

      // Set a known baseline using native keyboard input before relative dragging.
      await slider.focus();
      await page.keyboard.press('Home');
      for (let step = 0; step < 25; step++) await page.keyboard.press('ArrowRight');
      expect((await aligned(page)).value).toBe(25);
      await slider.scrollIntoViewIfNeeded();
      const track = (await slider.boundingBox())!;

      const start = { x: track.x + track.width * 0.2, y: track.y + track.height / 2 };
      const end = { x: start.x + track.width * 0.5, y: start.y };
      if (mode.touch) {
        const client = await page.context().newCDPSession(page);
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
        for (let step = 1; step <= 8; step++) {
          await client.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: start.x + ((end.x - start.x) * step) / 8, y: start.y }],
          });
          await aligned(page);
        }
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        const afterDrag = await aligned(page);
        expect(afterDrag.value).toBe(75);
        const verticalBox = (await slider.boundingBox())!;
        const verticalStart = {
          x: verticalBox.x + verticalBox.width * 0.2,
          y: verticalBox.y + verticalBox.height / 2,
        };
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [verticalStart],
        });
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: verticalStart.x + 2, y: verticalStart.y + 35 }],
        });
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await client.detach();
      } else {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        for (let step = 1; step <= 8; step++) {
          await page.mouse.move(start.x + ((end.x - start.x) * step) / 8, start.y);
          await aligned(page);
        }
        await page.mouse.up();
      }
      expect((await aligned(page)).value).toBe(75);
      const state = await page.evaluate(() => {
        const f = (window as any).__INVITATION_FIXTURE__;
        return {
          curves: structuredClone(f.card._curves),
          undo: f.card._undoStack.length,
          selected: f.card._selectedCurveId,
          dirty: f.card.dirty,
          services: f.services,
          saved: f.savedPayloads,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(state).toEqual({
        ...original,
        dirty: false,
        services: [],
        saved: [],
        overflow: false,
      });
    });

    test('the graph edge drags Room brightness while points keep their own drag', async ({
      page,
      browserName,
    }) => {
      test.skip(
        mode.touch && browserName !== 'chromium',
        'Touch dragging uses Chromium DevTools input.'
      );
      await page.goto(`${FIXTURE}?seed=${test.info().testId}&first=0&experiment=0`);
      await expect(page.locator('curve-legend .legend-item')).toHaveCount(3);
      const model = () =>
        page.evaluate(() => {
          const f = (window as any).__INVITATION_FIXTURE__;
          return {
            curves: structuredClone(f.card._curves),
            undo: f.card._undoStack.length,
            dirty: f.card.dirty,
          };
        });
      const slider = page.getByRole('slider', { name: 'Room brightness', exact: true });
      await slider.focus();
      await page.keyboard.press('Home');
      for (let step = 0; step < 25; step++) await page.keyboard.press('ArrowRight');
      const before = await model();
      const edge = page.locator('curve-graph .room-edge-hit');
      await edge.scrollIntoViewIfNeeded();
      const box = (await edge.boundingBox())!;
      const width = (await slider.boundingBox())!.width;
      const start = { x: box.x + box.width / 2, y: box.y + box.height * 0.3 };
      const end = { x: start.x + width * 0.3, y: start.y };
      if (mode.touch) {
        const client = await page.context().newCDPSession(page);
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
        for (let step = 1; step <= 8; step++) {
          await client.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: start.x + ((end.x - start.x) * step) / 8, y: start.y }],
          });
        }
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await client.detach();
      } else {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        for (let step = 1; step <= 8; step++) {
          await page.mouse.move(start.x + ((end.x - start.x) * step) / 8, start.y);
        }
        await page.mouse.up();
      }
      // The edge moves the room only: shapes, Undo and saved state stay put.
      expect((await aligned(page)).value).toBe(55);
      expect(await model()).toEqual(before);

      // A point the edge passes through still drags as a point.
      await page.locator('curve-legend .row-select-btn').first().click();
      const point = page.locator('curve-graph .hit-circle[data-curve="0"]').nth(1);
      const lightener = (await model()).curves[0].controlPoints[1].lightener;
      await slider.focus();
      await page.keyboard.press('Home');
      for (let step = 0; step < Math.round(lightener); step++)
        await page.keyboard.press('ArrowRight');
      const room = (await aligned(page)).value;
      await point.scrollIntoViewIfNeeded();
      const p = (await point.boundingBox())!;
      const at = { x: p.x + p.width / 2, y: p.y + p.height / 2 };
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      await page.mouse.move(at.x, at.y - 12, { steps: 3 });
      await page.mouse.up();
      expect((await aligned(page)).value).toBe(room);
      expect((await model()).curves[0].controlPoints[1].target).not.toBe(
        before.curves[0].controlPoints[1].target
      );
    });
  });
}
