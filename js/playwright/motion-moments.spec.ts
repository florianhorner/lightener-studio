import { expect, test, type Browser, type Page } from '@playwright/test';
import { toSvgX, toSvgY } from '../src/utils/graph-math';

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
 * Drag light.a's top-right point (100% → 100%) to (lightener, target) and
 * release it, then check that the drop landed, so no test can pass on a missed drag.
 */
async function dragTopPointTo(page: Page, lightener: number, target: number): Promise<void> {
  const { cx, hit } = await pointYs(page, 0, 2);
  const from = await graphScreenPos(page, cx, hit);
  const to = await graphScreenPos(page, toSvgX(lightener), toSvgY(target));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
  await settleRender(page);
  const landed = await pointYs(page, 0, 2);
  expect(landed.cx, `the drag landed at ${lightener}% across`).toBeCloseTo(toSvgX(lightener), 3);
  expect(landed.hit, `the drag landed at ${target}% up`).toBeCloseTo(toSvgY(target), 3);
}

const dragTopPointTo70 = (page: Page) => dragTopPointTo(page, 100, 70);
const dragTopPointOntoDiagonal = (page: Page) => dragTopPointTo(page, 60, 60);

/** The graph's markup without Lit's comment markers, with the random per-instance ids normalized. */
async function graphMarkup(page: Page): Promise<string> {
  return page.evaluate(() => {
    const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
    const root = card.renderRoot.querySelector('curve-graph')!.shadowRoot!;
    // Copy the tree, then remove the comment nodes themselves (no text matching).
    const copy = document.createElement('div');
    for (const node of Array.from(root.childNodes)) copy.append(node.cloneNode(true));
    const walker = document.createTreeWalker(copy, NodeFilter.SHOW_COMMENT);
    const comments: Node[] = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    for (const comment of comments) comment.parentNode!.removeChild(comment);
    // The faint reference diagonal is the one intended difference between flag on and off.
    copy.querySelectorAll('.diagonal-ref').forEach((el) => el.remove());
    return copy.innerHTML.replace(
      /(graph-area|grad-\d+|scrubber-glow-[0-9a-f]+)-[a-z0-9]+/g,
      '$1-UID'
    );
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
    // Hide the reference diagonal too, the one intended difference (see graphMarkup).
    const shot = await page
      .locator('curve-graph')
      .screenshot({ style: '.diagonal-ref { display: none }' });
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
  test('diagonal: a point dragged onto the diagonal flashes it, then the flash goes', async ({
    page,
  }) => {
    await openCardPaused(page, 'diagonal');
    await dragTopPointOntoDiagonal(page);
    const flash = await page.evaluate(() => {
      const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
      const root = card.renderRoot.querySelector('curve-graph')!.shadowRoot!;
      const line = root.querySelector('.diagonal-flash');
      if (!line) return null;
      // Hold the CSS animation at 25% of its 400ms, the brightest frame.
      const [animation] = line.getAnimations();
      animation.pause();
      animation.currentTime = 100;
      return {
        coords: ['x1', 'y1', 'x2', 'y2'].map((name) => Number(line.getAttribute(name))),
        opacity: Number(getComputedStyle(line).opacity),
      };
    });
    expect(flash, 'the flash is on screen').not.toBeNull();
    expect(flash!.coords).toEqual([toSvgX(0), toSvgY(0), toSvgX(100), toSvgY(100)]);
    expect(flash!.opacity).toBeCloseTo(0.9, 2);

    await page.clock.runFor(400);
    await settleRender(page);
    await expect(page.locator('curve-graph .diagonal-flash')).toHaveCount(0);
    await expect(page.locator('curve-graph .diagonal-ref')).toHaveCount(1);
  });

  test('diagonal: reduced motion keeps the guide but shows no flash', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openCardPaused(page, 'diagonal');
    await dragTopPointOntoDiagonal(page);
    await expect(page.locator('curve-graph .diagonal-ref')).toHaveCount(1);
    await expect(page.locator('curve-graph .diagonal-flash')).toHaveCount(0);
  });

  test('diagonal: after the flash, the graph matches the same drag with the flag off', async ({
    page,
    browser,
  }) => {
    await expectSameFinishedGraph(page, browser, 'diagonal', dragTopPointOntoDiagonal);
  });
  test('diagonal: the flash and the guide are really painted', async ({ page }) => {
    await openCardPaused(page, 'diagonal');
    await dragTopPointOntoDiagonal(page);
    const paint = await page.evaluate(() => {
      const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
      const root = card.renderRoot.querySelector('curve-graph')!.shadowRoot!;
      const flash = root.querySelector('.diagonal-flash')!;
      const [animation] = flash.getAnimations();
      animation.pause();
      const opacityAt = (ms: number) => {
        animation.currentTime = ms;
        return Number(getComputedStyle(flash).opacity);
      };
      const start = opacityAt(0);
      const end = opacityAt(399);
      animation.currentTime = 100;
      const f = getComputedStyle(flash);
      const r = getComputedStyle(root.querySelector('.diagonal-ref')!);
      return {
        fade: { start, end },
        flash: { stroke: f.stroke, width: parseFloat(f.strokeWidth) },
        ref: {
          stroke: r.stroke,
          width: parseFloat(r.strokeWidth),
          opacity: Number(r.opacity),
          dash: r.strokeDasharray,
        },
      };
    });
    expect(paint.fade.start, 'the flash fades in from nothing').toBeLessThan(0.05);
    expect(paint.fade.end, 'and fades out to nothing').toBeLessThan(0.05);
    expect(paint.flash.stroke, 'the flash uses the primary color').toBe('rgb(37, 99, 235)');
    expect(paint.flash.width).toBeCloseTo(2, 5);
    expect(paint.ref.stroke, 'the guide has a stroke').not.toBe('none');
    expect(paint.ref.width).toBeCloseTo(0.75, 5);
    expect(paint.ref.opacity, 'the guide is faint but visible').toBeGreaterThan(0);
    expect(paint.ref.opacity).toBeLessThan(0.5);
    expect(paint.ref.dash, 'the guide is dashed').not.toBe('none');
  });

  test('diagonal: switching to reduced motion while the flash runs hides it', async ({ page }) => {
    await openCardPaused(page, 'diagonal');
    await dragTopPointOntoDiagonal(page);
    await expect(page.locator('curve-graph .diagonal-flash')).toHaveCount(1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('curve-graph .diagonal-flash')).toHaveCSS('display', 'none');
  });

  test('diagonal: the flash and the guide follow the theme colors', async ({ page }) => {
    await openCardPaused(page, 'diagonal');
    await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('#root')!;
      root.style.setProperty('--primary-color', 'rgb(200, 30, 90)');
      root.style.setProperty('--secondary-text-color', 'rgb(90, 40, 160)');
    });
    await dragTopPointOntoDiagonal(page);
    await expect(page.locator('curve-graph .diagonal-flash')).toHaveCSS(
      'stroke',
      'rgb(200, 30, 90)'
    );
    await expect(page.locator('curve-graph .diagonal-ref')).toHaveCSS('stroke', 'rgb(90, 40, 160)');
  });
});

test.describe('joy moments on a touch screen (real browser, shipped bundle)', () => {
  // hasTouch makes (pointer: coarse) match.
  test.use({ hasTouch: true });

  test('diagonal: landing on the diagonal taps 5ms once and the drag still lands', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // A spy that behaves like the native method: it refuses any receiver but navigator.
    await page.addInitScript(() => {
      const calls: unknown[] = [];
      (window as unknown as { __vibrations: unknown[] }).__vibrations = calls;
      Object.defineProperty(Navigator.prototype, 'vibrate', {
        configurable: true,
        writable: true,
        value: function (this: unknown, pattern: unknown) {
          calls.push(pattern);
          if (!(this instanceof Navigator)) throw new TypeError('Illegal invocation');
          return true;
        },
      });
    });
    await openCardPaused(page, 'diagonal');
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    await dragTopPointOntoDiagonal(page);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() => (window as unknown as { __vibrations: unknown[] }).__vibrations)
    ).toEqual([5]);
  });
});
