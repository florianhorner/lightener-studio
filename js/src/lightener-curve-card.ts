import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { LightCurve, Hass } from './utils/types.js';
import {
  CARD_CONFIG_TYPE,
  CARD_TYPE,
  type CustomCardsHost,
  getLightenerEntitySuggestion,
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
  toggleCurveVisibility,
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
import { CURVE_PRESETS, shouldAutoOpenPresets, type PresetDef } from './utils/presets.js';
import { renderEntityPickerField } from './components/entity-picker-field.js';
import { renderPresetThumbnail } from './components/preset-thumbnail.js';
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

const CARD_VERSION = '2.16.0';
const CANCEL_ANIM_DURATION_MS = 300;

if (typeof window !== 'undefined') {
  (
    window as typeof window & { __LIGHTENER_CURVE_CARD_VERSION__?: string }
  ).__LIGHTENER_CURVE_CARD_VERSION__ = CARD_VERSION;
  // HA 2026.6 card-picker metadata + entity suggestion. First-wins: a second
  // bundle execution (extra-module URL + leftover manual resource) leaves the
  // live entry untouched.
  registerCardMetadata(window as typeof window & CustomCardsHost, {
    type: CARD_TYPE,
    name: 'Lightener Studio',
    description: 'Tune per-light brightness curves for a Lightener group.',
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

  private _onEntityChange(e: CustomEvent): void {
    const value = e.detail?.value ?? '';
    this._config = { ...this._config, entity: value || undefined };
    this._fireConfigChanged();
  }

  private _onTitleChange(e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    this._config = { ...this._config, title: value || undefined };
    this._fireConfigChanged();
  }

  private _onFallbackEntityInput(e: Event): void {
    const value = (e.target as HTMLInputElement).value.trim();
    this._config = { ...this._config, entity: value || undefined };
    this._fireConfigChanged();
  }

  render() {
    const currentEntity = (this._config.entity as string) ?? '';
    const currentTitle = (this._config.title as string) ?? '';

    return html`
      <div class="form">
        <div class="field">
          <label>Entity</label>
          ${renderEntityPickerField({
            ready: this._picker.ready,
            hass: this._hass,
            value: currentEntity,
            includeDomains: LIGHT_DOMAINS,
            placeholder: 'light.your_lightener_group',
            // Editor commits on blur/Enter, not per keystroke, so typing a
            // partial entity id doesn't rewrite the Lovelace config repeatedly.
            fallbackEvent: 'change',
            onValueChanged: this._onEntityChange,
            onFallbackInput: this._onFallbackEntityInput,
          })}
          ${this._picker.ready
            ? html`<span class="hint"
                >Select a Lightener group to edit its brightness curves.</span
              >`
            : html`<span class="hint">
                Entity picker unavailable — enter a Lightener group entity ID manually (must start
                with <code>light.</code>).
              </span>`}
        </div>
        <div class="field">
          <label>Title (optional)</label>
          <input
            type="text"
            .value=${currentTitle}
            placeholder="Brightness Curves"
            @input=${this._onTitleChange}
          />
        </div>
      </div>
    `;
  }
}

safeDefine('lightener-curve-card-editor', LightenerCurveCardEditor);

export class LightenerCurveCard extends LitElement {
  @state() private _curves: LightCurve[] = [];
  @state() private _originalCurves: LightCurve[] = [];
  @state() private _config: Record<string, unknown> = {};
  @state() private _selectedCurveId: string | null = null;
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

  @state() private _hass: Hass | null = null;
  private _undoStack: LightCurve[][] = [];
  private _dragUndoPushed = false;
  private _dragActive = false;
  // entity_ids we have already auto-opened the preset chooser for. Once a
  // user has seen the auto-open for a given group, we never auto-open it
  // again on the same card instance — even after they switch away to
  // another group and come back. Per-card, not persisted.
  private _autoPresetsShownFor: Set<string> = new Set();
  private _boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _boundBeforeUnload: ((e: BeforeUnloadEvent) => void) | null = null;
  // Owns the post-save confirmation fence (8s confirm timer, 2s success timer,
  // save generation, awaiter resolver). The confirm/-error signal fires from the
  // load path, fenced by the guard's generation. See save-confirm-guard.ts.
  private _saveGuard = new SaveConfirmGuard({
    dispatchSave: (action) => this._dispatchSave(action),
    getSavePhase: () => this._saveState.phase,
  });
  private _cancelAnimFrame: number | null = null;
  @state() private _previewActive = false;
  @state() private _showPresets = false;
  @state() private _legendCloseRemoveSignal = 0;
  @state() private _legendCloseAddSignal = 0;
  @state() private _manageMode = false;
  private _previewController = new PreviewController({
    getHass: () => this._hass,
    getCurves: () => this._curves,
    getScrubberPosition: () => this._scrubberPosition,
    setScrubberPosition: (position) => {
      this._scrubberPosition = position;
    },
    getStorageEntityId: () => this._load.loadedEntityId ?? this._entityId,
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
    :host {
      --card-bg: var(--ha-card-background, var(--card-background-color, #fff));
      --text-color: var(--primary-text-color, #212121);
      --secondary-text: var(--secondary-text-color, #616161);
      --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
      --accent: var(--primary-color, #2563eb);
      --graph-bg: var(--card-background-color, var(--ha-card-background, #fafafa));
      --panel-bg: color-mix(in srgb, var(--card-bg) 95%, var(--secondary-text, #616161) 5%);
      --text-xs: 9px;
      --text-sm: 12px;
      --text-md: 13px;
      --text-lg: 14px;

      display: block;
      font-family: var(
        --mdc-typography-body1-font-family,
        var(--paper-font-body1_-_font-family, 'Roboto', sans-serif)
      );
      height: fit-content;
    }
    .card {
      background: var(--card-bg);
      border-radius: var(--ha-card-border-radius, 16px);
      box-shadow: var(
        --ha-card-box-shadow,
        0 1px 3px rgba(0, 0, 0, 0.08),
        0 8px 24px rgba(0, 0, 0, 0.06)
      );
      padding: 20px;
      color: var(--text-color);
    }
    .card.embedded {
      box-shadow: none;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    h2 {
      margin: 0;
      font-size: var(--text-lg);
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .workspace {
      display: grid;
      gap: 12px;
    }
    .main-stack,
    .side-rail,
    .footer-slot,
    .status-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }
    .graph-panel {
      border-radius: 12px;
      padding: 12px;
      background: var(--panel-bg);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }
    .card.embedded .header {
      margin-bottom: 12px;
      padding-inline: 2px;
    }
    .card.embedded .graph-panel {
      padding: 14px;
    }
    .card.embedded h2 {
      font-size: 0.95rem;
      letter-spacing: 0.01em;
      color: var(--secondary-text);
    }
    .error {
      font-size: var(--text-sm);
      color: var(--error-color, #db4437);
      padding: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .error .retry-link {
      cursor: pointer;
      text-decoration: underline;
      opacity: 0.8;
      background: none;
      border: none;
      font: inherit;
      color: inherit;
      padding: 0;
    }
    .error .retry-link:hover {
      opacity: 1;
    }
    .success {
      font-size: var(--text-sm);
      color: var(--accent);
      padding: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      animation: success-fade 2s ease forwards;
    }
    @keyframes success-fade {
      0% {
        opacity: 0;
      }
      10% {
        opacity: 1;
      }
      70% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
    .status-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
    .loading-indicator {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 280px;
      gap: 16px;
      padding: 28px 20px;
      border-radius: 12px;
      background: var(--panel-bg);
    }
    .loading-graph {
      position: relative;
      min-height: 240px;
      border-radius: 10px;
      overflow: hidden;
      background:
        linear-gradient(
          90deg,
          transparent,
          var(--divider-color, rgba(127, 127, 127, 0.15)),
          transparent
        ),
        linear-gradient(rgba(128, 128, 128, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(128, 128, 128, 0.08) 1px, transparent 1px);
      background-size:
        200px 100%,
        100% 25%,
        25% 100%;
      background-position:
        -200px 0,
        0 0,
        0 0;
      animation: shimmer 1.8s ease-in-out infinite;
    }
    .loading-graph::before,
    .loading-graph::after {
      content: '';
      position: absolute;
    }
    .loading-graph::before {
      inset: 18px 18px 18px 28px;
      border-left: 1px solid rgba(128, 128, 128, 0.18);
      border-bottom: 1px solid rgba(128, 128, 128, 0.18);
      border-radius: 0 0 0 6px;
    }
    .loading-graph::after {
      inset: auto 40px 52px 44px;
      height: 90px;
      border-radius: 999px;
      background: linear-gradient(
        120deg,
        color-mix(in srgb, var(--accent) 8%, transparent) 0%,
        color-mix(in srgb, var(--accent) 30%, transparent) 45%,
        color-mix(in srgb, var(--accent) 8%, transparent) 100%
      );
      clip-path: polygon(0% 78%, 18% 78%, 38% 45%, 62% 18%, 82% 22%, 100% 0, 100% 100%, 0 100%);
    }
    .loading-caption {
      font-size: var(--text-sm);
      color: var(--secondary-text);
    }
    @keyframes fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    @keyframes shimmer {
      0% {
        background-position:
          -200px 0,
          0 0,
          0 0;
      }
      100% {
        background-position:
          calc(100% + 200px) 0,
          0 0,
          0 0;
      }
    }
    @media (min-width: 1100px) {
      .card.embedded .workspace {
        grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.95fr);
        align-items: start;
        grid-template-areas:
          'main side'
          'main footer';
      }
      .card.embedded .main-stack {
        grid-area: main;
      }
      .card.embedded .side-rail {
        grid-area: side;
      }
      .card.embedded .footer-slot {
        grid-area: footer;
      }
    }
    @media (max-width: 1099px) {
      .card.embedded .footer-slot {
        order: 2;
        position: sticky;
        bottom: max(0px, env(safe-area-inset-bottom));
        z-index: 3;
        padding-top: 8px;
        border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
        background: color-mix(in srgb, var(--card-bg) 72%, transparent);
        backdrop-filter: blur(14px);
      }
      .card.embedded .side-rail {
        order: 3;
      }
    }
    .presets-btn {
      margin-left: auto;
      padding: 4px 10px;
      min-height: 44px;
      font-size: 12px;
      font-weight: 500;
      background: transparent;
      border: 1px solid var(--divider);
      border-radius: 6px;
      color: var(--secondary-text);
      cursor: pointer;
      font-family: inherit;
      transition:
        border-color 0.15s ease,
        color 0.15s ease,
        background 0.15s ease;
      flex-shrink: 0;
    }
    .presets-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 4%, transparent);
    }
    .presets-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .presets-btn.active {
      border-color: var(--accent);
      color: var(--accent);
    }
    .presets-panel {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding-bottom: 8px;
      animation: fade-in 0.15s ease;
    }
    .presets-header {
      grid-column: 1 / -1;
      font-size: 11px;
      color: var(--secondary-text);
      opacity: 0.7;
      padding-bottom: 2px;
    }
    .preset-option {
      border: 1px solid var(--divider);
      border-radius: 8px;
      padding: 10px;
      cursor: pointer;
      background: transparent;
      text-align: left;
      font-family: inherit;
      transition:
        border-color 0.15s ease,
        background 0.15s ease;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .preset-option:hover {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 4%, transparent);
    }
    .preset-option:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .preset-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-color);
    }
    .preset-desc {
      font-size: 10px;
      color: var(--secondary-text);
      opacity: 0.75;
      line-height: 1.35;
    }
    .preset-thumb {
      display: block;
      opacity: 0.65;
      margin-bottom: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      .loading-graph {
        animation: none;
      }
    }
  `;

  // --- HA card interface ---

  static getConfigElement(): HTMLElement {
    return document.createElement('lightener-curve-card-editor');
  }

  static getStubConfig(): Record<string, unknown> {
    return { type: CARD_CONFIG_TYPE };
  }

  setConfig(config: Record<string, unknown>): void {
    const entityChanged = config.entity !== this._config.entity;
    this._config = config;
    if (entityChanged) {
      if (this._previewActive) this._stopPreview();
      this._dragActive = false;
      this._load = clearForEntity(this._load);
      this._groupDeleted = false;
      this._showPresets = false;
      this._selectedCurveId = null;
      this._scrubberPosition = null;
      this._undoStack = [];
      // Abandon any unsaved edits so the dirty-reload guard in _tryLoadCurves()
      // does not block the incoming response for the new entity.
      this._cleanVersion = this._dirtyVersion;
      this._tryLoadCurves();
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

  private get _isDirty(): boolean {
    return this._dirtyVersion !== this._cleanVersion;
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
      !this._managingLights &&
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
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._previewActive) this._stopPreview();
    this._previewController.disconnect();
    this._dragActive = false;
    if (this._boundKeyHandler) {
      window.removeEventListener('keydown', this._boundKeyHandler);
    }
    if (this._boundBeforeUnload) {
      window.removeEventListener('beforeunload', this._boundBeforeUnload);
    }
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
  }

  protected updated(changedProps: Map<PropertyKey, unknown>): void {
    super.updated(changedProps);

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
  }

  private _togglePresets(): void {
    if (this._managingLights) return;
    if (this._curves.length === 0) return;
    const opening = !this._showPresets;
    this._showPresets = opening;
    if (opening) {
      // Keep the legend's add/remove surfaces mutually exclusive with the
      // presets panel — opening presets collapses both.
      this._legendCloseAddSignal++;
      this._legendCloseRemoveSignal++;
    }
  }

  private _onLegendRemovePanelOpen(): void {
    // A remove confirmation just opened in the legend — close the presets panel
    // so the two surfaces are never shown at once.
    this._showPresets = false;
  }

  private _applyPreset(preset: PresetDef): void {
    if (this._cancelAnimating || this._saving || this._managingLights) return;
    if (this._curves.length === 0) return;
    this._pushUndo();
    this._curves = applyPresetToCurves(this._curves, this._selectedCurveId, preset.controlPoints);
    this._dirtyVersion++;
    this._showPresets = false;
    this._refreshActivePreview(true);
  }

  private _renderPresetsPanel() {
    const targetLabel =
      this._selectedCurveId !== null
        ? `Applying to ${this._curves.find((c) => c.entityId === this._selectedCurveId)?.friendlyName ?? 'selected light'}`
        : `Applying to all lights`;

    return html`
      <div class="presets-panel">
        <div class="presets-header">${targetLabel}</div>
        ${CURVE_PRESETS.map(
          (preset) => html`
            <button class="preset-option" @click=${() => this._applyPreset(preset)}>
              ${renderPresetThumbnail(preset)}
              <div class="preset-name">${preset.name}</div>
              <div class="preset-desc">${preset.description}</div>
            </button>
          `
        )}
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
    // Only handle shortcuts when focus is inside this card (or nothing specific is focused)
    if (!shouldHandleKey(document.activeElement, this)) return;

    // Ctrl+S / Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      if (this._isDirty && this._isAdmin && !this._saving && !this._managingLights) {
        e.preventDefault();
        this._onSave();
      }
    }
    // Ctrl+Z / Cmd+Z to undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      if (
        !this._saving &&
        !this._cancelAnimating &&
        !this._managingLights &&
        this._undoStack.length > 0
      ) {
        e.preventDefault();
        this._undo();
      }
    }
    // Escape to close presets panel or cancel edits
    if (e.key === 'Escape') {
      if (this._showPresets) {
        e.preventDefault();
        this._showPresets = false;
      } else if (
        this._isDirty &&
        !this._saving &&
        !this._cancelAnimating &&
        !this._managingLights
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

          // Single hydration site: restore session state only if the user has
          // not already interacted while this async load was in flight.
          if (this._selectedCurveId === null && this._scrubberPosition === null) {
            const stored = this._readStoredState(requestedEntity);
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
            }
          }

          // Onboarding handoff: a freshly-created group lands here with linear
          // default curves. Auto-open the preset chooser so the user picks a
          // starting curve visually instead of being told "nothing here yet."
          // One-shot per entity for the card's lifetime — switching away and
          // back must not re-open after the user dismissed it.
          if (shouldAutoOpenPresets(this._autoPresetsShownFor, requestedEntity, curves)) {
            this._showPresets = true;
          }
          // The post-save re-fetch landed. The guard re-checks the live
          // generation + phase, dispatches save-confirmed, and arms the 2s
          // success-display timer that later dispatches save-clear.
          this._saveGuard.confirm(saveGenerationAtStart);
        }
        // Mark the entity as seen so the preset chooser is not auto-opened
        // later — applies to both apply and defer-dirty, mirroring the original.
        this._autoPresetsShownFor.add(requestedEntity);
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

  // Preview a single light at `position`, holding every other light. Used while
  // editing one curve so the edited light tracks the point under the user's
  // finger instead of only ever showing its value at the global scrubber.
  private _previewSingleLight(entityId: string, position: number, force = false): void {
    this._previewController.previewSingleLight(entityId, position, force);
  }

  private _onSelectCurve(e: CustomEvent): void {
    if (this._cancelAnimating) return;
    const { entityId } = e.detail;
    // Always allow deselect of the currently-selected curve, even if it has
    // since gone missing (race during reload). Otherwise require the curve
    // to exist and be visible.
    if (entityId !== this._selectedCurveId && !canSelectCurve(this._curves, entityId)) return;
    this._selectedCurveId = toggleSelection(this._selectedCurveId, entityId);
    const storageEntityId = this._load.loadedEntityId ?? this._entityId;
    if (storageEntityId) {
      this._writeStoredState(storageEntityId, { selectedCurveId: this._selectedCurveId });
    }
    this._refreshActivePreview(true);
  }

  private _onFocusCurve(e: CustomEvent): void {
    if (this._cancelAnimating) return;
    const { entityId } = e.detail;
    const curve = this._curves.find((item) => item.entityId === entityId);
    if (!curve || !curve.visible) return;
    this._selectedCurveId = entityId;
    const storageEntityId = this._load.loadedEntityId ?? this._entityId;
    if (storageEntityId) {
      this._writeStoredState(storageEntityId, { selectedCurveId: this._selectedCurveId });
    }
    this._refreshActivePreview(true);
  }

  private _pushUndo(): void {
    pushEditUndo(this._undoStack, this._curves);
  }

  private _undo(): void {
    if (this._undoStack.length === 0 || this._cancelAnimFrame !== null) return;
    this._animateCurvesTo(this._undoStack.pop()!);
  }

  /**
   * Animate curves from current state to endCurves over CANCEL_ANIM_DURATION_MS.
   * Shared by undo and cancel. onComplete runs after the final frame.
   */
  private _animateCurvesTo(endCurves: LightCurve[], onComplete?: () => void): void {
    const startCurves = cloneCurves(this._curves);
    this._cancelAnimating = true;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(elapsed / CANCEL_ANIM_DURATION_MS, 1);
      const t = easeOutCubic(rawT);

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
        }
        onComplete?.();
        if (landedClean) this._reloadPendingDirtyResponse();
      }
    };

    this._cancelAnimFrame = requestAnimationFrame(tick);
  }

  private _onPointMove(e: CustomEvent): void {
    if (this._cancelAnimating) return;
    const { curveIndex, pointIndex, lightener, target } = e.detail;
    const nextCurves = movePointOnCurves(this._curves, curveIndex, pointIndex, lightener, target);
    if (nextCurves === null) return;

    this._dragActive = true;
    this._showPresets = false;
    // Push undo once at start of each drag gesture
    if (!this._dragUndoPushed) {
      this._pushUndo();
      this._dragUndoPushed = true;
    }
    // Auto-select the curve being dragged so others dim
    const draggedCurve = this._curves[curveIndex];
    if (draggedCurve && this._selectedCurveId !== draggedCurve.entityId) {
      this._selectedCurveId = draggedCurve.entityId;
      const entityId = this._load.loadedEntityId ?? this._entityId;
      if (entityId) {
        this._writeStoredState(entityId, { selectedCurveId: this._selectedCurveId });
      }
    }
    this._curves = nextCurves;
    this._dirtyVersion++;
    // Live-edit: drive the edited light to the value at the point being dragged
    // (its x), so the bulb tracks the user's finger. Other lights hold. Falls
    // back to the all-lights refresh only if the dragged curve can't be resolved.
    if (draggedCurve) {
      this._previewSingleLight(draggedCurve.entityId, lightener);
    } else {
      this._refreshActivePreview();
    }
  }

  private _onPointDrop(_e: CustomEvent): void {
    this._dragUndoPushed = false;
    this._dragActive = false;
    if (!this._load.loaded && this._hass) {
      this._tryLoadCurves();
    }
  }

  private _onPointAdd(e: CustomEvent): void {
    if (this._cancelAnimating) return;
    const { lightener, target, entityId } = e.detail;
    const targetEntityId = entityId ?? this._selectedCurveId;
    if (!targetEntityId) return;

    const next = addPointEdit(this._curves, targetEntityId, lightener, target);
    if (next === null) return;

    this._pushUndo();
    this._curves = next;
    this._dirtyVersion++;
    // Discrete edit (not a drag): re-light all visible lights at the scrubber
    // position. Only point *movement* pushes a single light to its dragged
    // target; add/remove/presets stay scrubber-based.
    this._refreshActivePreview(true);
  }

  private _onPointRemove(e: CustomEvent): void {
    if (this._cancelAnimating) return;
    // Reset drag-undo flag in case removal came from long-press (which skips point-drop)
    this._dragUndoPushed = false;
    this._dragActive = false;
    if (!this._load.loaded && this._hass) {
      this._tryLoadCurves();
    }
    const { curveIndex, pointIndex } = e.detail;

    const next = removePointEdit(this._curves, curveIndex, pointIndex);
    if (next === null) return;

    this._pushUndo();
    this._curves = next;
    this._dirtyVersion++;
    this._refreshActivePreview(true);
  }

  private _onToggleCurve(e: CustomEvent): void {
    if (this._cancelAnimating) return;
    const { entityId } = e.detail;
    // Intentionally no _dirtyVersion++ — visibility is local UI state, not persisted to backend.
    this._curves = toggleCurveVisibility(this._curves, entityId);
    // If hiding the selected curve, clear selection
    if (this._selectedCurveId === entityId) {
      const curve = this._curves.find((c) => c.entityId === entityId);
      if (curve && !curve.visible) {
        this._selectedCurveId = null;
        const storageEntityId = this._load.loadedEntityId ?? this._entityId;
        if (storageEntityId) {
          this._writeStoredState(storageEntityId, { selectedCurveId: null });
        }
      }
    }
  }

  private _onManageToggle(e: CustomEvent): void {
    const detail = e.detail as { manageMode?: boolean } | null;
    const next =
      detail && typeof detail.manageMode === 'boolean' ? detail.manageMode : !this._manageMode;
    this._manageMode = next;
    if (!next) {
      this._legendCloseRemoveSignal++;
    }
  }

  private async _onDeleteGroup(): Promise<void> {
    if (!this._hass || !this._entityId || this._managingLights) return;
    if (this._previewActive) this._stopPreview();
    const entityId = this._entityId;
    this._manageError = null;
    this._managingLights = true;
    try {
      const reg = (await this._hass.callWS({
        type: 'config/entity_registry/get',
        entity_id: entityId,
      })) as { config_entry_id?: string | null; platform?: string } | null;
      if (reg?.platform !== 'lightener') {
        throw new Error('Entity is not a Lightener group — cannot delete from this card.');
      }
      const configEntryId = reg?.config_entry_id;
      if (!configEntryId) {
        throw new Error('Group is not backed by a config entry — cannot delete from the card.');
      }
      await this._hass.callApi('DELETE', `config/config_entries/entry/${configEntryId}`);
      // Reset manage mode locally before the handoff. The panel auto-selects
      // another group on this event — if _manageMode survives the switch, the
      // next group opens already showing remove/delete affordances.
      this._manageMode = false;
      this._legendCloseRemoveSignal++;
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

  private async _onRemoveLight(e: CustomEvent): Promise<void> {
    if (!this._hass || !this._entityId || this._managingLights) return;
    const { entityId } = e.detail as { entityId: string };
    if (!entityId) return;
    if (this._previewActive) this._stopPreview();
    this._manageError = null;
    this._managingLights = true;
    try {
      await this._hass.callWS({
        type: 'lightener/remove_light',
        entity_id: this._entityId,
        controlled_entity_id: entityId,
      });
      if (this._selectedCurveId === entityId) {
        this._selectedCurveId = null;
        const storageEntityId = this._load.loadedEntityId ?? this._entityId;
        if (storageEntityId) {
          this._writeStoredState(storageEntityId, { selectedCurveId: null });
        }
      }
      this._undoStack = [];
      this._load = clearLoadedFlag(this._load);
      await this._tryLoadCurves();
    } catch (err) {
      console.error('[Lightener] Failed to remove light:', err);
      this._manageError = this._formatManageError(err, 'Could not remove light.');
    } finally {
      this._managingLights = false;
    }
  }

  private async _onAddLight(e: CustomEvent): Promise<void> {
    if (!this._hass || !this._entityId || this._managingLights) return;
    const { entityId, preset } = e.detail as { entityId: string; preset?: string };
    if (!entityId) return;
    if (this._previewActive) this._stopPreview();
    this._manageError = null;
    this._managingLights = true;
    try {
      const payload: Record<string, unknown> = {
        type: 'lightener/add_light',
        entity_id: this._entityId,
        controlled_entity_id: entityId,
      };
      if (preset) payload.preset = preset;
      await this._hass.callWS(payload);
      this._undoStack = [];
      this._load = clearLoadedFlag(this._load);
      await this._tryLoadCurves();
      // Close the add form once the new light is in.
      this._legendCloseAddSignal++;
    } catch (err) {
      console.error('[Lightener] Failed to add light:', err);
      this._manageError = this._formatManageError(err, 'Could not add light.');
    } finally {
      this._managingLights = false;
    }
  }

  private _onLegendAddPanelOpen(): void {
    // The add-light form just opened in the legend — close the presets panel
    // so the two surfaces are never shown at once.
    this._showPresets = false;
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
    if (
      !this._hass ||
      !this._entityId ||
      this._saving ||
      this._cancelAnimating ||
      this._managingLights
    )
      return false;

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
      return (await confirmSettled) === 'confirmed';
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
    if (this._cancelAnimating) return;
    if (this._previewActive) this._stopPreview();
    this._showPresets = false;
    this._undoStack = [];
    this._animateCurvesTo(cloneCurves(this._originalCurves), () => {
      this._selectedCurveId = null;
      if (this._load.loadedEntityId) {
        this._writeStoredState(this._load.loadedEntityId, { selectedCurveId: null });
      }
      this._dispatchSave({ type: 'reset' });
    });
  }

  private _renderLoadingSkeleton() {
    return html`
      <div class="loading-indicator" role="status" aria-live="polite">
        <div class="loading-graph" aria-hidden="true"></div>
        <div class="loading-caption">Loading curves…</div>
      </div>
    `;
  }

  render() {
    return html`
      <div
        class="card ${this._embedded ? 'embedded' : ''}"
        role="region"
        aria-label="Brightness Curves Editor"
      >
        <div class="header">
          <h2>${(this._config.title as string) ?? 'Brightness Curves'}</h2>
          ${!this._load.loading && this._isAdmin && this._curves.length > 0
            ? html`<button
                class="presets-btn ${this._showPresets ? 'active' : ''}"
                @click=${this._togglePresets}
                ?disabled=${this._managingLights}
                aria-expanded=${this._showPresets}
              >
                Presets
              </button>`
            : nothing}
        </div>

        ${this._showPresets ? this._renderPresetsPanel() : nothing}

        <div class="workspace">
          <div class="main-stack">
            ${this._load.loading
              ? this._renderLoadingSkeleton()
              : html`<div class="graph-panel">
                  <curve-graph
                    .curves=${this._curves}
                    .selectedCurveId=${this._selectedCurveId}
                    .entityId=${this._entityId ?? null}
                    .readOnly=${!this._isAdmin || this._cancelAnimating || this._managingLights}
                    .scrubberPosition=${this._scrubberPosition}
                    @point-move=${this._onPointMove}
                    @point-drop=${this._onPointDrop}
                    @point-add=${this._onPointAdd}
                    @point-remove=${this._onPointRemove}
                    @focus-curve=${this._onFocusCurve}
                  ></curve-graph>
                </div>`}
            ${this._curves.length > 0
              ? html`<curve-scrubber
                  .curves=${this._curves}
                  .readOnly=${!this._isAdmin || this._managingLights}
                  .canPreview=${this._isAdmin && !this._cancelAnimating && !this._managingLights}
                  .previewActive=${this._previewActive}
                  .dirty=${this._isDirty}
                  .position=${this._scrubberPosition}
                  @scrubber-move=${this._onScrubberMove}
                  @scrubber-start=${this._onScrubberStart}
                  @scrubber-end=${this._onScrubberEnd}
                  @preview-toggle=${this._onPreviewToggle}
                ></curve-scrubber>`
              : nothing}
          </div>

          <div class="side-rail">
            <curve-legend
              .curves=${this._curves}
              .selectedCurveId=${this._selectedCurveId}
              .scrubberPosition=${this._scrubberPosition}
              .canManage=${this._canManageLights}
              .managing=${this._managingLights}
              .manageMode=${this._manageMode}
              .closeRemoveSignal=${this._legendCloseRemoveSignal}
              .closeAddSignal=${this._legendCloseAddSignal}
              .groupEntityId=${this._entityId}
              .hass=${this._hass}
              @select-curve=${this._onSelectCurve}
              @toggle-curve=${this._onToggleCurve}
              @remove-panel-open=${this._onLegendRemovePanelOpen}
              @add-panel-open=${this._onLegendAddPanelOpen}
              @remove-light=${this._onRemoveLight}
              @add-light=${this._onAddLight}
              @manage-toggle=${this._onManageToggle}
              @delete-group=${this._onDeleteGroup}
            ></curve-legend>
            ${this._manageError
              ? html`<div class="error" role="alert">${WARNING_ICON} ${this._manageError}</div>`
              : nothing}
          </div>

          <div class="footer-slot">
            <curve-footer
              .dirty=${this._isDirty || this._cancelAnimating}
              .readOnly=${!this._isAdmin || this._managingLights}
              .saving=${this._saving || this._cancelAnimating || this._managingLights}
              .canUndo=${this._undoStack.length > 0 &&
              !this._cancelAnimating &&
              !this._managingLights}
              .previewActive=${this._previewActive}
              @save-curves=${this._onSave}
              @cancel-curves=${this._onCancel}
              @undo-curves=${() => this._undo()}
            ></curve-footer>
          </div>
        </div>

        <div class="status-stack">
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
