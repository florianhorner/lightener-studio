import { css } from 'lit';
import { MOBILE_MEDIA } from '../utils/breakpoint-styles.js';
import { VB_W, VB_H } from '../utils/graph-math.js';
import { FIRST_USE_TIMING } from '../utils/motion.js';

// Shared with the card's CSS.registerProperty fallback.
export const DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX = 320;
const GRAPH_PANEL_INLINE_PADDING_PX = 28;
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
    --_graph-panel-padding: 14px;
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
  .card.embedded {
    box-shadow: none;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }
  h2 {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .workspace {
    display: grid;
    gap: 12px;
  }
  .editor-column {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .main-stack,
  .side-rail,
  .footer-slot,
  .status-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .main-stack {
    /* Cap the graph + scrubber stack at the graph's maximum rendered width
         (height cap x viewBox aspect ratio + panel padding) and center it as
         one unit. Past this width the SVG letterboxes inside a wider element
         while the scrubber keeps stretching, so slider positions stop
         corresponding to graph positions (DESIGN.md: track aligns with graph
         padding). The action footer spans the editor instead; its buttons
         commit the whole card, not only the graph column. */
    width: 100%;
    max-width: min(100%, var(--curve-stack-max-width));
    margin-inline: auto;
  }
  .footer-slot {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
  }
  .footer-slot.active {
    padding-top: 8px;
    border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    background: var(--card-bg);
    background: color-mix(in srgb, var(--card-bg) 72%, transparent);
    backdrop-filter: blur(14px);
  }
  .side-rail {
    gap: 10px;
  }
  .graph-panel {
    container: lightener-graph-panel / inline-size;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-radius: 12px;
    padding: var(--_graph-panel-padding);
    background: var(--panel-bg);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
    overflow: hidden;
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
  .first-use-experiment .shape-chip.invitation-chip {
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
  .graph-workbench {
    display: grid;
    /* Leave room for the hint without changing rows when tips open. */
    grid-template-columns: minmax(0, 1fr) minmax(0, min(50%, 268px));
    align-items: start;
    gap: 10px;
    min-width: 0;
  }
  .graph-workbench .graph-insight-primary {
    max-width: 100%;
  }
  .graph-insight {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
    color: var(--text-color);
    /* Reserve the band's height so summary/trial text swaps never move the
         graph below it. */
    min-height: 15px;
  }
  .graph-insight-primary {
    flex: 0 0 auto;
    max-width: 48%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.25;
  }
  /* The trial state must keep the resting state's one-line budget; letting
       it wrap grows the band and shoves the graph down on every hover. */
  .graph-insight-secondary {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--secondary-text);
    font-size: 11px;
    line-height: 1.25;
    text-align: right;
  }
  .shape-chip-bar {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    align-self: start;
    justify-self: end;
    min-width: 0;
    width: min(100%, 268px);
    max-width: 100%;
  }
  /* Empty stand-in shown when no light is selected: reserves the same height
       and column footprint as the shape-chip row (see .shape-chip min-height)
       so the graph never shifts as the chip row appears and disappears. Kept as
       its own class — not .shape-chip-bar — so "is the chip bar present?" checks
       still mean the real, interactive chips. */
  .shape-chip-reserve {
    min-height: 40px;
    align-self: start;
    justify-self: end;
    width: min(100%, 268px);
  }
  .shape-chip {
    display: grid;
    grid-template-rows: 12px auto;
    align-content: center;
    gap: 4px;
    min-width: 0;
    min-height: 40px;
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
  /* Wide card: two columns with a full-width editor action bar. The footer
       sits in the graph column's next row while the side rail spans both rows;
       that keeps the action row under the graph without making its sticky range
       depend only on the short graph stack. Narrow card: stacked flow with the
       same sticky action bar so save/undo/cancel never sink below a long light
       list. Both are container queries on the card's own width — the Lovelace
       card and the sidebar panel get the same layout at the same size. Browsers
       without container-query support fall back to the stacked flow without
       stickiness. */
  @container lightener-card (min-width: 860px) {
    .workspace {
      grid-template-columns:
        minmax(0, min(52%, var(--curve-stack-max-width)))
        minmax(320px, 1fr);
      align-items: start;
      /* Footer visually spans both columns because save/cancel apply to the
           whole editor state, but its grid row stays paired with the graph so
           it does not land below a long side rail. */
      grid-template-areas:
        'editor side'
        'footer side';
    }
    .editor-column {
      grid-area: editor;
    }
    .side-rail {
      grid-area: side;
    }
    .footer-slot {
      grid-area: footer;
      position: sticky;
      bottom: max(0px, env(safe-area-inset-bottom));
      width: 100cqw;
      z-index: 3;
    }
  }
  .card.embedded .footer-slot.active[data-overlay] {
    position: fixed;
    left: var(--curve-footer-overlay-left, 0px);
    right: auto;
    bottom: max(0px, env(safe-area-inset-bottom));
    width: var(--curve-footer-overlay-width, 100vw);
    max-width: calc(100vw - var(--curve-footer-overlay-left, 0px));
    z-index: 10;
  }
  /* Browsers without container queries (older wall-tablet WebViews) never
       match the blocks above, which would revive the footer-below-the-list
       regression. Keep the reachability guarantee for them: stacked flow
       with the sticky footer under the graph at every width. The solid
       background line covers engines that also lack color-mix. */
  @supports not (container-type: inline-size) {
    .footer-slot {
      position: sticky;
      bottom: max(0px, env(safe-area-inset-bottom));
      z-index: 3;
    }
    .side-rail {
      order: 3;
    }
  }
  @container lightener-card (max-width: 859.98px) {
    .footer-slot {
      position: sticky;
      bottom: max(0px, env(safe-area-inset-bottom));
      z-index: 3;
    }
    .side-rail {
      order: 3;
    }
    .graph-insight {
      align-items: flex-start;
      flex-direction: column;
      gap: 3px;
      /* Stacked band: one primary line + a two-line secondary budget,
           reserved up front so text swaps never resize the band. */
      min-height: 46px;
    }
    .graph-insight-primary,
    .graph-insight-secondary {
      flex: none;
      max-width: 100%;
    }
    .graph-insight-secondary {
      text-align: left;
      white-space: normal;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
    }
  }
  /* Summary, trials and tips share a title-plus-two-lines budget. Reserve it
     before tips open, including on narrow cards with a separate chip row. */
  .graph-workbench .graph-insight,
  .coach-prompt {
    min-height: 46px;
  }
  .coach-prompt {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--primary-text-color, #212121);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.25;
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
    margin-top: 2px;
    color: var(--secondary-text-color, #616161);
    font-size: 11px;
    font-weight: 400;
    line-height: 1.25;
  }
  .coach-help {
    position: relative;
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    margin: -8px -8px -8px auto;
    border: 0;
    background: transparent;
    color: var(--secondary-text-color, #616161);
    font: 600 13px/1 sans-serif;
    cursor: pointer;
  }
  .coach-help::before {
    content: '';
    position: absolute;
    inset: 8px;
    border: 1px solid var(--divider-color, #ddd);
    border-radius: 50%;
  }
  .coach-help:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .coach-help:focus-visible,
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
    margin: -8px -8px -8px auto;
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
  @container lightener-card (max-width: 559.98px) {
    .graph-workbench {
      grid-template-columns: 1fr;
    }
    .shape-chip-bar {
      min-width: 0;
      width: 100%;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
  @container lightener-card (min-width: 560px) {
    /* Use the empty chip column for the resting summary. The reserve stays
         in the same row so selecting a light does not move the graph. */
    .graph-workbench:has(.shape-chip-reserve) .graph-insight {
      grid-column: 1 / -1;
      grid-row: 1;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      gap: 3px;
    }
    .graph-workbench:has(.shape-chip-reserve) .graph-insight-secondary {
      text-align: left;
    }
    .graph-workbench:has(.graph-insight) .shape-chip-reserve {
      grid-column: 1 / -1;
      grid-row: 1;
      pointer-events: none;
    }
  }
  @container lightener-card-shell ${MOBILE_MEDIA} {
    .card {
      --_graph-panel-padding: 12px;
      padding: 12px;
    }
    .header,
    .card.embedded .header {
      margin-bottom: 8px;
    }
    .workspace,
    .editor-column,
    .main-stack,
    .side-rail,
    .footer-slot,
    .status-stack,
    .graph-panel,
    .graph-workbench {
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
