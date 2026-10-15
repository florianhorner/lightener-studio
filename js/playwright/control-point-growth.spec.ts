import { expect, test } from '@playwright/test';

const FIXTURE = '/js/playwright/fixtures/selected-light-shapes-card.html';

/**
 * Marker growth on hover used to be driven by the SVG `r` geometry property,
 * which only exists on `<circle>`. Every curve after the first uses a
 * `<rect>` or `<polygon>` marker (LEGEND_SHAPES = circle, square, diamond,
 * triangle, bar), so four of the five shapes never grew on hover, focus or
 * drag and those points had no interaction feedback at all.
 *
 * jsdom has no layout, so the unit suite can only pin the wiring. This spec
 * does the measuring, against the shipped bundle in a real browser.
 */

/** Screen position of one `.hit-circle`, via the SVG's own screen CTM. */
async function pointScreenPos(
  page: import('@playwright/test').Page,
  curveIdx: number,
  pointIdx: number
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    async ({ curveIdx, pointIdx }) => {
      const card = window.__LIGHTENER_CARD_ELEMENT__!;
      const graph = card.renderRoot.querySelector('curve-graph')!;
      graph.scrollIntoView({ block: 'center', inline: 'nearest' });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const svg = graph.shadowRoot!.querySelector('svg')!;
      const circle = graph.shadowRoot!.querySelector(
        `.hit-circle[data-curve="${curveIdx}"][data-point="${pointIdx}"]`
      )!;
      const ctm = svg.getScreenCTM()!;
      const pt = svg.createSVGPoint();
      pt.x = Number(circle.getAttribute('cx'));
      pt.y = Number(circle.getAttribute('cy'));
      const p = pt.matrixTransform(ctm);
      return { x: p.x, y: p.y };
    },
    { curveIdx, pointIdx }
  );
}

/**
 * Rendered size of the marker belonging to one hit circle. `_renderCurvePoints`
 * emits the hit circle immediately followed by its marker, so the marker is the
 * hit circle's next element sibling.
 */
async function markerBox(
  page: import('@playwright/test').Page,
  curveIdx: number,
  pointIdx: number
): Promise<{ tag: string; cls: string; width: number; height: number }> {
  return page.evaluate(
    ({ curveIdx, pointIdx }) => {
      const card = window.__LIGHTENER_CARD_ELEMENT__!;
      const graph = card.renderRoot.querySelector('curve-graph')!;
      const hit = graph.shadowRoot!.querySelector(
        `.hit-circle[data-curve="${curveIdx}"][data-point="${pointIdx}"]`
      )!;
      const marker = hit.nextElementSibling as SVGGraphicsElement;
      const box = marker.getBoundingClientRect();
      return {
        tag: marker.tagName.toLowerCase(),
        cls: marker.getAttribute('class') ?? '',
        width: box.width,
        height: box.height,
      };
    },
    { curveIdx, pointIdx }
  );
}

test.describe('control-point markers grow on hover for every shape', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
    await page.waitForFunction(() => Boolean(window.__LIGHTENER_CARD_ELEMENT__));
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const card = window.__LIGHTENER_CARD_ELEMENT__!;
          const graph = card.renderRoot.querySelector('curve-graph');
          return graph?.shadowRoot?.querySelectorAll('.hit-circle').length ?? 0;
        })
      )
      .toBeGreaterThan(0);
  });

  // Both curves in this fixture carry the identical equal-brightness default,
  // so their points are exactly coincident and a real mouse hover only ever
  // reaches the topmost one. Dispatching `pointerenter` at a specific hit
  // circle addresses one curve regardless of stacking, and drives the very
  // same `_hoveredPoint` state a real pointer would.
  //
  // Focus would have been the other option, but it cannot address curve 0
  // here: taking focus dispatches `focus-curve`, the card selects that curve,
  // `_orderedCurves` re-renders it last, and the DOM churn drops focus. Worth
  // fixing on its own; it is not what this spec measures.
  async function hoverPoint(
    page: import('@playwright/test').Page,
    curveIdx: number,
    pointIdx: number
  ): Promise<void> {
    await page.evaluate(
      ({ curveIdx, pointIdx }) => {
        const card = window.__LIGHTENER_CARD_ELEMENT__!;
        const graph = card.renderRoot.querySelector('curve-graph')!;
        const hit = graph.shadowRoot!.querySelector(
          `.hit-circle[data-curve="${curveIdx}"][data-point="${pointIdx}"]`
        )!;
        hit.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      },
      { curveIdx, pointIdx }
    );
  }

  for (const { curveIdx, expectedShape, expectedTag } of [
    { curveIdx: 0, expectedShape: 'shape-circle', expectedTag: 'circle' },
    { curveIdx: 1, expectedShape: 'shape-square', expectedTag: 'rect' },
  ]) {
    test(`${expectedShape} marker enlarges when hovered`, async ({ page }) => {
      const pointIdx = 1;
      const before = await markerBox(page, curveIdx, pointIdx);
      expect(before.tag).toBe(expectedTag);
      expect(before.cls).toContain(expectedShape);
      expect(before.width).toBeGreaterThan(0);

      await hoverPoint(page, curveIdx, pointIdx);
      // The transform transition is 150ms.
      await expect
        .poll(async () => (await markerBox(page, curveIdx, pointIdx)).width, { timeout: 2_000 })
        .toBeGreaterThan(before.width * 1.1);

      const after = await markerBox(page, curveIdx, pointIdx);
      expect(after.height).toBeGreaterThan(before.height * 1.1);
      expect(after.cls).toContain('hovered');
    });
  }

  test('a non-circle marker also enlarges under a real pointer', async ({ page }) => {
    // The square renders last, so it is the one a real pointer reaches at the
    // shared point position.
    const before = await markerBox(page, 1, 1);
    expect(before.tag).toBe('rect');
    expect(before.cls).toContain('shape-square');

    const pos = await pointScreenPos(page, 1, 1);
    await page.mouse.move(pos.x, pos.y);
    await expect
      .poll(async () => (await markerBox(page, 1, 1)).width, { timeout: 2_000 })
      .toBeGreaterThan(before.width * 1.1);
    expect((await markerBox(page, 1, 1)).cls).toContain('hovered');
  });
});
