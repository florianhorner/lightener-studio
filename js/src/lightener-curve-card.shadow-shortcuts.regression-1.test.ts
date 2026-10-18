// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { LightenerCurveCard } from './lightener-curve-card.js';
import type { Hass, LightCurve } from './utils/types.js';
import type { SaveState } from './utils/save-lifecycle.js';

// Regression: editor shortcuts must cross host shadow roots without reaching another card.

type CardInternals = {
  _curves: LightCurve[];
  _undoStack: LightCurve[][];
  _dirtyVersion: number;
  _saveState: SaveState;
  _membershipOpen: boolean;
  _onSave: () => Promise<boolean>;
  _undo: () => void;
  _onCancel: () => void;
};

const hosts: HTMLElement[] = [];
const shortcuts = [
  { name: 'Ctrl+S', key: 's', ctrlKey: true, method: '_onSave' },
  { name: 'Cmd+S', key: 's', metaKey: true, method: '_onSave' },
  { name: 'Ctrl+Z', key: 'z', ctrlKey: true, method: '_undo' },
  { name: 'Cmd+Z', key: 'z', metaKey: true, method: '_undo' },
  { name: 'Escape', key: 'Escape', method: '_onCancel' },
] as const;

beforeAll(async () => {
  window.matchMedia ??= () =>
    ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }) as unknown as MediaQueryList;
  await import('./lightener-curve-card.js');
});

afterEach(() => {
  hosts.splice(0).forEach((host) => host.remove());
  sessionStorage.clear();
  vi.restoreAllMocks();
});

async function mountCard() {
  const host = document.createElement('div');
  const panel = document.createElement('div');
  host.attachShadow({ mode: 'open' }).append(panel);
  const root = panel.attachShadow({ mode: 'open' });
  const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
  card.setConfig({ entity: 'light.group' });
  card.hass = {
    user: { is_admin: true },
    states: {
      'light.group': { state: 'on', attributes: { friendly_name: 'Group' } },
      'light.a': { state: 'on', attributes: { friendly_name: 'Alpha' } },
    },
    callWS: vi.fn().mockResolvedValue({
      entities: { 'light.a': { brightness: { '1': '1', '100': '100' } } },
    }),
    callApi: vi.fn().mockResolvedValue(undefined),
    callService: vi.fn().mockResolvedValue(undefined),
  } as unknown as Hass;
  root.append(card);
  hosts.push(host);
  document.body.append(host);
  await card.updateComplete;
  await Promise.resolve();
  await card.updateComplete;
  const legend = card.renderRoot.querySelector('curve-legend')!;
  await legend.updateComplete;
  const button = legend.shadowRoot!.querySelector<HTMLButtonElement>('.row-select-btn')!;
  const internal = card as unknown as CardInternals;
  internal._dirtyVersion++;
  internal._undoStack = [internal._curves];
  const actions = {
    _onSave: vi.spyOn(internal, '_onSave').mockResolvedValue(true),
    _undo: vi.spyOn(internal, '_undo').mockImplementation(() => {}),
    _onCancel: vi.spyOn(internal, '_onCancel').mockImplementation(() => {}),
  };
  return { host, root, card, button, internal, actions };
}

function press(target: HTMLElement, shortcut: KeyboardEventInit): KeyboardEvent {
  target.focus();
  const event = new KeyboardEvent('keydown', {
    ...shortcut,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

describe('keyboard shortcuts inside nested shadow roots', () => {
  it.each(shortcuts)('handles $name from this card', async (shortcut) => {
    const { host, button, actions } = await mountCard();

    const event = press(button, shortcut);

    expect(document.activeElement).toBe(host);
    expect(actions[shortcut.method]).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it.each(shortcuts)('ignores $name in a sibling input', async (shortcut) => {
    const { host, root, actions } = await mountCard();
    const input = document.createElement('input');
    root.append(input);

    const event = press(input, shortcut);

    expect(document.activeElement).toBe(host);
    Object.values(actions).forEach((action) => expect(action).not.toHaveBeenCalled());
    expect(event.defaultPrevented).toBe(false);
  });

  it.each(shortcuts)('does not send $name to a second card', async (shortcut) => {
    const first = await mountCard();
    const second = await mountCard();

    const event = press(first.button, shortcut);

    expect(first.actions[shortcut.method]).toHaveBeenCalledTimes(1);
    Object.values(second.actions).forEach((action) => expect(action).not.toHaveBeenCalled());
    expect(event.defaultPrevented).toBe(true);
  });

  for (const state of ['saving', 'membership editing'] as const) {
    it.each([shortcuts[0], shortcuts[2], shortcuts[4]])(
      `keeps $name blocked while ${state}`,
      async (shortcut) => {
        const { button, internal, actions } = await mountCard();
        if (state === 'saving') internal._saveState = { phase: 'saving' };
        else internal._membershipOpen = true;

        const event = press(button, shortcut);

        Object.values(actions).forEach((action) => expect(action).not.toHaveBeenCalled());
        expect(event.defaultPrevented).toBe(false);
      }
    );
  }

  it('preserves the body-focus fallback for a nested card', async () => {
    const { actions } = await mountCard();

    const event = press(document.body, shortcuts[0]);

    expect(actions._onSave).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });
});
