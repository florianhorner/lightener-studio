import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURVE_PRESETS } from '../src/utils/presets';
import { curvesToWsPayload } from '../src/utils/data';

const PROOF = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../.context/proof/template-review'
);
const LEGACY = {
  'light.example_0': { brightness: { '1': '1', '20': '3', '50': '10', '100': '25' } },
  'light.example_1': { brightness: { '1': '1', '45': '1', '70': '45', '100': '100' } },
  'light.example_2': { brightness: { '1': '1', '25': '8', '50': '20', '100': '45' } },
};

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const fixture = (window as any).__SHAPES_FIXTURE__;
    return {
      points: fixture.card._curves[0].controlPoints,
      dirty: fixture.card.dirty,
      backend: fixture.backendSnapshot(),
      saves: fixture.savedPayloads,
    };
  });
}

for (const mobile of [false, true]) {
  const size = mobile ? 'mobile' : 'desktop';
  test.describe(`starting shapes — ${size}`, () => {
    test.use({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: 'reduce',
    });

    test.beforeEach(async ({ page }) => {
      // Rebuilding must not trigger a Vite reload during the persistence proof.
      await page.route('**/@vite/client', (route) =>
        route.fulfill({ contentType: 'application/javascript', body: '' })
      );
      await page.addInitScript(
        ({ seed, backend }) => {
          const key = `lightener:starting-shapes-fixture:v1:${seed}`;
          if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(backend));
        },
        { seed: test.info().testId, backend: LEGACY }
      );
    });

    for (const preset of CURVE_PRESETS) {
      test(`${preset.id} applies, undoes, saves and reloads without rewriting saved siblings`, async ({
        page,
      }) => {
        await page.goto(
          `/js/playwright/fixtures/starting-shapes-card.html?seed=${test.info().testId}`
        );
        await expect(page.locator('curve-legend .legend-item')).toHaveCount(3);
        await page
          .locator('curve-legend')
          .getByRole('button', { name: /^Ceiling Light(?: \d+%| <1%| Off)?$/ })
          .click();
        const chips = page.locator('.preset-option');
        await expect(chips).toHaveText(['Equal', 'Dim', 'Early', 'Late']);
        await expect(page.locator('[data-preset="night_mode"]')).toHaveCount(0);
        const initial = await snapshot(page);
        expect(initial.backend).toEqual(LEGACY);
        expect(initial.dirty).toBe(false);
        expect(initial.saves).toEqual([]);

        const chip = page.locator(`[data-preset="${preset.id}"]`);
        await chip.click();
        await expect.poll(() => snapshot(page).then((s) => s.points)).toEqual(preset.controlPoints);
        await expect.poll(() => snapshot(page).then((s) => s.dirty)).toBe(true);
        await page.getByRole('button', { name: 'Undo', exact: true }).click();
        await expect.poll(() => snapshot(page).then((s) => s.points)).toEqual(initial.points);
        await expect.poll(() => snapshot(page).then((s) => s.dirty)).toBe(false);
        await chip.click();
        await expect.poll(() => snapshot(page).then((s) => s.points)).toEqual(preset.controlPoints);

        const addedAt =
          preset.id === 'linear'
            ? [50]
            : preset.id === 'early_starter'
              ? [15, 65]
              : preset.id === 'late_starter'
                ? [60, 70, 80, 90]
                : [];
        for (const room of addedAt) {
          const index = preset.controlPoints.findIndex((point) => point.lightener === room);
          const hit = page.locator(
            `curve-graph .hit-circle[data-curve="0"][data-point="${index}"]`
          );
          await page.locator('curve-graph').scrollIntoViewIfNeeded();
          await page.locator('curve-graph').evaluate((graph) => {
            (window as any).__SHAPE_POINT_HIT__ = null;
            graph.addEventListener(
              'pointerdown',
              (event) => {
                const hit = event
                  .composedPath()
                  .find(
                    (node) => node instanceof Element && node.classList.contains('hit-circle')
                  ) as SVGCircleElement | undefined;
                (window as any).__SHAPE_POINT_HIT__ = hit?.dataset.point ?? null;
              },
              { capture: true, once: true }
            );
          });
          if (mobile) await hit.tap();
          else await hit.click();
          expect(await page.evaluate(() => (window as any).__SHAPE_POINT_HIT__)).toBe(
            String(index)
          );
          await hit.focus();
          await page.keyboard.press('ArrowUp');
          await expect
            .poll(() => snapshot(page).then((s) => s.points[index].target))
            .toBe(preset.controlPoints[index].target + 1);
          await page.getByRole('button', { name: 'Undo', exact: true }).click();
          await expect
            .poll(() => snapshot(page).then((s) => s.points))
            .toEqual(preset.controlPoints);
        }

        mkdirSync(PROOF, { recursive: true });
        const save = page.getByRole('button', { name: 'Save changes (Ctrl+S)', exact: true });
        await expect(save).toBeEnabled();
        await expect(page.locator('curve-graph')).toHaveJSProperty('readOnly', false);
        await page.mouse.move(0, 0);
        await page.screenshot({ path: resolve(PROOF, `${size}-${preset.id}.png`), fullPage: true });
        await save.click();
        await expect.poll(() => snapshot(page).then((s) => s.dirty)).toBe(false);
        const payload = curvesToWsPayload([
          {
            entityId: 'light.example_0',
            friendlyName: 'Ceiling Light',
            visible: true,
            color: '#42a5f5',
            controlPoints: preset.controlPoints,
          },
        ]);
        const expected = { ...LEGACY, ...payload };
        expect((await snapshot(page)).backend).toEqual(expected);

        await page.reload();
        await expect(page.locator('curve-legend .legend-item')).toHaveCount(3);
        await expect.poll(() => snapshot(page).then((s) => s.points)).toEqual(preset.controlPoints);
        expect((await snapshot(page)).backend).toEqual(expected);
        expect((await snapshot(page)).dirty).toBe(false);
      });
    }
  });
}
