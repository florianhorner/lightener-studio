import { LitElement, html, css, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { safeDefine } from '../utils/safe-define.js';
import { UI } from '../utils/strings.js';
import type { SaveReview } from '../utils/save-conflict.js';

/** Conditional local review. No requests, preview commands or live draft changes. */
export class SaveConflictReview extends LitElement {
  @property({ attribute: false }) review!: SaveReview;
  @state() private _choices: Record<string, boolean> = {};
  @state() private _acknowledged = false;
  private _onDialogKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === 'Escape') {
      // Keep native dialog cancellation, without handing Escape to the card's help.
      event.stopPropagation();
    }
  }
  private _mountGeneration = 0;
  private _finished = false;
  static styles = css`
    :host {
      display: contents;
    }
    dialog {
      width: min(600px, calc(100vw - 40px));
      max-height: calc(100dvh - 40px);
      overflow: auto;
      border: 1px solid var(--divider-color, #ddd);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #20252a);
      font: inherit;
      box-shadow: 0 24px 70px rgb(0 0 0 / 0.34);
      padding: 22px;
      box-sizing: border-box;
    }
    dialog::backdrop {
      background: rgb(10 15 18 / 0.58);
    }
    h2 {
      font-size: 20px;
      margin: 0;
    }
    p {
      font-size: 13px;
      line-height: 1.5;
      color: var(--secondary-text-color, #66717b);
    }
    .member {
      padding: 12px 0;
      border-top: 1px solid var(--divider-color, #ddd);
      overflow-wrap: anywhere;
    }
    .choices,
    footer {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 10px;
    }
    label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      min-height: 44px;
    }
    button {
      min-height: 44px;
      border: 1px solid var(--divider-color, #ddd);
      border-radius: 6px;
      background: transparent;
      color: var(--primary-color, #1590ad);
      font: inherit;
      padding: 0 12px;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    :focus-visible {
      outline: 2px solid var(--primary-color, #1590ad);
      outline-offset: 2px;
    }
  `;
  connectedCallback(): void {
    super.connectedCallback();
    const generation = ++this._mountGeneration;
    this._finished = false;
    void this.updateComplete.then(() => {
      if (!this.isConnected || generation !== this._mountGeneration || this._finished) return;
      this._openDialog();
    });
  }
  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('review')) {
      this._choices = {};
      this._acknowledged = false;
      this._finished = false;
    }
  }
  protected updated(changed: PropertyValues): void {
    if (changed.has('review')) this._openDialog();
  }
  private _openDialog(): void {
    if (!this.isConnected || this._finished) return;
    const dialog = this.renderRoot.querySelector('dialog');
    if (dialog && !dialog.open) {
      dialog.showModal();
      this.renderRoot.querySelector<HTMLElement>('h2')?.focus();
    }
  }
  disconnectedCallback(): void {
    this._mountGeneration++;
    this._finished = true;
    this.renderRoot.querySelector('dialog')?.close();
    super.disconnectedCallback();
  }
  private _finish(event: CustomEvent): void {
    if (this._finished) return;
    this._finished = true;
    this.renderRoot.querySelector('dialog')?.close();
    this.dispatchEvent(event);
  }
  private _close(): void {
    this._finish(new CustomEvent('review-dismiss'));
  }
  private _accept(saved: boolean): void {
    const keep = new Set(
      this.review.members
        .filter((member) => member.kind === 'unchanged' || this._choices[member.entityId] === true)
        .map((member) => member.entityId)
    );
    this._finish(
      new CustomEvent('review-accept', { detail: { keep: saved ? new Set<string>() : keep } })
    );
  }
  render() {
    if (!this.review) return html``;
    const removed = this.review.members.some((member) => member.kind === 'removed');
    const resolved = this.review.members.every(
      (member) => member.kind !== 'conflicting' || member.entityId in this._choices
    );
    return html`<dialog
      aria-labelledby="review-title"
      @keydown=${this._onDialogKeydown}
      @cancel=${(event: Event) => {
        event.preventDefault();
        this._close();
      }}
    >
      <h2 id="review-title" tabindex="-1">${UI.saveReview.title}</h2>
      <p>${UI.saveReview.body}</p>
      ${this.review.members.map(
        (member) =>
          html`<div class="member">
            <strong>${member.friendlyName}</strong>
            ${member.kind === 'conflicting'
              ? html`<div class="choices">
                  ${[true, false].map(
                    (keep) =>
                      html`<label
                        ><input
                          type="radio"
                          name=${member.entityId}
                          .checked=${this._choices[member.entityId] === keep}
                          @change=${() => {
                            this._choices = { ...this._choices, [member.entityId]: keep };
                          }}
                        />${keep ? UI.saveReview.keep : UI.saveReview.saved}</label
                      >`
                  )}
                </div>`
              : html`<p>
                  ${member.kind === 'removed'
                    ? UI.saveReview.removed
                    : member.kind === 'already-saved'
                      ? UI.saveReview.alreadySaved
                      : UI.saveReview.unchanged}
                </p>`}
          </div>`
      )}
      ${removed
        ? html`<label
            ><input
              type="checkbox"
              .checked=${this._acknowledged}
              @change=${(e: Event) => {
                this._acknowledged = (e.target as HTMLInputElement).checked;
              }}
            />${UI.saveReview.acknowledgeRemoved}</label
          >`
        : ''}
      <footer>
        <button @click=${() => this._close()}>${UI.saveReview.back}</button
        ><button ?disabled=${removed && !this._acknowledged} @click=${() => this._accept(true)}>
          ${UI.saveReview.useSaved}</button
        ><button
          ?disabled=${!resolved || (removed && !this._acknowledged)}
          @click=${() => this._accept(false)}
        >
          ${UI.saveReview.continue}
        </button>
      </footer>
    </dialog>`;
  }
}
safeDefine('save-conflict-review', SaveConflictReview);
