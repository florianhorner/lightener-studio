import { expect, test, type Page } from '@playwright/test';
import { VB_H, VB_W } from '../src/utils/graph-math';
import {
  GROUP_MENU,
  GROUP_SWITCHER,
  chooseGroup,
  groupItem,
  newGroupItem,
  openGroupMenu,
  openMoreMenu,
  closeMoreMenu,
} from './panel-header';

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
  // The list sits under the graph; focusing it must not scroll the geometry under test.
  await light.evaluate((input: HTMLElement) => input.focus({ preventScroll: true }));
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => page.evaluate(() => window.__TOOLBAR__.panel._card.dirty)).toBe(true);
}
function save(page: Page) {
  return page.getByRole('button', { name: 'Save changes (Ctrl+S)', exact: true });
}
function more(page: Page) {
  return page.getByRole('button', { name: 'More actions', exact: true });
}
/** Show me how lives in the toolbar's ⋮ menu. */
async function showMeHow(page: Page, how: 'press' | 'click' | 'tap' = 'click') {
  const item = page.locator('.more-item.show-me-how');
  if (how === 'press') {
    await more(page).press('Enter');
    await item.press('Enter');
  } else if (how === 'tap') {
    await more(page).tap();
    await item.tap();
  } else {
    await more(page).click();
    await item.click();
  }
}
/** The panel header hosts the card's exit slot and ⋮; the rows under Room stay in the card. */
async function expectHostedToolbar(page: Page) {
  await expect(page.locator('#toolbar-host .more-button')).toBeVisible();
  await expect(page.locator('#toolbar-host .exit-slot')).toHaveCount(1);
  await expect(page.locator('lightener-curve-card .editor-toolbar')).toHaveCount(0);
  await expect(page.locator('#toolbar-host .edit-row, #toolbar-host .message-line')).toHaveCount(0);
  await expect(page.locator('lightener-curve-card .control-dock')).toHaveCount(1);
  // One visible copy of each duplicated control, whichever side of 640px or 1100px.
  await expect(page.locator('.btn-undo:visible')).toHaveCount(
    (await page.locator('lightener-curve-card .edit-row').count()) > 0 ? 1 : 0
  );
}

for (const viewport of [
  { width: 1440, height: 800 },
  { width: 1920, height: 900 },
]) {
  test(`toolbar, graph and actions fit without scrolling at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await ready(page, 'sidebar=256');
    await expectHostedToolbar(page);
    // The switcher lists groups only; New group… is an administrator's ⋮ item,
    // directly before Delete group….
    await openGroupMenu(page);
    await expect(page.getByRole('menuitem', { name: 'New group…', exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator(GROUP_MENU)).toBeHidden();
    await openMoreMenu(page);
    await expect(newGroupItem(page)).toBeVisible();
    await expect(newGroupItem(page).locator('xpath=following-sibling::*[1]')).toHaveText(
      'Delete group…'
    );
    await closeMoreMenu(page);
    // View offers Edit; Save appears only once there is a change.
    await expect(page.locator('#toolbar-host .exit-slot')).toHaveAttribute('data-state', 'view');
    await expect(save(page)).toHaveCount(0);
    const before = await geometry(page);
    // The graph fills its column up to the 520px editor cap.
    expect(before.height).toBeCloseTo(Math.min(520, (before.width * VB_H) / VB_W), 0);
    expect(before.toolbarHeight).toBeLessThanOrEqual(112);
    await edit(page);
    await expect(save(page)).toBeEnabled();
    await expectUnmoved(page, before);
    const bounds = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - innerWidth,
      // The lights continue below the graph; the graph itself stays on screen.
      graphBelow: Math.max(
        0,
        Math.round(
          document
            .querySelector('lightener-editor-panel')!
            .shadowRoot!.querySelector('lightener-curve-card')!
            .shadowRoot!.querySelector('curve-graph')!
            .getBoundingClientRect().bottom - innerHeight
        )
      ),
      // From a 1100px panel the header carries chips and Undo; no row under Room shows.
      // (Undo alone moves up from 640px; see the 700px tests below.)
      rowsUnderRoom: [
        ...document
          .querySelector('lightener-editor-panel')!
          .shadowRoot!.querySelector('lightener-curve-card')!
          .shadowRoot!.querySelectorAll('.edit-row'),
      ].filter((row) => row.getClientRects().length > 0).length,
    }));
    expect(bounds).toEqual({ overflowX: 0, graphBelow: 0, rowsUnderRoom: 0 });
    // A grown plot keeps native-size x labels, so the Room grip stays close
    // under them instead of below the grown bottom padding.
    const gripGap = await page.evaluate(() => {
      const card = document
        .querySelector('lightener-editor-panel')!
        .shadowRoot!.querySelector('lightener-curve-card')!.shadowRoot!;
      const plot = card
        .querySelector('curve-graph')!
        .shadowRoot!.querySelector('.plot-frame')!
        .getBoundingClientRect();
      const grip = card
        .querySelector('curve-scrubber')!
        .shadowRoot!.querySelector('brightness-bar')!
        .shadowRoot!.querySelector('.marker')!
        .getBoundingClientRect();
      return grip.top - plot.bottom;
    });
    expect(gripGap).toBeGreaterThan(0);
    expect(gripGap).toBeLessThanOrEqual(56);
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
  await page.getByRole('switch', { name: 'Watch room react', exact: true }).press('Enter');
  await expect(page.getByRole('switch', { name: 'Watch room react', checked: true })).toBeVisible();
  await expect(page.locator('.watch-status')).toContainText(
    'Watching unsaved changes · Save keeps the shapes.'
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
  await expect(page.locator('.save-confirmed')).toHaveText('Saved');
  await expect(save(page)).toHaveCount(0);
  await expectUnmoved(page, before);
  expect(await page.evaluate(() => window.__TOOLBAR__.saves.length)).toBe(1);
  await expect(page.getByRole('switch', { name: 'Watch room react', exact: true })).toBeVisible();
});

test('picker Escape preserves edits, hosted shortcuts work, and Help restores focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await ready(page, 'sidebar=256');
  await edit(page);
  const picker = page.locator(GROUP_SWITCHER);
  const handle = await picker.elementHandle();
  await picker.focus();
  await picker.press('Escape');
  expect(await page.evaluate(() => window.__TOOLBAR__.panel._card.dirty)).toBe(true);
  // Escape in an open menu closes only the menu and returns focus to the switcher.
  await openGroupMenu(page);
  await page.keyboard.press('Escape');
  await expect(page.locator(GROUP_MENU)).toBeHidden();
  await expect(picker).toBeFocused();
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
          .shadowRoot!.querySelector('#group-switcher')
    )
  ).toBe(true);
  const help = more(page);
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
  await showMeHow(page, 'press');
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
  await expect(page.locator('.save-confirmed')).toHaveText('Saved');
  expect(await page.evaluate(() => window.__TOOLBAR__.saves.length)).toBe(1);
  await expect(page.locator('.save-confirmed')).toHaveCount(0);
  await showMeHow(page, 'press');
  await page.getByRole('button', { name: 'Done', exact: true }).press('Enter');
  await expect(help).toBeFocused();
  await showMeHow(page, 'press');
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
    await expectHostedToolbar(page);
    await expect(save(page)).toHaveCount(1);
    await expect(save(page)).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  }
  await ready(page, 'admin=0&sidebar=256');
  // Viewers get no Edit pill and no writing commands.
  await expect(page.locator('#toolbar-host .exit-slot')).toHaveAttribute('data-state', 'empty');
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await openMoreMenu(page);
  await expect(newGroupItem(page)).toHaveCount(0);
  await closeMoreMenu(page);
  await expect(save(page)).toHaveCount(0);
  await ready(page, 'sidebar=256&config_entry=room-entry');
  await expectHostedToolbar(page);
  // A scoped link picks the first group only: every group stays in the switcher
  // and New group… stays in ⋮.
  await openMoreMenu(page);
  await expect(newGroupItem(page)).toHaveCount(1);
  await closeMoreMenu(page);
  await openGroupMenu(page);
  await expect(groupItem(page, 'light.room')).toBeVisible();
  await expect(groupItem(page, 'light.other_room')).toBeVisible();
});

test('crossing the wide/narrow boundary keeps the exit slot and keyboard focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await ready(page);
  await edit(page);
  await save(page).focus();
  const handle = await save(page).elementHandle();
  await page.setViewportSize({ width: 900, height: 800 });
  await expectHostedToolbar(page);
  await expect(save(page)).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 800 });
  await expectHostedToolbar(page);
  await expect(save(page)).toBeFocused();
  expect(await handle!.evaluate((button) => button.isConnected)).toBe(true);
  const picker = page.locator(GROUP_SWITCHER);
  await picker.focus();
  await page.setViewportSize({ width: 900, height: 800 });
  await expect(picker).toBeFocused();
});

test('Undo and Watch keep keyboard focus across the 640px and 1100px boundaries', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await ready(page);
  await edit(page);
  // Watch has a copy on each side of 1100px, Undo on each side of 640px; keyboard
  // focus follows the visible one.
  for (const [control, widths] of [
    [page.getByRole('button', { name: 'Undo', exact: true }), [600, 1440]],
    [page.getByRole('switch', { name: 'Watch room react', exact: true }), [900, 1440]],
  ] as const) {
    for (const width of widths) {
      await control.focus();
      await page.setViewportSize({ width, height: 800 });
      await expect(control).toBeFocused();
    }
  }
});

test.describe('Undo in the header from 640px, chips and Watch from 1100px', () => {
  test.use({ viewport: { width: 760, height: 800 } });

  /** Where a visible control sits: above the graph (header) or below it (under Room). */
  async function place(page: Page, locator: ReturnType<Page['locator']>) {
    const graph = await page.evaluate(() => {
      const box = window.__TOOLBAR__.panel._card
        .shadowRoot!.querySelector('curve-graph')!
        .getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    });
    const box = (await locator.first().boundingBox())!;
    return box.y + box.height <= graph.top
      ? 'header'
      : box.y >= graph.bottom - 1
        ? 'room'
        : 'other';
  }

  test('a selected light: Undo in the header, chips and Watch under Room', async ({ page }) => {
    await ready(page);
    await edit(page);
    await expect(page.locator('.btn-undo:visible')).toHaveCount(1);
    expect(await place(page, page.locator('.btn-undo:visible'))).toBe('header');
    expect(await place(page, page.locator('.preset-option:visible'))).toBe('room');
    expect(await place(page, page.getByRole('switch', { name: 'Watch room react' }))).toBe('room');
  });

  test('Undo alone leaves no blank row under Room', async ({ page }) => {
    await ready(page);
    await edit(page);
    // Clear the selection: Undo stays (there is history) but no chips remain.
    await page.locator('curve-legend .all-lights').click();
    await expect(page.locator('.preset-option:visible')).toHaveCount(0);
    await expect(page.locator('.btn-undo:visible')).toHaveCount(1);
    expect(await place(page, page.locator('.btn-undo:visible'))).toBe('header');
    const rows = await page.evaluate(
      () =>
        [...window.__TOOLBAR__.panel._card.shadowRoot!.querySelectorAll('.edit-row')].filter(
          (row) => row.getClientRects().length > 0
        ).length
    );
    expect(rows).toBe(0);
  });
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
      await page.getByRole('switch', { name: 'Watch room react', exact: true }).press('Enter');
      const preview = page.getByRole('switch', { name: 'Watch room react', checked: true });
      await expect(preview).toBeVisible();
      if (font !== 'native') await expect(preview).toHaveCSS('font-family', font);
      const labelFits = await preview.evaluate((button) => {
        const bounds = button.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(button);
        const content = range.getBoundingClientRect();
        const dot = button.querySelector('.preview-knob')!.getBoundingClientRect();
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
      const actionsBox = (await page.locator('.message-line').boundingBox())!;
      expect(statusBox.x).toBeGreaterThanOrEqual(actionsBox.x);
      expect(statusBox.x + statusBox.width).toBeLessThanOrEqual(actionsBox.x + actionsBox.width);
      expect(statusBox.y).toBeGreaterThanOrEqual(actionsBox.y);
      expect(statusBox.y + statusBox.height).toBeLessThanOrEqual(actionsBox.y + actionsBox.height);
      // The compact action row can wrap. Require disjoint status/control bounds
      // rather than the former single-row left-to-right relationship.
      const separateControls = await page.locator('.message-line').evaluate((row) => {
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
      const helpBox = (await more(page).boundingBox())!;
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
      // A running example presses its cue and animates the curve; freezing stops both.
      pressed: c._invitation.cue?.pressed === true,
      animating: c._invitation.curveFrame !== null,
      frozen: c._invitation.frozen,
      phase: c._invitation.phase,
      services: f.services.length,
      saves: f.saves.length,
      saveRequests: f.calls.filter((call) => call.type === 'lightener/save_curves').length,
    };
  });
}
/** The ceremony starts on the saved shape; wait until Dim supplies its editable midpoint. */
async function exampleHandle(page: Page) {
  const point = page.locator('curve-graph .hit-circle[data-curve="0"][data-point="3"]');
  await expect(point).toHaveAccessibleName(/point 50% group brightness to 30% light brightness/);
  return point;
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
    await showMeHow(page, 'press');
    await expect(page.locator('.canvas-guidance-text')).toHaveCSS('font-family', 'monospace');
    await expectUnmoved(page, before);
    const textFits = await page.locator('.canvas-guidance-text').evaluate((text) => {
      const row = text.parentElement!.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(text);
      const bounds = range.getBoundingClientRect();
      return (
        bounds.top >= row.top && bounds.bottom <= row.bottom && text.scrollWidth <= text.clientWidth
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
      help = more(page);
    for (let attempt = 0; attempt < 3; attempt++) {
      await showMeHow(page, 'press');
      await expect(page.locator('.canvas-guidance-text')).not.toBeEmpty();
      const handle = page.locator('curve-graph .hit-circle[data-point="3"]');
      await expect(handle).toHaveAccessibleDescription(
        'Example shape. Changing a point keeps this shape as an unsaved edit. Undo restores your previous shape.'
      );
      await expect(page.locator('.invitation-announcement')).not.toBeEmpty();
      await page.getByRole('button', { name: 'Replay', exact: true }).press('Enter');
      await expectUnmoved(page, before);
      expect(savedWork(await helpState(page))).toEqual(savedWork(baseline));
      await noHelpWrites(page);
      if (attempt === 0)
        await page.screenshot({
          path: test.info().outputPath(`canvas-help-${width}.png`),
          fullPage: true,
        });
      if (attempt === 1) {
        await page.locator('curve-legend .row-select-btn').last().click();
        // Reaching the last row scrolls the page; that is not a layout shift.
        await page.evaluate(() => window.scrollTo(0, 0));
      } else {
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
    help = () => showMeHow(page);
  const adopt = async () => {
    await help();
    const point = await exampleHandle(page);
    await point.focus();
    await point.press('ArrowUp');
    await expect(save(page)).toBeEnabled();
  };
  await adopt();
  const draft = await helpState(page);
  expect(draft.dirty).toBe(true);
  expect(draft.undo.length).toBe(baseline.undo.length + 1);
  await noHelpWrites(page);
  await help();
  await expect(page.locator('.canvas-notice')).toContainText('Your edits are unchanged');
  expect(savedWork(await helpState(page))).toEqual(savedWork(draft));
  await noHelpWrites(page);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  // Undo back to the saved shape keeps Edit, so Done replaces Cancel and Save.
  await expect(save(page)).toHaveCount(0);
  await expect.poll(async () => savedWork(await helpState(page))).toEqual(savedWork(baseline));
  await noHelpWrites(page);
  await adopt();
  await noHelpWrites(page);
  await save(page).click();
  await expect.poll(async () => (await helpState(page)).saves).toBe(1);
  await expect(save(page)).toHaveCount(0);
  await noHelpWrites(page, 0, 1);
});
test('canvas help proof: reduced motion freezes a running example and replay stays still', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  const baseline = await helpState(page),
    help = () => showMeHow(page);
  await help();
  await expect.poll(async () => (await helpState(page)).pressed).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => (await helpState(page)).frozen).toBe(true);
  const frozen = await helpState(page);
  expect(frozen).toMatchObject({ pressed: false, animating: false });
  await page.waitForTimeout(200);
  expect((await helpState(page)).example).toEqual(frozen.example);
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  const replayed = await helpState(page);
  await page.waitForTimeout(200);
  expect(await helpState(page)).toMatchObject({
    pressed: false,
    animating: false,
    example: replayed.example,
  });
  expect(savedWork(await helpState(page))).toEqual(savedWork(baseline));
  await noHelpWrites(page);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
});
test('canvas help proof: group changes interrupt examples and recovered drafts refuse a fresh example', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  const help = () => showMeHow(page);
  await help();
  await chooseGroup(page, 'light.other_room');
  await expect(page.locator('.canvas-guidance-text')).toHaveCount(0);
  await noHelpWrites(page);
  await chooseGroup(page, 'light.room');
  await expect(page.locator('curve-legend .legend-item').first()).toBeVisible();
  await help();
  const point = await exampleHandle(page);
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
  await help();
  await expect(page.locator('.canvas-notice')).toContainText('Your edits are unchanged');
  expect(savedWork(await helpState(page))).toEqual(savedWork(draft));
  await noHelpWrites(page);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(save(page)).toHaveCount(0);
  await noHelpWrites(page);
});
test('canvas help proof: Watch refusal and restart never issue help-origin light commands', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  const help = () => showMeHow(page);
  await page.getByRole('switch', { name: 'Watch room react', exact: true }).click();
  await expect.poll(async () => (await helpState(page)).services).toBeGreaterThan(0);
  const watching = await helpState(page);
  await help();
  await expect(page.locator('.canvas-notice')).toContainText(
    'Turn off Watch room react before starting'
  );
  await noHelpWrites(page, watching.services, 0);
  expect((await helpState(page)).example).toBeNull();
  await page.getByRole('switch', { name: 'Watch room react', checked: true }).click();
  await expect(page.getByRole('switch', { name: 'Watch room react', exact: true })).toBeEnabled();
  const settled = await helpState(page);
  await help();
  await expect(page.locator('.canvas-guidance-text')).not.toBeEmpty();
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await noHelpWrites(page, settled.services, 0);
});

test('Show me how sweeps Room without a competing grip nudge or horizontal scroll at 390px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  const room = page.getByRole('slider', { name: 'Room brightness', exact: true });
  await expect(room).toHaveValue('100');
  const settled = await helpState(page);
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await showMeHow(page);
  const marker = () =>
    page.evaluate(() => {
      const bar = window.__TOOLBAR__.panel._card
        .shadowRoot!.querySelector('curve-scrubber')!
        .shadowRoot!.querySelector('brightness-bar')!.shadowRoot!;
      return {
        playing: bar.querySelector('.marker')!.getAnimations().length,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
  expect((await marker()).playing).toBe(0);
  await page.clock.runFor(8500);
  expect((await helpState(page)).phase).toBe('room');
  expect(Number(await room.inputValue())).toBeLessThan(100);
  expect((await marker()).playing).toBe(0);
  expect((await marker()).overflow).toBe(0);
  await page.clock.runFor(8600);
  await expect(room).toHaveValue('100');
  expect(savedWork(await helpState(page))).toEqual(savedWork(settled));
  await noHelpWrites(page, settled.services, 0);
});

test.describe('emulated touch canvas help proof', () => {
  test.use({ hasTouch: true });
  test('touch adoption stays local and Undo restores the prior clean shape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ready(page);
    const baseline = await helpState(page);
    await showMeHow(page, 'tap');
    const point = await exampleHandle(page);
    const box = (await point.boundingBox())!,
      x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    const touch = await page.context().newCDPSession(page);
    // Use a paced native drag: an instantaneous move/release can swallow the next tap in Chromium.
    await touch.send('Input.synthesizeScrollGesture', {
      x,
      y,
      xDistance: 20,
      yDistance: -24,
      gestureSourceType: 'touch',
      preventFling: true,
      speed: 200,
    });
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
    await page.getByRole('switch', { name: 'Watch room react', exact: true }).click();
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
    test(`built ${width}px: Watch off puts lights back silently, with no review and no overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await ready(page);
      await watch(page);
      await page.getByRole('switch', { name: 'Watch room react', checked: true }).click();
      await expect
        .poll(async () => (await summary(page)).values)
        .toEqual({ 'light.group': 'on', 'light.ceiling': 73, 'light.sofa': 'off' });
      await expect(page.getByText(/restoration/i)).toHaveCount(0);
      await expect(
        page.getByRole('switch', { name: 'Watch room react', exact: true })
      ).toBeEnabled();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
      ).toBe(true);
      await page.screenshot({
        path: test.info().outputPath(`watch-off-${width}.png`),
        fullPage: true,
      });
    });
  test('leaving the editor puts the lights back; returning starts clean', async ({ page }) => {
    await ready(page);
    await watch(page);
    expect((await summary(page)).dirty).toBe(false);
    await page.locator('#leave').click();
    await expect.poll(async () => (await summary(page)).services).toBe(4);
    await page.locator('#return').click();
    expect((await summary(page)).values['light.ceiling']).toBe(73);
    await expect(page.getByRole('switch', { name: 'Watch room react', exact: true })).toBeEnabled();
  });
  test('quick on→off with a held preview reply restores once and unblocks Watch', async ({
    page,
  }) => {
    await ready(page);
    await page.evaluate(() => (window as any).__RESTORATION_PROOF__.mode('hold'));
    await page.getByRole('switch', { name: 'Watch room react', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__RESTORATION_PROOF__.services.length))
      .toBe(2);
    await page.getByRole('switch', { name: 'Watch room react', checked: true }).click();
    await page.evaluate(async () => {
      const p = (window as any).__RESTORATION_PROOF__;
      p.mode('success');
      await p.release();
    });
    await expect.poll(async () => (await summary(page)).services).toBe(4);
    expect((await summary(page)).values['light.ceiling']).toBe(73);
    await expect(page.getByRole('switch', { name: 'Watch room react', exact: true })).toBeEnabled();
  });
  for (const action of ['Save', 'Cancel'])
    test(`${action} keeps its shape result when putting a light back is rejected`, async ({
      page,
    }) => {
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
      await expect(page.getByText(/restoration/i)).toHaveCount(0);
      await expect(
        page.getByRole('switch', { name: 'Watch room react', exact: true })
      ).toBeEnabled();
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
      const watch = page.getByRole('switch', { name: 'Watch room react', exact: true });
      await expect(watch).toHaveAccessibleDescription(
        /Turning it off puts them back.*A lost connection/
      );
      await page.getByRole('button', { name: 'More actions', exact: true }).tap({ force: true });
      await page.locator('.more-item.show-me-how').tap({ force: true });
      await expect(page.locator('.coach-copy strong')).toHaveText('Dim a bright light');
      await expect(page.locator('.coach-copy span')).toHaveText(
        'Select the light, then choose Dim.'
      );
      expect((await summary(page)).services).toBe(0);
    });
  });
});
