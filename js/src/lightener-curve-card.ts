import { LitElement, html, css, nothing, render as renderInto } from 'lit';
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
  type DrawOut,
  type LightLevelIntent,
  type LightLevelInput,
  type ScrubberMove,
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
  adoptSavedShapes,
  compareSavedShapes,
  editedCurves,
  guardedSnapshot,
  intendedEntities,
  savedEntitiesEqual,
  sameShape,
  validEntities,
  type SavedEntities,
  type SavedSnapshot,
  type SaveReview,
} from './utils/save-conflict.js';
import './components/save-conflict-review.js';
import {
  editorDrafts,
  projectGeometry,
  geometryEqual,
  type Principal,
  type Scope,
  type Claim,
  type ResumeTicket,
  type DraftPayload,
  type Geometry,
  type Summary,
} from './utils/editor-draft.js';
import { sampleCurveAt } from './utils/graph-math.js';
import {
  canSelectCurve,
  interpolateControlPoints,
  mergeFinalAnimationFrame,
  toggleCurveWithSelectionClear,
  toggleSelection,
} from './utils/card-logic.js';
import {
  addPointEdit,
  applyPresetToCurves,
  movePointOnCurves,
  pushEditUndo,
  removePointEdit,
  setLightLevel,
} from './utils/edit-operations.js';
import { easeOutCubic, CURVE_COLORS } from './utils/graph-math.js';
import { PreviewController } from './utils/preview-controller.js';
import { CoachController } from './utils/coach-controller.js';
import {
  blendPieces,
  drawnShape,
  drawInClearMs,
  DRAW_OUT_MS,
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
import { editorCommandStyles } from './styles/editor-command-styles.js';
import { renderPreviewToggle } from './components/preview-toggle.js';
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
import './components/preview-restoration-dialog.js';
import { lightValue, previewUsable } from './utils/preview-session.js';

// Only notices created in this module may carry reviewed display copy through a catch.
class LocalNotice extends Error {}

type WriteReviewStamp = { principal: Principal; entry: string; generation: number };
type SavedReadOperation = { context: number; generation: number };

const CARD_VERSION = '2.18.0';
const CANCEL_ANIM_DURATION_MS = 300;
const toolbarOwners = new WeakMap<HTMLElement, LightenerCurveCard>();

/** One continuous edit owns the Undo snapshot and deferred-load boundary. */
type EditGesture = { undoPushed: boolean } & (
  | { kind: 'point' }
  | {
      kind: 'light';
      entityId: string;
      groupId: string;
      position: number;
      roomValue: number;
      startingPoints: ControlPoint[];
      startingTarget: number;
      dirtyVersion: number;
      undoStack: LightCurve[][];
    }
);

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
  /** Sidebar editor help: Show me how runs the example on the editable graph. Set by the panel. */
  @property({ attribute: false }) canvasHelp = false;
  /** Why Show me how did not start; display only, the draft stays as it is. */
  @state() private _canvasHelpNotice: string | null = null;
  private _canvasHelpNoticeTimer: ReturnType<typeof setTimeout> | null = null;
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
  @property({ attribute: false }) draftSurface: 'sidebar' | 'dashboard' = 'dashboard';
  private _draftPrincipal: Principal | null = null;
  private _identityAvailable = false;
  private _draftOwner = crypto.randomUUID();
  private _draftClaim: Claim | null = null;
  private _claimedScope: Scope | null = null;
  private _resumeTicket: ResumeTicket | null = null;
  private _draftUnsubscribe: (() => void) | null = null;
  private _knownEntryId: string | null = null;
  private _suppressDraftCapture = false;
  private _writeReview:
    | { kind: 'live' | 'required' }
    | {
        kind: 'accepted';
        stamp: WriteReviewStamp;
      } = { kind: 'live' };
  @state() private _draftLost = false;
  @state() private _savedRead: SavedReadOperation | null = null;
  @state() private _draftNotice: string | null = null;
  @state() private _resumeUnverified = false;
  private _authInvalidated = false;
  private _resumePayload: DraftPayload | null = null;
  private _verifyAfterDiscard = false;
  private _pendingRecoveryClaim: { scope: Scope; claim: Claim } | null = null;
  private _draftSubscriptionKey = '';
  private _pendingDraftWrite: { principal: Principal; entry: string; id: string } | null = null;
  private _captureWriteReview(scope: Scope | null): WriteReviewStamp | null {
    return scope
      ? {
          principal: { origin: scope.origin, userId: scope.userId, authEpoch: scope.authEpoch },
          entry: scope.configEntryId,
          generation: editorDrafts.writeGeneration(scope, scope.configEntryId),
        }
      : null;
  }
  private _writeReviewCurrent(review: WriteReviewStamp | null): boolean {
    if (!review) return !this._draftScope();
    const scope = this._draftScope();
    return (
      !!scope &&
      scope.origin === review.principal.origin &&
      scope.userId === review.principal.userId &&
      scope.authEpoch === review.principal.authEpoch &&
      scope.configEntryId === review.entry &&
      editorDrafts.isCurrent(review.principal) &&
      editorDrafts.writeGeneration(review.principal, review.entry) === review.generation
    );
  }
  private _retainedReview: {
    scope: Scope;
    claim: Claim;
    payload: DraftPayload;
    localCopy: boolean;
  } | null = null;

  private _identityUnavailableRuntimeEntries = new Set<string>();
  private _contextGeneration = 0;
  private _loadGeneration = 0;
  private _recoveryGeneration = 0;
  @state() private _baseline: SavedSnapshot | null = null;
  private _rawBaseline: SavedEntities | null = null;
  private _membershipBaseline: SavedEntities | null = null;
  private _submittedIntent: SavedEntities | null = null;
  @state() private _saveIssue: string | null = null;
  @state() private _saveReview: (SaveReview & { writeReview: WriteReviewStamp | null }) | null =
    null;

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
    if (this._saveState.phase !== 'confirming' && this._saveState.phase !== 'saving') {
      // Leaving (or already out of) the confirming phase: the guard clears its
      // confirm timer and, when we just left, settles any pending saveCurves()
      // awaiter — 'error' (including the confirm-timeout) reports failure,
      // anything else (saved / idle) reports a confirmed success.
      this._saveGuard.onLeaveConfirming(this._saveState.phase, leftConfirming);
    }
  }
  @state() private _scrubberPosition: number | null = null;
  @state() private _cancelAnimating = false;
  /** Per-moment motion preferences; defaults respect operating-system reduced motion. */
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
  /** Lights just removed; the graph fades their last lines out. Display only. */
  @state() private _drawOut: DrawOut | null = null;
  private _drawOutToken = 0;
  private _drawOutTimer: ReturnType<typeof setTimeout> | null = null;
  /** The running ripple; display only, it ends as soon as that light's points are replaced. */
  @state() private _ripple: Ripple | null = null;
  private _cancelRippleLoop: (() => void) | null = null;
  @state() private _morphLine: MorphLine | null = null;

  @state() private _hass: Hass | null = null;
  private _undoStack: LightCurve[][] = [];
  private _editGesture: EditGesture | null = null;

  private get _dragActive(): boolean {
    return this._editGesture !== null;
  }

  private get _lightGesture(): Extract<EditGesture, { kind: 'light' }> | null {
    return this._editGesture?.kind === 'light' ? this._editGesture : null;
  }
  @state() private _narrowLayout = false;
  /** Internal presentation mount. The panel retains ownership of its group picker. */
  @property({ attribute: false }) toolbarHost: HTMLElement | null = null;
  private _activeToolbarHost: HTMLElement | null = null;
  private _pendingCommandFocus: string | null = null;
  private _commandFocusVersion = 0;
  private _onToolbarInteraction = (event: Event): void => {
    if (event.isTrusted) this._coach.interrupt();
  };
  private _layoutObserver: ResizeObserver | null = null;
  private _layoutNodes: Element[] = [];
  private _pendingNarrowLayout: boolean | null = null;

  private _boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _boundBeforeUnload: ((e: BeforeUnloadEvent) => void) | null = null;
  private _boundFooterOverlaySync: (() => void) | null = null;
  private _footerOverlayFrame: number | null = null;
  private _footerScrollRoots: ShadowRoot[] = [];
  // Bounds receipt waiting (8s), owns success display (2s) and settles callers.
  // Only validated receipt content confirms saving; reads never confirm a request.
  private _saveGuard = new SaveConfirmGuard({
    dispatchSave: (action) => this._dispatchSave(action),
    getSavePhase: () => this._saveState.phase,
  });
  private _cancelAnimFrame: number | null = null;
  private _curveAnimationGeneration = 0;
  @state() private _previewActive = false;
  @state() private _restorationOpen = false;
  private _restorationFocus: HTMLElement | null = null;
  /** Pointer hover over a light row. Presentation only, never an edit target. */
  @state() private _hoveredCurveId: string | null = null;
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
    getHass: () => (this._authInvalidated ? null : this._hass),
    canDispatch: () =>
      this.isConnected && this._isAdmin && !this._runtimeBlocked && !this._authInvalidated,
    restorationChanged: () => this.requestUpdate(),
    getCurves: () => this._curves,
    getScrubberPosition: () => this._effectiveScrubberPosition,
    setScrubberPosition: (position) => {
      this._scrubberPosition = position;
    },
    getStorageEntityId: () => this._storageEntityId,
    getConfigEntryId: () => this._knownEntryId ?? this._baseline?.config_entry_id,
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

  static styles = css`
    ${curveCardStyles}${editorCommandStyles}
    .navigation-drafts {
      flex: 1 1 100%;
      min-width: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      overflow-wrap: anywhere;
    }
    .navigation-drafts > span {
      flex: 1 1 100%;
      min-width: 0;
    }
  `;

  private get _hostedToolbar(): boolean {
    return !!this.toolbarHost?.isConnected;
  }

  private _clearToolbarHost(): void {
    const host = this._activeToolbarHost;
    if (host) {
      host.removeEventListener('pointerdown', this._onInvitationControl, true);
      host.removeEventListener('keydown', this._onInvitationControl, true);
      host.removeEventListener('pointerdown', this._boundStopDrawIn, true);
      host.removeEventListener('keydown', this._boundStopDrawIn, true);
      host.removeEventListener('click', this._boundStopDrawIn, true);
      host.removeEventListener('pointerdown', this._onToolbarInteraction, true);
      host.removeEventListener('keydown', this._onToolbarInteraction, true);
      host.removeEventListener('focusin', this._onToolbarInteraction, true);
    }
    if (host && toolbarOwners.get(host) === this) {
      renderInto(nothing, host);
      host.hidden = true;
      toolbarOwners.delete(host);
    }
    this._activeToolbarHost = null;
  }

  private _syncToolbarHost(): void {
    const host = this.isConnected && this._hostedToolbar ? this.toolbarHost : null;
    if (this._activeToolbarHost !== host) this._clearToolbarHost();
    if (!host) return;
    const previousOwner = toolbarOwners.get(host);
    if (previousOwner && previousOwner !== this) {
      previousOwner.toolbarHost = null;
      previousOwner._clearToolbarHost();
    }
    if (this._activeToolbarHost !== host) {
      host.addEventListener('pointerdown', this._onInvitationControl, true);
      host.addEventListener('keydown', this._onInvitationControl, true);
      host.addEventListener('pointerdown', this._boundStopDrawIn, true);
      host.addEventListener('keydown', this._boundStopDrawIn, true);
      host.addEventListener('click', this._boundStopDrawIn, true);
      host.addEventListener('pointerdown', this._onToolbarInteraction, true);
      host.addEventListener('keydown', this._onToolbarInteraction, true);
      host.addEventListener('focusin', this._onToolbarInteraction, true);
    }
    toolbarOwners.set(host, this);
    this._activeToolbarHost = host;
    host.hidden = false;
    renderInto(
      html`<style>
          ${editorCommandStyles.cssText}</style
        >${this._renderHelp()}`,
      host
    );
  }

  // --- HA card interface ---

  static getConfigElement(): HTMLElement {
    return document.createElement('lightener-curve-card-editor');
  }

  static getStubConfig(): Record<string, unknown> {
    return { type: CARD_CONFIG_TYPE };
  }

  setConfig(config: Record<string, unknown>): void {
    const entityChanged = config.entity !== this._config.entity;
    if (entityChanged) {
      this._previewController.disconnect();
      this._closeRestoration();
      this._managingLights = false;
      this._leaveDraftContext();
      this._knownEntryId = null;
      this._draftOwner = crypto.randomUUID();
      this._draftLost = false;
      this._savedRead = null;
      this._resumeUnverified = false;
      this._resumePayload = null;
      this._verifyAfterDiscard = false;
      this._writeReview = { kind: 'live' };
      this._suppressDraftCapture = false;
      this._draftNotice = null;
      this._endLightGesture(false);
      this._dismissInvitation();
      this._clearCanvasHelpNotice();
      this._hoveredCurveId = null;
    }
    const firstRun = config.firstRun === true;
    this._config = config;
    this._joy = resolveJoyFlags(config.joy);
    if (entityChanged || !this._joy.ripple) this._stopRipple();
    if (entityChanged || !this._joy.draw_in) {
      this._stopDrawIn();
      this._stopDrawOut();
    }
    if (entityChanged) {
      this._contextGeneration++;
      this._loadGeneration++;
      this._baseline = null;
      this._rawBaseline = null;
      this._membershipBaseline = null;
      this._saveIssue = null;
      this._saveReview = null;
      this._submittedIntent = null;
      this._saveGuard.settleError();
      this._saveGuard.dispose();
      this._dispatchSave({ type: 'reset' });
      this._load = { ...this._load, loading: false };
      this._stopCurveAnimation();
      this._clearMembershipStatus();
      if (this._previewActive) this._stopPreview();
      this._setMembershipOpen(false);
      this._editGesture = null;
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
    const hadDraftIdentity = this._identityAvailable;
    const userId = hass.user?.id?.trim();
    this._identityAvailable = !!userId;
    if (userId) {
      const prior = this._draftPrincipal;
      const principal = editorDrafts.activatePrincipal(location.origin, userId);
      if (prior && (prior.userId !== principal.userId || prior.authEpoch !== principal.authEpoch))
        this._invalidateDraftIdentity();
      this._draftPrincipal = principal;
      for (const entry of this._identityUnavailableRuntimeEntries)
        editorDrafts.markRuntimeBlocked(principal, entry);
      this._identityUnavailableRuntimeEntries.clear();
      this._identityAvailable = true;
      this._authInvalidated = false;
    }
    this._hass = hass;
    if (this.isConnected) this._previewController.connect();
    else this._previewController.observe();
    if (!this._isAdmin && this._retainedReview) this._dismissSaveReview();
    if (!this._isAdmin && this._pendingRecoveryClaim) {
      editorDrafts.release(this._pendingRecoveryClaim.scope, this._pendingRecoveryClaim.claim);
      this._pendingRecoveryClaim = null;
      this._recoveryGeneration++;
      this._savedRead = null;
    }
    this._subscribeDraft();
    if (this._isDirty && this._identityAvailable && !hadDraftIdentity) this._checkpointDraft();
    if (!this._isAdmin) this._endLightGesture(false);
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

  private get _canEditCurves(): boolean {
    return !this._cancelAnimating && this._canUndoCurves;
  }

  /** Presentation never blocks an otherwise eligible Undo. */
  private get _canUndoCurves(): boolean {
    return (
      this._isAdmin &&
      !this._saving &&
      !this._membershipLocked &&
      !this._load.loadError &&
      this._load.loadedEntityId === this._entityId &&
      !this._groupDeleted &&
      !this._runtimeBlocked &&
      !this._draftLost &&
      !this._savedRead &&
      !this._resumeUnverified &&
      !this._draftAuthStale &&
      !this._saveReview
    );
  }

  private get _draftAuthStale(): boolean {
    return (
      this._authInvalidated ||
      (!!this._draftPrincipal && !editorDrafts.isCurrent(this._draftPrincipal))
    );
  }
  private _draftScope(): Scope | null {
    return this._identityAvailable &&
      this._draftPrincipal &&
      editorDrafts.isCurrent(this._draftPrincipal) &&
      this._knownEntryId
      ? { ...this._draftPrincipal, configEntryId: this._knownEntryId, surface: this.draftSurface }
      : null;
  }
  private get _draftWriteNeedsReview(): boolean {
    const scope = this._draftScope();
    return (
      !!scope &&
      (this._writeReview.kind !== 'live' ||
        editorDrafts.hasUnknownWrite(scope, scope.configEntryId)) &&
      !(
        this._writeReview.kind === 'accepted' && this._writeReviewCurrent(this._writeReview.stamp)
      ) &&
      editorDrafts.hasUnresolvedWrite(scope, scope.configEntryId)
    );
  }
  private _beginSavedRead() {
    return (this._savedRead = {
      context: this._contextGeneration,
      generation: ++this._recoveryGeneration,
    });
  }
  private _ownsSavedRead(operation: SavedReadOperation): boolean {
    return (
      this._savedRead === operation &&
      operation.context === this._contextGeneration &&
      operation.generation === this._recoveryGeneration
    );
  }
  private _finishSavedRead(operation: SavedReadOperation): void {
    if (this._ownsSavedRead(operation)) this._savedRead = null;
  }
  /** Reads and verifies only; each caller owns eligibility, claims and adoption. */
  private async _readLatestSaved(
    current: () => boolean,
    entry: string | null,
    unavailable: string
  ) {
    const writeReview = this._captureWriteReview(this._draftScope());
    const valid = () => {
      if (!current()) return false;
      if (!this._writeReviewCurrent(writeReview)) throw new LocalNotice(UI.drafts.savedChanged);
      return true;
    };
    const result = await this._hass!.callWS({
      type: 'lightener/get_curves',
      entity_id: this._entityId,
    });
    if (!valid()) return null;
    const latest = guardedSnapshot(result);
    if (!latest || (entry && latest.config_entry_id !== entry)) throw new LocalNotice(unavailable);
    return {
      latest,
      curves: wsPayloadToCurves(latest.entities, this._hass!.states, CURVE_COLORS),
      writeReview,
      valid,
    };
  }
  private _subscribeDraft(): void {
    const scope = this._draftScope(),
      key = scope ? JSON.stringify(scope) : '';
    if (this._draftSubscriptionKey === key && this._draftUnsubscribe) return;
    this._draftUnsubscribe?.();
    this._draftUnsubscribe = null;
    this._draftSubscriptionKey = '';
    if (!scope || !this.isConnected) return;
    this._draftSubscriptionKey = key;
    if (editorDrafts.hasUnresolvedWrite(scope, scope.configEntryId))
      this._writeReview = { kind: 'required' };
    this._draftUnsubscribe = editorDrafts.subscribe(scope, () => {
      if (!editorDrafts.isCurrent(scope)) this._invalidateDraftIdentity();
      if (this._runtimeBlocked) {
        this._previewController.disconnect();
        if (this._saveReview) this._dismissSaveReview();
      }
      this.requestUpdate();
    });
  }
  private _invalidateDraftIdentity(): void {
    this._authInvalidated = true;
    this._managingLights = false;
    this._closeRestoration();
    this._writeReview = { kind: 'live' };
    this._previewController.disconnect();
    this._draftUnsubscribe?.();
    this._draftUnsubscribe = null;
    this._draftSubscriptionKey = '';
    this._contextGeneration++;
    this._loadGeneration++;
    this._recoveryGeneration++;
    this._saveGuard.settleError();
    this._saveGuard.dispose();
    this._stopCurveAnimation();
    this._curves = [];
    this._originalCurves = [];
    this._undoStack = [];
    this._baseline = null;
    this._rawBaseline = null;
    this._membershipBaseline = null;
    this._knownEntryId = null;
    this._draftClaim = null;
    this._claimedScope = null;
    this._resumeTicket = null;
    this._resumePayload = null;
    this._resumeUnverified = false;
    this._pendingRecoveryClaim = null;
    this._retainedReview = null;
    this._draftPrincipal = null;
    this._identityAvailable = false;
    this._draftLost = false;
    this._savedRead = null;
    this._saveReview = null;
    this._saveIssue = null;
    this._submittedIntent = null;
    this._dirtyVersion++;
    this._cleanVersion = this._dirtyVersion;
    this._identityUnavailableRuntimeEntries.clear();
    this._dispatchSave({ type: 'reset' });
    this._load = { ...INITIAL_LOAD_STATE };
  }
  private _draftPayload(): DraftPayload {
    const outcome: DraftPayload['outcome'] = this._runtimeBlocked
      ? 'runtime'
      : this._saving || this._saveIssue === 'uncertain' || this._draftWriteNeedsReview
        ? 'unknown'
        : this._membershipBaseline || this._saveIssue === 'reread'
          ? 'reread'
          : this._saveIssue === 'conflict'
            ? 'conflict'
            : this._saveIssue === 'incompatible'
              ? 'unsupported'
              : 'ordinary';
    return {
      schema: 1,
      entityId: this._entityId!,
      baselineRevision: this._membershipBaseline ? null : (this._baseline?.revision ?? null),
      baseline: projectGeometry(this._originalCurves),
      local: projectGeometry(this._curves),
      undo: this._undoStack.map(projectGeometry),
      outcome,
    };
  }
  private _checkpointDraft(): void {
    if (
      this._suppressDraftCapture ||
      this._draftLost ||
      this._retainedReview ||
      this._resumeUnverified
    )
      return;
    const scope = this._draftScope();
    const dirty = !geometryEqual(
      projectGeometry(this._originalCurves),
      projectGeometry(this._curves)
    );
    if (!scope) {
      if (dirty) this._draftNotice = UI.drafts.unavailable;
      return;
    }
    if (
      this._draftClaim &&
      this._claimedScope &&
      !editorDrafts.owns(this._claimedScope, this._draftClaim)
    ) {
      this._draftLost = true;
      return;
    }
    if (!dirty) {
      if (this._draftClaim && this._claimedScope)
        editorDrafts.clear(this._claimedScope, this._draftClaim);
      this._draftClaim = null;
      this._claimedScope = null;
      return;
    }
    const result = this._draftClaim
      ? editorDrafts.update(scope, this._draftClaim, this._draftPayload())
      : editorDrafts.create(scope, this._draftOwner, this._draftPayload());
    if (result.ok) {
      this._draftClaim = result.value;
      this._claimedScope = scope;
      this._draftNotice = null;
    } else {
      if (result.claim) this._draftClaim = result.claim;
      this._draftNotice = UI.drafts.notRetained;
    }
  }
  private _leaveDraftContext(resume = false): void {
    this._checkpointDraft();
    if (resume) this._writeReview = { kind: 'required' };
    if (this._pendingRecoveryClaim)
      editorDrafts.release(this._pendingRecoveryClaim.scope, this._pendingRecoveryClaim.claim);
    this._pendingRecoveryClaim = null;
    if (this._pendingDraftWrite)
      editorDrafts.settleWrite(
        this._pendingDraftWrite.principal,
        this._pendingDraftWrite.entry,
        this._pendingDraftWrite.id,
        'unknown'
      );
    if (this._retainedReview && !this._retainedReview.localCopy)
      editorDrafts.release(this._retainedReview.scope, this._retainedReview.claim);
    this._retainedReview = null;
    if (this._draftClaim && this._claimedScope) {
      const ticket = editorDrafts.release(this._claimedScope, this._draftClaim);
      this._resumeTicket = resume ? ticket : null;
    }
    this._draftClaim = null;
    if (!resume) {
      this._claimedScope = null;
      this._resumeTicket = null;
    }
    this._draftUnsubscribe?.();
    this._draftUnsubscribe = null;
    this._draftSubscriptionKey = '';
  }
  /** Discard only this editor's owned navigation checkpoint before a deliberate switch. */
  public discardNavigationDraft(): void {
    if (this._draftClaim && this._claimedScope)
      editorDrafts.clear(this._claimedScope, this._draftClaim);
    this._draftClaim = null;
    this._claimedScope = null;
    this._resumeTicket = null;
    this._draftLost = false;
    this._suppressDraftCapture = true;
    this._resumePayload = null;
    this._draftNotice = null;
  }
  private _curvesFromGeometry(geometry: Geometry): LightCurve[] {
    const display = new Map(this._curves.map((curve) => [curve.entityId, curve]));
    return geometry.map((item) => ({
      entityId: item.entityId,
      friendlyName: this._hass?.states[item.entityId]?.attributes.friendly_name ?? item.entityId,
      visible: display.get(item.entityId)?.visible ?? true,
      color: display.get(item.entityId)?.color ?? CURVE_COLORS[0],
      controlPoints: item.points.map((point) => ({ ...point })),
    }));
  }
  private async _resumeNavigationDraft(): Promise<void> {
    this._writeReview = { kind: 'required' };
    const scope = this._claimedScope,
      ticket = this._resumeTicket;
    if (!scope || !ticket || !this._hass || !this._draftScope()) {
      if (ticket) this._draftLost = true;
      return;
    }
    const resumed = editorDrafts.resume(scope, ticket);
    this._resumeTicket = null;
    if (!resumed.ok) {
      this._draftLost = true;
      this._draftNotice = UI.drafts.openedElsewhere;
      return;
    }
    this._draftClaim = resumed.value.claim;
    this._resumePayload = resumed.value.payload;
    this._resumeUnverified = true;
    await this._readNavigationDraft(scope, resumed.value.claim, resumed.value.payload, true);
  }
  private async _recoverNavigationDraft(summary: Summary): Promise<void> {
    this._writeReview = { kind: 'required' };
    const scope = this._draftScope();
    if (!scope || this._isDirty || this._savedRead || !this._isAdmin) return;
    const result = editorDrafts.claim(scope, summary.draftId, summary.version, this._draftOwner);
    if (!result.ok) {
      this._draftNotice = UI.drafts.changed;
      this.requestUpdate();
      return;
    }
    this._pendingRecoveryClaim = { scope, claim: result.value.claim };
    await this._readNavigationDraft(scope, result.value.claim, result.value.payload, false);
  }
  private async _readNavigationDraft(
    scope: Scope,
    claim: Claim,
    payload: DraftPayload,
    resuming: boolean
  ): Promise<void> {
    if (!this._hass) return;
    const operation = this._beginSavedRead(),
      owner = this._draftOwner;
    const current = () =>
      this.isConnected &&
      this._ownsSavedRead(operation) &&
      owner === this._draftOwner &&
      editorDrafts.isCurrent(scope) &&
      editorDrafts.owns(scope, claim) &&
      this._isAdmin &&
      JSON.stringify(this._draftScope()) === JSON.stringify(scope);
    try {
      const read = await this._readLatestSaved(
        current,
        scope.configEntryId,
        UI.drafts.unavailableSaved
      );
      if (!read?.valid()) {
        editorDrafts.release(scope, claim);
        return;
      }
      const { latest, curves: saved, writeReview } = read;
      const coherent = geometryEqual(payload.baseline, projectGeometry(saved));
      const sameMembers = (candidate: Geometry) =>
        JSON.stringify(candidate.map((item) => item.entityId)) ===
        JSON.stringify(payload.baseline.map((item) => item.entityId));
      const ordinary =
        payload.outcome === 'ordinary' &&
        payload.baselineRevision === latest.revision &&
        !editorDrafts.hasUnresolvedWrite(scope, scope.configEntryId);
      if (
        ordinary &&
        (!coherent ||
          !sameMembers(payload.local) ||
          payload.undo.some((snapshot) => !sameMembers(snapshot)))
      )
        throw new LocalNotice(UI.drafts.inconsistent);
      if (payload.outcome === 'runtime')
        editorDrafts.markRuntimeBlocked(scope, scope.configEntryId);
      const runtime = editorDrafts.isRuntimeBlocked(scope, scope.configEntryId);
      if (
        runtime &&
        (!coherent ||
          payload.baselineRevision !== latest.revision ||
          !sameMembers(payload.local) ||
          payload.undo.some((snapshot) => !sameMembers(snapshot)))
      )
        throw new LocalNotice(UI.drafts.unavailableSaved);
      if (ordinary || runtime) {
        this._draftClaim = claim;
        this._claimedScope = scope;
        this._knownEntryId = scope.configEntryId;
        if (!resuming) {
          this._curves = this._curvesFromGeometry(payload.local);
          this._originalCurves = cloneCurves(saved);
          this._undoStack = payload.undo.map((snapshot) => this._curvesFromGeometry(snapshot));
          this._dirtyVersion++;
          this._cleanVersion = this._dirtyVersion - 1;
        }
        this._baseline = latest;
        this._rawBaseline = latest.entities;
        this._saveIssue = editorDrafts.isRuntimeBlocked(scope, scope.configEntryId)
          ? 'runtime'
          : null;
        this._draftNotice = null;
        this._resumeUnverified = false;
        this._resumePayload = null;
        this._pendingRecoveryClaim = null;
        this._suppressDraftCapture = false;
      } else if (resuming) {
        this._resumeUnverified = true;
        this._baseline = null;
        this._submittedIntent = null;
        this._saveIssue = payload.outcome === 'unknown' ? 'uncertain' : 'conflict';
      } else {
        this._pendingRecoveryClaim = null;
        this._retainedReview = { scope, claim, payload, localCopy: false };
        const baseline = this._curvesFromGeometry(payload.baseline),
          local = this._curvesFromGeometry(payload.local);
        this._saveReview = {
          writeReview,
          latest,
          curves: saved,
          members: compareSavedShapes(baseline, local, saved),
        };
      }
    } catch (error) {
      if (current()) {
        this._draftNotice =
          error instanceof LocalNotice ? error.message : UI.drafts.unavailableSaved;
        if (resuming) {
          this._resumeUnverified = true;
          this._baseline = null;
          this._saveIssue = 'reread';
        }
      }
      if (!resuming) editorDrafts.release(scope, claim);
    } finally {
      if (
        this._pendingRecoveryClaim?.claim.draftId === claim.draftId &&
        this._pendingRecoveryClaim.claim.claimEpoch === claim.claimEpoch
      ) {
        editorDrafts.release(scope, claim);
        this._pendingRecoveryClaim = null;
      }
      this._finishSavedRead(operation);
    }
  }
  private async _retryNavigationResume(): Promise<void> {
    if (!this._isAdmin || this._savedRead || this._draftAuthStale) return;
    if (this._claimedScope && this._draftClaim && this._resumePayload)
      await this._readNavigationDraft(
        this._claimedScope,
        this._draftClaim,
        this._resumePayload,
        true
      );
    else if (this._entityId) this._reloadCurvesAfterCurrentLoad(this._entityId);
  }
  private async _discardOrphanDraft(summary: Summary): Promise<void> {
    const scope = this._draftScope();
    if (!scope || this._isDirty) return;
    const claimed = editorDrafts.claim(scope, summary.draftId, summary.version, this._draftOwner);
    if (claimed.ok) editorDrafts.clear(scope, claimed.value.claim);
    else this._draftNotice = UI.drafts.changed;
    this.requestUpdate();
  }
  private async _reviewLostLocalCopy(): Promise<void> {
    this._writeReview = { kind: 'required' };
    if (!this._draftLost || !this._hass || !this._draftScope() || !this._isAdmin || this._savedRead)
      return;
    const scope = this._draftScope()!,
      operation = this._beginSavedRead(),
      owner = this._draftOwner;
    const current = () =>
      this._draftLost &&
      this.isConnected &&
      this._ownsSavedRead(operation) &&
      owner === this._draftOwner &&
      this._isAdmin &&
      editorDrafts.isCurrent(scope) &&
      JSON.stringify(this._draftScope()) === JSON.stringify(scope);
    try {
      const read = await this._readLatestSaved(
        current,
        scope.configEntryId,
        UI.drafts.unavailableSaved
      );
      if (!read?.valid()) return;
      const { latest, curves, writeReview } = read;
      this._retainedReview = {
        scope,
        claim: { draftId: '', ownerId: this._draftOwner, claimEpoch: 0, version: 0 },
        payload: this._draftPayload(),
        localCopy: true,
      };
      this._saveReview = {
        writeReview,
        latest,
        curves,
        members: compareSavedShapes(this._originalCurves, this._curves, curves),
      };
    } catch {
      if (current()) this._draftNotice = UI.drafts.unavailableSaved;
    } finally {
      this._finishSavedRead(operation);
    }
  }
  private _renderNavigationDrafts() {
    const scope = this._draftScope();
    const summaries =
      scope &&
      this._isAdmin &&
      !this._isDirty &&
      !this._savedRead &&
      !this._draftClaim &&
      this._baseline
        ? editorDrafts.list(scope)
        : [];
    if (
      !this._resumeUnverified &&
      !this._draftNotice &&
      !(!scope && this._isDirty) &&
      !this._draftLost &&
      !this._draftWriteNeedsReview &&
      !summaries.length
    )
      return nothing;
    return html`<div class="navigation-drafts">
      ${this._resumeUnverified
        ? html`<span role="status"
            >${UI.drafts.unverified}<button
              class="command-retry"
              type="button"
              ?disabled=${this._savedRead || !this._isAdmin}
              @click=${() => this._retryNavigationResume()}
            >
              ${UI.guardedSave.check}
            </button></span
          >`
        : nothing}${this._draftNotice
        ? html`<span role="status">${this._draftNotice}</span>`
        : !scope && this._isDirty
          ? html`<span role="status">${UI.drafts.unavailable}</span>`
          : nothing}
      ${this._draftLost
        ? html`<span role="status"
            >${UI.drafts.openedElsewhere}<button
              class="command-retry"
              type="button"
              ?disabled=${this._savedRead}
              @click=${() => this._reviewLostLocalCopy()}
            >
              ${UI.drafts.reviewLocal}
            </button></span
          >`
        : nothing}
      ${this._draftWriteNeedsReview && !this._draftLost
        ? html`<span role="status"
            >${UI.drafts.unknown}<button
              class="command-retry"
              type="button"
              ?disabled=${this._savedRead || this._runtimeBlocked}
              @click=${() => this._reviewLatest()}
            >
              ${UI.guardedSave.review}
            </button></span
          >`
        : nothing}
      ${summaries.map(
        (summary) =>
          html`<span role="status"
            >${summary.complete ? UI.drafts.available : UI.drafts.older}
            ${summary.affectedIds
              .map((id) => this._hass?.states[id]?.attributes.friendly_name ?? id)
              .join(', ')}
            · ${summary.affectedIds.length}
            ${summary.affectedIds.length === 1 ? UI.drafts.changedLight : UI.drafts.changedLights} ·
            ${new Date(summary.updatedAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              fractionalSecondDigits: 3,
            })}<button
              class="command-retry"
              type="button"
              data-draft-recover
              @click=${() => this._recoverNavigationDraft(summary)}
            >
              ${UI.drafts.recover}</button
            ><button
              class="command-retry"
              type="button"
              data-draft-discard
              @click=${() => this._discardOrphanDraft(summary)}
            >
              ${UI.drafts.discard}
            </button></span
          >`
      )}
    </div>`;
  }

  private get _runtimeBlocked(): boolean {
    const entry = this._baseline?.config_entry_id ?? this._knownEntryId;
    return (
      !!entry &&
      (this._identityUnavailableRuntimeEntries.has(entry) ||
        (!!this._draftPrincipal && editorDrafts.isRuntimeBlocked(this._draftPrincipal, entry)))
    );
  }

  private get _canGuardedSave(): boolean {
    return (
      this._canEditCurves &&
      !!this._baseline &&
      !this._membershipBaseline &&
      !this._saveIssue &&
      !this._draftWriteNeedsReview &&
      !this._runtimeBlocked
    );
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
      (this.experimentalFirstUse || this.canvasHelp) &&
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
    this._editGesture = null;
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
            this._focusHelpButton({ preventScroll: true });
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

  /** Help sits in the panel toolbar or the card header. */
  private _focusHelpButton(options?: FocusOptions): void {
    (this._activeToolbarHost ?? this.renderRoot)
      .querySelector<HTMLButtonElement>('.canvas-help, .coach-help, .invitation-replay')
      ?.focus(options);
  }

  /**
   * Show me how. The example only replaces the drawing; curves, the draft,
   * Undo and the lights stay as they are until a point is changed.
   */
  private _toggleCanvasHelp(replay = false): void {
    if (this._invitation.curve && !replay) {
      this._closeCanvasHelp();
      return;
    }
    this._hoveredCurveId = null;
    if (replay) this._dismissInvitation();
    this._clearPresetGraphTrial();
    this._clearInvitationStartTimer();
    if (!this._canRunInvitation) {
      this._showCanvasHelpNotice(
        this._isDirty
          ? UI.canvasHelp.draft
          : this._previewActive
            ? UI.canvasHelp.watching
            : UI.canvasHelp.busy
      );
      return;
    }
    this._clearCanvasHelpNotice();
    // The example ends when its graph scrolls away, so bring the graph into view first.
    const graph = this.renderRoot.querySelector<CurveGraph>('curve-graph');
    const bounds = graph?.getBoundingClientRect();
    if (bounds && (bounds.top < 0 || bounds.bottom > window.innerHeight)) {
      graph?.scrollIntoView?.({ block: 'center', behavior: 'instant' });
    }
    this._startInvitation();
  }

  /** Done, Close example and Escape: the example leaves and help keeps focus. */
  private _closeCanvasHelp(): void {
    const graph = this.renderRoot.querySelector<CurveGraph>('curve-graph');
    this._dismissInvitation();
    void this.updateComplete.then(async () => {
      // Runs after the dismissal has returned focus to a graph point, if it could.
      await graph?.updateComplete;
      if (!this.isConnected) return;
      const focused = this._activeFocusPath().at(-1);
      if (focused && focused !== document.body && focused !== this && focused.isConnected) return;
      this._focusHelpButton({ preventScroll: true });
    });
  }

  private _showCanvasHelpNotice(notice: string): void {
    this._clearCanvasHelpNotice();
    this._canvasHelpNotice = notice;
    this._canvasHelpNoticeTimer = setTimeout(() => {
      this._canvasHelpNoticeTimer = null;
      this._canvasHelpNotice = null;
    }, FIRST_USE_TIMING.context);
  }

  private _clearCanvasHelpNotice(): void {
    if (this._canvasHelpNoticeTimer !== null) clearTimeout(this._canvasHelpNoticeTimer);
    this._canvasHelpNoticeTimer = null;
    this._canvasHelpNotice = null;
  }

  private _onGraphInteraction(e: CustomEvent<GraphInteraction>): void {
    if (e.detail.phase === 'start') {
      this._endLightGesture();
      this._hoveredCurveId = null;
    }
    if (this.experimentalFirstUse || this.canvasHelp) this.requestUpdate();
    if (e.detail.phase !== 'start') return;
    this._clearInvitationStartTimer();
    this._invitationAutoAllowed = false;
    this._invitationInput = e.detail.input;
    if (this._invitation.curve) this._invitation.freeze();
  }

  private _onInvitationControl = (e: Event): void => {
    if (!this.experimentalFirstUse && !this.canvasHelp) return;
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
    if (!document.hidden) return;
    this._hoveredCurveId = null;
    this._dismissInvitation();
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
    if (!this.experimentalFirstUse && !this.canvasHelp) return;
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
      !this._groupDeleted &&
      !this._runtimeBlocked &&
      !this._draftLost &&
      !this._savedRead &&
      !this._resumeUnverified &&
      !this._draftAuthStale &&
      !this._saveReview
    );
  }

  public get dirty(): boolean {
    return this._isDirty;
  }

  connectedCallback(): void {
    this._previewController.connect();
    super.connectedCallback();
    if (this._draftPrincipal && !editorDrafts.isCurrent(this._draftPrincipal))
      this._invalidateDraftIdentity();
    this._subscribeDraft();
    if (this._resumeTicket && this._claimedScope) void this._resumeNavigationDraft();
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
    window.addEventListener('scroll', this._boundFooterOverlaySync, {
      passive: true,
      capture: true,
    });
    this._observeFooterScrollRoots();
    window.visualViewport?.addEventListener('resize', this._boundFooterOverlaySync);
    window.visualViewport?.addEventListener('scroll', this._boundFooterOverlaySync);
    this._coach.connect(this);
    this.addEventListener('pointerdown', this._onInvitationControl, true);
    this.addEventListener('keydown', this._onInvitationControl, true);
    document.addEventListener('visibilitychange', this._onInvitationVisibility);
  }

  disconnectedCallback(): void {
    this._managingLights = false;
    this._previewController.disconnect();
    this._closeRestoration();
    this._leaveDraftContext(true);
    if (this._saving) this._saveIssue = 'uncertain';
    this._contextGeneration++;
    this._loadGeneration++;
    this._recoveryGeneration++;
    this._savedRead = null;
    this._saveReview = null;
    this._load = { ...this._load, loading: false };
    this._commandFocusVersion++;
    this._pendingCommandFocus = null;
    this._clearToolbarHost();
    this._endLightGesture(false);
    this._layoutObserver?.disconnect();
    this._layoutObserver = null;
    this._layoutNodes = [];
    this._pendingNarrowLayout = null;
    this._dismissInvitation();
    this._invitationObserver?.disconnect();
    this._invitationGraph = null;
    this._invitationMotionUnsubscribe?.();
    this._invitationMotionUnsubscribe = null;
    if (this._invitationHintTimer !== null) clearTimeout(this._invitationHintTimer);
    this._invitationHintTimer = null;
    this._invitationEditHint = null;
    this._invitationTogether = false;
    this._clearCanvasHelpNotice();
    this.removeEventListener('pointerdown', this._onInvitationControl, true);
    this.removeEventListener('keydown', this._onInvitationControl, true);
    document.removeEventListener('visibilitychange', this._onInvitationVisibility);
    super.disconnectedCallback();
    this._stopDrawIn();
    this._stopDrawOut();
    this._clearMembershipStatus();
    if (this._previewActive) this._stopPreview();
    this._clearPresetGraphTrial();
    this._setMembershipOpen(false);
    this._coach.disconnect();
    this._previewController.disconnect();
    this._editGesture = null;
    if (this._boundKeyHandler) {
      window.removeEventListener('keydown', this._boundKeyHandler);
    }
    if (this._boundBeforeUnload) {
      window.removeEventListener('beforeunload', this._boundBeforeUnload);
    }
    if (this._boundFooterOverlaySync) {
      window.removeEventListener('resize', this._boundFooterOverlaySync);
      window.removeEventListener('scroll', this._boundFooterOverlaySync, true);
      window.visualViewport?.removeEventListener('resize', this._boundFooterOverlaySync);
      window.visualViewport?.removeEventListener('scroll', this._boundFooterOverlaySync);
      for (const root of this._footerScrollRoots)
        root.removeEventListener('scroll', this._boundFooterOverlaySync, true);
      this._footerScrollRoots = [];
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
    if (this._saving) {
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
    this._stopCurveAnimation();
    this._stopRipple();
  }

  private _commandButtons(): Map<string, HTMLButtonElement> {
    const buttons = new Map<string, HTMLButtonElement>();
    for (const root of [this.renderRoot, this._activeToolbarHost]) {
      if (!root) continue;
      const roots = [
        root,
        root.querySelector('curve-footer')?.renderRoot,
        root.querySelector('curve-scrubber')?.renderRoot,
      ];
      for (const scope of roots) {
        if (!scope) continue;
        for (const name of [
          'preview-toggle-btn',
          'btn-save',
          'btn-undo',
          'canvas-help',
          'coach-help',
          'invitation-replay',
          'command-retry',
        ]) {
          const button = scope.querySelector<HTMLButtonElement>(`.${name}`);
          if (button) buttons.set(name, button);
        }
        const cancel = scope.querySelector<HTMLButtonElement>('[aria-label="Cancel changes"]');
        if (cancel) buttons.set('cancel', cancel);
      }
    }
    return buttons;
  }

  protected willUpdate(changedProps: Map<PropertyKey, unknown>): void {
    super.willUpdate(changedProps);
    if (
      this._hoveredCurveId !== null &&
      !this._curves.some((curve) => curve.entityId === this._hoveredCurveId && curve.visible)
    )
      this._hoveredCurveId = null;
    if (!changedProps.has('_narrowLayout') && !changedProps.has('toolbarHost')) return;
    this._commandFocusVersion++;
    for (const [name, button] of this._commandButtons()) {
      if ((button.getRootNode() as Document | ShadowRoot).activeElement === button) {
        this._pendingCommandFocus = name;
        break;
      }
    }
  }

  private async _restoreCommandFocus(): Promise<void> {
    const name = this._pendingCommandFocus;
    if (!name) return;
    this._pendingCommandFocus = null;
    const version = this._commandFocusVersion;
    const roots = [this.renderRoot, this._activeToolbarHost];
    await Promise.all(
      roots.flatMap((root) =>
        root
          ? [...root.querySelectorAll('curve-footer, curve-scrubber')].map(
              (element) => (element as LitElement).updateComplete
            )
          : []
      )
    );
    if (this.isConnected && version === this._commandFocusVersion) {
      this._commandButtons().get(name)?.focus({ preventScroll: true });
    }
  }

  protected updated(changedProps: Map<PropertyKey, unknown>): void {
    super.updated(changedProps);
    this._syncInvitation();
    this._observeLayout();
    if (
      this._lightGesture &&
      (!this._canEditCurves ||
        this._lightGesture.roomValue !== this._effectiveScrubberPosition ||
        !this._curves.some(
          (curve) => curve.entityId === this._lightGesture?.entityId && curve.visible
        ))
    )
      this._endLightGesture();

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
            detail: { dirty, entityId: this._entityId },
            bubbles: true,
            composed: true,
          })
        );
        if (dirty) {
          this._dispatchSave({ type: 'dirty' });
        }
      }
    }
    this._observeFooterScrollRoots();
    this._scheduleFooterOverlaySync();
    this._syncToolbarHost();
    void this._restoreCommandFocus();
  }

  private _scheduleFooterOverlaySync(): void {
    if (this._footerOverlayFrame !== null) return;
    this._footerOverlayFrame = requestAnimationFrame(() => {
      this._footerOverlayFrame = null;
      const narrow = this._pendingNarrowLayout;
      this._pendingNarrowLayout = null;
      if (narrow !== null && narrow !== this._narrowLayout) {
        // Rendering changes the observed dock and ancestor card dimensions.
        // Apply the mode outside ResizeObserver delivery to avoid a loop.
        this._endLightGesture();
        this._narrowLayout = narrow;
        return;
      }
      this._syncFooterOverlay();
    });
  }

  private _observeFooterScrollRoots(): void {
    if (!this._boundFooterOverlaySync || !this.isConnected) return;
    const roots: ShadowRoot[] = [];
    let root = this.getRootNode();
    while (root instanceof ShadowRoot) {
      roots.push(root);
      root = root.host.getRootNode();
    }
    if (
      roots.length === this._footerScrollRoots.length &&
      roots.every((root, index) => root === this._footerScrollRoots[index])
    )
      return;
    for (const previous of this._footerScrollRoots)
      previous.removeEventListener('scroll', this._boundFooterOverlaySync, true);
    this._footerScrollRoots = roots;
    for (const current of roots)
      current.addEventListener('scroll', this._boundFooterOverlaySync, {
        passive: true,
        capture: true,
      });
  }

  private _observeLayout(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this._layoutObserver ??= new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target.classList.contains('card') && entry.contentRect.width > 0) {
          this._pendingNarrowLayout = entry.contentRect.width < 860;
        }
      }
      this._scheduleFooterOverlaySync();
    });
    const nodes = [...this.renderRoot.querySelectorAll('.card, .main-stack, .control-dock')];
    if (
      nodes.length === this._layoutNodes.length &&
      nodes.every((node, i) => node === this._layoutNodes[i])
    )
      return;
    this._layoutObserver.disconnect();
    this._layoutNodes = nodes;
    for (const node of nodes) this._layoutObserver.observe(node);
  }

  private _syncFooterOverlay(): void {
    const footerSlot = this.renderRoot.querySelector<HTMLElement>('.footer-slot');
    const dock = this.renderRoot.querySelector<HTMLElement>('.control-dock');
    const workspace = this.renderRoot.querySelector<HTMLElement>('.workspace');
    if (!dock || !workspace) return;
    this._clearFooterOverlay();

    const room = dock.querySelector<HTMLElement>('curve-scrubber');
    const graph = this.renderRoot.querySelector('curve-graph');
    const svg = graph?.renderRoot?.querySelector('svg');
    const plot = svg?.querySelector<SVGRectElement>('.plot-frame');
    const matrix = svg?.getScreenCTM?.();
    if (room && plot && matrix && typeof DOMPoint !== 'undefined' && !this._narrowLayout) {
      const left = new DOMPoint(plot.x.baseVal.value, 0).matrixTransform(matrix).x;
      const right = new DOMPoint(
        plot.x.baseVal.value + plot.width.baseVal.value,
        0
      ).matrixTransform(matrix).x;
      const bounds = room.getBoundingClientRect();
      room.style.setProperty('--room-axis-left', `${Math.max(0, left - bounds.left)}px`);
      room.style.setProperty('--room-axis-right', `${Math.max(0, bounds.right - right)}px`);
    }

    // Undo, Cancel and Save stay reachable while they carry work: an action
    // row scrolled out of view is pinned to the bottom edge in its own column.
    if (!footerSlot?.classList.contains('active')) return;
    const workspaceBox = workspace.getBoundingClientRect();
    const viewportHeight =
      window.visualViewport?.height || document.documentElement.clientHeight || window.innerHeight;
    let visibleTop = 0;
    let visibleBottom = viewportHeight;
    // A dashboard may scroll inside a shorter panel rather than the window.
    // Keep actions within that actual visible scrollport, across shadow hosts.
    const cardRoot = this.getRootNode();
    let ancestor: Element | null =
      this.parentElement ?? (cardRoot instanceof ShadowRoot ? cardRoot.host : null);
    while (ancestor) {
      if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(ancestor).overflowY)) {
        const bounds = ancestor.getBoundingClientRect();
        visibleTop = Math.max(visibleTop, bounds.top);
        visibleBottom = Math.min(visibleBottom, bounds.bottom);
      }
      const root = ancestor.getRootNode();
      ancestor = ancestor.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
    }
    if (workspaceBox.bottom <= visibleTop || workspaceBox.top >= visibleBottom) return;
    const box = footerSlot.getBoundingClientRect();
    const hidden = Math.max(box.bottom - visibleBottom, visibleTop - box.top);
    if (hidden <= FOOTER_OVERLAY_VISIBILITY_TOLERANCE_PX) return;
    const left = Math.max(0, box.left);
    const width = Math.max(0, Math.min(box.right, window.innerWidth) - left);
    // Hold the row's space so the page below it does not move.
    const dockHeight = getComputedStyle(dock).height;
    dock.style.minHeight =
      parseFloat(dockHeight) > 0 ? dockHeight : `${dock.getBoundingClientRect().height}px`;
    footerSlot.dataset.overlay = 'true';
    footerSlot.style.setProperty('--curve-footer-overlay-left', `${left}px`);
    footerSlot.style.setProperty('--curve-footer-overlay-width', `${width}px`);
    // A transformed/filter ancestor changes fixed positioning's containing
    // block. Measure the rendered row so axis-aligned translation/scale does
    // not move the actions away from their viewport target.
    let fixedBox = footerSlot.getBoundingClientRect();
    let fixedStyle = getComputedStyle(footerSlot);
    const cssWidth = fixedStyle.width.endsWith('px') ? parseFloat(fixedStyle.width) : 0;
    const scaleX = cssWidth > 0 && fixedBox.width > 0 ? fixedBox.width / cssWidth : 1;
    footerSlot.style.setProperty('--curve-footer-overlay-width', `${width / scaleX}px`);
    fixedBox = footerSlot.getBoundingClientRect();
    fixedStyle = getComputedStyle(footerSlot);
    const cssHeight = fixedStyle.height.endsWith('px') ? parseFloat(fixedStyle.height) : 0;
    const scaleY = cssHeight > 0 && fixedBox.height > 0 ? fixedBox.height / cssHeight : 1;
    const safeBottom = parseFloat(fixedStyle.bottom) || 0;
    const bottom = Math.min(visibleBottom, viewportHeight - safeBottom, workspaceBox.bottom);
    // Do not put one card's actions over its sibling, or rescue a whole row
    // into a sliver of visible workspace that cannot hold it.
    if (bottom - fixedBox.height < Math.max(visibleTop, workspaceBox.top)) {
      this._clearFooterOverlay();
      return;
    }
    footerSlot.style.setProperty(
      '--curve-footer-overlay-left',
      `${left + (left - fixedBox.left) / scaleX}px`
    );
    footerSlot.style.setProperty(
      '--curve-footer-overlay-bottom',
      `${safeBottom + (fixedBox.bottom - bottom) / scaleY}px`
    );
  }

  private _clearFooterOverlay(): void {
    const footerSlot = this.renderRoot.querySelector<HTMLElement>('.footer-slot');
    if (footerSlot) {
      delete footerSlot.dataset.overlay;
      footerSlot.style.removeProperty('--curve-footer-overlay-left');
      footerSlot.style.removeProperty('--curve-footer-overlay-width');
      footerSlot.style.removeProperty('--curve-footer-overlay-bottom');
    }
    const dock = this.renderRoot.querySelector<HTMLElement>('.control-dock');
    if (dock) dock.style.minHeight = '';
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

  private _dismissCoach(event?: Event): void {
    const escapePath =
      event instanceof KeyboardEvent && event.key === 'Escape' ? event.composedPath() : null;
    this._coach.dismiss();
    void this.updateComplete.then(() => {
      if (escapePath) {
        const focused = this._activeFocusPath().at(-1);
        if (
          focused &&
          focused !== document.body &&
          focused.isConnected &&
          !escapePath.includes(focused)
        ) {
          return;
        }
      }
      this._focusHelpButton();
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
    // End a held graph drag first, so it cannot move a point of the new shape.
    this.renderRoot.querySelector<CurveGraph>('curve-graph')?.cancelInteraction();
    this._completeDragMaybeReload();
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

  private _matchingPresetId(curve: LightCurve): string | null {
    return CURVE_PRESETS.find((preset) => sameShape(curve, preset))?.id ?? null;
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
        scrubberPosition = Math.round(Math.min(100, Math.max(0, parsed.scrubberPosition)));
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
    if (this._restorationOpen) return;
    // The event path identifies this card even when HA shadow roots retarget focus to a host.
    const path = e.composedPath();
    const commandHost = path.find(
      (node): node is HTMLElement => node instanceof HTMLElement && toolbarOwners.has(node)
    );
    const owner = commandHost
      ? toolbarOwners.get(commandHost)
      : path.find((node) => node instanceof LightenerCurveCard);
    if (e.key === 'Escape') {
      // Escape belongs only to the original card/hosted commands in this event's
      // path. A render may remove focus before this window listener runs.
      if (e.defaultPrevented || owner !== this) return;
      if (this._invitation.curve) {
        e.preventDefault();
        if (this.canvasHelp) this._closeCanvasHelp();
        else this._dismissInvitation();
      } else if (this._presetGraphTrial) {
        e.preventDefault();
        this._clearPresetGraphTrial();
      } else if (this._coach.phase !== 'inactive') {
        e.preventDefault();
        if (
          path.some((node) => node instanceof Element && node.classList.contains('coach-prompt'))
        ) {
          this._dismissCoach(e);
        } else {
          this._coach.dismiss();
        }
      }
      return;
    }
    if (
      e.defaultPrevented ||
      owner !== this ||
      e.isComposing ||
      e.altKey ||
      e.shiftKey ||
      !(e.ctrlKey || e.metaKey)
    )
      return;
    if (
      path.some((node) => {
        if (!(node instanceof HTMLElement)) return false;
        return (
          node.isContentEditable ||
          (node.hasAttribute('contenteditable') &&
            node.getAttribute('contenteditable') !== 'false') ||
          node instanceof HTMLTextAreaElement ||
          node instanceof HTMLSelectElement ||
          (node instanceof HTMLInputElement && node.type !== 'range')
        );
      })
    )
      return;

    const key = e.key.toLowerCase();
    if (key === 's') {
      // The editor owns Save even while clean or temporarily unable to save.
      e.preventDefault();
      if (this._canEditCurves && this._isDirty) this._onSave();
    }
    if (key === 'z' && this._canUndoCurves && this._undoStack.length > 0) {
      e.preventDefault();
      this._undo();
    }
  }

  private _onBeforeUnload(e: BeforeUnloadEvent): void {
    if (this._isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  private async _tryLoadCurves(): Promise<void> {
    if (this._draftAuthStale) return;
    // Every response belongs to its load and group context, including A→B→A.
    const context = this._contextGeneration;
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

    const loadGeneration = ++this._loadGeneration;
    this._load = beginLoad(this._load);
    // Capture the entity we're loading so we can discard stale responses
    const requestedEntity = this._entityId;

    try {
      const result = await this._hass.callWS<{ entities: SavedEntities }>({
        type: 'lightener/get_curves',
        entity_id: requestedEntity,
      });

      if (context !== this._contextGeneration || loadGeneration !== this._loadGeneration) return;
      if (!validEntities(result.entities)) throw new Error(UI.guardedSave.invalidResponse);
      const snapshot = guardedSnapshot(result);
      if (this._membershipBaseline) {
        this._load = { ...this._load, loaded: true, loadedEntityId: requestedEntity };
        if (!snapshot) {
          this._saveIssue = 'incompatible';
          return;
        }
        if (!savedEntitiesEqual(snapshot.entities, this._membershipBaseline)) {
          this._saveIssue = 'conflict';
          return;
        }
        this._baseline = snapshot;
        this._rawBaseline = snapshot.entities;
        this._membershipBaseline = null;
        this._saveIssue = null;
        this._load = { ...this._load, loaded: true, loadedEntityId: requestedEntity };
        return;
      }
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
          this._endLightGesture(false);
          this._curves = curves;
          this._originalCurves = cloneCurves(curves);
          this._baseline = snapshot;
          if (this._verifyAfterDiscard && snapshot) {
            this._draftLost = false;
            this._resumeUnverified = false;
            this._verifyAfterDiscard = false;
            this._draftNotice = null;
          }
          if (snapshot) this._knownEntryId = snapshot.config_entry_id;
          this._subscribeDraft();
          this._rawBaseline = structuredClone(result.entities);
          this._saveIssue = !this._isAdmin ? 'readonly' : snapshot ? null : 'incompatible';
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
        }
      }
      // action 'discard' / 'run-queued-reload' need no curve write here;
      // finishLoad() below issues any follow-up reload.
    } catch (err) {
      if (context !== this._contextGeneration || loadGeneration !== this._loadGeneration) return;
      const { state, discarded } = resolveError(
        this._load,
        requestedEntity,
        this._entityId,
        String(err)
      );
      this._load = state;
      if (!discarded) {
        console.error('[Lightener] Failed to load curves:', err);
      }
    } finally {
      if (context !== this._contextGeneration || loadGeneration !== this._loadGeneration) return;
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

  private _onScrubberMove(e: CustomEvent<ScrubberMove>): void {
    if (!this._canEditCurves || !Number.isFinite(e.detail.position)) return;
    this._endLightGesture();
    this._dismissInvitation();
    this._invitationTogether = false;
    this._clearPresetGraphTrial();
    const position = Math.min(100, Math.max(0, e.detail.position));
    this._scrubberPosition = position;
    if (this._load.loadedEntityId) {
      this._writeStoredState(this._load.loadedEntityId, { scrubberPosition: position });
    }
    if (this._previewActive) {
      this._previewLights(position);
    }
  }

  private _onScrubberStart(): void {
    this._endLightGesture();
  }

  private _onScrubberEnd(): void {
    // No-op: preview is now controlled by the explicit preview toggle button
  }

  private _onPreviewToggle = (): void => {
    if (!this._canEditCurves && !this._previewActive) return;
    this._endLightGesture();
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
    void this._previewController.stop();
  };

  private _openRestoration(): void {
    this._restorationFocus = (this.renderRoot as ShadowRoot).activeElement as HTMLElement | null;
    this._restorationOpen = true;
  }
  private _closeRestoration(): void {
    this._restorationOpen = false;
    const focus = this._restorationFocus;
    this._restorationFocus = null;
    if (focus?.isConnected) void this.updateComplete.then(() => focus.focus());
  }
  private _reviewRestoration(
    event: CustomEvent<{ token: string; selected?: string[] }>,
    restore: boolean
  ): void {
    const ok = restore
      ? this._previewController.restoreSelected(event.detail.token, event.detail.selected ?? [])
      : this._previewController.keepCurrent(event.detail.token);
    if (ok) this._closeRestoration();
    else this.requestUpdate();
  }
  private async _settlePreviewForMembership(): Promise<boolean> {
    const context = this._contextGeneration;
    await this._previewController.stop();
    if (context !== this._contextGeneration || !this.isConnected) return false;
    if (this._previewController.mutationBlocked) {
      this._manageError = UI.restoration.operationBlocked;
      return false;
    }
    if (this._previewController.blocked) {
      this._openRestoration();
      return false;
    }
    return true;
  }

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
    this._endLightGesture();
    this._dismissInvitation();
    if (this._hoveredCurveId !== e.detail.entityId) this._hoveredCurveId = null;
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
  }

  /** Hover only isolates a visible light; selection, drafts and lights stay unchanged. */
  private _onHoverCurve(e: CustomEvent<{ entityId: string | null }>): void {
    const { entityId } = e.detail;
    this._hoveredCurveId =
      entityId !== null &&
      this._curves.some((curve) => curve.entityId === entityId && curve.visible)
        ? entityId
        : null;
  }

  /** "All lights" clears the selection through the row toggle path. */
  private _clearSelection(): void {
    const entityId = this._selectedCurveId;
    if (entityId === null) return;
    const hadFocus = this._activeFocusPath().some((node) => node.matches('.context-clear'));
    this._onSelectCurve(new CustomEvent('select-curve', { detail: { entityId } }));
    if (!hadFocus) return;
    // The button leaves with the selection; keep focus on the same line.
    void this.updateComplete.then(() => {
      if (this._selectedCurveId !== null || !this.isConnected) return;
      this.renderRoot.querySelector<HTMLElement>('.context-line')?.focus({ preventScroll: true });
    });
  }

  private _onFocusCurve(e: CustomEvent<LightLevelIntent>): void {
    this._endLightGesture();
    if (this._hoveredCurveId !== e.detail.entityId) this._hoveredCurveId = null;
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
  }

  private _onLightLevelStart(event: CustomEvent<LightLevelIntent>): void {
    this._endLightGesture();
    this.renderRoot.querySelector<CurveGraph>('curve-graph')?.cancelInteraction();
    this._completeDragMaybeReload();
    this._dismissInvitation();
    const { entityId } = event.detail;
    const position = Math.round(this._effectiveScrubberPosition);
    if (
      !this._canEditCurves ||
      this._load.loading ||
      !this._entityId ||
      this._load.loadedEntityId !== this._entityId ||
      position <= 0 ||
      !canSelectCurve(this._curves, entityId)
    )
      return;
    this._onFocusCurve(event);
    this._stopRipple();
    const points = this._curves.find((curve) => curve.entityId === entityId)!.controlPoints;
    this._editGesture = {
      kind: 'light',
      undoPushed: false,
      entityId,
      groupId: this._entityId,
      position,
      roomValue: this._effectiveScrubberPosition,
      startingPoints: points.map((point) => ({ ...point })),
      startingTarget: sampleCurveAt(points, position),
      dirtyVersion: this._dirtyVersion,
      // Entries are immutable deep snapshots; only the stack container changes.
      undoStack: this._undoStack.slice(),
    };
  }

  private _onLightLevelInput(event: CustomEvent<LightLevelInput>): void {
    const gesture = this._lightGesture;
    if (!gesture || event.detail.entityId !== gesture.entityId) return;
    if (
      !this._canEditCurves ||
      this._load.loading ||
      gesture.groupId !== this._entityId ||
      gesture.roomValue !== this._effectiveScrubberPosition ||
      !canSelectCurve(this._curves, gesture.entityId)
    ) {
      this._endLightGesture();
      return;
    }
    const target = event.detail.target;
    if (!Number.isFinite(target)) return;
    const returning = target === gesture.startingTarget;
    const curve = this._curves.find((item) => item.entityId === gesture.entityId)!;
    // Restore this gesture's exact geometry before ordinary level rounding can
    // quantize a fractional response or leave an inserted knot behind.
    const next = returning
      ? sameShape(curve, { controlPoints: gesture.startingPoints })
        ? null
        : this._curves.map((item) =>
            item.entityId === gesture.entityId
              ? { ...item, controlPoints: gesture.startingPoints.map((point) => ({ ...point })) }
              : item
          )
      : setLightLevel(this._curves, gesture.entityId, gesture.position, target);
    if (!next) return;
    this._commitGestureEdit(next);
    this._coach.afterEdit();
    this._previewSingleLight(
      gesture.entityId,
      gesture.position,
      false,
      returning ? gesture.startingTarget : Math.round(Math.min(100, Math.max(0, target)))
    );
  }

  private _onLightLevelEnd(event: CustomEvent<LightLevelIntent>): void {
    if (event.detail.entityId === this._lightGesture?.entityId) this._endLightGesture();
  }

  private _endLightGesture(reload = true): void {
    if (!this._lightGesture) return;
    if (reload) this._completeDragMaybeReload();
    else {
      this._restoreNetZeroLightGesture();
      this._editGesture = null;
    }
  }

  private _restoreNetZeroLightGesture(): void {
    const gesture = this._lightGesture;
    if (!gesture?.undoPushed) return;
    const points = this._curves.find((curve) => curve.entityId === gesture.entityId)?.controlPoints;
    if (!points || !sameShape({ controlPoints: points }, { controlPoints: gesture.startingPoints }))
      return;
    this._dirtyVersion = gesture.dirtyVersion;
    // A push at the 50-entry cap already evicted the oldest snapshot.
    this._undoStack = gesture.undoStack;
    if (!this._isDirty) this._coach.afterClean();
    // Re-enter the existing render and curve-dirty-state notification boundary.
    this._curves = [...this._curves];
  }

  // Graph movement starts on its first effective change; a bar has already
  // captured its light and room coordinate. Both commit through this boundary.
  private _commitGestureEdit(nextCurves: LightCurve[]): void {
    this._suppressDraftCapture = false;
    const gesture = (this._editGesture ??= { kind: 'point', undoPushed: false });
    const first = !gesture.undoPushed;
    if (first) {
      this._pushUndo();
      gesture.undoPushed = true;
    }
    this._curves = nextCurves;
    this._dirtyVersion++;
    if (first) this._checkpointDraft();
  }

  private _pushUndo(): void {
    pushEditUndo(this._undoStack, this._curves);
  }

  // Shared discrete-edit commit: snapshot undo, swap in the new curves, mark
  // dirty, and force-refresh the preview at the scrubber. Used by add / remove /
  // preset. Continuous edits use _commitGestureEdit for one Undo per gesture;
  // their handlers preview only the edited light at its exact target.
  private _commitCurveEdit(nextCurves: LightCurve[]): void {
    this._suppressDraftCapture = false;
    this._pushUndo();
    this._curves = nextCurves;
    this._dirtyVersion++;
    this._checkpointDraft();
    this._refreshActivePreview(true);
  }

  // End-of-drag bookkeeping shared by point-drop and long-press point-remove
  // (which skips point-drop): finish the transaction and, if a hass push was
  // suppressed mid-drag (no live load), pull the latest curves now.
  private _completeDragMaybeReload(): void {
    this._restoreNetZeroLightGesture();
    this._editGesture = null;
    this._checkpointDraft();
    if (this.isConnected && !this._load.loaded && this._hass) {
      this._tryLoadCurves();
    }
  }

  private _undo(): void {
    this._endLightGesture();
    this._dismissInvitation();
    if (!this._canUndoCurves || this._undoStack.length === 0) return;
    this._dirtyVersion++;
    this._clearPresetGraphTrial();
    // Undo keeps live preview active (unlike cancel, which stops it first), so
    // repush the preview at the current scrubber position once the restore
    // animation lands — otherwise real lights stay at the pre-undo brightness.
    this._animateCurvesTo(this._undoStack.pop()!, () => {
      this._refreshActivePreview(true);
    });
  }

  private _stopCurveAnimation(): void {
    this._curveAnimationGeneration++;
    if (this._cancelAnimFrame !== null) cancelAnimationFrame(this._cancelAnimFrame);
    this._cancelAnimFrame = null;
    this._cancelAnimating = false;
    this._morphLine = null;
  }

  /** Read current focus through every nested shadow root. */
  private _activeFocusPath(): Element[] {
    const path: Element[] = [];
    let focused = document.activeElement;
    while (focused) {
      path.push(focused);
      focused = focused.shadowRoot?.activeElement ?? null;
    }
    return path;
  }

  /** Move only focus that this animation is about to remove or disable. */
  private _retainAnimationFocus(): void {
    const path = this._activeFocusPath();
    const active = path.at(-1);
    const hosted = path.some((node) => this._activeToolbarHost?.contains(node));
    if (!active || (!path.includes(this) && !hosted)) return;
    const command = [...this._commandButtons()].find(([, button]) => button === active)?.[0];
    const legendRoot = this.renderRoot.querySelector('curve-legend')?.renderRoot;
    const disappearingManagement =
      legendRoot?.contains(active) &&
      active.matches('.manage-trigger, .add-light-btn, .delete-group-btn');
    if (
      !disappearingManagement &&
      !active.classList.contains('hit-circle') &&
      !(active instanceof HTMLInputElement && active.type === 'range') &&
      (!command ||
        (command === 'btn-undo' && this._undoStack.length > 0) ||
        (command === 'preview-toggle-btn' && this._previewActive))
    )
      return;
    // Stay with the help button or the action row when one of them held focus.
    const group = path.reduceRight<HTMLElement | null>(
      (found, node) => found ?? node.closest<HTMLElement>('.editor-help, .editor-commands'),
      null
    );
    const anchor = group ?? this.renderRoot.querySelector<HTMLElement>('.card');
    anchor?.focus({ preventScroll: true });
  }

  /**
   * Animate curves from current state to endCurves over CANCEL_ANIM_DURATION_MS.
   * Shared by undo and cancel. onComplete runs after the final frame. A ripple
   * cut short this way hands its light's line to the animation, so that line
   * continues from the frame on screen instead of jumping to the data first.
   */
  private _animateCurvesTo(endCurves: LightCurve[], onComplete?: () => void): void {
    const startCurves = cloneCurves(this._curves);
    const frame = this._curveFrame;
    const endLine = frame && endCurves.find((curve) => curve.entityId === frame.entityId);
    const cutLine =
      frame && endLine
        ? {
            entityId: frame.entityId,
            from: frame.pieces,
            to: drawnShape(endLine.controlPoints).pieces,
          }
        : null;
    this._stopCurveAnimation();
    const generation = this._curveAnimationGeneration;
    this._retainAnimationFocus();
    this._stopRipple();
    this._morphLine = cutLine ? { ...cutLine, t: 0 } : null;
    this._cancelAnimating = true;
    const startTime = performance.now();

    const tick = (now: number) => {
      if (generation !== this._curveAnimationGeneration) return;
      const elapsed = Math.max(0, now - startTime);
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
        this._checkpointDraft();
        if (landedClean) this._reloadPendingDirtyResponse();
      }
    };

    this._cancelAnimFrame = requestAnimationFrame(tick);
  }

  private _onPointMove(e: CustomEvent): void {
    if (!this._canEditCurves) return;
    this._endLightGesture();
    this._clearPresetGraphTrial();
    const { curveIndex, pointIndex, lightener, target } = e.detail;
    const base = this._graphCurves;
    const point = base[curveIndex]?.controlPoints[pointIndex];
    if (point?.lightener === lightener && point.target === target) return;
    const nextCurves = movePointOnCurves(base, curveIndex, pointIndex, lightener, target);
    if (nextCurves === null) return;

    // Auto-select the curve being dragged so others dim
    const draggedCurve = this._curves[curveIndex];
    if (draggedCurve && this._selectedCurveId !== draggedCurve.entityId) {
      this._selectedCurveId = draggedCurve.entityId;
      if (this._storageEntityId) {
        this._writeStoredState(this._storageEntityId, { selectedCurveId: this._selectedCurveId });
      }
    }
    this._commitGestureEdit(nextCurves);
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
    if (this._lightGesture) return;
    this._completeDragMaybeReload();
  }

  private _onPointAdd(e: CustomEvent): void {
    if (!this._canEditCurves) return;
    this._endLightGesture();
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
    if (!this._canEditCurves) return;
    this._endLightGesture();
    this._clearPresetGraphTrial();
    // Long-press removal can skip point-drop, so run the same end-of-drag
    // bookkeeping (transaction completion + maybe-reload) here before applying the edit.
    this._completeDragMaybeReload();
    const { curveIndex, pointIndex } = e.detail;

    const next = removePointEdit(this._graphCurves, curveIndex, pointIndex);
    if (next === null) return;

    this._commitCurveEdit(next);
    this._finishInvitation();
    this._coach.afterEdit();
  }

  private _onToggleCurve(e: CustomEvent): void {
    this._endLightGesture();
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
    if (!this._hass || !this._entityId || this._managingLights || this._runtimeBlocked) return;
    this._clearPresetGraphTrial();
    if (
      (this._previewActive || this._previewController.blocked) &&
      !(await this._settlePreviewForMembership())
    )
      return;
    if (!this._isAdmin || this._runtimeBlocked || this._managingLights) return;
    const context = this._contextGeneration;
    const entityId = this._entityId;
    this._manageError = null;
    this._managingLights = true;
    try {
      const reg = (await this._hass.callWS({
        type: 'config/entity_registry/get',
        entity_id: entityId,
      })) as { config_entry_id?: string | null; platform?: string } | null;
      if (reg?.platform !== LIGHTENER_PLATFORM) {
        throw new LocalNotice(UI.legend.deleteWrongGroup);
      }
      const configEntryId = reg?.config_entry_id;
      if (!configEntryId) {
        throw new LocalNotice(UI.legend.deleteMissingEntry);
      }
      if (
        context !== this._contextGeneration ||
        !this.isConnected ||
        !this._isAdmin ||
        this._runtimeBlocked ||
        this._previewController.blocked
      )
        return;
      const settleMutation = this._previewController.beginMutation([]);
      if (!settleMutation) {
        this._manageError = UI.restoration.membershipBlocked;
        return;
      }
      // A successful HTTP response confirms this mutation settled. A failed or
      // lost response conservatively keeps its document reservation.
      await this._hass.callApi('DELETE', `config/config_entries/entry/${configEntryId}`);
      settleMutation();
      if (
        context !== this._contextGeneration ||
        !this.isConnected ||
        this._authInvalidated ||
        !this._isAdmin ||
        this._runtimeBlocked
      )
        return;
      this.discardNavigationDraft();
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
      if (context === this._contextGeneration && this.isConnected && !this._authInvalidated)
        this._manageError = err instanceof LocalNotice ? err.message : UI.legend.deleteError;
    } finally {
      if (context === this._contextGeneration) this._managingLights = false;
    }
  }

  private async _openMembershipEditor(): Promise<void> {
    this._dismissInvitation();
    if (!this._canManageLights) return;
    this._hoveredCurveId = null;
    this._coach.interrupt();
    this._clearPresetGraphTrial();
    if (
      (this._previewActive || this._previewController.blocked) &&
      !(await this._settlePreviewForMembership())
    )
      return;
    if (!this._canManageLights) return;
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
      legend?.renderRoot?.querySelector<HTMLButtonElement>('.manage-trigger')?.focus();
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
    this._baseline = null;
    this._membershipBaseline = structuredClone(result.entities);
    this._rawBaseline = structuredClone(result.entities);
    this._saveIssue = null;
    const visibleById = new Map(this._curves.map((curve) => [curve.entityId, curve.visible]));
    const previousCurves = this._curves;
    const previousSelection = this._selectedCurveId;
    this._stopDrawIn();
    this._stopDrawOut();
    this._curves = wsPayloadToCurves(result.entities, this._hass.states, CURVE_COLORS).map(
      (curve) => ({ ...curve, visible: visibleById.get(curve.entityId) ?? true })
    );
    const kept = new Set(this._curves.map((curve) => curve.entityId));
    const removed = previousCurves.flatMap((curve, index) =>
      curve.visible && !kept.has(curve.entityId) ? [{ curve, index }] : []
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
    void this._bindMembershipBaseline();
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
    if (removed.length > 0 && this.isConnected && momentPlays(this._joy, 'draw_in')) {
      this._drawOut = {
        token: ++this._drawOutToken,
        curves: removed,
        selectedCurveId: previousSelection,
      };
      this._drawOutTimer = setTimeout(() => this._stopDrawOut(), DRAW_OUT_MS);
    }
  }

  private async _bindMembershipBaseline(): Promise<void> {
    if (!this._hass || !this._entityId || !this._membershipBaseline) return;
    const entity = this._entityId,
      context = this._contextGeneration;
    const generation = ++this._loadGeneration;
    const acknowledged = this._membershipBaseline;
    // Keep the acknowledged graph and its Joy/input behavior mounted while Save
    // waits for a token. Local edits made during this read retain that baseline.
    this._load = { ...this._load, loading: false, loaded: true, loadedEntityId: entity };
    const current = () =>
      context === this._contextGeneration && generation === this._loadGeneration;
    try {
      const result = await this._hass.callWS({ type: 'lightener/get_curves', entity_id: entity });
      if (!current()) return;
      const snapshot = guardedSnapshot(result);
      if (!snapshot) {
        this._saveIssue = 'incompatible';
        return;
      }
      if (!savedEntitiesEqual(snapshot.entities, acknowledged)) {
        this._saveIssue = 'conflict';
        return;
      }
      this._baseline = snapshot;
      this._rawBaseline = snapshot.entities;
      this._membershipBaseline = null;
      this._saveIssue = null;
      this._checkpointDraft();
    } catch (error) {
      if (!current()) return;
      this._saveIssue = (error as { code?: string })?.code === 'not_found' ? 'not_found' : 'reread';
      if (this._saveIssue === 'not_found') this._groupDeleted = true;
      this._saveState = { phase: 'error', message: UI.guardedSave.readFailed };
    }
  }

  private _stopDrawOut(): void {
    if (this._drawOutTimer !== null) clearTimeout(this._drawOutTimer);
    this._drawOutTimer = null;
    this._drawOut = null;
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
    if (open) this._endLightGesture();
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

  public async saveCurves(): Promise<boolean> {
    return this._onSave();
  }

  private _guardedSaveFailure(error: unknown) {
    const code = (error as { code?: string })?.code ?? '';
    const errors: Record<string, ['runtime' | 'refused' | 'unknown', string | null, string]> = {
      conflict: ['refused', 'conflict', UI.guardedSave.conflict],
      precondition_required: ['refused', 'refresh', UI.guardedSave.refresh],
      not_found: ['refused', 'not_found', UI.guardedSave.notFound],
      unknown_entities: ['refused', 'conflict', UI.guardedSave.unknownEntities],
      invalid_format: ['refused', null, UI.guardedSave.invalid],
      unauthorized: ['refused', null, UI.guardedSave.unauthorized],
      reload_failed: ['refused', 'reread', UI.guardedSave.rolledBack],
      rollback_reload_failed: ['runtime', 'runtime', UI.guardedSave.runtime],
    };
    const [disposition, issue, message] = errors[code] ?? [
      'unknown',
      'uncertain',
      UI.guardedSave.uncertain,
    ];
    return { disposition, issue, message, deleted: code === 'not_found' };
  }

  private async _onSave(): Promise<boolean> {
    this._endLightGesture();
    this._dismissInvitation();
    if (!this._hass || !this._entityId || !this._canGuardedSave || !this._baseline) return false;
    this._clearPresetGraphTrial();
    if (this._previewActive) this._stopPreview();
    const entity = this._entityId;
    const context = this._contextGeneration;
    const baseline = this._baseline;
    const dirtyVersion = this._dirtyVersion;
    const draft = cloneCurves(this._curves);
    const patch = curvesToWsPayload(editedCurves(this._originalCurves, draft));
    const intended = intendedEntities(baseline.entities, patch);
    this._checkpointDraft();
    if (this._draftLost) return false;
    const capturedClaim = this._draftClaim ? { ...this._draftClaim } : null;
    const capturedScope = this._claimedScope ? { ...this._claimedScope } : null;
    const principal = this._identityAvailable ? this._draftPrincipal : null;
    const operationId = crypto.randomUUID();
    if (principal) {
      editorDrafts.beginWrite(principal, baseline.config_entry_id, operationId);
      this._pendingDraftWrite = { principal, entry: baseline.config_entry_id, id: operationId };
    }
    this._submittedIntent = intended;
    this._dispatchSave({ type: 'save-start' });
    // The receipt, including its complete saved content, is the confirmation.
    const { generation, settled } = this._saveGuard.arm();
    const current = () =>
      context === this._contextGeneration && entity === this._entityId && this.isConnected;
    try {
      const response = await Promise.race([
        this._hass
          .callWS({
            type: 'lightener/save_curves',
            entity_id: entity,
            expected_revision: baseline.revision,
            curves: patch,
          })
          .then((value) => {
            const receipt = guardedSnapshot(value, true);
            if (
              principal &&
              receipt &&
              receipt.config_entry_id === baseline.config_entry_id &&
              savedEntitiesEqual(receipt.entities, intended)
            )
              editorDrafts.settleWrite(
                principal,
                baseline.config_entry_id,
                operationId,
                'confirmed'
              );
            else if (principal)
              editorDrafts.settleWrite(principal, baseline.config_entry_id, operationId, 'unknown');
            return { value };
          })
          .catch((error: unknown) => {
            // Runtime uncertainty belongs to the originating entry even when
            // this response arrives after a timeout, switch or disconnect.
            const failure = this._guardedSaveFailure(error);
            if (principal)
              editorDrafts.settleWrite(
                principal,
                baseline.config_entry_id,
                operationId,
                failure.disposition
              );
            if (
              failure.disposition === 'runtime' &&
              (!principal || editorDrafts.isCurrent(principal))
            ) {
              if (!principal) this._identityUnavailableRuntimeEntries.add(baseline.config_entry_id);
              if (
                this._baseline?.config_entry_id === baseline.config_entry_id &&
                this._previewActive
              )
                this._stopPreview();
              this.requestUpdate();
            }
            throw error;
          }),
        settled.then(() => ({ timeout: true as const })),
      ]);
      if (!current()) return false;
      if ('timeout' in response) {
        this._saveIssue = 'uncertain';
        if (principal)
          editorDrafts.settleWrite(principal, baseline.config_entry_id, operationId, 'unknown');
        this._checkpointDraft();
        return false;
      }
      const receipt = guardedSnapshot(response.value, true);
      if (
        !receipt ||
        receipt.config_entry_id !== baseline.config_entry_id ||
        !savedEntitiesEqual(receipt.entities, intended)
      ) {
        throw { code: 'uncertain' };
      }
      if (this._dirtyVersion !== dirtyVersion || !curvesEqual(this._curves, draft))
        throw { code: 'uncertain' };
      this._loadGeneration++;
      this._load = {
        ...this._load,
        loading: false,
        loaded: true,
        loadedEntityId: entity,
        pendingReloadEntityId: undefined,
        reloadAfterLoadEntityId: undefined,
      };
      const visibility = new Map(this._curves.map((curve) => [curve.entityId, curve.visible]));
      const committed = wsPayloadToCurves(receipt.entities, this._hass.states, CURVE_COLORS).map(
        (curve) => ({ ...curve, visible: visibility.get(curve.entityId) ?? true })
      );
      this._baseline = receipt;
      this._rawBaseline = receipt.entities;
      this._curves = committed;
      this._originalCurves = cloneCurves(committed);
      this._cleanVersion = this._dirtyVersion;
      this._undoStack = [];
      this._submittedIntent = null;
      this._saveIssue = null;
      this._dispatchSave({ type: 'save-success' });
      this._saveGuard.confirm(generation);
      if (capturedScope && capturedClaim) editorDrafts.clear(capturedScope, capturedClaim);
      if (this._draftClaim?.draftId === capturedClaim?.draftId) {
        this._draftClaim = null;
        this._claimedScope = null;
      }
      this._coach.afterSave();
      return true;
    } catch (error) {
      if (!current()) return false;
      const failure = this._guardedSaveFailure(error);
      this._saveIssue = failure.issue;
      if (failure.deleted) this._groupDeleted = true;
      this._saveGuard.fail(generation, failure.message);
      this._checkpointDraft();
      return false;
    }
  }

  private async _reviewLatest(): Promise<void> {
    this._writeReview = { kind: 'required' };
    if (!this._hass || !this._entityId || !this._isAdmin || this._savedRead || this._runtimeBlocked)
      return;
    this._endLightGesture();
    const operation = this._beginSavedRead();
    this._loadGeneration++;
    this._load = { ...this._load, loading: false };
    const current = () => this._ownsSavedRead(operation) && this.isConnected && this._isAdmin;
    try {
      const read = await this._readLatestSaved(
        current,
        this._knownEntryId,
        UI.guardedSave.incompatibleRead
      );
      if (!read?.valid()) return;
      const { latest, curves, writeReview } = read;
      if (
        this._saveIssue === 'uncertain' &&
        this._submittedIntent &&
        savedEntitiesEqual(latest.entities, this._submittedIntent) &&
        savedEntitiesEqual(
          intendedEntities(
            this._rawBaseline!,
            curvesToWsPayload(editedCurves(this._originalCurves, this._curves))
          ),
          this._submittedIntent
        )
      ) {
        this._installRecovery(latest, curves, curves);
        this._saveState = {
          phase: 'error',
          message: UI.guardedSave.present,
        };
        return;
      }
      this._saveReview = {
        writeReview,
        latest,
        curves,
        members: compareSavedShapes(this._originalCurves, this._curves, curves),
      };
    } catch (error) {
      if (!current()) return;
      if ((error as { code?: string })?.code === 'not_found') {
        this._groupDeleted = true;
        this._saveIssue = 'not_found';
      }
      this._saveState = {
        phase: 'error',
        message: error instanceof LocalNotice ? error.message : UI.guardedSave.readFailed,
      };
    } finally {
      this._finishSavedRead(operation);
    }
  }

  private _installRecovery(
    latest: SavedSnapshot,
    saved: LightCurve[],
    accepted: LightCurve[]
  ): void {
    const visibility = new Map(this._curves.map((curve) => [curve.entityId, curve.visible]));
    this._stopCurveAnimation();
    this._stopDrawIn();
    this._stopDrawOut();
    this._stopRipple();
    const display = (curves: LightCurve[]) =>
      curves.map((curve) => ({ ...curve, visible: visibility.get(curve.entityId) ?? true }));
    this._baseline = latest;
    this._knownEntryId = latest.config_entry_id;
    this._subscribeDraft();
    this._rawBaseline = latest.entities;
    this._membershipBaseline = null;
    this._originalCurves = display(cloneCurves(saved));
    this._curves = display(cloneCurves(accepted));
    this._undoStack = curvesEqual(saved, accepted) ? [] : [cloneCurves(this._originalCurves)];
    this._dirtyVersion++;
    this._cleanVersion = curvesEqual(saved, accepted) ? this._dirtyVersion : this._dirtyVersion - 1;
    if (!this._curves.some((curve) => curve.entityId === this._selectedCurveId))
      this._selectedCurveId = null;
    this._saveIssue = null;
    this._submittedIntent = null;
    this._loadGeneration++;
    this._load = {
      ...this._load,
      loaded: true,
      loading: false,
      loadedEntityId: this._entityId,
      pendingReloadEntityId: undefined,
      reloadAfterLoadEntityId: undefined,
      loadError: null,
    };
    this._dispatchSave({ type: 'reset' });
  }

  private _dismissSaveReview(): void {
    const retained = this._retainedReview;
    this._retainedReview = null;
    this._saveReview = null;
    if (retained && !retained.localCopy) editorDrafts.release(retained.scope, retained.claim);
  }

  private _acceptSaveReview(event: CustomEvent<{ keep: Set<string> }>): void {
    const review = this._saveReview;
    if (!review || !this._isAdmin || this._draftAuthStale || this._runtimeBlocked) {
      if (this._runtimeBlocked) this._dismissSaveReview();
      return;
    }
    const reviewedWrite = review.writeReview;
    if (!this._writeReviewCurrent(reviewedWrite)) {
      this._dismissSaveReview();
      this._draftNotice = UI.drafts.savedChanged;
      return;
    }
    const retained = this._retainedReview;
    if (retained && JSON.stringify(this._draftScope()) !== JSON.stringify(retained.scope)) {
      this._dismissSaveReview();
      this._draftNotice = UI.drafts.changed;
      return;
    }
    if (retained && !retained.localCopy && !editorDrafts.owns(retained.scope, retained.claim)) {
      this._dismissSaveReview();
      this._draftNotice = UI.drafts.changed;
      return;
    }
    if (retained) {
      this._draftClaim = retained.localCopy ? null : retained.claim;
      this._claimedScope = retained.localCopy ? null : retained.scope;
      this._retainedReview = null;
      this._resumeTicket = null;
      this._draftLost = false;
      if (retained.localCopy) this._draftOwner = crypto.randomUUID();
    }
    this._writeReview = reviewedWrite
      ? { kind: 'accepted', stamp: reviewedWrite }
      : { kind: 'required' };
    this._resumeUnverified = false;
    this._resumePayload = null;
    this._installRecovery(
      review.latest,
      review.curves,
      adoptSavedShapes(review.curves, review.members, event.detail.keep)
    );
    this._dismissSaveReview();
    this._checkpointDraft();
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
    this._endLightGesture();
    this._dismissInvitation();
    if (this._cancelAnimating) return;
    const verifyDiscard = this._draftLost || this._resumeUnverified;
    this.discardNavigationDraft();
    if (verifyDiscard) {
      this._resumeUnverified = true;
      this._verifyAfterDiscard = true;
    }
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
      this._suppressDraftCapture = false;
      if (verifyDiscard && this._entityId) this._reloadCurvesAfterCurrentLoad(this._entityId);
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

  private _renderGraphWorkbenchInsight() {
    if (this.experimentalFirstUse) {
      const name = this._selectedCurve?.friendlyName;
      if (this._invitation.curve || this._invitationEditHint) {
        return html`<div class="graph-insight invitation-insight">
          <span class="graph-insight-primary" title=${name ?? ''}>${name}</span>
          <span class="graph-insight-secondary"
            >${this._invitation.curve ? UI.invitation.example : this._invitationEditHint}</span
          >
        </div>`;
      }
    } else if (this.canvasHelp && (this._invitation.curve || this._invitationEditHint)) {
      // Guidance holds the context line, so this line names the light; then the next step.
      const line = this._invitation.curve
        ? this._selectedCurve?.friendlyName
        : this._invitationEditHint;
      return html`<div class="graph-insight invitation-insight">
        <span class="graph-insight-primary" title=${line ?? ''}>${line}</span>
      </div>`;
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
      return html`<div class="graph-workbench ${this._selectedCurve ? 'has-selection' : ''}">
        ${this._isAdmin && this._coach.phase !== 'inactive'
          ? this._renderGraphWorkbenchInsight()
          : this._renderGraphInsight()}
        <div class="shape-chip-reserve" aria-hidden="true"></div>
      </div>`;
    }

    return html`<div class="graph-workbench has-selection">
      ${this._renderGraphWorkbenchInsight()}${chips}
    </div>`;
  }

  /** Names the light being shaped; "All lights" returns to the whole room. */
  private _renderContextLine() {
    if (this.canvasHelp && this._invitation.curve) {
      // Show me how takes the same reserved line, so the graph does not move.
      return html`<div class="context-line canvas-guidance" tabindex="-1">
        <span class="canvas-guidance-text">${UI.canvasHelp.guidance}</span>
        <button
          type="button"
          class="canvas-guidance-action canvas-replay invitation-dismiss"
          @click=${() => this._toggleCanvasHelp(true)}
        >
          ${UI.canvasHelp.replay}
        </button>
        <button
          type="button"
          class="canvas-guidance-action canvas-done invitation-dismiss"
          @click=${() => this._closeCanvasHelp()}
        >
          ${UI.canvasHelp.done}
        </button>
      </div>`;
    }
    if (this.canvasHelp && this._canvasHelpNotice) {
      return html`<div class="context-line canvas-guidance" tabindex="-1">
        <span class="canvas-guidance-text canvas-notice">${this._canvasHelpNotice}</span>
      </div>`;
    }
    const selected = this._selectedCurve;
    return html`<div class="context-line" tabindex="-1">
      ${selected
        ? html`<span class="context-name" title=${selected.friendlyName}
              >${selected.friendlyName}</span
            >
            <button
              type="button"
              class="context-clear"
              aria-label=${UI.context.clearAria}
              @click=${this._clearSelection}
            >
              ${UI.context.allLights}
            </button>`
        : html`<span class="context-name all">${UI.context.allLights}</span>`}
    </div>`;
  }

  private _renderHeaderHelp() {
    if (this.canvasHelp) {
      // Always available: when the editor cannot show the example, the guidance line says why.
      return this._isAdmin && this._curves.length > 0 && !this._load.loading
        ? html`<button
            type="button"
            class="canvas-help invitation-dismiss"
            aria-expanded=${!!this._invitation.curve}
            @click=${() => this._toggleCanvasHelp()}
          >
            ${this._invitation.curve ? UI.canvasHelp.close : UI.canvasHelp.open}
          </button>`
        : nothing;
    }
    return html`${this.experimentalFirstUse && this._isAdmin
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
            @click=${() => this._toggleCoach()}
          >
            ?
          </button>`
        : nothing}`;
  }

  /** Help sits beside the title, in the panel toolbar or the card header. */
  private _renderHelp() {
    return html`<div class="editor-help" tabindex="-1">${this._renderHeaderHelp()}</div>`;
  }

  /** The action row under Room brightness: Watch, save status, Undo, Cancel and Save. */
  private _renderCommands() {
    const blocked = !this._canEditCurves;
    const notice =
      (this._runtimeBlocked ? UI.guardedSave.runtime : this._saveError) ??
      (this._saveIssue === 'conflict'
        ? UI.guardedSave.conflict
        : this._saveIssue === 'uncertain'
          ? UI.guardedSave.uncertain
          : null);
    return html`<div
      class="editor-commands"
      tabindex="-1"
      role="group"
      aria-label="Brightness editor actions"
    >
      <span title=${UI.scrubber.watchGuidance}
        >${renderPreviewToggle(
          this._previewActive,
          (blocked || this._previewController.blocked) && !this._previewActive,
          () => this._onPreviewToggle()
        )}</span
      >
      <div class="command-status">
        ${this._previewController.otherWatching
          ? html`<span role="status">${UI.restoration.otherWatching}</span>`
          : nothing}
        ${this._previewController.mutationBlocked
          ? html`<span role="status">${UI.restoration.operationBlocked}</span>`
          : nothing}
        ${this._previewController.admissionIssue
          ? html`<span role="status">${this._previewController.admissionIssue}</span>`
          : nothing}
        ${this._previewController.reviewSessions.some((session) => session.lights.size > 0) &&
        !this._previewActive
          ? html`<span role="status"
              >${this._previewController.sessions.some((session) => session.phase === 'stopping')
                ? UI.restoration.waiting
                : this._previewController.blocked
                  ? UI.restoration.title
                  : [...(this._previewController.sessions.at(-1)?.lights.values() ?? [])].every(
                        (light) => light.outcome === 'restore-acknowledged'
                      )
                    ? UI.restoration.acknowledged
                    : UI.restoration.reviewed}
              <button type="button" class="command-retry" @click=${() => this._openRestoration()}>
                ${UI.restoration.review}
              </button></span
            >`
          : nothing}
        ${notice
          ? html`<span role="alert"
              >${notice}
              <button
                type="button"
                class="command-retry"
                ?disabled=${this._savedRead ||
                this._runtimeBlocked ||
                this._saveIssue === 'refresh' ||
                this._saveIssue === 'not_found'}
                @click=${() => (this._saveIssue ? this._reviewLatest() : this._onSave())}
              >
                ${this._saveIssue === 'conflict'
                  ? UI.guardedSave.review
                  : this._saveIssue
                    ? UI.guardedSave.check
                    : UI.footer.retry}
              </button></span
            >`
          : html`<span role="status" aria-live="polite"
              >${this._saveSuccess
                ? UI.footer.saved
                : this._saveIssue === 'readonly'
                  ? UI.guardedSave.readOnly
                  : this._saveIssue === 'incompatible'
                    ? UI.guardedSave.incompatible
                    : this._membershipBaseline
                      ? UI.guardedSave.checking
                      : ''}</span
            >`}
      </div>
      ${this._renderNavigationDrafts()}
      <curve-footer
        .persistent=${true}
        .dirty=${this._isDirty || this._cancelAnimating || !!this._saveError}
        .readOnly=${!this._isAdmin}
        .saving=${this._saving || this._membershipLocked}
        .animating=${this._cancelAnimating}
        .saveDisabled=${!this._canGuardedSave}
        .canUndo=${this._undoStack.length > 0 && this._canUndoCurves}
        @save-curves=${() => this._onSave()}
        @cancel-curves=${() => this._onCancel()}
        @undo-curves=${() => this._undo()}
      ></curve-footer>
    </div>`;
  }

  render() {
    const graphCurves = this._graphCurves;
    // Work in progress keeps the action row reachable (see _syncFooterOverlay).
    const footerActive =
      this._isAdmin &&
      (this._membershipLocked ||
        this._isDirty ||
        this._saving ||
        this._cancelAnimating ||
        this._undoStack.length > 0 ||
        this._previewActive ||
        this._saveSuccess ||
        !!this._saveError);
    return html`
      <div
        class="card ${this._embedded ? 'embedded' : ''} ${this.experimentalFirstUse
          ? 'first-use-experiment'
          : ''}"
        role="region"
        tabindex="-1"
        aria-label="Brightness editor"
      >
        <span class="sr-only invitation-announcement" role="status" aria-atomic="true"
          >${this._invitation.curve
            ? UI.invitation.announcement(this._invitation.curve.friendlyName)
            : (this._canvasHelpNotice ?? '')}</span
        >
        ${this._hostedToolbar
          ? nothing
          : html`<div class="header">
              <h2>${(this._config.title as string) ?? 'Brightness shapes'}</h2>
              ${this._renderHelp()}
            </div>`}

        <div class="workspace">
          <div class="editor-column">
            <div class="main-stack">
              ${this._renderContextLine()}
              ${this._load.loading
                ? this._renderLoadingSkeleton()
                : html`<div class="graph-panel">
                    ${this._renderGraphWorkbench()}
                    <curve-graph
                      .curves=${graphCurves}
                      .selectedCurveId=${this._selectedCurveId}
                      .hoveredCurveId=${this._hoveredCurveId}
                      .entityId=${this._entityId ?? null}
                      .readOnly=${!this._canEditCurves}
                      .showXAxisLabel=${false}
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
                      .drawOut=${this._drawOut}
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
            </div>
            <div class="control-slot">
              <div class="control-dock" ?data-narrow=${this._narrowLayout}>
                <div class="room-surface">
                  ${this._curves.length > 0 && !this._load.loading
                    ? html`<curve-scrubber
                        .curves=${graphCurves}
                        .showLabel=${true}
                        .alignToAxis=${!this._narrowLayout}
                        .contextKey=${`${this._entityId}:${this._narrowLayout}`}
                        .example=${!!this._invitation.curve}
                        .firstUseHints=${this.experimentalFirstUse}
                        .invitation=${this._invitationTogether}
                        .readOnly=${!this._canEditCurves}
                        .showPreviewToggle=${false}
                        .canPreview=${this._canEditCurves || this._previewActive}
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
                <div class="footer-slot ${footerActive ? 'active' : ''}">
                  ${this._renderCommands()}
                </div>
              </div>
            </div>
          </div>

          <aside class="side-rail" aria-label=${UI.card.railAria}>
            <curve-legend
              .curves=${graphCurves}
              .exampleEntityId=${this._invitation.curve?.entityId ?? null}
              .selectedCurveId=${this._selectedCurveId}
              .hoveredCurveId=${this._hoveredCurveId}
              .scrubberPosition=${this._effectiveScrubberPosition}
              .readOnly=${!this._canEditCurves || this._load.loading}
              .editingCurves=${this._curves}
              .contextKey=${`${this._entityId}:${this._narrowLayout}:${this._load.loadedEntityId}`}
              @focus-curve=${this._onFocusCurve}
              @hover-curve=${this._onHoverCurve}
              @light-level-start=${this._onLightLevelStart}
              @light-level-input=${this._onLightLevelInput}
              @light-level-end=${this._onLightLevelEnd}
              .showManage=${this._isAdmin && !this._groupDeleted}
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

        ${this._saveReview
          ? html`<save-conflict-review
              .review=${this._saveReview}
              @review-dismiss=${() => this._dismissSaveReview()}
              @review-accept=${this._acceptSaveReview}
            ></save-conflict-review>`
          : nothing}
        ${this._restorationOpen
          ? html`<preview-restoration-dialog
              .rows=${this._previewController.reviewSessions.flatMap((session) =>
                [...session.lights.values()].map((light) => ({
                  ...light,
                  current: lightValue(this._hass, light.entityId),
                  eligible:
                    !light.pending &&
                    !light.disposition &&
                    this._curves.some((curve) => curve.entityId === light.entityId) &&
                    lightValue(this._hass, light.entityId) !== null,
                }))
              )}
              .actionable=${previewUsable(this._hass) &&
              this._isAdmin &&
              !this._runtimeBlocked &&
              !this._authInvalidated}
              .token=${this._previewController.reviewToken()}
              @restoration-close=${() => this._closeRestoration()}
              @restoration-keep=${(event: CustomEvent) => this._reviewRestoration(event, false)}
              @restoration-restore=${(event: CustomEvent) => this._reviewRestoration(event, true)}
            ></preview-restoration-dialog>`
          : nothing}
        ${this._membershipOpen && this._hass && this._entityId
          ? html`<light-membership-dialog
              .hass=${this._hass}
              .groupEntityId=${this._entityId}
              .beginApply=${(ids: readonly string[]) => this._previewController.beginMutation(ids)}
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
