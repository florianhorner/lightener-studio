import { LitElement, html, css, svg, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { LevelInputDetail } from './brightness-bar.js';
import './brightness-bar.js';
import type { LightCurve, LightLevelIntent, LightLevelInput } from '../utils/types.js';
import { LEGEND_SHAPES, sampleCurveAt } from '../utils/graph-math.js';
import { MOBILE_MEDIA } from '../utils/breakpoint-styles.js';
import { safeDefine } from '../utils/safe-define.js';
import { UI } from '../utils/strings.js';

const LARGE_GROUP_THRESHOLD = 20;
/** Longer lists scroll inside the rail instead of growing the page. */
const OPEN_LIST_LIMIT = 8;

// Match white-space: nowrap without collapsing non-breaking spaces.
function collapseNameWhitespace(line: string): string {
  return line.replace(/[ \t\n\r\f]+/g, ' ').replace(/^ | $/g, '');
}

export class CurveLegend extends LitElement {
  @property({ type: Array }) curves: LightCurve[] = [];
  @property({ type: String }) selectedCurveId: string | null = null;
  @property({ attribute: false }) exampleEntityId: string | null = null;
  @property({ type: Number }) scrubberPosition: number | null = null;
  @property({ type: Boolean }) readOnly = true;
  @property({ type: String }) contextKey = '';
  @property({ attribute: false }) editingCurves: LightCurve[] | null = null;
  @property({ type: Boolean }) canManage = false;
  @property({ type: Boolean }) managing = false;
  /** Keeps the Manage control in place; `canManage` decides whether it is enabled. */
  @property({ type: Boolean }) showManage = false;
  /** The owner's pointer-hover target, mirrored back so every surface agrees. */
  @property({ attribute: false }) hoveredCurveId: string | null = null;

  @state() private _confirmingDeleteGroup = false;
  @state() private _manageOpen = false;
  private _pendingManageFocus: '.manage-trigger' | '.delete-group-btn.cancel' | null = null;

  private _onDocumentPointerDown = (event: PointerEvent): void => {
    const row = this.renderRoot.querySelector('.manage-row');
    if (row && event.composedPath().includes(row)) return;
    this._manageOpen = false;
  };

  static styles = css`
    :host {
      display: block;
      --accent: var(--primary-color, #2563eb);
      --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    .legend-panel {
      position: relative;
      background: transparent;
      /* Up to eight lights stay open. Longer lists scroll inside this rail;
         the editor commands live beside or above it, never below it. */
      --curve-legend-max-height: min(60vh, 470px);
    }
    .legend-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      min-height: 20px;
      padding: 0 0 10px;
    }
    .legend-label {
      font-size: 13px;
      font-weight: 550;
      color: var(--primary-text-color, #212121);
    }
    .legend-count {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 400;
      color: var(--secondary-text-color, #616161);
    }
    .legend {
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow: auto;
    }
    .legend.capped {
      max-height: var(--curve-legend-max-height, none);
    }
    .legend-item {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr) 44px;
      gap: 4px;
      align-items: start;
      position: relative;
      box-sizing: border-box;
      min-height: 68px;
      padding: 9px 0;
      border-bottom: 1px solid color-mix(in srgb, var(--divider) 45%, transparent);
      user-select: none;
      font-size: var(--text-md, 13px);
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      transition:
        opacity 150ms ease-out,
        background 150ms ease-out;
    }
    .legend-item.selected {
      background: color-mix(in srgb, var(--accent-color) 9%, transparent);
      border-radius: 8px;
    }
    .legend-item:focus-within:not(.selected) {
      background: color-mix(in srgb, var(--primary-text-color, #212121) 2%, transparent);
    }
    /* Pointer hover isolates one light without changing what is selected. */
    .legend.has-hover .legend-item:not(.hovered) {
      opacity: 0.32;
    }
    @media (prefers-reduced-motion: reduce) {
      .legend-item {
        transition: none;
      }
    }
    .row-select-btn {
      grid-column: 1;
      grid-row: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      align-self: center;
      width: 44px;
      min-width: 44px;
      min-height: 48px;
      padding: 0;
      margin: 0;
      border: none;
      border-radius: 8px;
      background: transparent;
      font: inherit;
      color: inherit;
      cursor: pointer;
    }
    .row-select-btn:focus {
      outline: none;
    }
    .row-select-btn:focus-visible {
      background: color-mix(in srgb, var(--primary-color, #2563eb) 10%, transparent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #2563eb) 50%, transparent);
    }
    .color-dot {
      width: 9px;
      height: 9px;
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
      width: 8px;
      height: 8px;
    }
    .color-dot.shape-triangle {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 9px solid var(--dot-color);
      background: transparent !important;
    }
    .color-dot.shape-bar {
      border-radius: 2px;
      width: 10px;
      height: 6px;
      margin: 2px 0;
    }
    .legend-item.hidden .color-dot {
      opacity: 0.45;
    }
    brightness-bar {
      grid-column: 2;
      grid-row: 1;
      min-width: 0;
    }
    .eye-btn {
      grid-column: 3;
      grid-row: 1;
      align-self: center;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: 44px;
      height: 48px;
      margin: 0;
      padding: 0;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--secondary-text-color, #616161);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .eye-btn svg {
      width: 20px;
      height: 20px;
      flex: 0 0 20px;
      display: block;
    }
    .eye-btn:hover {
      background: color-mix(in srgb, var(--secondary-text-color, #616161) 12%, transparent);
    }
    .eye-btn:focus {
      outline: none;
    }
    .eye-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    /* The ID sits above the name in the row's top space, so revealing it on
       hover, focus or selection never moves the name, rail or row. */
    .name-block {
      position: relative;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: visible;
    }
    .name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 500;
    }
    .legend-item.hovered .name,
    .legend-item.selected .name {
      font-weight: 600;
    }
    .entity-id {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 100%;
      display: block;
      height: 12px;
      line-height: 12px;
      font-size: 10px;
      font-weight: 400;
      color: var(--primary-text-color, #212121);
      opacity: 0.85;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
      transition: opacity 0.15s ease;
    }
    .legend-item:not(.selected):not(:hover):not(:focus-within) .entity-id {
      opacity: 0;
    }
    .manage-row {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      min-height: 44px;
      margin-bottom: 8px;
    }
    .manage-trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-sizing: border-box;
      min-height: 44px;
      min-width: 44px;
      padding: 8px 10px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--primary-text-color, #212121);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }
    .manage-trigger svg {
      width: 18px;
      height: 18px;
      flex: 0 0 18px;
    }
    .manage-trigger:hover:not(:disabled),
    .manage-trigger[aria-expanded='true'] {
      background: color-mix(in srgb, var(--secondary-text-color, #616161) 14%, transparent);
    }
    .manage-trigger:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .manage-menu {
      position: absolute;
      top: 48px;
      right: 0;
      z-index: 10;
      display: flex;
      flex-direction: column;
      min-width: 190px;
      padding: 6px;
      border: 1px solid var(--divider);
      border-radius: 12px;
      background: var(--ha-card-background, var(--card-background-color, #fff));
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
    }
    .manage-item {
      display: flex;
      align-items: center;
      gap: 8px;
      box-sizing: border-box;
      width: 100%;
      min-height: 44px;
      padding: 8px 12px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--primary-text-color, #212121);
      font: inherit;
      font-size: 13px;
      text-align: left;
      cursor: pointer;
    }
    .manage-item:hover:not(:disabled) {
      background: color-mix(in srgb, var(--secondary-text-color, #616161) 12%, transparent);
    }
    .manage-item.delete-group-btn {
      color: var(--error-color, #db4437);
    }
    .manage-item svg {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
    }
    .manage-trigger:focus-visible,
    .manage-item:focus-visible,
    .delete-group-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .delete-group-confirm {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 10px;
      padding: 8px 10px;
      border: 1px solid color-mix(in srgb, var(--error-color, #db4437) 45%, transparent);
      border-radius: 8px;
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
    .delete-group-actions .delete-group-btn {
      min-height: 44px;
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
    .managing-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: auto;
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
      .legend-item {
        font-size: 14px;
      }
    }
  `;

  private _focus(entityId: string): void {
    this.dispatchEvent(
      new CustomEvent<LightLevelIntent>('focus-curve', {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _levelIntent(
    type: 'light-level-start' | 'light-level-input' | 'light-level-end',
    entityId: string,
    target?: number
  ): void {
    this.dispatchEvent(
      new CustomEvent<LightLevelIntent | LightLevelInput>(type, {
        detail: target === undefined ? { entityId } : { entityId, target },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _select(entityId: string) {
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

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    // If management is revoked or a WS call starts, drop any pending delete-group
    // confirmation so it can't fire after the manage gate closes.
    if (
      (changed.has('canManage') || changed.has('managing')) &&
      (!this.canManage || this.managing)
    ) {
      this._confirmingDeleteGroup = false;
      this._manageOpen = false;
    }
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed);
    if (changed.has('_manageOpen')) {
      if (this._manageOpen) {
        document.addEventListener('pointerdown', this._onDocumentPointerDown, true);
      } else {
        document.removeEventListener('pointerdown', this._onDocumentPointerDown, true);
      }
    }
    const focusTarget = this._pendingManageFocus;
    this._pendingManageFocus = null;
    if (focusTarget) {
      this.renderRoot.querySelector<HTMLButtonElement>(focusTarget)?.focus({ preventScroll: true });
    }
  }

  disconnectedCallback(): void {
    document.removeEventListener('pointerdown', this._onDocumentPointerDown, true);
    this._manageOpen = false;
    super.disconnectedCallback();
  }

  private _hover(entityId: string | null, event?: PointerEvent): void {
    // Touch has no hover; a tap must not leave a light isolated.
    if (event?.pointerType === 'touch') return;
    this.dispatchEvent(
      new CustomEvent<{ entityId: string | null }>('hover-curve', {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _toggleManage(): void {
    if (!this.canManage || this.managing) return;
    this._manageOpen = !this._manageOpen;
  }

  private _onManageKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Escape' || !this._manageOpen) return;
    // The card's window Escape handler skips handled events.
    e.preventDefault();
    this._manageOpen = false;
    this._pendingManageFocus = '.manage-trigger';
  }

  private _onItemKeyDown(e: KeyboardEvent) {
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

  private _openEditLights() {
    if (!this.canManage || this.managing) return;
    this._confirmingDeleteGroup = false;
    this._manageOpen = false;
    this.dispatchEvent(
      new CustomEvent('edit-lights', {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    // Keep Home Assistant's full names stable when group membership changes.
    // Duplicate controls still need distinct accessible labels, including
    // hidden lights and names that render alike after whitespace collapses.
    const nameKeys = this.curves.map((curve) => collapseNameWhitespace(curve.friendlyName));
    const nameCounts = new Map<string, number>();
    for (const key of nameKeys) {
      nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
    }
    const needsIds = nameKeys.map((key) => (nameCounts.get(key) ?? 0) > 1);
    const labels = this.curves.map((curve, index) =>
      needsIds[index] ? `${curve.friendlyName} (${curve.entityId})` : curve.friendlyName
    );
    // A friendly name can itself match an ID-qualified label. Reserve all
    // labels before qualifying collisions so every control remains distinct.
    const labelCounts = new Map<string, number>();
    for (const label of labels) {
      const key = collapseNameWhitespace(label);
      labelCounts.set(key, (labelCounts.get(key) ?? 0) + 1);
    }
    const usedLabels = new Set(labels.map(collapseNameWhitespace));
    for (let index = 0; index < labels.length; index++) {
      if ((labelCounts.get(collapseNameWhitespace(labels[index])) ?? 0) > 1) {
        do {
          labels[index] += ` (${this.curves[index].entityId})`;
        } while (usedLabels.has(collapseNameWhitespace(labels[index])));
        usedLabels.add(collapseNameWhitespace(labels[index]));
      }
    }
    const visibleCount = this.curves.filter((curve) => curve.visible).length;
    const hiddenCount = this.curves.length - visibleCount;
    const countLabel =
      this.curves.length === 0
        ? UI.legend.emptyCount
        : hiddenCount === 0
          ? UI.legend.countAllVisible(this.curves.length)
          : UI.legend.countWithHidden(visibleCount, hiddenCount);
    const isLargeGroup = this.curves.length >= LARGE_GROUP_THRESHOLD;
    const position = Math.round(this.scrubberPosition ?? 100);
    const hovered = this.curves.some((curve) => curve.entityId === this.hoveredCurveId)
      ? this.hoveredCurveId
      : null;
    return html`
      <div
        class="legend-panel ${isLargeGroup ? 'large-group' : ''}"
        data-density=${isLargeGroup ? 'large' : 'normal'}
      >
        ${this._renderManage()}
        <div class="legend-header">
          <div class="legend-label">${UI.legend.title}</div>
          <div class="legend-count" title=${countLabel}>${countLabel}</div>
        </div>
        <div
          class="legend ${hovered ? 'has-hover' : ''} ${this.curves.length > OPEN_LIST_LIMIT
            ? 'capped'
            : ''}"
          role="list"
          aria-label=${UI.legend.listAria(this.curves.length)}
        >
          ${repeat(
            this.curves,
            (curve) => curve.entityId,
            (curve, idx) => {
              const label = labels[idx];
              const brightness = sampleCurveAt(curve.controlPoints, position);
              const brightnessLabel =
                brightness === 0
                  ? UI.legend.off
                  : Math.round(brightness) === 0
                    ? '<1%'
                    : `${Math.round(brightness)}%`;
              const selectionLabel =
                this.scrubberPosition === null ? label : `${label} ${brightnessLabel}`;
              const isSelected = this.selectedCurveId === curve.entityId;
              const isHovered = hovered === curve.entityId;
              const source =
                this.editingCurves?.find((item) => item.entityId === curve.entityId) ?? curve;
              const editBrightness = sampleCurveAt(source.controlPoints, position);
              const disabled = this.readOnly || !curve.visible || position === 0;
              const displayValue = `${curve.entityId === this.exampleEntityId ? '≈ ' : ''}${brightnessLabel}`;
              return html`
                <div
                  class="legend-item ${curve.visible ? '' : 'hidden'} ${isSelected
                    ? 'selected'
                    : ''} ${isHovered ? 'hovered' : ''}"
                  role="listitem"
                  style="--accent-color: ${curve.color}"
                  @pointerenter=${(e: PointerEvent) => this._hover(curve.entityId, e)}
                  @pointerleave=${(e: PointerEvent) => this._hover(null, e)}
                  @pointercancel=${() => this._hover(null)}
                >
                  <button
                    type="button"
                    class="row-select-btn"
                    aria-label=${curve.entityId === this.exampleEntityId
                      ? `${selectionLabel} · ${UI.invitation.values}`
                      : selectionLabel}
                    aria-pressed=${isSelected ? 'true' : 'false'}
                    @click=${() => this._select(curve.entityId)}
                    @keydown=${(e: KeyboardEvent) => this._onItemKeyDown(e)}
                  >
                    <span
                      class="color-dot shape-${CurveLegend._shapes[
                        idx % CurveLegend._shapes.length
                      ]}"
                      style="background: ${curve.color}; --dot-color: ${curve.color}"
                    ></span>
                  </button>
                  <brightness-bar
                    appearance="rail"
                    .emphasis=${isSelected || isHovered}
                    .label=${UI.legend.brightnessAria(label)}
                    .value=${Math.round(brightness)}
                    .interactionValue=${editBrightness}
                    .displayValue=${displayValue}
                    .tooltip=${`${curve.friendlyName}\n${curve.entityId}`}
                    .valueText=${position === 0
                      ? UI.legend.roomOff
                      : UI.legend.brightnessAt(brightnessLabel, position)}
                    .disabled=${disabled}
                    .contextKey=${`${this.contextKey}:${curve.entityId}:${this.scrubberPosition}`}
                    style="--bar-color: ${curve.color}"
                    @bar-focus=${() => this._focus(curve.entityId)}
                    @level-start=${() => this._levelIntent('light-level-start', curve.entityId)}
                    @level-input=${(event: CustomEvent<LevelInputDetail>) =>
                      this._levelIntent('light-level-input', curve.entityId, event.detail.value)}
                    @level-end=${() => this._levelIntent('light-level-end', curve.entityId)}
                  >
                    <span class="name-block" slot="label">
                      <span class="name" title=${curve.friendlyName}>${curve.friendlyName}</span>
                      <span class="entity-id" title=${curve.entityId}>${curve.entityId}</span>
                    </span>
                  </brightness-bar>
                  <button
                    type="button"
                    class="eye-btn"
                    aria-label="${curve.visible ? 'Hide' : 'Show'} ${label}"
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
                        ? svg`
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              `
                        : svg`
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
                </div>
              `;
            }
          )}
        </div>
      </div>
    `;
  }

  private _renderManage() {
    if (!this.showManage && !this.managing) return nothing;
    const open = this._manageOpen;
    return html`
      <div class="manage-row" @keydown=${this._onManageKeyDown}>
        ${this.managing
          ? html`<div class="managing-row" role="status" aria-live="polite">
              <span class="spinner" aria-hidden="true"></span>
              ${UI.legend.updating}
            </div>`
          : nothing}
        <button
          type="button"
          class="manage-trigger"
          aria-label=${UI.legend.manageAria}
          aria-expanded=${open ? 'true' : 'false'}
          aria-controls=${open ? 'manage-menu' : nothing}
          ?disabled=${!this.canManage || this.managing}
          @click=${this._toggleManage}
        >
          ${UI.legend.manage}
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8"></circle>
            <circle cx="12" cy="12" r="1.8"></circle>
            <circle cx="19" cy="12" r="1.8"></circle>
          </svg>
        </button>
        ${open
          ? html`<div
              class="manage-menu"
              id="manage-menu"
              role="group"
              aria-label=${UI.legend.manageAria}
            >
              <button
                type="button"
                class="manage-item add-light-btn"
                @click=${this._openEditLights}
              >
                ${UI.membership.title}
              </button>
              <button
                type="button"
                class="manage-item delete-group-btn link"
                @click=${this._startDeleteGroup}
              >
                ${UI.legend.deleteGroup}
              </button>
            </div>`
          : nothing}
      </div>
      ${this._confirmingDeleteGroup && this.canManage
        ? html`<div class="delete-group-confirm">
            <span class="delete-group-text">${UI.legend.deleteConfirm}</span>
            <div class="delete-group-actions">
              <button
                type="button"
                class="delete-group-btn cancel"
                ?disabled=${this.managing}
                @click=${this._cancelDeleteGroup}
              >
                ${UI.legend.deleteCancel}
              </button>
              <button
                type="button"
                class="delete-group-btn danger"
                ?disabled=${this.managing}
                @click=${this._confirmDeleteGroup}
              >
                ${UI.legend.deleteAction}
              </button>
            </div>
          </div>`
        : nothing}
    `;
  }

  private _startDeleteGroup() {
    if (!this.canManage || this.managing) return;
    this._manageOpen = false;
    this._confirmingDeleteGroup = true;
    this._pendingManageFocus = '.delete-group-btn.cancel';
  }

  private _cancelDeleteGroup() {
    this._confirmingDeleteGroup = false;
    this._pendingManageFocus = '.manage-trigger';
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
