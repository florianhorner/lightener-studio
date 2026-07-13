import { devices, expect, test } from '@playwright/test';
import { CURVE_PRESETS } from '../src/utils/presets';

const FIXTURE = '/js/playwright/fixtures/selected-light-shapes-card.html';

const DIM_ACCENT_POINTS = CURVE_PRESETS.find((p) => p.id === 'dim_accent')!.controlPoints;
const NIGHT_MODE_POINTS = CURVE_PRESETS.find((p) => p.id === 'night_mode')!.controlPoints;
const LINEAR_DEFAULT_POINTS = CURVE_PRESETS.find((p) => p.id === 'linear')!.controlPoints;
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

// Covers the size/orientation range mobile users actually hit: smallest and
// largest common phones, a representative Android, a tablet that straddles
// the 860px two-column container-query breakpoint, and one landscape case.
const TOUCH_DEVICES = [
  { name: 'iPhone SE', device: 'iPhone SE' },
  { name: 'iPhone 13', device: 'iPhone 13' },
  { name: 'iPhone 15 Pro Max', device: 'iPhone 15 Pro Max' },
  { name: 'Pixel 7', device: 'Pixel 7' },
  { name: 'iPad Mini', device: 'iPad Mini' },
  { name: 'iPhone 13 landscape', device: 'iPhone 13 landscape' },
] as const;

type Point = { lightener: number; target: number };

type ShapeSnapshot = {
  hasPanel: boolean;
  hasWorkbench: boolean;
  hasReserve: boolean;
  hasChipBar: boolean;
  shapeButtonCount: number;
  shapeLabels: string[];
  graphReadOnly: boolean;
  graphCurvePoints: Point[][];
  previewCurveId: string | null;
  previewCurvePoints: Point[] | null;
  realCurvePoints: Point[][];
  trialPresetId: string | null;
  selectedCurveId: string | null;
  isDirty: boolean;
  undoLength: number;
  storedState: string | null;
  savedPayloads: Record<string, unknown>[];
  serviceCalls: unknown[][];
  wsCalls: Array<Record<string, unknown> & { type?: string }>;
};

function isContextDestroyed(error: unknown): boolean {
  return String(error).includes('Execution context was destroyed');
}

async function waitForCard(page: import('@playwright/test').Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
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
      return;
    } catch (error) {
      if (!isContextDestroyed(error) || attempt === 2) throw error;
      await page.waitForLoadState('domcontentloaded');
    }
  }
}

async function selectLight(page: import('@playwright/test').Page, entityId: string): Promise<void> {
  const row = page.locator('curve-legend .row-select-btn').filter({ hasText: entityId });
  await expect(row).toHaveCount(1);
  await row.click();
  await waitForCard(page);
}

async function scrollGraphIntoView(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async () => {
    const card = window.__LIGHTENER_CARD_ELEMENT__!;
    const graph = card.renderRoot.querySelector('curve-graph')!;
    graph.scrollIntoView({ block: 'center', inline: 'center' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function readSnapshot(page: import('@playwright/test').Page): Promise<ShapeSnapshot> {
  return page.evaluate(() => {
    const card = window.__LIGHTENER_CARD_ELEMENT__ as unknown as {
      renderRoot: ShadowRoot;
      _presetGraphTrial: { id: string } | null;
      _selectedCurveId: string | null;
      _dirtyVersion: number;
      _cleanVersion: number;
      _undoStack: unknown[];
      _curves: { controlPoints: Point[] }[];
    };
    const graph = card.renderRoot.querySelector('curve-graph') as unknown as {
      curves: { controlPoints: Point[] }[];
      readOnly: boolean;
      previewCurve: { entityId: string; controlPoints: Point[] } | null;
    };
    return {
      hasPanel: card.renderRoot.querySelector('.presets-panel') !== null,
      hasWorkbench: card.renderRoot.querySelector('.graph-workbench') !== null,
      hasReserve: card.renderRoot.querySelector('.shape-chip-reserve') !== null,
      hasChipBar: card.renderRoot.querySelector('.shape-chip-bar') !== null,
      shapeButtonCount: card.renderRoot.querySelectorAll('.preset-option').length,
      shapeLabels: Array.from(card.renderRoot.querySelectorAll('.preset-option')).map(
        (button) => button.textContent?.trim() ?? ''
      ),
      graphReadOnly: graph.readOnly,
      graphCurvePoints: graph.curves.map((c) => c.controlPoints),
      previewCurveId: graph.previewCurve?.entityId ?? null,
      previewCurvePoints: graph.previewCurve?.controlPoints ?? null,
      realCurvePoints: card._curves.map((c) => c.controlPoints),
      trialPresetId: card._presetGraphTrial?.id ?? null,
      selectedCurveId: card._selectedCurveId,
      isDirty: card._dirtyVersion !== card._cleanVersion,
      undoLength: card._undoStack.length,
      storedState: sessionStorage.getItem('lightener:curve-card:v1:light.lightener'),
      savedPayloads: window.__LIGHTENER_SAVED__ ?? [],
      serviceCalls: window.__LIGHTENER_SERVICE_CALLS__ ?? [],
      wsCalls: window.__LIGHTENER_WS_CALLS__ ?? [],
    };
  });
}

function expectNoExternalSideEffects(snap: ShapeSnapshot): void {
  expect(snap.savedPayloads, 'shape trial does not record save payloads').toEqual([]);
  expect(snap.serviceCalls, 'shape trial does not call live light services').toEqual([]);
  expect(
    snap.wsCalls.filter((call) => call.type === 'lightener/save_curves'),
    'shape trial does not call save_curves'
  ).toHaveLength(0);
}

test.describe('selected-light Shapes flow (real browser)', () => {
  test('initial load keeps selected-light shape chips hidden until selection', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

    const snap = await readSnapshot(page);
    expect(snap.hasPanel).toBe(false);
    // The workbench stays mounted with a height-reserving placeholder (not the
    // interactive chip bar) so the graph never shifts when a light is
    // (de)selected. No real chips are present until a light is selected.
    expect(snap.hasWorkbench).toBe(true);
    expect(snap.hasReserve).toBe(true);
    expect(snap.hasChipBar).toBe(false);
    expect(snap.shapeButtonCount).toBe(0);
    expect(snap.selectedCurveId).toBeNull();
    expect(snap.trialPresetId).toBeNull();
    expect(snap.previewCurveId).toBeNull();
    expect(snap.graphReadOnly).toBe(false);
    expect(snap.graphCurvePoints).toEqual([LINEAR_DEFAULT_POINTS, LINEAR_DEFAULT_POINTS]);
    expect(snap.realCurvePoints).toEqual([LINEAR_DEFAULT_POINTS, LINEAR_DEFAULT_POINTS]);
    expect(snap.isDirty).toBe(false);
    expect(snap.undoLength).toBe(0);
    expectNoExternalSideEffects(snap);
  });

  test('hovering a shape shimmers only the selected light, then clears on leave', async ({
    page,
  }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
    await selectLight(page, 'light.a');

    await page.locator('.preset-option[data-preset="night_mode"]').hover();
    await expect
      .poll(() => readSnapshot(page).then((snap) => snap.trialPresetId))
      .toBe('night_mode');

    const trial = await readSnapshot(page);
    expect(trial.selectedCurveId).toBe('light.a');
    expect(trial.previewCurveId).toBe('light.a');
    expect(trial.previewCurvePoints).toEqual(NIGHT_MODE_POINTS);
    expect(trial.graphCurvePoints).toEqual([LINEAR_DEFAULT_POINTS, LINEAR_DEFAULT_POINTS]);
    expect(trial.realCurvePoints).toEqual([LINEAR_DEFAULT_POINTS, LINEAR_DEFAULT_POINTS]);
    expect(trial.isDirty).toBe(false);
    expect(trial.undoLength).toBe(0);
    expectNoExternalSideEffects(trial);
    const overlay = await page.evaluate(() => {
      const card = window.__LIGHTENER_CARD_ELEMENT__!;
      const graph = card.renderRoot.querySelector('curve-graph')!;
      const line = graph.shadowRoot?.querySelector('.preview-curve-line');
      return {
        exists: line !== null,
        animationName: line ? getComputedStyle(line).animationName : null,
      };
    });
    expect(overlay.exists).toBe(true);
    expect(overlay.animationName).toContain('preview');

    await page.locator('curve-graph').hover();
    await expect.poll(() => readSnapshot(page).then((snap) => snap.previewCurveId)).toBeNull();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const card = window.__LIGHTENER_CARD_ELEMENT__!;
          const graph = card.renderRoot.querySelector('curve-graph')!;
          return graph.shadowRoot?.querySelector('.preview-curve-line') !== null;
        })
      )
      .toBe(false);
  });

  test('desktop trial insight keeps the shape title readable', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 820 });
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
    await selectLight(page, 'light.a');

    await page.locator('.preset-option[data-preset="night_mode"]').hover();
    await expect
      .poll(() => readSnapshot(page).then((snap) => snap.trialPresetId))
      .toBe('night_mode');

    const titleFit = await page.evaluate(() => {
      const card = window.__LIGHTENER_CARD_ELEMENT__!;
      const primary = card.renderRoot.querySelector('.graph-insight-primary') as HTMLElement | null;
      return {
        text: primary?.textContent?.trim() ?? '',
        fits: primary ? primary.scrollWidth <= primary.clientWidth + 1 : false,
      };
    });
    expect(titleFit.text).toBe('Trying Night mode');
    expect(titleFit.fits).toBe(true);
  });

  test('clicking a shape applies it to the selected light only', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
    await selectLight(page, 'light.a');

    await page.locator('.preset-option[data-preset="dim_accent"]').click();
    await waitForCard(page);

    const after = await readSnapshot(page);
    expect(after.hasPanel).toBe(false);
    expect(after.hasWorkbench).toBe(true);
    // With a light selected the interactive chip bar replaces the placeholder.
    expect(after.hasReserve).toBe(false);
    expect(after.hasChipBar).toBe(true);
    expect(after.shapeButtonCount).toBe(CURVE_PRESETS.length);
    expect(after.shapeLabels).toEqual(['Equal', 'Dim', 'Late', 'Night']);
    expect(after.selectedCurveId).toBe('light.a');
    expect(after.trialPresetId).toBeNull();
    expect(after.previewCurveId).toBeNull();
    expect(after.realCurvePoints).toEqual([DIM_ACCENT_POINTS, LINEAR_DEFAULT_POINTS]);
    expect(after.graphReadOnly).toBe(false);
    expect(after.isDirty).toBe(true);
    expect(after.undoLength).toBe(1);
    expectNoExternalSideEffects(after);
  });

  test('batch edit preserves existing Shapes, then the new light saves through the normal payload', async ({
    page,
  }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
    await selectLight(page, 'light.a');

    await page.locator('.preset-option[data-preset="dim_accent"]').click();
    await page.evaluate(async () => {
      await window.__LIGHTENER_CARD_ELEMENT__!.saveCurves();
    });

    await page.locator('.add-light-btn').click();
    const dialog = page.locator('light-membership-dialog');
    await expect(dialog).toHaveCount(1);
    const newLight = dialog.locator('.light-row').filter({ hasText: 'light.new' });
    await expect(newLight).toHaveCount(1);
    await newLight.locator('input[type="checkbox"]').check();
    await dialog.getByRole('button', { name: 'Update lights' }).click();

    await expect(dialog).toHaveCount(0);
    const added = await readSnapshot(page);
    expect(added.realCurvePoints).toEqual([
      DIM_ACCENT_POINTS,
      LINEAR_DEFAULT_POINTS,
      LINEAR_DEFAULT_POINTS,
    ]);
    expect(added.selectedCurveId).toBe('light.new');
    expect(added.isDirty).toBe(false);
    expect(added.wsCalls.filter((call) => call.type === 'lightener/set_controlled_lights')).toEqual(
      [
        expect.objectContaining({
          controlled_entity_ids: ['light.a', 'light.b', 'light.new'],
          observed_controlled_entity_ids: ['light.a', 'light.b'],
        }),
      ]
    );
    expect(added.wsCalls.some((call) => call.type === 'lightener/add_light')).toBe(false);

    await page.locator('.preset-option[data-preset="dim_accent"]').click();
    await expect.poll(() => readSnapshot(page).then((snap) => snap.isDirty)).toBe(true);
    await page.evaluate(async () => {
      await window.__LIGHTENER_CARD_ELEMENT__!.saveCurves();
    });

    const saved = await readSnapshot(page);
    expect(saved.savedPayloads).toHaveLength(2);
    expect(saved.savedPayloads[1]).toMatchObject({
      'light.new': { brightness: { '1': '1', '25': '8', '50': '20', '100': '45' } },
    });
  });

  test('hovering light rows keeps row and card height stable', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

    const before = await page.evaluate(() => {
      const card = window.__LIGHTENER_CARD_ELEMENT__!;
      return {
        cardHeight: card.getBoundingClientRect().height,
        rowHeights: Array.from(card.renderRoot.querySelectorAll('.legend-item')).map(
          (item) => item.getBoundingClientRect().height
        ),
      };
    });

    await page.locator('.legend-item').first().hover();
    await waitForCard(page);

    const after = await page.evaluate(() => {
      const card = window.__LIGHTENER_CARD_ELEMENT__!;
      return {
        cardHeight: card.getBoundingClientRect().height,
        rowHeights: Array.from(card.renderRoot.querySelectorAll('.legend-item')).map(
          (item) => item.getBoundingClientRect().height
        ),
      };
    });

    expect(Math.abs(after.cardHeight - before.cardHeight)).toBeLessThan(0.5);
    const maxRowDelta = Math.max(
      ...before.rowHeights.map((height, idx) => Math.abs(height - after.rowHeights[idx]))
    );
    expect(maxRowDelta).toBeLessThan(0.5);
  });

  test('shape buttons fit at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 760 });
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
    await selectLight(page, 'light.a');

    const layout = await page.evaluate(() => {
      const card = window.__LIGHTENER_CARD_ELEMENT__!;
      const chipBar = card.renderRoot.querySelector('.shape-chip-bar')!.getBoundingClientRect();
      const buttons = Array.from(card.renderRoot.querySelectorAll('.preset-option')).map((button) =>
        button.getBoundingClientRect()
      );
      return {
        chipBarLeft: chipBar.left,
        chipBarRight: chipBar.right,
        buttonRects: buttons.map((rect) => ({ left: rect.left, right: rect.right })),
        bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(layout.bodyOverflow).toBeLessThanOrEqual(1);
    expect(layout.buttonRects).toHaveLength(CURVE_PRESETS.length);
    for (const rect of layout.buttonRects) {
      expect(rect.left).toBeGreaterThanOrEqual(layout.chipBarLeft - 0.5);
      expect(rect.right).toBeLessThanOrEqual(layout.chipBarRight + 0.5);
    }
  });

  test('public demo mirrors the temporary shape shimmer between light and dark cards', async ({
    page,
  }) => {
    await page.goto('/docs/index.html');
    await page.waitForFunction(() => {
      const light = document.getElementById('card-light');
      const dark = document.getElementById('card-dark');
      return (
        light?.shadowRoot?.querySelector('curve-legend') &&
        dark?.shadowRoot?.querySelector('curve-graph') &&
        (light as any)._curves?.length > 0 &&
        (light as any)._load?.loaded === true &&
        (dark as any)._load?.loaded === true
      );
    });

    const selectedEntityId = await page.evaluate(async () => {
      const card = document.getElementById('card-light') as any;
      const legend = card.shadowRoot.querySelector('curve-legend')!;
      const targetCurveId = card._selectedCurveId ?? card._curves[0].entityId;
      if (card._selectedCurveId !== targetCurveId) {
        legend.dispatchEvent(
          new CustomEvent('select-curve', {
            detail: { entityId: targetCurveId },
            bubbles: true,
            composed: true,
          })
        );
        await card.updateComplete;
      }
      return targetCurveId;
    });

    await expect
      .poll(() =>
        page.evaluate((expectedEntityId) => {
          const light = document.getElementById('card-light') as any;
          const dark = document.getElementById('card-dark') as any;
          return (
            light._selectedCurveId === expectedEntityId &&
            dark._selectedCurveId === expectedEntityId
          );
        }, selectedEntityId)
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const card = document.getElementById('card-light');
          return card?.shadowRoot?.querySelectorAll('.preset-option').length ?? 0;
        })
      )
      .toBeGreaterThan(0);

    await page.evaluate(async () => {
      const card = document.getElementById('card-light') as any;
      const button = card.shadowRoot.querySelector(
        '.preset-option[data-preset="night_mode"]'
      ) as HTMLElement | null;
      if (!button) throw new Error('Night mode shape button not found');
      button.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
      await card.updateComplete;
      await card.shadowRoot.querySelector('curve-graph')?.updateComplete;
    });

    await expect
      .poll(() =>
        page.evaluate(() => {
          const light = document.getElementById('card-light') as any;
          const dark = document.getElementById('card-dark') as any;
          const darkGraph = dark.shadowRoot.querySelector('curve-graph') as any;
          return {
            lightTrial: light._presetGraphTrial?.id ?? null,
            darkTrial: dark._presetGraphTrial?.id ?? null,
            darkPreview: darkGraph.previewCurve?.entityId ?? null,
          };
        })
      )
      .toEqual({
        lightTrial: 'night_mode',
        darkTrial: 'night_mode',
        darkPreview: selectedEntityId,
      });
  });
});

async function touchDrag(
  page: import('@playwright/test').Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 8
): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from.x, y: from.y }],
  });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + (to.x - from.x) * (i / steps);
    const y = from.y + (to.y - from.y) * (i / steps);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y }],
    });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function graphPointScreenPos(
  page: import('@playwright/test').Page,
  curveIdx: number,
  pointIdx: number
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    async ({ curveIdx, pointIdx }) => {
      const card = window.__LIGHTENER_CARD_ELEMENT__!;
      const graph = card.renderRoot.querySelector('curve-graph')!;
      graph.scrollIntoView({ block: 'center', inline: 'nearest' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const svg = graph.shadowRoot!.querySelector('svg')!;
      const circle = graph.shadowRoot!.querySelector(
        `.hit-circle[data-curve="${curveIdx}"][data-point="${pointIdx}"]`
      )!;
      const ctm = svg.getScreenCTM()!;
      const pt = svg.createSVGPoint();
      pt.x = Number(circle.getAttribute('cx'));
      pt.y = Number(circle.getAttribute('cy'));
      const screenPt = pt.matrixTransform(ctm);
      return { x: screenPt.x, y: screenPt.y };
    },
    { curveIdx, pointIdx }
  );
}

// Uses the SVG's own screen CTM (the same transform `_getSvgCoords` in
// curve-graph.ts relies on) rather than a naive bounding-rect scale, since
// `preserveAspectRatio="xMidYMid meet"` letterboxes at extreme aspect ratios
// (e.g. iPhone SE portrait, iPhone 13 landscape) and a linear rect scale
// would compute the wrong screen point there.
async function graphFractionScreenPos(
  page: import('@playwright/test').Page,
  fx: number,
  fy: number
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    async ({ fx, fy }) => {
      const card = window.__LIGHTENER_CARD_ELEMENT__!;
      const graph = card.renderRoot.querySelector('curve-graph')!;
      graph.scrollIntoView({ block: 'center', inline: 'nearest' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const svg = graph.shadowRoot!.querySelector('svg')!;
      const hitArea = graph.shadowRoot!.querySelector('.hit-area')!;
      const hitX = Number(hitArea.getAttribute('x'));
      const hitY = Number(hitArea.getAttribute('y'));
      const hitWidth = Number(hitArea.getAttribute('width'));
      const hitHeight = Number(hitArea.getAttribute('height'));
      const ctm = svg.getScreenCTM()!;
      const pt = svg.createSVGPoint();
      pt.x = hitX + hitWidth * fx;
      pt.y = hitY + hitHeight * fy;
      const screenPt = pt.matrixTransform(ctm);
      return { x: screenPt.x, y: screenPt.y };
    },
    { fx, fy }
  );
}

for (const { name, device } of TOUCH_DEVICES) {
  test.describe(`mobile graph touch editing (built bundle) — ${name}`, () => {
    test.use(touchContext(device));

    test('double-tapping the graph hit area adds one point to the selected curve', async ({
      page,
    }) => {
      await page.goto(FIXTURE);
      await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
      await selectLight(page, 'light.a');
      await scrollGraphIntoView(page);

      const before = await readSnapshot(page);
      const tapTarget = await graphFractionScreenPos(page, 0.4, 0.4);

      await page.touchscreen.tap(tapTarget.x, tapTarget.y);
      await page.waitForTimeout(120);
      await page.touchscreen.tap(tapTarget.x, tapTarget.y);
      await waitForCard(page);

      const after = await readSnapshot(page);
      expect(after.selectedCurveId).toBe('light.a');
      expect(after.realCurvePoints[0]).toHaveLength(before.realCurvePoints[0].length + 1);
      expect(after.realCurvePoints[1]).toEqual(before.realCurvePoints[1]);
      expect(
        after.realCurvePoints[0].some(
          (point) => Math.abs(point.lightener - 40) <= 1 && Math.abs(point.target - 60) <= 2
        )
      ).toBe(true);
      expect(after.isDirty).toBe(true);
      expect(after.undoLength).toBe(before.undoLength + 1);
      expectNoExternalSideEffects(after);
    });

    test('dragging an existing point via touch still works with the hit-area overlay present', async ({
      page,
    }) => {
      // Regression check for the double-tap hit-area (a full-graph transparent
      // rect with pointer-events:all) landing underneath the point circles in
      // paint order and not intercepting drags meant for an existing point.
      await page.goto(FIXTURE);
      await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
      await selectLight(page, 'light.a');
      await scrollGraphIntoView(page);

      const before = await readSnapshot(page);
      const draggedPointBefore = before.realCurvePoints[0][1];
      expect(draggedPointBefore).toBeDefined();

      const from = await graphPointScreenPos(page, 0, 1);
      const to = await graphFractionScreenPos(page, 0.5, 0.3);
      await touchDrag(page, from, to);
      await waitForCard(page);

      const after = await readSnapshot(page);
      expect(after.selectedCurveId).toBe('light.a');
      expect(after.realCurvePoints[0]).toHaveLength(before.realCurvePoints[0].length);
      expect(after.realCurvePoints[1]).toEqual(before.realCurvePoints[1]);
      const draggedPointAfter = after.realCurvePoints[0][1];
      expect(draggedPointAfter).not.toEqual(draggedPointBefore);
      expect(after.isDirty).toBe(true);
      expectNoExternalSideEffects(after);
    });
  });
}

declare global {
  interface Window {
    __LIGHTENER_CARD_READY__: Promise<void>;
    __LIGHTENER_CARD_ELEMENT__?: HTMLElement & {
      renderRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    __LIGHTENER_SAVED__?: Record<string, unknown>[];
    __LIGHTENER_WS_CALLS__?: Array<{ type?: string }>;
    __LIGHTENER_SERVICE_CALLS__?: unknown[][];
  }
}
