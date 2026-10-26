import { css } from 'lit';
import { MOBILE_MEDIA } from '../utils/breakpoint-styles.js';
import { previewToggleStyles } from '../components/preview-toggle.js';

/**
 * The action row and the help button. Also installed in the panel's
 * presentation mount, which holds only the help; selectors stay local.
 */
export const editorCommandStyles = css`
  ${previewToggleStyles}
  /* Watch on the left, then save status, Undo, Cancel and Save. */
  .editor-commands {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
    min-height: 44px;
    font-family: inherit;
    color: var(--primary-text-color, #212121);
    --secondary-text: var(--secondary-text-color, #616161);
  }
  .editor-commands:focus {
    outline: none;
  }
  .editor-commands .preview-toggle-btn {
    box-sizing: border-box;
    flex: 0 1 auto;
    min-width: 0;
    min-height: 44px;
    padding: 8px 12px;
    gap: 6px;
    font-size: 13px;
    color: var(--primary-text-color, #212121);
  }
  .editor-commands .preview-toggle-btn.active {
    color: var(--primary-color, #2563eb);
  }
  .editor-commands .preview-live-dot {
    flex: 0 0 6px;
  }
  .editor-commands .command-status {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 12px;
    line-height: 1.25;
    text-align: right;
  }
  .editor-commands .command-status [role='alert'] {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    color: var(--error-color, #db4437);
  }
  .editor-commands .command-status [role='status'] {
    color: var(--secondary-text);
  }
  .editor-commands .command-retry {
    flex: 0 0 auto;
    white-space: nowrap;
    font: inherit;
    color: var(--primary-color, #2563eb);
    background: transparent;
    border: 0;
    text-decoration: underline;
    cursor: pointer;
    padding: 4px;
    min-height: 44px;
  }
  .editor-commands curve-footer {
    flex: 0 0 auto;
  }
  .editor-commands button:focus-visible,
  .editor-help button:focus-visible {
    outline: 2px solid var(--primary-color, #2563eb);
    outline-offset: 2px;
  }
  /* Narrow: Watch and the status share a line; the edit commands take the
     next, with Undo apart from Cancel and Save. */
  @container lightener-card (max-width: 859.98px) {
    .editor-commands .preview-toggle-btn:not(.active) {
      padding-inline: 0;
      border-color: transparent;
    }
    .editor-commands curve-footer {
      flex: 1 1 100%;
    }
  }
  @media ${MOBILE_MEDIA} {
    .editor-commands .preview-toggle-btn {
      font-size: 14px;
    }
  }
  .editor-help {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    min-height: 44px;
  }
  .editor-help:focus {
    outline: none;
  }
  .editor-help .coach-help,
  .editor-help .invitation-replay {
    flex: 0 0 44px;
    box-sizing: border-box;
    width: 44px;
    min-width: 44px;
    height: 44px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    border-radius: 50%;
    font: inherit;
    color: var(--secondary-text-color, #616161);
    background: transparent;
    cursor: pointer;
    margin: 0;
  }
  .editor-help .coach-help:hover:not(:disabled),
  .editor-help .invitation-replay:hover:not(:disabled) {
    background: color-mix(in srgb, var(--secondary-text-color, #616161) 12%, transparent);
  }
  .editor-help .coach-help:disabled,
  .editor-help .invitation-replay:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .editor-help .canvas-help {
    flex: 0 0 auto;
    min-width: 44px;
    min-height: 44px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--primary-text-color, #212121);
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
  }
  .editor-help .canvas-help:hover {
    background: color-mix(in srgb, var(--secondary-text-color, #616161) 12%, transparent);
  }
`;
