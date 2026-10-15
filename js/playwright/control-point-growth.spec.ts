import { expect, test } from '@playwright/test';

// Five members gives one curve per LEGEND_SHAPES entry, so every marker shape
// is on screen. The fixture clamps ?members to 2..6.
const FIXTURE = '/js/playwright/fixtures/selected-light-shapes-card.html?members=5';

/** `.control-point` scale values in curve-graph.ts, by state. */
const HOVER_SCALE = 1.25;
const DRAG_SCALE = 1.33;

/**
 * Marker growth on hover used to be driven by the SVG `r` geometry property,
 * which only exists on `<circle>`. Every curve after the first uses a
 * `<rect>` or `<polygon>` marker (LEGEND_SHAPES = circle, square, diamond,
 * triangle, bar), so four of the five shapes never grew on hover, focus or
 * drag. The `filter` glow always applied to every shape; the size did not.
 *
 * jsdom has no layout, so the unit suite can only pin the wiring: which class
 * lands on which marker, and that no marker carries a `transform` attribute.
 * Everything that depends on the stylesheet resolving — that the scale applies
 * at all, that it is the right size, and that `transform-box: fill-box` keeps
 * the growth and the diamond's rotation centred on the marker's own box
 * instead of the SVG viewport — can only be measured here, in a real browser,
 * against the shipped bundle.
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

interface MarkerBox {
  tag: string;
  cls: string;
  width: number;
  height: number;
  /** Viewport centre of the rendered box, for transform-origin checks. */
  cx: number;
  cy: number;
  /** The `width` presentation attribute, where the shape has one. */
  attrWidth: number | null;
  strokeWidth: number;
}

/**
 * Rendered geometry of the marker belonging to one hit circle.
 * `_renderCurvePoints` emits the hit circle immediately followed by its
 * marker, so the marker is the hit circle's next element sibling.
 */
async function markerBox(
  page: import('@playwright/test').Page,
  curveIdx: number,
  pointIdx: number
): Promise<MarkerBox> {
  return page.evaluate(
    ({ curveIdx, pointIdx }) => {
      const card = window.__LIGHTENER_CARD_ELEMENT__!;
      const graph = card.renderRoot.querySelector('curve-graph')!;
      const hit = graph.shadowRoot!.querySelector(
        `.hit-circle[data-curve="${curveIdx}"][data-point="${pointIdx}"]`
      )!;
      const marker = hit.nextElementSibling as SVGGraphicsElement;
      const box = marker.getBoundingClientRect();
      const rawWidth = marker.getAttribute('width');
      return {
        tag: marker.tagName.toLowerCase(),
        cls: marker.getAttribute('class') ?? '',
        width: box.width,
        height: box.height,
        cx: box.x + box.width / 2,
        cy: box.y + box.height / 2,
        attrWidth: rawWidth === null ? null : Number(rawWidth),
        strokeWidth: Number(marker.getAttribute('stroke-width') ?? '0'),
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

  // Every curve in this fixture carries the identical equal-brightness default,
  // so their points are exactly coincident and a real mouse hover only ever
  // reaches the topmost one. Dispatching `pointerenter` at a specific hit
  // circle addresses one curve regardless of stacking, and drives the very
  // same `_hoveredPoint` state a real pointer would. The real-pointer and drag
  // cases below cover the path this bypasses, on the topmost curve.
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

  /** Poll until the transform transition (150ms) has settled on `scale`. */
  async function settledAt(
    page: import('@playwright/test').Page,
    curveIdx: number,
    pointIdx: number,
    before: MarkerBox,
    scale: number
  ): Promise<MarkerBox> {
    await expect
      .poll(async () => (await markerBox(page, curveIdx, pointIdx)).width / before.width, {
        timeout: 2_000,
      })
      .toBeGreaterThan(scale - 0.02);
    return markerBox(page, curveIdx, pointIdx);
  }

  // LEGEND_SHAPES order. Curve N uses shape N, so five members cover all five.
  const SHAPES = [
    { curveIdx: 0, shape: 'shape-circle', tag: 'circle' },
    { curveIdx: 1, shape: 'shape-square', tag: 'rect' },
    { curveIdx: 2, shape: 'shape-diamond', tag: 'rect' },
    { curveIdx: 3, shape: 'shape-triangle', tag: 'polygon' },
    { curveIdx: 4, shape: 'shape-bar', tag: 'rect' },
  ] as const;

  for (const { curveIdx, shape, tag } of SHAPES) {
    test(`${shape} marker enlarges by the hover scale`, async ({ page }) => {
      const pointIdx = 1;
      const before = await markerBox(page, curveIdx, pointIdx);
      expect(before.tag).toBe(tag);
      expect(before.cls).toContain(shape);
      expect(before.width).toBeGreaterThan(0);

      await hoverPoint(page, curveIdx, pointIdx);
      const after = await settledAt(page, curveIdx, pointIdx, before, HOVER_SCALE);

      // Pinned to the real 1.25, not merely "bigger": a regression to a scale
      // of 1.05 is still a regression.
      expect(after.width / before.width).toBeCloseTo(HOVER_SCALE, 1);
      expect(after.height / before.height).toBeCloseTo(HOVER_SCALE, 1);
      expect(after.cls).toContain('hovered');

      // transform-box: fill-box + transform-origin: center. Without them the
      // scale resolves against the SVG viewport and the marker slides off its
      // own point instead of growing in place.
      expect(after.cx).toBeCloseTo(before.cx, 0);
      expect(after.cy).toBeCloseTo(before.cy, 0);
    });
  }

  test('the diamond is a rotated square, and it grows about its own centre', async ({ page }) => {
    // The diamond's 45deg turn used to be a `transform="rotate(45 cx cy)"`
    // presentation attribute. A CSS transform overrides that attribute
    // outright, so the turn moved into `--cp-rotate` to compose with the
    // scale. Two things have to stay true, and neither is visible to jsdom:
    // the rotation still happens, and it pivots on the marker's own box.
    const curveIdx = 2;
    const pointIdx = 1;
    const before = await markerBox(page, curveIdx, pointIdx);
    expect(before.tag).toBe('rect');
    expect(before.cls).toContain('shape-diamond');
    expect(before.attrWidth).not.toBeNull();

    // A square of side s turned 45deg has an axis-aligned box of s*sqrt(2).
    // Unrotated, the box would be the side plus the stroke and nothing more.
    const side = before.attrWidth! + before.strokeWidth;
    expect(before.width / side).toBeCloseTo(Math.SQRT2, 1);
    expect(before.height / side).toBeCloseTo(Math.SQRT2, 1);

    // The rotation pivots on the marker, so the box stays centred on the point
    // it belongs to -- the check that fails loudly if `transform-box` is lost.
    const point = await pointScreenPos(page, curveIdx, pointIdx);
    expect(before.cx).toBeCloseTo(point.x, 0);
    expect(before.cy).toBeCloseTo(point.y, 0);

    await hoverPoint(page, curveIdx, pointIdx);
    const after = await settledAt(page, curveIdx, pointIdx, before, HOVER_SCALE);

    // Rotation survives composition with the scale, and the centre holds.
    expect(after.width / after.height).toBeCloseTo(1, 1);
    expect(after.width / before.width).toBeCloseTo(HOVER_SCALE, 1);
    expect(after.cx).toBeCloseTo(point.x, 0);
    expect(after.cy).toBeCloseTo(point.y, 0);
  });

  test('a non-circle marker also enlarges under a real pointer', async ({ page }) => {
    // Curve 4 renders last with nothing selected, so it is the marker a real
    // pointer reaches at the shared point position.
    const before = await markerBox(page, 4, 1);
    expect(before.cls).toContain('shape-bar');

    const pos = await pointScreenPos(page, 4, 1);
    await page.mouse.move(pos.x, pos.y);
    const after = await settledAt(page, 4, 1, before, HOVER_SCALE);
    expect(after.cls).toContain('hovered');
    expect(after.width / before.width).toBeCloseTo(HOVER_SCALE, 1);
  });

  test('keyboard focus grows a marker too', async ({ page }) => {
    // Focus has to land on the curve that is already rendered last. Taking
    // focus dispatches `focus-curve`; the card selects that curve and
    // `_orderedCurves` moves it to the end, and that DOM churn drops the focus
    // the user just took. For the curve already at the end there is no move.
    // The bug the other curves hit is tracked in TODOS.md as a graph-a11y P2.
    const curveIdx = 4;
    const pointIdx = 1;
    const before = await markerBox(page, curveIdx, pointIdx);

    await page.evaluate(
      ({ curveIdx, pointIdx }) => {
        const card = window.__LIGHTENER_CARD_ELEMENT__!;
        const graph = card.renderRoot.querySelector('curve-graph')!;
        const hit = graph.shadowRoot!.querySelector(
          `.hit-circle[data-curve="${curveIdx}"][data-point="${pointIdx}"]`
        ) as SVGElement;
        hit.focus();
      },
      { curveIdx, pointIdx }
    );

    const after = await settledAt(page, curveIdx, pointIdx, before, HOVER_SCALE);
    expect(after.cls).toContain('focused');
    expect(after.width / before.width).toBeCloseTo(HOVER_SCALE, 1);
    expect(after.cx).toBeCloseTo(before.cx, 0);
  });

  test('dragging grows a marker by the larger drag scale', async ({ page }) => {
    const curveIdx = 4;
    const pointIdx = 1;
    const before = await markerBox(page, curveIdx, pointIdx);

    const pos = await pointScreenPos(page, curveIdx, pointIdx);
    await page.mouse.move(pos.x, pos.y);
    await page.mouse.down();
    // Stay on the point: this measures the dragging state, not a moved point.
    await page.mouse.move(pos.x, pos.y);

    const after = await settledAt(page, curveIdx, pointIdx, before, DRAG_SCALE);
    expect(after.cls).toContain('dragging');
    expect(after.width / before.width).toBeCloseTo(DRAG_SCALE, 1);

    await page.mouse.up();
  });
});
