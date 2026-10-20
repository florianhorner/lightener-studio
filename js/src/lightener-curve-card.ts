import { LitElement, html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { CurveGraph } from './components/curve-graph.js';
import type { GraphInteraction } from './utils/types.js';
import {
  FirstUseInvitation,
  INVITATION_ORIENTATION_MS,
  hasDefaultShapes,
  hasInvitationProgress,
  recordInvitationProgress,
} from './utils/first-use-invitation.js';
import {
  LightCurve,
  Hass,
  type ControlPoint,
  type CurveFrame,
  type CurvePiece,
  type DrawIn,
} from './utils/types.js';
import {
  CARD_CONFIG_TYPE,
  CARD_TYPE,
  type CustomCardsHost,
  getLightenerEntitySuggestion,
  LIGHTENER_PLATFORM,
  lightenerEntityIds,
  registerCardMetadata,
} from './utils/card-registration.js';
import { safeDefine } from './utils/safe-define.js';
import { EntityPickerLoader } from './utils/entity-picker-loader.js';
import { curvesToWsPayload, wsPayloadToCurves, cloneCurves, curvesEqual } from './utils/data.js';
import {
  canSelectCurve,
  interpolateControlPoints,
  mergeFinalAnimationFrame,
  shouldHandleKey,
  toggleCurveWithSelectionClear,
  toggleSelection,
} from './utils/card-logic.js';
import {
  addPointEdit,
  applyPresetToCurves,
  movePointOnCurves,
  pushEditUndo,
  removePointEdit,
} from './utils/edit-operations.js';
import { easeOutCubic, CURVE_COLORS } from './utils/graph-math.js';
import { PreviewController } from './utils/preview-controller.js';
import { CoachController } from './utils/coach-controller.js';
import {
  blendPieces,
  drawnShape,
  drawInClearMs,
  FIRST_USE_TIMING,
  JOY_DEFAULTS,
  type JoyFlags,
  momentPlays,
  onReducedMotionStart,
  prefersReducedMotion,
  resolveJoyFlags,
  rippleDurationMs,
  rippleFrame,
  rippleKnots,
  type RippleShape,
  rippleSpan,
  startFrameLoop,
} from './utils/motion.js';
import { CURVE_PRESETS, presetPolylinePoints, type PresetDef } from './utils/presets.js';
import { summarizeCurveShapes } from './utils/curve-summary.js';
import { UI } from './utils/strings.js';
import { curveCardStyles, DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX } from './styles/curve-card-styles.js';
import { renderEntityPickerField } from './components/entity-picker-field.js';
import {
  INITIAL_SAVE_STATE,
  type SaveState,
  errorMessage as saveErrorMessage,
  isSaved,
  isSaving,
  reduce as reduceSave,
} from './utils/save-lifecycle.js';
import { SaveConfirmGuard } from './utils/save-confirm-guard.js';
import {
  INITIAL_LOAD_STATE,
  type LoadState,
  beginLoad,
  clearForEntity,
  clearLoadedFlag,
  finishLoad,
  needsLoad,
  queueReload,
  resolveError,
  resolveSuccess,
  retryLoad,
  takePendingDirtyReload,
} from './utils/load-lifecycle.js';
import './components/curve-graph.js';
import './components/curve-scrubber.js';
import './components/curve-legend.js';
import './components/curve-footer.js';
import './components/light-membership-dialog.js';

const CARD_VERSION = '2.18.0';
const CANCEL_ANIM_DURATION_MS = 300;

/**
 * joy `ripple`: a light's shape change being drawn. `committed` is the points
 * array the change committed (the data already holds the new shape); `shown`
 * is the shape on screen.
 */
type Ripple = { entityId: string; committed: readonly ControlPoint[]; shown: RippleShape };

/** An undo or cancel that cut a ripple short: that light's line goes `t` of the way from → to. */
type MorphLine = {
  entityId: string;
  from: readonly CurvePiece[];
  to: readonly CurvePiece[];
  t: number;
};
const FOOTER_OVERLAY_VISIBILITY_TOLERANCE_PX = 1;
const MEMBERSHIP_STATUS_DURATION_MS = 2000;

function registerGraphHeightCustomProperty(): void {
  const cssRegistry = globalThis.CSS as
    | {
        registerProperty?: (definition: {
          name: string;
          syntax: string;
          inherits: boolean;
          initialValue: string;
        }) => void;
      }
    | undefined;
  if (!cssRegistry?.registerProperty) return;
  try {
    cssRegistry.registerProperty({
      name: '--curve-graph-max-height',
      syntax: '<length-percentage>',
      inherits: true,
      initialValue: `${DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX}px`,
    });
  } catch {
    // Already registered by another card bundle instance.
  }
}

if (typeof window !== 'undefined') {
  registerGraphHeightCustomProperty();
  (
    window as typeof window & { __LIGHTENER_CURVE_CARD_VERSION__?: string }
  ).__LIGHTENER_CURVE_CARD_VERSION__ = CARD_VERSION;
  // HA 2026.6 card-picker metadata + entity suggestion. First-wins: a second
  // bundle execution (extra-module URL + leftover manual resource) leaves the
  // live entry untouched.
  registerCardMetadata(window as typeof window & CustomCardsHost, {
    type: CARD_TYPE,
    name: 'Lightener Studio',
    description: 'Shape how each light responds to group brightness.',
    documentationURL: 'https://github.com/florianhorner/lightener-studio#readme',
    // Render a live preview in the picker tile (stub config → mock curves).
    preview: true,
    getEntitySuggestion: getLightenerEntitySuggestion,
  });
}

const WARNING_ICON = html`<svg
  class="status-icon"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path
    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
  ></path>
  <line x1="12" y1="9" x2="12" y2="13"></line>
  <line x1="12" y1="17" x2="12.01" y2="17"></line>
</svg>`;

function createMockCurves(): LightCurve[] {
  return [
    {
      entityId: 'light.ceiling_light',
      friendlyName: 'Ceiling Light',
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 20, target: 0 },
        { lightener: 60, target: 80 },
        { lightener: 100, target: 100 },
      ],
      visible: true,
      color: CURVE_COLORS[0],
    },
    {
      entityId: 'light.sofa_lamp',
      friendlyName: 'Sofa Lamp',
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 10, target: 50 },
        { lightener: 40, target: 100 },
        { lightener: 70, target: 100 },
        { lightener: 100, target: 60 },
      ],
      visible: true,
      color: CURVE_COLORS[1],
    },
    {
      entityId: 'light.led_strip',
      friendlyName: 'LED Strip',
      controlPoints: [
        { lightener: 0, target: 0 },
        { lightener: 1, target: 1 },
        { lightener: 100, target: 100 },
      ],
      visible: true,
      color: CURVE_COLORS[2],
    },
  ];
}

// --- Visual card editor for the HA dashboard UI ---

const LIGHT_DOMAINS = ['light'];

export class LightenerCurveCardEditor extends LitElement {
  @state() private _config: Record<string, unknown> = {};
  @state() private _hass: Hass | null = null;
  private _picker = new EntityPickerLoader(
    () => this.isConnected,
    () => this.requestUpdate()
  );

  static styles = css`
    :host {
      display: block;
      --accent: var(--primary-color, #2563eb);
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    label {
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color, #616161);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    input {
      padding: 8px 12px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      font-size: 14px;
      font-family: inherit;
    }
    input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }
    .hint {
      font-size: 11px;
      color: var(--secondary-text-color, #616161);
      opacity: 0.7;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this._picker.ensureLoaded();
  }

  setConfig(config: Record<string, unknown>): void {
    this._config = config;
    this._picker.ensureLoaded();
  }

  set hass(hass: Hass) {
    this._hass = hass;
    this._picker.ensureLoaded();
  }

  private _fireConfigChanged(): void {
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Commit one editor field. An emptied field removes its key rather than
   * leaving `key: undefined` behind, so the config Lovelace receives has no
   * phantom entries.
   */
  private _commitConfigKey(key: 'entity' | 'title', value: string): void {
    const rest = Object.fromEntries(Object.entries(this._config).filter(([name]) => name !== key));
    this._config = value ? { ...rest, [key]: value } : rest;
    this._fireConfigChanged();
  }

  private _onEntityChange(e: CustomEvent): void {
    this._commitConfigKey('entity', e.detail?.value ?? '');
  }

  private _onTitleChange(e: Event): void {
    this._commitConfigKey('title', (e.target as HTMLInputElement).value);
  }

  private _onFallbackEntityInput(e: Event): void {
    this._commitConfigKey('entity', (e.target as HTMLInputElement).value.trim());
  }

  render() {
    const currentEntity = (this._config.entity as string) ?? '';
    const currentTitle = (this._config.title as string) ?? '';
    // Only lightener-platform lights are valid targets — a normal light loads no
    // curves and errors. Narrow the picker to them. An empty list (registry not
    // hydrated yet, or no Lightener configured) falls back to all lights rather
    // than an empty picker; allow-custom-entity still permits manual entry.
    const lightenerIds = this._hass ? lightenerEntityIds(this._hass) : [];

    return html`
      <div class="form">
        <div class="field">
          <label>Entity</label>
          ${renderEntityPickerField({
            ready: this._picker.ready,
            hass: this._hass,
            value: currentEntity,
            includeDomains: LIGHT_DOMAINS,
            includeEntities: lightenerIds.length ? lightenerIds : undefined,
            placeholder: 'light.your_lightener_group',
            // Editor commits on blur/Enter, not per keystroke, so typing a
            // partial entity id doesn't rewrite the Lovelace config repeatedly.
            fallbackEvent: 'change',
            onValueChanged: this._onEntityChange,
            onFallbackInput: this._onFallbackEntityInput,
          })}
          ${this._picker.ready
            ? html`<span class="hint"
                >Only Lightener groups are listed — pick one to shape its lights.</span
              >`
            : html`<span class="hint">
                Entity picker unavailable — enter the group entity ID manually (must start with
                <code>light.</code>).
              </span>`}
        </div>
        <div class="field">
          <label>Title (optional)</label>
          <input
            type="text"
            .value=${currentTitle}
            placeholder="Brightness shapes"
            @input=${this._onTitleChange}
          />
        </div>
      </div>
    `;
  }
}

safeDefine('lightener-curve-card-editor', LightenerCurveCardEditor);

export class LightenerCurveCard extends LitElement {
  /** Local experiment entry point; never inferred from dashboard YAML. */
  @property({ attribute: false }) experimentalFirstUse = false;
  private _invitation = new FirstUseInvitation(() => this.requestUpdate());
  private _invitationAutoAllowed = false;
  private _invitationVisible = false;
  private _invitationGraph: Element | null = null;
  private _invitationObserver: IntersectionObserver | null = null;
  private _invitationStartTimer: ReturnType<typeof setTimeout> | null = null;
  private _invitationMotionUnsubscribe: (() => void) | null = null;
  private _invitationInput = 'mouse';
  private _invitationHintTimer: ReturnType<typeof setTimeout> | null = null;
  @state() private _invitationEditHint: string | null = null;
  @state() private _invitationTogether = false;
  @state() private _curves: LightCurve[] = [];
  @state() private _originalCurves: LightCurve[] = [];
  @state() private _config: Record<string, unknown> = {};
  @state() private _selectedCurveId: string | null = null;
  private _sessionStateInitialized = false;
  @state() private _saveState: SaveState = INITIAL_SAVE_STATE;
  // Curve-load state machine. Held as one @state() object reassigned via the
  // pure helpers in utils/load-lifecycle.ts — never mutated in place — so Lit
  // re-renders on every transition (same pattern as _saveState above).
  @state() private _load: LoadState = INITIAL_LOAD_STATE;
  @state() private _manageError: string | null = null;
  @state() private _managingLights = false;
  @state() private _groupDeleted = false;

  private get _saving(): boolean {
    return isSaving(this._saveState);
  }
  private get _saveSuccess(): boolean {
    return isSaved(this._saveState);
  }
  private get _saveError(): string | null {
    return saveErrorMessage(this._saveState);
  }

  private _dispatchSave(action: Parameters<typeof reduceSave>[1]): void {
    const leftConfirming = this._saveState.phase === 'confirming';
    this._saveState = reduceSave(this._saveState, action);
    if (action.type === 'save-start' && this._saveState.phase === 'saving') {
      this._clearMembershipStatus();
    }
    if (this._saveState.phase !== 'confirming') {
      // Leaving (or already out of) the confirming phase: the guard clears its
      // confirm timer and, when we just left, settles any pending saveCurves()
      // awaiter — 'error' (including the confirm-timeout) reports failure,
      // anything else (saved / idle) reports a confirmed success.
      this._saveGuard.onLeaveConfirming(this._saveState.phase, leftConfirming);
    }
  }
  @state() private _scrubberPosition: number | null = null;
  @state() private _cancelAnimating = false;
  /** Opt-in motion moments from the `joy:` config key; every moment is off by default. */
  @state() private _joy: JoyFlags = JOY_DEFAULTS;
  /** Newly added lights; their curves are already committed by the membership transaction. */
  @state() private _drawIn: DrawIn | null = null;
  private _drawInToken = 0;
  private _drawInTimer: ReturnType<typeof setTimeout> | null = null;
  private _drawInWaitingForVisible = false;
  private _unsubscribeDrawInMotion: (() => void) | null = null;
  private _boundStopDrawIn = (event?: Event): void => {
    // A pointerdown can begin a touch scroll while this graph is still offscreen.
    // Let the pending reveal wait for visibility; a completed click still ends it.
    if (event?.type === 'pointerdown' && this._drawInWaitingForVisible) return;
    this._stopDrawIn();
  };
  /** The running ripple; display only, it ends as soon as that light's points are replaced. */
  @state() private _ripple: Ripple | null = null;
  private _cancelRippleLoop: (() => void) | null = null;
  @state() private _morphLine: MorphLine | null = null;

  @state() private _hass: Hass | null = null;
  private _undoStack: LightCurve[][] = [];
  private _dragUndoPushed = false;
  private _dragActive = false;
  private _boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _boundBeforeUnload: ((e: BeforeUnloadEvent) => void) | null = null;
  private _boundFooterOverlaySync: (() => void) | null = null;
  private _footerOverlayFrame: number | null = null;
  // Owns the post-save confirmation fence (8s confirm timer, 2s success timer,
  // save generation, awaiter resolver). The confirm/-error signal fires from the
  // load path, fenced by the guard's generation. See save-confirm-guard.ts.
  private _saveGuard = new SaveConfirmGuard({
    dispatchSave: (action) => this._dispatchSave(action),
    getSavePhase: () => this._saveState.phase,
  });
  private _cancelAnimFrame: number | null = null;
  @state() private _previewActive = false;
  @state() private _presetGraphTrial: PresetDef | null = null;
  private _pendingPresetGraphTrial: PresetDef | null = null;
  private _hoveredPresetGraphTrial: PresetDef | null = null;
  private _focusedPresetGraphTrial: PresetDef | null = null;
  @state() private _membershipOpen = false;
  @state() private _membershipStatus: string | null = null;
  private _membershipStatusTimer: number | null = null;
  private _coach = new CoachController({
    isReady: () => this._load.loaded && this._selectedCurve !== undefined,
    setTrial: (preset) => this._setPresetGraphTrial(preset),
    clearTrial: () => this._clearPresetGraphTrial(),
    requestUpdate: () => this.requestUpdate(),
  });
  private _lastPresetPointerType: string | null = null;
  private _previewController = new PreviewController({
    getHass: () => this._hass,
    getCurves: () => this._curves,
    getScrubberPosition: () => this._effectiveScrubberPosition,
    setScrubberPosition: (position) => {
      this._scrubberPosition = position;
    },
    getStorageEntityId: () => this._storageEntityId,
    persistScrubberPosition: (entityId, position) => {
      this._writeStoredState(entityId, { scrubberPosition: position });
    },
    setPreviewActive: (active) => {
      this._previewActive = active;
    },
  });
  private _lastEmittedDirtyState = false;
  private _dirtyVersion = 0;
  private _cleanVersion = 0;

  get _lastPreviewTime(): number {
    return this._previewController.lastPreviewTime;
  }

  set _lastPreviewTime(value: number) {
    this._previewController.lastPreviewTime = value;
  }

  private get _embedded(): boolean {
    return this._config.embedded === true;
  }

  static styles = curveCardStyles;

  // --- HA card interface ---

  static getConfigElement(): HTMLElement {
    return document.createElement('lightener-curve-card-editor');
  }

  static getStubConfig(): Record<string, unknown> {
    return { type: CARD_CONFIG_TYPE };
  }

  setConfig(config: Record<string, unknown>): void {
    const entityChanged = config.entity !== this._config.entity;
    if (entityChanged) this._dismissInvitation();
    const firstRun = config.firstRun === true;
    this._config = config;
    this._joy = resolveJoyFlags(config.joy);
    if (entityChanged || !this._joy.ripple) this._stopRipple();
    if (entityChanged || !this._joy.draw_in) this._stopDrawIn();
    if (entityChanged) {
      this._clearMembershipStatus();
      if (this._previewActive) this._stopPreview();
      this._setMembershipOpen(false);
      this._dragActive = false;
      this._load = clearForEntity(this._load);
      this._groupDeleted = false;
      this._clearPresetGraphTrial();
      this._selectedCurveId = null;
      this._scrubberPosition = null;
      this._sessionStateInitialized = false;
      this._undoStack = [];
      this._invitationAutoAllowed = false;
      this._invitationEditHint = null;
      this._invitationTogether = false;
      this._coach.configure(firstRun && !this.experimentalFirstUse, true);
      // Abandon any unsaved edits so the dirty-reload guard in _tryLoadCurves()
      // does not block the incoming response for the new entity.
      this._cleanVersion = this._dirtyVersion;
      this._tryLoadCurves();
    } else {
      this._coach.configure(firstRun && !this.experimentalFirstUse, false);
    }
  }

  set hass(hass: Hass) {
    const hadHass = !!this._hass;
    this._hass = hass;
    // Only load on first hass assignment or if not yet loaded
    if (!hadHass || !this._load.loaded) {
      if (!this._dragActive) {
        this._tryLoadCurves();
      }
    }
  }

  getCardSize(): number {
    return 4;
  }

  getGridOptions() {
    return {
      columns: 12,
      rows: 9,
      min_columns: 6,
      min_rows: 6,
    };
  }

  // --- Data loading ---

  private get _isAdmin(): boolean {
    return this._hass?.user?.is_admin ?? false;
  }

  private get _entityId(): string | undefined {
    return this._config.entity as string | undefined;
  }

  // Entity id that keys persisted session UI state (selection, scrubber). Prefer
  // the entity whose curves are actually loaded; fall back to the configured one
  // before the first load settles.
  private get _storageEntityId(): string | undefined {
    return this._load.loadedEntityId ?? this._entityId;
  }

  private get _isDirty(): boolean {
    return this._dirtyVersion !== this._cleanVersion;
  }

  private get _membershipLocked(): boolean {
    return this._membershipOpen || this._managingLights;
  }

  // The curve for the currently-selected light, or undefined when nothing is
  // selected or the selected id no longer maps to a curve (race during reload).
  private get _selectedCurve(): LightCurve | undefined {
    if (this._selectedCurveId === null) return undefined;
    return this._curves.find((c) => c.entityId === this._selectedCurveId);
  }

  private get _canShowPresetGraphTrial(): boolean {
    return (
      this._selectedCurve !== undefined &&
      !this._saving &&
      !this._cancelAnimating &&
      !this._drawIn &&
      !this._membershipLocked &&
      !this._previewActive
    );
  }

  private get _isShowingPresetGraphTrial(): boolean {
    return (
      this._presetGraphTrial !== null &&
      this._canShowPresetGraphTrial &&
      this._liveRipple?.entityId !== this._selectedCurveId
    );
  }

  private get _graphCurves(): LightCurve[] {
    const example = this._invitation.curve;
    return example
      ? this._curves.map((c) => (c.entityId === example.entityId ? example : c))
      : this._curves;
  }

  /**
   * The one position every surface shows. The scrubber thumb used to default
   * on its own while the graph and legend received null and rendered
   * nothing — the slider claimed a brightness the graph never showed.
   * Internal state stays null until touched so session restore still works.
   */
  private get _effectiveScrubberPosition(): number {
    return this._scrubberPosition ?? 100;
  }

  private get _presetPreviewCurve(): LightCurve | null {
    const selected = this._selectedCurve;
    if (!selected?.visible) return null;
    // A chosen shape stays visible until its drawing reaches it. The ripple
    // owns this target, so cancellation cannot leave a stale hover preview.
    const ripple = this._liveRipple;
    const points =
      ripple?.entityId === selected.entityId
        ? ripple.committed
        : this._canShowPresetGraphTrial && this._isShowingPresetGraphTrial
          ? this._presetGraphTrial?.controlPoints
          : null;
    if (!points) return null;
    return {
      ...selected,
      controlPoints: [...points],
      visible: true,
    };
  }

  private get _invitationTarget(): LightCurve | undefined {
    const available = (curve: LightCurve): boolean => {
      const status = this._hass?.states[curve.entityId]?.state;
      return (
        curve.visible && status !== undefined && status !== 'unavailable' && status !== 'unknown'
      );
    };
    return (
      this._curves.find((curve) => curve.entityId === this._selectedCurveId && available(curve)) ??
      this._curves.find(available)
    );
  }

  private get _canRunInvitation(): boolean {
    const selected = this._invitation.curve ? this._selectedCurve : this._invitationTarget;
    const graph = this.renderRoot.querySelector<CurveGraph>('curve-graph');
    const status = selected && this._hass?.states[selected.entityId]?.state;
    return (
      this.experimentalFirstUse &&
      (!graph?.interactionActive || !!this._invitation.curve) &&
      this.isConnected &&
      this._isAdmin &&
      this._load.loaded &&
      this._load.loadedEntityId === this._entityId &&
      !this._load.loading &&
      !this._load.loadError &&
      !this._groupDeleted &&
      !this._saving &&
      !this._saveSuccess &&
      !this._saveError &&
      !this._isDirty &&
      !this._cancelAnimating &&
      !this._membershipLocked &&
      !this._previewActive &&
      !this._drawIn &&
      !this._isShowingPresetGraphTrial &&
      !!selected?.visible &&
      status !== undefined &&
      status !== 'unavailable' &&
      status !== 'unknown'
    );
  }

  private _startInvitation(automatic = false): void {
    this._clearInvitationStartTimer();
    if (this.renderRoot.querySelector<CurveGraph>('curve-graph')?.interactionActive) return;
    if (automatic && !hasDefaultShapes(this._curves)) {
      this._invitationAutoAllowed = false;
      return;
    }
    const target = this._invitationTarget;
    if (!this._canRunInvitation || !target || !this._entityId) return;
    this._selectedCurveId = target.entityId;
    this._invitationAutoAllowed = false;
    this._clearPresetGraphTrial();
    this._coach.dismiss();
    this._invitationEditHint = null;
    this._invitationTogether = false;
    this._invitation.start(target, this._joy.ripple);
    this._invitationMotionUnsubscribe?.();
    this._invitationMotionUnsubscribe = onReducedMotionStart(() => this._invitation.freeze());
    recordInvitationProgress(this._entityId, 'seen');
  }

  private _dismissInvitation(): void {
    this._clearInvitationStartTimer();
    this._invitationAutoAllowed = false;
    if (!this._invitation.curve) return;
    const graph = this.renderRoot.querySelector<CurveGraph>('curve-graph');
    const focused = graph?.shadowRoot?.activeElement;
    const focusCurve = focused && graph?.curves[Number(focused.getAttribute('data-curve'))];
    const focusPoint = focusCurve?.controlPoints[Number(focused?.getAttribute('data-point'))];
    const group = this._entityId;
    graph?.cancelInteraction();
    this._dragActive = false;
    this._dragUndoPushed = false;
    this._invitation.clear();
    this._invitationMotionUnsubscribe?.();
    this._invitationMotionUnsubscribe = null;
    if (this._entityId) recordInvitationProgress(this._entityId, 'dismissed');
    if (focused) {
      void this.updateComplete.then(async () => {
        await graph?.updateComplete;
        const current = this.shadowRoot?.activeElement;
        const activePoint = graph?.shadowRoot?.activeElement;
        // Rendering can remove a temporary handle, but recovery must not reclaim
        // focus after the user has already moved outside this card (including HA shadows).
        let pageFocus = document.activeElement;
        while (pageFocus?.shadowRoot?.activeElement) {
          pageFocus = pageFocus.shadowRoot.activeElement;
        }
        const ownsFocus =
          !pageFocus ||
          [document.body, document.documentElement, this, graph, focused].includes(pageFocus);
        if (
          group === this._entityId &&
          ownsFocus &&
          (!current || current === graph) &&
          (!activePoint || activePoint === focused)
        ) {
          if (
            !focusCurve ||
            !focusPoint ||
            !graph?.focusPoint(focusCurve.entityId, focusPoint.lightener)
          ) {
            this.renderRoot
              .querySelector<HTMLButtonElement>('.invitation-replay')
              ?.focus({ preventScroll: true });
          }
        }
      });
    }
  }

  private _finishInvitation(): void {
    if (!this._invitation.curve) return;
    // The same native gesture now owns the edit. Never reset its graph/capture here.
    this._invitation.clear();
    this._invitationMotionUnsubscribe?.();
    this._invitationMotionUnsubscribe = null;
    if (this._entityId) recordInvitationProgress(this._entityId, 'completed');
    this._invitationTogether = true;
    this._invitationEditHint =
      this._invitationInput === 'touch' || this._invitationInput === 'pen'
        ? UI.invitation.touchAdd
        : this._invitationInput === 'keyboard'
          ? UI.invitation.keyboardAdd
          : UI.invitation.mouseAdd;
    if (this._invitationHintTimer !== null) clearTimeout(this._invitationHintTimer);
    this._invitationHintTimer = setTimeout(() => {
      this._invitationEditHint = null;
      this._invitationTogether = false;
      this._invitationHintTimer = null;
    }, FIRST_USE_TIMING.context);
    if (this._storageEntityId)
      this._writeStoredState(this._storageEntityId, { selectedCurveId: this._selectedCurveId });
  }

  private _onGraphInteraction(e: CustomEvent<GraphInteraction>): void {
    if (this.experimentalFirstUse) this.requestUpdate();
    if (e.detail.phase !== 'start') return;
    this._clearInvitationStartTimer();
    this._invitationAutoAllowed = false;
    this._invitationInput = e.detail.input;
    if (this._invitation.curve) this._invitation.freeze();
  }

  private _onInvitationControl = (e: Event): void => {
    if (!this.experimentalFirstUse) return;
    if (
      e
        .composedPath()
        .some(
          (node) =>
            node instanceof Element &&
            (node.localName === 'curve-graph' || node.classList.contains('invitation-dismiss'))
        )
    )
      return;
    if (e instanceof KeyboardEvent && ['Tab', 'Shift', 'Escape'].includes(e.key)) return;
    this._dismissInvitation();
  };

  private _onInvitationVisibility = (): void => {
    if (document.hidden) this._dismissInvitation();
  };

  private _clearInvitationStartTimer(): void {
    if (this._invitationStartTimer !== null) clearTimeout(this._invitationStartTimer);
    this._invitationStartTimer = null;
  }

  private _scheduleAutomaticInvitation(): void {
    if (
      !this._invitationAutoAllowed ||
      !this._invitationVisible ||
      document.hidden ||
      !this._canRunInvitation
    ) {
      this._clearInvitationStartTimer();
      return;
    }
    if (this._invitationStartTimer !== null) return;
    const group = this._entityId;
    const graph = this._invitationGraph;
    this._invitationStartTimer = setTimeout(() => {
      this._invitationStartTimer = null;
      if (
        group === this._entityId &&
        graph === this._invitationGraph &&
        this._invitationAutoAllowed &&
        this._invitationVisible &&
        !document.hidden
      )
        this._startInvitation(true);
    }, INVITATION_ORIENTATION_MS);
  }

  private _syncInvitation(): void {
    if (!this.experimentalFirstUse) return;
    const graph = this.renderRoot.querySelector('curve-graph');
    if (graph !== this._invitationGraph) {
      this._clearInvitationStartTimer();
      this._invitationObserver?.disconnect();
      this._invitationGraph = graph;
      this._invitationVisible = false;
      if (graph && typeof IntersectionObserver !== 'undefined') {
        this._invitationObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries.find((e) => e.target === this._invitationGraph);
            if (!entry) return;
            const wasVisible = this._invitationVisible;
            this._invitationVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
            if (!this._invitationVisible) {
              this._clearInvitationStartTimer();
              if (wasVisible || this._invitation.curve) this._dismissInvitation();
            } else this._scheduleAutomaticInvitation();
          },
          { threshold: [0, 0.5] }
        );
        this._invitationObserver.observe(graph);
      } else this._invitationVisible = !!graph;
    }
    if (this._invitation.curve && !this._canRunInvitation) this._dismissInvitation();
    this._scheduleAutomaticInvitation();
  }

  private get _canManageLights(): boolean {
    return (
      this._isAdmin &&
      !!this._hass &&
      !!this._entityId &&
      !this._isDirty &&
      !this._saving &&
      !this._cancelAnimating &&
      !this._load.loading &&
      !this._membershipLocked &&
      !this._load.loadError &&
      !this._groupDeleted
    );
  }

  public get dirty(): boolean {
    return this._isDirty;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Reset load state on re-mount so data is refreshed.
    // Skip the reset if we already have a load error for the same entity — avoids
    // re-spamming the backend (and the HA log) every time the card re-mounts on a
    // misconfigured entity ID.
    if (this._load.loadErrorEntityId !== this._entityId) {
      this._load = clearLoadedFlag(this._load);
    }
    // If the card was previously deleted from inside this instance and the
    // dashboard has since been re-pointed at a different entity, clear the
    // sentinel so the new entity loads. If the entity is unchanged across
    // remount (navigate away and back, conditional re-render), keep the
    // deleted state — re-fetching curves for a removed config entry would
    // either 404 or render an empty grid that looks like a fresh group.
    if (this._groupDeleted && this._load.loadedEntityId !== this._entityId) {
      this._groupDeleted = false;
      this._load = clearLoadedFlag(this._load);
    }
    this._tryLoadCurves();

    this._boundKeyHandler = this._onKeyDown.bind(this);
    this._boundBeforeUnload = this._onBeforeUnload.bind(this);
    window.addEventListener('keydown', this._boundKeyHandler);
    window.addEventListener('beforeunload', this._boundBeforeUnload);
    this._boundFooterOverlaySync = () => this._scheduleFooterOverlaySync();
    window.addEventListener('resize', this._boundFooterOverlaySync);
    window.addEventListener('scroll', this._boundFooterOverlaySync, { passive: true });
    window.visualViewport?.addEventListener('resize', this._boundFooterOverlaySync);
    window.visualViewport?.addEventListener('scroll', this._boundFooterOverlaySync);
    this._coach.connect(this);
    this.addEventListener('pointerdown', this._onInvitationControl, true);
    this.addEventListener('keydown', this._onInvitationControl, true);
    document.addEventListener('visibilitychange', this._onInvitationVisibility);
  }

  disconnectedCallback(): void {
    this._dismissInvitation();
    this._invitationObserver?.disconnect();
    this._invitationGraph = null;
    this._invitationMotionUnsubscribe?.();
    this._invitationMotionUnsubscribe = null;
    if (this._invitationHintTimer !== null) clearTimeout(this._invitationHintTimer);
    this._invitationHintTimer = null;
    this.removeEventListener('pointerdown', this._onInvitationControl, true);
    this.removeEventListener('keydown', this._onInvitationControl, true);
    document.removeEventListener('visibilitychange', this._onInvitationVisibility);
    super.disconnectedCallback();
    this._stopDrawIn();
    this._clearMembershipStatus();
    if (this._previewActive) this._stopPreview();
    this._clearPresetGraphTrial();
    this._setMembershipOpen(false);
    this._coach.disconnect();
    this._previewController.disconnect();
    this._dragActive = false;
    if (this._boundKeyHandler) {
      window.removeEventListener('keydown', this._boundKeyHandler);
    }
    if (this._boundBeforeUnload) {
      window.removeEventListener('beforeunload', this._boundBeforeUnload);
    }
    if (this._boundFooterOverlaySync) {
      window.removeEventListener('resize', this._boundFooterOverlaySync);
      window.removeEventListener('scroll', this._boundFooterOverlaySync);
      window.visualViewport?.removeEventListener('resize', this._boundFooterOverlaySync);
      window.visualViewport?.removeEventListener('scroll', this._boundFooterOverlaySync);
    }
    if (this._footerOverlayFrame !== null) {
      cancelAnimationFrame(this._footerOverlayFrame);
      this._footerOverlayFrame = null;
    }
    this._clearFooterOverlay();
    // A disconnect mid-confirmation must not leave the card stuck. The backend
    // re-fetch never confirmed, so settle the pending saveCurves() awaiter as a
    // failure BEFORE the reset — `reset` -> idle would otherwise make the guard
    // (via _dispatchSave -> onLeaveConfirming) settle it as 'confirmed'. Then
    // drop the load flag and leave `confirming` so a reconnected card has live
    // controls. settleError() must run before the reset dispatch; dispose()
    // (timers + a final idempotent settle) runs last.
    if (this._saveState.phase === 'confirming') {
      this._saveGuard.settleError();
      this._load = {
        ...this._load,
        loading: false,
        loaded: false,
        reloadAfterLoadEntityId: undefined,
      };
      this._dispatchSave({ type: 'reset' });
    }
    this._saveGuard.dispose();
    if (this._cancelAnimFrame) {
      cancelAnimationFrame(this._cancelAnimFrame);
      this._cancelAnimFrame = null;
      this._cancelAnimating = false;
    }
    this._morphLine = null;
    this._stopRipple();
  }

  protected updated(changedProps: Map<PropertyKey, unknown>): void {
    super.updated(changedProps);
    this._syncInvitation();

    if (
      changedProps.has('_curves') ||
      changedProps.has('_originalCurves') ||
      changedProps.has('_cancelAnimating')
    ) {
      const dirty = this._isDirty;
      if (dirty !== this._lastEmittedDirtyState) {
        this._lastEmittedDirtyState = dirty;
        this.dispatchEvent(
          new CustomEvent('curve-dirty-state', {
            detail: { dirty },
            bubbles: true,
            composed: true,
          })
        );
        if (dirty) {
          this._dispatchSave({ type: 'dirty' });
        }
      }
    }
    this._scheduleFooterOverlaySync();
  }

  private _scheduleFooterOverlaySync(): void {
    if (this._footerOverlayFrame !== null) return;
    this._footerOverlayFrame = requestAnimationFrame(() => {
      this._footerOverlayFrame = null;
      this._syncFooterOverlay();
    });
  }

  private _syncFooterOverlay(): void {
    const footerSlot = this.renderRoot.querySelector<HTMLElement>('.footer-slot');
    const workspace = this.renderRoot.querySelector<HTMLElement>('.workspace');
    if (!footerSlot || !workspace) return;

    if (!this._embedded || !footerSlot.classList.contains('active')) {
      this._clearFooterOverlay();
      return;
    }

    this._clearFooterOverlay();
    const workspaceBox = workspace.getBoundingClientRect();
    const footerBox = footerSlot.getBoundingClientRect();
    const viewportHeight =
      window.visualViewport?.height ?? document.documentElement.clientHeight ?? window.innerHeight;
    const hiddenEndDistance = footerBox.bottom - viewportHeight;
    // A visible border or padding sliver does not make the action buttons
    // reachable. Rescue partially hidden footers as well as fully hidden ones.
    const shouldOverlay = hiddenEndDistance > FOOTER_OVERLAY_VISIBILITY_TOLERANCE_PX;

    if (!shouldOverlay) {
      return;
    }

    const left = Math.max(0, workspaceBox.left);
    const width = Math.max(0, Math.min(workspaceBox.width, window.innerWidth - left));
    footerSlot.dataset.overlay = 'true';
    footerSlot.style.setProperty('--curve-footer-overlay-left', `${left}px`);
    footerSlot.style.setProperty('--curve-footer-overlay-width', `${width}px`);
  }

  private _clearFooterOverlay(): void {
    const footerSlot = this.renderRoot.querySelector<HTMLElement>('.footer-slot');
    if (!footerSlot) return;
    delete footerSlot.dataset.overlay;
    footerSlot.style.removeProperty('--curve-footer-overlay-left');
    footerSlot.style.removeProperty('--curve-footer-overlay-width');
  }

  private _setPresetGraphTrial(preset: PresetDef | null): void {
    if (this._presetGraphTrial?.id === preset?.id) return;
    this._presetGraphTrial = preset;
    this.dispatchEvent(
      new CustomEvent('preset-trial-change', {
        detail: { presetId: preset?.id ?? null },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _clearPresetGraphTrial(): void {
    this._pendingPresetGraphTrial = null;
    this._hoveredPresetGraphTrial = null;
    this._focusedPresetGraphTrial = null;
    this._setPresetGraphTrial(null);
    this._lastPresetPointerType = null;
  }

  private _dismissCoach(): void {
    this._coach.dismiss();
    void this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLButtonElement>('.coach-help')?.focus();
    });
  }

  private _toggleCoach(): void {
    if (!this._isAdmin || this._saving || this._cancelAnimating || this._membershipLocked) return;
    if (this._coach.phase !== 'inactive') {
      this._dismissCoach();
      return;
    }
    // Help is available on normal sidebar entry and after reload. It uses the
    // current edit state; no stored onboarding status or inferred completion.
    this._coach.toggle(this._isDirty);
  }

  private _rememberPresetPointer(event: PointerEvent): void {
    this._lastPresetPointerType = event.pointerType;
  }

  private _startPresetGraphTrial(preset: PresetDef, event?: Event): void {
    if (this._invitation.curve) return;
    const pointerType =
      event && 'pointerType' in event
        ? String((event as PointerEvent).pointerType)
        : this._lastPresetPointerType;
    if (pointerType === 'touch') return;
    if (!this._canShowPresetGraphTrial && !this._drawIn) return;
    this._coach.stopShimmer();
    if (event?.type === 'pointerenter') this._hoveredPresetGraphTrial = preset;
    if (event?.type === 'focus') this._focusedPresetGraphTrial = preset;
    if (this._drawIn) {
      this._pendingPresetGraphTrial = preset;
      return;
    }
    if (!this._canShowPresetGraphTrial) return;
    this._setPresetGraphTrial(preset);
  }

  private _endPresetGraphTrial(preset: PresetDef, event: Event): void {
    if (event.type === 'blur') {
      if (this._focusedPresetGraphTrial?.id === preset.id) this._focusedPresetGraphTrial = null;
    } else if (this._hoveredPresetGraphTrial?.id === preset.id) {
      this._hoveredPresetGraphTrial = null;
    }
    // The remembered pointer type only stands in for the synthetic focus that
    // follows a tap/click on this button. Once the pointer or focus leaves,
    // drop it so a later keyboard focus isn't suppressed by a stale 'touch'.
    this._lastPresetPointerType = null;
    const remaining = this._hoveredPresetGraphTrial ?? this._focusedPresetGraphTrial;
    if (remaining) this._startPresetGraphTrial(remaining);
    else this._clearPresetGraphTrial();
  }

  private _applyPreset(preset: PresetDef): void {
    this._dismissInvitation();
    if (this._cancelAnimating || this._saving || this._membershipLocked) return;
    const selectedCurve = this._selectedCurve;
    if (!selectedCurve) {
      this._clearPresetGraphTrial();
      return;
    }
    const selectedCurveId = selectedCurve.entityId;
    const nextCurves = applyPresetToCurves(this._curves, selectedCurveId, preset.controlPoints);
    this._clearPresetGraphTrial();
    if (curvesEqual(nextCurves, this._curves)) {
      return;
    }
    // Read before the commit replaces the points: a running ripple's frame, if any.
    // With the moment off nothing is read, so a chip click runs the code it always did.
    const shown = momentPlays(this._joy, 'ripple') ? this._shownShape(selectedCurve) : null;
    this._commitCurveEdit(nextCurves);
    this._startRipple(selectedCurveId, shown);
    this._coach.afterEdit();
  }

  /** The running ripple while its light still holds the points it committed, else null. */
  private get _liveRipple(): Ripple | null {
    const ripple = this._ripple;
    const current = ripple && this._curves.find((c) => c.entityId === ripple.entityId);
    return ripple && current?.controlPoints === ripple.committed ? ripple : null;
  }

  /** The shape a curve shows: a running ripple's frame, else its own points. */
  private _shownShape(curve: LightCurve): RippleShape {
    const ripple = this._liveRipple;
    return ripple?.entityId === curve.entityId ? ripple.shown : drawnShape(curve.controlPoints);
  }

  /**
   * Joy moment `ripple`: the light's new shape is already the data; only the
   * drawing moves from `shown` to it, point by point from the left. Its own
   * frame loop, so input is never blocked. `shown` is null when the moment
   * does not play (flag off or reduced motion): then it only ends a ripple.
   */
  private _startRipple(entityId: string, shown: RippleShape | null): void {
    this._stopRipple();
    if (!shown) return;
    const committed = this._curves.find((c) => c.entityId === entityId)?.controlPoints;
    if (!committed) return;
    const span = rippleSpan(shown, drawnShape(committed));
    this._ripple = { entityId, committed, shown: rippleFrame(span, 0) };
    this._cancelRippleLoop = startFrameLoop(
      rippleDurationMs(span),
      (elapsed) => {
        // The light's points were replaced (a drag, an add, a reload) or reduced
        // motion came on: the data is already right, so just stop drawing.
        if (!this._liveRipple || prefersReducedMotion()) {
          this._stopRipple();
          return;
        }
        this._ripple = { entityId, committed, shown: rippleFrame(span, elapsed) };
      },
      () => this._stopRipple()
    );
  }

  private _stopRipple(): void {
    this._cancelRippleLoop?.();
    this._cancelRippleLoop = null;
    this._ripple = null;
  }

  /** A press on a point of the rippling light ends the ripple, so the drag starts where the point really is. */
  private _onGraphPointerDown = (e: PointerEvent): void => {
    // Only the primary button starts a drag in the graph.
    if (e.button !== 0) return;
    const ripple = this._liveRipple;
    if (!ripple) return;
    const curveIdx = (e.composedPath()[0] as Element | undefined)?.getAttribute?.('data-curve');
    if (curveIdx == null) return;
    if (this._curves[Number(curveIdx)]?.entityId === ripple.entityId) this._stopRipple();
  };

  /** For an undo or cancel that cuts a ripple short: that light's line, from the frame on screen to its end shape. */
  private _cutRippleLine(endCurves: LightCurve[]): Omit<MorphLine, 't'> | null {
    const ripple = this._liveRipple;
    const end = ripple && endCurves.find((c) => c.entityId === ripple.entityId);
    return ripple && end
      ? {
          entityId: ripple.entityId,
          from: ripple.shown.pieces,
          to: drawnShape(end.controlPoints).pieces,
        }
      : null;
  }

  /** The one curve the graph draws mid-animation, or null. */
  private get _curveFrame(): CurveFrame | null {
    const morph = this._morphLine;
    if (morph) {
      return {
        entityId: morph.entityId,
        pieces: blendPieces(morph.from, morph.to, morph.t),
        knots: null,
      };
    }
    const ripple = this._liveRipple;
    if (!ripple) return null;
    return {
      entityId: ripple.entityId,
      pieces: ripple.shown.pieces,
      knots: rippleKnots(ripple.committed, ripple.shown),
    };
  }

  private _controlPointsEqual(
    a: LightCurve['controlPoints'],
    b: LightCurve['controlPoints']
  ): boolean {
    if (a.length !== b.length) return false;
    return a.every(
      (point, idx) => point.lightener === b[idx]?.lightener && point.target === b[idx]?.target
    );
  }

  private _matchingPresetId(curve: LightCurve): string | null {
    return (
      CURVE_PRESETS.find((preset) =>
        this._controlPointsEqual(curve.controlPoints, preset.controlPoints)
      )?.id ?? null
    );
  }

  private _presetChipLabel(preset: PresetDef): string {
    return UI.presets.chipLabels[preset.id as keyof typeof UI.presets.chipLabels] ?? preset.name;
  }

  private _renderPresetSparkline(preset: PresetDef) {
    return html`
      <svg class="shape-chip-spark" viewBox="0 0 64 40" aria-hidden="true">
        <polyline
          points=${presetPolylinePoints(preset)}
          fill="none"
          stroke="var(--accent, #2563eb)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></polyline>
      </svg>
    `;
  }

  private _renderShapeChips() {
    const selected = this._selectedCurve;
    if (!selected || !this._isAdmin || this._membershipLocked) return nothing;
    const currentPresetId = this._matchingPresetId(selected);
    const trialPresetId = this._isShowingPresetGraphTrial ? this._presetGraphTrial?.id : null;

    return html`
      <div class="shape-chip-bar" role="group" aria-label=${UI.presets.panelAria}>
        ${CURVE_PRESETS.map((preset) => {
          const isTrial = trialPresetId === preset.id;
          const isExample = this._invitation.presetHighlighted && preset.id === 'dim_accent';
          const isActive =
            !this._invitation.curve &&
            (isTrial || (!trialPresetId && currentPresetId === preset.id));
          return html`
            <button
              class="preset-option shape-chip ${isTrial ? 'trial' : ''} ${isActive
                ? 'active'
                : ''} ${isExample ? 'invitation-chip' : ''}"
              data-preset=${preset.id}
              aria-current=${isActive ? 'true' : nothing}
              aria-label=${`${preset.name}. ${isExample ? UI.invitation.forLight(selected.friendlyName) : UI.presets.chooseForLight(selected.friendlyName)}`}
              @pointerdown=${(event: PointerEvent) => this._rememberPresetPointer(event)}
              @pointerenter=${(event: PointerEvent) => this._startPresetGraphTrial(preset, event)}
              @pointerleave=${(event: PointerEvent) => this._endPresetGraphTrial(preset, event)}
              @pointercancel=${(event: PointerEvent) => this._endPresetGraphTrial(preset, event)}
              @focus=${(event: FocusEvent) => this._startPresetGraphTrial(preset, event)}
              @blur=${(event: FocusEvent) => this._endPresetGraphTrial(preset, event)}
              @click=${() => this._applyPreset(preset)}
            >
              ${this._renderPresetSparkline(preset)}
              <span class="shape-chip-name">${this._presetChipLabel(preset)}</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  private _storedStateKey(entityId: string): string {
    return `lightener:curve-card:v1:${entityId}`;
  }

  private _readStoredState(
    entityId: string
  ): { selectedCurveId: string | null; scrubberPosition: number | null } | null {
    try {
      const raw = sessionStorage.getItem(this._storedStateKey(entityId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const selectedCurveId =
        typeof parsed.selectedCurveId === 'string' || parsed.selectedCurveId === null
          ? parsed.selectedCurveId
          : null;
      let scrubberPosition = null;
      if (typeof parsed.scrubberPosition === 'number' && isFinite(parsed.scrubberPosition)) {
        scrubberPosition = Math.min(100, Math.max(0, parsed.scrubberPosition));
      }
      return { selectedCurveId, scrubberPosition };
    } catch {
      return null;
    }
  }

  private _writeStoredState(
    entityId: string,
    partial: { selectedCurveId?: string | null; scrubberPosition?: number | null }
  ): void {
    // A user choice owns this session even when browser storage is unavailable.
    if (entityId === this._entityId) this._sessionStateInitialized = true;
    try {
      const existing = this._readStoredState(entityId) ?? {
        selectedCurveId: null,
        scrubberPosition: null,
      };
      const updated = { ...existing, ...partial };
      sessionStorage.setItem(this._storedStateKey(entityId), JSON.stringify(updated));
    } catch {
      // blocked or quota exceeded — ignore
    }
  }

  private _onKeyDown(e: KeyboardEvent): void {
    // The event path identifies this card even when HA shadow roots retarget focus to a host.
    if (!e.composedPath().includes(this) && !shouldHandleKey(document.activeElement, this)) return;

    // Ctrl+S / Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      if (this._isDirty && this._isAdmin && !this._saving && !this._membershipLocked) {
        e.preventDefault();
        this._onSave();
      }
    }
    // Ctrl+Z / Cmd+Z to undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      if (
        !this._saving &&
        !this._cancelAnimating &&
        !this._membershipLocked &&
        this._undoStack.length > 0
      ) {
        e.preventDefault();
        this._undo();
      }
    }
    // Escape clears a temporary shape trial before falling back to cancel.
    if (e.key === 'Escape') {
      if (this._invitation.curve) {
        e.preventDefault();
        this._dismissInvitation();
      } else if (this._presetGraphTrial) {
        e.preventDefault();
        this._clearPresetGraphTrial();
      } else if (
        this._isDirty &&
        !this._saving &&
        !this._cancelAnimating &&
        !this._membershipLocked
      ) {
        e.preventDefault();
        this._onCancel();
      }
    }
  }

  private _onBeforeUnload(e: BeforeUnloadEvent): void {
    if (this._isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  private async _tryLoadCurves(): Promise<void> {
    // Fence the save-confirmation dispatch below to the save that was current
    // when this reload began. A reload started for a since-superseded save
    // (e.g. one that already timed out) must not confirm a newer save.
    const saveGenerationAtStart = this._saveGuard.currentGeneration();
    // Skip if the current entity is already loaded, or a load is in flight.
    if (!needsLoad(this._load, this._entityId)) return;

    if (!this._hass || !this._entityId) {
      // No hass or entity yet — use mock data for dev/preview
      if (this._curves.length === 0) {
        const mock = createMockCurves();
        this._curves = mock;
        this._originalCurves = cloneCurves(mock);
        this._cleanVersion = this._dirtyVersion;
      }
      return;
    }

    this._load = beginLoad(this._load);
    // Capture the entity we're loading so we can discard stale responses
    const requestedEntity = this._entityId;

    try {
      const result = await this._hass.callWS<{
        entities: Record<string, { brightness: Record<string, string> }>;
      }>({
        type: 'lightener/get_curves',
        entity_id: requestedEntity,
      });

      const { state, action } = resolveSuccess(
        this._load,
        requestedEntity,
        this._entityId,
        this._isDirty
      );
      // Parse BEFORE committing the new load state. wsPayloadToCurves throws on
      // a malformed payload (e.g. missing `entities`); committing `state` first
      // would strand pendingReloadEntityId from a 'defer-dirty' transition on a
      // load that actually failed — a later cancel/undo would then drain it as a
      // spurious reload. Parsing first leaves the catch's resolveError working
      // on the pre-transition state. The eager parse on the defer-dirty path
      // still keeps a malformed dirty response failing loud, as before.
      let curves: LightCurve[] | undefined;
      if (action === 'apply' || action === 'defer-dirty') {
        curves = wsPayloadToCurves(result.entities, this._hass.states, CURVE_COLORS);
      }
      this._load = state;
      if (action === 'apply' || action === 'defer-dirty') {
        if (action === 'apply' && curves) {
          this._curves = curves;
          this._originalCurves = cloneCurves(curves);
          this._cleanVersion = this._dirtyVersion;

          // Hydrate once per group, after members arrive. A reload/reconnect or
          // an explicit choice (including deselection) must not reset selection.
          if (
            !this._sessionStateInitialized &&
            this._curves.length > 0 &&
            this._selectedCurveId === null &&
            this._scrubberPosition === null
          ) {
            this._sessionStateInitialized = true;
            const stored = this._readStoredState(requestedEntity);
            this._invitationAutoAllowed =
              this.experimentalFirstUse &&
              this._config.firstRun === true &&
              !stored &&
              !hasInvitationProgress(requestedEntity) &&
              hasDefaultShapes(this._curves);
            if (stored) {
              if (
                stored.selectedCurveId !== null &&
                canSelectCurve(this._curves, stored.selectedCurveId)
              ) {
                this._selectedCurveId = stored.selectedCurveId;
              }
              if (stored.scrubberPosition !== null) {
                this._scrubberPosition = stored.scrubberPosition;
              }
            } else if (this._invitationAutoAllowed) {
              this._selectedCurveId = this._invitationTarget?.entityId ?? null;
            } else if (this._config.firstRun === true && this._coach.phase === 'choose_shape') {
              this._selectedCurveId = this._curves[0].entityId;
              this._writeStoredState(requestedEntity, {
                selectedCurveId: this._selectedCurveId,
              });
            }
          }
          void this.updateComplete.then(() => this._coach.maybeStartShimmer());

          // The post-save re-fetch landed. The guard re-checks the live
          // generation + phase, dispatches save-confirmed, and arms the 2s
          // success-display timer that later dispatches save-clear.
          this._saveGuard.confirm(saveGenerationAtStart);
        }
      }
      // action 'discard' / 'run-queued-reload' need no curve write here;
      // finishLoad() below issues any follow-up reload.
    } catch (err) {
      const { state, discarded } = resolveError(
        this._load,
        requestedEntity,
        this._entityId,
        String(err)
      );
      this._load = state;
      if (!discarded) {
        console.error('[Lightener] Failed to load curves:', err);
        // The post-save re-fetch failed. The guard re-checks live generation +
        // phase, then fails the confirming save.
        this._saveGuard.fail(saveGenerationAtStart, 'Save failed. Check connection.');
      }
    } finally {
      const { state, followUp } = finishLoad(this._load, requestedEntity, this._entityId);
      this._load = state;
      // followUp: 'reload-changed-entity' (entity switched mid-flight) or
      // 'run-queued-reload' (a reload was queued for this entity).
      if (followUp !== 'none') {
        void this._tryLoadCurves();
      }
    }
  }

  // --- Event handlers ---

  private _onScrubberMove(e: CustomEvent): void {
    this._dismissInvitation();
    this._invitationTogether = false;
    this._clearPresetGraphTrial();
    const position = e.detail.position;
    this._scrubberPosition = position;
    if (this._load.loadedEntityId) {
      this._writeStoredState(this._load.loadedEntityId, { scrubberPosition: position });
    }
    if (this._previewActive) {
      this._previewLights(position);
    }
  }

  private _onScrubberStart(): void {
    // No-op: preview is now controlled by the explicit preview toggle button
  }

  private _onScrubberEnd(): void {
    // No-op: preview is now controlled by the explicit preview toggle button
  }

  private _onPreviewToggle = (): void => {
    this._dismissInvitation();
    this._clearPresetGraphTrial();
    if (this._previewActive) {
      this._stopPreview();
    } else {
      this._startPreview();
    }
  };

  private _startPreview = (): void => {
    this._previewController.start();
  };

  private _stopPreview = (): void => {
    this._previewController.stop();
  };

  private _refreshActivePreview(force = false): void {
    this._previewController.refresh(force);
  }

  private _previewLights(position: number, force = false): void {
    this._previewController.previewLights(position, force);
  }

  // Preview a single light, holding every other light. Used while editing one
  // curve so the edited light tracks the point under the user's finger instead
  // of only ever showing its value at the global scrubber. Pass `value` (the
  // dragged point's target) to drive the light to that exact level.
  private _previewSingleLight(
    entityId: string,
    position: number,
    force = false,
    value?: number
  ): void {
    this._previewController.previewSingleLight(entityId, position, force, value);
  }

  private _onSelectCurve(e: CustomEvent): void {
    this._dismissInvitation();
    if (this._cancelAnimating) return;
    const { entityId } = e.detail;
    // Always allow deselect of the currently-selected curve, even if it has
    // since gone missing (race during reload). Otherwise require the curve
    // to exist and be visible.
    if (entityId !== this._selectedCurveId && !canSelectCurve(this._curves, entityId)) return;
    this._clearPresetGraphTrial();
    this._selectedCurveId = toggleSelection(this._selectedCurveId, entityId);
    if (this._storageEntityId) {
      this._writeStoredState(this._storageEntityId, { selectedCurveId: this._selectedCurveId });
    }
    this._refreshActivePreview(true);
  }

  private _onFocusCurve(e: CustomEvent): void {
    if (this._invitation.curve && e.detail.entityId === this._selectedCurveId) {
      this._invitation.freeze();
      return;
    }
    this._dismissInvitation();
    if (this._cancelAnimating) return;
    const { entityId } = e.detail;
    // Focus selects only an existing, visible curve and never toggles (unlike
    // _onSelectCurve): re-focusing the active curve leaves it selected.
    if (!canSelectCurve(this._curves, entityId)) return;
    this._clearPresetGraphTrial();
    this._selectedCurveId = entityId;
    if (this._storageEntityId) {
      this._writeStoredState(this._storageEntityId, { selectedCurveId: this._selectedCurveId });
    }
    this._refreshActivePreview(true);
  }

  private _pushUndo(): void {
    pushEditUndo(this._undoStack, this._curves);
  }

  // Shared discrete-edit commit: snapshot undo, swap in the new curves, mark
  // dirty, and force-refresh the preview at the scrubber. Used by add / remove /
  // preset. Point *drag* stays inline in _onPointMove (it pushes undo once per
  // gesture and previews a single light, not the all-lights scrubber refresh).
  private _commitCurveEdit(nextCurves: LightCurve[]): void {
    this._pushUndo();
    this._curves = nextCurves;
    this._dirtyVersion++;
    this._refreshActivePreview(true);
  }

  // End-of-drag bookkeeping shared by point-drop and long-press point-remove
  // (which skips point-drop): clear drag flags and, if a hass push was
  // suppressed mid-drag (no live load), pull the latest curves now.
  private _completeDragMaybeReload(): void {
    this._dragUndoPushed = false;
    this._dragActive = false;
    if (!this._load.loaded && this._hass) {
      this._tryLoadCurves();
    }
  }

  private _undo(): void {
    this._dismissInvitation();
    if (this._undoStack.length === 0 || this._cancelAnimFrame !== null) return;
    this._clearPresetGraphTrial();
    // Undo keeps live preview active (unlike cancel, which stops it first), so
    // repush the preview at the current scrubber position once the restore
    // animation lands — otherwise real lights stay at the pre-undo brightness.
    this._animateCurvesTo(this._undoStack.pop()!, () => {
      this._refreshActivePreview(true);
    });
  }

  /**
   * Animate curves from current state to endCurves over CANCEL_ANIM_DURATION_MS.
   * Shared by undo and cancel. onComplete runs after the final frame. A ripple
   * cut short this way hands its light's line to the animation, so that line
   * continues from the frame on screen instead of jumping to the data first.
   */
  private _animateCurvesTo(endCurves: LightCurve[], onComplete?: () => void): void {
    const startCurves = cloneCurves(this._curves);
    const cutLine = this._cutRippleLine(endCurves);
    this._stopRipple();
    this._morphLine = cutLine ? { ...cutLine, t: 0 } : null;
    this._cancelAnimating = true;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(elapsed / CANCEL_ANIM_DURATION_MS, 1);
      const t = easeOutCubic(rawT);
      // A frame can be stamped before startTime; the cut line still starts from the frame on screen.
      this._morphLine = cutLine && rawT < 1 ? { ...cutLine, t: Math.max(t, 0) } : null;

      const interpolated: LightCurve[] = endCurves.map((endCurve, ci) => {
        const startCurve = startCurves[ci];
        if (!startCurve) return endCurve;

        const startPts = startCurve.controlPoints;
        const endPts = endCurve.controlPoints;
        const points = interpolateControlPoints(startPts, endPts, t);

        // Extra end points snap in on final frame
        if (endPts.length > points.length && rawT >= 1) {
          for (let pi = points.length; pi < endPts.length; pi++) points.push({ ...endPts[pi] });
        }
        // Extra start points kept until final frame
        if (startPts.length > points.length && rawT < 1) {
          for (let pi = points.length; pi < startPts.length; pi++) points.push({ ...startPts[pi] });
        }

        points.sort((a, b) => a.lightener - b.lightener);
        // Preserve live visible state — don't restore from snapshot
        return { ...endCurve, controlPoints: points, visible: startCurve.visible };
      });

      this._curves = interpolated;

      if (rawT < 1) {
        this._cancelAnimFrame = requestAnimationFrame(tick);
      } else {
        // Preserve live visible state on final frame too
        this._curves = mergeFinalAnimationFrame(startCurves, endCurves);
        this._cancelAnimating = false;
        this._cancelAnimFrame = null;
        // If undo/cancel landed back at the clean state, sync versions so _isDirty is O(1).
        const landedClean = curvesEqual(this._curves, this._originalCurves);
        if (landedClean) {
          this._cleanVersion = this._dirtyVersion;
          this._coach.afterClean();
        }
        onComplete?.();
        if (landedClean) this._reloadPendingDirtyResponse();
      }
    };

    this._cancelAnimFrame = requestAnimationFrame(tick);
  }

  private _onPointMove(e: CustomEvent): void {
    if (this._cancelAnimating) return;
    this._clearPresetGraphTrial();
    const { curveIndex, pointIndex, lightener, target } = e.detail;
    const base = this._graphCurves;
    const point = base[curveIndex]?.controlPoints[pointIndex];
    if (point?.lightener === lightener && point.target === target) return;
    const nextCurves = movePointOnCurves(base, curveIndex, pointIndex, lightener, target);
    if (nextCurves === null) return;

    this._dragActive = true;
    // Push undo once at start of each drag gesture
    if (!this._dragUndoPushed) {
      this._pushUndo();
      this._dragUndoPushed = true;
    }
    // Auto-select the curve being dragged so others dim
    const draggedCurve = this._curves[curveIndex];
    if (draggedCurve && this._selectedCurveId !== draggedCurve.entityId) {
      this._selectedCurveId = draggedCurve.entityId;
      if (this._storageEntityId) {
        this._writeStoredState(this._storageEntityId, { selectedCurveId: this._selectedCurveId });
      }
    }
    this._curves = nextCurves;
    this._dirtyVersion++;
    this._finishInvitation();
    this._coach.afterEdit();
    // Live-edit: drive the edited light to the dragged point's target so the
    // bulb tracks the user's finger. We pass `target` directly (not a curve
    // sample at `lightener`) so the origin point works too — its non-zero dim
    // floor samples to 0 at lightener 0, which would wrongly turn the light off
    // while you drag the floor up. Other lights hold; fall back to the all-lights
    // refresh only if the dragged curve can't be resolved.
    if (draggedCurve) {
      this._previewSingleLight(draggedCurve.entityId, lightener, false, target);
    } else {
      this._refreshActivePreview();
    }
  }

  private _onPointDrop(_e: CustomEvent): void {
    this._completeDragMaybeReload();
  }

  private _onPointAdd(e: CustomEvent): void {
    if (this._cancelAnimating) return;
    this._clearPresetGraphTrial();
    const { lightener, target, entityId } = e.detail;
    const targetEntityId = entityId ?? this._selectedCurveId;
    if (!targetEntityId) return;

    const next = addPointEdit(this._graphCurves, targetEntityId, lightener, target);
    if (next === null) return;

    // Discrete edit (not a drag): re-light all visible lights at the scrubber
    // position. Only point *movement* pushes a single light to its dragged
    // target; add/remove/presets stay scrubber-based.
    this._commitCurveEdit(next);
    this._finishInvitation();
    this._coach.afterEdit();
  }

  private _onPointRemove(e: CustomEvent): void {
    if (this._cancelAnimating) return;
    this._clearPresetGraphTrial();
    // Long-press removal can skip point-drop, so run the same end-of-drag
    // bookkeeping (flag reset + maybe-reload) here before applying the edit.
    this._completeDragMaybeReload();
    const { curveIndex, pointIndex } = e.detail;

    const next = removePointEdit(this._graphCurves, curveIndex, pointIndex);
    if (next === null) return;

    this._commitCurveEdit(next);
    this._finishInvitation();
    this._coach.afterEdit();
  }

  private _onToggleCurve(e: CustomEvent): void {
    this._dismissInvitation();
    if (this._cancelAnimating) return;
    this._clearPresetGraphTrial();
    const { entityId } = e.detail;
    // Intentionally no _dirtyVersion++ — visibility is local UI state, not persisted to backend.
    const prevSelected = this._selectedCurveId;
    const result = toggleCurveWithSelectionClear(this._curves, this._selectedCurveId, entityId);
    this._curves = result.curves;
    // Hiding the selected curve clears the selection (and persists the null).
    if (result.selectedCurveId !== prevSelected) {
      this._selectedCurveId = result.selectedCurveId;
      if (this._storageEntityId) {
        this._writeStoredState(this._storageEntityId, { selectedCurveId: this._selectedCurveId });
      }
    }
  }

  private async _onDeleteGroup(): Promise<void> {
    if (!this._hass || !this._entityId || this._managingLights) return;
    this._clearPresetGraphTrial();
    if (this._previewActive) this._stopPreview();
    const entityId = this._entityId;
    this._manageError = null;
    this._managingLights = true;
    try {
      const reg = (await this._hass.callWS({
        type: 'config/entity_registry/get',
        entity_id: entityId,
      })) as { config_entry_id?: string | null; platform?: string } | null;
      if (reg?.platform !== LIGHTENER_PLATFORM) {
        throw new Error('Entity is not a Lightener group — cannot delete from this card.');
      }
      const configEntryId = reg?.config_entry_id;
      if (!configEntryId) {
        throw new Error('Group is not backed by a config entry — cannot delete from the card.');
      }
      await this._hass.callApi('DELETE', `config/config_entries/entry/${configEntryId}`);
      // Standalone Lovelace card: no parent panel listens for the event, so
      // clear our own state immediately and surface a deleted-group view.
      // The panel handles its own teardown via _handleGroupDeleted (which
      // navigates away), so the deleted-group view is only seen when this
      // card is mounted directly in a Lovelace dashboard.
      // _groupDeleted gates _canManageLights and the render path, preventing
      // affordances (add light, manage mode) against a config entry that no
      // longer exists.
      this._curves = [];
      this._originalCurves = [];
      this._undoStack = [];
      // Mark the deleted group as cleanly loaded with no error so the render
      // path shows the deleted-group view, not a spinner or a load error.
      this._load = {
        ...this._load,
        loaded: true,
        loadedEntityId: entityId,
        loadError: null,
        loadErrorEntityId: undefined,
      };
      this._selectedCurveId = null;
      this._writeStoredState(entityId, { selectedCurveId: null });
      this._groupDeleted = true;
      this.dispatchEvent(
        new CustomEvent('lightener-group-deleted', {
          detail: { entityId, configEntryId },
          bubbles: true,
          composed: true,
        })
      );
    } catch (err) {
      console.error('[Lightener] Failed to delete group:', err);
      this._manageError = this._formatManageError(err, 'Could not delete group.');
    } finally {
      this._managingLights = false;
    }
  }

  private _openMembershipEditor(): void {
    this._dismissInvitation();
    if (!this._canManageLights) return;
    this._coach.interrupt();
    this._clearPresetGraphTrial();
    if (this._previewActive) this._stopPreview();
    this._manageError = null;
    this._clearMembershipStatus();
    this._setMembershipOpen(true);
  }

  private _closeMembershipEditor(): Promise<void> {
    this._setMembershipOpen(false);
    return (async () => {
      await this.updateComplete;
      if (this._membershipOpen) return;
      const legend = this.renderRoot.querySelector('curve-legend') as
        | (HTMLElement & { renderRoot?: ShadowRoot; updateComplete?: Promise<boolean> })
        | null;
      await legend?.updateComplete;
      if (this._membershipOpen || !this.isConnected) return;
      legend?.renderRoot?.querySelector<HTMLButtonElement>('.add-light-btn')?.focus();
    })().catch((err: unknown) => this._reportMembershipFocusRestoreError(err));
  }

  private _reportMembershipFocusRestoreError(err: unknown): void {
    console.warn('[Lightener] Could not restore focus after closing Edit lights:', err);
  }

  private _onMembershipApplied(event: CustomEvent): void {
    if (!this._hass) return;
    const result = event.detail as {
      entities: Record<string, { brightness: Record<string, string> }>;
      added_entity_ids: string[];
    };
    const visibleById = new Map(this._curves.map((curve) => [curve.entityId, curve.visible]));
    this._stopDrawIn();
    this._curves = wsPayloadToCurves(result.entities, this._hass.states, CURVE_COLORS).map(
      (curve) => ({ ...curve, visible: visibleById.get(curve.entityId) ?? true })
    );
    this._originalCurves = cloneCurves(this._curves);
    const added = new Set(
      this._curves
        .filter((curve) => !visibleById.has(curve.entityId))
        .map((curve) => curve.entityId)
    );
    this._cleanVersion = this._dirtyVersion;
    this._undoStack = [];
    const firstAdded = (result.added_entity_ids ?? []).find((entityId) =>
      this._curves.some((curve) => curve.entityId === entityId)
    );
    if (firstAdded) {
      this._selectedCurveId = firstAdded;
    } else if (
      this._selectedCurveId !== null &&
      !this._curves.some((curve) => curve.entityId === this._selectedCurveId)
    ) {
      this._selectedCurveId = null;
    }
    if (this._load.loadedEntityId) {
      this._writeStoredState(this._load.loadedEntityId, {
        selectedCurveId: this._selectedCurveId,
      });
    }
    this._showMembershipStatus();
    const focusRestored = this._closeMembershipEditor();
    // Last, once the membership change is fully committed. The dialog can apply
    // after the card was removed, and a removed card must not start one.
    if (added.size > 0 && this.isConnected && momentPlays(this._joy, 'draw_in')) {
      this._startDrawIn(added);
      const token = this._drawIn!.token;
      void focusRestored.then(() => {
        if (this._drawIn?.token === token && !this._membershipOpen && this.isConnected) {
          this._drawIn = { ...this._drawIn, ready: true };
        }
      });
    }
  }

  /**
   * Joy moment `draw_in`: the graph reveals these newly added lights once visible.
   * A pending reveal permits touch scrolling and ends on a click or key press.
   * Once running, a press also ends it in capture phase without consuming input.
   * Reduced motion and rendered-marker cleanup end it; a ripple keeps its own boundary.
   */
  private _startDrawIn(ids: ReadonlySet<string>): void {
    this._stopDrawIn();
    this._drawIn = { ids, token: ++this._drawInToken, ready: false };
    this._drawInWaitingForVisible = true;
    this._unsubscribeDrawInMotion = onReducedMotionStart(this._boundStopDrawIn);
    this.addEventListener('pointerdown', this._boundStopDrawIn, true);
    this.addEventListener('keydown', this._boundStopDrawIn, true);
    this.addEventListener('click', this._boundStopDrawIn, true);
  }

  private _onDrawInWaiting = (event: CustomEvent<{ token: number }>): void => {
    if (!this._drawIn || event.detail?.token !== this._drawIn.token) return;
    this._drawInWaitingForVisible = true;
    if (this._drawInTimer !== null) clearTimeout(this._drawInTimer);
    this._drawInTimer = null;
  };

  private _onDrawInStarted = (event: CustomEvent<{ token: number; pointCount: number }>): void => {
    if (!this._drawIn || event.detail?.token !== this._drawIn.token) return;
    this._drawInWaitingForVisible = false;
    if (this._drawInTimer !== null) clearTimeout(this._drawInTimer);
    this._drawInTimer = setTimeout(this._boundStopDrawIn, drawInClearMs(event.detail.pointCount));
  };

  private _stopDrawIn(): void {
    if (this._drawInTimer !== null) clearTimeout(this._drawInTimer);
    this._drawInTimer = null;
    this._unsubscribeDrawInMotion?.();
    this._unsubscribeDrawInMotion = null;
    this.removeEventListener('pointerdown', this._boundStopDrawIn, true);
    this.removeEventListener('keydown', this._boundStopDrawIn, true);
    this.removeEventListener('click', this._boundStopDrawIn, true);
    this._drawInWaitingForVisible = false;
    this._drawIn = null;
    const pendingPreset = this._pendingPresetGraphTrial;
    this._pendingPresetGraphTrial = null;
    if (pendingPreset && this.isConnected && this._canShowPresetGraphTrial) {
      // Keep the preview active when the pointer or keyboard focus remains on
      // its chip for the whole draw-in. The normal leave/blur path clears it.
      this._startPresetGraphTrial(pendingPreset);
    }
  }

  private _showMembershipStatus(): void {
    this._clearMembershipStatus();
    // Retire a stale success banner so it can't stack with "Lights updated."
    // An `error` banner is NOT ours to retire: `reset` maps to `idle`
    // unconditionally, so clearing it here would swap an unacknowledged curve
    // save failure for a success toast the user never earned. A membership
    // update succeeding says nothing about the curve save that failed, and the
    // error carries the only Retry affordance. Both banners stay.
    if (this._saveState.phase !== 'error') {
      this._dispatchSave({ type: 'reset' });
    }
    this._membershipStatus = UI.membership.updated;
    this._membershipStatusTimer = window.setTimeout(() => {
      this._membershipStatusTimer = null;
      this._membershipStatus = null;
    }, MEMBERSHIP_STATUS_DURATION_MS);
  }

  private _clearMembershipStatus(): void {
    if (this._membershipStatusTimer !== null) {
      window.clearTimeout(this._membershipStatusTimer);
      this._membershipStatusTimer = null;
    }
    this._membershipStatus = null;
  }

  private _setMembershipOpen(open: boolean): void {
    if (this._membershipOpen === open) return;
    this._membershipOpen = open;
    this.dispatchEvent(
      new CustomEvent('lightener-membership-state', {
        detail: { open },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _formatManageError(err: unknown, fallback: string): string {
    const anyErr = err as { message?: string; code?: string } | null | undefined;
    if (anyErr?.message) return anyErr.message;
    return fallback;
  }

  public async saveCurves(): Promise<boolean> {
    return this._onSave();
  }

  private async _onSave(): Promise<boolean> {
    this._dismissInvitation();
    if (
      !this._hass ||
      !this._entityId ||
      this._saving ||
      this._cancelAnimating ||
      this._membershipLocked
    )
      return false;

    this._clearPresetGraphTrial();
    if (this._previewActive) this._stopPreview();

    const savedEntityId = this._entityId;
    this._dispatchSave({ type: 'save-start' });
    try {
      const payload = curvesToWsPayload(this._curves);
      await this._hass.callWS({
        type: 'lightener/save_curves',
        entity_id: savedEntityId,
        curves: payload,
      });
      // If user switched entity while save was in flight, don't corrupt the new entity's state.
      // Clear undo stack so stale history for the old entity can't be replayed after a switch-back.
      if (this._entityId !== savedEntityId) {
        if (this._previewActive) this._stopPreview();
        this._undoStack = [];
        this._dispatchSave({ type: 'reset' });
        return false;
      }
      // Clear dirty state before the re-fetch so _tryLoadCurves won't skip overwriting curves.
      // _originalCurves is intentionally left stale until the backend re-fetch overwrites it.
      this._cleanVersion = this._dirtyVersion;
      this._undoStack = [];
      // The curves are now clean — any dirty-deferred reload is moot.
      this._load = { ...this._load, pendingReloadEntityId: undefined };
      this._dispatchSave({ type: 'save-success' }); // → confirming; controls stay disabled
      // Arm the confirmation fence: bumps the generation, starts the 8s timeout,
      // returns the promise that resolves on save-confirmed / save-error / timeout.
      const { settled: confirmSettled } = this._saveGuard.arm();
      // _tryLoadCurves dispatches save-confirmed once the backend re-fetch
      // completes. runNow=false means a load is already in flight and this
      // reload is queued behind it — it still runs (and confirms) later via
      // finishLoad's followUp. Either way we await `confirmSettled`, which
      // resolves on save-confirmed, save-error, or the 8s timeout, so
      // saveCurves() never reports success before the backend actually
      // confirms (the entity-switch flow in lightener-panel.js awaits this).
      const { state: reloadState, runNow } = queueReload(this._load, savedEntityId);
      this._load = reloadState;
      if (runNow) {
        void this._tryLoadCurves();
      }
      const confirmed = (await confirmSettled) === 'confirmed';
      if (confirmed) this._coach.afterSave();
      return confirmed;
    } catch (err) {
      console.error('[Lightener] Failed to save curves:', err);
      this._dispatchSave({ type: 'save-error', message: 'Save failed. Check connection.' });
      return false;
    }
  }

  private _retryLoad(): void {
    this._load = retryLoad(this._load);
    this._tryLoadCurves();
  }

  private _reloadCurvesAfterCurrentLoad(entityId: string): void {
    const { state, runNow } = queueReload(this._load, entityId);
    this._load = state;
    if (runNow) void this._tryLoadCurves();
  }

  private _reloadPendingDirtyResponse(): void {
    const { state, reloadEntityId } = takePendingDirtyReload(this._load, this._entityId);
    this._load = state;
    if (reloadEntityId) this._reloadCurvesAfterCurrentLoad(reloadEntityId);
  }

  private _onCancel(): void {
    this._dismissInvitation();
    if (this._cancelAnimating) return;
    this._clearPresetGraphTrial();
    if (this._previewActive) this._stopPreview();
    this._undoStack = [];
    this._animateCurvesTo(cloneCurves(this._originalCurves), () => {
      this._selectedCurveId =
        this._config.firstRun === true && this._coach.phase === 'choose_shape'
          ? (this._curves[0]?.entityId ?? null)
          : null;
      if (this._load.loadedEntityId) {
        this._writeStoredState(this._load.loadedEntityId, {
          selectedCurveId: this._selectedCurveId,
        });
      }
      this._dispatchSave({ type: 'reset' });
    });
  }

  private _renderLoadingSkeleton() {
    return html`
      <div class="loading-indicator" role="status" aria-live="polite">
        <div class="loading-graph" aria-hidden="true">
          <span class="loading-curve primary"></span>
          <span class="loading-curve warm"></span>
          <span class="loading-curve cool"></span>
          <span class="loading-point one"></span>
          <span class="loading-point two"></span>
          <span class="loading-point three"></span>
        </div>
        <div class="loading-caption">${UI.card.loading}</div>
      </div>
    `;
  }

  private _renderGraphInsight() {
    if (this._isShowingPresetGraphTrial && this._presetGraphTrial) {
      const selected = this._selectedCurve;
      if (!selected) return nothing;
      return html`
        <div class="graph-insight trial" role="status" aria-live="polite">
          <span
            class="graph-insight-primary"
            title=${UI.presets.trying(this._presetGraphTrial.name)}
            >${UI.presets.trying(this._presetGraphTrial.name)}</span
          >
          <span
            class="graph-insight-secondary"
            title=${UI.presets.chooseForLight(selected.friendlyName)}
            >${UI.presets.chooseForLight(selected.friendlyName)}</span
          >
        </div>
      `;
    }

    const summary = summarizeCurveShapes(this._curves, this._selectedCurveId);
    if (!summary) return nothing;

    return html`
      <div class="graph-insight" role="note">
        <span class="graph-insight-primary" title=${summary.primary}>${summary.primary}</span>
        <span class="graph-insight-secondary" title=${summary.secondary}>${summary.secondary}</span>
      </div>
    `;
  }

  private _renderGraphWorkbenchInsight() {
    if (this.experimentalFirstUse) {
      const name = this._selectedCurve?.friendlyName;
      if (this._invitation.curve || this._invitationEditHint) {
        return html`<div class="graph-insight invitation-insight">
          <span class="graph-insight-primary" title=${name ?? ''}>${name}</span>
          <span class="graph-insight-secondary"
            >${this._invitation.curve ? UI.invitation.example : this._invitationEditHint}</span
          >
          ${this._invitation.curve
            ? html`<span class="sr-only" role="status">${UI.invitation.forLight(name ?? '')}</span>`
            : nothing}
        </div>`;
      }
    }
    if (this._isAdmin && this._coach.phase !== 'inactive') {
      const title =
        this._coach.phase === 'choose_shape'
          ? UI.coach.chooseTitle
          : this._coach.phase === 'complete'
            ? UI.coach.savedTitle
            : UI.coach.readyTitle;
      const body =
        this._coach.phase === 'choose_shape'
          ? UI.coach.chooseBody
          : this._coach.phase === 'complete'
            ? UI.coach.savedBody
            : UI.coach.readyBody;
      return html`
        <div class="coach-prompt" role="status" aria-live="polite">
          <span class="coach-copy"><strong>${title}</strong><span>${body}</span></span>
          <button
            type="button"
            class="coach-dismiss"
            aria-label=${UI.coach.dismiss}
            title=${UI.coach.dismiss}
            @click=${this._dismissCoach}
          >
            ×
          </button>
        </div>
      `;
    }

    if (this._isShowingPresetGraphTrial && this._presetGraphTrial) {
      return html`
        <div class="graph-insight trial" role="status" aria-live="polite">
          <span
            class="graph-insight-primary"
            title=${UI.presets.trying(this._presetGraphTrial.name)}
            >${UI.presets.trying(this._presetGraphTrial.name)}</span
          >
        </div>
      `;
    }

    const summary = summarizeCurveShapes(this._curves, this._selectedCurveId);
    if (!summary) return nothing;

    return html`
      <div class="graph-insight" role="note">
        <span class="graph-insight-primary" title=${summary.primary}>${summary.primary}</span>
      </div>
    `;
  }

  private _renderGraphWorkbench() {
    const chips = this._renderShapeChips();
    // Render the same two-column workbench in both states so the shape-chip row
    // is always present in the layout. When no light is selected the chip column
    // is an empty, height-reserving placeholder — selecting or deselecting a
    // light must never push the graph up or down (DESIGN.md: opening a shape
    // must not push the graph).
    if (chips === nothing) {
      return html`<div class="graph-workbench">
        ${this._isAdmin && this._coach.phase !== 'inactive'
          ? this._renderGraphWorkbenchInsight()
          : this._renderGraphInsight()}
        <div class="shape-chip-reserve" aria-hidden="true"></div>
      </div>`;
    }

    return html`<div class="graph-workbench">${this._renderGraphWorkbenchInsight()}${chips}</div>`;
  }

  render() {
    const graphCurves = this._graphCurves;
    const footerActive =
      !this._isAdmin ||
      this._membershipLocked ||
      this._isDirty ||
      this._saving ||
      this._cancelAnimating ||
      this._undoStack.length > 0;
    return html`
      <div
        class="card ${this._embedded ? 'embedded' : ''} ${this.experimentalFirstUse
          ? 'first-use-experiment'
          : ''}"
        role="region"
        aria-label="Brightness editor"
      >
        <div class="header">
          <h2>${(this._config.title as string) ?? 'Brightness shapes'}</h2>
          ${this.experimentalFirstUse && this._isAdmin
            ? html`<button
                type="button"
                class="invitation-replay ${this._invitation.curve ? 'invitation-dismiss' : ''}"
                aria-label=${this._invitation.curve ? UI.invitation.dismiss : UI.invitation.replay}
                title=${this._invitation.curve ? UI.invitation.dismiss : UI.invitation.replay}
                ?disabled=${!this._invitation.curve && !this._canRunInvitation}
                @click=${() =>
                  this._invitation.curve ? this._dismissInvitation() : this._startInvitation()}
              >
                ${this._invitation.curve ? '×' : '↻'}
              </button>`
            : this._isAdmin && this._curves.length > 0 && !this._load.loading
              ? html`<button
                  type="button"
                  class="coach-help"
                  aria-label=${UI.coach.help}
                  title=${UI.coach.help}
                  aria-expanded=${this._coach.phase !== 'inactive'}
                  ?disabled=${this._saving || this._cancelAnimating || this._membershipLocked}
                  @click=${this._toggleCoach}
                >
                  ?
                </button>`
              : nothing}
        </div>

        <div class="workspace">
          <div class="editor-column">
            <div class="main-stack">
              ${this._load.loading
                ? this._renderLoadingSkeleton()
                : html`<div class="graph-panel">
                    ${this._renderGraphWorkbench()}
                    <curve-graph
                      .curves=${graphCurves}
                      .selectedCurveId=${this._selectedCurveId}
                      .entityId=${this._entityId ?? null}
                      .readOnly=${!this._isAdmin || this._cancelAnimating || this._membershipLocked}
                      .scrubberPosition=${this._effectiveScrubberPosition}
                      .previewCurve=${this._presetPreviewCurve}
                      .exampleEntityId=${this._invitation.curve?.entityId ?? null}
                      .exampleCueAnimating=${this._invitation.cueAnimating}
                      .exampleInstruction=${this._invitation.curve &&
                      this._invitation.showInstruction
                        ? UI.invitation.drag
                        : null}
                      .joy=${this._joy}
                      .curveFrame=${this._curveFrame}
                      .drawIn=${this._drawIn}
                      @draw-in-started=${this._onDrawInStarted}
                      @draw-in-waiting=${this._onDrawInWaiting}
                      @pointerdown=${this._onGraphPointerDown}
                      @point-move=${this._onPointMove}
                      @point-drop=${this._onPointDrop}
                      @point-add=${this._onPointAdd}
                      @point-remove=${this._onPointRemove}
                      @graph-interaction=${this._onGraphInteraction}
                      @focus-curve=${this._onFocusCurve}
                    ></curve-graph>
                  </div>`}
              ${this._curves.length > 0
                ? html`<curve-scrubber
                    .curves=${graphCurves}
                    .example=${!!this._invitation.curve}
                    .firstUseHints=${this.experimentalFirstUse}
                    .invitation=${this._invitationTogether}
                    .readOnly=${!this._isAdmin || this._membershipLocked}
                    .canPreview=${this._isAdmin &&
                    !this._cancelAnimating &&
                    !this._membershipLocked}
                    .previewActive=${this._previewActive}
                    .dirty=${this._isDirty}
                    .position=${this._effectiveScrubberPosition}
                    @scrubber-move=${this._onScrubberMove}
                    @scrubber-start=${this._onScrubberStart}
                    @scrubber-end=${this._onScrubberEnd}
                    @preview-toggle=${this._onPreviewToggle}
                  ></curve-scrubber>`
                : nothing}
            </div>
          </div>

          <div class="footer-slot ${footerActive ? 'active' : ''}">
            <curve-footer
              .dirty=${this._isDirty || this._cancelAnimating}
              .readOnly=${!this._isAdmin || this._membershipLocked}
              .saving=${this._saving || this._cancelAnimating || this._membershipLocked}
              .canUndo=${this._undoStack.length > 0 &&
              !this._cancelAnimating &&
              !this._membershipLocked}
              @save-curves=${this._onSave}
              @cancel-curves=${this._onCancel}
              @undo-curves=${() => this._undo()}
            ></curve-footer>
          </div>

          <aside class="side-rail" aria-label=${UI.card.railAria}>
            <curve-legend
              .curves=${graphCurves}
              .exampleEntityId=${this._invitation.curve?.entityId ?? null}
              .selectedCurveId=${this._selectedCurveId}
              .scrubberPosition=${this._effectiveScrubberPosition}
              .canManage=${this._canManageLights}
              .managing=${this._managingLights}
              @select-curve=${this._onSelectCurve}
              @toggle-curve=${this._onToggleCurve}
              @edit-lights=${this._openMembershipEditor}
              @delete-group=${this._onDeleteGroup}
            ></curve-legend>
            ${this._manageError
              ? html`<div class="error" role="alert">${WARNING_ICON} ${this._manageError}</div>`
              : nothing}
          </aside>
        </div>

        ${this._membershipOpen && this._hass && this._entityId
          ? html`<light-membership-dialog
              .hass=${this._hass}
              .groupEntityId=${this._entityId}
              @membership-close=${this._closeMembershipEditor}
              @membership-applied=${this._onMembershipApplied}
            ></light-membership-dialog>`
          : nothing}

        <div class="status-stack">
          ${this._membershipStatus
            ? html`<div class="success" role="status" aria-live="polite">
                ${this._membershipStatus}
              </div>`
            : nothing}
          ${this._saveSuccess
            ? html`<div class="success" role="status" aria-live="polite">
                <svg
                  class="status-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Saved successfully
              </div>`
            : nothing}
          ${this._load.loadError
            ? html`<div class="error" role="alert">
                ${WARNING_ICON} Failed to load curves
                <button type="button" class="retry-link" @click=${this._retryLoad}>Retry</button>
              </div>`
            : nothing}
          ${this._groupDeleted
            ? html`<div class="error" role="status">
                ${WARNING_ICON} This Lightener group was deleted. Remove this card or point it at a
                different group.
              </div>`
            : nothing}
          ${this._saveError
            ? html`<div class="error" role="alert">
                ${WARNING_ICON} Save failed
                <button type="button" class="retry-link" @click=${this._onSave}>Retry</button>
              </div>`
            : nothing}
        </div>
      </div>
    `;
  }
}

safeDefine(CARD_TYPE, LightenerCurveCard);

declare global {
  interface HTMLElementTagNameMap {
    'lightener-curve-card': LightenerCurveCard;
  }
}
