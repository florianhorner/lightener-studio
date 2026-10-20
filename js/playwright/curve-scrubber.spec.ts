import { expect, test, type Page } from '@playwright/test';

const FIXTURE = '/js/playwright/fixtures/first-use-invitation.html';

async function geometry(page: Page) {
  return page.locator('curve-scrubber').evaluate(async (el) => {
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    const root = el.shadowRoot!;
    const track = root.querySelector<HTMLElement>('.track-area')!;
    const fill = root.querySelector<HTMLElement>('.track-fill')!;
    const thumb = root.querySelector<HTMLElement>('.thumb')!;
    const label = root.querySelector<HTMLElement>('.position-label')!;
    const t = track.getBoundingClientRect();
    const f = fill.getBoundingClientRect();
    const h = thumb.getBoundingClientRect();
    const l = label.getBoundingClientRect();
    return {
      value: Number(track.getAttribute('aria-valuenow')),
      text: label.textContent?.trim(),
      width: t.width,
      height: t.height,
      layoutWidth: fill.offsetWidth,
      fillWidth: f.width,
      fillEnd: f.right - t.left,
      thumb: h.left + h.width / 2 - t.left,
      label: l.left + l.width / 2 - t.left,
      transitions: [fill, thumb, label].flatMap((node) => {
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
  expect(Math.abs(g.layoutWidth - g.width)).toBeLessThanOrEqual(1);
  for (const actual of [g.fillWidth, g.fillEnd, g.thumb, g.label]) {
    // ARIA is rounded, while native pointer input retains sub-percent precision.
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(g.width / 200 + 1);
  }
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

    test('fill, label and hit target follow input without layout transitions', async ({ page }) => {
      await page.goto(`${FIXTURE}?seed=${test.info().testId}&first=0&experiment=0`);
      await expect(page.locator('curve-legend .legend-item')).toHaveCount(3);
      const slider = page.getByRole('slider', { name: 'Try group brightness' });
      await slider.focus();
      const initial = await aligned(page);
      for (const key of ['End', 'Home', 'Shift+ArrowRight']) {
        await page.keyboard.press(key);
        const current = await aligned(page);
        expect(current.layoutWidth).toBe(initial.layoutWidth);
        expect(current.height).toBe(initial.height);
      }
      const track = (await slider.boundingBox())!;
      await page.mouse.click(track.x + track.width / 4, track.y + track.height / 2);
      expect((await aligned(page)).value).toBe(25);

      const b = (await page.locator('curve-scrubber .thumb').boundingBox())!;
      const start = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      const end = { x: track.x + track.width * 0.75, y: start.y };
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
          dirty: f.card.dirty,
          services: f.services,
          saved: f.savedPayloads,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(state).toEqual({ dirty: false, services: [], saved: [], overflow: false });
    });
  });
}
