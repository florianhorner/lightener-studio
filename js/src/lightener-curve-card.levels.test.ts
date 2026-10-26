import { previewSessions, PreviewSessionRegistry } from './utils/preview-session.js';
import { testBackend, testLightService } from './test-guarded-backend.js';
// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LightenerCurveCard } from './lightener-curve-card.js';
import type { Hass, LightCurve } from './utils/types.js';
import type { LoadState } from './utils/load-lifecycle.js';
import type { CurveGraph } from './components/curve-graph.js';
import type { BrightnessBar } from './components/brightness-bar.js';
import type { CurveFooter } from './components/curve-footer.js';
import type { CoachController } from './utils/coach-controller.js';
import { sampleCurveAt, toSvgX, toSvgY } from './utils/graph-math.js';
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
  _coach: CoachController;
  _startPreview(): void;
  _endLightGesture(reload?: boolean): void;
  _completeDragMaybeReload(): void;
  _undo(): void;
  _applyPreset(preset: {
    id: string;
    name: string;
    description: string;
    controlPoints: { lightener: number; target: number }[];
  }): void;
  _dispatchSave(action: { type: 'save-start' | 'reset' }): void;
}
const ENTITIES = {
  'light.a': { brightness: { '0': '12', '25': '35', '100': '80' } },
  'light.b': { brightness: { '0': '0', '100': '100' } },
};
const noMotion = { settle: false, diagonal: false, ripple: false, draw_in: false };
let testUser = '';
beforeEach(() => {
  testUser = crypto.randomUUID();
  Object.assign(previewSessions, new PreviewSessionRegistry());
});
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
  const hass: Hass = {
    user: { is_admin: true, id: testUser },
    states: {
      'light.group': { state: 'on', attributes: {} },
      'light.a': { state: 'on', attributes: { friendly_name: 'Alpha' } },
      'light.b': { state: 'on', attributes: { friendly_name: 'Bravo' } },
    },
    callWS: vi.fn(testBackend(ENTITIES)) as Hass['callWS'],
    callApi: vi.fn(),
    callService: vi.fn().mockResolvedValue(undefined),
  };
  vi.mocked(hass.callService).mockImplementation(testLightService(hass.states));
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
async function levelBar(card: LightenerCurveCard) {
  await card.updateComplete;
  const legend = card.renderRoot.querySelector('curve-legend')!;
  await legend.updateComplete;
  const bar = legend.renderRoot.querySelector<BrightnessBar>('brightness-bar')!;
  await bar.updateComplete;
  const input = bar.renderRoot.querySelector('input')!;
  input.getBoundingClientRect = () => ({ width: 300 }) as DOMRect;
  const captures = new Set<number>();
  input.setPointerCapture = (id) => {
    captures.add(id);
  };
  input.hasPointerCapture = (id) => captures.has(id);
  input.releasePointerCapture = (id) => {
    captures.delete(id);
  };
  const move = (type: string, x = 30) => {
    const event = new MouseEvent(type, {
      clientX: x,
      clientY: 20,
      button: 0,
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } });
    input.dispatchEvent(event);
  };
  return { bar, input, move };
}
async function graphPoint(card: LightenerCurveCard, pointIndex = 1) {
  intent(card, 'focus-curve', { entityId: 'light.a' });
  await card.updateComplete;
  const graph = card.renderRoot.querySelector<CurveGraph>('curve-graph')!;
  await graph.updateComplete;
  const svg = graph.renderRoot.querySelector('svg')!;
  const captures = new Set<number>();
  svg.setPointerCapture = (id) => captures.add(id);
  svg.hasPointerCapture = (id) => captures.has(id);
  svg.releasePointerCapture = (id) => {
    captures.delete(id);
    svg.dispatchEvent(pointer('lostpointercapture'));
  };
  svg.getScreenCTM = () => ({ inverse: () => ({ a: 1 }) }) as DOMMatrix;
  svg.createSVGPoint = () =>
    ({
      x: 0,
      y: 0,
      matrixTransform() {
        return { x: this.x, y: this.y };
      },
    }) as DOMPoint;
  const hit = graph.renderRoot.querySelector<SVGCircleElement>(
    `.hit-circle[data-curve="0"][data-point="${pointIndex}"]`
  )!;
  return { graph, svg, hit };
}
function pointer(type: string, x = 25, y = 35) {
  return new PointerEvent(type, {
    bubbles: true,
    composed: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    clientX: toSvgX(x),
    clientY: toSvgY(y),
  });
}
async function flushGraph(card: LightenerCurveCard, graph: CurveGraph) {
  await card.updateComplete;
  await graph.updateComplete;
}
describe('mixed graph input transactions', () => {
  it('keeps drag, arrow adjustment and continued drag in one Undo', async () => {
    const { card, state } = await mount();
    const { graph, svg, hit } = await graphPoint(card);
    const before = structuredClone(state._curves);
    hit.dispatchEvent(pointer('pointerdown'));
    svg.dispatchEvent(pointer('pointermove', 30, 45));
    await flushGraph(card, graph);
    hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(state._curves[0].controlPoints[1].target).toBe(46);
    expect(state._dragActive).toBe(true);
    svg.dispatchEvent(pointer('pointermove', 35, 55));
    svg.dispatchEvent(pointer('pointerup', 35, 55));
    expect(state._undoStack).toEqual([before]);
    expect(state._dragActive).toBe(false);
    expect(graph.interactionActive).toBe(false);
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) =>
      window.setTimeout(() => callback(performance.now() + 400), 0)
    );
    state._undo();
    await vi.waitFor(() => expect(state._curves).toEqual(before));
    expect(card.dirty).toBe(false);
  });

  it('keeps a key on another point in the held drag Undo while the drag continues', async () => {
    const { card, state } = await mount();
    const { graph, svg, hit } = await graphPoint(card);
    const other = graph.renderRoot.querySelector<SVGCircleElement>(
      '.hit-circle[data-curve="0"][data-point="2"]'
    )!;
    const before = structuredClone(state._curves);
    hit.dispatchEvent(pointer('pointerdown'));
    svg.dispatchEvent(pointer('pointermove', 30, 45));
    await flushGraph(card, graph);
    other.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(state._curves[0].controlPoints[2].target).toBe(81);
    expect(state._dragActive).toBe(true);
    svg.dispatchEvent(pointer('pointermove', 35, 55));
    svg.dispatchEvent(pointer('pointerup', 35, 55));
    expect(state._curves[0].controlPoints[1]).toEqual({ lightener: 35, target: 55 });
    expect(state._undoStack).toEqual([before]);
    expect(state._dragActive).toBe(false);
  });

  it('ends a held drag before a starting shape replaces its points', async () => {
    const { card, state } = await mount();
    const { graph, svg, hit } = await graphPoint(card);
    const before = structuredClone(state._curves);
    hit.dispatchEvent(pointer('pointerdown'));
    svg.dispatchEvent(pointer('pointermove', 30, 45));
    await flushGraph(card, graph);
    const dragged = structuredClone(state._curves);
    state._applyPreset({
      id: 'test',
      name: 'Test',
      description: 'test preset',
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 50, target: 20 },
        { lightener: 100, target: 50 },
      ],
    });
    await flushGraph(card, graph);
    expect(graph.interactionActive).toBe(false);
    expect(state._dragActive).toBe(false);
    expect(state._undoStack).toEqual([before, dragged]);
    const shaped = structuredClone(state._curves);
    svg.dispatchEvent(pointer('pointermove', 60, 70));
    svg.dispatchEvent(pointer('pointerup', 60, 70));
    expect(state._curves).toEqual(shaped);
    expect(state._undoStack).toHaveLength(2);
  });

  it('completes a held keyboard edit before the next standalone key creates its own Undo', async () => {
    const { card, state } = await mount();
    const { graph, svg, hit } = await graphPoint(card);
    hit.dispatchEvent(pointer('pointerdown'));
    hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(state._dragActive).toBe(true);
    svg.dispatchEvent(pointer('pointerup'));
    expect(state._dragActive).toBe(false);
    await flushGraph(card, graph);
    hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(state._undoStack).toHaveLength(2);
    expect(state._curves[0].controlPoints[1].target).toBe(37);
    expect(state._dragActive).toBe(false);
  });

  it.each(['Enter', 'Delete', 'Backspace', ' ', 'contextmenu', 'dblclick'])(
    '%s ends a held drag before changing point indexes',
    async (action) => {
      const { card, state } = await mount();
      const insert = action === 'Enter' || action === 'dblclick';
      const { graph, svg, hit } = await graphPoint(card, insert ? 2 : 1);
      const before = structuredClone(state._curves);
      hit.dispatchEvent(pointer('pointerdown', insert ? 100 : 25, insert ? 80 : 35));
      svg.dispatchEvent(pointer('pointermove', insert ? 90 : 30, insert ? 70 : 45));
      await flushGraph(card, graph);
      const beforeStructure = structuredClone(state._curves);
      const completions: string[] = [];
      for (const type of ['point-drop', 'point-add', 'point-remove'])
        graph.addEventListener(type, () => completions.push(type));
      const event = ['contextmenu', 'dblclick'].includes(action)
        ? new MouseEvent(action, {
            bubbles: true,
            composed: true,
            clientX: toSvgX(60),
            clientY: toSvgY(50),
          })
        : new KeyboardEvent('keydown', { key: action, bubbles: true });
      (action === 'dblclick' ? svg : hit).dispatchEvent(event);
      await flushGraph(card, graph);
      expect(graph.interactionActive).toBe(false);
      expect(state._dragActive).toBe(false);
      expect(state._undoStack).toEqual([before, beforeStructure]);
      expect(completions).toEqual(['point-drop', insert ? 'point-add' : 'point-remove']);
      const after = structuredClone(state._curves);
      expect(after).not.toEqual(beforeStructure);
      svg.dispatchEvent(pointer('pointermove', 80, 30));
      svg.dispatchEvent(pointer('pointerup', 80, 30));
      expect(state._curves).toEqual(after);
      expect(state._undoStack).toHaveLength(2);
    }
  );

  // Alpha is 0 -> 12, 25 -> 35, 100 -> 80; the held arrow raises the held point by 1.
  it.each([
    ['Enter', 1, 'inserts after the held point', { lightener: 25, target: 36 }],
    ['Enter', 2, 'inserts before the held point', { lightener: 100, target: 81 }],
    ['Delete', 1, 'keeps the first interior slot', { lightener: 100, target: 80 }],
    ['Delete', 2, 'lands on the preceding point', { lightener: 25, target: 35 }],
  ])(
    'after a held arrow, %s on point %s refocuses the expected point (%s)',
    async (key, held, _case, expected) => {
      const { card, state } = await mount();
      const { graph, hit } = await graphPoint(card, held);
      hit.dispatchEvent(pointer('pointerdown'));
      hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(state._dragActive).toBe(true);
      hit.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      expect(state._dragActive).toBe(false);
      expect(graph.interactionActive).toBe(false);
      expect(state._undoStack).toHaveLength(2);
      await vi.waitFor(() => {
        const focused = (graph.renderRoot as ShadowRoot).activeElement;
        expect(focused?.classList.contains('hit-circle')).toBe(true);
        const slot = Number(focused!.getAttribute('data-point'));
        expect(state._curves[0].controlPoints[slot]).toEqual(expected);
      });
    }
  );
});
describe('full-bar card transactions', () => {
  it.each(
    [false, true].flatMap((hosted) =>
      [false, true].flatMap((priorDirty) =>
        [false, true].map((tips) => ({ hosted, priorDirty, tips }))
      )
    )
  )(
    'synchronizes rendered completion after a return pause: hosted=$hosted dirty=$priorDirty tips=$tips',
    async ({ hosted, priorDirty, tips }) => {
      const { card, state, hass } = await mount();
      const host = hosted ? document.body.appendChild(document.createElement('div')) : null;
      if (host) {
        card.toolbarHost = host;
        await card.updateComplete;
      }
      if (priorDirty) {
        intent(card, 'light-level-start', { entityId: 'light.b' });
        intent(card, 'light-level-input', { entityId: 'light.b', target: 65 });
        intent(card, 'light-level-end', { entityId: 'light.b' });
        await card.updateComplete;
      }
      // Help follows the panel toolbar; the action row always stays in the card.
      const help = host ?? card.renderRoot;
      if (tips) {
        help.querySelector<HTMLButtonElement>('.coach-help')!.click();
        await card.updateComplete;
      }
      const before = {
        curves: structuredClone(state._curves),
        history: structuredClone(state._undoStack),
        dirty: card.dirty,
        version: state._dirtyVersion,
      };
      const events: boolean[] = [];
      card.addEventListener('curve-dirty-state', (event) =>
        events.push((event as CustomEvent<{ dirty: boolean }>).detail.dirty)
      );
      const { move } = await levelBar(card);
      move('pointerdown');
      move('pointermove', 90);
      await card.updateComplete;
      expect(card.dirty).toBe(true);
      move('pointermove');
      // Critical timing: let the returned points render while the pointer is held.
      await card.updateComplete;
      const footer = card.renderRoot.querySelector<CurveFooter>('curve-footer')!;
      await footer.updateComplete;
      expect(footer.dirty).toBe(true);
      expect(footer.canUndo).toBe(true);
      if (tips) expect(state._coach.phase).toBe('ready_to_save');
      move('pointerup');
      await card.updateComplete;
      await footer.updateComplete;
      expect({
        curves: state._curves,
        history: state._undoStack,
        dirty: card.dirty,
        version: state._dirtyVersion,
      }).toEqual(before);
      expect.soft(footer.dirty).toBe(priorDirty);
      expect.soft(footer.canUndo).toBe(priorDirty);
      const buttons = [...footer.renderRoot.querySelectorAll<HTMLButtonElement>('button')];
      expect(buttons).toHaveLength(3);
      expect.soft(buttons.every((button) => button.disabled === !priorDirty)).toBe(true);
      expect.soft(events).toEqual(priorDirty ? [] : [true, false]);
      expect
        .soft(state._coach.phase)
        .toBe(tips ? (priorDirty ? 'ready_to_save' : 'choose_shape') : 'inactive');
      expect(hass.callService).not.toHaveBeenCalled();
      expect(
        vi
          .mocked(hass.callWS)
          .mock.calls.some(([message]) => message.type === 'lightener/save_curves')
      ).toBe(false);
    }
  );
  it.each([
    'pointercancel',
    'lostpointercapture',
    'blur',
    'window blur',
    'context',
    'disconnect',
    'keyboard',
  ])(
    'preserves returned/changed transaction semantics on %s through the real bar',
    async (cause) => {
      for (const returned of [false, true]) {
        const { card, state, hass } = await mount();
        state._scrubberPosition = 31;
        const before = structuredClone(state._curves);
        const dirty = state._dirtyVersion;
        const { bar, input, move } = await levelBar(card);
        move('pointerdown');
        move('pointermove', 60);
        const changed = structuredClone(state._curves);
        expect(changed).not.toEqual(before);
        if (returned) move('pointermove');
        if (cause === 'pointercancel' || cause === 'lostpointercapture') move(cause);
        if (cause === 'blur') input.dispatchEvent(new Event('blur'));
        if (cause === 'window blur') window.dispatchEvent(new Event('blur'));
        if (cause === 'context') {
          bar.contextKey = 'replacement';
          await bar.updateComplete;
        }
        if (cause === 'disconnect') card.remove();
        if (cause === 'keyboard') {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
          input.value = '42';
          input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          input.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
          expect(state._undoStack).toEqual(returned ? [before] : [before, changed]);
          expect(state._curves[0].controlPoints).toContainEqual({ lightener: 31, target: 42 });
        } else {
          expect(state._curves).toEqual(returned ? before : changed);
          expect(state._undoStack).toEqual(returned ? [] : [before]);
          expect(state._dirtyVersion === dirty).toBe(returned);
          expect(card.dirty).toBe(!returned);
        }
        expect(state._lightGesture).toBeNull();
        expect(hass.callService).not.toHaveBeenCalled();
        card.remove();
      }
    }
  );

  it('pointerup restores the fractional response after both RAF and trailing preview throttle', async () => {
    const { card, state, hass } = await mount();
    state._scrubberPosition = 30;
    state._curves = [
      {
        ...state._curves[0],
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 1, target: 0 },
          { lightener: 100, target: 1 },
        ],
      },
      state._curves[1],
    ];
    const before = structuredClone(state._curves);
    const dirty = state._dirtyVersion;
    const target = sampleCurveAt(before[0].controlPoints, 30);
    const { move } = await levelBar(card);
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(
      (callback) => setTimeout(() => callback(performance.now()), 16) as unknown as number
    );
    state._startPreview();
    await vi.advanceTimersByTimeAsync(500);
    vi.mocked(hass.callService).mockClear();
    move('pointerdown');
    move('pointermove', 90);
    await vi.advanceTimersByTimeAsync(32);
    expect(hass.callService).toHaveBeenCalled();
    // Queued away target must be replaced even when return is seen only at up.
    move('pointermove', 120);
    move('pointerup');
    await vi.advanceTimersByTimeAsync(1000);
    expect(state._curves).toEqual(before);
    expect(state._undoStack).toEqual([]);
    expect(state._dirtyVersion).toBe(dirty);
    expect(card.dirty).toBe(false);
    expect(state._previewActive).toBe(true);
    expect(hass.callService).toHaveBeenLastCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: Math.round((target / 100) * 255),
        transition: 0.25,
      },
      undefined,
      false
    );
    for (const [, , data] of vi.mocked(hass.callService).mock.calls)
      expect(data?.entity_id).toBe('light.a');
  });
  const returnCases = [
    {
      name: 'existing point',
      position: 25,
      points: [
        { lightener: 0, target: 12 },
        { lightener: 25, target: 35 },
        { lightener: 100, target: 80 },
      ],
    },
    {
      name: 'interpolated span',
      position: 50,
      points: [
        { lightener: 0, target: 12 },
        { lightener: 25, target: 35 },
        { lightener: 100, target: 80 },
      ],
    },
    {
      name: 'fractional point with saved collinear knots',
      position: 50,
      points: [
        { lightener: 0, target: 0 },
        { lightener: 1, target: 0.25 },
        { lightener: 25, target: 6.25 },
        { lightener: 50, target: 12.5 },
        { lightener: 100, target: 25 },
      ],
    },
    {
      name: 'fractional interpolation',
      position: 30,
      points: [
        { lightener: 0, target: 0 },
        { lightener: 1, target: 0 },
        { lightener: 100, target: 1 },
      ],
    },
    {
      name: 'Late zero plateau',
      position: 25,
      points: [
        { lightener: 0, target: 0 },
        { lightener: 1, target: 0 },
        { lightener: 50, target: 0 },
        { lightener: 100, target: 100 },
      ],
    },
    {
      name: 'low-end anchor',
      position: 1,
      points: [
        { lightener: 0, target: 0 },
        { lightener: 1, target: 0.25 },
        { lightener: 100, target: 100 },
      ],
    },
    {
      name: 'endpoint',
      position: 100,
      points: [
        { lightener: 0, target: 12 },
        { lightener: 100, target: 80.25 },
      ],
    },
  ];
  it.each(returnCases)(
    'restores exact $name geometry, prior dirty state and all 50 Undo entries',
    async ({ position, points }) => {
      const { card, state, hass } = await mount();
      state._curves = [{ ...state._curves[0], controlPoints: points }, state._curves[1]];
      state._scrubberPosition = position;
      // Real prior edits create distinct history entries and exercise cap eviction.
      for (let i = 0; i < 50; i++) {
        edit(card, i % 2 ? 60 : 70);
        intent(card, 'light-level-end', { entityId: 'light.a' });
      }
      state._curves = [
        { ...state._curves[0], controlPoints: structuredClone(points) },
        state._curves[1],
      ];
      const before = structuredClone(state._curves);
      const history = state._undoStack.slice();
      const values = structuredClone(history);
      for (const entry of history) {
        for (const curve of entry) {
          curve.controlPoints.forEach(Object.freeze);
          Object.freeze(curve.controlPoints);
          Object.freeze(curve);
        }
        Object.freeze(entry);
      }
      const dirty = state._dirtyVersion;
      expect(history).toHaveLength(50);
      expect(card.dirty).toBe(true);
      edit(card, 90);
      intent(card, 'light-level-input', {
        entityId: 'light.a',
        target: sampleCurveAt(points, position),
      });
      intent(card, 'light-level-end', { entityId: 'light.a' });
      expect(state._curves).toEqual(before);
      expect(state._undoStack).toEqual(values);
      state._undoStack.forEach((entry, index) => expect(entry).toBe(history[index]));
      // Starting and ending without movement must not replace retained snapshots.
      intent(card, 'light-level-start', { entityId: 'light.a' });
      intent(card, 'light-level-end', { entityId: 'light.a' });
      state._undoStack.forEach((entry, index) => expect(entry).toBe(history[index]));
      expect(state._dirtyVersion).toBe(dirty);
      expect(card.dirty).toBe(true);
      expect(hass.callService).not.toHaveBeenCalled();
      vi.useFakeTimers({
        toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
      });
      state._undo();
      vi.advanceTimersByTime(400);
      await card.updateComplete;
      expect(state._cancelAnimating).toBe(false);
      edit(card, 80);
      intent(card, 'light-level-end', { entityId: 'light.a' });
      expect(state._curves[0].controlPoints).toContainEqual({ lightener: position, target: 80 });
      intent(card, 'toggle-curve', { entityId: 'light.a' });
      expect(state._curves[0].visible).toBe(false);
      expect(history).toEqual(values);
      history.forEach((entry) => expect(Object.isFrozen(entry)).toBe(true));
    }
  );

  it.each(['end', 'no-reload', 'complete'] as const)(
    'restores a clean baseline through %s finalization and preserves current metadata',
    async (finish) => {
      const { card, state } = await mount();
      const before = structuredClone(state._curves);
      const dirty = state._dirtyVersion;
      edit(card, 90);
      state._curves = [
        { ...state._curves[1], color: '#123456' },
        { ...state._curves[0], friendlyName: 'Renamed' },
      ];
      intent(card, 'light-level-input', {
        entityId: 'light.a',
        target: sampleCurveAt(before[0].controlPoints, 50),
      });
      if (finish === 'end') intent(card, 'light-level-end', { entityId: 'light.a' });
      if (finish === 'no-reload') state._endLightGesture(false);
      if (finish === 'complete') state._completeDragMaybeReload();
      expect(state._curves.map((c) => c.entityId)).toEqual(['light.b', 'light.a']);
      expect(state._curves[1].controlPoints).toEqual(before[0].controlPoints);
      expect(state._curves[1].friendlyName).toBe('Renamed');
      expect(state._curves[0]).toEqual({ ...before[1], color: '#123456' });
      expect(state._undoStack).toEqual([]);
      expect(state._dirtyVersion).toBe(dirty);
      expect(card.dirty).toBe(false);
      expect(state._lightGesture).toBeNull();
    }
  );

  it.each([
    [29.99, 12],
    [30.01, 13],
  ])('retains a fractional near-return at x=%s as a real edit', async (x, target) => {
    const { card, state } = await mount();
    state._curves = [
      {
        ...state._curves[0],
        controlPoints: [
          { lightener: 0, target: 0 },
          { lightener: 50, target: 12.5 },
          { lightener: 100, target: 25 },
        ],
      },
      state._curves[1],
    ];
    const before = structuredClone(state._curves);
    const { move } = await levelBar(card);
    move('pointerdown');
    move('pointermove', 90);
    move('pointerup', x);
    await card.updateComplete;
    expect(state._curves[0].controlPoints).toContainEqual({ lightener: 50, target });
    expect(state._curves).not.toEqual(before);
    expect(state._undoStack).toEqual([before]);
    expect(card.dirty).toBe(true);
  });

  it('keeps out/return/out in one transaction and treats a rounded fractional keyboard target as an edit', async () => {
    const { card, state } = await mount();
    state._scrubberPosition = 31;
    const before = structuredClone(state._curves);
    const original = sampleCurveAt(before[0].controlPoints, 31);
    expect(original).not.toBe(Math.round(original));
    edit(card, 90);
    intent(card, 'light-level-input', { entityId: 'light.a', target: original });
    intent(card, 'light-level-input', { entityId: 'light.a', target: 70 });
    intent(card, 'light-level-end', { entityId: 'light.a' });
    expect(state._undoStack).toEqual([before]);
    const away = structuredClone(state._curves);
    edit(card, Math.round(original));
    intent(card, 'light-level-end', { entityId: 'light.a' });
    expect(state._undoStack).toEqual([before, away]);
    expect(state._curves[0].controlPoints).toContainEqual({
      lightener: 31,
      target: Math.round(original),
    });
  });
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
