import { css } from 'lit';
import { previewToggleStyles } from '../components/preview-toggle.js';

/** Also installed in the panel's presentation mount; selectors stay local to the commands. */
export const editorCommandStyles = css`
  ${previewToggleStyles}
  .editor-commands {
    display: flex;
    flex: 0 0 auto;
    width: max-content;
    align-items: center;
    gap: 8px;
    min-height: 56px;
    white-space: nowrap;
    font-family: inherit;
    color: var(--primary-text-color, #212121);
    --secondary-text: var(--secondary-text-color, #616161);
  }
  .editor-commands .preview-toggle-btn {
    box-sizing: border-box;
    flex: 0 0 180px;
    width: 180px;
    min-width: 180px;
    min-height: 44px;
  }
  .editor-commands curve-footer {
    flex: 0 0 auto;
  }
  .editor-commands .command-status {
    flex: 0 0 104px;
    width: 104px;
    min-width: 104px;
    font-size: 12px;
    line-height: 1.25;
    white-space: normal;
  }
  .editor-commands .command-status [role='alert'] {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    color: var(--error-color, #db4437);
  }
  .editor-commands .command-status [role='status'] {
    color: var(--secondary-text);
  }
  .editor-commands .command-retry {
    font: inherit;
    color: var(--primary-color, #2563eb);
    background: transparent;
    border: 0;
    text-decoration: underline;
    cursor: pointer;
    padding: 4px;
    min-height: 44px;
  }
  .editor-commands .coach-help,
  .editor-commands .invitation-replay {
    flex: 0 0 44px;
    box-sizing: border-box;
    width: 44px;
    min-width: 44px;
    height: 44px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    border-radius: 50%;
    font: inherit;
    color: var(--secondary-text);
    background: transparent;
    cursor: pointer;
    margin: 0;
  }
  .editor-commands .coach-help:disabled,
  .editor-commands .invitation-replay:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .editor-commands button:focus-visible {
    outline: 2px solid var(--primary-color, #2563eb);
    outline-offset: 2px;
  }
`;
