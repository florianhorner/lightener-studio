import { testSnapshot } from './test-guarded-backend.js';
// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { LightenerCurveCard } from './lightener-curve-card.js';
import type { Hass, LightCurve } from './utils/types.js';
import type { CoachController } from './utils/coach-controller.js';
import { CURVE_PRESETS, type PresetDef } from './utils/presets.js';
import type { LoadState } from './utils/load-lifecycle.js';
import type { SaveState } from './utils/save-lifecycle.js';

// Regression: editor shortcuts must cross host shadow roots without reaching another card.

type CardInternals = {
  _hass: Hass;
  _curves: LightCurve[];
  _originalCurves: LightCurve[];
  _selectedCurveId: string | null;
  _coach: CoachController;
  _presetGraphTrial: PresetDef | null;
  _isDirty: boolean;
  _undoStack: LightCurve[][];
  _dirtyVersion: number;
  _saveState: SaveState;
  _membershipOpen: boolean;
  _load: LoadState;
  _groupDeleted: boolean;
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
  vi.useRealTimers();
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
    callWS: vi
      .fn()
      .mockResolvedValue(testSnapshot({ 'light.a': { brightness: { '1': '1', '100': '100' } } })),
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
    it.each([shortcuts[0], shortcuts[2], { key: 'Escape', name: 'Escape' }])(
      `keeps $name blocked while ${state}`,
      async (shortcut) => {
        const { button, internal, actions } = await mountCard();
        if (state === 'saving') internal._saveState = { phase: 'saving' };
        else internal._membershipOpen = true;

        const event = press(button, shortcut);

        Object.values(actions).forEach((action) => expect(action).not.toHaveBeenCalled());
        expect(event.defaultPrevented).toBe(shortcut.key === 's');
      }
    );
  }

  it('leaves body shortcuts native for a nested card', async () => {
    const { actions } = await mountCard();

    const event = press(document.body, shortcuts[0]);

    expect(actions._onSave).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});

function editState(internal: CardInternals) {
  return JSON.parse(
    JSON.stringify({
      curves: internal._curves,
      original: internal._originalCurves,
      history: internal._undoStack,
      selected: internal._selectedCurveId,
      dirty: internal._isDirty,
      commands: {
        services: vi.mocked(internal._hass.callService).mock.calls,
        websockets: vi.mocked(internal._hass.callWS).mock.calls,
      },
    })
  );
}

async function mountEditedCard() {
  const mounted = await mountCard();
  Object.values(mounted.actions).forEach((action) => action.mockRestore());
  const { internal } = mounted;
  internal._undoStack = [JSON.parse(JSON.stringify(internal._curves))];
  internal._curves = internal._curves.map((curve) => ({
    ...curve,
    controlPoints: [
      { lightener: 0, target: 0 },
      { lightener: 100, target: 45 },
    ],
  }));
  internal._selectedCurveId = internal._curves[0].entityId;
  await mounted.card.updateComplete;
  return mounted;
}

describe('Escape owns transient UI without discarding edits', () => {
  it('preserves actual dirty curves, saved baseline, history and selection in two cards', async () => {
    const first = await mountEditedCard();
    const second = await mountEditedCard();
    const before = [editState(first.internal), editState(second.internal)];

    const event = press(first.button, { key: 'Escape' });

    expect(editState(first.internal)).toEqual(before[0]);
    expect(editState(second.internal)).toEqual(before[1]);
    expect(event.defaultPrevented).toBe(false);
  });

  it('dismisses Brightness tips and preserves the edit and sibling tips', async () => {
    const first = await mountEditedCard();
    const second = await mountEditedCard();
    first.internal._coach.toggle(true);
    second.internal._coach.toggle(true);
    await first.card.updateComplete;
    const before = [editState(first.internal), editState(second.internal)];

    const event = press(first.button, { key: 'Escape' });

    expect(first.internal._coach.phase).toBe('inactive');
    expect(second.internal._coach.phase).toBe('ready_to_save');
    expect(editState(first.internal)).toEqual(before[0]);
    expect(editState(second.internal)).toEqual(before[1]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('uses the original path when its focused button is removed before window handling', async () => {
    const first = await mountEditedCard();
    const second = await mountEditedCard();
    first.internal._presetGraphTrial = CURVE_PRESETS[0];
    second.internal._presetGraphTrial = CURVE_PRESETS[1];
    const before = [editState(first.internal), editState(second.internal)];
    first.button.addEventListener('keydown', () => first.button.remove(), { once: true });

    const event = press(first.button, { key: 'Escape' });

    expect(document.activeElement).toBe(document.body);
    expect(first.internal._presetGraphTrial).toBeNull();
    expect(second.internal._presetGraphTrial).toBe(CURVE_PRESETS[1]);
    expect(editState(first.internal)).toEqual(before[0]);
    expect(editState(second.internal)).toEqual(before[1]);
    expect(event.defaultPrevented).toBe(true);
  });

  it.each(['body', 'external input', 'handled event'])(
    'leaves tips, trial and edit state untouched for %s',
    async (context) => {
      const { card, root, button, internal } = await mountEditedCard();
      internal._coach.toggle(true);
      internal._presetGraphTrial = CURVE_PRESETS[0];
      await card.updateComplete;
      const before = editState(internal);
      const input = document.createElement('input');
      root.append(input);
      if (context === 'handled event') {
        button.addEventListener('keydown', (event) => event.preventDefault(), { once: true });
      }
      press(context === 'body' ? document.body : context === 'external input' ? input : button, {
        key: 'Escape',
      });

      expect(internal._coach.phase).toBe('ready_to_save');
      expect(internal._presetGraphTrial).toBe(CURVE_PRESETS[0]);
      expect(editState(internal)).toEqual(before);
    }
  );

  it('handles a focused panel command mount without touching another card', async () => {
    const first = await mountEditedCard();
    const second = await mountEditedCard();
    const toolbar = document.createElement('div');
    first.root.append(toolbar);
    first.card.toolbarHost = toolbar;
    first.internal._coach.toggle(true);
    second.internal._coach.toggle(true);
    await first.card.updateComplete;
    const button = toolbar.querySelector<HTMLButtonElement>('.coach-help')!;
    expect(button).not.toBeNull();
    const before = [editState(first.internal), editState(second.internal)];

    const event = press(button, { key: 'Escape' });

    expect(first.internal._coach.phase).toBe('inactive');
    expect(second.internal._coach.phase).toBe('ready_to_save');
    expect(editState(first.internal)).toEqual(before[0]);
    expect(editState(second.internal)).toEqual(before[1]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('keeps explicit Cancel destructive and restores the saved baseline', async () => {
    // Keep rAF timestamps and performance.now in the same clock domain.
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { internal } = await mountEditedCard();
    const baseline = JSON.parse(JSON.stringify(internal._originalCurves));

    internal._onCancel();
    await vi.advanceTimersByTimeAsync(500);
    expect(internal._isDirty).toBe(false);

    expect(internal._curves).toEqual(baseline);
    expect(internal._undoStack).toEqual([]);
    expect(internal._selectedCurveId).toBeNull();
    expect(internal._hass.callService).not.toHaveBeenCalled();
  });

  it('dismisses clean-card tips without selecting or editing a light', async () => {
    const { button, internal } = await mountCard();
    internal._dirtyVersion--;
    internal._undoStack = [];
    internal._coach.toggle(false);
    const before = editState(internal);

    const event = press(button, { key: 'Escape' });

    expect(internal._coach.phase).toBe('inactive');
    expect(editState(internal)).toEqual(before);
    expect(event.defaultPrevented).toBe(true);
  });
});

function focusedElement(): Element | null {
  let focused = document.activeElement;
  while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;
  return focused;
}

async function mountTips(hosted: boolean) {
  const mounted = await mountEditedCard();
  let commands: ParentNode = mounted.card.renderRoot;
  if (hosted) {
    const toolbar = document.createElement('div');
    mounted.root.append(toolbar);
    mounted.card.toolbarHost = toolbar;
    commands = toolbar;
  }
  mounted.internal._coach.toggle(true);
  await mounted.card.updateComplete;
  const help = commands.querySelector<HTMLButtonElement>('.coach-help')!;
  const dismiss = mounted.card.renderRoot.querySelector<HTMLButtonElement>('.coach-dismiss')!;
  expect(help).not.toBeNull();
  expect(dismiss).not.toBeNull();
  return { ...mounted, help, dismiss };
}

describe('Escape tip focus restoration', () => {
  it.each([false, true])(
    'returns focus from disappearing tips to Help (hosted=%s)',
    async (hosted) => {
      const { card, internal, help, dismiss } = await mountTips(hosted);
      const before = editState(internal);

      const event = press(dismiss, { key: 'Escape' });
      await card.updateComplete;
      await Promise.resolve();

      expect(internal._coach.phase).toBe('inactive');
      expect(dismiss.isConnected).toBe(false);
      expect(focusedElement()).toBe(help);
      expect(editState(internal)).toEqual(before);
      expect(event.defaultPrevented).toBe(true);
    }
  );

  for (const hosted of [false, true]) {
    it.each(['row', 'help'])(`preserves surviving %s focus (hosted=${hosted})`, async (origin) => {
      const { card, internal, help, button } = await mountTips(hosted);
      const before = editState(internal);
      const target = origin === 'row' ? button : help;

      press(target, { key: 'Escape' });
      await card.updateComplete;
      await Promise.resolve();

      expect(internal._coach.phase).toBe('inactive');
      expect(focusedElement()).toBe(target);
      expect(editState(internal)).toEqual(before);
    });
  }
});

describe('Escape tip focus recovery respects later focus', () => {
  for (const hosted of [false, true]) {
    it.each(['earlier keydown listener', 'after dispatch'])(
      `preserves external focus moved by %s (hosted=${hosted})`,
      async (timing) => {
        const { card, root, internal, dismiss } = await mountTips(hosted);
        const input = document.createElement('input');
        root.append(input);
        if (timing === 'earlier keydown listener') {
          dismiss.addEventListener('keydown', () => input.focus(), { once: true });
        }
        const before = editState(internal);

        press(dismiss, { key: 'Escape' });
        if (timing === 'after dispatch') input.focus();
        await card.updateComplete;
        await Promise.resolve();

        expect(internal._coach.phase).toBe('inactive');
        expect(focusedElement() === input, 'the connected external input keeps focus').toBe(true);
        expect(editState(internal)).toEqual(before);
      }
    );

    it(`keeps ordinary click dismissal returning focus to Help (hosted=${hosted})`, async () => {
      const { card, internal, button, dismiss, help } = await mountTips(hosted);
      button.focus();
      const before = editState(internal);

      dismiss.click();
      await card.updateComplete;
      await Promise.resolve();

      expect(internal._coach.phase).toBe('inactive');
      expect(focusedElement() === help).toBe(true);
      expect(editState(internal)).toEqual(before);
    });
  }
});

describe('owned Save and Undo respect native keyboard contexts', () => {
  for (const hosted of [false, true]) {
    for (const dirty of [false, true]) {
      for (const lock of [
        'saving',
        'membership',
        'permission',
        'load error',
        'wrong entity',
        'deleted group',
      ] as const) {
        it.each(shortcuts.slice(0, 2))(
          `owns unavailable $name without Save (hosted=${hosted}, dirty=${dirty}, ${lock})`,
          async (shortcut) => {
            const { card, root, button, internal, actions } = await mountCard();
            if (!dirty) internal._dirtyVersion--;
            let target = button;
            if (hosted) {
              const toolbar = document.createElement('div');
              root.append(toolbar);
              card.toolbarHost = toolbar;
              await card.updateComplete;
              target = toolbar.querySelector<HTMLButtonElement>('.coach-help')!;
            }
            if (lock === 'saving') internal._saveState = { phase: 'saving' };
            if (lock === 'membership') internal._membershipOpen = true;
            if (lock === 'permission') internal._hass.user!.is_admin = false;
            if (lock === 'load error')
              internal._load = { ...internal._load, loadError: 'unavailable' };
            if (lock === 'wrong entity')
              internal._load = { ...internal._load, loadedEntityId: 'light.other' };
            if (lock === 'deleted group') internal._groupDeleted = true;
            const before = editState(internal);

            expect(press(target, shortcut).defaultPrevented).toBe(true);

            Object.values(actions).forEach((action) => expect(action).not.toHaveBeenCalled());
            expect(editState(internal)).toEqual(before);
          }
        );
      }
    }
  }

  it.each(shortcuts)('normalizes uppercase $name', async (shortcut) => {
    const { button, actions } = await mountCard();
    expect(press(button, { ...shortcut, key: shortcut.key.toUpperCase() }).defaultPrevented).toBe(
      true
    );
    expect(actions[shortcut.method]).toHaveBeenCalledTimes(1);
  });

  for (const hosted of [false, true]) {
    it(`owns clean Save without backend work (hosted=${hosted})`, async () => {
      const mounted = await mountCard();
      mounted.internal._dirtyVersion--;
      Object.values(mounted.actions).forEach((action) => action.mockRestore());
      let target = mounted.button;
      if (hosted) {
        const toolbar = document.createElement('div');
        mounted.root.append(toolbar);
        mounted.card.toolbarHost = toolbar;
        await mounted.card.updateComplete;
        target = toolbar.querySelector<HTMLButtonElement>('.coach-help')!;
      }
      const before = editState(mounted.internal);
      expect(press(target, { key: 'S', metaKey: true }).defaultPrevented).toBe(true);
      expect(editState(mounted.internal)).toEqual(before);
    });
  }

  for (const context of [
    'handled',
    'composing',
    'alt',
    'shift',
    'input',
    'textarea',
    'select',
    'contenteditable',
  ]) {
    it.each(shortcuts)(`leaves $name native in ${context}`, async (shortcut) => {
      const { card, button, actions } = await mountCard();
      let target: HTMLElement = button;
      if (['input', 'textarea', 'select', 'contenteditable'].includes(context)) {
        target = document.createElement(context === 'contenteditable' ? 'div' : context);
        if (context === 'contenteditable') {
          target.contentEditable = 'true';
          target.setAttribute('contenteditable', 'true');
        }
        card.renderRoot.append(target);
      }
      if (context === 'handled')
        target.addEventListener('keydown', (event) => event.preventDefault());
      const event = press(target, {
        ...shortcut,
        isComposing: context === 'composing',
        altKey: context === 'alt',
        shiftKey: context === 'shift',
      });
      Object.values(actions).forEach((action) => expect(action).not.toHaveBeenCalled());
      expect(event.defaultPrevented).toBe(context === 'handled');
    });
  }

  it.each(shortcuts)('keeps brightness ranges eligible for $name', async (shortcut) => {
    const { card, actions } = await mountCard();
    const range = document.createElement('input');
    range.type = 'range';
    card.renderRoot.append(range);
    expect(press(range, shortcut).defaultPrevented).toBe(true);
    expect(actions[shortcut.method]).toHaveBeenCalledTimes(1);
  });

  it.each(shortcuts)(
    'uses original ownership after earlier focus movement for $name',
    async (shortcut) => {
      const first = await mountCard();
      const second = await mountCard();
      first.button.addEventListener('keydown', () => second.button.focus(), { once: true });
      expect(press(first.button, shortcut).defaultPrevented).toBe(true);
      expect(first.actions[shortcut.method]).toHaveBeenCalledTimes(1);
      Object.values(second.actions).forEach((action) => expect(action).not.toHaveBeenCalled());
      expect(focusedElement()).toBe(second.button);
    }
  );
});
