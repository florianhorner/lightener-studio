import { expect, test, type Page, type Locator } from '@playwright/test';
import type { LightCurve } from '../src/utils/types';

type Card = HTMLElement & {
  _curves: LightCurve[];
  _originalCurves: LightCurve[];
  _undoStack: LightCurve[][];
  _effectiveScrubberPosition: number;
  _selectedCurveId: string | null;
  dirty: boolean;
};
type Fixture = {
  scrollport: HTMLElement;
  cards: Card[];
  toolbarClicks: number;
  cardClicks: number[];
  services: Array<{ index: number; args: unknown[] }>;
  saves: Array<{ index: number; curves: unknown }>;
};
declare global {
  interface Window {
    __CONTAINMENT__: Fixture;
  }
}
const FIXTURE = '/js/playwright/fixtures/toolbar-containment.html';
// Synthetic HA framing: opaque 64px fixed/sticky chrome at z-index 4,
// dashboard cards in normal flow. This is not native HA acceptance.
const cases = [
  { name: 'phone window', width: 390, height: 844, cardWidth: 390, scroll: 'window' },
  { name: 'desktop window', width: 1200, height: 700, cardWidth: 1200, scroll: 'window' },
  { name: 'desktop inner', width: 1200, height: 700, cardWidth: 1200, scroll: 'inner' },
  { name: 'narrow card in desktop', width: 1200, height: 700, cardWidth: 400, scroll: 'inner' },
  { name: '859px card', width: 1200, height: 700, cardWidth: 859, scroll: 'window' },
  { name: '860px card', width: 1200, height: 700, cardWidth: 860, scroll: 'window' },
  { name: 'short phone inner', width: 320, height: 568, cardWidth: 320, scroll: 'inner' },
  {
    name: 'transformed desktop',
    width: 1200,
    height: 700,
    cardWidth: 1200,
    scroll: 'window',
    transformed: true,
  },
  {
    name: 'scaled desktop',
    width: 1200,
    height: 700,
    cardWidth: 1200,
    scroll: 'window',
    transformed: true,
    scale: true,
  },
  {
    name: 'negative translated phone',
    width: 390,
    height: 844,
    cardWidth: 390,
    scroll: 'window',
    negative: true,
  },
  {
    name: 'shadow scrollport',
    width: 1200,
    height: 700,
    cardWidth: 1200,
    scroll: 'inner',
    shadow: true,
  },
];
async function ready(page: Page, scenario: (typeof cases)[number]) {
  await page.setViewportSize({ width: scenario.width, height: scenario.height });
  await page.goto(
    `${FIXTURE}?width=${scenario.cardWidth}&scroll=${scenario.scroll}${scenario.transformed ? '&transformed=1' : ''}${'scale' in scenario && scenario.scale ? '&scale=1' : ''}${'negative' in scenario && scenario.negative ? '&negative=1' : ''}${'shadow' in scenario && scenario.shadow ? '&shadow=1' : ''}`
  );
  await expect(page.locator('curve-legend .legend-item')).toHaveCount(40);
}
async function settle(page: Page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
}
async function positionAt(page: Page, target: Locator, top: number) {
  await target.evaluate((element, desiredTop) => {
    const container = document.body.classList.contains('inner')
      ? window.__CONTAINMENT__.scrollport
      : document.scrollingElement!;
    container.scrollTop += element.getBoundingClientRect().top - desiredTop;
  }, top);
  await settle(page);
}
async function state(page: Page) {
  return page.evaluate(() => {
    const f = window.__CONTAINMENT__;
    return structuredClone({
      cards: f.cards.map((card) => ({
        curves: card._curves,
        original: card._originalCurves,
        history: card._undoStack,
        room: card._effectiveScrubberPosition,
        selected: card._selectedCurveId,
        dirty: card.dirty,
      })),
      services: f.services,
      saves: f.saves,
    });
  });
}
async function deepHit(target: Locator) {
  return target.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const point = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    let hit = document.elementFromPoint(point.x, point.y);
    while (hit?.shadowRoot) {
      const next = hit.shadowRoot.elementFromPoint(point.x, point.y);
      if (!next || next === hit) break;
      hit = next;
    }
    return hit === element || (hit !== null && element.contains(hit));
  });
}
async function toolbarWorks(page: Page, covered: Locator, label: string) {
  const before = await state(page);
  const counters = await page.evaluate(() => ({
    clicks: window.__CONTAINMENT__.toolbarClicks,
    cards: [...window.__CONTAINMENT__.cardClicks],
  }));
  const bounds = (await covered.boundingBox())!;
  const point = {
    x: Math.max(
      4,
      Math.min(page.viewportSize()!.width - 4, Math.round(bounds.x + bounds.width / 2))
    ),
    y: 48,
  };
  await page.screenshot({ path: test.info().outputPath(`${label}.png`) });
  const hit = await page.evaluate(
    (point) => Boolean(document.elementFromPoint(point.x, point.y)?.closest('#toolbar')),
    point
  );
  // A painted sample catches pointer-transparent content that a hit-test alone misses.
  const shot = await page.screenshot({ clip: { ...point, width: 1, height: 1 } });
  const pixel = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return [...context.getImageData(0, 0, 1, 1).data];
  }, shot.toString('base64'));
  await page.mouse.click(point.x, point.y);
  expect(
    await page.evaluate(() => window.__CONTAINMENT__.toolbarClicks),
    `${label}: native pointer delivery`
  ).toBe(counters.clicks + 1);
  await test.info().attach(`${label}.json`, {
    body: JSON.stringify(
      { bounds, point, hit, pixel, toolbarClicksBefore: counters.clicks },
      null,
      2
    ),
    contentType: 'application/json',
  });
  expect(hit, `${label}: top hit is HA chrome`).toBe(true);
  expect(pixel, `${label}: toolbar paints above card layers`).toEqual([23, 41, 59, 255]);
  await page.getByRole('button', { name: 'Home Assistant toolbar', exact: true }).press('Enter');
  expect(
    await page.evaluate(() => ({
      clicks: window.__CONTAINMENT__.toolbarClicks,
      cards: [...window.__CONTAINMENT__.cardClicks],
    }))
  ).toEqual({ clicks: counters.clicks + 2, cards: counters.cards });
  expect(await state(page)).toEqual(before);
}
async function dirty(page: Page, card: Locator) {
  const light = card.locator('curve-legend brightness-bar input').first();
  await light.focus();
  await light.press('ArrowLeft');
  await expect(card.locator('.exit-slot')).toHaveAttribute('data-state', 'changed');
  await expect(card.locator('.edit-row')).toHaveCount(1);
  await settle(page);
}
for (const scenario of cases.filter((item) => !('shadow' in item))) {
  test(`HA toolbar contains two stacked cards: ${scenario.name}`, async ({ page }) => {
    await ready(page, scenario);
    for (const index of [0, 1]) {
      const card = page.locator(`#card-${index}`);
      const room = card.locator('curve-scrubber');
      await positionAt(page, room, 20);
      await toolbarWorks(page, room, `card-${index}-clean-room`);
      const more = card.getByRole('button', { name: 'More actions', exact: true });
      await positionAt(page, more, 80);
      await more.click();
      const menu = card.locator('.more-menu');
      await positionAt(page, menu, 20);
      await toolbarWorks(page, menu, `card-${index}-more-menu`);
      // Toolbar clicks dismiss an open menu via the existing outside-click path.
      if (await menu.count()) await more.click();
      await dirty(page, card);
      await positionAt(page, room, 20);
      await toolbarWorks(page, room, `card-${index}-dirty-room`);
      const actions = card.locator('.edit-row');
      await positionAt(page, actions, 20);
      await toolbarWorks(page, actions, `card-${index}-actions`);
      // Walk back through the same crossing; both scroll directions are covered.
      await positionAt(page, room, 70);
      await toolbarWorks(page, room, `card-${index}-reverse`);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  });
}

for (const scenario of cases.filter((item) =>
  [
    'phone window',
    'desktop inner',
    'transformed desktop',
    'scaled desktop',
    'negative translated phone',
    'shadow scrollport',
  ].includes(item.name)
)) {
  test(`active card actions keep their owner across two cards: ${scenario.name}`, async ({
    page,
  }) => {
    await ready(page, scenario);
    const first = page.locator('#card-0');
    const second = page.locator('#card-1');
    const firstRoom = first.getByRole('slider', { name: 'Room brightness', exact: true });
    const secondRoom = second.getByRole('slider', { name: 'Room brightness', exact: true });
    await firstRoom.press('Home');
    expect((await state(page)).cards.map((card) => card.room)).toEqual([0, 100]);
    await firstRoom.press('End');
    await firstRoom.press('ArrowLeft');
    await secondRoom.press('Home');
    expect((await state(page)).cards.map((card) => card.room)).toEqual([99, 0]);
    await secondRoom.press('End');
    await dirty(page, first);
    await dirty(page, second);
    // There is no action row to pin: Undo stays in flow under each card's Room row.
    await expect(page.locator('lightener-curve-card').locator('[data-overlay]')).toHaveCount(0);
    await positionAt(page, second, scenario.height / 2);
    await page.screenshot({ path: test.info().outputPath('both-active.png') });
    const before = await state(page);
    for (const card of [first, second]) {
      const undo = card.getByRole('button', { name: 'Undo', exact: true });
      await positionAt(page, undo, scenario.height / 2);
      expect(await deepHit(undo), 'each exposed action belongs to its visible card').toBe(true);
    }
    await positionAt(page, first.getByRole('button', { name: 'Undo', exact: true }), 120);
    await first.getByRole('button', { name: 'Undo', exact: true }).click();
    // Back at the saved shapes: the exit slot offers Done instead of Save.
    await expect(
      first.getByRole('button', { name: 'Save changes (Ctrl+S)', exact: true })
    ).toHaveCount(0);
    await expect(first.locator('.exit-slot')).toHaveAttribute('data-state', 'clean');
    expect((await state(page)).cards[1]).toEqual(before.cards[1]);
    await positionAt(page, second.locator('.exit-slot'), 120);
    await second.getByRole('button', { name: 'Save changes (Ctrl+S)', exact: true }).click();
    await expect(
      second.getByRole('button', { name: 'Save changes (Ctrl+S)', exact: true })
    ).toHaveCount(0);
    expect((await state(page)).saves.map((save) => save.index)).toEqual([1]);
    expect((await state(page)).services).toEqual([]);
    await dirty(page, second);
    await second.evaluate((card) => card.remove());
    await expect(page.locator('curve-scrubber')).toHaveCount(1);
    await expect(first.locator('.edit-row')).toHaveCount(1);
  });

  if (scenario.transformed || 'negative' in scenario) continue; // Existing transformed-modal geometry is tracked separately.

  test(`membership modal stays above both cards and returns owned focus: ${scenario.name}`, async ({
    page,
  }) => {
    await ready(page, scenario);
    const first = page.locator('#card-0');
    const more = first.getByRole('button', { name: 'More actions', exact: true });
    await positionAt(page, more, 90);
    const before = await state(page);
    await more.click();
    await first.locator('.more-item.add-light-btn').click();
    const dialog = first.locator('light-membership-dialog');
    const close = dialog.getByRole('button', { name: 'Close', exact: true });
    await expect(dialog.locator('#membership-search')).toBeFocused();
    await close.focus();
    expect(await deepHit(close)).toBe(true);
    await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(more).toBeFocused();
    expect(await state(page)).toEqual(before);
  });
}
