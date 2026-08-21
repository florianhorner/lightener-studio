// @vitest-environment jsdom

/**
 * Frontend half of the membership error contract.
 *
 * The backend can report eleven distinct failure codes; the dialog only ever
 * branched on three of them, and nothing checked that the rest surfaced
 * anything a user could act on. `tests/fixtures/membership_errors_v1.json` is
 * the shared source of truth — the Python side pins the codes the backend
 * raises, this side pins what the dialog does with each one.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CANDIDATE_STATE_METADATA_VERSION } from '../utils/candidate-lights.js';
import { UI } from '../utils/strings.js';
import type { Hass } from '../utils/types.js';

const thisDir = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(thisDir, '../../../tests/fixtures/membership_errors_v1.json');
const CONTRACT = JSON.parse(readFileSync(fixturePath, 'utf-8')) as {
  version: number;
  errors: Record<string, { copy: 'dedicated' | 'backend' | 'preferred'; meaning: string }>;
};

type Dialog = HTMLElement & {
  hass: Hass | null;
  groupEntityId: string;
  updateComplete: Promise<void>;
  renderRoot: ShadowRoot;
};

/** A backend failure as it arrives from hass.callWS. */
class WsError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

const BACKEND_MESSAGES: Record<string, string> = {
  empty_selection: 'Select at least one light',
  too_many: 'A Lightener group can control at most 100 lights',
  duplicate: 'The light selection contains a duplicate',
  not_a_light: 'switch.fan is not a light entity',
  self_reference: 'A Lightener cannot control itself',
  recursive_lightener: 'A Lightener group cannot control another Lightener group',
  disabled_entity: 'Could not add light.spare because it is disabled in Home Assistant.',
  not_found: 'Config entry not found',
  conflict: 'The group changed since this editor was opened. Reload and try again.',
  reload_failed: 'Config entry reload failed',
  rollback_reload_failed: 'The update failed and the previous runtime state could not be restored',
};

function listResponse() {
  return {
    capabilities: { candidate_state_metadata: CANDIDATE_STATE_METADATA_VERSION },
    observed_controlled_entity_ids: ['light.one'],
    lights: [
      {
        entity_id: 'light.one',
        name: 'One',
        available: true,
        area_id: null,
        area_name: null,
        hidden: false,
        disabled: false,
        missing: false,
      },
      {
        entity_id: 'light.two',
        name: 'Two',
        available: true,
        area_id: null,
        area_name: null,
        hidden: false,
        disabled: false,
        missing: false,
      },
    ],
  };
}

async function mountWithFailingApply(error: WsError): Promise<Dialog> {
  const callWS = vi.fn(async (message: { type: string }) => {
    if (message.type === 'lightener/list_candidate_lights') return listResponse();
    throw error;
  });
  const dialog = document.createElement('light-membership-dialog') as Dialog;
  dialog.hass = {
    user: { is_admin: true },
    locale: { language: 'en' },
    states: {
      'light.group': { state: 'on', attributes: { friendly_name: 'Group' } },
    },
    callWS: callWS as unknown as Hass['callWS'],
    callApi: vi.fn(),
    callService: vi.fn(),
  } as unknown as Hass;
  dialog.groupEntityId = 'light.group';
  document.body.appendChild(dialog);
  await vi.waitFor(() => {
    expect(dialog.renderRoot.querySelector('.loading-copy')).toBeNull();
  });
  await dialog.updateComplete;
  return dialog;
}

/** Select a second light and press Apply, so the failing call actually runs. */
async function applyAChange(dialog: Dialog): Promise<void> {
  const checkbox = [
    ...dialog.renderRoot.querySelectorAll<HTMLInputElement>('.light-row input'),
  ].find((input) => input.dataset.entityId === 'light.two')!;
  checkbox.click();
  await dialog.updateComplete;

  const apply = [...dialog.renderRoot.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => /save|apply|update/i.test(button.textContent ?? '')
  );
  expect(apply, 'the apply button').toBeDefined();
  apply!.click();
  await vi.waitFor(() => {
    expect(dialog.renderRoot.querySelector('.apply-error')).not.toBeNull();
  });
  await dialog.updateComplete;
}

beforeAll(async () => {
  await import('./light-membership-dialog.js');
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('membership error contract (frontend vs shared fixture)', () => {
  it('covers every code the backend contract declares', () => {
    expect(Object.keys(BACKEND_MESSAGES).sort()).toEqual(Object.keys(CONTRACT.errors).sort());
  });

  for (const [code, entry] of Object.entries(CONTRACT.errors)) {
    it(`shows actionable copy for "${code}"`, async () => {
      const dialog = await mountWithFailingApply(new WsError(code, BACKEND_MESSAGES[code]));
      await applyAChange(dialog);

      const rendered = dialog.renderRoot.querySelector('.apply-error')!.textContent!.trim();

      expect(rendered.length).toBeGreaterThan(0);
      // Never leak the raw code, and never fall back to the generic message
      // when the backend supplied something specific.
      expect(rendered).not.toBe(code);
      expect(rendered).not.toBe(UI.membership.applyError);

      if (entry.copy === 'dedicated') {
        // The dialog owns this copy, so the backend wording must not win.
        expect(rendered).not.toBe(BACKEND_MESSAGES[code]);
      } else {
        // `backend` and `preferred` both render the backend message when there
        // is one; they differ only in what happens when there is not.
        expect(rendered).toBe(BACKEND_MESSAGES[code]);
      }
    });
  }

  for (const [code, entry] of Object.entries(CONTRACT.errors)) {
    if (entry.copy !== 'preferred') continue;
    it(`still explains "${code}" when the backend sends no message`, async () => {
      const dialog = await mountWithFailingApply(new WsError(code, ''));
      await applyAChange(dialog);

      const rendered = dialog.renderRoot.querySelector('.apply-error')!.textContent!.trim();
      expect(rendered).toBe(UI.membership.disabledError);
      expect(rendered).not.toBe(UI.membership.applyError);
    });
  }

  it('falls back to the generic message when the backend sends no message', async () => {
    const dialog = await mountWithFailingApply(new WsError('unheard_of_code', ''));
    await applyAChange(dialog);

    const rendered = dialog.renderRoot.querySelector('.apply-error')!.textContent!.trim();
    expect(rendered).toBe(UI.membership.applyError);
  });

  it('uses dedicated copy for the two codes that describe runtime damage', () => {
    // These two differ only in whether the previous state survived, so the
    // wording has to distinguish them for the user.
    expect(UI.membership.reloadError).not.toBe(UI.membership.rollbackError);
    expect(CONTRACT.errors.reload_failed.copy).toBe('dedicated');
    expect(CONTRACT.errors.rollback_reload_failed.copy).toBe('dedicated');
  });
});
