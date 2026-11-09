import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { safeDefine } from '../utils/safe-define.js';
import { GRIP_HINT_NUDGE_MS, GRIP_HINT_NUDGE_PX, GRIP_HINT_PULSE_MS } from '../utils/motion.js';

export interface LevelInputDetail {
  value: number;
}

interface PointerGesture {
  id: number;
  x: number;
  y: number;
  width: number;
  startValue: number;
  lastValue: number;
  dragging: boolean;
  context: string;
}

const INTENT_THRESHOLD = 6;
/** Room an edge's value needs beside its grip: the gap plus a "100%" label. */
const EDGE_VALUE_SPACE = 60;
const RANGE_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

/** A controlled range surface; its owner interprets focus and edit intent. */
export class BrightnessBar extends LitElement {
  @property({ type: String }) label = '';
  @property({ type: Number }) value = 0;
  /** Exact edit baseline, separate from rounded display or a temporary example. */
  @property({ type: Number }) interactionValue: number | null = null;
  @property({ type: String }) displayValue = '';
  @property({ type: String }) valueText = '';
  @property({ type: String }) tooltip = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) showLabel = true;
  /**
   * A full-height bar, a slim rail below its label, or an edge: only a grip and
   * its value on a clear strip under the graph. Input handling is identical.
   */
  @property({ type: String, reflect: true }) appearance: 'bar' | 'rail' | 'edge' = 'bar';
  /** The owner's hover or selection; a rail then takes its light's color. */
  @property({ type: Boolean, reflect: true }) emphasis = false;
  /** Change when the owner replaces the entity, room coordinate, or view. */
  @property({ type: String }) contextKey = '';

  private _pointer: PointerGesture | null = null;
  private _keys = new Set<string>();
  private _keyContext: string | null = null;
  private _editing = false;
  /** An edge's measured width, so its value moves left only when it must. */
  @state() private _edgeWidth = 0;
  private _edgeObserver: ResizeObserver | null = null;
  private _hint: Animation[] = [];
  private _hintMotionOff: (() => void) | null = null;

  static styles = css`
    :host {
      display: block;
      min-width: 0;
      font-family: inherit;
    }
    .bar {
      position: relative;
      isolation: isolate;
      box-sizing: border-box;
      min-width: 0;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      color: var(--primary-text-color, #212121);
      background: color-mix(in srgb, var(--secondary-text-color, #616161) 8%, transparent);
      user-select: none;
      -webkit-user-select: none;
    }
    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      max-width: 100%;
      border-radius: 8px 0 0 8px;
      background: color-mix(
        in srgb,
        var(--secondary-text-color, #616161) 30%,
        var(--card-background-color, #fff)
      );
      pointer-events: none;
    }
    .marker {
      position: absolute;
      top: 15px;
      bottom: 15px;
      width: 5px;
      border-radius: 2px;
      background: var(--primary-text-color, #212121);
      opacity: 0.85;
      transform: translateX(-50%);
      pointer-events: none;
    }
    .content {
      position: absolute;
      inset: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 0 16px 0 12px;
      pointer-events: none;
      font-size: var(--brightness-bar-font-size, 13px);
      line-height: 1.3;
    }
    .label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 550;
    }
    ::slotted([slot='label']) {
      display: block;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .value {
      flex: none;
      min-width: 34px;
      margin-left: auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
    input {
      appearance: none;
      -webkit-appearance: none;
      position: absolute;
      inset: 0;
      z-index: 2;
      display: block;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      opacity: 0;
      cursor: grab;
      touch-action: pan-y;
    }
    input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 1px;
      height: 48px;
    }
    input::-moz-range-thumb {
      width: 1px;
      height: 48px;
      border: 0;
    }
    .bar:has(input:focus-visible) {
      outline: 2px solid var(--primary-color, #2563eb);
      outline-offset: 3px;
    }
    .bar:not(.disabled):hover {
      background: color-mix(in srgb, var(--secondary-text-color, #616161) 13%, transparent);
    }
    .dragging input {
      cursor: grabbing;
    }
    .disabled {
      opacity: 0.45;
    }
    input:disabled {
      cursor: default;
    }

    /* Rail: the label sits above a slim track inset 8px on both sides. The
       input still covers the whole surface, so targets and drags are unchanged. */
    :host([appearance='rail']) .bar {
      height: 44px;
      border-radius: 0;
      overflow: visible;
      background: transparent;
    }
    :host([appearance='rail']) .bar::before {
      content: '';
      position: absolute;
      left: 8px;
      right: 8px;
      bottom: 5px;
      height: 4px;
      border-radius: 8px;
      background: color-mix(
        in srgb,
        var(--secondary-text-color, #616161) 26%,
        var(--card-background-color, #fff)
      );
      pointer-events: none;
    }
    :host([appearance='rail']) .fill {
      inset: auto auto 5px 8px;
      height: 4px;
      border-radius: 8px;
      background: color-mix(
        in srgb,
        var(--secondary-text-color, #616161) 80%,
        var(--card-background-color, #fff)
      );
    }
    :host([appearance='rail']) .marker {
      top: auto;
      bottom: 0;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: color-mix(
        in srgb,
        var(--primary-text-color, #212121) 60%,
        var(--secondary-text-color, #616161)
      );
      opacity: 1;
      transform: none;
    }
    :host([appearance='rail']) .content {
      padding: 0 8px 10px;
    }
    /* Owners may place a detail line just above the label; the slotted
       content truncates its own text. */
    :host([appearance='rail']) .label {
      overflow: visible;
    }
    :host([appearance='rail']) .bar:not(.disabled):hover {
      background: transparent;
    }
    :host([appearance='rail'][emphasis]) .fill,
    :host([appearance='rail']) .bar:has(input:focus-visible) .fill {
      background: var(--bar-color, var(--primary-color, #2563eb));
    }
    :host([appearance='rail'][emphasis]) .marker,
    :host([appearance='rail']) .bar:has(input:focus-visible) .marker {
      background: color-mix(
        in srgb,
        var(--bar-color, var(--primary-color, #2563eb)) 55%,
        var(--primary-text-color, #212121)
      );
      box-shadow: 0 0 0 5px
        color-mix(in srgb, var(--bar-color, var(--primary-color, #2563eb)) 14%, transparent);
    }

    /* Edge: the strip stays a full-width, 48px target; only the grip and the
       value next to it are drawn. Owners align the strip to the graph's plot. */
    :host([appearance='edge']) .bar {
      overflow: visible;
      border-radius: 0;
      background: transparent;
    }
    :host([appearance='edge']) .bar:not(.disabled):hover {
      background: transparent;
    }
    :host([appearance='edge']) .bar:has(input:focus-visible) {
      outline: none;
    }
    :host([appearance='edge']) .fill {
      display: none;
    }
    :host([appearance='edge']) .marker {
      top: 50%;
      bottom: auto;
      box-sizing: border-box;
      width: 30px;
      height: 20px;
      border: 1.5px solid
        var(--edge-color, color-mix(in srgb, var(--primary-text-color, #212121) 55%, transparent));
      border-radius: 10px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      opacity: 1;
      transform: translate(-50%, -50%);
      transition:
        transform 120ms ease-out,
        border-color 160ms ease-out;
    }
    :host([appearance='edge']) .marker::before {
      content: '';
      position: absolute;
      inset: 4px 8px;
      background: repeating-linear-gradient(90deg, currentColor 0 1.5px, transparent 1.5px 4px);
      opacity: 0.6;
    }
    :host([appearance='edge']) .bar:not(.disabled):hover .marker,
    :host([appearance='edge']) .dragging .marker {
      transform: translate(-50%, -50%) scale(1.1);
    }
    :host([appearance='edge']) .bar:has(input:focus-visible) .marker {
      outline: 2px solid var(--primary-color, #2563eb);
      outline-offset: 2px;
    }
    :host([appearance='edge']) .content {
      padding: 0;
    }
    :host([appearance='edge']) .value {
      position: absolute;
      top: 50%;
      min-width: 0;
      margin: 0;
      font-size: var(--brightness-bar-font-size, 13px);
      text-align: left;
      transform: translateY(-50%);
    }
    :host([appearance='edge']) input {
      cursor: ew-resize;
    }
    @media (prefers-reduced-motion: reduce) {
      :host([appearance='edge']) .marker {
        transition: none;
      }
    }
  `;

  private get _level(): number {
    return Number.isFinite(this.value) ? Math.round(Math.max(0, Math.min(100, this.value))) : 0;
  }

  private get _interactionLevel(): number {
    const value = this.interactionValue ?? this.value;
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('blur', this._onWindowBlur);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  disconnectedCallback(): void {
    this.cancelHint();
    this._edgeObserver?.disconnect();
    this._edgeObserver = null;
    this._finishGesture();
    window.removeEventListener('blur', this._onWindowBlur);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    super.disconnectedCallback();
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (
      (changed.has('disabled') && this.disabled) ||
      (changed.has('contextKey') && (this._pointer || this._keyContext !== null))
    ) {
      this._finishGesture();
    } else if (
      (changed.has('value') || changed.has('interactionValue')) &&
      this._pointer &&
      !this._pointer.dragging
    ) {
      // A pending tap has not claimed an edit. Follow an external model change
      // (for example, dismissal of a temporary shape) before deriving a delta.
      this._pointer.startValue = this._interactionLevel;
      this._pointer.lastValue = this._interactionLevel;
    }
  }

  protected updated(): void {
    if (this.appearance !== 'edge' || this._edgeObserver || typeof ResizeObserver === 'undefined')
      return;
    this._edgeObserver = new ResizeObserver(([entry]) => {
      this._edgeWidth = entry?.contentRect.width ?? 0;
    });
    this._edgeObserver.observe(this);
  }

  private _emit(name: 'level-start' | 'level-end' | 'bar-focus'): void {
    this.dispatchEvent(new CustomEvent<void>(name, { bubbles: true, composed: true }));
  }

  private _beginEdit(): void {
    if (this._editing) return;
    this._editing = true;
    this._emit('level-start');
  }

  private _emitValue(value: number): void {
    this.dispatchEvent(
      new CustomEvent<LevelInputDetail>('level-input', {
        detail: { value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _finishGesture(): void {
    const pointer = this._pointer;
    const edited = this._editing;
    // Clear first: releasing capture can synchronously reenter the loss handler.
    this._pointer = null;
    this._editing = false;
    this._keys.clear();
    this._keyContext = null;
    if (pointer?.dragging) this.requestUpdate();
    const input = this.renderRoot.querySelector('input');
    if (input) input.value = String(this._level);
    if (pointer && input?.hasPointerCapture?.(pointer.id)) {
      try {
        input.releasePointerCapture(pointer.id);
      } catch (error) {
        // A browser may already have retired the active pointer on disconnect.
        if (!(error instanceof DOMException) || error.name !== 'NotFoundError') throw error;
      }
    }
    if (edited) this._emit('level-end');
  }

  private _onWindowBlur = (): void => this._finishGesture();

  private _onVisibilityChange = (): void => {
    if (document.hidden) this._finishGesture();
  };

  /**
   * Continue a press that began on another surface of this control, such as the
   * Room edge drawn in the graph, as this bar's own relative drag.
   */
  public grab(event: PointerEvent): void {
    this._onPointerDown(event);
  }

  /**
   * Help on demand: an edge's grip nudges inward and its ring pulses twice.
   * Presentation only; the value, its events and the lights never change.
   */
  playHint(delay = 0): void {
    this.cancelHint();
    const marker = this.renderRoot.querySelector<HTMLElement>('.marker');
    if (this.appearance !== 'edge' || this.disabled || typeof marker?.animate !== 'function')
      return;
    // Inward only, so the grip never leaves the plot at 0% or 100%.
    const step = this._level > 50 ? -GRIP_HINT_NUDGE_PX : GRIP_HINT_NUDGE_PX;
    const at = (px: number) => ({ transform: `translate(calc(-50% + ${px}px), -50%)` });
    const ring = getComputedStyle(marker).borderTopColor;
    this._hint = [
      marker.animate([at(0), at(step), at(0), at(step / 2), at(0)], {
        duration: GRIP_HINT_NUDGE_MS,
        delay,
        easing: 'ease-in-out',
      }),
      marker.animate([{ boxShadow: `0 0 0 0 ${ring}` }, { boxShadow: '0 0 0 10px transparent' }], {
        duration: GRIP_HINT_PULSE_MS,
        delay,
        iterations: 2,
        easing: 'ease-out',
      }),
    ];
    // Reduced motion switched on while the hint waits or plays stops it at once.
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!motion?.addEventListener) return;
    const stop = () => {
      if (motion.matches) this.cancelHint();
    };
    motion.addEventListener('change', stop);
    this._hintMotionOff = () => motion.removeEventListener('change', stop);
  }

  cancelHint(): void {
    for (const animation of this._hint) animation.cancel();
    this._hint = [];
    this._hintMotionOff?.();
    this._hintMotionOff = null;
  }

  private _onPointerDown(event: PointerEvent): void {
    this.cancelHint();
    if (this.disabled || this._pointer || !event.isPrimary || event.button !== 0) return;
    const input = this.renderRoot.querySelector('input');
    if (!input) return;
    const width = input.getBoundingClientRect().width;
    if (!Number.isFinite(width) || width <= 0) return;
    event.preventDefault();
    event.stopPropagation();
    this._finishGesture();
    input.focus({ preventScroll: true });
    if (this.disabled || !this.isConnected) return;
    this._pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      width,
      startValue: this._interactionLevel,
      lastValue: this._interactionLevel,
      dragging: false,
      context: this.contextKey,
    };
    input.setPointerCapture(event.pointerId);
  }

  private _validPointer(event: PointerEvent): PointerGesture | null {
    const pointer = this._pointer;
    if (!pointer || pointer.id !== event.pointerId) return null;
    if (this.disabled || pointer.context !== this.contextKey) {
      this._finishGesture();
      return null;
    }
    return pointer;
  }

  private _applyPointerValue(event: PointerEvent, pointer: PointerGesture): void {
    const value =
      event.clientX === pointer.x
        ? pointer.startValue
        : Math.round(
            Math.max(
              0,
              Math.min(
                100,
                pointer.startValue + (100 * (event.clientX - pointer.x)) / pointer.width
              )
            )
          );
    if (value === pointer.lastValue) return;
    pointer.lastValue = value;
    this._beginEdit();
    // A start handler can change the context or disable/remove this control.
    if (this._pointer === pointer && !this.disabled && pointer.context === this.contextKey) {
      this._emitValue(value);
    } else this._finishGesture();
  }

  private _onPointerMove(event: PointerEvent): void {
    const pointer = this._validPointer(event);
    if (!pointer) return;
    const dx = Math.abs(event.clientX - pointer.x);
    const dy = Math.abs(event.clientY - pointer.y);
    if (!pointer.dragging) {
      if (dy >= INTENT_THRESHOLD && dy >= dx) {
        this._finishGesture();
        return;
      }
      if (dx < INTENT_THRESHOLD || dx <= dy) return;
      pointer.dragging = true;
      this.requestUpdate();
    }
    event.preventDefault();
    event.stopPropagation();
    this._applyPointerValue(event, pointer);
  }

  private _onPointerUp(event: PointerEvent): void {
    const pointer = this._validPointer(event);
    if (!pointer) return;
    const tap =
      !pointer.dragging &&
      Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < INTENT_THRESHOLD;
    if (pointer.dragging) this._applyPointerValue(event, pointer);
    this._finishGesture();
    if (tap && !this.disabled && pointer.context === this.contextKey) this._emit('bar-focus');
  }

  private _onPointerCancel(event: PointerEvent): void {
    if (this._pointer?.id === event.pointerId) this._finishGesture();
  }

  private _onKeyDown(event: KeyboardEvent): void {
    this.cancelHint();
    if (this.disabled) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) {
        this._finishGesture();
        this._emit('bar-focus');
      }
      return;
    }
    if (!RANGE_KEYS.has(event.key)) return;
    if (event.repeat && !this._keys.has(event.key)) {
      // A held key cannot restart an edit after its context was invalidated.
      event.preventDefault();
      return;
    }
    if (this._pointer || (this._keyContext !== null && this._keyContext !== this.contextKey)) {
      this._finishGesture();
    }
    if (this._keys.size === 0) {
      // Native default stepping must begin at the model, not its example.
      (event.currentTarget as HTMLInputElement).value = String(Math.round(this._interactionLevel));
    }
    this._keyContext = this.contextKey;
    this._keys.add(event.key);
    const rounded = Math.round(this._interactionLevel);
    if (
      rounded !== this._interactionLevel &&
      ((rounded === 0 && ['Home', 'ArrowLeft', 'ArrowDown', 'PageDown'].includes(event.key)) ||
        (rounded === 100 && ['End', 'ArrowRight', 'ArrowUp', 'PageUp'].includes(event.key)))
    ) {
      // A range already displaying its endpoint emits no native input there.
      // Explicit endpoint intent must still change the exact sampled target.
      event.preventDefault();
      this._onInput(event);
    }
    // Native range keyboard behavior supplies input, including Home/End/Page.
  }

  private _onKeyUp(event: KeyboardEvent): void {
    if (!RANGE_KEYS.has(event.key)) return;
    this._keys.delete(event.key);
    if (this._keys.size === 0) this._finishGesture();
  }

  private _onInput(event: Event): void {
    event.stopPropagation();
    const input = event.currentTarget as HTMLInputElement;
    const value = input.valueAsNumber;
    if (this._pointer) {
      // Touch ranges can still emit their absolute native value after a
      // prevented pointerdown. Only our relative pointer path owns this edit.
      input.value = String(this._level);
      return;
    }
    if (
      this.disabled ||
      (this._keyContext !== null && this._keyContext !== this.contextKey) ||
      !Number.isFinite(value)
    ) {
      input.value = String(this._level);
      this._finishGesture();
      return;
    }
    const next = Math.round(Math.max(0, Math.min(100, value)));
    if (next === this._interactionLevel) return;
    const context = this.contextKey;
    this._beginEdit();
    if (this._editing && !this.disabled && context === this.contextKey && this.isConnected) {
      this._emitValue(next);
    } else this._finishGesture();
    input.value = String(this._level);
    // AT and other native inputs without a held range key are discrete edits.
    if (this._keys.size === 0) this._finishGesture();
  }

  private _onChange(event: Event): void {
    event.stopPropagation();
    if (this._keys.size === 0 && !this._pointer) this._finishGesture();
  }

  private _onClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  render() {
    const level = this._level;
    // Keep the drawing continuous; native input and its spoken value stay integer.
    const drawnLevel = Number.isFinite(this.value) ? Math.max(0, Math.min(100, this.value)) : 0;
    // A rail's track is inset 8px per side; its thumb centers on the fill's end.
    const rail = this.appearance === 'rail';
    const edge = this.appearance === 'edge';
    const fillStyle = rail
      ? `width: calc((100% - 16px) * ${drawnLevel / 100})`
      : `width: ${drawnLevel}%`;
    const markerStyle = rail
      ? `left: calc(1px + (100% - 16px) * ${drawnLevel / 100})`
      : edge
        ? `left: ${drawnLevel}%`
        : `left: clamp(8px, ${drawnLevel}%, calc(100% - 8px))`;
    // An edge's value sits beside its grip, on the left once the right runs out.
    const valueFitsRight =
      this._edgeWidth > 0
        ? ((100 - drawnLevel) / 100) * this._edgeWidth >= EDGE_VALUE_SPACE
        : drawnLevel <= 85;
    const valueStyle = !edge
      ? nothing
      : !valueFitsRight
        ? `right: calc(${100 - drawnLevel}% + 23px)`
        : `left: calc(${drawnLevel}% + 23px)`;
    return html`
      <div
        class="bar ${this.disabled ? 'disabled' : ''} ${this._pointer?.dragging ? 'dragging' : ''}"
      >
        <span class="fill" aria-hidden="true" style=${fillStyle}></span>
        <span class="marker" aria-hidden="true" style=${markerStyle}></span>
        <span class="content" aria-hidden="true">
          ${this.showLabel
            ? html`<span class="label"><slot name="label">${this.label}</slot></span>`
            : nothing}
          <span class="value" style=${valueStyle}>${this.displayValue || `${level}%`}</span>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          .value=${String(level)}
          ?disabled=${this.disabled}
          title=${this.tooltip || nothing}
          aria-label=${this.label}
          aria-valuetext=${this.valueText || this.displayValue || `${level}%`}
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerUp}
          @pointercancel=${this._onPointerCancel}
          @lostpointercapture=${this._onPointerCancel}
          @keydown=${this._onKeyDown}
          @keyup=${this._onKeyUp}
          @input=${this._onInput}
          @change=${this._onChange}
          @blur=${this._finishGesture}
          @click=${this._onClick}
        />
      </div>
    `;
  }
}

safeDefine('brightness-bar', BrightnessBar);

declare global {
  interface HTMLElementTagNameMap {
    'brightness-bar': BrightnessBar;
  }
}
