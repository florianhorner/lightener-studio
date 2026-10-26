import { UI } from './utils/strings.js';
import { previewSessions, PreviewSessionRegistry } from './utils/preview-session.js';
import { editorDrafts, type Scope } from './utils/editor-draft.js';
import { testSnapshot, testBackend, testLightService } from './test-guarded-backend.js';
// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LightenerCurveCard } from './lightener-curve-card.js';
import type { Hass, LightCurve } from './utils/types.js';
import type { LoadState } from './utils/load-lifecycle.js';
import type { SaveAction } from './utils/save-lifecycle.js';
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
  _membershipStatus: string | null;
  _membershipStatusTimer: number | null;
  _openMembershipEditor: () => void;
  _closeMembershipEditor: () => void;
  _onMembershipApplied: (event: CustomEvent) => void;
  _dispatchSave: (action: SaveAction) => void;
};

function forceDirty(card: LightenerCurveCard): void {
  const internal = card as unknown as CardInternals;
  internal._dirtyVersion++;
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

// Each test models a new document. Production has no registry reset/eviction.
beforeEach(() => Object.assign(previewSessions, new PreviewSessionRegistry()));

beforeAll(async () => {
  // jsdom has no top layer; built Chromium fixtures prove native modal focus/placement.
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
  const hass = {
    user: { is_admin: true, id: crypto.randomUUID() },
    callWS: vi.fn(testBackend({})),
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
  hass.callService.mockImplementation(testLightService(hass.states));
  return hass;
}

async function mountCard(
  initialEntities: Record<string, { brightness: Record<string, string> }>,
  hass?: Hass,
  firstRun = false
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
    (_hass.callWS as ReturnType<typeof vi.fn>).mockImplementation(testBackend(initialEntities));
  }
  const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
  card.setConfig({
    entity: 'light.lightener',
    firstRun,
    joy: { settle: false, diagonal: false, ripple: false, draw_in: false },
  });
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

function applyMembership(
  card: LightenerCurveCard,
  entities: Record<string, { brightness: Record<string, string> }>,
  addedEntityIds: string[] = []
): void {
  (card as unknown as CardInternals)._onMembershipApplied(
    new CustomEvent('membership-applied', {
      detail: {
        entities,
        added_entity_ids: addedEntityIds,
        removed_entity_ids: [],
      },
    })
  );
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
  const button = card.renderRoot.querySelector<HTMLButtonElement>(
    `.preset-option[data-preset="${presetId}"]`
  );
  expect(button, `button for ${presetId}`).not.toBeNull();
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

async function expectCoachTip(card: LightenerCurveCard, title: string | null): Promise<void> {
  await card.updateComplete;
  expect(card.renderRoot.querySelector('.coach-copy strong')?.textContent ?? null).toBe(title);
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
  it('opens the transactional Edit lights dialog and gates the graph until close', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    hass.callWS.mockReset();
    hass.callWS.mockResolvedValue({
      observed_controlled_entity_ids: ['light.a'],
      lights: [
        {
          entity_id: 'light.a',
          name: 'Alpha',
          available: true,
          area_id: null,
          area_name: null,
        },
      ],
    });
    const membershipStates: boolean[] = [];
    card.addEventListener('lightener-membership-state', (event) => {
      membershipStates.push((event as CustomEvent<{ open: boolean }>).detail.open);
    });

    fireLegend(card, 'edit-lights', {});
    await card.updateComplete;
    await Promise.resolve();
    expect(card.renderRoot.querySelector('light-membership-dialog')).not.toBeNull();
    expect(renderedGraph(card).readOnly).toBe(true);
    expect(hass.callWS).toHaveBeenCalledWith({
      type: 'lightener/list_candidate_lights',
      entity_id: 'light.lightener',
    });
    expect(membershipStates).toEqual([true]);

    card.renderRoot
      .querySelector('light-membership-dialog')!
      .dispatchEvent(new CustomEvent('membership-close', { bubbles: true, composed: true }));
    await card.updateComplete;
    expect(card.renderRoot.querySelector('light-membership-dialog')).toBeNull();
    expect(renderedGraph(card).readOnly).toBe(false);
    expect(membershipStates).toEqual([true, false]);
    const legend = card.renderRoot.querySelector('curve-legend') as unknown as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await legend.updateComplete;
    await Promise.resolve();
    // Edit lights lives in the Manage menu, which closed when it opened.
    expect(legend.shadowRoot?.activeElement).toBe(
      legend.shadowRoot?.querySelector('.manage-trigger')
    );
  });

  it.each(['card', 'legend'] as const)(
    'contains a rejected %s update while restoring focus after dialog close',
    async (rejectionSource) => {
      const { card } = await mountCard({
        'light.a': { brightness: { '100': '100' } },
      });
      const internal = card as unknown as CardInternals;
      internal._openMembershipEditor();
      await card.updateComplete;

      const failure = new Error(`${rejectionSource} update failed`);
      const diagnostic = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const unhandled = vi.fn();
      window.addEventListener('unhandledrejection', unhandled);

      const target =
        rejectionSource === 'card'
          ? card
          : (card.renderRoot.querySelector('curve-legend') as HTMLElement & {
              updateComplete: Promise<boolean>;
            });
      const updateSpy = vi
        .spyOn(target, 'updateComplete', 'get')
        .mockImplementation(() => Promise.reject(failure));

      internal._closeMembershipEditor();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(diagnostic).toHaveBeenCalledWith(
        '[Lightener] Could not restore focus after closing Edit lights:',
        failure
      );
      expect(unhandled).not.toHaveBeenCalled();

      updateSpy.mockRestore();
      diagnostic.mockRestore();
      window.removeEventListener('unhandledrejection', unhandled);
    }
  );

  it('does not restore background focus when Edit lights reopens during legend rendering', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    internal._openMembershipEditor();
    await card.updateComplete;

    const legend = card.renderRoot.querySelector('curve-legend') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    let resolveLegendUpdate!: (value: boolean) => void;
    const pendingLegendUpdate = new Promise<boolean>((resolve) => {
      resolveLegendUpdate = resolve;
    });
    const updateSpy = vi
      .spyOn(legend, 'updateComplete', 'get')
      .mockReturnValue(pendingLegendUpdate);

    internal._closeMembershipEditor();
    await vi.waitFor(() => expect(updateSpy).toHaveBeenCalled());

    internal._openMembershipEditor();
    await card.updateComplete;
    const reopenedDialog = card.renderRoot.querySelector('light-membership-dialog') as
      | (HTMLElement & { updateComplete: Promise<boolean> })
      | null;
    expect(reopenedDialog).not.toBeNull();
    await reopenedDialog!.updateComplete;
    await Promise.resolve();
    expect(card.shadowRoot?.activeElement).toBe(reopenedDialog);

    resolveLegendUpdate(true);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(card.renderRoot.querySelector('light-membership-dialog')).toBe(reopenedDialog);
    expect(card.shadowRoot?.activeElement).toBe(reopenedDialog);
    updateSpy.mockRestore();
  });

  it('selects the first newly added light from a confirmed batch response', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '70' } },
      'light.b': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    internal._selectedCurveId = 'light.a';
    hass.callWS.mockResolvedValue({
      observed_controlled_entity_ids: ['light.a', 'light.b'],
      lights: [],
    });

    fireLegend(card, 'edit-lights', {});
    await card.updateComplete;
    vi.useFakeTimers();
    applyMembership(
      card,
      {
        'light.a': { brightness: { '100': '70' } },
        'light.b': { brightness: { '100': '100' } },
        'light.new': { brightness: { '1': '1', '100': '100' } },
      },
      ['light.new']
    );
    await card.updateComplete;

    expect(internal._selectedCurveId).toBe('light.new');
    expect(card.dirty).toBe(false);
    expect(card.renderRoot.querySelector('light-membership-dialog')).toBeNull();
    expect(card.renderRoot.querySelector('.status-stack [role="status"]')?.textContent).toContain(
      'Lights updated.'
    );

    await vi.advanceTimersByTimeAsync(1999);
    await card.updateComplete;
    expect(card.renderRoot.querySelector('.status-stack [role="status"]')?.textContent).toContain(
      'Lights updated.'
    );

    await vi.advanceTimersByTimeAsync(1);
    await card.updateComplete;
    expect(card.renderRoot.querySelector('.status-stack [role="status"]')).toBeNull();
  });

  it('clears the membership status timer when the configured entity changes', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    vi.useFakeTimers();

    applyMembership(card, {
      'light.a': { brightness: { '100': '100' } },
    });
    await card.updateComplete;
    expect(internal._membershipStatusTimer).not.toBeNull();

    hass.callWS.mockResolvedValue(testSnapshot({}));
    card.setConfig({ entity: 'light.b' });
    await card.updateComplete;

    expect(internal._membershipStatus).toBeNull();
    expect(internal._membershipStatusTimer).toBeNull();
    expect(card.renderRoot.querySelector('.status-stack [role="status"]')).toBeNull();
  });

  it('clears the membership status timer when the editor reopens or the card disconnects', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    vi.useFakeTimers();

    applyMembership(card, {
      'light.a': { brightness: { '100': '100' } },
    });
    await card.updateComplete;
    expect(internal._membershipStatusTimer).not.toBeNull();

    internal._openMembershipEditor();
    await card.updateComplete;
    expect(internal._membershipStatus).toBeNull();
    expect(internal._membershipStatusTimer).toBeNull();

    applyMembership(card, {
      'light.a': { brightness: { '100': '100' } },
    });
    await card.updateComplete;
    expect(internal._membershipStatusTimer).not.toBeNull();

    card.remove();
    expect(internal._membershipStatus).toBeNull();
    expect(internal._membershipStatusTimer).toBeNull();
  });

  it('replaces membership confirmation with a later save success instead of stacking statuses', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    vi.useFakeTimers();

    applyMembership(card, {
      'light.a': { brightness: { '100': '100' } },
    });
    await card.updateComplete;
    expect(internal._membershipStatusTimer).not.toBeNull();

    internal._dispatchSave({ type: 'save-start' });
    await card.updateComplete;
    expect(internal._membershipStatus).toBeNull();
    expect(internal._membershipStatusTimer).toBeNull();
    expect(card.renderRoot.querySelector('.status-stack [role="status"]')).toBeNull();

    internal._dispatchSave({ type: 'save-success' });
    internal._dispatchSave({ type: 'save-confirmed' });
    await card.updateComplete;

    const statuses = card.renderRoot.querySelectorAll('.command-status [role="status"]');
    expect(statuses).toHaveLength(1);
    expect(statuses[0].textContent).toContain('Saved');
    expect(card.renderRoot.querySelector('.status-stack [role="status"]')).toBeNull();
    expect(internal._membershipStatus).toBeNull();
    expect(internal._membershipStatusTimer).toBeNull();
  });

  it('replaces an existing save success with membership confirmation', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    vi.useFakeTimers();

    internal._dispatchSave({ type: 'save-start' });
    internal._dispatchSave({ type: 'save-success' });
    internal._dispatchSave({ type: 'save-confirmed' });
    await card.updateComplete;
    expect(card.renderRoot.querySelector('.command-status [role="status"]')?.textContent).toContain(
      'Saved'
    );

    applyMembership(card, {
      'light.a': { brightness: { '100': '100' } },
    });
    await card.updateComplete;

    const statuses = card.renderRoot.querySelectorAll('.status-stack [role="status"]');
    expect(statuses).toHaveLength(1);
    expect(statuses[0].textContent).toContain('Lights updated.');
    expect(statuses[0].textContent).not.toContain('Saved successfully');
  });

  // A membership update must never make
  // a failed curve save look like it succeeded. The two banners describe two
  // different objects, so both stay — and the error keeps its Retry affordance.
  it('keeps an unacknowledged save error visible through a membership update', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    vi.useFakeTimers();

    internal._dispatchSave({ type: 'save-start' });
    internal._dispatchSave({ type: 'save-error', message: 'Save failed. Check connection.' });
    await card.updateComplete;
    expect(card.renderRoot.querySelector('.command-status [role="alert"]')?.textContent).toContain(
      'Save failed'
    );

    applyMembership(card, {
      'light.a': { brightness: { '100': '100' } },
    });
    await card.updateComplete;

    const error = card.renderRoot.querySelector('.command-status [role="alert"]');
    expect(error?.textContent).toContain('Save failed');
    expect(error?.querySelector('.command-retry')).not.toBeNull();
    const statuses = card.renderRoot.querySelectorAll('.status-stack [role="status"]');
    expect(statuses).toHaveLength(1);
    expect(statuses[0].textContent).toContain('Lights updated.');
  });

  it('uses reviewed copy on delete-group registry failure', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    hass.callWS.mockReset();
    hass.callWS.mockRejectedValueOnce({ code: 'boom', message: 'Nope!' });

    fireLegend(card, 'delete-group', {});
    await new Promise((r) => setTimeout(r, 0));
    await card.updateComplete;

    const err = card.renderRoot.querySelector('.side-rail .error');
    expect(err?.textContent).toContain('Could not delete group.');
    expect(err?.textContent).not.toContain('Nope!');
  });

  it('refuses to delete when the registry says the entity is not a Lightener group', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    hass.callWS.mockReset();
    hass.callWS.mockResolvedValueOnce({ platform: 'hue', config_entry_id: 'abc123' });

    fireLegend(card, 'delete-group', {});
    await new Promise((r) => setTimeout(r, 0));
    await card.updateComplete;

    // The guard must fire before the irreversible DELETE, not after it.
    expect(hass.callApi).not.toHaveBeenCalled();
    const err = card.renderRoot.querySelector('.side-rail .error');
    expect(err?.textContent).toContain('not a Lightener Studio group');
  });

  it('refuses to delete when the group is not backed by a config entry', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    hass.callWS.mockReset();
    hass.callWS.mockResolvedValueOnce({ platform: 'lightener_studio', config_entry_id: null });

    fireLegend(card, 'delete-group', {});
    await new Promise((r) => setTimeout(r, 0));
    await card.updateComplete;

    expect(hass.callApi).not.toHaveBeenCalled();
    const err = card.renderRoot.querySelector('.side-rail .error');
    expect(err?.textContent).toContain(UI.legend.deleteMissingEntry);
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
    // One quiet line; the light list and context line carry the next step.
    expect(insight?.textContent?.trim()).toBe('2 lights match the group brightness');
    expect(insight?.querySelector('.graph-insight-secondary')).toBeNull();
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
    expect(insight?.textContent).not.toContain('1 light still shares this shape.');
    // The context line names the light, so the workbench line is set aside.
    expect(card.renderRoot.querySelector('.graph-workbench')?.classList).toContain('has-selection');
    expect(card.renderRoot.querySelector('.context-name')?.textContent?.trim()).toBe('Alpha');
  });

  it('keeps the side rail reserved for the light list before a light is selected', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });

    const sideRail = card.renderRoot.querySelector('.side-rail');
    expect(sideRail).not.toBeNull();
    expect(sideRail!.firstElementChild?.tagName.toLowerCase()).toBe('curve-legend');
    expect(card.renderRoot.querySelector('.presets-panel')).toBeNull();
    // The workbench stays mounted with a height-reserving placeholder so the
    // graph never shifts when a light is (de)selected — but no interactive
    // chip bar is present until a light is selected.
    expect(card.renderRoot.querySelector('.shape-chip-reserve')).not.toBeNull();
    expect(card.renderRoot.querySelector('.shape-chip-bar')).toBeNull();
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
        platform: 'lightener_studio',
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

describe('lightener-curve-card — first-run coaching', () => {
  it('selects the first light and runs one display-only shape shimmer pass', async () => {
    vi.useFakeTimers();
    const { card, hass } = await mountCard(
      {
        'light.a': { brightness: { '1': '1', '50': '50', '100': '100' } },
        'light.b': { brightness: { '1': '1', '50': '50', '100': '100' } },
      },
      undefined,
      true
    );
    const internal = card as unknown as CardInternals;

    expect(internal._selectedCurveId).toBe('light.a');
    expect(card.renderRoot.textContent).toContain('Dim a bright light');
    expect(internal._presetGraphTrial?.id).toBe('dim_accent');
    expect(card.dirty).toBe(false);

    // Synthetic focus is not a trusted user interruption.
    card.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(1350);
    expect(internal._presetGraphTrial?.id).toBe('late_starter');
    await vi.advanceTimersByTimeAsync(1350);
    expect(internal._presetGraphTrial?.id).toBe('early_starter');
    await vi.advanceTimersByTimeAsync(1350);
    expect(internal._presetGraphTrial).toBeNull();
    expect(card.dirty).toBe(false);
    expect(internal._undoStack).toHaveLength(0);
    expect(hass.callService).not.toHaveBeenCalled();
    expect(
      hass.callWS.mock.calls.filter(
        ([message]) => (message as { type?: string }).type === 'lightener/save_curves'
      )
    ).toHaveLength(0);
  });

  it('offers saving after either a starting shape or a direct graph edit', async () => {
    const { card, hass } = await mountCard(
      { 'light.a': { brightness: { '1': '1', '50': '50', '100': '100' } } },
      undefined,
      true
    );
    presetButton(card, 'linear').click();
    await card.updateComplete;
    expect(card.dirty).toBe(false);
    await expectCoachTip(card, 'Dim a bright light');

    presetButton(card, 'dim_accent').click();
    await card.updateComplete;
    await expectCoachTip(card, 'Ready to save');
    expect(card.renderRoot.textContent).toContain('Ready to save');
    expect(card.renderRoot.textContent).toContain('Save now, or try “Watch room react” first.');

    renderedGraph(card).dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 2, lightener: 45, target: 24 },
        bubbles: true,
        composed: true,
      })
    );
    await card.updateComplete;
    await expectCoachTip(card, 'Ready to save');
    expect(card.renderRoot.querySelector('.coach-prompt')).not.toBeNull();
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('offers help on ordinary entry without auto-replaying guidance or changing the room', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '45' } },
    });
    expect(card.renderRoot.querySelector('.coach-prompt')).toBeNull();
    const help = card.renderRoot.querySelector<HTMLButtonElement>('.coach-help')!;
    expect(help.getAttribute('aria-expanded')).toBe('false');
    help.click();
    await card.updateComplete;
    expect(card.renderRoot.textContent).toContain('Dim a bright light');
    expect(help.getAttribute('aria-expanded')).toBe('true');
    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect((card as unknown as CardInternals)._presetGraphTrial).toBeNull();
    card.renderRoot.querySelector<HTMLButtonElement>('.coach-dismiss')!.click();
    await card.updateComplete;
    expect(card.renderRoot.querySelector('.coach-prompt')).toBeNull();
    expect((card.renderRoot as ShadowRoot).activeElement).toBe(help);
    help.click();
    await card.updateComplete;
    expect(card.renderRoot.querySelector('.coach-prompt')).not.toBeNull();
    expect(card.dirty).toBe(false);
    expect(hass.callService).not.toHaveBeenCalled();
    expect(hass.callWS.mock.calls.every(([msg]) => msg.type === 'lightener/get_curves')).toBe(true);
  });

  it('keeps help through a failed save and finishes only after confirmation, without preview', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    card.renderRoot.querySelector<HTMLButtonElement>('.coach-help')!.click();
    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    presetButton(card, 'dim_accent').click();
    await card.updateComplete;
    const internal = card as unknown as CardInternals;
    hass.callWS.mockReset();
    hass.callWS.mockRejectedValueOnce({ code: 'invalid_format' });
    expect(await internal._onSave()).toBe(false);
    await card.updateComplete;
    await expectCoachTip(card, 'Ready to save');
    expect(card.dirty).toBe(true);

    let confirm!: (value: unknown) => void;
    const reload = new Promise((resolve) => {
      confirm = resolve;
    });
    hass.callWS.mockImplementation(() => reload);
    const saving = internal._onSave();
    await Promise.resolve();
    expect(card.renderRoot.textContent).not.toContain('Shape saved');
    confirm({
      ...testSnapshot({
        'light.a': { brightness: { '1': '1', '25': '8', '50': '20', '100': '45' } },
      }),
      status: 'saved',
    });
    expect(await saving).toBe(true);
    await card.updateComplete;
    await expectCoachTip(card, 'Shape saved');
    expect(card.renderRoot.textContent).toContain('Shape saved');
    expect(card.renderRoot.textContent).toContain('Adjust group brightness in Home Assistant.');
    expect(card.dirty).toBe(false);
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('offers saving after a direct graph edit without choosing a starting shape', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    card.renderRoot.querySelector<HTMLButtonElement>('.coach-help')!.click();
    renderedGraph(card).dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 2, lightener: 100, target: 45 },
        bubbles: true,
        composed: true,
      })
    );
    await card.updateComplete;
    await expectCoachTip(card, 'Ready to save');
    expect(card.renderRoot.textContent).toContain('Ready to save');
    expect(card.dirty).toBe(true);
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it('does not offer editing guidance to a non-admin', async () => {
    const hass = makeHass({ user: { is_admin: false } });
    hass.callWS.mockResolvedValue(testSnapshot({ 'light.a': { brightness: { '100': '100' } } }));
    const { card } = await mountCard({}, hass);
    card.setConfig({ entity: 'light.lightener', firstRun: true });
    await card.updateComplete;
    expect(card.renderRoot.querySelector('.coach-help')).toBeNull();
    expect(card.renderRoot.querySelector('.coach-prompt')).toBeNull();
  });

  describe.each([
    { entry: 'ordinary tips', firstRun: false },
    { entry: 'first-run guidance', firstRun: true },
  ])('$entry', ({ firstRun }) => {
    const entities = {
      'light.a': { brightness: { '1': '1', '100': '100' } },
      'light.b': { brightness: { '1': '1', '100': '100' } },
    };

    async function mountWithSecondLightSelected() {
      const { card, hass } = await mountCard(entities, undefined, firstRun);
      if (!firstRun) card.renderRoot.querySelector<HTMLButtonElement>('.coach-help')!.click();
      fireLegend(card, 'select-curve', { entityId: 'light.b' });
      await card.updateComplete;
      const internal = card as unknown as CardInternals;
      expect(internal._selectedCurveId).toBe('light.b');
      return { card, hass, internal };
    }

    it.each([undefined, 'light.b', null])(
      'initial hydration respects stored selection %s',
      async (selectedCurveId) => {
        if (selectedCurveId !== undefined) {
          sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ selectedCurveId, scrubberPosition: null })
          );
        }
        const { card } = await mountCard(entities, undefined, firstRun);
        const internal = card as unknown as CardInternals;
        const expected =
          selectedCurveId === undefined ? (firstRun ? 'light.a' : null) : selectedCurveId;
        expect(internal._selectedCurveId).toBe(expected);
        if (selectedCurveId !== undefined || firstRun) {
          expect(readStored()?.selectedCurveId).toBe(expected);
        }
        if (firstRun && expected) expect(internal._presetGraphTrial?.id).toBe('dim_accent');
      }
    );

    it.each([false, true])(
      'keeps the user choice made during a reload (deselect=%s)',
      async (deselect) => {
        const { card, hass } = await mountCard(entities, undefined, firstRun);
        const internal = card as unknown as CardInternals;
        let resolve!: (value: unknown) => void;
        hass.callWS.mockReturnValueOnce(
          new Promise((done) => {
            resolve = done;
          })
        );
        internal._load = { ...internal._load, loaded: false };
        const loading = internal._tryLoadCurves();
        fireLegend(card, 'select-curve', { entityId: 'light.b' });
        if (deselect) fireLegend(card, 'select-curve', { entityId: 'light.b' });
        resolve({ entities });
        await loading;
        await card.updateComplete;
        expect(internal._selectedCurveId).toBe(deselect ? null : 'light.b');
        expect(readStored()?.selectedCurveId).toBe(deselect ? null : 'light.b');
      }
    );

    it('keeps an initial in-flight deselection when session storage is blocked', async () => {
      const hass = makeHass();
      let resolve!: (value: unknown) => void;
      hass.callWS.mockReturnValueOnce(
        new Promise((done) => {
          resolve = done;
        })
      );
      const { card } = await mountCard({}, hass, firstRun);
      const internal = card as unknown as CardInternals;
      const selectedId = internal._curves[1].entityId;
      const blockedStorage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Storage unavailable', 'SecurityError');
      });
      try {
        fireLegend(card, 'select-curve', { entityId: selectedId });
        fireLegend(card, 'select-curve', { entityId: selectedId });
        resolve({ entities });
        await vi.waitFor(() => expect(internal._load.loading).toBe(false));
        expect(internal._selectedCurveId).toBeNull();
        expect(readStored()).toBeNull();
      } finally {
        blockedStorage.mockRestore();
      }
    });

    it('waits for members before initial selection and resets hydration for another group', async () => {
      const { card, hass } = await mountCard({}, undefined, firstRun);
      const internal = card as unknown as CardInternals;
      expect(internal._selectedCurveId).toBeNull();
      hass.callWS.mockResolvedValue({ entities });
      internal._load = { ...internal._load, loaded: false };
      await internal._tryLoadCurves();
      await card.updateComplete;
      expect(internal._selectedCurveId).toBe(firstRun ? 'light.a' : null);

      fireLegend(card, 'select-curve', { entityId: 'light.b' });
      card.setConfig({ entity: 'light.other_group', firstRun });
      await card.updateComplete;
      await Promise.resolve();
      expect(internal._selectedCurveId).toBe(firstRun ? 'light.a' : null);
      expect(readStored()?.selectedCurveId).toBe('light.b');
    });

    it.each(['_undo', '_onCancel'] as const)(
      '%s restores the clean guide with the appropriate selection',
      async (action) => {
        const { card, hass, internal } = await mountWithSecondLightSelected();
        presetButton(card, 'dim_accent').click();
        await expectCoachTip(card, 'Ready to save');
        const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
          cb(performance.now() + 301);
          return 1;
        });
        try {
          internal[action]();
          await card.updateComplete;
          expect(card.dirty).toBe(false);
          await expectCoachTip(card, 'Dim a bright light');
          expect(internal._selectedCurveId).toBe(
            action === '_undo' ? 'light.b' : firstRun ? 'light.a' : null
          );
          expect(hass.callService).not.toHaveBeenCalled();
          expect(hass.callWS.mock.calls.every(([msg]) => msg.type === 'lightener/get_curves')).toBe(
            true
          );
        } finally {
          raf.mockRestore();
        }
      }
    );

    it.each(['reload', 'reconnect'])('%s preserves the selected light', async (action) => {
      const { card, hass, internal } = await mountWithSecondLightSelected();
      hass.callWS.mockClear();
      if (action === 'reload') {
        internal._load = { ...internal._load, loaded: false };
        await internal._tryLoadCurves();
      } else {
        card.remove();
        document.body.appendChild(card);
        await card.updateComplete;
        await Promise.resolve();
      }
      await card.updateComplete;
      expect(hass.callWS).toHaveBeenCalledTimes(1);
      expect(internal._selectedCurveId).toBe('light.b');
      expect(readStored()?.selectedCurveId).toBe('light.b');
      expect(card.dirty).toBe(false);
      expect(hass.callService).not.toHaveBeenCalled();
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
    hass.callWS.mockResolvedValue(testSnapshot({}));
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
    hass.callWS.mockResolvedValueOnce(
      testSnapshot({ 'light.b': { brightness: { '1': '5', '100': '10' } } })
    );

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

    hass.callWS.mockResolvedValueOnce(
      testSnapshot({ 'light.b': { brightness: { '1': '5', '100': '10' } } })
    );
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

    hass.callWS.mockResolvedValueOnce(
      testSnapshot({ 'light.b': { brightness: { '1': '5', '100': '10' } } })
    );
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

  it('a validated receipt fences an older in-flight load without a confirming reread', async () => {
    const initial = { 'light.a': { brightness: { '1': '1', '100': '100' } } };
    const { card, hass } = await mountCard(initial);
    const internal = card as unknown as CardInternals;
    let resolveStale!: (value: unknown) => void;
    hass.callWS.mockImplementation((msg: Record<string, unknown>) =>
      msg.type === 'lightener/get_curves'
        ? new Promise((resolve) => {
            resolveStale = resolve;
          })
        : testBackend(initial)(msg)
    );
    internal._load = { ...internal._load, loaded: false };
    const staleLoad = internal._tryLoadCurves();
    forceDirty(card);
    expect(await internal._onSave()).toBe(true);
    const saved = structuredClone(internal._curves);
    resolveStale(testSnapshot({ 'light.stale': { brightness: { '100': '20' } } }));
    await staleLoad;
    expect(internal._curves).toEqual(saved);
    expect(card.dirty).toBe(false);
    expect(
      hass.callWS.mock.calls.filter(([msg]) => msg.type === 'lightener/get_curves')
    ).toHaveLength(2); // initial and deliberately old read
  });

  it('discards a save whose entity changed while the websocket call was in flight', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    forceDirty(card);
    internal._undoStack = [internal._curves];

    let resolveSave: (value: unknown) => void = () => {};
    hass.callWS.mockReset();
    hass.callWS.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );
    hass.callWS.mockResolvedValue(testSnapshot({}));

    const actions: string[] = [];
    const realDispatch = internal._dispatchSave.bind(internal);
    vi.spyOn(internal, '_dispatchSave').mockImplementation((action) => {
      actions.push(action.type);
      realDispatch(action);
    });

    const savePromise = internal._onSave();
    await Promise.resolve();

    // Lovelace repoints the card at another group before the save comes back.
    card.setConfig({ entity: 'light.other' });
    resolveSave(undefined);

    await expect(savePromise).resolves.toBe(false);
    // The old entity's result must not be reported as this entity's success,
    // and its undo history must not survive a switch-back.
    expect(actions).toContain('reset');
    expect(actions).not.toContain('save-success');
    expect(internal._undoStack).toEqual([]);
  });

  it('clears stale undo history when switching entities with unsaved edits', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    const graph = card.renderRoot.querySelector('curve-graph')!;

    card.renderRoot.querySelector<HTMLButtonElement>('.coach-help')!.click();

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
    await expectCoachTip(card, 'Ready to save');

    hass.callWS.mockResolvedValueOnce(
      testSnapshot({ 'light.b': { brightness: { '1': '5', '100': '10' } } })
    );
    card.setConfig({ entity: 'light.lightener_two' });

    expect(card.dirty).toBe(false);
    expect(internal._selectedCurveId).toBeNull();
    expect(internal._undoStack).toHaveLength(0);
    await expectCoachTip(card, null);
  });

  it('_onSave dispatches lightener/save_curves with the current curves payload', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '100': '100' } },
    });
    hass.callWS.mockReset();
    hass.callWS.mockImplementation((msg: { type: string }) =>
      msg.type === 'lightener/save_curves'
        ? Promise.resolve(undefined)
        : Promise.resolve(testSnapshot({ 'light.a': { brightness: { '100': '100' } } }))
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
    expect(view._saveError).toBe('Save outcome unknown. Check saved state before trying again.');
  });

  it('retains draft and history on a stuck receipt, and ignores the late receipt', async () => {
    vi.useFakeTimers();
    const { card, hass } = await mountCard({ 'light.a': { brightness: { '100': '100' } } });
    const internal = card as unknown as CardInternals;
    forceDirty(card);
    const before = structuredClone(internal._curves);
    internal._undoStack = [structuredClone(internal._curves)];
    const history = structuredClone(internal._undoStack);
    let finish!: (value: unknown) => void;
    hass.callWS.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const pending = internal._onSave();
    await vi.advanceTimersByTimeAsync(8000);
    expect(await pending).toBe(false);
    expect(card.dirty).toBe(true);
    expect(internal._undoStack).toEqual(history);
    finish({
      ...testSnapshot({ 'light.a': { brightness: { '75': '90', '100': '100' } } }),
      status: 'saved',
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(internal._curves).toEqual(before);
    expect(card.dirty).toBe(true);
    expect(
      hass.callWS.mock.calls.filter(([msg]) => msg.type === 'lightener/save_curves')
    ).toHaveLength(1);
  });

  it('a timed-out write cannot be retried or confirmed by a late response', async () => {
    vi.useFakeTimers();
    const { card, hass } = await mountCard({ 'light.a': { brightness: { '100': '100' } } });
    const internal = card as unknown as CardInternals;
    let finish!: (value: unknown) => void;
    hass.callWS.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    forceDirty(card);
    const first = internal._onSave();
    await vi.advanceTimersByTimeAsync(8000);
    expect(await first).toBe(false);
    forceDirty(card);
    expect(await internal._onSave()).toBe(false);
    finish({
      ...testSnapshot({ 'light.a': { brightness: { '75': '90', '100': '100' } } }),
      status: 'saved',
    });
    await Promise.resolve();
    await Promise.resolve();
    expect((card as unknown as { _saveState: { phase: string } })._saveState.phase).toBe('error');
    expect(card.dirty).toBe(true);
    expect(
      hass.callWS.mock.calls.filter(([msg]) => msg.type === 'lightener/save_curves')
    ).toHaveLength(1);
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
    hass.callWS.mockImplementation(() => neverConfirmingReload);

    forceDirty(card);
    const savePromise = internal._onSave();
    await Promise.resolve();
    await card.updateComplete;
    expect(view._saveState.phase).toBe('saving');

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
    { lightener: 50, target: 50 },
    { lightener: 100, target: 100 },
  ];

  function freshEntities(count: number): Record<string, { brightness: Record<string, string> }> {
    return Object.fromEntries(
      Array.from({ length: count }, (_, idx) => [
        `light.${String.fromCharCode(97 + idx)}`,
        { brightness: { '1': '1', '50': '50', '100': '100' } },
      ])
    );
  }

  it('does not render selected-light shape chips until a light is selected', async () => {
    const { card } = await mountCard(freshEntities(2));
    const internal = card as unknown as CardInternals;

    expect(card.renderRoot.querySelector('.presets-btn')).toBeNull();
    expect(card.renderRoot.querySelector('.presets-panel')).toBeNull();
    // The workbench stays mounted with a height-reserving placeholder so the
    // graph never shifts when a light is (de)selected — but no interactive
    // chip bar is present until a light is selected.
    expect(card.renderRoot.querySelector('.shape-chip-reserve')).not.toBeNull();
    expect(card.renderRoot.querySelector('.shape-chip-bar')).toBeNull();
    expect(card.renderRoot.querySelector('.preset-option')).toBeNull();
    expect(
      card.renderRoot.querySelector('.side-rail')?.firstElementChild?.tagName.toLowerCase()
    ).toBe('curve-legend');
    expect(internal._selectedCurveId).toBeNull();
    expect(internal._presetGraphTrial).toBeNull();
    expect(renderedGraph(card).previewCurve).toBeNull();
    expect(renderedGraph(card).curves.map((curve) => curve.controlPoints)).toEqual([
      linearDefaultPoints,
      linearDefaultPoints,
    ]);
  });

  it('reveals compact graph-header shape chips for the selected light only', async () => {
    const { card } = await mountCard(freshEntities(2));

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;

    const workbench = card.renderRoot.querySelector('.graph-workbench');
    const chipBar = card.renderRoot.querySelector('.shape-chip-bar');
    expect(workbench).not.toBeNull();
    expect(chipBar).not.toBeNull();
    expect(workbench?.contains(chipBar)).toBe(true);
    expect(card.renderRoot.querySelectorAll('.preset-option')).toHaveLength(CURVE_PRESETS.length);
    expect(card.renderRoot.querySelectorAll('.shape-chip-spark')).toHaveLength(
      CURVE_PRESETS.length
    );
    expect(card.renderRoot.querySelector('.presets-panel')).toBeNull();
    expect(
      card.renderRoot.querySelector('.side-rail')?.firstElementChild?.tagName.toLowerCase()
    ).toBe('curve-legend');
    expect(chipBar?.textContent).toContain('Equal');
    expect(chipBar?.textContent).toContain('Dim');
    expect(chipBar?.textContent).toContain('Late');
    expect(chipBar?.textContent).toContain('Early');
    expect(chipBar?.textContent).not.toContain('Equal brightness');
    expect(chipBar?.textContent).not.toContain('Rises gently');
    expect(chipBar?.textContent).not.toContain('Pick a starting shape');
    expect(presetButton(card, 'dim_accent').hasAttribute('title')).toBe(false);
    expect(presetButton(card, 'linear').getAttribute('aria-current')).toBe('true');
  });

  it('hovering a shape shows a graph-only shimmer for the selected light', async () => {
    const { card, hass } = await mountCard(freshEntities(2));
    const internal = card as unknown as CardInternals;
    const earlyStarter = CURVE_PRESETS.find((p) => p.id === 'early_starter')!;
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
    presetButton(card, 'early_starter').dispatchEvent(enter);
    await card.updateComplete;

    expect(internal._presetGraphTrial?.id).toBe('early_starter');
    expect(events).toEqual(['early_starter']);
    expect(renderedGraph(card).previewCurve).toMatchObject({
      entityId: 'light.a',
      friendlyName: 'Alpha',
      controlPoints: earlyStarter.controlPoints,
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
      `Trying ${earlyStarter.name}`
    );
    expect(card.renderRoot.querySelector('.graph-insight')?.textContent).not.toContain(
      'Choose it to shape Alpha.'
    );
    expect(presetButton(card, 'early_starter').classList.contains('trial')).toBe(true);
    expect(presetButton(card, 'early_starter').getAttribute('aria-current')).toBe('true');

    presetButton(card, 'early_starter').dispatchEvent(new Event('pointerleave'));
    await card.updateComplete;

    expect(internal._presetGraphTrial).toBeNull();
    expect(events).toEqual(['early_starter', null]);
    expect(renderedGraph(card).previewCurve).toBeNull();
  });

  it('suppresses touch hover but still supports later keyboard focus', async () => {
    const { card } = await mountCard(freshEntities(2));
    const internal = card as unknown as CardInternals;

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    const button = presetButton(card, 'early_starter');

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
    expect(internal._presetGraphTrial?.id).toBe('early_starter');
    expect(renderedGraph(card).previewCurve?.entityId).toBe('light.a');
  });

  it('clicking a shape applies it to the selected light and keeps the chip toolbar visible', async () => {
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
    expect(card.renderRoot.querySelector('.shape-chip-bar')).not.toBeNull();
    expect(card.renderRoot.querySelectorAll('.preset-option')).toHaveLength(CURVE_PRESETS.length);
    expect(presetButton(card, 'dim_accent').getAttribute('aria-current')).toBe('true');
    expect(readStored()?.selectedCurveId).toBe('light.a');
  });

  it('deselecting the light hides shape buttons and clears a temporary shimmer', async () => {
    const { card } = await mountCard(freshEntities(2));
    const internal = card as unknown as CardInternals;

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    presetButton(card, 'early_starter').dispatchEvent(new Event('focus'));
    await card.updateComplete;
    expect(renderedGraph(card).previewCurve?.entityId).toBe('light.a');

    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;

    expect(internal._selectedCurveId).toBeNull();
    expect(internal._presetGraphTrial).toBeNull();
    expect(renderedGraph(card).previewCurve).toBeNull();
    expect(card.renderRoot.querySelector('.presets-panel')).toBeNull();
    expect(card.renderRoot.querySelector('.shape-chip-bar')).toBeNull();
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

  // ── Selection state contract ───────────────────────────────────────
  // Selection controls instruction visibility, stroke, fill, and clear-edit behavior.

  it('keeps populated graph free of persistent instruction text', async () => {
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

  it('selected curve has solid stroke; unselected curves are dashed', async () => {
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

  it('only the selected curve renders a filled area; others are line-only', async () => {
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

  it('activating the selected light row toggles the selection off', async () => {
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
    const selectBtn = legend.shadowRoot?.querySelector<HTMLButtonElement>('.row-select-btn');
    expect(selectBtn).not.toBeNull();

    let dispatched: CustomEvent | null = null;
    card.addEventListener('select-curve', (e) => {
      dispatched = e as CustomEvent;
    });
    selectBtn!.click();
    await card.updateComplete;

    expect(
      dispatched,
      'activating the selected row must dispatch a select-curve event'
    ).not.toBeNull();
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
  it('keeps the enabled Save label after starting preview on a dirty card', async () => {
    const { card } = await mountCard({
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    presetButton(card, 'dim_accent').click();
    await card.updateComplete;
    expect(card.dirty).toBe(true);

    const scrubber = card.renderRoot.querySelector('curve-scrubber')!;
    scrubber.dispatchEvent(new CustomEvent('preview-toggle', { bubbles: true, composed: true }));
    await card.updateComplete;
    await scrubber.updateComplete;
    expect(scrubber.previewActive).toBe(true);

    const footer = card.renderRoot.querySelector('curve-footer')!;
    await footer.updateComplete;
    const save = footer.renderRoot.querySelector<HTMLButtonElement>('.btn-save')!;
    expect(save.textContent?.trim()).toBe('Save');
    expect(save.disabled).toBe(false);
  });

  it('keeps selection output-neutral after an off-coordinate edit during preview', async () => {
    const rafSpy = mockImmediateRaf();
    try {
      const { card, hass } = await mountCard({
        'light.a': { brightness: { '1': '1', '100': '100' } },
        'light.b': { brightness: { '1': '1', '100': '100' } },
      });
      const internal = card as unknown as CardInternals;
      internal._scrubberPosition = 50;
      internal._startPreview();
      await Promise.resolve();
      await Promise.resolve();
      internal._lastPreviewTime = -1000;
      internal._onPointMove(
        new CustomEvent('point-move', {
          detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 80 },
        })
      );
      internal._onPointDrop(new CustomEvent('point-drop'));
      expect(hass.callService).toHaveBeenLastCalledWith(
        'light',
        'turn_on',
        {
          entity_id: 'light.a',
          brightness: 204,
          transition: 0.25,
        },
        undefined,
        false
      );
      const before = {
        curves: structuredClone(internal._curves),
        room: internal._scrubberPosition,
        dirty: internal._dirtyVersion,
        undo: internal._undoStack.length,
      };
      hass.callService.mockClear();
      hass.callWS.mockClear();
      for (const [event, entityId, selected] of [
        ['select-curve', 'light.b', 'light.b'],
        ['select-curve', 'light.b', null],
        ['focus-curve', 'light.a', 'light.a'],
        ['focus-curve', 'light.a', 'light.a'],
      ] as const) {
        fireLegend(card, event, { entityId });
        await card.updateComplete;
        expect(internal._selectedCurveId).toBe(selected);
        expect({
          curves: internal._curves,
          room: internal._scrubberPosition,
          dirty: internal._dirtyVersion,
          undo: internal._undoStack.length,
        }).toEqual(before);
        expect(hass.callService).not.toHaveBeenCalled();
        expect(hass.callWS).not.toHaveBeenCalled();
      }
    } finally {
      rafSpy.mockRestore();
    }
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
    await Promise.resolve();
    await Promise.resolve();

    // Drag light.a's endpoint up to 80% — the bulb tracks to 204, and the undo
    // stack records the pre-drag (identity) curve.
    internal._lastPreviewTime = 0;
    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 80 },
      })
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(hass.callService).toHaveBeenLastCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 204,
        transition: 0.25,
      },
      undefined,
      false
    );
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
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 128,
        transition: 0.25,
      },
      undefined,
      false
    );
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
    await Promise.resolve();
    await Promise.resolve();
    hass.callService.mockClear();
    internal._lastPreviewTime = 0;

    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 80 },
      })
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(hass.callService).toHaveBeenCalledTimes(1);
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 204,
        transition: 0.25,
      },
      undefined,
      false
    );

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
    internal._startPreview();
    await Promise.resolve();
    await Promise.resolve(); // both lights land at 128
    hass.callService.mockClear();
    internal._lastPreviewTime = 0;

    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 80 },
      })
    );
    await Promise.resolve();
    await Promise.resolve();

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
    await Promise.resolve();
    await Promise.resolve();
    hass.callService.mockClear();
    internal._lastPreviewTime = 0;

    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 0 },
      })
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(hass.callService).toHaveBeenCalledTimes(1);
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_off',
      {
        entity_id: 'light.a',
        transition: 0.25,
      },
      undefined,
      false
    );

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
    await Promise.resolve();
    await Promise.resolve();
    hass.callService.mockClear();

    // Drag to 0 -> off.
    internal._lastPreviewTime = 0;
    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 0 },
      })
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(hass.callService).toHaveBeenLastCalledWith(
      'light',
      'turn_off',
      {
        entity_id: 'light.a',
        transition: 0.25,
      },
      undefined,
      false
    );

    // Drag back up to 60% -> on at 153.
    internal._lastPreviewTime = 0;
    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 60 },
      })
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(hass.callService).toHaveBeenLastCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 153,
        transition: 0.25,
      },
      undefined,
      false
    );

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
    await Promise.resolve();
    await Promise.resolve();
    hass.callService.mockClear();
    internal._lastPreviewTime = 0;

    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 0, lightener: 0, target: 25 },
      })
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(hass.callService).toHaveBeenCalledTimes(1);
    expect(hass.callService).toHaveBeenLastCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 64,
        transition: 0.25,
      },
      undefined,
      false
    );

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
    await Promise.resolve();
    await Promise.resolve();
    hass.callService.mockClear();
    internal._lastPreviewTime = 0;

    internal._onPointMove(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 80 },
      })
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(hass.callService).toHaveBeenLastCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 204,
        transition: 0.25,
      },
      undefined,
      false
    );

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
    await Promise.resolve();
    await Promise.resolve();
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
    expect(hass.callService).toHaveBeenLastCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 51,
        transition: 0.25,
      },
      undefined,
      false
    );

    hass.callService.mockClear();
    internal._onPointAdd(
      new CustomEvent('point-add', {
        detail: { entityId: 'light.a', lightener: 50, target: 80 },
      })
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(hass.callService).toHaveBeenLastCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 204,
        transition: 0.25,
      },
      undefined,
      false
    );

    hass.callService.mockClear();
    internal._onPointRemove(
      new CustomEvent('point-remove', {
        detail: { curveIndex: 0, pointIndex: 1 },
      })
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(hass.callService).toHaveBeenLastCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 51,
        transition: 0.25,
      },
      undefined,
      false
    );

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
    await Promise.resolve();
    await Promise.resolve();
    expect(queuedFrames).toHaveLength(1);

    internal._scrubberPosition = 70;
    // A discrete edit refreshes output; selection is deliberately output-neutral.
    internal._onPointAdd(
      new CustomEvent('point-add', {
        detail: { entityId: 'light.a', lightener: 70, target: 70 },
      })
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(queuedFrames).toHaveLength(2);

    queuedFrames[0](0);
    expect(hass.callService).not.toHaveBeenCalled();

    queuedFrames[1](16);
    expect(hass.callService).toHaveBeenCalledTimes(1);
    expect(hass.callService).toHaveBeenCalledWith(
      'light',
      'turn_on',
      {
        entity_id: 'light.a',
        brightness: 179,
        transition: 0.25,
      },
      undefined,
      false
    );

    rafSpy.mockRestore();
  });
});

// ── Curve-edit orchestration ────────────────────────────────────────
// Covers focus wiring, one undo entry per drag, automatic selection on drag,
// dirty-state updates, visibility and selection, presets applied to all curves,
// reload after point removal, and curve-dirty-state event transitions. Exercises the
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

  it('long-press point-remove with no live load triggers a reload', async () => {
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
    });
    const internal = card as unknown as CardInternals;
    hass.callWS.mockReset();
    hass.callWS.mockResolvedValue(testSnapshot({}));
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

describe('initial viewing brightness', () => {
  it('does not label a dim positive preview as Off', async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ selectedCurveId: null, scrubberPosition: 30 })
    );
    const { card, hass } = await mountCard({
      'light.a': { brightness: { '1': '0', '100': '1' } },
    });
    const legend = card.renderRoot.querySelector('curve-legend')!;
    await (legend as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
    expect(legend.shadowRoot!.querySelector('brightness-bar')?.displayValue).toBe('<1%');
    expect(legend.shadowRoot!.querySelector('.row-select-btn')?.getAttribute('aria-label')).toBe(
      'Alpha <1%'
    );
    (card as unknown as CardInternals)._startPreview();
    await vi.waitFor(() =>
      expect(hass.callService).toHaveBeenCalledWith(
        'light',
        'turn_on',
        expect.objectContaining({
          entity_id: 'light.a',
          brightness: 1,
        }),
        undefined,
        false
      )
    );
  });

  it.each([
    [null, 100],
    [0, 0],
    [37, 37],
    [0.4, 0],
    [0.6, 1],
    [49.6, 50],
    [-2, 0],
    [101, 100],
  ])(
    'normalizes stored Room brightness %s to %s across every surface',
    async (stored, expected) => {
      if (stored !== null)
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ selectedCurveId: null, scrubberPosition: stored })
        );
      const { card, hass } = await mountCard({ 'light.a': { brightness: { '100': '100' } } });
      const graph = card.renderRoot.querySelector('curve-graph') as HTMLElement & {
        scrubberPosition: number;
      };
      const legend = card.renderRoot.querySelector('curve-legend') as HTMLElement & {
        scrubberPosition: number;
      };
      const scrubber = card.renderRoot.querySelector('curve-scrubber') as HTMLElement & {
        position: number;
      };
      expect([graph.scrubberPosition, legend.scrubberPosition, scrubber.position]).toEqual(
        Array(3).fill(expected)
      );
      expect(card.dirty).toBe(false);
      expect(hass.callService).not.toHaveBeenCalled();
      (card as unknown as CardInternals)._startPreview();
      await card.updateComplete;
      expect(scrubber.position).toBe(expected);
      await vi.waitFor(() => expect(hass.callService).toHaveBeenCalled());
      const calls = hass.callService.mock.calls;
      expect(
        calls.some(
          (call) =>
            call[1] === 'turn_on' && call[2].brightness === Math.round((expected! / 100) * 255)
        )
      ).toBe(expected !== 0);
    }
  );
});

describe('lightener-curve-card — list hover and All lights', () => {
  const ENTITIES = {
    'light.a': { brightness: { '1': '1', '50': '40', '100': '100' } },
    'light.b': { brightness: { '1': '1', '50': '60', '100': '100' } },
  };
  type HoverInternals = CardInternals & { _hoveredCurveId: string | null };

  it('isolates a hovered light without selecting, editing or commanding lights', async () => {
    const { card, hass } = await mountCard(ENTITIES);
    const internal = card as unknown as HoverInternals;
    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    const curves = structuredClone(internal._curves);
    const stored = readStored();
    hass.callWS.mockClear();

    fireLegend(card, 'hover-curve', { entityId: 'light.b' });
    await card.updateComplete;
    expect(internal._hoveredCurveId).toBe('light.b');
    expect(card.renderRoot.querySelector('curve-graph')!.hoveredCurveId).toBe('light.b');
    fireLegend(card, 'hover-curve', { entityId: null });
    await card.updateComplete;

    expect(internal._hoveredCurveId).toBeNull();
    expect(internal._selectedCurveId).toBe('light.a');
    expect(internal._curves).toEqual(curves);
    expect(internal._undoStack).toHaveLength(0);
    expect(card.dirty).toBe(false);
    expect(readStored()).toEqual(stored);
    expect(hass.callService).not.toHaveBeenCalled();
    expect(hass.callWS).not.toHaveBeenCalled();
  });

  it('ignores a hidden or unknown light', async () => {
    const { card } = await mountCard(ENTITIES);
    const internal = card as unknown as HoverInternals;
    internal._curves = internal._curves.map((c) =>
      c.entityId === 'light.b' ? { ...c, visible: false } : c
    );
    await card.updateComplete;
    for (const entityId of ['light.b', 'light.ghost']) {
      fireLegend(card, 'hover-curve', { entityId });
      await card.updateComplete;
      expect(internal._hoveredCurveId).toBeNull();
    }
  });

  it.each(['select-curve', 'focus-curve', 'light-level-start'])(
    'keeps the hovered row isolated during %s until the pointer leaves',
    async (event) => {
      const { card, hass } = await mountCard(ENTITIES);
      const internal = card as unknown as HoverInternals;
      const curves = structuredClone(internal._curves);
      fireLegend(card, 'hover-curve', { entityId: 'light.b' });
      fireLegend(card, event, { entityId: 'light.b' });
      await card.updateComplete;

      expect(internal._selectedCurveId).toBe('light.b');
      expect(internal._hoveredCurveId).toBe('light.b');
      expect(card.renderRoot.querySelector('curve-legend')!.hoveredCurveId).toBe('light.b');
      expect(internal._curves).toEqual(curves);
      expect(internal._undoStack).toHaveLength(0);
      expect(card.dirty).toBe(false);
      expect(hass.callService).not.toHaveBeenCalled();

      fireLegend(card, 'hover-curve', { entityId: null });
      await card.updateComplete;
      expect(internal._hoveredCurveId).toBeNull();
      expect(internal._selectedCurveId).toBe('light.b');
    }
  );

  it.each([
    [
      'selecting a light',
      (card: LightenerCurveCard) => fireLegend(card, 'select-curve', { entityId: 'light.a' }),
    ],
    [
      'focusing a light',
      (card: LightenerCurveCard) => fireLegend(card, 'focus-curve', { entityId: 'light.a' }),
    ],
    [
      'starting a graph gesture',
      (card: LightenerCurveCard) =>
        fireGraph(card, 'graph-interaction', { phase: 'start', input: 'mouse' }),
    ],
  ])('clears the hover when %s', async (_name, act) => {
    const { card } = await mountCard(ENTITIES);
    const internal = card as unknown as HoverInternals;
    fireLegend(card, 'hover-curve', { entityId: 'light.b' });
    await card.updateComplete;
    expect(internal._hoveredCurveId).toBe('light.b');
    act(card);
    await card.updateComplete;
    expect(internal._hoveredCurveId).toBeNull();
  });

  it('All lights clears and persists the selection, keeping focus on the line', async () => {
    const { card } = await mountCard(ENTITIES);
    const internal = card as unknown as HoverInternals;
    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    expect(readStored()?.selectedCurveId).toBe('light.a');
    const clear = card.renderRoot.querySelector<HTMLButtonElement>('.context-clear')!;
    expect(clear.textContent?.trim()).toBe('All lights');
    expect(clear.getAttribute('aria-label')).toBe('Show all lights');

    clear.focus();
    clear.click();
    await card.updateComplete;
    await card.updateComplete;
    expect(internal._selectedCurveId).toBeNull();
    expect(readStored()?.selectedCurveId).toBeNull();
    expect(card.renderRoot.querySelector('.context-clear')).toBeNull();
    expect(card.renderRoot.querySelector('.context-name.all')?.textContent?.trim()).toBe(
      'All lights'
    );
    expect((card.renderRoot as ShadowRoot).activeElement).toBe(
      card.renderRoot.querySelector('.context-line')
    );
  });

  it('All lights by pointer leaves focus where it was', async () => {
    const { card } = await mountCard(ENTITIES);
    fireLegend(card, 'select-curve', { entityId: 'light.a' });
    await card.updateComplete;
    card.renderRoot.querySelector<HTMLButtonElement>('.context-clear')!.click();
    await card.updateComplete;
    await card.updateComplete;
    expect((card as unknown as HoverInternals)._selectedCurveId).toBeNull();
    expect((card.renderRoot as ShadowRoot).activeElement).toBeNull();
  });
});

type GuardedInternals = CardInternals & {
  _originalCurves: LightCurve[];
  _baseline: {
    revision: string;
    config_entry_id: string;
    entities: Record<string, { brightness: Record<string, string> }>;
  } | null;
  _saveIssue: string | null;
  _cancelAnimating: boolean;
  _saveReview: {
    latest: unknown;
    curves: LightCurve[];
    members: Array<{ entityId: string; kind: string }>;
  } | null;
  _reviewLatest(): Promise<void>;
  _dismissSaveReview(): void;
  _acceptSaveReview(event: CustomEvent<{ keep: Set<string> }>): void;
  _onMembershipApplied(event: CustomEvent): void;
  _undo(): void;
};
describe('guarded saves and explicit recovery', () => {
  function dirtyFirst(card: LightenerCurveCard): void {
    const editor = card as unknown as CardInternals;
    editor._dirtyVersion++;
    editor._curves = editor._curves.map((curve, index) =>
      index === 0
        ? { ...curve, controlPoints: [...curve.controlPoints, { lightener: 75, target: 90 }] }
        : curve
    );
  }
  const initial = {
    'light.a': { brightness: { '100': '100' } },
    'light.b': { brightness: { '12.5': '3.5', broken: 'bad' }, future: { nested: [1] } },
  };
  it('sends only edited members and preserves untouched raw legacy data', async () => {
    const { card, hass } = await mountCard(initial);
    dirtyFirst(card);
    expect(await card.saveCurves()).toBe(true);
    const request = hass.callWS.mock.calls.find(([m]) => m.type === 'lightener/save_curves')![0];
    expect(request.expected_revision).toMatch(/^v1:[0-9a-f]{64}$/);
    expect(Object.keys(request.curves)).toEqual(['light.a']);
    expect((card as unknown as GuardedInternals)._baseline!.entities['light.b']).toEqual(
      initial['light.b']
    );
  });
  it.each([
    { entities: initial },
    { ...testSnapshot(initial), revision: 'bad' },
    { ...testSnapshot(initial), capabilities: { guarded_curve_save: 2 } },
  ])(
    'allows local editing with incompatible backends, but blocks every save path',
    async (response) => {
      const hass = makeHass();
      hass.callWS.mockResolvedValue(response);
      const { card } = await mountCard(initial, hass);
      dirtyFirst(card);
      const editor = card as unknown as GuardedInternals;
      const draft = structuredClone(editor._curves),
        history = structuredClone(editor._undoStack);
      expect(await card.saveCurves()).toBe(false);
      const key = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      renderedGraph(card).dispatchEvent(key);
      expect(key.defaultPrevented).toBe(true);
      expect(hass.callWS.mock.calls.every(([m]) => m.type === 'lightener/get_curves')).toBe(true);
      expect(editor._curves).toEqual(draft);
      expect(editor._undoStack).toEqual(history);
      expect(card.dirty).toBe(true);
    }
  );
  it.each([
    'conflict',
    'precondition_required',
    'reload_failed',
    'rollback_reload_failed',
    'not_found',
    'invalid_format',
    'unauthorized',
  ])('retains draft and history on %s without fallback', async (code) => {
    const { card, hass } = await mountCard(initial);
    dirtyFirst(card);
    const editor = card as unknown as GuardedInternals;
    editor._undoStack = [structuredClone(editor._curves)];
    const before = structuredClone({
      curves: editor._curves,
      undo: editor._undoStack,
      baseline: editor._baseline,
    });
    hass.callWS.mockRejectedValueOnce({ code });
    expect(await card.saveCurves()).toBe(false);
    expect({ curves: editor._curves, undo: editor._undoStack, baseline: editor._baseline }).toEqual(
      before
    );
    expect(card.dirty).toBe(true);
    expect(hass.callWS.mock.calls.filter(([m]) => m.type === 'lightener/save_curves')).toHaveLength(
      1
    );
    expect(hass.callService).not.toHaveBeenCalled();
  });
  it('does not trust a mismatched receipt', async () => {
    const { card, hass } = await mountCard(initial);
    dirtyFirst(card);
    hass.callWS.mockResolvedValueOnce({ ...testSnapshot(initial), status: 'saved' });
    expect(await card.saveCurves()).toBe(false);
    expect(card.dirty).toBe(true);
    expect((card as unknown as GuardedInternals)._saveIssue).toBe('uncertain');
  });
  it('leaves review/dismissal inert and roots accepted Undo at latest saved shapes', async () => {
    const { card, hass } = await mountCard(initial);
    dirtyFirst(card);
    const editor = card as unknown as GuardedInternals;
    editor._undoStack = [structuredClone(editor._curves)];
    const before = structuredClone({
      curves: editor._curves,
      undo: editor._undoStack,
      baseline: editor._baseline,
    });
    hass.callWS.mockRejectedValueOnce({ code: 'conflict' });
    expect(await card.saveCurves()).toBe(false);
    const latest = { 'light.a': { brightness: { '100': '70' }, metadata: 'new' } };
    hass.callWS.mockResolvedValue(testSnapshot(latest));
    await editor._reviewLatest();
    expect(editor._saveReview!.members[0].kind).toBe('conflicting');
    expect({ curves: editor._curves, undo: editor._undoStack, baseline: editor._baseline }).toEqual(
      before
    );
    editor._dismissSaveReview();
    expect({ curves: editor._curves, undo: editor._undoStack, baseline: editor._baseline }).toEqual(
      before
    );
    await editor._reviewLatest();
    editor._acceptSaveReview(
      new CustomEvent('review-accept', { detail: { keep: new Set(['light.a']) } })
    );
    expect(editor._curves.map((c) => c.entityId)).toEqual(['light.a']);
    expect(editor._undoStack).toHaveLength(1);
    expect(editor._undoStack[0][0].controlPoints.at(-1)!.target).toBe(70);
    expect(editor._baseline!.entities).toEqual(latest);
    expect(card.dirty).toBe(true);
    expect(hass.callWS.mock.calls.filter(([m]) => m.type === 'lightener/save_curves')).toHaveLength(
      1
    );
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
        'setTimeout',
        'clearTimeout',
      ],
    });
    editor._undo();
    await vi.advanceTimersByTimeAsync(1000);
    expect(editor._cancelAnimating).toBe(false);
    expect(editor._curves.map((c) => c.entityId)).toEqual(['light.a']);
    expect(editor._curves[0].controlPoints.at(-1)!.target).toBe(70);
    expect(hass.callService).not.toHaveBeenCalled();
  });
  it('never restores an edited removed member after acceptance', async () => {
    const { card, hass } = await mountCard(initial);
    dirtyFirst(card);
    const editor = card as unknown as GuardedInternals;
    hass.callWS.mockRejectedValueOnce({ code: 'conflict' });
    await card.saveCurves();
    hass.callWS.mockResolvedValue(testSnapshot({ 'light.b': initial['light.b'] }));
    await editor._reviewLatest();
    expect(editor._saveReview!.members[0].kind).toBe('removed');
    editor._acceptSaveReview(
      new CustomEvent('review-accept', { detail: { keep: new Set(['light.a']) } })
    );
    expect(editor._curves.map((c) => c.entityId)).toEqual(['light.b']);
    expect(editor._undoStack).toHaveLength(0);
    expect(card.dirty).toBe(false);
  });
  it.each([true, false])(
    'checks lost receipts against complete current content, matching=%s',
    async (matches) => {
      const { card, hass } = await mountCard(initial);
      dirtyFirst(card);
      const editor = card as unknown as GuardedInternals;
      hass.callWS.mockRejectedValueOnce(new Error('lost receipt'));
      expect(await card.saveCurves()).toBe(false);
      const request = hass.callWS.mock.calls.find(([m]) => m.type === 'lightener/save_curves')![0];
      hass.callWS.mockResolvedValue(
        testSnapshot(matches ? { ...initial, 'light.a': request.curves['light.a'] } : initial)
      );
      await editor._reviewLatest();
      expect(card.dirty).toBe(!matches);
      expect(editor._saveReview === null).toBe(matches);
      expect(
        hass.callWS.mock.calls.filter(([m]) => m.type === 'lightener/save_curves')
      ).toHaveLength(1);
    }
  );
  it('binds the membership reread token without losing intervening edits', async () => {
    const { card, hass } = await mountCard(initial);
    const editor = card as unknown as GuardedInternals;
    const members = { 'light.a': initial['light.a'] };
    let finish!: (value: unknown) => void;
    hass.callWS.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    editor._onMembershipApplied(
      new CustomEvent('membership-applied', { detail: { entities: members, added_entity_ids: [] } })
    );
    dirtyFirst(card);
    expect(await card.saveCurves()).toBe(false);
    finish(testSnapshot(members));
    await Promise.resolve();
    await Promise.resolve();
    expect(editor._baseline!.revision).toBe(testSnapshot(members).revision);
    expect(card.dirty).toBe(true);
    expect(editor._curves[0].controlPoints.some((p) => p.lightener === 75)).toBe(true);
  });
  it('fences A→B→A loads by generation including repeated IDs', async () => {
    const { card, hass } = await mountCard(initial);
    const editor = card as unknown as GuardedInternals;
    const pending: Array<(value: unknown) => void> = [];
    hass.callWS.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    editor._load = { ...editor._load, loaded: false };
    void editor._tryLoadCurves();
    card.setConfig({ entity: 'light.other' });
    card.setConfig({ entity: 'light.lightener' });
    expect(pending).toHaveLength(3);
    pending[2](testSnapshot({ 'light.fresh': { brightness: { '100': '33' } } }));
    await Promise.resolve();
    await Promise.resolve();
    pending[0](testSnapshot(initial));
    pending[1](testSnapshot({ 'light.other': { brightness: { '100': '20' } } }));
    await Promise.resolve();
    await Promise.resolve();
    expect(editor._curves.map((c) => c.entityId)).toEqual(['light.fresh']);
  });
});

describe('runtime recovery barrier ownership', () => {
  it.each(['switch', 'disconnect', 'late'] as const)(
    'keeps failed compensation blocked across %s while another entry remains usable',
    async (mode) => {
      const initial = { 'light.a': { brightness: { '100': '100' } } };
      const hass = makeHass();
      const read = (message: Record<string, unknown>) =>
        Promise.resolve(testSnapshot(initial, String(message.entity_id)));
      hass.callWS.mockImplementation(read);
      const { card } = await mountCard(initial, hass);
      const editor = card as unknown as GuardedInternals;
      forceDirty(card);
      if (mode === 'late') {
        let reject!: (error: unknown) => void;
        hass.callWS.mockImplementationOnce(
          () =>
            new Promise((_, fail) => {
              reject = fail;
            })
        );
        const pending = card.saveCurves();
        card.setConfig({ entity: 'light.other' });
        await card.updateComplete;
        await Promise.resolve();
        reject({ code: 'rollback_reload_failed' });
        expect(await pending).toBe(false);
        await Promise.resolve();
      } else {
        hass.callWS.mockRejectedValueOnce({ code: 'rollback_reload_failed' });
        expect(await card.saveCurves()).toBe(false);
        editor._onCancel();
        if (mode === 'disconnect') {
          card.remove();
          document.body.append(card);
          await card.updateComplete;
          await Promise.resolve();
        }
        card.setConfig({ entity: 'light.other' });
        await card.updateComplete;
        await Promise.resolve();
      }
      // A different config entry remains writable.
      hass.callWS.mockImplementation((message: Record<string, unknown>) =>
        message.type === 'lightener/save_curves'
          ? testBackend(initial, String(message.entity_id))(message)
          : read(message)
      );
      expect(await card.saveCurves()).toBe(true);
      card.setConfig({ entity: 'light.lightener' });
      await card.updateComplete;
      await Promise.resolve();
      await card.updateComplete;
      // Seed retained local Undo history so the runtime gate, rather than an
      // empty stack or disabled child controls, must prevent every edit path.
      editor._undoStack = [
        editor._curves.map((curve) => ({
          ...curve,
          controlPoints: curve.controlPoints.map((point) => ({
            ...point,
            target: point.lightener === 100 ? 40 : point.target,
          })),
        })),
      ];
      const retained = structuredClone({ curves: editor._curves, undo: editor._undoStack });
      renderedGraph(card).dispatchEvent(
        new CustomEvent('point-move', {
          detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target: 25 },
          bubbles: true,
          composed: true,
        })
      );
      fireLegend(card, 'light-level-start', { entityId: 'light.a' });
      fireLegend(card, 'light-level-input', { entityId: 'light.a', target: 35 });
      fireLegend(card, 'light-level-end', { entityId: 'light.a' });
      editor._undo();
      (card as unknown as { _onPreviewToggle(): void })._onPreviewToggle();
      await Promise.resolve();
      expect({ curves: editor._curves, undo: editor._undoStack }).toEqual(retained);
      expect(hass.callService).not.toHaveBeenCalled();
      const before = hass.callWS.mock.calls.length;
      expect(await card.saveCurves()).toBe(false);
      await editor._reviewLatest();
      expect(hass.callWS.mock.calls).toHaveLength(before);
      expect(card.renderRoot.textContent).toContain('Recovery is required');
    }
  );
  it('keeps the acknowledged membership graph mounted and enters recovery on a different reread', async () => {
    const { card, hass } = await mountCard({ 'light.a': { brightness: { '100': '100' } } });
    const editor = card as unknown as GuardedInternals;
    let finish!: (value: unknown) => void;
    hass.callWS.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    editor._onMembershipApplied(
      new CustomEvent('membership-applied', {
        detail: {
          entities: {
            'light.a': { brightness: { '100': '100' } },
            'light.b': { brightness: { '100': '100' } },
          },
          added_entity_ids: ['light.b'],
        },
      })
    );
    await card.updateComplete;
    expect(renderedGraph(card)).not.toBeNull();
    finish(testSnapshot({ 'light.a': { brightness: { '100': '45' } } }));
    await Promise.resolve();
    await Promise.resolve();
    await card.updateComplete;
    expect(renderedGraph(card)).not.toBeNull();
    expect(editor._saveIssue).toBe('conflict');
    expect(editor._curves.map((c) => c.entityId)).toEqual(['light.a', 'light.b']);
    expect(await card.saveCurves()).toBe(false);
    expect(card.renderRoot.textContent).toContain('Review latest');
  });
});

it('shows read-only copy for a permitted non-admin read without advertising a backend upgrade', async () => {
  const hass = makeHass({ user: { is_admin: false } });
  hass.callWS.mockResolvedValue({ entities: { 'light.a': { brightness: { '100': '100' } } } });
  const { card } = await mountCard({}, hass);
  await card.updateComplete;
  expect(card.renderRoot.textContent).toContain('Read-only: an administrator');
  expect(card.renderRoot.textContent).not.toContain('Update the backend');
  expect(await card.saveCurves()).toBe(false);
  expect(hass.callWS.mock.calls.every(([message]) => message.type === 'lightener/get_curves')).toBe(
    true
  );
});

it('installs the canonical receipt after editing a legacy shape without an endpoint', async () => {
  const { card, hass } = await mountCard({
    'light.a': { brightness: { '50': '40' } },
    'light.b': { brightness: { '12.5': '3.5' } },
  });
  const editor = card as unknown as GuardedInternals;
  editor._selectedCurveId = 'light.a';
  editor._curves = editor._curves.map((curve, index) =>
    index === 0
      ? {
          ...curve,
          visible: false,
          controlPoints: curve.controlPoints.map((point) =>
            point.lightener === 50 ? { ...point, target: 41 } : point
          ),
        }
      : curve
  );
  editor._dirtyVersion++;
  expect(await card.saveCurves()).toBe(true);
  const points = [
    { lightener: 0, target: 0 },
    { lightener: 50, target: 41 },
    { lightener: 100, target: 41 },
  ];
  expect(editor._curves[0].controlPoints).toEqual(points);
  expect(editor._originalCurves[0].controlPoints).toEqual(points);
  expect(editor._curves[0].visible).toBe(false);
  expect(editor._selectedCurveId).toBe('light.a');
  expect(editor._baseline!.entities['light.b']).toEqual({ brightness: { '12.5': '3.5' } });
  expect(await card.saveCurves()).toBe(true);
  const saves = hass.callWS.mock.calls.filter(
    ([message]) => message.type === 'lightener/save_curves'
  );
  expect(saves[1][0].curves).toEqual({});
  const lastResult = await hass.callWS.mock.results.at(-1)!.value;
  expect(lastResult.status).toBe('unchanged');
  expect(card.dirty).toBe(false);
});

it('recovers a dirty draft and exact Undo after a true new-instance navigation replacement', async () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } };
  const firstHass = makeHass({ user: { is_admin: true, id: 'replacement-user' } as Hass['user'] });
  firstHass.callWS.mockImplementation(testBackend(initial));
  const { card: first } = await mountCard(initial, firstHass);
  const source = first as unknown as GuardedInternals;
  forceDirty(first);
  source._undoStack = [structuredClone(source._originalCurves)];
  const expected = structuredClone({ curves: source._curves, undo: source._undoStack });
  first.remove();
  const secondHass = makeHass({ user: { is_admin: true, id: 'replacement-user' } as Hass['user'] });
  secondHass.callWS.mockImplementation(testBackend(initial));
  const { card: second } = await mountCard(initial, secondHass);
  const recover = second.renderRoot.querySelector<HTMLButtonElement>('[data-draft-recover]');
  recover?.click();
  await Promise.resolve();
  await Promise.resolve();
  await second.updateComplete;
  const target = second as unknown as GuardedInternals;
  expect({ curves: target._curves, undo: target._undoStack }).toEqual(expected);
  expect(
    secondHass.callWS.mock.calls.every(([message]) => message.type === 'lightener/get_curves')
  ).toBe(true);
  expect(secondHass.callService).not.toHaveBeenCalled();
});

type NavigationInternals = GuardedInternals & {
  _draftLost: boolean;
  _draftNotice: string | null;
  _draftClaim: { draftId: string; version: number } | null;
  _savedRead: unknown | null;
  _commitCurveEdit(curves: LightCurve[]): void;
  _checkpointDraft(): void;
  _reviewLostLocalCopy(): Promise<void>;
};
async function navigationCard(
  user: string,
  initial: Record<string, { brightness: Record<string, string> }>,
  surface: 'dashboard' | 'sidebar' = 'dashboard'
) {
  const hass = makeHass({ user: { id: user, is_admin: true } });
  hass.callWS.mockImplementation(testBackend(initial));
  const card = document.createElement('lightener-curve-card') as LightenerCurveCard;
  card.draftSurface = surface;
  card.setConfig({
    entity: 'light.lightener',
    joy: { settle: false, diagonal: false, ripple: false, draw_in: false },
  });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  await Promise.resolve();
  await card.updateComplete;
  return { card, hass, editor: card as unknown as NavigationInternals };
}
function navigationEdit(editor: NavigationInternals, target = 45) {
  editor._commitCurveEdit(
    editor._curves.map((curve, index) =>
      index === 0
        ? {
            ...curve,
            controlPoints: curve.controlPoints.map((point) => ({
              ...point,
              target: point.lightener === 100 ? target : point.target,
            })),
          }
        : curve
    )
  );
}
async function recoverNavigation(card: LightenerCurveCard) {
  card.renderRoot.querySelector<HTMLButtonElement>('[data-draft-recover]')!.click();
  await Promise.resolve();
  await Promise.resolve();
  await card.updateComplete;
}
describe('navigation recovery identity and ownership', () => {
  const initial = {
    'light.a': { brightness: { '100': '100' } },
    'light.b': { brightness: { '100': '100' } },
  };
  it('same instance resumes its own local work, then loses ownership after another card recovers it', async () => {
    const user = crypto.randomUUID(),
      first = await navigationCard(user, initial);
    navigationEdit(first.editor);
    const undo = structuredClone(first.editor._undoStack);
    first.card.remove();
    document.body.append(first.card);
    await first.card.updateComplete;
    await Promise.resolve();
    await Promise.resolve();
    expect(first.editor._curves[0].controlPoints.at(-1)!.target).toBe(45);
    expect(first.editor._undoStack).toEqual(undo);
    first.card.remove();
    const second = await navigationCard(user, initial);
    await recoverNavigation(second.card);
    document.body.append(first.card);
    await first.card.updateComplete;
    await Promise.resolve();
    expect(first.editor._draftLost).toBe(true);
    expect(await first.card.saveCurves()).toBe(false);
    const own = structuredClone(second.editor._curves);
    first.editor._onCancel();
    expect(second.editor._curves).toEqual(own);
    expect(second.editor._draftClaim).not.toBeNull();
  });
  it('lost-owner review deliberately creates a new draft without hijacking the transferred one', async () => {
    const user = crypto.randomUUID(),
      first = await navigationCard(user, initial);
    navigationEdit(first.editor);
    first.card.remove();
    const second = await navigationCard(user, initial);
    await recoverNavigation(second.card);
    const transferred = second.editor._draftClaim!.draftId;
    document.body.append(first.card);
    await first.card.updateComplete;
    await Promise.resolve();
    await first.editor._reviewLostLocalCopy();
    expect(first.editor._saveReview).not.toBeNull();
    first.editor._acceptSaveReview(
      new CustomEvent('review-accept', { detail: { keep: new Set(['light.a']) } })
    );
    expect(first.editor._draftClaim!.draftId).not.toBe(transferred);
    expect(second.editor._draftClaim!.draftId).toBe(transferred);
    expect(first.editor._undoStack).toHaveLength(1);
    expect(first.hass.callService).not.toHaveBeenCalled();
  });
  it('requires stale recovery review; dismissal does not consume the record and removed members never return', async () => {
    const user = crypto.randomUUID(),
      first = await navigationCard(user, initial);
    navigationEdit(first.editor);
    first.card.remove();
    const next = await navigationCard(user, { 'light.b': initial['light.b'] });
    await recoverNavigation(next.card);
    expect(next.editor._saveReview!.members[0].kind).toBe('removed');
    expect(next.card.dirty).toBe(false);
    next.editor._dismissSaveReview();
    await next.card.updateComplete;
    expect(next.card.renderRoot.querySelector('[data-draft-recover]')).not.toBeNull();
    await recoverNavigation(next.card);
    next.editor._acceptSaveReview(
      new CustomEvent('review-accept', { detail: { keep: new Set(['light.a']) } })
    );
    expect(next.editor._curves.map((c) => c.entityId)).toEqual(['light.b']);
    expect(next.editor._undoStack).toHaveLength(0);
    expect(next.hass.callWS.mock.calls.every(([m]) => m.type === 'lightener/get_curves')).toBe(
      true
    );
  });
  it('does not offer another surface or replace already-dirty local work', async () => {
    const user = crypto.randomUUID(),
      first = await navigationCard(user, initial, 'sidebar');
    navigationEdit(first.editor);
    first.card.remove();
    const dashboard = await navigationCard(user, initial);
    expect(dashboard.card.renderRoot.querySelector('[data-draft-recover]')).toBeNull();
    const sidebar = await navigationCard(user, initial, 'sidebar');
    navigationEdit(sidebar.editor, 60);
    await sidebar.card.updateComplete;
    expect(sidebar.card.renderRoot.querySelector('[data-draft-recover]')).toBeNull();
    expect(sidebar.editor._curves[0].controlPoints.at(-1)!.target).toBe(60);
  });
  it('hydrates identity late but purges both retained and visible prior-user draft/history on a real transition', async () => {
    const noIdentity = makeHass({ user: { is_admin: true } });
    noIdentity.callWS.mockImplementation(testBackend(initial));
    const { card, hass } = await mountCard(initial, noIdentity);
    const editor = card as unknown as NavigationInternals;
    navigationEdit(editor);
    await card.updateComplete;
    expect(card.renderRoot.textContent).toContain('Navigation recovery is unavailable');
    hass.user = { is_admin: true, id: 'hydrated-' + crypto.randomUUID() };
    card.hass = hass;
    expect(editor._draftClaim).not.toBeNull();
    const old = structuredClone(editor._curves);
    card.hass = { ...hass, user: { is_admin: true, id: 'other-' + crypto.randomUUID() } };
    expect(editor._undoStack).toEqual([]);
    expect(editor._curves).not.toEqual(old);
    await card.updateComplete;
    await Promise.resolve();
    expect(card.dirty).toBe(false);
  });
  it('an observed other user fences a stale reconnect instead of reactivating its old Hass identity', async () => {
    const first = await navigationCard('old-' + crypto.randomUUID(), initial);
    navigationEdit(first.editor);
    first.card.remove();
    await navigationCard('new-' + crypto.randomUUID(), initial);
    document.body.append(first.card);
    await first.card.updateComplete;
    expect(first.editor._curves).toEqual([]);
    expect(first.editor._undoStack).toEqual([]);
    expect(await first.card.saveCurves()).toBe(false);
  });
  it('Undo/net-zero clears the exact obsolete record; a later edit creates a new one', async () => {
    const user = crypto.randomUUID(),
      first = await navigationCard(user, initial);
    navigationEdit(first.editor);
    const id = first.editor._draftClaim!.draftId;
    first.editor._curves = structuredClone(first.editor._originalCurves);
    first.editor._dirtyVersion++;
    first.editor._cleanVersion = first.editor._dirtyVersion;
    first.editor._checkpointDraft();
    expect(first.editor._draftClaim).toBeNull();
    navigationEdit(first.editor, 60);
    expect(first.editor._draftClaim!.draftId).not.toBe(id);
    first.editor._curves = structuredClone(first.editor._originalCurves);
    first.editor._checkpointDraft();
    first.card.remove();
    const next = await navigationCard(user, initial);
    expect(next.card.renderRoot.querySelector('[data-draft-recover]')).toBeNull();
  });
  it('Cancel and validated Save free only the correct record, while a pending/unknown marker survives clean Cancel', async () => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
    const user = crypto.randomUUID(),
      first = await navigationCard(user, initial);
    navigationEdit(first.editor);
    first.hass.callWS.mockImplementationOnce(() => new Promise(() => {}));
    const pending = first.card.saveCurves();
    await vi.advanceTimersByTimeAsync(8000);
    expect(await pending).toBe(false);
    first.editor._onCancel();
    await vi.advanceTimersByTimeAsync(1000);
    expect(first.card.dirty).toBe(false);
    expect(first.editor._draftClaim).toBeNull();
    first.card.remove();
    const next = await navigationCard(user, initial);
    expect(await next.card.saveCurves()).toBe(false);
    await next.editor._reviewLatest();
    expect(next.editor._saveReview).not.toBeNull();
    next.editor._acceptSaveReview(
      new CustomEvent('review-accept', { detail: { keep: new Set() } })
    );
    expect(await next.card.saveCurves()).toBe(true);
  });
  it('late rollback failure after transfer still blocks the replacement; discarding geometry cannot clear it', async () => {
    const user = crypto.randomUUID(),
      first = await navigationCard(user, initial);
    navigationEdit(first.editor);
    let reject!: (error: unknown) => void;
    first.hass.callWS.mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        })
    );
    const pending = first.card.saveCurves();
    first.card.remove();
    const next = await navigationCard(user, initial);
    await recoverNavigation(next.card);
    reject({ code: 'rollback_reload_failed' });
    expect(await pending).toBe(false);
    await Promise.resolve();
    await next.card.updateComplete;
    expect(await next.card.saveCurves()).toBe(false);
    expect(next.card.renderRoot.textContent).toContain('Recovery is required');
    next.editor._onCancel();
    expect(await next.card.saveCurves()).toBe(false);
  });
  it('captures acknowledged membership geometry without a token and forces review after replacement', async () => {
    const user = crypto.randomUUID(),
      first = await navigationCard(user, initial);
    first.hass.callWS.mockImplementationOnce(() => new Promise(() => {}));
    first.editor._onMembershipApplied(
      new CustomEvent('membership-applied', { detail: { entities: initial, added_entity_ids: [] } })
    );
    navigationEdit(first.editor);
    first.card.remove();
    const scope: Scope = {
      ...editorDrafts.activatePrincipal(location.origin, user),
      configEntryId: 'test-entry',
      surface: 'dashboard',
    };
    const summary = editorDrafts.list(scope)[0],
      claimed = editorDrafts.claim(scope, summary.draftId, summary.version, 'inspection');
    expect(claimed.ok).toBe(true);
    if (claimed.ok) {
      expect(claimed.value.payload.baselineRevision).toBeNull();
      expect(claimed.value.payload.outcome).toBe('reread');
      editorDrafts.release(scope, claimed.value.claim);
    }
    const next = await navigationCard(user, initial);
    await recoverNavigation(next.card);
    expect(next.editor._saveReview).not.toBeNull();
  });
});

it('interrupted pending recovery releases its reservation immediately and ignores late reads', async () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } },
    user = crypto.randomUUID(),
    first = await navigationCard(user, initial);
  navigationEdit(first.editor);
  first.card.remove();
  const second = await navigationCard(user, initial);
  let finish!: (value: unknown) => void;
  second.hass.callWS.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  second.card.renderRoot.querySelector<HTMLButtonElement>('[data-draft-recover]')!.click();
  second.card.remove();
  const third = await navigationCard(user, initial);
  expect(third.card.renderRoot.querySelector('[data-draft-recover]')).not.toBeNull();
  await recoverNavigation(third.card);
  finish(testSnapshot(initial));
  await Promise.resolve();
  expect(third.editor._draftClaim).not.toBeNull();
  expect(third.editor._curves[0].controlPoints.at(-1)!.target).toBe(45);
});
it('failed resume stays blocked despite a successful parallel normal read, and deliberate retry verifies it', async () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } },
    first = await navigationCard(crypto.randomUUID(), initial);
  navigationEdit(first.editor);
  const before = structuredClone({ curves: first.editor._curves, undo: first.editor._undoStack });
  first.card.remove();
  first.hass.callWS.mockRejectedValueOnce(new Error('recovery unavailable'));
  document.body.append(first.card);
  await first.card.updateComplete;
  await Promise.resolve();
  await Promise.resolve();
  await first.card.updateComplete;
  expect(first.editor._savedRead).toBeNull();
  expect(await first.card.saveCurves()).toBe(false);
  expect({ curves: first.editor._curves, undo: first.editor._undoStack }).toEqual(before);
  expect((first.card as unknown as { _canEditCurves: boolean })._canEditCurves).toBe(false);
  await (
    first.card as unknown as { _retryNavigationResume(): Promise<void> }
  )._retryNavigationResume();
  expect((first.card as unknown as { _canEditCurves: boolean })._canEditCurves).toBe(true);
});
it('a lost-copy pending admin snapshot cannot be adopted after permission loss', async () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } },
    user = crypto.randomUUID(),
    first = await navigationCard(user, initial);
  navigationEdit(first.editor);
  first.card.remove();
  const second = await navigationCard(user, initial);
  await recoverNavigation(second.card);
  document.body.append(first.card);
  await first.card.updateComplete;
  let finish!: (value: unknown) => void;
  first.hass.callWS.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const pending = first.editor._reviewLostLocalCopy();
  first.card.hass = { ...first.hass, user: { id: user, is_admin: false } };
  finish(testSnapshot(initial));
  await pending;
  expect(first.editor._saveReview).toBeNull();
  expect(first.editor._draftLost).toBe(true);
  expect(first.editor._savedRead).toBeNull();
});
it('checkpoints a gesture at first effective movement and completion, while disconnect captures its latest geometry', async () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } },
    user = crypto.randomUUID(),
    first = await navigationCard(user, initial);
  const checkpoint = vi.spyOn(first.editor, '_checkpointDraft');
  const graph = renderedGraph(first.card);
  for (let target = 40; target < 60; target++)
    graph.dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target },
        bubbles: true,
        composed: true,
      })
    );
  expect(checkpoint).toHaveBeenCalledTimes(1);
  expect(first.editor._undoStack).toHaveLength(1);
  first.card.remove();
  expect(checkpoint).toHaveBeenCalledTimes(2);
  const next = await navigationCard(user, initial);
  await recoverNavigation(next.card);
  expect(next.editor._curves[0].controlPoints.at(-1)!.target).toBe(59);
  expect(next.editor._undoStack).toHaveLength(1);
});
it('a new unresolved retry cannot inherit older review approval through clean Cancel and reconnect', async () => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  });
  const initial = { 'light.a': { brightness: { '100': '100' } } },
    first = await navigationCard(crypto.randomUUID(), initial);
  navigationEdit(first.editor);
  first.hass.callWS.mockImplementationOnce(() => new Promise(() => {}));
  let pending = first.card.saveCurves();
  await vi.advanceTimersByTimeAsync(8000);
  await pending;
  await first.editor._reviewLatest();
  first.editor._acceptSaveReview(
    new CustomEvent('review-accept', { detail: { keep: new Set(['light.a']) } })
  );
  first.hass.callWS.mockImplementationOnce(() => new Promise(() => {}));
  pending = first.card.saveCurves();
  await vi.advanceTimersByTimeAsync(8000);
  await pending;
  first.editor._onCancel();
  await vi.advanceTimersByTimeAsync(1000);
  first.card.remove();
  document.body.append(first.card);
  await first.card.updateComplete;
  await Promise.resolve();
  await Promise.resolve();
  expect(first.card.dirty).toBe(false);
  expect(await first.card.saveCurves()).toBe(false);
});

it('matching revision cannot authorize an incoherent baseline, and stale runtime geometry stays retained', async () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } };
  for (const runtime of [false, true]) {
    const user = crypto.randomUUID(),
      seed = await navigationCard(user, initial);
    seed.card.remove();
    const scope: Scope = {
      ...editorDrafts.activatePrincipal(location.origin, user),
      configEntryId: 'test-entry',
      surface: 'dashboard',
    };
    const created = editorDrafts.create(scope, 'seed', {
      schema: 1,
      entityId: 'light.lightener',
      baselineRevision: testSnapshot(initial).revision,
      baseline: [
        {
          entityId: 'light.a',
          points: [
            { lightener: 0, target: 0 },
            { lightener: 100, target: 80 },
          ],
        },
      ],
      local: [
        {
          entityId: 'light.a',
          points: [
            { lightener: 0, target: 0 },
            { lightener: 100, target: 45 },
          ],
        },
      ],
      undo: [],
      outcome: runtime ? 'runtime' : 'ordinary',
    });
    if (!created.ok) throw Error(created.reason);
    editorDrafts.release(scope, created.value);
    const target = await navigationCard(user, initial);
    await recoverNavigation(target.card);
    expect(target.card.dirty).toBe(false);
    expect(target.editor._curves[0].controlPoints.at(-1)!.target).toBe(100);
    expect(editorDrafts.list(scope)).toHaveLength(1);
    expect(target.editor._draftClaim).toBeNull();
    if (runtime) expect(await target.card.saveCurves()).toBe(false);
    target.card.remove();
  }
});
it('unsupported or unavailable recovery retains its checkpoint and repaired support still requires review', async () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } },
    user = crypto.randomUUID(),
    seed = await navigationCard(user, initial);
  navigationEdit(seed.editor);
  seed.editor._baseline = null;
  (seed.card as unknown as { _saveIssue: string })._saveIssue = 'incompatible';
  seed.editor._checkpointDraft();
  seed.card.remove();
  const target = await navigationCard(user, initial);
  target.hass.callWS.mockResolvedValueOnce({ entities: initial });
  await recoverNavigation(target.card);
  expect(target.editor._draftClaim).toBeNull();
  expect(target.card.dirty).toBe(false);
  await recoverNavigation(target.card);
  expect(target.editor._saveReview).not.toBeNull();
  expect(target.card.dirty).toBe(false);
});
it.each([false, true])(
  'principal transition cancels preview scheduling and restore snapshots, trailing=%s',
  async (trailing) => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
    const initial = { 'light.a': { brightness: { '100': '100' } } },
      first = await navigationCard(crypto.randomUUID(), initial);
    const preview = first.card as unknown as {
      _onPreviewToggle(): void;
      _previewLights(position: number): void;
      _previewActive: boolean;
    };
    preview._onPreviewToggle();
    preview._previewLights(50);
    if (trailing) {
      await vi.advanceTimersByTimeAsync(20);
      expect(first.hass.callService.mock.calls.length).toBeGreaterThan(0);
      preview._previewLights(60);
    }
    const afterStart = first.hass.callService.mock.calls.length;
    const next = makeHass({ user: { is_admin: true, id: crypto.randomUUID() } });
    next.callWS.mockImplementation(testBackend(initial));
    first.card.hass = next;
    await vi.advanceTimersByTimeAsync(2000);
    expect(preview._previewActive).toBe(false);
    expect(next.callService).not.toHaveBeenCalled();
    expect(first.hass.callService).toHaveBeenCalledTimes(afterStart);
  }
);
it('a completed gesture checkpoints once at each transaction boundary', async () => {
  const first = await navigationCard(crypto.randomUUID(), {
    'light.a': { brightness: { '100': '100' } },
  });
  const checkpoint = vi.spyOn(first.editor, '_checkpointDraft'),
    graph = renderedGraph(first.card);
  for (let target = 30; target < 50; target++)
    graph.dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: 0, pointIndex: 1, lightener: 100, target },
        bubbles: true,
        composed: true,
      })
    );
  expect(checkpoint).toHaveBeenCalledTimes(1);
  graph.dispatchEvent(new CustomEvent('point-drop', { bubbles: true, composed: true }));
  expect(checkpoint).toHaveBeenCalledTimes(2);
  expect(first.editor._undoStack).toHaveLength(1);
});

it('Cancel fences a pending lost-copy review without consuming the other owner record', async () => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  });
  const initial = { 'light.a': { brightness: { '100': '100' } } },
    user = crypto.randomUUID(),
    first = await navigationCard(user, initial);
  navigationEdit(first.editor);
  first.card.remove();
  const second = await navigationCard(user, initial);
  await recoverNavigation(second.card);
  document.body.append(first.card);
  await first.card.updateComplete;
  let finish!: (value: unknown) => void;
  first.hass.callWS.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const read = first.editor._reviewLostLocalCopy();
  first.editor._onCancel();
  await vi.advanceTimersByTimeAsync(1000);
  finish(testSnapshot(initial));
  await read;
  expect(first.editor._saveReview).toBeNull();
  expect(first.card.dirty).toBe(false);
  expect(first.editor._draftClaim).toBeNull();
  expect(second.editor._draftClaim).not.toBeNull();
});
it('same-group writes in another card invalidate prior review approval without affecting other groups', async () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } },
    user = crypto.randomUUID(),
    first = await navigationCard(user, initial);
  const scope: Scope = {
    ...editorDrafts.activatePrincipal(location.origin, user),
    configEntryId: 'test-entry',
    surface: 'dashboard',
  };
  editorDrafts.beginWrite(scope, scope.configEntryId, 'old');
  editorDrafts.settleWrite(scope, scope.configEntryId, 'old', 'unknown');
  await first.editor._reviewLatest();
  first.editor._acceptSaveReview(new CustomEvent('review-accept', { detail: { keep: new Set() } }));
  editorDrafts.beginWrite(scope, 'other-entry', 'other');
  expect((first.card as unknown as { _canGuardedSave: boolean })._canGuardedSave).toBe(true);
  editorDrafts.beginWrite(scope, scope.configEntryId, 'another-card');
  const before = first.hass.callWS.mock.calls.length;
  expect(await first.card.saveCurves()).toBe(false);
  expect(first.hass.callWS.mock.calls).toHaveLength(before);
});
it('a late runtime marker closes recovery review and cannot authorize adoption', async () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } },
    user = crypto.randomUUID(),
    first = await navigationCard(user, initial);
  navigationEdit(first.editor);
  first.card.remove();
  const next = await navigationCard(user, { 'light.a': { brightness: { '100': '70' } } });
  await recoverNavigation(next.card);
  expect(next.editor._saveReview).not.toBeNull();
  const before = structuredClone({ curves: next.editor._curves, undo: next.editor._undoStack });
  const scope: Scope = {
    ...editorDrafts.activatePrincipal(location.origin, user),
    configEntryId: 'test-entry',
    surface: 'dashboard',
  };
  editorDrafts.markRuntimeBlocked(scope, scope.configEntryId);
  expect(next.editor._saveReview).toBeNull();
  next.editor._acceptSaveReview(
    new CustomEvent('review-accept', { detail: { keep: new Set(['light.a']) } })
  );
  expect({ curves: next.editor._curves, undo: next.editor._undoStack }).toEqual(before);
  expect(editorDrafts.list(scope)).toHaveLength(1);
  expect(await next.card.saveCurves()).toBe(false);
});
it('ordinary live peers can edit concurrently, while navigation and newly unknown outcomes require review', async () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } },
    user = crypto.randomUUID(),
    a = await navigationCard(user, initial),
    b = await navigationCard(user, initial);
  navigationEdit(a.editor);
  navigationEdit(b.editor, 60);
  let finish!: (error: unknown) => void;
  b.hass.callWS.mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        finish = reject;
      })
  );
  const pending = b.card.saveCurves();
  expect(await a.card.saveCurves()).toBe(true);
  const returned = await navigationCard(user, initial);
  expect(await returned.card.saveCurves()).toBe(false);
  a.card.remove();
  document.body.append(a.card);
  await a.card.updateComplete;
  await Promise.resolve();
  await Promise.resolve();
  expect(await a.card.saveCurves()).toBe(false);
  finish(new Error('lost receipt'));
  expect(await pending).toBe(false);
  expect(await a.card.saveCurves()).toBe(false);
});

it.each(['registration', 'unknown'] as const)(
  'open recovery review cannot approve a later %s generation',
  async (change) => {
    const initial = { 'light.a': { brightness: { '100': '100' } } },
      first = await navigationCard(crypto.randomUUID(), initial);
    navigationEdit(first.editor);
    const scope: Scope = {
      ...editorDrafts.activatePrincipal(location.origin, first.hass.user.id!),
      configEntryId: 'test-entry',
      surface: 'dashboard',
    };
    editorDrafts.beginWrite(scope, scope.configEntryId, 'older');
    await first.editor._reviewLatest();
    expect(first.editor._saveReview).not.toBeNull();
    const before = structuredClone({
      curves: first.editor._curves,
      undo: first.editor._undoStack,
      claim: first.editor._draftClaim,
    });
    if (change === 'registration') editorDrafts.beginWrite(scope, scope.configEntryId, 'newer');
    else editorDrafts.settleWrite(scope, scope.configEntryId, 'older', 'unknown');
    first.editor._acceptSaveReview(
      new CustomEvent('review-accept', { detail: { keep: new Set(['light.a']) } })
    );
    expect({
      curves: first.editor._curves,
      undo: first.editor._undoStack,
      claim: first.editor._draftClaim,
    }).toEqual(before);
    expect(first.editor._saveReview).toBeNull();
    expect(await first.card.saveCurves()).toBe(false);
    await first.editor._reviewLatest();
    first.editor._acceptSaveReview(
      new CustomEvent('review-accept', { detail: { keep: new Set(['light.a']) } })
    );
    expect((first.card as unknown as { _canGuardedSave: boolean })._canGuardedSave).toBe(true);
  }
);
it('read generation fences late matching-content checks and direct orphan restoration', async () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } },
    user = crypto.randomUUID(),
    first = await navigationCard(user, initial);
  navigationEdit(first.editor);
  first.hass.callWS.mockRejectedValueOnce(new Error('lost receipt'));
  await first.card.saveCurves();
  const request = first.hass.callWS.mock.calls.find(
    ([message]) => message.type === 'lightener/save_curves'
  )![0];
  const matching = { ...initial, 'light.a': request.curves['light.a'] };
  let finish!: (value: unknown) => void;
  first.hass.callWS.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const checking = first.editor._reviewLatest();
  const scope: Scope = {
    ...editorDrafts.activatePrincipal(location.origin, user),
    configEntryId: 'test-entry',
    surface: 'dashboard',
  };
  editorDrafts.beginWrite(scope, scope.configEntryId, 'later');
  finish(testSnapshot(matching));
  await checking;
  expect(first.card.dirty).toBe(true);
  expect(first.editor._saveReview).toBeNull();
  first.card.remove();
  editorDrafts.settleWrite(scope, scope.configEntryId, 'later', 'refused');
  const target = await navigationCard(user, initial);
  target.hass.callWS.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  target.card.renderRoot.querySelector<HTMLButtonElement>('[data-draft-recover]')!.click();
  editorDrafts.beginWrite(scope, scope.configEntryId, 'during-read');
  finish(testSnapshot(initial));
  await Promise.resolve();
  await Promise.resolve();
  await target.card.updateComplete;
  expect(target.card.dirty).toBe(false);
  expect(target.editor._draftClaim).toBeNull();
  expect(editorDrafts.list(scope)).toHaveLength(1);
});

it.each(['orphan', 'resume', 'lost-copy'] as const)(
  'a write registered during %s read cannot grant restoration or review',
  async (kind) => {
    const initial = { 'light.a': { brightness: { '100': '100' } } },
      user = crypto.randomUUID(),
      first = await navigationCard(user, initial);
    navigationEdit(first.editor);
    first.card.remove();
    const scope: Scope = {
      ...editorDrafts.activatePrincipal(location.origin, user),
      configEntryId: 'test-entry',
      surface: 'dashboard',
    };
    let finish!: (value: unknown) => void;
    if (kind === 'resume') {
      first.hass.callWS.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
      document.body.append(first.card);
      await first.card.updateComplete;
      editorDrafts.beginWrite(scope, scope.configEntryId, 'interleaving');
      finish(testSnapshot(initial));
      await Promise.resolve();
      await Promise.resolve();
      await first.card.updateComplete;
      expect(first.card.dirty).toBe(true);
      expect(first.editor._saveReview).toBeNull();
      expect((first.card as unknown as { _canEditCurves: boolean })._canEditCurves).toBe(false);
    } else {
      const target = await navigationCard(user, initial);
      if (kind === 'lost-copy') {
        await recoverNavigation(target.card);
        document.body.append(first.card);
        await first.card.updateComplete;
        first.hass.callWS.mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finish = resolve;
            })
        );
        const reading = first.editor._reviewLostLocalCopy();
        editorDrafts.beginWrite(scope, scope.configEntryId, 'interleaving');
        finish(testSnapshot(initial));
        await reading;
        expect(first.editor._saveReview).toBeNull();
        expect(first.editor._draftLost).toBe(true);
        expect(target.editor._draftClaim).not.toBeNull();
      } else {
        target.hass.callWS.mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finish = resolve;
            })
        );
        target.card.renderRoot.querySelector<HTMLButtonElement>('[data-draft-recover]')!.click();
        editorDrafts.beginWrite(scope, scope.configEntryId, 'interleaving');
        finish(testSnapshot(initial));
        await Promise.resolve();
        await Promise.resolve();
        await target.card.updateComplete;
        expect(target.card.dirty).toBe(false);
        expect(target.editor._draftClaim).toBeNull();
        expect(editorDrafts.list(scope)).toHaveLength(1);
      }
    }
  }
);
it('stale retained-modal acceptance releases only its reservation and leaves the original checkpoint unchanged', async () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } },
    user = crypto.randomUUID(),
    first = await navigationCard(user, initial);
  navigationEdit(first.editor);
  first.card.remove();
  const scope: Scope = {
      ...editorDrafts.activatePrincipal(location.origin, user),
      configEntryId: 'test-entry',
      surface: 'dashboard',
    },
    before = editorDrafts.list(scope)[0];
  const target = await navigationCard(user, { 'light.a': { brightness: { '100': '70' } } });
  await recoverNavigation(target.card);
  editorDrafts.beginWrite(scope, scope.configEntryId, 'late');
  target.editor._acceptSaveReview(
    new CustomEvent('review-accept', { detail: { keep: new Set(['light.a']) } })
  );
  expect(target.card.dirty).toBe(false);
  expect(target.editor._draftClaim).toBeNull();
  expect(editorDrafts.list(scope)).toEqual([before]);
});

describe('cooperative preview restoration is independent of shape work', () => {
  type PreviewCard = CardInternals & {
    _previewController: import('./utils/preview-controller.js').PreviewController;
    _stopPreview(): void;
    _onDeleteGroup(): Promise<void>;
    _restorationOpen: boolean;
  };
  async function watching() {
    const result = await navigationCard(crypto.randomUUID(), {
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const editor = result.card as unknown as PreviewCard;
    editor._startPreview();
    await vi.advanceTimersByTimeAsync(30);
    expect(result.hass.callService).toHaveBeenCalledTimes(1);
    return { ...result, editor };
  }
  function timerFrames() {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
  }
  it.each(['save success', 'save failure', 'Cancel'])(
    '%s does not discard rejected restoration',
    async (action) => {
      timerFrames();
      const h = await watching();
      navigationEdit(h.editor as unknown as NavigationInternals);
      h.hass.callService.mockRejectedValueOnce({
        code: 'service_validation_error',
        message: 'terminal restore failure',
      });
      if (action === 'Cancel') {
        h.editor._onCancel();
        await vi.advanceTimersByTimeAsync(1000);
      } else {
        if (action === 'save failure')
          h.hass.callWS.mockRejectedValueOnce({
            code: 'invalid_format',
            message: 'synthetic save error',
          });
        expect(await h.card.saveCurves()).toBe(action === 'save success');
      }
      await Promise.resolve();
      await h.card.updateComplete;
      expect(h.editor._previewController.blocked).toBe(true);
      expect(h.card.renderRoot.textContent).toContain('Light restoration needs review');
      expect(h.card.dirty).toBe(action === 'save failure');
      expect(h.editor._previewController.sessions[0].lights.get('light.a')?.outcome).toBe(
        'restore-rejected'
      );
    }
  );
  it.each(['membership', 'deletion'])(
    '%s waits for pending preview and restoration receipts',
    async (action) => {
      timerFrames();
      const h = await navigationCard(crypto.randomUUID(), {
        'light.a': { brightness: { '100': '100' } },
      });
      const editor = h.card as unknown as PreviewCard;
      let finish!: (value: unknown) => void;
      h.hass.callService.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
      editor._startPreview();
      await vi.advanceTimersByTimeAsync(30);
      const pending =
        action === 'membership' ? editor._openMembershipEditor() : editor._onDeleteGroup();
      expect(h.card.renderRoot.querySelector('light-membership-dialog')).toBeNull();
      expect(h.hass.callApi).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(10_000);
      await pending;
      expect(editor._restorationOpen).toBe(true);
      expect(editor._previewController.keepCurrent(editor._previewController.reviewToken())).toBe(
        true
      );
      expect(editor._previewController.blocked).toBe(true);
      finish({ context: { id: 'late-terminal' } });
      await Promise.resolve();
      await Promise.resolve();
      expect(h.hass.callApi).not.toHaveBeenCalled();
      expect(h.hass.callService).toHaveBeenCalledTimes(1);
    }
  );
  it('clean true element replacement retains light effects independently of navigation drafts', async () => {
    timerFrames();
    const h = await watching(),
      user = h.hass.user.id!;
    expect(h.card.dirty).toBe(false);
    h.card.remove();
    const replacement = await navigationCard(user, {
      'light.a': { brightness: { '1': '1', '100': '100' } },
    });
    const editor = replacement.card as unknown as PreviewCard;
    expect(editor._previewController.blocked).toBe(true);
    expect(editor._previewController.sessions[0].lights.get('light.a')?.before).toBe('on');
    expect(replacement.hass.callService).not.toHaveBeenCalled();
    expect(replacement.card.renderRoot.querySelector('[data-draft-recover]')).toBeNull();
  });
  it('group switch fences the old session before adopting the incoming identity', async () => {
    timerFrames();
    const h = await watching();
    h.card.setConfig({ entity: 'light.other' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
    expect(h.editor._previewController.sessions).toEqual([]);
    h.card.setConfig({ entity: 'light.lightener' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.editor._previewController.blocked).toBe(true);
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
  });
  it('a late shared runtime barrier fences an already active preview without cleanup', async () => {
    timerFrames();
    const h = await watching();
    const scope = h.editor as unknown as NavigationInternals;
    const principal = editorDrafts.activatePrincipal(location.origin, h.hass.user.id!);
    editorDrafts.beginWrite(principal, scope._baseline!.config_entry_id, 'other-card-write');
    editorDrafts.settleWrite(
      principal,
      scope._baseline!.config_entry_id,
      'other-card-write',
      'runtime'
    );
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.editor._previewController.active).toBe(false);
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
    expect(h.editor._previewController.blocked).toBe(true);
  });
});
it('actual membership Apply rejects an added light owned by another group after the dialog opened', async () => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  });
  const user = crypto.randomUUID();
  const first = await navigationCard(user, { 'light.a': { brightness: { '100': '100' } } });
  await (
    first.card as unknown as { _openMembershipEditor(): Promise<void> }
  )._openMembershipEditor();
  await first.card.updateComplete;
  const other = await navigationCard(user, { 'light.new': { brightness: { '100': '100' } } });
  other.card.setConfig({ entity: 'light.other' });
  await other.card.updateComplete;
  await Promise.resolve();
  await other.card.updateComplete;
  (other.card as unknown as CardInternals)._startPreview();
  await vi.advanceTimersByTimeAsync(30);
  expect(other.hass.callService).toHaveBeenCalledTimes(1);
  const dialog = first.card.renderRoot.querySelector('light-membership-dialog') as unknown as {
    _loading: boolean;
    _loadError: null;
    _initialMemberIds: Set<string>;
    _observedOrder: string[];
    _candidateOrder: string[];
    _pendingSelectedIds: Set<string>;
    _apply(): Promise<void>;
    _applyError: string;
  };
  dialog._loading = false;
  dialog._loadError = null;
  dialog._initialMemberIds = new Set(['light.a']);
  dialog._observedOrder = ['light.a'];
  dialog._candidateOrder = ['light.a', 'light.new'];
  dialog._pendingSelectedIds = new Set(['light.a', 'light.new']);
  first.hass.callWS.mockClear();
  await dialog._apply();
  expect(
    first.hass.callWS.mock.calls.filter(
      ([message]) => message.type === 'lightener/set_controlled_lights'
    )
  ).toEqual([]);
  expect(dialog._applyError).toContain('Finish light restoration review');
});
it('shared principal invalidation hides stale-card restoration details and rejects stale disposition while retaining opaque overlap', async () => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  });
  const first = await navigationCard(crypto.randomUUID(), {
    'light.a': { brightness: { '100': '100' } },
  });
  const controller = (
    first.card as unknown as {
      _previewController: import('./utils/preview-controller.js').PreviewController;
    }
  )._previewController;
  controller.start();
  await vi.advanceTimersByTimeAsync(30);
  controller.disconnect();
  await first.card.updateComplete;
  const session = controller.sessions[0],
    token = controller.reviewToken();
  expect(session.lights.size).toBe(1);
  const next = await navigationCard(crypto.randomUUID(), {
    'light.a': { brightness: { '100': '100' } },
  });
  await first.card.updateComplete;
  expect(controller.sessions).toEqual([]);
  expect(first.card.renderRoot.querySelector('preview-restoration-dialog')).toBeNull();
  expect(first.card.renderRoot.textContent).not.toContain('Review restoration');
  expect(controller.keepCurrent(token)).toBe(false);
  expect(controller.restoreSelected(token, ['light.a'])).toBe(false);
  expect(session.lights.get('light.a')?.disposition).toBe(false);
  (next.card as unknown as CardInternals)._startPreview();
  await vi.advanceTimersByTimeAsync(30);
  expect(next.hass.callService).not.toHaveBeenCalled();
});
it.each(['switch', 'principal', 'detach'])(
  'late successful/failed deletion cannot modify replacement context after %s',
  async (change) => {
    for (const success of [true, false]) {
      const first = await navigationCard(crypto.randomUUID(), {
        'light.a': { brightness: { '100': '100' } },
      });
      let finish!: (value: unknown) => void, fail!: (reason: unknown) => void;
      first.hass.callApi.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            finish = resolve;
            fail = reject;
          })
      );
      first.hass.callWS.mockResolvedValueOnce({
        platform: 'lightener_studio',
        config_entry_id: 'test-entry',
      });
      const deletion = (
        first.card as unknown as { _onDeleteGroup(): Promise<void> }
      )._onDeleteGroup();
      await Promise.resolve();
      await Promise.resolve();
      expect(first.hass.callApi).toHaveBeenCalledTimes(1);
      if (change === 'switch') first.card.setConfig({ entity: 'light.other' });
      else if (change === 'principal')
        first.card.hass = { ...first.hass, user: { is_admin: true, id: crypto.randomUUID() } };
      else first.card.remove();
      await first.card.updateComplete;
      await Promise.resolve();
      const editor = first.card as unknown as CardInternals & {
        _manageError: string | null;
        _groupDeleted: boolean;
        _managingLights: boolean;
      };
      // Seed replacement draft/Undo independently of any pending replacement load.
      editor._curves = [
        {
          entityId: 'light.replacement',
          friendlyName: 'Replacement',
          color: '#fff',
          visible: true,
          controlPoints: [
            { lightener: 0, target: 0 },
            { lightener: 100, target: 33 },
          ],
        },
      ];
      editor._undoStack = [structuredClone(editor._curves)];
      editor._dirtyVersion++;
      editor._manageError = 'new-context-status';
      const before = {
        curves: structuredClone(editor._curves),
        undo: structuredClone(editor._undoStack),
        dirty: first.card.dirty,
      };
      if (success) finish(undefined);
      else fail(new Error('synthetic old deletion rejection'));
      await deletion;
      expect(editor._curves).toEqual(before.curves);
      expect(editor._undoStack).toEqual(before.undo);
      expect(first.card.dirty).toBe(before.dirty);
      expect(editor._groupDeleted).toBe(false);
      expect(editor._manageError).toBe('new-context-status');
      expect(editor._managingLights).toBe(false);
      first.card.remove();
    }
  }
);
it('a second mounted same-principal group editor exposes busy status and cannot restore the active owner', async () => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  });
  const user = crypto.randomUUID(),
    initial = { 'light.a': { brightness: { '100': '100' } } };
  const first = await navigationCard(user, initial);
  const owner = (
    first.card as unknown as {
      _previewController: import('./utils/preview-controller.js').PreviewController;
    }
  )._previewController;
  owner.start();
  await vi.advanceTimersByTimeAsync(30);
  const second = await navigationCard(user, initial);
  const inactive = (
    second.card as unknown as {
      _previewController: import('./utils/preview-controller.js').PreviewController;
    }
  )._previewController;
  await second.card.updateComplete;
  expect(second.card.renderRoot.textContent).toContain('Another editor is watching these lights');
  expect(second.card.renderRoot.textContent).not.toContain('Review restoration');
  expect(inactive.restoreSelected(inactive.reviewToken(), ['light.a'])).toBe(false);
  expect(inactive.keepCurrent(inactive.reviewToken())).toBe(false);
  expect(owner.active).toBe(true);
  expect(second.hass.callService).not.toHaveBeenCalled();
});
it.each(['permission', 'runtime'])(
  'same-principal %s restoration review disables Keep and direct disposition',
  async (kind) => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
    const h = await navigationCard(crypto.randomUUID(), {
      'light.a': { brightness: { '100': '100' } },
    });
    const editor = h.card as unknown as {
      _previewController: import('./utils/preview-controller.js').PreviewController;
      _openRestoration(): void;
      _reviewRestoration(event: CustomEvent, restore: boolean): void;
      _restorationOpen: boolean;
    };
    const controller = editor._previewController;
    controller.start();
    await vi.advanceTimersByTimeAsync(30);
    controller.disconnect();
    const session = controller.sessions[0];
    if (kind === 'permission')
      h.card.hass = { ...h.hass, user: { ...h.hass.user, is_admin: false } };
    else
      editorDrafts.markRuntimeBlocked(
        editorDrafts.activatePrincipal(location.origin, h.hass.user.id!),
        'test-entry'
      );
    editor._openRestoration();
    await h.card.updateComplete;
    const dialog = h.card.renderRoot.querySelector('preview-restoration-dialog') as HTMLElement & {
      updateComplete: Promise<unknown>;
    };
    await dialog.updateComplete;
    const keep = [...dialog.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.includes('Keep current lights')
    )!;
    expect(keep.disabled).toBe(true);
    expect(controller.sessions).toHaveLength(1);
    editor._reviewRestoration(
      new CustomEvent('restoration-keep', { detail: { token: controller.reviewToken() } }),
      false
    );
    expect(editor._restorationOpen).toBe(true);
    expect(session.lights.get('light.a')?.disposition).toBe(false);
    expect(h.hass.callService).toHaveBeenCalledTimes(1);
  }
);

describe('shared saved-state read ownership', () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } };
  it.each(['latest', 'orphan', 'resume', 'lost copy'])(
    '%s read releases only its operation after permission loss, context change or a newer read',
    async (kind) => {
      for (const interruption of ['permission', 'context', 'newer']) {
        const h = await navigationCard(crypto.randomUUID(), initial),
          e = h.editor as any;
        if (kind !== 'latest') navigationEdit(h.editor);
        if (kind === 'lost copy') e._draftLost = true;
        let finish!: (value: unknown) => void;
        h.hass.callWS.mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finish = resolve;
            })
        );
        const pending =
          kind === 'latest'
            ? e._reviewLatest()
            : kind === 'lost copy'
              ? e._reviewLostLocalCopy()
              : e._readNavigationDraft(
                  e._claimedScope,
                  e._draftClaim,
                  e._draftPayload(),
                  kind === 'resume'
                );
        expect(e._savedRead).not.toBeNull();
        let newer: unknown = null;
        if (interruption === 'permission')
          h.card.hass = { ...h.hass, user: { ...h.hass.user, is_admin: false } };
        else if (interruption === 'context') {
          h.card.setConfig({ entity: 'light.other' });
          for (let i = 0; i < 8; i++) await Promise.resolve();
        } else newer = e._beginSavedRead();
        const before = structuredClone({
          curves: e._curves,
          original: e._originalCurves,
          undo: e._undoStack,
          dirty: h.card.dirty,
        });
        finish(testSnapshot(initial));
        await pending;
        expect({
          curves: e._curves,
          original: e._originalCurves,
          undo: e._undoStack,
          dirty: h.card.dirty,
        }).toEqual(before);
        expect(e._saveReview).toBeNull();
        expect(e._savedRead).toBe(newer);
        if (newer) e._finishSavedRead(newer);
        expect(h.hass.callService).not.toHaveBeenCalled();
        h.card.remove();
      }
    }
  );
  it('identity-unavailable rollback uncertainty survives group switches and authenticated hydration', async () => {
    const hass = makeHass({ user: { is_admin: true } });
    hass.callWS.mockImplementation(testBackend(initial));
    const { card } = await mountCard(initial, hass);
    const editor = card as unknown as GuardedInternals & { _runtimeBlocked: boolean };
    forceDirty(card);
    hass.callWS.mockRejectedValueOnce({ code: 'rollback_reload_failed' });
    expect(await card.saveCurves()).toBe(false);
    expect(
      hass.callWS.mock.calls.some(([message]) => message.type === 'lightener/save_curves')
    ).toBe(true);
    expect(editor._runtimeBlocked).toBe(true);
    hass.callWS.mockImplementation(async (message) =>
      testSnapshot(initial, message.entity_id === 'light.other' ? 'other-entry' : 'test-entry')
    );
    card.setConfig({ entity: 'light.other' });
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(editor._runtimeBlocked).toBe(false);
    card.setConfig({ entity: 'light.lightener' });
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(editor._runtimeBlocked).toBe(true);
    expect(await card.saveCurves()).toBe(false);
    card.hass = { ...hass, user: { is_admin: true, id: crypto.randomUUID() } };
    expect(editor._runtimeBlocked).toBe(true);
    expect(await card.saveCurves()).toBe(false);
  });
});

it.each(['latest', 'orphan', 'resume', 'lost copy'])(
  '%s reader revalidates after the shared helper await, including intervening write generations',
  async (kind) => {
    const initial = { 'light.a': { brightness: { '100': '100' } } };
    for (const interruption of [
      'principal',
      'context',
      'write generation',
      ...(['orphan', 'resume'].includes(kind) ? ['claim'] : []),
    ]) {
      const h = await navigationCard(crypto.randomUUID(), initial),
        e = h.editor as any;
      if (kind !== 'latest') navigationEdit(h.editor);
      if (kind === 'lost copy') e._draftLost = true;
      const scope = e._draftScope(),
        claim = e._draftClaim;
      let finish!: (value: unknown) => void;
      const response = new Promise((resolve) => {
        finish = resolve;
      });
      h.hass.callWS.mockReturnValueOnce(response);
      const pending =
        kind === 'latest'
          ? e._reviewLatest()
          : kind === 'lost copy'
            ? e._reviewLostLocalCopy()
            : e._readNavigationDraft(scope, claim, e._draftPayload(), kind === 'resume');
      let expected: unknown,
        transferred: any = null;
      // Registered after the helper's await: this runs after its check but before
      // the caller resumes from awaiting that helper.
      void response.then(() => {
        if (interruption === 'principal')
          editorDrafts.activatePrincipal(location.origin, crypto.randomUUID());
        if (interruption === 'context') {
          e._contextGeneration++;
          e._savedRead = null;
        }
        if (interruption === 'write generation')
          editorDrafts.beginWrite(scope, scope.configEntryId, 'intervening-write');
        if (interruption === 'claim') {
          editorDrafts.release(scope, claim);
          const summary = editorDrafts.list(scope).find((item) => item.draftId === claim.draftId)!;
          const result = editorDrafts.claim(
            scope,
            summary.draftId,
            summary.version,
            crypto.randomUUID()
          );
          expect(result.ok).toBe(true);
          if (result.ok) transferred = result.value.claim;
        }
        expected = structuredClone({
          curves: e._curves,
          original: e._originalCurves,
          undo: e._undoStack,
          dirty: h.card.dirty,
        });
      });
      finish(testSnapshot(initial));
      await pending;
      expect({
        curves: e._curves,
        original: e._originalCurves,
        undo: e._undoStack,
        dirty: h.card.dirty,
      }).toEqual(expected);
      expect(e._saveReview).toBeNull();
      if (interruption === 'write generation') {
        if (kind === 'latest') expect(e._saveState.message).toBe(UI.drafts.savedChanged);
        else if (kind !== 'lost copy') expect(e._draftNotice).toBe(UI.drafts.savedChanged);
      }
      if (transferred) expect(editorDrafts.owns(scope, transferred)).toBe(true);
      expect(h.hass.callService).not.toHaveBeenCalled();
      h.card.remove();
    }
  }
);
it('hydration before a late identity-unavailable rollback cannot hide its runtime barrier', async () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } },
    hass = makeHass({ user: { is_admin: true } });
  hass.callWS.mockImplementation(testBackend(initial));
  const { card } = await mountCard(initial, hass);
  forceDirty(card);
  let reject!: (reason: unknown) => void;
  hass.callWS.mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      })
  );
  const saving = card.saveCurves();
  card.hass = { ...hass, user: { is_admin: true, id: crypto.randomUUID() } };
  reject({ code: 'rollback_reload_failed' });
  expect(await saving).toBe(false);
  expect((card as unknown as { _runtimeBlocked: boolean })._runtimeBlocked).toBe(true);
  expect(await card.saveCurves()).toBe(false);
});

describe('reviewed failure copy', () => {
  const initial = { 'light.a': { brightness: { '100': '100' } } };
  const opaque = 'opaque-remote-failure-token';
  it.each(['latest', 'orphan', 'resume', 'lost copy'])(
    '%s read never renders arbitrary rejection text',
    async (kind) => {
      for (const failure of [new Error(opaque), { code: 'unknown', message: opaque }, opaque]) {
        const h = await navigationCard(crypto.randomUUID(), initial),
          e = h.editor as any;
        navigationEdit(h.editor);
        if (kind === 'lost copy') e._draftLost = true;
        const before = structuredClone({
          curves: e._curves,
          undo: e._undoStack,
          baseline: e._baseline,
          dirty: h.card.dirty,
        });
        h.hass.callWS.mockRejectedValueOnce(failure);
        if (kind === 'latest') await e._reviewLatest();
        else if (kind === 'lost copy') await e._reviewLostLocalCopy();
        else
          await e._readNavigationDraft(
            e._claimedScope,
            e._draftClaim,
            e._draftPayload(),
            kind === 'resume'
          );
        await h.card.updateComplete;
        expect(h.card.renderRoot.textContent).not.toContain(opaque);
        expect(kind === 'latest' ? e._saveState.message : e._draftNotice).toBe(
          kind === 'latest' ? UI.guardedSave.readFailed : UI.drafts.unavailableSaved
        );
        expect({ curves: e._curves, undo: e._undoStack, dirty: h.card.dirty }).toEqual({
          curves: before.curves,
          undo: before.undo,
          dirty: before.dirty,
        });
        expect(e._baseline).toEqual(kind === 'resume' ? null : before.baseline);
        expect(h.hass.callService).not.toHaveBeenCalled();
        expect(
          h.hass.callWS.mock.calls.filter(([m]) => m.type === 'lightener/save_curves')
        ).toEqual([]);
        h.card.remove();
      }
    }
  );
  it('retains intentional incompatible saved-state and inconsistent recovery notices', async () => {
    const h = await navigationCard(crypto.randomUUID(), initial),
      e = h.editor as any;
    navigationEdit(h.editor);
    h.hass.callWS.mockResolvedValueOnce({});
    await e._reviewLatest();
    expect(e._saveState.message).toBe(UI.guardedSave.incompatibleRead);
    const payload = e._draftPayload();
    payload.undo = [[{ entityId: 'light.removed', controlPoints: [] }]];
    h.hass.callWS.mockResolvedValueOnce(testSnapshot(initial));
    await e._readNavigationDraft(e._claimedScope, e._draftClaim, payload, false);
    expect(e._draftNotice).toBe(UI.drafts.inconsistent);
  });
  it('uses reviewed copy when deletion HTTP fails', async () => {
    const h = await navigationCard(crypto.randomUUID(), initial),
      e = h.editor as any;
    h.hass.callWS.mockResolvedValueOnce({
      platform: 'lightener_studio',
      config_entry_id: 'test-entry',
    });
    h.hass.callApi.mockRejectedValueOnce(new Error(opaque));
    await e._onDeleteGroup();
    await h.card.updateComplete;
    expect(e._manageError).toBe('Could not delete group.');
    expect(h.card.renderRoot.textContent).not.toContain(opaque);
    expect(h.hass.callService).not.toHaveBeenCalled();
  });
});
