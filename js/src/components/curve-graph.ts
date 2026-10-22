import { LitElement, html, css, svg, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import {
  LightCurve,
  ControlPoint,
  type CurveFrame,
  type DrawIn,
  type GraphInteraction,
} from '../utils/types.js';
import { prepareBrightnessConfig } from '../utils/interpolation.js';
import { MOBILE_BREAKPOINT_MEDIA_QUERY } from '../utils/breakpoints.js';
import { MOBILE_MEDIA } from '../utils/breakpoint-styles.js';
import {
  PAD_LEFT,
  PAD_TOP,
  PAD_BOTTOM,
  GRAPH_W,
  GRAPH_H,
  VB_W,
  VB_H,
  DEFAULT_GRAPH_MAX_HEIGHT,
  toSvgX,
  toSvgY,
  fromSvgX,
  fromSvgY,
  clamp,
  sampleRenderedCurveAt,
  buildPiecesPath,
  buildSmoothPath,
  piecesHeightAt,
  easeOutCubic,
  EASE_OUT_CUBIC_CSS,
  DASH_PATTERNS,
  LEGEND_SHAPES,
} from '../utils/graph-math.js';
import { safeDefine } from '../utils/safe-define.js';
import { UI } from '../utils/strings.js';
import {
  DIAGONAL_FLASH_MS,
  DRAW_IN_POP_MS,
  DRAW_IN_REVEAL_MS,
  DRAW_IN_STAGGER_MS,
  FIRST_USE_TIMING,
  type DiagonalHit,
  JOY_DEFAULTS,
  type JoyFlags,
  momentPlays,
  prefersReducedMotion,
  tapOnCoarsePointer,
  settleOffset,
  SETTLE_TOTAL_MS,
  startFrameLoop,
  trackDiagonalHit,
} from '../utils/motion.js';

type LegendShape = (typeof LEGEND_SHAPES)[number];

/** Next suffix for a graph's SVG ids (clip path, gradients, glow filters); unique per page. */
let nextGraphUid = 0;

/** A running draw-in reveal: the card's token and its eased progress, 0 to 1. */
type Reveal = { token: number; progress: number };

type TouchTapCandidate = {
  pointerId: number;
  pointerType: string;
  clientX: number;
  clientY: number;
  startedAt: number;
};

type PointPress = {
  clientX: number;
  clientY: number;
  entityId: string;
  groupId: string | null;
  dragging: boolean;
  keyboardEdited: boolean;
};

const POINT_DRAG_THRESHOLD_PX = 6;
const TOUCH_DOUBLE_TAP_MS = 350;
const TOUCH_TAP_MOVE_TOLERANCE_PX = 12;
const SYNTHETIC_DBLCLICK_SUPPRESS_MS = 450;
const SCRUBBER_DOT_RADIUS = 4;
const SCRUBBER_DIM_BLEED = 2;

/** Brightness at the plot's left and right edge for each line that can flash. */
const FLASH_LINE_ENDS: Readonly<Record<DiagonalHit, readonly [number, number]>> = {
  diag: [0, 100],
  floor: [0, 0],
  ceil: [100, 100],
};

function controlPointShape(
  shape: LegendShape,
  cx: number,
  cy: number,
  size: number,
  className: string,
  fill: string,
  stroke: string,
  opacity: number,
  glowColor: string
): ReturnType<typeof svg> {
  const style = `--glow-color: ${glowColor}; opacity: ${opacity}`;
  // The shape name rides along in the class list so the stylesheet can scope
  // per-shape transform state (see .control-point.shape-diamond).
  const cls = `${className} shape-${shape}`;
  switch (shape) {
    case 'circle':
      return svg`<circle
        class="${cls}"
        cx="${cx}"
        cy="${cy}"
        r="${size}"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="2"
        style="${style}"
        pointer-events="none"
      />`;
    case 'square': {
      const side = size * 1.15;
      return svg`<rect
        class="${cls}"
        x="${cx - side / 2}"
        y="${cy - side / 2}"
        width="${side}"
        height="${side}"
        rx="1.5"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="2"
        style="${style}"
        pointer-events="none"
      />`;
    }
    case 'diamond': {
      const side = size * 1.3;
      return svg`<rect
        class="${cls}"
        x="${cx - side / 2}"
        y="${cy - side / 2}"
        width="${side}"
        height="${side}"
        rx="1"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="2"
        style="${style}"
        pointer-events="none"
      />`;
    }
    case 'triangle': {
      const h = size * 1.15;
      const w = size * 1.3;
      return svg`<polygon
        class="${cls}"
        points="${cx},${cy - h} ${cx - w},${cy + h * 0.65} ${cx + w},${cy + h * 0.65}"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="2"
        style="${style}"
        pointer-events="none"
      />`;
    }
    case 'bar': {
      const barW = size * 2;
      const barH = size * 0.75;
      return svg`<rect
        class="${cls}"
        x="${cx - barW / 2}"
        y="${cy - barH / 2}"
        width="${barW}"
        height="${barH}"
        rx="1.5"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="2"
        style="${style}"
        pointer-events="none"
      />`;
    }
    default: {
      // Exhaustiveness guard: every LEGEND_SHAPES value must have a case above.
      // If a new shape is added without a case, this fails to compile rather
      // than silently rendering nothing (Lit swallows undefined).
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

export class CurveGraph extends LitElement {
  @property({ type: Array }) curves: LightCurve[] = [];
  @property({ type: String }) selectedCurveId: string | null = null;
  @property({ type: String }) entityId: string | null = null;
  @property({ type: Boolean }) readOnly = false;
  @property({ type: Number }) scrubberPosition: number | null = null;
  /** The relocated room control no longer labels the graph's horizontal axis. */
  @property({ type: Boolean }) showXAxisLabel = false;
  @property({ attribute: false }) previewCurve: LightCurve | null = null;
  /** A temporary shape uses the same geometry, input and labels as ordinary editing. */
  @property({ attribute: false }) exampleEntityId: string | null = null;
  @property({ attribute: false }) exampleInstruction: string | null = null;
  @property({ type: Boolean }) exampleCueAnimating = false;
  /** Motion preferences from the card config's `joy:` key. */
  @property({ attribute: false }) joy: JoyFlags = JOY_DEFAULTS;
  /** One curve drawn mid-animation: a joy `ripple`, or an undo or cancel that cut one short. */
  @property({ attribute: false }) curveFrame: CurveFrame | null = null;
  /** Newly added curves reveal from left to right; the card owns this token's lifetime. */
  @property({ attribute: false }) drawIn: DrawIn | null = null;

  @state() private _dragCurveIdx = -1;
  @state() private _dragPointIdx = -1;
  @state() private _hoveredPoint: { curve: number; point: number } | null = null;
  @state() private _focusedPoint: { curve: number; point: number } | null = null;
  @state() private _isMobile = false;
  /** Preserve native text proportions; cap enlargement above the normal graph size. */
  @state() private _labelScale = 1;
  /** Released point's marker offset while it settles (visual only; data never moves). */
  @state() private _settle: { curve: number; point: number; dy: number } | null = null;
  /** The line flashing because a dragged point landed on it; keyed so a repeat restarts it. */
  @state() private _flash: { kind: DiagonalHit; token: number } | null = null;
  /** The reveal of the curves named by `drawIn`; willUpdate keeps it to the current token. */
  @state() private _reveal: Reveal | null = null;

  private readonly _uid = (nextGraphUid++).toString(36);
  private _mql: MediaQueryList | null = null;
  private _wasDragging = false;
  private _longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private _longPressFired = false;
  private _touchTapStart: TouchTapCandidate | null = null;
  private _lastTouchTap: TouchTapCandidate | null = null;
  private _suppressDblClickUntil = 0;
  private _dragStartTarget: number | null = null;
  private _dragPointerId: number | null = null;
  private _pointPress: PointPress | null = null;
  private _dragInput = 'mouse';
  private _dragReleaseTimer: ReturnType<typeof setTimeout> | null = null;
  private _cancelSettleLoop: (() => void) | null = null;
  /** The lines the dragged point holds (see trackDiagonalHit); empty at each new press. */
  private _heldLines: readonly DiagonalHit[] = [];
  private _flashToken = 0;
  private _flashTimer: ReturnType<typeof setTimeout> | null = null;
  private _cancelDrawInLoop: (() => void) | null = null;
  private _drawInObserver: IntersectionObserver | null = null;
  private _labelResizeObserver: ResizeObserver | null = null;
  private _pendingDrawInToken: number | null = null;
  private _lastDrawInToken = -1;
  // The released point as it was at release. A settle only belongs to that
  // point: if the curves change underneath it (a shape applied, undo, a reload),
  // the same indices may name a different point, so the settle stops.
  private _settlePoint: {
    entityId: string;
    curve: number;
    point: number;
    lightener: number;
    target: number;
  } | null = null;

  constructor() {
    super();
    // Any new press or key press inside the graph ends a running settle or flash.
    // Capture phase, so no handler further in can skip it; nothing is prevented or stopped.
    const end = (): void => {
      this._stopSettle();
      this._stopFlash();
    };
    this.addEventListener('pointerdown', end, true);
    this.addEventListener('keydown', end, true);
  }

  private _interaction(phase: GraphInteraction['phase'], input: string): void {
    this.dispatchEvent(
      new CustomEvent<GraphInteraction>('graph-interaction', {
        detail: { phase, input },
        bubbles: true,
        composed: true,
      })
    );
  }

  /** End native gesture resources before a temporary presentation is removed. */
  public get interactionActive(): boolean {
    return this._dragPointerId !== null || this._touchTapStart !== null;
  }

  public focusPoint(entityId: string, lightener: number): boolean {
    const ci = this.curves.findIndex((c) => c.entityId === entityId);
    const pi = this.curves[ci]?.controlPoints.findIndex((p) => p.lightener === lightener) ?? -1;
    const target = this.renderRoot.querySelector<SVGCircleElement>(
      `.hit-circle[data-curve="${ci}"][data-point="${pi}"]`
    );
    if (!target) return false;
    target.focus({ preventScroll: true });
    return true;
  }

  public cancelInteraction(): void {
    const hadPointPress = this._finishPointPress('cancel');
    const touch = this._touchTapStart?.pointerId;
    this._dragCurveIdx = -1;
    this._dragPointIdx = -1;
    this._dragPointerId = null;
    this._pointPress = null;
    this._dragStartTarget = null;
    this._heldLines = [];
    this._clearLongPress();
    this._longPressFired = false;
    this._touchTapStart = null;
    this._lastTouchTap = null;
    this._suppressDblClickUntil = 0;
    this._wasDragging = false;
    if (this._dragReleaseTimer !== null) clearTimeout(this._dragReleaseTimer);
    this._dragReleaseTimer = null;
    this._hoveredPoint = null;
    this._focusedPoint = null;
    this._stopSettle();
    this._stopFlash();
    for (const el of [this._svgRef, ...this.renderRoot.querySelectorAll('rect')]) {
      if (touch != null && el?.hasPointerCapture?.(touch)) el.releasePointerCapture(touch);
    }
    if (!hadPointPress && touch != null) this._interaction('cancel', this._dragInput);
  }

  static styles = css`
    .example-instruction {
      pointer-events: none;
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
    .example-cue-ring,
    .example-cue-leader {
      fill: none;
      stroke: var(--primary-color, #03a9f4);
      stroke-width: 1.2;
    }
    .example-cue-ring {
      opacity: 0.6;
      transform-box: fill-box;
      transform-origin: center;
    }
    .example-cue-leader {
      stroke-dasharray: 2 3;
      opacity: 0.8;
    }
    .example-cue-animating .example-cue-ring {
      animation: example-point-invite ${FIRST_USE_TIMING.pulse}ms ease-out infinite;
    }
    @keyframes example-point-invite {
      0%,
      100% {
        opacity: 0.3;
        transform: scale(0.85);
      }
      45% {
        opacity: 0.9;
        transform: scale(1.2);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .example-instruction,
      .example-cue-animating .example-cue-ring {
        animation: none;
      }
    }
    .example-cue-label {
      fill: color-mix(
        in srgb,
        var(--primary-color, #03a9f4) 35%,
        var(--primary-text-color, #212121)
      );
      font-size: 14px;
      font-weight: 600;
      paint-order: stroke;
      stroke: var(--card-background-color, #fff);
      stroke-width: 5px;
      stroke-linejoin: round;
    }
    :host {
      display: block;
    }
    svg {
      width: 100%;
      height: auto;
      min-height: var(--curve-graph-min-height, 0);
      max-height: var(--curve-graph-max-height, ${DEFAULT_GRAPH_MAX_HEIGHT}px);
      display: block;
      border-radius: 6px;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    .grid-line {
      stroke: var(--secondary-text, #616161);
      stroke-width: 0.5;
      opacity: 0.15;
    }
    .axis-line {
      stroke: var(--secondary-text, #616161);
      stroke-width: 0.75;
      opacity: 0.4;
    }
    .plot-frame {
      fill: var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)));
      stroke: var(--divider-color, rgba(127, 127, 127, 0.2));
      stroke-width: 0.75;
      opacity: 0.95;
    }
    .axis-label {
      fill: var(--secondary-text, #616161);
      font-size: calc(10px * var(--graph-label-scale, 1));
      font-weight: 500;
      font-family: inherit;
    }
    .tick-label {
      fill: var(--secondary-text, #616161);
      font-size: calc(10px * var(--graph-label-scale, 1));
      font-weight: 500;
      font-family: inherit;
    }
    .curve-line {
      fill: none;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: opacity 0.3s ease;
    }
    .marker-pop {
      transform-box: fill-box;
      transform-origin: center;
      animation: marker-pop ${unsafeCSS(`${DRAW_IN_POP_MS}ms ${EASE_OUT_CUBIC_CSS}`)} both;
    }
    @keyframes marker-pop {
      0% {
        transform: scale(0);
      }
      70% {
        transform: scale(1.15);
      }
      100% {
        transform: scale(1);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .marker-pop {
        animation: none;
      }
    }
    .preview-curve-line {
      fill: none;
      stroke-width: 1.25;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 4 4;
      opacity: 0.7;
      pointer-events: none;
    }
    .preview-curve-point {
      fill: var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)));
      stroke: var(--preview-color, #42a5f5);
      stroke-width: 1.25;
      opacity: 0.7;
      pointer-events: none;
    }
    /* Marker growth is driven by a transform scale, NOT by the SVG \`r\`
       geometry property. \`r\` only exists on <circle>, so the rect/polygon
       markers used by every curve after the first never grew on hover, focus
       or drag, so on four of the five LEGEND_SHAPES the glow was the only
       thing that answered. The two custom properties compose: the diamond
       needs its 45deg
       rotation and its scale in one transform, and a plain \`transform:\`
       override in a more specific rule would drop the rotation. */
    .control-point {
      --cp-rotate: 0deg;
      --cp-scale: 1;
      cursor: grab;
      transform-box: fill-box;
      transform-origin: center;
      transform: rotate(var(--cp-rotate)) scale(var(--cp-scale));
      transition:
        transform 0.15s ease,
        filter 0.15s ease;
    }
    /* The diamond is a square turned 45deg. It used to carry a
       \`transform="rotate(45 cx cy)"\` presentation attribute; a CSS transform
       overrides that attribute entirely, so the rotation lives here now. */
    .control-point.shape-diamond {
      --cp-rotate: 45deg;
    }
    .control-point:hover,
    .control-point.hovered,
    .control-point.focused {
      --cp-scale: 1.25;
      filter: drop-shadow(0 0 6px var(--glow-color, #42a5f5));
    }
    .control-point.dragging {
      --cp-scale: 1.33;
      cursor: grabbing;
      filter: drop-shadow(0 0 8px var(--glow-color, #42a5f5));
    }
    @media (prefers-reduced-motion: reduce) {
      .control-point {
        transition: filter 0.15s ease;
      }
    }
    .control-point.origin {
      stroke-dasharray: 2 2;
    }
    .hit-circle.origin-hit {
      cursor: ns-resize;
    }
    .hit-circle:focus-visible {
      outline: none;
    }
    .hit-area {
      fill: transparent;
      cursor: crosshair;
    }
    .diagonal-ref {
      stroke: var(--secondary-text, #616161);
      stroke-width: 0.75;
      stroke-dasharray: 3 4;
      opacity: 0.3;
    }
    .diagonal-flash {
      stroke: var(--primary-color, #2563eb);
      stroke-width: 2;
      stroke-linecap: round;
      opacity: 0;
      animation: diagonal-flash ${unsafeCSS(`${DIAGONAL_FLASH_MS}ms`)}
        ${unsafeCSS(EASE_OUT_CUBIC_CSS)} forwards;
    }
    @keyframes diagonal-flash {
      0% {
        opacity: 0;
      }
      25% {
        opacity: 0.9;
      }
      100% {
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .diagonal-flash {
        display: none;
      }
    }
    .hint {
      fill: var(--primary-text-color, #212121);
      font-size: 11px;
      font-family: inherit;
      opacity: 0.86;
      /* Empty-state hints sit on a .hint-band. Keep the stroke halo so the
         text stays legible if a theme makes the band translucent. */
      paint-order: stroke;
      stroke: var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)));
      stroke-width: 2.5px;
      stroke-linejoin: round;
    }
    .hint-band {
      fill: var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)));
      stroke: var(--divider-color, rgba(127, 127, 127, 0.2));
      stroke-width: 1;
      opacity: 0.96;
      pointer-events: none;
    }
    .hint.hint-select {
      pointer-events: none;
    }
    .hint-select {
      font-weight: 600;
      opacity: 0.92;
    }
    .crosshair {
      stroke-width: 0.75;
      stroke-dasharray: 3 3;
    }
    @media ${MOBILE_MEDIA} {
      .example-cue-label {
        font-size: 16px;
      }
      svg {
        min-height: 180px;
      }
      .axis-label,
      .tick-label {
        font-size: calc(12px * var(--graph-label-scale, 1));
      }
      .hint {
        font-size: 14px;
      }
      .tooltip-text {
        font-size: 11px;
      }
    }
    .scrubber-line {
      stroke: var(--secondary-text, #616161);
      stroke-width: 0.75;
      stroke-dasharray: 3 3;
      opacity: 0.3;
    }
    .scrubber-dot {
      stroke: none;
    }
    .tooltip-bg {
      fill: var(--tooltip-background-color, var(--primary-text-color, #212121));
      rx: 3;
      ry: 3;
      opacity: 0.94;
      /* The tooltip sits above its point; it must never steal the pointer from
         the hit-circle or hover enters a show/hide loop (flicker on vertical
         approach). */
      pointer-events: none;
    }
    .tooltip-text {
      fill: var(--tooltip-text-color, var(--card-background-color, #fff));
      font-size: 9.5px;
      font-family: inherit;
      pointer-events: none;
    }
  `;

  @query('svg') private _svgRef!: SVGSVGElement | null;

  private _getSvgCoords(e: MouseEvent): { x: number; y: number } | null {
    const svgEl = this._svgRef;
    if (!svgEl) return null;
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return null;
    let inv: DOMMatrix;
    try {
      inv = ctm.inverse();
    } catch {
      return null;
    }
    if (!inv || isNaN(inv.a)) return null;
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(inv);
    return { x: fromSvgX(svgPt.x), y: fromSvgY(svgPt.y) };
  }

  private _dispatchPointAddFromEvent(e: MouseEvent): boolean {
    const coords = this._getSvgCoords(e);
    if (!coords) return false;
    const x = Math.round(clamp(coords.x, 1, 100));
    const y = Math.round(clamp(coords.y, 0, 100));

    this._finishPointPress('end');
    this.dispatchEvent(
      new CustomEvent('point-add', {
        detail: {
          lightener: x,
          target: y,
          entityId: this.selectedCurveId,
        },
        bubbles: true,
        composed: true,
      })
    );
    return true;
  }

  private _isNonMousePointer(e: PointerEvent): boolean {
    return e.pointerType !== '' && e.pointerType !== 'mouse';
  }

  private _touchMoveDistance(a: Pick<TouchTapCandidate, 'clientX' | 'clientY'>, e: PointerEvent) {
    return Math.hypot(e.clientX - a.clientX, e.clientY - a.clientY);
  }

  private _isCurveInteractive(curveIdx: number): boolean {
    if (this.readOnly) return false;
    if (this.selectedCurveId === null) return true;
    return this.curves[curveIdx]?.entityId === this.selectedCurveId;
  }

  private _focusCurve(entityId: string): void {
    this.dispatchEvent(
      new CustomEvent('focus-curve', {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onPointFocus(curveIdx: number, pointIdx: number): void {
    this._interaction('start', 'keyboard');
    const curve = this.curves[curveIdx];
    if (!curve) return;
    this._focusedPoint = { curve: curveIdx, point: pointIdx };
    this._hoveredPoint = { curve: curveIdx, point: pointIdx };
    this._focusCurve(curve.entityId);
  }

  private _onPointBlur(curveIdx: number, pointIdx: number): void {
    if (
      (curveIdx === this._dragCurveIdx && pointIdx === this._dragPointIdx) ||
      (this._longPressFired && this.curves[curveIdx]?.entityId === this._pointPress?.entityId)
    ) {
      this._finishPointPress('cancel');
    }
    if (this._focusedPoint?.curve === curveIdx && this._focusedPoint?.point === pointIdx) {
      this._focusedPoint = null;
    }
    if (this._hoveredPoint?.curve === curveIdx && this._hoveredPoint?.point === pointIdx) {
      this._hoveredPoint = null;
    }
  }

  private _dispatchKeyboardMove(
    curveIdx: number,
    pointIdx: number,
    lightener: number,
    target: number
  ): void {
    const press = this._pointPress;
    const point = this.curves[curveIdx]?.controlPoints[pointIdx];
    if (press && point && (point.lightener !== lightener || point.target !== target)) {
      // Keys join the held gesture without lowering the pointer's drag threshold.
      press.keyboardEdited = true;
      this._clearLongPress();
    }
    // A key that moves the point being dragged also moves it on or off a line,
    // so the next pointer move compares against where the point really is.
    if (this.joy.diagonal && curveIdx === this._dragCurveIdx && pointIdx === this._dragPointIdx) {
      this._heldLines = trackDiagonalHit(pointIdx, lightener, target, this._heldLines).held;
    }
    this.dispatchEvent(
      new CustomEvent('point-move', {
        detail: { curveIndex: curveIdx, pointIndex: pointIdx, lightener, target },
        bubbles: true,
        composed: true,
      })
    );
    // A held press sends the point-drop when it ends, even if a listener ends it during this move.
    if (press) return;
    this.dispatchEvent(
      new CustomEvent('point-drop', {
        detail: { curveIndex: curveIdx, pointIndex: pointIdx },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _getKeyboardInsertPoint(curve: LightCurve, pointIdx: number): ControlPoint | null {
    const current = curve.controlPoints[pointIdx];
    const next = curve.controlPoints[pointIdx + 1];
    const previous = curve.controlPoints[pointIdx - 1];

    if (next && next.lightener - current.lightener > 1) {
      return {
        lightener: Math.round((current.lightener + next.lightener) / 2),
        target: Math.round((current.target + next.target) / 2),
      };
    }

    if (previous && current.lightener - previous.lightener > 1) {
      return {
        lightener: Math.round((previous.lightener + current.lightener) / 2),
        target: Math.round((previous.target + current.target) / 2),
      };
    }

    return null;
  }

  private _onPointKeyDown(e: KeyboardEvent, curveIdx: number, pointIdx: number): void {
    this._interaction('start', 'keyboard');
    const curve = this.curves[curveIdx];
    const point = curve?.controlPoints[pointIdx];
    if (!curve || !point) return;

    if (this.selectedCurveId !== curve.entityId) {
      this._focusCurve(curve.entityId);
    }

    // First control point: Y-axis only — skip horizontal moves
    if (pointIdx === 0 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) return;

    const step = e.shiftKey ? 10 : 1;
    const prevX = pointIdx > 0 ? curve.controlPoints[pointIdx - 1].lightener + 1 : point.lightener;
    const nextX =
      pointIdx < curve.controlPoints.length - 1
        ? curve.controlPoints[pointIdx + 1].lightener - 1
        : 100;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      this._dispatchKeyboardMove(
        curveIdx,
        pointIdx,
        Math.min(nextX, point.lightener + step),
        point.target
      );
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this._dispatchKeyboardMove(
        curveIdx,
        pointIdx,
        Math.max(prevX, point.lightener - step),
        point.target
      );
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._dispatchKeyboardMove(
        curveIdx,
        pointIdx,
        point.lightener,
        Math.min(100, point.target + step)
      );
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._dispatchKeyboardMove(
        curveIdx,
        pointIdx,
        point.lightener,
        Math.max(0, point.target - step)
      );
      return;
    }
    if (e.key === 'Enter') {
      const insertPoint = this._getKeyboardInsertPoint(curve, pointIdx);
      if (!insertPoint) return;
      e.preventDefault();
      this._finishPointPress('end');
      this.dispatchEvent(
        new CustomEvent('point-add', {
          detail: {
            entityId: curve.entityId,
            lightener: insertPoint.lightener,
            target: insertPoint.target,
          },
          bubbles: true,
          composed: true,
        })
      );
      // After re-render the new point is at a sorted position; refocus the original point
      const originalIndex = pointIdx + (insertPoint.lightener < point.lightener ? 1 : 0);
      this._refocusHitCircle(curveIdx, originalIndex).catch(() => {});
      return;
    }
    if (
      (e.key === ' ' || e.key === 'Delete' || e.key === 'Backspace') &&
      pointIdx > 0 &&
      curve.controlPoints.length > 2
    ) {
      e.preventDefault();
      this._finishPointPress('end');
      this.dispatchEvent(
        new CustomEvent('point-remove', {
          detail: { curveIndex: curveIdx, pointIndex: pointIdx },
          bubbles: true,
          composed: true,
        })
      );
      // After removal, focus the preceding point so keyboard nav can continue
      this._refocusHitCircle(curveIdx, Math.max(1, pointIdx - 1)).catch(() => {});
    }
  }

  private async _refocusHitCircle(curveIdx: number, pointIdx: number): Promise<void> {
    // Let the parent send back the edited points before awaiting their render.
    await Promise.resolve();
    await this.updateComplete;
    // Find the exact curve and point; hidden curves render no hit circles.
    const target = this.renderRoot.querySelector<SVGCircleElement>(
      `.hit-circle[data-curve="${curveIdx}"][data-point="${pointIdx}"]`
    );
    if (target) {
      target.focus();
    }
  }

  private _onPointerDown(e: PointerEvent, curveIdx: number, pointIdx: number): void {
    // Only drag on primary button (left-click); ignore right-click so contextmenu works
    if (e.button !== 0) return;
    if (this._dragPointerId !== null) return;
    if (!this._isCurveInteractive(curveIdx)) return;
    const curve = this.curves[curveIdx];
    if (!curve?.visible || !curve.controlPoints[pointIdx]) return;

    this._dragInput = e.pointerType || 'mouse';
    this._interaction('start', this._dragInput);

    e.preventDefault();
    this._longPressFired = false;
    this._dragStartTarget = this.curves[curveIdx]?.controlPoints[pointIdx]?.target ?? null;
    this._dragPointerId = e.pointerId;
    this._pointPress = {
      clientX: e.clientX,
      clientY: e.clientY,
      entityId: curve.entityId,
      groupId: this.entityId,
      dragging: false,
      keyboardEdited: false,
    };
    this._heldLines = [];

    // Start long-press timer for touch removal (500ms)
    // Origin point (index 0) cannot be removed — skip long-press removal
    this._clearLongPress();
    if (pointIdx > 0) {
      this._longPressTimer = setTimeout(() => {
        this._longPressTimer = null;
        if (!this._pointPressIsCurrent()) {
          this._finishPointPress('cancel');
          return;
        }
        this._longPressFired = true;
        // Cancel any drag in progress
        this._dragCurveIdx = -1;
        this._dragPointIdx = -1;
        this.dispatchEvent(
          new CustomEvent('point-remove', {
            detail: { curveIndex: curveIdx, pointIndex: pointIdx },
            bubbles: true,
            composed: true,
          })
        );
      }, 500);
    }

    // Capture on the SVG so move/up events fire on the SVG, not the circle
    this._svgRef?.setPointerCapture(e.pointerId);
    this._dragCurveIdx = curveIdx;
    this._dragPointIdx = pointIdx;
  }

  private _clearLongPress(): void {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  private _onPointerMove(e: PointerEvent): void {
    const press = this._pointPress;
    if (!press || this._dragCurveIdx < 0 || e.pointerId !== this._dragPointerId) return;
    if (!this._pointPressIsCurrent()) {
      this._finishPointPress('cancel');
      return;
    }
    e.preventDefault();
    const distance = Math.hypot(e.clientX - press.clientX, e.clientY - press.clientY);
    if (!press.dragging) {
      if (distance < POINT_DRAG_THRESHOLD_PX) return;
      this._clearLongPress();
      press.dragging = true;
    }
    const coords = this._getSvgCoords(e);
    if (!coords) return;

    // Clamp x to avoid colliding with adjacent control points
    const curve = this.curves[this._dragCurveIdx];
    const pts = curve?.controlPoints ?? [];
    const prevX = this._dragPointIdx > 0 ? pts[this._dragPointIdx - 1].lightener + 1 : 1;
    const nextX =
      this._dragPointIdx < pts.length - 1 ? pts[this._dragPointIdx + 1].lightener - 1 : 100;
    const x =
      this._dragPointIdx === 0
        ? (this.curves[this._dragCurveIdx]?.controlPoints[0]?.lightener ?? 0)
        : Math.round(clamp(coords.x, prevX, nextX));
    const y = Math.round(clamp(coords.y, 0, 100));

    this.dispatchEvent(
      new CustomEvent('point-move', {
        detail: {
          curveIndex: this._dragCurveIdx,
          pointIndex: this._dragPointIdx,
          lightener: x,
          target: y,
        },
        bubbles: true,
        composed: true,
      })
    );
    // After the move, so the visual feedback can never hold a drag back. While the
    // graph is read-only (an undo animating), the card ignores the move.
    if (this.joy.diagonal && !this.readOnly) this._noteDiagonalHit(x, y);
  }

  private _onPointerUp(e: PointerEvent): void {
    if (this._dragPointerId === null || e.pointerId !== this._dragPointerId) return;
    e.preventDefault();

    const press = this._pointPress;
    const released = e.type === 'pointerup';
    const tap =
      released &&
      press !== null &&
      !press.dragging &&
      !press.keyboardEdited &&
      !this._longPressFired &&
      this._pointPressIsCurrent() &&
      Math.hypot(e.clientX - press.clientX, e.clientY - press.clientY) < POINT_DRAG_THRESHOLD_PX;
    this._finishPointPress(released ? 'end' : 'cancel', released);
    // Focus can replace a temporary first-use presentation. End native state
    // first so its cleanup cannot finish this press a second time.
    if (tap && press) this._focusCurve(press.entityId);
  }

  private _pointPressIsCurrent(): boolean {
    return (
      this._pointPress !== null &&
      this._pointPress.groupId === this.entityId &&
      this.curves[this._dragCurveIdx]?.entityId === this._pointPress.entityId &&
      this.curves[this._dragCurveIdx]?.visible === true &&
      this.curves[this._dragCurveIdx]?.controlPoints[this._dragPointIdx] !== undefined &&
      this._isCurveInteractive(this._dragCurveIdx)
    );
  }

  /** Clear state before releasePointerCapture, whose loss event can reenter. */
  private _finishPointPress(phase: 'end' | 'cancel', released = false): boolean {
    if (this._dragPointerId === null) return false;

    const pointerId = this._dragPointerId;
    const curveIdx = this._dragCurveIdx;
    const pointIdx = this._dragPointIdx;
    const start = this._dragStartTarget;
    const wasDragging = this._pointPress?.dragging === true && !this._longPressFired;
    const edited = wasDragging || this._pointPress?.keyboardEdited === true;
    this._clearLongPress();
    this._dragCurveIdx = -1;
    this._dragPointIdx = -1;
    this._dragPointerId = null;
    this._pointPress = null;
    this._dragStartTarget = null;
    this._longPressFired = false;
    if (this._svgRef?.hasPointerCapture?.(pointerId)) {
      this._svgRef.releasePointerCapture(pointerId);
    }

    if (edited) {
      this.dispatchEvent(
        new CustomEvent('point-drop', {
          detail: {
            curveIndex: curveIdx,
            pointIndex: pointIdx,
          },
          bubbles: true,
          composed: true,
        })
      );
      // An edit suppresses its synthetic double-click; a tap does not.
      this._wasDragging = true;
      if (this._dragReleaseTimer !== null) clearTimeout(this._dragReleaseTimer);
      this._dragReleaseTimer = setTimeout(() => {
        this._wasDragging = false;
        this._dragReleaseTimer = null;
      }, 400);
    }
    this._interaction(phase, this._dragInput);

    // Last, after the drag has fully ended: the visual feedback can never leave a
    // drag behind.
    if (released && wasDragging) this._startSettle(curveIdx, pointIdx, start);
    return true;
  }

  /**
   * Joy moment `settle`: the released marker overshoots 2 SVG units in the
   * direction its brightness changed and is back at rest 250ms after release.
   * Only the marker moves; the data, the path, the hit circle and the tooltip
   * stay where the point really is.
   */
  private _startSettle(curveIdx: number, pointIdx: number, start: number | null): void {
    if (!momentPlays(this.joy, 'settle')) return;
    const curve = this.curves[curveIdx];
    const point = curve?.controlPoints[pointIdx];
    if (start === null || !curve || !point) return;
    const dir = Math.sign(point.target - start);
    if (dir === 0) return;
    this._stopSettle();
    this._settlePoint = {
      entityId: curve.entityId,
      curve: curveIdx,
      point: pointIdx,
      lightener: point.lightener,
      target: point.target,
    };
    this._cancelSettleLoop = startFrameLoop(
      SETTLE_TOTAL_MS,
      (elapsed) => {
        // Reduced motion switched on mid-settle: stop at rest.
        if (prefersReducedMotion()) {
          this._stopSettle();
          return;
        }
        this._settle = { curve: curveIdx, point: pointIdx, dy: settleOffset(elapsed, dir) };
      },
      () => this._stopSettle()
    );
  }

  /** True while the curves still hold the released point exactly as it was. */
  private _settlePointUnchanged(): boolean {
    const released = this._settlePoint;
    if (!released) return false;
    const curve = this.curves[released.curve];
    const point = curve?.controlPoints[released.point];
    return (
      curve?.entityId === released.entityId &&
      point?.lightener === released.lightener &&
      point?.target === released.target
    );
  }

  /**
   * Joy moment `diagonal`: a dragged point that lands on the diagonal or on the
   * 0% / 100% line makes that line flash once, and touch screens get a short
   * tap. It fires again once the point has been 2 steps off the line, or on
   * the first move of a new drag.
   */
  private _noteDiagonalHit(x: number, y: number): void {
    const { held, landed } = trackDiagonalHit(this._dragPointIdx, x, y, this._heldLines);
    // Recorded before the flash and the tap, so a tap that throws cannot make
    // every later move along the same line count as a new landing.
    this._heldLines = held;
    if (!landed) return;
    if (!prefersReducedMotion()) this._startFlash(landed);
    tapOnCoarsePointer();
  }

  private _startFlash(kind: DiagonalHit): void {
    // Clearing the running flash's timer first means no old timer can end a newer flash.
    this._stopFlash();
    this._flash = { kind, token: ++this._flashToken };
    this._flashTimer = setTimeout(() => this._stopFlash(), DIAGONAL_FLASH_MS);
  }

  private _stopFlash(): void {
    if (this._flashTimer) clearTimeout(this._flashTimer);
    this._flashTimer = null;
    this._flash = null;
  }

  private _renderDiagonalFlash() {
    const flash = this._flash;
    if (!flash) return nothing;
    const [y1, y2] = FLASH_LINE_ENDS[flash.kind];
    return keyed(
      flash.token,
      svg`<line class="diagonal-flash" x1=${toSvgX(0)} y1=${toSvgY(y1)}
        x2=${toSvgX(100)} y2=${toSvgY(y2)} pointer-events="none" />`
    );
  }

  private _stopSettle(): void {
    this._cancelSettleLoop?.();
    this._cancelSettleLoop = null;
    this._settlePoint = null;
    this._settle = null;
  }

  /**
   * Joy moment `draw_in`: the card names the added curves and a token; the graph
   * widens their reveal clips over DRAW_IN_REVEAL_MS while CSS pops their markers.
   * Every frame schedules an update, and willUpdate stops the reveal when the
   * token changes or the moment no longer plays.
   */
  private _startDrawIn(token: number): void {
    this._stopDrawIn();
    // The shared loop starts on the next frame: hide the curve in its first render too.
    this._reveal = { token, progress: 0 };
    this.dispatchEvent(
      new CustomEvent('draw-in-started', {
        detail: { token, pointCount: this._drawInPointCount() },
        bubbles: true,
        composed: true,
      })
    );
    this._cancelDrawInLoop = startFrameLoop(
      DRAW_IN_REVEAL_MS,
      (elapsed) => {
        this._reveal = { token, progress: easeOutCubic(elapsed / DRAW_IN_REVEAL_MS) };
      },
      // onDone replaces the final frame; keep the full reveal while the markers pop.
      () => {
        this._reveal = { token, progress: 1 };
      }
    );
  }

  private _stopDrawIn(): void {
    this._cancelDrawInLoop?.();
    this._cancelDrawInLoop = null;
    this._pendingDrawInToken = null;
    this._reveal = null;
  }

  private _waitForDrawInVisibility(token: number): void {
    this._stopDrawIn();
    this._pendingDrawInToken = token;
    // Clip before the first visible paint, but do not start marker CSS clocks yet.
    this._reveal = { token, progress: 0 };
    if (this.drawIn?.ready === false) return;
    if (!this._drawInObserver) {
      this._startDrawIn(token);
    } else {
      // Focus restoration may have scrolled since the previous observation.
      // Re-observe for a fresh layout sample rather than using cached visibility.
      this._drawInObserver.unobserve(this);
      this._drawInObserver.observe(this);
    }
  }

  private _onDrawInIntersection = (entries: IntersectionObserverEntry[]): void => {
    const entry = entries.find((candidate) => candidate.target === this);
    if (!entry) return;
    const visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
    const token = this._pendingDrawInToken;
    if (visible && token !== null && this.drawIn?.token === token && this.drawIn.ready !== false) {
      this._startDrawIn(token);
    } else if (!visible && this._reveal && token === null) {
      const runningToken = this._reveal.token;
      this._waitForDrawInVisibility(runningToken);
      this.dispatchEvent(
        new CustomEvent('draw-in-waiting', {
          detail: { token: runningToken },
          bubbles: true,
          composed: true,
        })
      );
    }
  };

  /** Highest stagger index actually rendered, including only undimmed markers. */
  private _drawInPointCount(): number {
    if (this.readOnly) return 0;
    return this.curves.reduce((count, curve, curveIdx) => {
      if (
        !curve.visible ||
        !this.drawIn?.ids.has(curve.entityId) ||
        !this._isCurveInteractive(curveIdx)
      )
        return count;
      return curve.controlPoints.reduce(
        (max, point, index) =>
          this.scrubberPosition === null || point.lightener <= this.scrubberPosition
            ? Math.max(max, index + 1)
            : max,
        count
      );
    }, 0);
  }

  private _revealFor(curve: LightCurve): Reveal | null {
    return this.drawIn?.ids.has(curve.entityId) ? this._reveal : null;
  }

  private _drawInClipId(curveIdx: number, token: number): string {
    return `draw-in-${this._uid}-${token}-${curveIdx}`;
  }

  private _drawInDotClipId(curveIdx: number, token: number): string {
    return `draw-in-dot-${this._uid}-${token}-${curveIdx}`;
  }

  private _drawInClipFor(curve: LightCurve, curveIdx: number) {
    const reveal = this._revealFor(curve);
    return reveal ? `url(#${this._drawInClipId(curveIdx, reveal.token)})` : nothing;
  }

  private _drawInDotClipFor(curve: LightCurve, curveIdx: number) {
    const reveal = this._revealFor(curve);
    return reveal ? `url(#${this._drawInDotClipId(curveIdx, reveal.token)})` : nothing;
  }

  private _onPointContextMenu(e: MouseEvent, curveIdx: number, pointIdx: number): void {
    e.preventDefault();
    e.stopPropagation();
    if (this.readOnly) return;
    if (!this._isCurveInteractive(curveIdx)) return;
    // Cannot remove the origin anchor (index 0)
    if (pointIdx === 0) return;
    this._interaction('start', 'mouse');

    this._finishPointPress('end');
    this.dispatchEvent(
      new CustomEvent('point-remove', {
        detail: { curveIndex: curveIdx, pointIndex: pointIdx },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onDblClick(e: MouseEvent): void {
    if (this.readOnly) return;
    if (this._wasDragging) return;
    if (performance.now() < this._suppressDblClickUntil) {
      e.preventDefault();
      return;
    }

    this._interaction('start', 'mouse');
    this._dispatchPointAddFromEvent(e);
  }

  private _onHitAreaPointerDown(e: PointerEvent): void {
    if (this.readOnly) return;
    this._interaction('start', e.pointerType || 'mouse');
    if (!this._isNonMousePointer(e)) return;

    this._touchTapStart = {
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      clientX: e.clientX,
      clientY: e.clientY,
      startedAt: performance.now(),
    };
    (
      e.currentTarget as Element & { setPointerCapture?: (pointerId: number) => void }
    ).setPointerCapture?.(e.pointerId);
  }

  private _onHitAreaPointerUp(e: PointerEvent): void {
    if (this.readOnly) return;
    if (!this._isNonMousePointer(e)) return;

    const start = this._touchTapStart;
    this._touchTapStart = null;
    this._interaction('end', e.pointerType);
    if (!start || start.pointerId !== e.pointerId || start.pointerType !== e.pointerType) return;

    const moved = this._touchMoveDistance(start, e);
    if (moved > TOUCH_TAP_MOVE_TOLERANCE_PX) {
      this._lastTouchTap = null;
      return;
    }

    const now = performance.now();
    const previous = this._lastTouchTap;
    const isDoubleTap =
      previous !== null &&
      previous.pointerType === e.pointerType &&
      now - previous.startedAt <= TOUCH_DOUBLE_TAP_MS &&
      this._touchMoveDistance(previous, e) <= TOUCH_TAP_MOVE_TOLERANCE_PX;

    if (!isDoubleTap) {
      this._lastTouchTap = {
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        clientX: e.clientX,
        clientY: e.clientY,
        startedAt: now,
      };
      return;
    }

    this._lastTouchTap = null;
    if (this._dispatchPointAddFromEvent(e)) {
      e.preventDefault();
      this._suppressDblClickUntil = now + SYNTHETIC_DBLCLICK_SUPPRESS_MS;
    }
  }

  private _onHitAreaPointerCancel(e: PointerEvent): void {
    if (this._touchTapStart?.pointerId === e.pointerId) {
      this._touchTapStart = null;
      this._interaction('cancel', e.pointerType);
    }
  }

  private _renderGrid() {
    const ticks = [0, 25, 50, 75, 100];
    return svg`
      <defs>
        <clipPath id="graph-area-${this._uid}">
          <rect x="${PAD_LEFT - 30}" y="${PAD_TOP - 30}" width="${GRAPH_W + 60}" height="${GRAPH_H + 60}" />
        </clipPath>
        ${
          this.drawIn
            ? this.curves.map((curve, curveIdx) => {
                const reveal = curve.visible ? this._revealFor(curve) : null;
                return reveal
                  ? (() => {
                      const clipLeft = PAD_LEFT - 10;
                      const clipRight = PAD_LEFT + GRAPH_W + 10;
                      const visibleEnd =
                        this.scrubberPosition === null
                          ? clipRight
                          : clamp(toSvgX(this.scrubberPosition), clipLeft, clipRight);
                      // Reveal the dot centered on the scrubber completely before
                      // leaving the rest of the post-scrubber span dim and static.
                      const revealEnd = Math.min(
                        clipRight,
                        visibleEnd + (this.scrubberPosition === null ? 0 : SCRUBBER_DOT_RADIUS)
                      );
                      const revealWidth = Math.max(0, revealEnd - clipLeft) * reveal.progress;
                      const dimmedWidth = Math.max(0, clipRight - visibleEnd);
                      return svg`
                        <clipPath class="draw-in-clip" id="${this._drawInClipId(curveIdx, reveal.token)}" clipPathUnits="userSpaceOnUse">
                          <rect class="draw-in-reveal" x="${clipLeft}" y="0"
                            width="${revealWidth}" height="${VB_H}" />
                          ${
                            dimmedWidth > 0
                              ? svg`<rect class="draw-in-dim-span" x="${visibleEnd}" y="0"
                                width="${dimmedWidth}" height="${VB_H}" />`
                              : nothing
                          }
                        </clipPath>
                        <clipPath class="draw-in-dot-clip" id="${this._drawInDotClipId(curveIdx, reveal.token)}" clipPathUnits="userSpaceOnUse">
                          <rect x="${clipLeft}" y="0" width="${revealWidth}" height="${VB_H}" />
                        </clipPath>`;
                    })()
                  : nothing;
              })
            : nothing
        }
      </defs>

      <rect class="plot-frame"
        x="${PAD_LEFT}" y="${PAD_TOP}"
        width="${GRAPH_W}" height="${GRAPH_H}" />

      ${ticks.map(
        (t) => svg`
        <!-- Vertical grid -->
        <line class="grid-line"
          x1="${toSvgX(t)}" y1="${toSvgY(0)}"
          x2="${toSvgX(t)}" y2="${toSvgY(100)}" />
        <!-- Horizontal grid -->
        <line class="grid-line"
          x1="${toSvgX(0)}" y1="${toSvgY(t)}"
          x2="${toSvgX(100)}" y2="${toSvgY(t)}" />
        <!-- X tick labels -->
        <text class="tick-label" text-anchor="middle"
          x="${toSvgX(t)}" y="${VB_H - PAD_BOTTOM + 16}">${t}%</text>
        <!-- Y tick labels -->
        <text class="tick-label" text-anchor="end" dominant-baseline="middle"
          x="${PAD_LEFT - 6}" y="${toSvgY(t)}">${t}%</text>
      `
      )}

      <!-- Axis border lines -->
      <line class="axis-line"
        x1="${PAD_LEFT}" y1="${toSvgY(0)}"
        x2="${PAD_LEFT + GRAPH_W}" y2="${toSvgY(0)}" />
      <line class="axis-line"
        x1="${PAD_LEFT}" y1="${toSvgY(0)}"
        x2="${PAD_LEFT}" y2="${toSvgY(100)}" />

      ${
        this.showXAxisLabel
          ? svg`<text class="axis-label x-axis-label" text-anchor="middle"
              x="${PAD_LEFT + GRAPH_W / 2}" y="${VB_H - 4}">${UI.scrubber.title}</text>`
          : nothing
      }
      <text class="axis-label" text-anchor="middle"
        transform="rotate(-90, 10, ${PAD_TOP + GRAPH_H / 2})"
        x="10" y="${PAD_TOP + GRAPH_H / 2}">${UI.graph.yAxisLabel}</text>
    `;
  }

  private _renderCrossHair(curve: LightCurve) {
    if (this._dragCurveIdx < 0) return nothing;
    const cp = curve.controlPoints[this._dragPointIdx];
    if (!cp) return nothing;

    const cx = toSvgX(cp.lightener);
    const cy = toSvgY(cp.target);

    return svg`
      <line class="crosshair"
        x1="${cx}" y1="${cy}"
        x2="${cx}" y2="${toSvgY(0)}"
        stroke="${curve.color}" opacity="0.5" />
      <line class="crosshair"
        x1="${cx}" y1="${cy}"
        x2="${PAD_LEFT}" y2="${cy}"
        stroke="${curve.color}" opacity="0.5" />
    `;
  }

  /** The point's values, shown next to where it is drawn (`at`, its knot while the curve animates). */
  private _renderTooltip(cp: ControlPoint, at: ControlPoint = cp) {
    const cx = toSvgX(at.lightener);
    const cy = toSvgY(at.target);
    const label = `Group ${cp.lightener}% -> Light ${cp.target}%`;
    const textWidth = Math.ceil(label.length * 4.9);
    // Position above the point, clamped within viewBox
    const tx = clamp(cx - textWidth / 2 - 2, PAD_LEFT, PAD_LEFT + GRAPH_W - textWidth - 8);
    const ty = Math.max(PAD_TOP + 4, cy - 16);

    return svg`
      <rect class="tooltip-bg"
        x="${tx}" y="${ty - 8}"
        width="${textWidth + 8}" height="14" />
      <text class="tooltip-text" text-anchor="start"
        x="${tx + 4}" y="${ty + 2}">${label}</text>
    `;
  }

  private _renderScrubberIndicator() {
    if (this.scrubberPosition === null) return nothing;

    const pos = this.scrubberPosition;
    const x = toSvgX(pos);

    // Dim overlay to the right of the scrubber position.
    // Use fill + fill-opacity separately — color-mix() in SVG fill attributes
    // is not reliably supported across all browsers.
    // Cover the round stroke caps at the plot edges without moving the
    // brightness boundary. At 100% there is no dimmed portion left.
    const dimLeft = x - (pos === 0 ? SCRUBBER_DIM_BLEED : 0);
    const dimOverlay =
      pos === 100
        ? nothing
        : svg`
      <rect
        x="${dimLeft}" y="${toSvgY(100) - SCRUBBER_DIM_BLEED}"
        width="${toSvgX(100) + SCRUBBER_DIM_BLEED - dimLeft}" height="${GRAPH_H + 2 * SCRUBBER_DIM_BLEED}"
        fill="var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)))"
        fill-opacity="0.93"
        pointer-events="none"
      />
    `;

    // Vertical dashed line from x-axis to top of graph
    const line = svg`
      <line class="scrubber-line"
        x1="${x}" y1="${toSvgY(0)}"
        x2="${x}" y2="${toSvgY(100)}" />
    `;

    // Intersection dots on each visible curve — use the same cubic
    // Hermite interpolation as the rendered SVG path so dots sit exactly on the line.
    const dots = this.curves.map((c, curveIdx) => {
      if (!c.visible) return nothing;
      const frame = this._frameFor(c);
      const cy = toSvgY(
        frame ? piecesHeightAt(frame.pieces, pos) : sampleRenderedCurveAt(c.controlPoints, pos)
      );

      return svg`
          <circle
            class="scrubber-dot"
            clip-path="${this._drawInDotClipFor(c, curveIdx)}"
            cx="${x}" cy="${cy}"
            r="${SCRUBBER_DOT_RADIUS}"
            fill="${c.color}"
            filter="url(#scrubber-glow-${c.color.replace('#', '')}-${this._uid})"
            pointer-events="none"
          />
        `;
    });

    return svg`${dimOverlay}${line}${dots}`;
  }

  /** The frame a curve is drawn from while it animates, else null. */
  private _frameFor(curve: LightCurve): CurveFrame | null {
    return this.curveFrame?.entityId === curve.entityId ? this.curveFrame : null;
  }

  private _orderedCurves(): Array<{ curve: LightCurve; idx: number }> {
    const selectedIdx = this.selectedCurveId
      ? this.curves.findIndex((c) => c.entityId === this.selectedCurveId)
      : -1;
    return selectedIdx >= 0
      ? [
          ...this.curves.slice(0, selectedIdx).map((c, i) => ({ curve: c, idx: i })),
          ...this.curves
            .slice(selectedIdx + 1)
            .map((c, i) => ({ curve: c, idx: selectedIdx + 1 + i })),
          { curve: this.curves[selectedIdx], idx: selectedIdx },
        ]
      : this.curves.map((c, i) => ({ curve: c, idx: i }));
  }

  private _renderCurvePaths(curve: LightCurve, curveIdx: number) {
    if (!curve.visible || !curve.controlPoints.length) return nothing;

    try {
      const isSelected = this.selectedCurveId === null || curve.entityId === this.selectedCurveId;
      const isDraggingThisCurve = this._dragCurveIdx === curveIdx;
      const lineOpacity = isSelected ? 1 : 0.2;

      const frame = this._frameFor(curve);
      const prepared = prepareBrightnessConfig(curve.controlPoints);
      const curvePath = frame
        ? buildPiecesPath(frame.pieces)
        : buildSmoothPath(
            prepared.map((cp) => ({ x: toSvgX(cp.lightener), y: toSvgY(cp.target) }))
          );
      const lastX = frame
        ? (frame.pieces[frame.pieces.length - 1]?.x1 ?? 100)
        : prepared[prepared.length - 1].lightener;
      const fillPath =
        curvePath + ` L${toSvgX(lastX)},${toSvgY(0)}` + ` L${toSvgX(0)},${toSvgY(0)} Z`;

      const gradientId = `grad-${curveIdx}-${this._uid}`;
      const dashArray =
        this.selectedCurveId === null
          ? DASH_PATTERNS[curveIdx % DASH_PATTERNS.length]
          : curve.entityId === this.selectedCurveId
            ? ''
            : DASH_PATTERNS[(curveIdx % (DASH_PATTERNS.length - 1)) + 1];

      // Only the selected curve gets a filled area. With nothing
      // selected, treat that as "all curves equally readable" — render lines
      // only, so the chart doesn't show 5 stacked translucent fills.
      const renderFill = this.selectedCurveId !== null && curve.entityId === this.selectedCurveId;
      const revealClip = this._drawInClipFor(curve, curveIdx);

      return svg`
        ${
          renderFill
            ? svg`
              <defs>
                <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="${curve.color}" stop-opacity="0.45" />
                  <stop offset="100%" stop-color="${curve.color}" stop-opacity="0.08" />
                </linearGradient>
              </defs>
              <path
                clip-path="${revealClip}"
                d="${fillPath}"
                fill="url(#${gradientId})"
                style="opacity: ${lineOpacity}"
                pointer-events="none"
              />`
            : nothing
        }
        ${isDraggingThisCurve ? this._renderCrossHair(curve) : nothing}
        <path
          class="curve-line"
          clip-path="${revealClip}"
          d="${curvePath}"
          stroke="${curve.color}"
          stroke-dasharray="${dashArray}"
          style="opacity: ${lineOpacity}"
          pointer-events="none"
        />
      `;
    } catch {
      return nothing;
    }
  }

  private _renderCurvePoints(curve: LightCurve, curveIdx: number) {
    if (!curve.visible || !curve.controlPoints.length) return nothing;

    try {
      const isInteractive = this._isCurveInteractive(curveIdx);
      const showPoints = isInteractive && !this.readOnly;
      if (!showPoints) return nothing;

      const isDraggingThisCurve = this._dragCurveIdx === curveIdx;
      const fillColor = curve.color + '33';

      let tooltipIdx = -1;
      if (isDraggingThisCurve && this._dragPointIdx >= 0) {
        tooltipIdx = this._dragPointIdx;
      } else if (this._hoveredPoint?.curve === curveIdx || this._focusedPoint?.curve === curveIdx) {
        tooltipIdx =
          this._focusedPoint?.curve === curveIdx
            ? this._focusedPoint.point
            : (this._hoveredPoint?.point ?? -1);
      }
      const tooltipPoint = curve.controlPoints[tooltipIdx] ?? null;

      const knots = this._frameFor(curve)?.knots ?? null;
      const reveal = this._revealFor(curve);
      return svg`
        ${curve.controlPoints.map((cp, pi) => {
          const shouldPop =
            reveal !== null &&
            (this.scrubberPosition === null || cp.lightener <= this.scrubberPosition);
          // Where the point is drawn; the label, input and tooltip read cp itself.
          const at = knots?.[pi] ?? cp;
          const isOrigin = pi === 0;
          const isActive = isDraggingThisCurve && this._dragPointIdx === pi;
          const isHovered =
            this._hoveredPoint?.curve === curveIdx && this._hoveredPoint?.point === pi;
          // Control points are layered above the dim overlay. Mirror
          // the curve fade by lowering opacity for points past the scrubber
          // so endpoints don't sit fully saturated inside the faded region.
          const isPastScrubber =
            this.scrubberPosition !== null && cp.lightener > this.scrubberPosition;
          const pointOpacity = isPastScrubber ? 0.35 : 1;
          const settleDy =
            this._settle?.curve === curveIdx && this._settle.point === pi ? this._settle.dy : 0;
          const marker = controlPointShape(
            LEGEND_SHAPES[curveIdx % LEGEND_SHAPES.length],
            toSvgX(at.lightener),
            toSvgY(at.target) + settleDy,
            6,
            `control-point ${isOrigin ? 'origin' : ''} ${isActive ? 'dragging' : ''} ${
              isHovered ? 'hovered' : ''
            } ${
              this._focusedPoint?.curve === curveIdx && this._focusedPoint?.point === pi
                ? 'focused'
                : ''
            }`,
            fillColor,
            curve.color,
            pointOpacity,
            curve.color
          );
          return svg`
            <circle
              class="hit-circle ${isOrigin ? 'origin-hit' : ''}"
              data-curve="${curveIdx}"
              data-point="${pi}"
              cx="${toSvgX(at.lightener)}"
              cy="${toSvgY(at.target)}"
              r="${this._isMobile ? 28 : 22}"
              fill="transparent"
              pointer-events="all"
              tabindex="0"
              role="button"
              aria-describedby=${curve.entityId === this.exampleEntityId ? `example-${this._uid}` : nothing}
              aria-label="${curve.friendlyName} point ${cp.lightener}% group brightness to ${cp.target}% light brightness. ${pi === 0 ? 'Arrow Up/Down to adjust starting brightness. Cannot be moved horizontally.' : 'Arrow keys move, Enter adds a nearby point, Space removes.'}"
              style="touch-action: none; -webkit-touch-callout: none"
              @pointerdown=${(e: PointerEvent) => this._onPointerDown(e, curveIdx, pi)}
              @contextmenu=${(e: MouseEvent) => this._onPointContextMenu(e, curveIdx, pi)}
              @pointerenter=${() => (this._hoveredPoint = { curve: curveIdx, point: pi })}
              @pointerleave=${() => (this._hoveredPoint = null)}
              @pointercancel=${() => {
                this._hoveredPoint = null;
                this._focusedPoint = null;
              }}
              @focus=${() => this._onPointFocus(curveIdx, pi)}
              @blur=${() => this._onPointBlur(curveIdx, pi)}
              @keydown=${(e: KeyboardEvent) => this._onPointKeyDown(e, curveIdx, pi)}
            />
            ${
              shouldPop && reveal
                ? this._pendingDrawInToken !== null
                  ? svg`<g class="marker-wait" visibility="hidden">${marker}</g>`
                  : keyed(
                      `${reveal.token}:${curve.entityId}:${pi}`,
                      svg`<g class="marker-pop"
                    style="animation-delay: ${DRAW_IN_REVEAL_MS + pi * DRAW_IN_STAGGER_MS}ms">${marker}</g>`
                    )
                : marker
            }
          `;
        })}
        ${
          tooltipPoint !== null
            ? this._renderTooltip(tooltipPoint, knots?.[tooltipIdx] ?? tooltipPoint)
            : nothing
        }
      `;
    } catch {
      return nothing;
    }
  }

  // _svgRef is now a @query decorator — always resolves to the live SVG node.
  // No firstUpdated override needed.

  protected willUpdate(changed: PropertyValues<this>): void {
    if (
      this._pointPress &&
      (changed.has('entityId') ||
        (changed.has('readOnly') && this.readOnly) ||
        (!this._longPressFired && !this._pointPressIsCurrent()))
    ) {
      this._finishPointPress('cancel');
    }
    // The card clears its effect before switching groups. Keep this local guard
    // as well so direct graph consumers cannot carry a pending reveal across IDs.
    if (changed.has('entityId')) this._stopDrawIn();
    const drawIn = this.drawIn;
    const plays = drawIn !== null && this.isConnected && momentPlays(this.joy, 'draw_in');
    const effectIsCurrent =
      drawIn !== null &&
      (this._reveal?.token === drawIn.token || this._pendingDrawInToken === drawIn.token);
    if (!drawIn || !effectIsCurrent || !plays) this._stopDrawIn();
    // Tokens increase at the card boundary. Consuming a token even when disabled
    // means neither a reconnect nor a flag change can replay an interrupted reveal.
    if (drawIn && drawIn.token > this._lastDrawInToken) {
      this._lastDrawInToken = drawIn.token;
      if (plays) this._waitForDrawInVisibility(drawIn.token);
    } else if (
      plays &&
      changed.has('drawIn') &&
      this._pendingDrawInToken === drawIn.token &&
      drawIn.ready !== false
    ) {
      this._waitForDrawInVisibility(drawIn.token);
    }
    if (changed.has('joy') && !this.joy.diagonal) this._stopFlash();
    if (!this._cancelSettleLoop) return;
    const flagOff = changed.has('joy') && !this.joy.settle;
    const pointReplaced = changed.has('curves') && !this._settlePointUnchanged();
    if (flagOff || pointReplaced) this._stopSettle();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._mql = window.matchMedia(MOBILE_BREAKPOINT_MEDIA_QUERY);
    this._isMobile = this._mql.matches;
    this._mql.addEventListener('change', this._onMqlChange);
    window.addEventListener('blur', this._onWindowBlur);
    void this.updateComplete.then(() => {
      if (!this.isConnected || this._labelResizeObserver || !this._svgRef) return;
      this._updateLabelScale();
      if (typeof ResizeObserver !== 'undefined') {
        this._labelResizeObserver = new ResizeObserver(this._updateLabelScale);
        this._labelResizeObserver.observe(this._svgRef);
      }
    });
    if (typeof IntersectionObserver !== 'undefined') {
      this._drawInObserver = new IntersectionObserver(this._onDrawInIntersection, {
        threshold: 0.5,
      });
      this._drawInObserver.observe(this);
    }
  }

  disconnectedCallback(): void {
    this.cancelInteraction();
    super.disconnectedCallback();
    this._stopDrawIn();
    this._drawInObserver?.disconnect();
    this._drawInObserver = null;
    this._labelResizeObserver?.disconnect();
    this._labelResizeObserver = null;
    window.removeEventListener('blur', this._onWindowBlur);
    this._mql?.removeEventListener('change', this._onMqlChange);
    this._mql = null;
  }

  private _onMqlChange = (e: MediaQueryListEvent): void => {
    this._isMobile = e.matches;
  };

  private _onWindowBlur = (): void => {
    this.cancelInteraction();
  };

  private _updateLabelScale = (): void => {
    const bounds = this._svgRef?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
    // preserveAspectRatio="meet" can letterbox a height-capped graph.
    // Use the smaller axis to measure the displayed plot scale.
    const scale = Math.min(bounds.width / VB_W, bounds.height / VB_H);
    this._labelScale = Math.min(1, DEFAULT_GRAPH_MAX_HEIGHT / VB_H / scale);
  };

  private _getSvgDescription(): string {
    const visible = this.curves.filter((c) => c.visible);
    if (!visible.length) return 'No curves displayed';
    const items = visible.map((c) => {
      const maxTarget = c.controlPoints.reduce(
        (max, p) => (Number.isFinite(p.target) ? Math.max(max, p.target) : max),
        0
      );
      return `${c.friendlyName} (${c.controlPoints.length} points, max ${maxTarget}%)`;
    });
    return `${visible.length} curve${visible.length === 1 ? '' : 's'}: ${items.join(', ')}`;
  }

  private _renderExampleInstruction() {
    const index = this.curves.findIndex((c) => c.entityId === this.exampleEntityId);
    const curve = this.curves[index];
    if (!curve || !this.exampleInstruction) return nothing;
    const point = curve.controlPoints.reduce((best, p) =>
      Math.abs(p.lightener - 50) < Math.abs(best.lightener - 50) ? p : best
    );
    const above = toSvgY(point.target) - PAD_TOP >= 44;
    const direction = above ? -1 : 1;
    const label =
      LEGEND_SHAPES[index % LEGEND_SHAPES.length] === 'circle'
        ? this.exampleInstruction
        : UI.invitation.dragPoint;
    return svg`<g class="example-instruction ${this.exampleCueAnimating ? 'example-cue-animating' : ''}"
      transform="translate(${toSvgX(point.lightener)} ${toSvgY(point.target)})" aria-hidden="true">
      <circle class="example-cue-ring" r="15" />
      <path class="example-cue-leader" d="M -11 ${direction * 11} Q -16 ${direction * 35} -24 ${direction * 35}" />
      <text class="example-cue-label" x="-27" y=${direction * 35 + (above ? 0 : 10)}
        text-anchor="end">${label}</text>
    </g>`;
  }

  private _renderCenteredHintBand(
    width: number,
    height: number,
    centerY: number,
    content: ReturnType<typeof svg>
  ) {
    const cx = PAD_LEFT + GRAPH_W / 2;
    const x = cx - width / 2;
    const y = centerY - height / 2;
    return svg`
      <rect
        class="hint-band"
        x="${x}"
        y="${y}"
        width="${width}"
        height="${height}"
        rx="8"
        pointer-events="none"
      />
      ${content}
    `;
  }

  private _renderPreviewCurve() {
    const curve = this.previewCurve;
    if (!curve || !curve.controlPoints.length) return nothing;

    try {
      const prepared = prepareBrightnessConfig(curve.controlPoints);
      const pathPoints = prepared.map((cp) => ({
        x: toSvgX(cp.lightener),
        y: toSvgY(cp.target),
      }));
      const curvePath = buildSmoothPath(pathPoints);
      const marker =
        this.scrubberPosition !== null
          ? svg`
              <circle
                class="preview-curve-point"
                r="3"
                cx="${toSvgX(this.scrubberPosition)}"
                cy="${toSvgY(sampleRenderedCurveAt(curve.controlPoints, this.scrubberPosition))}"
              />`
          : nothing;

      return svg`
        <g
          class="preview-curve"
          clip-path="url(#graph-area-${this._uid})"
          style="--preview-color: ${curve.color}"
        >
          <path
            class="preview-curve-line"
            d="${curvePath}"
            stroke="${curve.color}"
          />
          ${marker}
        </g>
      `;
    } catch {
      return nothing;
    }
  }

  // Loading and error states are owned by the parent card (`<lightener-curve-card>`),
  // which renders its own skeleton and error banner. Adding duplicate render
  // branches here was dead code — see TODOS.md if a graph-level loading
  // contract is ever needed independently.

  render() {
    return html`
      <svg
        viewBox="0 0 ${VB_W} ${VB_H}"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Brightness curve editor graph"
        style="--graph-label-scale: ${this._labelScale}"
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @lostpointercapture=${this._onPointerUp}
        @pointercancel=${this._onPointerUp}
        @dblclick=${this._onDblClick}
        @contextmenu=${(e: MouseEvent) => {
          if (!this.readOnly) e.preventDefault();
        }}
      >
        <desc>${this._getSvgDescription()}</desc>
        ${this._renderGrid()}

        <!-- Invisible hit area for double-click -->
        ${!this.readOnly
          ? svg`<rect
              class="hit-area"
              x="${PAD_LEFT}"
              y="${PAD_TOP}"
              width="${GRAPH_W}"
              height="${GRAPH_H}"
              pointer-events="all"
              fill="transparent"
              @pointerdown=${this._onHitAreaPointerDown}
              @pointerup=${this._onHitAreaPointerUp}
              @pointercancel=${this._onHitAreaPointerCancel}
            />`
          : nothing}
        ${this.joy.diagonal
          ? svg`<line class="diagonal-ref" x1=${toSvgX(0)} y1=${toSvgY(0)}
              x2=${toSvgX(100)} y2=${toSvgY(100)} pointer-events="none" />`
          : nothing}
        <!-- Phase 1: curve fills and lines (rendered before scrubber overlay) -->
        ${(() => {
          const order = this._orderedCurves();
          return svg`<g clip-path="url(#graph-area-${this._uid})">${order.map(({ curve, idx }) => this._renderCurvePaths(curve, idx))}</g>`;
        })()}
        ${this._renderDiagonalFlash()}
        <!-- Scrubber glow filters (only re-render when curves change, not on every position update) -->
        <defs>
          ${this.curves
            .filter((c) => c.visible)
            .map((c) => {
              const id = `scrubber-glow-${c.color.replace('#', '')}-${this._uid}`;
              return svg`
              <filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feFlood flood-color="${c.color}" flood-opacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>`;
            })}
        </defs>
        ${this.exampleEntityId
          ? svg`<desc id="example-${this._uid}">${UI.invitation.description}</desc>`
          : nothing}
        ${this._renderScrubberIndicator()} ${this._renderPreviewCurve()}
        <!-- Phase 3: control points rendered after scrubber overlay so they are always visible -->
        ${(() => {
          // Keep a slot for every curve, including ones rendering nothing.
          // Reordering or filtering here replaces points and drops keyboard focus.
          return svg`<g clip-path="url(#graph-area-${this._uid})">${this.curves.map((curve, idx) => this._renderCurvePoints(curve, idx))}</g>`;
        })()}
        ${this._renderExampleInstruction()}
        ${(() => {
          if (this.readOnly) return nothing;
          if (this.curves.length === 0) {
            const centerY = PAD_TOP + GRAPH_H / 2;
            return this._renderCenteredHintBand(
              220,
              32,
              centerY,
              svg`<text class="hint hint-select" text-anchor="middle"
                x="${PAD_LEFT + GRAPH_W / 2}" y="${centerY + 4}"
                pointer-events="none"
                >Add a light below to get started</text>`
            );
          }
          return nothing;
        })()}
      </svg>
    `;
  }
}

safeDefine('curve-graph', CurveGraph);

declare global {
  interface HTMLElementTagNameMap {
    'curve-graph': CurveGraph;
  }
}
