import { expect, test, type Page } from '@playwright/test';

type Fixture = {
  panel: HTMLElement & {
    hass: unknown;
    _card: HTMLElement & { dirty: boolean; _narrowLayout: boolean };
  };
  hass: unknown;
  controls: { failNextSave: boolean; holdSave: boolean; releaseSave: (() => void) | null };
  calls: Array<{ type: string }>;
  services: unknown[];
  saves: unknown[];
};
declare global {
  interface Window {
    __TOOLBAR__: Fixture;
  }
}

async function ready(page: Page, query = '') {
  await page.goto(`/js/playwright/fixtures/top-toolbar.html?seed=${test.info().testId}&${query}`);
  await expect(page.locator('curve-legend .legend-item').first()).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Room brightness', exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__TOOLBAR__.panel._card._narrowLayout))
    .toBe(page.viewportSize()!.width - (query.includes('sidebar=256') ? 256 : 0) - 80 < 860);
}
async function geometry(page: Page) {
  return page.evaluate(() => {
    const panel = window.__TOOLBAR__.panel;
    const graph = panel._card.shadowRoot!.querySelector('curve-graph')!.getBoundingClientRect();
    const toolbar = panel.shadowRoot!.querySelector('.panel-toolbar')!.getBoundingClientRect();
    return {
      top: graph.top,
      left: graph.left,
      width: graph.width,
      height: graph.height,
      toolbarHeight: toolbar.height,
    };
  });
}
async function expectUnmoved(page: Page, before: Awaited<ReturnType<typeof geometry>>) {
  await expect
    .poll(async () => {
      const after = await geometry(page);
      return Math.max(
        ...Object.keys(before).map((key) =>
          Math.abs(after[key as keyof typeof after] - before[key as keyof typeof before])
        )
      );
    })
    .toBeLessThanOrEqual(1);
}
async function edit(page: Page) {
  const light = page.locator('curve-legend brightness-bar input').first();
  await light.focus();
  await light.press('ArrowLeft');
  await expect.poll(() => page.evaluate(() => window.__TOOLBAR__.panel._card.dirty)).toBe(true);
}
function save(page: Page) {
  return page.getByRole('button', { name: 'Save changes (Ctrl+S)', exact: true });
}

for (const viewport of [
  { width: 1440, height: 800 },
  { width: 1920, height: 900 },
]) {
  test(`toolbar and three lights fit without scrolling at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await ready(page, 'sidebar=256');
    await expect(page.locator('#toolbar-host .editor-commands')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New group', exact: true })).toBeVisible();
    await expect(save(page)).toBeDisabled();
    const before = await geometry(page);
    expect(before.height).toBeCloseTo(320, 0);
    expect(before.toolbarHeight).toBeLessThanOrEqual(112);
    await edit(page);
    await expect(save(page)).toBeEnabled();
    await expectUnmoved(page, before);
    const bounds = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - innerWidth,
      overflowY: document.documentElement.scrollHeight - innerHeight,
      sliders: [
        ...document
          .querySelector('lightener-editor-panel')!
          .shadowRoot!.querySelectorAll('.editor-commands'),
      ].length,
    }));
    expect(bounds).toEqual({ overflowX: 0, overflowY: 0, sliders: 1 });
    await expect(save(page)).toBeInViewport();
    await page.screenshot({
      path: test.info().outputPath(`fixture-${viewport.width}-${test.info().project.name}.png`),
    });
  });
}

test('saving, failure, retry, and preview preserve graph geometry and command ownership', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await ready(page, 'sidebar=256');
  const before = await geometry(page);
  await edit(page);
  await page.getByRole('button', { name: 'Watch room react', exact: true }).press('Enter');
  await expect(page.getByRole('button', { name: /Watching.*Restore lights/ })).toBeVisible();
  await expect(page.locator('.preview-status')).toContainText(
    'Save keeps the shapes and restores the lights.'
  );
  await expectUnmoved(page, before);
  await page.evaluate(() => {
    window.__TOOLBAR__.controls.holdSave = true;
    window.__TOOLBAR__.controls.failNextSave = true;
  });
  await save(page).press('Enter');
  await expect(save(page)).toHaveText('Saving…');
  await expect(save(page)).toBeDisabled();
  await expectUnmoved(page, before);
  await page.evaluate(() => {
    window.__TOOLBAR__.controls.holdSave = false;
    window.__TOOLBAR__.controls.releaseSave!();
  });
  await expect(page.locator('.command-status')).toContainText('Save failed');
  await expectUnmoved(page, before);
  await page.getByRole('button', { name: 'Retry', exact: true }).press('Enter');
  await expect(page.locator('.command-status')).toHaveText('Saved');
  await expect(save(page)).toBeDisabled();
  await expectUnmoved(page, before);
  expect(await page.evaluate(() => window.__TOOLBAR__.saves.length)).toBe(1);
  await expect(page.getByRole('button', { name: 'Watch room react', exact: true })).toBeVisible();
});

test('picker Escape preserves edits, hosted shortcuts work, and Help restores focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await ready(page, 'sidebar=256');
  await edit(page);
  const picker = page.locator('#entity-select');
  const handle = await picker.elementHandle();
  await picker.focus();
  await picker.press('Escape');
  expect(await page.evaluate(() => window.__TOOLBAR__.panel._card.dirty)).toBe(true);
  await page.evaluate(() => {
    const f = window.__TOOLBAR__;
    f.panel.hass = { ...f.hass };
  });
  expect(
    await handle!.evaluate(
      (el) =>
        el ===
        document
          .querySelector('lightener-editor-panel')!
          .shadowRoot!.querySelector('#entity-select')
    )
  ).toBe(true);
  const help = page.getByRole('button', { name: 'Brightness tips', exact: true });
  await help.press('Enter');
  await page.getByRole('button', { name: 'Dismiss tip', exact: true }).press('Enter');
  await expect(help).toBeFocused();
  await save(page).press('Control+s');
  await expect(page.locator('.command-status')).toHaveText('Saved');
  expect(await page.evaluate(() => window.__TOOLBAR__.saves.length)).toBe(1);
});

test('wide/narrow transitions preserve one control set, view-only mode and setup restrictions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await ready(page, 'sidebar=256&long=1');
  await edit(page);
  for (const width of [940, 939, 900, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const sidebar = width >= 1200 ? 256 : 0;
    await page.locator('lightener-editor-panel').evaluate((panel, sidebar) => {
      panel.style.marginLeft = `${sidebar}px`;
      panel.style.width = `calc(100% - ${sidebar}px)`;
    }, sidebar);
    const wide = width - sidebar - 80 >= 860;
    await expect(page.locator('#toolbar-host .editor-commands')).toHaveCount(wide ? 1 : 0);
    await expect(save(page)).toHaveCount(1);
    await expect(save(page)).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  }
  await ready(page, 'admin=0&sidebar=256');
  await expect(page.getByText('View only', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New group', exact: true })).toHaveCount(0);
  await expect(save(page)).toHaveCount(0);
  await ready(page, 'sidebar=256&config_entry=room-entry');
  await expect(page.locator('#toolbar-host .editor-commands')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New group', exact: true })).toHaveCount(0);
});

test('moving commands between toolbar and dock preserves keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await ready(page);
  await edit(page);
  await save(page).focus();
  await page.setViewportSize({ width: 900, height: 800 });
  await expect(page.locator('#toolbar-host .editor-commands')).toHaveCount(0);
  await expect(save(page)).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 800 });
  await expect(page.locator('#toolbar-host .editor-commands')).toHaveCount(1);
  await expect(save(page)).toBeFocused();
  const picker = page.locator('#entity-select');
  await picker.focus();
  await page.setViewportSize({ width: 900, height: 800 });
  await expect(picker).toBeFocused();
});

for (const font of ['native', 'monospace']) {
  for (const width of [940, 1440]) {
    test(`active preview and save failure text stay inside toolbar slots at ${width}px with ${font} font`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await ready(page, width === 1440 ? 'sidebar=256' : '');
      if (font !== 'native') {
        await page.evaluate((font) => {
          document.documentElement.style.fontFamily = font;
          document.documentElement.style.setProperty('--mdc-typography-body1-font-family', font);
        }, font);
      }
      await edit(page);
      const before = await geometry(page);
      await page.getByRole('button', { name: 'Watch room react', exact: true }).press('Enter');
      const preview = page.getByRole('button', { name: /Watching.*Restore lights/ });
      await expect(preview).toBeVisible();
      if (font !== 'native') await expect(preview).toHaveCSS('font-family', font);
      const labelFits = await preview.evaluate((button) => {
        const bounds = button.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(button);
        const content = range.getBoundingClientRect();
        const dot = button.querySelector('.preview-live-dot')!.getBoundingClientRect();
        return (
          content.left >= bounds.left &&
          content.right <= bounds.right &&
          content.top >= bounds.top &&
          content.bottom <= bounds.bottom &&
          dot.width >= 5
        );
      });
      expect(labelFits).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`toolbar-watching-${width}.png`) });
      await page.evaluate(() => {
        window.__TOOLBAR__.controls.failNextSave = true;
      });
      await save(page).press('Enter');
      await expect(page.locator('.command-status')).toContainText('Save failed');
      const statusFits = await page.locator('.command-status').evaluate((slot) => {
        const bounds = slot.getBoundingClientRect();
        const alert = slot.querySelector('[role="alert"]')!;
        const range = document.createRange();
        range.selectNodeContents(alert);
        const content = range.getBoundingClientRect();
        return (
          content.left >= bounds.left &&
          content.right <= bounds.right &&
          content.top >= bounds.top &&
          content.bottom <= bounds.bottom &&
          slot.scrollWidth <= slot.clientWidth
        );
      });
      expect(statusFits).toBe(true);
      await expectUnmoved(page, before);
      const statusBox = (await page.locator('.command-status').boundingBox())!;
      const helpBox = (await page
        .getByRole('button', { name: 'Brightness tips', exact: true })
        .boundingBox())!;
      expect(statusBox.x + statusBox.width).toBeLessThanOrEqual(helpBox.x);
      await page.screenshot({ path: test.info().outputPath(`toolbar-failure-${width}.png`) });
    });
  }
}
