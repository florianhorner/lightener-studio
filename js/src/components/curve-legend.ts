import { LitElement, html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { LevelInputDetail } from './brightness-bar.js';
import './brightness-bar.js';
import type { LightCurve, LightLevelIntent, LightLevelInput } from '../utils/types.js';
import { LEGEND_SHAPES, sampleCurveAt } from '../utils/graph-math.js';
import { MOBILE_MEDIA } from '../utils/breakpoint-styles.js';
import { safeDefine } from '../utils/safe-define.js';
import { UI } from '../utils/strings.js';
import { WATCH_FLICKER_MS, WATCH_WAKE_STAGGER_MS } from '../utils/motion.js';

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
  /** Actual Room position used for edits while a tutorial projects another value. */
  @property({ type: Number }) editingPosition: number | null = null;
  @property({ type: Boolean }) readOnly = true;
  @property({ type: String }) contextKey = '';
  @property({ attribute: false }) editingCurves: LightCurve[] | null = null;
  /** Whether Delete group… may run; the card's ⋮ menu opens the confirmation. */
  @property({ type: Boolean }) canManage = false;
  @property({ type: Boolean }) managing = false;
  /** Edit mode: All lights leads the list. */
  @property({ type: Boolean }) showAllLights = false;
  /** The owner's pointer-hover target, mirrored back so every surface agrees. */
  @property({ attribute: false }) hoveredCurveId: string | null = null;
  /** True while Watch room react drives the real lights. */
  @property({ type: Boolean }) watching = false;
  /** Bumped after each finished change (a released point, a shape, Undo) while watching. */
  @property({ type: Number }) watchAck = 0;
  /** Whether Watch's wake and flicker move; halos stay either way. */
  @property({ type: Boolean }) watchMotion = true;

  @state() private _confirmingDeleteGroup = false;
  /** Brightness each light showed at the last acknowledgement, while watching. */
  private _ackedLevels = new Map<string, number>();
  /** Lights that flicker for the latest Watch event, and whether it was the wake wave. */
  @state() private _flickering: ReadonlySet<string> = new Set();
  @state() private _wake = false;
  /** Alternates the flicker animation name so a repeated flicker restarts. */
  @state() private _flickerKey = 0;
  private _pendingManageFocus: '.delete-group-btn.cancel' | null = null;

  static styles = css`
    :host {
      display: block;
      --accent: var(--primary-color, #2563eb);
      --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    .legend-panel {
      position: relative;
      background: transparent;
      /* Up to eight lights stay open. Longer lists scroll inside the list;
         the editor commands stay above it, never below it. */
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
    /* Edit's first row: the whole room, pressed while no light is selected. */
    .all-lights-row {
      padding: 0 0 6px;
    }
    .all-lights {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      width: 100%;
      min-height: 36px;
      padding: 0 12px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: var(--secondary-text-color, #616161);
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: background 150ms ease;
    }
    .all-lights:hover:not([aria-pressed='true']) {
      background: color-mix(in srgb, var(--primary-text-color, #212121) 6%, transparent);
    }
    .all-lights[aria-pressed='true'] {
      background: color-mix(in srgb, var(--accent) 9%, transparent);
      color: var(--primary-text-color, #212121);
      cursor: default;
    }
    .all-lights:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      .all-lights {
        transition: none;
      }
    }
    @media ${MOBILE_MEDIA} {
      .all-lights {
        min-height: 44px;
      }
    }
    .legend-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--secondary-text-color, #616161);
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
    /* Under the graph the lights flow into as many columns as fit, up to six. */
    .legend {
      display: grid;
      grid-template-columns: repeat(
        auto-fill,
        minmax(max(min(100%, 320px), calc((100% - 120px) / 6)), 1fr)
      );
      align-content: start;
      column-gap: 24px;
      overflow: auto;
    }
    .legend.capped {
      max-height: var(--curve-legend-max-height, none);
    }
    .legend-item {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr);
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
    /* Watch: a warm halo, kept apart from the dot by a ring in the card colour. */
    .dot-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 10px;
      height: 10px;
    }
    .dot-wrap.lit::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      box-shadow:
        0 0 0 2px var(--card-bg, var(--card-background-color, #fff)),
        0 0 var(--halo-blur, 6px) var(--halo-spread, 1px)
          color-mix(in srgb, var(--watch-warm, #ffb300) var(--halo-alpha, 45%), transparent);
      pointer-events: none;
    }
    .dot-wrap .color-dot {
      position: relative;
    }
    .dot-wrap.flicker-a {
      animation: watch-flicker-a ${WATCH_FLICKER_MS}ms ease-out var(--flicker-delay, 0ms) 1 both;
    }
    .dot-wrap.flicker-b {
      animation: watch-flicker-b ${WATCH_FLICKER_MS}ms ease-out var(--flicker-delay, 0ms) 1 both;
    }
    @keyframes watch-flicker-a {
      0%,
      100% {
        transform: scale(1);
      }
      35% {
        transform: scale(1.9);
      }
    }
    @keyframes watch-flicker-b {
      0%,
      100% {
        transform: scale(1);
      }
      35% {
        transform: scale(1.9);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .dot-wrap.flicker-a,
      .dot-wrap.flicker-b {
        animation: none;
      }
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
    brightness-bar {
      grid-column: 2;
      grid-row: 1;
      min-width: 0;
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

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    super.willUpdate(changed);
    // If management is revoked or a WS call starts, drop any pending delete-group
    // confirmation so it can't fire after the manage gate closes.
    if (
      (changed.has('canManage') || changed.has('managing')) &&
      (!this.canManage || this.managing)
    ) {
      this._confirmingDeleteGroup = false;
    }
    this._trackWatch(changed);
  }

  /** Halo levels the room shows right now: every light at the Room position. */
  private _roomLevels(): Map<string, number> {
    const position = Math.round(this.scrubberPosition ?? 100);
    const levels = new Map<string, number>();
    for (const curve of this.curves) {
      levels.set(curve.entityId, Math.round(sampleCurveAt(curve.controlPoints, position)));
    }
    return levels;
  }

  /**
   * Turning Watch on wakes every light in a wave; each later acknowledgement
   * flickers only the lights whose brightness changed since the previous one.
   */
  private _trackWatch(changed: Map<PropertyKey, unknown>): void {
    if (!this.watching) {
      if (changed.has('watching')) {
        this._ackedLevels = new Map();
        this._flickering = new Set();
        this._wake = false;
      }
      return;
    }
    if (!changed.has('watching') && !changed.has('watchAck')) return;
    const levels = this._roomLevels();
    if (changed.has('watching')) {
      this._ackedLevels = levels;
      this._wake = true;
      this._flickering = new Set([...levels].filter(([, level]) => level > 0).map(([id]) => id));
      this._flickerKey++;
      return;
    }
    const moved = new Set<string>();
    for (const [entityId, level] of levels) {
      if (this._ackedLevels.get(entityId) !== level) moved.add(entityId);
    }
    this._ackedLevels = levels;
    if (moved.size === 0) return;
    this._wake = false;
    this._flickering = moved;
    this._flickerKey++;
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed);
    const focusTarget = this._pendingManageFocus;
    this._pendingManageFocus = null;
    if (focusTarget) {
      this.renderRoot.querySelector<HTMLButtonElement>(focusTarget)?.focus({ preventScroll: true });
    }
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

  private static readonly _shapes = LEGEND_SHAPES;

  /** A sibling of the rows, outside their repeat, so it never re-keys them. */
  private _renderAllLights() {
    if (!this.showAllLights || this.curves.length === 0) return nothing;
    const all = this.selectedCurveId === null;
    return html`<div class="all-lights-row">
      <button
        type="button"
        class="all-lights"
        aria-pressed=${all ? 'true' : 'false'}
        @click=${() => {
          if (!all)
            this.dispatchEvent(
              new CustomEvent('clear-selection', { bubbles: true, composed: true })
            );
        }}
      >
        ${UI.legend.allLights}
      </button>
    </div>`;
  }

  render() {
    // Keep Home Assistant's full names stable when group membership changes.
    // Duplicate controls still need distinct accessible labels, including
    // names that render alike after whitespace collapses.
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
    // The rows already show how many lights there are; only an empty group needs saying.
    const countLabel = this.curves.length === 0 ? UI.legend.emptyCount : '';
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
          ${countLabel
            ? html`<div class="legend-count" title=${countLabel}>${countLabel}</div>`
            : nothing}
        </div>
        ${this._renderAllLights()}
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
              const editPosition = Math.round(this.editingPosition ?? position);
              const editBrightness = sampleCurveAt(source.controlPoints, editPosition);
              const disabled = this.readOnly || editPosition === 0;
              const displayValue = `${curve.entityId === this.exampleEntityId ? '≈ ' : ''}${brightnessLabel}`;
              return html`
                <div
                  class="legend-item ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}"
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
                      class="dot-wrap ${this._dotClass(curve, brightness)}"
                      style=${this._haloStyle(brightness, idx)}
                      ><span
                        class="color-dot shape-${CurveLegend._shapes[
                          idx % CurveLegend._shapes.length
                        ]}"
                        style="background: ${curve.color}; --dot-color: ${curve.color}"
                      ></span
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
                    .contextKey=${`${this.contextKey}:${curve.entityId}:${editPosition}`}
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
                </div>
              `;
            }
          )}
        </div>
      </div>
    `;
  }

  /** While watching, a lit light carries a warm halo; a changed one flickers once. */
  private _dotClass(curve: LightCurve, brightness: number): string {
    if (!this.watching) return '';
    const lit = Math.round(brightness) > 0 ? 'lit' : '';
    const flicker =
      this.watchMotion && this._flickering.has(curve.entityId)
        ? `flicker-${this._flickerKey % 2 ? 'b' : 'a'}`
        : '';
    return `${lit} ${flicker}`;
  }

  /** Halo size and strength follow the light's brightness; 0% has no halo. */
  private _haloStyle(brightness: number, idx: number): string {
    if (!this.watching) return '';
    const level = Math.max(0, Math.min(100, Math.round(brightness)));
    const delay = this._wake ? idx * WATCH_WAKE_STAGGER_MS : 0;
    return [
      `--halo-blur: ${(6 + level * 0.11).toFixed(1)}px`,
      `--halo-spread: ${(1 + level / 28).toFixed(1)}px`,
      `--halo-alpha: ${Math.round((0.45 + (0.4 * level) / 100) * 100)}%`,
      `--flicker-delay: ${delay}ms`,
    ].join('; ');
  }

  /** Membership progress and the Delete group… confirmation, above the list. */
  private _renderManage() {
    return html`
      ${this.managing
        ? html`<div class="managing-row" role="status" aria-live="polite">
            <span class="spinner" aria-hidden="true"></span>
            ${UI.legend.updating}
          </div>`
        : nothing}
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

  /** True while the Delete group… confirmation is open. */
  get confirmingDelete(): boolean {
    return this._confirmingDeleteGroup;
  }

  /** Delete group… from the card's ⋮ menu: the existing confirmation, focused on Cancel. */
  public startDeleteGroup(): void {
    this._startDeleteGroup();
  }

  private _startDeleteGroup() {
    if (!this.canManage || this.managing) return;
    this._confirmingDeleteGroup = true;
    this._pendingManageFocus = '.delete-group-btn.cancel';
  }

  private _cancelDeleteGroup() {
    this._confirmingDeleteGroup = false;
    // The card returns focus to the ⋮ menu that opened the confirmation.
    this.dispatchEvent(new CustomEvent('delete-group-dismiss', { bubbles: true, composed: true }));
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
