import { expect, test, type Browser, type Page } from '@playwright/test';
import { GRAPH_W, PAD_LEFT, VB_H, toSvgX, toSvgY } from '../src/utils/graph-math';

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

/** Center the card's graph in the viewport, so screenshots and pointer moves land on it. */
async function scrollGraphIntoView(page: Page): Promise<void> {
  await page.evaluate(() => {
    const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
    card.renderRoot.querySelector('curve-graph')!.scrollIntoView({ block: 'center' });
  });
}

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
  await scrollGraphIntoView(page);
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

/**
 * Centre of a point's hit circle and cy of its marker. Settle moves only the
 * marker; a ripple moves both, so the hit target stays under the drawn point.
 */
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

/** Choose a shape for the selected light from its chip. */
async function chooseShape(page: Page, presetId: string): Promise<void> {
  await page.locator(`lightener-curve-card .preset-option[data-preset="${presetId}"]`).click();
  await settleRender(page);
}

/** Choose "Late starter" for light.a, which starts on the Equal shape. */
const chooseLateStarter = (page: Page) => chooseShape(page, 'late_starter');

/** Add a real fixture candidate through the shipped Edit lights flow. */
async function addNewLight(page: Page): Promise<void> {
  await page.locator('curve-legend .add-light-btn').click();
  const dialog = page.getByRole('dialog', { name: 'Edit lights' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.list')).toHaveAttribute('aria-busy', 'false');
  await dialog.locator('.light-row').filter({ hasText: 'light.new' }).getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Update lights' }).click();
  await expect(dialog).toHaveCount(0);
  await settleRender(page);
  await expect(
    page.locator('curve-legend .row-select-btn').filter({ hasText: 'light.new' })
  ).toHaveAttribute('aria-pressed', 'true');
  await scrollGraphIntoView(page);
}

/** The added curve's reveal clip and the actual paths that use it. */
async function drawInClip(page: Page) {
  return page.evaluate(() => {
    const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
    const root = card.renderRoot.querySelector('curve-graph')!.shadowRoot!;
    const clip = root.querySelector('.draw-in-clip')!;
    const rect = clip.querySelector('.draw-in-reveal')!;
    const paths = [...root.querySelectorAll<SVGPathElement>(`path[clip-path="url(#${clip.id})"]`)];
    const ancestors = [];
    for (let ancestor = clip.parentElement; ancestor; ancestor = ancestor.parentElement) {
      ancestors.push(ancestor);
    }
    return {
      x: Number(rect.getAttribute('x')),
      y: Number(rect.getAttribute('y')),
      width: Number(rect.getAttribute('width')),
      height: Number(rect.getAttribute('height')),
      namespace: [clip.namespaceURI, rect.namespaceURI],
      rootDefs:
        clip.parentElement?.localName === 'defs' &&
        clip.parentElement.parentElement === root.querySelector('svg'),
      clippedAncestors: ancestors
        .filter((ancestor) => getComputedStyle(ancestor).clipPath !== 'none')
        .map((ancestor) => ancestor.localName),
      paths: paths.map((path) => ({
        tag: path.localName,
        isLine: path.classList.contains('curve-line'),
        paintedClip: getComputedStyle(path).clipPath.includes(`#${clip.id}`),
      })),
      dots: [...root.querySelectorAll<SVGCircleElement>('.scrubber-dot')].map((dot) => ({
        x: Number(dot.getAttribute('cx')),
        clip: dot.getAttribute('clip-path'),
        usesReveal: getComputedStyle(dot).clipPath.includes(`#${clip.id}`),
      })),
    };
  });
}

/** Compare painted pixels with an added curve element present and hidden, at one held frame. */
async function addedPaint(
  page: Page,
  selector = '.scrubber-dot',
  svgPoint: { x: number; y: number } | null = null
) {
  const clip = await page.evaluate(
    ({ selector, svgPoint }) => {
      const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
      const root = card.renderRoot.querySelector('curve-graph')!.shadowRoot!;
      const elements = root.querySelectorAll<SVGGraphicsElement>(selector);
      const element = elements[elements.length - 1];
      const point = svgPoint ?? {
        x: Number(element.getAttribute('cx')),
        y: Number(element.getAttribute('cy')),
      };
      const screen = new DOMPoint(point.x, point.y).matrixTransform(element.getScreenCTM()!);
      // Sample the element's center. Repainting the SVG can change a few
      // antialiased edge pixels even when the added dot is completely clipped.
      return { x: Math.round(screen.x) - 2, y: Math.round(screen.y) - 2, width: 4, height: 4 };
    },
    { selector, svgPoint }
  );
  const setHidden = (hidden: boolean) =>
    page.evaluate(
      ({ selector, hidden }) => {
        const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
        const root = card.renderRoot.querySelector('curve-graph')!.shadowRoot!;
        const elements = root.querySelectorAll<SVGGraphicsElement>(selector);
        elements[elements.length - 1].style.visibility = hidden ? 'hidden' : '';
      },
      { selector, hidden }
    );
  const shown = await page.screenshot({ clip });
  await setHidden(true);
  try {
    return await pixelDifference(page, shown, await page.screenshot({ clip }));
  } finally {
    await setHidden(false);
  }
}

/** The membership token must survive hover/focus, which are not editing gestures. */
async function drawInToken(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__! as unknown as {
      _drawIn: { token: number } | null;
    };
    return card._drawIn?.token ?? null;
  });
}

/** Hold the CSS pop at one shared time, so its stagger is observable. */
async function markerPopsAt(page: Page, ms: number) {
  return page.evaluate((time) => {
    const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
    const root = card.renderRoot.querySelector('curve-graph')!.shadowRoot!;
    return [...root.querySelectorAll<SVGGElement>('.marker-pop')].map((wrapper) => {
      const [animation] = wrapper.getAnimations();
      if (!animation) throw new Error('The rendered marker has no CSS pop animation');
      animation.pause();
      animation.currentTime = time;
      const timing = animation.effect!.getTiming();
      const style = getComputedStyle(wrapper);
      return {
        scale: new DOMMatrixReadOnly(style.transform).a,
        delay: timing.delay,
        duration: timing.duration,
        fill: timing.fill,
        origin: style.transformOrigin,
        box: style.transformBox,
        namespace: wrapper.namespaceURI,
        markerNamespace: wrapper.querySelector('.control-point')!.namespaceURI,
        containsHit: wrapper.querySelector('.hit-circle') !== null,
      };
    });
  }, ms);
}

/** Where the selected light's drawn line crosses x (SVG units); the selected light is drawn last. */
async function lineYAt(page: Page, svgX: number): Promise<number> {
  return page.evaluate((x) => {
    const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__!;
    const root = card.renderRoot.querySelector('curve-graph')!.shadowRoot!;
    const lines = [...root.querySelectorAll<SVGPathElement>('.curve-line')];
    const path = lines[lines.length - 1];
    let [lo, hi] = [0, path.getTotalLength()];
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (path.getPointAtLength(mid).x < x) lo = mid;
      else hi = mid;
    }
    return path.getPointAtLength(hi).y;
  }, svgX);
}

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

test.describe('joy moments: ripple (real browser, shipped bundle)', () => {
  test('ripple: a chosen shape draws in from the left, then rests on the new shape', async ({
    page,
  }) => {
    await openCardPaused(page, 'ripple');
    await chooseLateStarter(page);
    // Late starter's point at 70% across sits at 45%; Equal passes through 70% there.
    await page.clock.runFor(100);
    await settleRender(page);
    const knee = await pointYs(page, 0, 3);
    expect(knee.marker, 'on its way down from 70%').toBeGreaterThan(toSvgY(70) + 1);
    expect(knee.marker, 'not yet at 45%').toBeLessThan(toSvgY(45) - 1);
    expect(knee.hit, 'the hit target travels with the marker').toBeCloseTo(knee.marker, 3);
    expect(await lineYAt(page, toSvgX(70)), 'the line runs through it').toBeCloseTo(knee.marker, 1);
    // The point at 45% across started 20ms earlier, so it is further along.
    const before = await pointYs(page, 0, 2);
    const progress = (y: number, from: number, to: number) =>
      (y - toSvgY(from)) / (toSvgY(to) - toSvgY(from));
    expect(progress(before.marker, 45, 1)).toBeGreaterThan(progress(knee.marker, 70, 45));

    await page.clock.runFor(400);
    await settleRender(page);
    const done = await pointYs(page, 0, 3);
    expect(done.marker).toBeCloseTo(toSvgY(45), 3);
    expect(done.hit).toBeCloseTo(toSvgY(45), 3);
  });

  test('ripple: another shape mid-ripple carries on from the curve on screen', async ({ page }) => {
    await openCardPaused(page, 'ripple');
    await chooseLateStarter(page);
    await page.clock.runFor(144);
    await settleRender(page);
    const onScreen = await lineYAt(page, toSvgX(85));
    await chooseShape(page, 'dim_accent');
    expect(await lineYAt(page, toSvgX(85)), 'no jump at the switch').toBeCloseTo(onScreen, 1);
    // Dim accent ends at 45% on the right; the point there starts at 100%.
    await page.clock.runFor(200);
    await settleRender(page);
    const end = await pointYs(page, 0, 4);
    expect(end.marker).toBeGreaterThan(toSvgY(100) + 1);
    expect(end.marker).toBeLessThan(toSvgY(45) - 1);
    await page.clock.runFor(400);
    await settleRender(page);
    expect((await pointYs(page, 0, 4)).marker).toBeCloseTo(toSvgY(45), 3);
  });

  test('ripple: reduced motion applies the shape at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openCardPaused(page, 'ripple');
    await chooseLateStarter(page);
    const knee = await pointYs(page, 0, 3);
    expect(knee.marker).toBeCloseTo(toSvgY(45), 3);
  });

  test('ripple: after it finishes, the graph matches the same choice with the flag off', async ({
    page,
    browser,
  }) => {
    await expectSameFinishedGraph(page, browser, 'ripple', chooseLateStarter);
  });
});

test.describe('joy moments: draw-in (real browser, shipped bundle)', () => {
  test('draw-in: Edit lights reveals only the new curve, from zero to full width', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'lightener:curve-card:v1:light.lightener',
        JSON.stringify({ selectedCurveId: null, scrubberPosition: 100 })
      );
    });
    await openCardPaused(page, 'draw_in');
    await addNewLight(page);
    await expect(page.locator('curve-graph .draw-in-clip')).toHaveCount(1);
    const start = await drawInClip(page);
    expect(start).toMatchObject({ x: PAD_LEFT - 10, y: 0, width: 0, height: VB_H });
    expect(start.namespace).toEqual(['http://www.w3.org/2000/svg', 'http://www.w3.org/2000/svg']);
    expect(start.rootDefs, 'the reveal definition is a direct child of root SVG defs').toBe(true);
    expect(start.clippedAncestors, 'no clipped subtree contains the reveal definition').toEqual([]);
    expect(start.paths, 'the selected added light clips its fill and line').toHaveLength(2);
    expect(start.paths.filter((path) => path.isLine)).toHaveLength(1);
    expect(start.paths.every((path) => path.tag === 'path' && path.paintedClip)).toBe(true);
    await expect(page.locator('curve-graph .curve-line')).toHaveCount(3);
    await expect(page.locator('curve-graph .hit-circle')).toHaveCount(3);
    expect(
      start.dots.every((dot) => dot.x === toSvgX(100)),
      'the parked scrubber leaves the sampled line undimmed'
    ).toBe(true);
    await markerPopsAt(page, 0);
    // Sample the line at 95%, clear of the parked 100% scrubber and endpoints.
    // This checks rasterized paint rather than just clip CSS, so it also holds when run in WebKit.
    const sample = { x: toSvgX(95), y: await lineYAt(page, toSvgX(95)) };
    expect(
      await addedPaint(page, '.curve-line', sample),
      'zero reveal paints no added line'
    ).toMatchObject({
      sameSize: true,
      heavy: 0,
    });

    const applied = await page.evaluate(() => {
      const card = (window as unknown as CardWindow).__LIGHTENER_CARD_ELEMENT__! as unknown as {
        _dirtyVersion: number;
        _cleanVersion: number;
      };
      const calls = (
        window as unknown as {
          __LIGHTENER_WS_CALLS__: Array<{ type: string; controlled_entity_ids?: string[] }>;
        }
      ).__LIGHTENER_WS_CALLS__;
      return {
        clean: card._dirtyVersion === card._cleanVersion,
        membership: calls.find((call) => call.type === 'lightener/set_controlled_lights'),
      };
    });
    expect(applied.clean, 'membership is committed before any drawing frame').toBe(true);
    expect(applied.membership?.controlled_entity_ids).toEqual(['light.a', 'light.b', 'light.new']);

    await page.clock.runFor(250);
    await settleRender(page);
    const mid = await drawInClip(page);
    const progress = mid.width / (GRAPH_W + 20);
    expect(progress, 'easeOutCubic is well past halfway at 250ms').toBeGreaterThan(0.84);
    expect(progress).toBeLessThanOrEqual(0.88);
    expect(mid.x + mid.width, 'the wipe has not reached the sampled line').toBeLessThan(
      sample.x - 8
    );
    expect(
      await addedPaint(page, '.curve-line', sample),
      'the line ahead of the wipe is not painted'
    ).toMatchObject({
      sameSize: true,
      heavy: 0,
    });

    // Allow the first animation frame at or after the 500ms deadline to run.
    await page.clock.runFor(270);
    await settleRender(page);
    expect((await drawInClip(page)).width).toBe(GRAPH_W + 20);
    const linePaint = await addedPaint(page, '.curve-line', sample);
    expect(linePaint.sameSize).toBe(true);
    expect(linePaint.heavy, 'the line is painted when the reveal reaches it').toBeGreaterThan(0);
    await page.clock.runFor(680);
    await settleRender(page);
    await expect(page.locator('curve-graph .draw-in-clip')).toHaveCount(0);
    await expect(page.locator('curve-graph .marker-pop')).toHaveCount(0);
  });

  for (const position of [50, 95]) {
    test(`draw-in: the added scrubber dot at ${position}% stays behind the wipe`, async ({
      page,
    }) => {
      if (position !== 50) {
        await page.addInitScript((parkedPosition) => {
          sessionStorage.setItem(
            'lightener:curve-card:v1:light.lightener',
            JSON.stringify({ selectedCurveId: null, scrubberPosition: parkedPosition })
          );
        }, position);
      }
      await openCardPaused(page, 'draw_in');
      await addNewLight(page);
      // Pause the independent CSS pops too, so screenshot differences can only
      // come from changing the added dot's visibility at this exact reveal frame.
      await markerPopsAt(page, 0);
      const start = await drawInClip(page);
      expect(start.dots).toHaveLength(3);
      expect(start.dots.every((dot) => dot.x === toSvgX(position))).toBe(true);
      expect(start.dots.slice(0, 2).map((dot) => dot.clip)).toEqual([null, null]);
      expect(start.dots[2].usesReveal, 'the added dot shares its curve reveal').toBe(true);
      expect(await addedPaint(page), 'zero reveal paints no added dot').toEqual({
        sameSize: true,
        heavy: 0,
        changed: 0,
      });

      // The 50% dot should still be hidden early in the wipe. A parked 95% dot
      // stays hidden even at 250ms, when most of the curve has appeared.
      const midpoint = position === 50 ? 40 : 250;
      await page.clock.runFor(midpoint);
      await settleRender(page);
      const mid = await drawInClip(page);
      expect(mid.x + mid.width, 'the wipe has not reached the dot yet').toBeLessThan(
        toSvgX(position) - 8
      );
      expect(await addedPaint(page), 'a dot ahead of the wipe paints no pixels').toEqual({
        sameSize: true,
        heavy: 0,
        changed: 0,
      });

      await page.clock.runFor(520 - midpoint);
      await settleRender(page);
      const painted = await addedPaint(page);
      expect(painted.sameSize).toBe(true);
      expect(
        painted.heavy,
        'the added dot is painted once its curve is fully revealed'
      ).toBeGreaterThan(10);
      expect((await drawInClip(page)).dots.slice(0, 2).map((dot) => dot.clip)).toEqual([
        null,
        null,
      ]);
    });
  }

  test('draw-in: shape hover and direct focus wait until the membership reveal ends', async ({
    page,
  }) => {
    await openCardPaused(page, 'draw_in');
    await addNewLight(page);
    const token = await drawInToken(page);
    expect(token).not.toBeNull();
    const chip = page.locator('lightener-curve-card .preset-option[data-preset="late_starter"]');
    await chip.hover();
    await settleRender(page);
    await expect(page.locator('curve-graph .preview-curve')).toHaveCount(0);
    expect(await drawInToken(page), 'mouse hover keeps the membership token active').toBe(token);
    await chip.focus();
    await settleRender(page);
    await expect(page.locator('curve-graph .preview-curve')).toHaveCount(0);
    expect(await drawInToken(page), 'direct focus also keeps the membership token active').toBe(
      token
    );

    await page.clock.runFor(1200);
    await settleRender(page);
    expect(await drawInToken(page)).toBeNull();
    // Re-enter after cleanup: hover trials resume without an extra press/key.
    await page.mouse.move(1, 1);
    await chip.hover();
    await settleRender(page);
    await expect(page.locator('curve-graph .preview-curve')).toHaveCount(1);
    await page.mouse.move(1, 1);
    await chip.evaluate((button: HTMLElement) => button.blur());
    await settleRender(page);
    await expect(page.locator('curve-graph .preview-curve')).toHaveCount(0);
    await chip.focus();
    await settleRender(page);
    await expect(page.locator('curve-graph .preview-curve')).toHaveCount(1);
  });

  test('draw-in: rendered points pop with the specified delay, overshoot and SVG wrappers', async ({
    page,
  }) => {
    await openCardPaused(page, 'draw_in');
    await addNewLight(page);
    const start = await markerPopsAt(page, 0);
    expect(start).toHaveLength(3);
    for (const [index, pop] of start.entries()) {
      expect(pop).toMatchObject({
        scale: 0,
        delay: 500 + index * 40,
        duration: 150,
        fill: 'both',
        box: 'fill-box',
        namespace: 'http://www.w3.org/2000/svg',
        markerNamespace: 'http://www.w3.org/2000/svg',
        containsHit: false,
      });
      expect(pop.origin, 'the marker scales around its center').not.toBe('0px 0px');
    }
    const stagger = await markerPopsAt(page, 520);
    expect(stagger[0].scale).toBeGreaterThan(0);
    expect(stagger[1].scale).toBe(0);
    expect(stagger[2].scale).toBe(0);
    for (let index = 0; index < start.length; index++) {
      const delay = 500 + index * 40;
      expect((await markerPopsAt(page, delay + 105))[index].scale).toBeCloseTo(1.15, 3);
      expect((await markerPopsAt(page, delay + 150))[index].scale).toBeCloseTo(1, 3);
    }
    await expect(page.locator('curve-graph .marker-pop .hit-circle')).toHaveCount(0);
    await expect(page.locator('curve-graph .hit-circle')).toHaveCount(3);
  });

  test('draw-in: reduced motion shows the added curve and its points immediately', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openCardPaused(page, 'draw_in');
    await addNewLight(page);
    await expect(page.locator('curve-graph .draw-in-clip')).toHaveCount(0);
    await expect(page.locator('curve-graph .marker-pop')).toHaveCount(0);
    await expect(page.locator('curve-graph .curve-line')).toHaveCount(3);
    await expect(page.locator('curve-graph .control-point')).toHaveCount(3);
    expect(await lineYAt(page, toSvgX(70))).toBeCloseTo(toSvgY(70), 1);
  });

  test('draw-in: the first press cancels it and the same drag edits the added point', async ({
    page,
  }) => {
    await openCardPaused(page, 'draw_in');
    await addNewLight(page);
    const from = await graphScreenPos(page, toSvgX(100), toSvgY(100));
    const to = await graphScreenPos(page, toSvgX(100), toSvgY(70));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await settleRender(page);
    await expect(page.locator('curve-graph .draw-in-clip')).toHaveCount(0);
    await expect(page.locator('curve-graph .marker-pop')).toHaveCount(0);
    await page.mouse.move(to.x, to.y, { steps: 6 });
    await page.mouse.up();
    await settleRender(page);
    await expect(
      page.locator('curve-graph .hit-circle[data-curve="2"][data-point="2"]')
    ).toHaveAttribute('cy', String(toSvgY(70)));
  });

  test('draw-in: an arrow key cancels it and still moves the added point', async ({ page }) => {
    await openCardPaused(page, 'draw_in');
    await addNewLight(page);
    const point = page.locator('curve-graph .hit-circle[data-curve="2"][data-point="2"]');
    await point.focus();
    await page.keyboard.press('ArrowDown');
    await settleRender(page);
    await expect(page.locator('curve-graph .draw-in-clip')).toHaveCount(0);
    await expect(page.locator('curve-graph .marker-pop')).toHaveCount(0);
    await expect(point).toHaveAttribute('cy', String(toSvgY(99)));
  });

  test('draw-in: choosing a shape cancels it and still starts the separate ripple', async ({
    page,
  }) => {
    await openCardPaused(page, 'draw_in,ripple');
    await addNewLight(page);
    await chooseLateStarter(page);
    await expect(page.locator('curve-graph .draw-in-clip')).toHaveCount(0);
    await expect(page.locator('curve-graph .marker-pop')).toHaveCount(0);
    await page.clock.runFor(100);
    await settleRender(page);
    const knee = page.locator('curve-graph .hit-circle[data-curve="2"][data-point="3"]');
    const mid = Number(await knee.getAttribute('cy'));
    expect(mid, 'the ripple still draws from the old 70% point').toBeGreaterThan(toSvgY(70) + 1);
    expect(mid).toBeLessThan(toSvgY(45) - 1);
    await page.clock.runFor(400);
    await settleRender(page);
    await expect(knee).toHaveAttribute('cy', String(toSvgY(45)));
  });

  test('draw-in: after it finishes, the graph matches Edit lights with the flag off', async ({
    page,
    browser,
  }) => {
    await expectSameFinishedGraph(page, browser, 'draw_in', addNewLight);
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
