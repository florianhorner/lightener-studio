import { expect, test } from '@playwright/test';
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
                typedCard as unknown as HTMLElement & {
                  _selectedCurveId: string;
                  requestUpdate: () => void;
                }
              )._selectedCurveId = firstEntityId;
              (
                typedCard as unknown as HTMLElement & {
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

test.describe('20-light short-screen editing actions', () => {
  for (const mode of MODES) {
    for (const width of [360, 1100]) {
      for (const height of [500, 650]) {
        test(`${mode} actions remain usable at ${width}x${height}`, async ({ page }, testInfo) => {
          await page.setViewportSize({ width, height });
          await page.goto(`/js/playwright/fixtures/long-name-card.html?mode=${mode}`);
          await page.evaluate(() => window.__LIGHTENER_CARD_READY__);

          const card = page.locator('lightener-curve-card');
          const rows = card.locator('curve-legend .row-select-btn');
          const footer = card.locator('curve-footer');
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
            for (const name of ['Undo', 'Cancel changes (Esc)', 'Save changes (Ctrl+S)']) {
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
              const graph = root.querySelector('.graph-panel')!.getBoundingClientRect();
              const scrubber = root.querySelector('curve-scrubber')!.getBoundingClientRect();
              return {
                overflow:
                  Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
                  document.documentElement.clientWidth,
                graphLeft: graph.left,
                graphRight: graph.right,
                scrubberLeft: scrubber.left,
                scrubberRight: scrubber.right,
                scrollY: window.scrollY,
              };
            });
            expect(geometry.overflow).toBeLessThanOrEqual(TOLERANCE_PX);
            expect(Math.abs(geometry.graphLeft - geometry.scrubberLeft)).toBeLessThanOrEqual(
              TOLERANCE_PX
            );
            expect(Math.abs(geometry.graphRight - geometry.scrubberRight)).toBeLessThanOrEqual(
              TOLERANCE_PX
            );
            measurements.push({ action, ...geometry, controls, beforeScroll });

            const actionName =
              action === 'Undo'
                ? 'Undo'
                : action === 'Cancel'
                  ? 'Cancel changes (Esc)'
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
          const report = await page.evaluate(
            async ({ width, graphHeight }) => {
              const card = window.__LIGHTENER_CARD_ELEMENT__!;
              card.style.width = `${width}px`;
              if (graphHeight) card.style.setProperty('--curve-graph-max-height', graphHeight);
              await card.updateComplete;
              await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve))
              );
              const root = card.renderRoot;
              const graph = root.querySelector('curve-graph')!;
              const plot = graph.shadowRoot!.querySelector<SVGRectElement>('.plot-frame')!;
              const box = plot.getBBox();
              const matrix = plot.getScreenCTM()!;
              const left = new DOMPoint(box.x, box.y).matrixTransform(matrix).x;
              const right = new DOMPoint(box.x + box.width, box.y).matrixTransform(matrix).x;
              const track = root
                .querySelector('curve-scrubber')!
                .shadowRoot!.querySelector('.track-area')!
                .getBoundingClientRect();
              return {
                width: card.getBoundingClientRect().width,
                outerPadding: getComputedStyle(root.querySelector('.card')!).paddingLeft,
                graphPadding: getComputedStyle(root.querySelector('.graph-panel')!).paddingLeft,
                headerMargin: getComputedStyle(root.querySelector('.header')!).marginBottom,
                graphHeight: graph.shadowRoot!.querySelector('svg')!.getBoundingClientRect().height,
                alignmentError: Math.max(
                  Math.abs(left - track.left),
                  Math.abs(right - track.right)
                ),
              };
            },
            { width, graphHeight }
          );
          expect(report.width).toBe(width);
          expect(report.outerPadding).toBe(width <= 500 ? '12px' : '20px');
          expect(report.graphPadding).toBe(width <= 500 ? '12px' : '14px');
          expect(report.headerMargin).toBe(
            width <= 500 ? '8px' : mode === 'sidebar' ? '12px' : '16px'
          );
          const outerPadding = width <= 500 ? 12 : 20;
          const graphPadding = width <= 500 ? 12 : 14;
          const expectedHeight = Math.min(
            (width - 2 * outerPadding - 2 * graphPadding) * (VB_H / VB_W),
            graphHeight === '240px' ? 240 : 320
          );
          expect(Math.abs(report.graphHeight - expectedHeight)).toBeLessThan(0.05);
          if (width <= 500) expect(report.alignmentError).toBeLessThanOrEqual(1);
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
    await expect(intro).toBeVisible();
    await expect(status).toBeVisible();
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
