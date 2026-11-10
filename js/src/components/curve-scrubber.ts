import { LitElement, html, css, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import type { LightCurve, ScrubberMove } from '../utils/types.js';
import { sampleCurveAt } from '../utils/graph-math.js';
import type { LevelInputDetail } from './brightness-bar.js';
import { safeDefine } from '../utils/safe-define.js';
import { UI } from '../utils/strings.js';
import './brightness-bar.js';
import { previewToggleStyles, renderPreviewToggle } from './preview-toggle.js';

export class CurveScrubber extends LitElement {
  @property({ type: Array }) curves: LightCurve[] = [];
  @property({ type: Boolean }) readOnly = false;
  @property({ type: Boolean }) previewActive = false;
  /** While watching, unsaved changes say what Save keeps. */
  @property({ type: Boolean }) watchingDraft = false;
  @property({ type: Boolean }) canPreview = false;
  @property({ type: Boolean }) showPreviewToggle = true;
  @property({ type: Boolean }) example = false;
  @property({ type: Boolean }) exampleMoving = false;
  @property({ type: Boolean }) invitation = false;
  @property({ type: Boolean }) firstUseHints = false;
  @property({ type: Boolean }) alignToAxis = false;
  @property({ type: String }) contextKey = '';
  @property({ type: Number }) position: number | null = null;
  /** A temporary demonstration must never seed a real gesture. */
  @property({ type: Number }) interactionPosition: number | null = null;

  static styles = css`
    ${previewToggleStyles}
    :host {
      display: block;
      min-width: 0;
      --accent: var(--primary-color, #2563eb);
    }
    .scrubber-panel {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .axis-aligned {
      margin-left: var(--room-axis-left, 0px);
      margin-right: var(--room-axis-right, 0px);
    }
    brightness-bar {
      --bar-color: var(--secondary-text-color, #616161);
    }
    /* Watch is on: the grip takes the warm colour of the edge above it. */
    .watching brightness-bar {
      --edge-color: var(--watch-warm, #ffb300);
    }
    .demonstrating brightness-bar {
      --edge-color: var(--primary-color, #03a9f4);
    }
    .scrubber-header {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      min-width: 0;
    }
    .invitation-caption {
      margin-right: auto;
      color: var(--secondary-text-color, #616161);
      font-size: 11px;
    }
    /* What the room shows at this position, with the owner's Watch switch at its end. */
    .meaning-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .meaning-line {
      flex: 1 1 auto;
      min-width: 0;
      min-height: 18px;
      color: var(--secondary-text-color, #616161);
      font-size: 12px;
      line-height: 18px;
    }
    .watch-dot {
      margin-right: 4px;
      color: var(--watch-warm, #ffb300);
    }
    ::slotted([slot='watch']) {
      flex: 0 0 auto;
      margin-left: auto;
    }
  `;

  private _emit(type: 'scrubber-start' | 'scrubber-end'): void {
    if (this.readOnly && type === 'scrubber-start') return;
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true }));
  }

  private _move(event: CustomEvent<LevelInputDetail>): void {
    if (this.readOnly || !Number.isFinite(event.detail.value)) return;
    const position = Math.min(100, Math.max(0, event.detail.value));
    this.dispatchEvent(
      new CustomEvent<ScrubberMove>('scrubber-move', {
        detail: { position },
        bubbles: true,
        composed: true,
      })
    );
  }

  /** A press on the graph's Room edge drags this control. */
  public grab(event: PointerEvent): void {
    if (!this.readOnly) this.renderRoot.querySelector('brightness-bar')?.grab(event);
  }

  /** Help on demand: the grip shows it can be dragged, without changing Room brightness. */
  public playGripHint(delay = 0): void {
    if (!this.readOnly) this.renderRoot.querySelector('brightness-bar')?.playHint(delay);
  }

  public cancelGripHint(): void {
    this.renderRoot.querySelector('brightness-bar')?.cancelHint();
  }

  /** Every member light counts; a light is on above 0%. */
  private _meaning(position: number): string {
    const count = this.curves.length;
    const on = this.curves.filter(
      (curve) => sampleCurveAt(curve.controlPoints, position) > 0
    ).length;
    const text =
      on === count
        ? UI.scrubber.meaningAll(count)
        : on === 0
          ? UI.scrubber.meaningNone(count)
          : UI.scrubber.meaningSome(on, count);
    return text;
  }

  /** Watching lives in this line: a dot and one status, with what Save keeps once changed. */
  private _renderMeaning(position: number) {
    if (!this.previewActive) return this._meaning(position);
    return html`<span class="watch-status" role="status"
        ><span class="watch-dot" aria-hidden="true">●</span>${this.watchingDraft
          ? UI.scrubber.watchingHeldStatus
          : UI.scrubber.meaningFollowing}</span
      >${this.watchingDraft ? nothing : ` · ${this._meaning(position)}`}`;
  }

  private _onPreviewToggle(): void {
    if (!this.canPreview) return;
    this.dispatchEvent(new CustomEvent('preview-toggle', { bubbles: true, composed: true }));
  }

  render() {
    const position = Math.min(100, Math.max(0, this.position ?? 50));
    // Zero stays numeric; only its presentation reads Off.
    const shown = position === 0 ? UI.scrubber.off : `${Math.round(position)}%`;
    return html`
      <div
        class="scrubber-panel ${this.exampleMoving ? 'demonstrating' : ''} ${this.alignToAxis
          ? 'axis-aligned'
          : ''} ${this.previewActive ? 'watching' : ''}"
      >
        <brightness-bar
          appearance="edge"
          .label=${UI.scrubber.sliderAria}
          .tooltip=${UI.scrubber.title}
          .value=${position}
          .interactionValue=${this.interactionPosition}
          .displayValue=${shown}
          .valueText=${shown}
          .showLabel=${false}
          .disabled=${this.readOnly}
          .contextKey=${this.contextKey}
          @level-start=${() => this._emit('scrubber-start')}
          @level-input=${this._move}
          @level-end=${() => this._emit('scrubber-end')}
        ></brightness-bar>
        ${(this.canPreview && this.showPreviewToggle) || this.firstUseHints
          ? html`<div class="scrubber-header">
              ${this.firstUseHints
                ? html`<span class="invitation-caption"
                    >${this.invitation
                      ? UI.invitation.together
                      : this.example
                        ? UI.invitation.example
                        : nothing}</span
                  >`
                : nothing}
              ${this.canPreview && this.showPreviewToggle
                ? renderPreviewToggle(this.previewActive, false, () => this._onPreviewToggle())
                : nothing}
            </div>`
          : nothing}
        ${this.curves.length > 0
          ? html`<div class="meaning-row">
              <div class="meaning-line">${this._renderMeaning(position)}</div>
              <slot name="watch"></slot>
            </div>`
          : nothing}
      </div>
    `;
  }
}

safeDefine('curve-scrubber', CurveScrubber);

declare global {
  interface HTMLElementTagNameMap {
    'curve-scrubber': CurveScrubber;
  }
}
