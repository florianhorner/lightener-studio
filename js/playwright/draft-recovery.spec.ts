import { expect, test, type Page } from '@playwright/test';
const fixture = '/js/playwright/fixtures/draft-recovery.html';
async function ready(page: Page) {
  await expect(
    page.locator('lightener-curve-card curve-legend .legend-item').first()
  ).toBeVisible();
}
async function edit(page: Page) {
  const card = page.locator('lightener-curve-card').first();
  const row = card.locator('curve-legend .row-select-btn').first();
  if ((await row.getAttribute('aria-pressed')) !== 'true') await row.click();
  await card.locator('[data-preset="dim_accent"]').click();
}
async function state(page: Page) {
  return page.evaluate(() => {
    const proof = (window as any).__DRAFT_PROOF__,
      card = proof.card;
    return {
      draft: card?._curves,
      undo: card?._undoStack,
      dirty: card?.dirty,
      calls: proof.calls,
      services: proof.services,
      instances: proof.instances.length,
      storage: proof.storageWrites,
    };
  });
}
for (const surface of ['dashboard', 'sidebar'])
  test(`${surface}: true route replacement and Back/Forward explicitly recover exact draft and Undo`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${fixture}?surface=${surface}`);
    await ready(page);
    await edit(page);
    const before = await state(page);
    await page.locator('#overview').click();
    await expect(page.locator('lightener-curve-card')).toHaveCount(0);
    await page.goBack();
    await ready(page);
    expect((await state(page)).instances).toBeGreaterThan(before.instances);
    expect((await state(page)).dirty).toBe(false);
    await page.getByRole('button', { name: 'Recover draft', exact: true }).click();
    await expect.poll(async () => (await state(page)).dirty).toBe(true);
    const recovered = await state(page);
    expect(recovered.draft).toEqual(before.draft);
    expect(recovered.undo).toEqual(before.undo);
    expect(recovered.services).toEqual([]);
    expect(recovered.calls.filter((m: any) => m.type === 'lightener/save_curves')).toEqual([]);
    await page.screenshot({ path: info.outputPath(`${surface}-recovered.png`), fullPage: true });
    await page.goForward();
    await expect(page.locator('lightener-curve-card')).toHaveCount(0);
    await page.goBack();
    await ready(page);
    await expect(page.getByRole('button', { name: 'Recover draft', exact: true })).toBeVisible();
    expect(
      (await state(page)).storage.every(
        (key: string) =>
          key.startsWith('lightener:curve-card:v1:') || key === 'lightener_editor_entity'
      )
    ).toBe(true);
  });
test('stale saved membership uses explicit review and cannot recreate a removed edited light', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixture);
  await ready(page);
  await edit(page);
  await page.locator('#overview').click();
  await page.evaluate(() => (window as any).__DRAFT_PROOF__.external({ 'light.ceiling': null }));
  await page.goBack();
  await ready(page);
  await page.getByRole('button', { name: 'Recover draft', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Removed from this group');
  await expect(page.getByRole('button', { name: 'Continue editing', exact: true })).toBeDisabled();
  await page.getByLabel('I understand edits to removed lights will be dropped.').check();
  await page.getByRole('button', { name: 'Continue editing', exact: true }).click();
  await expect(page.locator('curve-legend .legend-item')).toHaveCount(1);
  expect((await state(page)).services).toEqual([]);
  expect((await state(page)).calls.filter((m: any) => m.type === 'lightener/save_curves')).toEqual(
    []
  );
  await page.screenshot({ path: info.outputPath('removed-member-review.png'), fullPage: true });
});
test('full reload destroys the document repository without adding draft storage', async ({
  page,
}) => {
  await page.goto(fixture);
  await ready(page);
  await edit(page);
  await page.locator('#overview').click();
  await page.locator('#editor').click();
  await ready(page);
  await expect(page.getByRole('button', { name: 'Recover draft', exact: true })).toBeVisible();
  await page.reload();
  await ready(page);
  await expect(page.getByRole('button', { name: 'Recover draft', exact: true })).toHaveCount(0);
  expect((await state(page)).dirty).toBe(false);
});
test('retained panel reconnect restores listener ownership and switch Discard clears only the source draft', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixture + '?surface=sidebar');
  await ready(page);
  await edit(page);
  await page.locator('#overview').click();
  await page.locator('#retained').click();
  await ready(page);
  await page.locator('#entity-select').selectOption('light.other');
  await expect(page.locator('#switch-guard')).toBeVisible();
  await page.locator('#switch-discard').click();
  await expect(page.locator('#entity-select')).toHaveValue('light.other');
  await page.locator('#entity-select').selectOption('light.group');
  await ready(page);
  await expect(page.getByRole('button', { name: 'Recover draft', exact: true })).toHaveCount(0);
  expect((await state(page)).services).toEqual([]);
});
test('runtime uncertainty remains blocked after Cancel and a new instance', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixture);
  await ready(page);
  await edit(page);
  await page.evaluate(() => (window as any).__DRAFT_PROOF__.fail('rollback_reload_failed'));
  await page.locator('.btn-save').click();
  await expect(page.locator('.command-status')).toContainText('Recovery is required');
  await page.getByRole('button', { name: 'Cancel changes', exact: true }).click();
  await page.locator('#overview').click();
  await page.goBack();
  await ready(page);
  expect(await page.locator('curve-graph').evaluate((g: any) => g.readOnly)).toBe(true);
  await expect(page.locator('.btn-save')).toBeDisabled();
  expect((await state(page)).services).toEqual([]);
});
test('capacity failure is visible without evicting older drafts or saving/commanding lights', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixture);
  await ready(page);
  await page.evaluate(async () => {
    const proof = (window as any).__DRAFT_PROOF__;
    for (let index = 0; index < 33; index++) {
      const card = index === 0 ? proof.card : proof.spawn();
      await card.updateComplete;
      await Promise.resolve();
      await card.updateComplete;
      const graph = card.renderRoot.querySelector('curve-graph');
      graph.dispatchEvent(
        new CustomEvent('point-move', {
          detail: { curveIndex: 0, pointIndex: 2, lightener: 100, target: 45 },
          bubbles: true,
          composed: true,
        })
      );
      await card.updateComplete;
      if (index < 32) card.remove();
    }
  });
  await expect(
    page.getByText('Latest edits could not be retained for navigation.', { exact: false })
  ).toBeVisible();
  expect((await state(page)).services).toEqual([]);
  expect((await state(page)).calls.filter((m: any) => m.type === 'lightener/save_curves')).toEqual(
    []
  );
  await page.screenshot({ path: info.outputPath('capacity-warning.png'), fullPage: true });
});

test('narrow multiple-offer chooser preserves complete names, owned keyboard and independent drafts', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixture + '?long=1');
  await ready(page);
  await edit(page);
  await page.locator('#overview').click();
  await page.goBack();
  await ready(page);
  await edit(page);
  await page.locator('#overview').click();
  await page.goBack();
  await ready(page);
  const recover = page.getByRole('button', { name: 'Recover draft', exact: true });
  await expect(recover).toHaveCount(2);
  await expect(page.locator('.navigation-drafts')).toContainText(
    'deliberately long complete Home Assistant name'
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('narrow-recovery-offers-viewport.png') });
  await recover.first().focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).dirty).toBe(true);
  expect((await state(page)).services).toEqual([]);
  await page.screenshot({ path: info.outputPath('narrow-multiple-offers.png'), fullPage: true });
});
test('a returning former owner reviews its local copy without stealing the recovered draft', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixture);
  await ready(page);
  await edit(page);
  await page.locator('#overview').click();
  await page.goBack();
  await ready(page);
  await page.getByRole('button', { name: 'Recover draft', exact: true }).click();
  const currentId = await page.evaluate(
    () => (window as any).__DRAFT_PROOF__.card._draftClaim.draftId
  );
  await page.evaluate(() => {
    const proof = (window as any).__DRAFT_PROOF__;
    proof.instances[0].id = 'former-owner';
    document.querySelector('#host')!.append(proof.instances[0]);
  });
  await expect(page.locator('#former-owner')).toContainText('This draft was opened elsewhere');
  await expect(page.locator('#former-owner .btn-save')).toBeDisabled();
  await page
    .locator('#former-owner')
    .getByRole('button', { name: 'Review local copy', exact: true })
    .click();
  await page.getByRole('button', { name: 'Continue editing', exact: true }).click();
  expect(
    await page.locator('#former-owner').evaluate((card: any) => card._draftClaim.draftId)
  ).not.toBe(currentId);
  expect(await page.evaluate(() => (window as any).__DRAFT_PROOF__.card._draftClaim.draftId)).toBe(
    currentId
  );
  expect((await state(page)).services).toEqual([]);
  await page.screenshot({ path: info.outputPath('former-owner-local-review.png'), fullPage: true });
});
test('a late confirmed write cannot clear a replacement recovery claim', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixture);
  await ready(page);
  await edit(page);
  await page.evaluate(() => (window as any).__DRAFT_PROOF__.hold());
  await page.locator('.btn-save').click();
  await expect(page.locator('.btn-save')).toHaveText('Saving…');
  await page.locator('#overview').click();
  await page.goBack();
  await ready(page);
  await page.getByRole('button', { name: 'Recover draft', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Continue editing', exact: true }).click();
  const recovered = await state(page);
  expect(recovered.dirty).toBe(true);
  await page.evaluate(() => (window as any).__DRAFT_PROOF__.release());
  await expect
    .poll(
      async () =>
        (await state(page)).calls.filter((m: any) => m.type === 'lightener/save_curves').length
    )
    .toBe(1);
  expect((await state(page)).dirty).toBe(true);
  expect(
    await page.evaluate(() => (window as any).__DRAFT_PROOF__.card._draftClaim)
  ).not.toBeNull();
  expect((await state(page)).services).toEqual([]);
});

test('a new peer operation while recovery review is open requires another read before adoption', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(fixture);
  await ready(page);
  await edit(page);
  await page.locator('#overview').click();
  await page.evaluate(() =>
    (window as any).__DRAFT_PROOF__.external({
      'light.ceiling': { brightness: { 1: '1', 100: '70' } },
    })
  );
  await page.goBack();
  await ready(page);
  await page.evaluate(async () => {
    const proof = (window as any).__DRAFT_PROOF__;
    proof.card.id = 'recovery-target';
    const peer = proof.spawn();
    peer.id = 'concurrent-peer';
    await peer.updateComplete;
    await Promise.resolve();
    await peer.updateComplete;
  });
  await page
    .locator('#recovery-target')
    .getByRole('button', { name: 'Recover draft', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Keep my shape', { exact: true }).check();
  await page.evaluate(() => {
    const proof = (window as any).__DRAFT_PROOF__;
    proof.hold();
    void (document.querySelector('#concurrent-peer') as any).saveCurves();
  });
  await page.getByRole('button', { name: 'Continue editing', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#recovery-target')).toContainText('Saved state changed. Review again');
  expect((await state(page)).dirty).toBe(false);
  await expect(
    page.locator('#recovery-target').getByRole('button', { name: 'Recover draft', exact: true })
  ).toBeVisible();
  await page.evaluate(() => (window as any).__DRAFT_PROOF__.release());
  expect((await state(page)).services).toEqual([]);
});
