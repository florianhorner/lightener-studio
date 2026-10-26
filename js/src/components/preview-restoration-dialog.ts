import { LitElement, css, html, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { UI } from '../utils/strings.js';
import { safeDefine } from '../utils/safe-define.js';
import type { LightValue, PreviewLight } from '../utils/preview-session.js';

export interface RestorationRow extends PreviewLight {
  current: LightValue | null;
  eligible: boolean;
}
function valueLabel(value: LightValue | null): string {
  return value === null
    ? UI.restoration.unavailable
    : typeof value === 'number'
      ? UI.restoration.brightness(value)
      : value === 'off'
        ? UI.restoration.off
        : UI.restoration.on;
}
/** Native modal owns focus and Escape. All restoration selections are deliberate. */
export class PreviewRestorationDialog extends LitElement {
  @property({ attribute: false }) rows: RestorationRow[] = [];
  @property({ type: Boolean }) actionable = false;
  @property({ type: String }) token = '';
  private _selected = new Set<string>();
  static styles = css`
    dialog {
      color: var(--primary-text-color, #ddd);
      background: var(--card-background-color, #1c1c1c);
      border: 1px solid var(--divider-color, #555);
      border-radius: 8px;
      width: min(560px, calc(100vw - 48px));
      max-height: calc(100dvh - 48px);
      box-sizing: border-box;
      padding: 20px;
      font: inherit;
    }
    dialog::backdrop {
      background: rgb(10 15 18 / 0.58);
    }
    h2 {
      margin: 0 0 12px;
      font-size: 20px;
    }
    p {
      font-size: 13px;
      line-height: 1.5;
    }
    ul {
      padding: 0;
      list-style: none;
    }
    li {
      padding: 12px 0;
      border-top: 1px solid var(--divider-color, #555);
      overflow-wrap: anywhere;
    }
    label {
      display: flex;
      gap: 8px;
      align-items: start;
    }
    small {
      display: block;
      margin: 4px 0;
      color: var(--secondary-text-color, #aaa);
    }
    footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: end;
      gap: 8px;
    }
    button {
      font: inherit;
      color: inherit;
      background: transparent;
      border: 1px solid var(--divider-color, #555);
      border-radius: 6px;
      min-height: 40px;
      padding: 8px;
    }
    button:disabled {
      opacity: 0.5;
    }
    input {
      flex: none;
    }
  `;
  protected firstUpdated(): void {
    this.renderRoot.querySelector('dialog')?.showModal();
  }
  private _close(): void {
    this.dispatchEvent(new CustomEvent('restoration-close'));
  }
  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('token')) this._selected.clear();
  }
  protected render() {
    return html`<dialog
      aria-labelledby="restoration-title"
      @cancel=${(event: Event) => {
        event.preventDefault();
        this._close();
      }}
    >
      <h2 id="restoration-title">${UI.restoration.title}</h2>
      <p>${UI.restoration.receiptHelp}</p>
      <p>${UI.restoration.overwriteHelp}</p>
      <ul>
        ${this.rows.map(
          (row) =>
            html`<li>
              <label
                ><input
                  type="checkbox"
                  ?disabled=${!this.actionable || !row.eligible}
                  .checked=${this._selected.has(row.entityId)}
                  @change=${(event: Event) => {
                    if ((event.target as HTMLInputElement).checked)
                      this._selected.add(row.entityId);
                    else this._selected.delete(row.entityId);
                    this.requestUpdate();
                  }}
                /><span
                  >${row.name}<small>${row.entityId}</small
                  ><small
                    >Prior: ${valueLabel(row.before)} · Current: ${valueLabel(row.current)}</small
                  ><small
                    >${UI.restoration.outcomes[row.outcome]}${row.pending
                      ? ` · ${UI.restoration.pending}`
                      : ''}</small
                  ></span
                ></label
              >
            </li>`
        )}
      </ul>
      <p>${UI.restoration.keepHelp}</p>
      <footer>
        <button @click=${() => this._close()}>${UI.restoration.close}</button
        ><button
          ?disabled=${!this.actionable}
          @click=${() =>
            this.dispatchEvent(
              new CustomEvent('restoration-keep', { detail: { token: this.token } })
            )}
        >
          ${UI.restoration.keep}</button
        ><button
          ?disabled=${!this.actionable || this._selected.size === 0}
          @click=${() =>
            this.dispatchEvent(
              new CustomEvent('restoration-restore', {
                detail: { token: this.token, selected: [...this._selected] },
              })
            )}
        >
          ${UI.restoration.restore}
        </button>
      </footer>
    </dialog>`;
  }
}
safeDefine('preview-restoration-dialog', PreviewRestorationDialog);
