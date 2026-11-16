import { expect, test, type Page } from '@playwright/test';
import { sampleCurveAt, toSvgY } from '../src/utils/graph-math';
import {
  INVITATION_ORIENTATION_MS,
  INVITATION_TIMELINE as T,
} from '../src/utils/first-use-invitation';
import { CURVE_PRESETS } from '../src/utils/presets';
import { UI } from '../src/utils/strings';

const FIXTURE = '/js/playwright/fixtures/first-use-invitation.html';
test.beforeEach(async ({ page }) => {
  // Global setup rebuilds the served bundle. Its dev-server invalidation must
  // not reload the first arrival and consume the product's one-shot progress.
  await page.route('**/@vite/client', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' })
  );
});
/** Show me how lives in the toolbar's ⋮ menu. */
async function showMeHow(page: Page) {
  await page.getByRole('button', { name: 'More actions', exact: true }).click();
  await page.locator('.more-item.show-me-how').click();
}
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
      actual: f.card._curves,
      curves: graph?.curves ?? [],
      curveFrame: graph?.curveFrame ?? null,
      example: graph?.exampleEntityId ?? null,
      backend: f.backendSnapshot(),
      services: f.services,
      calls: f.calls,
      saved: f.savedPayloads,
      selected: graph?.selectedCurveId ?? null,
      original: f.card._originalCurves,
      history: f.card._undoStack,
      phase: f.card._invitation.phase,
      frozen: f.card._invitation.frozen,
      storedRoom: f.card._scrubberPosition,
      room: graph?.scrubberPosition,
      scrubberRoom: f.card.shadowRoot.querySelector('curve-scrubber')?.position,
      legendRoom: f.card.shadowRoot.querySelector('curve-legend')?.scrubberPosition,
      lightValues: [
        ...f.card.shadowRoot
          .querySelector('curve-legend')
          .shadowRoot.querySelectorAll('brightness-bar'),
      ].map((bar: any) => bar.value),
    };
  });
}
async function open(page: Page, query = '') {
  const params = new URLSearchParams({ seed: test.info().testId, first: 'always' });
  new URLSearchParams(query).forEach((value, key) => params.set(key, value));
  await page.goto(`${FIXTURE}?${params}`);
  await expect(page.locator('curve-legend .legend-item')).toHaveCount(
    Number(new URLSearchParams(query).get('members') ?? 3)
  );
  await page.locator('curve-graph').scrollIntoViewIfNeeded();
}
async function hold(page: Page, query = '') {
  await open(page, query);
  await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toBeVisible();
  await page.waitForFunction(() => {
    const invitation = (window as any).__INVITATION_FIXTURE__.card._invitation;
    if (invitation.phase !== 'point') return false;
    invitation.freeze();
    return true;
  });
  await settle(page);
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(30)));
  await expect(point(page, 4)).toHaveAttribute('cy', String(toSvgY(30)));
}
async function position(page: Page, x: number, y: number) {
  return page.locator('curve-graph').evaluate(
    (graph, p) => {
      const svg = graph.shadowRoot!.querySelector('svg')!;
      const pt = svg.createSVGPoint();
      pt.x = (graph as any)._x(p.x);
      pt.y = p.y;
      const screen = pt.matrixTransform(svg.getScreenCTM()!);
      return { x: screen.x, y: screen.y };
    },
    { x, y: toSvgY(y) }
  );
}
async function drag(page: Page, target = 35) {
  const b = (await point(page).boundingBox())!;
  const to = await position(page, 50, target);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  // Deliberate intent remains required even when a moving example happens
  // to be nearly at the requested destination already.
  await page.mouse.move(b.x + b.width / 2 + 8, b.y + b.height / 2);
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await settle(page);
}
async function installPausedClock(page: Page) {
  const start = Date.now();
  await page.clock.install({ time: start });
  // Reserve more than the test deadline before pausing, avoiding a cross-process
  // Date.now() race when the browser is busy. Call before load or while help is frozen.
  await page.clock.pauseAt(start + 60_000);
}
async function replayPaused(page: Page) {
  await installPausedClock(page);
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
  await installPausedClock(page);
  await page.goto(`${FIXTURE}?seed=${test.info().testId}&state=loading&first=always`);
  await expect(page.getByText('Loading brightness shapes…')).toBeVisible();
  await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.releaseLoad());
  await page.clock.runFor(50);
  await settle(page);
  await expect(page.locator('curve-legend .legend-item')).toHaveCount(3);
  expect((await snapshot(page)).example).toBeNull();
}

test('first entry leaves time to orient, then visibly chooses a preset before moving one point', async ({
  page,
}) => {
  await readyDuringOrientation(page);
  await page.clock.runFor(500);
  expect((await snapshot(page)).example).toBeNull();
  const original = (await snapshot(page)).curves;
  await page.clock.runFor(220);
  expect((await snapshot(page)).example).toBe('light.example_0');
  await page.clock.runFor(T.presetHighlight + 50);
  await expect(page.locator('[data-preset="dim_accent"]')).toHaveClass(/invitation-chip/);
  expect((await snapshot(page)).curves).toEqual(original);
  await expect(page.locator('curve-graph .example-instruction')).toHaveCount(0);
  await page.clock.runFor(T.presetApply - T.presetHighlight + 50);
  const chosen = (await snapshot(page)).curves;
  expect(chosen[0].controlPoints.map((p: any) => p.target)).toEqual([0, 1, 18, 30, 30]);
  expect(chosen.slice(1)).toEqual(original.slice(1));
  await page.clock.runFor(T.pointUp - T.presetApply);
  const moved = await snapshot(page);
  expect(moved.phase).toBe('point');
  expect(moved.curves[0].controlPoints[3].target).toBeGreaterThan(30);
  expect(moved.curves[0].controlPoints.filter((_: any, i: number) => i !== 3)).toEqual(
    chosen[0].controlPoints.filter((_: any, i: number) => i !== 3)
  );
  expect(moved.dirty).toBe(false);
  expect(moved.services).toEqual([]);
});

test('example announcements change by phase, never on every animation frame', async ({ page }) => {
  await readyDuringOrientation(page);
  await page.clock.runFor(720);
  const region = page.locator('.invitation-announcement');
  const node = await region.elementHandle();
  await page.clock.runFor(T.pointGrab + 100);
  const announcement = await region.textContent();
  expect(announcement).toContain('Ceiling Light');
  await page.clock.runFor(300);
  expect(await region.evaluate((el, previous) => el === previous, node)).toBe(true);
  await expect(region).toHaveText(announcement!);
  await page.clock.runFor(T.room - T.pointGrab);
  await expect(region).not.toHaveText(announcement!);
  await page.getByRole('button', { name: 'Dismiss example', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(region).toHaveText('');
  expect(await region.evaluate((el, previous) => el === previous, node)).toBe(true);
});

test('a brightness edit during orientation cancels the delayed invitation', async ({ page }) => {
  await readyDuringOrientation(page);
  await page.getByRole('slider', { name: 'Room brightness', exact: true }).focus();
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
  // The chips belong to Edit; the pencil reveals them without changing anything.
  await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.card.enterEditMode());
  await settle(page);
  const chip = (await page.locator('[data-preset="dim_accent"]:visible').boundingBox())!;
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

test('reduced motion uses held steps without interpolated travel and restores the baseline', async ({
  page,
}) => {
  await readyDuringOrientation(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.runFor(720);
  const original = (await snapshot(page)).curves;
  await page.clock.runFor(T.point + 50);
  await expect(page.locator('curve-graph .example-cue-animating')).toHaveCount(0);
  const held = (await snapshot(page)).curves;
  await page.clock.runFor(200);
  expect((await snapshot(page)).curves).toEqual(held);
  await page.clock.runFor(T.complete);
  expect((await snapshot(page)).curves).toEqual(original);
  expect((await snapshot(page)).phase).toBe('complete');
  expect((await snapshot(page)).dirty).toBe(false);
  expect((await snapshot(page)).services).toEqual([]);
});

test('ring and leader identify the native circle and stop on a stationary press', async ({
  page,
}) => {
  await hold(page);
  await replayPaused(page);
  await page.clock.runFor(T.pointGrab + 400);
  const at = await point(page).evaluate((el) => ({
    x: el.getAttribute('cx'),
    y: el.getAttribute('cy'),
  }));
  await expect(page.locator('curve-graph .example-instruction')).toHaveAttribute(
    'transform',
    `translate(${at.x} ${at.y})`
  );
  await expect(page.locator('curve-graph .example-cue-leader')).toHaveCount(1);
  await expect(page.locator('curve-graph .example-cue-label')).toHaveText(
    'Make this light brighter'
  );
  await expect(page.locator('curve-graph .example-cue-pressed')).toHaveCount(1);
  const b = (await point(page).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator('curve-graph .example-instruction')).toHaveCount(0);
  expect((await snapshot(page)).dirty).toBe(false);
});

test('replay preserves a non-circular light marker and explains its brightness change', async ({
  page,
}) => {
  await hold(page);
  await page.getByRole('button', { name: 'Dismiss example', exact: true }).click();
  await page.getByRole('button', { name: /Sofa Lamp 100%/ }).click();
  await page.getByRole('button', { name: 'Replay example shape', exact: true }).click();
  await expect(page.locator('curve-graph .example-cue-label')).toHaveText(
    'Make this light brighter'
  );
  expect((await snapshot(page)).selected).toBe('light.example_1');
  expect((await snapshot(page)).dirty).toBe(false);
});

test('completed example restores exact configuration, Room and selection without output', async ({
  page,
}) => {
  await hold(page, 'members=2');
  const before = await snapshot(page);
  expect(before.curves[0].controlPoints).toHaveLength(5);
  expect(before.curves[1].controlPoints).toHaveLength(3);
  await expect(page.locator('curve-legend brightness-bar .value').first()).toHaveText('≈ 30%');
  await expect(page.getByRole('button', { name: /Save changes/, disabled: false })).toHaveCount(0);
  await replayPaused(page);
  await page.clock.runFor(T.complete + 100);
  const after = await snapshot(page);
  expect(after.curves).toEqual(before.original);
  expect(after.phase).toBe('complete');
  expect(after.storedRoom).toBe(before.storedRoom);
  expect(after.selected).toBe(before.selected);
  expect(after.history).toEqual(before.history);
  expect(after.dirty).toBe(false);
  expect(after.services).toEqual([]);
  expect(after.saved).toEqual([]);
  await expect(page.locator('curve-graph .example-instruction')).toHaveCount(0);
});

for (const phase of ['preset hold', 'point motion', 'hold']) {
  test(`same mouse gesture takes over during ${phase} with one Undo`, async ({ page }) => {
    await hold(page);
    const baseline = (await snapshot(page)).backend;
    if (phase !== 'hold') {
      await replayPaused(page);
      await page.clock.runFor(phase === 'preset hold' ? T.presetApply + 100 : T.pointGrab + 400);
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
    await expect(
      page.getByRole('button', { name: 'Undo', exact: true, disabled: false })
    ).toHaveCount(0);
  });
}

test('tap/no-op keyboard stays clean; keyboard takeover, add/delete and cancel remain native', async ({
  page,
}) => {
  await hold(page);
  const baseline = JSON.parse(JSON.stringify((await snapshot(page)).original));
  await point(page).click();
  expect((await snapshot(page)).dirty).toBe(false);
  await expect(point(page)).toHaveCount(1);
  await point(page, 0).focus();
  await page.keyboard.press('ArrowDown');
  expect((await snapshot(page)).dirty).toBe(false);
  await point(page).focus();
  await page.keyboard.press('ArrowUp');
  expect((await snapshot(page)).curves[0].controlPoints[3].target).toBe(31);
  await page.keyboard.press('Enter');
  expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(6);
  await page.keyboard.press('Delete');
  expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(5);
  const edited = await snapshot(page);
  await page.keyboard.press('Escape');
  expect((await snapshot(page)).curves).toEqual(edited.curves);
  expect((await snapshot(page)).dirty).toBe(true);
  expect((await snapshot(page)).history).toEqual(edited.history);
  expect((await snapshot(page)).original).toEqual(edited.original);
  await page.getByRole('button', { name: 'Cancel changes', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).dirty).toBe(false);
  const cancelled = await snapshot(page);
  expect(cancelled.curves).toEqual(baseline);
  expect(cancelled.original).toEqual(baseline);
  expect(cancelled.history).toEqual([]);
  expect(cancelled.saved).toEqual([]);
  expect(cancelled.services).toEqual([]);
});

for (const input of ['keyboard during motion', 'long press after motion']) {
  test(`removal is the first effective example edit: ${input}`, async ({ page }) => {
    await hold(page);
    const backend = (await snapshot(page)).backend;
    if (input.startsWith('keyboard')) {
      await replayPaused(page);
      await page.clock.runFor(T.pointGrab + 400);
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
  await expect(point(page, 4)).toHaveAttribute('cy', String(toSvgY(30)));
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

test('preset, selection and brightness dismiss before operating on actual state', async ({
  page,
}) => {
  await hold(page);
  await page.getByRole('slider', { name: 'Room brightness', exact: true }).press('ArrowLeft');
  expect((await snapshot(page)).example).toBeNull();
  expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(3);
  expect((await snapshot(page)).dirty).toBe(false);
  await page.getByRole('button', { name: /Sofa Lamp 99%/ }).click();
  await page.locator('[data-preset="dim_accent"]').click();
  const edited = await snapshot(page);
  expect(edited.curves[1].controlPoints.at(-1).target).toBe(30);
  expect(edited.curves[0].controlPoints.at(-1).target).toBe(100);
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
  await expect(
    page.getByRole('status').filter({ hasText: /Saved(?: successfully)?/ })
  ).toBeVisible();
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
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(30)));
  expect((await snapshot(page)).dirty).toBe(false);
});

test('explicit replay chooses an available light when a returning group has no selection', async ({
  page,
}) => {
  await page.goto(`${FIXTURE}?seed=${test.info().testId}&first=0`);
  await expect(page.locator('curve-legend .legend-item')).toHaveCount(3);
  expect((await snapshot(page)).selected).toBeNull();
  await page.getByRole('button', { name: 'Replay example shape', exact: true }).click();
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(30)));
  expect((await snapshot(page)).selected).toBe('light.example_0');
  expect((await snapshot(page)).dirty).toBe(false);
  expect((await snapshot(page)).services).toEqual([]);
});

test('reduced motion starting mid-drag freezes its frame without adopting it', async ({ page }) => {
  await hold(page);
  await replayPaused(page);
  await page.clock.runFor(T.pointGrab + 400);
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
      await expect(page.locator('lightener-curve-card .exit-slot')).toHaveAttribute(
        'data-state',
        'empty'
      );
    await expect(page.getByRole('button', { name: 'Dismiss example', exact: true })).toHaveCount(0);
    expect((await snapshot(page)).services).toEqual([]);
    if (state === 'unavailable') expect((await snapshot(page)).selected).toBeNull();
  });
}

test('keyboard takes over during a demonstration drag and no-op Enter remains clean', async ({
  page,
}) => {
  await hold(page);
  await replayPaused(page);
  await page.clock.runFor(T.pointGrab + 400);
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
  await page.clock.runFor(T.pointGrab + 400);
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
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(30)));
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
  await page.getByRole('switch', { name: 'Preview on lights', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Replay example shape', exact: true })
  ).toBeDisabled();
  await expect(
    page.getByRole('switch', { name: 'Preview on lights', checked: true })
  ).toBeVisible();
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
  await expect(page.getByRole('button', { name: 'More actions', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay example shape', exact: true })).toHaveCount(
    0
  );
});

test.describe('real touch takeover', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Native input injection requires Chromium CDP'
  );
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
  for (const phase of ['preset hold', 'point motion', 'hold']) {
    test(`touch drag during ${phase} keeps its edit and offers point creation`, async ({
      page,
    }) => {
      await hold(page);
      if (phase !== 'hold') {
        await replayPaused(page);
        await page.clock.runFor(phase === 'preset hold' ? T.presetApply + 100 : T.pointGrab + 400);
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
    // Dismissing returns to View; Edit brings back the chips.
    await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.card.enterEditMode());
    await installPausedClock(page);
    const chip = page.locator('[data-preset="late_starter"]:visible');
    if (input === 'mouse') {
      await chip.hover();
      await chip.click();
    } else {
      await chip.focus();
      await page.keyboard.press('Enter');
    }
    const target = page.locator('curve-graph .preview-curve-line');
    await expect(target).toHaveCount(1);
    // The destination is chosen immediately; its drawing now morphs for 240ms.
    const targetPoints = await page
      .locator('curve-graph')
      .evaluate((graph: any) => graph.previewCurve.controlPoints);
    expect(targetPoints).toEqual((await snapshot(page)).curves[0].controlPoints);
    await page.clock.runFor(260);
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
    expect(style).toEqual({
      width: '1.25px',
      opacity: '0.7',
      filter: 'none',
      animation: 'preview-dash-flow',
    });
    await page.mouse.move(0, 0);
    await page.clock.runFor(40);
    await expect(target).toHaveAttribute('d', path!);
    const frame = await page.locator('curve-graph').evaluate((g: any) => g.curveFrame);
    expect(frame.knots.some((p: any) => p.lightener === 40 && p.target > 0)).toBe(true);
    await page.locator('[data-preset="early_starter"]').hover();
    await expect(target).toHaveAttribute('d', path!);
    await expect(page.locator('[data-preset="early_starter"]')).not.toHaveAttribute(
      'aria-current',
      'true'
    );
    await expect(page.getByText('Trying Early starter', { exact: true })).toHaveCount(0);
    await page.mouse.move(0, 0);
    await page.clock.runFor(50);
    await expect(target).toHaveCount(1);
    await page.clock.runFor(100);
    await expect(target).toHaveCount(0);
    const snap = await snapshot(page);
    expect(
      snap.curves[0].controlPoints
        .filter((p: any) => p.lightener <= 40)
        .every((p: any) => p.target === 0)
    ).toBe(true);
    expect(snap.services).toEqual([]);
    await page.getByRole('slider', { name: 'Room brightness', exact: true }).focus();
    await page.keyboard.press('Home');
    await expect(page.locator('curve-legend brightness-bar .value')).toHaveText([
      'Off',
      'Off',
      'Off',
    ]);
    await expect(
      page.getByRole('button', { name: 'Ceiling Light Off', exact: true })
    ).toBeVisible();
  });
}

test('new groups start at 100 and a chosen viewing brightness survives reload and group switching', async ({
  page,
}) => {
  await hold(page, 'members=2');
  const slider = page.getByRole('slider', { name: 'Room brightness', exact: true });
  await expect(slider).toHaveValue('100');
  await page.getByRole('button', { name: 'Dismiss example', exact: true }).click();
  await slider.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.reload();
  await expect(slider).toHaveValue('1');
  expect((await snapshot(page)).example).toBeNull();
  await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.switchGroup());
  await expect(slider).toHaveValue('100');
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
    await point(page, 2).focus();
    await page.keyboard.press('ArrowDown');
    const edited = (await snapshot(page)).curves;
    expect(edited[0].controlPoints[2].target).toBe(99);
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
  test(`${action} during the cue pause leaves no delayed demonstration`, async ({ page }) => {
    await hold(page);
    await replayPaused(page);
    await page.clock.runFor(400);
    if (action === 'reduce') await page.emulateMedia({ reducedMotion: 'reduce' });
    else {
      await page.getByRole('button', { name: 'Dismiss example', exact: true }).focus();
      await page.keyboard.press('Escape');
    }
    const before = (await snapshot(page)).curves;
    await page.clock.runFor(4000);
    expect((await snapshot(page)).curves).toEqual(before);
    expect((await snapshot(page)).dirty).toBe(false);
    expect((await snapshot(page)).services).toEqual([]);
    if (action === 'reduce') {
      expect((await snapshot(page)).example).not.toBeNull();
      expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(3);
    } else expect((await snapshot(page)).example).toBeNull();
  });
}

test('a native touch preset keeps its target while the curve catches up', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Native input injection requires Chromium CDP');
  await page.setViewportSize({ width: 390, height: 844 });
  await hold(page);
  await page.getByRole('button', { name: 'Dismiss example', exact: true }).click();
  // Dismissing returns to View; Edit brings back the chips.
  await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.card.enterEditMode());
  await installPausedClock(page);
  const b = (await page.locator('[data-preset="late_starter"]:visible').boundingBox())!;
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

test('Dim visibly selects before applying and stops being highlighted when the example completes', async ({
  page,
}) => {
  await hold(page);
  await replayPaused(page);
  const dim = page.locator('[data-preset="dim_accent"]');
  await page.clock.runFor(T.presetHighlight - 50);
  await expect(dim).not.toHaveClass(/invitation-chip/);
  expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(3);
  await page.clock.runFor(100);
  await expect(dim).toHaveClass(/invitation-chip/);
  await expect(dim).toHaveAccessibleName('Dim accent. Example shape for Ceiling Light');
  await expect(dim).not.toHaveAttribute('aria-current', 'true');
  expect((await snapshot(page)).curves[0].controlPoints).toHaveLength(3);
  await page.clock.runFor(T.presetApply - T.presetHighlight + 50);
  expect((await snapshot(page)).curves[0].controlPoints[3].target).toBe(30);
  expect((await snapshot(page)).curveFrame).not.toBeNull();
  await page.clock.runFor(T.point - T.presetApply);
  await expect(point(page)).toHaveAttribute('cy', String(toSvgY(30)));
  expect((await snapshot(page)).dirty).toBe(false);
  await page.clock.runFor(T.complete);
  await expect(dim).not.toHaveClass(/invitation-chip/);
  expect((await snapshot(page)).services).toEqual([]);
  expect((await snapshot(page)).backend['light.example_0'].brightness['100']).toBe('100');
});

test('transient takeover hints clear when the same card reconnects', async ({ page }) => {
  await hold(page);
  await point(page).focus();
  await page.keyboard.press('ArrowUp');
  const hint = page.locator('.graph-insight-secondary');
  const caption = page.locator('curve-scrubber .invitation-caption');
  await expect(hint).toHaveText('Press Enter on a point to add another');
  await expect(caption).toHaveText('Try the lights together');
  const edited = await snapshot(page);
  await page.evaluate(async () => {
    const card = (window as any).__INVITATION_FIXTURE__.card;
    card.remove();
    document.querySelector('#host')!.append(card);
    await card.updateComplete;
  });
  await page.waitForTimeout(6000);
  await expect(hint.filter({ hasText: 'Press Enter on a point to add another' })).toHaveCount(0);
  await expect(caption).toBeEmpty();
  const reconnected = await snapshot(page);
  expect(reconnected.curves).toEqual(edited.curves);
  expect(reconnected.dirty).toBe(true);
  expect(reconnected.services).toEqual([]);
  expect(reconnected.saved).toEqual([]);
  await page.getByRole('button', { name: 'Undo', exact: true }).press('Enter');
  await expect.poll(async () => (await snapshot(page)).dirty).toBe(false);
  await point(page, 2).focus();
  await page.keyboard.press('ArrowDown');
  expect((await snapshot(page)).dirty).toBe(true);
});

for (const scenario of [
  { width: 1440, members: 20, room: null, shape: 'equal' },
  { width: 390, members: 20, room: 0, shape: 'equal' },
  { width: 1440, members: 3, room: 100, shape: 'dim' },
]) {
  test(`full tutorial restores ${scenario.members} lights at ${scenario.width}px from Room ${scenario.room ?? 'unset'} and ${scenario.shape}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: scenario.width, height: 900 });
    await open(
      page,
      `first=0&help=1&members=${scenario.members}&shape=${scenario.shape}${scenario.room === null ? '' : `&room=${scenario.room}`}`
    );
    const before = await snapshot(page);
    expect(before.selected).toBeNull();
    await installPausedClock(page);
    await showMeHow(page);
    let elapsed = 0;
    const at = async (time: number) => {
      await page.clock.runFor(time - elapsed);
      elapsed = time;
      await settle(page);
      const state = await snapshot(page);
      expect(state.storedRoom).toBe(before.storedRoom);
      expect(state.dirty).toBe(false);
      expect(state.history).toEqual(before.history);
      expect(state.backend).toEqual(before.backend);
      expect(state.services).toEqual([]);
      expect(state.saved).toEqual([]);
      expect(state.curves.slice(1)).toEqual(before.curves.slice(1));
      expect(state.room).toBe(state.scrubberRoom);
      expect(state.room).toBe(state.legendRoom);
      return state;
    };
    await at(T.presetHighlight + 50);
    await expect(
      page.locator(`[data-preset="${scenario.shape === 'dim' ? 'early_starter' : 'dim_accent'}"]`)
    ).toHaveClass(/invitation-chip/);
    expect((await snapshot(page)).curves).toEqual(before.curves);
    const chosen = await at(T.point + 50);
    await expect(page.locator('curve-graph .example-cue-label')).toHaveText(
      'Make this light brighter'
    );
    const baselinePoint = chosen.curves[0].controlPoints.find((p: any) => p.lightener === 50);
    const up = await at(T.pointUp + 50);
    await expect(page.locator('curve-graph .example-cue-label')).toHaveText('Dim this light');
    expect(up.curves[0].controlPoints.find((p: any) => p.lightener === 50).target).toBeGreaterThan(
      baselinePoint.target
    );
    const down = await at(T.pointDown + 50);
    expect(down.curves[0].controlPoints.find((p: any) => p.lightener === 50).target).toBeLessThan(
      baselinePoint.target
    );
    const returned = await at(T.room + 50);
    expect(returned.curves).toEqual(chosen.curves);
    expect(returned.room).toBe(before.room);
    const caption = page.locator('curve-graph .example-cue-label');
    await expect(caption).toHaveText('Adjust room brightness');
    const readable = await caption.evaluate((label) => {
      const bounds = label.getBoundingClientRect();
      const graph = label.ownerSVGElement!.getBoundingClientRect();
      return (
        bounds.left >= graph.left - 1 &&
        bounds.right <= graph.right + 1 &&
        bounds.top >= graph.top - 1 &&
        bounds.bottom <= graph.bottom + 1
      );
    });
    expect(readable, 'the Room explanation fits before the grip moves').toBe(true);
    const checkPointer = async (room: number) => {
      const pointer = page.locator('curve-graph .example-pointer');
      await expect(pointer).toHaveAttribute('transform', room > 90 ? 'scale(-1 1)' : '');
      expect(
        await pointer.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const graph = element.ownerSVGElement!.getBoundingClientRect();
          return bounds.left >= graph.left - 1 && bounds.right <= graph.right + 1;
        }),
        'the pointer stays inside both ends of the graph'
      ).toBe(true);
    };
    // The pointer travels from the point it moved to the Room grip; it does not jump there.
    const ringCentre = async () => {
      const box = (await page.locator('curve-graph .example-cue-ring').boundingBox())!;
      return box.x + box.width / 2;
    };
    const leaving = await ringCentre();
    await at(T.roomGrab - 20);
    if (returned.room !== 50)
      expect(
        Math.abs((await ringCentre()) - leaving),
        'the pointer was still near the moved point when the Room step began'
      ).toBeGreaterThan(20);
    await checkPointer(returned.room);
    const travelling = await at(T.roomGrab + 333);
    expect(
      Number.isInteger(travelling.room),
      'Room moves continuously between displayed percentages'
    ).toBe(false);
    const gripPosition = await page
      .locator('curve-scrubber brightness-bar .marker')
      .evaluate((marker: HTMLElement) => parseFloat(marker.style.left));
    // CSSOM serializes percentages to roughly six significant digits.
    expect(gripPosition).toBeCloseTo(travelling.room, 3);
    const checkEndpoint = async (time: number, expected: number) => {
      const state = await at(time);
      expect(state.room).toBe(expected);
      await checkPointer(expected);
      if (expected === 0) {
        expect(state.lightValues.every((value: number) => value === 0)).toBe(true);
        await expect(page.locator('curve-scrubber .meaning-line')).toHaveText('All lights off');
      } else {
        expect(state.lightValues).toEqual(
          chosen.curves.map((curve: any) => curve.controlPoints.at(-1).target)
        );
        await expect(page.locator('curve-scrubber .meaning-line')).toHaveText(
          `All ${scenario.members} lights on`
        );
      }
      expect(state.curves).toEqual(chosen.curves);
    };
    const firstEndpoint = before.room <= 50 ? 100 : 0;
    await checkEndpoint(T.roomLow + 20, firstEndpoint);
    await checkEndpoint(T.roomHigh + 20, 100 - firstEndpoint);
    const roomRestored = await at(T.add + 50);
    await expect(page.locator('curve-graph .example-cue-label')).toHaveText(
      'Double-click to add a point'
    );
    expect(roomRestored.room).toBe(before.room);
    // The pointer has reached its click and shows which mouse button it uses.
    const cueCentre = async () => {
      const box = (await page.locator('curve-graph .example-cue-ring').boundingBox())!;
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    await at(T.addFirstPress - 20);
    const clickedAt = await cueCentre();
    await expect(page.locator('curve-graph .example-mouse')).toHaveCount(1);
    const added = await at(T.addInsert + 50);
    const afterInsert = await cueCentre();
    expect(
      Math.hypot(afterInsert.x - clickedAt.x, afterInsert.y - clickedAt.y),
      'the pointer stays where it clicked while the point appears'
    ).toBeLessThan(2);
    expect(added.curves[0].controlPoints).toHaveLength(chosen.curves[0].controlPoints.length + 1);
    expect(
      added.curves[0].controlPoints.filter((p: any) =>
        chosen.curves[0].controlPoints.some((original: any) => original.lightener === p.lightener)
      )
    ).toEqual(chosen.curves[0].controlPoints);
    await at(T.remove + 50);
    await expect(page.locator('curve-graph .example-cue-label')).toHaveText(
      'Right-click to remove it'
    );
    const removed = await at(T.removeDelete + 50);
    expect(removed.curves).toEqual(chosen.curves);
    const afterRemoval = await cueCentre();
    expect(
      Math.hypot(afterRemoval.x - clickedAt.x, afterRemoval.y - clickedAt.y),
      'the pointer stays where the point was'
    ).toBeLessThan(2);
    // On the way back the pointer has no caption, and it has not vanished.
    await at(T.restoreCue + 50);
    await expect(page.locator('curve-graph .example-instruction')).toHaveCount(1);
    await expect(page.locator('curve-graph .example-cue-label')).toHaveCount(0);
    const complete = await at(T.complete + 50);
    expect(complete.phase).toBe('complete');
    expect(complete.curveFrame).toBeNull();
    expect(complete.curves).toEqual(before.curves);
    expect(complete.room).toBe(before.room);
    expect(complete.selected).toBe(before.selected);
    await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    expect((await snapshot(page)).example).toBeNull();
    expect((await snapshot(page)).curves).toEqual(before.curves);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
}

for (const control of ['Room', 'light'] as const) {
  test(`first ${control} keyboard edit during the Room sweep starts from the actual viewing brightness`, async ({
    page,
  }) => {
    await open(page, 'first=0&help=1&room=70');
    const before = await snapshot(page);
    expect(before.room).toBe(70);
    await installPausedClock(page);
    await showMeHow(page);
    await page.clock.runFor(T.roomLow + 20);
    expect((await snapshot(page)).room).toBe(0);
    expect((await snapshot(page)).storedRoom).toBe(70);
    if (control === 'Room') {
      await page.getByRole('slider', { name: 'Room brightness', exact: true }).press('ArrowRight');
      const after = await snapshot(page);
      expect(after.example).toBeNull();
      expect(after.room).toBe(71);
      expect(after.storedRoom).toBe(71);
      expect(after.curves).toEqual(before.curves);
      expect(after.dirty).toBe(false);
    } else {
      await page.locator('curve-legend brightness-bar input').first().press('ArrowLeft');
      const after = await snapshot(page);
      expect(after.example).toBeNull();
      expect(after.room).toBe(70);
      expect(after.storedRoom).toBe(70);
      expect(after.dirty).toBe(true);
      expect(
        after.curves[0].controlPoints.find((point: any) => point.lightener === 70)?.target
      ).toBe(69);
      expect(after.curves.slice(1)).toEqual(before.curves.slice(1));
      expect(after.history).toHaveLength(before.history.length + 1);
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await page.clock.runFor(400);
      expect((await snapshot(page)).curves).toEqual(before.curves);
      expect((await snapshot(page)).dirty).toBe(false);
    }
    expect((await snapshot(page)).backend).toEqual(before.backend);
    expect((await snapshot(page)).saved).toEqual([]);
    expect((await snapshot(page)).services).toEqual([]);
  });
}

for (const blockedBy of ['draft', 'Watch'] as const) {
  test(`canvas help refuses ${blockedBy} without changing work or sending output`, async ({
    page,
  }) => {
    await open(page, 'first=0&help=1&room=70');
    if (blockedBy === 'draft') {
      await page.locator('curve-legend brightness-bar input').first().press('ArrowLeft');
      await expect.poll(async () => (await snapshot(page)).dirty).toBe(true);
    } else {
      await page.getByRole('switch', { name: 'Preview on lights', exact: true }).click();
      await expect(
        page.getByRole('switch', { name: 'Preview on lights', exact: true })
      ).toBeChecked();
      // Let the fixture's asynchronous service receipts settle before counting help output.
      await expect.poll(async () => (await snapshot(page)).services.length).toBe(3);
      await page.waitForTimeout(100);
    }
    const before = await snapshot(page);
    await showMeHow(page);
    await expect(page.locator('.canvas-notice')).toHaveText(
      blockedBy === 'draft'
        ? 'Save or cancel your draft before starting the canvas example. Your edits are unchanged.'
        : 'Turn off Preview on lights before starting the canvas example.'
    );
    const after = await snapshot(page);
    expect(after.example).toBeNull();
    for (const key of [
      'actual',
      'original',
      'history',
      'selected',
      'storedRoom',
      'dirty',
      'services',
      'saved',
      'backend',
    ] as const)
      expect(after[key], key).toEqual(before[key]);
    expect(after.calls.filter((call: any) => call.type === 'lightener/save_curves')).toEqual([]);
    if (blockedBy === 'Watch')
      await expect(
        page.getByRole('switch', { name: 'Preview on lights', exact: true })
      ).toBeChecked();
  });
}

test('Replay and Done preserve a selected light and actual Room value during a sweep', async ({
  page,
}) => {
  await open(page, 'first=0&help=1&room=42');
  await page.locator('curve-legend .row-select-btn').nth(1).click();
  const before = await snapshot(page);
  expect(before.selected).toBe('light.example_1');
  await installPausedClock(page);
  await showMeHow(page);
  await page.clock.runFor(T.roomLow + 20);
  expect((await snapshot(page)).room).toBe(100);
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await settle(page);
  expect((await snapshot(page)).phase).toBe('preset');
  expect((await snapshot(page)).room).toBe(42);
  await page.clock.runFor(T.pointUp + 20);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.clock.runFor(T.complete + 100);
  const after = await snapshot(page);
  expect(after.example).toBeNull();
  for (const key of [
    'actual',
    'curves',
    'original',
    'history',
    'selected',
    'storedRoom',
    'room',
    'dirty',
    'services',
    'saved',
    'backend',
  ] as const)
    expect(after[key], key).toEqual(before[key]);
});

for (const exit of ['group switch', 'disconnect'] as const) {
  test(`an active tutorial ends on ${exit} without leaking its example into returned work`, async ({
    page,
  }) => {
    await open(page, 'first=0&help=1&room=70');
    await page.locator('curve-legend .row-select-btn').nth(1).click();
    const before = await snapshot(page);
    await installPausedClock(page);
    await showMeHow(page);
    await page.clock.runFor(T.roomLow + 20);
    expect((await snapshot(page)).room).toBe(0);
    await page.evaluate((exit) => {
      const f = (window as any).__INVITATION_FIXTURE__;
      if (exit === 'group switch') f.switchGroup();
      else {
        f.card.remove();
        document.querySelector('#host')!.append(f.card);
      }
    }, exit);
    await page.clock.runFor(100);
    await settle(page);
    expect((await snapshot(page)).example).toBeNull();
    if (exit === 'group switch') {
      expect((await snapshot(page)).selected).toBeNull();
      expect((await snapshot(page)).room).toBe(100);
      await page.evaluate(() => {
        const card = (window as any).__INVITATION_FIXTURE__.card;
        card.setConfig({ ...card._config, entity: 'light.first_use_room', firstRun: false });
      });
    }
    await page.clock.runFor(T.complete + 100);
    await settle(page);
    const after = await snapshot(page);
    expect(after.example).toBeNull();
    // A group switch returns to View, which keeps no selected light on return.
    expect(after.selected).toEqual(exit === 'group switch' ? null : before.selected);
    for (const key of [
      'actual',
      'curves',
      'original',
      'history',
      'storedRoom',
      'room',
      'dirty',
      'services',
      'saved',
      'backend',
    ] as const)
      expect(after[key], key).toEqual(before[key]);
  });
}

test('held frames skip card updates while caption transitions and resize stay live', async ({
  page,
}) => {
  await open(page, 'first=0&help=1&room=70');
  await installPausedClock(page);
  await showMeHow(page);
  await page.clock.runFor(100);
  await settle(page);
  await page.evaluate(() => {
    const card = (window as any).__INVITATION_FIXTURE__.card;
    const counts = { updates: 0, measures: 0 };
    const update = card.updated.bind(card);
    const measure = card._syncRoomAxis.bind(card);
    card.updated = (...args: any[]) => {
      counts.updates++;
      return update(...args);
    };
    card._syncRoomAxis = () => {
      counts.measures++;
      return measure();
    };
    (window as any).__TUTORIAL_COUNTS__ = counts;
  });
  await page.clock.runFor(250);
  await settle(page);
  expect(await page.evaluate(() => (window as any).__TUTORIAL_COUNTS__)).toEqual({
    updates: 0,
    measures: 0,
  });
  await page.clock.runFor(T.point + 30 - 350);
  await expect(page.locator('curve-graph .example-cue-label')).toHaveText(
    'Make this light brighter'
  );
  await page.clock.runFor(T.pointUp - T.point);
  await expect(page.locator('curve-graph .example-cue-label')).toHaveText('Dim this light');
  await page.clock.runFor(T.room - T.pointUp);
  await expect(page.locator('curve-graph .example-cue-label')).toHaveText('Adjust room brightness');
  const counts = await page.evaluate(() => ({ ...(window as any).__TUTORIAL_COUNTS__ }));
  expect(counts.updates).toBeGreaterThan(0);
  const verifyAlignment = async () => {
    const gap = await page.locator('curve-graph').evaluate((graph: any) => {
      const svg = graph.shadowRoot.querySelector('svg');
      const plot = svg.querySelector('.plot-frame').getBoundingClientRect();
      const room = graph.getRootNode().querySelector('curve-scrubber');
      const grip = room.shadowRoot
        .querySelector('brightness-bar')
        .shadowRoot.querySelector('.marker')
        .getBoundingClientRect();
      const expected = plot.left + (plot.width * graph.scrubberPosition) / 100;
      return Math.abs(grip.left + grip.width / 2 - expected);
    });
    expect(gap).toBeLessThanOrEqual(2);
  };
  await page.setViewportSize({ width: 900, height: 900 });
  // Resize/scroll delivery is real browser work, independent of the paused
  // clock. Keep advancing RAF while waiting for the event's measurement.
  await expect
    .poll(async () => {
      await page.clock.runFor(32);
      await settle(page);
      return page.evaluate(() => (window as any).__TUTORIAL_COUNTS__.measures);
    })
    .toBeGreaterThan(counts.measures);
  await verifyAlignment();
  // Crossing 640px or 1100px swaps the header and under-Room copies of the controls, and
  // that layout change is measured once more; wait for the count to settle.
  let measured = -1;
  await expect
    .poll(async () => {
      await page.clock.runFor(32);
      await settle(page);
      const now = await page.evaluate(() => (window as any).__TUTORIAL_COUNTS__.measures);
      const stable = now === measured;
      measured = now;
      return stable;
    })
    .toBe(true);
  // Rows under Room stay in flow, so scrolling needs no measurement.
  await page.evaluate(() => window.scrollBy(0, 24));
  await page.clock.runFor(64);
  await settle(page);
  expect(await page.evaluate(() => (window as any).__TUTORIAL_COUNTS__.measures)).toBe(measured);
  await expect(page.locator('curve-graph .example-cue-label')).toHaveText('Adjust room brightness');
  await verifyAlignment();
  expect((await snapshot(page)).services).toEqual([]);
  expect((await snapshot(page)).saved).toEqual([]);
});

// Dashboard cards offer the same Show me how as the sidebar, from ⋮ only.
for (const { width, beside } of [
  { width: 700, beside: false },
  { width: 1440, beside: true },
] as const) {
  test(`a dashboard card plays Show me how with its chips ${beside ? 'in the card header' : 'under Room'} at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, 'first=0&help=1');
    expect(
      await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.card._besideLights)
    ).toBe(beside);
    const before = await snapshot(page);
    await installPausedClock(page);
    await showMeHow(page);
    await page.clock.runFor(T.presetHighlight + 50);
    const chip = page.locator(
      `${beside ? '.header-chips' : '.edit-row'} .shape-chip.invitation-chip`
    );
    await expect(chip).toHaveCount(1);
    await expect(chip).toBeInViewport();
    await expect(page.locator('.invitation-insight')).toBeVisible();
    await page.locator('.canvas-done').click();
    await settle(page);
    const after = await snapshot(page);
    expect(after.example).toBeNull();
    expect(after.dirty).toBe(false);
    expect(after.curves).toEqual(before.curves);
    expect(after.backend).toEqual(before.backend);
    expect(after.saved).toEqual([]);
    expect(after.services).toEqual([]);
  });
}

/** What the fixture's names suggest: Ceiling Light Late, Sofa Lamp Early, Wall Light Dim. */
const SUGGESTED = ['late_starter', 'early_starter', 'dim_accent'].map(
  (id) => CURVE_PRESETS.find((preset) => preset.id === id)!.controlPoints
);
// The record belongs to the group's config entry, not to its entity ID.
const ANSWER_KEY = 'lightener:first-use:v1:suggestion:preview-user:preview-config-entry';
type Shape = Array<{ lightener: number; target: number }>;
const shapes = (curves: Array<{ controlPoints: Shape }>) =>
  curves.map((curve) => curve.controlPoints);
const untouched = (curves: Array<{ controlPoints: Shape }>) =>
  curves.length > 0 &&
  curves.every((curve) => curve.controlPoints.every((p) => p.lightener === p.target));
/** The saved form of a shape: the 0 to 0 point is not stored. */
const stored = (shape: Shape) =>
  Object.fromEntries(
    shape
      .filter((p) => p.lightener !== 0 || p.target !== 0)
      .map((p) => [String(p.lightener), String(p.target)])
  );
/** What Preview on lights sends one light for a shape at a Room position. */
const sent = (shape: Shape, room: number) => {
  const brightness = Math.round((sampleCurveAt(shape, room) / 100) * 255);
  return brightness === 0 ? { service: 'turn_off' } : { service: 'turn_on', brightness };
};
const lastSent = (services: any[]) =>
  [0, 1, 2].map((index) => {
    const call = services.findLast((item) => item[2].entity_id === `light.example_${index}`);
    return call[1] === 'turn_off'
      ? { service: 'turn_off' }
      : { service: call[1], brightness: call[2].brightness };
  });
const prompt = (page: Page) => page.locator('.suggestion-prompt');
const meaning = (page: Page) => page.locator('curve-scrubber .meaning-line');
const tip = (page: Page) => page.locator('.coach-prompt');
const previewSwitch = (page: Page) =>
  page.getByRole('switch', { name: 'Preview on lights', exact: true });
const editMode = (page: Page) =>
  page.evaluate(() => (window as any).__INVITATION_FIXTURE__.card.editMode as boolean);
const answer = (page: Page) => page.evaluate((key) => localStorage.getItem(key), ANSWER_KEY);
const session = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('lightener:curve-card:v1:light.first_use_room') ?? 'null')
  );

/**
 * The sidebar card: the first open of an untouched group shows suggested shapes.
 * `paused` holds the clock, for tests that prove nothing starts later by itself.
 */
async function sidebarFirstOpen(page: Page, query = '', paused = false) {
  if (paused) await installPausedClock(page);
  const params = new URLSearchParams({
    seed: test.info().testId,
    first: '0',
    help: '1',
    auto: '1',
  });
  new URLSearchParams(query).forEach((value, key) => params.set(key, value));
  await page.goto(`${FIXTURE}?${params}`);
  await sidebarReady(page, Number(params.get('members') ?? 3), paused);
}
async function sidebarReady(page: Page, count = 3, paused = false) {
  // A paused clock also holds the fixture's delayed replies.
  if (paused) await page.clock.runFor(50);
  await expect(page.locator('curve-legend .legend-item')).toHaveCount(count);
  await settle(page);
}
/** The moving grip of a bar, where a real drag starts. */
async function gripCentre(page: Page, bar: string) {
  return page.locator(bar).evaluate((element) => {
    const input = element.shadowRoot!.querySelector('input')!.getBoundingClientRect();
    const marker = element.shadowRoot!.querySelector('.marker')!.getBoundingClientRect();
    return {
      x: marker.left + marker.width / 2,
      y: input.top + input.height / 2,
      width: input.width,
    };
  });
}

test('the first paint of a sidebar first open draws the suggested shapes', async ({ page }) => {
  await page.goto(`${FIXTURE}?seed=${test.info().testId}&first=0&help=1&auto=1&state=loading`);
  await expect(page.getByText('Loading brightness shapes…')).toBeVisible();
  // Every set of shapes the graph is handed from here on, in order.
  await page.evaluate(() => {
    const drawn: unknown[] = [];
    const graph = customElements.get('curve-graph')!.prototype;
    const curves = Object.getOwnPropertyDescriptor(graph, 'curves')!;
    Object.defineProperty(graph, 'curves', {
      ...curves,
      set(value: Array<{ controlPoints: unknown }>) {
        if (value?.length) drawn.push(structuredClone(value.map((curve) => curve.controlPoints)));
        curves.set!.call(this, value);
      },
    });
    (window as any).__DRAWN__ = drawn;
  });
  await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.releaseLoad());
  await sidebarReady(page);
  await expect(prompt(page)).toBeVisible();
  const drawn = await page.evaluate(() => (window as any).__DRAWN__ as Shape[][]);
  expect(drawn.length).toBeGreaterThan(0);
  // The straight lines are never painted first.
  for (const frame of drawn) expect(frame).toEqual(SUGGESTED);
  await expect(page.locator('.suggestion-text strong')).toHaveText('Suggested shapes');
  await expect(page.locator('.suggestion-text span')).toHaveText(
    'Not saved. Nothing sent to your lights.'
  );
  // The exit slot's order: the outlined button, then the blue one.
  await expect(page.locator('.suggestion-actions button')).toHaveText([
    'Keep all lights equal',
    'Save these shapes',
  ]);
  await expect(meaning(page)).toHaveText('2 of 3 lights would be on');
  await expect(page.locator('curve-legend .legend-label')).toHaveText('Lights · suggested');
  const first = await snapshot(page);
  expect(shapes(first.curves)).toEqual(SUGGESTED);
  expect([first.room, first.scrubberRoom, first.legendRoom]).toEqual([30, 30, 30]);
  // The bars read whole percents: Off, 61% and 20%.
  expect(first.lightValues).toEqual(SUGGESTED.map((shape) => Math.round(sampleCurveAt(shape, 30))));
  expect(new Set(first.lightValues).size).toBe(3);
  // Only a drawing: the loaded shapes, Room and the lights are as they were.
  expect(untouched(first.actual)).toBe(true);
  expect(first.original).toEqual(first.actual);
  expect(first.storedRoom).toBeNull();
  expect(await session(page)).toBeNull();
  expect(first.dirty).toBe(false);
  expect(first.history).toEqual([]);
  expect(first.selected).toBeNull();
  expect(first.example).toBeNull();
  expect(first.services).toEqual([]);
  expect(first.saved).toEqual([]);
  expect(await editMode(page)).toBe(false);
  expect(await answer(page)).toBeNull();
});

for (const row of [
  { name: 'a group with a saved shape', query: 'shape=dim' },
  { name: 'a read-only user', query: 'state=readonly' },
  { name: 'the dashboard card', query: 'auto=0' },
  { name: 'a group with one light (the tip shows instead)', query: 'members=1', tip: true },
  { name: 'a group this user already answered for', query: '', answered: true },
]) {
  test(`does not show by itself: ${row.name}`, async ({ page }) => {
    await sidebarFirstOpen(page, row.query, true);
    if (row.answered) {
      await expect(prompt(page)).toBeVisible();
      await page.getByRole('button', { name: 'Keep all lights equal', exact: true }).click();
      await expect(prompt(page)).toHaveCount(0);
      await page.reload();
      await sidebarReady(page, 3, true);
    }
    // Long enough for the old automatic example to have started.
    await page.clock.runFor(INVITATION_ORIENTATION_MS + 500);
    await settle(page);
    await expect(prompt(page)).toHaveCount(0);
    if (row.tip) await expect(tip(page)).toContainText('Dim a bright light');
    else await expect(tip(page)).toHaveCount(0);
    await expect(meaning(page)).not.toContainText('would be');
    const after = await snapshot(page);
    expect(after.example).toBeNull();
    expect(after.curves).toEqual(after.actual);
    expect(after.room).toBe(100);
    expect(after.dirty).toBe(false);
    expect(after.services).toEqual([]);
    expect(after.saved).toEqual([]);
    expect(await editMode(page)).toBe(false);
  });
}

test('Save these shapes persists', async ({ page }) => {
  await sidebarFirstOpen(page);
  await expect(prompt(page)).toBeVisible();
  await page.getByRole('button', { name: 'Save these shapes', exact: true }).click();
  await expect(page.locator('.save-confirmed')).toHaveText('Saved');
  // The button left the page: focus stays in the editor, on ⋮.
  await expect(page.getByRole('button', { name: 'More actions', exact: true })).toBeFocused();
  await expect(prompt(page)).toHaveCount(0);
  // The confirmed-save tip stands where the two buttons were, and the list is the lights again.
  await expect(page.locator('.message-line .coach-prompt')).toContainText(
    'Shape savedAdjust group brightness in Home Assistant.'
  );
  await expect(page.locator('curve-legend .legend-label')).toHaveText('Lights');
  expect(await editMode(page)).toBe(false);
  expect(await answer(page)).toBe('completed');
  const saved = await snapshot(page);
  expect(saved.saved).toHaveLength(1);
  expect(Object.values(saved.backend).map((light: any) => light.brightness)).toEqual(
    SUGGESTED.map(stored)
  );
  expect(saved.calls.filter((call: any) => call.type === 'lightener/save_curves')).toHaveLength(1);
  expect(saved.dirty).toBe(false);
  expect(saved.history).toEqual([]);
  expect(saved.services).toEqual([]);
  // The saved shapes are real now: the line no longer says "would be".
  await expect(meaning(page)).toHaveText('2 of 3 lights on');

  await page.reload();
  await sidebarReady(page);
  await expect(prompt(page)).toHaveCount(0);
  await expect(tip(page)).toHaveCount(0);
  await expect(meaning(page)).toHaveText('All 3 lights on');
  const reopened = await snapshot(page);
  expect(shapes(reopened.actual).map(stored)).toEqual(SUGGESTED.map(stored));
  expect(reopened.backend).toEqual(saved.backend);
  expect(reopened.dirty).toBe(false);
  expect(reopened.saved).toEqual([]);
  expect(reopened.services).toEqual([]);
});

test('a rejected save leaves the adopted draft', async ({ page }) => {
  await sidebarFirstOpen(page);
  await expect(prompt(page)).toBeVisible();
  const before = await snapshot(page);
  await page.evaluate(() => (window as any).__INVITATION_FIXTURE__.rejectNextSave());
  await page.getByRole('button', { name: 'Save these shapes', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Save failed');
  await expect(prompt(page)).toHaveCount(0);
  // Nothing was saved, so nothing says so.
  await expect(tip(page)).toHaveCount(0);
  const after = await snapshot(page);
  expect(await editMode(page)).toBe(true);
  expect(after.dirty).toBe(true);
  expect(shapes(after.actual)).toEqual(SUGGESTED);
  // One Undo step back to the shapes from before.
  expect(after.history).toEqual([before.actual]);
  expect(after.original).toEqual(before.original);
  expect(after.backend).toEqual(before.backend);
  expect(after.saved).toEqual([]);
  expect(after.services).toEqual([]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).dirty).toBe(false);
  expect((await snapshot(page)).actual).toEqual(before.actual);
});

test('Keep all lights equal and Escape decline; the tip follows; nothing returns after reload', async ({
  page,
}) => {
  for (const how of ['Keep all lights equal', 'Escape'] as const) {
    // `fresh=1` forgets the first case's answer.
    await sidebarFirstOpen(page, how === 'Escape' ? 'fresh=1' : '');
    await expect(prompt(page), how).toBeVisible();
    const before = await snapshot(page);
    if (how === 'Escape') {
      // Escape belongs to the card that holds focus; focusing a row adopts nothing.
      await page.locator('curve-legend .row-select-btn').nth(1).focus();
      await expect(prompt(page), how).toBeVisible();
      await page.keyboard.press('Escape');
    } else {
      // By keyboard: the button that held focus leaves with the prompt.
      await page.getByRole('button', { name: how, exact: true }).focus();
      await page.keyboard.press('Enter');
    }
    await expect(prompt(page), how).toHaveCount(0);
    await expect(tip(page), how).toContainText('Dim a bright light');
    await expect(page.locator('curve-legend .legend-label'), how).toHaveText('Lights');
    await expect(meaning(page), how).toHaveText('All 3 lights on');
    expect(await answer(page), how).toBe('dismissed');
    expect(await editMode(page), how).toBe(false);
    let after = await snapshot(page);
    expect(after.curves, how).toEqual(before.actual);
    for (const key of [
      'actual',
      'original',
      'history',
      'selected',
      'storedRoom',
      'dirty',
      'services',
      'saved',
      'backend',
    ] as const)
      expect(after[key], `${how}: ${key}`).toEqual(before[key]);
    if (how !== 'Escape') {
      // Focus stayed in the editor, on ⋮, so the next key is still this card's.
      await expect(page.getByRole('button', { name: 'More actions', exact: true })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(tip(page)).toHaveCount(0);
    }

    await page.reload();
    await sidebarReady(page);
    await expect(prompt(page), how).toHaveCount(0);
    await expect(tip(page), how).toHaveCount(0);
    after = await snapshot(page);
    expect(after.curves, how).toEqual(before.actual);
    expect(after.services, how).toEqual([]);
    expect(after.saved, how).toEqual([]);
  }
});

test('a real drag from the drawn Room grip moves from 30 and keeps the suggestion', async ({
  page,
}) => {
  await sidebarFirstOpen(page);
  await expect(prompt(page)).toBeVisible();
  const before = await snapshot(page);
  const grip = await gripCentre(page, 'curve-scrubber brightness-bar');
  const dx = Math.round(grip.width * 0.2);
  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  await page.mouse.move(grip.x + dx, grip.y, { steps: 6 });
  await page.mouse.up();
  await settle(page);
  // The drag starts where Room is drawn, not at the stored 100.
  const expected = Math.round(30 + (100 * dx) / grip.width);
  const after = await snapshot(page);
  expect(after.storedRoom).toBe(expected);
  expect([after.room, after.scrubberRoom, after.legendRoom]).toEqual([
    expected,
    expected,
    expected,
  ]);
  // The user's own position is stored as usual.
  expect((await session(page)).scrubberPosition).toBe(expected);
  // Moving Room adopts nothing.
  await expect(prompt(page)).toBeVisible();
  await expect(meaning(page)).toHaveText('All 3 lights would be on');
  expect(shapes(after.curves)).toEqual(SUGGESTED);
  expect(await editMode(page)).toBe(false);
  expect(await answer(page)).toBeNull();
  for (const key of [
    'actual',
    'original',
    'history',
    'selected',
    'dirty',
    'services',
    'saved',
  ] as const)
    expect(after[key], key).toEqual(before[key]);
});

test('a real bar drag on the light drawn Off adopts and keeps moving past its first step', async ({
  page,
}) => {
  await sidebarFirstOpen(page);
  await expect(prompt(page)).toBeVisible();
  const before = await snapshot(page);
  // Ceiling Light is suggested Late: Off at the drawn Room position.
  expect(before.lightValues[0]).toBe(0);
  const level = async () =>
    sampleCurveAt((await snapshot(page)).actual[0].controlPoints as Shape, 30);
  const bar = 'curve-legend .legend-item:first-child brightness-bar';
  const grip = await gripCentre(page, bar);
  const [first, second] = [0.2, 0.5].map((part) => Math.round(grip.width * part));
  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  await page.mouse.move(grip.x + first, grip.y, { steps: 4 });
  await settle(page);
  expect(await level()).toBe(Math.round((100 * first) / grip.width));
  // Adopting must not end the gesture that caused it.
  await page.mouse.move(grip.x + second, grip.y, { steps: 4 });
  await settle(page);
  expect(await level()).toBe(Math.round((100 * second) / grip.width));
  await page.mouse.up();
  await settle(page);
  expect(await level()).toBe(Math.round((100 * second) / grip.width));

  const after = await snapshot(page);
  expect(await editMode(page)).toBe(true);
  await expect(prompt(page)).toHaveCount(0);
  expect(after.dirty).toBe(true);
  // Adoption is one Undo step; the drag adds its own.
  expect(after.history.map(shapes)).toEqual([shapes(before.actual), SUGGESTED]);
  expect(shapes(after.actual).slice(1)).toEqual(SUGGESTED.slice(1));
  // The drawn Room position is what was edited. It stays in memory only.
  expect(after.storedRoom).toBe(30);
  expect(await session(page)).toEqual({
    selectedCurveId: 'light.example_0',
    scrubberPosition: null,
  });
  expect(await answer(page)).toBeNull();
  expect(after.services).toEqual([]);
  expect(after.saved).toEqual([]);
});

for (const moved of [false, true]) {
  test(`Preview on lights from a suggestion sends the adopted shapes at Room ${moved ? 'where the user moved it' : '30'}`, async ({
    page,
  }) => {
    await sidebarFirstOpen(page);
    await expect(prompt(page)).toBeVisible();
    const before = await snapshot(page);
    if (moved) {
      const slider = (await page
        .getByRole('slider', { name: 'Room brightness', exact: true })
        .boundingBox())!;
      const grip = await gripCentre(page, 'curve-scrubber brightness-bar');
      await page.mouse.move(grip.x, grip.y);
      await page.mouse.down();
      await page.mouse.move(grip.x + slider.width * 0.3, grip.y, { steps: 6 });
      await page.mouse.up();
      await settle(page);
      await expect(prompt(page)).toBeVisible();
    }
    const room = (await snapshot(page)).room as number;
    if (moved) expect(room).toBeGreaterThan(50);
    else expect(room).toBe(30);

    await previewSwitch(page).click();
    await expect(previewSwitch(page)).toBeChecked();
    await expect.poll(async () => (await snapshot(page)).services.length).toBe(3);
    const on = await snapshot(page);
    // The suggestion became the draft first: one Undo step, nothing saved.
    await expect(prompt(page)).toHaveCount(0);
    expect(on.dirty).toBe(true);
    expect(on.history).toEqual([before.actual]);
    expect(shapes(on.actual)).toEqual(SUGGESTED);
    expect(on.storedRoom).toBe(room);
    expect(on.saved).toEqual([]);
    // The lights get what the screen shows, not the straight lines at 100%.
    const values = lastSent(on.services);
    expect(values).toEqual(SUGGESTED.map((shape) => sent(shape, room)));
    expect(new Set(values.map((value) => JSON.stringify(value))).size).toBeGreaterThan(1);
    expect((await session(page))?.scrubberPosition ?? null).toBe(moved ? room : null);

    await previewSwitch(page).click();
    await expect(previewSwitch(page)).not.toBeChecked();
    // Every light Watch changed gets one command back to its value from before.
    await expect.poll(async () => (await snapshot(page)).services.length).toBe(6);
    expect(lastSent((await snapshot(page)).services)).toEqual(
      [0, 1, 2].map(() => ({ service: 'turn_on', brightness: 180 }))
    );
    expect((await snapshot(page)).saved).toEqual([]);
  });
}

test('Suggest shapes refuses a draft', async ({ page }) => {
  await open(page, 'first=0&help=1&room=70');
  await page.locator('curve-legend brightness-bar input').first().press('ArrowLeft');
  await expect.poll(async () => (await snapshot(page)).dirty).toBe(true);
  const before = await snapshot(page);
  await page.getByRole('button', { name: 'More actions', exact: true }).click();
  await page.locator('.more-item.suggest-shapes').click();
  await expect(page.locator('.canvas-notice')).toHaveText(UI.suggestion.draft);
  await expect(prompt(page)).toHaveCount(0);
  const after = await snapshot(page);
  for (const key of [
    'actual',
    'curves',
    'original',
    'history',
    'selected',
    'storedRoom',
    'dirty',
    'services',
    'saved',
    'backend',
  ] as const)
    expect(after[key], key).toEqual(before[key]);
  expect(after.calls.filter((call: any) => call.type === 'lightener/save_curves')).toEqual([]);
  expect(await editMode(page)).toBe(true);
});

test('a dashboard card shows it only from ⋮, with Keep current shapes after a saved shape', async ({
  page,
}) => {
  const suggest = async () => {
    // A finished Cancel or load animation first: a busy editor only explains itself.
    await expect
      .poll(() => page.evaluate(() => (window as any).__INVITATION_FIXTURE__.card._editorQuiet))
      .toBe(true);
    await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await page.locator('.more-item.suggest-shapes').click();
    await expect(prompt(page)).toBeVisible();
  };
  // An untouched group: nothing by itself, the same suggestion on demand.
  await open(page, 'first=0&help=1');
  await expect(prompt(page)).toHaveCount(0);
  await expect(tip(page)).toHaveCount(0);
  expect(untouched((await snapshot(page)).curves)).toBe(true);
  await suggest();
  await expect(page.locator('.suggestion-actions button')).toHaveText([
    'Keep all lights equal',
    'Save these shapes',
  ]);
  expect(shapes((await snapshot(page)).curves)).toEqual(SUGGESTED);
  expect(await editMode(page)).toBe(false);
  expect((await snapshot(page)).dirty).toBe(false);

  // A group with a saved shape of its own: the blue button only opens a draft.
  await open(page, 'first=0&help=1&shape=dim&fresh=1');
  await expect(prompt(page)).toHaveCount(0);
  const before = await snapshot(page);
  expect(untouched(before.actual)).toBe(false);
  await suggest();
  await expect(page.locator('.suggestion-actions button')).toHaveText([
    'Keep current shapes',
    'Edit these shapes',
  ]);
  await page.getByRole('button', { name: 'Edit these shapes', exact: true }).click();
  await expect(prompt(page)).toHaveCount(0);
  await expect.poll(() => editMode(page)).toBe(true);
  const draft = await snapshot(page);
  expect(draft.dirty).toBe(true);
  expect(shapes(draft.actual)).toEqual(SUGGESTED);
  expect(draft.history).toEqual([before.actual]);
  expect(draft.calls.filter((call: any) => call.type === 'lightener/save_curves')).toEqual([]);
  expect(await answer(page)).toBeNull();
  // Cancel returns the saved shapes.
  await page.getByRole('button', { name: 'Cancel changes', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).dirty).toBe(false);
  const cancelled = await snapshot(page);
  expect(cancelled.actual).toEqual(before.actual);
  expect(cancelled.backend).toEqual(before.backend);
  expect(cancelled.saved).toEqual([]);
  expect(cancelled.services).toEqual([]);

  await suggest();
  await page.getByRole('button', { name: 'Keep current shapes', exact: true }).click();
  await expect(prompt(page)).toHaveCount(0);
  // Saved shapes of its own: no tip follows.
  await expect(tip(page)).toHaveCount(0);
  expect((await snapshot(page)).actual).toEqual(before.actual);
  expect(await editMode(page)).toBe(false);
});
