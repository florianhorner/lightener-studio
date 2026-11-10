import { css } from 'lit';
import { MOBILE_MEDIA } from '../utils/breakpoint-styles.js';
import { previewToggleStyles } from '../components/preview-toggle.js';

/**
 * The editor's header controls, the shape chips and the message line under
 * Room brightness. Also installed in the panel's toolbar mount; selectors stay
 * local.
 */
export const editorCommandStyles = css`
  ${previewToggleStyles}
  /*
   * Chips, Watch and Undo sit under Room. Undo's header copy takes over from a
   * 640px shell (the panel's lightener-shell container); the chips' and Watch's
   * from 1100px. Dashboard cards have no such container, so exactly one of each
   * shows at any width.
   */
  .editor-toolbar .watch-anchor,
  .editor-toolbar .header-chips,
  .editor-toolbar .header-undo {
    display: none;
  }
  @container lightener-shell (min-width: 640px) {
    .editor-toolbar .header-undo {
      display: flex;
      align-items: center;
    }
    .card.hosted .edit-row > curve-footer,
    .card.hosted .edit-row:not(:has(.shape-chip-bar)) {
      display: none;
    }
  }
  @container lightener-shell (min-width: 1100px) {
    .editor-toolbar .watch-anchor {
      display: inline-flex;
    }
    .editor-toolbar .header-chips {
      display: flex;
      align-items: center;
    }
    .card.hosted .watch-under-room,
    .card.hosted .edit-row {
      display: none;
    }
  }
  /* View keeps Undo's place in the header, so Watch never moves. */
  .editor-toolbar .header-undo[data-reserved] {
    visibility: hidden;
  }
  .editor-toolbar .header-chips:empty {
    display: none;
  }
  /* Shape chips: a tiny signature of the shape and its short name. */
  .shape-chip-bar {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    min-width: 0;
    width: 100%;
  }
  .editor-toolbar .shape-chip-bar {
    grid-template-columns: repeat(4, 64px);
    width: auto;
  }
  .shape-chip {
    --_chip-accent: var(--accent, var(--primary-color, #2563eb));
    --_chip-divider: var(--divider, var(--divider-color, rgba(127, 127, 127, 0.2)));
    display: grid;
    grid-template-rows: 12px auto;
    align-content: center;
    gap: 4px;
    min-width: 0;
    min-height: 44px;
    padding: 6px 6px 5px;
    border: 1px solid var(--_chip-divider);
    border-radius: 8px;
    background: transparent;
    color: var(--primary-text-color, #212121);
    cursor: pointer;
    font: inherit;
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      box-shadow 0.15s ease;
  }
  .editor-toolbar .shape-chip {
    min-height: 36px;
    padding: 4px 6px 3px;
  }
  .shape-chip:hover {
    border-color: var(--_chip-accent);
    background: color-mix(in srgb, var(--_chip-accent) 4%, transparent);
  }
  .shape-chip.active,
  .shape-chip.trial {
    border-color: var(--_chip-accent);
    background: color-mix(in srgb, var(--_chip-accent) 8%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--_chip-accent) 35%, transparent);
  }
  .shape-chip:focus-visible {
    outline: 2px solid var(--_chip-accent);
    outline-offset: 2px;
  }
  .shape-chip-spark {
    display: block;
    justify-self: stretch;
    width: 100%;
    height: 12px;
    opacity: 0.85;
  }
  .shape-chip-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    color: var(--primary-text-color, #212121);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .shape-chip {
      transition: none;
    }
  }
  .editor-toolbar .preview-toggle-btn {
    box-sizing: border-box;
    flex: 0 1 auto;
    min-width: 0;
    min-height: 36px;
    padding: 6px 8px 6px 14px;
    gap: 10px;
    font-size: 14px;
    color: var(--primary-text-color, #212121);
  }
  .message-line .command-status {
    min-width: 0;
    font-size: 12px;
    line-height: 1.25;
  }
  .message-line .command-status [role='alert'] {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    color: var(--error-color, #db4437);
  }
  .message-line .command-status [role='status'] {
    color: var(--secondary-text-color, #616161);
  }
  .message-line .command-retry {
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
  .message-line button:focus-visible,
  .editor-toolbar button:focus-visible {
    outline: 2px solid var(--primary-color, #2563eb);
    outline-offset: 2px;
  }
  /* Header controls: chips, Watch and Undo (wide panel), the exit slot and ⋮, last. */
  .editor-toolbar {
    display: flex;
    flex: 0 1 auto;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    min-width: 0;
    min-height: 44px;
    font-family: inherit;
    color: var(--primary-text-color, #212121);
  }
  .editor-toolbar:focus {
    outline: none;
  }
  /* One footprint for Edit, Done, Cancel + Save and Saved, so Watch and ⋮ never move. */
  .exit-slot {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    min-width: 184px;
    min-height: 36px;
  }
  .exit-slot[data-state='empty'] {
    min-width: 0;
  }
  .exit-button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 14px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--primary-text-color, #212121);
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: background 150ms ease;
  }
  .exit-button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-text-color, #212121) 6%, transparent);
  }
  .exit-button:active:not(:disabled) {
    background: color-mix(in srgb, var(--primary-text-color, #212121) 10%, transparent);
  }
  .exit-button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  /* The pencil is a ghost pill reading Edit. */
  .edit-button {
    border-color: var(--divider-color, rgba(127, 127, 127, 0.2));
    border-radius: 18px;
  }
  /* Done and Save are the filled blue commands; never the theme's accent. */
  .exit-button.primary {
    border-color: #2563eb;
    background: #2563eb;
    color: #fff;
  }
  .exit-button.primary:hover:not(:disabled) {
    background: color-mix(in srgb, #2563eb 88%, #000);
  }
  .exit-icon {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
  }
  /* A confirmed save: a blue checkmark and Saved, briefly, then Edit. */
  .save-confirmed {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 6px;
    color: #2563eb;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
  }
  .more-anchor {
    position: relative;
    flex: 0 0 auto;
  }
  .more-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--primary-text-color, #212121);
    cursor: pointer;
  }
  .more-button svg {
    width: 20px;
    height: 20px;
  }
  .more-button:hover,
  .more-button[aria-expanded='true'] {
    background: color-mix(in srgb, var(--primary-text-color, #212121) 6%, transparent);
  }
  .more-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    min-width: 200px;
    padding: 6px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    border-radius: 12px;
    background: var(--ha-card-background, var(--card-background-color, #fff));
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
  }
  .more-item {
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--primary-text-color, #212121);
    font: inherit;
    font-size: 14px;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
  }
  .more-item:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-text-color, #212121) 6%, transparent);
  }
  .more-item:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .more-item.delete-group-btn {
    color: var(--error-color, #db4437);
  }
  .editor-toolbar .invitation-replay {
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
  .editor-toolbar .invitation-replay:disabled {
    opacity: 0.5;
    cursor: default;
  }
  @media (prefers-reduced-motion: reduce) {
    .exit-button {
      transition: none;
    }
  }
  /* Phones: 44px targets; the pencil may drop its word. The exit slot keeps its
     width, so entering Edit never reflows the header under a gesture. */
  @media ${MOBILE_MEDIA} {
    .exit-button,
    .more-button,
    .editor-toolbar .preview-toggle-btn {
      min-height: 44px;
    }
    .more-button {
      width: 44px;
      height: 44px;
    }
    .edit-button {
      width: 44px;
      padding: 0;
    }
    .edit-button .exit-label {
      display: none;
    }
  }
`;
