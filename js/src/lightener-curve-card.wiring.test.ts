import { testSnapshot } from './test-guarded-backend.js';
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
  _presetGraphTrial: { id: string } | null;
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
    callWS: vi.fn().mockResolvedValue(testSnapshot(ENTITIES)),
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

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      cancelable: true,
      bubbles: true,
      composed: true,
    });
    card.dispatchEvent(event);

    expect(save).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('saves on Cmd+S too, for macOS', async () => {
    const { card, internal } = await mountCard();
    const save = vi.spyOn(internal, '_onSave').mockResolvedValue(true);
    makeDirty(internal);
    await card.updateComplete;

    card.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        cancelable: true,
        bubbles: true,
        composed: true,
      })
    );

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('owns clean Ctrl+S without saving', async () => {
    const { card, internal } = await mountCard();
    const save = vi.spyOn(internal, '_onSave').mockResolvedValue(true);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      cancelable: true,
      bubbles: true,
      composed: true,
    });
    card.dispatchEvent(event);

    expect(save).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores Ctrl+S while the membership dialog holds the card', async () => {
    const { card, internal } = await mountCard();
    const save = vi.spyOn(internal, '_onSave').mockResolvedValue(true);
    makeDirty(internal);
    internal._membershipOpen = true;
    await card.updateComplete;

    card.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        cancelable: true,
        bubbles: true,
        composed: true,
      })
    );

    expect(save).not.toHaveBeenCalled();
  });

  it('undoes on Ctrl+Z when the undo stack has entries', async () => {
    const { card, internal } = await mountCard();
    const undo = vi.spyOn(internal, '_undo').mockImplementation(() => {});
    internal._undoStack = [internal._curves];
    await card.updateComplete;

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      cancelable: true,
      bubbles: true,
      composed: true,
    });
    card.dispatchEvent(event);

    expect(undo).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('undoes on Cmd+Z so the macOS binding works too', async () => {
    const { card, internal } = await mountCard();
    const undo = vi.spyOn(internal, '_undo').mockImplementation(() => {});
    internal._undoStack = [internal._curves];
    await card.updateComplete;

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      cancelable: true,
      bubbles: true,
      composed: true,
    });
    card.dispatchEvent(event);

    expect(undo).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves Ctrl+Shift+Z alone so redo bindings stay available', async () => {
    const { card, internal } = await mountCard();
    const undo = vi.spyOn(internal, '_undo').mockImplementation(() => {});
    internal._undoStack = [internal._curves];
    await card.updateComplete;

    card.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
        cancelable: true,
        bubbles: true,
        composed: true,
      })
    );

    expect(undo).not.toHaveBeenCalled();
  });

  it('leaves Escape with no owning card untouched when dirty', async () => {
    const { card, internal } = await mountCard();
    const cancel = vi.spyOn(internal, '_onCancel').mockImplementation(() => {});
    makeDirty(internal);
    await card.updateComplete;

    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    window.dispatchEvent(event);

    expect(cancel).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
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
    vi.useFakeTimers();
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
  });

  afterEach(() => {
    // The override is an own property; deleting it hands `visibilityState`
    // back to the Document prototype for the suites that follow.
    delete (document as unknown as { visibilityState?: unknown }).visibilityState;
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

  it('stops the shimmer for good once the tab is hidden', async () => {
    const { card, internal } = await mountFirstRunCard();
    expect(internal._presetGraphTrial?.id).toBe('dim_accent');
    await vi.advanceTimersByTimeAsync(1350);
    expect(internal._presetGraphTrial?.id).toBe('late_starter');

    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    await card.updateComplete;
    expect(internal._presetGraphTrial).toBeNull();

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await card.updateComplete;

    // Returning to the tab must not replay the animation or complete guidance.
    expect(internal._presetGraphTrial).toBeNull();
    await vi.advanceTimersByTimeAsync(1350);
    expect(internal._presetGraphTrial).toBeNull();
    await vi.advanceTimersByTimeAsync(2700);
    expect(internal._presetGraphTrial).toBeNull();
    expect(card.renderRoot.querySelector('.coach-copy strong')?.textContent).toBe(
      'Dim a bright light'
    );
  });

  it('starts the shimmer on return when the card mounted on a hidden tab', async () => {
    visibility = 'hidden';
    const { card, internal } = await mountFirstRunCard();
    expect(internal._presetGraphTrial).toBeNull();

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await card.updateComplete;

    expect(internal._presetGraphTrial?.id).toBe('dim_accent');
    await vi.advanceTimersByTimeAsync(1350);
    expect(internal._presetGraphTrial?.id).toBe('late_starter');
  });

  it('detaches the visibility listener on disconnect', async () => {
    const { card } = await mountFirstRunCard();
    const remove = vi.spyOn(document, 'removeEventListener');

    card.remove();

    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('never starts the shimmer when the system asks for reduced motion', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    try {
      const { internal } = await mountFirstRunCard();
      expect(internal._presetGraphTrial).toBeNull();
      visibility = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      visibility = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      expect(internal._presetGraphTrial).toBeNull();
      await vi.advanceTimersByTimeAsync(1350);
      expect(internal._presetGraphTrial).toBeNull();
      await vi.advanceTimersByTimeAsync(2700);
      expect(internal._presetGraphTrial).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });
});

describe('viewport listeners keep the Room grip aligned', () => {
  it('re-measures on resize, not on scroll: nothing under Room is pinned', async () => {
    const { card } = await mountCard();
    const schedule = vi.spyOn(
      card as unknown as { _scheduleLayoutSync: () => void },
      '_scheduleLayoutSync'
    );

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(card.renderRoot.querySelector('.footer-slot, [data-overlay]')).toBeNull();
  });

  it('detaches the resize listener on disconnect', async () => {
    const { card } = await mountCard();
    const schedule = vi.spyOn(
      card as unknown as { _scheduleLayoutSync: () => void },
      '_scheduleLayoutSync'
    );

    card.remove();
    window.dispatchEvent(new Event('resize'));

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
    const stored = sessionStorage.getItem('lightener:curve-card:v1:light.lightener');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).scrubberPosition).toBe(62);
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

describe('Watch room react presents the room following the editor', () => {
  type WatchInternals = CardInternals & {
    _watchAck: number;
    _watchHintDismissed: boolean;
    _onScrubberEnd: () => void;
  };

  afterEach(() => localStorage.clear());

  it('shows a warm status and the one-time note while watching, and passes Watch to the list', async () => {
    const { card, internal } = await mountCard();
    const watch = internal as WatchInternals;
    watch._watchHintDismissed = false;
    internal._previewActive = true;
    await card.updateComplete;

    // Watching lives in the Room meaning line, with its dot; no row of its own.
    const scrubber = card.renderRoot.querySelector('curve-scrubber')!;
    await scrubber.updateComplete;
    const status = scrubber.renderRoot.querySelector('.meaning-line .watch-status');
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.textContent).toContain('Your room follows');
    expect(status?.querySelector('.watch-dot')).not.toBeNull();
    expect(card.renderRoot.querySelector('.message-line')).toBeNull();
    const hint = card.renderRoot.querySelector('.watch-anchor .watch-hint');
    expect(hint?.textContent).toContain(
      'Save, Cancel or turning Watch off tries to put your lights back.'
    );
    // The note is body text only: no bold title line.
    expect(hint?.querySelector('strong')).toBeNull();
    expect(hint?.textContent).not.toContain('Your room is following');
    expect(card.renderRoot.querySelector('curve-legend')!.watching).toBe(true);

    hint!.querySelector<HTMLButtonElement>('.watch-hint-dismiss')!.click();
    await card.updateComplete;
    expect(card.renderRoot.querySelector('.watch-hint')).toBeNull();
    expect(localStorage.getItem('lightener:watch-hint:v1')).toBe('dismissed');
    await card.updateComplete;
    expect(
      (card.renderRoot as ShadowRoot).activeElement?.classList.contains('preview-toggle-btn')
    ).toBe(true);

    internal._previewActive = false;
    await card.updateComplete;
    await scrubber.updateComplete;
    expect(scrubber.renderRoot.querySelector('.watch-status')).toBeNull();
    expect(card.renderRoot.querySelector('curve-legend')!.watching).toBe(false);
  });

  it('keeps one Watch switch on a dashboard card, at the end of the Room meaning line', async () => {
    const { card } = await mountCard();
    expect(card.renderRoot.querySelectorAll('.preview-toggle-btn')).toHaveLength(1);
    expect(card.renderRoot.querySelector('.header .preview-toggle-btn')).toBeNull();
    const slotted = card.renderRoot.querySelector('curve-scrubber > .watch-under-room');
    expect(slotted?.getAttribute('slot')).toBe('watch');
    expect(slotted?.querySelector('.preview-toggle-btn')).not.toBeNull();
    expect(card.renderRoot.querySelector('.message-line .preview-toggle-btn')).toBeNull();
  });

  it('shows the note as a snackbar under Room on narrow cards, gone after 6s', async () => {
    const { card, internal } = await mountCard();
    const watch = internal as WatchInternals & { _narrowLayout: boolean };
    vi.useFakeTimers();
    try {
      watch._narrowLayout = true;
      watch._watchHintDismissed = false;
      internal._previewActive = true;
      await card.updateComplete;
      expect(card.renderRoot.querySelector('.watch-anchor .watch-hint')).toBeNull();
      expect(card.renderRoot.querySelector('.room-surface > .watch-hint.snackbar')).not.toBeNull();
      expect(card.renderRoot.querySelector('.watch-hint.snackbar strong')).toBeNull();

      // Turning Watch off first keeps the note for next time.
      internal._previewActive = false;
      await card.updateComplete;
      vi.advanceTimersByTime(6000);
      expect(localStorage.getItem('lightener:watch-hint:v1')).toBeNull();

      internal._previewActive = true;
      await card.updateComplete;
      vi.advanceTimersByTime(5999);
      await card.updateComplete;
      expect(card.renderRoot.querySelector('.watch-hint')).not.toBeNull();
      vi.advanceTimersByTime(1);
      await card.updateComplete;
      expect(card.renderRoot.querySelector('.watch-hint')).toBeNull();
      expect(localStorage.getItem('lightener:watch-hint:v1')).toBe('dismissed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns focus to Watch when the narrow-card note is dismissed from the keyboard', async () => {
    const { card, internal } = await mountCard();
    const watch = internal as WatchInternals & { _narrowLayout: boolean };
    vi.useFakeTimers();
    try {
      watch._narrowLayout = true;
      watch._watchHintDismissed = false;
      internal._previewActive = true;
      await card.updateComplete;
      const dismiss = card.renderRoot.querySelector<HTMLButtonElement>(
        '.room-surface > .watch-hint.snackbar .watch-hint-dismiss'
      )!;
      dismiss.focus();
      dismiss.click();
      await card.updateComplete;
      await card.updateComplete;
      expect(card.renderRoot.querySelector('.watch-hint')).toBeNull();
      expect(
        (card.renderRoot as ShadowRoot).activeElement?.classList.contains('preview-toggle-btn')
      ).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('merges the unsaved-changes note into the one watching status', async () => {
    const { card, internal } = await mountCard();
    internal._previewActive = true;
    makeDirty(internal);
    await card.updateComplete;
    expect(card.dirty).toBe(true);
    expect(card.renderRoot.querySelector('.watch-status')).toBeNull();
    const scrubber = card.renderRoot.querySelector('curve-scrubber')!;
    await scrubber.updateComplete;
    const statuses = scrubber.renderRoot.querySelectorAll('.watch-status');
    expect(statuses).toHaveLength(1);
    expect(statuses[0].textContent).toContain('Watching unsaved changes · Save keeps the shapes.');
    expect(scrubber.renderRoot.querySelector('.preview-status')).toBeNull();
    expect(scrubber.renderRoot.querySelector('.meaning-line')?.textContent).not.toContain(
      'Your room follows'
    );
  });

  it('acknowledges finished changes only while watching', async () => {
    const { card, internal } = await mountCard();
    const watch = internal as WatchInternals;
    watch._onScrubberEnd();
    expect(watch._watchAck).toBe(0);

    internal._previewActive = true;
    await card.updateComplete;
    watch._onScrubberEnd();
    expect(watch._watchAck).toBe(1);
    await card.updateComplete;
    expect(card.renderRoot.querySelector('curve-legend')!.watchAck).toBe(1);
  });

  it('turns the flicker off with joy: { watch: false }', async () => {
    const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
    card.setConfig({ entity: 'light.lightener', joy: { watch: false } });
    card.hass = makeHass();
    document.body.appendChild(card);
    await card.updateComplete;
    expect(card.renderRoot.querySelector('curve-legend')!.watchMotion).toBe(false);
  });
});

describe('the load error offers a working retry', () => {
  it('re-runs the websocket load when Retry is clicked', async () => {
    const hass = makeHass();
    hass.callWS.mockRejectedValueOnce(new Error('socket down'));
    const { card } = await mountCard(hass);

    const retry = card.renderRoot.querySelector<HTMLButtonElement>('.error .retry-link');
    expect(retry, 'retry button after a failed load').not.toBeNull();

    hass.callWS.mockResolvedValue(testSnapshot(ENTITIES));
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

    expect(sized.getCardSize()).toBe(4);
    expect(sized.getGridOptions()).toEqual({
      columns: 12,
      rows: 9,
      min_columns: 6,
      min_rows: 6,
    });
  });
});
