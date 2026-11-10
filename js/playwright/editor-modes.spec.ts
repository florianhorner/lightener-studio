import { expect, test, type Locator, type Page } from '@playwright/test';
import { chooseGroup, moreButton, openGroupMenu, openMoreMenu } from './panel-header';

/**
 * View and Edit mode, end to end in a real browser with the hosted panel
 * header: real pointer gestures, real geometry, real container queries. The
 * state machine itself is unit tested in src/lightener-curve-card.modes.test.ts;
 * this spec pins what only a browser can show (nothing moves on entry, one
 * visible copy of each control, the save lifecycle on screen).
 */
type Fixture = {
  panel: HTMLElement & {
    _card: HTMLElement & {
      dirty: boolean;
      _curves: unknown;
      _undoStack: unknown[];
      _selectedCurveId: string | null;
    };
  };
  controls: {
    failNextSave: boolean;
    failCode: string;
    holdSave: boolean;
    releaseSave: (() => void) | null;
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

const CARD = 'lightener-curve-card';
const SAVE = 'Save changes (Ctrl+S)';
const WATCH = 'Watch room react';

async function settle(page: Page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
}
async function ready(page: Page, query = '') {
  await page.goto(`/js/playwright/fixtures/top-toolbar.html?seed=${test.info().testId}&${query}`);
  await expect(page.locator('curve-legend .legend-item').first()).toBeVisible();
  await expect(room(page)).toBeVisible();
  await settle(page);
}
function room(page: Page) {
  return page.getByRole('slider', { name: 'Room brightness', exact: true });
}
function watch(page: Page) {
  return page.getByRole('switch', { name: WATCH, exact: true });
}
function undo(page: Page) {
  return page.getByRole('button', { name: 'Undo', exact: true });
}
function saveButton(page: Page) {
  return page.getByRole('button', { name: SAVE, exact: true });
}
function editPill(page: Page) {
  return page.getByRole('button', { name: 'Edit', exact: true });
}
function more(page: Page) {
  return page.getByRole('button', { name: 'More actions', exact: true });
}
async function expectMode(page: Page, mode: 'view' | 'edit') {
  await expect(page.locator(CARD)).toHaveAttribute('data-mode', mode);
}
async function exitState(page: Page) {
  return page.locator('#toolbar-host .exit-slot').getAttribute('data-state');
}
/** The state a gesture must never change in View. */
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const f = window.__TOOLBAR__;
    const card = f.panel._card;
    return {
      curves: JSON.stringify(card._curves),
      dirty: card.dirty,
      undo: card._undoStack.length,
      saves: f.saves.length,
      saveRequests: f.calls.filter((call) => call.type === 'lightener/save_curves').length,
    };
  });
}
/** The graph's document-relative box, so page scrolling cannot read as movement. */
async function graphBox(page: Page) {
  return page.evaluate(() => {
    const graph = window.__TOOLBAR__.panel._card.shadowRoot!.querySelector('curve-graph')!;
    const box = graph.getBoundingClientRect();
    return {
      top: box.top + scrollY,
      left: box.left + scrollX,
      width: box.width,
      height: box.height,
    };
  });
}
function barBox(bar: Locator) {
  return bar.evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  });
}
async function dragBy(page: Page, from: { x: number; y: number }, dx: number, dy = 0) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 3 });
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 3 });
}
/** Select a light and apply a starting shape through the real controls: a changed draft with history. */
async function editThroughControls(page: Page, name = 'Ceiling Light') {
  await page
    .locator('curve-legend .legend-item')
    .filter({ hasText: name })
    .locator('.row-select-btn')
    .click();
  await page.locator('.preset-option[data-preset="dim_accent"]:visible').click();
  await expect(saveButton(page)).toBeEnabled();
}
/** One hit target of the first curve, found in View where every curve is available. */
function hitCircle(page: Page) {
  return page.locator('curve-graph .hit-circle[data-curve="0"][data-point="1"]');
}

test.describe('exit-slot keyboard focus', () => {
  test('Edit and Done keep focus on their replacements', async ({ page }) => {
    await ready(page);
    await editPill(page).focus();
    await page.keyboard.press('Enter');
    const done = page.getByRole('button', { name: 'Done', exact: true });
    await expect(done).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(editPill(page)).toBeFocused();
  });

  for (const action of ['save', 'cancel']) {
    test(`${action} keeps keyboard focus after completion`, async ({ page }) => {
      await ready(page);
      await editThroughControls(page);
      const button =
        action === 'save'
          ? saveButton(page)
          : page.getByRole('button', { name: 'Cancel changes', exact: true });
      await button.focus();
      await page.keyboard.press('Enter');
      await expectMode(page, 'view');
      await expect(action === 'save' ? more(page) : editPill(page)).toBeFocused();
    });
  }
});

test.describe('opens in View', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('no chips, no All lights, an Edit pill, ⋮ last; Room, Watch, hover and the switcher stay in View', async ({
    page,
  }) => {
    await ready(page);
    await expectMode(page, 'view');
    await expect(page.locator('.preset-option:visible')).toHaveCount(0);
    await expect(page.locator('curve-legend .all-lights')).toHaveCount(0);
    await expect(undo(page)).toHaveCount(0);
    await expect(editPill(page)).toBeVisible();
    expect(await exitState(page)).toBe('view');
    // ⋮ closes the header's control row.
    expect(
      await page.evaluate(() =>
        document
          .querySelector('lightener-editor-panel')!
          .shadowRoot!.querySelector('#toolbar-host .editor-toolbar')!
          .lastElementChild!.classList.contains('more-anchor')
      )
    ).toBe(true);

    const before = await snapshot(page);
    // Room brightness, by keyboard and by pointer.
    await room(page).focus();
    await page.keyboard.press('ArrowRight');
    const slider = (await room(page).boundingBox())!;
    await page.mouse.click(slider.x + slider.width * 0.3, slider.y + slider.height / 2);
    await expectMode(page, 'view');
    // Hovering a light row.
    await page.locator('curve-legend .legend-item').nth(1).hover();
    await expectMode(page, 'view');
    // Watch on and off.
    await watch(page).click();
    await expect(page.getByRole('switch', { name: WATCH, checked: true })).toBeVisible();
    await expectMode(page, 'view');
    await watch(page).click();
    await expect(page.getByRole('switch', { name: WATCH, checked: false })).toBeVisible();
    // The group switcher, open and switching groups.
    await openGroupMenu(page);
    await expectMode(page, 'view');
    await page.keyboard.press('Escape');
    await chooseGroup(page, 'light.other_room');
    await chooseGroup(page, 'light.room');
    await expectMode(page, 'view');
    await expect(page.locator('curve-legend .all-lights')).toHaveCount(0);
    expect(await snapshot(page)).toEqual(before);
  });
});

for (const viewport of [
  { width: 390, height: 700, columns: 1 },
  { width: 820, height: 600, columns: 2 },
  { width: 1512, height: 480, columns: 4 },
]) {
  test.describe(`first drag enters Edit at ${viewport.width}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('a point drag enters Edit in the same gesture and the graph never moves', async ({
      page,
    }) => {
      await ready(page, 'count=20&longnames=1');
      await expectMode(page, 'view');
      const hit = hitCircle(page);
      await hit.scrollIntoViewIfNeeded();
      const before = await graphBox(page);
      const box = (await hit.boundingBox())!;
      await dragBy(
        page,
        { x: box.x + box.width / 2, y: box.y + box.height / 2 },
        viewport.width < 500 ? 12 : 30,
        -14
      );
      // Entered by the first move, still held.
      await expectMode(page, 'edit');
      await settle(page);
      expect(await graphBox(page)).toEqual(before);
      await page.mouse.up();
      await settle(page);
      expect(await graphBox(page)).toEqual(before);
      await expect(page.locator('.edit-row, .header-chips .preset-option').first()).toBeAttached();
      await expect(saveButton(page)).toBeEnabled();
      await expect(page.locator('curve-legend .all-lights')).toBeVisible();
      expect(await page.evaluate(() => window.__TOOLBAR__.saves.length)).toBe(0);
    });

    test('a bar drag in a scrolled list enters Edit; the held bar and the graph stay put', async ({
      page,
    }) => {
      await ready(page, 'count=20&longnames=1');
      await expectMode(page, 'view');
      const list = await page.locator('curve-legend').evaluate((legend) => {
        const grid = legend.shadowRoot!.querySelector<HTMLElement>('.legend')!;
        grid.scrollTop = grid.scrollHeight;
        return {
          columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          scrollable: grid.scrollHeight > grid.clientHeight,
          scrollTop: grid.scrollTop,
        };
      });
      // 390px is one column by CSS (the grid's 320px minimum); wider panels flow into columns.
      expect(list.columns).toBe(viewport.columns);
      expect(list.scrollable).toBe(true);
      expect(list.scrollTop).toBeGreaterThan(0);

      const bar = page.locator('curve-legend brightness-bar').last();
      await bar.scrollIntoViewIfNeeded();
      const input = bar.locator('input');
      const before = await graphBox(page);
      const held = await barBox(bar);
      const box = (await input.boundingBox())!;
      await dragBy(page, { x: box.x + box.width * 0.4, y: box.y + box.height / 2 }, -60);
      await expectMode(page, 'edit');
      await settle(page);
      // Mode entry waits for the release: the bar under the finger does not move.
      expect(await barBox(bar)).toEqual(held);
      expect(await graphBox(page)).toEqual(before);
      await page.mouse.up();
      await settle(page);
      expect(await graphBox(page)).toEqual(before);
      await expect(saveButton(page)).toBeEnabled();
      await expect(page.locator('curve-legend .all-lights')).toBeVisible();
      expect(await page.evaluate(() => window.__TOOLBAR__.saves.length)).toBe(0);
    });
  });
}

test.describe('leaving Edit', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Done on a clean Edit returns to View and keeps Watch running', async ({ page }) => {
    await ready(page);
    await editPill(page).click();
    await expectMode(page, 'edit');
    expect(await exitState(page)).toBe('clean');
    await watch(page).click();
    await expect(page.getByRole('switch', { name: WATCH, checked: true })).toBeVisible();
    const services = await page.evaluate(() => window.__TOOLBAR__.services.length);
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expectMode(page, 'view');
    expect(await exitState(page)).toBe('view');
    await expect(page.getByRole('switch', { name: WATCH, checked: true })).toBeVisible();
    // Done sends nothing: no restore, no save.
    expect(await page.evaluate(() => window.__TOOLBAR__.services.length)).toBe(services);
    expect(await page.evaluate(() => window.__TOOLBAR__.saves.length)).toBe(0);
  });

  test('Cancel returns to View and Watch ends with the silent restore', async ({ page }) => {
    await ready(page);
    await editThroughControls(page);
    await watch(page).click();
    await expect(page.getByRole('switch', { name: WATCH, checked: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel changes', exact: true }).click();
    await expectMode(page, 'view');
    await expect(page.getByRole('switch', { name: WATCH, checked: false })).toBeVisible();
    await expect(editPill(page)).toBeVisible();
    const state = await snapshot(page);
    expect(state.dirty).toBe(false);
    expect(state.undo).toBe(0);
    expect(state.saveRequests).toBe(0);
  });

  test('Save returns to View only once the save confirms', async ({ page }) => {
    await ready(page);
    await editThroughControls(page);
    await watch(page).click();
    await expect(page.getByRole('switch', { name: WATCH, checked: true })).toBeVisible();
    await page.evaluate(() => {
      window.__TOOLBAR__.controls.holdSave = true;
    });
    await saveButton(page).click();
    await expect(saveButton(page)).toHaveText('Saving…');
    await expect(saveButton(page)).toBeDisabled();
    await settle(page);
    await expectMode(page, 'edit');
    await page.evaluate(() => {
      window.__TOOLBAR__.controls.holdSave = false;
      window.__TOOLBAR__.controls.releaseSave!();
    });
    await expect(page.locator('.save-confirmed')).toHaveText('Saved');
    await expectMode(page, 'view');
    expect((await snapshot(page)).dirty).toBe(false);
    expect(await page.evaluate(() => window.__TOOLBAR__.saves.length)).toBe(1);
    // Save ends Watch; the shapes stay saved.
    await expect(page.getByRole('switch', { name: WATCH, checked: false })).toBeVisible();
    await expect(editPill(page)).toBeVisible();
  });

  for (const failure of [
    { name: 'a failed save', code: 'invalid_format', text: 'Save failed' },
    { name: 'a conflicting save', code: 'conflict', text: 'Saved shapes changed' },
  ]) {
    test(`${failure.name} stays in Edit with the draft and Undo intact, and the message sits under Room`, async ({
      page,
    }) => {
      await ready(page);
      await editThroughControls(page);
      const draft = await snapshot(page);
      expect(draft.undo).toBe(1);
      const before = await graphBox(page);
      await page.evaluate((code) => {
        window.__TOOLBAR__.controls.failNextSave = true;
        window.__TOOLBAR__.controls.failCode = code;
      }, failure.code);
      await saveButton(page).click();
      const line = page.locator('.message-line');
      await expect(line).toContainText(failure.text);
      await settle(page);
      await expectMode(page, 'edit');
      const after = await snapshot(page);
      expect(after.curves).toBe(draft.curves);
      expect(after.dirty).toBe(true);
      expect(after.undo).toBe(1);
      expect(after.saves).toBe(0);
      await expect(undo(page)).toBeEnabled();
      // The message is under the Room row; the graph above it does not move.
      const roomBox = (await room(page).boundingBox())!;
      const lineBox = (await line.boundingBox())!;
      expect(lineBox.y).toBeGreaterThanOrEqual(roomBox.y + roomBox.height - 1);
      expect(await graphBox(page)).toEqual(before);
    });
  }
});

test.describe('Undo after deselecting', () => {
  async function deselectThenUndo(page: Page, tap: boolean) {
    const press = (locator: Locator) => (tap ? locator.tap() : locator.click());
    await press(
      page
        .locator('curve-legend .legend-item')
        .filter({ hasText: 'Ceiling Light' })
        .locator('.row-select-btn')
    );
    await press(page.locator('.preset-option[data-preset="dim_accent"]:visible'));
    await expect(saveButton(page)).toBeEnabled();
    await expect(undo(page)).toBeEnabled();
    await press(page.locator('curve-legend .all-lights'));
    await expect
      .poll(() => page.evaluate(() => window.__TOOLBAR__.panel._card._selectedCurveId))
      .toBeNull();
    // The draft and its history stay; Undo does not depend on a selection.
    await expect(page.locator('.preset-option:visible')).toHaveCount(0);
    await expectMode(page, 'edit');
    await expect(undo(page)).toBeVisible();
    await expect(undo(page)).toBeEnabled();
    const draft = await snapshot(page);
    expect(draft.dirty).toBe(true);
    expect(draft.undo).toBe(1);
    await press(undo(page));
    await expect.poll(async () => (await snapshot(page)).dirty).toBe(false);
    expect((await snapshot(page)).undo).toBe(0);
    await expectMode(page, 'edit');
  }

  for (const width of [1440, 900]) {
    test(`with the mouse at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await ready(page);
      await deselectThenUndo(page, false);
    });
  }
  test.describe('on touch', () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
    test('with a tap at 390px', async ({ page }) => {
      await ready(page);
      await deselectThenUndo(page, true);
    });
  });
});

test.describe('Escape per mode', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('does nothing in View', async ({ page }) => {
    await ready(page);
    await room(page).focus();
    const before = await snapshot(page);
    await page.keyboard.press('Escape');
    await settle(page);
    await expectMode(page, 'view');
    expect(await snapshot(page)).toEqual(before);
    await expect(editPill(page)).toBeVisible();
  });

  test('closes the ⋮ menu in the hosted header and returns focus to ⋮', async ({ page }) => {
    await ready(page);
    await openMoreMenu(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('.more-menu')).toHaveCount(0);
    await expect(moreButton(page)).toBeFocused();
    await expectMode(page, 'view');
  });

  test('in a clean Edit it clears the selection first, then leaves to View', async ({ page }) => {
    await ready(page);
    await page.locator('curve-legend .row-select-btn').first().click();
    await expectMode(page, 'edit');
    expect(
      await page.evaluate(() => window.__TOOLBAR__.panel._card._selectedCurveId)
    ).not.toBeNull();
    await page.keyboard.press('Escape');
    await expect
      .poll(() => page.evaluate(() => window.__TOOLBAR__.panel._card._selectedCurveId))
      .toBeNull();
    await expectMode(page, 'edit');
    await page.keyboard.press('Escape');
    await expectMode(page, 'view');
    expect(await page.evaluate(() => window.__TOOLBAR__.saves.length)).toBe(0);
  });

  test('on a changed draft it never discards: selection clears, then nothing', async ({ page }) => {
    await ready(page);
    await editThroughControls(page);
    const draft = await snapshot(page);
    await page.keyboard.press('Escape');
    await expect
      .poll(() => page.evaluate(() => window.__TOOLBAR__.panel._card._selectedCurveId))
      .toBeNull();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await settle(page);
    await expectMode(page, 'edit');
    expect(await snapshot(page)).toEqual(draft);
    await expect(undo(page)).toBeEnabled();
    await expect(saveButton(page)).toBeEnabled();
  });

  test('Show me how closes first, back to the mode it started in', async ({ page }) => {
    await ready(page);
    await more(page).click();
    await page.locator('.more-item.show-me-how').click();
    await expectMode(page, 'edit');
    await expect(page.locator('.canvas-done')).toBeVisible();
    await page.keyboard.press('Escape');
    await expectMode(page, 'view');
    await expect(editPill(page)).toBeVisible();
  });
});

test.describe('non-administrators', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('load in View with no Edit pill, no writing ⋮ items, and drags change nothing', async ({
    page,
  }) => {
    await ready(page, 'admin=0');
    await expectMode(page, 'view');
    await expect(editPill(page)).toHaveCount(0);
    expect(await exitState(page)).toBe('empty');
    await more(page).click();
    await expect(page.locator('.more-menu .more-item')).toHaveText(['Show me how']);
    await page.keyboard.press('Escape');
    const before = await snapshot(page);

    const bar = page.locator('curve-legend brightness-bar').first();
    const input = bar.locator('input');
    const box = (await input.boundingBox())!;
    await dragBy(page, { x: box.x + box.width * 0.5, y: box.y + box.height / 2 }, -50);
    await page.mouse.up();
    // Viewers get no draggable points; a drag across the graph changes nothing either.
    await expect(hitCircle(page)).toHaveCount(0);
    const graph = (await page.locator('curve-graph').boundingBox())!;
    await dragBy(
      page,
      { x: graph.x + graph.width * 0.5, y: graph.y + graph.height * 0.5 },
      40,
      -30
    );
    await page.mouse.up();
    await settle(page);
    await expectMode(page, 'view');
    expect(await snapshot(page)).toEqual(before);
    await expect(page.locator('curve-legend .all-lights')).toHaveCount(0);
    await expect(saveButton(page)).toHaveCount(0);
  });
});

test.describe('one visible copy at the 640px and 1100px shell boundaries', () => {
  for (const target of [639, 640, 1099, 1100]) {
    test(`Watch, chips and Undo at a ${target}px shell`, async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 900 });
      await ready(page);
      await editThroughControls(page);
      // Size the viewport from the shell, so the container is exactly `target` wide.
      const shellWidth = () =>
        page.evaluate(() => {
          const shell = document
            .querySelector('lightener-editor-panel')!
            .shadowRoot!.querySelector<HTMLElement>('.shell')!;
          const style = getComputedStyle(shell);
          return shell.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        });
      // The panel's padding changes with width, so converge on the target instead
      // of assuming the shell tracks the viewport one to one.
      let viewportWidth = 1200;
      for (let attempt = 0; attempt < 6; attempt++) {
        const current = await shellWidth();
        if (current === target) break;
        viewportWidth += target - current;
        await page.setViewportSize({ width: viewportWidth, height: 900 });
      }
      await expect.poll(shellWidth).toBe(target);
      await settle(page);

      // Chips are one set of presets; the other copy is display:none.
      const total = await page.locator('.preset-option').count();
      expect(total).toBeGreaterThan(0);
      expect(total % 2).toBe(0);
      await expect(page.locator('.preset-option:visible')).toHaveCount(total / 2);
      await expect(watch(page)).toHaveCount(1);
      await expect(page.locator('.btn-undo:visible')).toHaveCount(1);
      await expect(undo(page)).toHaveCount(1);

      const graph = (await page.evaluate(() => {
        const box = window.__TOOLBAR__.panel._card
          .shadowRoot!.querySelector('curve-graph')!
          .getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      }))!;
      const chip = (await page.locator('.preset-option:visible').first().boundingBox())!;
      const undoBox = (await undo(page).boundingBox())!;
      const watchBox = (await watch(page).boundingBox())!;
      // Undo moves into the panel header from 640px; chips and Watch from 1100px.
      const expectPlacement = (box: { y: number; height: number }, inHeader: boolean) => {
        if (inHeader) expect(box.y + box.height).toBeLessThanOrEqual(graph.top);
        else expect(box.y).toBeGreaterThanOrEqual(graph.bottom - 1);
      };
      expectPlacement(undoBox, target >= 640);
      expectPlacement(chip, target >= 1100);
      expectPlacement(watchBox, target >= 1100);
    });
  }
});

test.describe('⋮ menu', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('lists Show me how, Edit lights…, New group… and Delete group…; Edit lights… opens the membership dialog', async ({
    page,
  }) => {
    await ready(page);
    await more(page).click();
    await expect(page.locator('.more-menu .more-item')).toHaveText([
      'Show me how',
      'Edit lights…',
      'New group…',
      'Delete group…',
    ]);
    await page.getByRole('button', { name: 'Edit lights…', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit lights' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.list')).toHaveAttribute('aria-busy', 'false');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => window.__TOOLBAR__.saves.length)).toBe(0);
  });

  test('Delete group… asks first and, left unconfirmed, deletes nothing', async ({ page }) => {
    await ready(page);
    await more(page).click();
    await page.getByRole('button', { name: 'Delete group…', exact: true }).click();
    await expect(page.locator('curve-legend .delete-group-confirm')).toBeVisible();
    await settle(page);
    // Not confirmed: no delete or removal request left the card, and the group is intact.
    expect(
      await page.evaluate(() =>
        window.__TOOLBAR__.calls.some((call) => /delete|remove/i.test(call.type))
      )
    ).toBe(false);
    expect(await page.evaluate(() => window.__TOOLBAR__.services.length)).toBe(0);
    await expect(page.locator('curve-legend .legend-item').first()).toBeVisible();
  });

  test('Show me how from View ends back in View, never saves and never commands lights', async ({
    page,
  }) => {
    await ready(page);
    await more(page).click();
    await page.locator('.more-item.show-me-how').click();
    await expectMode(page, 'edit');
    const done = page.locator('.canvas-done');
    await expect(done).toBeVisible();
    await expect(page.locator('.canvas-guidance')).toBeVisible();
    await done.click();
    await expectMode(page, 'view');
    await expect(editPill(page)).toBeVisible();
    const state = await snapshot(page);
    expect(state.dirty).toBe(false);
    expect(state.undo).toBe(0);
    expect(state.saveRequests).toBe(0);
    expect(await page.evaluate(() => window.__TOOLBAR__.services.length)).toBe(0);
  });
});
