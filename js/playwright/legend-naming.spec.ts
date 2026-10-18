import { expect, test } from '@playwright/test';
import type { LightCurve } from '../src/utils/types';

for (const width of [390, 1100]) {
  test(`legend IDs distinguish duplicate names at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/js/playwright/fixtures/selected-light-shapes-card.html?members=3');
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
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
    const selectUnique = uniqueRow.getByRole('button', { name: 'Desk light 50%', exact: true });
    await expect(rows).toHaveCount(3);
    await page.mouse.move(0, 0);

    for (const index of [0, 1]) {
      const row = rows.nth(index);
      const label = `Reading lamp (${ids[index]})`;
      await expect(row.locator('.entity-id')).toHaveText(ids[index]);
      await expect(row.locator('.entity-id')).toHaveCSS('opacity', '0.7');
      await expect(row.getByRole('button', { name: `${label} 50%`, exact: true })).toBeVisible();
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
    await expect(uniqueRow.locator('.entity-id')).toHaveCount(0);
    await selectUnique.hover();
    await expect(uniqueRow.locator('.entity-id')).toHaveCount(0);
    const after = await heights();
    for (const [index, height] of after.entries()) {
      expect(Math.abs(height - before.rows[index])).toBeLessThan(0.5);
    }
    expect(
      Math.abs((await page.locator('lightener-curve-card').boundingBox())!.height - before.card)
    ).toBeLessThan(0.5);
    await selectUnique.focus();
    await expect(uniqueRow.locator('.entity-id')).toHaveCount(0);
    await selectUnique.click();
    await expect(selectUnique).toHaveAttribute('aria-pressed', 'true');
    await expect(uniqueRow.locator('.entity-id')).toHaveCount(0);

    await rows
      .nth(1)
      .getByRole('button', { name: `Hide Reading lamp (${ids[1]})`, exact: true })
      .click();
    await expect(rows.nth(1)).toHaveClass(/hidden/);
    await expect(rows.nth(1).locator('.entity-id')).toHaveCSS('opacity', '0.7');
    await expect(rows.nth(0).locator('.entity-id')).toHaveCSS('opacity', '0.7');
    await rows
      .nth(0)
      .getByRole('button', { name: `Reading lamp (${ids[0]}) 50%`, exact: true })
      .click();
    await expect(
      rows
        .nth(0)
        .getByRole('button', { name: `Clear selection for Reading lamp (${ids[0]})`, exact: true })
    ).toBeVisible();

    const longId = `light.${'reading_lamp_'.repeat(12)}first`;
    await page.evaluate(async (id) => {
      const legend = window.__LIGHTENER_CARD_ELEMENT__!.renderRoot.querySelector(
        'curve-legend'
      )! as HTMLElement & { curves: LightCurve[]; updateComplete: Promise<unknown> };
      legend.curves = legend.curves.map((curve, index) =>
        index === 0 ? { ...curve, entityId: id } : curve
      );
      await legend.updateComplete;
    }, longId);
    const idLine = rows.nth(0).locator('.entity-id');
    await expect(idLine).toHaveAttribute('title', longId);
    await expect(idLine).toHaveCSS('text-overflow', 'ellipsis');
    await expect(
      rows.nth(0).getByRole('button', { name: `Reading lamp (${longId}) 50%`, exact: true })
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
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
    await page.evaluate(async () => {
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
    });

    const rows = page.locator('curve-legend .legend-item');
    for (const index of [0, 1]) {
      const row = rows.nth(index);
      await expect(row.locator('.name')).toHaveText('Reading lamp');
      await expect(row.locator('.entity-id')).toBeVisible();
      const id = await row.locator('.entity-id').textContent();
      await expect(row.locator('.row-select-btn')).toHaveAccessibleName(`Reading lamp (${id}) 50%`);
    }
    await expect(rows.nth(2).locator('.entity-id')).toHaveCount(0);
  });

  test(`legend shortened names keep distinct control labels at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/js/playwright/fixtures/selected-light-shapes-card.html?members=3');
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
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
    await expect(rows.nth(2).locator('.entity-id')).toHaveCount(0);
  });

  test(`legend control labels stay distinct from friendly names at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/js/playwright/fixtures/selected-light-shapes-card.html?members=4');
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
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
        (await selectButtons.nth(index).getAttribute('aria-label')) ?? `${labels[index]} 50%`;
      await expect(selectButtons.nth(index)).toHaveAccessibleName(selectLabel);
      await expect(legend.getByRole('button', { name: selectLabel, exact: true })).toHaveCount(1);
    }
    await expect(rows.nth(2).locator('.entity-id')).toHaveCount(0);
  });
}
