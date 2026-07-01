import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { LightCurve, Hass } from './utils/types.js';
import {
  CARD_CONFIG_TYPE,
  CARD_TYPE,
  type CustomCardsHost,
  getLightenerEntitySuggestion,
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
import { easeOutCubic, CURVE_COLORS, VB_W, VB_H } from './utils/graph-math.js';
import { PreviewController } from './utils/preview-controller.js';
import { CURVE_PRESETS, type PresetDef } from './utils/presets.js';
import { summarizeCurveShapes } from './utils/curve-summary.js';
import { UI } from './utils/strings.js';
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
  @state() private _presetGraphTrial: PresetDef | null = null;
  @state() private _legendCloseRemoveSignal = 0;
  @state() private _legendCloseAddSignal = 0;
  @state() private _manageMode = false;
  private _lastPresetPointerType: string | null = null;
  private _previewController = new PreviewController({
    getHass: () => this._hass,
    getCurves: () => this._curves,
    getScrubberPosition: () => this._scrubberPosition,
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
      /* Layout keys on the card's own width, not the viewport, so the
         Lovelace card and the sidebar panel behave identically at the same
         size (the viewport-keyed embedded-only rules made them diverge). */
      container-type: inline-size;
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
    .main-stack {
      /* Cap the graph + scrubber stack at the graph's maximum rendered width
         (height cap x viewBox aspect ratio + panel padding) and center it as
         one unit. Past this width the SVG letterboxes inside a wider element
         while the scrubber keeps stretching, so slider positions stop
         corresponding to graph positions (DESIGN.md: track aligns with graph
         padding). */
      width: 100%;
      max-width: calc(var(--curve-graph-max-height, 320px) * ${VB_W / VB_H} + 28px);
      margin-inline: auto;
    }
    .side-rail {
      gap: 10px;
    }
    .graph-panel {
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-radius: 12px;
      padding: 14px;
      background: var(--panel-bg);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }
    .graph-insight {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      min-width: 0;
      color: var(--text-color);
      /* Reserve the band's height so summary/trial text swaps never move the
         graph below it (DESIGN.md: opening a shape must not push the graph). */
      min-height: 15px;
    }
    .graph-insight-primary {
      flex: 0 0 auto;
      max-width: 48%;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 650;
      line-height: 1.25;
    }
    .graph-insight-secondary {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--secondary-text);
      font-size: 11px;
      line-height: 1.25;
      text-align: right;
    }
    /* The trial state must keep the resting state's one-line budget; letting
       it wrap grows the band and shoves the graph down on every hover. */
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
      min-height: 282px;
      gap: 10px;
      padding: 14px;
      border-radius: 12px;
      background: var(--panel-bg);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .loading-graph {
      position: relative;
      min-height: 242px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--divider) 72%, transparent);
      background:
        linear-gradient(
          90deg,
          transparent,
          color-mix(in srgb, var(--text-color) 8%, transparent),
          transparent
        ),
        linear-gradient(
          color-mix(in srgb, var(--secondary-text) 11%, transparent) 1px,
          transparent 1px
        ),
        linear-gradient(
          90deg,
          color-mix(in srgb, var(--secondary-text) 11%, transparent) 1px,
          transparent 1px
        ),
        var(--graph-bg);
      background-size:
        180px 100%,
        100% 25%,
        25% 100%,
        auto;
      background-position:
        -180px 0,
        0 0,
        0 0,
        0 0;
      animation: shimmer 1.8s ease-in-out infinite;
    }
    .loading-graph::before {
      content: '';
      position: absolute;
      inset: 18px 18px 18px 28px;
      border-left: 1px solid color-mix(in srgb, var(--secondary-text) 24%, transparent);
      border-bottom: 1px solid color-mix(in srgb, var(--secondary-text) 24%, transparent);
      border-radius: 0 0 0 6px;
    }
    .loading-curve {
      position: absolute;
      left: 44px;
      right: 34px;
      height: 64px;
      border-radius: 999px;
      opacity: 0.48;
      transform-origin: bottom;
      clip-path: polygon(0% 78%, 18% 76%, 38% 48%, 60% 22%, 80% 28%, 100% 8%, 100% 100%, 0 100%);
      animation: loading-curve-rise 1.8s ease-in-out infinite;
    }
    .loading-curve.primary {
      bottom: 52px;
      background: linear-gradient(
        120deg,
        color-mix(in srgb, var(--accent) 10%, transparent),
        color-mix(in srgb, var(--accent) 42%, transparent) 45%,
        color-mix(in srgb, var(--accent) 14%, transparent)
      );
    }
    .loading-curve.warm {
      bottom: 36px;
      background: linear-gradient(
        120deg,
        color-mix(in srgb, #d97706 8%, transparent),
        color-mix(in srgb, #d97706 26%, transparent) 48%,
        color-mix(in srgb, #d97706 10%, transparent)
      );
      opacity: 0.36;
      transform: scaleY(0.74);
      animation-delay: 0.16s;
    }
    .loading-curve.cool {
      bottom: 78px;
      background: linear-gradient(
        120deg,
        color-mix(in srgb, #0f766e 8%, transparent),
        color-mix(in srgb, #0f766e 24%, transparent) 48%,
        color-mix(in srgb, #0f766e 10%, transparent)
      );
      opacity: 0.32;
      transform: scaleY(0.56);
      animation-delay: 0.28s;
    }
    .loading-point {
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--accent) 64%, var(--graph-bg));
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 10%, transparent);
      opacity: 0.62;
      animation: loading-point-pulse 1.8s ease-in-out infinite;
    }
    .loading-point.one {
      left: 32%;
      bottom: 116px;
    }
    .loading-point.two {
      left: 58%;
      bottom: 148px;
      animation-delay: 0.14s;
    }
    .loading-point.three {
      left: 80%;
      bottom: 142px;
      animation-delay: 0.28s;
    }
    .loading-caption {
      font-size: var(--text-sm);
      color: var(--secondary-text);
      padding-inline: 2px;
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
          -180px 0,
          0 0,
          0 0,
          0 0;
      }
      100% {
        background-position:
          calc(100% + 180px) 0,
          0 0,
          0 0,
          0 0;
      }
    }
    @keyframes loading-curve-rise {
      0%,
      100% {
        opacity: 0.34;
      }
      50% {
        opacity: 0.58;
      }
    }
    @keyframes loading-point-pulse {
      0%,
      100% {
        opacity: 0.38;
        transform: scale(0.92);
      }
      50% {
        opacity: 0.72;
        transform: scale(1);
      }
    }
    /* Wide card: two columns, footer pinned in view at the bottom of the
       side column. Narrow card: stacked flow with a sticky footer directly
       under the graph so save/undo/cancel never sink below a long light
       list. Both are container queries on the card's own width — the
       Lovelace card and the sidebar panel get the same layout at the same
       size. Browsers without container-query support fall back to the
       stacked flow without stickiness. */
    @container (min-width: 860px) {
      .workspace {
        grid-template-columns: minmax(0, 1.95fr) minmax(280px, 0.8fr);
        align-items: start;
        /* Footer lives under the graph column, not under the side rail: a
           long light list would push a side-column footer below the fold,
           where bottom-sticky cannot reach (sticky never escapes its own
           grid area). Actions stay physically close to the graph. */
        grid-template-areas:
          'main side'
          'footer side';
      }
      .main-stack {
        grid-area: main;
      }
      .side-rail {
        grid-area: side;
      }
      .footer-slot {
        grid-area: footer;
        position: sticky;
        bottom: max(0px, env(safe-area-inset-bottom));
        z-index: 3;
        /* Track the centered, width-capped graph stack above it. */
        width: 100%;
        max-width: calc(var(--curve-graph-max-height, 320px) * ${VB_W / VB_H} + 28px);
        margin-inline: auto;
      }
    }
    /* Browsers without container queries (older wall-tablet WebViews) never
       match the blocks above, which would revive the footer-below-the-list
       regression. Keep the reachability guarantee for them: stacked flow
       with the sticky footer under the graph at every width. The solid
       background line covers engines that also lack color-mix. */
    @supports not (container-type: inline-size) {
      .footer-slot {
        order: 2;
        position: sticky;
        bottom: max(0px, env(safe-area-inset-bottom));
        z-index: 3;
        padding-top: 8px;
        border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
        background: var(--card-bg);
        background: color-mix(in srgb, var(--card-bg) 72%, transparent);
        backdrop-filter: blur(14px);
      }
      .side-rail {
        order: 3;
      }
    }
    @container (max-width: 859.98px) {
      .footer-slot {
        order: 2;
        position: sticky;
        bottom: max(0px, env(safe-area-inset-bottom));
        z-index: 3;
        padding-top: 8px;
        border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
        background: color-mix(in srgb, var(--card-bg) 72%, transparent);
        backdrop-filter: blur(14px);
      }
      .side-rail {
        order: 3;
      }
      .graph-insight {
        align-items: flex-start;
        flex-direction: column;
        gap: 3px;
        /* Stacked band: one primary line + a two-line secondary budget,
           reserved up front so text swaps never resize the band. */
        min-height: 46px;
      }
      .graph-insight-primary,
      .graph-insight-secondary {
        flex: none;
        max-width: 100%;
      }
      .graph-insight-secondary {
        text-align: left;
        white-space: normal;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow: hidden;
      }
    }
    .presets-panel {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      border: 1px solid color-mix(in srgb, var(--divider) 70%, transparent);
      border-radius: 12px;
      padding: 10px;
      padding-bottom: 8px;
      animation: fade-in 0.15s ease;
    }
    .presets-panel.empty {
      display: block;
      padding: 10px 12px 12px;
    }
    .presets-header {
      grid-column: 1 / -1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-color);
    }
    .presets-explanation,
    .presets-empty-copy {
      grid-column: 1 / -1;
      font-size: 11px;
      line-height: 1.4;
      color: var(--secondary-text);
      opacity: 0.8;
    }
    .presets-empty-title {
      margin-top: 4px;
      font-size: 12px;
      font-weight: 650;
      color: var(--text-color);
    }
    .presets-empty-copy {
      margin-top: 4px;
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
      min-width: 0;
      overflow: hidden;
    }
    .preset-option:hover {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 4%, transparent);
    }
    .preset-option.trial {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 8%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
    }
    .preset-option:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .preset-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-color);
    }
    .preset-desc {
      min-width: 0;
      font-size: 10px;
      color: var(--secondary-text);
      opacity: 0.75;
      line-height: 1.35;
    }
    .preset-thumb {
      display: block;
      opacity: 0.65;
      margin-bottom: 2px;
      max-width: 100%;
    }
    @media (max-width: 430px) {
      .presets-panel {
        grid-template-columns: 1fr;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .loading-graph,
      .loading-curve,
      .loading-point {
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
      this._clearPresetGraphTrial();
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

  // Entity id that keys persisted session UI state (selection, scrubber). Prefer
  // the entity whose curves are actually loaded; fall back to the configured one
  // before the first load settles.
  private get _storageEntityId(): string | undefined {
    return this._load.loadedEntityId ?? this._entityId;
  }

  private get _isDirty(): boolean {
    return this._dirtyVersion !== this._cleanVersion;
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
      !this._managingLights &&
      !this._previewActive
    );
  }

  private get _isShowingPresetGraphTrial(): boolean {
    return this._presetGraphTrial !== null && this._canShowPresetGraphTrial;
  }

  private get _graphCurves(): LightCurve[] {
    return this._curves;
  }

  /**
   * The one position every surface shows. The scrubber thumb used to default
   * to 50 on its own while the graph and legend received null and rendered
   * nothing — the slider claimed a brightness the graph never showed.
   * Internal state stays null until touched so session restore still works.
   */
  private get _effectiveScrubberPosition(): number {
    return this._scrubberPosition ?? 50;
  }

  private get _presetPreviewCurve(): LightCurve | null {
    if (!this._isShowingPresetGraphTrial || !this._presetGraphTrial) return null;
    const selected = this._selectedCurve;
    if (!selected) return null;
    return {
      ...selected,
      controlPoints: this._presetGraphTrial.controlPoints,
      visible: true,
    };
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
    this._clearPresetGraphTrial();
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
    this._setPresetGraphTrial(null);
    this._lastPresetPointerType = null;
  }

  private _rememberPresetPointer(event: PointerEvent): void {
    this._lastPresetPointerType = event.pointerType;
  }

  private _startPresetGraphTrial(preset: PresetDef, event?: Event): void {
    const pointerType =
      event && 'pointerType' in event
        ? String((event as PointerEvent).pointerType)
        : this._lastPresetPointerType;
    if (pointerType === 'touch') return;
    if (!this._canShowPresetGraphTrial) return;
    this._setPresetGraphTrial(preset);
  }

  private _endPresetGraphTrial(preset: PresetDef): void {
    if (this._presetGraphTrial?.id === preset.id) {
      this._clearPresetGraphTrial();
    }
    // The remembered pointer type only stands in for the synthetic focus that
    // follows a tap/click on this button. Once the pointer or focus leaves,
    // drop it so a later keyboard focus isn't suppressed by a stale 'touch'.
    this._lastPresetPointerType = null;
  }

  private _onLegendRemovePanelOpen(): void {
    this._clearPresetGraphTrial();
  }

  private _applyPreset(preset: PresetDef): void {
    if (this._cancelAnimating || this._saving || this._managingLights) return;
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
    this._commitCurveEdit(nextCurves);
  }

  private _renderPresetsPanel() {
    const selected = this._selectedCurve;
    if (!selected) {
      return html`
        <div class="presets-panel empty" role="region" aria-label=${UI.presets.panelAria}>
          <div class="presets-header">${UI.presets.title}</div>
          <div class="presets-empty-title">${UI.presets.emptyTitle}</div>
          <div class="presets-empty-copy">${UI.presets.emptyBody}</div>
        </div>
      `;
    }

    return html`
      <div class="presets-panel" role="region" aria-label=${UI.presets.panelAria}>
        <div class="presets-header">${UI.presets.forLight(selected.friendlyName)}</div>
        <div class="presets-explanation">${UI.presets.explanation}</div>
        ${CURVE_PRESETS.map(
          (preset) => html`
            <button
              class="preset-option ${this._presetGraphTrial?.id === preset.id ? 'trial' : ''}"
              aria-current=${this._presetGraphTrial?.id === preset.id ? 'true' : nothing}
              @pointerdown=${this._rememberPresetPointer}
              @pointerenter=${(event: PointerEvent) => this._startPresetGraphTrial(preset, event)}
              @pointerleave=${() => this._endPresetGraphTrial(preset)}
              @pointercancel=${() => this._endPresetGraphTrial(preset)}
              @focus=${() => this._startPresetGraphTrial(preset)}
              @blur=${() => this._endPresetGraphTrial(preset)}
              @click=${() => this._applyPreset(preset)}
            >
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
    // Escape clears a temporary shape trial before falling back to cancel.
    if (e.key === 'Escape') {
      if (this._presetGraphTrial) {
        e.preventDefault();
        this._clearPresetGraphTrial();
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
    this._clearPresetGraphTrial();
    const { curveIndex, pointIndex, lightener, target } = e.detail;
    const nextCurves = movePointOnCurves(this._curves, curveIndex, pointIndex, lightener, target);
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

    const next = addPointEdit(this._curves, targetEntityId, lightener, target);
    if (next === null) return;

    // Discrete edit (not a drag): re-light all visible lights at the scrubber
    // position. Only point *movement* pushes a single light to its dragged
    // target; add/remove/presets stay scrubber-based.
    this._commitCurveEdit(next);
  }

  private _onPointRemove(e: CustomEvent): void {
    if (this._cancelAnimating) return;
    this._clearPresetGraphTrial();
    // Long-press removal can skip point-drop, so run the same end-of-drag
    // bookkeeping (flag reset + maybe-reload) here before applying the edit.
    this._completeDragMaybeReload();
    const { curveIndex, pointIndex } = e.detail;

    const next = removePointEdit(this._curves, curveIndex, pointIndex);
    if (next === null) return;

    this._commitCurveEdit(next);
  }

  private _onToggleCurve(e: CustomEvent): void {
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

  private _onManageToggle(e: CustomEvent): void {
    this._clearPresetGraphTrial();
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
    this._clearPresetGraphTrial();
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
        if (this._storageEntityId) {
          this._writeStoredState(this._storageEntityId, { selectedCurveId: null });
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
    this._clearPresetGraphTrial();
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
    this._clearPresetGraphTrial();
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
    this._clearPresetGraphTrial();
    if (this._previewActive) this._stopPreview();
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

  render() {
    const graphCurves = this._graphCurves;
    return html`
      <div
        class="card ${this._embedded ? 'embedded' : ''}"
        role="region"
        aria-label="Brightness editor"
      >
        <div class="header">
          <h2>${(this._config.title as string) ?? 'Brightness shapes'}</h2>
        </div>

        <div class="workspace">
          <div class="main-stack">
            ${this._load.loading
              ? this._renderLoadingSkeleton()
              : html`<div class="graph-panel">
                  ${this._renderGraphInsight()}
                  <curve-graph
                    .curves=${graphCurves}
                    .selectedCurveId=${this._selectedCurveId}
                    .entityId=${this._entityId ?? null}
                    .readOnly=${!this._isAdmin || this._cancelAnimating || this._managingLights}
                    .scrubberPosition=${this._effectiveScrubberPosition}
                    .previewCurve=${this._presetPreviewCurve}
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
                  .position=${this._effectiveScrubberPosition}
                  @scrubber-move=${this._onScrubberMove}
                  @scrubber-start=${this._onScrubberStart}
                  @scrubber-end=${this._onScrubberEnd}
                  @preview-toggle=${this._onPreviewToggle}
                ></curve-scrubber>`
              : nothing}
          </div>

          <aside class="side-rail" aria-label=${UI.card.railAria}>
            ${!this._load.loading && this._isAdmin && this._curves.length > 0
              ? this._renderPresetsPanel()
              : nothing}
            <curve-legend
              .curves=${this._curves}
              .selectedCurveId=${this._selectedCurveId}
              .scrubberPosition=${this._effectiveScrubberPosition}
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
          </aside>

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
