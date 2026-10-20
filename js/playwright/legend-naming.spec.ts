import { expect, test } from '@playwright/test';
import type { LightCurve } from '../src/utils/types';

for (const width of [390, 1100]) {
  test(`light names stay intact as group members change at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    let releaseContract!: () => void;
    const contractGate = new Promise<void>((resolve) => (releaseContract = resolve));
    await page.route('**/tests/fixtures/candidate_lights_v1.json', async (route) => {
      await contractGate;
      await route.continue();
    });
    await page.goto('/js/playwright/fixtures/selected-light-shapes-card.html?members=3');
    let ready = false;
    const cardReady = page
      .waitForFunction(() => window.__LIGHTENER_CARD_ELEMENT__ !== undefined)
      .then(() => (ready = true));
    try {
      // The fixture has not published its initialization promise yet. Waiting
      // for an undefined promise must not let the test touch an absent card.
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      );
      expect(ready).toBe(false);
    } finally {
      releaseContract();
      await cardReady;
    }
    const names = ['Living Room Ceiling Lights', 'Living Room Sofa Lamp', 'Desk light'];
    await page.evaluate(async (labels) => {
      const card = window.__LIGHTENER_CARD_ELEMENT__! as HTMLElement & {
        _curves: LightCurve[];
        updateComplete: Promise<unknown>;
      };
      card._curves = card._curves.map((curve, index) => ({
        ...curve,
        friendlyName: labels[index],
      }));
      await card.updateComplete;
    }, names);
    const legend = page.locator('curve-legend');
    for (const count of [3, 2, 1]) {
      await page.evaluate(async (memberCount) => {
        const card = window.__LIGHTENER_CARD_ELEMENT__! as HTMLElement & {
          _curves: LightCurve[];
          updateComplete: Promise<unknown>;
        };
        card._curves = card._curves.slice(0, memberCount);
        await card.updateComplete;
      }, count);
      await expect(legend.locator('.name')).toHaveText(names.slice(0, count));
      await expect(legend.locator('.prefix')).toHaveCount(0);
      await expect(legend.locator('.entity-id')).toHaveCount(count);
      for (const hint of await legend.locator('.entity-id').all()) {
        await expect(hint).toHaveCSS('opacity', '0');
      }
    }
    await expect(legend.locator('.row-select-btn')).toHaveAccessibleName(
      'Living Room Ceiling Lights 100%'
    );
  });

  test(`legend IDs reveal on hover and focus while duplicate controls stay distinct at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/js/playwright/fixtures/selected-light-shapes-card.html?members=3');
    await page.waitForFunction(() => window.__LIGHTENER_CARD_ELEMENT__ !== undefined);
    const ids = await page.evaluate(async () => {
      const card = window.__LIGHTENER_CARD_ELEMENT__! as HTMLElement & {
        _curves: LightCurve[];
        updateComplete: Promise<unknown>;
        renderRoot: ShadowRoot;
      };
      card._curves = card._curves.map((curve, index) => ({
        ...curve,
        friendlyName: index < 2 ? 'Reading lamp' : 'Desk light',
      }));
      await card.updateComplete;
      return card._curves.map((curve) => curve.entityId);
    });
    const legend = page.locator('curve-legend');
    const rows = legend.locator('.legend-item');
    const uniqueRow = rows.nth(2);
    const selectUnique = uniqueRow.getByRole('button', { name: 'Desk light 100%', exact: true });
    await expect(rows).toHaveCount(3);
    await page.mouse.move(0, 0);

    for (const index of [0, 1]) {
      const row = rows.nth(index);
      const label = `Reading lamp (${ids[index]})`;
      await expect(row.locator('.entity-id')).toHaveText(ids[index]);
      await expect(row.locator('.entity-id')).toHaveCSS('opacity', '0');
      await expect(row.getByRole('button', { name: `${label} 100%`, exact: true })).toBeVisible();
      await expect(row.getByRole('button', { name: `Hide ${label}`, exact: true })).toBeVisible();
    }

    const heights = () =>
      rows.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height)
      );
    const before = {
      rows: await heights(),
      card: (await page.locator('lightener-curve-card').boundingBox())!.height,
    };
    const uniqueHint = uniqueRow.locator('.entity-id');
    const uniqueEye = uniqueRow.getByRole('button', { name: 'Hide Desk light', exact: true });
    await expect(uniqueHint).toHaveText(ids[2]);
    await expect(uniqueHint).toHaveCSS('opacity', '0');
    await selectUnique.hover();
    await expect(uniqueHint).toHaveCSS('opacity', '0.7');
    await uniqueEye.hover();
    await expect(uniqueHint).toHaveCSS('opacity', '0.7');
    await page.mouse.move(0, 0);
    await expect(uniqueHint).toHaveCSS('opacity', '0');
    await selectUnique.focus();
    await expect(uniqueHint).toHaveCSS('opacity', '0.7');
    await page.keyboard.press('Tab');
    await expect(uniqueEye).toBeFocused();
    await expect(uniqueHint).toHaveCSS('opacity', '0.7');
    await rows.nth(0).locator('.row-select-btn').focus();
    await expect(uniqueHint).toHaveCSS('opacity', '0');
    const after = await heights();
    for (const [index, height] of after.entries()) {
      expect(Math.abs(height - before.rows[index])).toBeLessThan(0.5);
    }
    expect(
      Math.abs((await page.locator('lightener-curve-card').boundingBox())!.height - before.card)
    ).toBeLessThan(0.5);
    await selectUnique.click();
    await expect(selectUnique).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.move(0, 0);
    await rows.nth(0).locator('.row-select-btn').focus();
    await expect(uniqueHint).toHaveCSS('opacity', '0.7');

    await rows
      .nth(1)
      .getByRole('button', { name: `Hide Reading lamp (${ids[1]})`, exact: true })
      .click();
    await expect(rows.nth(1)).toHaveClass(/hidden/);
    await expect(rows.nth(1).locator('.entity-id')).toHaveCSS('opacity', '0.7');
    await expect(rows.nth(0).locator('.entity-id')).toHaveCSS('opacity', '0');
    await rows
      .nth(0)
      .getByRole('button', { name: `Reading lamp (${ids[0]}) 100%`, exact: true })
      .click();
    await expect(rows.nth(0).locator('.row-select-btn')).toHaveAttribute('aria-pressed', 'true');
    await expect(rows.nth(0).locator('button')).toHaveCount(2);
    await expect(rows.nth(0).locator('.entity-id')).toHaveText(ids[0]);
    await expect(uniqueHint).toHaveCSS('opacity', '0');
    await rows
      .nth(0)
      .getByRole('button', {
        name: `Reading lamp (${ids[0]}) 100%`,
        exact: true,
      })
      .click();
    await expect(rows.nth(0).locator('.entity-id')).toHaveCSS('opacity', '0.7');
    await page.mouse.move(0, 0);
    await page.evaluate(() => {
      const legend = window.__LIGHTENER_CARD_ELEMENT__!.renderRoot.querySelector('curve-legend')!;
      (legend.shadowRoot?.activeElement as HTMLElement | null)?.blur();
    });
    for (const hint of await legend.locator('.entity-id').all()) {
      await expect(hint).toHaveCSS('opacity', '0');
    }
    const settled = await heights();
    for (const [index, height] of settled.entries()) {
      expect(Math.abs(height - before.rows[index])).toBeLessThan(0.5);
    }
    await rows
      .nth(0)
      .getByRole('button', {
        name: `Reading lamp (${ids[0]}) 100%`,
        exact: true,
      })
      .click();

    const longId = `light.${'reading_lamp_'.repeat(12)}first`;
    await page.evaluate(async (id) => {
      const legend = window.__LIGHTENER_CARD_ELEMENT__!.renderRoot.querySelector(
        'curve-legend'
      )! as HTMLElement & {
        curves: LightCurve[];
        selectedCurveId: string;
        updateComplete: Promise<unknown>;
      };
      legend.curves = legend.curves.map((curve, index) =>
        index === 0 ? { ...curve, entityId: id } : curve
      );
      legend.selectedCurveId = id;
      await legend.updateComplete;
    }, longId);
    const idLine = rows.nth(0).locator('.entity-id');
    await expect(idLine).toHaveAttribute('title', longId);
    await expect(idLine).toHaveCSS('text-overflow', 'ellipsis');
    await expect(
      rows.nth(0).getByRole('button', { name: `Reading lamp (${longId}) 100%`, exact: true })
    ).toBeVisible();
    expect(await idLine.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
      true
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  });

  test(`legend IDs distinguish collapsed-whitespace names at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/js/playwright/fixtures/selected-light-shapes-card.html?members=3');
    await page.waitForFunction(() => window.__LIGHTENER_CARD_ELEMENT__ !== undefined);
    const ids = await page.evaluate(async () => {
      const card = window.__LIGHTENER_CARD_ELEMENT__! as HTMLElement & {
        _curves: LightCurve[];
        updateComplete: Promise<unknown>;
      };
      const names = ['Reading lamp', 'Reading  lamp', 'Desk light'];
      card._curves = card._curves.map((curve, index) => ({
        ...curve,
        friendlyName: names[index],
      }));
      await card.updateComplete;
      return card._curves.map((curve) => curve.entityId);
    });

    const rows = page.locator('curve-legend .legend-item');
    for (const index of [0, 1]) {
      const row = rows.nth(index);
      await expect(row.locator('.name')).toHaveText('Reading lamp');
      await expect(row.locator('.entity-id')).toHaveText(ids[index]);
      await expect(row.locator('.entity-id')).toHaveCSS('opacity', '0');
      await expect(row.locator('.row-select-btn')).toHaveAccessibleName(
        `Reading lamp (${ids[index]}) 100%`
      );
    }
    await rows.nth(0).locator('.row-select-btn').click();
    await expect(rows.nth(0).locator('.entity-id')).toHaveText(ids[0]);
    await expect(rows.nth(1).locator('.entity-id')).toHaveCSS('opacity', '0');
    await expect(rows.nth(2).locator('.entity-id')).toHaveCSS('opacity', '0');
  });

  test(`legend full names keep distinct control labels at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/js/playwright/fixtures/selected-light-shapes-card.html?members=3');
    await page.waitForFunction(() => window.__LIGHTENER_CARD_ELEMENT__ !== undefined);
    await page.evaluate(async () => {
      const card = window.__LIGHTENER_CARD_ELEMENT__! as HTMLElement & {
        _curves: LightCurve[];
        updateComplete: Promise<unknown>;
      };
      const id = card._curves[0].entityId;
      const names = [`(${id}) Lamp`, `(${id}) Lamp`, `(${id}) (${id}) Lamp`];
      card._curves = card._curves.map((curve, index) => ({ ...curve, friendlyName: names[index] }));
      await card.updateComplete;
    });

    const legend = page.locator('curve-legend');
    const rows = legend.locator('.legend-item');
    for (let index = 0; index < 3; index++) {
      const button = rows.nth(index).locator('.row-select-btn');
      const label = await button.getAttribute('aria-label');
      expect(label).not.toBeNull();
      await expect(button).toHaveAccessibleName(label!);
      await expect(legend.getByRole('button', { name: label!, exact: true })).toHaveCount(1);
    }
    await expect(rows.nth(2).locator('.entity-id')).toHaveCSS('opacity', '0');
  });

  test(`legend control labels stay distinct from friendly names at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/js/playwright/fixtures/selected-light-shapes-card.html?members=4');
    await page.waitForFunction(() => window.__LIGHTENER_CARD_ELEMENT__ !== undefined);
    const labels = await page.evaluate(async () => {
      const card = window.__LIGHTENER_CARD_ELEMENT__! as HTMLElement & {
        _curves: LightCurve[];
        updateComplete: Promise<unknown>;
      };
      const name = `Reading lamp (${card._curves[0].entityId})`;
      const names = ['Reading lamp', 'Reading lamp', name, 'Desk light'];
      card._curves = card._curves.map((curve, index) => ({ ...curve, friendlyName: names[index] }));
      await card.updateComplete;
      return names;
    });

    const legend = page.locator('curve-legend');
    const rows = legend.locator('.legend-item');
    const eyes = rows.locator('.eye-btn');
    const selectButtons = rows.locator('.row-select-btn');
    for (let index = 0; index < labels.length; index++) {
      const eyeLabel = await eyes.nth(index).getAttribute('aria-label');
      await expect(legend.getByRole('button', { name: eyeLabel!, exact: true })).toHaveCount(1);
      const selectLabel =
        (await selectButtons.nth(index).getAttribute('aria-label')) ?? `${labels[index]} 100%`;
      await expect(selectButtons.nth(index)).toHaveAccessibleName(selectLabel);
      await expect(legend.getByRole('button', { name: selectLabel, exact: true })).toHaveCount(1);
    }
    await expect(rows.nth(2).locator('.entity-id')).toHaveCSS('opacity', '0');
  });
}

test.describe('touch light selector', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('reveals a selected light ID and keeps the eye usable without hover', async ({ page }) => {
    await page.goto('/js/playwright/fixtures/selected-light-shapes-card.html?members=3');
    await page.waitForFunction(() => window.__LIGHTENER_CARD_ELEMENT__ !== undefined);
    const rows = page.locator('curve-legend .legend-item');
    const first = rows.nth(0);
    const hint = first.locator('.entity-id');
    const select = first.locator('.row-select-btn');
    const eye = first.locator('.eye-btn');
    await expect(hint).toHaveCSS('opacity', '0');
    await expect(eye).toHaveCSS('width', '44px');
    await expect(eye).toHaveCSS('height', '44px');
    await expect(eye).toHaveAccessibleName(/^Hide /);

    await select.tap();
    await expect(select).toHaveAttribute('aria-pressed', 'true');
    await expect(hint).toHaveCSS('opacity', '0.7');
    await eye.tap();
    await expect(eye).toHaveAttribute('aria-pressed', 'true');
    await expect(eye).toHaveAccessibleName(/^Show /);
    await expect(first).toHaveClass(/hidden/);
    await eye.tap();
    await expect(eye).toHaveAttribute('aria-pressed', 'false');
    await expect(first).not.toHaveClass(/hidden/);
    await expect(hint).toHaveCSS('opacity', '0.7');
  });
});
