import { expect, test, type Page } from '@playwright/test';

type DemoState = {
  activeScenario: string | null;
  cardDarkScrubber: number | null;
  cardLightScrubber: number | null;
  cardDarkNames: string[];
  cardLightNames: string[];
  hintHidden: boolean;
  hintText: string;
  lightCountText: string;
  loading: boolean;
  simNames: string[];
  simSlider: number;
};

async function openDemo(page: Page): Promise<void> {
  await page.goto('/docs/index.html');
  await page.waitForFunction(() => {
    const light = document.querySelector('#card-light') as
      | (HTMLElement & { shadowRoot: ShadowRoot | null; _load?: { loading?: boolean } })
      | null;
    const dark = document.querySelector('#card-dark') as
      | (HTMLElement & { shadowRoot: ShadowRoot | null; _load?: { loading?: boolean } })
      | null;
    return (
      light?.shadowRoot?.querySelector('curve-scrubber') &&
      dark?.shadowRoot?.querySelector('curve-scrubber') &&
      !light._load?.loading &&
      !dark._load?.loading
    );
  });
}

async function readDemoState(page: Page): Promise<DemoState> {
  return page.evaluate(() => {
    type DemoCard = HTMLElement & {
      _curves?: Array<{ friendlyName?: string; entityId: string }>;
      _load?: { loading?: boolean };
      _scrubberPosition?: number | null;
    };

    const cardLight = document.querySelector('#card-light') as DemoCard | null;
    const cardDark = document.querySelector('#card-dark') as DemoCard | null;
    const simSlider = document.querySelector<HTMLInputElement>('#sim-brightness');
    const activeButton = document.querySelector<HTMLButtonElement>(
      '.scenario-btn[aria-pressed="true"]'
    );
    const hint = document.querySelector<HTMLElement>('#sim-room-scroll-hint');

    const cardNames = (card: DemoCard | null): string[] =>
      (card?._curves ?? []).map((curve) => curve.friendlyName ?? curve.entityId);

    return {
      activeScenario: activeButton?.dataset.scenario ?? null,
      cardDarkScrubber: cardDark?._scrubberPosition ?? null,
      cardLightScrubber: cardLight?._scrubberPosition ?? null,
      cardDarkNames: cardNames(cardDark),
      cardLightNames: cardNames(cardLight),
      hintHidden: hint?.hidden ?? true,
      hintText: hint?.textContent?.trim() ?? '',
      lightCountText: document.querySelector('#sim-room-count')?.textContent?.trim() ?? '',
      loading:
        document.querySelector('.demo-zone')?.classList.contains('scenario-loading') ?? false,
      simNames: Array.from(document.querySelectorAll('#sim-room .sim-name')).map(
        (node) => node.textContent?.trim() ?? ''
      ),
      simSlider: Number(simSlider?.value ?? NaN),
    };
  });
}

function sameNames(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

test.describe('GitHub Pages demo wrapper', () => {
  test('starts the simulated room and both real cards at the same group brightness', async ({
    page,
  }) => {
    await openDemo(page);

    const state = await readDemoState(page);

    expect(state.simSlider).toBe(72);
    expect(state.cardLightScrubber).toBe(72);
    expect(state.cardDarkScrubber).toBe(72);
    expect(state.lightCountText).toBe('3 lights');
  });

  test('shows a loading state while scenario surfaces can diverge', async ({ page }) => {
    await openDemo(page);

    await page.locator('.scenario-btn[data-scenario="long-ids"]').click();
    const immediate = await readDemoState(page);
    const alreadySettled =
      sameNames(immediate.simNames, immediate.cardLightNames) &&
      sameNames(immediate.simNames, immediate.cardDarkNames);

    expect(immediate.loading || alreadySettled).toBe(true);

    await page.waitForFunction(() => {
      type DemoCard = HTMLElement & {
        _curves?: Array<{ friendlyName?: string; entityId: string }>;
        _load?: { loading?: boolean };
      };
      const light = document.querySelector('#card-light') as DemoCard | null;
      const dark = document.querySelector('#card-dark') as DemoCard | null;
      const simNames = Array.from(document.querySelectorAll('#sim-room .sim-name')).map(
        (node) => node.textContent?.trim() ?? ''
      );
      const cardNames = (card: DemoCard | null): string[] =>
        (card?._curves ?? []).map((curve) => curve.friendlyName ?? curve.entityId);
      const sameNames = (left: string[], right: string[]): boolean =>
        left.length === right.length && left.every((name, index) => name === right[index]);
      return (
        !document.querySelector('.demo-zone')?.classList.contains('scenario-loading') &&
        !light?._load?.loading &&
        !dark?._load?.loading &&
        simNames[0]?.startsWith('Ground Floor Living Room') &&
        sameNames(simNames, cardNames(light)) &&
        sameNames(simNames, cardNames(dark))
      );
    });

    const settled = await readDemoState(page);
    expect(settled.activeScenario).toBe('long-ids');
  });

  test('makes the mobile 20-light scenario count and overflow affordance visible', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDemo(page);

    await page.locator('.scenario-btn[data-scenario="many"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('#sim-room-count')?.textContent?.trim() === '20 lights' &&
        !document.querySelector('.demo-zone')?.classList.contains('scenario-loading')
    );

    const state = await readDemoState(page);
    expect(state.simNames).toHaveLength(20);
    expect(state.lightCountText).toBe('20 lights');
    expect(state.hintHidden).toBe(false);
    expect(state.hintText).toContain('scroll inside the room preview');
  });

  test('keeps the fallback visible if the real card demo bundle fails', async ({ page }) => {
    await page.addInitScript(() => {
      (
        window as Window & { __LIGHTENER_DEMO_LOAD_TIMEOUT_MS__?: number }
      ).__LIGHTENER_DEMO_LOAD_TIMEOUT_MS__ = 100;
    });
    await page.route('**/fake-ha.js', (route) => route.abort());

    await page.goto('/docs/index.html');

    await expect(page.locator('#demo-load-error')).toBeVisible();
    await expect(page.locator('[data-fallback-card]').first()).toBeVisible();
    await expect(page.locator('.preview-container.hydrated')).toHaveCount(0);
  });
});
