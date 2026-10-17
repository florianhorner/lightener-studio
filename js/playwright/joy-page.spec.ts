import { expect, test, type Page } from '@playwright/test';

async function openEditor(page: Page): Promise<void> {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.goto('/docs/joy.html');
  await page.locator('#real-editor').scrollIntoViewIfNeeded();
  await expect(page.locator('curve-graph')).toBeVisible();
  await page.waitForFunction(() => {
    const legend = document
      .querySelector('lightener-curve-card')
      ?.shadowRoot?.querySelector<HTMLElement>('curve-legend');
    return Boolean(legend?.style.minHeight);
  });
  await page
    .locator('curve-graph')
    .evaluate((graph) => graph.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

test.describe('Joy moments page', () => {
  for (const width of [1440, 768, 390]) {
    // Regression: adding lights and switching dirty state resized the page footer.
    // Evidence and reproduction: docs/validation/joy-page.md.
    test(`keeps autoplay layout and focus still at ${width}px`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await openEditor(page);
      if (width === 1440) {
        await page.evaluate(() =>
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })
        );
      }

      const result = await page.evaluate(async () => {
        const host = document.querySelector<HTMLElement>('#real-host')!;
        const root = host.querySelector('lightener-curve-card')!.shadowRoot!;
        const card = root.querySelector<HTMLElement>('.card')!;
        const graph = root.querySelector('curve-graph') as HTMLElement & {
          curves: unknown[];
        };
        const links = document.querySelector('.editor-links')!;
        const focus = document.activeElement;
        let focusChanged = false;
        const onFocus = () => {
          focusChanged = true;
        };
        document.addEventListener('focusin', onFocus, true);
        const samples: number[][] = [];
        const counts = new Set<number>();
        let previousCount = graph.curves.length;
        let resets = 0;
        const start = performance.now();
        while (performance.now() - start < 26_000) {
          const count = graph.curves.length;
          if (previousCount === 5 && count === 3) resets++;
          previousCount = count;
          counts.add(count);
          samples.push([
            scrollY,
            card.getBoundingClientRect().height,
            links.getBoundingClientRect().top + scrollY,
            graph.getBoundingClientRect().top + scrollY,
          ]);
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
        document.removeEventListener('focusin', onFocus, true);
        return {
          deltas: [0, 1, 2, 3].map(
            (i) => Math.max(...samples.map((s) => s[i])) - Math.min(...samples.map((s) => s[i]))
          ),
          counts: [...counts].sort(),
          resets,
          focusChanged: focusChanged || document.activeElement !== focus,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });

      expect(result.counts).toEqual([3, 4, 5]);
      expect(result.resets).toBeGreaterThanOrEqual(2);
      for (const delta of result.deltas) expect(delta).toBeLessThanOrEqual(1);
      expect(result.focusChanged).toBe(false);
      expect(result.overflow).toBe(false);
      expect(errors).toEqual([]);

      const point = page.locator('curve-graph .hit-circle[data-point="1"]').first();
      await point.click();
      await expect(page.locator('#real-host')).toHaveAttribute('data-demo-owned', 'true');
      await expect(page.locator('#real-host')).toHaveAttribute('data-demo-running', 'false');
    });
  }

  test('respects reduced motion while keeping manual additions available', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openEditor(page);
    await expect(page.locator('#real-host')).toHaveAttribute('data-demo-running', 'false');
    await expect(page.locator('#reduce')).toBeChecked();
    await expect(page.locator('#reduce')).toBeDisabled();
    await expect(page.locator('#demo-playback')).toBeDisabled();
    await page.locator('[data-demo-action="add"]').click();
    await expect
      .poll(() =>
        page
          .locator('curve-graph')
          .evaluate((graph) => (graph as HTMLElement & { curves: unknown[] }).curves.length)
      )
      .toBe(4);
  });
});
