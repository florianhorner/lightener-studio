// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { LightenerCurveCard } from './lightener-curve-card.js';
import type { Hass, LightCurve } from './utils/types.js';
import type { LoadState } from './utils/load-lifecycle.js';
import { CURVE_PRESETS, type PresetDef } from './utils/presets.js';

// Tests reach private @state fields directly (instead of exposing a test-only
// setter on the card) because every production caller would have to ignore it.
// Read-only on the post-#70 source: _saving and _saveError are getters from _saveState.
type CardInternals = {
  _curves: LightCurve[];
  _selectedCurveId: string | null;
  _onSave: () => Promise<boolean>;
  _onCancel: () => void;
  _undo: () => void;
  _tryLoadCurves: () => Promise<void>;
  _undoStack: LightCurve[][];
  _load: LoadState;
  _dirtyVersion: number;
  _cleanVersion: number;
  _startPreview: () => void;
  _scrubberPosition: number | null;
  _lastPreviewTime: number;
  _onPointMove: (e: CustomEvent) => void;
  _onPointDrop: (e: CustomEvent) => void;
  _onPointAdd: (e: CustomEvent) => void;
  _onPointRemove: (e: CustomEvent) => void;
  _dragActive: boolean;
  _applyPreset: (preset: {
    id: string;
    name: string;
    description: string;
    controlPoints: LightCurve['controlPoints'];
  }) => void;
  _presetGraphTrial: PresetDef | null;
  _lastPresetPointerType: string | null;
};

function forceDirty(card: LightenerCurveCard): void {
  const internal = card as unknown as CardInternals;
  internal._curves = internal._curves.map((c) => ({
    ...c,
    controlPoints: [...c.controlPoints, { lightener: 75, target: 90 }],
  }));
}

// LightenerCurveCard.connectedCallback adds global keydown + beforeunload listeners
// on `window`. Without cleanup they accumulate across tests and can make this suite
// order-dependent. Unmounting every card between tests runs disconnectedCallback,
// which removes those listeners.
afterEach(() => {
  document.body.querySelectorAll('lightener-curve-card').forEach((el) => el.remove());
  sessionStorage.clear();
  vi.useRealTimers();
});

beforeAll(async () => {
  // curve-graph reads window.matchMedia during connectedCallback; jsdom doesn't ship it.
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

function makeHass(overrides?: Partial<Hass>): Hass & {
  callWS: ReturnType<typeof vi.fn>;
  callApi: ReturnType<typeof vi.fn>;
  callService: ReturnType<typeof vi.fn>;
} {
  return {
    user: { is_admin: true },
    callWS: vi.fn().mockResolvedValue({ entities: {} }),
    callApi: vi.fn().mockResolvedValue(undefined),
    callService: vi.fn().mockResolvedValue(undefined),
    states: {
      'light.lightener': { state: 'on', attributes: { friendly_name: 'Lightener' } },
      'light.a': { state: 'on', attributes: { friendly_name: 'Alpha' } },
      'light.b': { state: 'on', attributes: { friendly_name: 'Beta' } },
      'light.new': { state: 'off', attributes: { friendly_name: 'New' } },
    },
    ...overrides,
  } as Hass & {
    callWS: ReturnType<typeof vi.fn>;
    callApi: ReturnType<typeof vi.fn>;
    callService: ReturnType<typeof vi.fn>;
  };
}

async function mountCard(
  initialEntities: Record<string, { brightness: Record<string, string> }>,
  hass?: Hass
): Promise<{
  card: LightenerCurveCard;
  hass: Hass & {
    callWS: ReturnType<typeof vi.fn>;
    callApi: ReturnType<typeof vi.fn>;
    callService: ReturnType<typeof vi.fn>;
  };
}> {
  const _hass =
    (hass as typeof hass & {
      callWS: ReturnType<typeof vi.fn>;
      callApi: ReturnType<typeof vi.fn>;
      callService: ReturnType<typeof vi.fn>;
    }) ?? makeHass();
  if (!hass) {
    (_hass.callWS as ReturnType<typeof vi.fn>).mockResolvedValue({ entities: initialEntities });
  }
  const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
  card.setConfig({ entity: 'light.lightener' });
  card.hass = _hass;
  document.body.appendChild(card);
  // Wait for the initial WS load to settle
  await card.updateComplete;
  await Promise.resolve();
  await card.updateComplete;
  return { card, hass: _hass };
}

function fireLegend(card: LightenerCurveCard, event: string, detail: Record<string, unknown>) {
  const legend = card.renderRoot.querySelector('curve-legend')!;
  legend.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, composed: true }));
}

function renderedGraph(card: LightenerCurveCard): HTMLElement & {
  curves: LightCurve[];
  readOnly: boolean;
  previewCurve: LightCurve | null;
} {
  const graph = card.renderRoot.querySelector('curve-graph') as
    | (HTMLElement & { curves: LightCurve[]; readOnly: boolean; previewCurve: LightCurve | null })
    | null;
  expect(graph).not.toBeNull();
  return graph!;
}

function presetButton(card: LightenerCurveCard, presetId: string): HTMLButtonElement {
  const preset = CURVE_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`Missing preset ${presetId}`);
  const button = Array.from(
    card.renderRoot.querySelectorAll<HTMLButtonElement>('.preset-option')
  ).find((item) => item.textContent?.includes(preset.name));
  expect(button, `button for ${preset.name}`).not.toBeUndefined();
  return button!;
}

function mockImmediateRaf(): ReturnType<typeof vi.spyOn> {
  return vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
}

describe('lightener-curve-card module', () => {
  it('publishes its version marker for the panel stale-bundle check', () => {
    // Assert the marker is published in semver form, not a hardcoded literal:
    // a literal breaks on every version bump, and exact equality with
    // manifest.json is already enforced by the version-sync CI job.
    expect(
      (window as unknown as { __LIGHTENER_CURVE_CARD_VERSION__?: string })
        .__LIGHTENER_CURVE_CARD_VERSION__
    ).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?(?:\+[0-9A-Za-z.]+)?$/);
  });

  it('registers exactly one card-picker entry on window.customCards at module eval', () => {
    // Wiring test: catches "the util exists but nobody calls it". The beforeAll
    // module import above is the only execution, so exactly one entry exists.
    const customCards = (
      window as unknown as {
        customCards?: Array<{
          type: string;
          name?: string;
          description?: string;
          documentationURL?: string;
          getEntitySuggestion?: unknown;
        }>;
      }
    ).customCards;

    expect(Array.isArray(customCards)).toBe(true);
    const entries = customCards!.filter((entry) => entry.type === 'lightener-curve-card');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: 'lightener-curve-card',
      name: 'Lightener Studio',
      description: 'Shape how each light responds to group brightness.',
      documentationURL: 'https://github.com/florianhorner/lightener-studio#readme',
    });
    expect(typeof entries[0].getEntitySuggestion).toBe('function');
  });
});

describe('lightener-curve-card — light management', () => {
  it('_onAddLight calls lightener/add_light with the preset and reloads curves', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const afterAdd = {
      'light.a': { brightness: { '100': '100' } },
      'light.new': { brightness: { '100': '100' } },
    };
    hass.callWS.mockReset();
    hass.callWS.mockResolvedValueOnce({ entities: afterAdd });
    hass.callWS.mockResolvedValueOnce({ entities: afterAdd });

    fireLegend(card, 'add-light', { entityId: 'light.new', preset: 'night_mode' });
    await new Promise((r) => setTimeout(r, 0));
    await card.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await card.updateComplete;

    const addCall = hass.callWS.mock.calls.find(
      (c) => (c[0] as Record<string, unknown>)?.type === 'lightener/add_light'
    );
    expect(addCall![0]).toEqual({
      type: 'lightener/add_light',
      entity_id: 'light.lightener',
      controlled_entity_id: 'light.new',
      preset: 'night_mode',
    });
    const reloadCall = hass.callWS.mock.calls.find(
      (c) => (c[0] as Record<string, unknown>)?.type === 'lightener/get_curves'
    );
    expect(reloadCall).toBeDefined();
  });

  it('omits preset from the add_light call when none is supplied', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    hass.callWS.mockReset();
    hass.callWS.mockResolvedValue({ entities: { 'light.a': { brightness: { '100': '100' } } } });

    fireLegend(card, 'add-light', { entityId: 'light.new' });
    await new Promise((r) => setTimeout(r, 0));
    await card.updateComplete;

    const addCall = hass.callWS.mock.calls.find(
      (c) => (c[0] as Record<string, unknown>)?.type === 'lightener/add_light'
    );
    expect(addCall![0]).toEqual({
      type: 'lightener/add_light',
      entity_id: 'light.lightener',
      controlled_entity_id: 'light.new',
    });
  });

  it('surfaces backend error message via _manageError on add failure', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    hass.callWS.mockReset();
    hass.callWS.mockRejectedValueOnce({ code: 'already_exists', message: 'Already added!' });

    fireLegend(card, 'add-light', { entityId: 'light.a', preset: 'linear' });
    await new Promise((r) => setTimeout(r, 0));
    await card.updateComplete;

    const err = card.renderRoot.querySelector('.side-rail .error');
    expect(err?.textContent).toContain('Already added!');
  });

  it('does nothing when add-light fires with no entityId', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    hass.callWS.mockReset();
    fireLegend(card, 'add-light', {});
    await card.updateComplete;
    expect(hass.callWS).not.toHaveBeenCalled();
  });

  it('_onRemoveLight calls lightener/remove_light and reloads curves', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
      'light.b': { brightness: { '100': '80' } },
    });
    const afterRemove = { 'light.b': { brightness: { '100': '80' } } };
    hass.callWS.mockReset();
    hass.callWS.mockResolvedValueOnce(undefined);
    hass.callWS.mockResolvedValueOnce({ entities: afterRemove });

    fireLegend(card, 'remove-light', { entityId: 'light.a' });
    await new Promise((r) => setTimeout(r, 0));
    await card.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await card.updateComplete;

    const removeCall = hass.callWS.mock.calls.find(
      (c) => (c[0] as Record<string, unknown>)?.type === 'lightener/remove_light'
    );
    expect(removeCall![0]).toEqual({
      type: 'lightener/remove_light',
      entity_id: 'light.lightener',
      controlled_entity_id: 'light.a',
    });
    const reloadCall = hass.callWS.mock.calls.find(
      (c) => (c[0] as Record<string, unknown>)?.type === 'lightener/get_curves'
    );
    expect(reloadCall).toBeDefined();
  });

  it('surfaces backend error message via _manageError on remove failure', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
      'light.b': { brightness: { '100': '80' } },
    });
    hass.callWS.mockReset();
    hass.callWS.mockRejectedValueOnce({ code: 'boom', message: 'Nope!' });

    fireLegend(card, 'remove-light', { entityId: 'light.a' });
    await new Promise((r) => setTimeout(r, 0));
    await card.updateComplete;

    const err = card.renderRoot.querySelector('.side-rail .error');
    expect(err?.textContent).toContain('Nope!');
  });

  it('does nothing when remove-light fires with no entityId', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
      'light.b': { brightness: { '100': '80' } },
    });
    hass.callWS.mockReset();
    fireLegend(card, 'remove-light', {});
    await card.updateComplete;
    expect(hass.callWS).not.toHaveBeenCalled();
  });

  it('flips managing=true on the legend during the remove WS round trip', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
      'light.b': { brightness: { '100': '80' } },
    });
    let resolveRemove: () => void = () => {};
    const removePromise = new Promise<void>((r) => {
      resolveRemove = r;
    });
    hass.callWS.mockReset();
    hass.callWS.mockImplementationOnce(() => removePromise);
    hass.callWS.mockResolvedValueOnce({ entities: { 'light.b': { brightness: { '100': '80' } } } });

    fireLegend(card, 'remove-light', { entityId: 'light.a' });
    await card.updateComplete;

    const legend = card.renderRoot.querySelector('curve-legend') as unknown as {
      managing: boolean;
    };
    expect(legend.managing).toBe(true);

    resolveRemove();
    await new Promise((r) => setTimeout(r, 0));
    await card.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await card.updateComplete;
    expect(legend.managing).toBe(false);
  });

  it('hides presets, scrubber, and live preview controls when no lights are configured', async () => {
    const { card } = await mountCard({});

    const buttons = [...card.renderRoot.querySelectorAll('button')].map((button) =>
      button.textContent?.trim()
    );
    expect(buttons).not.toContain('Presets');
    expect(buttons).not.toContain('Preview');
    expect(card.renderRoot.querySelector('curve-scrubber')).toBeNull();
    expect(card.renderRoot.querySelector('.graph-insight')).toBeNull();

    const graph = card.renderRoot.querySelector('curve-graph')!;
    await graph.updateComplete;
    expect(graph.shadowRoot?.textContent).toContain('Add a light below to get started');
  });

  it('renders the graph-native loading skeleton while curves load', async () => {
    const hass = makeHass({
      callWS: vi.fn().mockReturnValue(new Promise(() => {})),
    });
    const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
    card.setConfig({ entity: 'light.lightener' });
    card.hass = hass;
    document.body.appendChild(card);
    await card.updateComplete;

    const status = card.renderRoot.querySelector<HTMLElement>('.loading-indicator');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.textContent).toContain('Loading brightness shapes');
    expect(card.renderRoot.querySelector('curve-graph')).toBeNull();
    expect(card.renderRoot.querySelector('.loading-graph')).not.toBeNull();
    expect(card.renderRoot.querySelectorAll('.loading-curve')).toHaveLength(3);
    expect(card.renderRoot.querySelectorAll('.loading-point')).toHaveLength(3);
  });

  it('shows a stateful graph summary when loaded lights overlap on one shape', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
      'light.b': { brightness: { '100': '100' } },
    });

    const insight = card.renderRoot.querySelector('.graph-insight');
    expect(insight).not.toBeNull();
    expect(insight?.textContent).toContain('2 lights match the group brightness');
    expect(insight?.textContent).toContain('Pick a light to give it its own shape.');
  });

  it('updates the graph summary when a light is selected', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
      'light.b': { brightness: { '100': '100' } },
    });

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;

    const insight = card.renderRoot.querySelector('.graph-insight');
    expect(insight?.textContent).toContain('Shaping Alpha');
    expect(insight?.textContent).toContain('1 light still shares this shape.');
  });

  it('clears a temporary shape trial when the legend remove panel opens', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
      'light.b': { brightness: { '100': '80' } },
    });
    const internal = card as unknown as CardInternals;

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    presetButton(card, 'night_mode').dispatchEvent(new Event('focus'));
    await card.updateComplete;
    expect(internal._presetGraphTrial?.id).toBe('night_mode');
    expect(renderedGraph(card).previewCurve?.entityId).toBe('light.a');

    fireLegend(card, 'remove-panel-open', {});
    await card.updateComplete;

    expect(internal._presetGraphTrial).toBeNull();
    expect(renderedGraph(card).previewCurve).toBeNull();
    expect(card.renderRoot.querySelector('.presets-panel')).not.toBeNull();
  });

  it('renders the Shapes slot before the light list in the side rail', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });

    const sideRail = card.renderRoot.querySelector('.side-rail');
    const presets = card.renderRoot.querySelector('.presets-panel');
    expect(sideRail).not.toBeNull();
    expect(presets).not.toBeNull();
    expect(sideRail!.contains(presets)).toBe(true);
    expect(sideRail!.firstElementChild).toBe(presets);
    expect(sideRail!.children[1]?.tagName.toLowerCase()).toBe('curve-legend');
    expect(card.renderRoot.querySelector('.main-stack .presets-panel')).toBeNull();
    expect(presets?.getAttribute('role')).toBe('region');
    expect(presets?.getAttribute('aria-label')).toBe('Shapes for selected light');
    expect(presets?.textContent).toContain('Pick a light to shape it.');
    expect(card.renderRoot.querySelector('.preset-option')).toBeNull();
  });

  describe('delete group via curve card', () => {
    it('happy path: registry lookup then DELETE entry via callApi', async () => {
      const { card, hass } = await mountCard({
        'light.a': { brightness: { '100': '100' } },
      });
      const deletedEvents: CustomEvent[] = [];
      card.addEventListener('lightener-group-deleted', (event) => {
        deletedEvents.push(event as CustomEvent);
      });

      hass.callWS.mockReset();
      hass.callWS.mockResolvedValueOnce({
        platform: 'lightener',
        config_entry_id: 'E1',
      });
      hass.callApi.mockResolvedValueOnce(undefined);

      await (card as unknown as { _onDeleteGroup: () => Promise<void> })._onDeleteGroup();

      expect(hass.callWS).toHaveBeenCalledWith({
        type: 'config/entity_registry/get',
        entity_id: 'light.lightener',
      });
      expect(hass.callApi).toHaveBeenCalledTimes(1);
      expect(hass.callApi).toHaveBeenCalledWith('DELETE', 'config/config_entries/entry/E1');
      expect(
        hass.callWS.mock.calls.filter(
          ([msg]) => (msg as { type?: string } | undefined)?.type === 'config_entries/remove'
        )
      ).toHaveLength(0);
      expect(deletedEvents).toHaveLength(1);
      expect(deletedEvents[0].detail.configEntryId).toBe('E1');
    });
  });
});

describe('lightener-curve-card — save flow', () => {
  it('defers curve overwrite when dirty', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const graph = card.renderRoot.querySelector('curve-graph')!;
    let resolveReload: (value: {
      entities: Record<string, { brightness: Record<string, string> }>;
    }) => void = () => {};
    const reloadPromise = new Promise<{
      entities: Record<string, { brightness: Record<string, string> }>;
    }>((resolve) => {
      resolveReload = resolve;
    });

    hass.callWS.mockReset();
    hass.callWS.mockReturnValueOnce(reloadPromise);
    internal._load = { ...internal._load, loaded: false };
    const load = internal._tryLoadCurves();

    graph.dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 50, target: 60 },
        bubbles: true,
        composed: true,
      })
    );

    resolveReload({ entities: { 'light.b': { brightness: { '1': '5', '100': '10' } } } });
    await load;
    await card.updateComplete;

    expect(internal._curves.map((curve) => curve.entityId)).toEqual(['light.a']);
    expect(internal._curves[0].controlPoints).toContainEqual({ lightener: 50, target: 60 });
    expect(internal._load.loading).toBe(false);
    expect(internal._load.loaded).toBe(true);
    expect(internal._load.pendingReloadEntityId).toBe('light.lightener');
  });

  it('surfaces a load error when a malformed payload arrives during a dirty load', async () => {
    // Regression: the dirty-defer path must still parse the payload eagerly so a
    // malformed response (no `entities` key) fails loud into the error path
    // instead of being silently marked loaded. Matches the pre-refactor behavior.
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const graph = card.renderRoot.querySelector('curve-graph')!;
    let resolveReload: (value: unknown) => void = () => {};
    const reloadPromise = new Promise((resolve) => {
      resolveReload = resolve;
    });

    hass.callWS.mockReset();
    hass.callWS.mockReturnValueOnce(reloadPromise);
    internal._load = { ...internal._load, loaded: false };
    const load = internal._tryLoadCurves();

    graph.dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 50, target: 60 },
        bubbles: true,
        composed: true,
      })
    );

    // Malformed: missing the `entities` key entirely.
    resolveReload({});
    await load;
    await card.updateComplete;

    expect(internal._load.loadError).toBeTruthy();
    expect(internal._load.loading).toBe(false);
    // The user's unsaved edit is still intact — the error did not wipe it.
    expect(internal._curves[0].controlPoints).toContainEqual({ lightener: 50, target: 60 });
    // A failed parse must NOT strand the deferred-reload marker: the response
    // never produced a valid snapshot, so a later cancel/undo must not drain
    // pendingReloadEntityId into a spurious reload.
    expect(internal._load.pendingReloadEntityId).toBeUndefined();
  });

  it('hass state push during drag does not reload curves', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;

    hass.callWS.mockReset();
    hass.callWS.mockResolvedValue({ entities: {} });
    internal._load = { ...internal._load, loaded: false };

    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 50, target: 60 },
      })
    );
    card.hass = hass;

    expect(hass.callWS).not.toHaveBeenCalled();
    expect(internal._curves[0].controlPoints[1]).toEqual({ lightener: 50, target: 60 });

    internal._onPointDrop(new CustomEvent('point-drop'));
    card.hass = hass;

    expect(hass.callWS).toHaveBeenCalledWith({
      type: 'lightener/get_curves',
      entity_id: 'light.lightener',
    });
  });

  it('ignores stale point moves without dirtying or pushing undo history', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const originalCurves = JSON.stringify(internal._curves);
    const dirtyVersion = internal._dirtyVersion;

    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 9, pointIndex: 1, lightener: 50, target: 60 },
      })
    );
    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 9, lightener: 50, target: 60 },
      })
    );

    expect(JSON.stringify(internal._curves)).toBe(originalCurves);
    expect(internal._dirtyVersion).toBe(dirtyVersion);
    expect(internal._undoStack).toHaveLength(0);
    expect(internal._dragActive).toBe(false);
  });

  it('applies reload when clean after dirty state clears', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const graph = card.renderRoot.querySelector('curve-graph')!;
    let resolveDirtyReload: (value: {
      entities: Record<string, { brightness: Record<string, string> }>;
    }) => void = () => {};
    const dirtyReloadPromise = new Promise<{
      entities: Record<string, { brightness: Record<string, string> }>;
    }>((resolve) => {
      resolveDirtyReload = resolve;
    });

    hass.callWS.mockReset();
    hass.callWS.mockReturnValueOnce(dirtyReloadPromise);
    internal._load = { ...internal._load, loaded: false };
    const dirtyLoad = internal._tryLoadCurves();
    graph.dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 50, target: 60 },
        bubbles: true,
        composed: true,
      })
    );
    resolveDirtyReload({ entities: { 'light.b': { brightness: { '1': '5', '100': '10' } } } });
    await dirtyLoad;

    // Simulate the save path: _onSave() clears the loaded flag before calling _tryLoadCurves().
    // Without this reset, the early-out guard correctly blocks re-loading.
    internal._cleanVersion = internal._dirtyVersion;
    internal._load = { ...internal._load, loaded: false };
    hass.callWS.mockResolvedValueOnce({
      entities: { 'light.b': { brightness: { '1': '5', '100': '10' } } },
    });

    await internal._tryLoadCurves();
    await card.updateComplete;

    expect(internal._curves.map((curve) => curve.entityId)).toEqual(['light.b']);
    expect(internal._load.loading).toBe(false);
    expect(internal._load.pendingReloadEntityId).toBeUndefined();
  });

  it('refetches a dirty-deferred reload after cancel restores the clean snapshot', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const graph = card.renderRoot.querySelector('curve-graph')!;
    let resolveDirtyReload: (value: {
      entities: Record<string, { brightness: Record<string, string> }>;
    }) => void = () => {};
    const dirtyReloadPromise = new Promise<{
      entities: Record<string, { brightness: Record<string, string> }>;
    }>((resolve) => {
      resolveDirtyReload = resolve;
    });

    hass.callWS.mockReset();
    hass.callWS.mockReturnValueOnce(dirtyReloadPromise);
    internal._load = { ...internal._load, loaded: false };
    const dirtyLoad = internal._tryLoadCurves();
    graph.dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 50, target: 60 },
        bubbles: true,
        composed: true,
      })
    );
    resolveDirtyReload({ entities: { 'light.b': { brightness: { '1': '5', '100': '10' } } } });
    await dirtyLoad;

    hass.callWS.mockResolvedValueOnce({
      entities: { 'light.b': { brightness: { '1': '5', '100': '10' } } },
    });
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(performance.now() + 301);
        return 1;
      });

    internal._onCancel();
    await Promise.resolve();
    await Promise.resolve();
    await card.updateComplete;
    rafSpy.mockRestore();

    expect(internal._curves.map((curve) => curve.entityId)).toEqual(['light.b']);
    expect(internal._load.pendingReloadEntityId).toBeUndefined();
    expect(internal._load.loaded).toBe(true);
  });

  it('refetches a dirty-deferred reload after undo restores the clean snapshot', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const graph = card.renderRoot.querySelector('curve-graph')!;
    let resolveDirtyReload: (value: {
      entities: Record<string, { brightness: Record<string, string> }>;
    }) => void = () => {};
    const dirtyReloadPromise = new Promise<{
      entities: Record<string, { brightness: Record<string, string> }>;
    }>((resolve) => {
      resolveDirtyReload = resolve;
    });

    hass.callWS.mockReset();
    hass.callWS.mockReturnValueOnce(dirtyReloadPromise);
    internal._load = { ...internal._load, loaded: false };
    const dirtyLoad = internal._tryLoadCurves();
    graph.dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 50, target: 60 },
        bubbles: true,
        composed: true,
      })
    );
    resolveDirtyReload({ entities: { 'light.b': { brightness: { '1': '5', '100': '10' } } } });
    await dirtyLoad;

    hass.callWS.mockResolvedValueOnce({
      entities: { 'light.b': { brightness: { '1': '5', '100': '10' } } },
    });
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(performance.now() + 301);
        return 1;
      });

    internal._undo();
    await Promise.resolve();
    await Promise.resolve();
    await card.updateComplete;
    rafSpy.mockRestore();

    expect(internal._curves.map((curve) => curve.entityId)).toEqual(['light.b']);
    expect(internal._load.pendingReloadEntityId).toBeUndefined();
    expect(internal._load.loaded).toBe(true);
  });

  it('queues the post-save reload when an older curve load is still in flight', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const graph = card.renderRoot.querySelector('curve-graph')!;
    let resolveStaleReload: (value: {
      entities: Record<string, { brightness: Record<string, string> }>;
    }) => void = () => {};
    const staleReloadPromise = new Promise<{
      entities: Record<string, { brightness: Record<string, string> }>;
    }>((resolve) => {
      resolveStaleReload = resolve;
    });
    let getCurveCalls = 0;

    hass.callWS.mockReset();
    hass.callWS.mockImplementation((msg: { type: string }) => {
      if (msg.type === 'lightener/get_curves') {
        getCurveCalls++;
        if (getCurveCalls === 1) return staleReloadPromise;
        return Promise.resolve({
          entities: { 'light.fresh': { brightness: { '1': '9', '100': '90' } } },
        });
      }
      if (msg.type === 'lightener/save_curves') return Promise.resolve(undefined);
      return Promise.resolve({ entities: {} });
    });

    internal._load = { ...internal._load, loaded: false };
    const staleLoad = internal._tryLoadCurves();
    graph.dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 50, target: 60 },
        bubbles: true,
        composed: true,
      })
    );

    // _onSave() now awaits the post-save confirmation (the queued reload), so
    // resolve the in-flight stale load first, then await the save.
    const savePromise = internal._onSave();
    await Promise.resolve();
    await Promise.resolve();
    expect(internal._load.reloadAfterLoadEntityId).toBe('light.lightener');

    resolveStaleReload({
      entities: { 'light.stale': { brightness: { '1': '2', '100': '20' } } },
    });
    await staleLoad;
    await savePromise;
    await Promise.resolve();
    await Promise.resolve();
    await card.updateComplete;

    expect(getCurveCalls).toBe(2);
    expect(internal._curves.map((curve) => curve.entityId)).toEqual(['light.fresh']);
    expect(internal._load.reloadAfterLoadEntityId).toBeUndefined();
  });

  it('clears stale undo history when switching entities with unsaved edits', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const graph = card.renderRoot.querySelector('curve-graph')!;

    graph.dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 50, target: 60 },
        bubbles: true,
        composed: true,
      })
    );
    await card.updateComplete;
    expect(card.dirty).toBe(true);
    expect(internal._undoStack.length).toBeGreaterThan(0);

    hass.callWS.mockResolvedValueOnce({
      entities: { 'light.b': { brightness: { '1': '5', '100': '10' } } },
    });
    card.setConfig({ entity: 'light.lightener_two' });

    expect(card.dirty).toBe(false);
    expect(internal._selectedCurveId).toBeNull();
    expect(internal._undoStack).toHaveLength(0);
  });

  it('_onSave dispatches lightener/save_curves with the current curves payload', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    hass.callWS.mockReset();
    hass.callWS.mockImplementation((msg: { type: string }) =>
      msg.type === 'lightener/save_curves'
        ? Promise.resolve(undefined)
        : Promise.resolve({ entities: { 'light.a': { brightness: { '100': '100' } } } })
    );

    forceDirty(card);
    await (card as unknown as CardInternals)._onSave();

    const saveCall = hass.callWS.mock.calls.find(
      (c) => (c[0] as Record<string, unknown>)?.type === 'lightener/save_curves'
    );
    expect(saveCall).toBeDefined();
    const msg = saveCall![0] as {
      entity_id: string;
      curves: Record<string, { brightness: Record<string, string> }>;
    };
    expect(msg.entity_id).toBe('light.lightener');
    // forceDirty appended {lightener:75, target:90}; assert the round-trip into
    // the WS payload so a regression that drops the mutation (or breaks
    // curvesToWsPayload's serialization) fails this test, not just one that
    // forgets to populate `curves` at all.
    expect(msg.curves['light.a'].brightness['75']).toBe('90');
  });

  it('_onSave clears _saving and surfaces _saveError when the WS save rejects', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    hass.callWS.mockReset();
    hass.callWS.mockRejectedValueOnce(new Error('ws transport failed'));

    forceDirty(card);
    await (card as unknown as CardInternals)._onSave();
    await card.updateComplete;

    // The card MUST recover: a stuck _saving=true freezes the save button
    // until the user reloads the panel. The error string is the user-visible
    // contract — leaking the raw exception ("ws transport failed") would
    // satisfy a `not.toBeNull()` assertion but expose internals to users.
    const view = card as unknown as { _saving: boolean; _saveError: string | null };
    expect(view._saving).toBe(false);
    expect(view._saveError).toBe('Save failed. Check connection.');
  });

  it('recovers from a stuck post-save confirmation reload', async () => {
    vi.useFakeTimers();
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const neverConfirmingReload = new Promise(() => {});
    hass.callWS.mockReset();
    hass.callWS.mockImplementation((msg: { type: string }) =>
      msg.type === 'lightener/save_curves' ? Promise.resolve(undefined) : neverConfirmingReload
    );

    forceDirty(card);
    const savePromise = (card as unknown as CardInternals)._onSave();
    await Promise.resolve();
    await card.updateComplete;

    const view = card as unknown as {
      _saving: boolean;
      _saveError: string | null;
      _load: LoadState;
    };
    expect(view._saving).toBe(true);

    await vi.advanceTimersByTimeAsync(8000);
    await expect(savePromise).resolves.toBe(false);
    await card.updateComplete;

    expect(view._saving).toBe(false);
    expect(view._saveError).toBe('Save confirmation timed out.');
    // The timeout abandons the save UI but leaves the hung get_curves request
    // marked in-flight — it has not actually resolved. Clearing the flag here
    // would let a retry start an overlapping load of the same entity.
    expect(view._load.loading).toBe(true);
  });

  it('a stale reload from a timed-out save does not confirm a newer save', async () => {
    vi.useFakeTimers();
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const view = card as unknown as { _saveState: { phase: string } };

    // Save #1's reload (get_curves call 1) hangs under our control so the save
    // times out; save #2's reload (call 2) hangs forever so save #2 stays in
    // the confirming phase while save #1's late reload lands.
    let resolveReload1: (v: {
      entities: Record<string, { brightness: Record<string, string> }>;
    }) => void = () => {};
    const reload1 = new Promise<{
      entities: Record<string, { brightness: Record<string, string> }>;
    }>((resolve) => {
      resolveReload1 = resolve;
    });
    const reload2 = new Promise<never>(() => {});
    let getCalls = 0;
    hass.callWS.mockReset();
    hass.callWS.mockImplementation((msg: { type: string }) => {
      if (msg.type === 'lightener/save_curves') return Promise.resolve(undefined);
      getCalls++;
      return getCalls === 1 ? reload1 : reload2;
    });

    // Save #1 — its reload hangs, so it times out after 8s -> error.
    forceDirty(card);
    const save1 = internal._onSave();
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(8000);
    await expect(save1).resolves.toBe(false);
    expect(view._saveState.phase).toBe('error');

    // Save #2 — enters a fresh confirming phase; _saveGeneration is bumped.
    forceDirty(card);
    const save2 = internal._onSave();
    await Promise.resolve();
    await Promise.resolve();
    expect(view._saveState.phase).toBe('confirming');

    // Save #1's slow reload finally lands. The generation fence must stop it
    // from dispatching save-confirmed against save #2 — save #2 stays in
    // confirming, awaiting its own (hung) reload.
    resolveReload1({ entities: { 'light.a': { brightness: { '100': '100' } } } });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(view._saveState.phase).toBe('confirming');
    void save2;
  });

  it('a disconnect mid-confirmation resets save state instead of sticking', async () => {
    vi.useFakeTimers();
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const view = card as unknown as {
      _saveState: { phase: string };
      _saving: boolean;
      _load: LoadState;
    };
    const neverConfirmingReload = new Promise(() => {});
    hass.callWS.mockReset();
    hass.callWS.mockImplementation((msg: { type: string }) =>
      msg.type === 'lightener/save_curves' ? Promise.resolve(undefined) : neverConfirmingReload
    );

    forceDirty(card);
    const savePromise = internal._onSave();
    await Promise.resolve();
    await card.updateComplete;
    expect(view._saveState.phase).toBe('confirming');

    // Card removed from the DOM while still confirming.
    card.remove();
    // The backend never confirmed, so saveCurves() reports failure.
    await expect(savePromise).resolves.toBe(false);

    // FSM left `confirming`, controls re-enabled, load flag cleared — a
    // reconnected card is not stuck.
    expect(view._saveState.phase).toBe('idle');
    expect(view._saving).toBe(false);
    expect(view._load.loading).toBe(false);
  });
});

describe('lightener-curve-card — selected-light Shapes', () => {
  const linearDefaultPoints = [
    { lightener: 0, target: 0 },
    { lightener: 1, target: 1 },
    { lightener: 100, target: 100 },
  ];

  function freshEntities(count: number): Record<string, { brightness: Record<string, string> }> {
    return Object.fromEntries(
      Array.from({ length: count }, (_, idx) => [
        `light.${String.fromCharCode(97 + idx)}`,
        { brightness: { '1': '1', '100': '100' } },
      ])
    );
  }

  it('shows only the compact Shapes empty state until a light is selected', async () => {
    const { card } = await mountCard(freshEntities(2));
    const internal = card as unknown as CardInternals;

    expect(card.renderRoot.querySelector('.presets-btn')).toBeNull();
    expect(card.renderRoot.querySelector('.presets-panel.empty')).not.toBeNull();
    expect(card.renderRoot.querySelector('.presets-panel')?.textContent).toContain(
      'Pick a light to shape it.'
    );
    expect(card.renderRoot.querySelector('.presets-panel')?.textContent).toContain(
      'Shapes apply to one light at a time.'
    );
    expect(card.renderRoot.querySelector('.preset-option')).toBeNull();
    expect(internal._selectedCurveId).toBeNull();
    expect(internal._presetGraphTrial).toBeNull();
    expect(renderedGraph(card).previewCurve).toBeNull();
    expect(renderedGraph(card).curves.map((curve) => curve.controlPoints)).toEqual([
      linearDefaultPoints,
      linearDefaultPoints,
    ]);
  });

  it('reveals shape buttons for the selected light only', async () => {
    const { card } = await mountCard(freshEntities(2));

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;

    const panel = card.renderRoot.querySelector('.presets-panel');
    expect(panel).not.toBeNull();
    expect(panel?.classList.contains('empty')).toBe(false);
    expect(panel?.textContent).toContain('Shapes for Alpha');
    expect(panel?.textContent).toContain('Pick a starting shape, then fine-tune it on the graph.');
    expect(card.renderRoot.querySelectorAll('.preset-option')).toHaveLength(CURVE_PRESETS.length);
    expect(card.renderRoot.querySelector('.side-rail')?.firstElementChild).toBe(panel);
  });

  it('hovering a shape shows a graph-only shimmer for the selected light', async () => {
    const { card, hass } = await mountCard(freshEntities(2));
    const internal = card as unknown as CardInternals;
    const nightMode = CURVE_PRESETS.find((p) => p.id === 'night_mode')!;
    const beforeCurves = JSON.stringify(internal._curves);
    const dirty = internal._dirtyVersion;
    const events: Array<string | null> = [];
    card.addEventListener('preset-trial-change', (event) => {
      events.push((event as CustomEvent<{ presetId: string | null }>).detail.presetId);
    });

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;

    const enter = new Event('pointerenter');
    (enter as unknown as { pointerType: string }).pointerType = 'mouse';
    presetButton(card, 'night_mode').dispatchEvent(enter);
    await card.updateComplete;

    expect(internal._presetGraphTrial?.id).toBe('night_mode');
    expect(events).toEqual(['night_mode']);
    expect(renderedGraph(card).previewCurve).toMatchObject({
      entityId: 'light.a',
      friendlyName: 'Alpha',
      controlPoints: nightMode.controlPoints,
    });
    expect(renderedGraph(card).curves.map((curve) => curve.controlPoints)).toEqual([
      linearDefaultPoints,
      linearDefaultPoints,
    ]);
    expect(JSON.stringify(internal._curves)).toBe(beforeCurves);
    expect(internal._dirtyVersion).toBe(dirty);
    expect(internal._undoStack).toHaveLength(0);
    expect(hass.callService).not.toHaveBeenCalled();
    expect(card.renderRoot.querySelector('.graph-insight')?.textContent).toContain(
      `Trying ${nightMode.name}`
    );
    expect(card.renderRoot.querySelector('.graph-insight')?.textContent).toContain(
      'Choose it to shape Alpha.'
    );

    presetButton(card, 'night_mode').dispatchEvent(new Event('pointerleave'));
    await card.updateComplete;

    expect(internal._presetGraphTrial).toBeNull();
    expect(events).toEqual(['night_mode', null]);
    expect(renderedGraph(card).previewCurve).toBeNull();
  });

  it('suppresses touch hover but still supports later keyboard focus', async () => {
    const { card } = await mountCard(freshEntities(2));
    const internal = card as unknown as CardInternals;

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    const button = presetButton(card, 'night_mode');

    const touchEnter = new Event('pointerenter');
    (touchEnter as unknown as { pointerType: string }).pointerType = 'touch';
    button.dispatchEvent(touchEnter);
    await card.updateComplete;
    expect(internal._presetGraphTrial).toBeNull();

    const down = new Event('pointerdown');
    (down as unknown as { pointerType: string }).pointerType = 'touch';
    button.dispatchEvent(down);
    button.dispatchEvent(new Event('pointerleave'));
    await card.updateComplete;
    expect(internal._lastPresetPointerType).toBeNull();

    button.dispatchEvent(new Event('focus'));
    await card.updateComplete;
    expect(internal._presetGraphTrial?.id).toBe('night_mode');
    expect(renderedGraph(card).previewCurve?.entityId).toBe('light.a');
  });

  it('clicking a shape applies it to the selected light and keeps the Shapes slot visible', async () => {
    const { card } = await mountCard(freshEntities(2));
    const internal = card as unknown as CardInternals;
    const dimAccent = CURVE_PRESETS.find((p) => p.id === 'dim_accent')!;
    const originalCurves = JSON.stringify(internal._curves);
    const dirty = internal._dirtyVersion;

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    presetButton(card, 'dim_accent').click();
    await card.updateComplete;

    expect(internal._presetGraphTrial).toBeNull();
    expect(renderedGraph(card).previewCurve).toBeNull();
    expect(internal._dirtyVersion).toBe(dirty + 1);
    expect(internal._undoStack).toHaveLength(1);
    expect(JSON.stringify(internal._undoStack[0])).toBe(originalCurves);
    expect(internal._curves.map((curve) => curve.controlPoints)).toEqual([
      dimAccent.controlPoints,
      linearDefaultPoints,
    ]);
    expect(card.renderRoot.querySelector('.presets-panel')?.textContent).toContain(
      'Shapes for Alpha'
    );
    expect(card.renderRoot.querySelectorAll('.preset-option')).toHaveLength(CURVE_PRESETS.length);
    expect(readStored()?.selectedCurveId).toBe('light.a');
  });

  it('deselecting the light hides shape buttons and clears a temporary shimmer', async () => {
    const { card } = await mountCard(freshEntities(2));
    const internal = card as unknown as CardInternals;

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    presetButton(card, 'night_mode').dispatchEvent(new Event('focus'));
    await card.updateComplete;
    expect(renderedGraph(card).previewCurve?.entityId).toBe('light.a');

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;

    expect(internal._selectedCurveId).toBeNull();
    expect(internal._presetGraphTrial).toBeNull();
    expect(renderedGraph(card).previewCurve).toBeNull();
    expect(card.renderRoot.querySelector('.presets-panel.empty')).not.toBeNull();
    expect(card.renderRoot.querySelector('.preset-option')).toBeNull();
  });
});

describe('lightener-curve-card — selection (_onSelectCurve wiring)', () => {
  // These tests cover the card's integration with canSelectCurve + toggleSelection
  // helpers in card-logic.ts. The helpers are unit-tested in isolation; here we
  // verify the wiring: dispatching select-curve events from a child component
  // mutates _selectedCurveId in the documented ways.

  it('selects a visible curve and toggles deselect on second event', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
      'light.b': { brightness: { '1': '1', '50': '60', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    expect(internal._selectedCurveId).toBeNull();

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBe('light.a');

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBeNull();
  });

  it('switches selection when a different visible curve is clicked', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
      'light.b': { brightness: { '1': '1', '50': '60', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBe('light.a');

    fireLegend(card, 'select-curve', { entityId: 'light.b' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBe('light.b');
  });

  it('blocks selection of a hidden curve', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
      'light.b': { brightness: { '1': '1', '50': '60', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    // Hide light.b
    internal._curves = internal._curves.map((c) =>
      c.entityId === 'light.b' ? { ...c, visible: false } : c
    );
    await card.updateComplete;

    fireLegend(card, 'select-curve', { entityId: 'light.b' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBeNull();
  });

  it('blocks selection of an unknown entityId (the post-refactor behavior tightening)', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;

    fireLegend(card, 'select-curve', { entityId: 'light.does-not-exist' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBeNull();
  });

  // ── Group A: selection state contract (Wave 1, plan groups A.1–A.4) ──
  // These document the intended four-way visual contract. Some currently fail
  // against master — that is the point. Each failing test is the work
  // definition for the corresponding fix.

  it('A.1 keeps populated graph free of persistent instruction text', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
    });
    const graph = card.renderRoot.querySelector('curve-graph')!;
    await graph.updateComplete;

    expect(
      graph.shadowRoot?.querySelector('.hint-select'),
      'populated graphs should not render persistent selection hints'
    ).toBeNull();
    expect(graph.shadowRoot?.querySelector('.editing-label')).toBeNull();

    // After selecting, editing instructions stay in point ARIA labels.
    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    await graph.updateComplete;
    expect(
      graph.shadowRoot?.querySelector('.hint-select'),
      'hint-select must not render when a curve is selected'
    ).toBeNull();
    expect(graph.shadowRoot?.querySelector('.editing-label')).toBeNull();
    const pointLabel =
      graph.shadowRoot
        ?.querySelector<SVGCircleElement>('.hit-circle')
        ?.getAttribute('aria-label') ?? '';
    expect(pointLabel).toContain('Arrow Up/Down');
  });

  it('A.2 selected curve has solid stroke; unselected curves are dashed', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
      'light.b': { brightness: { '1': '1', '50': '60', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    // Select light.b deliberately. light.a is curveIdx=0 and the legacy
    // DASH_PATTERNS lookup makes idx-0 solid by coincidence; selecting light.b
    // forces the test to actually depend on selection, not index.
    fireLegend(card, 'select-curve', { entityId: 'light.b' });
    await card.updateComplete;
    const graph = card.renderRoot.querySelector('curve-graph')!;
    await graph.updateComplete;

    const lines = Array.from(
      graph.shadowRoot?.querySelectorAll('path.curve-line') ?? []
    ) as SVGPathElement[];
    expect(lines.length).toBe(2);
    const selectedColor = internal._curves.find((c) => c.entityId === 'light.b')!.color;
    const selectedLine = lines.find((line) => line.getAttribute('stroke') === selectedColor);
    const unselectedLines = lines.filter((line) => line !== selectedLine);
    expect(selectedLine, 'selected curve line must render').not.toBeUndefined();

    // Contract: exactly one line is solid (the selected curve). Solid is
    // either no dasharray attribute, "0", "none", or a single "0 0" pattern.
    const isSolid = (el: SVGPathElement): boolean => {
      const v = (el.getAttribute('stroke-dasharray') ?? '').trim();
      return v === '' || v === '0' || v === 'none' || /^0(\s+0)*$/.test(v);
    };
    expect(isSolid(selectedLine!), 'the selected curve-line itself must be solid').toBe(true);
    expect(
      unselectedLines.every((line) => !isSolid(line)),
      'all unselected curve-lines must be dashed'
    ).toBe(true);
  });

  it('A.3 only the selected curve renders a filled area; others are line-only', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
      'light.b': { brightness: { '1': '1', '100': '100' } },
      'light.c': { brightness: { '1': '1', '100': '100' } },
    });
    fireLegend(card, 'select-curve', { entityId: 'light.b' });
    await card.updateComplete;
    const graph = card.renderRoot.querySelector('curve-graph')!;
    await graph.updateComplete;

    // Fill paths are <path fill="url(#grad-…)"> rendered alongside curve-line.
    const fillPaths = Array.from(
      graph.shadowRoot?.querySelectorAll('path[fill^="url(#grad-"]') ?? []
    ) as SVGPathElement[];
    expect(
      fillPaths.length,
      'with N curves and one selected, exactly 1 fill polygon must render'
    ).toBe(1);
  });

  it('A.4 clear-edit affordance toggles the selection off', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
      'light.b': { brightness: { '1': '1', '50': '60', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBe('light.a');

    const legend = card.renderRoot.querySelector('curve-legend')!;
    await (legend as unknown as { updateComplete: Promise<void> }).updateComplete;
    const clearBtn = legend.shadowRoot?.querySelector<HTMLButtonElement>('.clear-edit-icon');
    expect(clearBtn, 'clear-edit-icon must render on the selected legend row').not.toBeNull();

    let dispatched: CustomEvent | null = null;
    card.addEventListener('select-curve', (e) => {
      dispatched = e as CustomEvent;
    });
    clearBtn!.click();
    await card.updateComplete;

    expect(dispatched, 'clicking clear-edit must dispatch a select-curve event').not.toBeNull();
    expect((dispatched as unknown as CustomEvent).detail).toEqual({ entityId: 'light.a' });
    expect(internal._selectedCurveId, 'selection must clear after the toggle').toBeNull();
  });

  it('still allows deselect when the currently-selected curve has gone missing (race during reload)', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
      'light.b': { brightness: { '1': '1', '50': '60', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;

    // Simulate the user having selected light.b, then a reload that drops it
    // from _curves (e.g. it was removed by another tab).
    internal._selectedCurveId = 'light.b';
    internal._curves = internal._curves.filter((c) => c.entityId !== 'light.b');
    await card.updateComplete;

    // User clicks the now-stale row again. The card should let them dismiss
    // it instead of trapping them in a "nothing matches" dimmed state.
    fireLegend(card, 'select-curve', { entityId: 'light.b' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBeNull();
  });
});

describe('lightener-curve-card — live preview propagation', () => {
  it('refreshes physical lights when a light row is selected while preview is active', async () => {
    const rafSpy = mockImmediateRaf();
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    internal._scrubberPosition = 70;
    internal._startPreview();
    hass.callService.mockClear();

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;

    expect(hass.callService).toHaveBeenCalledTimes(1);
    expect(hass.callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness: 179,
      transition: 0.25,
    });

    rafSpy.mockRestore();
  });

  it('repushes the live preview to the restored brightness after undo', async () => {
    // Regression: undo animated the curve back to its previous state but never
    // refreshed the live preview, so the real bulb stayed at the pre-undo
    // brightness. Undo must land on the restored curve, then force one all-lights
    // preview at the current scrubber position.
    const dragRaf = mockImmediateRaf();
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    internal._selectedCurveId = 'light.a';
    internal._scrubberPosition = 50;
    internal._startPreview();

    // Drag light.a's endpoint up to 80% — the bulb tracks to 204, and the undo
    // stack records the pre-drag (identity) curve.
    internal._lastPreviewTime = 0;
    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 80 },
      })
    );
    expect(hass.callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness: 204,
      transition: 0.25,
    });
    dragRaf.mockRestore();

    hass.callService.mockClear();
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(performance.now() + 301);
        return 1;
      });

    internal._undo();
    await Promise.resolve();
    await card.updateComplete;
    rafSpy.mockRestore();

    // Curve restored to identity, and the forced refresh drove light.a back to
    // the scrubber sample (50% -> 128) instead of stranding it at 204.
    expect(hass.callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness: 128,
      transition: 0.25,
    });
  });

  it('drives the dragged light to the moved point’s target, not the scrubber sample', async () => {
    // Live-edit semantics: dragging light.a's endpoint to target 80 must push
    // light.a to 80% (brightness 204) — the value at the point under the finger
    // — NOT curveAt(scrubber=50)=40% (brightness 102) as the old preview did.
    const rafSpy = mockImmediateRaf();
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    internal._selectedCurveId = 'light.a';
    internal._scrubberPosition = 50;
    internal._startPreview();
    hass.callService.mockClear();
    internal._lastPreviewTime = 0;

    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 80 },
      })
    );

    expect(hass.callService).toHaveBeenCalledTimes(1);
    expect(hass.callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness: 204,
      transition: 0.25,
    });

    rafSpy.mockRestore();
  });

  it('moving one light’s point leaves sibling lights untouched', async () => {
    const rafSpy = mockImmediateRaf();
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
      'light.b': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    internal._scrubberPosition = 50;
    internal._startPreview(); // both lights land at 128
    hass.callService.mockClear();
    internal._lastPreviewTime = 0;

    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 80 },
      })
    );

    // Exactly one call, for light.a only — light.b holds its previewed value.
    expect(hass.callService).toHaveBeenCalledTimes(1);
    const touched = hass.callService.mock.calls.map(
      (c) => (c[2] as { entity_id: string }).entity_id
    );
    expect(touched).toEqual(['light.a']);

    rafSpy.mockRestore();
  });

  it('dragging a light’s target to zero turns that light off', async () => {
    const rafSpy = mockImmediateRaf();
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    internal._scrubberPosition = 50;
    internal._startPreview();
    hass.callService.mockClear();
    internal._lastPreviewTime = 0;

    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 0 },
      })
    );

    expect(hass.callService).toHaveBeenCalledTimes(1);
    expect(hass.callService).toHaveBeenCalledWith('light', 'turn_off', {
      entity_id: 'light.a',
      transition: 0.25,
    });

    rafSpy.mockRestore();
  });

  it('dragging a light’s target back above zero turns it on again', async () => {
    const rafSpy = mockImmediateRaf();
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    internal._scrubberPosition = 50;
    internal._startPreview();
    hass.callService.mockClear();

    // Drag to 0 -> off.
    internal._lastPreviewTime = 0;
    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 0 },
      })
    );
    expect(hass.callService).toHaveBeenLastCalledWith('light', 'turn_off', {
      entity_id: 'light.a',
      transition: 0.25,
    });

    // Drag back up to 60% -> on at 153.
    internal._lastPreviewTime = 0;
    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 60 },
      })
    );
    expect(hass.callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness: 153,
      transition: 0.25,
    });

    rafSpy.mockRestore();
  });

  it('dragging the origin point to a dim floor previews the floor, not off', async () => {
    // Regression (PR #154 review): the origin point emits lightener:0, where the
    // dim-floor rule samples to 0 (off). Dragging the floor up must preview the
    // dragged target (25% -> 64), not turn the light off.
    const rafSpy = mockImmediateRaf();
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    internal._scrubberPosition = 50;
    internal._startPreview();
    hass.callService.mockClear();
    internal._lastPreviewTime = 0;

    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 0, lightener: 0, target: 25 },
      })
    );

    expect(hass.callService).toHaveBeenCalledTimes(1);
    expect(hass.callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness: 64,
      transition: 0.25,
    });

    rafSpy.mockRestore();
  });

  it('keyboard point edits (point-move then point-drop) drive the light and hold', async () => {
    // Arrow-key nudges emit point-move + point-drop, so they get the same live
    // single-light push as pointer drag, and point-drop must NOT snap back.
    const rafSpy = mockImmediateRaf();
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    internal._scrubberPosition = 50;
    internal._startPreview();
    hass.callService.mockClear();
    internal._lastPreviewTime = 0;

    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 80 },
      })
    );
    expect(hass.callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness: 204,
      transition: 0.25,
    });

    // point-drop holds: no restore, no further service call.
    hass.callService.mockClear();
    internal._onPointDrop(new CustomEvent('point-drop'));
    expect(hass.callService).not.toHaveBeenCalled();

    rafSpy.mockRestore();
  });

  it('refreshes preview after discrete curve edits without moving the scrubber', async () => {
    const rafSpy = mockImmediateRaf();
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    internal._selectedCurveId = 'light.a';
    internal._scrubberPosition = 50;
    internal._startPreview();
    hass.callService.mockClear();

    internal._applyPreset({
      id: 'test_low',
      name: 'Test low',
      description: 'Test preset',
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 100, target: 40 },
      ],
    });
    expect(hass.callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness: 51,
      transition: 0.25,
    });

    hass.callService.mockClear();
    internal._onPointAdd(
      new CustomEvent('point-add', {
        detail: { entityId: 'light.a', lightener: 50, target: 80 },
      })
    );
    expect(hass.callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness: 204,
      transition: 0.25,
    });

    hass.callService.mockClear();
    internal._onPointRemove(
      new CustomEvent('point-remove', {
        detail: { curveIndex: 0, pointIndex: 1 },
      })
    );
    expect(hass.callService).toHaveBeenLastCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness: 51,
      transition: 0.25,
    });

    rafSpy.mockRestore();
  });

  it('does not let a stale queued preview frame override a forced refresh', async () => {
    const queuedFrames: FrameRequestCallback[] = [];
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        queuedFrames.push(cb);
        return queuedFrames.length;
      });
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    // Drain any RAFs queued during mount (e.g. CurveScrubber.firstUpdated is-loaded class)
    queuedFrames.length = 0;
    const internal = card as unknown as CardInternals;
    internal._scrubberPosition = 20;
    internal._startPreview();
    expect(queuedFrames).toHaveLength(1);

    internal._scrubberPosition = 70;
    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    expect(queuedFrames).toHaveLength(2);

    queuedFrames[0](0);
    expect(hass.callService).not.toHaveBeenCalled();

    queuedFrames[1](16);
    expect(hass.callService).toHaveBeenCalledTimes(1);
    expect(hass.callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness: 179,
      transition: 0.25,
    });

    rafSpy.mockRestore();
  });
});

// ── Plan B orchestration-hardening coverage (autoplan 2026-06-22) ──
// Closes the orchestration test gaps the autoplan review identified: focus
// wiring, one-undo-per-drag, drag auto-select, card-level dirty bumps, the
// visibility↔selection interaction, preset-to-all, the long-press-remove reload
// (B1 guard), and the curve-dirty-state event edges (B12). Exercises the
// _commitCurveEdit / _completeDragMaybeReload / _storageEntityId helpers and
// the toggleCurveWithSelectionClear pure predicate.

const STORAGE_KEY = 'lightener:curve-card:v1:light.lightener';
function readStored(): { selectedCurveId: string | null; scrubberPosition: number | null } | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}
function fireGraph(card: LightenerCurveCard, event: string, detail: Record<string, unknown>) {
  const graph = card.renderRoot.querySelector('curve-graph')!;
  graph.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, composed: true }));
}

describe('lightener-curve-card — focus wiring (_onFocusCurve)', () => {
  it('selects an existing visible curve and persists it', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
      'light.b': { brightness: { '1': '1', '50': '60', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    fireGraph(card, 'focus-curve', { entityId: 'light.a' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBe('light.a');
    expect(readStored()?.selectedCurveId).toBe('light.a');
  });

  it('ignores a hidden curve', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
      'light.b': { brightness: { '1': '1', '50': '60', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    internal._curves = internal._curves.map((c) =>
      c.entityId === 'light.b' ? { ...c, visible: false } : c
    );
    await card.updateComplete;
    fireGraph(card, 'focus-curve', { entityId: 'light.b' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBeNull();
  });

  it('ignores an unknown entityId', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    fireGraph(card, 'focus-curve', { entityId: 'light.ghost' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBeNull();
  });

  it('re-focusing the already-selected curve keeps it selected (never toggles)', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    fireGraph(card, 'focus-curve', { entityId: 'light.a' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBe('light.a');
    fireGraph(card, 'focus-curve', { entityId: 'light.a' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBe('light.a');
  });
});

describe('lightener-curve-card — drag gesture orchestration (_onPointMove)', () => {
  it('pushes exactly one undo snapshot per drag gesture', async () => {
    const { card } = await mountCard({ 'light.a': { brightness: { '1': '1', '100': '100' } } });
    const internal = card as unknown as CardInternals;
    expect(internal._undoStack).toHaveLength(0);

    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 40, target: 40 },
      })
    );
    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 60, target: 60 },
      })
    );
    expect(internal._undoStack).toHaveLength(1);

    // End the gesture and start a new one — the next move snapshots again.
    internal._onPointDrop(new CustomEvent('point-drop'));
    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 70, target: 70 },
      })
    );
    expect(internal._undoStack).toHaveLength(2);
  });

  it('auto-selects the dragged curve and persists the selection', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
      'light.b': { brightness: { '1': '1', '50': '60', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    expect(internal._selectedCurveId).toBeNull();
    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 40, target: 40 },
      })
    );
    await card.updateComplete;
    expect(internal._selectedCurveId).toBe('light.a');
    expect(readStored()?.selectedCurveId).toBe('light.a');
  });

  it('does not re-persist the selection on later moves within the same gesture', async () => {
    const { card } = await mountCard({ 'light.a': { brightness: { '1': '1', '100': '100' } } });
    const internal = card as unknown as CardInternals;
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    try {
      internal._onPointMove(
        new CustomEvent('point-move', {
          detail: { curveIndex: 0, pointIndex: 1, lightener: 40, target: 40 },
        })
      );
      const afterFirst = setItem.mock.calls.length;
      expect(afterFirst).toBe(1); // auto-select wrote exactly once
      internal._onPointMove(
        new CustomEvent('point-move', {
          detail: { curveIndex: 0, pointIndex: 1, lightener: 60, target: 60 },
        })
      );
      expect(setItem.mock.calls.length).toBe(afterFirst); // already selected → no extra write
    } finally {
      setItem.mockRestore(); // restore even if an assertion throws — avoid cross-test leak
    }
  });

  it('point-drop resets drag flags and does not reload when curves are already loaded', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 40, target: 40 },
      })
    );
    expect(internal._dragActive).toBe(true);
    hass.callWS.mockClear();

    internal._onPointDrop(new CustomEvent('point-drop'));

    expect(internal._dragActive).toBe(false);
    // _load.loaded is true after mount, so _completeDragMaybeReload must NOT reload.
    expect(hass.callWS).not.toHaveBeenCalled();
  });
});

describe('lightener-curve-card — discrete edit bookkeeping (add/remove)', () => {
  it('point-add marks dirty and pushes an undo snapshot', async () => {
    const { card } = await mountCard({ 'light.a': { brightness: { '1': '1', '100': '100' } } });
    const internal = card as unknown as CardInternals;
    const dirty = internal._dirtyVersion;
    internal._onPointAdd(
      new CustomEvent('point-add', { detail: { entityId: 'light.a', lightener: 25, target: 30 } })
    );
    await card.updateComplete;
    expect(internal._dirtyVersion).toBe(dirty + 1);
    expect(internal._undoStack).toHaveLength(1);
    expect(internal._curves[0].controlPoints.some((p) => p.lightener === 25)).toBe(true);
  });

  it('point-remove marks dirty and pushes an undo snapshot', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const dirty = internal._dirtyVersion;
    const before = internal._curves[0].controlPoints.length;
    internal._onPointRemove(
      new CustomEvent('point-remove', { detail: { curveIndex: 0, pointIndex: 2 } })
    );
    await card.updateComplete;
    expect(internal._dirtyVersion).toBe(dirty + 1);
    expect(internal._undoStack).toHaveLength(1);
    expect(internal._curves[0].controlPoints.length).toBe(before - 1);
  });

  it('invalid point-add (duplicate x) is a no-op — no dirty, no undo', async () => {
    const { card } = await mountCard({ 'light.a': { brightness: { '1': '1', '100': '100' } } });
    const internal = card as unknown as CardInternals;
    const dirty = internal._dirtyVersion;
    internal._onPointAdd(
      new CustomEvent('point-add', { detail: { entityId: 'light.a', lightener: 1, target: 30 } })
    );
    await card.updateComplete;
    expect(internal._dirtyVersion).toBe(dirty);
    expect(internal._undoStack).toHaveLength(0);
  });

  it('long-press point-remove with no live load triggers a reload (B1 guard)', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    hass.callWS.mockReset();
    hass.callWS.mockResolvedValue({ entities: {} });
    internal._load = { ...internal._load, loaded: false };

    internal._onPointRemove(
      new CustomEvent('point-remove', { detail: { curveIndex: 0, pointIndex: 2 } })
    );
    await Promise.resolve(); // let _completeDragMaybeReload's async _tryLoadCurves dispatch

    expect(hass.callWS).toHaveBeenCalledWith({
      type: 'lightener/get_curves',
      entity_id: 'light.lightener',
    });
  });
});

describe('lightener-curve-card — visibility toggle (_onToggleCurve)', () => {
  it('toggling visibility does not dirty', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
      'light.b': { brightness: { '1': '1', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const dirty = internal._dirtyVersion;
    fireLegend(card, 'toggle-curve', { entityId: 'light.a' });
    await card.updateComplete;
    expect(internal._dirtyVersion).toBe(dirty);
  });

  it('hiding the selected curve clears the selection and persists null', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
      'light.b': { brightness: { '1': '1', '50': '60', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBe('light.a');
    fireLegend(card, 'toggle-curve', { entityId: 'light.a' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBeNull();
    expect(readStored()?.selectedCurveId).toBeNull();
  });

  it('toggling a non-selected curve leaves the selection intact', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
      'light.b': { brightness: { '1': '1', '50': '60', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    fireLegend(card, 'toggle-curve', { entityId: 'light.b' });
    await card.updateComplete;
    expect(internal._selectedCurveId).toBe('light.a');
  });
});

describe('lightener-curve-card — preset application (_applyPreset)', () => {
  const preset = {
    id: 'test',
    name: 'Test',
    description: 'test preset',
    controlPoints: [
      { lightener: 0, target: 0 },
      { lightener: 100, target: 50 },
    ],
  };

  it('does not apply a preset when no curve is selected', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
      'light.b': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const dirty = internal._dirtyVersion;
    const before = JSON.stringify(internal._curves);
    internal._presetGraphTrial = preset;
    expect(internal._selectedCurveId).toBeNull();
    internal._applyPreset(preset);
    await card.updateComplete;
    expect(internal._presetGraphTrial).toBeNull();
    expect(JSON.stringify(internal._curves)).toBe(before);
    expect(internal._dirtyVersion).toBe(dirty);
    expect(internal._undoStack).toHaveLength(0);
  });

  it('applies the preset only to the selected curve', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
      'light.b': { brightness: { '1': '5', '100': '80' } },
    });
    const internal = card as unknown as CardInternals;
    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    const bBefore = JSON.stringify(
      internal._curves.find((c) => c.entityId === 'light.b')!.controlPoints
    );
    internal._applyPreset(preset);
    await card.updateComplete;
    expect(internal._curves.find((c) => c.entityId === 'light.a')!.controlPoints).toEqual(
      preset.controlPoints
    );
    expect(
      JSON.stringify(internal._curves.find((c) => c.entityId === 'light.b')!.controlPoints)
    ).toBe(bBefore);
  });

  it('does not dirty when the selected curve is stale and no curve changes', async () => {
    const { card } = await mountCard({ 'light.a': { brightness: { '100': '100' } } });
    const internal = card as unknown as CardInternals;
    internal._selectedCurveId = 'light.ghost'; // selection points at a missing curve
    const dirty = internal._dirtyVersion;
    const before = JSON.stringify(internal._curves);
    internal._applyPreset(preset);
    await card.updateComplete;
    expect(JSON.stringify(internal._curves)).toBe(before); // curves genuinely unchanged
    expect(internal._dirtyVersion).toBe(dirty);
    expect(internal._undoStack).toHaveLength(0);
  });
});

describe('lightener-curve-card — dirty-state event edges (curve-dirty-state)', () => {
  it('emits dirty:true on an edit and dirty:false when curves return clean', async () => {
    const { card } = await mountCard({ 'light.a': { brightness: { '1': '1', '100': '100' } } });
    const internal = card as unknown as CardInternals;
    const dirtyEvents: boolean[] = [];
    card.addEventListener('curve-dirty-state', (e) =>
      dirtyEvents.push((e as CustomEvent).detail.dirty)
    );

    internal._onPointAdd(
      new CustomEvent('point-add', { detail: { entityId: 'light.a', lightener: 25, target: 30 } })
    );
    await card.updateComplete;
    expect(dirtyEvents.at(-1)).toBe(true);

    // Simulate the save/clean transition: sync the versions and reassign curves
    // to re-run updated(). The dirty boolean flips false and must re-emit.
    internal._cleanVersion = internal._dirtyVersion;
    internal._curves = [...internal._curves];
    await card.updateComplete;
    expect(dirtyEvents.at(-1)).toBe(false);
  });
});
