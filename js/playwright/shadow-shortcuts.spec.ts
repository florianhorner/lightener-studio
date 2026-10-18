import { expect, test } from '@playwright/test';

const FIXTURE = '/js/playwright/fixtures/long-name-card.html?mode=sidebar';
const SAVE = 'Save changes (Ctrl+S)';

async function selectAndEdit(page: import('@playwright/test').Page) {
  await page.goto(FIXTURE);
  await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
  await page.locator('curve-legend .row-select-btn').first().click();
  await page.locator('.preset-option[data-preset="night_mode"]').click();
  await expect(page.getByRole('button', { name: SAVE, exact: true })).toBeEnabled();
  expect(
    await page.evaluate(() => document.activeElement?.localName),
    'focus is retargeted to the panel host outside the card'
  ).toBe('lightener-editor-panel');
}

test('Escape clears the shape trial and then cancels inside the sidebar', async ({ page }) => {
  await selectAndEdit(page);
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.preview-curve-line')).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(page.locator('.preview-curve-line')).toHaveCount(0);
  await expect(page.getByRole('button', { name: SAVE, exact: true })).toBeEnabled();
  await page.keyboard.press('Escape');

  await expect(page.getByRole('button', { name: SAVE, exact: true })).toHaveCount(0);
  await expect(page.locator('curve-legend .row-select-btn').first()).toHaveAttribute(
    'aria-label',
    /50%/
  );
  expect(await page.evaluate(() => window.__LIGHTENER_SAVED__)).toEqual([]);
});

for (const modifier of ['Control', 'Meta']) {
  test(`${modifier}+S saves inside the sidebar`, async ({ page }) => {
    await selectAndEdit(page);

    await page.keyboard.press(`${modifier}+s`);

    await expect.poll(() => page.evaluate(() => window.__LIGHTENER_SAVED__?.length)).toBe(1);
    await expect(page.getByRole('button', { name: SAVE, exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => window.__LIGHTENER_SAVED__?.[0])).toMatchObject({
      'light.living_room_overhead_ambient_controller_zone_001': {
        brightness: { '50': '10', '100': '25' },
      },
    });
  });

  test(`${modifier}+Z undoes inside the sidebar`, async ({ page }) => {
    await selectAndEdit(page);

    await page.keyboard.press(`${modifier}+z`);

    await expect(page.getByRole('button', { name: SAVE, exact: true })).toHaveCount(0);
    await expect(page.locator('curve-legend .row-select-btn').first()).toHaveAttribute(
      'aria-label',
      /50%/
    );
    expect(await page.evaluate(() => window.__LIGHTENER_SAVED__)).toEqual([]);
  });
}

test('shortcuts in a sibling input leave the sidebar edit untouched', async ({ page }) => {
  await selectAndEdit(page);
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Outside editor');
    window.__LIGHTENER_PANEL_ELEMENT__!.shadowRoot!.append(input);
    input.focus();
  });

  for (const key of ['Escape', 'Control+s', 'Meta+s', 'Control+z', 'Meta+z']) {
    await page.keyboard.press(key);
    await expect(page.getByRole('button', { name: SAVE, exact: true })).toBeEnabled();
    expect(await page.evaluate(() => window.__LIGHTENER_SAVED__)).toEqual([]);
  }
});
