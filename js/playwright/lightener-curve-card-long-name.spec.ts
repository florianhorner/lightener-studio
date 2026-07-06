import { expect, test } from '@playwright/test';

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
    footerBeforeSideRail: boolean | null;
  };
  layoutContracts: {
    workspaceWidth: number;
    mainStackWidth: number;
    sideRailWidth: number;
    graphPanelWidth: number;
    scrubberWidth: number;
    footerSlotWidth: number;
    twoColumnLayout: boolean;
    firstNameBlockWidth: number | null;
  };
  failures: string[];
};

type FixtureMode = 'standalone' | 'lovelace' | 'sidebar';

const WIDTHS = [320, 500, 700, 860, 900, 1100] as const;
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

test.describe('20-light long-name curve card layout', () => {
  for (const mode of MODES) {
    for (const width of WIDTHS) {
      test(`${mode} mode does not horizontally overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: HEIGHT });
        await page.goto(`/js/playwright/fixtures/long-name-card.html?mode=${mode}`);
        await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

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
            const footerSlot = typedCard.shadowRoot.querySelector('.footer-slot');
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

            const graphPanelBox = rect('graph panel', graphPanel, cardBox);
            const mainStackBox = rect('main stack', mainStack, cardBox);
            const sideRailBox = rect('side rail', sideRail, cardBox);
            const footerSlotBox = rect('footer slot', footerSlot, cardBox);
            rect('curve-graph', graph, graphPanelBox);
            rect('curve-legend', legend, sideRailBox);
            const scrubberBox = rect('curve-scrubber', scrubber, mainStackBox);
            const footer = typedCard.shadowRoot.querySelector('curve-footer') as
              | (HTMLElement & { shadowRoot: ShadowRoot | null })
              | null;
            if (!footer?.shadowRoot) {
              throw new Error('curve-footer must render a shadow root');
            }
            rect('curve-footer', footer, footerSlotBox);
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
                '.brightness-value',
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

            const firstEntityId =
              legendItems[0]?.querySelector('.entity-id')?.getAttribute('title') ?? null;
            if (!firstEntityId) {
              failures.push('first legend item did not expose an entity-id title');
            } else {
              (
                typedCard as HTMLElement & {
                  _selectedCurveId: string;
                  requestUpdate: () => void;
                }
              )._selectedCurveId = firstEntityId;
              (
                typedCard as HTMLElement & {
                  requestUpdate: () => void;
                }
              ).requestUpdate();
            }
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
            const brightnessValue = legendItems[0]?.querySelector('.brightness-value');
            if (brightnessValue) {
              expectEllipsisStyles('.brightness-value', brightnessValue);
              const minWidth = parseFloat(window.getComputedStyle(brightnessValue).minWidth);
              if (!Number.isFinite(minWidth) || minWidth < 34) {
                failures.push(`.brightness-value min-width ${minWidth} is less than 34px`);
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
            // Embedded (sidebar) mode no longer overrides the graph height vars,
            // so every surface should fall through to the 320px component default
            // and render a non-collapsed graph.
            const graphSvg = graph.shadowRoot.querySelector('svg');
            const graphSvgMaxHeight = graphSvg ? window.getComputedStyle(graphSvg).maxHeight : null;
            const graphRenderedHeight = graphSvg ? graphSvg.getBoundingClientRect().height : 0;
            const workspaceStyle = window.getComputedStyle(workspace);
            const columnCount = workspaceStyle.gridTemplateColumns
              .split(' ')
              .filter(Boolean).length;
            const twoColumnLayout =
              columnCount === 2 && sideRailBox.left >= mainStackBox.right - tolerance;
            if (Math.abs(graphPanelBox.width - scrubberBox.width) > tolerance) {
              failures.push(
                `graph and scrubber widths diverge: graph=${graphPanelBox.width.toFixed(
                  2
                )} scrubber=${scrubberBox.width.toFixed(2)}`
              );
            }
            if (footerSlotBox.width + tolerance < workspace.getBoundingClientRect().width) {
              failures.push(
                `footer should span workspace: footer=${footerSlotBox.width.toFixed(
                  2
                )} workspace=${workspace.getBoundingClientRect().width.toFixed(2)}`
              );
            }
            if (twoColumnLayout) {
              if (sideRailBox.width < 360) {
                failures.push(`two-column side rail too narrow: ${sideRailBox.width.toFixed(2)}px`);
              }
              if (sideRailBox.width < mainStackBox.width * 0.75) {
                failures.push(
                  `two-column split starves side rail: main=${mainStackBox.width.toFixed(
                    2
                  )} side=${sideRailBox.width.toFixed(2)}`
                );
              }
              if (firstNameBlockWidth !== null && firstNameBlockWidth < 200) {
                failures.push(
                  `long-name text column too narrow after layout split: ${firstNameBlockWidth.toFixed(
                    2
                  )}px`
                );
              }
            }
            let footerBeforeSideRail: boolean | null = null;
            if (mode === 'sidebar' && !twoColumnLayout) {
              const footerTop = footerSlot.getBoundingClientRect().top;
              const sideRailTop = sideRail.getBoundingClientRect().top;
              footerBeforeSideRail = footerTop <= sideRailTop + tolerance;
              if (!footerBeforeSideRail) {
                failures.push(
                  `sidebar footer should appear before side rail: footerTop=${footerTop.toFixed(
                    2
                  )} sideRailTop=${sideRailTop.toFixed(2)}`
                );
              }
            }
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
                footerBeforeSideRail,
              },
              layoutContracts: {
                workspaceWidth: workspace.getBoundingClientRect().width,
                mainStackWidth: mainStackBox.width,
                sideRailWidth: sideRailBox.width,
                graphPanelWidth: graphPanelBox.width,
                scrubberWidth: scrubberBox.width,
                footerSlotWidth: footerSlotBox.width,
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
        expect(report.graphContracts.graphSvgMaxHeight).toBe('320px');
        expect(report.graphContracts.graphRenderedHeight).toBeGreaterThan(0);
        if (mode === 'sidebar' && width >= 1100) {
          expect(report.sidebarContracts.columnCount).toBe(2);
        }
        if (mode === 'sidebar' && !report.layoutContracts.twoColumnLayout) {
          expect(report.sidebarContracts.footerBeforeSideRail).toBe(true);
        }
        expect(
          Math.abs(report.layoutContracts.graphPanelWidth - report.layoutContracts.scrubberWidth)
        ).toBeLessThanOrEqual(TOLERANCE_PX);
        expect(report.layoutContracts.footerSlotWidth).toBeGreaterThanOrEqual(
          report.layoutContracts.workspaceWidth - TOLERANCE_PX
        );
        expect(report.failures).toEqual([]);
        expect(report.documentWidth).toBeLessThanOrEqual(report.viewportWidth + TOLERANCE_PX);
        expect(report.cardWidth).toBeLessThanOrEqual(report.viewportWidth + TOLERANCE_PX);
      });
    }
  }
});

test.describe('20-light sidebar short viewport action footer', () => {
  for (const viewport of SHORT_SIDEBAR_VIEWPORTS) {
    test(`dirty footer stays reachable at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/js/playwright/fixtures/long-name-card.html?mode=sidebar');
      await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

      const report = await page.evaluate(
        async ({ tolerance }) => {
          const failures: string[] = [];
          window.scrollTo(0, 0);

          const card = window.__LIGHTENER_CARD_ELEMENT__;
          if (!card?.shadowRoot) throw new Error('lightener-curve-card did not render');

          const graphPanel = card.shadowRoot.querySelector('.graph-panel');
          const mainStack = card.shadowRoot.querySelector('.main-stack');
          const sideRail = card.shadowRoot.querySelector('.side-rail');
          const footerSlot = card.shadowRoot.querySelector('.footer-slot');
          const workspace = card.shadowRoot.querySelector('.workspace');
          const graph = card.shadowRoot.querySelector('curve-graph') as
            | (HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot | null })
            | null;
          const scrubber = card.shadowRoot.querySelector('curve-scrubber') as
            | (HTMLElement & { updateComplete: Promise<unknown> })
            | null;
          const legend = card.shadowRoot.querySelector('curve-legend') as
            | (HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot | null })
            | null;
          if (
            !graphPanel ||
            !mainStack ||
            !sideRail ||
            !footerSlot ||
            !workspace ||
            !graph?.shadowRoot ||
            !scrubber ||
            !legend?.shadowRoot
          ) {
            throw new Error('card layout regions did not render');
          }

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
            card.updateComplete,
            graph.updateComplete,
            scrubber.updateComplete,
            legend.updateComplete,
          ]);
          await new Promise(requestAnimationFrame);

          const footer = card.shadowRoot.querySelector('curve-footer') as
            | (HTMLElement & { shadowRoot: ShadowRoot | null })
            | null;
          const footerControls = footer?.shadowRoot?.querySelector('.footer') ?? null;
          if (!footer?.shadowRoot || !footerControls) {
            throw new Error('active footer controls did not render');
          }

          const viewportHeight = document.documentElement.clientHeight;
          const graphPanelBox = graphPanel.getBoundingClientRect();
          const mainStackBox = mainStack.getBoundingClientRect();
          const sideRailBox = sideRail.getBoundingClientRect();
          const footerSlotBox = footerSlot.getBoundingClientRect();
          const footerBox = footer.getBoundingClientRect();
          const footerControlsBox = footerControls.getBoundingClientRect();
          const workspaceBox = workspace.getBoundingClientRect();
          const footerStyle = window.getComputedStyle(footerSlot);
          const columnCount = window
            .getComputedStyle(workspace)
            .gridTemplateColumns.split(' ')
            .filter(Boolean).length;
          const twoColumnLayout =
            columnCount === 2 && sideRailBox.left >= mainStackBox.right - tolerance;
          const graphInView =
            graphPanelBox.top < viewportHeight - tolerance && graphPanelBox.bottom > tolerance;
          const footerInView =
            footerSlotBox.top < viewportHeight - tolerance &&
            footerSlotBox.bottom <= viewportHeight + tolerance &&
            footerBox.top < viewportHeight - tolerance &&
            footerBox.bottom <= viewportHeight + tolerance &&
            footerControlsBox.top < viewportHeight - tolerance &&
            footerControlsBox.bottom <= viewportHeight + tolerance;

          if (!twoColumnLayout && workspaceBox.width >= 860) {
            failures.push(`short viewport should exercise two columns, got ${columnCount}`);
          }
          if (!graphInView) {
            failures.push(
              `graph is not visible: top=${graphPanelBox.top.toFixed(
                2
              )} bottom=${graphPanelBox.bottom.toFixed(2)} viewport=${viewportHeight}`
            );
          }
          if (!footerSlot.classList.contains('active')) {
            failures.push('footer slot should be active after dirtying the card');
          }
          if (!footerSlot.hasAttribute('data-overlay')) {
            failures.push('short viewport should use the fixed footer overlay');
          }
          if (footerStyle.position !== 'fixed') {
            failures.push(
              `footer should be fixed on the overlay path, got ${footerStyle.position}`
            );
          }
          if (!footerInView) {
            failures.push(
              `footer is not reachable: slotTop=${footerSlotBox.top.toFixed(
                2
              )} slotBottom=${footerSlotBox.bottom.toFixed(
                2
              )} controlsBottom=${footerControlsBox.bottom.toFixed(2)} viewport=${viewportHeight}`
            );
          }
          if (footerSlotBox.width + tolerance < workspaceBox.width) {
            failures.push(
              `active footer should span workspace: footer=${footerSlotBox.width.toFixed(
                2
              )} workspace=${workspaceBox.width.toFixed(2)}`
            );
          }

          return {
            viewportHeight,
            columnCount,
            twoColumnLayout,
            graphPanel: {
              top: graphPanelBox.top,
              bottom: graphPanelBox.bottom,
            },
            footerSlot: {
              top: footerSlotBox.top,
              bottom: footerSlotBox.bottom,
              width: footerSlotBox.width,
            },
            footerOverlay: footerSlot.hasAttribute('data-overlay'),
            footerPosition: footerStyle.position,
            workspaceWidth: workspaceBox.width,
            failures,
          };
        },
        { tolerance: TOLERANCE_PX }
      );

      if (viewport.width >= 1100) {
        expect(report.twoColumnLayout).toBe(true);
      }
      expect(report.footerSlot.bottom).toBeLessThanOrEqual(report.viewportHeight + TOLERANCE_PX);
      expect(report.footerSlot.width).toBeGreaterThanOrEqual(report.workspaceWidth - TOLERANCE_PX);
      expect(report.footerOverlay).toBe(true);
      expect(report.footerPosition).toBe('fixed');
      expect(report.failures).toEqual([]);
    });
  }
});

test('sidebar widescreen keeps selected-light chips and dirty footer inside the card rail', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1254, height: 847 });
  await page.goto('/js/playwright/fixtures/long-name-card.html?mode=sidebar');
  await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

  const report = await page.evaluate(
    async ({ tolerance }) => {
      const failures: string[] = [];
      window.scrollTo(0, 0);

      const card = window.__LIGHTENER_CARD_ELEMENT__;
      if (!card?.shadowRoot) throw new Error('lightener-curve-card did not render');

      const graphPanel = card.shadowRoot.querySelector('.graph-panel');
      const footerSlot = card.shadowRoot.querySelector('.footer-slot');
      const workspace = card.shadowRoot.querySelector('.workspace');
      const graph = card.shadowRoot.querySelector('curve-graph') as
        | (HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot | null })
        | null;
      const scrubber = card.shadowRoot.querySelector('curve-scrubber') as
        | (HTMLElement & { updateComplete: Promise<unknown> })
        | null;
      const legend = card.shadowRoot.querySelector('curve-legend') as
        | (HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot | null })
        | null;
      if (
        !graphPanel ||
        !footerSlot ||
        !workspace ||
        !graph?.shadowRoot ||
        !scrubber ||
        !legend?.shadowRoot
      ) {
        throw new Error('card layout regions did not render');
      }

      const firstLight = legend.shadowRoot.querySelector<HTMLElement>('.row-select-btn');
      if (!firstLight) throw new Error('fixture did not render a selectable light row');
      firstLight.click();
      await Promise.all([card.updateComplete, legend.updateComplete, graph.updateComplete]);

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
        card.updateComplete,
        graph.updateComplete,
        scrubber.updateComplete,
        legend.updateComplete,
      ]);
      await new Promise(requestAnimationFrame);

      const maxScroll = Math.max(
        0,
        Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) -
          window.innerHeight
      );
      window.scrollTo(0, Math.min(80, maxScroll));
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const chipBar = card.shadowRoot.querySelector('.shape-chip-bar');
      const chipButtons = Array.from(card.shadowRoot.querySelectorAll('.preset-option'));
      const footer = card.shadowRoot.querySelector('curve-footer') as
        | (HTMLElement & { shadowRoot: ShadowRoot | null })
        | null;
      const footerControls = footer?.shadowRoot?.querySelector('.footer') ?? null;
      if (!chipBar || chipButtons.length === 0 || !footer?.shadowRoot || !footerControls) {
        throw new Error('selected-light chips and active footer must render');
      }

      const viewportHeight = document.documentElement.clientHeight;
      const graphPanelBox = graphPanel.getBoundingClientRect();
      const chipBarBox = chipBar.getBoundingClientRect();
      const chipButtonBoxes = chipButtons.map((button) => button.getBoundingClientRect());
      const footerSlotBox = footerSlot.getBoundingClientRect();
      const footerBox = footer.getBoundingClientRect();
      const footerControlsBox = footerControls.getBoundingClientRect();
      const workspaceBox = workspace.getBoundingClientRect();
      const footerStyle = window.getComputedStyle(footerSlot);

      if (
        chipBarBox.left < graphPanelBox.left - tolerance ||
        chipBarBox.right > graphPanelBox.right + tolerance
      ) {
        failures.push(
          `shape chip bar escapes graph panel: chips=${chipBarBox.left.toFixed(
            2
          )}-${chipBarBox.right.toFixed(2)} panel=${graphPanelBox.left.toFixed(
            2
          )}-${graphPanelBox.right.toFixed(2)}`
        );
      }
      for (const [idx, box] of chipButtonBoxes.entries()) {
        if (box.left < chipBarBox.left - tolerance || box.right > chipBarBox.right + tolerance) {
          failures.push(
            `shape chip ${idx} escapes chip bar: chip=${box.left.toFixed(2)}-${box.right.toFixed(
              2
            )} bar=${chipBarBox.left.toFixed(2)}-${chipBarBox.right.toFixed(2)}`
          );
        }
      }
      if (footerSlot.hasAttribute('data-overlay')) {
        failures.push('widescreen footer should stay in the sticky card rail, not fixed overlay');
      }
      if (footerStyle.position !== 'sticky') {
        failures.push(`widescreen footer should be sticky, got ${footerStyle.position}`);
      }
      if (
        footerSlotBox.left < workspaceBox.left - tolerance ||
        footerSlotBox.right > workspaceBox.right + tolerance ||
        Math.abs(footerSlotBox.width - workspaceBox.width) > tolerance
      ) {
        failures.push(
          `footer rail is misaligned: footer=${footerSlotBox.left.toFixed(
            2
          )}-${footerSlotBox.right.toFixed(2)} workspace=${workspaceBox.left.toFixed(
            2
          )}-${workspaceBox.right.toFixed(2)}`
        );
      }
      if (
        footerSlotBox.bottom > viewportHeight + tolerance ||
        footerBox.bottom > viewportHeight + tolerance ||
        footerControlsBox.bottom > viewportHeight + tolerance
      ) {
        failures.push(
          `sticky footer is not reachable after scroll: slotBottom=${footerSlotBox.bottom.toFixed(
            2
          )} controlsBottom=${footerControlsBox.bottom.toFixed(2)} viewport=${viewportHeight}`
        );
      }

      return {
        scrollY: window.scrollY,
        chipButtonCount: chipButtons.length,
        footerOverlay: footerSlot.hasAttribute('data-overlay'),
        footerPosition: footerStyle.position,
        footerSlot: {
          left: footerSlotBox.left,
          right: footerSlotBox.right,
          bottom: footerSlotBox.bottom,
          width: footerSlotBox.width,
        },
        workspace: {
          left: workspaceBox.left,
          right: workspaceBox.right,
          width: workspaceBox.width,
        },
        failures,
      };
    },
    { tolerance: TOLERANCE_PX }
  );

  expect(report.scrollY).toBeGreaterThan(0);
  expect(report.chipButtonCount).toBe(4);
  expect(report.footerOverlay).toBe(false);
  expect(report.footerPosition).toBe('sticky');
  expect(report.footerSlot.width).toBeCloseTo(report.workspace.width, 0);
  expect(report.failures).toEqual([]);
});

test('sidebar tall viewport keeps the sticky footer reachable with the compact rail', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: HEIGHT });
  await page.goto('/js/playwright/fixtures/long-name-card.html?mode=sidebar');
  await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

  const report = await page.evaluate(
    async ({ tolerance }) => {
      const failures: string[] = [];
      window.scrollTo(0, 0);

      const card = window.__LIGHTENER_CARD_ELEMENT__;
      if (!card?.shadowRoot) throw new Error('lightener-curve-card did not render');

      const editorColumn = card.shadowRoot.querySelector('.editor-column');
      const mainStack = card.shadowRoot.querySelector('.main-stack');
      const sideRail = card.shadowRoot.querySelector('.side-rail');
      const footerSlot = card.shadowRoot.querySelector('.footer-slot');
      const workspace = card.shadowRoot.querySelector('.workspace');
      const graph = card.shadowRoot.querySelector('curve-graph') as
        | (HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot | null })
        | null;
      const scrubber = card.shadowRoot.querySelector('curve-scrubber') as
        | (HTMLElement & { updateComplete: Promise<unknown> })
        | null;
      const legend = card.shadowRoot.querySelector('curve-legend') as
        | (HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot | null })
        | null;
      if (
        !editorColumn ||
        !mainStack ||
        !sideRail ||
        !footerSlot ||
        !workspace ||
        !graph?.shadowRoot ||
        !scrubber ||
        !legend?.shadowRoot
      ) {
        throw new Error('card layout regions did not render');
      }

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
        card.updateComplete,
        graph.updateComplete,
        scrubber.updateComplete,
        legend.updateComplete,
      ]);
      await new Promise(requestAnimationFrame);

      const footer = card.shadowRoot.querySelector('curve-footer') as
        | (HTMLElement & { shadowRoot: ShadowRoot | null })
        | null;
      const footerControls = footer?.shadowRoot?.querySelector('.footer') ?? null;
      if (!footer?.shadowRoot || !footerControls) {
        throw new Error('active footer controls did not render');
      }

      const workspaceBox = workspace.getBoundingClientRect();
      const mainStackBox = mainStack.getBoundingClientRect();
      const sideRailBox = sideRail.getBoundingClientRect();
      const editorColumnBox = editorColumn.getBoundingClientRect();
      const columnCount = window
        .getComputedStyle(workspace)
        .gridTemplateColumns.split(' ')
        .filter(Boolean).length;
      const twoColumnLayout =
        columnCount === 2 && sideRailBox.left >= mainStackBox.right - tolerance;
      const sideRailStaysCompact = sideRailBox.height <= editorColumnBox.height + 120;
      const maxScroll =
        Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) -
        window.innerHeight;
      const targetScroll = Math.min(520, Math.max(0, maxScroll));

      window.scrollTo(0, targetScroll);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const viewportHeight = document.documentElement.clientHeight;
      const scrolledFooterSlotBox = footerSlot.getBoundingClientRect();
      const scrolledFooterBox = footer.getBoundingClientRect();
      const scrolledFooterControlsBox = footerControls.getBoundingClientRect();
      const footerStyle = window.getComputedStyle(footerSlot);
      const footerInView =
        scrolledFooterSlotBox.top < viewportHeight - tolerance &&
        scrolledFooterSlotBox.bottom <= viewportHeight + tolerance &&
        scrolledFooterBox.top < viewportHeight - tolerance &&
        scrolledFooterBox.bottom <= viewportHeight + tolerance &&
        scrolledFooterControlsBox.top < viewportHeight - tolerance &&
        scrolledFooterControlsBox.bottom <= viewportHeight + tolerance;

      if (!twoColumnLayout) {
        failures.push(`tall sidebar should exercise two columns, got ${columnCount}`);
      }
      if (!sideRailStaysCompact) {
        failures.push(
          `side rail should stay compact without selected-light shapes: side=${sideRailBox.height.toFixed(
            2
          )} editor=${editorColumnBox.height.toFixed(2)}`
        );
      }
      if (footerSlot.hasAttribute('data-overlay')) {
        failures.push('tall viewport should use sticky footer, not fixed overlay');
      }
      if (footerStyle.position !== 'sticky') {
        failures.push(`footer should stay on sticky path, got ${footerStyle.position}`);
      }
      if (!footerInView) {
        failures.push(
          `sticky footer is not reachable after scroll: top=${scrolledFooterSlotBox.top.toFixed(
            2
          )} bottom=${scrolledFooterSlotBox.bottom.toFixed(2)} viewport=${viewportHeight}`
        );
      }
      if (scrolledFooterSlotBox.width + tolerance < workspaceBox.width) {
        failures.push(
          `active footer should span workspace after scroll: footer=${scrolledFooterSlotBox.width.toFixed(
            2
          )} workspace=${workspaceBox.width.toFixed(2)}`
        );
      }

      return {
        viewportHeight,
        scrollY: window.scrollY,
        twoColumnLayout,
        sideRailHeight: sideRailBox.height,
        editorColumnHeight: editorColumnBox.height,
        footerPosition: footerStyle.position,
        footerOverlay: footerSlot.hasAttribute('data-overlay'),
        footerSlot: {
          top: scrolledFooterSlotBox.top,
          bottom: scrolledFooterSlotBox.bottom,
          width: scrolledFooterSlotBox.width,
        },
        workspaceWidth: workspaceBox.width,
        failures,
      };
    },
    { tolerance: TOLERANCE_PX }
  );

  expect(report.twoColumnLayout).toBe(true);
  expect(report.sideRailHeight).toBeLessThanOrEqual(report.editorColumnHeight + 120);
  expect(report.scrollY).toBeGreaterThanOrEqual(0);
  expect(report.footerOverlay).toBe(false);
  expect(report.footerPosition).toBe('sticky');
  expect(report.footerSlot.bottom).toBeLessThanOrEqual(report.viewportHeight + TOLERANCE_PX);
  expect(report.footerSlot.width).toBeGreaterThanOrEqual(report.workspaceWidth - TOLERANCE_PX);
  expect(report.failures).toEqual([]);
});

test('graph-height overrides keep the graph and scrubber cap aligned', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: HEIGHT });
  await page.goto('/js/playwright/fixtures/long-name-card.html?mode=standalone');
  await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

  const measure = async (value: string) =>
    page.evaluate(
      async ({ value, tolerance }) => {
        const card = window.__LIGHTENER_CARD_ELEMENT__;
        if (!card?.shadowRoot) throw new Error('lightener-curve-card did not render');
        card.style.setProperty('--curve-graph-max-height', value);
        await card.updateComplete;

        const graphPanel = card.shadowRoot.querySelector('.graph-panel');
        const graph = card.shadowRoot.querySelector('curve-graph') as
          | (HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot | null })
          | null;
        const scrubber = card.shadowRoot.querySelector('curve-scrubber') as
          | (HTMLElement & { updateComplete: Promise<unknown> })
          | null;
        if (!graphPanel || !graph?.shadowRoot || !scrubber) {
          throw new Error('graph and scrubber did not render');
        }
        await Promise.all([graph.updateComplete, scrubber.updateComplete]);

        const svg = graph.shadowRoot.querySelector('svg');
        const graphPanelWidth = graphPanel.getBoundingClientRect().width;
        const scrubberWidth = scrubber.getBoundingClientRect().width;
        const aligned = Math.abs(graphPanelWidth - scrubberWidth) <= tolerance;
        return {
          graphMaxHeight: svg ? window.getComputedStyle(svg).maxHeight : null,
          graphPanelWidth,
          scrubberWidth,
          aligned,
        };
      },
      { value, tolerance: TOLERANCE_PX }
    );

  const validOverride = await measure('240px');
  expect(validOverride.graphMaxHeight).toBe('240px');
  expect(validOverride.aligned).toBe(true);

  const invalidOverride = await measure('not-a-size');
  expect(invalidOverride.graphMaxHeight).toBe('320px');
  expect(invalidOverride.aligned).toBe(true);
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
  }
}
