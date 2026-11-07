import { css, html } from 'lit';
import { MOBILE_MEDIA } from '../utils/breakpoint-styles.js';
import { UI } from '../utils/strings.js';

/**
 * One presentation for the room-preview control in either command location:
 * a latched switch that stays on while the room follows the editor. Warm marks
 * real light in the room; the knob position and label carry the state too.
 */
export const previewToggleStyles = css`
  .preview-toggle-btn {
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
    min-height: 32px;
    padding: 5px 6px 5px 12px;
    border-radius: 999px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    background: transparent;
    color: var(--secondary-text, var(--secondary-text-color, #616161));
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition:
      background 150ms ease-out,
      border-color 150ms ease-out;
  }
  .preview-toggle-btn.active {
    color: var(--primary-text-color, #212121);
    border-color: color-mix(in srgb, var(--watch-warm, #ffb300) 70%, transparent);
    background: color-mix(in srgb, var(--watch-warm, #ffb300) 16%, transparent);
  }
  .preview-toggle-btn:focus-visible {
    outline: 2px solid var(--primary-color, #2563eb);
    outline-offset: 2px;
  }
  .preview-toggle-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .preview-track {
    position: relative;
    flex: 0 0 auto;
    box-sizing: border-box;
    width: 36px;
    height: 20px;
    border-radius: 999px;
    border: 1px solid currentColor;
    opacity: 0.85;
    transition:
      background 150ms ease-out,
      border-color 150ms ease-out;
  }
  .preview-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: currentColor;
    transition: transform 150ms ease-out;
  }
  .preview-toggle-btn.active .preview-track {
    background: var(--watch-warm, #ffb300);
    border-color: var(--watch-warm, #ffb300);
    opacity: 1;
  }
  .preview-toggle-btn.active .preview-knob {
    transform: translateX(16px);
    background: var(--card-background-color, #fff);
  }
  .watch-anchor {
    position: relative;
    display: inline-flex;
    min-width: 0;
  }
  /* Hangs under the header switch so showing or dismissing it never moves the layout. */
  .watch-hint {
    position: absolute;
    right: 0;
    top: calc(100% + 10px);
    z-index: 3;
    box-sizing: border-box;
    width: max-content;
    max-width: min(340px, 80vw);
    padding: 14px 16px 12px;
    border-radius: 16px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    background: var(--card-background-color, #fff);
    color: var(--secondary-text-color, #616161);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    font-size: 13px;
    line-height: 1.45;
    text-align: left;
  }
  /* On phones the note is a snackbar by the action row, on an inverse surface. */
  .watch-hint.snackbar {
    left: 0;
    right: 0;
    width: auto;
    max-width: none;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 8px 10px 16px;
    border: 0;
    background: var(--primary-text-color, #212121);
    color: color-mix(in srgb, var(--card-background-color, #fff) 82%, transparent);
  }
  .watch-hint.snackbar strong {
    color: var(--card-background-color, #fff);
  }
  .watch-hint.snackbar .watch-hint-actions {
    margin: 0 0 0 auto;
  }
  .watch-hint.snackbar .watch-hint-dismiss {
    border: 0;
    color: var(--card-background-color, #fff);
  }
  .watch-hint strong {
    color: var(--primary-text-color, #212121);
    font-weight: 500;
  }
  .watch-hint-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
  .watch-hint-dismiss {
    font: inherit;
    font-weight: 500;
    min-height: 36px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    background: transparent;
    color: var(--primary-text-color, #212121);
    cursor: pointer;
  }
  .watch-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .watch-dot {
    flex: 0 0 auto;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--watch-warm, #ffb300);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--watch-warm, #ffb300) 30%, transparent);
  }
  @media (prefers-reduced-motion: reduce) {
    .preview-toggle-btn,
    .preview-track,
    .preview-knob {
      transition: none;
    }
  }
  @media ${MOBILE_MEDIA} {
    .preview-toggle-btn {
      min-height: 44px;
    }
  }
`;

const WATCH_HINT_KEY = 'lightener:watch-hint:v1';
let watchHintDismissed = false;

/** True once the one-time Watch note was dismissed in this browser. */
export function hasDismissedWatchHint(): boolean {
  if (watchHintDismissed) return true;
  try {
    return localStorage.getItem(WATCH_HINT_KEY) !== null;
  } catch {
    return false;
  }
}

export function recordWatchHintDismissed(): void {
  watchHintDismissed = true;
  try {
    localStorage.setItem(WATCH_HINT_KEY, 'dismissed');
  } catch {
    // A blocked store must not repeat the note during this page's lifetime.
  }
}

/** Watch room react as a switch: on means the real lights follow every change. */
export function renderPreviewToggle(active: boolean, disabled: boolean, onToggle: () => void) {
  return html`<button
    type="button"
    role="switch"
    class="preview-toggle-btn ${active ? 'active' : ''}"
    aria-checked=${active ? 'true' : 'false'}
    aria-description=${UI.scrubber.watchGuidance}
    ?disabled=${disabled}
    @click=${onToggle}
  >
    <span class="preview-label">${UI.scrubber.watchButton}</span
    ><span class="preview-track" aria-hidden="true"><span class="preview-knob"></span></span>
  </button>`;
}

/**
 * The one-time note shown while Watch is on: a popover under the switch, or a
 * snackbar on phones that also leaves after a few seconds.
 */
export function renderWatchHint(onDismiss: () => void, snackbar = false) {
  return html`<div class="watch-hint ${snackbar ? 'snackbar' : ''}" role="note">
    <span><strong>${UI.scrubber.watchHintTitle}</strong> ${UI.scrubber.watchHintBody}</span>
    <div class="watch-hint-actions">
      <button type="button" class="watch-hint-dismiss" @click=${onDismiss}>
        ${UI.scrubber.watchHintDismiss}
      </button>
    </div>
  </div>`;
}

/** One watching status, a dot and words; with unsaved changes it also says what Save keeps. */
export function renderWatchStatus(dirty = false) {
  return html`<span class="watch-status" role="status"
    ><span class="watch-dot" aria-hidden="true"></span>${dirty
      ? UI.scrubber.watchingHeldStatus
      : UI.scrubber.watchingStatus}</span
  >`;
}
