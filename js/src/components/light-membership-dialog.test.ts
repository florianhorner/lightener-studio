// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Hass } from '../utils/types.js';

type Dialog = HTMLElement & {
  hass: Hass;
  groupEntityId: string;
  updateComplete: Promise<void>;
  renderRoot: ShadowRoot;
};

function makeHass(callWS: ReturnType<typeof vi.fn>): Hass {
  return {
    user: { is_admin: true },
    locale: { language: 'en' },
    states: {},
    callWS: callWS as unknown as Hass['callWS'],
    callApi: vi.fn(),
    callService: vi.fn(),
  };
}

async function mount(callWS: ReturnType<typeof vi.fn>): Promise<Dialog> {
  const dialog = document.createElement('light-membership-dialog') as Dialog;
  dialog.hass = makeHass(callWS);
  dialog.groupEntityId = 'light.living_room';
  document.body.appendChild(dialog);
  await dialog.updateComplete;
  await Promise.resolve();
  await dialog.updateComplete;
  return dialog;
}

beforeAll(async () => {
  await import('./light-membership-dialog.js');
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('light-membership-dialog', () => {
  it('loads current members and commits one explicit batch update', async () => {
    const callWS = vi
      .fn()
      .mockResolvedValueOnce({
        observed_controlled_entity_ids: ['light.ceiling', 'light.sofa'],
        lights: [
          {
            entity_id: 'light.ceiling',
            name: 'Ceiling',
            available: true,
            area_id: 'living',
            area_name: 'Living room',
          },
          {
            entity_id: 'light.sofa',
            name: 'Sofa',
            available: true,
            area_id: 'living',
            area_name: 'Living room',
          },
          {
            entity_id: 'light.reading',
            name: 'Reading',
            available: true,
            area_id: 'living',
            area_name: 'Living room',
          },
        ],
      })
      .mockResolvedValueOnce({
        entities: {},
        added_entity_ids: ['light.reading'],
        removed_entity_ids: ['light.sofa'],
      });
    const dialog = await mount(callWS);

    const boxes = dialog.renderRoot.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    const apply = dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!;
    expect([...boxes].filter((box) => box.checked)).toHaveLength(2);
    expect(apply.disabled).toBe(true);
    boxes[1].click();
    boxes[2].click();
    await dialog.updateComplete;
    expect(apply.disabled).toBe(false);

    const applied = vi.fn();
    dialog.addEventListener('membership-applied', applied);
    dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!.click();
    await Promise.resolve();
    await dialog.updateComplete;

    expect(callWS).toHaveBeenLastCalledWith({
      type: 'lightener/set_controlled_lights',
      entity_id: 'light.living_room',
      controlled_entity_ids: ['light.ceiling', 'light.reading'],
      observed_controlled_entity_ids: ['light.ceiling', 'light.sofa'],
    });
    expect(applied).toHaveBeenCalledTimes(1);
  });

  it('filters by localized name or entity id and exposes unavailable retained lights', async () => {
    const dialog = await mount(
      vi.fn().mockResolvedValue({
        observed_controlled_entity_ids: ['light.retired'],
        lights: [
          {
            entity_id: 'light.retired',
            name: 'Old floor lamp',
            available: false,
            area_id: null,
            area_name: null,
          },
          {
            entity_id: 'light.kitchen',
            name: 'Kitchen',
            available: true,
            area_id: 'kitchen',
            area_name: 'Kitchen',
          },
        ],
      })
    );
    const search = dialog.renderRoot.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'retired';
    search.dispatchEvent(new Event('input'));
    await dialog.updateComplete;

    expect(dialog.renderRoot.querySelectorAll('.light-row')).toHaveLength(1);
    expect(dialog.renderRoot.textContent).toContain('Unavailable');
  });

  it('keeps conflict errors in the dialog for a deliberate retry', async () => {
    const dialog = await mount(
      vi
        .fn()
        .mockResolvedValueOnce({
          observed_controlled_entity_ids: ['light.ceiling'],
          lights: [
            {
              entity_id: 'light.ceiling',
              name: 'Ceiling',
              available: true,
              area_id: null,
              area_name: null,
            },
            {
              entity_id: 'light.reading',
              name: 'Reading',
              available: true,
              area_id: null,
              area_name: null,
            },
          ],
        })
        .mockRejectedValueOnce({ code: 'conflict', message: 'stale' })
    );

    dialog.renderRoot.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1].click();
    await dialog.updateComplete;
    dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!.click();
    await Promise.resolve();
    await dialog.updateComplete;

    const alert = dialog.renderRoot.querySelector<HTMLElement>('[role="alert"]');
    expect(alert?.textContent).toContain('Close and reopen Edit lights');
    expect(dialog.renderRoot.activeElement).toBe(alert);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it('surfaces a load error instead of crashing render when the backend answers with a malformed object', async () => {
    // A stale backend behind a fresh frontend answers unknown commands with {}.
    const callWS = vi.fn().mockResolvedValue({});
    const dialog = await mount(callWS);

    const alert = dialog.renderRoot.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Could not load lights.');
    expect(dialog.renderRoot.querySelector('.loading')).toBeNull();
  });

  it('latches a failed load instead of retrying every hass tick, retrying only on a new states object', async () => {
    const callWS = vi.fn().mockRejectedValue({ message: 'backend down' });
    const dialog = await mount(callWS);

    // The initial load ran exactly once and surfaced an error.
    expect(callWS).toHaveBeenCalledTimes(1);
    expect(dialog.renderRoot.querySelector('.error')).not.toBeNull();

    // A new hass object carrying the SAME states reference must not re-run the
    // load — otherwise a failing backend spins _load() on every hass tick.
    const sameStates = dialog.hass.states;
    const repeatHass = makeHass(callWS);
    repeatHass.states = sameStates;
    dialog.hass = repeatHass;
    await dialog.updateComplete;
    await Promise.resolve();
    expect(callWS).toHaveBeenCalledTimes(1);

    // A genuinely new hass.states object is the single retry boundary.
    dialog.hass = makeHass(callWS);
    await dialog.updateComplete;
    await Promise.resolve();
    await dialog.updateComplete;
    expect(callWS).toHaveBeenCalledTimes(2);
  });

  it('keeps retained member order and appends new selections', async () => {
    const callWS = vi
      .fn()
      .mockResolvedValueOnce({
        observed_controlled_entity_ids: ['light.sofa', 'light.ceiling'],
        lights: [
          {
            entity_id: 'light.ceiling',
            name: 'Ceiling',
            available: true,
            area_id: null,
            area_name: null,
          },
          {
            entity_id: 'light.sofa',
            name: 'Sofa',
            available: true,
            area_id: null,
            area_name: null,
          },
          {
            entity_id: 'light.reading',
            name: 'Reading',
            available: true,
            area_id: null,
            area_name: null,
          },
        ],
      })
      .mockResolvedValueOnce({ entities: {}, added_entity_ids: [], removed_entity_ids: [] });
    const dialog = await mount(callWS);

    const reading = [...dialog.renderRoot.querySelectorAll<HTMLElement>('.light-row')].find((row) =>
      row.textContent?.includes('light.reading')
    )!;
    reading.querySelector<HTMLInputElement>('input')!.click();
    await dialog.updateComplete;
    dialog.renderRoot.querySelector<HTMLButtonElement>('.action.primary')!.click();
    await Promise.resolve();

    expect(callWS).toHaveBeenLastCalledWith(
      expect.objectContaining({
        controlled_entity_ids: ['light.sofa', 'light.ceiling', 'light.reading'],
      })
    );
  });
});
