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
    const fill = root.querySelector<HTMLElement>('.fill')!;
    const marker = root.querySelector<HTMLElement>('.marker')!;
    const label = root.querySelector<HTMLElement>('.value')!;
    const t = track.getBoundingClientRect();
    const i = input.getBoundingClientRect();
    const f = fill.getBoundingClientRect();
    const m = marker.getBoundingClientRect();
    const l = label.getBoundingClientRect();
    return {
      value: input.valueAsNumber,
      text: label.textContent?.trim(),
      width: t.width,
      height: t.height,
      hitWidth: i.width,
      hitHeight: i.height,
      hitLeft: i.left - t.left,
      hitTop: i.top - t.top,
      fillWidth: f.width,
      fillEnd: f.right - t.left,
      marker: m.left + m.width / 2 - t.left,
      labelLeft: l.left - t.left,
      labelRight: l.right - t.left,
      transitions: [track, input, fill, marker, label].flatMap((node) => {
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
  for (const actual of [g.fillWidth, g.fillEnd]) {
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1);
  }
  // The 3px marker remains inset at both extremes; the value stays at the right.
  const expectedMarker = Math.max(5, Math.min(g.width - 8, expected - 2)) + 1.5;
  expect(Math.abs(g.marker - expectedMarker)).toBeLessThanOrEqual(1);
  expect(g.labelLeft).toBeGreaterThanOrEqual(0);
  expect(Math.abs(g.labelRight - (g.width - 16))).toBeLessThanOrEqual(1);
  expect(g.text).toBe(`${g.value}%`);
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

    test('fill, label and hit target follow input without layout transitions', async ({
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
  });
}
