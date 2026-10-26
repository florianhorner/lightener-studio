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
    footerSlotWidth: number;
    dockWidth: number;
    plotAlignmentError: number | null;
    twoColumnLayout: boolean;
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
          const footer = root?.querySelector('.footer-slot');
          const room = root?.querySelector('curve-scrubber');
          const range = room?.shadowRoot
            ?.querySelector('brightness-bar')
            ?.shadowRoot?.querySelector('input');
          const plot = root
            ?.querySelector('curve-graph')
            ?.shadowRoot?.querySelector<SVGRectElement>('.plot-frame');
          const matrix = plot?.getScreenCTM();
          if (!workspace || !main || !dock || !footer || !range || !plot || !matrix) {
            return { mode: false, width: false, alignment: false, reserved: false };
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
            // A pinned action row keeps its place in the editor reserved.
            reserved:
              !footer.hasAttribute('data-overlay') ||
              parseFloat(getComputedStyle(dock).minHeight) >= dockBox.height - 1,
          };
        }),
      { message: 'room dock settles to the card width, layout mode, and graph plot' }
    )
    .toEqual({ mode: true, width: true, alignment: true, reserved: true });
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
            const footerSlot =
              typedCard.shadowRoot.querySelector('.editor-commands') ??
              typedCard.shadowRoot.querySelector('.footer-slot');
            const workspace = typedCard.shadowRoot.querySelector('.workspace');
            if (!graphPanel || !mainStack || !sideRail || !footerSlot || !workspace) {
              throw new Error('card layout regions did not render');
            }
            const initialGraphInsightText =
              typedCard.shadowRoot.querySelector('.graph-insight')?.textContent?.trim() ?? null;
            if (!initialGraphInsightText?.includes('20 lights match the group brightness')) {
              failures.push(`missing initial graph insight: ${initialGraphInsightText ?? 'null'}`);
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
            // The panel's toolbar holds help only; the action row stays in the card.
            if (card?.toolbarHost?.querySelector('.editor-commands')) {
              failures.push('the action row must not move into the panel toolbar');
            }
            const footerSlotBox = rect('command location', footerSlot, cardBox);
            rect('curve-graph', graph, graphPanelBox);
            rect('curve-legend', legend, sideRailBox);
            const dock = typedCard.shadowRoot.querySelector('.control-dock')!;
            const dockBox = rect('control dock', dock, cardBox);
            const scrubberBox = rect('curve-scrubber', scrubber, dockBox);
            const footer = typedCard.shadowRoot.querySelector('curve-footer') as
              | (HTMLElement & { shadowRoot: ShadowRoot | null })
              | null;
            if (!footer?.shadowRoot) {
              throw new Error('curve-footer must render a shadow root');
            }
            const commandBox =
              footer.closest('.editor-commands')?.getBoundingClientRect() ?? footerSlotBox;
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
                '.eye-btn',
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
            const twoColumnLayout =
              columnCount === 2 && sideRailBox.left >= mainStackBox.right - tolerance;
            let plotAlignmentError: number | null = null;
            if (twoColumnLayout) {
              const plot = graph.shadowRoot.querySelector<SVGRectElement>('.plot-frame')!;
              const bounds = plot.getBBox();
              const matrix = plot.getScreenCTM()!;
              const left = new DOMPoint(bounds.x, bounds.y).matrixTransform(matrix).x;
              const right = new DOMPoint(bounds.x + bounds.width, bounds.y).matrixTransform(
                matrix
              ).x;
              const range = scrubber.shadowRoot
                .querySelector('brightness-bar')!
                .shadowRoot!.querySelector('input')!
                .getBoundingClientRect();
              plotAlignmentError = Math.max(
                Math.abs(left - range.left),
                Math.abs(right - range.right)
              );
              if (plotAlignmentError > tolerance)
                failures.push(`room range does not match graph plot: ${plotAlignmentError}px`);
              if (sideRailBox.width < 300 - tolerance)
                failures.push(`light panel too narrow: ${sideRailBox.width}px`);
              if (Math.abs(mainStackBox.left - workspace.getBoundingClientRect().left) > tolerance)
                failures.push('wide graph must start at the workspace edge');
              if (firstNameBlockWidth === null || firstNameBlockWidth < 80)
                failures.push(`long-name column collapsed: ${firstNameBlockWidth}px`);
            } else if (Math.abs(dockBox.width - mainStackBox.width) > tolerance) {
              failures.push('narrow room dock must match the graph column');
            }
            // Room brightness and the action row follow the graph, before Lights.
            const dockPrecedesLights = !!(
              sideRail.compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_PRECEDING
            );
            if (!dockPrecedesLights)
              failures.push('source order must place the room/action dock before Lights');
            if (typedCard.shadowRoot.querySelectorAll('curve-scrubber').length !== 1)
              failures.push('exactly one real room control must exist');
            if (typedCard.shadowRoot.querySelectorAll('curve-footer').length !== 1)
              failures.push('exactly one action footer must exist');
            if (footerSlotBox.width + tolerance < dockBox.width)
              failures.push('action footer is narrower than its dock');
            if (mode === 'sidebar' && width >= 1100 && columnCount !== 2) {
              failures.push(`wide sidebar should use two columns, got ${columnCount}`);
            }
            if (mode === 'standalone' && width >= 900 && columnCount !== 2) {
              failures.push(`wide standalone should use two columns, got ${columnCount}`);
            }

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
                footerSlotWidth: footerSlotBox.width,
                dockWidth: dockBox.width,
                plotAlignmentError,
                twoColumnLayout,
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
        expect(report.graphContracts.initialGraphInsightText).toContain(
          '20 lights match the group brightness'
        );
        expect(report.graphContracts.persistentHintCount).toBe(0);
        expect(report.graphContracts.persistentEditingLabelCount).toBe(0);
        expect(report.graphContracts.pointAriaLabel).toContain('Arrow');
        expect(report.graphContracts.hitCircleRadius).toBe(width <= MOBILE_THRESHOLD ? '28' : '22');
        expect(report.graphContracts.selectedLegendItems).toBe(1);
        expect(report.graphContracts.graphSvgMaxHeight).toBe('520px');
        expect(report.graphContracts.graphRenderedHeight).toBeGreaterThan(0);
        if (mode === 'sidebar' && width >= 1100) {
          expect(report.sidebarContracts.columnCount).toBe(2);
        }
        expect(report.sidebarContracts.dockPrecedesLights).toBe(true);
        if (report.layoutContracts.twoColumnLayout) {
          expect(report.layoutContracts.plotAlignmentError).toBeLessThanOrEqual(TOLERANCE_PX);
        }
        expect(report.layoutContracts.footerSlotWidth).toBeGreaterThanOrEqual(
          report.layoutContracts.dockWidth - TOLERANCE_PX
        );
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
      await page.locator('.preset-option[data-preset="dim_accent"]').press('Enter');
      for (const name of ['Undo', 'Cancel changes', 'Save changes (Ctrl+S)']) {
        const button = page.getByRole('button', { name, exact: true });
        await expect(button).toBeEnabled();
        await expect(button).toBeInViewport();
      }
      const before = await page.locator('curve-graph').boundingBox();
      expect(before!.height).toBeLessThanOrEqual(520);
      expect(before!.height).toBeGreaterThanOrEqual(180);
      const chips = page.locator('.shape-chip-bar');
      await expect(chips.locator('button')).toHaveCount(4);
      const contained = await chips.evaluate((bar) => {
        const plot = bar.closest('.graph-panel')!.getBoundingClientRect();
        return [...bar.querySelectorAll('button')].every((button) => {
          const box = button.getBoundingClientRect();
          return box.left >= plot.left - 1 && box.right <= plot.right + 1;
        });
      });
      expect(contained).toBe(true);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      for (const name of ['Undo', 'Cancel changes', 'Save changes (Ctrl+S)']) {
        await expect(page.getByRole('button', { name, exact: true })).toBeInViewport();
      }
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
          const footer = page.locator('curve-footer');
          await expect(rows).toHaveCount(20);
          await expect(card.locator('.footer-slot.active')).toHaveCount(0);

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
            await expect(card.locator('.footer-slot.active')).toHaveCount(1);

            const beforeScroll = await page.evaluate(async () => {
              const card = window.__LIGHTENER_CARD_ELEMENT__!;
              await card.updateComplete;
              await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve))
              );
              const graph = card.renderRoot.querySelector('.graph-panel')!.getBoundingClientRect();
              const footer = card.renderRoot.querySelector('curve-footer')!;
              const slot = card.renderRoot.querySelector('.footer-slot')!;
              return {
                scrollY: window.scrollY,
                visualViewportHeight: window.visualViewport?.height,
                viewportHeight: document.documentElement.clientHeight,
                footerSlot: slot.getBoundingClientRect().toJSON(),
                footerPosition: getComputedStyle(slot).position,
                footerOverlay: slot.hasAttribute('data-overlay'),
                graphInView: graph.top < document.documentElement.clientHeight && graph.bottom > 0,
                controls: Array.from(footer.shadowRoot!.querySelectorAll('button'), (button) => ({
                  name: button.getAttribute('aria-label'),
                  ...button.getBoundingClientRect().toJSON(),
                })),
              };
            });
            expect(beforeScroll.controls).toHaveLength(3);
            if (mode === 'sidebar' && beforeScroll.graphInView) {
              for (const control of beforeScroll.controls) {
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
              const slotBox = root.querySelector('.footer-slot')!.getBoundingClientRect();
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
                slotTop: slotBox.top,
                slotBottom: slotBox.bottom,
                roomCount: root.querySelectorAll('curve-scrubber').length,
                footerCount: root.querySelectorAll('curve-footer').length,
                viewportHeight: document.documentElement.clientHeight,
                scrollY: window.scrollY,
              };
            });
            expect(geometry.overflow).toBeLessThanOrEqual(TOLERANCE_PX);
            expect(geometry.roomCount).toBe(1);
            expect(geometry.footerCount).toBe(1);
            if (geometry.narrow) {
              // Narrow cards have no sticky dock: the action row stays on
              // screen, in place or pinned while the editor scrolls past it.
              expect(geometry.slotTop).toBeGreaterThanOrEqual(-TOLERANCE_PX);
              expect(geometry.slotBottom).toBeLessThanOrEqual(
                geometry.viewportHeight + TOLERANCE_PX
              );
            } else expect(geometry.alignmentError).toBeLessThanOrEqual(TOLERANCE_PX);
            measurements.push({ action, ...geometry, controls, beforeScroll });

            const actionName =
              action === 'Undo'
                ? 'Undo'
                : action === 'Cancel'
                  ? 'Cancel changes'
                  : 'Save changes (Ctrl+S)';
            await footer.getByRole('button', { name: actionName, exact: true }).click();
            await expect(card.locator('.footer-slot.active')).toHaveCount(0);
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

test('two narrow cards retain independent room controls and release offscreen action rows', async ({
  page,
}) => {
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
  await expect(page.locator('#first-card .footer-slot.active')).toHaveCount(1);
  await expect(page.locator('#second-card .footer-slot.active')).toHaveCount(1);
  // The second card starts below the viewport, so its row stays in place.
  await expect(page.locator('#second-card .footer-slot[data-overlay]')).toHaveCount(0);
  // Scroll to the second card's lights: its action row is now above the viewport.
  await page.locator('#second-card').evaluate((card) => {
    const lights = card.shadowRoot!.querySelector('curve-legend')!;
    window.scrollTo(0, lights.getBoundingClientRect().top + window.scrollY);
  });
  // Only the card on screen pins its row; the scrolled-away card releases its own.
  await expect(page.locator('#first-card .footer-slot[data-overlay]')).toHaveCount(0);
  await expect(page.locator('#second-card .footer-slot[data-overlay]')).toHaveCount(1);
  await expect(page.locator('#first-card curve-scrubber input')).toHaveValue('25');
  await expect(page.locator('#second-card curve-scrubber input')).toHaveValue('75');
  await page.locator('#second-card').evaluate((card) => card.remove());
  await expect(page.locator('curve-scrubber')).toHaveCount(1);
  await expect(page.locator('curve-footer')).toHaveCount(1);
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
              pinned: root.querySelector('.footer-slot')!.hasAttribute('data-overlay'),
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
          // Room and the action row share the graph's column, so a shorter
          // graph narrows them with it.
          const stackWidth = Math.min(
            width - 2 * outerPadding,
            (graphHeight === '240px' ? 240 : 520) * (VB_W / VB_H)
          );
          expect(report.dockWidth).toBeCloseTo(stackWidth, 0);
          expect(report.rangeWidth).toBeCloseTo(report.dockWidth, 0);
          // A clean editor never pins its action row.
          expect(report.pinned).toBe(false);
          const proofPath = testInfo.outputPath('compact-geometry.json');
          writeFileSync(proofPath, JSON.stringify({ mode, width, graphHeight, ...report }));
          await testInfo.attach('compact-geometry', {
            path: proofPath,
            contentType: 'application/json',
          });
        });
      }
    }

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
                  visible: boolean;
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
                  visible: true,
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
              const overlay = root.querySelector<SVGRectElement>('rect[fill-opacity="0.93"]');
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
    await expect(panel.locator('#new-group-btn')).toHaveCSS('height', '44px');
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
      const select = root.querySelector<HTMLSelectElement>('#entity-select')!;
      const option = select.options[0];
      const entities = panel._lightenerEntities;
      const selected = panel._selectedEntity;
      const visible = (selector: string) =>
        getComputedStyle(root.querySelector(selector)!).display !== 'none';
      const report = [];
      select.focus();
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
          stable: root.querySelector('#entity-select') === select && select.options[0] === option,
          focused: root.activeElement === select,
        });
      }
      return report;
    });
    for (const result of states) {
      expect(result.status).toBe(result.state !== 'ready');
      expect(result.intro).toBe(['loading', 'empty', 'error'].includes(result.state));
      expect(result.stable).toBe(true);
      expect(result.focused).toBe(true);
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
