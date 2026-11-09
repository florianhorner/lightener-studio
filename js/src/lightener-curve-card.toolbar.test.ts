import { testBackend } from './test-guarded-backend.js';
// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { LightenerCurveCard } from './lightener-curve-card.js';
import type { CurveFooter } from './components/curve-footer.js';
import type { Hass, LightCurve } from './utils/types.js';
import type { SaveAction } from './utils/save-lifecycle.js';

type Editor = {
  _coach: { interrupt: () => void };
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
    // View: only Room brightness; no action row, chips, Undo or empty message line.
    const dock = card.renderRoot.querySelector('.editor-column .control-dock')!;
    expect([...dock.children].map((child) => child.classList[0])).toEqual(['room-surface']);
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

  it('returns focus to the hosted More actions button after dismissing tips', async () => {
    const { card, editor, host } = await mount();
    editor._selectedCurveId = 'light.a';
    await card.updateComplete;
    const help = host.querySelector<HTMLButtonElement>('.more-button')!;
    help.click();
    await card.updateComplete;
    host.querySelector<HTMLButtonElement>('.more-item.show-me-how')!.click();
    await card.updateComplete;
    expect(host.querySelector('.more-menu')).toBeNull();
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
    // Dashboard cards keep chips, Watch and Undo under Room at every width.
    expect(
      header.querySelector('.header-chips, .header-undo, .watch-anchor, curve-footer')
    ).toBeNull();
    expect(card.renderRoot.querySelector('.card.hosted')).toBeNull();
  });
});
