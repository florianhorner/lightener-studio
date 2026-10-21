// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { LightenerCurveCard } from './lightener-curve-card.js';
import type { Hass, LightCurve } from './utils/types.js';
import type { LoadState } from './utils/load-lifecycle.js';
interface State {
  _curves: LightCurve[];
  _undoStack: LightCurve[][];
  _scrubberPosition: number | null;
  _dirtyVersion: number;
  _selectedCurveId: string | null;
  _load: LoadState;
  _dragActive: boolean;
  _cancelAnimating: boolean;
  _membershipOpen: boolean;
  _lightGesture: unknown;
  _previewActive: boolean;
  _undo(): void;
  _dispatchSave(action: { type: 'save-start' | 'reset' }): void;
}
const ENTITIES = {
  'light.a': { brightness: { '0': '12', '25': '35', '100': '80' } },
  'light.b': { brightness: { '0': '0', '100': '100' } },
};
const noMotion = { settle: false, diagonal: false, ripple: false, draw_in: false };
beforeAll(async () => {
  window.matchMedia ??= (media: string) =>
    ({
      matches: false,
      media,
      addEventListener() {},
      removeEventListener() {},
    }) as unknown as MediaQueryList;
  await import('./lightener-curve-card.js');
});
afterEach(() => {
  document.body.replaceChildren();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function mount(storedPosition?: number) {
  if (storedPosition !== undefined) {
    sessionStorage.setItem(
      'lightener:curve-card:v1:light.group',
      JSON.stringify({ selectedCurveId: null, scrubberPosition: storedPosition })
    );
  }
  let stored = structuredClone(ENTITIES);
  const hass: Hass = {
    user: { is_admin: true },
    states: {
      'light.group': { state: 'on', attributes: {} },
      'light.a': { state: 'on', attributes: { friendly_name: 'Alpha' } },
      'light.b': { state: 'on', attributes: { friendly_name: 'Bravo' } },
    },
    callWS: vi.fn(async (m) => {
      if (m.type === 'lightener/save_curves') {
        stored = m.curves as typeof ENTITIES;
        return {};
      }
      return { entities: structuredClone(stored) };
    }) as Hass['callWS'],
    callApi: vi.fn(),
    callService: vi.fn().mockResolvedValue(undefined),
  };
  const card = document.createElement('lightener-curve-card');
  card.setConfig({ entity: 'light.group', joy: noMotion });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  await Promise.resolve();
  await card.updateComplete;
  const state = card as unknown as State;
  if (storedPosition === undefined) state._scrubberPosition = 50;
  await card.updateComplete;
  return { card, state, hass };
}
function intent(card: LightenerCurveCard, type: string, detail: object) {
  card.renderRoot
    .querySelector('curve-legend')!
    .dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}
function edit(card: LightenerCurveCard, target: number) {
  intent(card, 'light-level-start', { entityId: 'light.a' });
  intent(card, 'light-level-input', { entityId: 'light.a', target });
}
function snapshot(s: State) {
  return {
    curves: structuredClone(s._curves),
    room: s._scrubberPosition,
    dirty: s._dirtyVersion,
    undo: s._undoStack.length,
  };
}
describe('full-bar card transactions', () => {
  it('focuses repeatedly without model/history or service calls even during preview', async () => {
    const { card, state, hass } = await mount();
    state._previewActive = true;
    const before = snapshot(state);
    intent(card, 'focus-curve', { entityId: 'light.a' });
    intent(card, 'focus-curve', { entityId: 'light.a' });
    expect(state._selectedCurveId).toBe('light.a');
    expect(snapshot(state)).toEqual(before);
    expect(hass.callService).not.toHaveBeenCalled();
  });
  it('edits one fixed knot with one Undo and clean restoration', async () => {
    const { card, state } = await mount();
    const before = structuredClone(state._curves);
    edit(card, 60);
    for (const target of [65, 70, 75])
      intent(card, 'light-level-input', { entityId: 'light.a', target });
    intent(card, 'light-level-end', { entityId: 'light.a' });
    expect(state._undoStack).toHaveLength(1);
    expect(state._curves[1]).toEqual(before[1]);
    expect(state._curves[0].controlPoints.filter((p) => p.lightener === 50)).toEqual([
      { lightener: 50, target: 75 },
    ]);
    expect(state._scrubberPosition).toBe(50);
    expect(state._dragActive).toBe(false);
    // Use the same clock for animation start and RAF, as a browser does.
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) =>
      window.setTimeout(() => callback(performance.now() + 400), 0)
    );
    state._undo();
    await new Promise((r) => setTimeout(r, 20));
    expect(state._curves).toEqual(before);
    expect(card.dirty).toBe(false);
  });
  it('leaves no-op and invalid input clean', async () => {
    const { card, state } = await mount();
    state._scrubberPosition = 100;
    const before = snapshot(state);
    edit(card, 80);
    intent(card, 'light-level-input', { entityId: 'light.a', target: NaN });
    intent(card, 'light-level-end', { entityId: 'light.a' });
    expect(snapshot(state)).toEqual(before);
    expect(state._dragActive).toBe(false);
  });
  it.each([0, 0.4, 0.49])(
    'cannot edit a restored Room value of %s that displays off',
    async (position) => {
      const { card, state, hass } = await mount(position);
      expect(state._scrubberPosition).toBe(Math.round(position));
      const before = snapshot(state);
      edit(card, 60);
      intent(card, 'light-level-end', { entityId: 'light.a' });
      expect(snapshot(state)).toEqual(before);
      expect(state._lightGesture).toBeNull();
      expect(hass.callService).not.toHaveBeenCalled();
      expect(
        vi
          .mocked(hass.callWS)
          .mock.calls.some(([message]) => message.type === 'lightener/save_curves')
      ).toBe(false);
    }
  );
  it.each([0.5, 0.6, 49.6, 99.6])(
    'edits the normalized knot from a restored Room value of %s',
    async (position) => {
      const { card, state } = await mount(position);
      const before = structuredClone(state._curves);
      edit(card, 60);
      intent(card, 'light-level-end', { entityId: 'light.a' });
      expect(state._scrubberPosition).toBe(Math.round(position));
      expect(state._curves[0].controlPoints).toContainEqual({
        lightener: Math.round(position),
        target: 60,
      });
      expect(state._curves[0].controlPoints[0]).toEqual(before[0].controlPoints[0]);
      expect(state._curves[1]).toEqual(before[1]);
      expect(state._undoStack).toHaveLength(1);
    }
  );
  it('requires a matching transaction entity', async () => {
    const { card, state } = await mount();
    const before = snapshot(state);
    intent(card, 'light-level-input', { entityId: 'light.a', target: 40 });
    intent(card, 'light-level-start', { entityId: 'light.a' });
    intent(card, 'light-level-input', { entityId: 'light.b', target: 20 });
    expect(snapshot(state)).toEqual(before);
  });
  it.each([
    'admin',
    'saving',
    'animation',
    'membership',
    'loading',
    'hidden',
    'missing',
    'room-zero',
    'load-error',
  ])('guards stale %s events', async (lock) => {
    const { card, state, hass } = await mount();
    intent(card, 'light-level-start', { entityId: 'light.a' });
    if (lock === 'admin') {
      hass.user.is_admin = false;
      card.hass = hass;
    }
    if (lock === 'saving') state._dispatchSave({ type: 'save-start' });
    if (lock === 'animation') state._cancelAnimating = true;
    if (lock === 'membership') state._membershipOpen = true;
    if (lock === 'loading') state._load = { ...state._load, loading: true };
    if (lock === 'load-error') state._load = { ...state._load, loadError: 'Unavailable' };
    if (lock === 'hidden')
      state._curves = [{ ...state._curves[0], visible: false }, state._curves[1]];
    if (lock === 'missing') state._curves = state._curves.slice(1);
    if (lock === 'room-zero') state._scrubberPosition = 0;
    const before = snapshot(state);
    intent(card, 'light-level-input', { entityId: 'light.a', target: 15 });
    intent(card, 'light-level-start', { entityId: 'light.a' });
    intent(card, 'light-level-input', { entityId: 'light.a', target: 15 });
    expect(snapshot(state)).toEqual(before);
  });
  it('ends before room movement and ignores trailing input', async () => {
    const { card, state } = await mount();
    edit(card, 60);
    card.renderRoot.querySelector('curve-scrubber')!.dispatchEvent(
      new CustomEvent('scrubber-move', {
        detail: { position: 75 },
        bubbles: true,
        composed: true,
      })
    );
    const before = snapshot(state);
    intent(card, 'light-level-input', { entityId: 'light.a', target: 20 });
    expect(snapshot(state)).toEqual(before);
    expect(state._curves[0].controlPoints.some((p) => p.lightener === 75)).toBe(false);
    expect(state._scrubberPosition).toBe(75);
    expect(state._undoStack).toHaveLength(1);
  });
  it('retains stable identity after member reorder', async () => {
    const { card, state } = await mount();
    intent(card, 'light-level-start', { entityId: 'light.a' });
    state._curves = [state._curves[1], state._curves[0]];
    intent(card, 'light-level-input', { entityId: 'light.a', target: 65 });
    expect(state._curves[0].entityId).toBe('light.b');
    expect(state._curves[0].controlPoints).toHaveLength(2);
    expect(state._curves[1].controlPoints).toContainEqual({ lightener: 50, target: 65 });
  });
  it('gives graph-to-bar handoff separate Undo snapshots and ignores late graph drop', async () => {
    const { card, state } = await mount();
    const original = structuredClone(state._curves);
    const graph = card.renderRoot.querySelector('curve-graph')!;
    graph.dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 25, target: 40 },
        bubbles: true,
        composed: true,
      })
    );
    const afterGraph = structuredClone(state._curves);
    expect(state._undoStack).toHaveLength(1);
    edit(card, 60);
    graph.dispatchEvent(new CustomEvent('point-drop', { bubbles: true, composed: true }));
    intent(card, 'light-level-input', { entityId: 'light.a', target: 70 });
    expect(state._undoStack).toHaveLength(2);
    expect(state._dragActive).toBe(true);
    intent(card, 'light-level-end', { entityId: 'light.a' });
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) =>
      window.setTimeout(() => callback(performance.now() + 400), 0)
    );
    state._undo();
    await new Promise((r) => setTimeout(r, 20));
    expect(state._curves).toEqual(afterGraph);
    state._undo();
    await new Promise((r) => setTimeout(r, 20));
    expect(state._curves).toEqual(original);
    expect(card.dirty).toBe(false);
  });
  it('gives bar-to-graph handoff a new transaction and ignores late bar completion', async () => {
    const { card, state } = await mount();
    edit(card, 60);
    const afterBar = structuredClone(state._curves);
    const graph = card.renderRoot.querySelector('curve-graph')!;
    graph.dispatchEvent(
      new CustomEvent('graph-interaction', {
        detail: { phase: 'start', input: 'keyboard' },
        bubbles: true,
        composed: true,
      })
    );
    for (const target of [40, 45]) {
      graph.dispatchEvent(
        new CustomEvent('point-move', {
          detail: { curveIndex: 1, pointIndex: 1, lightener: 100, target },
          bubbles: true,
          composed: true,
        })
      );
      intent(card, 'light-level-end', { entityId: 'light.a' });
    }
    expect(state._curves[0]).toEqual(afterBar[0]);
    expect(state._undoStack).toHaveLength(2);
    expect(state._dragActive).toBe(true);
    expect(state._lightGesture).toBeNull();
    graph.dispatchEvent(new CustomEvent('point-drop', { bubbles: true, composed: true }));
    expect(state._dragActive).toBe(false);
  });
  it('a no-op bar gesture cannot lend its Undo boundary to a graph edit', async () => {
    const { card, state } = await mount();
    state._scrubberPosition = 100;
    edit(card, 80);
    expect(state._undoStack).toHaveLength(0);
    const graph = card.renderRoot.querySelector('curve-graph')!;
    graph.dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 1, pointIndex: 1, lightener: 100, target: 90 },
        bubbles: true,
        composed: true,
      })
    );
    expect(state._undoStack).toHaveLength(1);
    expect(state._curves[0].controlPoints.at(-1)?.target).toBe(80);
    graph.dispatchEvent(new CustomEvent('point-drop', { bubbles: true, composed: true }));
    expect(state._dragActive).toBe(false);
  });
  it('saves and confirms the knot through existing reload', async () => {
    const { card, state, hass } = await mount();
    edit(card, 61);
    intent(card, 'light-level-end', { entityId: 'light.a' });
    expect(await card.saveCurves()).toBe(true);
    expect(hass.callWS).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lightener/save_curves' })
    );
    expect(state._curves[0].controlPoints).toContainEqual({ lightener: 50, target: 61 });
    expect(card.dirty).toBe(false);
  });
  it('rejects Save and edits after failed new-group load', async () => {
    const { card, state, hass } = await mount();
    vi.mocked(hass.callWS).mockRejectedValueOnce(new Error('Unavailable'));
    card.setConfig({ entity: 'light.other', joy: noMotion });
    await card.updateComplete;
    await Promise.resolve();
    await card.updateComplete;
    const before = snapshot(state);
    edit(card, 20);
    expect(snapshot(state)).toEqual(before);
    expect(await card.saveCurves()).toBe(false);
    expect(
      vi.mocked(hass.callWS).mock.calls.some(([m]) => m.type === 'lightener/save_curves')
    ).toBe(false);
  });
  it('clears context on disconnect', async () => {
    const { card, state } = await mount();
    edit(card, 60);
    card.remove();
    expect(state._lightGesture).toBeNull();
    expect(state._dragActive).toBe(false);
  });
});

describe('responsive layout observer lifecycle', () => {
  type LayoutState = State & {
    _narrowLayout: boolean;
    _pendingNarrowLayout: boolean | null;
    _footerOverlayFrame: number | null;
    _endLightGesture(): void;
    _syncFooterOverlay(): void;
  };

  async function layoutHarness() {
    const observers: Array<{
      callback: ResizeObserverCallback;
      targets: Set<Element>;
    }> = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        targets = new Set<Element>();
        constructor(callback: ResizeObserverCallback) {
          observers.push({ callback, targets: this.targets });
        }
        observe(target: Element) {
          this.targets.add(target);
        }
        disconnect() {
          this.targets.clear();
        }
      }
    );
    let nextFrame = 1;
    const frames = new Map<number, FrameRequestCallback>();
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    });
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id);
    });
    const { card, state: originalState } = await mount();
    const state = originalState as LayoutState;
    const cardNode = card.renderRoot.querySelector('.card')!;
    const observer = observers.find((candidate) => candidate.targets.has(cardNode))!;
    expect(observer).toBeDefined();
    const frame = async () => {
      const queued = [...frames.values()];
      frames.clear();
      for (const callback of queued) callback(performance.now());
      await card.updateComplete;
    };
    const resize = (width: number) =>
      observer.callback(
        [{ target: cardNode, contentRect: { width } } as ResizeObserverEntry],
        {} as ResizeObserver
      );
    await frame(); // Drain the initial footer geometry request.
    return { card, state, resize, frame, frames, cancel };
  }

  it('defers mode changes and gesture finalization until the animation frame', async () => {
    const { card, state, resize, frame } = await layoutHarness();
    edit(card, 60);
    await card.updateComplete;
    await frame();
    const endGesture = vi.spyOn(state, '_endLightGesture');
    resize(390);
    expect(state._narrowLayout).toBe(false);
    expect(state._pendingNarrowLayout).toBe(true);
    expect(state._lightGesture).not.toBeNull();
    expect(endGesture).not.toHaveBeenCalled();
    await frame();
    expect(state._narrowLayout).toBe(true);
    expect(state._pendingNarrowLayout).toBeNull();
    expect(state._lightGesture).toBeNull();
    expect(endGesture).toHaveBeenCalledOnce();
  });

  it.each([
    { widths: [390, 1440], narrow: false },
    { widths: [1440, 390], narrow: true },
  ])('applies only the latest observed width: $widths', async ({ widths, narrow }) => {
    const { state, resize, frame, frames } = await layoutHarness();
    const endGesture = vi.spyOn(state, '_endLightGesture');
    for (const width of widths) resize(width);
    expect(state._narrowLayout).toBe(false);
    expect(endGesture).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
    await frame();
    expect(state._narrowLayout).toBe(narrow);
    expect(state._pendingNarrowLayout).toBeNull();
    expect(endGesture).toHaveBeenCalledTimes(narrow ? 1 : 0);
  });

  it('discards and cancels a pending layout frame on disconnect', async () => {
    const { card, state, resize, frame, frames, cancel } = await layoutHarness();
    const syncGeometry = vi.spyOn(state, '_syncFooterOverlay');
    resize(390);
    const scheduled = state._footerOverlayFrame;
    expect(scheduled).not.toBeNull();
    card.remove();
    expect(cancel).toHaveBeenCalledWith(scheduled);
    expect(state._pendingNarrowLayout).toBeNull();
    expect(state._footerOverlayFrame).toBeNull();
    expect(frames.size).toBe(0);
    await frame();
    expect(state._narrowLayout).toBe(false);
    expect(syncGeometry).not.toHaveBeenCalled();
  });
});
