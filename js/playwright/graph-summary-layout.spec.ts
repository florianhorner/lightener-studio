import { expect, test, type Page } from '@playwright/test';
import type { CoachController } from '../src/utils/coach-controller';
import type { LightCurve } from '../src/utils/types';

const FIXTURE = '/js/playwright/fixtures/selected-light-shapes-card.html?members=3';
interface Layout {
  width: number;
  sidebar: number;
  maxGraphHeight?: number;
}
const LAYOUTS: Layout[] = [
  { width: 320, sidebar: 0 },
  { width: 390, sidebar: 0 },
  { width: 900, sidebar: 0 },
  { width: 1200, sidebar: 256 },
  { width: 1600, sidebar: 256 },
  { width: 1900, sidebar: 256, maxGraphHeight: 400 },
];
const SUMMARIES = {
  distinct: ['3 lights, 3 separate shapes', 'Pick a light to focus its shape.'],
  equal: ['3 lights match the group brightness', 'Pick a light to give it its own shape.'],
  shared: ['3 lights share one brightness shape', 'Pick a light to give it its own shape.'],
  hidden: ['All lights are hidden', 'Show a light in the list to bring its shape back.'],
} as const;
type SummaryKind = keyof typeof SUMMARIES;

async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const card = window.__LIGHTENER_CARD_ELEMENT__!;
    await card.updateComplete;
    const graph = card.renderRoot.querySelector('curve-graph') as HTMLElement & {
      updateComplete: Promise<unknown>;
    };
    await graph.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function openSummary(page: Page, layout: Layout, kind: SummaryKind): Promise<void> {
  await page.setViewportSize({ width: layout.width, height: 1000 });
  await page.goto(FIXTURE);
  await page.waitForFunction(() => window.__LIGHTENER_CARD_ELEMENT__ !== undefined);
  await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
  await page.evaluate(
    async ({ sidebar, maxGraphHeight, kind }) => {
      const root = document.getElementById('root')!;
      // The fixture's 560px cap otherwise hides the native editor's two-column
      // layout. Reserve HA's sidebar width without changing card internals.
      root.style.maxWidth = 'none';
      root.style.width = `calc(100% - ${sidebar}px)`;
      root.style.marginLeft = `${sidebar}px`;
      root.style.marginRight = '0';
      if (maxGraphHeight) {
        root.style.setProperty('--curve-graph-max-height', `${maxGraphHeight}px`);
      }
      const card = window.__LIGHTENER_CARD_ELEMENT__! as HTMLElement & {
        _curves: LightCurve[];
        updateComplete: Promise<unknown>;
      };
      card._curves = card._curves.map((curve, index) => ({
        ...curve,
        visible: kind !== 'hidden',
        controlPoints:
          kind === 'equal' || kind === 'hidden'
            ? [
                { lightener: 0, target: 0 },
                { lightener: 1, target: 1 },
                { lightener: 100, target: 100 },
              ]
            : [
                { lightener: 0, target: 0 },
                { lightener: 1, target: 1 },
                { lightener: 50, target: kind === 'shared' ? 20 : 15 + index * 20 },
                { lightener: 100, target: kind === 'shared' ? 45 : 40 + index * 25 },
              ],
      }));
      await card.updateComplete;
    },
    { sidebar: layout.sidebar, maxGraphHeight: layout.maxGraphHeight, kind }
  );
  await settle(page);
}

async function expectSummaryFits(page: Page, kind: SummaryKind): Promise<void> {
  const primary = page.locator('.graph-workbench .graph-insight-primary');
  const secondary = page.locator('.graph-workbench .graph-insight-secondary');
  await expect(primary).toHaveText(SUMMARIES[kind][0]);
  await expect(secondary).toHaveText(SUMMARIES[kind][1]);
  for (const text of [primary, secondary]) {
    const geometry = await text.evaluate((element) => {
      const panel = element.closest('.graph-panel')!.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      return {
        text: element.textContent,
        width: element.clientWidth,
        scrollWidth: element.scrollWidth,
        height: element.clientHeight,
        scrollHeight: element.scrollHeight,
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom },
      };
    });
    expect(geometry.width, `${geometry.text}: visible width`).toBeGreaterThan(0);
    expect(geometry.scrollWidth, `${geometry.text}: horizontal clipping`).toBeLessThanOrEqual(
      geometry.width + 1
    );
    expect(geometry.scrollHeight, `${geometry.text}: vertical clipping`).toBeLessThanOrEqual(
      geometry.height + 1
    );
    expect(geometry.left).toBeGreaterThanOrEqual(geometry.panel.left);
    expect(geometry.right).toBeLessThanOrEqual(geometry.panel.right);
    expect(geometry.top).toBeGreaterThanOrEqual(geometry.panel.top);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.panel.bottom);
  }
}

async function graphGeometry(page: Page) {
  return page.locator('curve-graph').evaluate((graph) => {
    const box = graph.getBoundingClientRect();
    const panel = graph.closest('.graph-panel')!.getBoundingClientRect();
    // Browser clicks may scroll the light list into view. Compare positions
    // inside the panel so viewport scrolling cannot conceal a layout shift.
    return {
      left: box.left - panel.left,
      top: box.top - panel.top,
      width: box.width,
      height: box.height,
    };
  });
}

for (const layout of LAYOUTS) {
  const label = `${layout.width}px${layout.sidebar ? ' with HA sidebar' : ''}`;
  for (const kind of Object.keys(SUMMARIES) as SummaryKind[]) {
    test(`${kind} graph summary is fully readable at ${label}`, async ({ page }) => {
      await openSummary(page, layout, kind);
      await expectSummaryFits(page, kind);
    });
  }

  test(`selection and shape trials preserve graph geometry at ${label}`, async ({ page }) => {
    await openSummary(page, layout, 'distinct');
    const before = await graphGeometry(page);
    const expectGraphUnmoved = async (reference = before) => {
      await settle(page);
      const after = await graphGeometry(page);
      for (const key of ['left', 'top', 'width', 'height'] as const) {
        expect(Math.abs(after[key] - reference[key]), `graph ${key}`).toBeLessThanOrEqual(1);
      }
    };
    const row = page.locator('curve-legend .row-select-btn').filter({ hasText: 'Alpha' });
    await row.click();
    await expect(page.locator('.shape-chip-bar')).toBeVisible();
    await settle(page);
    await expectGraphUnmoved();

    // Keyboard focus previews shapes on desktop and touch browsers alike.
    await page.locator('.preset-option[data-preset="night_mode"]').focus();
    await expect(page.locator('.graph-insight-primary')).toHaveText('Trying Night mode');
    await expectGraphUnmoved();
    await row.click();
    await expect(page.locator('.shape-chip-reserve')).toHaveCount(1);
    await expectGraphUnmoved();
    await expectSummaryFits(page, 'distinct');
    const sideEffects = await page.evaluate(() => ({
      saves: window.__LIGHTENER_SAVED__,
      services: window.__LIGHTENER_SERVICE_CALLS__,
      saveCommands: window.__LIGHTENER_WS_CALLS__?.filter(
        (call) => call.type === 'lightener/save_curves'
      ),
    }));
    expect(sideEffects).toEqual({ saves: [], services: [], saveCommands: [] });
  });

  test(`opening, advancing and dismissing tips preserve graph geometry at ${label}`, async ({
    page,
  }) => {
    await openSummary(page, layout, 'distinct');
    const before = await graphGeometry(page);
    const expectGraphUnmoved = async () => {
      await settle(page);
      const after = await graphGeometry(page);
      for (const key of ['left', 'top', 'width', 'height'] as const) {
        expect(Math.abs(after[key] - before[key]), `graph ${key}`).toBeLessThanOrEqual(1);
      }
    };
    const expectTipFits = async () => {
      for (const selector of ['.coach-copy strong', '.coach-copy span', '.coach-dismiss']) {
        const box = await page.locator(selector).evaluate((element) => {
          const panel = element.closest('.graph-panel')!.getBoundingClientRect();
          const rect = element.getBoundingClientRect();
          return {
            width: element.clientWidth,
            scrollWidth: element.scrollWidth,
            height: element.clientHeight,
            scrollHeight: element.scrollHeight,
            left: rect.left - panel.left,
            right: rect.right - panel.left,
            panelWidth: panel.width,
          };
        });
        expect(box.scrollWidth, `${selector}: horizontal clipping`).toBeLessThanOrEqual(
          box.width + 1
        );
        expect(box.scrollHeight, `${selector}: vertical clipping`).toBeLessThanOrEqual(
          box.height + 1
        );
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(box.panelWidth);
      }
    };

    for (const selected of [false, true]) {
      if (selected) {
        await page.locator('curve-legend .row-select-btn').filter({ hasText: 'Alpha' }).click();
      }
      await expectGraphUnmoved();
      await page.getByRole('button', { name: 'Brightness tips', exact: true }).click();
      await expect(page.locator('.coach-copy strong')).toHaveText('Dim a bright light');
      await expectGraphUnmoved();
      await expectTipFits();

      // Exercise each copy phase independently of curve edits: this regression
      // owns geometry; onboarding tests cover the actual edit/save journey.
      for (const phase of ['afterEdit', 'afterSave'] as const) {
        await page.evaluate((phase) => {
          const card = window.__LIGHTENER_CARD_ELEMENT__! as HTMLElement & {
            _coach: CoachController;
          };
          card._coach[phase]();
        }, phase);
        await expect(page.locator('.coach-copy strong')).toHaveText(
          phase === 'afterEdit' ? 'Ready to save' : 'Shape saved'
        );
        await expectGraphUnmoved();
        await expectTipFits();
      }
      await page.locator('.coach-dismiss').click();
      await expect(page.locator('.coach-prompt')).toHaveCount(0);
      await expectGraphUnmoved();
    }
  });
}
