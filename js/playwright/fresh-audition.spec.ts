import { expect, test } from '@playwright/test';
import { CURVE_PRESETS } from '../src/utils/presets';

// Real-browser (Chromium) regression for the fresh-group "starting-shape
// audition". jsdom unit tests cover the wiring; this exercises the SHIPPED
// bundle under real pointer/focus/click events and real layout, and proves the
// audition is purely a display overlay (no dirty state, no save-payload change).

const FIXTURE = '/js/playwright/fixtures/fresh-audition-card.html';

// Derive expected shapes from the source presets so the test stays in sync if a
// preset's control points change.
const DIM_ACCENT_POINTS = CURVE_PRESETS.find((p) => p.id === 'dim_accent')!.controlPoints;
const LINEAR_DEFAULT_POINTS = CURVE_PRESETS.find((p) => p.id === 'linear')!.controlPoints;

type Point = { lightener: number; target: number };

type AuditionSnapshot = {
  hasPanel: boolean;
  showPresets: boolean;
  graphReadOnly: boolean;
  graphCurvePoints: Point[][];
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

async function readSnapshot(page: import('@playwright/test').Page): Promise<AuditionSnapshot> {
  return page.evaluate(() => {
    const card = window.__LIGHTENER_CARD_ELEMENT__ as unknown as {
      renderRoot: ShadowRoot;
      _presetGraphTrial: { id: string } | null;
      _showPresets: boolean;
      _selectedCurveId: string | null;
      _dirtyVersion: number;
      _cleanVersion: number;
      _undoStack: unknown[];
      _curves: { controlPoints: Point[] }[];
    };
    const graph = card.renderRoot.querySelector('curve-graph') as unknown as {
      curves: { controlPoints: Point[] }[];
      readOnly: boolean;
    };
    return {
      hasPanel: card.renderRoot.querySelector('.presets-panel') !== null,
      showPresets: card._showPresets,
      graphReadOnly: graph.readOnly,
      graphCurvePoints: graph.curves.map((c) => c.controlPoints),
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

function expectNoExternalSideEffects(snap: AuditionSnapshot): void {
  expect(snap.storedState, 'audition does not write sessionStorage').toBeNull();
  expect(snap.savedPayloads, 'audition does not record save payloads').toEqual([]);
  expect(snap.serviceCalls, 'audition does not call live light services').toEqual([]);
  expect(
    snap.wsCalls.filter((call) => call.type === 'lightener/save_curves'),
    'audition does not call save_curves'
  ).toHaveLength(0);
}

test.describe('fresh-group starting-shape audition (real browser)', () => {
  test('auto-opens a read-only Dim-accent audition with no dirty/undo/payload side effects', async ({
    page,
  }, testInfo) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

    const snap = await readSnapshot(page);
    expect(snap.hasPanel, 'presets panel auto-opens').toBe(true);
    expect(snap.graphReadOnly, 'graph is read-only during the audition').toBe(true);
    expect(snap.trialPresetId).toBe('dim_accent');
    // First light shows the Dim-accent shape; the second stays equal-brightness.
    expect(snap.graphCurvePoints[0]).toEqual(DIM_ACCENT_POINTS);
    expect(snap.graphCurvePoints[1]).toEqual(LINEAR_DEFAULT_POINTS);
    // Purely a display overlay: clean, empty undo, real curves untouched.
    expect(snap.isDirty, 'audition does not dirty the card').toBe(false);
    expect(snap.undoLength, 'audition pushes no undo entry').toBe(0);
    expect(snap.realCurvePoints, 'audition does not mutate the saved curves for any light').toEqual(
      [LINEAR_DEFAULT_POINTS, LINEAR_DEFAULT_POINTS]
    );
    expectNoExternalSideEffects(snap);

    await page.screenshot({
      path: testInfo.outputPath('fresh-audition.png'),
      fullPage: true,
    });
    await testInfo.attach('fresh-audition', {
      path: testInfo.outputPath('fresh-audition.png'),
      contentType: 'image/png',
    });
  });

  test('hovering another preset auditions it; moving the pointer away returns to Dim accent', async ({
    page,
  }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

    const nightMode = page.locator('.preset-option').filter({ hasText: 'Night mode' });
    await nightMode.hover();
    await expect
      .poll(() => page.evaluate(() => window.__LIGHTENER_CARD_ELEMENT__?.['_presetGraphTrial']?.id))
      .toBe('night_mode');

    // Move the real pointer off the button -> pointerleave -> back to Dim accent.
    await page.locator('.presets-header').hover();
    await expect
      .poll(() => page.evaluate(() => window.__LIGHTENER_CARD_ELEMENT__?.['_presetGraphTrial']?.id))
      .toBe('dim_accent');
  });

  test('keyboard focus shows the audition (stale-touch fix regression)', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

    // Simulate a prior touch that, before the fix, left a stale 'touch' pointer
    // type and suppressed the next keyboard-focus audition.
    await page.evaluate(() => {
      const btns = window.__LIGHTENER_CARD_ELEMENT__!.renderRoot.querySelectorAll('.preset-option');
      const night = Array.from(btns).find((b) => b.textContent?.includes('Night mode'))!;
      const down = new Event('pointerdown');
      (down as unknown as { pointerType: string }).pointerType = 'touch';
      night.dispatchEvent(down);
      night.dispatchEvent(new Event('pointerleave'));
    });

    await page.locator('.preset-option').filter({ hasText: 'Late starter' }).focus();
    await expect
      .poll(() => page.evaluate(() => window.__LIGHTENER_CARD_ELEMENT__?.['_presetGraphTrial']?.id))
      .toBe('late_starter');
  });

  test('selecting another light during audition changes only the rendered target', async ({
    page,
  }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

    await page.evaluate(async () => {
      const card = window.__LIGHTENER_CARD_ELEMENT__!;
      const legend = card.renderRoot.querySelector('curve-legend')!;
      legend.dispatchEvent(
        new CustomEvent('select-curve', {
          detail: { entityId: 'light.b' },
          bubbles: true,
          composed: true,
        })
      );
      await card.updateComplete;
    });
    await waitForCard(page);

    const snap = await readSnapshot(page);
    expect(snap.hasPanel).toBe(true);
    expect(snap.graphReadOnly).toBe(true);
    expect(snap.trialPresetId).toBe('dim_accent');
    expect(snap.selectedCurveId).toBe('light.b');
    expect(snap.graphCurvePoints).toEqual([LINEAR_DEFAULT_POINTS, DIM_ACCENT_POINTS]);
    expect(snap.realCurvePoints).toEqual([LINEAR_DEFAULT_POINTS, LINEAR_DEFAULT_POINTS]);
    expect(snap.isDirty).toBe(false);
    expect(snap.undoLength).toBe(0);
    expectNoExternalSideEffects(snap);
  });

  test('clicking Equal brightness accepts without a dirty edit', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

    await page.locator('.preset-option').filter({ hasText: 'Equal brightness' }).click();
    await waitForCard(page);

    const snap = await readSnapshot(page);
    expect(snap.hasPanel).toBe(false);
    expect(snap.showPresets).toBe(false);
    expect(snap.graphReadOnly).toBe(false);
    expect(snap.trialPresetId).toBeNull();
    expect(snap.selectedCurveId).toBeNull();
    expect(snap.graphCurvePoints).toEqual([LINEAR_DEFAULT_POINTS, LINEAR_DEFAULT_POINTS]);
    expect(snap.realCurvePoints).toEqual([LINEAR_DEFAULT_POINTS, LINEAR_DEFAULT_POINTS]);
    expect(snap.isDirty).toBe(false);
    expect(snap.undoLength).toBe(0);
    expectNoExternalSideEffects(snap);
  });

  test('clicking a preset commits one real edit and makes the graph editable', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

    await page.locator('.preset-option').filter({ hasText: 'Dim accent' }).click();
    await waitForCard(page);

    const after = await readSnapshot(page);
    expect(after.hasPanel).toBe(false);
    expect(after.showPresets).toBe(false);
    expect(after.trialPresetId).toBeNull();
    expect(after.isDirty, 'the click is the first real edit').toBe(true);
    expect(after.undoLength, 'exactly one undo entry').toBe(1);
    expect(after.realCurvePoints).toEqual([DIM_ACCENT_POINTS, LINEAR_DEFAULT_POINTS]);
    expect(after.graphReadOnly, 'graph becomes editable once committed').toBe(false);
    expectNoExternalSideEffects(after);
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
