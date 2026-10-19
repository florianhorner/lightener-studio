import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const FIXTURE = '/js/playwright/fixtures/selected-light-shapes-card.html';
const PRIOR_STABLE_TAG = 'v2.17.2';
const PRIOR_STABLE_BUNDLE = 'custom_components/lightener_studio/frontend/lightener-curve-card.js';
const CANDIDATE_CONTRACT = JSON.parse(
  readFileSync(new URL('../../tests/fixtures/candidate_lights_v1.json', import.meta.url), 'utf8')
) as {
  errors: {
    disabled_entity: {
      code: string;
      message_template: string;
    };
  };
};
const DISABLED_ENTITY_ERROR = CANDIDATE_CONTRACT.errors.disabled_entity;
const disabledEntityMessage = (entityId: string): string =>
  DISABLED_ENTITY_ERROR.message_template.replace('{entity_id}', entityId);

type StableArtifact = {
  tag: string;
  commit: string;
  path: string;
  sha256: string;
  source: string;
};

type PerformanceSample = {
  durationMs: number;
  renderedRows: number;
};

function gitText(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function resolvePriorStableArtifact(): StableArtifact | null {
  let commit: string;
  try {
    commit = gitText('rev-list', '-n', '1', PRIOR_STABLE_TAG);
  } catch {
    return null;
  }
  if (!commit) return null;

  // Guarded like rev-list above: if the bundle path ever moves, an unguarded
  // `git show` throws a raw execFileSync error instead of reaching the
  // "fetch the tag first" assertion that says what to actually do.
  let source: string;
  try {
    source = execFileSync('git', ['show', `${PRIOR_STABLE_TAG}:${PRIOR_STABLE_BUNDLE}`], {
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch {
    return null;
  }
  return {
    tag: PRIOR_STABLE_TAG,
    commit,
    path: PRIOR_STABLE_BUNDLE,
    sha256: createHash('sha256').update(source).digest('hex'),
    source,
  };
}

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

function median(values: number[]): number {
  return percentile(values, 0.5);
}

async function waitForCard(page: Page): Promise<void> {
  // Module initialization publishes this promise before its final render frames
  // publish CARD_ELEMENT. Awaiting an absent promise would skip that boundary.
  await page.waitForFunction(() => (window as any).__LIGHTENER_CARD_READY__ !== undefined);
  await page.evaluate(() => (window as any).__LIGHTENER_CARD_READY__);
  await expect(page.locator('.add-light-btn')).toBeVisible();
}

async function openMembership(page: Page, query: string): Promise<ReturnType<Page['getByRole']>> {
  await page.goto(`${FIXTURE}${query}`);
  await waitForCard(page);
  await page.locator('.add-light-btn').click();
  const dialog = page.getByRole('dialog', { name: 'Edit lights' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.list')).toHaveAttribute('aria-busy', 'false');
  return dialog;
}

function rowFor(
  dialog: ReturnType<Page['getByRole']>,
  entityId: string
): ReturnType<Page['locator']> {
  return dialog.locator('.light-row').filter({ hasText: entityId });
}

async function measureInitialRenderSamples(
  page: Page,
  candidateCount: number
): Promise<PerformanceSample[]> {
  await page.goto(`${FIXTURE}?membership=scale&candidates=${candidateCount}`);
  await waitForCard(page);
  return page.evaluate(async () => {
    const card = (window as any).__LIGHTENER_CARD_ELEMENT__;
    const legend = card.renderRoot.querySelector('curve-legend');
    const button = legend.renderRoot.querySelector('.add-light-btn') as HTMLButtonElement;

    async function open() {
      const start = performance.now();
      button.click();
      let dialog: any = null;
      for (let attempt = 0; attempt < 100 && !dialog; attempt += 1) {
        dialog = card.renderRoot.querySelector('light-membership-dialog');
        if (!dialog) await new Promise((resolve) => setTimeout(resolve, 0));
      }
      if (!dialog) throw new Error('Membership dialog did not mount');
      for (let attempt = 0; attempt < 100 && dialog._loading; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      if (dialog._loading) throw new Error('Membership dialog did not finish loading');
      await dialog.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return {
        durationMs: performance.now() - start,
        renderedRows: dialog.renderRoot.querySelectorAll('.light-row').length,
      };
    }

    async function close() {
      const dialog = card.renderRoot.querySelector('light-membership-dialog');
      dialog.dispatchEvent(new CustomEvent('membership-close', { bubbles: true, composed: true }));
      await card.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (card.renderRoot.querySelector('light-membership-dialog')) {
        throw new Error('Membership dialog did not close between samples');
      }
    }

    for (let index = 0; index < 3; index += 1) {
      await open();
      await close();
    }

    const samples = [];
    for (let index = 0; index < 20; index += 1) {
      samples.push(await open());
      if (index < 19) await close();
    }
    return samples;
  });
}

async function measureSearchSamples(page: Page): Promise<PerformanceSample[]> {
  return page.evaluate(async () => {
    const card = (window as any).__LIGHTENER_CARD_ELEMENT__;
    const dialog = card.renderRoot.querySelector('light-membership-dialog') as any;
    const search = dialog.renderRoot.querySelector('input[type="search"]') as HTMLInputElement;

    async function run(value: string) {
      const start = performance.now();
      search.value = value;
      search.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await dialog.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return {
        durationMs: performance.now() - start,
        renderedRows: dialog.renderRoot.querySelectorAll('.light-row').length,
      };
    }

    for (let index = 0; index < 3; index += 1) {
      await run(index % 2 === 0 ? 'Scale candidate 09' : '');
    }

    const samples = [];
    for (let index = 0; index < 20; index += 1) {
      samples.push(await run(index % 2 === 0 ? 'Scale candidate 09' : 'Scale candidate 00'));
    }
    return samples;
  });
}

async function attachJson(testInfo: TestInfo, name: string, value: unknown): Promise<void> {
  const path = testInfo.outputPath(name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await testInfo.attach(name, {
    path,
    contentType: 'application/json',
  });
}

test.describe('membership picker contract (built bundle)', () => {
  test('Current group scope stays tied to the immutable dialog-open membership', async ({
    page,
  }) => {
    const dialog = await openMembership(page, '?membership=exceptional');
    const currentGroup = dialog.getByRole('checkbox', {
      name: 'Current group only (3)',
    });
    await currentGroup.check();

    await expect(rowFor(dialog, 'light.a')).toBeVisible();
    await expect(rowFor(dialog, 'light.b')).toBeVisible();
    await expect(rowFor(dialog, 'light.missing_member')).toBeVisible();
    await expect(rowFor(dialog, 'light.new')).toHaveCount(0);

    await rowFor(dialog, 'light.a').getByRole('checkbox').uncheck();
    await expect(rowFor(dialog, 'light.a')).toBeVisible();
    await expect(currentGroup).toBeChecked();

    await currentGroup.uncheck();
    await rowFor(dialog, 'light.new').getByRole('checkbox').check();
    await currentGroup.check();

    await expect(rowFor(dialog, 'light.a')).toBeVisible();
    await expect(rowFor(dialog, 'light.new')).toHaveCount(0);
    await expect(currentGroup).toHaveAccessibleName('Current group only (3)');
  });

  test('exceptional rows reveal complete, truthful, and non-authorizing state', async ({
    page,
  }) => {
    const dialog = await openMembership(page, '?membership=exceptional');

    await expect(rowFor(dialog, 'light.b')).toContainText('Unavailable');
    await expect(rowFor(dialog, 'light.missing_member')).toContainText('Missing');
    await expect(rowFor(dialog, 'light.unavailable_spare')).toContainText('Unavailable');
    await expect(rowFor(dialog, 'light.hidden_lamp')).toHaveCount(0);
    await expect(rowFor(dialog, 'light.disabled_lamp')).toHaveCount(0);
    await expect(rowFor(dialog, 'light.hidden_disabled_lamp')).toHaveCount(0);

    const reveal = dialog.getByRole('checkbox', {
      name: 'Show hidden & disabled (3)',
    });
    await reveal.check();

    const hidden = rowFor(dialog, 'light.hidden_lamp');
    await expect(hidden).toContainText('Hidden');
    await expect(hidden.getByRole('checkbox')).toBeEnabled();

    const disabled = rowFor(dialog, 'light.disabled_lamp');
    await expect(disabled).toContainText('Disabled');
    await expect(disabled).not.toContainText('Unavailable');
    await expect(disabled.getByRole('checkbox')).toBeDisabled();

    const overlap = rowFor(dialog, 'light.hidden_disabled_lamp');
    await expect(overlap).toContainText('Hidden');
    await expect(overlap).toContainText('Disabled');
    await expect(overlap).not.toContainText('Unavailable');
    await expect(overlap.getByRole('checkbox')).toBeDisabled();
  });

  test('exceptional disclosure count follows discovery filters and pending exemptions', async ({
    page,
  }) => {
    const dialog = await openMembership(page, '?membership=exceptional');
    const area = dialog.getByRole('combobox', { name: 'Area' });
    await area.selectOption('office');

    const reveal = dialog.getByRole('checkbox', {
      name: /Show hidden & disabled/,
    });
    await reveal.check();
    await rowFor(dialog, 'light.hidden_lamp').getByRole('checkbox').check();
    await reveal.uncheck();

    await expect(reveal).toHaveAccessibleName('Show hidden & disabled (1)');
    await expect(rowFor(dialog, 'light.hidden_lamp')).toBeVisible();
    await expect(rowFor(dialog, 'light.disabled_lamp')).toHaveCount(0);
  });

  test('absent capability is quiet legacy all-visible behavior', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text());
    });
    const dialog = await openMembership(page, '?membership=legacy');

    await expect(dialog.getByRole('checkbox', { name: /Show hidden & disabled/ })).toHaveCount(0);
    await expect(rowFor(dialog, 'light.hidden_lamp')).toBeVisible();
    await expect(rowFor(dialog, 'light.disabled_lamp')).toBeVisible();
    expect(warnings.filter((message) => message.includes('candidate_state_metadata'))).toEqual([]);
  });

  test('claimed but incomplete v1 falls back for the whole response and warns once', async ({
    page,
  }) => {
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text());
    });
    const dialog = await openMembership(page, '?membership=malformed');

    await expect(dialog.getByRole('checkbox', { name: /Show hidden & disabled/ })).toHaveCount(0);
    await expect(rowFor(dialog, 'light.hidden_lamp')).toBeVisible();
    await expect(rowFor(dialog, 'light.disabled_lamp')).toBeVisible();
    await expect(rowFor(dialog, 'light.hidden_disabled_lamp')).toBeVisible();
    expect(warnings.filter((message) => message.includes('candidate_state_metadata'))).toHaveLength(
      1
    );
  });

  test('keyboard focus, Escape recovery, and 200% reflow keep the dialog usable', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    const dialog = await openMembership(page, '?membership=exceptional');
    const search = dialog.getByRole('searchbox', { name: 'Search lights' });
    await expect(search).toBeFocused();

    const currentGroup = dialog.getByRole('checkbox', {
      name: 'Current group only (3)',
    });
    await currentGroup.focus();
    await page.keyboard.press('Space');
    await expect(currentGroup).toBeChecked();

    // Halving the CSS viewport exercises the reflow that 200% browser zoom
    // requires, including responsive breakpoints that style.zoom skips.
    await page.setViewportSize({ width: 320, height: 800 });
    await expect(dialog).toBeVisible();
    const layout = await page.evaluate(() => {
      const dialog = document
        .querySelector('lightener-curve-card')
        ?.shadowRoot?.querySelector('light-membership-dialog') as HTMLElement | null;
      const panel = dialog?.shadowRoot?.querySelector('.dialog') as HTMLElement | null;
      return {
        documentOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        dialogOverflow: panel ? panel.scrollWidth - panel.clientWidth : Number.POSITIVE_INFINITY,
      };
    });
    expect(layout.documentOverflow).toBeLessThanOrEqual(1);
    expect(layout.dialogOverflow).toBeLessThanOrEqual(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.add-light-btn')).toBeFocused();
  });

  test('concealing a pending exceptional row keeps focus entity-safe and inside the modal', async ({
    page,
  }) => {
    const dialog = await openMembership(page, '?membership=exceptional');
    const reveal = dialog.getByRole('checkbox', {
      name: /Show hidden & disabled/,
    });
    await reveal.check();

    const hidden = rowFor(dialog, 'light.hidden_lamp').getByRole('checkbox');
    await hidden.check();
    await reveal.uncheck();
    await expect(hidden).toBeVisible();

    await hidden.focus();
    await page.keyboard.press('Space');
    await expect(rowFor(dialog, 'light.hidden_lamp')).toHaveCount(0);
    await expect(reveal).toBeFocused();
  });

  test('empty-state recovery with only a disabled match keeps Tab inside the modal', async ({
    page,
  }) => {
    const dialog = await openMembership(page, '?membership=exceptional');
    await dialog.getByRole('searchbox', { name: 'Search lights' }).fill('Disabled lamp');
    await dialog.getByRole('button', { name: 'Show hidden & disabled' }).click();

    await expect(rowFor(dialog, 'light.disabled_lamp').getByRole('checkbox')).toBeDisabled();
    const heading = dialog.getByRole('heading', { name: 'Edit lights' });
    await expect(heading).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();

    await heading.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  });

  test('focus recovery handles rejected render completion without an unhandled error', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const diagnostics: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') diagnostics.push(message.text());
    });

    const dialog = await openMembership(page, '?membership=exceptional');
    await dialog.getByRole('searchbox', { name: 'Search lights' }).fill('Disabled lamp');
    await page.evaluate(() => {
      const card = (window as any).__LIGHTENER_CARD_ELEMENT__;
      const membership = card.renderRoot.querySelector('light-membership-dialog');
      Object.defineProperty(membership, 'updateComplete', {
        configurable: true,
        get: () => Promise.reject(new Error('forced updateComplete rejection')),
      });
    });

    await dialog.getByRole('button', { name: 'Show hidden & disabled' }).click();
    await expect(rowFor(dialog, 'light.disabled_lamp')).toBeVisible();
    await expect
      .poll(
        () =>
          diagnostics.filter((message) =>
            message.includes('Failed to restore focus after revealing exceptional lights')
          ).length
      )
      .toBe(1);
    await page.evaluate(() => Promise.resolve());
    expect(pageErrors).toEqual([]);
    await expect(dialog.getByRole('alert')).toHaveCount(0);
  });

  test('load failures stay latched until the explicit retry action', async ({ page }) => {
    await page.goto(`${FIXTURE}?membership=exceptional`);
    await waitForCard(page);
    await page.evaluate(() => {
      const card = (window as any).__LIGHTENER_CARD_ELEMENT__;
      const hass = card._hass;
      const originalCallWS = hass.callWS.bind(hass);
      (window as any).__LIGHTENER_CANDIDATE_LOAD_CALLS__ = 0;
      hass.callWS = async (message: { type: string }) => {
        if (message.type === 'lightener/list_candidate_lights') {
          (window as any).__LIGHTENER_CANDIDATE_LOAD_CALLS__ += 1;
          throw new Error('Candidate load failed');
        }
        return originalCallWS(message);
      };
    });

    await page.locator('.add-light-btn').click();
    const dialog = page.getByRole('dialog', { name: 'Edit lights' });
    await expect(dialog.getByRole('alert')).toContainText('Could not load lights');
    await expect(dialog.getByRole('button', { name: 'Try again' })).toBeVisible();

    await page.evaluate(async () => {
      const card = (window as any).__LIGHTENER_CARD_ELEMENT__;
      card.hass = {
        ...card._hass,
        states: { ...card._hass.states },
      };
      await card.updateComplete;
      const membership = card.renderRoot.querySelector('light-membership-dialog');
      if (membership) await membership.updateComplete;
      await Promise.resolve();
    });
    expect(await page.evaluate(() => (window as any).__LIGHTENER_CANDIDATE_LOAD_CALLS__)).toBe(1);
    await expect(dialog.getByRole('button', { name: 'Try again' })).toBeVisible();

    await dialog.getByRole('button', { name: 'Try again' }).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__LIGHTENER_CANDIDATE_LOAD_CALLS__))
      .toBe(2);
  });

  test('disabled race preserves the current client recovery surface', async ({ page }) => {
    const dialog = await openMembership(page, '?membership=exceptional');
    const search = dialog.getByRole('searchbox', { name: 'Search lights' });
    await search.fill('New light');
    await rowFor(dialog, 'light.new').getByRole('checkbox').check();
    await page.evaluate(() => {
      (window as any).__LIGHTENER_FORCE_DISABLED_ENTITY__ = 'light.new';
    });

    await dialog.getByRole('button', { name: 'Update lights' }).click();
    const alert = dialog.getByRole('alert');
    await expect(alert).toBeFocused();
    await expect(alert).toContainText('disabled in Home Assistant');
    await expect(alert).toContainText('light.new');
    await expect(dialog.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(search).toHaveValue('New light');
    await expect(rowFor(dialog, 'light.new').getByRole('checkbox')).toBeChecked();
  });

  test('deterministic scale protocol emits measurements without a brittle CI timing gate', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const initial100 = await measureInitialRenderSamples(page, 100);
    const initial1000 = await measureInitialRenderSamples(page, 1000);
    const searchSamples = await measureSearchSamples(page);
    const initial100Durations = initial100.map((sample) => sample.durationMs);
    const initial1000Durations = initial1000.map((sample) => sample.durationMs);
    const searchDurations = searchSamples.map((sample) => sample.durationMs);
    const distribution = await page.evaluate(() => {
      const candidates = (window as any).__LIGHTENER_MEMBERSHIP_CANDIDATES__ as Array<{
        hidden: boolean;
        disabled: boolean;
        available: boolean;
        missing: boolean;
      }>;
      return {
        total: candidates.length,
        hidden: candidates.filter((item) => item.hidden).length,
        disabled: candidates.filter((item) => item.disabled).length,
        unavailable: candidates.filter((item) => !item.available).length,
        missing: candidates.filter((item) => item.missing).length,
        hiddenAndDisabled: candidates.filter((item) => item.hidden && item.disabled).length,
      };
    });
    const initial100MedianMs = median(initial100Durations);
    const initial100P95Ms = percentile(initial100Durations, 0.95);
    const initial1000MedianMs = median(initial1000Durations);
    const initial1000P95Ms = percentile(initial1000Durations, 0.95);
    const searchMedianMs = median(searchDurations);
    const searchP95Ms = percentile(searchDurations, 0.95);
    const report = {
      protocol: 'lightener-membership-performance-v1',
      commit: process.env.GITHUB_SHA ?? gitText('rev-parse', 'HEAD'),
      browser: testInfo.project.name,
      os: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpu: os.cpus()[0]?.model ?? 'unknown',
      },
      distribution,
      warmupsPerOperation: 3,
      measuredSamplesPerOperation: 20,
      initialRender: {
        candidates100: {
          samples: initial100,
          medianMs: initial100MedianMs,
          p95Ms: initial100P95Ms,
        },
        candidates1000: {
          samples: initial1000,
          medianMs: initial1000MedianMs,
          p95Ms: initial1000P95Ms,
        },
      },
      warmedSearch: {
        samples: searchSamples,
        medianMs: searchMedianMs,
        p95Ms: searchP95Ms,
      },
      thresholdsMs: {
        initial100: 250,
        initial1000: 750,
        warmedSearchP95: 100,
      },
      informationalResult: {
        initial100: initial100P95Ms <= 250,
        initial1000: initial1000P95Ms <= 750,
        warmedSearchP95: searchP95Ms <= 100,
      },
      ciPolicy:
        'CI validates protocol and behavior only; acceptance reviews timings from a named machine.',
    };
    await attachJson(testInfo, 'membership-performance.json', report);
    console.info(
      `[membership-performance] 100 p95=${initial100P95Ms.toFixed(1)}ms; ` +
        `1000 p95=${initial1000P95Ms.toFixed(1)}ms; ` +
        `search p95=${searchP95Ms.toFixed(1)}ms`
    );

    expect(distribution.total).toBe(1000);
    expect(distribution.hidden).toBeGreaterThan(0);
    expect(distribution.disabled).toBeGreaterThan(0);
    expect(distribution.hiddenAndDisabled).toBeGreaterThan(0);
    expect(initial100).toHaveLength(20);
    expect(initial1000).toHaveLength(20);
    expect(searchSamples).toHaveLength(20);
    expect(
      [...initial100, ...initial1000, ...searchSamples].every(
        (sample) => sample.durationMs >= 0 && sample.renderedRows > 0
      )
    ).toBe(true);
  });
});

test.describe('prior stable binary skew proof', () => {
  test('v2.17.2 ignores v1 extras and surfaces actionable disabled_entity recovery', async ({
    page,
  }, testInfo) => {
    const priorStable = resolvePriorStableArtifact();
    expect(
      priorStable,
      `Fetch ${PRIOR_STABLE_TAG} before claiming prior-bundle binary skew proof`
    ).not.toBeNull();
    const artifact = priorStable!;

    await page.goto('about:blank');
    await page.setContent('<main id="root"></main>');
    await page.addScriptTag({ type: 'module', content: artifact.source });
    await page.waitForFunction(() => customElements.get('light-membership-dialog') !== undefined);
    await page.evaluate(
      ({ disabledMessage }) => {
        const hass = {
          user: { is_admin: true },
          locale: { language: 'en' },
          states: {
            'light.a': {
              state: 'on',
              attributes: { friendly_name: 'Alpha', brightness: 255 },
            },
          },
          callWS: async (message: { type: string }) => {
            if (message.type === 'lightener/list_candidate_lights') {
              return {
                capabilities: { candidate_state_metadata: 1 },
                observed_controlled_entity_ids: ['light.a'],
                lights: [
                  {
                    entity_id: 'light.a',
                    name: 'Alpha',
                    available: true,
                    area_id: null,
                    area_name: null,
                    hidden: false,
                    disabled: false,
                    missing: false,
                  },
                  {
                    entity_id: 'light.disabled_lamp',
                    name: 'Disabled lamp',
                    available: false,
                    area_id: null,
                    area_name: null,
                    hidden: false,
                    disabled: true,
                    missing: false,
                  },
                ],
              };
            }
            if (message.type === 'lightener/set_controlled_lights') {
              const error = new Error(disabledMessage) as Error & { code: string };
              error.code = 'disabled_entity';
              throw error;
            }
            throw new Error(`Unexpected stable-bundle call: ${message.type}`);
          },
        };
        const dialog = document.createElement('light-membership-dialog') as any;
        dialog.hass = hass;
        dialog.groupEntityId = 'light.membership_proof';
        document.getElementById('root')!.append(dialog);
        (window as any).__STABLE_DIALOG__ = dialog;
      },
      { disabledMessage: disabledEntityMessage('light.disabled_lamp') }
    );

    const dialog = page.getByRole('dialog', { name: 'Edit lights' });
    await expect(dialog).toBeVisible();
    const disabledRow = rowFor(dialog, 'light.disabled_lamp');
    await expect(disabledRow).toBeVisible();
    await disabledRow.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Update lights' }).click();
    await expect(dialog.getByRole('alert')).toHaveText(
      disabledEntityMessage('light.disabled_lamp')
    );

    const manifest = {
      tag: artifact.tag,
      commit: artifact.commit,
      bundlePath: artifact.path,
      bundleSha256: artifact.sha256,
      backendContract: 'candidate_state_metadata=1 + disabled_entity',
      result: 'pass: raw actionable backend message surfaced',
    };
    await attachJson(testInfo, 'prior-stable-binary-skew.json', manifest);
    console.info(
      `[prior-stable-binary-skew] ${artifact.tag} ${artifact.commit} ${artifact.sha256}`
    );
  });
});
