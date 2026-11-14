import { previewSessions, PreviewSessionRegistry } from './utils/preview-session.js';
import {
  testBackend,
  testLightService,
  testRevision,
  testSnapshot,
} from './test-guarded-backend.js';
// @vitest-environment jsdom

/**
 * View and Edit mode state (T1). `editMode` is derived:
 * `_editRequested || _isDirty || _saving`. Only an administrator's editing
 * gestures, the pencil (`enterEditMode`) and Show me how request Edit; Done
 * (`exitEditMode`), a confirmed Save, Cancel and a group switch return to View.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LightenerCurveCard } from './lightener-curve-card.js';
import type { BrightnessBar } from './components/brightness-bar.js';
import type { CurveGraph } from './components/curve-graph.js';
import type { CurveFooter } from './components/curve-footer.js';
import type { Hass, LightCurve } from './utils/types.js';
import { CURVE_PRESETS } from './utils/presets.js';
import { sampleCurveAt, toSvgX, toSvgY } from './utils/graph-math.js';
import { UI } from './utils/strings.js';
import { editorDrafts, type Principal } from './utils/editor-draft.js';

interface State {
  _curves: LightCurve[];
  _undoStack: LightCurve[][];
  _scrubberPosition: number | null;
  _dirtyVersion: number;
  _selectedCurveId: string | null;
  _editRequested: boolean;
  _saveIssue: string | null;
  _previewActive: boolean;
  _isDirty: boolean;
  _onCancel(): void;
  _onPreviewToggle(): void;
  _toggleCanvasHelp(replay?: boolean): void;
  _startInvitation(automatic?: boolean): void;
  _applyPreset(preset: (typeof CURVE_PRESETS)[number]): void;
  _commitCurveEdit(curves: LightCurve[]): void;
  _dispatchSave(action: { type: 'save-start' | 'reset' }): void;
}

const ENTITIES = {
  'light.a': { brightness: { '0': '12', '25': '35', '100': '80' } },
  'light.b': { brightness: { '0': '0', '100': '100' } },
};
const noMotion = { settle: false, diagonal: false, ripple: false, draw_in: false };

beforeEach(() => {
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
  vi.useRealTimers();
});

async function settle(card: LightenerCurveCard) {
  await card.updateComplete;
  await Promise.resolve();
  await card.updateComplete;
}

async function mount(options: { admin?: boolean; user?: string } = {}) {
  const hass: Hass = {
    user: { is_admin: options.admin ?? true, id: options.user ?? crypto.randomUUID() },
    states: {
      'light.group': { state: 'on', attributes: {} },
      'light.other': { state: 'on', attributes: {} },
      'light.a': { state: 'on', attributes: { friendly_name: 'Alpha' } },
      'light.b': { state: 'on', attributes: { friendly_name: 'Bravo' } },
    },
    callWS: vi.fn(testBackend(ENTITIES)) as Hass['callWS'],
    callApi: vi.fn(),
    callService: vi.fn(),
  };
  vi.mocked(hass.callService).mockImplementation(testLightService(hass.states));
  const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
  card.setConfig({ entity: 'light.group', joy: noMotion });
  card.hass = hass;
  document.body.append(card);
  await settle(card);
  const state = card as unknown as State;
  state._scrubberPosition = 50;
  await card.updateComplete;
  return { card, state, hass };
}

function fire(target: Element, type: string, detail: object) {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}
const legend = (card: LightenerCurveCard) => card.renderRoot.querySelector('curve-legend')!;
const graph = (card: LightenerCurveCard) =>
  card.renderRoot.querySelector<CurveGraph>('curve-graph')!;

async function mode(card: LightenerCurveCard): Promise<'view' | 'edit'> {
  await card.updateComplete;
  const reflected = card.dataset.mode;
  expect(reflected).toBe(card.editMode ? 'edit' : 'view');
  return reflected as 'view' | 'edit';
}

/** A change through the real bar path: an administrator's drag on light.a. */
function editLight(card: LightenerCurveCard, target = 60) {
  fire(legend(card), 'light-level-start', { entityId: 'light.a' });
  fire(legend(card), 'light-level-input', { entityId: 'light.a', target });
  fire(legend(card), 'light-level-end', { entityId: 'light.a' });
}

async function levelBar(card: LightenerCurveCard) {
  const list = legend(card);
  await list.updateComplete;
  const bar = list.renderRoot.querySelector<BrightnessBar>('brightness-bar')!;
  await bar.updateComplete;
  const input = bar.renderRoot.querySelector('input')!;
  input.getBoundingClientRect = () => ({ width: 300 }) as DOMRect;
  const captures = new Set<number>();
  input.setPointerCapture = (id) => void captures.add(id);
  input.hasPointerCapture = (id) => captures.has(id);
  input.releasePointerCapture = (id) => void captures.delete(id);
  return (type: string, x = 30) => {
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
}

async function graphPoint(card: LightenerCurveCard, pointIndex = 1) {
  const curveGraph = graph(card);
  await curveGraph.updateComplete;
  const svg = curveGraph.renderRoot.querySelector('svg')!;
  const captures = new Set<number>();
  svg.setPointerCapture = (id) => void captures.add(id);
  svg.hasPointerCapture = (id) => captures.has(id);
  svg.releasePointerCapture = (id) => void captures.delete(id);
  svg.getScreenCTM = () => ({ inverse: () => ({ a: 1 }) }) as DOMMatrix;
  svg.createSVGPoint = () =>
    ({
      x: 0,
      y: 0,
      matrixTransform() {
        return { x: this.x, y: this.y };
      },
    }) as DOMPoint;
  const hit = curveGraph.renderRoot.querySelector<SVGCircleElement>(
    `.hit-circle[data-curve="0"][data-point="${pointIndex}"]`
  )!;
  return { svg, hit };
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

/** Undo animates back to the earlier shape; finish each animation on the next task. */
function animateInstantly() {
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(
    (callback) => window.setTimeout(() => callback(performance.now() + 400), 0) as unknown as number
  );
}

function storedSelection(): unknown {
  const raw = sessionStorage.getItem('lightener:curve-card:v1:light.group');
  return raw ? JSON.parse(raw).selectedCurveId : undefined;
}

describe('editMode truth table', () => {
  it.each([
    [false, false, false, false],
    [true, false, false, true],
    [false, true, false, true],
    [false, false, true, true],
    [true, true, false, true],
    [true, false, true, true],
    [false, true, true, true],
    [true, true, true, true],
  ])('requested=%s dirty=%s saving=%s -> edit=%s', async (requested, dirty, saving, edit) => {
    const { card, state } = await mount();
    expect(await mode(card)).toBe('view');
    state._editRequested = requested;
    if (dirty) {
      state._curves = state._curves.map((curve, index) =>
        index === 0
          ? { ...curve, controlPoints: [...curve.controlPoints, { lightener: 75, target: 90 }] }
          : curve
      );
      state._dirtyVersion++;
    }
    if (saving) state._dispatchSave({ type: 'save-start' });
    expect(card.editMode).toBe(edit);
    expect(await mode(card)).toBe(edit ? 'edit' : 'view');
  });

  it('ignores availability notices: an incompatible backend loads in View', async () => {
    const { card, state, hass } = await mount();
    vi.mocked(hass.callWS).mockResolvedValue({ entities: structuredClone(ENTITIES) });
    card.setConfig({ entity: 'light.other', joy: noMotion });
    await settle(card);
    expect(state._saveIssue).toBe('incompatible');
    expect(await mode(card)).toBe('view');
  });
});

describe('entering Edit', () => {
  it('opens in View with nothing requested', async () => {
    const { card, state } = await mount();
    expect(state._editRequested).toBe(false);
    expect(await mode(card)).toBe('view');
  });

  it('a light-row tap, Enter or Space that selects a light (select-curve)', async () => {
    const { card, state } = await mount();
    fire(legend(card), 'select-curve', { entityId: 'light.b' });
    expect(state._selectedCurveId).toBe('light.b');
    expect(await mode(card)).toBe('edit');
  });

  it('a bar tap selects the light for editing', async () => {
    const { card, state } = await mount();
    const move = await levelBar(card);
    move('pointerdown');
    move('pointerup');
    expect(state._selectedCurveId).toBe('light.a');
    expect(state._isDirty).toBe(false);
    expect(await mode(card)).toBe('edit');
  });

  it('a bar drag', async () => {
    const { card } = await mount();
    const move = await levelBar(card);
    move('pointerdown');
    move('pointermove', 90);
    expect(card.editMode).toBe(true);
    move('pointerup', 90);
    expect(await mode(card)).toBe('edit');
  });

  it('bar keyboard arrows (a level gesture without a change)', async () => {
    const { card, state } = await mount();
    fire(legend(card), 'light-level-start', { entityId: 'light.a' });
    fire(legend(card), 'light-level-end', { entityId: 'light.a' });
    expect(state._isDirty).toBe(false);
    expect(await mode(card)).toBe('edit');
  });

  it('a point drag', async () => {
    const { card, state } = await mount();
    const { svg, hit } = await graphPoint(card);
    hit.dispatchEvent(pointer('pointerdown'));
    svg.dispatchEvent(pointer('pointermove', 30, 45));
    expect(card.editMode).toBe(true);
    svg.dispatchEvent(pointer('pointerup', 30, 45));
    expect(state._selectedCurveId).toBe('light.a');
    expect(await mode(card)).toBe('edit');
  });

  it('point keyboard arrows', async () => {
    const { card } = await mount();
    const { hit } = await graphPoint(card);
    hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(await mode(card)).toBe('edit');
  });

  it('a rejected or no-op point gesture stays in View', async () => {
    const { card, state } = await mount();
    const origin = state._curves[0].controlPoints[0];
    // Moving a point onto its own position, removing an endpoint and adding a
    // point with no light to add it to change nothing, so none enters Edit.
    fire(graph(card), 'point-move', {
      curveIndex: 0,
      pointIndex: 0,
      lightener: origin.lightener,
      target: origin.target,
    });
    fire(graph(card), 'point-remove', { curveIndex: 0, pointIndex: 0 });
    fire(graph(card), 'point-add', { lightener: 60, target: 40 });
    expect(state._editRequested).toBe(false);
    expect(state._isDirty).toBe(false);
    expect(await mode(card)).toBe('view');
    // The same path with a real change does enter Edit.
    fire(graph(card), 'point-remove', { curveIndex: 0, pointIndex: 1 });
    expect(state._isDirty).toBe(true);
    expect(await mode(card)).toBe('edit');
  });

  it('applying a starting shape to the selected light', async () => {
    const { card, state } = await mount();
    // A selection restored on load leaves the card in View.
    state._selectedCurveId = 'light.a';
    expect(await mode(card)).toBe('view');
    state._applyPreset(CURVE_PRESETS.find((preset) => preset.id === 'dim_accent')!);
    expect(state._isDirty).toBe(true);
    expect(state._editRequested).toBe(true);
    expect(await mode(card)).toBe('edit');
  });

  it('the pencil (enterEditMode) changes nothing else', async () => {
    const { card, state, hass } = await mount();
    const curves = structuredClone(state._curves);
    expect(card.enterEditMode()).toBe(true);
    expect(await mode(card)).toBe('edit');
    expect(state._curves).toEqual(curves);
    expect(state._selectedCurveId).toBeNull();
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('Show me how', async () => {
    const { card, state, hass } = await mount();
    await card.updateComplete;
    state._toggleCanvasHelp();
    expect(await mode(card)).toBe('edit');
    expect(state._isDirty).toBe(false);
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('an automatic example does not', async () => {
    const { card, state } = await mount();
    await card.updateComplete;
    state._startInvitation(true);
    expect(await mode(card)).toBe('view');
  });
});

describe('what never enters Edit', () => {
  it('Room brightness', async () => {
    const { card, state } = await mount();
    const scrubber = card.renderRoot.querySelector('curve-scrubber')!;
    fire(scrubber, 'scrubber-start', {});
    fire(scrubber, 'scrubber-move', { position: 30 });
    fire(scrubber, 'scrubber-end', {});
    expect(state._scrubberPosition).toBe(30);
    expect(await mode(card)).toBe('view');
  });

  it('Watch', async () => {
    const { card, state } = await mount();
    state._onPreviewToggle();
    await settle(card);
    expect(state._previewActive).toBe(true);
    expect(await mode(card)).toBe('view');
    state._onPreviewToggle();
    expect(await mode(card)).toBe('view');
  });

  it('hovering a row', async () => {
    const { card } = await mount();
    fire(legend(card), 'hover-curve', { entityId: 'light.a' });
    expect(await mode(card)).toBe('view');
  });

  it('focusing or tapping a point in the graph, while the same event from a row does', async () => {
    const { card, state } = await mount();
    fire(graph(card), 'focus-curve', { entityId: 'light.a' });
    expect(state._selectedCurveId).toBe('light.a');
    expect(await mode(card)).toBe('view');
    fire(legend(card), 'focus-curve', { entityId: 'light.b' });
    expect(state._selectedCurveId).toBe('light.b');
    expect(await mode(card)).toBe('edit');
  });

  it('a row tap that clears the selection', async () => {
    const { card, state } = await mount();
    state._selectedCurveId = 'light.a';
    fire(legend(card), 'select-curve', { entityId: 'light.a' });
    expect(state._selectedCurveId).toBeNull();
    expect(await mode(card)).toBe('view');
  });

  it('switching groups', async () => {
    const { card } = await mount();
    card.setConfig({ entity: 'light.other', joy: noMotion });
    await settle(card);
    expect(await mode(card)).toBe('view');
  });
});

describe('leaving Edit', () => {
  it('Done (exitEditMode) on a clean editor returns to View and clears the selection', async () => {
    const { card, state } = await mount();
    fire(legend(card), 'select-curve', { entityId: 'light.a' });
    expect(storedSelection()).toBe('light.a');
    expect(card.exitEditMode()).toBe(true);
    expect(state._selectedCurveId).toBeNull();
    expect(storedSelection()).toBeNull();
    expect(await mode(card)).toBe('view');
  });

  it('Done is refused with unsaved work or while saving', async () => {
    const { card, state } = await mount();
    editLight(card);
    expect(card.exitEditMode()).toBe(false);
    expect(state._selectedCurveId).toBe('light.a');
    expect(await mode(card)).toBe('edit');
    state._dispatchSave({ type: 'save-start' });
    expect(card.exitEditMode()).toBe(false);
    expect(await mode(card)).toBe('edit');
  });

  it('a clean Edit stays Edit after Undo returns to the saved shape', async () => {
    const { card, state } = await mount();
    editLight(card);
    animateInstantly();
    (card as unknown as { _undo(): void })._undo();
    await vi.waitFor(() => expect(state._isDirty).toBe(false));
    expect(await mode(card)).toBe('edit');
  });

  it('a confirmed Save returns to View and clears the selection', async () => {
    const { card, state } = await mount();
    editLight(card);
    expect(await mode(card)).toBe('edit');
    expect(await card.saveCurves()).toBe(true);
    expect(state._isDirty).toBe(false);
    expect(state._editRequested).toBe(false);
    expect(state._selectedCurveId).toBeNull();
    expect(storedSelection()).toBeNull();
    expect(await mode(card)).toBe('view');
  });

  it('a light-row tap while the save is in flight keeps Edit after it is confirmed', async () => {
    const { card, state, hass } = await mount();
    editLight(card);
    const backend = testBackend(ENTITIES);
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    vi.mocked(hass.callWS).mockImplementation(async (message) => {
      if ((message as { type: string }).type === 'lightener/save_curves') await held;
      return backend(message as Record<string, unknown>);
    });
    const saving = card.saveCurves();
    expect(await mode(card)).toBe('edit');
    fire(legend(card), 'select-curve', { entityId: 'light.b' });
    release();
    expect(await saving).toBe(true);
    expect(state._isDirty).toBe(false);
    expect(state._selectedCurveId).toBe('light.b');
    expect(await mode(card)).toBe('edit');
  });

  it('a stale save rejected as a conflict keeps Edit, the draft and the selection', async () => {
    const { card, state, hass } = await mount();
    editLight(card);
    // Someone else saved meanwhile: the card's baseline revision is now stale.
    await hass.callWS({
      type: 'lightener/save_curves',
      expected_revision: testRevision(ENTITIES),
      curves: { 'light.b': { brightness: { '100': '40' } } },
    });
    expect(await card.saveCurves()).toBe(false);
    expect(state._saveIssue).toBe('conflict');
    expect(state._isDirty).toBe(true);
    expect(state._selectedCurveId).toBe('light.a');
    expect(await mode(card)).toBe('edit');
  });

  it('an unconfirmed receipt keeps Edit', async () => {
    const { card, state, hass } = await mount();
    editLight(card);
    vi.mocked(hass.callWS).mockResolvedValueOnce(
      testSnapshot({ 'light.a': { brightness: { '100': '1' } } })
    );
    expect(await card.saveCurves()).toBe(false);
    expect(state._saveIssue).toBe('uncertain');
    expect(state._isDirty).toBe(true);
    expect(await mode(card)).toBe('edit');
  });

  it('a failed save keeps Edit', async () => {
    const { card, state, hass } = await mount();
    editLight(card);
    vi.mocked(hass.callWS).mockRejectedValueOnce(new Error('Unavailable'));
    expect(await card.saveCurves()).toBe(false);
    expect(state._isDirty).toBe(true);
    expect(state._selectedCurveId).toBe('light.a');
    expect(await mode(card)).toBe('edit');
  });

  it('Cancel returns to View once the shape is restored', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const { card, state } = await mount();
    editLight(card);
    state._onCancel();
    expect(await mode(card)).toBe('edit');
    await vi.advanceTimersByTimeAsync(500);
    expect(state._isDirty).toBe(false);
    expect(state._editRequested).toBe(false);
    expect(state._selectedCurveId).toBeNull();
    expect(await mode(card)).toBe('view');
  });

  it('a group switch returns to View', async () => {
    const { card, state } = await mount();
    card.enterEditMode();
    expect(await mode(card)).toBe('edit');
    card.setConfig({ entity: 'light.other', joy: noMotion });
    await settle(card);
    expect(state._editRequested).toBe(false);
    expect(await mode(card)).toBe('view');
  });
});

describe('recovered navigation draft', () => {
  it('opens in Edit and stays there when its Undo returns to the saved shape', async () => {
    const user = crypto.randomUUID();
    const first = await mount({ user });
    first.state._commitCurveEdit(
      first.state._curves.map((curve, index) =>
        index === 0
          ? {
              ...curve,
              controlPoints: curve.controlPoints.map((point) => ({
                ...point,
                target: point.lightener === 100 ? 45 : point.target,
              })),
            }
          : curve
      )
    );
    first.card.remove();
    const second = await mount({ user });
    expect(await mode(second.card)).toBe('view');
    second.card.renderRoot.querySelector<HTMLButtonElement>('[data-draft-recover]')!.click();
    await settle(second.card);
    expect(second.state._isDirty).toBe(true);
    expect(await mode(second.card)).toBe('edit');
    animateInstantly();
    (second.card as unknown as { _undo(): void })._undo();
    await vi.waitFor(() => expect(second.state._isDirty).toBe(false));
    expect(await mode(second.card)).toBe('edit');
  });
});

describe('non-administrators', () => {
  it('load read-only in View and cannot enter Edit', async () => {
    const { card, state, hass } = await mount({ admin: false });
    // The real load path marks the group read-only for this user.
    expect(state._saveIssue).toBe('readonly');
    expect(await mode(card)).toBe('view');

    expect(card.enterEditMode()).toBe(false);
    fire(legend(card), 'select-curve', { entityId: 'light.a' });
    // Rows still select for inspection.
    expect(state._selectedCurveId).toBe('light.a');
    fire(legend(card), 'focus-curve', { entityId: 'light.b' });
    fire(legend(card), 'light-level-start', { entityId: 'light.b' });
    fire(legend(card), 'light-level-input', { entityId: 'light.b', target: 10 });
    fire(graph(card), 'point-move', { curveIndex: 0, pointIndex: 1, lightener: 30, target: 50 });
    await card.updateComplete;
    state._toggleCanvasHelp();

    expect(state._editRequested).toBe(false);
    expect(state._isDirty).toBe(false);
    expect(await mode(card)).toBe('view');
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('an administrator who loses the role leaves Edit', async () => {
    const { card, state, hass } = await mount();
    card.enterEditMode();
    expect(await mode(card)).toBe('edit');
    card.hass = { ...hass, user: { ...hass.user!, is_admin: false } };
    expect(state._editRequested).toBe(false);
    expect(await mode(card)).toBe('view');
  });
});

/** The dashboard card's header toolbar: Watch, the exit slot and ⋮. */
const toolbar = (card: LightenerCurveCard) =>
  card.renderRoot.querySelector<HTMLElement>('.header .editor-toolbar')!;
const exitState = (card: LightenerCurveCard) =>
  toolbar(card).querySelector('.exit-slot')!.getAttribute('data-state');
const commitFooter = async (card: LightenerCurveCard) => {
  const footer = toolbar(card).querySelector<CurveFooter>('curve-footer[variant="commit"]');
  await footer?.updateComplete;
  return footer;
};
async function openMore(card: LightenerCurveCard) {
  toolbar(card).querySelector<HTMLButtonElement>('.more-button')!.click();
  await card.updateComplete;
  return [...toolbar(card).querySelectorAll<HTMLButtonElement>('.more-menu .more-item')];
}

describe('Watch ends with Save and Cancel', () => {
  it.each(['save', 'conflicted save', 'cancel'])(
    'sends each watched light back to its value from before Watch (%s)',
    async (action) => {
      animateInstantly();
      const { card, state, hass } = await mount();
      hass.states['light.a'].attributes.brightness = 70;
      hass.states['light.b'].attributes.brightness = 30;
      editLight(card);
      state._onPreviewToggle();
      await vi.waitFor(() => expect(hass.callService).toHaveBeenCalledTimes(2));
      const payloads = () =>
        vi
          .mocked(hass.callService)
          .mock.calls.slice(2)
          .map((call) => call[2]);
      if (action === 'conflicted save') {
        // Someone else saved meanwhile, so this Save fails as a conflict.
        await hass.callWS({
          type: 'lightener/save_curves',
          expected_revision: testRevision(ENTITIES),
          curves: { 'light.b': { brightness: { '100': '40' } } },
        });
        expect(await card.saveCurves()).toBe(false);
        expect(state._saveIssue).toBe('conflict');
        expect(state._isDirty).toBe(true);
      } else if (action === 'save') {
        expect(await card.saveCurves()).toBe(true);
      } else {
        state._onCancel();
      }
      await vi.waitFor(() => expect(payloads()).toHaveLength(2));
      expect(payloads()).toEqual(
        expect.arrayContaining([
          { entity_id: 'light.a', brightness: 70, transition: 0.25 },
          { entity_id: 'light.b', brightness: 30, transition: 0.25 },
        ])
      );
      expect(state._previewActive).toBe(false);
      const expected = action === 'conflicted save' ? 'edit' : 'view';
      await vi.waitFor(async () => expect(await mode(card)).toBe(expected));
    }
  );
});

describe('Watch restoration across group navigation', () => {
  it.each(['original', 'current'])(
    'applies only the original group barrier when %s is blocked',
    async (blockedGroup) => {
      animateInstantly();
      const { card, state, hass } = await mount();
      let release!: () => void;
      vi.mocked(hass.callService).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => resolve({ context: { id: 'reply' } });
          })
      );
      state._onPreviewToggle();
      await vi.waitFor(() => expect(hass.callService).toHaveBeenCalled());
      vi.mocked(hass.callWS).mockImplementation(testBackend(ENTITIES, 'other-entry'));
      card.setConfig({ entity: 'light.other', joy: noMotion });
      await settle(card);
      const identity = (card as unknown as { _draftPrincipal: Principal })._draftPrincipal;
      editorDrafts.markRuntimeBlocked(
        identity,
        blockedGroup === 'original' ? 'test-entry' : 'other-entry'
      );
      release();
      await settle(card);
      await Promise.resolve();
      const commands = vi
        .mocked(hass.callService)
        .mock.calls.filter((call) => call[2]?.entity_id === 'light.a');
      expect(commands).toHaveLength(blockedGroup === 'original' ? 1 : 2);
    }
  );
});

describe('toolbar exit slot', () => {
  for (const hosted of [false, true]) {
    async function mountedToolbar() {
      const mounted = await mount();
      const host = document.createElement('div');
      if (hosted) {
        document.body.append(host);
        mounted.card.toolbarHost = host;
        await settle(mounted.card);
      }
      return { ...mounted, root: hosted ? host : mounted.card.renderRoot };
    }

    it(`keeps focus on Edit and Done replacements (${hosted ? 'panel' : 'card'})`, async () => {
      const { card, root } = await mountedToolbar();
      const edit = root.querySelector<HTMLButtonElement>('.edit-button')!;
      edit.focus();
      edit.click();
      await settle(card);
      const done = root.querySelector<HTMLButtonElement>('.done-button')!;
      expect(done.matches(':focus')).toBe(true);
      done.click();
      await settle(card);
      expect(root.querySelector('.edit-button')!.matches(':focus')).toBe(true);
    });

    it.each(['save', 'cancel'])(
      `keeps focus after %s (${hosted ? 'panel' : 'card'})`,
      async (action) => {
        animateInstantly();
        const { card, root } = await mountedToolbar();
        editLight(card);
        await settle(card);
        const footer = root.querySelector<CurveFooter>('curve-footer[variant="commit"]')!;
        await footer.updateComplete;
        const button = footer.renderRoot.querySelector<HTMLButtonElement>(`.btn-${action}`)!;
        button.focus();
        if (action === 'save') await card.saveCurves();
        else button.click();
        await settle(card);
        if (action === 'cancel')
          await vi.waitFor(() => expect(root.querySelector('.edit-button')).not.toBeNull());
        expect(
          root.querySelector(action === 'save' ? '.more-button' : '.edit-button')!.matches(':focus')
        ).toBe(true);
      }
    );

    it(`does not steal focus when a save finishes elsewhere (${hosted ? 'panel' : 'card'})`, async () => {
      const { card, root, hass } = await mountedToolbar();
      editLight(card);
      await settle(card);
      const footer = root.querySelector<CurveFooter>('curve-footer[variant="commit"]')!;
      await footer.updateComplete;
      footer.renderRoot.querySelector<HTMLButtonElement>('.btn-save')!.focus();
      let release!: () => void;
      const backend = testBackend(ENTITIES);
      vi.mocked(hass.callWS).mockImplementation(
        (message) =>
          new Promise((resolve) => {
            release = () => resolve(backend(message));
          }) as ReturnType<Hass['callWS']>
      );
      const saving = card.saveCurves();
      await settle(card);
      const other = document.createElement('button');
      document.body.append(other);
      other.focus();
      release();
      await saving;
      await settle(card);
      expect(document.activeElement).toBe(other);
    });
  }

  it('View offers the Edit pill, keeps ⋮ last, and lists the four ⋮ items', async () => {
    const { card } = await mount();
    expect(exitState(card)).toBe('view');
    const edit = toolbar(card).querySelector<HTMLButtonElement>('.edit-button')!;
    expect(edit.disabled).toBe(false);
    expect(edit.getAttribute('aria-label')).toBe('Edit');
    expect(edit.querySelector('svg')).not.toBeNull();
    expect(toolbar(card).lastElementChild?.classList.contains('more-anchor')).toBe(true);
    expect(await commitFooter(card)).toBeNull();
    const items = await openMore(card);
    expect(items.map((item) => item.textContent?.trim())).toEqual([
      'Show me how',
      'Suggest shapes',
      'Edit lights…',
      'Delete group…',
    ]);
    expect(card.renderRoot.querySelector('.coach-help, .manage-trigger')).toBeNull();
  });

  it('a clean Edit offers Done, which returns to View', async () => {
    const { card } = await mount();
    card.enterEditMode();
    await card.updateComplete;
    expect(exitState(card)).toBe('clean');
    const done = toolbar(card).querySelector<HTMLButtonElement>('.done-button')!;
    expect(done.textContent?.trim()).toBe('Done');
    expect(done.querySelector('svg')).not.toBeNull();
    done.click();
    expect(await mode(card)).toBe('view');
    expect(exitState(card)).toBe('view');
  });

  it('a changed draft offers Cancel and Save in the same slot', async () => {
    const { card } = await mount();
    editLight(card);
    await card.updateComplete;
    expect(exitState(card)).toBe('changed');
    const footer = (await commitFooter(card))!;
    const cancel = footer.renderRoot.querySelector<HTMLButtonElement>(
      '[aria-label="Cancel changes"]'
    )!;
    const save = footer.renderRoot.querySelector<HTMLButtonElement>('.btn-save')!;
    expect(cancel.disabled).toBe(false);
    expect(save.disabled).toBe(false);
    expect(save.textContent?.trim()).toBe('Save');
    expect(toolbar(card).querySelector('.done-button, .edit-button')).toBeNull();
  });

  it('saving disables Cancel and shows a spinner inside Save', async () => {
    const { card, state } = await mount();
    editLight(card);
    state._dispatchSave({ type: 'save-start' });
    await card.updateComplete;
    expect(exitState(card)).toBe('changed');
    const footer = (await commitFooter(card))!;
    const save = footer.renderRoot.querySelector<HTMLButtonElement>('.btn-save')!;
    expect(save.disabled).toBe(true);
    expect(save.querySelector('.spinner')).not.toBeNull();
    expect(
      footer.renderRoot.querySelector<HTMLButtonElement>('[aria-label="Cancel changes"]')!.disabled
    ).toBe(true);
  });

  it('a confirmed save shows Saved with a checkmark, then the Edit pill', async () => {
    const { card, state } = await mount();
    editLight(card);
    expect(await card.saveCurves()).toBe(true);
    await card.updateComplete;
    expect(exitState(card)).toBe('saved');
    const saved = toolbar(card).querySelector('.save-confirmed')!;
    expect(saved.getAttribute('role')).toBe('status');
    expect(saved.textContent?.trim()).toBe('Saved');
    expect(saved.querySelector('svg')).not.toBeNull();
    state._dispatchSave({ type: 'reset' });
    await card.updateComplete;
    expect(exitState(card)).toBe('view');
  });

  it('a non-administrator gets no Edit pill and no writing ⋮ items', async () => {
    const { card } = await mount({ admin: false });
    expect(exitState(card)).toBe('empty');
    expect(toolbar(card).querySelector('.edit-button, curve-footer')).toBeNull();
    const items = await openMore(card);
    expect(items.map((item) => item.textContent?.trim())).toEqual(['Show me how']);
  });

  it('a temporarily blocked administrator keeps the controls in place, disabled, with the reason', async () => {
    const { card } = await mount();
    const blocked = card as unknown as {
      _identityUnavailableRuntimeEntries: Set<string>;
      _baseline: { config_entry_id: string } | null;
    };
    blocked._identityUnavailableRuntimeEntries.add(blocked._baseline!.config_entry_id);
    card.requestUpdate();
    await card.updateComplete;
    expect(exitState(card)).toBe('view');
    expect(toolbar(card).querySelector<HTMLButtonElement>('.edit-button')!.disabled).toBe(true);
    const items = await openMore(card);
    expect(items).toHaveLength(4);
    expect(items.slice(1).every((item) => item.disabled)).toBe(true);
    expect(card.renderRoot.querySelector('.command-status [role="alert"]')?.textContent).toContain(
      'Recovery is required'
    );
  });

  it('Delete group… opens the existing confirmation', async () => {
    const { card } = await mount();
    const items = await openMore(card);
    items.find((item) => item.classList.contains('delete-group-btn'))!.click();
    await card.updateComplete;
    const list = legend(card);
    await list.updateComplete;
    expect(list.renderRoot.querySelector('.delete-group-confirm')).not.toBeNull();
    expect(toolbar(card).querySelector('.more-menu')).toBeNull();
  });

  describe('New group… (set by the sidebar panel)', () => {
    const labels = (items: HTMLButtonElement[]) => items.map((item) => item.textContent?.trim());

    it('is absent by default and sits between Edit lights… and Delete group… when offered', async () => {
      const { card } = await mount();
      expect(labels(await openMore(card))).toEqual([
        'Show me how',
        'Suggest shapes',
        'Edit lights…',
        'Delete group…',
      ]);
      card.remove();

      const { card: offered } = await mount();
      offered.canCreateGroup = true;
      await offered.updateComplete;
      expect(labels(await openMore(offered))).toEqual([
        'Show me how',
        'Suggest shapes',
        'Edit lights…',
        'New group…',
        'Delete group…',
      ]);
    });

    it('announces the choice and closes the menu', async () => {
      const { card } = await mount();
      card.canCreateGroup = true;
      await card.updateComplete;
      const heard = vi.fn();
      card.addEventListener('lightener-new-group', heard);
      const items = await openMore(card);
      items.find((item) => item.classList.contains('new-group-btn'))!.click();
      await card.updateComplete;
      expect(heard).toHaveBeenCalledTimes(1);
      // The panel hears it across the card's shadow root only if it bubbles and is composed.
      const event = heard.mock.calls[0][0] as CustomEvent;
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      expect(toolbar(card).querySelector('.more-menu')).toBeNull();
    });

    it('stays listed after the group is deleted, while the writing items go', async () => {
      const { card } = await mount();
      card.canCreateGroup = true;
      (card as unknown as { _groupDeleted: boolean })._groupDeleted = true;
      await card.updateComplete;
      expect(labels(await openMore(card))).toEqual(['Show me how', 'New group…']);
    });

    it.each(['_membershipOpen', '_managingLights'])('is disabled while %s', async (flag) => {
      const { card } = await mount();
      card.canCreateGroup = true;
      (card as unknown as Record<string, boolean>)[flag] = true;
      await card.updateComplete;
      const items = await openMore(card);
      const item = items.find((candidate) => candidate.classList.contains('new-group-btn'))!;
      expect(item.disabled).toBe(true);
      const heard = vi.fn();
      card.addEventListener('lightener-new-group', heard);
      item.click();
      expect(heard).not.toHaveBeenCalled();
    });
  });
});

function escape(target: Element): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}
const rowButton = async (card: LightenerCurveCard) => {
  await legend(card).updateComplete;
  return legend(card).renderRoot.querySelector<HTMLButtonElement>('.row-select-btn')!;
};

describe('Escape per mode', () => {
  it('does nothing in View', async () => {
    const { card, state } = await mount();
    const event = escape(await rowButton(card));
    expect(event.defaultPrevented).toBe(false);
    expect(await mode(card)).toBe('view');
    expect(state._selectedCurveId).toBeNull();
  });

  it('clears the selection first, then leaves a clean Edit', async () => {
    const { card, state } = await mount();
    fire(legend(card), 'select-curve', { entityId: 'light.a' });
    expect(await mode(card)).toBe('edit');
    expect(state._selectedCurveId).toBe('light.a');
    const row = await rowButton(card);
    expect(escape(row).defaultPrevented).toBe(true);
    expect(state._selectedCurveId).toBeNull();
    expect(await mode(card)).toBe('edit');
    expect(escape(row).defaultPrevented).toBe(true);
    expect(await mode(card)).toBe('view');
  });

  it('never discards a changed draft', async () => {
    const { card, state, hass } = await mount();
    editLight(card);
    await card.updateComplete;
    const curves = structuredClone(state._curves);
    const history = structuredClone(state._undoStack);
    const row = await rowButton(card);
    escape(row);
    expect(state._selectedCurveId).toBeNull();
    const again = escape(row);
    expect(again.defaultPrevented).toBe(false);
    expect(state._curves).toEqual(curves);
    expect(state._undoStack).toEqual(history);
    expect(state._isDirty).toBe(true);
    expect(await mode(card)).toBe('edit');
    expect(
      vi
        .mocked(hass.callWS)
        .mock.calls.some(([message]) => message.type === 'lightener/save_curves')
    ).toBe(false);
  });

  it('closes ⋮ before anything else', async () => {
    const { card, state } = await mount();
    fire(legend(card), 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    const [first] = await openMore(card);
    const event = escape(first);
    await card.updateComplete;
    expect(event.defaultPrevented).toBe(true);
    expect(toolbar(card).querySelector('.more-menu')).toBeNull();
    expect(state._selectedCurveId).toBe('light.a');
    expect(await mode(card)).toBe('edit');
  });

  it('closes ⋮ on a press outside it, not on a press inside', async () => {
    const { card } = await mount();
    const [first] = await openMore(card);
    first.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await card.updateComplete;
    expect(toolbar(card).querySelector('.more-menu')).not.toBeNull();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await card.updateComplete;
    expect(toolbar(card).querySelector('.more-menu')).toBeNull();
  });

  it('dismisses help before clearing the selection', async () => {
    const { card, state } = await mount();
    fire(legend(card), 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    const [showMeHow] = await openMore(card);
    showMeHow.click();
    await card.updateComplete;
    expect(exitState(card)).toBe('tutorial');
    escape(await rowButton(card));
    await card.updateComplete;
    expect(exitState(card)).not.toBe('tutorial');
    expect(state._selectedCurveId).toBe('light.a');
    expect(await mode(card)).toBe('edit');
  });

  it('does nothing for a non-administrator', async () => {
    const { card } = await mount({ admin: false });
    expect(escape(await rowButton(card)).defaultPrevented).toBe(false);
    expect(await mode(card)).toBe('view');
  });
});

describe('Show me how in the exit slot', () => {
  it.each([false, true])(
    'shows Replay and Done, and Done restores the starting mode (from Edit: %s)',
    async (fromEdit) => {
      const { card, state, hass } = await mount();
      if (fromEdit) card.enterEditMode();
      await card.updateComplete;
      state._toggleCanvasHelp();
      await card.updateComplete;
      expect(exitState(card)).toBe('tutorial');
      expect(toolbar(card).querySelector('.canvas-replay')?.textContent?.trim()).toBe('Replay');
      const done = toolbar(card).querySelector<HTMLButtonElement>('.canvas-done')!;
      done.click();
      await card.updateComplete;
      expect(await mode(card)).toBe(fromEdit ? 'edit' : 'view');
      expect(state._isDirty).toBe(false);
      expect(hass.callService).not.toHaveBeenCalled();
      expect(
        vi
          .mocked(hass.callWS)
          .mock.calls.some(([message]) => message.type === 'lightener/save_curves')
      ).toBe(false);
    }
  );
});

describe('surfaces follow state', () => {
  it('marks the card while Preview on lights is on, so the graph well warms', async () => {
    const { card, state } = await mount();
    const root = () => card.renderRoot.querySelector('.card')!;
    expect(root().classList.contains('watching')).toBe(false);
    state._onPreviewToggle();
    await settle(card);
    expect(state._previewActive).toBe(true);
    expect(root().classList.contains('watching')).toBe(true);
    state._onPreviewToggle();
    await settle(card);
    expect(root().classList.contains('watching')).toBe(false);
  });

  it('keeps the dashboard header the same box in View and Edit; only the bed differs', async () => {
    const { card } = await mount();
    const css = (card.constructor as unknown as { styles: { cssText: string } }).styles.cssText;
    // Both modes carry the same inset rule slot (transparent in View), so the
    // header never changes size.
    expect(css).toMatch(/\.header\s*\{[^}]*box-shadow:\s*inset 0 -2px 0 transparent/);
    expect(css).toMatch(
      /:host\(\[data-mode='edit'\]\) \.header\s*\{\s*background-color:\s*var\(--edit-bed\);\s*box-shadow:\s*inset 0 -2px 0 #2563eb;\s*\}/
    );
    expect(card.dataset.mode).toBe('view');
    expect(card.renderRoot.querySelector('.header')).not.toBeNull();
    card.enterEditMode();
    expect(await mode(card)).toBe('edit');
  });
});

type SuggestState = State & {
  _suggestion: { source: LightCurve[]; curves: LightCurve[] } | null;
  _suggested: LightCurve[] | null;
  _suggestionOffer: boolean;
  _editGesture: { kind: string; position?: number } | null;
  _baseline: { config_entry_id: string } | null;
  _identityUnavailableRuntimeEntries: Set<string>;
  _invitation: { curve: LightCurve | null };
  _runSuggest(): void;
  _undo(): void;
  _onMembershipApplied(event: CustomEvent): void;
};
const SUGGESTIBLE_DEFAULT = { '1': '1', '50': '50', '100': '100' };
const presetPoints = (id: string) =>
  CURVE_PRESETS.find((preset) => preset.id === id)!.controlPoints;
/** What the names Ceiling Light, Sofa Lamp and LED Strip give: Late, Early, Dim. */
const SUGGESTED_IDS = ['late_starter', 'early_starter', 'dim_accent'];
const shapesOf = (curves: LightCurve[]) => curves.map((curve) => curve.controlPoints);

/**
 * A group whose names give a suggestion, with Room left unset. Group and user
 * are fresh per call unless given: the first-use store remembers every id.
 * `suggest` is what the sidebar panel does on a first open.
 */
async function mountSuggestible(
  options: {
    suggest?: boolean;
    names?: string[];
    shapes?: Array<Record<string, string> | undefined>;
    group?: string;
    user?: string;
    surface?: 'sidebar' | 'dashboard';
  } = {}
) {
  const names = options.names ?? ['Ceiling Light', 'Sofa Lamp', 'LED Strip'];
  const group = options.group ?? `light.room_${crypto.randomUUID()}`;
  const user = options.user ?? crypto.randomUUID();
  const ids = names.map((_, index) => `light.${'abcdef'[index]}`);
  const entities = Object.fromEntries(
    ids.map((id, index) => [id, { brightness: options.shapes?.[index] ?? SUGGESTIBLE_DEFAULT }])
  );
  const hass: Hass = {
    user: { is_admin: true, id: user },
    states: Object.fromEntries([
      [group, { state: 'on', attributes: {} }],
      ...ids.map((id, index) => [id, { state: 'on', attributes: { friendly_name: names[index] } }]),
    ]),
    callWS: vi.fn(testBackend(entities)) as Hass['callWS'],
    callApi: vi.fn(),
    callService: vi.fn(),
  };
  vi.mocked(hass.callService).mockImplementation(testLightService(hass.states));
  const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
  const suggest = options.suggest ?? true;
  card.draftSurface = options.surface ?? (suggest ? 'sidebar' : 'dashboard');
  if (suggest) card.suggestOnFirstOpen = true;
  card.setConfig({ entity: group, joy: noMotion });
  card.hass = hass;
  document.body.append(card);
  await settle(card);
  await settle(card);
  const state = card as unknown as SuggestState;
  const prior = structuredClone(state._curves);
  const suggested = structuredClone(state._suggested ?? []);
  return {
    card,
    state,
    hass,
    group,
    user,
    prior,
    suggested,
    // The record belongs to the config entry, which the test backend names `test-entry`.
    answerKey: `lightener:first-use:v1:suggestion:${user}:test-entry`,
  };
}

const prompt = (card: LightenerCurveCard) => card.renderRoot.querySelector('.suggestion-prompt');
const saves = (hass: Hass) =>
  vi.mocked(hass.callWS).mock.calls.filter(([message]) => message.type === 'lightener/save_curves');
const storedRoom = (group: string): unknown => {
  const raw = sessionStorage.getItem(`lightener:curve-card:v1:${group}`);
  return raw ? (JSON.parse(raw).scrubberPosition ?? null) : null;
};
const notice = (card: LightenerCurveCard) =>
  card.renderRoot.querySelector('.canvas-notice')?.textContent?.trim() ?? null;
async function chooseSuggest(card: LightenerCurveCard) {
  const item = (await openMore(card)).find((candidate) =>
    candidate.classList.contains('suggest-shapes')
  )!;
  item.click();
  await settle(card);
  return item;
}

describe('suggested shapes: adopting', () => {
  afterEach(() => localStorage.clear());

  type Mounted = Awaited<ReturnType<typeof mountSuggestible>>;
  const entries: Array<{
    entry: string;
    /** The Undo stack after: the shapes from before, then the adopted ones when the action changed a shape itself. */
    undo: 'prior' | 'prior, suggested';
    act(mounted: Mounted): Promise<void> | void;
    /** The action's own change on top of the suggested shapes. */
    changed?(mounted: Mounted): void;
  }> = [
    {
      entry: 'the Edit button',
      undo: 'prior',
      act: ({ card }) => toolbar(card).querySelector<HTMLButtonElement>('.edit-button')!.click(),
    },
    {
      entry: 'a light-row tap',
      undo: 'prior',
      act: async ({ card }) => (await rowButton(card)).click(),
    },
    {
      entry: 'a bar tap',
      undo: 'prior',
      act: async ({ card }) => {
        const move = await levelBar(card);
        move('pointerdown');
        move('pointerup');
      },
    },
    {
      entry: 'a bar drag',
      undo: 'prior, suggested',
      act: ({ card }) => {
        fire(legend(card), 'light-level-start', { entityId: 'light.b' });
        fire(legend(card), 'light-level-input', { entityId: 'light.b', target: 20 });
        fire(legend(card), 'light-level-end', { entityId: 'light.b' });
      },
      changed: ({ state, suggested }) => {
        expect(sampleCurveAt(state._curves[1].controlPoints, 30)).toBe(20);
        expect(state._curves[1].controlPoints).not.toEqual(suggested[1].controlPoints);
        expect(state._curves[0]).toEqual(suggested[0]);
        expect(state._curves[2]).toEqual(suggested[2]);
      },
    },
    {
      entry: 'bar arrows that change nothing',
      undo: 'prior',
      act: ({ card }) => {
        fire(legend(card), 'light-level-start', { entityId: 'light.b' });
        fire(legend(card), 'light-level-end', { entityId: 'light.b' });
      },
    },
    {
      entry: 'a bar gesture that returns to where it started',
      undo: 'prior',
      act: ({ card, suggested }) => {
        fire(legend(card), 'light-level-start', { entityId: 'light.b' });
        fire(legend(card), 'light-level-input', { entityId: 'light.b', target: 20 });
        fire(legend(card), 'light-level-input', {
          entityId: 'light.b',
          target: sampleCurveAt(suggested[1].controlPoints, 30),
        });
        fire(legend(card), 'light-level-end', { entityId: 'light.b' });
      },
    },
    {
      entry: 'a point drag',
      undo: 'prior, suggested',
      // The Late light's point at 55 → 10, as the suggestion draws it.
      act: async ({ card }) => {
        const { svg, hit } = await graphPoint(card, 3);
        hit.dispatchEvent(pointer('pointerdown', 55, 10));
        svg.dispatchEvent(pointer('pointermove', 60, 20));
        svg.dispatchEvent(pointer('pointerup', 60, 20));
      },
      changed: ({ state, suggested }) => {
        expect(state._curves[0].controlPoints).toHaveLength(suggested[0].controlPoints.length);
        expect(state._curves[0].controlPoints[3]).not.toEqual(suggested[0].controlPoints[3]);
        expect(state._curves.slice(1)).toEqual(suggested.slice(1));
      },
    },
    {
      entry: 'point arrows',
      undo: 'prior, suggested',
      act: async ({ card }) => {
        const { hit } = await graphPoint(card, 3);
        hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      },
      changed: ({ state, suggested }) => {
        expect(state._curves[0].controlPoints[3].lightener).toBe(55);
        expect(state._curves[0].controlPoints[3].target).toBeGreaterThan(10);
        expect(state._curves.slice(1)).toEqual(suggested.slice(1));
      },
    },
    {
      entry: 'adding a point',
      undo: 'prior, suggested',
      act: ({ card }) =>
        fire(graph(card), 'point-add', { lightener: 80, target: 96, entityId: 'light.b' }),
      changed: ({ state, suggested }) => {
        expect(state._curves[1].controlPoints).toEqual(
          [...suggested[1].controlPoints, { lightener: 80, target: 96 }].sort(
            (a, b) => a.lightener - b.lightener
          )
        );
        expect(state._curves[0]).toEqual(suggested[0]);
        expect(state._curves[2]).toEqual(suggested[2]);
      },
    },
    {
      entry: 'removing a point',
      undo: 'prior, suggested',
      act: ({ card }) => fire(graph(card), 'point-remove', { curveIndex: 1, pointIndex: 4 }),
      changed: ({ state, suggested }) => {
        expect(state._curves[1].controlPoints).toEqual(
          suggested[1].controlPoints.filter((_, index) => index !== 4)
        );
        expect(state._curves[0]).toEqual(suggested[0]);
        expect(state._curves[2]).toEqual(suggested[2]);
      },
    },
    {
      entry: 'a shape chip',
      undo: 'prior, suggested',
      // Chips are not drawn in View beside a suggestion; the handler is called directly.
      act: ({ state }) => {
        state._selectedCurveId = 'light.b';
        state._applyPreset(CURVE_PRESETS.find((preset) => preset.id === 'dim_accent')!);
      },
      changed: ({ state, suggested }) => {
        expect(state._curves[1].controlPoints).toEqual(presetPoints('dim_accent'));
        expect(state._curves[0]).toEqual(suggested[0]);
        expect(state._curves[2]).toEqual(suggested[2]);
      },
    },
    {
      entry: 'Preview on lights',
      undo: 'prior',
      act: ({ state }) => state._onPreviewToggle(),
    },
  ];

  it.each(entries)('$entry adopts the suggestion first', async ({ undo, act, changed }) => {
    const mounted = await mountSuggestible();
    const { card, state, hass, group, prior, suggested } = mounted;
    expect(prompt(card)).not.toBeNull();
    expect(shapesOf(suggested)).toEqual(SUGGESTED_IDS.map(presetPoints));
    expect(shapesOf(prior)).toEqual(SUGGESTED_IDS.map(() => presetPoints('linear')));

    await act(mounted);
    await settle(card);

    expect(state._undoStack).toEqual(undo === 'prior' ? [prior] : [prior, suggested]);
    expect(await mode(card)).toBe('edit');
    expect(state._isDirty).toBe(true);
    if (changed) changed(mounted);
    else expect(state._curves).toEqual(suggested);
    // The drawn Room position is the one being edited: kept in memory, never stored.
    expect(state._scrubberPosition).toBe(30);
    expect(storedRoom(group)).toBeNull();
    expect(state._suggestion).toBeNull();
    expect(prompt(card)).toBeNull();
    expect(saves(hass)).toHaveLength(0);
  });

  it('a tapped light shows its chip as applied', async () => {
    const { card } = await mountSuggestible();
    await legend(card).updateComplete;
    const rows = legend(card).renderRoot.querySelectorAll<HTMLButtonElement>('.row-select-btn');
    expect(rows).toHaveLength(3);
    for (const [index, id] of SUGGESTED_IDS.entries()) {
      rows[index].click();
      await settle(card);
      const applied = [
        ...card.renderRoot.querySelectorAll('.edit-row .shape-chip[aria-current="true"]'),
      ];
      expect(applied.map((chip) => chip.getAttribute('data-preset'))).toEqual([id]);
    }
  });

  it('Undo after adopting returns the shapes from before and a clean editor', async () => {
    animateInstantly();
    const { card, state, hass, prior } = await mountSuggestible();
    (await rowButton(card)).click();
    await settle(card);
    expect(state._isDirty).toBe(true);
    state._undo();
    await vi.waitFor(() => expect(state._isDirty).toBe(false));
    expect(state._curves).toEqual(prior);
    expect(state._undoStack).toEqual([]);
    expect(saves(hass)).toHaveLength(0);
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('a bar on a light drawn Off edits from its first step at the drawn Room position', async () => {
    const { card, state, prior, suggested } = await mountSuggestible();
    // The ceiling light is Late: off at the drawn 30%.
    expect(sampleCurveAt(suggested[0].controlPoints, 30)).toBe(0);
    const move = await levelBar(card);
    move('pointerdown', 30);
    move('pointermove', 90);
    const first = sampleCurveAt(state._curves[0].controlPoints, 30);
    expect(first).toBeGreaterThan(0);
    expect(state._editGesture).toMatchObject({ kind: 'light', position: 30 });
    await settle(card);
    // The drag is still the same gesture after the adoption has rendered.
    move('pointermove', 150);
    const second = sampleCurveAt(state._curves[0].controlPoints, 30);
    expect(second).toBeGreaterThan(first);
    expect(state._editGesture).toMatchObject({ kind: 'light', position: 30 });
    expect(state._undoStack).toEqual([prior, suggested]);
    expect(state._curves.slice(1)).toEqual(suggested.slice(1));
    move('pointerup', 150);
    expect(state._editGesture).toBeNull();
    expect(state._scrubberPosition).toBe(30);
  });

  it('the card passes the suggested shapes and the drawn Room position as the bars’ edit seed', async () => {
    const { card, state, suggested } = await mountSuggestible();
    expect(legend(card).editingCurves).toEqual(suggested);
    expect(legend(card).editingPosition).toBe(30);
    expect(legend(card).scrubberPosition).toBe(30);
    expect(state._scrubberPosition).toBeNull();
    // After adoption the seed is the draft at the same position: no bar moves.
    (await rowButton(card)).click();
    await settle(card);
    expect(legend(card).editingCurves).toEqual(suggested);
    expect(legend(card).editingPosition).toBe(30);
  });

  it('does not adopt: Room moves, hover, opening ⋮, graph point focus, Ctrl+S, Ctrl+Z', async () => {
    const { card, state, hass, prior, suggested } = await mountSuggestible();
    const scrubber = card.renderRoot.querySelector('curve-scrubber')!;
    fire(scrubber, 'scrubber-start', {});
    fire(scrubber, 'scrubber-move', { position: 45 });
    fire(scrubber, 'scrubber-end', {});
    fire(legend(card), 'hover-curve', { entityId: 'light.a' });
    await openMore(card);
    toolbar(card).querySelector<HTMLButtonElement>('.more-button')!.click();
    fire(graph(card), 'focus-curve', { entityId: 'light.a' });
    for (const key of ['s', 'z']) {
      graph(card).dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          ctrlKey: true,
          bubbles: true,
          composed: true,
          cancelable: true,
        })
      );
    }
    await settle(card);
    expect(state._suggested).toEqual(suggested);
    expect(prompt(card)).not.toBeNull();
    expect(state._curves).toEqual(prior);
    expect(state._undoStack).toEqual([]);
    expect(state._isDirty).toBe(false);
    expect(await mode(card)).toBe('view');
    expect(saves(hass)).toHaveLength(0);
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('does not adopt while editing is unavailable', async () => {
    const { card, state, hass, prior } = await mountSuggestible();
    // A runtime barrier: saved shapes and lights may disagree.
    state._identityUnavailableRuntimeEntries.add(state._baseline!.config_entry_id);
    card.requestUpdate();
    await settle(card);
    expect(prompt(card)).toBeNull();
    expect(state._suggestionOffer).toBe(true);
    (await rowButton(card)).click();
    fire(legend(card), 'light-level-start', { entityId: 'light.b' });
    fire(legend(card), 'light-level-input', { entityId: 'light.b', target: 20 });
    fire(graph(card), 'point-remove', { curveIndex: 1, pointIndex: 4 });
    state._onPreviewToggle();
    await settle(card);
    expect(state._curves).toEqual(prior);
    expect(state._undoStack).toEqual([]);
    expect(state._isDirty).toBe(false);
    expect(state._scrubberPosition).toBeNull();
    expect(saves(hass)).toHaveLength(0);
    expect(hass.callService).not.toHaveBeenCalled();
    // The row tap still entered Edit; a later load must not offer it over that.
    expect(await mode(card)).toBe('edit');
    expect(state._suggestionOffer).toBe(false);
  });

  it('a Room move ends the 30% default and is stored as the user’s own', async () => {
    const { card, state, group, prior, suggested } = await mountSuggestible();
    const scrubber = card.renderRoot.querySelector('curve-scrubber')!;
    // The Room grip starts its drag from the drawn position.
    expect(scrubber.position).toBe(30);
    expect(scrubber.interactionPosition).toBe(30);
    expect(storedRoom(group)).toBeNull();
    fire(scrubber, 'scrubber-start', {});
    fire(scrubber, 'scrubber-move', { position: 60 });
    fire(scrubber, 'scrubber-end', {});
    await settle(card);
    expect(state._scrubberPosition).toBe(60);
    expect(storedRoom(group)).toBe(60);
    expect(scrubber.position).toBe(60);
    expect(graph(card).scrubberPosition).toBe(60);
    expect(legend(card).scrubberPosition).toBe(60);
    expect(legend(card).editingPosition).toBe(60);
    // Still a suggestion: nothing was adopted.
    expect(state._suggested).toEqual(suggested);
    expect(state._curves).toEqual(prior);
    expect(await mode(card)).toBe('view');
    // Adopting now keeps the user's own position.
    (await rowButton(card)).click();
    await settle(card);
    expect(state._scrubberPosition).toBe(60);
  });

  it('Preview on lights adopts, then starts at the adopted Room position', async () => {
    const { card, state, hass, prior, suggested } = await mountSuggestible();
    state._onPreviewToggle();
    await vi.waitFor(() => expect(hass.callService).toHaveBeenCalledTimes(3));
    await settle(card);
    expect(state._previewActive).toBe(true);
    expect(state._undoStack).toEqual([prior]);
    expect(state._curves).toEqual(suggested);
    const sent = Object.fromEntries(
      vi
        .mocked(hass.callService)
        .mock.calls.map(([, service, data]) => [
          String(data!.entity_id),
          service === 'turn_off' ? 0 : data!.brightness,
        ])
    );
    // The adopted shapes at Room 30: Late is off, Early and Dim are on at their own levels.
    const at30 = suggested.map((curve) =>
      Math.round((sampleCurveAt(curve.controlPoints, 30) / 100) * 255)
    );
    expect(sent).toEqual({ 'light.a': 0, 'light.b': at30[1], 'light.c': at30[2] });
    expect(at30[1]).not.toBe(at30[2]);
  });

  it.each([
    'a lost connection',
    'another light change still running',
    "another group's editor previewing one of these lights",
  ])('adopts nothing when the preview cannot start: %s', async (why) => {
    const { card, state, hass, group, prior, suggested } = await mountSuggestible();
    if (why === 'a lost connection') card.hass = { ...hass, connected: false };
    else if (why === 'another light change still running')
      expect(previewSessions.beginMutation(group, ['light.a'])).not.toBeNull();
    else
      expect(
        previewSessions.reserve(previewSessions.create('user', 'light.other'), ['light.a'])
      ).toBe(true);
    await settle(card);
    expect(state._suggested).toEqual(suggested);
    state._onPreviewToggle();
    await settle(card);
    expect(state._previewActive).toBe(false);
    expect(state._suggested).toEqual(suggested);
    expect(state._curves).toEqual(prior);
    expect(state._undoStack).toEqual([]);
    expect(state._isDirty).toBe(false);
    expect(state._scrubberPosition).toBeNull();
    expect(await mode(card)).toBe('view');
    expect(hass.callService).not.toHaveBeenCalled();
    // The light-level refusal says why; it used to arrive a frame after the adoption.
    const said = [...card.shadowRoot!.querySelectorAll('.command-status [role="status"]')].map(
      (line) => line.textContent!.trim()
    );
    if (why.startsWith("another group's")) expect(said).toContain(UI.restoration.overlap);
  });

  it('Escape declines; ⋮ closes first; the delete confirmation keeps the key; an Escape outside the card does nothing', async () => {
    const { card, state, prior, answerKey } = await mountSuggestible();
    const row = await rowButton(card);

    // An Escape that is not this card's.
    const outside = document.body.appendChild(document.createElement('button'));
    expect(escape(outside).defaultPrevented).toBe(false);
    expect(prompt(card)).not.toBeNull();

    // An open ⋮ takes the key and only closes.
    const [first] = await openMore(card);
    expect(escape(first).defaultPrevented).toBe(true);
    await settle(card);
    expect(toolbar(card).querySelector('.more-menu')).toBeNull();
    expect(prompt(card)).not.toBeNull();

    // The delete confirmation owns the key while it is open.
    const items = await openMore(card);
    items.find((item) => item.classList.contains('delete-group-btn'))!.click();
    await settle(card);
    await legend(card).updateComplete;
    expect(legend(card).renderRoot.querySelector('.delete-group-confirm')).not.toBeNull();
    escape(row);
    await settle(card);
    expect(prompt(card)).not.toBeNull();
    expect(localStorage.getItem(answerKey)).toBeNull();
    legend(card).renderRoot.querySelector<HTMLButtonElement>('.delete-group-btn.cancel')!.click();
    await legend(card).updateComplete;
    await settle(card);

    // Now the key is the editor's: the suggestion is declined.
    expect(escape(row).defaultPrevented).toBe(true);
    await settle(card);
    expect(prompt(card)).toBeNull();
    expect(state._curves).toEqual(prior);
    expect(state._isDirty).toBe(false);
    expect(await mode(card)).toBe('view');
    expect(localStorage.getItem(answerKey)).toBe('dismissed');
    expect(card.renderRoot.querySelector('.coach-prompt')).not.toBeNull();
  });

  it.each(['sidebar', 'dashboard'] as const)(
    'Suggest shapes is second in ⋮ for an administrator: %s',
    async (surface) => {
      const { card } = await mountSuggestible({ suggest: false, surface });
      expect(card.draftSurface).toBe(surface);
      const items = await openMore(card);
      expect(items.map((item) => item.textContent?.trim())).toEqual([
        'Show me how',
        'Suggest shapes',
        'Edit lights…',
        'Delete group…',
      ]);
      expect(items[1].disabled).toBe(false);
    }
  );

  it('Suggest shapes refuses a draft', async () => {
    const { card, state, hass } = await mountSuggestible({ suggest: false });
    fire(legend(card), 'light-level-start', { entityId: 'light.b' });
    fire(legend(card), 'light-level-input', { entityId: 'light.b', target: 20 });
    fire(legend(card), 'light-level-end', { entityId: 'light.b' });
    await settle(card);
    const draft = structuredClone(state._curves);
    const history = structuredClone(state._undoStack);
    await chooseSuggest(card);
    expect(notice(card)).toBe(UI.suggestion.draft);
    expect(prompt(card)).toBeNull();
    expect(state._suggestion).toBeNull();
    expect(state._curves).toEqual(draft);
    expect(state._undoStack).toEqual(history);
    expect(state._isDirty).toBe(true);
    expect(saves(hass)).toHaveLength(0);
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it.each(['Edit lights is open', 'a new light is still drawing in'])(
    'Suggest shapes refuses while %s and keeps Undo',
    async (why) => {
      const { card, state, hass, prior } = await mountSuggestible({ suggest: false });
      const internal = card as unknown as {
        _membershipOpen: boolean;
        _drawIn: { ids: Set<string>; token: number; ready: boolean } | null;
        _runSuggest: () => void;
      };
      // An older step the suggestion would otherwise clear.
      const history = [structuredClone(prior)];
      state._undoStack = history;
      if (why === 'Edit lights is open') internal._membershipOpen = true;
      else internal._drawIn = { ids: new Set(), token: 1, ready: false };
      internal._runSuggest();
      await settle(card);
      expect(notice(card)).toBe(UI.suggestion.busy);
      expect(prompt(card)).toBeNull();
      expect(state._suggestion).toBeNull();
      expect(state._undoStack).toEqual(history);
      expect(state._curves).toEqual(prior);
      expect(saves(hass)).toHaveLength(0);
      expect(hass.callService).not.toHaveBeenCalled();
    }
  );

  it('Suggest shapes refuses while Preview on lights is on', async () => {
    const { card, state, hass, prior } = await mountSuggestible({ suggest: false });
    state._onPreviewToggle();
    await vi.waitFor(() => expect(hass.callService).toHaveBeenCalledTimes(3));
    await settle(card);
    await chooseSuggest(card);
    expect(notice(card)).toBe(UI.suggestion.watching);
    expect(prompt(card)).toBeNull();
    expect(state._suggestion).toBeNull();
    expect(state._previewActive).toBe(true);
    expect(state._curves).toEqual(prior);
    expect(state._undoStack).toEqual([]);
    expect(hass.callService).toHaveBeenCalledTimes(3);
    expect(saves(hass)).toHaveLength(0);
  });

  it('Suggest shapes from a clean Edit returns to View and shows it', async () => {
    const { card, state, hass, prior } = await mountSuggestible({ suggest: false });
    (await rowButton(card)).click();
    await settle(card);
    expect(await mode(card)).toBe('edit');
    expect(state._selectedCurveId).toBe('light.a');
    await chooseSuggest(card);
    expect(await mode(card)).toBe('view');
    expect(state._selectedCurveId).toBeNull();
    expect(prompt(card)).not.toBeNull();
    expect(shapesOf(graph(card).curves)).toEqual(SUGGESTED_IDS.map(presetPoints));
    expect(state._curves).toEqual(prior);
    expect(state._isDirty).toBe(false);
    expect(saves(hass)).toHaveLength(0);
  });

  it('Suggest shapes over older Undo history starts clean: Ctrl+Z keeps it and adopting is one step', async () => {
    animateInstantly();
    const { card, state, hass, prior } = await mountSuggestible({ suggest: false });
    // Dim, Equal, Late, then Undo: a clean editor that still holds two older steps.
    (await rowButton(card)).click();
    await settle(card);
    for (const id of ['dim_accent', 'linear', 'late_starter'])
      state._applyPreset(CURVE_PRESETS.find((preset) => preset.id === id)!);
    state._undo();
    await vi.waitFor(() => expect(state._isDirty).toBe(false));
    await settle(card);
    expect(state._curves).toEqual(prior);
    expect(state._undoStack).toHaveLength(2);

    await chooseSuggest(card);
    expect(prompt(card)).not.toBeNull();
    expect(await mode(card)).toBe('view');
    const suggested = structuredClone(state._suggested);
    expect(state._undoStack).toEqual([]);

    // With the older steps left in place this would bring the abandoned Dim back as a draft.
    graph(card).dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
        composed: true,
        cancelable: true,
      })
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    await settle(card);
    expect(state._suggested).toEqual(suggested);
    expect(prompt(card)).not.toBeNull();
    expect(state._curves).toEqual(prior);
    expect(state._isDirty).toBe(false);
    expect(await mode(card)).toBe('view');

    card.enterEditMode();
    await settle(card);
    expect(await mode(card)).toBe('edit');
    expect(state._curves).toEqual(suggested);
    expect(state._undoStack).toEqual([prior]);
    expect(saves(hass)).toHaveLength(0);
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it.each([
    { left: ['light.a', 'light.b'], shown: ['late_starter', 'early_starter'] },
    // One light gives no suggestion: nothing shows.
    { left: ['light.a'], shown: null },
  ])(
    'Edit lights removing a light keeps a by-itself suggestion for the lights left: $left',
    async ({ left, shown }) => {
      const { card, state, hass } = await mountSuggestible();
      expect(prompt(card)).not.toBeNull();
      expect(state._suggestionOffer).toBe(true);
      const entities = Object.fromEntries(
        left.map((id) => [id, { brightness: SUGGESTIBLE_DEFAULT }])
      );
      vi.mocked(hass.callWS).mockImplementation(testBackend(entities));
      state._onMembershipApplied(
        new CustomEvent('membership-applied', { detail: { entities, added_entity_ids: [] } })
      );
      // The saved shapes are read again before anything can be saved or offered.
      await vi.waitFor(() => expect(state._baseline).not.toBeNull());
      await settle(card);
      expect(state._curves.map((curve) => curve.entityId)).toEqual(left);
      expect(await mode(card)).toBe('view');
      if (shown) {
        expect(prompt(card)).not.toBeNull();
        expect(shapesOf(state._suggested!)).toEqual(shown.map(presetPoints));
        expect(shapesOf(graph(card).curves)).toEqual(shown.map(presetPoints));
        expect(state._suggestionOffer).toBe(true);
      } else {
        expect(prompt(card)).toBeNull();
        expect(state._suggestion).toBeNull();
      }
      expect(shapesOf(state._curves)).toEqual(left.map(() => presetPoints('linear')));
      expect(state._isDirty).toBe(false);
      expect(saves(hass)).toHaveLength(0);
      expect(hass.callService).not.toHaveBeenCalled();
    }
  );

  it('Suggest shapes shows it again after an answer was recorded and records nothing by itself', async () => {
    const first = await mountSuggestible();
    escape(await rowButton(first.card));
    await settle(first.card);
    expect(localStorage.getItem(first.answerKey)).toBe('dismissed');
    first.card.remove();
    localStorage.clear();

    const { card, state, answerKey } = await mountSuggestible({
      group: first.group,
      user: first.user,
    });
    // Answered: nothing shows by itself, but the menu still offers it.
    expect(prompt(card)).toBeNull();
    await chooseSuggest(card);
    expect(prompt(card)).not.toBeNull();
    expect(state._suggested).not.toBeNull();
    expect(localStorage.getItem(answerKey)).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it.each([
    'a blocked administrator with suggestible lights',
    'names that give nothing',
    'a draft offered for recovery',
    'a suggestion already showing',
  ])('Suggest shapes is disabled: %s', async (why) => {
    const user = crypto.randomUUID();
    const group = `light.room_${crypto.randomUUID()}`;
    if (why === 'a draft offered for recovery') {
      const earlier = await mountSuggestible({ suggest: false, user, group });
      earlier.state._commitCurveEdit(
        earlier.state._curves.map((curve, index) =>
          index === 0 ? { ...curve, controlPoints: presetPoints('dim_accent') } : curve
        )
      );
      earlier.card.remove();
    }
    const { card, state } = await mountSuggestible({
      user,
      group,
      suggest: why === 'a suggestion already showing',
      names: why === 'names that give nothing' ? ['Alpha', 'Bravo'] : undefined,
    });
    if (why === 'a blocked administrator with suggestible lights') {
      state._identityUnavailableRuntimeEntries.add(state._baseline!.config_entry_id);
      card.requestUpdate();
      await settle(card);
    }
    if (why === 'a draft offered for recovery')
      expect(card.renderRoot.querySelector('[data-draft-recover]')).not.toBeNull();
    expect(prompt(card) !== null).toBe(why === 'a suggestion already showing');
    const shown = state._suggestion;
    const item = await chooseSuggest(card);
    expect(item.disabled).toBe(true);
    expect(state._suggestion).toBe(shown);
    expect(notice(card)).toBeNull();
    expect(state._isDirty).toBe(false);
  });

  it('Show me how from a suggestion withdraws it without adopting or recording', async () => {
    const { card, state, hass, prior, answerKey } = await mountSuggestible();
    const [showMeHow] = await openMore(card);
    showMeHow.click();
    await settle(card);
    expect(exitState(card)).toBe('tutorial');
    expect(state._suggestion).toBeNull();
    expect(prompt(card)).toBeNull();
    expect(state._curves).toEqual(prior);
    expect(state._undoStack).toEqual([]);
    expect(state._isDirty).toBe(false);
    expect(state._scrubberPosition).toBeNull();
    toolbar(card).querySelector<HTMLButtonElement>('.canvas-done')!.click();
    await settle(card);
    expect(await mode(card)).toBe('view');
    expect(prompt(card)).toBeNull();
    expect(state._curves).toEqual(prior);
    expect(localStorage.getItem(answerKey)).toBeNull();
    expect(saves(hass)).toHaveLength(0);
    expect(hass.callService).not.toHaveBeenCalled();
  });
});
