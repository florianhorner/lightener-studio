import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { safeDefine } from '../utils/safe-define.js';

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
  /** Authoritative edit baseline when `value` presents a temporary example. */
  @property({ type: Number }) interactionValue: number | null = null;
  @property({ type: String }) displayValue = '';
  @property({ type: String }) valueText = '';
  @property({ type: String }) tooltip = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) showLabel = true;
  /** Change when the owner replaces the entity, room coordinate, or view. */
  @property({ type: String }) contextKey = '';

  private _pointer: PointerGesture | null = null;
  private _keys = new Set<string>();
  private _keyContext: string | null = null;
  private _editing = false;

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
      border-radius: 12px;
      overflow: hidden;
      color: var(--primary-text-color, #212121);
      background: color-mix(
        in srgb,
        var(--secondary-text-color, #616161) 11%,
        var(--card-background-color, #fff)
      );
      user-select: none;
      -webkit-user-select: none;
    }
    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      max-width: 100%;
      border-radius: 12px 0 0 12px;
      background: color-mix(
        in srgb,
        var(--bar-color, var(--secondary-text-color, #616161)) 30%,
        var(--card-background-color, #fff)
      );
      pointer-events: none;
    }
    .marker {
      position: absolute;
      top: 8px;
      bottom: 8px;
      width: 3px;
      border-radius: 2px;
      background: var(--primary-text-color, #212121);
      opacity: 0.45;
      pointer-events: none;
    }
    .content {
      position: absolute;
      inset: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0 16px;
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
      margin-left: auto;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
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
      box-shadow: inset 0 0 0 1px
        color-mix(in srgb, var(--bar-color, var(--secondary-text-color, #616161)) 55%, transparent);
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
  `;

  private get _level(): number {
    return Number.isFinite(this.value) ? Math.round(Math.max(0, Math.min(100, this.value))) : 0;
  }

  private get _interactionLevel(): number {
    const value = this.interactionValue ?? this.value;
    return Number.isFinite(value) ? Math.round(Math.max(0, Math.min(100, value))) : 0;
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('blur', this._onWindowBlur);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  disconnectedCallback(): void {
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

  private _onPointerDown(event: PointerEvent): void {
    if (this.disabled || this._pointer || !event.isPrimary || event.button !== 0) return;
    const input = event.currentTarget as HTMLInputElement;
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
    const value = Math.round(
      Math.max(
        0,
        Math.min(100, pointer.startValue + (100 * (event.clientX - pointer.x)) / pointer.width)
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
      (event.currentTarget as HTMLInputElement).value = String(this._interactionLevel);
    }
    this._keyContext = this.contextKey;
    this._keys.add(event.key);
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
    return html`
      <div
        class="bar ${this.disabled ? 'disabled' : ''} ${this._pointer?.dragging ? 'dragging' : ''}"
      >
        <span class="fill" aria-hidden="true" style=${`width: ${level}%`}></span>
        <span
          class="marker"
          aria-hidden="true"
          style=${`left: clamp(5px, calc(${level}% - 2px), calc(100% - 8px))`}
        ></span>
        <span class="content" aria-hidden="true">
          ${this.showLabel
            ? html`<span class="label"><slot name="label">${this.label}</slot></span>`
            : nothing}
          <span class="value">${this.displayValue || `${level}%`}</span>
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
