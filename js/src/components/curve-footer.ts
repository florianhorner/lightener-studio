import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { MOBILE_MEDIA } from '../utils/breakpoint-styles.js';
import { safeDefine } from '../utils/safe-define.js';
import { UI } from '../utils/strings.js';

/**
 * The editor's work commands. `commit` is Cancel and Save in the header's exit
 * slot; `undo` is Undo beside the shape chips. Both keep their footprint while
 * disabled, so neighbouring controls never move.
 */
export class CurveFooter extends LitElement {
  @property({ type: String }) variant: 'commit' | 'undo' = 'commit';
  @property({ type: Boolean }) dirty = false;
  @property({ type: Boolean }) saving = false;
  @property({ type: Boolean }) animating = false;
  @property({ type: Boolean }) canUndo = false;
  @property({ type: Boolean }) saveDisabled = false;

  static styles = css`
    :host {
      display: block;
      --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      white-space: nowrap;
    }
    button {
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 36px;
      padding: 0 14px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition:
        background 150ms ease,
        opacity 150ms ease;
    }
    button:disabled {
      opacity: 0.45;
      cursor: default;
    }
    button:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }
    /* Save is the one filled blue command; never the theme's accent. */
    .btn-save {
      min-width: 84px;
      border: 1px solid #2563eb;
      background: #2563eb;
      color: #fff;
    }
    .btn-save:hover:not(:disabled) {
      background: color-mix(in srgb, #2563eb 88%, #000);
    }
    .btn-cancel {
      border: 1px solid var(--divider);
      background: transparent;
      color: var(--primary-text-color, #212121);
    }
    .btn-cancel:hover:not(:disabled),
    .btn-undo:hover:not(:disabled) {
      background: color-mix(in srgb, var(--primary-text-color, #212121) 6%, transparent);
    }
    .btn-undo {
      padding: 0 10px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--primary-text-color, #212121);
    }
    .icon {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
    }
    /* Saving swaps the label for a spinner inside the same footprint. */
    .spinner {
      width: 14px;
      height: 14px;
      flex: 0 0 14px;
      box-sizing: border-box;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.45);
      border-top-color: #fff;
      animation: spin 0.8s linear infinite;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      button {
        transition: none;
      }
      .spinner {
        animation: none;
      }
    }
    @media ${MOBILE_MEDIA} {
      button {
        min-height: 44px;
      }
    }
  `;

  private _onSave() {
    this.dispatchEvent(new CustomEvent('save-curves', { bubbles: true, composed: true }));
  }

  private _onCancel() {
    this.dispatchEvent(new CustomEvent('cancel-curves', { bubbles: true, composed: true }));
  }

  private _onUndo() {
    this.dispatchEvent(new CustomEvent('undo-curves', { bubbles: true, composed: true }));
  }

  render() {
    if (this.variant === 'undo') {
      return html`<div class="footer">
        <button
          type="button"
          class="btn-undo"
          @click=${this._onUndo}
          ?disabled=${this.saving || !this.canUndo}
          aria-label="Undo"
        >
          <svg
            class="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M9 14 4 9l5-5"></path>
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"></path>
          </svg>
          <span class="label">${UI.footer.undo}</span>
        </button>
      </div>`;
    }

    return html`
      <div class="footer">
        <button
          type="button"
          class="btn-cancel"
          @click=${this._onCancel}
          ?disabled=${this.saving || this.animating}
          aria-label="Cancel changes"
        >
          ${UI.footer.cancel}
        </button>
        <button
          type="button"
          class="btn-save"
          @click=${this._onSave}
          ?disabled=${this.saving || this.animating || this.saveDisabled || !this.dirty}
          aria-label="Save changes (Ctrl+S)"
        >
          ${this.saving
            ? html`<span class="spinner" aria-hidden="true"></span
                ><span class="sr-only">${UI.footer.saving}</span>`
            : UI.footer.save}
        </button>
      </div>
    `;
  }
}

safeDefine('curve-footer', CurveFooter);

declare global {
  interface HTMLElementTagNameMap {
    'curve-footer': CurveFooter;
  }
}
