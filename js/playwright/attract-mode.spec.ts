import { expect, test } from '@playwright/test';

const demos = [
  { path: '/docs/index.html?attract=1', slider: '#sim-brightness', initial: 72 },
  { path: '/docs/color-temp-demo.html?attract=1', slider: '#master', initial: 45 },
] as const;

for (const demo of demos) {
  test.describe(`attract mode: ${demo.path}`, () => {
    test('auto-moves before any interaction', async ({ page }) => {
      await page.goto(demo.path);

      const slider = page.locator(demo.slider);
      await expect
        .poll(
          async () => {
            const value = Number(await slider.inputValue());
            const ghostCount = await page.locator('#attract-ghost').count();
            return value !== demo.initial && ghostCount > 0;
          },
          { timeout: 4000 }
        )
        .toBe(true);
    });

    test('freezes on takeover', async ({ page }) => {
      await page.goto(demo.path);

      const slider = page.locator(demo.slider);
      await expect
        .poll(async () => Number(await slider.inputValue()) !== demo.initial, {
          timeout: 4000,
        })
        .toBe(true);

      const box = await slider.boundingBox();
      expect(box).not.toBeNull();
      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await page.mouse.down();

      await expect
        .poll(async () => page.locator('#attract-ghost').count(), { timeout: 800 })
        .toBe(0);

      const frozen1 = Number(await slider.inputValue());
      await page.waitForTimeout(700);
      const frozen2 = Number(await slider.inputValue());
      expect(frozen1).toBe(frozen2);

      await slider.fill('33');
      await expect(slider).toHaveValue('33');
    });

    test('respects reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(demo.path);

      const slider = page.locator(demo.slider);
      await page.waitForTimeout(2500);

      await expect(slider).toHaveValue(String(demo.initial));
      await expect(page.locator('#attract-ghost')).toHaveCount(0);
    });
  });
}
