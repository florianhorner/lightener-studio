// @vitest-environment jsdom

/**
 * The frontend half of the membership error contract.
 *
 * `tests/components/lightener_studio/test_membership_error_contract.py` pins the
 * *backend* set of codes against `tests/fixtures/membership_errors_v1.json`.
 * This file pins the *editor's* handling of the same fixture, so the two sides
 * cannot drift apart in either direction:
 *
 *   - a backend code added without a fixture entry fails the Python contract;
 *   - a fixture entry added without the dialog handling it fails here.
 *
 * The `copy` field is what each code promises the user:
 *   dedicated - the dialog owns the string and ignores the backend message.
 *   preferred - the backend message wins when present (it names the entity),
 *               and the dialog has its own string for when it is absent.
 *   backend   - the dialog surfaces the backend message verbatim.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  CANDIDATE_STATE_METADATA_VERSION,
  MEMBERSHIP_ERROR_DISABLED_ENTITY,
} from '../utils/candidate-lights.js';
import { UI } from '../utils/strings.js';
import type { Hass } from '../utils/types.js';

const thisDir = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(thisDir, '../../../tests/fixtures/membership_errors_v1.json');
const DIALOG_SOURCE_PATH = resolve(thisDir, './light-membership-dialog.ts');

type CopyMode = 'dedicated' | 'backend' | 'preferred';

interface ErrorEntry {
  copy: CopyMode;
  batch_command: boolean;
  meaning: string;
}

const FIXTURE = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as {
  version: number;
  errors: Record<string, ErrorEntry>;
};

const ENTRIES = Object.entries(FIXTURE.errors);

/**
 * The copy the dialog owns for each code it branches on.
 *
 * This map is deliberately explicit rather than derived: it is the assertion.
 * A new `dedicated` or `preferred` code in the fixture has to be added here
 * too, which is exactly the review step the contract exists to force.
 */
const OWN_COPY: Record<string, string> = {
  conflict: UI.membership.conflictError,
  reload_failed: UI.membership.reloadError,
  rollback_reload_failed: UI.membership.rollbackError,
  [MEMBERSHIP_ERROR_DISABLED_ENTITY]: UI.membership.disabledError,
};

/** Codes the fixture says the dialog renders with its own string. */
function codesWithOwnCopy(): string[] {
  return ENTRIES.filter(([, entry]) => entry.copy === 'dedicated' || entry.copy === 'preferred')
    .map(([code]) => code)
    .sort();
}

/**
 * Every code `_errorMessage` branches on, read from the source.
 *
 * The Python side reads its raise sites out of the AST rather than exercising
 * each failure path; this is the same idea, so a branch that is unreachable
 * from a rendered test still has to be declared.
 */
function branchedCodes(): string[] {
  const source = readFileSync(DIALOG_SOURCE_PATH, 'utf-8');
  const named: Record<string, string> = {
    MEMBERSHIP_ERROR_DISABLED_ENTITY,
  };
  const pattern = /value\?\.code === (?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))/g;
  const found = new Set<string>();

  for (const match of source.matchAll(pattern)) {
    const [, literal, identifier] = match;
    if (literal) {
      found.add(literal);
      continue;
    }
    const resolved = named[identifier!];
    expect(resolved, `_errorMessage branches on unknown constant ${identifier}`).toBeDefined();
    found.add(resolved!);
  }

  return [...found].sort();
}

interface Dialog extends HTMLElement {
  hass: Hass | null;
  groupEntityId: string;
  updateComplete: Promise<void>;
  renderRoot: ShadowRoot;
}

function candidate(entityId: string, name: string) {
  return {
    entity_id: entityId,
    name,
    available: true,
    area_id: null,
    area_name: null,
    hidden: false,
    disabled: false,
    missing: false,
  };
}

function listResponse() {
  return {
    capabilities: { candidate_state_metadata: CANDIDATE_STATE_METADATA_VERSION },
    observed_controlled_entity_ids: ['light.ceiling'],
    lights: [candidate('light.ceiling', 'Ceiling'), candidate('light.reading', 'Reading')],
  };
}

function makeHass(callWS: ReturnType<typeof vi.fn>): Hass {
  return {
    user: { is_admin: true },
    locale: { language: 'en' },
    states: {
      'light.living_room': { state: 'on', attributes: { friendly_name: 'Living room' } },
    },
    callWS: callWS as unknown as Hass['callWS'],
    callApi: vi.fn(),
    callService: vi.fn(),
  };
}

async function settle(dialog: Dialog): Promise<void> {
  await Promise.resolve();
  await dialog.updateComplete;
  await Promise.resolve();
  await dialog.updateComplete;
}

/**
 * Mount the dialog, change the selection, submit, and return the rendered
 * error text for a rejection carrying `rejection`.
 */
async function applyErrorText(rejection: unknown): Promise<string> {
  const callWS = vi.fn().mockResolvedValueOnce(listResponse()).mockRejectedValueOnce(rejection);
  const dialog = document.createElement('light-membership-dialog') as Dialog;
  dialog.hass = makeHass(callWS);
  dialog.groupEntityId = 'light.living_room';
  document.body.appendChild(dialog);
  await vi.waitFor(() => {
    expect(dialog.renderRoot.querySelector('.loading-copy')).toBeNull();
  });
  await settle(dialog);

  // A non-empty change: an empty selection is rejected client-side before the
  // websocket call, which would never reach the code under test.
  const input = [...dialog.renderRoot.querySelectorAll<HTMLInputElement>('.light-row input')].find(
    (candidateInput) => candidateInput.dataset.entityId === 'light.reading'
  );
  expect(input, 'checkbox for light.reading').toBeDefined();
  input!.click();
  await dialog.updateComplete;

  dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!.click();
  await settle(dialog);

  const alert = dialog.renderRoot.querySelector<HTMLElement>('.apply-error');
  expect(alert, `.apply-error for ${JSON.stringify(rejection)}`).not.toBeNull();
  return alert!.textContent ?? '';
}

beforeAll(async () => {
  await import('./light-membership-dialog.js');
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('membership error contract (frontend half)', () => {
  it('reads a version 1 fixture with at least one code', () => {
    expect(FIXTURE.version).toBe(1);
    expect(ENTRIES.length).toBeGreaterThan(0);
  });

  it('branches on exactly the codes the fixture says the dialog owns copy for', () => {
    // Both directions matter. A fixture entry the dialog never handles reaches
    // the user as generic fallback copy; a dialog branch the fixture does not
    // declare is copy nobody reviewed.
    expect(branchedCodes()).toEqual(codesWithOwnCopy());
  });

  it('has its own string for every code the fixture says it owns', () => {
    expect(Object.keys(OWN_COPY).sort()).toEqual(codesWithOwnCopy());
    for (const [code, copy] of Object.entries(OWN_COPY)) {
      expect(copy, `${code} copy is empty`).toBeTruthy();
      expect(copy, `${code} copy just restates the code`).not.toBe(code.replace(/_/g, ' '));
    }
  });

  it('never claims a code is reachable over the batch command without saying why', () => {
    for (const [code, entry] of ENTRIES) {
      expect(typeof entry.batch_command, `${code} batch_command`).toBe('boolean');
      expect(entry.meaning.trim(), `${code} meaning`).not.toBe('');
    }
  });

  const reachable = ENTRIES.filter(([, entry]) => entry.batch_command);

  it.each(reachable.filter(([, entry]) => entry.copy === 'dedicated'))(
    'renders its own copy for %s and ignores the backend message',
    async (code) => {
      expect(await applyErrorText({ code })).toContain(OWN_COPY[code]);
      // `dedicated` means the backend message is not actionable enough, so it
      // must not win even when one is sent.
      const withMessage = await applyErrorText({ code, message: 'raw backend detail' });
      expect(withMessage).toContain(OWN_COPY[code]);
      expect(withMessage).not.toContain('raw backend detail');
    }
  );

  it.each(reachable.filter(([, entry]) => entry.copy === 'preferred'))(
    'prefers the backend message for %s and falls back to its own copy',
    async (code) => {
      const named = 'Could not add light.reading because it is disabled in Home Assistant.';
      expect(await applyErrorText({ code, message: named })).toContain(named);
      expect(await applyErrorText({ code })).toContain(OWN_COPY[code]);
    }
  );

  it.each(reachable.filter(([, entry]) => entry.copy === 'backend'))(
    'surfaces the backend message verbatim for %s',
    async (code) => {
      const message = `Backend copy for ${code} that a user can act on`;
      expect(await applyErrorText({ code, message })).toContain(message);
    }
  );

  it.each(reachable.filter(([, entry]) => entry.copy === 'backend'))(
    'falls back to generic apply copy for %s when the backend sends no message',
    async (code) => {
      expect(await applyErrorText({ code })).toContain(UI.membership.applyError);
    }
  );

  it('does not branch on codes the fixture says the batch command cannot return', () => {
    const unreachable = ENTRIES.filter(([, entry]) => !entry.batch_command).map(([code]) => code);
    // `too_many` is the live case: the websocket schema bounds the list at the
    // same limit the handler enforces, so Home Assistant rejects an oversized
    // payload as invalid_format first. Dedicated copy for it would be dead.
    expect(unreachable).toContain('too_many');
    for (const code of unreachable) {
      expect(branchedCodes(), `${code} is unreachable but branched`).not.toContain(code);
    }
  });

  it('falls back to generic apply copy for a code nobody declared', async () => {
    expect(await applyErrorText({ code: 'unheard_of_code' })).toContain(UI.membership.applyError);
  });

  it('uses distinct dedicated copy for the two codes that describe runtime damage', () => {
    // These two differ only in whether the previous state survived, so the
    // wording has to distinguish them for the user.
    expect(UI.membership.reloadError).not.toBe(UI.membership.rollbackError);
    expect(FIXTURE.errors.reload_failed.copy).toBe('dedicated');
    expect(FIXTURE.errors.rollback_reload_failed.copy).toBe('dedicated');
  });
});
