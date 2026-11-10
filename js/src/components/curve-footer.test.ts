// @vitest-environment jsdom

import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { CurveFooter } from './curve-footer.js';

beforeAll(async () => {
  await import('./curve-footer.js');
});

function makeFooter(opts?: {
  variant?: 'commit' | 'undo';
  dirty?: boolean;
  saving?: boolean;
  canUndo?: boolean;
  saveDisabled?: boolean;
}): CurveFooter {
  const el = document.createElement('curve-footer') as CurveFooter;
  el.variant = opts?.variant ?? 'commit';
  el.dirty = opts?.dirty ?? false;
  el.saving = opts?.saving ?? false;
  el.canUndo = opts?.canUndo ?? false;
  el.saveDisabled = opts?.saveDisabled ?? false;
  document.body.appendChild(el);
  return el;
}

const cancelOf = (el: CurveFooter) =>
  el.renderRoot.querySelector<HTMLButtonElement>('[aria-label="Cancel changes"]');

describe('curve-footer — variants', () => {
  it('renders Cancel and Save, without Undo, in the commit variant', async () => {
    const el = makeFooter({ dirty: true });
    await el.updateComplete;
    expect(el.renderRoot.querySelector('.btn-save')).not.toBeNull();
    expect(cancelOf(el)).not.toBeNull();
    expect(el.renderRoot.querySelector('.btn-undo')).toBeNull();
  });

  it('renders only Undo in the undo variant, keeping its footprint while unavailable', async () => {
    const el = makeFooter({ variant: 'undo', canUndo: false });
    await el.updateComplete;
    const undo = el.renderRoot.querySelector<HTMLButtonElement>('.btn-undo')!;
    expect(undo.disabled).toBe(true);
    expect(el.renderRoot.querySelector('.btn-save')).toBeNull();
    expect(cancelOf(el)).toBeNull();
  });

  it('keeps Save present but disabled when there is nothing to save', async () => {
    const el = makeFooter({ dirty: false });
    await el.updateComplete;
    expect(el.renderRoot.querySelector<HTMLButtonElement>('.btn-save')!.disabled).toBe(true);
  });

  it('disables Save when the guarded save is unavailable', async () => {
    const el = makeFooter({ dirty: true, saveDisabled: true });
    await el.updateComplete;
    expect(el.renderRoot.querySelector<HTMLButtonElement>('.btn-save')!.disabled).toBe(true);
    expect(cancelOf(el)!.disabled).toBe(false);
  });
});

describe('curve-footer — save button', () => {
  it('says "Save" when not saving', async () => {
    const el = makeFooter({ dirty: true });
    await el.updateComplete;
    const btn = el.renderRoot.querySelector<HTMLButtonElement>('.btn-save')!;
    expect(btn.textContent?.trim()).toBe('Save');
    expect(btn.disabled).toBe(false);
  });

  it('shows a spinner in the same button and is disabled when saving=true', async () => {
    const el = makeFooter({ dirty: true, saving: true });
    await el.updateComplete;
    const btn = el.renderRoot.querySelector<HTMLButtonElement>('.btn-save')!;
    expect(btn.querySelector('.spinner')).not.toBeNull();
    expect(btn.textContent?.trim()).toBe('Saving…');
    expect(btn.disabled).toBe(true);
  });

  it('dispatches save-curves on click', async () => {
    const el = makeFooter({ dirty: true });
    await el.updateComplete;
    const spy = vi.fn();
    el.addEventListener('save-curves', spy);
    el.renderRoot.querySelector<HTMLButtonElement>('.btn-save')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('bubbles and composes save-curves across shadow boundary', async () => {
    const el = makeFooter({ dirty: true });
    await el.updateComplete;
    const outer = vi.fn();
    document.body.addEventListener('save-curves', outer);
    el.renderRoot.querySelector<HTMLButtonElement>('.btn-save')!.click();
    expect(outer).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('save-curves', outer);
  });
});

describe('curve-footer — cancel button', () => {
  it('dispatches cancel-curves on click', async () => {
    const el = makeFooter({ dirty: true });
    await el.updateComplete;
    const spy = vi.fn();
    el.addEventListener('cancel-curves', spy);
    cancelOf(el)!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('is disabled when saving=true', async () => {
    const el = makeFooter({ dirty: true, saving: true });
    await el.updateComplete;
    expect(cancelOf(el)?.disabled).toBe(true);
  });
});

describe('curve-footer — undo button', () => {
  it('dispatches undo-curves on click', async () => {
    const el = makeFooter({ variant: 'undo', canUndo: true });
    await el.updateComplete;
    const spy = vi.fn();
    el.addEventListener('undo-curves', spy);
    el.renderRoot.querySelector<HTMLButtonElement>('.btn-undo')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('is disabled when saving=true', async () => {
    const el = makeFooter({ variant: 'undo', canUndo: true, saving: true });
    await el.updateComplete;
    const undoBtn = el.renderRoot.querySelector<HTMLButtonElement>('.btn-undo')!;
    expect(undoBtn.disabled).toBe(true);
  });

  it('has accessible aria-label "Undo"', async () => {
    const el = makeFooter({ variant: 'undo', canUndo: true });
    await el.updateComplete;
    const undoBtn = el.renderRoot.querySelector<HTMLButtonElement>('.btn-undo')!;
    expect(undoBtn.getAttribute('aria-label')).toBe('Undo');
  });
});

describe('curve-footer — state transitions', () => {
  it('enables Save when dirty flips from false to true', async () => {
    const el = makeFooter();
    await el.updateComplete;
    const save = el.renderRoot.querySelector<HTMLButtonElement>('.btn-save')!;
    expect(save.disabled).toBe(true);
    el.dirty = true;
    await el.updateComplete;
    expect(save.disabled).toBe(false);
  });

  it('enables Undo when canUndo flips from false to true', async () => {
    const el = makeFooter({ variant: 'undo' });
    await el.updateComplete;
    const undo = el.renderRoot.querySelector<HTMLButtonElement>('.btn-undo')!;
    expect(undo.disabled).toBe(true);
    el.canUndo = true;
    await el.updateComplete;
    expect(undo.disabled).toBe(false);
  });
});

describe('animation is separate from saving', () => {
  it('keeps available Undo enabled while blocking Save and Cancel', async () => {
    const commit = makeFooter({ dirty: true });
    const undoFooter = makeFooter({ variant: 'undo', canUndo: true });
    commit.animating = true;
    await commit.updateComplete;
    await undoFooter.updateComplete;
    const undo = undoFooter.renderRoot.querySelector<HTMLButtonElement>('.btn-undo')!;
    const save = commit.renderRoot.querySelector<HTMLButtonElement>('.btn-save')!;
    const cancel = cancelOf(commit)!;
    expect(undo.disabled).toBe(false);
    expect(save.disabled).toBe(true);
    expect(save.textContent?.trim()).toBe('Save');
    expect(cancel.disabled).toBe(true);
    const accepted = vi.fn();
    undoFooter.addEventListener('undo-curves', accepted);
    undo.click();
    undo.click();
    expect(accepted).toHaveBeenCalledTimes(2);
    undoFooter.saving = true;
    await undoFooter.updateComplete;
    expect(undo.disabled).toBe(true);
  });
});
