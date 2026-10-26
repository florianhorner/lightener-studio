// @vitest-environment jsdom

import { UI } from '../utils/strings.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  CANDIDATE_STATE_METADATA_VERSION,
  MEMBERSHIP_ERROR_DISABLED_ENTITY,
  normalizeCandidateResponse,
} from '../utils/candidate-lights.js';
import type { Hass } from '../utils/types.js';

const thisDir = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(thisDir, '../../../tests/fixtures/candidate_lights_v1.json');

type Dialog = HTMLElement & {
  hass: Hass | null;
  groupEntityId: string;
  updateComplete: Promise<void>;
  renderRoot: ShadowRoot;
};

interface RawCandidate {
  entity_id: string;
  name: string;
  available: boolean;
  area_id: string | null;
  area_name: string | null;
  hidden: boolean;
  disabled: boolean;
  missing: boolean;
}

function candidate(
  entityId: string,
  name: string,
  overrides: Partial<Omit<RawCandidate, 'entity_id' | 'name'>> = {}
): RawCandidate {
  return {
    entity_id: entityId,
    name,
    available: true,
    area_id: null,
    area_name: null,
    hidden: false,
    disabled: false,
    missing: false,
    ...overrides,
  };
}

function v1Response(observed: string[], lights: RawCandidate[]) {
  return {
    capabilities: {
      candidate_state_metadata: CANDIDATE_STATE_METADATA_VERSION,
    },
    observed_controlled_entity_ids: observed,
    lights,
  };
}

function makeHass(callWS: ReturnType<typeof vi.fn>): Hass {
  return {
    user: { is_admin: true },
    locale: { language: 'en' },
    states: {
      'light.living_room': {
        state: 'on',
        attributes: { friendly_name: 'Living room' },
      },
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

async function mount(callWS: ReturnType<typeof vi.fn>): Promise<Dialog> {
  const dialog = document.createElement('light-membership-dialog') as Dialog;
  dialog.hass = makeHass(callWS);
  dialog.groupEntityId = 'light.living_room';
  document.body.appendChild(dialog);
  await vi.waitFor(() => {
    expect(dialog.renderRoot.querySelector('.loading-copy')).toBeNull();
  });
  await settle(dialog);
  return dialog;
}

function row(dialog: Dialog, entityId: string): HTMLElement {
  const match = [...dialog.renderRoot.querySelectorAll<HTMLElement>('.light-row')].find(
    (candidateRow) =>
      candidateRow.querySelector<HTMLInputElement>('input')?.dataset.entityId === entityId
  );
  expect(match, `row for ${entityId}`).toBeDefined();
  return match!;
}

function checkbox(dialog: Dialog, entityId: string): HTMLInputElement {
  const input = row(dialog, entityId).querySelector<HTMLInputElement>('input');
  expect(input, `checkbox for ${entityId}`).not.toBeNull();
  return input!;
}

function visibleEntityIds(dialog: Dialog): string[] {
  return [...dialog.renderRoot.querySelectorAll<HTMLInputElement>('.light-row input')].map(
    (input) => input.dataset.entityId!
  );
}

beforeAll(async () => {
  await import('./light-membership-dialog.js');
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('candidate response normalization', () => {
  it('accepts the shared backend/frontend version 1 contract fixture', () => {
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as unknown;
    const normalized = normalizeCandidateResponse(fixture);

    expect(normalized.metadataMode).toBe('v1');
    expect(normalized.metadataWarning).toBeNull();
    expect(normalized.lights).toHaveLength(10);
    expect(normalized.lights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity_id: 'light.hidden_disabled',
          hidden: true,
          disabled: true,
          missing: false,
        }),
        expect.objectContaining({
          entity_id: 'light.missing_retained',
          hidden: false,
          disabled: false,
          missing: true,
        }),
      ])
    );
  });

  it('accepts only complete version 1 metadata and falls the whole response back otherwise', () => {
    const complete = normalizeCandidateResponse(
      v1Response(
        ['light.current'],
        [
          candidate('light.current', 'Current', { hidden: true }),
          candidate('light.new', 'New', { disabled: true }),
        ]
      )
    );
    expect(complete).toMatchObject({
      metadataMode: 'v1',
      metadataWarning: null,
      observedControlledEntityIds: ['light.current'],
    });
    expect(
      complete.lights.map(({ hidden, disabled, missing }) => ({ hidden, disabled, missing }))
    ).toEqual([
      { hidden: true, disabled: false, missing: false },
      { hidden: false, disabled: true, missing: false },
    ]);

    const incomplete = normalizeCandidateResponse({
      capabilities: { candidate_state_metadata: 1 },
      observed_controlled_entity_ids: [],
      lights: [
        candidate('light.complete', 'Complete', { hidden: true }),
        {
          ...candidate('light.incomplete', 'Incomplete', { disabled: true }),
          missing: undefined,
        },
      ],
    });
    expect(incomplete.metadataMode).toBe('legacy');
    expect(incomplete.metadataWarning).toContain('legacy all-visible');
    expect(incomplete.lights).toEqual([
      expect.objectContaining({ hidden: false, disabled: false, missing: false }),
      expect.objectContaining({ hidden: false, disabled: false, missing: false }),
    ]);

    const malformedCapability = normalizeCandidateResponse({
      capabilities: null,
      observed_controlled_entity_ids: [],
      lights: [candidate('light.hidden', 'Hidden', { hidden: true })],
    });
    expect(malformedCapability.metadataMode).toBe('legacy');
    expect(malformedCapability.metadataWarning).toContain('legacy all-visible');
    expect(malformedCapability.lights[0]).toEqual(
      expect.objectContaining({ hidden: false, disabled: false, missing: false })
    );
  });
});

describe('light-membership-dialog', () => {
  it('keeps an absent capability quiet and preserves the all-visible legacy view', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dialog = await mount(
      vi.fn().mockResolvedValue({
        observed_controlled_entity_ids: [],
        lights: [
          candidate('light.hidden', 'Hidden', { hidden: true }),
          candidate('light.disabled', 'Disabled', { disabled: true }),
        ],
      })
    );

    expect(visibleEntityIds(dialog)).toEqual(['light.disabled', 'light.hidden']);
    expect(dialog.renderRoot.querySelector('.exceptional-filter')).toBeNull();
    expect(warning).not.toHaveBeenCalled();
  });

  it('warns once for claimed-invalid metadata and still shows every candidate', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const malformed = {
      capabilities: { candidate_state_metadata: 2 },
      observed_controlled_entity_ids: [],
      lights: [candidate('light.first', 'First', { hidden: true })],
    };
    const callWS = vi.fn().mockResolvedValue(malformed);
    const dialog = await mount(callWS);
    expect(visibleEntityIds(dialog)).toEqual(['light.first']);

    dialog.groupEntityId = 'light.second_group';
    await vi.waitFor(() => expect(callWS).toHaveBeenCalledTimes(2));
    await settle(dialog);

    let metadataWarnings = warning.mock.calls.filter(([message]) =>
      String(message).includes('candidate_state_metadata')
    );
    expect(metadataWarnings).toHaveLength(1);

    const independent = await mount(vi.fn().mockResolvedValue(malformed));
    expect(visibleEntityIds(independent)).toEqual(['light.first']);
    metadataWarnings = warning.mock.calls.filter(([message]) =>
      String(message).includes('candidate_state_metadata')
    );
    expect(metadataWarnings).toHaveLength(2);
    expect(String(metadataWarnings[0][0])).toContain(
      'Expected v1 with boolean hidden, disabled, and missing on every light'
    );
    expect(String(metadataWarnings[0][0])).toContain('legacy all-visible view');
  });

  it('renders the canonical v1 state table without hiding retained exceptional members', async () => {
    const dialog = await mount(
      vi.fn().mockResolvedValue(
        v1Response(
          ['light.hidden_current', 'light.disabled_current', 'light.missing_current'],
          [
            candidate('light.unavailable', 'Unavailable new', { available: false }),
            candidate('light.hidden_current', 'Beta current', { hidden: true }),
            candidate('light.hidden_unavailable', 'Hidden unavailable', {
              hidden: true,
              available: false,
            }),
            candidate('light.disabled_new', 'Disabled new', {
              disabled: true,
              available: false,
            }),
            candidate('light.ordinary', 'Ordinary new'),
            candidate('light.disabled_current', 'Alpha current', {
              disabled: true,
              available: false,
            }),
            candidate('light.hidden_new', 'Hidden new', { hidden: true }),
            candidate('light.missing_current', 'Gamma current', {
              available: false,
              missing: true,
            }),
          ]
        )
      )
    );

    expect(visibleEntityIds(dialog)).toEqual([
      'light.disabled_current',
      'light.hidden_current',
      'light.missing_current',
      'light.ordinary',
      'light.unavailable',
    ]);
    expect(dialog.renderRoot.textContent).toContain('Show hidden & disabled (3)');
    expect(dialog.renderRoot.textContent).toContain('Living room');
    expect(dialog.renderRoot.querySelector<HTMLInputElement>('#membership-search')).toBe(
      dialog.shadowRoot?.activeElement
    );
    expect(row(dialog, 'light.disabled_current').textContent).toContain('Disabled');
    expect(row(dialog, 'light.disabled_current').textContent).not.toContain('Unavailable');
    expect(row(dialog, 'light.missing_current').textContent).toContain('Missing');
    expect(row(dialog, 'light.missing_current').textContent).not.toContain('Unavailable');

    dialog.renderRoot.querySelector<HTMLInputElement>('.exceptional-filter')!.click();
    await dialog.updateComplete;

    expect(visibleEntityIds(dialog)).toHaveLength(8);
    expect(checkbox(dialog, 'light.disabled_new').disabled).toBe(true);
    expect(checkbox(dialog, 'light.hidden_new').disabled).toBe(false);
    expect(checkbox(dialog, 'light.disabled_current').disabled).toBe(false);
    expect(row(dialog, 'light.hidden_unavailable').textContent).toContain('Hidden · Unavailable');
    expect(checkbox(dialog, 'light.hidden_unavailable').getAttribute('aria-label')).toBe(
      'Hidden unavailable, Hidden, Unavailable'
    );
    const describedId = checkbox(dialog, 'light.hidden_unavailable').getAttribute(
      'aria-describedby'
    )!;
    expect(dialog.renderRoot.querySelector(`#${describedId}`)?.textContent).toBe(
      'light.hidden_unavailable'
    );

    checkbox(dialog, 'light.disabled_new').click();
    await dialog.updateComplete;
    expect(checkbox(dialog, 'light.disabled_new').checked).toBe(false);

    checkbox(dialog, 'light.hidden_new').click();
    dialog.renderRoot.querySelector<HTMLInputElement>('.exceptional-filter')!.click();
    await dialog.updateComplete;
    expect(visibleEntityIds(dialog)).toContain('light.hidden_new');
    expect(checkbox(dialog, 'light.hidden_new').checked).toBe(true);
    expect(visibleEntityIds(dialog)).not.toContain('light.hidden_unavailable');
  });

  it('uses immutable Current group only scope and never re-sorts rows after edits', async () => {
    const dialog = await mount(
      vi
        .fn()
        .mockResolvedValue(
          v1Response(
            ['light.sofa', 'light.ceiling'],
            [
              candidate('light.reading', 'Reading'),
              candidate('light.sofa', 'Sofa'),
              candidate('light.desk', 'Desk'),
              candidate('light.ceiling', 'Ceiling'),
            ]
          )
        )
    );
    const initialDisplayOrder = visibleEntityIds(dialog);
    expect(initialDisplayOrder).toEqual([
      'light.ceiling',
      'light.sofa',
      'light.desk',
      'light.reading',
    ]);

    checkbox(dialog, 'light.ceiling').click();
    checkbox(dialog, 'light.desk').click();
    await dialog.updateComplete;
    expect(visibleEntityIds(dialog)).toEqual(initialDisplayOrder);

    dialog.renderRoot.querySelector<HTMLInputElement>('.current-group-filter')!.click();
    await dialog.updateComplete;
    expect(visibleEntityIds(dialog)).toEqual(['light.ceiling', 'light.sofa']);
    expect(checkbox(dialog, 'light.ceiling').checked).toBe(false);
    expect(dialog.renderRoot.textContent).toContain('Current group only (2)');
    expect(dialog.renderRoot.querySelector('.result-summary')?.textContent).toContain(
      '1 of 2 selected shown'
    );

    dialog.renderRoot.querySelector<HTMLInputElement>('.current-group-filter')!.click();
    await dialog.updateComplete;
    expect(checkbox(dialog, 'light.desk').checked).toBe(true);
    expect(visibleEntityIds(dialog)).toEqual(initialDisplayOrder);
  });

  it('composes search and area filters without mutating pending selection', async () => {
    const dialog = await mount(
      vi.fn().mockResolvedValue(
        v1Response(
          ['light.ceiling'],
          [
            candidate('light.floor', 'Floor', {
              area_id: 'office',
              area_name: 'Office',
            }),
            candidate('light.ceiling', 'Ceiling', {
              area_id: 'living',
              area_name: 'Living room',
            }),
            candidate('light.reading', 'Reading', {
              area_id: 'living',
              area_name: 'Living room',
            }),
          ]
        )
      )
    );
    checkbox(dialog, 'light.reading').click();
    await dialog.updateComplete;

    const search = dialog.renderRoot.querySelector<HTMLInputElement>('#membership-search')!;
    search.value = 'floor';
    search.dispatchEvent(new Event('input'));
    await dialog.updateComplete;

    expect(visibleEntityIds(dialog)).toEqual(['light.floor']);
    expect(dialog.renderRoot.querySelector('.result-summary')?.textContent).toContain(
      '0 of 2 selected shown'
    );
    expect(dialog.renderRoot.querySelector('.count')?.textContent).toContain('2 selected');

    search.value = '';
    search.dispatchEvent(new Event('input'));
    const area = dialog.renderRoot.querySelector<HTMLSelectElement>('select')!;
    area.value = 'living';
    area.dispatchEvent(new Event('change'));
    await dialog.updateComplete;

    expect(visibleEntityIds(dialog)).toEqual(['light.ceiling', 'light.reading']);
    expect(checkbox(dialog, 'light.reading').checked).toBe(true);
  });

  it('submits retained members in observed order and new members in RPC order', async () => {
    const callWS = vi
      .fn()
      .mockResolvedValueOnce(
        v1Response(
          ['light.sofa', 'light.ceiling'],
          [
            candidate('light.reading', 'Reading'),
            candidate('light.ceiling', 'Ceiling'),
            candidate('light.sofa', 'Sofa'),
            candidate('light.desk', 'Desk'),
          ]
        )
      )
      .mockResolvedValueOnce({
        entities: {},
        added_entity_ids: ['light.reading', 'light.desk'],
        removed_entity_ids: ['light.sofa'],
      });
    const dialog = await mount(callWS);

    checkbox(dialog, 'light.sofa').click();
    checkbox(dialog, 'light.desk').click();
    checkbox(dialog, 'light.reading').click();
    await dialog.updateComplete;

    const applied = vi.fn();
    dialog.addEventListener('membership-applied', applied);
    dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!.click();
    await settle(dialog);

    expect(callWS).toHaveBeenLastCalledWith({
      type: 'lightener/set_controlled_lights',
      entity_id: 'light.living_room',
      controlled_entity_ids: ['light.ceiling', 'light.reading', 'light.desk'],
      observed_controlled_entity_ids: ['light.sofa', 'light.ceiling'],
    });
    expect(applied).toHaveBeenCalledTimes(1);
  });

  it('renders source/filter/exceptional empty states with explicit recovery', async () => {
    const sourceEmpty = await mount(vi.fn().mockResolvedValue(v1Response([], [])));
    expect(sourceEmpty.renderRoot.textContent).toContain('No lights are available to add.');
    sourceEmpty.remove();

    const dialog = await mount(
      vi
        .fn()
        .mockResolvedValue(
          v1Response([], [candidate('light.hidden', 'Hidden only', { hidden: true })])
        )
    );
    expect(dialog.renderRoot.textContent).toContain('1 hidden or disabled light.');
    dialog.renderRoot.querySelectorAll<HTMLButtonElement>('.state-message .action')[0].click();
    await dialog.updateComplete;
    expect(visibleEntityIds(dialog)).toEqual(['light.hidden']);
    expect(dialog.shadowRoot?.activeElement).toBe(checkbox(dialog, 'light.hidden'));

    const search = dialog.renderRoot.querySelector<HTMLInputElement>('#membership-search')!;
    search.value = 'no match';
    search.dispatchEvent(new Event('input'));
    await dialog.updateComplete;
    expect(dialog.renderRoot.textContent).toContain('No lights match these filters.');
    expect(dialog.renderRoot.textContent).toContain('Clear search and area');
    dialog.renderRoot.querySelector<HTMLButtonElement>('.state-message .action')!.click();
    await dialog.updateComplete;
    expect(dialog.shadowRoot?.activeElement).toBe(search);
  });

  it('restarts an interrupted load after disconnect and ignores the stale response', async () => {
    let resolveFirst!: (value: ReturnType<typeof v1Response>) => void;
    const firstLoad = new Promise<ReturnType<typeof v1Response>>((resolve) => {
      resolveFirst = resolve;
    });
    const callWS = vi
      .fn()
      .mockReturnValueOnce(firstLoad)
      .mockResolvedValueOnce(v1Response([], [candidate('light.fresh', 'Fresh')]));
    const dialog = document.createElement('light-membership-dialog') as Dialog;
    dialog.hass = makeHass(callWS);
    dialog.groupEntityId = 'light.living_room';
    document.body.appendChild(dialog);
    await vi.waitFor(() => expect(callWS).toHaveBeenCalledTimes(1));

    dialog.remove();
    document.body.appendChild(dialog);
    await vi.waitFor(() => expect(callWS).toHaveBeenCalledTimes(2));
    await settle(dialog);
    expect(visibleEntityIds(dialog)).toEqual(['light.fresh']);

    resolveFirst(v1Response([], [candidate('light.stale', 'Stale')]));
    await Promise.resolve();
    await Promise.resolve();
    expect(visibleEntityIds(dialog)).toEqual(['light.fresh']);
  });

  it('stays idle for empty inputs and loads again when group and hass return', async () => {
    const callWS = vi
      .fn()
      .mockResolvedValueOnce(v1Response([], [candidate('light.first', 'First')]))
      .mockResolvedValueOnce(v1Response([], [candidate('light.second', 'Second')]))
      .mockResolvedValueOnce(v1Response([], [candidate('light.third', 'Third')]));
    const dialog = await mount(callWS);

    dialog.groupEntityId = '';
    await settle(dialog);
    expect(callWS).toHaveBeenCalledTimes(1);
    expect(dialog.renderRoot.querySelector('.loading-copy')).toBeNull();

    dialog.groupEntityId = 'light.second_group';
    await vi.waitFor(() => expect(callWS).toHaveBeenCalledTimes(2));
    await settle(dialog);
    expect(visibleEntityIds(dialog)).toEqual(['light.second']);

    dialog.hass = null;
    await settle(dialog);
    expect(dialog.renderRoot.querySelector('.loading-copy')).toBeNull();
    dialog.hass = makeHass(callWS);
    await vi.waitFor(() => expect(callWS).toHaveBeenCalledTimes(3));
    await settle(dialog);
    expect(visibleEntityIds(dialog)).toEqual(['light.third']);
  });

  it('keys rows and restores focus when a concealed pending exceptional row disappears', async () => {
    const dialog = await mount(
      vi
        .fn()
        .mockResolvedValue(
          v1Response(
            [],
            [
              candidate('light.hidden', 'A hidden', { hidden: true }),
              candidate('light.ordinary', 'B ordinary'),
            ]
          )
        )
    );
    const disclosure = dialog.renderRoot.querySelector<HTMLInputElement>('.exceptional-filter')!;
    disclosure.click();
    await dialog.updateComplete;
    const ordinaryBefore = checkbox(dialog, 'light.ordinary');
    checkbox(dialog, 'light.hidden').click();
    disclosure.click();
    await dialog.updateComplete;

    const hidden = checkbox(dialog, 'light.hidden');
    hidden.focus();
    hidden.click();
    await settle(dialog);

    expect(visibleEntityIds(dialog)).toEqual(['light.ordinary']);
    expect(checkbox(dialog, 'light.ordinary')).toBe(ordinaryBefore);
    expect(dialog.shadowRoot?.activeElement).toBe(disclosure);
  });

  it('keeps recovery and Tab focus inside the dialog when only disabled rows can appear', async () => {
    const dialog = await mount(
      vi
        .fn()
        .mockResolvedValue(
          v1Response([], [candidate('light.disabled', 'Disabled', { disabled: true })])
        )
    );
    const heading = dialog.renderRoot.querySelector<HTMLElement>('#membership-title')!;
    const reveal = dialog.renderRoot.querySelector<HTMLButtonElement>('.state-message .action')!;
    reveal.focus();
    reveal.click();
    await settle(dialog);
    expect(dialog.shadowRoot?.activeElement).toBe(heading);

    const currentGroup =
      dialog.renderRoot.querySelector<HTMLInputElement>('.current-group-filter')!;
    currentGroup.click();
    await dialog.updateComplete;
    const showAll = dialog.renderRoot.querySelector<HTMLButtonElement>('.state-message .action')!;
    showAll.focus();
    showAll.click();
    await settle(dialog);
    expect(dialog.shadowRoot?.activeElement).toBe(heading);

    const forward = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(forward);
    expect(forward.defaultPrevented).toBe(true);
    expect(dialog.shadowRoot?.activeElement).toBe(
      dialog.renderRoot.querySelector<HTMLButtonElement>('.close')
    );

    heading.focus();
    const backward = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(backward);
    expect(backward.defaultPrevented).toBe(true);
    expect(dialog.shadowRoot?.activeElement).toBe(
      dialog.renderRoot.querySelector<HTMLButtonElement>('footer .action:not(:disabled)')
    );
  });

  it('counts only suppressed exceptional matches while Current group stays immutable', async () => {
    const dialog = await mount(
      vi.fn().mockResolvedValue(
        v1Response(
          ['light.current'],
          [
            candidate('light.current', 'Current', {
              area_id: 'office',
              area_name: 'Office',
            }),
            candidate('light.office_hidden', 'Office hidden', {
              hidden: true,
              area_id: 'office',
              area_name: 'Office',
            }),
            candidate('light.kitchen_hidden', 'Kitchen hidden', {
              hidden: true,
              area_id: 'kitchen',
              area_name: 'Kitchen',
            }),
          ]
        )
      )
    );
    const area = dialog.renderRoot.querySelector<HTMLSelectElement>('select')!;
    area.value = 'kitchen';
    area.dispatchEvent(new Event('change'));
    await dialog.updateComplete;
    expect(dialog.renderRoot.textContent).toContain('Current group only (1)');
    expect(dialog.renderRoot.textContent).toContain('Show hidden & disabled (1)');

    const disclosure = dialog.renderRoot.querySelector<HTMLInputElement>('.exceptional-filter')!;
    disclosure.click();
    await dialog.updateComplete;
    checkbox(dialog, 'light.kitchen_hidden').click();
    disclosure.click();
    await dialog.updateComplete;
    expect(dialog.renderRoot.textContent).toContain('Show hidden & disabled (0)');
    expect(visibleEntityIds(dialog)).toEqual(['light.kitchen_hidden']);
  });

  it('debounces result announcements while keeping the visible summary immediate', async () => {
    const dialog = await mount(
      vi
        .fn()
        .mockResolvedValue(
          v1Response(
            [],
            [candidate('light.ceiling', 'Ceiling'), candidate('light.reading', 'Reading')]
          )
        )
    );
    const announcement = dialog.renderRoot.querySelector<HTMLElement>('.result-announcement')!;
    await vi.waitFor(() => expect(announcement.textContent).toContain('2 lights shown'));
    const originalAnnouncement = announcement.textContent;
    const search = dialog.renderRoot.querySelector<HTMLInputElement>('#membership-search')!;

    search.value = 'no match';
    search.dispatchEvent(new Event('input'));
    await dialog.updateComplete;
    expect(dialog.renderRoot.querySelector('.result-summary')?.textContent).toContain(
      '0 lights shown'
    );
    expect(announcement.textContent).toBe(originalAnnouncement);

    search.value = 'reading';
    search.dispatchEvent(new Event('input'));
    await dialog.updateComplete;
    expect(announcement.textContent).toBe(originalAnnouncement);
    await vi.waitFor(() => expect(announcement.textContent).toContain('1 light shown'));
  });

  it('logs a rejected post-load render handoff without relabeling the successful load', async () => {
    const renderError = new Error('render handoff failed');
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    const callWS = vi
      .fn()
      .mockResolvedValueOnce(v1Response([], [candidate('light.first', 'First')]))
      .mockResolvedValueOnce(v1Response([], [candidate('light.second', 'Second')]));
    const dialog = await mount(callWS);
    Object.defineProperty(dialog, 'updateComplete', {
      configurable: true,
      get: () => Promise.reject(renderError),
    });

    dialog.groupEntityId = 'light.second_group';
    await vi.waitFor(() => expect(callWS).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(diagnostic).toHaveBeenCalledWith(
      '[Lightener] Failed to focus the loaded membership dialog:',
      renderError
    );
    expect(dialog.renderRoot.querySelector('.load-error')).toBeNull();
    expect(visibleEntityIds(dialog)).toEqual(['light.second']);
  });

  it('keeps load error and empty states exclusive and supports an explicit retry', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    const callWS = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(v1Response([], [candidate('light.recovered', 'Recovered light')]));
    const dialog = await mount(callWS);

    const alert = dialog.renderRoot.querySelector<HTMLElement>('.load-error');
    expect(alert?.textContent).toContain('Could not load lights.');
    expect(dialog.shadowRoot?.activeElement).toBe(alert);
    expect(dialog.renderRoot.querySelector('.empty-copy')).toBeNull();
    expect(diagnostic).toHaveBeenCalledWith(
      '[Lightener] Failed to response candidate lights:',
      expect.any(Error)
    );

    const retry = dialog.renderRoot.querySelector<HTMLButtonElement>('.state-message .action')!;
    retry.focus();
    dialog.hass = {
      ...makeHass(callWS),
      states: { ...makeHass(callWS).states },
    };
    await settle(dialog);
    expect(callWS).toHaveBeenCalledTimes(1);
    expect(dialog.renderRoot.querySelector('.loading-copy')).toBeNull();
    expect(dialog.shadowRoot?.activeElement).toBe(retry);

    retry.click();
    await vi.waitFor(() => expect(callWS).toHaveBeenCalledTimes(2));
    await settle(dialog);

    expect(visibleEntityIds(dialog)).toEqual(['light.recovered']);
    expect(dialog.renderRoot.querySelector('.load-error')).toBeNull();
  });

  it('preserves filters and pending work when disabled_entity rejects an update', async () => {
    const callWS = vi
      .fn()
      .mockResolvedValueOnce(
        v1Response(
          ['light.ceiling'],
          [candidate('light.ceiling', 'Ceiling'), candidate('light.reading', 'Reading')]
        )
      )
      .mockRejectedValueOnce({
        code: 'disabled_entity',
        message:
          'Could not add light.reading because it is disabled in Home Assistant. Enable it and try again.',
      });
    const dialog = await mount(callWS);

    checkbox(dialog, 'light.reading').click();
    const search = dialog.renderRoot.querySelector<HTMLInputElement>('#membership-search')!;
    search.value = 'reading';
    search.dispatchEvent(new Event('input'));
    await dialog.updateComplete;
    dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!.click();
    await settle(dialog);

    const alert = dialog.renderRoot.querySelector<HTMLElement>('.apply-error');
    expect(alert?.textContent?.trim()).toBe(UI.membership.disabledError);
    expect(alert?.textContent).not.toContain('light.reading');
    expect(alert?.textContent).toContain('disabled in Home Assistant');
    expect(dialog.shadowRoot?.activeElement).toBe(alert);
    expect(search.value).toBe('reading');
    expect(checkbox(dialog, 'light.reading').checked).toBe(true);
    expect(dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!.disabled).toBe(
      false
    );
    expect(
      dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!.textContent
    ).toContain('Try again');
  });

  it('keeps conflict recovery in the dialog with the pending payload intact', async () => {
    const callWS = vi
      .fn()
      .mockResolvedValueOnce(
        v1Response(
          ['light.ceiling'],
          [candidate('light.ceiling', 'Ceiling'), candidate('light.reading', 'Reading')]
        )
      )
      .mockRejectedValueOnce({ code: 'conflict', message: 'stale' });
    const dialog = await mount(callWS);
    checkbox(dialog, 'light.reading').click();
    await dialog.updateComplete;

    dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!.click();
    await settle(dialog);

    const alert = dialog.renderRoot.querySelector<HTMLElement>('.apply-error');
    expect(alert?.textContent).toContain('Close and reopen Edit lights');
    expect(dialog.shadowRoot?.activeElement).toBe(alert);
    expect(checkbox(dialog, 'light.reading').checked).toBe(true);
    expect(dialog.renderRoot.querySelector('.dialog')).not.toBeNull();

    const primary = dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!;
    expect(primary.disabled).toBe(true);
    expect(primary.textContent).toContain('Update lights');
    primary.click();
    await settle(dialog);
    expect(callWS).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['conflict', UI.membership.conflictError],
    ['reload_failed', UI.membership.reloadError],
    ['rollback_reload_failed', UI.membership.rollbackError],
    [MEMBERSHIP_ERROR_DISABLED_ENTITY, UI.membership.disabledError],
    ['preview_active', UI.restoration.membershipBlocked],
    ['unknown', UI.membership.applyError],
  ])('maps %s to reviewed copy regardless of remote text', async (code, copy) => {
    for (const message of [undefined, 'opaque-remote-membership-token']) {
      const callWS = vi
        .fn()
        .mockResolvedValueOnce(
          v1Response(
            ['light.ceiling'],
            [candidate('light.ceiling', 'Ceiling'), candidate('light.reading', 'Reading')]
          )
        )
        .mockRejectedValueOnce({ code, message });
      const dialog = await mount(callWS);
      checkbox(dialog, 'light.reading').click();
      await dialog.updateComplete;
      dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!.click();
      await settle(dialog);
      expect(dialog.renderRoot.querySelector('.apply-error')?.textContent?.trim()).toBe(copy);
      expect(dialog.renderRoot.textContent).not.toContain('opaque-remote-membership-token');
      expect(checkbox(dialog, 'light.reading').checked).toBe(true);
      dialog.remove();
    }
  });

  it('pins the disabled_entity code to the shared backend contract fixture', () => {
    const contract = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      errors: { disabled_entity: { code: string } };
    };
    expect(MEMBERSHIP_ERROR_DISABLED_ENTITY).toBe(contract.errors.disabled_entity.code);
  });

  it('traps Tab and emits close on Escape only while the dialog is idle', async () => {
    const dialog = await mount(
      vi
        .fn()
        .mockResolvedValue(
          v1Response(
            ['light.ceiling'],
            [candidate('light.ceiling', 'Ceiling'), candidate('light.reading', 'Reading')]
          )
        )
    );
    checkbox(dialog, 'light.reading').click();
    await dialog.updateComplete;
    const close = dialog.renderRoot.querySelector<HTMLButtonElement>('.close')!;
    const update = dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!;
    const closed = vi.fn();
    dialog.addEventListener('membership-close', closed);

    update.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(dialog.shadowRoot?.activeElement).toBe(close);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('freezes controls and suppresses duplicate submission while applying', async () => {
    let resolveUpdate!: (value: {
      entities: {};
      added_entity_ids: string[];
      removed_entity_ids: string[];
    }) => void;
    const pending = new Promise<{
      entities: {};
      added_entity_ids: string[];
      removed_entity_ids: string[];
    }>((resolve) => {
      resolveUpdate = resolve;
    });
    const callWS = vi
      .fn()
      .mockResolvedValueOnce(
        v1Response(
          ['light.ceiling'],
          [candidate('light.ceiling', 'Ceiling'), candidate('light.reading', 'Reading')]
        )
      )
      .mockReturnValueOnce(pending);
    const dialog = await mount(callWS);
    checkbox(dialog, 'light.reading').click();
    await dialog.updateComplete;

    const apply = dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!;
    apply.click();
    apply.click();
    await dialog.updateComplete;

    expect(callWS).toHaveBeenCalledTimes(2);
    expect(dialog.renderRoot.querySelector('.applying-status')?.textContent).toContain(
      'Updating group lights'
    );
    expect(dialog.renderRoot.querySelector<HTMLInputElement>('#membership-search')!.disabled).toBe(
      true
    );
    expect(dialog.renderRoot.querySelector<HTMLButtonElement>('.close')!.disabled).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(dialog.shadowRoot?.activeElement).toBe(
      dialog.renderRoot.querySelector('#membership-title')
    );

    resolveUpdate({ entities: {}, added_entity_ids: ['light.reading'], removed_entity_ids: [] });
    await settle(dialog);
    expect(dialog.renderRoot.querySelector('.applying-status')).toBeNull();
  });
});

describe('document preview guard at Apply', () => {
  async function guarded(
    guard: (ids: readonly string[]) => (() => void) | null,
    result: Promise<unknown>
  ) {
    const callWS = vi
      .fn()
      .mockResolvedValueOnce(
        v1Response(
          ['light.ceiling'],
          [candidate('light.ceiling', 'Ceiling'), candidate('light.added', 'Added')]
        )
      )
      .mockReturnValueOnce(result);
    const dialog = await mount(callWS);
    (dialog as unknown as { beginApply: typeof guard }).beginApply = guard;
    checkbox(dialog, 'light.added').click();
    await settle(dialog);
    dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!.click();
    await settle(dialog);
    return { dialog, callWS };
  }
  it('rechecks old and selected members at Apply and sends no mutation when denied', async () => {
    const guard = vi.fn(() => null);
    const { dialog, callWS } = await guarded(guard, Promise.resolve({}));
    expect(guard).toHaveBeenCalledWith(['light.ceiling', 'light.ceiling', 'light.added']);
    expect(callWS).toHaveBeenCalledTimes(1);
    expect(dialog.renderRoot.querySelector('.apply-error')?.textContent).toContain(
      'Finish light restoration review'
    );
  });
  it('holds the reservation across async Apply and releases only after its full success receipt', async () => {
    let finish!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    const disposition = vi.fn();
    const { dialog, callWS } = await guarded(() => disposition, pending);
    expect(callWS).toHaveBeenCalledTimes(2);
    expect(disposition).not.toHaveBeenCalled();
    finish({ entities: {}, added_entity_ids: ['light.added'], removed_entity_ids: [] });
    await settle(dialog);
    expect(disposition).toHaveBeenCalledExactlyOnceWith();
  });
  it.each(['rollback_reload_failed', 'reload_failed', 'transport'])(
    '%s cannot release the document barrier',
    async (code) => {
      let fail!: (value: unknown) => void;
      const pending = new Promise((_resolve, reject) => {
        fail = reject;
      });
      const disposition = vi.fn();
      const { dialog } = await guarded(() => disposition, pending);
      fail(
        code === 'transport'
          ? new Error('lost')
          : { code, message: 'synthetic runtime uncertainty' }
      );
      await settle(dialog);
      expect(disposition).not.toHaveBeenCalled();
    }
  );
});
