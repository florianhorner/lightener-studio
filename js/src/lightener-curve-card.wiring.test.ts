// @vitest-environment jsdom

/**
 * Integration cover for the card's *wiring* — the global listeners, lifecycle
 * hooks and event plumbing that the extracted helpers cannot reach.
 *
 * The pure decisions already have unit tests (save-confirm-guard, load-lifecycle,
 * preview-controller). What was untested is that the card ever attaches them:
 * removing an `addEventListener` call used to leave every other suite green.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LightenerCurveCard } from './lightener-curve-card.js';
import type { Hass, LightCurve } from './utils/types.js';
import type { LoadState } from './utils/load-lifecycle.js';

type CardInternals = {
  _curves: LightCurve[];
  _selectedCurveId: string | null;
  _undoStack: LightCurve[][];
  _load: LoadState;
  _onSave: () => Promise<boolean>;
  _onCancel: () => void;
  _undo: () => void;
  _tryLoadCurves: () => Promise<void>;
  _previewActive: boolean;
  _startPreview: () => void;
  _stopPreview: () => void;
  _scrubberPosition: number | null;
  _coachPhase: string;
  _membershipOpen: boolean;
  _dirtyVersion: number;
};

const ENTITIES = {
  'light.a': { brightness: { '100': '100' } },
  'light.b': { brightness: { '100': '80' } },
};

afterEach(() => {
  document.body.querySelectorAll('lightener-curve-card').forEach((el) => el.remove());
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

beforeAll(async () => {
  if (typeof window !== 'undefined' && !window.matchMedia) {
    (window as unknown as { matchMedia: (q: string) => MediaQueryList }).matchMedia = (
      query: string
    ) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
  }
  await import('./lightener-curve-card.js');
});

function makeHass(): Hass & { callWS: ReturnType<typeof vi.fn> } {
  return {
    user: { is_admin: true },
    callWS: vi.fn().mockResolvedValue({ entities: ENTITIES }),
    callApi: vi.fn().mockResolvedValue(undefined),
    callService: vi.fn().mockResolvedValue(undefined),
    states: {
      'light.lightener': { state: 'on', attributes: { friendly_name: 'Lightener' } },
      'light.a': { state: 'on', attributes: { friendly_name: 'Alpha' } },
      'light.b': { state: 'on', attributes: { friendly_name: 'Beta' } },
    },
  } as unknown as Hass & { callWS: ReturnType<typeof vi.fn> };
}

async function mountCard(hass?: Hass & { callWS: ReturnType<typeof vi.fn> }): Promise<{
  card: LightenerCurveCard;
  internal: CardInternals;
  hass: Hass & { callWS: ReturnType<typeof vi.fn> };
}> {
  const _hass = hass ?? makeHass();
  const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
  card.setConfig({ entity: 'light.lightener' });
  card.hass = _hass;
  document.body.appendChild(card);
  await card.updateComplete;
  await Promise.resolve();
  await card.updateComplete;
  return { card, internal: card as unknown as CardInternals, hass: _hass };
}

// _isDirty is `_dirtyVersion !== _cleanVersion`, so an edit has to bump the
// version counter the same way the real point handlers do.
function makeDirty(internal: CardInternals): void {
  internal._curves = internal._curves.map((curve) => ({
    ...curve,
    controlPoints: [...curve.controlPoints, { lightener: 75, target: 90 }],
  }));
  internal._dirtyVersion++;
}

describe('keyboard shortcuts are wired to the window', () => {
  it('saves on Ctrl+S when the card is dirty', async () => {
    const { card, internal } = await mountCard();
    const save = vi.spyOn(internal, '_onSave').mockResolvedValue(true);
    makeDirty(internal);
    await card.updateComplete;

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    window.dispatchEvent(event);

    expect(save).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('saves on Cmd+S too, for macOS', async () => {
    const { card, internal } = await mountCard();
    const save = vi.spyOn(internal, '_onSave').mockResolvedValue(true);
    makeDirty(internal);
    await card.updateComplete;

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true })
    );

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('ignores Ctrl+S when there is nothing to save', async () => {
    const { internal } = await mountCard();
    const save = vi.spyOn(internal, '_onSave').mockResolvedValue(true);

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    window.dispatchEvent(event);

    expect(save).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores Ctrl+S while the membership dialog holds the card', async () => {
    const { card, internal } = await mountCard();
    const save = vi.spyOn(internal, '_onSave').mockResolvedValue(true);
    makeDirty(internal);
    internal._membershipOpen = true;
    await card.updateComplete;

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true })
    );

    expect(save).not.toHaveBeenCalled();
  });

  it('undoes on Ctrl+Z when the undo stack has entries', async () => {
    const { card, internal } = await mountCard();
    const undo = vi.spyOn(internal, '_undo').mockImplementation(() => {});
    internal._undoStack = [internal._curves];
    await card.updateComplete;

    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });
    window.dispatchEvent(event);

    expect(undo).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves Ctrl+Shift+Z alone so redo bindings stay available', async () => {
    const { card, internal } = await mountCard();
    const undo = vi.spyOn(internal, '_undo').mockImplementation(() => {});
    internal._undoStack = [internal._curves];
    await card.updateComplete;

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, cancelable: true })
    );

    expect(undo).not.toHaveBeenCalled();
  });

  it('cancels on Escape when dirty', async () => {
    const { card, internal } = await mountCard();
    const cancel = vi.spyOn(internal, '_onCancel').mockImplementation(() => {});
    makeDirty(internal);
    await card.updateComplete;

    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    window.dispatchEvent(event);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not cancel on Escape when the card is clean', async () => {
    const { internal } = await mountCard();
    const cancel = vi.spyOn(internal, '_onCancel').mockImplementation(() => {});

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));

    expect(cancel).not.toHaveBeenCalled();
  });

  it('stops listening once the card is disconnected', async () => {
    const { card, internal } = await mountCard();
    const save = vi.spyOn(internal, '_onSave').mockResolvedValue(true);
    makeDirty(internal);
    await card.updateComplete;

    card.remove();
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true })
    );

    expect(save).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when focus is inside another element', async () => {
    const { card, internal } = await mountCard();
    const save = vi.spyOn(internal, '_onSave').mockResolvedValue(true);
    makeDirty(internal);
    await card.updateComplete;

    const outside = document.createElement('input');
    document.body.appendChild(outside);
    outside.focus();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true })
    );

    expect(save).not.toHaveBeenCalled();
    outside.remove();
  });
});

describe('the unsaved-changes guard is wired to beforeunload', () => {
  it('blocks navigation while the card is dirty', async () => {
    const { card, internal } = await mountCard();
    makeDirty(internal);
    await card.updateComplete;

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(event);

    // preventDefault() is the modern signal; the legacy `returnValue = ''`
    // alongside it is not observable in jsdom.
    expect(event.defaultPrevented).toBe(true);
  });

  it('lets navigation through when there is nothing to lose', async () => {
    await mountCard();

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('stops guarding once the card is disconnected', async () => {
    const { card, internal } = await mountCard();
    makeDirty(internal);
    await card.updateComplete;
    card.remove();

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});

describe('the first-run coach reacts to tab visibility', () => {
  let visibility: string;

  beforeEach(() => {
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
  });

  async function mountFirstRunCard() {
    const hass = makeHass();
    const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
    card.setConfig({ entity: 'light.lightener', firstRun: true });
    card.hass = hass;
    document.body.appendChild(card);
    await card.updateComplete;
    await Promise.resolve();
    await card.updateComplete;
    return { card, internal: card as unknown as CardInternals };
  }

  it('pauses the shimmer when the tab is hidden and resumes when it returns', async () => {
    const { card, internal } = await mountFirstRunCard();
    const clear = vi.spyOn(window, 'clearTimeout');

    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    await card.updateComplete;
    const clearsWhileHidden = clear.mock.calls.length;

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await card.updateComplete;

    // Hiding the tab tears the timer down; the card survives both transitions.
    expect(clearsWhileHidden).toBeGreaterThan(0);
    expect(internal._coachPhase).not.toBe('complete');
  });

  it('detaches the visibility listener on disconnect', async () => {
    const { card } = await mountFirstRunCard();
    const remove = vi.spyOn(document, 'removeEventListener');

    card.remove();

    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});

describe('viewport listeners keep the footer overlay in sync', () => {
  it('re-syncs on resize and on scroll', async () => {
    const { card } = await mountCard();
    const schedule = vi.spyOn(
      card as unknown as { _scheduleFooterOverlaySync: () => void },
      '_scheduleFooterOverlaySync'
    );

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));

    expect(schedule).toHaveBeenCalledTimes(2);
  });

  it('detaches both listeners on disconnect', async () => {
    const { card } = await mountCard();
    const schedule = vi.spyOn(
      card as unknown as { _scheduleFooterOverlaySync: () => void },
      '_scheduleFooterOverlaySync'
    );

    card.remove();
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));

    expect(schedule).not.toHaveBeenCalled();
  });
});

describe('scrubber and preview events reach the card', () => {
  it('stores the scrubber position when the scrubber moves', async () => {
    const { card, internal } = await mountCard();
    const scrubber = card.renderRoot.querySelector('curve-scrubber')!;

    scrubber.dispatchEvent(
      new CustomEvent('scrubber-move', {
        detail: { position: 62 },
        bubbles: true,
        composed: true,
      })
    );
    await card.updateComplete;

    expect(internal._scrubberPosition).toBe(62);
    // The position is persisted so reopening the editor restores it.
    const stored = Object.values({ ...sessionStorage }).join('');
    expect(stored).toContain('62');
  });

  it('previews live while the scrubber moves with preview on', async () => {
    const { card, internal } = await mountCard();
    const preview = vi.spyOn(
      card as unknown as { _previewLights: (p: number) => void },
      '_previewLights'
    );
    internal._previewActive = true;
    await card.updateComplete;

    card.renderRoot.querySelector('curve-scrubber')!.dispatchEvent(
      new CustomEvent('scrubber-move', {
        detail: { position: 30 },
        bubbles: true,
        composed: true,
      })
    );

    expect(preview).toHaveBeenCalledWith(30);
  });

  it('toggles preview on and back off from the scrubber event', async () => {
    const { card, internal } = await mountCard();
    const start = vi.spyOn(internal, '_startPreview').mockImplementation(() => {});
    const stop = vi.spyOn(internal, '_stopPreview').mockImplementation(() => {});
    const scrubber = card.renderRoot.querySelector('curve-scrubber')!;

    scrubber.dispatchEvent(new CustomEvent('preview-toggle', { bubbles: true, composed: true }));
    expect(start).toHaveBeenCalledTimes(1);

    internal._previewActive = true;
    await card.updateComplete;
    scrubber.dispatchEvent(new CustomEvent('preview-toggle', { bubbles: true, composed: true }));
    expect(stop).toHaveBeenCalledTimes(1);
  });
});

describe('the load error offers a working retry', () => {
  it('re-runs the websocket load when Retry is clicked', async () => {
    const hass = makeHass();
    hass.callWS.mockRejectedValueOnce(new Error('socket down'));
    const { card } = await mountCard(hass);

    const retry = card.renderRoot.querySelector<HTMLButtonElement>('.error .retry-link');
    expect(retry, 'retry button after a failed load').not.toBeNull();

    hass.callWS.mockResolvedValue({ entities: ENTITIES });
    const callsBeforeRetry = hass.callWS.mock.calls.length;
    retry!.click();
    await card.updateComplete;
    await Promise.resolve();
    await card.updateComplete;

    expect(hass.callWS.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
    expect(card.renderRoot.querySelector('.error .retry-link')).toBeNull();
  });
});

describe('the Lovelace card contract', () => {
  it('reports a card size and grid options for the dashboard layout engine', async () => {
    const { card } = await mountCard();
    const sized = card as unknown as {
      getCardSize: () => number;
      getGridOptions: () => Record<string, number>;
    };

    expect(sized.getCardSize()).toBeGreaterThan(0);
    const grid = sized.getGridOptions();
    expect(grid.min_columns).toBeLessThanOrEqual(grid.columns);
    expect(grid.min_rows).toBeLessThanOrEqual(grid.rows);
  });
});
