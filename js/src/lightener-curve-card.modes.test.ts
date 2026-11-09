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
import { toSvgX, toSvgY } from './utils/graph-math.js';

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
    card.canvasHelp = true;
    await card.updateComplete;
    state._toggleCanvasHelp();
    expect(await mode(card)).toBe('edit');
    expect(state._isDirty).toBe(false);
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('an automatic example does not', async () => {
    const { card, state } = await mount();
    card.canvasHelp = true;
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
    card.canvasHelp = true;
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

describe('toolbar exit slot', () => {
  it('View offers the Edit pill, keeps ⋮ last, and lists the three ⋮ items', async () => {
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
      'Brightness tips',
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
    expect(items.map((item) => item.textContent?.trim())).toEqual(['Brightness tips']);
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
    expect(items).toHaveLength(3);
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
        'Brightness tips',
        'Edit lights…',
        'Delete group…',
      ]);
      card.remove();

      const { card: offered } = await mount();
      offered.canCreateGroup = true;
      await offered.updateComplete;
      expect(labels(await openMore(offered))).toEqual([
        'Brightness tips',
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
      expect(labels(await openMore(card))).toEqual(['Brightness tips', 'New group…']);
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
    expect(card.renderRoot.querySelector('.coach-prompt')).not.toBeNull();
    escape(await rowButton(card));
    await card.updateComplete;
    expect(card.renderRoot.querySelector('.coach-prompt')).toBeNull();
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
      card.canvasHelp = true;
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
  it('marks the card while Watch room react is on, so the graph well warms', async () => {
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
