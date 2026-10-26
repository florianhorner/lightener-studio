import { css, html } from 'lit';
import { MOBILE_MEDIA } from '../utils/breakpoint-styles.js';
import { UI } from '../utils/strings.js';

/** One presentation for the room-preview control in either command location. */
export const previewToggleStyles = css`
  .preview-toggle-btn {
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
    min-height: 32px;
    padding: 5px 10px;
    border-radius: 8px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    background: transparent;
    color: var(--secondary-text, var(--secondary-text-color, #616161));
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }
  .preview-toggle-btn.active {
    color: var(--primary-color, #2563eb);
    border-color: currentColor;
  }
  .preview-toggle-btn:focus-visible {
    outline: 2px solid var(--primary-color, #2563eb);
    outline-offset: 2px;
  }
  .preview-toggle-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .preview-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .preview-eye {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
  }
  @media ${MOBILE_MEDIA} {
    .preview-toggle-btn {
      min-height: 44px;
    }
  }
`;

export function renderPreviewToggle(active: boolean, disabled: boolean, onToggle: () => void) {
  return html`<button
    type="button"
    class="preview-toggle-btn ${active ? 'active' : ''}"
    aria-pressed=${active}
    aria-description=${UI.scrubber.watchGuidance}
    ?disabled=${disabled}
    @click=${onToggle}
  >
    ${active
      ? html`<span class="preview-live-dot" aria-hidden="true"></span>${UI.scrubber.watchingPrefix}
          · ${UI.scrubber.watchingRestore}`
      : html`<svg
            class="preview-eye"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" /></svg
          >${UI.scrubber.watchButton}`}
  </button>`;
}
