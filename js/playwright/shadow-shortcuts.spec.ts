import { expect, test, type Page } from '@playwright/test';
import type { LightCurve, Hass } from '../src/utils/types';

type EscapeCard = HTMLElement & {
  _curves: LightCurve[];
  _originalCurves: LightCurve[];
  _undoStack: LightCurve[][];
  _selectedCurveId: string | null;
  _isDirty: boolean;
  _hass: Hass;
  hass: Hass;
  setConfig(config: { entity: string }): void;
  updateComplete: Promise<unknown>;
};

async function editState(page: Page) {
  return page.evaluate(() => {
    const cards = [
      window.__LIGHTENER_CARD_ELEMENT__,
      document.querySelector('#escape-sibling'),
    ].filter(Boolean) as unknown as EscapeCard[];
    return JSON.parse(
      JSON.stringify({
        cards: cards.map((card) => ({
          curves: card._curves,
          original: card._originalCurves,
          history: card._undoStack,
          selected: card._selectedCurveId,
          dirty: card._isDirty,
        })),
        saves: window.__LIGHTENER_SAVED__,
      })
    );
  });
}

const FIXTURE = '/js/playwright/fixtures/long-name-card.html?mode=sidebar';
const SAVE = 'Save changes (Ctrl+S)';

async function selectAndEdit(page: Page, coachHost?: 'inline' | 'hosted') {
  // Legacy dashboard coaching remains supported. Mount an ordinary card inside
  // a shadow host for these contracts, separately from the panel's canvas Help.
  await page.goto(coachHost ? FIXTURE.replace('mode=sidebar', 'mode=standalone') : FIXTURE);
  await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
  if (coachHost)
    await page.evaluate(async (hosted) => {
      const card = window.__LIGHTENER_CARD_ELEMENT__! as unknown as EscapeCard & {
        canvasHelp: boolean;
        toolbarHost: HTMLElement | null;
      };
      const host = document.createElement('div');
      host.id = 'legacy-coach-host';
      const root = host.attachShadow({ mode: 'open' });
      card.parentElement!.append(host);
      root.append(card);
      if (hosted === 'hosted') {
        const toolbar = document.createElement('div');
        root.prepend(toolbar);
        card.toolbarHost = toolbar;
      }
      if (card.canvasHelp) throw new Error('Legacy coach fixture must be an ordinary card');
      await card.updateComplete;
    }, coachHost);
  await page.locator('curve-legend .row-select-btn').first().click();
  const originalLabel = await page
    .locator('curve-legend .row-select-btn')
    .first()
    .getAttribute('aria-label');
  const shape = page.locator('.preset-option[data-preset="early_starter"]');
  await shape.click();
  // Safari does not focus buttons on pointer clicks. These cases exercise
  // keyboard shortcuts from inside the card, so establish that focus explicitly.
  await shape.focus();
  await expect(page.getByRole('button', { name: SAVE, exact: true })).toBeEnabled();
  expect(
    await page.evaluate(() => document.activeElement?.localName),
    'focus is retargeted to the panel host outside the card'
  ).toBe(coachHost ? 'div' : 'lightener-editor-panel');
  return originalLabel;
}

test('Escape dismisses a shape trial and preserves edits and Undo inside the sidebar', async ({
  page,
}) => {
  const originalLabel = await selectAndEdit(page);
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.preview-curve-line')).toHaveCount(1);
  const before = await editState(page);

  await page.keyboard.press('Escape');
  await expect(page.locator('.preview-curve-line')).toHaveCount(0);
  await page.keyboard.press('Escape');

  expect(await editState(page)).toEqual(before);
  await expect(page.getByRole('button', { name: SAVE, exact: true })).toBeEnabled();
  expect(before.cards[0].dirty).toBe(true);
  expect(before.cards[0].history).toHaveLength(1);
  await page.getByRole('button', { name: 'Cancel changes', exact: true }).click();
  await expect(page.locator('curve-legend .row-select-btn').first()).toHaveAttribute(
    'aria-label',
    originalLabel!
  );
  await expect.poll(async () => (await editState(page)).cards[0].dirty).toBe(false);
  expect((await editState(page)).cards[0].history).toEqual([]);
  expect(await page.evaluate(() => window.__LIGHTENER_SAVED__)).toEqual([]);
});

test('Escape closes only its own tips after focus loss on a page with two dirty cards', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1800, height: 1000 });
  await selectAndEdit(page, 'hosted');
  await page.evaluate(async () => {
    const first = window.__LIGHTENER_CARD_ELEMENT__ as unknown as EscapeCard;
    const sibling = document.createElement('lightener-curve-card') as unknown as EscapeCard;
    sibling.id = 'escape-sibling';
    sibling.setConfig({ entity: 'light.second_group' });
    sibling.hass = {
      ...first._hass,
      states: {
        ...first._hass.states,
        'light.second_group': { state: 'on', attributes: { friendly_name: 'Second group' } },
      },
    };
    document.getElementById('root')!.append(sibling);
    await sibling.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const sibling = page.locator('#escape-sibling');
  await sibling.locator('curve-legend .row-select-btn').first().click();
  await sibling.locator('.preset-option[data-preset="dim_accent"]').click();
  await sibling.getByRole('button', { name: 'Brightness tips', exact: true }).click();
  const help = page.getByRole('button', { name: 'Brightness tips', exact: true }).first();
  await help.click();
  await help.focus();
  await expect(page.locator('.coach-prompt')).toHaveCount(2);
  const before = await editState(page);
  expect(
    before.cards.every(
      (card: { dirty: boolean; history: unknown[] }) => card.dirty && card.history.length === 1
    )
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('two-card-help-before.png'), fullPage: true });
  await help.evaluate((button) =>
    button.addEventListener('keydown', () => button.remove(), { once: true })
  );

  await page.keyboard.press('Escape');

  await expect(page.locator('.coach-prompt')).toHaveCount(1);
  await expect(sibling.locator('.coach-prompt')).toBeVisible();
  expect(await editState(page)).toEqual(before);
  await page.screenshot({ path: testInfo.outputPath('two-card-help-after.png'), fullPage: true });
  await testInfo.attach('two-card-help-state.json', {
    body: JSON.stringify(
      { before, after: await editState(page), viewport: page.viewportSize() },
      null,
      2
    ),
    contentType: 'application/json',
  });
  for (const [name, contentType] of [
    ['two-card-help-before.png', 'image/png'],
    ['two-card-help-after.png', 'image/png'],
  ] as const) {
    await testInfo.attach(name, { path: testInfo.outputPath(name), contentType });
  }
});

for (const modifier of ['Control', 'Meta']) {
  test(`${modifier}+S saves inside the sidebar`, async ({ page }) => {
    await selectAndEdit(page);

    await page.keyboard.press(`${modifier}+s`);

    await expect.poll(() => page.evaluate(() => window.__LIGHTENER_SAVED__?.length)).toBe(1);
    const save = page.getByRole('button', { name: SAVE, exact: true });
    if (await save.count()) await expect(save).toBeDisabled();
    expect(await page.evaluate(() => window.__LIGHTENER_SAVED__?.[0])).toMatchObject({
      'light.living_room_overhead_ambient_controller_zone_001': {
        brightness: { '15': '36', '50': '85', '65': '93', '100': '100' },
      },
    });
  });

  test(`${modifier}+Z undoes inside the sidebar`, async ({ page }) => {
    const originalLabel = await selectAndEdit(page);

    await page.keyboard.press(`${modifier}+z`);

    const save = page.getByRole('button', { name: SAVE, exact: true });
    if (await save.count()) await expect(save).toBeDisabled();
    await expect(page.locator('curve-legend .row-select-btn').first()).toHaveAttribute(
      'aria-label',
      originalLabel!
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

for (const host of ['inline', 'hosted'] as const) {
  for (const origin of ['tip', 'row', 'graph', 'help'] as const) {
    test(`Escape from ${origin} preserves edits and restores only disappearing focus (${host})`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: host === 'inline' ? 390 : 1800, height: 1000 });
      await selectAndEdit(page, host);
      const help = page.getByRole('button', { name: 'Brightness tips', exact: true });
      await help.click();
      await expect(page.locator('.coach-prompt')).toBeVisible();
      const target =
        origin === 'tip'
          ? page.locator('.coach-dismiss')
          : origin === 'row'
            ? page.locator('curve-legend .row-select-btn').first()
            : origin === 'graph'
              ? page.locator('curve-graph .hit-circle').first()
              : help;
      await target.focus();
      await expect(target).toBeFocused();
      const before = await editState(page);
      expect(before.cards[0].dirty).toBe(true);
      expect(before.cards[0].history).toHaveLength(1);
      if (origin === 'tip') {
        const path = testInfo.outputPath(`${host}-tips-focus-before.png`);
        await page.screenshot({ path, fullPage: true });
        await testInfo.attach(`${host}-tips-focus-before`, { path, contentType: 'image/png' });
      }

      await page.keyboard.press('Escape');

      await expect(page.locator('.coach-prompt')).toHaveCount(0);
      await expect(origin === 'tip' ? help : target).toBeFocused();
      const after = await editState(page);
      expect(after).toEqual(before);
      await testInfo.attach('focus-state', {
        body: JSON.stringify(
          { host, origin, before, after, focus: origin === 'tip' ? 'help' : origin },
          null,
          2
        ),
        contentType: 'application/json',
      });
      if (origin === 'tip') {
        const path = testInfo.outputPath(`${host}-tips-focus-after.png`);
        await page.screenshot({ path, fullPage: true });
        await testInfo.attach(`${host}-tips-focus-after`, { path, contentType: 'image/png' });
      }
    });
  }
}

for (const host of ['inline', 'hosted'] as const) {
  test(`Escape tip recovery preserves an earlier keydown listener's external focus (${host})`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: host === 'inline' ? 390 : 1800, height: 1000 });
    await selectAndEdit(page, host);
    await page.getByRole('button', { name: 'Brightness tips', exact: true }).click();
    const dismiss = page.locator('.coach-dismiss');
    await dismiss.focus();
    await dismiss.evaluate((button) => {
      const input = document.createElement('input');
      input.setAttribute('aria-label', 'External focus');
      document.body.append(input);
      button.addEventListener('keydown', () => input.focus(), { once: true });
    });
    const before = await editState(page);

    await page.keyboard.press('Escape');

    await expect(page.locator('.coach-prompt')).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'External focus' })).toBeFocused();
    expect(await editState(page)).toEqual(before);
    await testInfo.attach('external-focus-state', {
      body: JSON.stringify(
        { host, before, after: await editState(page), focus: 'external input' },
        null,
        2
      ),
      contentType: 'application/json',
    });
  });

  test(`ordinary tip click still returns focus to Help (${host})`, async ({ page }) => {
    await page.setViewportSize({ width: host === 'inline' ? 390 : 1800, height: 1000 });
    await selectAndEdit(page, host);
    const help = page.getByRole('button', { name: 'Brightness tips', exact: true });
    await help.click();
    const before = await editState(page);

    await page.locator('.coach-dismiss').click();

    await expect(page.locator('.coach-prompt')).toHaveCount(0);
    await expect(help).toBeFocused();
    expect(await editState(page)).toEqual(before);
  });
}

for (const host of ['inline', 'hosted'] as const) {
  for (const origin of ['button', 'graph'] as const) {
    for (const spacing of [0, 150]) {
      test(`five rapid Undo requests via ${origin} at ${spacing}ms (${host})`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width: host === 'inline' ? 390 : 1800, height: 1000 });
        await selectAndEdit(page);
        await page.clock.install();
        await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
        for (const preset of ['dim_accent', 'late_starter', 'dim_accent', 'late_starter']) {
          await page.locator(`.preset-option[data-preset="${preset}"]`).click();
        }
        expect((await editState(page)).cards[0].history).toHaveLength(5);
        const undo = page.getByRole('button', { name: 'Undo', exact: true });
        if (origin === 'graph') await page.locator('curve-graph .hit-circle').first().focus();
        const box = await undo.boundingBox();
        expect(box).not.toBeNull();
        await page.screenshot({
          path: testInfo.outputPath('rapid-undo-before.png'),
          fullPage: true,
        });
        for (let i = 0; i < 5; i++) {
          if (origin === 'button')
            await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
          else await page.keyboard.press('Control+z');
          if (i === 0) {
            await expect(page.getByRole('button', { name: SAVE, exact: true })).toBeDisabled();
            await expect(
              page.getByRole('button', { name: 'Cancel changes', exact: true })
            ).toBeDisabled();
            await expect(undo).toBeEnabled();
            if (origin === 'graph')
              await expect(
                page.getByRole('region', { name: 'Brightness editor', exact: true })
              ).toBeFocused();
          }
          if (spacing) await page.clock.runFor(spacing);
        }
        const requested = await editState(page);
        await page.clock.runFor(500);
        const after = await editState(page);
        await page.screenshot({
          path: testInfo.outputPath('rapid-undo-after.png'),
          fullPage: true,
        });
        await testInfo.attach('rapid-undo-state', {
          body: JSON.stringify({ host, origin, spacing, requested, after }, null, 2),
          contentType: 'application/json',
        });
        expect(requested.cards[0].history).toHaveLength(0);
        expect(after.cards[0].curves).toEqual(after.cards[0].original);
        expect(after.cards[0].dirty).toBe(false);
        expect(after.saves).toEqual([]);
      });
    }
  }
}

for (const host of ['inline', 'hosted'] as const) {
  for (const action of ['Undo', 'Cancel'] as const) {
    for (const modifier of ['Control', 'Meta']) {
      test(`${modifier}+S stays owned during ${action} animation (${host})`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width: host === 'inline' ? 390 : 1800, height: 1000 });
        await selectAndEdit(page);
        await page.clock.install();
        await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
        await page.locator('.preset-option[data-preset="dim_accent"]').click();
        await page.evaluate(() => {
          const card = window.__LIGHTENER_CARD_ELEMENT__ as unknown as EscapeCard & {
            shortcutEvents: boolean[];
            shortcutCalls: string[];
          };
          card.shortcutEvents = [];
          card.shortcutCalls = [];
          window.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 's' && (event.ctrlKey || event.metaKey))
              card.shortcutEvents.push(event.defaultPrevented);
          });
          for (const method of ['callWS', 'callApi', 'callService'] as const) {
            card._hass[method] = new Proxy(card._hass[method], {
              apply(target, thisArg, args) {
                card.shortcutCalls.push(method);
                return Reflect.apply(target, thisArg, args);
              },
            });
          }
        });
        await page
          .getByRole('button', { name: action === 'Undo' ? 'Undo' : 'Cancel changes', exact: true })
          .click();
        await page.clock.runFor(80);
        const before = await editState(page);
        await page.keyboard.press(`${modifier}+s`);
        expect(await editState(page)).toEqual(before);
        if (action === 'Undo') {
          await page.keyboard.press('Control+z');
          await page.clock.runFor(80);
          const repeated = await editState(page);
          await page.keyboard.press(`${modifier}+s`);
          expect(await editState(page)).toEqual(repeated);
        }
        const observed = await page.evaluate(() => {
          const card = window.__LIGHTENER_CARD_ELEMENT__ as unknown as EscapeCard & {
            _cancelAnimating: boolean;
            shortcutEvents: boolean[];
            shortcutCalls: string[];
          };
          return {
            animating: card._cancelAnimating,
            events: card.shortcutEvents,
            calls: card.shortcutCalls,
          };
        });
        expect(observed.animating).toBe(true);
        expect(observed.events).toEqual(action === 'Undo' ? [true, true] : [true]);
        expect(observed.calls).toEqual([]);
        await page.clock.runFor(500);
        const after = await editState(page);
        expect(after.cards[0].curves).toEqual(after.cards[0].original);
        expect(after.cards[0].dirty).toBe(false);
        expect(after.saves).toEqual([]);
        await testInfo.attach('restore-save-ownership', {
          body: JSON.stringify({ host, action, modifier, before, observed, after }, null, 2),
          contentType: 'application/json',
        });
      });
    }
  }
}

/** Establish saved Equal through the real Save path, then watch only the Undo scenario. */
async function cleanWithManagementHistory(page: Page, host: 'inline' | 'hosted') {
  await page.setViewportSize({ width: host === 'inline' ? 390 : 1800, height: 1000 });
  await page.goto(FIXTURE);
  await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
  await page.locator('curve-legend .row-select-btn').first().click();
  await page.locator('.preset-option[data-preset="linear"]').click();
  await page.getByRole('button', { name: SAVE, exact: true }).click();
  await expect.poll(async () => (await editState(page)).cards[0].dirty).toBe(false);
  await page.evaluate(() => {
    const card = window.__LIGHTENER_CARD_ELEMENT__ as unknown as EscapeCard;
    const commands: string[] = [];
    (window as unknown as { __UNDO_COMMANDS__: string[] }).__UNDO_COMMANDS__ = commands;
    const hass = card._hass;
    const ws = hass.callWS.bind(hass);
    const api = hass.callApi.bind(hass);
    const service = hass.callService.bind(hass);
    hass.callWS = ((message: { type: string }) => {
      commands.push(`ws:${message.type}`);
      return ws(message);
    }) as Hass['callWS'];
    hass.callApi = ((...args: Parameters<Hass['callApi']>) => {
      commands.push('api');
      return api(...args);
    }) as Hass['callApi'];
    hass.callService = ((...args: Parameters<Hass['callService']>) => {
      commands.push('service');
      return service(...args);
    }) as Hass['callService'];
    window.__LIGHTENER_SAVED__ = [];
  });
  await page.clock.install();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 3000);
  for (const preset of ['dim_accent', 'linear', 'late_starter']) {
    await page.locator(`.preset-option[data-preset="${preset}"]`).click();
  }
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.clock.runFor(400);
  const state = (await editState(page)).cards[0];
  expect(state.dirty).toBe(false);
  expect(state.curves).toEqual(state.original);
  expect(state.history).toHaveLength(2);
  await expect(page.locator('curve-legend .manage-trigger')).toBeEnabled();
}

const managementControls = [
  '.add-light-btn',
  '.delete-group-btn.link',
  '.delete-group-btn.cancel',
  '.delete-group-btn.danger',
] as const;

async function focusManagementControl(page: Page, control: (typeof managementControls)[number]) {
  // Management actions live in the Manage menu above the light list.
  await page.locator('curve-legend .manage-trigger').click();
  if (control.endsWith('.cancel') || control.endsWith('.danger')) {
    await page.locator('curve-legend .delete-group-btn.link').click();
  }
  const target = page.locator(`curve-legend ${control}`);
  await target.focus();
  await expect(target).toBeFocused();
  return target;
}

for (const host of ['inline', 'hosted'] as const) {
  for (const control of managementControls) {
    test(`management focus keeps repeated Undo owned: ${control} (${host})`, async ({
      page,
    }, testInfo) => {
      await cleanWithManagementHistory(page, host);
      const target = await focusManagementControl(page, control);
      const before = await editState(page);
      await page.screenshot({
        path: testInfo.outputPath('management-focus-before.png'),
        fullPage: true,
      });

      await page.keyboard.press('Control+z');
      await page.clock.runFor(150);
      await expect(target).toHaveCount(0);
      const middle = await editState(page);
      expect(middle.cards[0].history).toHaveLength(1);
      await page.keyboard.press('Control+z');
      await page.clock.runFor(500);

      const after = await editState(page);
      await page.screenshot({
        path: testInfo.outputPath('management-focus-after.png'),
        fullPage: true,
      });
      await testInfo.attach('management-focus-state', {
        body: JSON.stringify({ host, control, before, middle, after }, null, 2),
        contentType: 'application/json',
      });
      expect(after.cards[0].history).toEqual([]);
      expect(after.cards[0].curves).toEqual(after.cards[0].original);
      expect(after.cards[0].dirty).toBe(false);
      await expect(
        page.getByRole('region', { name: 'Brightness editor', exact: true })
      ).toBeFocused();
      expect(after.saves).toEqual([]);
      expect(
        await page.evaluate(
          () => (window as unknown as { __UNDO_COMMANDS__: string[] }).__UNDO_COMMANDS__
        )
      ).toEqual([]);
    });
  }
}

for (const host of ['inline', 'hosted'] as const) {
  for (const origin of ['row', 'eye', 'preset'] as const) {
    test(`management-history Undo preserves surviving ${origin} focus (${host})`, async ({
      page,
    }) => {
      await cleanWithManagementHistory(page, host);
      const target =
        origin === 'row'
          ? page.locator('curve-legend .row-select-btn').first()
          : origin === 'eye'
            ? page.locator('curve-legend .eye-btn').first()
            : page.locator('.preset-option').first();
      await target.focus();
      await page.keyboard.press('Control+z');
      await page.clock.runFor(150);
      await expect(target).toBeFocused();
      await page.keyboard.press('Control+z');
      await page.clock.runFor(500);
      await expect(target).toBeFocused();
      const after = await editState(page);
      expect(after.cards[0].history).toEqual([]);
      expect(after.cards[0].curves).toEqual(after.cards[0].original);
      expect(after.cards[0].dirty).toBe(false);
      expect(after.saves).toEqual([]);
      expect(
        await page.evaluate(
          () => (window as unknown as { __UNDO_COMMANDS__: string[] }).__UNDO_COMMANDS__
        )
      ).toEqual([]);
    });
  }
  for (const control of managementControls) {
    for (const timing of ['earlier listener', 'after dispatch'] as const) {
      test(`management Undo preserves external focus moved ${timing}: ${control} (${host})`, async ({
        page,
      }, testInfo) => {
        await cleanWithManagementHistory(page, host);
        const target = await focusManagementControl(page, control);
        await target.evaluate((button, timing) => {
          const input = document.createElement('input');
          input.setAttribute('aria-label', 'External Undo focus');
          document.body.append(input);
          if (timing === 'earlier listener') {
            button.addEventListener('keydown', (event) => {
              if (event.key.toLowerCase() === 'z') input.focus();
            });
          }
        }, timing);
        await page.keyboard.press('Control+z');
        const outside = page.getByRole('textbox', { name: 'External Undo focus' });
        if (timing === 'after dispatch') await outside.focus();
        await page.clock.runFor(150);
        await expect(target).toHaveCount(0);
        await expect(outside).toBeFocused();
        await page.keyboard.press('Control+z');
        await page.clock.runFor(500);
        await expect(outside).toBeFocused();
        const after = await editState(page);
        expect(after.cards[0].history).toHaveLength(1);
        expect(after.cards[0].curves[0].controlPoints).toEqual([
          { lightener: 0, target: 0 },
          { lightener: 1, target: 1 },
          { lightener: 25, target: 8 },
          { lightener: 50, target: 20 },
          { lightener: 100, target: 45 },
        ]);
        expect(after.cards[0].dirty).toBe(true);
        expect(after.saves).toEqual([]);
        expect(
          await page.evaluate(
            () => (window as unknown as { __UNDO_COMMANDS__: string[] }).__UNDO_COMMANDS__
          )
        ).toEqual([]);
        await testInfo.attach('external-management-focus-state', {
          body: JSON.stringify({ host, control, timing, after }, null, 2),
          contentType: 'application/json',
        });
      });
    }
  }
}
