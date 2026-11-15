import { testBackend } from './test-guarded-backend.js';
// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { LightenerCurveCard } from './lightener-curve-card.js';
import type { CurveFooter } from './components/curve-footer.js';
import type { Hass, LightCurve } from './utils/types.js';
import type { SaveAction } from './utils/save-lifecycle.js';

type Editor = {
  _coach: { interrupt: () => void; toggle: (dirty: boolean) => void };
  _selectedCurveId: string | null;
  _narrowLayout: boolean;
  _curves: LightCurve[];
  _dirtyVersion: number;
  _undoStack: LightCurve[][];
  _dispatchSave: (action: SaveAction) => void;
};

beforeAll(async () => {
  window.matchMedia ??= vi.fn().mockReturnValue({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
  await import('./lightener-curve-card.js');
});
afterEach(() => {
  document.body.replaceChildren();
  sessionStorage.clear();
});

async function mount(host = document.body.appendChild(document.createElement('div'))) {
  const hass = {
    user: { is_admin: true },
    states: { 'light.group': { state: 'on', attributes: {} } },
    callWS: vi.fn(testBackend({ 'light.a': { brightness: { '1': '1', '100': '100' } } })),
    callService: vi.fn().mockResolvedValue(undefined),
  } as unknown as Hass;
  const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
  card.toolbarHost = host;
  card.setConfig({ entity: 'light.group', embedded: true });
  card.hass = hass;
  document.body.appendChild(card);
  await card.updateComplete;
  await Promise.resolve();
  await card.updateComplete;
  return { card, editor: card as unknown as Editor, host, hass };
}

function dirty(editor: Editor) {
  editor._undoStack = [structuredClone(editor._curves)];
  editor._dirtyVersion++;
  editor._curves = editor._curves.map((curve) => ({
    ...curve,
    controlPoints: [
      { lightener: 0, target: 0 },
      { lightener: 100, target: 45 },
    ],
  }));
}

describe('toolbar and rows under Room', () => {
  it('keeps the rows under Room in the card and the toolbar in the panel', async () => {
    const { card, host } = await mount();
    expect(host.hidden).toBe(false);
    expect(host.querySelectorAll('.editor-toolbar .more-button')).toHaveLength(1);
    expect(host.querySelectorAll('.editor-toolbar .exit-slot')).toHaveLength(1);
    expect(host.querySelector('.coach-help, .editor-help')).toBeNull();
    expect(host.querySelector('.message-line, .edit-row')).toBeNull();
    // A clean View offers Edit, not Cancel and Save; Undo's header place (from 640px) is held.
    expect(host.querySelector('curve-footer[variant="commit"]')).toBeNull();
    expect(host.querySelector('.header-undo')?.hasAttribute('data-reserved')).toBe(true);
    expect(host.querySelector('.exit-slot')?.getAttribute('data-state')).toBe('view');
    // The panel supplies the title, so the card renders no header of its own.
    expect(card.renderRoot.querySelector('.header')).toBeNull();
    // View: Room brightness and the chips' empty, reserved row; no chips, Undo or empty message line.
    const dock = card.renderRoot.querySelector('.editor-column .control-dock')!;
    expect([...dock.children].map((child) => child.classList[0])).toEqual([
      'room-surface',
      'edit-row',
    ]);
    expect(dock.querySelector('.edit-row')?.classList.contains('reserved')).toBe(true);
    expect(dock.querySelector('.edit-row')?.children).toHaveLength(0);
    expect(card.renderRoot.querySelector('.footer-slot, .editor-commands')).toBeNull();
    expect(card.renderRoot.querySelector('curve-footer')).toBeNull();
    expect(card.renderRoot.querySelector('curve-scrubber')?.showPreviewToggle).toBe(false);

    // Edit: Undo laid out under Room once there is history, even without a selection.
    (card as unknown as Editor)._undoStack = [structuredClone((card as unknown as Editor)._curves)];
    card.enterEditMode();
    await card.updateComplete;
    expect([...dock.children].map((child) => child.classList[0])).toEqual([
      'room-surface',
      'edit-row',
    ]);
    const footer = dock.querySelector<CurveFooter>('.edit-row curve-footer')!;
    await footer.updateComplete;
    expect(footer.variant).toBe('undo');
    expect([...footer.renderRoot.querySelectorAll('button')]).toHaveLength(1);
    expect(host.querySelector('.header-undo')?.hasAttribute('data-reserved')).toBe(false);
  });

  it('keeps picker Escape separate while action-row buttons retain editor shortcuts', async () => {
    const { card, editor, hass, host } = await mount();
    dirty(editor);
    await card.updateComplete;
    const picker = document.body.appendChild(document.createElement('select'));
    picker.append(new Option('Group', 'light.group'));
    picker.focus();
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    picker.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
    expect(card.dirty).toBe(true);
    const before = vi.mocked(hass.callWS).mock.calls.length;
    // Save lives in the hosted toolbar's exit slot and keeps the card's shortcuts.
    const save = host.querySelector<CurveFooter>('curve-footer[variant="commit"]')!;
    await save.updateComplete;
    save.renderRoot.querySelector<HTMLButtonElement>('.btn-save')!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        composed: true,
        cancelable: true,
      })
    );
    expect(vi.mocked(hass.callWS).mock.calls.slice(before)).toContainEqual([
      expect.objectContaining({ type: 'lightener/save_curves' }),
    ]);
  });

  it('keeps the same toolbar and Undo at narrow widths; header copies only in the host', async () => {
    const { card, editor, host } = await mount();
    dirty(editor);
    editor._narrowLayout = true;
    await card.updateComplete;
    expect(host.hidden).toBe(false);
    expect(host.querySelectorAll('.editor-toolbar')).toHaveLength(1);
    expect(host.querySelectorAll('curve-footer[variant="commit"]')).toHaveLength(1);
    // The header's Undo copy (from 640px); CSS shows exactly one copy per width.
    expect(host.querySelectorAll('.header-undo curve-footer[variant="undo"]')).toHaveLength(1);
    expect(host.querySelector('.edit-row, .message-line')).toBeNull();
    expect(card.renderRoot.querySelectorAll('.edit-row curve-footer[variant="undo"]')).toHaveLength(
      1
    );
    expect(card.renderRoot.querySelectorAll('curve-footer')).toHaveLength(1);
    expect(card.renderRoot.querySelector('curve-scrubber')?.showPreviewToggle).toBe(false);
    editor._narrowLayout = false;
    await card.updateComplete;
    expect(host.querySelectorAll('.editor-toolbar')).toHaveLength(1);
    expect(host.querySelectorAll('curve-footer')).toHaveLength(2);
    expect(card.renderRoot.querySelectorAll('curve-footer')).toHaveLength(1);
  });

  it('confirms a save in the exit slot and shows failed-save retry in the message line', async () => {
    const { card, editor, host } = await mount();
    editor._dispatchSave({ type: 'save-start' });
    editor._dispatchSave({ type: 'save-success' });
    editor._dispatchSave({ type: 'save-confirmed' });
    await card.updateComplete;
    const saved = host.querySelector('.exit-slot[data-state="saved"] .save-confirmed');
    expect(saved?.textContent?.trim()).toBe('Saved');
    expect(saved?.getAttribute('role')).toBe('status');
    expect(saved?.querySelector('svg')).not.toBeNull();
    // No message, no line.
    expect(card.renderRoot.querySelector('.message-line')).toBeNull();
    expect(host.querySelector('.command-status')).toBeNull();
    expect(card.renderRoot.querySelector('.status-stack')?.textContent).not.toContain(
      'Saved successfully'
    );
    editor._dispatchSave({ type: 'save-start' });
    editor._dispatchSave({ type: 'save-error', message: 'Retryable failure' });
    await card.updateComplete;
    const line = card.renderRoot.querySelector('.control-dock .message-line')!;
    const alert = line.querySelector('.command-status [role="alert"]')!;
    expect(alert.textContent).toContain('Retryable failure');
    // Attention carries a triangle, not only colour.
    expect(alert.querySelector('svg.status-icon')).not.toBeNull();
    expect(line.querySelector<HTMLButtonElement>('.command-retry')?.disabled).toBe(false);
    expect(card.renderRoot.querySelectorAll('[role="alert"]')).toHaveLength(1);
  });

  it('clears its old mount and never removes a replacement card’s toolbar', async () => {
    const first = await mount();
    const replacement = document.body.appendChild(document.createElement('div'));
    first.card.toolbarHost = replacement;
    await first.card.updateComplete;
    expect(first.host.hidden).toBe(true);
    expect(first.host.querySelector('.editor-toolbar')).toBeNull();
    const second = await mount(replacement);
    first.card.remove();
    expect(replacement.querySelector('.editor-toolbar')).not.toBeNull();
    second.card.remove();
    expect(replacement.querySelector('.editor-toolbar')).toBeNull();
    expect(replacement.hidden).toBe(true);
  });

  it('revokes a previous owner before a shared host receives keyboard commands', async () => {
    const first = await mount();
    dirty(first.editor);
    await first.card.updateComplete;
    const second = await mount(first.host);
    dirty(second.editor);
    await second.card.updateComplete;
    expect(first.card.toolbarHost).toBeNull();
    first.card.requestUpdate();
    await first.card.updateComplete;
    const beforeFirst = vi.mocked(first.hass.callWS).mock.calls.length;
    const beforeSecond = vi.mocked(second.hass.callWS).mock.calls.length;
    first.host
      .querySelector<HTMLButtonElement>('.more-button')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, composed: true })
      );
    expect(vi.mocked(first.hass.callWS).mock.calls).toHaveLength(beforeFirst);
    expect(vi.mocked(second.hass.callWS).mock.calls.slice(beforeSecond)).toContainEqual([
      expect.objectContaining({ type: 'lightener/save_curves' }),
    ]);
  });

  it('trusted interaction with hosted help interrupts first-run coaching', async () => {
    const { editor, host } = await mount();
    const interrupt = vi.spyOn(editor._coach, 'interrupt');
    host.querySelector<HTMLButtonElement>('.more-button')!.focus();
    expect(interrupt).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the hosted More actions button after dismissing the shape tip', async () => {
    const { card, editor, host } = await mount();
    editor._selectedCurveId = 'light.a';
    await card.updateComplete;
    const help = host.querySelector<HTMLButtonElement>('.more-button')!;
    // The shape tip, as declining suggested shapes on an untouched group shows it.
    editor._coach.toggle(false);
    await card.updateComplete;
    card.renderRoot.querySelector<HTMLButtonElement>('.coach-dismiss')!.click();
    await card.updateComplete;
    await Promise.resolve();
    expect(document.activeElement).toBe(help);
  });
});

describe('dashboard card header', () => {
  it('keeps the title and toolbar together when no panel toolbar is supplied', async () => {
    const hass = {
      user: { is_admin: true },
      states: { 'light.group': { state: 'on', attributes: {} } },
      callWS: vi.fn(testBackend({ 'light.a': { brightness: { '1': '1', '100': '100' } } })),
      callService: vi.fn().mockResolvedValue(undefined),
    } as unknown as Hass;
    const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
    card.setConfig({ entity: 'light.group' });
    card.hass = hass;
    document.body.appendChild(card);
    await card.updateComplete;
    await Promise.resolve();
    await card.updateComplete;
    const header = card.renderRoot.querySelector('.header')!;
    expect(header.querySelector('h2')).not.toBeNull();
    expect(header.querySelector('.editor-toolbar .more-button')).not.toBeNull();
    expect(header.querySelector('.editor-toolbar .exit-slot .edit-button')).not.toBeNull();
    // A stacked dashboard card keeps chips, Watch and Undo under Room.
    expect(
      header.querySelector('.header-chips, .header-undo, .watch-anchor, curve-footer')
    ).toBeNull();
    expect(card.renderRoot.querySelector('.card.hosted')).toBeNull();

    // Beside its lights the card moves chips and Undo into its header, so
    // entering Edit never grows it; Preview on lights stays under Room.
    const editor = card as unknown as Editor & { _besideLights: boolean; _selectedCurveId: string };
    editor._besideLights = true;
    card.enterEditMode();
    editor._selectedCurveId = 'light.a';
    await card.updateComplete;
    expect(header.querySelector('.header-chips .shape-chip-bar')).not.toBeNull();
    expect(header.querySelector('.header-undo curve-footer[variant="undo"]')).not.toBeNull();
    expect(header.querySelector('.watch-anchor')).toBeNull();
    expect(card.renderRoot.querySelector('.edit-row')).toBeNull();
    expect(card.renderRoot.querySelectorAll('.shape-chip-bar')).toHaveLength(1);
    expect(card.renderRoot.querySelector('.control-dock .watch-under-room')).not.toBeNull();

    // Crossing the 1000px switch redraws chips and Undo in the other place; keyboard
    // focus follows the same control instead of falling back to the page.
    const root = card.renderRoot as ShadowRoot;
    const settleFocus = async () => {
      for (let turn = 0; turn < 4; turn++) {
        await card.updateComplete;
        await Promise.resolve();
      }
    };
    const chip = () =>
      root.querySelector<HTMLButtonElement>('.shape-chip[data-preset="dim_accent"]')!;
    const undo = () =>
      (
        root.querySelector('curve-footer[variant="undo"]') as CurveFooter
      ).renderRoot.querySelector<HTMLButtonElement>('.btn-undo')!;
    for (const beside of [false, true]) {
      chip().focus();
      expect(root.activeElement).toBe(chip());
      const before = chip();
      editor._besideLights = beside;
      await settleFocus();
      expect(chip()).not.toBe(before);
      expect(header.contains(chip())).toBe(beside);
      expect(root.activeElement).toBe(chip());
    }
    // Undo, once there is a step to take back.
    chip().click();
    await settleFocus();
    for (const beside of [false, true]) {
      undo().focus();
      const footer = undo().getRootNode() as ShadowRoot;
      expect(footer.activeElement).toBe(undo());
      editor._besideLights = beside;
      await settleFocus();
      const moved = undo().getRootNode() as ShadowRoot;
      expect(moved).not.toBe(footer);
      expect(header.contains(moved.host)).toBe(beside);
      expect(moved.activeElement).toBe(undo());
    }
  });

  describe('suggested shapes under Room', () => {
    type Suggesting = Editor & {
      _dockHold: number | null;
      _suggested: LightCurve[] | null;
      _undo(): void;
    };

    /** The sidebar panel's first open of an untouched group whose names give a suggestion. */
    async function mountSuggestion() {
      const host = document.body.appendChild(document.createElement('div'));
      const names = ['Ceiling Light', 'Sofa Lamp', 'LED Strip'];
      const ids = ['light.a', 'light.b', 'light.c'];
      const group = `light.room_${crypto.randomUUID()}`;
      const hass = {
        user: { is_admin: true, id: crypto.randomUUID() },
        states: Object.fromEntries(
          ids.map((id, index) => [id, { state: 'on', attributes: { friendly_name: names[index] } }])
        ),
        callWS: vi.fn(
          testBackend(
            Object.fromEntries(
              ids.map((id) => [id, { brightness: { '1': '1', '50': '50', '100': '100' } }])
            )
          )
        ),
        callService: vi.fn().mockResolvedValue(undefined),
      } as unknown as Hass;
      const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
      card.toolbarHost = host;
      card.draftSurface = 'sidebar';
      card.suggestOnFirstOpen = true;
      card.setConfig({
        entity: group,
        embedded: true,
        joy: { settle: false, diagonal: false, ripple: false, draw_in: false },
      });
      card.hass = hass;
      document.body.appendChild(card);
      for (let turn = 0; turn < 4; turn++) {
        await card.updateComplete;
        await Promise.resolve();
      }
      const dock = card.renderRoot.querySelector<HTMLElement>('.editor-column .control-dock')!;
      const rows = () => [...dock.children].map((child) => child.classList[0]);
      const tapRow = async () => {
        const legend = card.renderRoot.querySelector('curve-legend')!;
        await legend.updateComplete;
        legend.renderRoot.querySelector<HTMLButtonElement>('.row-select-btn')!.click();
        await card.updateComplete;
      };
      return { card, editor: card as unknown as Suggesting, host, dock, rows, tapRow };
    }

    afterEach(() => localStorage.clear());

    it('the suggestion takes the chips row’s place in the dock', async () => {
      const { card, host, dock, rows, tapRow } = await mountSuggestion();
      expect(rows()).toEqual(['room-surface', 'message-line']);
      expect(dock.querySelector('.message-line')?.classList.contains('suggesting')).toBe(true);
      expect(dock.querySelectorAll('.message-line .suggestion-actions button')).toHaveLength(2);
      // The two buttons live under Room only; the panel's header gets no copy.
      expect(host.querySelector('.suggestion-prompt, .suggestion-save')).toBeNull();
      expect(card.renderRoot.querySelectorAll('.suggestion-prompt')).toHaveLength(1);

      await tapRow();
      expect(rows()).toEqual(['room-surface', 'edit-row']);
      expect(dock.querySelector('.edit-row .shape-chip-bar')).not.toBeNull();
    });

    it('holds the dock’s measured height from adoption until View', async () => {
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(
        (callback) =>
          window.setTimeout(() => callback(performance.now() + 400), 0) as unknown as number
      );
      const { card, editor, dock, tapRow } = await mountSuggestion();
      const hold = () => dock.style.getPropertyValue('--lightener-dock-hold');
      const css = (card.constructor as unknown as { styles: { cssText: string } }).styles.cssText;
      expect(css).toMatch(
        /\.control-dock\s*\{[^}]*min-height:\s*var\(--lightener-dock-hold, auto\)/
      );
      expect(dock.getAttribute('style')).toBeNull();
      expect(hold()).toBe('');
      // A two-row prompt on a narrow card: taller than the chips row that replaces it.
      dock.getBoundingClientRect = () => ({ height: 132 }) as DOMRect;

      await tapRow();
      expect(card.editMode).toBe(true);
      expect(editor._dockHold).toBe(132);
      expect(hold()).toBe('132px');

      // Undo empties the draft, but the editor is still in Edit: the rows stay put.
      editor._undo();
      await vi.waitFor(() => expect(card.dirty).toBe(false));
      await card.updateComplete;
      expect(card.editMode).toBe(true);
      expect(hold()).toBe('132px');

      expect(card.exitEditMode()).toBe(true);
      await card.updateComplete;
      expect(card.editMode).toBe(false);
      expect(editor._dockHold).toBeNull();
      expect(hold()).toBe('');
      vi.restoreAllMocks();
    });

    it('lets go of the held height when the layout changes', async () => {
      const { card, editor, dock, tapRow } = await mountSuggestion();
      dock.getBoundingClientRect = () => ({ height: 132 }) as DOMRect;
      await tapRow();
      expect(dock.style.getPropertyValue('--lightener-dock-hold')).toBe('132px');
      editor._narrowLayout = !editor._narrowLayout;
      await card.updateComplete;
      expect(card.editMode).toBe(true);
      expect(editor._dockHold).toBeNull();
      expect(dock.style.getPropertyValue('--lightener-dock-hold')).toBe('');
    });
  });
});
