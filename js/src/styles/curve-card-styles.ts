import { css } from 'lit';
import { MOBILE_MEDIA } from '../utils/breakpoint-styles.js';
import { VB_W, VB_H, EDITOR_GRAPH_MAX_HEIGHT } from '../utils/graph-math.js';
import { FIRST_USE_TIMING } from '../utils/motion.js';

// Shared with the card's CSS.registerProperty fallback.
export const DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX = EDITOR_GRAPH_MAX_HEIGHT;
// The graph sits directly on the card surface, without an inner panel inset.
const GRAPH_PANEL_INLINE_PADDING_PX = 0;
const CURVE_STACK_DEFAULT_MAX_WIDTH_PX = Number(
  (DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX * (VB_W / VB_H) + GRAPH_PANEL_INLINE_PADDING_PX).toFixed(2)
);

export const curveCardStyles = css`
  @property --curve-graph-max-height {
    syntax: '<length-percentage>';
    inherits: true;
    initial-value: ${DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX}px;
  }
  :host {
    --card-bg: var(--ha-card-background, var(--card-background-color, #fff));
    --text-color: var(--primary-text-color, #212121);
    --secondary-text: var(--secondary-text-color, #616161);
    --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
    --accent: var(--primary-color, #2563eb);
    --graph-bg: var(--card-background-color, var(--ha-card-background, #fafafa));
    --panel-bg: color-mix(in srgb, var(--card-bg) 95%, var(--secondary-text, #616161) 5%);
    --text-xs: 9px;
    --text-sm: 12px;
    --text-md: 13px;
    --text-lg: 14px;
    --curve-stack-default-max-width: ${CURVE_STACK_DEFAULT_MAX_WIDTH_PX}px;
    container: lightener-card-shell / inline-size;
    display: block;
    font-family: var(
      --mdc-typography-body1-font-family,
      var(--paper-font-body1_-_font-family, 'Roboto', sans-serif)
    );
    height: fit-content;
  }
  .card {
    --_graph-panel-padding: 0px;
    /* Resolve the cap and padding together here: inherited computed custom
         properties would otherwise retain the wider padding in compact cards.
         The registered graph-height property preserves invalid-value fallback. */
    --curve-stack-max-width: calc(
      var(--curve-graph-max-height, ${DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX}px) * ${VB_W / VB_H} + 2 *
        var(--_graph-panel-padding)
    );
    /* Layout keys on the card's own width, not the viewport, so the
         Lovelace card and the sidebar panel behave identically at the same
         size (the viewport-keyed embedded-only rules made them diverge). */
    container: lightener-card / inline-size;
    background: var(--card-bg);
    border-radius: var(--ha-card-border-radius, 16px);
    box-shadow: var(
      --ha-card-box-shadow,
      0 1px 3px rgba(0, 0, 0, 0.08),
      0 8px 24px rgba(0, 0, 0, 0.06)
    );
    padding: 20px;
    color: var(--text-color);
  }
  /* The sidebar page supplies the surface and spacing. */
  .card.embedded {
    padding: 0;
    background: transparent;
    box-shadow: none;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .header > h2 {
    flex: 1 1 160px;
  }
  .header > .editor-help {
    margin-left: auto;
  }
  h2 {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .workspace {
    display: grid;
    gap: 8px;
    /* Keep ordinary editor layers below HA chrome, without trapping the
       sibling membership dialog or changing fixed-position geometry. */
    isolation: isolate;
  }
  .editor-column {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
  }
  .main-stack,
  .side-rail,
  .status-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .main-stack {
    /* The graph and its room control share a width cap. The plot transform
         also sets the Room bar's insets when a custom height letterboxes the SVG. */
    width: 100%;
    max-width: min(100%, var(--curve-stack-max-width));
    margin-inline: auto;
    gap: 4px;
  }
  .side-rail {
    gap: 10px;
  }
  /* One line names the light being shaped and clears the selection. */
  .context-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 44px;
    min-width: 0;
  }
  .context-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-lg);
    font-weight: 550;
  }
  .context-name.all {
    color: var(--secondary-text);
    font-size: var(--text-md);
    font-weight: 500;
  }
  .context-clear {
    flex: none;
    min-height: 44px;
    padding: 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--secondary-text);
    font: inherit;
    font-size: var(--text-sm);
    cursor: pointer;
  }
  .context-clear:hover {
    background: color-mix(in srgb, var(--secondary-text) 12%, transparent);
    color: var(--text-color);
  }
  .context-clear:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  /* Show me how: the example's guidance takes the same line. */
  .canvas-guidance {
    justify-content: flex-start;
    gap: 4px;
  }
  .canvas-guidance-text {
    flex: 1;
    min-width: 0;
    margin-right: 4px;
    color: var(--secondary-text);
    font-size: var(--text-sm);
    line-height: 1.4;
  }
  .canvas-guidance-action {
    flex: none;
    min-width: 44px;
    min-height: 44px;
    padding: 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text-color);
    font: inherit;
    font-size: var(--text-sm);
    font-weight: 550;
    cursor: pointer;
  }
  .canvas-guidance-action:hover {
    background: color-mix(in srgb, var(--secondary-text) 12%, transparent);
  }
  .canvas-guidance-action:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .graph-panel {
    container: lightener-graph-panel / inline-size;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: var(--_graph-panel-padding);
    background: transparent;
  }
  .control-slot {
    min-width: 0;
  }
  .control-dock {
    width: 100%;
    max-width: min(100%, var(--curve-stack-max-width));
    margin-inline: auto;
  }
  .room-surface {
    padding: 0 0 14px;
  }
  .room-surface:empty {
    display: none;
  }
  /* Watch, status and Undo, Cancel and Save, directly under Room brightness. */
  .footer-slot {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    padding-top: 10px;
    border-top: 1px solid var(--divider);
  }
  .footer-slot[data-overlay] {
    position: fixed;
    left: var(--curve-footer-overlay-left, 0px);
    right: auto;
    bottom: var(--curve-footer-overlay-bottom, env(safe-area-inset-bottom, 0px));
    width: var(--curve-footer-overlay-width, 100vw);
    z-index: 10;
    padding-bottom: 8px;
    background: var(--card-bg);
    background: color-mix(in srgb, var(--card-bg) 88%, transparent);
    backdrop-filter: blur(14px);
  }
  .invitation-replay {
    margin-left: auto;
    min-width: 44px;
    min-height: 44px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--secondary-text);
    font: inherit;
    font-size: 24px;
    cursor: pointer;
  }
  .invitation-replay:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .invitation-replay:focus-visible {
    outline: 2px solid var(--accent);
  }
  .first-use-experiment .invitation-insight {
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 3px;
  }
  .first-use-experiment .invitation-insight .graph-insight-secondary {
    text-align: left;
    white-space: nowrap;
    animation: invitation-appear ${FIRST_USE_TIMING.cueFade}ms ease-out both;
  }
  @keyframes invitation-appear {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .first-use-experiment .invitation-insight .graph-insight-secondary {
      animation: none;
    }
  }
  .card .shape-chip.invitation-chip {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    box-shadow: inset 0 0 0 1px var(--accent);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  /* Shapes on the left and one quiet line beside them. The fixed row keeps
       the graph still while chips, trials and tips come and go. */
  .graph-workbench {
    display: grid;
    grid-template-columns: minmax(0, min(300px, 50%)) minmax(0, 1fr);
    grid-template-rows: 44px;
    column-gap: 16px;
    align-items: center;
    min-width: 0;
  }
  .graph-workbench > .graph-insight,
  .graph-workbench > .coach-prompt {
    grid-column: 2;
    grid-row: 1;
  }
  /* With no light selected, the line uses the whole row. */
  .graph-workbench:has(.shape-chip-reserve) > .graph-insight,
  .graph-workbench:has(.shape-chip-reserve) > .coach-prompt {
    grid-column: 1 / -1;
  }
  /* The context line already names the selected light. */
  .graph-workbench.has-selection > .graph-insight:not(.trial):not(.invitation-insight) {
    visibility: hidden;
  }
  .graph-insight {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    min-height: 18px;
    color: var(--secondary-text);
  }
  .graph-insight-primary {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-sm);
    font-weight: 450;
    line-height: 18px;
  }
  .graph-insight.trial .graph-insight-primary {
    color: var(--accent);
  }
  .graph-insight-secondary {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--secondary-text);
    font-size: 11px;
    line-height: 1.25;
  }
  .shape-chip-bar {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    grid-column: 1;
    grid-row: 1;
    min-width: 0;
    width: 100%;
  }
  /* Empty stand-in shown when no light is selected: reserves the chip row's
       footprint so the graph never shifts as the chips appear and disappear.
       Kept as its own class, not .shape-chip-bar, so "is the chip bar
       present?" checks still mean the real, interactive chips. */
  .shape-chip-reserve {
    grid-column: 1;
    grid-row: 1;
    min-height: 44px;
    width: 100%;
    pointer-events: none;
  }
  .shape-chip {
    display: grid;
    grid-template-rows: 12px auto;
    align-content: center;
    gap: 4px;
    min-width: 0;
    min-height: 44px;
    padding: 6px 6px 5px;
    border: 1px solid var(--divider);
    border-radius: 8px;
    background: transparent;
    color: var(--text-color);
    cursor: pointer;
    font: inherit;
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      box-shadow 0.15s ease;
  }
  .shape-chip:hover {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 4%, transparent);
  }
  .shape-chip.active,
  .shape-chip.trial {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
  }
  .shape-chip:focus-visible {
    outline: 2px solid var(--accent);
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
    color: var(--text-color);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }
  .card.embedded .header {
    margin-bottom: 12px;
    padding-inline: 2px;
  }
  .card.embedded h2 {
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    color: var(--secondary-text);
  }
  .error {
    font-size: var(--text-sm);
    color: var(--error-color, #db4437);
    padding: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .error .retry-link {
    cursor: pointer;
    text-decoration: underline;
    opacity: 0.8;
    background: none;
    border: none;
    font: inherit;
    color: inherit;
    padding: 0;
  }
  .error .retry-link:hover {
    opacity: 1;
  }
  .success {
    font-size: var(--text-sm);
    color: var(--accent);
    padding: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    animation: success-fade 2s ease forwards;
  }
  @keyframes success-fade {
    0% {
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    70% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  .status-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
  .loading-indicator {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 282px;
    gap: 10px;
    padding: 14px;
    border-radius: 12px;
    background: var(--panel-bg);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .loading-graph {
    position: relative;
    min-height: 242px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--divider) 72%, transparent);
    background:
      linear-gradient(
        90deg,
        transparent,
        color-mix(in srgb, var(--text-color) 8%, transparent),
        transparent
      ),
      linear-gradient(
        color-mix(in srgb, var(--secondary-text) 11%, transparent) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--secondary-text) 11%, transparent) 1px,
        transparent 1px
      ),
      var(--graph-bg);
    background-size:
      180px 100%,
      100% 25%,
      25% 100%,
      auto;
    background-position:
      -180px 0,
      0 0,
      0 0,
      0 0;
    animation: shimmer 1.8s ease-in-out infinite;
  }
  .loading-graph::before {
    content: '';
    position: absolute;
    inset: 18px 18px 18px 28px;
    border-left: 1px solid color-mix(in srgb, var(--secondary-text) 24%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--secondary-text) 24%, transparent);
    border-radius: 0 0 0 6px;
  }
  .loading-curve {
    position: absolute;
    left: 44px;
    right: 34px;
    height: 64px;
    border-radius: 999px;
    opacity: 0.48;
    transform-origin: bottom;
    clip-path: polygon(0% 78%, 18% 76%, 38% 48%, 60% 22%, 80% 28%, 100% 8%, 100% 100%, 0 100%);
    animation: loading-curve-rise 1.8s ease-in-out infinite;
  }
  .loading-curve.primary {
    bottom: 52px;
    background: linear-gradient(
      120deg,
      color-mix(in srgb, var(--accent) 10%, transparent),
      color-mix(in srgb, var(--accent) 42%, transparent) 45%,
      color-mix(in srgb, var(--accent) 14%, transparent)
    );
  }
  .loading-curve.warm {
    bottom: 36px;
    background: linear-gradient(
      120deg,
      color-mix(in srgb, #d97706 8%, transparent),
      color-mix(in srgb, #d97706 26%, transparent) 48%,
      color-mix(in srgb, #d97706 10%, transparent)
    );
    opacity: 0.36;
    transform: scaleY(0.74);
    animation-delay: 0.16s;
  }
  .loading-curve.cool {
    bottom: 78px;
    background: linear-gradient(
      120deg,
      color-mix(in srgb, #0f766e 8%, transparent),
      color-mix(in srgb, #0f766e 24%, transparent) 48%,
      color-mix(in srgb, #0f766e 10%, transparent)
    );
    opacity: 0.32;
    transform: scaleY(0.56);
    animation-delay: 0.28s;
  }
  .loading-point {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 64%, var(--graph-bg));
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 10%, transparent);
    opacity: 0.62;
    animation: loading-point-pulse 1.8s ease-in-out infinite;
  }
  .loading-point.one {
    left: 32%;
    bottom: 116px;
  }
  .loading-point.two {
    left: 58%;
    bottom: 148px;
    animation-delay: 0.14s;
  }
  .loading-point.three {
    left: 80%;
    bottom: 142px;
    animation-delay: 0.28s;
  }
  .loading-caption {
    font-size: var(--text-sm);
    color: var(--secondary-text);
    padding-inline: 2px;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes shimmer {
    0% {
      background-position:
        -180px 0,
        0 0,
        0 0,
        0 0;
    }
    100% {
      background-position:
        calc(100% + 180px) 0,
        0 0,
        0 0,
        0 0;
    }
  }
  @keyframes loading-curve-rise {
    0%,
    100% {
      opacity: 0.34;
    }
    50% {
      opacity: 0.58;
    }
  }
  @keyframes loading-point-pulse {
    0%,
    100% {
      opacity: 0.38;
      transform: scale(0.92);
    }
    50% {
      opacity: 0.72;
      transform: scale(1);
    }
  }
  /* Wide card: graph, Room brightness and the action row on the left, the
       light list on the right. Narrow card: the same order stacked, with the
       list last. Both are container queries on the card's own width, so the
       Lovelace card and the sidebar panel match at the same size. */
  @container lightener-card (min-width: 860px) {
    .workspace {
      grid-template-columns: minmax(0, 1.3fr) minmax(300px, 0.9fr);
      align-items: start;
      column-gap: 32px;
    }
  }
  @container lightener-card (max-width: 859.98px) {
    .graph-panel {
      gap: 8px;
    }
    .context-name {
      font-size: var(--text-md);
    }
    /* The line sits above the chips; its row also fits a two-line tip. */
    .graph-workbench {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: 32px 44px;
      row-gap: 6px;
    }
    .graph-workbench > .graph-insight,
    .graph-workbench > .coach-prompt {
      grid-column: 1;
      grid-row: 1;
    }
    .shape-chip-bar,
    .shape-chip-reserve {
      grid-row: 2;
      width: min(100%, 300px);
    }
  }
  /* Tips share the workbench line: a title and up to two short lines. */
  .coach-prompt {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--primary-text-color, #212121);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.2;
  }
  .coach-copy {
    flex: 1;
    min-width: 0;
  }
  .coach-copy strong,
  .coach-copy span {
    display: block;
  }
  .coach-copy span {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    color: var(--secondary-text-color, #616161);
    font-size: 11px;
    font-weight: 400;
    line-height: 1.2;
  }
  .coach-dismiss:focus-visible {
    outline: 2px solid var(--primary-color, #1590ad);
    outline-offset: 2px;
  }
  .coach-prompt::before {
    content: '';
    width: 7px;
    height: 7px;
    flex: 0 0 7px;
    border-radius: 50%;
    background: var(--primary-color, #1590ad);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color, #1590ad) 14%, transparent);
  }
  .coach-dismiss {
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    /* The graph column has no inset, so the target stays inside it. */
    margin: -8px 0 -8px auto;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--secondary-text-color, #616161);
    font: 18px/1 sans-serif;
    cursor: pointer;
  }
  .coach-dismiss:hover {
    background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
  }
  .context-line:focus {
    outline: none;
  }
  .context-line:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 8px;
  }
  @container lightener-card-shell ${MOBILE_MEDIA} {
    .card {
      padding: 12px;
    }
    .header,
    .card.embedded .header {
      margin-bottom: 8px;
    }
    .side-rail,
    .status-stack {
      gap: 8px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .loading-graph,
    .loading-curve,
    .loading-point {
      animation: none;
    }
  }
`;
