// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SaveConflictReview } from './save-conflict-review.js';
import { testSnapshot } from '../test-guarded-backend.js';
import { wsPayloadToCurves } from '../utils/data.js';
beforeAll(() => {
  // jsdom has no top-layer layout; actual modal/focus behavior is proved in Chromium.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
});
afterEach(() => document.body.replaceChildren());
describe('conditional saved-shape review', () => {
  it('requires divergent choices and removed-edit acknowledgment before adoption', async () => {
    const element = new SaveConflictReview();
    const curves = wsPayloadToCurves(
      { 'light.a': { brightness: { '100': '45' } } },
      { 'light.a': { attributes: { friendly_name: 'Full Home Assistant Light Name' } } },
      ['red']
    );
    element.review = {
      latest: testSnapshot({}),
      curves: [],
      members: [
        {
          entityId: 'light.a',
          friendlyName: curves[0].friendlyName,
          kind: 'conflicting',
          local: curves[0],
        },
        {
          entityId: 'light.removed',
          friendlyName: 'Removed Light',
          kind: 'removed',
          local: curves[0],
        },
      ],
    };
    document.body.append(element);
    await element.updateComplete;
    const accepted: Array<Set<string>> = [];
    element.addEventListener('review-accept', (e) => accepted.push((e as CustomEvent).detail.keep));
    const buttons = () => [...element.shadowRoot!.querySelectorAll('button')];
    expect(buttons().at(-1)!.disabled).toBe(true);
    expect(element.shadowRoot!.textContent).toContain('Full Home Assistant Light Name');
    expect(element.shadowRoot!.textContent!.replace(/\s+/g, ' ')).toContain(
      'Undo returns to the latest saved shapes'
    );
    const keep = element.shadowRoot!.querySelector<HTMLInputElement>('input[type=radio]')!;
    keep.click();
    await element.updateComplete;
    expect(buttons().at(-1)!.disabled).toBe(true);
    element.shadowRoot!.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    await element.updateComplete;
    buttons().at(-1)!.click();
    expect([...accepted[0]]).toEqual(['light.a']);
    expect(element.review.curves).toEqual([]);
  });
  it('routes native cancel once without adopting', async () => {
    const element = new SaveConflictReview();
    element.review = { latest: testSnapshot({}), curves: [], members: [] };
    let dismissed = 0,
      adopted = 0;
    element.addEventListener('review-dismiss', () => dismissed++);
    element.addEventListener('review-accept', () => adopted++);
    document.body.append(element);
    await element.updateComplete;
    expect(element.shadowRoot!.activeElement?.tagName).toBe('H2');
    const dialog = element.shadowRoot!.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(cancel.defaultPrevented).toBe(true);
    expect(dismissed).toBe(1);
    expect(adopted).toBe(0);
    expect(dialog.open).toBe(false);
  });
  it.each(['open', 'accepted', 'dismissed'] as const)(
    'requires fresh choices when replacing a review that is %s on the same element',
    async (previous) => {
      const element = new SaveConflictReview();
      const [local] = wsPayloadToCurves({ 'light.a': { brightness: { '100': '45' } } }, {}, [
        'red',
      ]);
      const review = () => ({
        latest: testSnapshot({}),
        curves: [],
        members: [
          { entityId: 'light.a', friendlyName: 'Light A', kind: 'conflicting' as const, local },
          {
            entityId: 'light.removed',
            friendlyName: 'Removed Light',
            kind: 'removed' as const,
            local,
          },
        ],
      });
      element.review = review();
      const accepted = vi.fn(),
        dismissed = vi.fn();
      element.addEventListener('review-accept', accepted);
      element.addEventListener('review-dismiss', dismissed);
      document.body.append(element);
      await element.updateComplete;
      const root = element.shadowRoot!,
        buttons = () => [...root.querySelectorAll('button')];
      root.querySelector<HTMLInputElement>('input[type=radio]')!.click();
      root.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
      await element.updateComplete;
      expect(buttons().at(-1)!.disabled).toBe(false);
      if (previous === 'accepted') buttons().at(-1)!.click();
      if (previous === 'dismissed') buttons()[0].click();
      const priorAccepted = accepted.mock.calls.length,
        priorDismissed = dismissed.mock.calls.length;

      element.review = review();
      await element.updateComplete;
      expect(root.querySelector('dialog')!.open).toBe(true);
      if (previous !== 'open') expect(root.activeElement?.tagName).toBe('H2');
      expect(
        [...root.querySelectorAll<HTMLInputElement>('input')].every((input) => !input.checked)
      ).toBe(true);
      expect(buttons().at(-1)!.disabled).toBe(true);
      expect(buttons().at(-2)!.disabled).toBe(true);
      expect(accepted).toHaveBeenCalledTimes(priorAccepted);
      expect(dismissed).toHaveBeenCalledTimes(priorDismissed);

      root.querySelector<HTMLInputElement>('input[type=radio]')!.click();
      await element.updateComplete;
      expect(buttons().at(-1)!.disabled).toBe(true);
      root.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
      await element.updateComplete;
      buttons().at(-1)!.click();
      expect(accepted).toHaveBeenCalledTimes(priorAccepted + 1);
      expect([...(accepted.mock.calls.at(-1)![0] as CustomEvent).detail.keep]).toEqual(['light.a']);
    }
  );
  it('never opens an orphan modal after delayed rendering and disconnect', async () => {
    const element = new SaveConflictReview();
    element.review = { latest: testSnapshot({}), curves: [], members: [] };
    let finish!: (value: boolean) => void;
    const pending = new Promise<boolean>((resolve) => {
      finish = resolve;
    });
    const show = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    const update = vi.spyOn(element, 'updateComplete', 'get').mockReturnValue(pending);
    document.body.append(element);
    element.remove();
    finish(true);
    await pending;
    await Promise.resolve();
    expect(show).not.toHaveBeenCalled();
    update.mockRestore();
    show.mockRestore();
  });
});
