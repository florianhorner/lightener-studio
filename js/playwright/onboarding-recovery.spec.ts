import { expect, test, type Page } from '@playwright/test';

const FIXTURE = '/js/playwright/fixtures/onboarding-recovery.html';
const DEFAULT_BRIGHTNESS = { '1': '1', '100': '100' };
const DIM_BRIGHTNESS = { '1': '1', '25': '8', '50': '20', '100': '45' };

type RecoveryFixture = {
  calls: Array<{ type: string; entity_id?: string }>;
  services: unknown[];
  stored: { groups: Record<string, Record<string, { brightness: Record<string, string> }>> };
  makeHandoffReady(): void;
  makeTargetReady(): void;
  publishStateUpdate(): void;
};

async function readFixture(page: Page) {
  return page.evaluate(() => {
    const fixture = (window as unknown as { __ONBOARDING_FIXTURE__: RecoveryFixture })
      .__ONBOARDING_FIXTURE__;
    return { calls: fixture.calls, services: fixture.services, groups: fixture.stored.groups };
  });
}

async function saveFirstShapeAndReload(page: Page, alreadyEdited = false) {
  await expect(page.locator('#entity-select')).toHaveValue('light.new_room');
  const card = page.locator('lightener-curve-card');
  if (!alreadyEdited) {
    await card.locator('curve-legend .row-select-btn').filter({ hasText: 'Accent lamp' }).click();
    await card.locator('.preset-option[data-preset="dim_accent"]').click();
  }
  await card.getByRole('button', { name: 'Save changes (Ctrl+S)' }).click();
  await expect
    .poll(async () => (await readFixture(page)).groups['light.new_room']['light.accent'].brightness)
    .toEqual(DIM_BRIGHTNESS);
  // Confirmation must finish; a successful write alone is not a clean editor.
  await expect
    .poll(() =>
      card.evaluate((element) => {
        const editor = element as unknown as { _dirtyVersion: number; _cleanVersion: number };
        return editor._dirtyVersion === editor._cleanVersion;
      })
    )
    .toBe(true);

  const saved = await readFixture(page);
  expect(saved.calls.filter((call) => call.type === 'lightener/save_curves')).toEqual([
    expect.objectContaining({ entity_id: 'light.new_room' }),
  ]);
  expect(saved.groups['light.new_room']['light.ceiling'].brightness).toEqual(DEFAULT_BRIGHTNESS);
  expect(saved.groups['light.existing']).toEqual({
    'light.accent': { brightness: DEFAULT_BRIGHTNESS },
    'light.ceiling': { brightness: DEFAULT_BRIGHTNESS },
  });
  expect(saved.services, 'watching the physical room is optional').toEqual([]);

  // Remove editor session state before reload. Keep only the facade's saved
  // dataset and the panel's last-group preference, so the API supplies curves.
  await page.evaluate(() => {
    const selected = localStorage.getItem('lightener_editor_entity');
    const savedData = sessionStorage.getItem('onboarding-recovery-fixture');
    localStorage.clear();
    sessionStorage.clear();
    if (selected) localStorage.setItem('lightener_editor_entity', selected);
    if (savedData) sessionStorage.setItem('onboarding-recovery-fixture', savedData);
  });
  await page.reload();
  await expect(page.locator('#entity-select')).toHaveValue('light.new_room');
  await expect
    .poll(() =>
      card.evaluate((element) => {
        const editor = element as unknown as {
          _curves: Array<{
            entityId: string;
            controlPoints: Array<{ lightener: number; target: number }>;
          }>;
          _dirtyVersion: number;
          _cleanVersion: number;
        };
        return {
          points: editor._curves.find((curve) => curve.entityId === 'light.accent')?.controlPoints,
          clean: editor._dirtyVersion === editor._cleanVersion,
        };
      })
    )
    .toEqual({
      points: [
        { lightener: 0, target: 0 },
        { lightener: 1, target: 1 },
        { lightener: 25, target: 8 },
        { lightener: 50, target: 20 },
        { lightener: 100, target: 45 },
      ],
      clean: true,
    });
  const reloaded = await readFixture(page);
  expect(reloaded.calls).toContainEqual(
    expect.objectContaining({
      type: 'lightener/get_curves',
      entity_id: 'light.new_room',
    })
  );
  expect(reloaded.calls.some((call) => call.type === 'lightener/resolve_handoff')).toBe(false);
}

for (const staleScope of ['', '&config_entry=existing-entry']) {
  test(`an expired handoff${staleScope ? ' with an old group target' : ''} reaches an existing group, saves a shape, and reloads it`, async ({
    page,
  }) => {
    await page.goto(`${FIXTURE}?scenario=expired&handoff=expired-token${staleScope}`);
    await expect(page.locator('#status-msg')).toContainText('expired');
    await page.locator('#entity-select').selectOption('light.new_room');
    await saveFirstShapeAndReload(page);
  });
}

for (const entryRoute of [
  { name: 'legacy setup link', query: 'handoff=delayed-token' },
  { name: 'native Visit or Configure link', query: 'config_entry=new-entry' },
]) {
  test(`a delayed target from a ${entryRoute.name} survives refresh and saves to the correct group`, async ({
    page,
  }) => {
    await page.goto(`${FIXTURE}?scenario=delayed&${entryRoute.query}`);
    await expect(page).toHaveURL(/config_entry=new-entry/);
    await page.reload();
    const stateUpdates = await page.evaluate(() =>
      window.setInterval(() => {
        (
          window as unknown as { __ONBOARDING_FIXTURE__: RecoveryFixture }
        ).__ONBOARDING_FIXTURE__.publishStateUpdate();
      }, 100)
    );
    await expect(
      page.locator('.load-error-state').getByRole('button', { name: 'Retry' })
    ).toBeVisible({ timeout: 8_000 });
    await page.evaluate((timer) => window.clearInterval(timer), stateUpdates);
    expect(
      (await readFixture(page)).calls.filter((call) => call.type === 'lightener/list_entities')
    ).toHaveLength(5);
    await expect(page.locator('lightener-curve-card')).toHaveCount(0);
    await page.evaluate(() => {
      (
        window as unknown as { __ONBOARDING_FIXTURE__: RecoveryFixture }
      ).__ONBOARDING_FIXTURE__.makeTargetReady();
    });
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await saveFirstShapeAndReload(page);
  });
}

test('an exhausted handoff retries its target, saves a shape, and reloads it', async ({ page }) => {
  await page.goto(`${FIXTURE}?scenario=unresolved&handoff=retry-token`);
  const retry = page.getByRole('button', { name: 'Retry', exact: true });
  await expect(retry).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('lightener-curve-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New group', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Create group', exact: true })).toHaveCount(0);
  const failed = await readFixture(page);
  expect(failed.calls.map((call) => call.type)).toEqual(Array(5).fill('lightener/resolve_handoff'));
  await expect(page).toHaveURL(/handoff=retry-token/);

  await page.evaluate(() => {
    (
      window as unknown as { __ONBOARDING_FIXTURE__: RecoveryFixture }
    ).__ONBOARDING_FIXTURE__.makeHandoffReady();
  });
  await retry.click();
  await expect(page).toHaveURL(/config_entry=new-entry/);
  await saveFirstShapeAndReload(page);
});

test('a reconnected panel waits for its target instead of opening a cached group, then saves', async ({
  page,
}) => {
  await page.goto(`${FIXTURE}?scenario=delayed-with-other&config_entry=new-entry`);
  await expect
    .poll(async () =>
      (await readFixture(page)).calls.some((call) => call.type === 'lightener/list_entities')
    )
    .toBe(true);
  await expect(page.locator('lightener-curve-card')).toHaveCount(0);
  await page.evaluate(() => {
    const panel = document.querySelector('lightener-editor-panel')!;
    panel.remove();
    (
      window as unknown as { __ONBOARDING_FIXTURE__: RecoveryFixture }
    ).__ONBOARDING_FIXTURE__.makeTargetReady();
    document.body.append(panel);
  });
  await saveFirstShapeAndReload(page);
});

test('a missing target escapes to Integrations and explicitly opens another group to save', async ({
  page,
}) => {
  // Stand in for HA's destination page; this proves the editor escape and
  // explicit re-entry without claiming to exercise HA's native integrations UI.
  await page.route('**/config/integrations', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<h1>Integrations</h1><a href="${FIXTURE}?config_entry=new-entry">Configure New room</a>`,
    })
  );
  await page.goto(`${FIXTURE}?config_entry=deleted-entry`);
  const error = page.locator('.load-error-state');
  await expect(error).toContainText('This group is unavailable.', { timeout: 8_000 });
  await expect(page.locator('lightener-curve-card')).toHaveCount(0);
  await expect(page.locator('#entity-select')).toBeDisabled();
  await expect(page).toHaveURL(/config_entry=deleted-entry/);
  await error.getByRole('link', { name: 'Open Integrations' }).click();
  await expect(page).toHaveURL(/\/config\/integrations$/);
  await page.getByRole('link', { name: 'Configure New room' }).click();
  await expect(page).toHaveURL(/config_entry=new-entry/);
  await saveFirstShapeAndReload(page);
});

test('a non-admin escapes a missing target through the group picker and reloads the chosen group', async ({
  page,
}) => {
  // Serve the same real panel at its unscoped route, preserving the fixture's
  // non-admin identity. HA's admin-only Integrations page must not be involved.
  await page.route(/\/lightener-editor(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: 'text/html',
      path: 'playwright/fixtures/onboarding-recovery.html',
    })
  );
  await page.goto('/lightener-editor?scenario=non-admin&config_entry=deleted-entry');
  const escape = page.getByRole('link', { name: 'Choose another group' });
  await expect(escape).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole('link', { name: 'Open Integrations' })).toHaveCount(0);
  await expect(page.locator('lightener-curve-card')).toHaveCount(0);
  await expect(page).toHaveURL(/config_entry=deleted-entry/);
  await page.evaluate(() => {
    // Match HA's same-path routing and exact rel check:
    // frontend/20260128.6/src/common/dom/is-navigation-click.ts and layouts/home-assistant.ts.
    window.addEventListener('click', (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = event.composedPath().find((node) => node instanceof HTMLAnchorElement);
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.rel === 'external' ||
        link.target ||
        link.hasAttribute('download') ||
        link.origin !== location.origin
      )
        return;
      event.preventDefault();
      history.pushState(null, '', link.href);
      window.dispatchEvent(new Event('location-changed'));
    });
    const control = document.createElement('a');
    control.href = '/lightener-editor';
    control.textContent = 'Internal navigation control';
    document.body.append(control);
  });
  // The router changes the URL while retaining the scoped panel.
  await page.getByRole('link', { name: 'Internal navigation control' }).click();
  await expect(page).toHaveURL(/\/lightener-editor$/);
  await expect(escape).toBeVisible();
  await expect(page.locator('lightener-curve-card')).toHaveCount(0);
  const navigated = page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame());
  await escape.click();
  await navigated;
  await expect(page).toHaveURL(/\/lightener-editor$/);
  await expect(page.getByRole('link', { name: 'Internal navigation control' })).toHaveCount(0);
  await page.locator('#entity-select').selectOption('light.new_room');
  const card = page.locator('lightener-curve-card');
  await expect(card.locator('curve-legend')).toContainText('Accent lamp');
  await expect(card.locator('curve-footer')).toContainText('View only');
  await page.reload();
  await expect(page.locator('#entity-select')).toHaveValue('light.new_room');
  await expect(card.locator('curve-footer')).toContainText('View only');
  expect((await readFixture(page)).calls).toContainEqual({
    type: 'lightener/get_curves',
    entity_id: 'light.new_room',
  });
  expect(
    (await readFixture(page)).calls.some((call) => call.type === 'lightener/save_curves')
  ).toBe(false);
});

for (const viewport of [
  { width: 1200, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`first-curve help works by keyboard and saves without preview at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.goto(`${FIXTURE}?config_entry=new-entry`);
    const card = page.locator('lightener-curve-card');
    const help = card.getByRole('button', { name: 'Brightness tips' });
    await expect(help).toBeVisible();
    await expect(card.locator('.coach-prompt')).toHaveCount(0);
    await help.focus();
    await page.keyboard.press('Enter');
    await expect(card.locator('.coach-prompt')).toContainText('Dim a bright light');
    expect((await readFixture(page)).services).toEqual([]);
    for (const control of [help, card.getByRole('button', { name: 'Dismiss tip' })]) {
      const box = await control.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    const lamp = card.locator('curve-legend .row-select-btn').filter({ hasText: 'Accent lamp' });
    await lamp.focus();
    await page.keyboard.press('Enter');
    const dim = card.locator('.preset-option[data-preset="dim_accent"]');
    await dim.focus();
    await page.keyboard.press('Enter');
    await expect(card.locator('.coach-prompt')).toContainText('Ready to save');
    await expect(card.locator('.coach-prompt')).toContainText(
      'Save now, or try “Watch room react” first.'
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    );
    await saveFirstShapeAndReload(page, true);
    await expect(card.locator('.coach-prompt')).toHaveCount(0);
    await help.click();
    await card.getByRole('button', { name: 'Dismiss tip' }).focus();
    await page.keyboard.press('Enter');
    await expect(help).toBeFocused();
    await expect(card.locator('.coach-prompt')).toHaveCount(0);
  });
}

for (const width of [320, 375, 390, 430, 1280]) {
  test(`panel header keeps New group centered and opens native setup at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.goto(FIXTURE);
    await expect(page.locator('#entity-select')).toHaveValue('light.existing');
    const button = page.getByRole('button', { name: 'New group', exact: true });
    await expect(button).toBeVisible();
    const layout = await button.evaluate((element) => {
      const row = element.closest('.entity-select-row')!;
      const select = row.querySelector('select')!;
      const icon = element.querySelector('svg')!;
      const textNodes = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let text = textNodes.nextNode();
      while (text && !text.textContent?.trim()) text = textNodes.nextNode();
      if (!text) throw new Error('New group must keep its visible text label');
      const label = text.textContent!;
      const range = document.createRange();
      range.setStart(text, label.search(/\S/));
      range.setEnd(text, label.trimEnd().length);
      const bounds = (rect: DOMRect) => ({
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        centerY: rect.top + rect.height / 2,
      });
      const style = getComputedStyle(element);
      return {
        row: bounds(row.getBoundingClientRect()),
        select: bounds(select.getBoundingClientRect()),
        button: bounds(element.getBoundingClientRect()),
        icon: bounds(icon.getBoundingClientRect()),
        label: bounds(range.getBoundingClientRect()),
        labelLines: range.getClientRects().length,
        borderLeft: parseFloat(style.borderLeftWidth),
        borderRight: parseFloat(style.borderRightWidth),
        clipped: element.scrollWidth > element.clientWidth + 1,
      };
    });

    expect(layout.icon.width, 'the plus icon must not shrink').toBeCloseTo(16, 1);
    expect(layout.icon.height).toBeCloseTo(16, 1);
    expect(layout.button.height, 'the button keeps its 44px tap target').toBeCloseTo(44, 1);
    expect(layout.select.height).toBeCloseTo(44, 1);
    expect(layout.labelLines, 'New group stays on one line').toBe(1);
    expect(layout.clipped, 'the label stays inside the button').toBe(false);
    expect(Math.abs(layout.select.top - layout.button.top)).toBeLessThanOrEqual(1);
    expect(layout.select.left).toBeGreaterThanOrEqual(layout.row.left - 1);
    expect(layout.select.right).toBeLessThan(layout.button.left);
    expect(layout.button.right).toBeLessThanOrEqual(layout.row.right + 1);
    for (const item of [layout.icon, layout.label]) {
      expect(Math.abs(item.centerY - layout.button.centerY)).toBeLessThanOrEqual(1);
    }
    const leftPadding = layout.icon.left - layout.button.left - layout.borderLeft;
    const rightPadding = layout.button.right - layout.label.right - layout.borderRight;
    expect(leftPadding, 'the icon has room inside the button').toBeGreaterThanOrEqual(10);
    expect(rightPadding, 'the text has room inside the button').toBeGreaterThanOrEqual(10);
    expect(
      Math.abs(leftPadding - rightPadding),
      'content has symmetric side padding'
    ).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    );

    await button.click();
    await expect(page).toHaveURL(/\/config\/integrations\/dashboard\/add\?brand=lightener_studio$/);
  });

  for (const mode of ['non-admin', 'scoped editor'] as const) {
    test(`panel header hides New group and fills the ${mode} picker at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const scoped = mode === 'scoped editor';
      await page.goto(`${FIXTURE}${scoped ? '?config_entry=new-entry' : ''}`);
      await expect(page.locator('#entity-select')).toHaveValue(
        scoped ? 'light.new_room' : 'light.existing'
      );
      if (!scoped) {
        await page.locator('lightener-editor-panel').evaluate((element) => {
          const panel = element as unknown as {
            _hass: { user: { is_admin: boolean } };
            hass: unknown;
          };
          panel.hass = { ...panel._hass, user: { ...panel._hass.user, is_admin: false } };
        });
      }

      await expect(page.locator('#new-group-btn')).toBeHidden();
      const layout = await page.locator('.entity-select-row').evaluate((row) => {
        const select = row.querySelector('select')!;
        const wrapper = select.parentElement!;
        return {
          row: row.getBoundingClientRect().width,
          select: select.getBoundingClientRect().width,
          wrapper: wrapper.getBoundingClientRect().width,
          maxWidth: parseFloat(getComputedStyle(wrapper).maxWidth),
        };
      });
      // Preserve the desktop picker cap; a hidden button must reserve no space.
      expect(layout.wrapper).toBeCloseTo(Math.min(layout.row, layout.maxWidth), 1);
      expect(layout.select).toBeCloseTo(layout.wrapper, 1);
    });
  }
}

test('a fresh handoff opens the first tip and completes a preset-only save', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${FIXTURE}?scenario=first&handoff=first-token`);
  const card = page.locator('lightener-curve-card');
  await expect(card.locator('.coach-prompt')).toContainText('Dim a bright light');
  await card.locator('.preset-option[data-preset="dim_accent"]').click();
  await expect(card.locator('.coach-prompt')).toContainText('Ready to save');
  await card.getByRole('button', { name: 'Save changes (Ctrl+S)' }).click();
  await expect(card.locator('.coach-prompt')).toContainText('Shape saved');
  expect((await readFixture(page)).services).toEqual([]);
  await page.reload();
  await expect(page.locator('#entity-select')).toHaveValue('light.new_room');
  await expect(card.locator('.coach-prompt')).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Brightness tips' })).toBeVisible();
});

for (const viewport of [
  { width: 390, height: 844, sidebar: 0 },
  { width: 1196, height: 900, sidebar: 256 },
  { width: 1200, height: 900, sidebar: 256 },
  { width: 1600, height: 1000, sidebar: 256 },
]) {
  test(`tips fit the graph column with a ${viewport.sidebar}px sidebar at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.goto(`${FIXTURE}?config_entry=new-entry`);
    // Native HA reserves this space outside the panel. A full-width fixture
    // misses the wide-card/narrow-graph combination in its sidebar layout.
    await page.locator('body').evaluate((body, sidebar) => {
      body.style.marginLeft = `${sidebar}px`;
    }, viewport.sidebar);
    const card = page.locator('lightener-curve-card');
    await expect(card.getByRole('button', { name: 'Brightness tips' })).toBeVisible();
    const graphGeometry = () =>
      card.evaluate(async (element) => {
        const card = element as HTMLElement & { updateComplete: Promise<unknown> };
        await card.updateComplete;
        const graph = card.shadowRoot!.querySelector('curve-graph') as HTMLElement & {
          updateComplete: Promise<unknown>;
        };
        await graph.updateComplete;
        const box = graph.getBoundingClientRect();
        const panel = graph.closest('.graph-panel')!.getBoundingClientRect();
        // Save can scroll the page. Compare within the panel to catch layout
        // changes independently of viewport movement.
        return {
          left: box.left - panel.left,
          top: box.top - panel.top,
          width: box.width,
          height: box.height,
        };
      });
    const graphBeforeTips = await graphGeometry();
    const checkGraphUnmoved = async () => {
      const current = await graphGeometry();
      for (const key of ['left', 'top', 'width', 'height'] as const) {
        expect(Math.abs(current[key] - graphBeforeTips[key]), `graph ${key}`).toBeLessThanOrEqual(
          1
        );
      }
    };
    await card.getByRole('button', { name: 'Brightness tips' }).click();
    const copy = card.locator('.coach-copy');
    const checkReadableTip = async () => {
      const layout = await copy.evaluate((element) => {
        const title = element.querySelector('strong')!;
        const body = element.querySelector('span')!;
        return {
          titleLines:
            title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight),
          bodyLines:
            body.getBoundingClientRect().height / parseFloat(getComputedStyle(body).lineHeight),
          clipped: element.scrollWidth > element.clientWidth + 1,
        };
      });
      expect(layout.titleLines, 'the short tip heading fits on one line').toBeLessThanOrEqual(1.05);
      expect(
        layout.bodyLines,
        'the instruction has room for at most two lines'
      ).toBeLessThanOrEqual(2.05);
      expect(layout.clipped).toBe(false);
      await checkGraphUnmoved();
    };
    await checkReadableTip();
    await card.locator('curve-legend .row-select-btn').filter({ hasText: 'Accent lamp' }).click();
    await expect(card.locator('.shape-chip-bar')).toBeVisible();
    await checkReadableTip();
    const hintBox = await card.locator('.coach-prompt').boundingBox();
    const chipsBox = await card.locator('.shape-chip-bar').boundingBox();
    const noOverlap =
      hintBox!.y + hintBox!.height <= chipsBox!.y + 1 ||
      hintBox!.x + hintBox!.width <= chipsBox!.x + 1;
    expect(noOverlap, 'the hint and Shapes controls do not overlap').toBe(true);
    await card.locator('.preset-option[data-preset="dim_accent"]').click();
    await expect(copy).toContainText('Ready to save');
    await checkReadableTip();
    await card.getByRole('button', { name: 'Save changes (Ctrl+S)' }).click();
    await expect(copy).toContainText('Shape saved');
    await checkReadableTip();
    await card.getByRole('button', { name: 'Dismiss tip' }).click();
    await expect(copy).toHaveCount(0);
    await checkGraphUnmoved();
    expect((await readFixture(page)).services).toEqual([]);
  });
}
