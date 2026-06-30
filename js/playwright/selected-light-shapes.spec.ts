import { expect, test } from '@playwright/test';
import { CURVE_PRESETS } from '../src/utils/presets';

const FIXTURE = '/js/playwright/fixtures/selected-light-shapes-card.html';

const DIM_ACCENT_POINTS = CURVE_PRESETS.find((p) => p.id === 'dim_accent')!.controlPoints;
const NIGHT_MODE_POINTS = CURVE_PRESETS.find((p) => p.id === 'night_mode')!.controlPoints;
const LINEAR_DEFAULT_POINTS = CURVE_PRESETS.find((p) => p.id === 'linear')!.controlPoints;

type Point = { lightener: number; target: number };

type ShapeSnapshot = {
  hasPanel: boolean;
  hasEmptyPanel: boolean;
  shapeButtonCount: number;
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
  wsCalls: Array<{ type?: string }>;
};

async function waitForCard(page: import('@playwright/test').Page): Promise<void> {
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
}

async function selectLight(page: import('@playwright/test').Page, entityId: string): Promise<void> {
  await page.evaluate(async (targetEntityId) => {
    const card = window.__LIGHTENER_CARD_ELEMENT__!;
    const legend = card.renderRoot.querySelector('curve-legend')!;
    legend.dispatchEvent(
      new CustomEvent('select-curve', {
        detail: { entityId: targetEntityId },
        bubbles: true,
        composed: true,
      })
    );
    await card.updateComplete;
  }, entityId);
  await waitForCard(page);
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
      hasEmptyPanel: card.renderRoot.querySelector('.presets-panel.empty') !== null,
      shapeButtonCount: card.renderRoot.querySelectorAll('.preset-option').length,
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
  test('initial load shows the empty Shapes slot without auto-opening shape buttons', async ({
    page,
  }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

    const snap = await readSnapshot(page);
    expect(snap.hasPanel).toBe(true);
    expect(snap.hasEmptyPanel).toBe(true);
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

    await page.locator('.preset-option').filter({ hasText: 'Night mode' }).hover();
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

    await page.locator('.presets-header').hover();
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

    await page.locator('.preset-option').filter({ hasText: 'Night mode' }).hover();
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

    await page.locator('.preset-option').filter({ hasText: 'Dim accent' }).click();
    await waitForCard(page);

    const after = await readSnapshot(page);
    expect(after.hasPanel).toBe(true);
    expect(after.hasEmptyPanel).toBe(false);
    expect(after.shapeButtonCount).toBe(CURVE_PRESETS.length);
    expect(after.selectedCurveId).toBe('light.a');
    expect(after.trialPresetId).toBeNull();
    expect(after.previewCurveId).toBeNull();
    expect(after.realCurvePoints).toEqual([DIM_ACCENT_POINTS, LINEAR_DEFAULT_POINTS]);
    expect(after.graphReadOnly).toBe(false);
    expect(after.isDirty).toBe(true);
    expect(after.undoLength).toBe(1);
    expectNoExternalSideEffects(after);
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
      const panel = card.renderRoot.querySelector('.presets-panel')!.getBoundingClientRect();
      const buttons = Array.from(card.renderRoot.querySelectorAll('.preset-option')).map((button) =>
        button.getBoundingClientRect()
      );
      return {
        panelLeft: panel.left,
        panelRight: panel.right,
        buttonRects: buttons.map((rect) => ({ left: rect.left, right: rect.right })),
        bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(layout.bodyOverflow).toBeLessThanOrEqual(1);
    for (const rect of layout.buttonRects) {
      expect(rect.left).toBeGreaterThanOrEqual(layout.panelLeft - 0.5);
      expect(rect.right).toBeLessThanOrEqual(layout.panelRight + 0.5);
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
      const button = Array.from(card.shadowRoot.querySelectorAll('.preset-option')).find((el) =>
        (el as HTMLElement).textContent?.includes('Night mode')
      ) as HTMLElement | undefined;
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
