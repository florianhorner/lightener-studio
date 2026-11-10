import { css } from 'lit';
import { MOBILE_MEDIA } from '../utils/breakpoint-styles.js';
import { EDITOR_GRAPH_MAX_HEIGHT } from '../utils/graph-math.js';
import { FIRST_USE_TIMING } from '../utils/motion.js';

// Shared with the card's CSS.registerProperty fallback.
export const DEFAULT_CURVE_GRAPH_MAX_HEIGHT_PX = EDITOR_GRAPH_MAX_HEIGHT;

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
    /* Warm marks real light in the room while Watch is on; blue stays for data. */
    --watch-warm: #ffb300;
    /* Three tiers: the sheet (--card-bg), the graph's well and the Edit header bed.
       These recipes darken a light theme and lighten a dark one on their own. */
    --graph-panel: color-mix(in srgb, var(--text-color) 5%, var(--card-bg));
    --watch-well: color-mix(in srgb, var(--graph-panel) 96%, var(--watch-warm) 4%);
    --edit-bed: color-mix(in srgb, var(--text-color) 8%, var(--card-bg));
    /* The Room dim overlay and the plot paint with this, so they match the well. */
    --graph-bg: var(--graph-panel);
    --panel-bg: color-mix(in srgb, var(--card-bg) 95%, var(--secondary-text, #616161) 5%);
    --text-xs: 9px;
    --text-sm: 12px;
    --text-md: 13px;
    --text-lg: 14px;
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
    /* The ⋮ menu opens over the graph but stays below fixed HA chrome. */
    position: relative;
    z-index: 1;
    /* Same footprint in View and Edit: the bed only paints, it never resizes. */
    margin-inline: -8px;
    padding-inline: 8px;
    box-shadow: inset 0 -2px 0 transparent;
    transition:
      background-color 150ms ease,
      box-shadow 150ms ease;
  }
  /* Edit is the header bed plus its blue rule (the exit slot also changes). */
  :host([data-mode='edit']) .header {
    background-color: var(--edit-bed);
    box-shadow: inset 0 -2px 0 #2563eb;
  }
  .header > h2 {
    flex: 1 1 160px;
  }
  .header > .editor-toolbar {
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
    /* The graph spans the card; past its height cap the plot widens instead
         of letterboxing. The plot transform sets the Room bar's insets. */
    width: 100%;
    gap: 4px;
  }
  .side-rail {
    gap: 10px;
  }
  .graph-panel {
    container: lightener-graph-panel / inline-size;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: var(--_graph-panel-padding);
    background-color: var(--graph-bg);
    border-radius: 12px;
    /* A ring rather than a border, so the plot never shifts. */
    box-shadow: 0 0 0 1px var(--divider);
    transition:
      background-color 150ms ease,
      box-shadow 150ms ease;
  }
  /* Watch room react: the well warms a little and takes a warm frame. */
  .card.watching {
    --graph-bg: var(--watch-well);
  }
  .card.watching .graph-panel {
    box-shadow: 0 0 0 1px var(--watch-warm);
  }
  .control-slot {
    min-width: 0;
  }
  .control-dock {
    width: 100%;
  }
  /* The Room grip tucks under the graph's tick labels, close to its edge,
     including the padding a grown plot leaves under its native-size labels. */
  .room-surface {
    position: relative;
    margin-top: calc(-12px - var(--graph-pad-trim, 0px));
    padding: 0 0 14px;
  }
  /* The Watch note hangs under Room on narrow cards, over the list. */
  .room-surface > .watch-hint.snackbar {
    top: calc(100% + 8px);
  }
  /* Edit: the selected light's chips, with Undo at the right end. */
  .edit-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 0 0 10px;
  }
  .edit-row:focus,
  .message-line:focus {
    outline: none;
  }
  .edit-row > .shape-chip-bar {
    flex: 0 1 300px;
  }
  .edit-row > curve-footer {
    flex: 0 0 auto;
    margin-left: auto;
  }
  /* One line of guidance or a message that needs an action, only while it exists. */
  .message-line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
    min-width: 0;
    padding: 0 0 10px;
    color: var(--secondary-text);
    font-size: var(--text-sm);
    line-height: 1.4;
  }
  .message-line > * {
    flex: 1 1 auto;
    min-width: 0;
  }
  .canvas-guidance-text {
    color: var(--secondary-text);
  }
  .room-surface:empty {
    display: none;
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
  .card.embedded .header {
    margin-bottom: 12px;
    margin-inline: 0;
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
  /* The graph, Room brightness and the rows under it sit on top at every width,
       with the light list underneath. The narrow rules are container queries
       on the card's own width, so the Lovelace card and the sidebar panel
       match at the same size. */
  .side-rail {
    padding-top: 16px;
    border-top: 1px solid var(--divider);
  }
  @container lightener-card (max-width: 859.98px) {
    .graph-panel {
      gap: 8px;
    }
  }
  /* Tips take the message line: a title and up to two short lines. */
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
    .header,
    .graph-panel {
      transition: none;
    }
  }
`;
