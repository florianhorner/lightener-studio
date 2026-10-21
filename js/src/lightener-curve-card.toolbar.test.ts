// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { LightenerCurveCard } from './lightener-curve-card.js';
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
    callWS: vi.fn().mockResolvedValue({
      entities: { 'light.a': { brightness: { '1': '1', '100': '100' } } },
    }),
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

describe('desktop command ownership', () => {
  it('keeps one persistent command view and disables clean actions', async () => {
    const { card, host } = await mount();
    expect(host.querySelectorAll('.editor-commands')).toHaveLength(1);
    expect(card.renderRoot.querySelector('.editor-commands')).toBeNull();
    expect(card.renderRoot.querySelector('curve-footer')).toBeNull();
    const footer = host.querySelector('curve-footer')!;
    await footer.updateComplete;
    expect([...footer.renderRoot.querySelectorAll('button')]).toHaveLength(3);
    expect(
      [...footer.renderRoot.querySelectorAll('button')].every((button) => button.disabled)
    ).toBe(true);
  });

  it('keeps picker Escape separate while hosted buttons retain editor shortcuts', async () => {
    const { card, editor, host, hass } = await mount();
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
    const save = host.querySelector('curve-footer')!;
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

  it('moves the command presentation back to the narrow dock without duplicates', async () => {
    const { card, editor, host } = await mount();
    dirty(editor);
    editor._narrowLayout = true;
    await card.updateComplete;
    expect(host.hidden).toBe(true);
    expect(host.querySelector('.editor-commands')).toBeNull();
    expect(card.renderRoot.querySelector('.editor-commands')).toBeNull();
    expect(card.renderRoot.querySelectorAll('curve-footer')).toHaveLength(1);
    expect(card.renderRoot.querySelector('curve-scrubber')?.showPreviewToggle).toBe(true);
    editor._narrowLayout = false;
    await card.updateComplete;
    expect(host.hidden).toBe(false);
    expect(host.querySelectorAll('.editor-commands')).toHaveLength(1);
    expect(card.renderRoot.querySelector('curve-footer')).toBeNull();
  });

  it('keeps save confirmation and failed-save retry in the mounted commands', async () => {
    const { card, editor, host } = await mount();
    editor._dispatchSave({ type: 'save-start' });
    editor._dispatchSave({ type: 'save-success' });
    editor._dispatchSave({ type: 'save-confirmed' });
    await card.updateComplete;
    expect(host.querySelector('.command-status')?.textContent?.trim()).toBe('Saved');
    expect(card.renderRoot.querySelector('.status-stack')?.textContent).not.toContain(
      'Saved successfully'
    );
    editor._dispatchSave({ type: 'save-start' });
    editor._dispatchSave({ type: 'save-error', message: 'Retryable failure' });
    await card.updateComplete;
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Save failed');
    expect(host.querySelector<HTMLButtonElement>('.command-retry')?.disabled).toBe(false);
  });

  it('clears its old mount and never removes a replacement card’s commands', async () => {
    const first = await mount();
    const replacement = document.body.appendChild(document.createElement('div'));
    first.card.toolbarHost = replacement;
    await first.card.updateComplete;
    expect(first.host.hidden).toBe(true);
    expect(first.host.querySelector('.editor-commands')).toBeNull();
    const second = await mount(replacement);
    first.card.remove();
    expect(replacement.querySelector('.editor-commands')).not.toBeNull();
    second.card.remove();
    expect(replacement.querySelector('.editor-commands')).toBeNull();
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
    const footer = first.host.querySelector('curve-footer')!;
    await footer.updateComplete;
    footer.renderRoot
      .querySelector<HTMLButtonElement>('.btn-save')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, composed: true })
      );
    expect(vi.mocked(first.hass.callWS).mock.calls).toHaveLength(beforeFirst);
    expect(vi.mocked(second.hass.callWS).mock.calls.slice(beforeSecond)).toContainEqual([
      expect.objectContaining({ type: 'lightener/save_curves' }),
    ]);
  });

  it('trusted interaction with hosted commands interrupts first-run coaching', async () => {
    const { editor, host } = await mount();
    const interrupt = vi.spyOn(editor._coach, 'interrupt');
    host.querySelector<HTMLButtonElement>('.preview-toggle-btn')!.focus();
    expect(interrupt).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the hosted Help button after dismissing tips', async () => {
    const { card, editor, host } = await mount();
    editor._selectedCurveId = 'light.a';
    await card.updateComplete;
    const help = host.querySelector<HTMLButtonElement>('.coach-help')!;
    help.click();
    await card.updateComplete;
    card.renderRoot.querySelector<HTMLButtonElement>('.coach-dismiss')!.click();
    await card.updateComplete;
    await Promise.resolve();
    expect(document.activeElement).toBe(help);
  });
});
