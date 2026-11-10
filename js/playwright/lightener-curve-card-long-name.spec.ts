import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { VB_W, VB_H } from '../src/utils/graph-math';

type LayoutReport = {
  mode: FixtureMode;
  documentWidth: number;
  viewportWidth: number;
  cardWidth: number;
  embedded: boolean;
  legendItems: number;
  curveLines: number;
  longNameTitles: {
    minTitleLength: number;
    uniqueTitles: number;
  };
  graphContracts: {
    initialGraphInsightText: string | null;
    hitCircleRadius: string | null;
    persistentHintCount: number;
    persistentEditingLabelCount: number;
    pointAriaLabel: string | null;
    selectedLegendItems: number;
    graphSvgMaxHeight: string | null;
    graphRenderedHeight: number;
  };
  sidebarContracts: {
    columnCount: number | null;
    dockPrecedesLights: boolean;
  };
  layoutContracts: {
    workspaceWidth: number;
    mainStackWidth: number;
    sideRailWidth: number;
    graphPanelWidth: number;
    scrubberWidth: number;
    editRowWidth: number | null;
    dockWidth: number;
    plotAlignmentError: number | null;
    firstNameBlockWidth: number | null;
  };
  failures: string[];
};

type FixtureMode = 'standalone' | 'lovelace' | 'sidebar';

const WIDTHS = [320, 390, 500, 501, 700, 860, 900, 1100] as const;
const MODES: FixtureMode[] = ['standalone', 'lovelace', 'sidebar'];
const HEIGHT = 900;
const TOLERANCE_PX = 1;
const MOBILE_THRESHOLD = 500;
const SHORT_SIDEBAR_VIEWPORTS = [
  { width: 900, height: 500 },
  { width: 1100, height: 500 },
  { width: 1100, height: 650 },
  { width: 1100, height: 701 },
  { width: 1100, height: 720 },
  { width: 1100, height: 760 },
] as const;

// A width change passes through ResizeObserver, the card's render, and a
// geometry frame. Wait for that contract instead of assuming two frames suffice.
async function expectSettledLayout(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const root = window.__LIGHTENER_CARD_ELEMENT__?.renderRoot;
          const workspace = root?.querySelector('.workspace');
          const main = root?.querySelector('.main-stack');
          const dock = root?.querySelector('.control-dock');
          const room = root?.querySelector('curve-scrubber');
          const range = room?.shadowRoot
            ?.querySelector('brightness-bar')
            ?.shadowRoot?.querySelector('input');
          const plot = root
            ?.querySelector('curve-graph')
            ?.shadowRoot?.querySelector<SVGRectElement>('.plot-frame');
          const matrix = plot?.getScreenCTM();
          if (!workspace || !main || !dock || !range || !plot || !matrix) {
            return { mode: false, width: false, alignment: false };
          }
          const narrow = workspace.getBoundingClientRect().width < 860;
          const dockBox = dock.getBoundingClientRect();
          // The graph and the room/action dock share one width cap at every size.
          const expectedWidth = main.getBoundingClientRect().width;
          const bounds = plot.getBBox();
          const left = new DOMPoint(bounds.x, bounds.y).matrixTransform(matrix).x;
          const right = new DOMPoint(bounds.x + bounds.width, bounds.y).matrixTransform(matrix).x;
          const rangeBox = range.getBoundingClientRect();
          return {
            mode: dock.hasAttribute('data-narrow') === narrow,
            width: Math.abs(dockBox.width - expectedWidth) <= 1,
            alignment:
              narrow ||
              Math.max(Math.abs(left - rangeBox.left), Math.abs(right - rangeBox.right)) <= 1,
          };
        }),
      { message: 'room dock settles to the card width, layout mode, and graph plot' }
    )
    .toEqual({ mode: true, width: true, alignment: true });
}

test.describe('20-light long-name curve card layout', () => {
  for (const mode of MODES) {
    for (const width of WIDTHS) {
      test(`${mode} mode does not horizontally overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: HEIGHT });
        await page.goto(`/js/playwright/fixtures/long-name-card.html?mode=${mode}`);
        await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
        await expectSettledLayout(page);

        const report = await page.evaluate<
          LayoutReport,
          { mode: FixtureMode; tolerance: number; width: number }
        >(
          async ({ mode, tolerance, width }) => {
            const failures: string[] = [];
            const viewportWidth = document.documentElement.clientWidth;
            const card = window.__LIGHTENER_CARD_ELEMENT__;
            const panel = window.__LIGHTENER_PANEL_ELEMENT__;
            const typedCard = card as
              | (HTMLElement & {
                  renderRoot: ShadowRoot;
                  updateComplete: Promise<unknown>;
                })
              | null;

            function rect(label: string, element: Element, container?: DOMRect): DOMRect {
              const box = element.getBoundingClientRect();
              if (box.left < -tolerance || box.right > viewportWidth + tolerance) {
                failures.push(
                  `${label} escapes viewport: left=${box.left.toFixed(2)} right=${box.right.toFixed(
                    2
                  )} viewport=${viewportWidth}`
                );
              }
              if (container) {
                if (
                  box.left < container.left - tolerance ||
                  box.right > container.right + tolerance
                ) {
                  failures.push(
                    `${label} escapes container: left=${box.left.toFixed(
                      2
                    )} right=${box.right.toFixed(2)} containerLeft=${container.left.toFixed(
                      2
                    )} containerRight=${container.right.toFixed(2)}`
                  );
                }
              }
              return box;
            }

            function expectEllipsisStyles(label: string, element: Element): void {
              const style = window.getComputedStyle(element);
              if (style.whiteSpace !== 'nowrap') {
                failures.push(`${label} must use nowrap, got ${style.whiteSpace}`);
              }
              if (style.overflowX !== 'hidden' && style.overflow !== 'hidden') {
                failures.push(`${label} must hide overflow, got ${style.overflow}`);
              }
              if (style.textOverflow !== 'ellipsis') {
                failures.push(`${label} must use ellipsis, got ${style.textOverflow}`);
              }
            }

            if (!typedCard?.shadowRoot) {
              throw new Error('lightener-curve-card did not render a shadow root');
            }

            if (mode === 'sidebar') {
              if (!panel?.shadowRoot?.querySelector('#card-mount')) {
                failures.push('sidebar mode must mount the card through lightener-editor-panel');
              }
            } else if (panel) {
              failures.push(`${mode} mode should not create lightener-editor-panel`);
            }

            const cardBox = rect('card', typedCard);
            const cardFrame = typedCard.shadowRoot.querySelector('.card');
            if (!cardFrame) throw new Error('card frame did not render');
            const embedded = cardFrame.classList.contains('embedded');
            if (embedded !== (mode === 'sidebar')) {
              failures.push(`embedded=${embedded} in ${mode} mode`);
            }

            const legend = typedCard.shadowRoot.querySelector('curve-legend') as
              | (HTMLElement & { updateComplete: Promise<unknown> })
              | null;
            const graph = typedCard.shadowRoot.querySelector('curve-graph') as
              | (HTMLElement & { updateComplete: Promise<unknown> })
              | null;
            const scrubber = typedCard.shadowRoot.querySelector('curve-scrubber') as
              | (HTMLElement & { updateComplete: Promise<unknown> })
              | null;
            if (!legend?.shadowRoot || !graph?.shadowRoot || !scrubber?.shadowRoot) {
              throw new Error(
                'curve-legend, curve-graph, and curve-scrubber must render shadow roots'
              );
            }

            const graphPanel = typedCard.shadowRoot.querySelector('.graph-panel');
            const mainStack = typedCard.shadowRoot.querySelector('.main-stack');
            const sideRail = typedCard.shadowRoot.querySelector('.side-rail');
            const workspace = typedCard.shadowRoot.querySelector('.workspace');
            if (!graphPanel || !mainStack || !sideRail || !workspace) {
              throw new Error('card layout regions did not render');
            }
            const initialGraphInsightText =
              typedCard.shadowRoot.querySelector('.graph-insight')?.textContent?.trim() ?? null;
            // The light list carries the count; no summary repeats it over the graph.
            if (initialGraphInsightText !== null) {
              failures.push(`unexpected graph count summary: ${initialGraphInsightText}`);
            }

            scrubber.dispatchEvent(
              new CustomEvent('scrubber-move', {
                detail: { position: 50 },
                bubbles: true,
                composed: true,
              })
            );
            graph.dispatchEvent(
              new CustomEvent('point-move', {
                detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 95 },
                bubbles: true,
                composed: true,
              })
            );
            graph.dispatchEvent(
              new CustomEvent('point-drop', {
                detail: { curveIndex: 0, pointIndex: 1 },
                bubbles: true,
                composed: true,
              })
            );
            await Promise.all([
              typedCard.updateComplete,
              scrubber.updateComplete,
              legend.updateComplete,
              graph.updateComplete,
            ]);

            await new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve))
            );
            const graphPanelBox = rect('graph panel', graphPanel, cardBox);
            const mainStackBox = rect('main stack', mainStack, cardBox);
            const sideRailBox = rect('side rail', sideRail, cardBox);
            // The rows under Room stay in the card; the header only carries copies.
            if (card?.toolbarHost?.querySelector('.edit-row, .message-line')) {
              failures.push('the rows under Room must not move into the panel toolbar');
            }
            rect('curve-graph', graph, graphPanelBox);
            rect('curve-legend', legend, sideRailBox);
            const dock = typedCard.shadowRoot.querySelector('.control-dock')!;
            const dockBox = rect('control dock', dock, cardBox);
            const scrubberBox = rect('curve-scrubber', scrubber, dockBox);
            // Undo shows under Room, or in the header from a 640px panel.
            const footer = [
              ...typedCard.shadowRoot.querySelectorAll('curve-footer[variant="undo"]'),
              ...(card?.toolbarHost?.querySelectorAll('curve-footer[variant="undo"]') ?? []),
            ].find((el) => el.getClientRects().length > 0) as
              | (HTMLElement & { shadowRoot: ShadowRoot | null })
              | undefined;
            if (!footer?.shadowRoot) {
              throw new Error('a visible Undo must render a shadow root');
            }
            const commandBox = footer.closest('.edit-row, .header-undo')!.getBoundingClientRect();
            rect('curve-footer', footer, commandBox);
            const footerInner = footer.shadowRoot.querySelector('.footer');
            if (!footerInner) {
              failures.push('footer controls did not render after dirtying the card');
            } else {
              rect('footer controls', footerInner, footer.getBoundingClientRect());
            }

            const legendPanel = legend.shadowRoot.querySelector('.legend-panel');
            const legendList = legend.shadowRoot.querySelector('.legend');
            if (legendPanel) rect('legend panel', legendPanel, legend.getBoundingClientRect());
            if (legendList) rect('legend list', legendList, legend.getBoundingClientRect());

            const legendItems = [...legend.shadowRoot.querySelectorAll('.legend-item')];
            const titles = legendItems.map(
              (item) => item.querySelector('.name')?.getAttribute('title') ?? ''
            );
            for (const [idx, item] of legendItems.entries()) {
              const itemBox = rect(`legend item ${idx + 1}`, item);
              for (const selector of [
                '.name-block',
                '.name',
                '.prefix',
                '.entity-id',
                'brightness-bar',
              ]) {
                const child = item.querySelector(selector);
                if (!child) continue;
                const childBox = rect(`legend item ${idx + 1} ${selector}`, child);
                if (childBox.right > itemBox.right + tolerance) {
                  failures.push(`legend item ${idx + 1} ${selector} exceeds its row`);
                }
              }
            }

            const firstRowSelect =
              legendItems[0]?.querySelector<HTMLButtonElement>('.row-select-btn');
            if (!firstRowSelect) failures.push('first legend item has no selection button');
            // The point-move setup may already have selected this light.
            else if (firstRowSelect.getAttribute('aria-pressed') !== 'true') firstRowSelect.click();
            await typedCard.updateComplete;
            await legend.updateComplete;
            await graph.updateComplete;

            const nameBlock = legendItems[0]?.querySelector('.name-block');
            const firstNameBlockWidth = nameBlock?.getBoundingClientRect().width ?? null;
            if (nameBlock && window.getComputedStyle(nameBlock).minWidth !== '0px') {
              failures.push('.name-block must have computed min-width 0px');
            }
            for (const selector of ['.name', '.prefix', '.entity-id']) {
              const sample = legendItems[0]?.querySelector(selector);
              if (sample) expectEllipsisStyles(selector, sample);
            }
            const firstBar = legendItems[0]?.querySelector('brightness-bar');
            const brightnessValue = firstBar?.shadowRoot?.querySelector('.value');
            if (brightnessValue && firstBar) {
              const valueBox = rect(
                'light brightness value',
                brightnessValue,
                firstBar.getBoundingClientRect()
              );
              if (window.getComputedStyle(brightnessValue).flexShrink !== '0') {
                failures.push('brightness value must not shrink under long names');
              }
              if (brightnessValue.scrollWidth > valueBox.width + tolerance) {
                failures.push('brightness value clips its percentage');
              }
            } else {
              failures.push('brightness value did not render after setting scrubber position');
            }

            const curveLines = graph.shadowRoot.querySelectorAll('path.curve-line').length;
            const hitCircleRadius =
              graph.shadowRoot.querySelector('circle.hit-circle')?.getAttribute('r') ?? null;
            const persistentHintCount = graph.shadowRoot.querySelectorAll('.hint-select').length;
            const persistentEditingLabelCount =
              graph.shadowRoot.querySelectorAll('.editing-label').length;
            const pointAriaLabel =
              graph.shadowRoot.querySelector('.hit-circle')?.getAttribute('aria-label') ?? null;
            const selectedLegendItems =
              legend.shadowRoot.querySelectorAll('.legend-item.selected').length;
            // Embedded (sidebar) mode does not override the graph height vars,
            // so every surface falls through to the 520px editor cap and renders
            // a non-collapsed graph.
            const graphSvg = graph.shadowRoot.querySelector('svg');
            const graphSvgMaxHeight = graphSvg ? window.getComputedStyle(graphSvg).maxHeight : null;
            const graphRenderedHeight = graphSvg ? graphSvg.getBoundingClientRect().height : 0;
            const workspaceStyle = window.getComputedStyle(workspace);
            const columnCount = workspaceStyle.gridTemplateColumns
              .split(' ')
              .filter(Boolean).length;
            // The light list sits under the graph and its controls at every width.
            if (columnCount !== 1) failures.push(`workspace should stack, got ${columnCount}`);
            if (sideRailBox.top < dockBox.bottom - tolerance)
              failures.push('lights must sit under Room brightness and the action row');
            const plot = graph.shadowRoot.querySelector<SVGRectElement>('.plot-frame')!;
            const bounds = plot.getBBox();
            const matrix = plot.getScreenCTM()!;
            const left = new DOMPoint(bounds.x, bounds.y).matrixTransform(matrix).x;
            const right = new DOMPoint(bounds.x + bounds.width, bounds.y).matrixTransform(matrix).x;
            const range = scrubber.shadowRoot
              .querySelector('brightness-bar')!
              .shadowRoot!.querySelector('input')!
              .getBoundingClientRect();
            const plotAlignmentError = Math.max(
              Math.abs(left - range.left),
              Math.abs(right - range.right)
            );
            if (plotAlignmentError > tolerance)
              failures.push(`room range does not match graph plot: ${plotAlignmentError}px`);
            if (width >= 900 && (firstNameBlockWidth === null || firstNameBlockWidth < 80))
              failures.push(`long-name column collapsed: ${firstNameBlockWidth}px`);
            if (Math.abs(dockBox.width - mainStackBox.width) > tolerance)
              failures.push('room dock must match the graph column');
            // Room brightness and the action row follow the graph, before Lights.
            const dockPrecedesLights = !!(
              sideRail.compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_PRECEDING
            );
            if (!dockPrecedesLights)
              failures.push('source order must place the room/action dock before Lights');
            if (typedCard.shadowRoot.querySelectorAll('curve-scrubber').length !== 1)
              failures.push('exactly one real room control must exist');
            if (typedCard.shadowRoot.querySelectorAll('curve-footer[variant="undo"]').length !== 1)
              failures.push('exactly one action footer must exist');
            // Under Room, the edit row spans the dock; a wide panel moves Undo to the header.
            const editRow = typedCard.shadowRoot.querySelector('.edit-row');
            const editRowWidth =
              editRow && editRow.getClientRects().length > 0
                ? editRow.getBoundingClientRect().width
                : null;
            if (editRowWidth !== null && editRowWidth + tolerance < dockBox.width)
              failures.push('the edit row is narrower than its dock');

            // Re-read layout after all mutations so the overflow guard covers the
            // post-mutation DOM (scrubber active + editing state).
            const finalDocumentWidth = Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth
            );
            const finalCardWidth = typedCard.getBoundingClientRect().width;

            if (finalDocumentWidth > viewportWidth + tolerance) {
              failures.push(
                `document scrollWidth ${finalDocumentWidth} exceeds viewport ${viewportWidth}`
              );
            }
            if (finalCardWidth > viewportWidth + tolerance) {
              failures.push(
                `card width ${finalCardWidth.toFixed(2)} exceeds viewport ${viewportWidth}`
              );
            }

            return {
              mode,
              documentWidth: finalDocumentWidth,
              viewportWidth,
              cardWidth: finalCardWidth,
              embedded,
              legendItems: legendItems.length,
              curveLines,
              longNameTitles: {
                minTitleLength: Math.min(...titles.map((title) => title.length)),
                uniqueTitles: new Set(titles).size,
              },
              graphContracts: {
                initialGraphInsightText,
                hitCircleRadius,
                persistentHintCount,
                persistentEditingLabelCount,
                pointAriaLabel,
                selectedLegendItems,
                graphSvgMaxHeight,
                graphRenderedHeight,
              },
              sidebarContracts: {
                columnCount: mode === 'sidebar' && width >= 1100 ? columnCount : null,
                dockPrecedesLights,
              },
              layoutContracts: {
                workspaceWidth: workspace.getBoundingClientRect().width,
                mainStackWidth: mainStackBox.width,
                sideRailWidth: sideRailBox.width,
                graphPanelWidth: graphPanelBox.width,
                scrubberWidth: scrubberBox.width,
                editRowWidth,
                dockWidth: dockBox.width,
                plotAlignmentError,
                firstNameBlockWidth,
              },
              failures,
            };
          },
          { mode, tolerance: TOLERANCE_PX, width }
        );

        expect(report.embedded).toBe(mode === 'sidebar');
        expect(report.legendItems).toBe(20);
        expect(report.curveLines).toBe(20);
        expect(report.longNameTitles.minTitleLength).toBeGreaterThan(40);
        expect(report.longNameTitles.uniqueTitles).toBe(20);
        expect(report.graphContracts.initialGraphInsightText).toBeNull();
        expect(report.graphContracts.persistentHintCount).toBe(0);
        expect(report.graphContracts.persistentEditingLabelCount).toBe(0);
        expect(report.graphContracts.pointAriaLabel).toContain('Arrow');
        expect(report.graphContracts.hitCircleRadius).toBe(width <= MOBILE_THRESHOLD ? '28' : '22');
        expect(report.graphContracts.selectedLegendItems).toBe(1);
        expect(report.graphContracts.graphSvgMaxHeight).toBe('520px');
        expect(report.graphContracts.graphRenderedHeight).toBeGreaterThan(0);
        if (mode === 'sidebar' && width >= 1100) {
          expect(report.sidebarContracts.columnCount).toBe(1);
        }
        expect(report.sidebarContracts.dockPrecedesLights).toBe(true);
        expect(report.layoutContracts.plotAlignmentError).toBeLessThanOrEqual(TOLERANCE_PX);
        if (report.layoutContracts.editRowWidth !== null) {
          expect(report.layoutContracts.editRowWidth).toBeGreaterThanOrEqual(
            report.layoutContracts.dockWidth - TOLERANCE_PX
          );
        }
        expect(report.failures).toEqual([]);
        expect(report.documentWidth).toBeLessThanOrEqual(report.viewportWidth + TOLERANCE_PX);
        expect(report.cardWidth).toBeLessThanOrEqual(report.viewportWidth + TOLERANCE_PX);
      });
    }
  }
});

test.describe('20-light sidebar command reachability', () => {
  for (const viewport of [
    ...SHORT_SIDEBAR_VIEWPORTS,
    { width: 1254, height: 847 },
    { width: 1100, height: 900 },
  ]) {
    test(`commands and selected-light shapes remain reachable at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/js/playwright/fixtures/long-name-card.html?mode=sidebar');
      await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
      await expectSettledLayout(page);
      const rows = page.locator('curve-legend .row-select-btn');
      await expect(rows).toHaveCount(20);
      await rows.first().press('Enter');
      await page.locator('.preset-option[data-preset="dim_accent"]:visible').press('Enter');
      // Undo sits beside the chips below a 640px panel and in the header from
      // 640px. Cancel and Save live in the header's exit slot; whether it pins
      // while scrolled away is undecided (DESIGN.md), so the header may scroll
      // out of view and its controls are reached by scrolling to the top.
      for (const name of ['Undo', 'Cancel changes', 'Save changes (Ctrl+S)']) {
        const button = page.getByRole('button', { name, exact: true });
        await expect(button).toBeEnabled();
        await button.scrollIntoViewIfNeeded();
        await expect(button).toBeInViewport();
      }
      const before = await page.locator('curve-graph').boundingBox();
      expect(before!.height).toBeLessThanOrEqual(520);
      expect(before!.height).toBeGreaterThanOrEqual(180);
      // One chip bar shows: under Room, or in the header from a 1100px panel.
      const chips = page.locator('.shape-chip-bar:visible');
      await expect(chips.locator('button')).toHaveCount(4);
      const contained = await chips.evaluate((bar) => {
        const frame = bar.parentElement!.getBoundingClientRect();
        return [...bar.querySelectorAll('button')].every((button) => {
          const box = button.getBoundingClientRect();
          return box.left >= frame.left - 1 && box.right <= frame.right + 1;
        });
      });
      expect(contained).toBe(true);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const list = await page
        .locator('curve-legend .legend')
        .evaluate((el) => ({ height: el.clientHeight, scroll: el.scrollHeight }));
      expect(list.scroll).toBeGreaterThan(list.height);
      expect(list.height).toBeLessThanOrEqual(Math.min(viewport.height * 0.6, 470) + 1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
      ).toBe(true);
    });
  }
});

test('graph-height overrides keep the graph and scrubber cap aligned', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: HEIGHT });
  await page.goto('/js/playwright/fixtures/long-name-card.html?mode=standalone');
  await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
  await expectSettledLayout(page);

  const measure = async (value: string) => {
    await page.evaluate((value) => {
      window.__LIGHTENER_CARD_ELEMENT__!.style.setProperty('--curve-graph-max-height', value);
    }, value);
    await expectSettledLayout(page);
    return page.evaluate(() => {
      const root = window.__LIGHTENER_CARD_ELEMENT__!.renderRoot;
      const graph = root.querySelector('curve-graph')!;
      const scrubber = root.querySelector('curve-scrubber')!;
      const svg = graph.shadowRoot!.querySelector('svg')!;
      const plot = graph.shadowRoot!.querySelector<SVGRectElement>('.plot-frame')!;
      const bounds = plot.getBBox();
      const matrix = plot.getScreenCTM()!;
      const left = new DOMPoint(bounds.x, bounds.y).matrixTransform(matrix).x;
      const right = new DOMPoint(bounds.x + bounds.width, bounds.y).matrixTransform(matrix).x;
      const range = scrubber
        .shadowRoot!.querySelector('brightness-bar')!
        .shadowRoot!.querySelector('input')!
        .getBoundingClientRect();
      return {
        graphMaxHeight: getComputedStyle(svg).maxHeight,
        viewBoxWidth: svg.viewBox.baseVal.width,
        aligned: Math.max(Math.abs(left - range.left), Math.abs(right - range.right)) <= 1,
      };
    });
  };

  const validOverride = await measure('240px');
  expect(validOverride.graphMaxHeight).toBe('240px');
  expect(validOverride.aligned).toBe(true);

  const invalidOverride = await measure('not-a-size');
  expect(invalidOverride.graphMaxHeight).toBe('520px');
  expect(invalidOverride.aligned).toBe(true);

  await expect.poll(async () => (await measure('100%')).viewBoxWidth).toBe(356);
  const percentageOverride = await measure('100%');
  expect(percentageOverride.graphMaxHeight).toBe('100%');
  expect(percentageOverride.viewBoxWidth).toBe(356);
  expect(percentageOverride.aligned).toBe(true);
});

test.describe('20-light short-screen editing actions', () => {
  for (const mode of MODES) {
    for (const width of [360, 1100]) {
      for (const height of [500, 650]) {
        test(`${mode} actions remain usable at ${width}x${height}`, async ({ page }, testInfo) => {
          await page.setViewportSize({ width, height });
          await page.goto(`/js/playwright/fixtures/long-name-card.html?mode=${mode}`);
          await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
          await expectSettledLayout(page);

          const card = page.locator('lightener-curve-card');
          const rows = card.locator('curve-legend .row-select-btn');
          // Undo stays under Room; Cancel and Save live in the header's exit slot.
          const footer = page;
          await expect(rows).toHaveCount(20);
          // View has no rows under Room.
          await expect(card.locator('.edit-row')).toHaveCount(0);

          // Use the far end of the long list, then return to Shapes through
          // normal browser scrolling. No synthetic selection or dirty events.
          await rows.last().click();
          await expect(card.locator('curve-legend .legend-item.selected')).toHaveCount(1);
          await expect(card.locator('.preset-option')).toHaveCount(4);
          const measurements = [];

          for (const action of ['Undo', 'Cancel', 'Save']) {
            // Cancel intentionally clears the selection; choose the light
            // again before the next edit, as a user would.
            if ((await card.locator('curve-legend .legend-item.selected').count()) === 0) {
              await rows.last().click();
            }
            await card.locator('.preset-option[data-preset="dim_accent"]').click();
            await expect(card.locator('.edit-row')).toHaveCount(1);

            const beforeScroll = await page.evaluate(async () => {
              const card = window.__LIGHTENER_CARD_ELEMENT__!;
              await card.updateComplete;
              await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve))
              );
              const graph = card.renderRoot.querySelector('.graph-panel')!.getBoundingClientRect();
              const footers = [
                ...card.renderRoot.querySelectorAll('curve-footer'),
                ...(card.toolbarHost?.querySelectorAll('curve-footer') ?? []),
              ];
              const row = card.renderRoot.querySelector('.edit-row')!;
              return {
                scrollY: window.scrollY,
                visualViewportHeight: window.visualViewport?.height,
                viewportHeight: document.documentElement.clientHeight,
                editRow: row.getBoundingClientRect().toJSON(),
                graphInView: graph.top < document.documentElement.clientHeight && graph.bottom > 0,
                // Hidden header copies do not count; one of each command shows.
                controls: footers.flatMap((footer) =>
                  Array.from(footer.shadowRoot!.querySelectorAll('button'))
                    .filter((button) => button.getClientRects().length > 0)
                    .map((button) => ({
                      name: button.getAttribute('aria-label'),
                      inHeader: !!card.toolbarHost?.contains(footer),
                      ...button.getBoundingClientRect().toJSON(),
                    }))
                ),
              };
            });
            expect(beforeScroll.controls).toHaveLength(3);
            if (mode === 'sidebar' && beforeScroll.graphInView) {
              // Undo sits beside the chips below a 640px panel; from 640px it lives in
              // the header with the exit slot, which may scroll away (reached below).
              for (const control of beforeScroll.controls.filter(
                (c) => c.name === 'Undo' && !c.inHeader
              )) {
                expect(control.top, `${control.name} before scrolling`).toBeGreaterThanOrEqual(
                  -TOLERANCE_PX
                );
                expect(control.bottom, `${control.name} before scrolling`).toBeLessThanOrEqual(
                  height + TOLERANCE_PX
                );
              }
            }

            const controls = [];
            for (const name of ['Undo', 'Cancel changes', 'Save changes (Ctrl+S)']) {
              const button = footer.getByRole('button', { name, exact: true });
              await button.scrollIntoViewIfNeeded();
              await expect(button).toBeEnabled();
              // Playwright's actionability check rejects covered hit targets.
              await button.click({ trial: true });
              const box = await button.boundingBox();
              expect(box).not.toBeNull();
              expect(box!.x).toBeGreaterThanOrEqual(-TOLERANCE_PX);
              expect(box!.x + box!.width).toBeLessThanOrEqual(width + TOLERANCE_PX);
              expect(box!.y).toBeGreaterThanOrEqual(-TOLERANCE_PX);
              expect(box!.y + box!.height).toBeLessThanOrEqual(height + TOLERANCE_PX);
              controls.push({ name, ...box! });
            }

            const geometry = await page.evaluate(() => {
              const root = window.__LIGHTENER_CARD_ELEMENT__!.renderRoot;
              const graph = root.querySelector('curve-graph')!;
              const plot = graph.shadowRoot!.querySelector<SVGRectElement>('.plot-frame')!;
              const bounds = plot.getBBox();
              const matrix = plot.getScreenCTM()!;
              const left = new DOMPoint(bounds.x, bounds.y).matrixTransform(matrix).x;
              const right = new DOMPoint(bounds.x + bounds.width, bounds.y).matrixTransform(
                matrix
              ).x;
              const room = root.querySelector('curve-scrubber')!;
              const range = room
                .shadowRoot!.querySelector('brightness-bar')!
                .shadowRoot!.querySelector('input')!
                .getBoundingClientRect();
              const dock = root.querySelector('.control-dock')!;
              const dockBox = dock.getBoundingClientRect();
              return {
                overflow:
                  Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
                  document.documentElement.clientWidth,
                narrow: dock.hasAttribute('data-narrow'),
                alignmentError: Math.max(
                  Math.abs(left - range.left),
                  Math.abs(right - range.right)
                ),
                dockBottom: dockBox.bottom,
                rangeBottom: range.bottom,
                roomCount: root.querySelectorAll('curve-scrubber').length,
                footerCount: root.querySelectorAll('curve-footer[variant="undo"]').length,
                viewportHeight: document.documentElement.clientHeight,
                scrollY: window.scrollY,
              };
            });
            expect(geometry.overflow).toBeLessThanOrEqual(TOLERANCE_PX);
            expect(geometry.roomCount).toBe(1);
            expect(geometry.footerCount).toBe(1);
            // The rows under Room stay in flow; each command was scrolled to above.
            if (!geometry.narrow) expect(geometry.alignmentError).toBeLessThanOrEqual(TOLERANCE_PX);
            measurements.push({ action, ...geometry, controls, beforeScroll });

            const actionName =
              action === 'Undo'
                ? 'Undo'
                : action === 'Cancel'
                  ? 'Cancel changes'
                  : 'Save changes (Ctrl+S)';
            await footer.getByRole('button', { name: actionName, exact: true }).click();
            // Each action settles to a clean editor before the next edit.
            await expect
              .poll(() =>
                page.evaluate(() => {
                  const settled = window.__LIGHTENER_CARD_ELEMENT__ as unknown as {
                    _isDirty: boolean;
                    _cancelAnimating: boolean;
                  };
                  return settled._isDirty || settled._cancelAnimating;
                })
              )
              .toBe(false);
            await expect(card.locator('.error')).toHaveCount(0);
            const savedCount = await page.evaluate(() => window.__LIGHTENER_SAVED__!.length);
            expect(savedCount).toBe(action === 'Save' ? 1 : 0);
          }

          const proofPath = testInfo.outputPath('short-screen-actions.json');
          writeFileSync(
            proofPath,
            `${JSON.stringify({ mode, width, height, measurements }, null, 2)}\n`
          );
          await testInfo.attach('short-screen-actions', {
            path: proofPath,
            contentType: 'application/json',
          });
        });
      }
    }
  }
});

test('resizing a card preserves the actual room control and changes only its placement', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/js/playwright/fixtures/long-name-card.html?mode=standalone');
  await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
  await expectSettledLayout(page);
  await page.evaluate(() => {
    window.__LIGHTENER_CARD_ELEMENT__!.style.width = '390px';
  });
  await expectSettledLayout(page);
  const original = await page.evaluateHandle(() => {
    const room = window.__LIGHTENER_CARD_ELEMENT__!.renderRoot.querySelector('curve-scrubber')!;
    const bar = room.shadowRoot!.querySelector('brightness-bar')!;
    return { room, bar, range: bar.shadowRoot!.querySelector('input')! };
  });
  await page.locator('curve-scrubber').evaluate((room) => {
    room.dispatchEvent(
      new CustomEvent('scrubber-move', { detail: { position: 37 }, bubbles: true, composed: true })
    );
  });
  await expect(page.locator('curve-scrubber input')).toHaveValue('37');
  const narrow = await page.evaluate(() => {
    const root = window.__LIGHTENER_CARD_ELEMENT__!.renderRoot;
    return {
      mode: root.querySelector('.control-dock')!.hasAttribute('data-narrow'),
      labels:
        root
          .querySelector('curve-scrubber')!
          .shadowRoot!.querySelector('brightness-bar')!
          .shadowRoot!.querySelectorAll('.label').length +
        root.querySelector('curve-graph')!.shadowRoot!.querySelectorAll('.x-axis-label').length,
    };
  });
  await page.evaluate(() => {
    window.__LIGHTENER_CARD_ELEMENT__!.style.width = '1080px';
  });
  await expectSettledLayout(page);
  const report = await page.evaluate((before) => {
    const root = window.__LIGHTENER_CARD_ELEMENT__!.renderRoot;
    const room = root.querySelector('curve-scrubber')!;
    const bar = room.shadowRoot!.querySelector('brightness-bar')!;
    const range = bar.shadowRoot!.querySelector('input')!;
    const graph = root.querySelector('curve-graph')!;
    const plot = graph.shadowRoot!.querySelector<SVGRectElement>('.plot-frame')!;
    const bounds = plot.getBBox();
    const matrix = plot.getScreenCTM()!;
    const left = new DOMPoint(bounds.x, bounds.y).matrixTransform(matrix).x;
    const right = new DOMPoint(bounds.x + bounds.width, bounds.y).matrixTransform(matrix).x;
    const rangeBox = range.getBoundingClientRect();
    return {
      nowWide: !root.querySelector('.control-dock')!.hasAttribute('data-narrow'),
      sameRoom: room === before.room,
      sameBar: bar === before.bar,
      sameRange: range === before.range,
      value: range.value,
      count: root.querySelectorAll('curve-scrubber').length,
      wideLabelCount:
        bar.shadowRoot!.querySelectorAll('.label').length +
        graph.shadowRoot!.querySelectorAll('.x-axis-label').length,
      alignmentError: Math.max(Math.abs(left - rangeBox.left), Math.abs(right - rangeBox.right)),
    };
  }, original);
  await original.dispose();
  expect(narrow.mode).toBe(true);
  expect(report.nowWide).toBe(true);
  expect(report.sameRoom && report.sameBar && report.sameRange).toBe(true);
  expect(report.value).toBe('37');
  expect(report.count).toBe(1);
  expect(narrow.labels).toBe(1);
  expect(report.wideLabelCount).toBe(1);
  expect(report.alignmentError).toBeLessThanOrEqual(TOLERANCE_PX);
});

test('two narrow cards retain independent room controls and rows under Room', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 650 });
  await page.goto('/js/playwright/fixtures/long-name-card.html?mode=standalone');
  await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
  await expectSettledLayout(page);
  await page.evaluate(() => {
    const first = window.__LIGHTENER_CARD_ELEMENT__!;
    first.id = 'first-card';
    first.style.width = '390px';
    const fixture = window.__LIGHTENER_STRESS_FIXTURE__ as {
      states: Record<
        string,
        { state: string; attributes: { friendly_name?: string; brightness?: number } }
      >;
      entities: Record<string, unknown>;
    };
    const second = document.createElement('lightener-curve-card');
    second.id = 'second-card';
    second.style.width = '390px';
    second.style.marginTop = '40px';
    // Leave room to scroll the second card's lights to the top of the viewport.
    second.style.marginBottom = '100vh';
    second.setConfig({ entity: 'light.other_group', title: 'Another group' });
    second.hass = {
      user: { is_admin: true },
      states: {
        ...fixture.states,
        'light.other_group': { state: 'on', attributes: { friendly_name: 'Another group' } },
      },
      callWS: async <T>(message: Record<string, unknown>): Promise<T> => {
        if (message.type === 'lightener/get_curves') return { entities: fixture.entities } as T;
        throw new Error(`Unexpected second-card request: ${message.type}`);
      },
      callApi: async <T>(): Promise<T> => undefined as T,
      callService: async () => undefined,
    };
    first.parentElement!.append(second);
  });
  await expect(page.locator('#second-card curve-legend .legend-item')).toHaveCount(20);
  await expect(page.locator('curve-scrubber')).toHaveCount(2);
  await page.locator('lightener-curve-card').evaluateAll(async (cards) => {
    for (const [index, element] of cards.entries()) {
      const card = element as HTMLElement & {
        renderRoot: ShadowRoot;
        updateComplete: Promise<unknown>;
      };
      card.renderRoot.querySelector('curve-scrubber')!.dispatchEvent(
        new CustomEvent('scrubber-move', {
          detail: { position: index === 0 ? 25 : 75 },
          bubbles: true,
          composed: true,
        })
      );
      // Unsaved edits make each card's action row active.
      const graph = card.renderRoot.querySelector('curve-graph')!;
      for (const type of ['point-move', 'point-drop']) {
        graph.dispatchEvent(
          new CustomEvent(type, {
            detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 95 },
            bubbles: true,
            composed: true,
          })
        );
      }
      await card.updateComplete;
    }
  });
  await expect(page.locator('#first-card curve-scrubber input')).toHaveValue('25');
  await expect(page.locator('#second-card curve-scrubber input')).toHaveValue('75');
  // Each card keeps its own row under Room, in flow; nothing pins over the page.
  await expect(page.locator('#first-card .edit-row')).toHaveCount(1);
  await expect(page.locator('#second-card .edit-row')).toHaveCount(1);
  await page.locator('#second-card').evaluate((card) => {
    const lights = card.shadowRoot!.querySelector('curve-legend')!;
    window.scrollTo(0, lights.getBoundingClientRect().top + window.scrollY);
  });
  await expect(page.locator('lightener-curve-card [data-overlay]')).toHaveCount(0);
  await expect(page.locator('#first-card curve-scrubber input')).toHaveValue('25');
  await expect(page.locator('#second-card curve-scrubber input')).toHaveValue('75');
  await page.locator('#second-card').evaluate((card) => card.remove());
  await expect(page.locator('curve-scrubber')).toHaveCount(1);
  await expect(page.locator('curve-footer[variant="undo"]')).toHaveCount(1);
});

test.describe('compact card geometry and guidance', () => {
  for (const mode of ['sidebar', 'lovelace'] as const) {
    for (const width of [320, 390, 500, 501]) {
      for (const graphHeight of ['', '240px', 'invalid']) {
        test(`${mode} compact boundary ${width}px with graph height ${graphHeight || 'default'}`, async ({
          page,
        }, testInfo) => {
          // A narrow card in a wide viewport must use the same compact geometry.
          await page.setViewportSize({ width: 1100, height: 900 });
          await page.goto(`/js/playwright/fixtures/long-name-card.html?mode=${mode}`);
          await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
          await expectSettledLayout(page);
          await page.evaluate(
            ({ width, graphHeight }) => {
              const card = window.__LIGHTENER_CARD_ELEMENT__!;
              card.style.width = `${width}px`;
              if (graphHeight) card.style.setProperty('--curve-graph-max-height', graphHeight);
            },
            { width, graphHeight }
          );
          await expectSettledLayout(page);
          // The narrow settle check skips plot alignment; wait for the Room
          // strip to follow the remeasured plot before reading geometry.
          await expect
            .poll(() =>
              page.evaluate(() => {
                const root = window.__LIGHTENER_CARD_ELEMENT__!.renderRoot;
                const range = root
                  .querySelector('curve-scrubber')!
                  .shadowRoot!.querySelector('brightness-bar')!
                  .shadowRoot!.querySelector('input')!
                  .getBoundingClientRect().width;
                const plot = root
                  .querySelector('curve-graph')!
                  .shadowRoot!.querySelector('.plot-frame')!
                  .getBoundingClientRect().width;
                return Math.abs(range - plot) < 0.5;
              })
            )
            .toBe(true);
          const report = await page.evaluate(() => {
            const card = window.__LIGHTENER_CARD_ELEMENT__!;
            const root = card.renderRoot;
            const graph = root.querySelector('curve-graph')!;
            const dock = root.querySelector('.control-dock')!;
            const room = root.querySelector('curve-scrubber')!;
            const range = room
              .shadowRoot!.querySelector('brightness-bar')!
              .shadowRoot!.querySelector('input')!
              .getBoundingClientRect();
            const dockBox = dock.getBoundingClientRect();
            const controlSlot = root.querySelector('.control-slot')!;
            const side = root.querySelector('.side-rail')!;
            // A panel-hosted card has no header of its own; help sits in the panel.
            const header = root.querySelector('.header');
            return {
              width: card.getBoundingClientRect().width,
              outerPadding: getComputedStyle(root.querySelector('.card')!).paddingLeft,
              graphPadding: getComputedStyle(root.querySelector('.graph-panel')!).paddingLeft,
              headerMargin: header ? getComputedStyle(header).marginBottom : null,
              graphHeight: graph.shadowRoot!.querySelector('svg')!.getBoundingClientRect().height,
              narrow: dock.hasAttribute('data-narrow'),
              dockWidth: dockBox.width,
              rangeWidth: range.width,
              plotWidth: graph.shadowRoot!.querySelector('.plot-frame')!.getBoundingClientRect()
                .width,
              rowsUnderRoom: root.querySelectorAll('.edit-row, [data-overlay]').length,
              sourceOrder: !!(
                side.compareDocumentPosition(controlSlot) & Node.DOCUMENT_POSITION_PRECEDING
              ),
              roomCount: root.querySelectorAll('curve-scrubber').length,
              visibleRoomLabels: room
                .shadowRoot!.querySelector('brightness-bar')!
                .shadowRoot!.querySelectorAll('.label').length,
              graphRoomLabels: graph.shadowRoot!.querySelectorAll('.x-axis-label').length,
            };
          });
          expect(report.width).toBe(width);
          // The sidebar panel supplies the editor's inset; the graph has none.
          const outerPadding = mode === 'sidebar' ? 0 : width <= 500 ? 12 : 20;
          expect(report.outerPadding).toBe(`${outerPadding}px`);
          expect(report.graphPadding).toBe('0px');
          expect(report.headerMargin).toBe(
            mode === 'sidebar' ? null : width <= 500 ? '8px' : '16px'
          );
          const expectedHeight = Math.min(
            (width - 2 * outerPadding) * (VB_H / VB_W),
            graphHeight === '240px' ? 240 : 520
          );
          expect(Math.abs(report.graphHeight - expectedHeight)).toBeLessThan(0.05);
          expect(report.narrow).toBe(true);
          expect(report.sourceOrder).toBe(true);
          expect(report.roomCount).toBe(1);
          expect(report.visibleRoomLabels + report.graphRoomLabels).toBe(1);
          // Room and the action row span the card; a shorter graph widens
          // its plot instead of narrowing them.
          expect(report.dockWidth).toBeCloseTo(width - 2 * outerPadding, 0);
          // The Room grip strip spans the plot itself, under its edge.
          expect(report.rangeWidth).toBeCloseTo(report.plotWidth, 0);
          // A clean editor in View shows no rows under Room.
          expect(report.rowsUnderRoom).toBe(0);
          const proofPath = testInfo.outputPath('compact-geometry.json');
          writeFileSync(proofPath, JSON.stringify({ mode, width, graphHeight, ...report }));
          await testInfo.attach('compact-geometry', {
            path: proofPath,
            contentType: 'application/json',
          });
        });
      }
    }

    test(`${mode} Room grip and value stay unclipped in a 320px card near the right end`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 844 });
      await page.goto(`/js/playwright/fixtures/long-name-card.html?mode=${mode}`);
      await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
      await expectSettledLayout(page);
      for (const position of [80, 85, 86, 100]) {
        const report = await page.evaluate(async (position) => {
          const card = window.__LIGHTENER_CARD_ELEMENT__!;
          const room = card.renderRoot.querySelector('curve-scrubber')!;
          room.dispatchEvent(
            new CustomEvent('scrubber-move', {
              detail: { position },
              bubbles: true,
              composed: true,
            })
          );
          await card.updateComplete;
          await room.updateComplete;
          const bar = room.shadowRoot!.querySelector('brightness-bar')! as HTMLElement & {
            updateComplete: Promise<unknown>;
          };
          await bar.updateComplete;
          // The tightest horizontal clip between the grip and the viewport.
          const marker = bar.shadowRoot!.querySelector('.marker')!;
          let clip = { left: 0, right: innerWidth };
          let node: Element | null = marker.parentElement;
          while (node) {
            if (getComputedStyle(node).overflowX !== 'visible') {
              const rect = node.getBoundingClientRect();
              clip = {
                left: Math.max(clip.left, rect.left),
                right: Math.min(clip.right, rect.right),
              };
            }
            const root = node.getRootNode();
            node = node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
          }
          const box = (selector: string) => {
            const rect = bar.shadowRoot!.querySelector(selector)!.getBoundingClientRect();
            return { left: rect.left, right: rect.right };
          };
          return {
            clip,
            grip: box('.marker'),
            value: box('.value'),
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        }, position);
        // Nothing clips the grip or its value, and the page never scrolls sideways.
        for (const part of [report.grip, report.value]) {
          expect(part.left).toBeGreaterThanOrEqual(report.clip.left);
          expect(part.right).toBeLessThanOrEqual(report.clip.right);
        }
        expect(report.overflow).toBe(false);
      }
    });

    test(`${mode} scrubber fade covers horizontal plateau stroke edges and retains endpoint indicators`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/js/playwright/fixtures/long-name-card.html?mode=${mode}`);
      await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
      await expectSettledLayout(page);
      for (const target of [0, 100]) {
        for (const position of [null, 0, 50, 100]) {
          const report = await page.evaluate(
            async ({ target, position }) => {
              const graph = window.__LIGHTENER_CARD_ELEMENT__!.renderRoot.querySelector(
                'curve-graph'
              ) as HTMLElement & {
                curves: Array<{
                  entityId: string;
                  friendlyName: string;
                  color: string;
                  controlPoints: Array<{ lightener: number; target: number }>;
                }>;
                selectedCurveId: string | null;
                scrubberPosition: number | null;
                updateComplete: Promise<unknown>;
              };
              graph.curves = [
                {
                  entityId: 'light.plateau',
                  friendlyName: 'Plateau',
                  color: '#2563eb',
                  controlPoints: [
                    { lightener: 0, target },
                    { lightener: 100, target },
                  ],
                },
              ];
              graph.selectedCurveId = 'light.plateau';
              graph.scrubberPosition = position;
              await graph.updateComplete;
              const root = graph.shadowRoot!;
              const overlay = root.querySelector<SVGRectElement>('rect[fill-opacity="0.8"]');
              const path = root.querySelector<SVGPathElement>('.curve-line')!;
              const bounds = path.getBBox();
              const halfStroke = parseFloat(getComputedStyle(path).strokeWidth) / 2;
              const dim = overlay?.getBBox();
              return {
                overlay: !!overlay,
                line: !!root.querySelector('.scrubber-line'),
                dots: root.querySelectorAll('.scrubber-dot').length,
                topCovered: !!dim && dim.y <= bounds.y - halfStroke,
                bottomCovered: !!dim && dim.y + dim.height >= bounds.y + bounds.height + halfStroke,
                rightCovered: !!dim && dim.x + dim.width >= bounds.x + bounds.width + halfStroke,
                leftCovered: !!dim && dim.x <= bounds.x - halfStroke,
              };
            },
            { target, position }
          );
          expect(report.overlay).toBe(position !== null && position < 100);
          expect(report.line).toBe(position !== null);
          expect(report.dots).toBe(position === null ? 0 : 1);
          if (position !== null && position < 100) {
            expect(report.topCovered).toBe(true);
            expect(report.bottomCovered).toBe(true);
            expect(report.rightCovered).toBe(true);
            if (position === 0) expect(report.leftCovered).toBe(true);
          }
        }
      }
    });
  }

  test('sidebar compact guidance follows state without replacing or blurring the picker', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/js/playwright/fixtures/long-name-card.html?mode=sidebar');
    await page.evaluate(() => window.__LIGHTENER_CARD_READY__);
    await expectSettledLayout(page);
    const panel = page.locator('lightener-editor-panel');
    const intro = panel.locator('.panel-intro');
    const status = panel.locator('#status-msg');
    await expect(intro).toBeHidden();
    await expect(status).toBeHidden();
    // Phones keep a 44px target on the headline switcher.
    await expect(panel.locator('#group-switcher')).toHaveCSS('height', '44px');
    await page.evaluate(() => {
      const card = window.__LIGHTENER_CARD_ELEMENT__!;
      card.dispatchEvent(
        new CustomEvent('lightener-membership-state', {
          detail: { open: true },
          bubbles: true,
          composed: true,
        })
      );
    });
    await expect(status).toBeVisible();
    await expect(status).toContainText('Finish editing lights');
    await page.evaluate(() =>
      window.__LIGHTENER_CARD_ELEMENT__!.dispatchEvent(
        new CustomEvent('lightener-membership-state', {
          detail: { open: false },
          bubbles: true,
          composed: true,
        })
      )
    );
    await expect(status).toBeHidden();
    const states = await page.evaluate(() => {
      const panel = window.__LIGHTENER_PANEL_ELEMENT__ as HTMLElement & {
        _handoffNotice: string | null;
        _render: () => void;
        _lightenerEntities: Array<{ entity_id: string; name: string }>;
        _selectedEntity: string | null;
        _loadingEntities: boolean;
        _loadEntitiesError: string | null;
      };
      const root = panel.shadowRoot!;
      const switcher = root.querySelector<HTMLButtonElement>('#group-switcher')!;
      const name = root.querySelector('#group-name')!;
      const entities = panel._lightenerEntities;
      const selected = panel._selectedEntity;
      const visible = (selector: string) =>
        getComputedStyle(root.querySelector(selector)!).display !== 'none';
      const report = [];
      const label = entities.find((entity) => entity.entity_id === selected)?.name;
      switcher.focus();
      for (const state of ['notice', 'ready', 'loading', 'empty', 'error', 'ready']) {
        panel._handoffNotice = state === 'notice' ? 'The group is still starting.' : null;
        panel._lightenerEntities = ['loading', 'empty', 'error'].includes(state) ? [] : entities;
        panel._selectedEntity = panel._lightenerEntities.length ? selected : null;
        panel._loadingEntities = state === 'loading';
        panel._loadEntitiesError = state === 'error' ? 'Could not load Lightener groups.' : null;
        panel._render();
        report.push({
          state,
          status: visible('#status-msg'),
          intro: visible('.panel-intro'),
          // The headline names the current group, or says why there is none.
          headline: name.textContent,
          expected: {
            notice: label,
            ready: label,
            loading: 'Loading groups…',
            empty: 'No groups yet',
            error: 'Groups unavailable',
          }[state],
          stable:
            root.querySelector('#group-switcher') === switcher &&
            root.querySelector('#group-name') === name,
          focused: root.activeElement === switcher,
          disabled: switcher.disabled,
        });
      }
      return report;
    });
    let seenNoGroups = false;
    for (const result of states) {
      expect(result.status).toBe(result.state !== 'ready');
      expect(result.intro).toBe(['loading', 'empty', 'error'].includes(result.state));
      expect(result.headline).toBe(result.expected);
      expect(result.stable).toBe(true);
      // With no groups to list the switcher is disabled (New group… lives in ⋮),
      // so a disabled button gives up focus; it stays focused while groups exist.
      const noGroups = ['loading', 'empty', 'error'].includes(result.state);
      expect(result.disabled).toBe(noGroups);
      if (['notice', 'ready'].includes(result.state) && !seenNoGroups) {
        expect(result.focused).toBe(true);
      }
      if (noGroups) seenNoGroups = true;
    }
    await page.setViewportSize({ width: 501, height: 844 });
    await expect(intro).toBeHidden();
    await expect(status).toBeHidden();
  });
});

declare global {
  interface Window {
    __LIGHTENER_CARD_READY__: Promise<void>;
    __LIGHTENER_CARD_ELEMENT__?: HTMLElement & {
      renderRoot: ShadowRoot;
      updateComplete: Promise<unknown>;
    };
    __LIGHTENER_PANEL_ELEMENT__?: HTMLElement & { shadowRoot: ShadowRoot | null };
    __LIGHTENER_STRESS_FIXTURE__: unknown;
    __LIGHTENER_SAVED__?: Record<string, unknown>[];
  }
}
