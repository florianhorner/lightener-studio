import { expect, test, type Browser, type Page } from '@playwright/test';
import { toSvgY } from '../src/utils/graph-math';

/**
 * Real-browser proof for the opt-in "joy" motion moments, against the shipped
 * bundle. Each moment gets two checks:
 *   - mid-animation: Playwright's fake clock steps the frame loop, proving the
 *     moment actually shows;
 *   - endpoint: once it finishes, the graph is pixel-identical to the same run
 *     with the moment off, proving it leaves nothing behind.
 *
 * Both lights in the fixture sit on identical points, so a light is selected
 * first; only the selected light's points are then live.
 */

const FIXTURE = '/js/playwright/fixtures/selected-light-shapes-card.html';

/** Longer than any moment runs, so a capture sees the finished graph. */
const MOMENT_END_WAIT_MS = 1500;

/** clock.pauseAt() only moves forward: jump this far ahead, then hold the clock still. */
const PAUSE_LEAD_MS = 1000;

type CardWindow = Window & {
  __LIGHTENER_CARD_ELEMENT__?: HTMLElement & {
    renderRoot: ShadowRoot;
    updateComplete: Promise<unknown>;
  };
};

async function openCard(page: Page, joy: string | null): Promise<void> {
  await page.goto(joy ? `${FIXTURE}?joy=${joy}` : FIXTURE);
  // The fixture sets __LIGHTENER_CARD_READY__ only after an awaited fetch, so
  // wait for the card element itself instead of that promise.
  await page.waitForFunction(
    () => (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__ !== undefined
  );
  const row = page.locator('curve-legend .row-select-btn').filter({ hasText: 'light.a' });
  await expect(row).toHaveCount(1);
  await row.click();
  await settleRender(page);
  await page.evaluate(() => {
    const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
    card.renderRoot.querySelector('curve-graph')!.scrollIntoView({ block: 'center' });
  });
}

/**
 * Open the card with Playwright's fake clock installed and paused, so frame
 * loops only advance through page.clock.runFor().
 */
async function openCardPaused(page: Page, joy: string): Promise<void> {
  await page.clock.install();
  await openCard(page, joy);
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + PAUSE_LEAD_MS);
}

/** Wait for the card and graph to finish rendering, without timers or frames. */
async function settleRender(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
    await card.updateComplete;
    const graph = card.renderRoot.querySelector('curve-graph') as HTMLElement & {
      updateComplete: Promise<unknown>;
    };
    await graph.updateComplete;
  });
}

/** Screen position of an SVG point inside the graph. */
async function graphScreenPos(page: Page, svgX: number, svgY: number) {
  return page.evaluate(
    ({ svgX, svgY }) => {
      const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
      const graph = card.renderRoot.querySelector('curve-graph')!;
      const svg = graph.shadowRoot!.querySelector('svg')!;
      const pt = svg.createSVGPoint();
      pt.x = svgX;
      pt.y = svgY;
      const screen = pt.matrixTransform(svg.getScreenCTM()!);
      return { x: screen.x, y: screen.y };
    },
    { svgX, svgY }
  );
}

/** Centre of a point's hit circle (where the data is) and cy of its marker (what is drawn). */
async function pointYs(page: Page, ci: number, pi: number) {
  return page.evaluate(
    ({ ci, pi }) => {
      const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
      const graph = card.renderRoot.querySelector('curve-graph')!;
      const hit = graph.shadowRoot!.querySelector(
        `.hit-circle[data-curve="${ci}"][data-point="${pi}"]`
      )!;
      return {
        cx: Number(hit.getAttribute('cx')),
        hit: Number(hit.getAttribute('cy')),
        marker: Number(hit.nextElementSibling!.getAttribute('cy')),
      };
    },
    { ci, pi }
  );
}

/**
 * Drag light.a's top-right point (100% → 100%) down to 70% and release it,
 * then check that the drop landed, so no test can pass on a missed drag.
 */
async function dragTopPointTo70(page: Page): Promise<void> {
  const { cx, hit } = await pointYs(page, 0, 2);
  const from = await graphScreenPos(page, cx, hit);
  const to = await graphScreenPos(page, cx, toSvgY(70));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
  await settleRender(page);
  expect((await pointYs(page, 0, 2)).hit, 'the drag landed at 70%').toBeCloseTo(toSvgY(70), 3);
}

/** The graph's markup with Lit's comment markers and the random per-instance ids removed. */
async function graphMarkup(page: Page): Promise<string> {
  return page.evaluate(() => {
    const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
    return card.renderRoot
      .querySelector('curve-graph')!
      .shadowRoot!.innerHTML.replace(/<!--[^>]*-->/g, '')
      .replace(/(graph-area|grad-\d+|scrubber-glow-[0-9a-f]+)-[a-z0-9]+/g, '$1-UID');
  });
}

/** Run one interaction in a fresh browser context and capture the finished graph. */
async function finishedGraph(
  browser: Browser,
  joy: string | null,
  act: (page: Page) => Promise<void>
): Promise<{ shot: Buffer; markup: string }> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await openCard(page, joy);
    // Guard against a vacuous pass: the "on" run must really have the moment on.
    const flags = await page.evaluate(() => {
      const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
      const graph = card.renderRoot.querySelector('curve-graph') as HTMLElement & {
        joy: Record<string, boolean>;
      };
      return graph.joy;
    });
    for (const moment of joy ? joy.split(',') : []) expect(flags[moment]).toBe(true);
    await act(page);
    // Park the pointer off the card so hover styling is not part of the capture.
    await page.mouse.move(1, 1);
    await page.waitForTimeout(MOMENT_END_WAIT_MS);
    await settleRender(page);
    const shot = await page.locator('curve-graph').screenshot();
    return { shot, markup: await graphMarkup(page) };
  } finally {
    await context.close();
  }
}

/**
 * Compare two screenshots pixel by pixel in the browser. Two runs of the same
 * markup can still differ by a few anti-aliased pixels (a channel off by up to
 * ~25, measured), so the check counts heavy differences separately: a marker
 * left even 1 SVG unit off moves its whole ring, changing dozens of pixels by
 * well over 100.
 */
async function pixelDifference(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(
    async ({ a, b }) => {
      const load = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      const [first, second] = await Promise.all([load(a), load(b)]);
      if (first.width !== second.width || first.height !== second.height) {
        return { sameSize: false, heavy: -1, changed: -1 };
      }
      const pixels = (img: HTMLImageElement) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const pa = pixels(first);
      const pb = pixels(second);
      let heavy = 0;
      let changed = 0;
      for (let i = 0; i < pa.length; i += 4) {
        const delta = Math.max(
          Math.abs(pa[i] - pb[i]),
          Math.abs(pa[i + 1] - pb[i + 1]),
          Math.abs(pa[i + 2] - pb[i + 2]),
          Math.abs(pa[i + 3] - pb[i + 3])
        );
        if (delta > 96) heavy++;
        if (delta > 8) changed++;
      }
      return { sameSize: true, heavy, changed };
    },
    {
      a: `data:image/png;base64,${a.toString('base64')}`,
      b: `data:image/png;base64,${b.toString('base64')}`,
    }
  );
}

async function expectSameFinishedGraph(
  page: Page,
  browser: Browser,
  joy: string,
  act: (page: Page) => Promise<void>
): Promise<void> {
  // Separate browser contexts, so the two runs share nothing and can run at once.
  const [off, on] = await Promise.all([
    finishedGraph(browser, null, act),
    finishedGraph(browser, joy, act),
  ]);
  expect(on.markup, `${joy} leaves no markup behind`).toBe(off.markup);
  const diff = await pixelDifference(page, on.shot, off.shot);
  expect(diff.sameSize).toBe(true);
  expect(diff.heavy, `${joy} leaves no visible trace`).toBe(0);
  expect(diff.changed, 'anti-aliasing noise only').toBeLessThan(20);
}

test.describe('joy moments (real browser, shipped bundle)', () => {
  test('settle: the released point overshoots 2 SVG units down, then comes to rest', async ({
    page,
  }) => {
    await openCardPaused(page, 'settle');
    await dragTopPointTo70(page);
    const rest = toSvgY(70);

    await page.clock.runFor(70);
    await settleRender(page);
    const mid = await pointYs(page, 0, 2);
    expect(mid.hit, 'the data never moves').toBeCloseTo(rest, 3);
    expect(
      mid.marker - rest,
      'marker overshoots in the direction the brightness changed'
    ).toBeGreaterThan(1.8);
    expect(mid.marker - rest).toBeLessThanOrEqual(2);

    await page.clock.runFor(250);
    await settleRender(page);
    const done = await pointYs(page, 0, 2);
    expect(done.marker).toBeCloseTo(rest, 3);
  });

  test('settle: reduced motion keeps the released point still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openCardPaused(page, 'settle');
    await dragTopPointTo70(page);
    await page.clock.runFor(70);
    await settleRender(page);
    const mid = await pointYs(page, 0, 2);
    expect(mid.marker).toBeCloseTo(mid.hit, 3);
  });

  test('settle: after it finishes, the graph matches the same drag with settle off', async ({
    page,
    browser,
  }) => {
    await expectSameFinishedGraph(page, browser, 'settle', dragTopPointTo70);
  });
});
