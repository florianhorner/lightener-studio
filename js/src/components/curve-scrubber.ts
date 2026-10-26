import { LitElement, html, css, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import type { LightCurve, ScrubberMove } from '../utils/types.js';
import type { LevelInputDetail } from './brightness-bar.js';
import { safeDefine } from '../utils/safe-define.js';
import { UI } from '../utils/strings.js';
import './brightness-bar.js';
import { previewToggleStyles, renderPreviewToggle } from './preview-toggle.js';

export class CurveScrubber extends LitElement {
  @property({ type: Array }) curves: LightCurve[] = [];
  @property({ type: Boolean }) readOnly = false;
  @property({ type: Boolean }) previewActive = false;
  @property({ type: Boolean }) canPreview = false;
  @property({ type: Boolean }) showPreviewToggle = true;
  @property({ type: Boolean }) dirty = false;
  @property({ type: Boolean }) example = false;
  @property({ type: Boolean }) invitation = false;
  @property({ type: Boolean }) firstUseHints = false;
  @property({ type: Boolean }) showLabel = true;
  @property({ type: Boolean }) alignToAxis = false;
  @property({ type: String }) contextKey = '';
  @property({ type: Number }) position: number | null = null;

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
    .preview-status {
      font-size: 11px;
      color: var(--accent);
      line-height: 1.4;
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

  private _onPreviewToggle(): void {
    if (!this.canPreview) return;
    this.dispatchEvent(new CustomEvent('preview-toggle', { bubbles: true, composed: true }));
  }

  render() {
    const position = Math.round(Math.min(100, Math.max(0, this.position ?? 50)));
    // Zero stays numeric; only its presentation reads Off.
    const shown = position === 0 ? UI.scrubber.off : `${position}%`;
    return html`
      <div class="scrubber-panel ${this.alignToAxis ? 'axis-aligned' : ''}">
        <brightness-bar
          .label=${UI.scrubber.sliderAria}
          .value=${position}
          .displayValue=${shown}
          .valueText=${shown}
          .showLabel=${this.showLabel}
          .disabled=${this.readOnly}
          .contextKey=${this.contextKey}
          @level-start=${() => this._emit('scrubber-start')}
          @level-input=${this._move}
          @level-end=${() => this._emit('scrubber-end')}
          ><span slot="label" class="scrubber-title">${UI.scrubber.title}</span></brightness-bar
        >
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
        ${this.previewActive && this.dirty
          ? html`<div class="preview-status" role="status">
              ${UI.scrubber.heldStatus} · ${UI.scrubber.heldStatusSave}
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
