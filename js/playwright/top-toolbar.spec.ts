import { expect, test, type Page } from '@playwright/test';
import { VB_H, VB_W } from '../src/utils/graph-math';

type Fixture = {
  panel: HTMLElement & {
    hass: unknown;
    _card: HTMLElement & { dirty: boolean; _narrowLayout: boolean };
  };
  hass: unknown;
  controls: {
    failNextSave: boolean;
    holdSave: boolean;
    releaseSave: (() => void) | null;
    replacePanel(): void;
  };
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
/** The panel toolbar holds help only; the action row stays in the card. */
async function expectHelpOnlyToolbar(page: Page) {
  await expect(page.locator('#toolbar-host .editor-help')).toBeVisible();
  await expect(page.locator('#toolbar-host .editor-commands')).toHaveCount(0);
  await expect(page.locator('lightener-curve-card .editor-commands')).toHaveCount(1);
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
    await expectHelpOnlyToolbar(page);
    await expect(page.getByRole('button', { name: 'New group', exact: true })).toBeVisible();
    await expect(save(page)).toBeDisabled();
    const before = await geometry(page);
    // The graph fills its column up to the 520px editor cap.
    expect(before.height).toBeCloseTo(Math.min(520, (before.width * VB_H) / VB_W), 0);
    expect(before.toolbarHeight).toBeLessThanOrEqual(112);
    await edit(page);
    await expect(save(page)).toBeEnabled();
    await expectUnmoved(page, before);
    const bounds = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - innerWidth,
      overflowY: document.documentElement.scrollHeight - innerHeight,
      commandRows: [
        ...document
          .querySelector('lightener-editor-panel')!
          .shadowRoot!.querySelector('lightener-curve-card')!
          .shadowRoot!.querySelectorAll('.editor-commands'),
      ].length,
    }));
    expect(bounds).toEqual({ overflowX: 0, overflowY: 0, commandRows: 1 });
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
    'Save keeps the shapes. Check light restoration separately.'
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
  await expect(page.locator('.command-status').getByText('Saved', { exact: true })).toBeVisible();
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
  const help = page.getByRole('button', { name: 'Show me how', exact: true });
  const beforeHelp = await page.evaluate(() => {
    const card = window.__TOOLBAR__.panel._card as unknown as {
      _curves: unknown;
      _originalCurves: unknown;
      _undoStack: unknown;
      _selectedCurveId: unknown;
    };
    return JSON.stringify([
      card._curves,
      card._originalCurves,
      card._undoStack,
      card._selectedCurveId,
    ]);
  });
  await help.press('Enter');
  await expect(page.locator('.canvas-notice')).toContainText('Save or cancel your draft');
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => {
      const card = window.__TOOLBAR__.panel._card as unknown as {
        _curves: unknown;
        _originalCurves: unknown;
        _undoStack: unknown;
        _selectedCurveId: unknown;
      };
      return JSON.stringify([
        card._curves,
        card._originalCurves,
        card._undoStack,
        card._selectedCurveId,
      ]);
    })
  ).toBe(beforeHelp);
  expect(await page.evaluate(() => window.__TOOLBAR__.services)).toEqual([]);
  await save(page).press('Control+s');
  await expect(page.locator('.command-status')).toHaveText('Saved');
  expect(await page.evaluate(() => window.__TOOLBAR__.saves.length)).toBe(1);
  await expect(page.locator('.command-status')).toHaveText('');
  await help.press('Enter');
  await page.getByRole('button', { name: 'Done', exact: true }).press('Enter');
  await expect(help).toBeFocused();
  await help.press('Enter');
  await page.getByRole('button', { name: 'Done', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(help).toBeFocused();
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0);
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
    await expectHelpOnlyToolbar(page);
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
  await expectHelpOnlyToolbar(page);
  await expect(page.getByRole('button', { name: 'New group', exact: true })).toHaveCount(0);
});

test('crossing the wide/narrow boundary keeps the action row and keyboard focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await ready(page);
  await edit(page);
  await save(page).focus();
  const handle = await save(page).elementHandle();
  await page.setViewportSize({ width: 900, height: 800 });
  await expectHelpOnlyToolbar(page);
  await expect(save(page)).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 800 });
  await expectHelpOnlyToolbar(page);
  await expect(save(page)).toBeFocused();
  expect(await handle!.evaluate((button) => button.isConnected)).toBe(true);
  const picker = page.locator('#entity-select');
  await picker.focus();
  await page.setViewportSize({ width: 900, height: 800 });
  await expect(picker).toBeFocused();
});

for (const font of ['native', 'monospace']) {
  for (const width of [940, 1440]) {
    test(`active preview and save failure text stay inside action row slots at ${width}px with ${font} font`, async ({
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
      const actionsBox = (await page.locator('.editor-commands').boundingBox())!;
      expect(statusBox.x).toBeGreaterThanOrEqual(actionsBox.x);
      expect(statusBox.x + statusBox.width).toBeLessThanOrEqual(actionsBox.x + actionsBox.width);
      expect(statusBox.y).toBeGreaterThanOrEqual(actionsBox.y);
      expect(statusBox.y + statusBox.height).toBeLessThanOrEqual(actionsBox.y + actionsBox.height);
      // The compact action row can wrap. Require disjoint status/control bounds
      // rather than the former single-row left-to-right relationship.
      const separateControls = await page.locator('.editor-commands').evaluate((row) => {
        const status = row.querySelector('.command-status')!;
        const bounds = status.getBoundingClientRect();
        return [...row.querySelectorAll('button')]
          .filter((button) => !status.contains(button))
          .every((button) => {
            const control = button.getBoundingClientRect();
            return (
              bounds.right <= control.left + 1 ||
              bounds.left >= control.right - 1 ||
              bounds.bottom <= control.top + 1 ||
              bounds.top >= control.bottom - 1
            );
          });
      });
      expect(separateControls).toBe(true);
      const helpBox = (await page
        .getByRole('button', { name: 'Show me how', exact: true })
        .boundingBox())!;
      expect(helpBox.y + helpBox.height).toBeLessThanOrEqual(before.top);
      await page.screenshot({ path: test.info().outputPath(`toolbar-failure-${width}.png`) });
    });
  }
}

async function helpState(page: Page) {
  return page.evaluate(() => {
    const f = window.__TOOLBAR__,
      c = f.panel._card as any;
    return {
      curves: structuredClone(c._curves),
      original: structuredClone(c._originalCurves),
      undo: structuredClone(c._undoStack),
      dirty: c.dirty,
      example: c._invitation.curve ? structuredClone(c._invitation.curve.controlPoints) : null,
      moving: c._invitation.moving,
      cue: c._invitation.cueAnimating,
      services: f.services.length,
      saves: f.saves.length,
      saveRequests: f.calls.filter((call) => call.type === 'lightener/save_curves').length,
    };
  });
}
function savedWork(state: Awaited<ReturnType<typeof helpState>>) {
  return { curves: state.curves, original: state.original, undo: state.undo, dirty: state.dirty };
}
async function noHelpWrites(page: Page, services = 0, saves = 0) {
  const state = await helpState(page);
  expect(state.services).toBe(services);
  expect(state.saves).toBe(saves);
  expect(state.saveRequests).toBe(saves);
}
for (const width of [360, 390])
  test(`canvas help preserves graph geometry with a wide inherited font at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ready(page);
    await page.evaluate(async () => {
      document.documentElement.style.fontFamily = 'monospace';
      document.documentElement.style.setProperty('--mdc-typography-body1-font-family', 'monospace');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const before = await geometry(page);
    await page.getByRole('button', { name: 'Show me how', exact: true }).press('Enter');
    await expect(page.locator('.canvas-guidance-text')).toHaveCSS('font-family', 'monospace');
    await expectUnmoved(page, before);
    const textFits = await page.locator('.canvas-guidance-text').evaluate((text) => {
      const row = text.parentElement!.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(text);
      const bounds = range.getBoundingClientRect();
      return (
        bounds.top >= row.top &&
        bounds.bottom <= row.bottom &&
        text.scrollWidth <= text.clientWidth
      );
    });
    expect(textFits).toBe(true);
    await page.getByRole('button', { name: 'Done', exact: true }).press('Enter');
    await expectUnmoved(page, before);
    await noHelpWrites(page);
  });
for (const width of [1440, 390])
  test(`canvas help proof: repeated replay, interruption and keyboard dismissal keep saved work at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ready(page);
    const baseline = await helpState(page),
      before = await geometry(page),
      help = page.getByRole('button', { name: 'Show me how', exact: true });
    for (let attempt = 0; attempt < 3; attempt++) {
      await help.press('Enter');
      await expect(page.locator('.canvas-guidance-text')).toContainText(
        'Your shapes are unchanged'
      );
      const handle = page.locator('curve-graph .hit-circle[data-point="3"]');
      await expect(handle).toHaveAccessibleDescription(
        'Example shape. Changing a point keeps this shape as an unsaved edit. Undo restores your previous shape.'
      );
      await expect(page.locator('.invitation-announcement')).toContainText(
        'Use arrow keys on a point to edit'
      );
      await page.getByRole('button', { name: 'Replay', exact: true }).press('Enter');
      await expectUnmoved(page, before);
      expect(savedWork(await helpState(page))).toEqual(savedWork(baseline));
      await noHelpWrites(page);
      if (attempt === 0)
        await page.screenshot({
          path: test.info().outputPath(`canvas-help-${width}.png`),
          fullPage: true,
        });
      if (attempt === 1) await page.locator('curve-legend .row-select-btn').last().click();
      else {
        await page.getByRole('button', { name: 'Done', exact: true }).focus();
        await page.keyboard.press('Escape');
        await expect(help).toBeFocused();
      }
      await expect(page.locator('.canvas-guidance-text')).toHaveCount(0);
      expect(savedWork(await helpState(page))).toEqual(savedWork(baseline));
      await noHelpWrites(page);
    }
  });
test('canvas help proof: adoption stays unsaved, refusal is inert, Undo is clean, only explicit Save writes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  const baseline = await helpState(page),
    help = page.getByRole('button', { name: 'Show me how', exact: true });
  const adopt = async () => {
    await help.click();
    const point = page.locator('curve-graph .hit-circle[data-point="3"]');
    await point.focus();
    await point.press('ArrowUp');
    await expect(save(page)).toBeEnabled();
  };
  await adopt();
  const draft = await helpState(page);
  expect(draft.dirty).toBe(true);
  expect(draft.undo.length).toBe(baseline.undo.length + 1);
  await noHelpWrites(page);
  await help.click();
  await expect(page.locator('.canvas-notice')).toContainText('Your edits are unchanged');
  expect(savedWork(await helpState(page))).toEqual(savedWork(draft));
  await noHelpWrites(page);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(save(page)).toBeDisabled();
  await expect.poll(async () => savedWork(await helpState(page))).toEqual(savedWork(baseline));
  await noHelpWrites(page);
  await adopt();
  await noHelpWrites(page);
  await save(page).click();
  await expect.poll(async () => (await helpState(page)).saves).toBe(1);
  await expect(save(page)).toBeDisabled();
  await noHelpWrites(page, 0, 1);
});
test('canvas help proof: reduced motion freezes a running example and replay stays still', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  const baseline = await helpState(page),
    help = page.getByRole('button', { name: 'Show me how', exact: true });
  await help.click();
  await expect.poll(async () => (await helpState(page)).moving).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => (await helpState(page)).moving).toBe(false);
  const frozen = await helpState(page);
  await page.waitForTimeout(200);
  expect((await helpState(page)).example).toEqual(frozen.example);
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  expect((await helpState(page)).moving).toBe(false);
  expect((await helpState(page)).cue).toBe(false);
  expect(savedWork(await helpState(page))).toEqual(savedWork(baseline));
  await noHelpWrites(page);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
});
test('canvas help proof: group changes interrupt examples and recovered drafts refuse a fresh example', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  const help = page.getByRole('button', { name: 'Show me how', exact: true });
  await help.click();
  await page.locator('#entity-select').selectOption('light.other_room');
  await expect(page.locator('.canvas-guidance-text')).toHaveCount(0);
  await noHelpWrites(page);
  await page.locator('#entity-select').selectOption('light.room');
  await expect(page.locator('curve-legend .legend-item').first()).toBeVisible();
  await help.click();
  const point = page.locator('curve-graph .hit-circle[data-point="3"]');
  await point.focus();
  await point.press('ArrowUp');
  await expect(save(page)).toBeEnabled();
  const draft = await helpState(page);
  await page.evaluate(() => window.__TOOLBAR__.controls.replacePanel());
  await expect(page.getByRole('button', { name: 'Recover draft', exact: true })).toBeVisible();
  expect((await helpState(page)).example).toBeNull();
  await noHelpWrites(page);
  await page.getByRole('button', { name: 'Recover draft', exact: true }).click();
  await expect(save(page)).toBeEnabled();
  expect(savedWork(await helpState(page))).toEqual(savedWork(draft));
  await help.click();
  await expect(page.locator('.canvas-notice')).toContainText('Your edits are unchanged');
  expect(savedWork(await helpState(page))).toEqual(savedWork(draft));
  await noHelpWrites(page);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(save(page)).toBeDisabled();
  await noHelpWrites(page);
});
test('canvas help proof: Watch refusal and restart never issue help-origin light commands', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  const help = page.getByRole('button', { name: 'Show me how', exact: true });
  await page.getByRole('button', { name: 'Watch room react', exact: true }).click();
  await expect.poll(async () => (await helpState(page)).services).toBeGreaterThan(0);
  const watching = await helpState(page);
  await help.click();
  await expect(page.locator('.canvas-notice')).toContainText('Restore lights before starting');
  await noHelpWrites(page, watching.services, 0);
  expect((await helpState(page)).example).toBeNull();
  await page.getByRole('button', { name: 'Watching · Restore lights', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Watch room react', exact: true })).toBeEnabled();
  const settled = await helpState(page);
  await help.click();
  await expect(page.locator('.canvas-guidance-text')).toContainText('Your shapes are unchanged');
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await noHelpWrites(page, settled.services, 0);
});

test.describe('emulated touch canvas help proof', () => {
  test.use({ hasTouch: true });
  test('touch adoption stays local and Undo restores the prior clean shape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ready(page);
    const baseline = await helpState(page);
    await page.getByRole('button', { name: 'Show me how', exact: true }).tap();
    const point = page.locator('curve-graph .hit-circle[data-point="3"]');
    const box = (await point.boundingBox())!,
      x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    const touch = await page.context().newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + 20, y: y - 24 }],
    });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(save(page)).toBeEnabled();
    expect((await helpState(page)).dirty).toBe(true);
    await noHelpWrites(page);
    await page.screenshot({
      path: test.info().outputPath('canvas-help-emulated-touch-adopted.png'),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Undo', exact: true }).tap();
    await expect.poll(async () => savedWork(await helpState(page))).toEqual(savedWork(baseline));
    await noHelpWrites(page);
    await touch.detach();
  });
});

test.describe('preview restoration', () => {
  const fixture = '/js/playwright/fixtures/preview-restoration.html';
  async function ready(page: Page) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(fixture);
    await expect(page.locator('curve-legend .legend-item')).toHaveCount(2);
  }
  async function watch(page: Page) {
    await page.getByRole('button', { name: 'Watch room react', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__RESTORATION_PROOF__.services.length))
      .toBe(2);
  }
  async function summary(page: Page) {
    return page.evaluate(() => {
      const p = (window as any).__RESTORATION_PROOF__;
      return {
        services: p.services.length,
        effects: p.effects.length,
        writes: p.writes.length,
        dirty: p.card?.dirty,
        values: Object.fromEntries(
          Object.entries(p.hass.states).map(([id, s]: [string, any]) => [
            id,
            s.state === 'off' ? 'off' : (s.attributes.brightness ?? 'on'),
          ])
        ),
      };
    });
  }
  for (const width of [1280, 390])
    test(`built ${width}px: review names, deliberate selection, native focus/Escape, no overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await ready(page);
      await watch(page);
      await page.evaluate(() =>
        (window as any).__RESTORATION_PROOF__.external('light.ceiling', 211)
      );
      await page.getByRole('button', { name: 'Watching · Restore lights', exact: true }).click();
      await page.getByRole('button', { name: 'Review restoration', exact: true }).click();
      const dialog = page.locator('preview-restoration-dialog dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(
        'Living Room Ceiling Lights with a deliberately long complete Home Assistant name'
      );
      await expect(dialog).toContainText('light.ceiling');
      await expect(dialog).toContainText('Prior: On · brightness 73/255');
      await expect(
        dialog.getByRole('button', { name: 'Restore selected lights', exact: true })
      ).toBeDisabled();
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
      ).toBe(true);
      expect(
        await dialog.evaluate((el) =>
          el.contains(
            el.getRootNode() instanceof ShadowRoot
              ? (el.getRootNode() as ShadowRoot).activeElement
              : document.activeElement
          )
        )
      ).toBe(true);
      await page.screenshot({
        path: test.info().outputPath(`restoration-review-${width}.png`),
        fullPage: true,
      });
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Review restoration', exact: true })
      ).toBeFocused();
      await page.getByRole('button', { name: 'Review restoration', exact: true }).click();
      await dialog.getByRole('checkbox').first().check();
      await dialog.getByRole('button', { name: 'Restore selected lights', exact: true }).click();
      await expect.poll(async () => (await summary(page)).values['light.ceiling']).toBe(73);
    });
  test('clean detach and true replacement retain evidence and issue no automatic cleanup', async ({
    page,
  }) => {
    await ready(page);
    await watch(page);
    const before = await summary(page);
    expect(before.dirty).toBe(false);
    await page.locator('#leave').click();
    await page.locator('#return').click();
    await expect(
      page.getByRole('button', { name: 'Review restoration', exact: true })
    ).toBeVisible();
    expect((await summary(page)).services).toBe(before.services);
    await page.getByRole('button', { name: 'Review restoration', exact: true }).click();
    await page.getByRole('button', { name: 'Keep current lights', exact: true }).click();
    expect((await summary(page)).services).toBe(before.services);
    await expect(page.getByRole('button', { name: 'Watch room react', exact: true })).toBeEnabled();
  });
  test('transport rejection with later effect remains fenced after Keep current and reconnect', async ({
    page,
  }) => {
    await ready(page);
    await page.evaluate(() => (window as any).__RESTORATION_PROOF__.mode('transport'));
    await watch(page);
    await expect(page.getByText('Light restoration needs review', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Review restoration', exact: true }).click();
    await expect(page.locator('preview-restoration-dialog')).toContainText('outcome unknown');
    await page.getByRole('button', { name: 'Keep current lights', exact: true }).click();
    await page.evaluate(() => {
      const p = (window as any).__RESTORATION_PROOF__;
      p.disconnect();
      p.reconnect();
    });
    await expect.poll(async () => (await summary(page)).effects).toBe(2);
    await expect(
      page.getByRole('button', { name: 'Watch room react', exact: true })
    ).toBeDisabled();
    expect((await summary(page)).services).toBe(2);
  });
  test('pending preview detach then late authoritative receipt requires fresh review', async ({
    page,
  }) => {
    await ready(page);
    await page.evaluate(() => (window as any).__RESTORATION_PROOF__.mode('hold'));
    await watch(page);
    await page.locator('#leave').click();
    await page.evaluate(async () => (window as any).__RESTORATION_PROOF__.release());
    await page.locator('#return').click();
    await expect(
      page.getByRole('button', { name: 'Review restoration', exact: true })
    ).toBeVisible();
    expect((await summary(page)).services).toBe(2);
    await page.getByRole('button', { name: 'Review restoration', exact: true }).click();
    await expect(page.locator('preview-restoration-dialog')).toContainText('preview acknowledged');
    await expect(
      page.getByRole('button', { name: 'Restore selected lights', exact: true })
    ).toBeDisabled();
  });
  for (const action of ['Save', 'Cancel'])
    test(`${action} reports shape result separately from restoration failure`, async ({ page }) => {
      await ready(page);
      await page.locator('curve-legend .row-select-btn').first().click();
      await page.locator('[data-preset="dim_accent"]').click();
      await watch(page);
      await page.evaluate(() => (window as any).__RESTORATION_PROOF__.mode('reject'));
      await page
        .getByRole('button', {
          name: action === 'Save' ? 'Save changes (Ctrl+S)' : 'Cancel changes',
          exact: true,
        })
        .click();
      await expect.poll(async () => (await summary(page)).dirty).toBe(false);
      await expect(
        page.getByRole('button', { name: 'Review restoration', exact: true })
      ).toBeVisible();
      await page.getByRole('button', { name: 'Review restoration', exact: true }).click();
      await expect(page.locator('preview-restoration-dialog')).toContainText('restore rejected');
    });
  test('hard document loss can leave synthetic light state outside the destroyed page', async ({
    page,
    context,
  }) => {
    const outside = new Map<string, unknown>();
    await page.exposeFunction('__OUTSIDE_EFFECT__', (command: any) =>
      outside.set(
        command.data.entity_id,
        command.service === 'turn_off' ? 'off' : (command.data.brightness ?? 'on')
      )
    );
    await ready(page);
    await watch(page);
    await expect.poll(() => outside.size).toBe(2);
    const before = [...outside];
    await page.close();
    const replacement = await context.newPage();
    await ready(replacement);
    expect([...outside]).toEqual(before);
    expect(outside.get('light.ceiling')).toBe(255);
    expect((await summary(replacement)).services).toBe(0);
    await expect(
      replacement.getByRole('button', { name: 'Review restoration', exact: true })
    ).toHaveCount(0);
  });
  test('existing demo adapter supplies authenticated connection/state and terminal service receipts', async ({
    page,
  }) => {
    await ready(page);
    const result = await page.evaluate(async () => {
      const path = '/js/dev/fake-ha.js';
      const { createPreviewHass } = await import(path);
      const { hass } = createPreviewHass();
      const id = Object.keys(hass.states).find((key) => key.startsWith('light.'));
      const receipt = await hass.callService('light', 'turn_on', { entity_id: id, brightness: 41 });
      return {
        user: hass.user.id,
        connected: hass.connected && hass.connection.connected,
        brightness: hass.states[id].attributes.brightness,
        receipt: !!receipt.context.id,
      };
    });
    expect(result).toEqual({
      user: 'preview-user',
      connected: true,
      brightness: 41,
      receipt: true,
    });
  });
  test.describe('focused brightness guidance', () => {
    test.use({ hasTouch: true });
    test('Watch keeps its description while touch Brightness tips focus on shaping lights', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 900 });
      await ready(page);
      const watch = page.getByRole('button', { name: 'Watch room react', exact: true });
      await expect(watch).toHaveAccessibleDescription(
        /Leaving this editor or losing connection.*Restoring can overwrite/
      );
      await page.getByRole('button', { name: 'Brightness tips', exact: true }).tap({ force: true });
      await expect(page.locator('.coach-copy strong')).toHaveText('Dim a bright light');
      await expect(page.locator('.coach-copy span')).toHaveText(
        'Select the light, then choose Dim.'
      );
      expect((await summary(page)).services).toBe(0);
    });
  });
  test('same-principal permission loss keeps restoration readable and disables disposition', async ({
    page,
  }) => {
    await ready(page);
    await watch(page);
    await page.locator('#leave').click();
    await page.locator('#return').click();
    await page.evaluate(() => {
      const p = (window as any).__RESTORATION_PROOF__;
      p.hass.user = { ...p.hass.user, is_admin: false };
      p.card.hass = { ...p.hass };
    });
    await page.getByRole('button', { name: 'Review restoration', exact: true }).click();
    const dialog = page.locator('preview-restoration-dialog');
    await expect(dialog).toContainText('light.ceiling');
    await expect(
      dialog.getByRole('button', { name: 'Keep current lights', exact: true })
    ).toBeDisabled();
    await expect(
      dialog.getByRole('button', { name: 'Restore selected lights', exact: true })
    ).toBeDisabled();
    expect(
      await page.evaluate(() => {
        const c = (window as any).__RESTORATION_PROOF__.card._previewController;
        return c.keepCurrent(c.reviewToken());
      })
    ).toBe(false);
    expect((await summary(page)).services).toBe(2);
  });
});
