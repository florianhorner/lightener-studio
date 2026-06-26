import { LitElement, html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { LightCurve, Hass } from '../utils/types.js';
import { LEGEND_SHAPES, sampleCurveAt } from '../utils/graph-math.js';
import { discriminator as splitName } from '../utils/naming.js';
import { MOBILE_MEDIA } from '../utils/breakpoint-styles.js';
import { safeDefine } from '../utils/safe-define.js';
import { EntityPickerLoader } from '../utils/entity-picker-loader.js';
import { CURVE_PRESETS } from '../utils/presets.js';
import { renderEntityPickerField } from './entity-picker-field.js';
import { renderPresetThumbnail } from './preset-thumbnail.js';

export class CurveLegend extends LitElement {
  @property({ type: Array }) curves: LightCurve[] = [];
  @property({ type: String }) selectedCurveId: string | null = null;
  @property({ type: Number }) scrubberPosition: number | null = null;
  @property({ type: Boolean }) canManage = false;
  @property({ type: Boolean }) managing = false;
  @property({ type: Boolean }) manageMode = false;
  @property({ type: Number }) closeRemoveSignal = 0;
  // Bumped by the parent to force the add form closed (e.g. after a successful
  // add, or when another panel takes over).
  @property({ type: Number }) closeAddSignal = 0;
  // This group's own entity id, so the add picker can exclude it (and its
  // already-controlled lights, derived from `curves`) from what it offers. The
  // backend validates again on add.
  @property({ type: String }) groupEntityId: string | null = null;
  @property({ attribute: false }) hass: Hass | null = null;

  @state() private _confirmingRemove: string | null = null;
  @state() private _confirmingDeleteGroup = false;
  @state() private _addingLight = false;
  @state() private _pendingAddEntity = '';
  @state() private _pendingPreset: string = CURVE_PRESETS[0]?.id ?? 'linear';

  // Lazily loads <ha-entity-picker>; falls back to a plain input if HA never
  // registers it. Same loader the card editor uses. ensureLoaded() is called
  // from _startAdd() (not on mount), so cards whose add form is never opened —
  // the common case on a dashboard — don't pay the card-helper load.
  private _picker = new EntityPickerLoader(
    () => this.isConnected,
    () => this.requestUpdate()
  );

  static styles = css`
    :host {
      display: block;
      --accent: var(--primary-color, #2563eb);
      --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    .legend-panel {
      border-radius: 12px;
      padding: 4px 0;
      background: transparent;
      border: 1px solid color-mix(in srgb, var(--divider) 70%, transparent);
    }
    .legend-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--secondary-text-color, #616161);
      padding: 6px 10px 4px;
    }
    .legend {
      display: flex;
      flex-direction: column;
      gap: 0;
      max-height: var(--curve-legend-max-height, none);
      overflow: auto;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      user-select: none;
      padding: 8px 10px;
      border-radius: 0;
      border-top: 1px solid color-mix(in srgb, var(--divider) 70%, transparent);
      transition:
        background 0.15s ease,
        opacity 0.2s ease;
      font-size: var(--text-md, 13px);
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      position: relative;
    }
    .row-select-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
      padding: 0;
      margin: 0;
      border: none;
      background: transparent;
      font: inherit;
      font-weight: inherit;
      color: inherit;
      text-align: left;
      cursor: pointer;
    }
    .row-select-btn:focus {
      outline: none;
    }
    .row-select-btn:focus-visible {
      background: color-mix(in srgb, var(--primary-color, #2563eb) 10%, transparent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #2563eb) 50%, transparent);
      border-radius: 6px;
    }
    .legend-item:hover {
      background: color-mix(in srgb, var(--primary-color, #2563eb) 5%, transparent);
    }
    .legend-item.hidden {
      opacity: 0.4;
    }
    .legend-item.selected {
      background: transparent;
    }
    .legend-item.selected::after {
      content: '';
      position: absolute;
      left: 10px;
      right: 10px;
      bottom: 0;
      height: 2px;
      border-radius: 999px;
      background: var(--accent-color, var(--primary-color, #2563eb));
      pointer-events: none;
    }
    .legend-item.selected:hover {
      background: color-mix(in srgb, var(--primary-color, #2563eb) 4%, transparent);
    }
    .legend-item.confirming {
      background: color-mix(in srgb, var(--error-color, #db4437) 10%, transparent);
      cursor: default;
    }
    .legend-item.confirming:hover {
      background: color-mix(in srgb, var(--error-color, #db4437) 12%, transparent);
    }
    .color-dot {
      width: 10px;
      height: 10px;
      flex-shrink: 0;
    }
    .color-dot.shape-circle {
      border-radius: 50%;
    }
    .color-dot.shape-square {
      border-radius: 2px;
    }
    .color-dot.shape-diamond {
      border-radius: 2px;
      transform: rotate(45deg);
      width: 9px;
      height: 9px;
    }
    .color-dot.shape-triangle {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 10px solid var(--dot-color);
      background: transparent !important;
    }
    .color-dot.shape-bar {
      border-radius: 2px;
      width: 10px;
      height: 6px;
      margin: 2px 0;
    }
    .eye-btn {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      opacity: 0.35;
      transition: opacity 0.15s ease;
      padding: 14px;
      box-sizing: content-box;
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: inherit;
      border-radius: 4px;
    }
    .eye-btn svg {
      width: 16px;
      height: 16px;
      display: block;
    }
    .legend-item:hover .eye-btn,
    .legend-item.hidden .eye-btn {
      opacity: 0.7;
    }
    .eye-btn:focus {
      outline: none;
    }
    .eye-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      opacity: 0.9;
    }
    .remove-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      opacity: 0.7;
      transition:
        opacity 0.15s ease,
        color 0.15s ease;
      padding: 14px;
      box-sizing: content-box;
      color: var(--secondary-text-color, #616161);
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .remove-icon:hover {
      opacity: 1;
      color: var(--error-color, #db4437);
    }
    /* Selected row is the active editing target — hide the trash to keep the
       row readable on mobile and avoid mis-tapping while editing. Deselect
       first (click the X), then delete. */
    .legend-item.selected .remove-icon {
      display: none;
    }
    .remove-icon:focus {
      outline: none;
    }
    .remove-icon:focus-visible {
      outline: 2px solid var(--error-color, #db4437);
      outline-offset: 2px;
      border-radius: 4px;
      opacity: 1;
    }
    .remove-icon:disabled {
      cursor: not-allowed;
      opacity: 0.3 !important;
    }
    .remove-icon svg {
      width: 16px;
      height: 16px;
      display: block;
    }
    .name-block {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      gap: 1px;
    }
    .name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
    .discriminator {
      font-weight: inherit;
    }
    .prefix {
      display: block;
      font-size: 10px;
      font-weight: 400;
      color: var(--secondary-text-color, #757575);
      opacity: 0.85;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
    .entity-id {
      font-size: 10px;
      font-weight: 400;
      color: var(--secondary-text-color, #757575);
      opacity: 0.7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    }
    .brightness-value {
      font-size: 11px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--secondary-text-color, #616161);
      flex-shrink: 0;
      /* Reserve space for "100%" so the badge never auto-shrinks/grows
         and never clips a 3-digit value (Bubble #2138). */
      min-width: 36px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: right;
    }
    .clear-edit-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      padding: 14px;
      box-sizing: content-box;
      color: var(--primary-color, #2563eb);
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition:
        opacity 0.15s ease,
        background 0.15s ease;
    }
    .clear-edit-icon:hover {
      opacity: 1;
      background: color-mix(in srgb, var(--primary-color, #2563eb) 10%, transparent);
      border-radius: 4px;
    }
    .clear-edit-icon:focus {
      outline: none;
    }
    .clear-edit-icon:focus-visible {
      outline: 2px solid var(--primary-color, #2563eb);
      outline-offset: 2px;
      border-radius: 4px;
      opacity: 1;
    }
    .clear-edit-icon svg {
      width: 16px;
      height: 16px;
      display: block;
    }
    .confirm-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }
    .confirm-text {
      flex: 1;
      min-width: 0;
      word-break: break-word;
      font-size: 12px;
      color: var(--error-color, #db4437);
      font-weight: 500;
    }
    .confirm-btn {
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
      border-radius: 6px;
      border: 1px solid var(--divider);
      background: transparent;
      color: var(--secondary-text-color, #616161);
      cursor: pointer;
      font-family: inherit;
      flex-shrink: 0;
    }
    .confirm-btn.danger {
      background: var(--error-color, #db4437);
      border-color: var(--error-color, #db4437);
      color: #fff;
    }
    .confirm-btn.danger:hover {
      opacity: 0.9;
    }
    .confirm-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .add-divider {
      height: 1px;
      margin: 6px 10px;
      background: var(--divider);
    }
    .add-row {
      padding: 6px 10px 8px;
    }
    .manage-toggle-row {
      padding: 4px 10px 8px;
      display: flex;
      justify-content: flex-end;
    }
    .manage-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 32px;
      padding: 4px 12px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color, #616161);
      background: transparent;
      border: 1px solid var(--divider);
      border-radius: 6px;
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        color 0.15s ease,
        background 0.15s ease;
    }
    .manage-toggle-btn:hover:not(:disabled) {
      border-color: var(--primary-color, #2563eb);
      color: var(--primary-color, #2563eb);
    }
    .manage-toggle-btn:focus-visible {
      outline: 2px solid var(--primary-color, #2563eb);
      outline-offset: 2px;
    }
    .manage-toggle-btn.active {
      border-color: var(--primary-color, #2563eb);
      color: var(--primary-color, #2563eb);
      background: color-mix(in srgb, var(--primary-color, #2563eb) 10%, transparent);
    }
    .manage-toggle-btn.remove-mode {
      border-color: var(--error-color, #db4437);
      color: var(--error-color, #db4437);
      background: color-mix(in srgb, var(--error-color, #db4437) 10%, transparent);
    }
    .manage-toggle-btn.remove-mode:hover:not(:disabled) {
      border-color: var(--error-color, #db4437);
      color: var(--error-color, #db4437);
      background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
    }
    .manage-toggle-btn .toggle-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
    .manage-toggle-btn:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
    .delete-group-row {
      padding: 4px 10px 10px;
      border-top: 1px dashed var(--divider);
      margin-top: 2px;
    }
    .delete-group-btn {
      font-family: inherit;
      font-size: 12px;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 6px;
    }
    .delete-group-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .delete-group-btn.link {
      background: transparent;
      border: none;
      color: var(--error-color, #db4437);
      min-height: 44px;
      padding: 10px 0;
      text-align: left;
      width: 100%;
    }
    .delete-group-btn.link:hover:not(:disabled) {
      text-decoration: underline;
    }
    .delete-group-confirm {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .delete-group-text {
      font-size: 12px;
      color: var(--primary-text-color, #212121);
      font-weight: 500;
    }
    .delete-group-actions {
      display: flex;
      gap: 6px;
    }
    .delete-group-btn.cancel {
      background: transparent;
      border: 1px solid var(--divider);
      color: var(--secondary-text-color, #616161);
    }
    .delete-group-btn.cancel:hover:not(:disabled) {
      border-color: var(--primary-color, #2563eb);
      color: var(--primary-color, #2563eb);
    }
    .delete-group-btn.danger {
      background: var(--error-color, #db4437);
      border: 1px solid var(--error-color, #db4437);
      color: #fff;
      font-weight: 600;
    }
    .delete-group-btn.danger:hover:not(:disabled) {
      opacity: 0.9;
    }
    .add-light-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 10px;
      background: var(--primary-color, #2563eb);
      border: 1px solid var(--primary-color, #2563eb);
      border-radius: 8px;
      color: #fff;
      font-family: inherit;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      transition: opacity 0.15s ease;
    }
    .add-light-btn:hover:not(:disabled) {
      opacity: 0.9;
    }
    .add-light-btn:focus-visible {
      outline: 2px solid var(--primary-color, #2563eb);
      outline-offset: 2px;
    }
    .add-light-btn:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
    .add-light-btn svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
    .add-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .add-form input[type='text'] {
      padding: 6px 10px;
      border: 1px solid var(--divider);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      font-family: inherit;
      font-size: 13px;
      width: 100%;
      box-sizing: border-box;
    }
    .add-form input[type='text']:focus {
      outline: none;
      border-color: var(--primary-color, #2563eb);
      box-shadow: 0 0 0 1px var(--primary-color, #2563eb);
    }
    .preset-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .preset-field label {
      font-size: 11px;
      color: var(--secondary-text-color, #616161);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .preset-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .preset-option {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 6px 8px;
      border: 1px solid var(--divider);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        background 0.15s ease;
    }
    .preset-option:hover {
      border-color: var(--primary-color, #2563eb);
    }
    .preset-option:focus-visible {
      outline: none;
      border-color: var(--primary-color, #2563eb);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #2563eb) 40%, transparent);
    }
    .preset-option.active {
      border-color: var(--primary-color, #2563eb);
      background: color-mix(in srgb, var(--primary-color, #2563eb) 12%, transparent);
    }
    .preset-option .preset-thumb {
      flex-shrink: 0;
    }
    .preset-option .preset-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .add-form-actions {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }
    .add-form-actions button {
      padding: 4px 12px;
      min-height: 44px;
      font-size: 12px;
      font-weight: 500;
      border-radius: 6px;
      border: 1px solid var(--divider);
      background: transparent;
      color: var(--secondary-text-color, #616161);
      cursor: pointer;
      font-family: inherit;
      transition:
        border-color 0.15s ease,
        color 0.15s ease,
        background 0.15s ease;
    }
    .add-form-actions button:hover:not(:disabled) {
      border-color: var(--primary-color, #2563eb);
      color: var(--primary-color, #2563eb);
    }
    .add-form-actions button.primary {
      background: var(--primary-color, #2563eb);
      border-color: var(--primary-color, #2563eb);
      color: #fff;
    }
    .add-form-actions button.primary:hover:not(:disabled) {
      opacity: 0.9;
      color: #fff;
    }
    .add-form-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .managing-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 10px;
      color: var(--secondary-text-color, #616161);
      font-size: 12px;
    }
    .spinner {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid color-mix(in srgb, var(--secondary-text-color, #616161) 30%, transparent);
      border-top-color: var(--primary-color, #2563eb);
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media ${MOBILE_MEDIA} {
      .preset-grid {
        grid-template-columns: 1fr;
      }
      .legend-item {
        padding: 10px 10px;
        font-size: 14px;
        min-height: 44px;
        box-sizing: border-box;
      }
      .eye-btn {
        width: 44px;
        height: 44px;
        padding: 12px;
        margin-left: auto;
        box-sizing: border-box;
      }
      .eye-btn svg {
        width: 20px;
        height: 20px;
      }
      .remove-icon {
        opacity: 0.6;
        width: 44px;
        height: 44px;
        padding: 12px;
        box-sizing: border-box;
      }
      .remove-icon svg {
        width: 18px;
        height: 18px;
      }
      .clear-edit-icon {
        width: 44px;
        height: 44px;
        padding: 12px;
        box-sizing: border-box;
      }
      .clear-edit-icon svg {
        width: 18px;
        height: 18px;
      }
    }
  `;

  private _select(entityId: string) {
    if (this._confirmingRemove === entityId) return;
    this.dispatchEvent(
      new CustomEvent('select-curve', {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _toggle(e: Event, entityId: string) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('toggle-curve', {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _clearSelection(e: Event, entityId: string) {
    e.stopPropagation();
    this._select(entityId);
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    // If management is revoked or a WS call starts, drop any pending confirm so
    // the destructive row can't emit remove-light after the gate closes.
    if (
      (changed.has('canManage') || changed.has('managing')) &&
      (!this.canManage || this.managing)
    ) {
      this._confirmingRemove = null;
      this._confirmingDeleteGroup = false;
    }
    if (changed.has('manageMode') && !this.manageMode) {
      this._confirmingDeleteGroup = false;
    }
    if (changed.has('closeRemoveSignal')) {
      this._confirmingRemove = null;
    }
    if (changed.has('closeAddSignal')) {
      this._cancelAdd();
    }
    // Revoked management closes the add form so it can't emit add-light against
    // a closed gate. We deliberately do NOT close it while a WS call is merely
    // in flight (managing): the form stays intact so a failed add keeps the
    // user's picked light + preset for a retry. A successful add closes it via
    // closeAddSignal, and _confirmAdd/the disabled button already block submits
    // while managing.
    if (changed.has('canManage') && !this.canManage) {
      this._cancelAdd();
    }
  }

  private _startRemove(e: Event, entityId: string) {
    e.stopPropagation();
    if (!this.canManage || this.managing) return;
    if (this.curves.length <= 1) return;
    this._cancelAdd();
    this._confirmingRemove = entityId;
    this.dispatchEvent(new CustomEvent('remove-panel-open', { bubbles: true, composed: true }));
  }

  private _cancelRemove(e: Event) {
    e.stopPropagation();
    this._confirmingRemove = null;
  }

  private _confirmRemove(e: Event, entityId: string) {
    e.stopPropagation();
    if (!this.canManage || this.managing) {
      this._confirmingRemove = null;
      return;
    }
    this._confirmingRemove = null;
    this.dispatchEvent(
      new CustomEvent('remove-light', {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onItemKeyDown(e: KeyboardEvent, entityId: string) {
    if (this._confirmingRemove === entityId) return;
    // Enter/Space activation is handled natively by the <button>, which fires a
    // click -> _select. Do NOT also dispatch here: _onSelectCurve toggles, so a
    // second event would cancel the selection back out.
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = [...this.renderRoot.querySelectorAll<HTMLElement>('.row-select-btn')];
      const idx = items.indexOf(e.currentTarget as HTMLElement);
      const next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
      items[next]?.focus();
    }
  }

  private _onToggleKeyDown(e: KeyboardEvent, entityId: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._toggle(e, entityId);
    }
  }

  private static readonly _shapes = LEGEND_SHAPES;

  private _startAdd() {
    if (!this.canManage || this.managing) return;
    // Kick off the <ha-entity-picker> load now that the form is actually opening;
    // until it resolves the field renders the plain-input fallback.
    this._picker.ensureLoaded();
    this._confirmingRemove = null;
    this._confirmingDeleteGroup = false;
    this._addingLight = true;
    this._pendingAddEntity = '';
    this._pendingPreset = CURVE_PRESETS[0]?.id ?? 'linear';
    // Tell the card another panel opened so it can close the presets chooser.
    this.dispatchEvent(new CustomEvent('add-panel-open', { bubbles: true, composed: true }));
  }

  private _cancelAdd() {
    this._addingLight = false;
    this._pendingAddEntity = '';
  }

  private _onAddEntityChange(e: CustomEvent) {
    this._pendingAddEntity = ((e.detail?.value as string) ?? '').trim();
  }

  private _onFallbackAddEntityInput(e: Event) {
    this._pendingAddEntity = (e.target as HTMLInputElement).value.trim();
  }

  private _onPresetSelect(presetId: string) {
    this._pendingPreset = presetId;
  }

  // Arrow-key navigation for the preset radiogroup. role="radio" advertises this
  // behavior, so wire it: arrows move the selection (with wraparound) and focus
  // follows, matching native radio semantics. Combined with roving tabindex
  // (only the checked option is tabbable) this makes the chooser keyboard-usable.
  private _onPresetKeydown(e: KeyboardEvent) {
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const backward = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (!forward && !backward) return;
    e.preventDefault();
    const ids = CURVE_PRESETS.map((p) => p.id);
    if (ids.length === 0) return;
    const current = Math.max(0, ids.indexOf(this._pendingPreset));
    const next = ids[(current + (forward ? 1 : ids.length - 1)) % ids.length];
    this._onPresetSelect(next);
    this.updateComplete.then(() => {
      this.renderRoot?.querySelector<HTMLElement>(`.preset-option[data-preset="${next}"]`)?.focus();
    });
  }

  private _confirmAdd() {
    if (!this.canManage || this.managing) return;
    const entityId = this._pendingAddEntity.trim();
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent('add-light', {
        detail: { entityId, preset: this._pendingPreset },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderAddForm() {
    // Built only while the form is open (not on every card render). The picker
    // shouldn't offer this group's own light or any light it already controls.
    const excludeEntities = [
      ...(this.groupEntityId ? [this.groupEntityId] : []),
      ...this.curves.map((c) => c.entityId),
    ];
    return html`
      <div class="add-form">
        ${renderEntityPickerField({
          ready: this._picker.ready,
          hass: this.hass,
          value: this._pendingAddEntity,
          includeDomains: ['light'],
          excludeEntities,
          placeholder: 'light.entity_id',
          onValueChanged: this._onAddEntityChange,
          onFallbackInput: this._onFallbackAddEntityInput,
        })}
        <div class="preset-field">
          <label id="preset-grid-label">Start shape</label>
          <div
            class="preset-grid"
            role="radiogroup"
            aria-labelledby="preset-grid-label"
            @keydown=${this._onPresetKeydown}
          >
            ${CURVE_PRESETS.map((preset) => {
              const isActive = preset.id === this._pendingPreset;
              return html`
                <button
                  type="button"
                  class="preset-option ${isActive ? 'active' : ''}"
                  data-preset=${preset.id}
                  role="radio"
                  aria-checked=${isActive ? 'true' : 'false'}
                  tabindex=${isActive ? '0' : '-1'}
                  @click=${() => this._onPresetSelect(preset.id)}
                >
                  ${renderPresetThumbnail(preset)}
                  <span class="preset-name">${preset.name}</span>
                </button>
              `;
            })}
          </div>
        </div>
        <div class="add-form-actions">
          <button type="button" ?disabled=${this.managing} @click=${this._cancelAdd}>Cancel</button>
          <button
            type="button"
            class="primary"
            ?disabled=${!this._pendingAddEntity || this.managing}
            @click=${this._confirmAdd}
          >
            Add
          </button>
        </div>
      </div>
    `;
  }

  private _renderConfirmRow(curve: LightCurve) {
    return html`
      <div class="confirm-row">
        <span class="confirm-text">Remove "${curve.friendlyName}"?</span>
        <button type="button" class="confirm-btn" @click=${(e: Event) => this._cancelRemove(e)}>
          Cancel
        </button>
        <button
          type="button"
          class="confirm-btn danger"
          @click=${(e: Event) => this._confirmRemove(e, curve.entityId)}
        >
          Remove
        </button>
      </div>
    `;
  }

  render() {
    // Compute shared-prefix discriminators once per render so each row gets a
    // consistent split. With <2 curves the helper returns the full name as
    // discriminator and an empty prefix.
    const nameParts = splitName(this.curves.map((c) => c.friendlyName));
    return html`
      <div class="legend-panel">
        <div class="legend-label">Lights</div>
        <div class="legend" role="list" aria-label="Lights in this group">
          ${this.curves.map((curve, idx) => {
            const confirming =
              this.canManage && !this.managing && this._confirmingRemove === curve.entityId;
            const part = nameParts[idx];
            const isSelected = this.selectedCurveId === curve.entityId;
            return html`
              <div
                class="legend-item ${curve.visible ? '' : 'hidden'} ${isSelected
                  ? 'selected'
                  : ''} ${confirming ? 'confirming' : ''}"
                role="listitem"
                style="--accent-color: ${curve.color}"
              >
                ${confirming
                  ? this._renderConfirmRow(curve)
                  : html`
                      <button
                        type="button"
                        class="row-select-btn"
                        aria-pressed=${isSelected ? 'true' : 'false'}
                        @click=${() => this._select(curve.entityId)}
                        @keydown=${(e: KeyboardEvent) => this._onItemKeyDown(e, curve.entityId)}
                      >
                        <span
                          class="color-dot shape-${CurveLegend._shapes[
                            idx % CurveLegend._shapes.length
                          ]}"
                          style="background: ${curve.color}; --dot-color: ${curve.color}"
                        ></span>
                        <span class="name-block">
                          <span class="name discriminator" title=${curve.friendlyName}
                            >${part.discriminator}</span
                          >
                          ${part.prefix
                            ? html`<span class="prefix">${part.prefix}</span>`
                            : nothing}
                          <span class="entity-id" title=${curve.entityId}>${curve.entityId}</span>
                        </span>
                        ${this.scrubberPosition !== null
                          ? html`<span class="brightness-value"
                              >${Math.round(
                                sampleCurveAt(
                                  curve.controlPoints,
                                  Math.round(this.scrubberPosition)
                                )
                              )}%</span
                            >`
                          : nothing}
                      </button>
                      ${isSelected
                        ? html`
                            <button
                              type="button"
                              class="clear-edit-icon"
                              aria-label="Clear selection for ${curve.friendlyName}"
                              title="Clear selection for ${curve.friendlyName}"
                              @click=${(e: Event) => this._clearSelection(e, curve.entityId)}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          `
                        : nothing}
                      <button
                        type="button"
                        class="eye-btn"
                        aria-label="${curve.visible ? 'Hide' : 'Show'} ${curve.friendlyName}"
                        aria-pressed=${!curve.visible}
                        @click=${(e: Event) => this._toggle(e, curve.entityId)}
                        @keydown=${(e: KeyboardEvent) => this._onToggleKeyDown(e, curve.entityId)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          ${curve.visible
                            ? html`
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              `
                            : html`
                                <path
                                  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
                                />
                                <path
                                  d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
                                />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              `}
                        </svg>
                      </button>
                      ${this.canManage && this.manageMode && this.curves.length > 1
                        ? html`<button
                            type="button"
                            class="remove-icon"
                            aria-label="Remove ${curve.friendlyName}"
                            title="Remove ${curve.friendlyName}"
                            ?disabled=${this.managing}
                            @click=${(e: Event) => this._startRemove(e, curve.entityId)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path
                                d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                              ></path>
                            </svg>
                          </button>`
                        : nothing}
                    `}
              </div>
            `;
          })}
        </div>
        ${this.canManage || this.managing
          ? html`
              <div class="add-divider"></div>
              ${this.managing
                ? html`<div class="add-row">
                    <div class="managing-row" role="status" aria-live="polite">
                      <span class="spinner" aria-hidden="true"></span>
                      Updating lights…
                    </div>
                  </div>`
                : html`
                    <div class="add-row">
                      ${this._addingLight
                        ? this._renderAddForm()
                        : html`<button
                            type="button"
                            class="add-light-btn"
                            ?disabled=${this.managing}
                            @click=${this._startAdd}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add a light
                          </button>`}
                    </div>
                  `}
              ${this.canManage
                ? html`
                    <div class="manage-toggle-row">
                      <button
                        type="button"
                        class="manage-toggle-btn ${this.manageMode ? 'active' : 'remove-mode'}"
                        aria-pressed=${this.manageMode ? 'true' : 'false'}
                        ?disabled=${this.managing}
                        @click=${this._onManageToggleClick}
                      >
                        ${this.manageMode
                          ? 'Done'
                          : html`
                              <svg
                                class="toggle-icon"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true"
                              >
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path
                                  d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                                ></path>
                              </svg>
                              Remove
                            `}
                      </button>
                    </div>
                    ${this.manageMode
                      ? html`
                          <div class="delete-group-row">
                            ${this._confirmingDeleteGroup
                              ? html`
                                  <div class="delete-group-confirm">
                                    <span class="delete-group-text">Delete this group?</span>
                                    <div class="delete-group-actions">
                                      <button
                                        type="button"
                                        class="delete-group-btn cancel"
                                        ?disabled=${this.managing}
                                        @click=${this._cancelDeleteGroup}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        class="delete-group-btn danger"
                                        ?disabled=${this.managing}
                                        @click=${this._confirmDeleteGroup}
                                      >
                                        Delete group
                                      </button>
                                    </div>
                                  </div>
                                `
                              : html`
                                  <button
                                    type="button"
                                    class="delete-group-btn link"
                                    ?disabled=${this.managing}
                                    @click=${this._startDeleteGroup}
                                  >
                                    Delete this group
                                  </button>
                                `}
                          </div>
                        `
                      : nothing}
                  `
                : nothing}
            `
          : nothing}
      </div>
    `;
  }

  private _onManageToggleClick() {
    this.dispatchEvent(
      new CustomEvent('manage-toggle', {
        detail: { manageMode: !this.manageMode },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _startDeleteGroup() {
    if (!this.canManage || this.managing) return;
    this._cancelAdd();
    this._confirmingRemove = null;
    this._confirmingDeleteGroup = true;
  }

  private _cancelDeleteGroup() {
    this._confirmingDeleteGroup = false;
  }

  private _confirmDeleteGroup() {
    if (!this.canManage || this.managing) return;
    this._confirmingDeleteGroup = false;
    this.dispatchEvent(
      new CustomEvent('delete-group', {
        bubbles: true,
        composed: true,
      })
    );
  }
}

safeDefine('curve-legend', CurveLegend);

declare global {
  interface HTMLElementTagNameMap {
    'curve-legend': CurveLegend;
  }
}
