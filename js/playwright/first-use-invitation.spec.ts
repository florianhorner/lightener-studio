import { expect, test, type Page } from '@playwright/test';
import { toSvgX, toSvgY } from '../src/utils/graph-math';

const FIXTURE = '/js/playwright/fixtures/first-use-invitation.html';
test.beforeEach(async ({ page }) => {
  // Global setup rebuilds the served bundle. Its dev-server invalidation must
  // not reload the first arrival and consume the product's one-shot progress.
  await page.route('**/@vite/client', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' })
  );
});
const point = (page: Page, index = 3) =>
  page.locator(`curve-graph .hit-circle[data-curve="0"][data-point="${index}"]`);

async function settle(page: Page) {
  await page.evaluate(async () => {
    const card = (window as any).__INVITATION_FIXTURE__.card;
    await card.updateComplete;
    await card.shadowRoot.querySelector('curve-graph')?.updateComplete;
  });
}
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const f = (window as any).__INVITATION_FIXTURE__;
    const graph = f.card.shadowRoot.querySelector('curve-graph');
    return {
      dirty: f.card.dirty,
      curves: graph?.curves ?? [],
      example: graph?.exampleEntityId ?? null,
      backend: f.backendSnapshot(),
      services: f.services,
      calls: f.calls,
      saved: f.savedPayloads,
      selected: graph?.selectedCurveId ?? null,
    };
  });
}
async function open(page: Page, query = '') {
  await page.goto(`${FIXTURE}?seed=${test.info().testId}&first=always&${query}`);
  await expect(page.locator('curve-legend .legend-item')).toHaveCount(
    query.includes('members=2') ? 2 : 3
  );
  await page.locator('curve-graph').scrollIntoViewIfNeeded();
}
async function hold(page: Page, query = '') {
  await open(page, query);
  await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toBeVisible();
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(20)));
  await expect(point(page, 4)).toHaveAttribute('cy', String(toSvgY(45)));
  await page.waitForTimeout(50);
}
async function position(page: Page, x: number, y: number) {
  return page.locator('curve-graph').evaluate(
    (graph, p) => {
      const svg = graph.shadowRoot!.querySelector('svg')!;
      const pt = svg.createSVGPoint();
      pt.x = p.x;
      pt.y = p.y;
      const screen = pt.matrixTransform(svg.getScreenCTM()!);
      return { x: screen.x, y: screen.y };
    },
    { x: toSvgX(x), y: toSvgY(y) }
  );
}
async function drag(page: Page, target = 35) {
  const b = (await point(page).boundingBox())!;
  const to = await position(page, 50, target);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await settle(page);
}
async function replayPaused(page: Page) {
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page
    .getByRole('button', { name: 'Dismiss example', exact: true })
    .evaluate((el: HTMLButtonElement) => el.click());
  await settle(page);
  await page
    .getByRole('button', { name: 'Replay example shape', exact: true })
    .evaluate((el: HTMLButtonElement) => el.click());
  await settle(page);
}

async function readyDuringOrientation(page: Page) {
  await page.goto(`${FIXTURE}?seed=${test.info().testId}&state=loading&first=always`);
  await expect(page.getByText('Loading brightness shapes…')).toBeVisible();
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.releaseLoad());
  await page.clock.runFor(50);
  await settle(page);
  await expect(page.locator('curve-legend .legend-item')).toHaveCount(3);
  expect((await snapshot(page)).example).toBeNull();
}

test('first entry leaves time to orient, then plays the slower invitation once', async ({
  page,
}) => {
  await readyDuringOrientation(page);
  await page.clock.runFor(500);
  expect((await snapshot(page)).example).toBeNull();
  expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(3);
  await page.clock.runFor(220);
  expect((await snapshot(page)).example).toBe('light.example_0');
  await page.clock.runFor(1100);
  expect((await snapshot(page)).curves[0].controlPoints[3].target).toBe(50);
  await expect(page.locator('curve-graph .example-cue-label')).toHaveText('Drag this circle');
  await page.clock.runFor(700);
  expect((await snapshot(page)).curves[0].controlPoints[3].target).toBeLessThan(50);
  expect((await snapshot(page)).curves[0].controlPoints[3].target).toBeGreaterThan(20);
  expect((await snapshot(page)).dirty).toBe(false);
  await page.clock.runFor(1600);
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(20)));
});

test('a brightness edit during orientation cancels the delayed invitation', async ({ page }) => {
  await readyDuringOrientation(page);
  await page.getByRole('slider', { name: 'Try group brightness' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.clock.runFor(3000);
  expect((await snapshot(page)).example).toBeNull();
  expect((await snapshot(page)).dirty).toBe(false);
  expect((await snapshot(page)).services).toEqual([]);
});

test('a graph initially below the viewport waits for first visibility before its orientation pause', async ({
  page,
}) => {
  await page.goto(`${FIXTURE}?seed=${test.info().testId}&below=1&first=always`);
  await expect(page.locator('curve-legend .legend-item')).toHaveCount(3);
  await page.waitForTimeout(800);
  expect((await snapshot(page)).example).toBeNull();
  await page.locator('curve-graph').scrollIntoViewIfNeeded();
  expect((await snapshot(page)).example).toBeNull();
  await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toBeVisible();
  expect((await snapshot(page)).dirty).toBe(false);
});

for (const exit of ['hidden', 'group', 'disconnect'] as const) {
  test(`${exit} cancels pending orientation without a late start`, async ({ page }) => {
    await readyDuringOrientation(page);
    await page.evaluate((exit) => {
      const f = (window as any).__INVITATION_FIXTURE__;
      if (exit === 'group') f.switchGroup();
      else if (exit === 'disconnect') {
        f.card.remove();
        document.querySelector('#host')!.append(f.card);
      } else {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      }
    }, exit);
    await page.clock.runFor(1500);
    if (exit === 'hidden') {
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event('visibilitychange'));
      });
    }
    await page.clock.runFor(1500);
    expect((await snapshot(page)).example).toBeNull();
    expect((await snapshot(page)).dirty).toBe(false);
  });
}

test('readiness must remain continuous throughout the orientation pause', async ({ page }) => {
  await readyDuringOrientation(page);
  await page.clock.runFor(250);
  await page.evaluate(() => {
    const f = (window as any).__INVITATION_FIXTURE__;
    f.card.hass = { ...f.hass, user: { ...f.hass.user, is_admin: false } };
  });
  await settle(page);
  await page.clock.runFor(700);
  expect((await snapshot(page)).example).toBeNull();
  await page.evaluate(() => {
    const f = (window as any).__INVITATION_FIXTURE__;
    f.card.hass = f.hass;
  });
  await settle(page);
  await page.clock.runFor(500);
  expect((await snapshot(page)).example).toBeNull();
  await page.clock.runFor(220);
  expect((await snapshot(page)).example).not.toBeNull();
});

test('exploring a preset during orientation takes priority over automatic playback', async ({
  page,
}) => {
  await readyDuringOrientation(page);
  const chip = (await page.locator('[data-preset="dim_accent"]').boundingBox())!;
  await page.mouse.move(chip.x + chip.width / 2, chip.y + chip.height / 2);
  await page.clock.runFor(700);
  expect((await snapshot(page)).example).toBeNull();
  expect(await page.locator('curve-graph').evaluate((graph: any) => !!graph.previewCurve)).toBe(
    true
  );
  await page.mouse.move(0, 0);
  await page.clock.runFor(500);
  expect((await snapshot(page)).example).toBeNull();
  await page.clock.runFor(220);
  expect((await snapshot(page)).example).not.toBeNull();
  expect((await snapshot(page)).dirty).toBe(false);
});

test('reduced motion enabled during orientation gives a static circle cue', async ({ page }) => {
  await readyDuringOrientation(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.runFor(700);
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(20)));
  await expect(page.locator('curve-graph .example-cue-label')).toHaveText('Drag this circle');
  await expect(page.locator('curve-graph .example-cue-animating')).toHaveCount(0);
  expect((await snapshot(page)).dirty).toBe(false);
});

test('ring and leader identify the native circle and stop on a stationary press', async ({
  page,
}) => {
  await hold(page);
  await replayPaused(page);
  await page.clock.runFor(2060);
  const at = await point(page).evaluate((el) => ({
    x: el.getAttribute('cx'),
    y: el.getAttribute('cy'),
  }));
  await expect(page.locator('curve-graph .example-instruction')).toHaveAttribute(
    'transform',
    `translate(${at.x} ${at.y})`
  );
  await expect(page.locator('curve-graph .example-cue-leader')).toHaveCount(1);
  await expect(page.locator('curve-graph .example-cue-label')).toHaveText('Drag this circle');
  await expect(page.locator('curve-graph .example-cue-animating')).toHaveCount(1);
  const b = (await point(page).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator('curve-graph .example-cue-animating')).toHaveCount(0);
  await expect(page.locator('curve-graph .example-cue-label')).toHaveText('Drag this circle');
  expect((await snapshot(page)).dirty).toBe(false);
});

test('replay preserves a non-circular light marker and names its point accurately', async ({
  page,
}) => {
  await hold(page);
  await page.getByRole('button', { name: 'Dismiss example', exact: true }).click();
  await page.getByRole('button', { name: /Sofa Lamp 100%/ }).click();
  await page.getByRole('button', { name: 'Replay example shape', exact: true }).click();
  await expect(page.locator('curve-graph .example-cue-label')).toHaveText('Drag this point');
  expect((await snapshot(page)).selected).toBe('light.example_1');
  expect((await snapshot(page)).dirty).toBe(false);
});

test('example is coherent, clean, available after wording fades, and has no output', async ({
  page,
}) => {
  await hold(page, 'members=2');
  const before = await snapshot(page);
  expect(before.dirty).toBe(false);
  expect(before.curves[0].controlPoints).toHaveLength(5);
  expect(before.curves[1].controlPoints).toHaveLength(3);
  expect(before.backend['light.example_0'].brightness['100']).toBe('100');
  await expect(page.locator('curve-legend .brightness-value').first()).toHaveText('≈ 45%');
  await expect(page.getByRole('button', { name: /Save changes/ })).toHaveCount(0);
  await expect(page.locator('[data-preset="dim_accent"]')).not.toHaveAttribute(
    'aria-current',
    'true'
  );
  await replayPaused(page);
  await page.clock.runFor(3300);
  await page.clock.fastForward(6000);
  await expect(page.locator('curve-graph .example-instruction')).toHaveCount(0);
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(20)));
  expect((await snapshot(page)).services).toEqual([]);
  expect(
    (await snapshot(page)).calls.filter((c: any) => c.type === 'lightener/save_curves')
  ).toEqual([]);
});

for (const phase of ['cue pause', 'ripple', 'hold']) {
  test(`same mouse gesture takes over during ${phase} with one Undo`, async ({ page }) => {
    await hold(page);
    const baseline = (await snapshot(page)).backend;
    if (phase !== 'hold') {
      await replayPaused(page);
      await page.clock.runFor(phase === 'cue pause' ? 400 : 2060);
    }
    const node = await point(page).elementHandle();
    await drag(page, 37);
    await expect(page.getByRole('button', { name: /Save changes/ })).toBeEnabled();
    expect((await snapshot(page)).example).toBeNull();
    expect(await point(page).evaluate((el, prior) => el === prior, node)).toBe(true);
    expect((await snapshot(page)).curves[0].controlPoints[3].target).toBe(37);
    await page
      .getByRole('button', { name: 'Undo', exact: true })
      .evaluate((el: HTMLButtonElement) => el.click());
    if (phase !== 'hold') await page.clock.runFor(400);
    await expect.poll(async () => (await snapshot(page)).dirty).toBe(false);
    expect((await snapshot(page)).curves.every((c: any) => c.controlPoints.length === 3)).toBe(
      true
    );
    expect((await snapshot(page)).backend).toEqual(baseline);
    expect((await snapshot(page)).services).toEqual([]);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0);
  });
}

test('tap/no-op keyboard stays clean; keyboard takeover, add/delete and cancel remain native', async ({
  page,
}) => {
  await hold(page);
  await point(page).click();
  expect((await snapshot(page)).dirty).toBe(false);
  await expect(point(page)).toHaveCount(1);
  await point(page, 0).focus();
  await page.keyboard.press('ArrowDown');
  expect((await snapshot(page)).dirty).toBe(false);
  await point(page).focus();
  await page.keyboard.press('ArrowUp');
  expect((await snapshot(page)).curves[0].controlPoints[3].target).toBe(21);
  await page.keyboard.press('Enter');
  expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(6);
  await page.keyboard.press('Delete');
  expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(5);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).dirty).toBe(false);
  expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(3);
});

for (const input of ['keyboard during motion', 'long press after motion']) {
  test(`removal is the first effective example edit: ${input}`, async ({ page }) => {
    await hold(page);
    const backend = (await snapshot(page)).backend;
    if (input.startsWith('keyboard')) {
      await replayPaused(page);
      await page.clock.runFor(2060);
    }
    const before = (await snapshot(page)).curves[0].controlPoints;
    if (input.startsWith('keyboard')) {
      await point(page).focus();
      await page.keyboard.press('Delete');
    } else {
      const bounds = (await point(page).boundingBox())!;
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(650);
      await page.mouse.up();
    }
    await settle(page);
    const adopted = await snapshot(page);
    expect(adopted.example).toBeNull();
    expect(adopted.dirty).toBe(true);
    expect(adopted.curves[0].controlPoints).toEqual(before.filter((_: any, i: number) => i !== 3));
    await page
      .getByRole('button', { name: 'Undo', exact: true })
      .evaluate((el: HTMLButtonElement) => el.click());
    if (input.startsWith('keyboard')) await page.clock.runFor(400);
    await expect.poll(async () => (await snapshot(page)).dirty).toBe(false);
    expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(3);
    expect((await snapshot(page)).backend).toEqual(backend);
    expect((await snapshot(page)).saved).toEqual([]);
    expect((await snapshot(page)).services).toEqual([]);
    await point(page, 2).focus();
    await page.keyboard.press('ArrowDown');
    expect((await snapshot(page)).dirty).toBe(true);
  });
}

test('explicit replay over a saved custom shape restores exact points with one Undo', async ({
  page,
}) => {
  const seed = test.info().testId;
  const stored = {
    'light.example_0': { brightness: { 0: '0', 1: '7', 17: '22', 73: '81', 100: '92' } },
    'light.example_1': { brightness: { 0: '0', 1: '1', 100: '100' } },
  };
  await page.addInitScript(
    ({ seed, stored }) => {
      localStorage.setItem(
        'lightener:invitation-fixture:backend:v1:' + seed,
        JSON.stringify(stored)
      );
    },
    { seed, stored }
  );
  await open(page, 'first=0&members=2');
  await page.locator('curve-legend .row-select-btn').first().click();
  const original = await snapshot(page);
  expect(original.example).toBeNull();
  await page.getByRole('button', { name: 'Replay example shape', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toBeVisible();
  await expect(point(page, 4)).toHaveAttribute('cy', String(toSvgY(20)));
  await point(page, 4).focus();
  await page.keyboard.press('ArrowUp');
  expect((await snapshot(page)).dirty).toBe(true);
  expect((await snapshot(page)).example).toBeNull();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).dirty).toBe(false);
  const restored = await snapshot(page);
  expect(restored.curves).toEqual(original.curves);
  expect(restored.backend).toEqual(stored);
  expect(restored.saved).toEqual([]);
  expect(restored.services).toEqual([]);
});

test('preset, selection, visibility and brightness dismiss before operating on actual state', async ({
  page,
}) => {
  await hold(page);
  await page.getByRole('slider', { name: 'Try group brightness' }).press('ArrowLeft');
  expect((await snapshot(page)).example).toBeNull();
  expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(3);
  expect((await snapshot(page)).dirty).toBe(false);
  await page.getByRole('button', { name: /Sofa Lamp 99%/ }).click();
  await page.locator('[data-preset="dim_accent"]').click();
  const edited = await snapshot(page);
  expect(edited.curves[1].controlPoints.at(-1).target).toBe(45);
  expect(edited.curves[0].controlPoints.at(-1).target).toBe(100);
  await page.getByRole('button', { name: 'Hide Sofa Lamp', exact: true }).click();
  expect((await snapshot(page)).curves[1].visible).toBe(false);
});

test('save rejection retains adopted edit; retry and reload use persisted backend independently of cache', async ({
  page,
}) => {
  await hold(page);
  await drag(page, 34);
  await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.rejectNextSave());
  await page.getByRole('button', { name: /Save changes/ }).click();
  await expect(page.getByRole('alert')).toContainText('Save failed');
  expect((await snapshot(page)).dirty).toBe(true);
  expect((await snapshot(page)).curves[0].controlPoints[3].target).toBe(34);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Saved successfully', { exact: true })).toBeVisible();
  expect((await snapshot(page)).dirty).toBe(false);
  await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.clearEditorSession());
  await page.reload();
  await expect(page.locator('curve-graph')).toBeVisible();
  await expect
    .poll(async () => (await snapshot(page)).curves[0]?.controlPoints[3]?.target)
    .toBe(34);
  await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toHaveCount(0);
  expect((await snapshot(page)).services).toEqual([]);
});

test('dismissal, returning entry, replay, focus recovery and reduced motion preserve actual configuration', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await hold(page);
  await point(page).focus();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Replay example shape', exact: true })
  ).toBeFocused();
  expect((await snapshot(page)).dirty).toBe(false);
  await page.reload();
  await expect(page.locator('curve-legend .legend-item')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Replay example shape', exact: true }).click();
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(20)));
  expect((await snapshot(page)).dirty).toBe(false);
});

test('explicit replay chooses an available light when a returning group has no selection', async ({
  page,
}) => {
  await page.goto(`${FIXTURE}?seed=${test.info().testId}&first=0`);
  await expect(page.locator('curve-legend .legend-item')).toHaveCount(3);
  expect((await snapshot(page)).selected).toBeNull();
  await page.getByRole('button', { name: 'Replay example shape', exact: true }).click();
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(20)));
  expect((await snapshot(page)).selected).toBe('light.example_0');
  expect((await snapshot(page)).dirty).toBe(false);
  expect((await snapshot(page)).services).toEqual([]);
});

test('reduced motion starting mid-ripple freezes its frame without adopting it', async ({
  page,
}) => {
  await hold(page);
  await replayPaused(page);
  await page.clock.runFor(2020);
  const before = (await snapshot(page)).curves[0].controlPoints;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.runFor(600);
  expect((await snapshot(page)).curves[0].controlPoints).toEqual(before);
  expect((await snapshot(page)).dirty).toBe(false);
});

test('a hidden-document notification ends the example without restarting on return', async ({
  page,
}) => {
  await hold(page);
  await page.evaluate(() => {
    // Automated Chromium keeps background tabs visible. Model the document
    // signal here; offscreen/disconnect use actual browser lifecycle elsewhere.
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toHaveCount(0);
  expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(3);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(600);
  expect((await snapshot(page)).example).toBeNull();
  expect((await snapshot(page)).dirty).toBe(false);
  expect((await snapshot(page)).services).toEqual([]);
});

for (const state of ['loading', 'error', 'readonly', 'empty', 'unavailable']) {
  test(`${state} never admits a demonstration`, async ({ page }) => {
    await page.goto(`${FIXTURE}?seed=${test.info().testId}&state=${state}`);
    await expect(page.locator('lightener-curve-card')).toBeVisible();
    if (state === 'loading')
      await expect(page.getByText('Loading brightness shapes…')).toBeVisible();
    if (state === 'error') await expect(page.getByRole('alert')).toContainText('Failed to load');
    if (state === 'readonly')
      await expect(page.getByText('View only', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toHaveCount(0);
    expect((await snapshot(page)).services).toEqual([]);
    if (state === 'unavailable') expect((await snapshot(page)).selected).toBeNull();
  });
}

test('keyboard takes over during a ripple and no-op Enter remains clean', async ({ page }) => {
  await hold(page);
  await replayPaused(page);
  await page.clock.runFor(1670);
  await point(page, 0).focus();
  await page.keyboard.press('Enter');
  expect((await snapshot(page)).dirty).toBe(false);
  const before = (await snapshot(page)).curves[0].controlPoints[3].target;
  await point(page).focus();
  await page.keyboard.press('ArrowUp');
  expect((await snapshot(page)).curves[0].controlPoints[3].target).toBe(before + 1);
});

test('mouse background press freezes immediately; native double-click creates the adopted point', async ({
  page,
}) => {
  await hold(page);
  await replayPaused(page);
  await page.clock.runFor(1660);
  const at = await position(page, 75, 35);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  const frozen = (await snapshot(page)).curves;
  await page.clock.runFor(200);
  expect((await snapshot(page)).curves).toEqual(frozen);
  await page.mouse.up();
  expect((await snapshot(page)).dirty).toBe(false);
  await page.mouse.dblclick(at.x, at.y);
  expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(6);
  expect((await snapshot(page)).dirty).toBe(true);
});

for (const [index, destination] of [
  [0, 'point'],
  [2, 'replay'],
  [4, 'point'],
] as const) {
  test(`dismissal preserves semantic focus for example handle ${index}`, async ({ page }) => {
    await hold(page);
    await point(page, index).focus();
    await page.keyboard.press('Escape');
    if (destination === 'replay') {
      await expect(
        page.getByRole('button', { name: 'Replay example shape', exact: true })
      ).toBeFocused();
    } else {
      await expect(point(page, index === 4 ? 2 : 0)).toBeFocused();
    }
    expect((await snapshot(page)).dirty).toBe(false);
  });
}

test('dismissal never takes focus back from a control outside the card', async ({ page }) => {
  await hold(page);
  await point(page).focus();
  await page.evaluate(() => {
    const outside = document.createElement('button');
    outside.textContent = 'Outside control';
    document.body.append(outside);
    const card = (window as any).__INVITATION_FIXTURE__.card;
    card.shadowRoot.querySelector('.invitation-replay').click();
    outside.focus({ preventScroll: true });
  });
  await settle(page);
  await expect(page.getByRole('button', { name: 'Outside control', exact: true })).toBeFocused();
  expect((await snapshot(page)).dirty).toBe(false);
});

test('a choice made before graph visibility cancels pending automatic admission', async ({
  page,
}) => {
  await page.goto(`${FIXTURE}?seed=${test.info().testId}&below=1&first=always`);
  await expect(page.locator('curve-legend .legend-item')).toHaveCount(3);
  await page
    .getByRole('button', { name: /Sofa Lamp 100%/ })
    .evaluate((el: HTMLButtonElement) => el.click());
  await page.locator('curve-graph').scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('button', { name: 'Replay example shape', exact: true })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toHaveCount(0);
  expect((await snapshot(page)).selected).toBe('light.example_1');
});

test('late readiness admits once; group switch cancels a held long-press and its pending work', async ({
  page,
}) => {
  await page.goto(`${FIXTURE}?seed=${test.info().testId}&state=loading&first=always`);
  await expect(page.getByText('Loading brightness shapes…')).toBeVisible();
  await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.releaseLoad());
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(20)));
  const b = (await point(page).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.switchGroup());
  await page.waitForTimeout(600);
  await page.mouse.up();
  expect((await snapshot(page)).curves.every((c: any) => c.controlPoints.length === 3)).toBe(true);
  expect((await snapshot(page)).dirty).toBe(false);
  await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toHaveCount(0);
});

test('replay refuses a native held gesture and an explicit live preview', async ({ page }) => {
  await hold(page);
  await page.getByRole('button', { name: 'Dismiss example', exact: true }).click();
  const handle = point(page, 2),
    b = (await handle.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await expect(
    page.getByRole('button', { name: 'Replay example shape', exact: true })
  ).toBeDisabled();
  await page.mouse.up();
  await expect(
    page.getByRole('button', { name: 'Replay example shape', exact: true })
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Watch room react', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Replay example shape', exact: true })
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: /Watching/ })).toBeVisible();
});

test('replay becomes available after a rejected long press on a two-point curve', async ({
  page,
}) => {
  await page.addInitScript((seed) => {
    localStorage.setItem(
      `lightener:invitation-fixture:backend:v1:${seed}`,
      JSON.stringify({ 'light.example_0': { brightness: { '0': '0', '100': '100' } } })
    );
  }, test.info().testId);
  await page.goto(`${FIXTURE}?seed=${test.info().testId}&first=0`);
  const replay = page.getByRole('button', { name: 'Replay example shape', exact: true });
  await expect(replay).toBeEnabled();
  await page.clock.install();
  const b = (await point(page, 1).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await expect(replay).toBeDisabled();
  await page.clock.runFor(600);
  expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(2);
  expect((await snapshot(page)).dirty).toBe(false);
  await page.mouse.up();
  await expect(replay).toBeEnabled();
  await replay.click();
  await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toBeVisible();
});

test('offscreen and disconnected invitations stop without replay or dirty state', async ({
  page,
}) => {
  await hold(page);
  await page.setViewportSize({ width: 390, height: 200 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toHaveCount(0);
  await page.locator('curve-graph').scrollIntoViewIfNeeded();
  expect((await snapshot(page)).dirty).toBe(false);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: 'Replay example shape', exact: true }).click();
  await page.evaluate(() => {
    const f = (window as any).__INVITATION_FIXTURE__;
    f.card.remove();
    document.querySelector('#host')!.append(f.card);
  });
  await expect(page.locator('curve-legend .legend-item')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toHaveCount(0);
  expect((await snapshot(page)).dirty).toBe(false);
});

test('explicit deselection survives first entry and ordinary cards keep their baseline', async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'lightener:curve-card:v1:light.first_use_room',
      JSON.stringify({ selectedCurveId: null, scrubberPosition: 50 })
    )
  );
  await open(page);
  await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toHaveCount(0);
  expect((await snapshot(page)).selected).toBeNull();
  await page.goto(`${FIXTURE}?seed=ordinary&experiment=0&first=0`);
  await expect(page.getByRole('button', { name: 'Brightness tips', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay example shape', exact: true })).toHaveCount(
    0
  );
});

test.describe('real touch takeover', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('touch double-tap adds a point after takeover without synthetic mouse events', async ({
    page,
  }) => {
    await hold(page);
    const b = (await point(page).boundingBox())!;
    const end = await position(page, 50, 35);
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }],
    });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const at = await position(page, 75, 40);
    for (let i = 0; i < 2; i++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await client.detach();
    await expect.poll(async () => (await snapshot(page)).curves[0].controlPoints.length).toBe(6);
  });
  for (const phase of ['cue pause', 'ripple', 'hold']) {
    test(`touch drag during ${phase} keeps its edit and offers point creation`, async ({
      page,
    }) => {
      await hold(page);
      if (phase !== 'hold') {
        await replayPaused(page);
        await page.clock.runFor(phase === 'cue pause' ? 400 : 1670);
      }
      const b = (await point(page).boundingBox())!;
      const end = await position(page, 50, 35);
      const client = await page.context().newCDPSession(page);
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }],
      });
      for (let i = 1; i <= 6; i++)
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [
            { x: end.x, y: b.y + b.height / 2 + ((end.y - b.y - b.height / 2) * i) / 6 },
          ],
        });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await client.detach();
      await settle(page);
      expect((await snapshot(page)).curves[0].controlPoints[3].target).toBe(35);
      await expect(
        page.getByText('Double-tap the shape to add a point', { exact: true })
      ).toBeVisible();
      expect((await snapshot(page)).dirty).toBe(true);
      expect((await snapshot(page)).services).toEqual([]);
    });
  }
});

for (const input of ['mouse', 'keyboard'] as const) {
  test(`chosen preset target persists until arrival with ${input}`, async ({ page }) => {
    await hold(page);
    await page.getByRole('button', { name: 'Dismiss example', exact: true }).click();
    await page.clock.install();
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const chip = page.locator('[data-preset="late_starter"]');
    if (input === 'mouse') {
      await chip.hover();
      await chip.click();
    } else {
      await chip.focus();
      await page.keyboard.press('Enter');
    }
    const target = page.locator('curve-graph .preview-curve-line');
    await expect(target).toHaveCount(1);
    const path = await target.getAttribute('d');
    const style = await target.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        width: s.strokeWidth,
        opacity: s.opacity,
        filter: s.filter,
        animation: s.animationName,
      };
    });
    expect(style).toEqual({ width: '1.25px', opacity: '0.7', filter: 'none', animation: 'none' });
    await page.mouse.move(0, 0);
    await page.clock.runFor(200);
    await expect(target).toHaveAttribute('d', path!);
    const frame = await page.locator('curve-graph').evaluate((g: any) => g.curveFrame);
    expect(frame.knots.some((p: any) => p.lightener === 60 && p.target > 0)).toBe(true);
    await page.locator('[data-preset="early_starter"]').hover();
    await expect(target).toHaveAttribute('d', path!);
    await expect(page.locator('[data-preset="early_starter"]')).not.toHaveAttribute(
      'aria-current',
      'true'
    );
    await expect(page.getByText('Trying Early starter', { exact: true })).toHaveCount(0);
    await page.mouse.move(0, 0);
    await page.clock.runFor(150);
    await expect(target).toHaveCount(1);
    await page.clock.runFor(100);
    await expect(target).toHaveCount(0);
    const snap = await snapshot(page);
    expect(
      snap.curves[0].controlPoints
        .filter((p: any) => p.lightener <= 60)
        .every((p: any) => p.target === 0)
    ).toBe(true);
    expect(snap.services).toEqual([]);
    await page.getByRole('slider', { name: 'Try group brightness' }).focus();
    await page.keyboard.press('Home');
    await expect(page.locator('curve-legend .brightness-value')).toHaveText(['Off', 'Off', 'Off']);
    await expect(
      page.getByRole('button', { name: 'Ceiling Light Off', exact: true })
    ).toBeVisible();
  });
}

test('new groups start at 100 and a chosen viewing brightness survives reload and group switching', async ({
  page,
}) => {
  await hold(page, 'members=2');
  const slider = page.getByRole('slider', { name: 'Try group brightness' });
  await expect(slider).toHaveAttribute('aria-valuenow', '100');
  await page.getByRole('button', { name: 'Dismiss example', exact: true }).click();
  await slider.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.reload();
  await expect(slider).toHaveAttribute('aria-valuenow', '1');
  expect((await snapshot(page)).example).toBeNull();
  await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.switchGroup());
  await expect(slider).toHaveAttribute('aria-valuenow', '100');
  expect((await snapshot(page)).services).toEqual([]);
  expect((await snapshot(page)).dirty).toBe(false);
});

for (const elapsed of [100, 800]) {
  test(`keyboard takeover during cue introduction at ${elapsed}ms prevents delayed movement`, async ({
    page,
  }) => {
    await hold(page);
    await replayPaused(page);
    await page.clock.runFor(elapsed);
    await point(page).focus();
    await page.keyboard.press('ArrowUp');
    const edited = (await snapshot(page)).curves;
    expect(edited[0].controlPoints[3].target).toBe(51);
    await page.clock.runFor(4000);
    expect((await snapshot(page)).curves).toEqual(edited);
    expect((await snapshot(page)).services).toEqual([]);
    await page
      .getByRole('button', { name: 'Undo', exact: true })
      .evaluate((el: HTMLButtonElement) => el.click());
    await page.clock.runFor(400);
    expect((await snapshot(page)).dirty).toBe(false);
  });
}

for (const action of ['reduce', 'dismiss'] as const) {
  test(`${action} during the cue pause leaves no delayed ripple`, async ({ page }) => {
    await hold(page);
    await replayPaused(page);
    await page.clock.runFor(400);
    if (action === 'reduce') await page.emulateMedia({ reducedMotion: 'reduce' });
    else await page.keyboard.press('Escape');
    const before = (await snapshot(page)).curves;
    await page.clock.runFor(4000);
    expect((await snapshot(page)).curves).toEqual(before);
    expect((await snapshot(page)).dirty).toBe(false);
    expect((await snapshot(page)).services).toEqual([]);
    if (action === 'reduce') {
      expect((await snapshot(page)).example).not.toBeNull();
      await expect(point(page)).toHaveAttribute('cy', String(toSvgY(50)));
    } else expect((await snapshot(page)).example).toBeNull();
  });
}

test('a native touch preset keeps its target while the curve catches up', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await hold(page);
  await page.getByRole('button', { name: 'Dismiss example', exact: true }).click();
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const b = (await page.locator('[data-preset="late_starter"]').boundingBox())!;
  const c = await page.context().newCDPSession(page);
  await c.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }],
  });
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await c.detach();
  await page.clock.runFor(220);
  await expect(page.locator('curve-graph .preview-curve-line')).toHaveCount(1);
  await page.clock.runFor(300);
  await expect(page.locator('curve-graph .preview-curve-line')).toHaveCount(0);
  expect((await snapshot(page)).dirty).toBe(true);
  expect((await snapshot(page)).services).toEqual([]);
});

test('Dim visibly selects before the example moves and remains identified as temporary', async ({
  page,
}) => {
  await hold(page);
  await replayPaused(page);
  const dim = page.locator('[data-preset="dim_accent"]');
  await page.clock.runFor(1099);
  await expect(dim).not.toHaveClass(/invitation-chip/);
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(50)));
  await page.clock.runFor(1);
  await expect(dim).toHaveClass(/invitation-chip/);
  await expect(dim).toHaveAccessibleName('Dim accent. Example shape for Ceiling Light');
  await expect(dim).not.toHaveAttribute('aria-current', 'true');
  await page.clock.runFor(400);
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(50)));
  expect((await snapshot(page)).dirty).toBe(false);
  await page.clock.runFor(500);
  expect((await snapshot(page)).curves[0].controlPoints[3].target).toBeLessThan(50);
  await page.clock.runFor(1600);
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(20)));
  await page.clock.fastForward(6000);
  await expect(page.locator('curve-graph .example-instruction')).toHaveCount(0);
  await expect(dim).toHaveClass(/invitation-chip/);
  expect((await snapshot(page)).services).toEqual([]);
  expect((await snapshot(page)).backend['light.example_0'].brightness['100']).toBe('100');
  await page.keyboard.press('Escape');
  await expect(dim).not.toHaveClass(/invitation-chip/);
});
