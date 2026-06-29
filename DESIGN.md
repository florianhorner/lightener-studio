# Design System

This document captures the current visual system for the Lightener curve editor so future UI work extends a consistent language instead of re-inventing it component by component.

## Principles

- Use a graph-first workspace. The graph owns the visual center; scrubber, legend, and panel controls recede into quiet supporting surfaces instead of competing with it.
- Use the quiet space for facts from the data, not generic instructions. A populated graph may show a compact state summary such as "20 lights match the group brightness" when curves overlap, but should not show resident how-to chrome.
- Keep editing feedback immediate. Dirty state, preview state, save state, and loading state should all be visible in-place without modal dialogs.
- Favor compact, scannable controls. The editor is often used from tablets and narrow dashboards, so labels stay short and actions stay physically close to the graph.
- Make color supportive, not exclusive. Curves use color, dash patterns, shape markers, and labels together so the UI remains legible for colorblind and assistive-tech users.

## Brand identity

The brand should leave one memory: the room follows you. Lightener Studio is not
a generic light switch, bulb, or automation engine; it is the place where a room's
brightness response is shaped by hand and then felt immediately.

The logo territory is original abstract brightness-response geometry: a rising
curve, visible control points, and a quiet reference line. This keeps the mark
connected to the editor without leaking implementation language into the product
voice. The cyan/blue curve carries continuity with the app and public preview;
a restrained warm endpoint may suggest the final light in the room, but warm
glow should stay secondary.

Brand art must not reuse, trace, upscale, or adapt:

- Home Assistant house/network imagery or official Home Assistant marks.
- The upstream Lightener bulb/bolt/crescent artwork.
- Generic bulb, lightning bolt, or smart-home house icons.

The editable brand sources live in `images/lightener*.svg`. Exported local
Home Assistant/HACS PNGs live in `custom_components/lightener_studio/brand/`.
The committed PNGs are transparent, trimmed, and include light/dark icon and
landscape logo variants.

## Voice and vocabulary

### Lead with the light

People come to Lightener for a room that behaves the way they want, not to run an engine. So every word we show names what they'll **see or feel in the room**, never the mechanism behind it. There's real machinery underneath (per-light response shapes, live preview, group-brightness mapping), and our job is to keep its weight off the user. **Name the outcome, not the action. Use the same word for the same thing everywhere. If a word makes someone think about the software instead of the room, cut it.**

Two tenets carry it:

1. **Name the outcome, not the action.** Labels and buttons say what happens in the room. "Watch room react", not "Preview". (GOV.UK and NN/g agree: button text should describe the action and its outcome.)
2. **Make the mammoth small.** There's a serious engine here; the words never make the user carry it. Plain language, per ISO 24495-1: the reader can find what they need, understand it, and act on it. One idea per line, one word per concept, no jargon they didn't bring. Judge it by whether a normal person can act, not by a readability score.

Grounding: ISO 24495-1:2023 (plain language) is the live reference; IEC/IEEE 82079-1:2019 (instructions for use) is best practice, not legally required for software like this.

### Rules for any user-facing string

- **Sentence case.** "Save this room", not "Save This Room".
- **Active, imperative verbs.** Say what the user does or gets.
- **Buttons name the room outcome.** "Watch room react" beats "Preview".
- **One concept, one word** (see glossary). Don't reach for synonyms.
- **"You / your room" voice.**
- **No mechanism leaking into copy.** Not "holding the lights", "control point", "linear", "entity".

### Glossary

| Concept | Use | Avoid |
|---|---|---|
| A controllable light | **light** | entity, device, bulb |
| The space being lit | **room** | scene, zone, area (in copy) |
| How bright | **brightness** | level, value, % (in prose) |
| A light's response | **shape** | curve (except where precision is needed) |
| The set of lights | **group** | collection, set |
| Trying it live | **watch the room react** | preview |

"curve" stays fine in code identifiers and precise technical docs; the preference applies to user-facing display copy.

### Where copy lives

- **Card display strings:** `js/src/utils/strings.ts` is the home for new or changed user-facing card copy — add it there and import it, don't hardcode it in a template. `scripts/lint-vocabulary` enforces the full banned list on `strings.ts` (a file it can scan with zero false positives) and the universal-filler subset (`click here`, `simply`, `obvious`) on component source and demo HTML. It runs in CI and pre-commit and self-tests with `scripts/lint-vocabulary --self-test`; a documented exception carries a `lint-vocabulary-ok` comment marker. Identifier-colliding terms like `preview`/`entity` can't be machine-scanned inside component source (they appear as `previewActive`, `entityId`, `<ha-entity-picker>`), so those are caught only in `strings.ts` — which is why new card copy belongs there. Pre-existing inline strings in `curve-legend.ts` / `curve-graph.ts` / `lightener-curve-card.ts` are migrated into `strings.ts` incrementally; until then the guard does not cover them.
- **Config-flow / setup strings:** `custom_components/lightener_studio/translations/*.json` (keyed and localized through Home Assistant).
- **Sanctioned exemptions (intentional, not oversights):** the graph is a precision surface, so "curve" is allowed there (axis and ARIA labels such as "Brightness curve editor graph"); and the entity-picker fallback may say "entity ID" because that is the literal Home Assistant term the user types. Everywhere else the glossary applies.

## Tokens

### Surfaces

- `--card-bg`: primary card surface
- `--panel-bg`: mixed workspace panel surface
- `--graph-bg`: graph background color; used by `curve-graph` for the scrubber dim overlay
- `--divider`: low-contrast structural borders
- `--lightener-panel-surface`: panel shell surface
- `--lightener-panel-border`: panel shell border

### Type

- `--text-xs`: 9px utility labels
- `--text-sm`: 12px status copy and controls
- `--text-md`: 13px list rows
- `--text-lg`: 14px card heading
- `--secondary-text`: card-level alias for Home Assistant `--secondary-text-color`; graph and footer children use this alias when the card shell supplies it, with `#616161` fallback

Typography rules:

- Section labels use uppercase, tight tracking, and secondary text color.
- Main titles use modest weight and slightly negative tracking.
- Status copy should remain short enough to scan in one line when possible. Prefer user-facing words like "lights", "brightness", and "shape" over implementation terms like "curve" unless precision is needed. Persistent helper copy belongs to empty, error, safety, or factual graph-state summaries; populated editing states should prefer direct affordances, ARIA labels, and transient tooltips.
- All user-facing wording follows the **Lead with the light** principle and the glossary in the [Voice and vocabulary](#voice-and-vocabulary) section below: name the room outcome, not the machinery. New card display strings live in `js/src/utils/strings.ts`, guarded by `scripts/lint-vocabulary` (see [Voice and vocabulary](#voice-and-vocabulary) for the guard's scope and exemptions).

### Shape

- Outer cards: 16px radius
- Embedded panels and sub-panels: 12px radius
- Buttons: 8px radius in-card, pill radius in panel-level callouts
- Interactive dots: 6px visual point with larger invisible hit target

### Motion

- Success state fades instead of snapping away.
- Undo and cancel use a short cubic ease animation.
- Loading uses a shimmer skeleton that preserves graph space.
- Sticky mobile footer should feel anchored, not floating; use blur and a subtle divider instead of heavy shadows.

### Breakpoints

- `500px` is the shared component mobile breakpoint for graph, scrubber, legend, and footer touch-target adjustments.
- Use `MOBILE_MEDIA` from `js/src/utils/breakpoint-styles.ts` for component `css` `@media` blocks, and `MOBILE_BREAKPOINT_MEDIA_QUERY` from `js/src/utils/breakpoints.ts` for `matchMedia` consumers, instead of hand-writing nearby values. `breakpoints.ts` stays framework-free; `breakpoint-styles.ts` is the Lit-aware adapter that wraps the value in a `css` fragment.
- The editor shell may still use wider layout breakpoints for column stacking; do not mix those shell-layout thresholds with the 500px touch/mobile component threshold.

## Component Patterns

### Curve Card

- Header is quiet and compact in embedded mode.
- Workspace becomes two columns on wide layouts and a stacked flow on narrow ones.
- Secondary surfaces such as starting-shape presets live in the side rail, not above the graph. Opening one must not push the graph down or compete with the main editing surface.
- On narrow screens, action buttons live in a sticky footer directly below the graph stack.

### Graph

- Show grid, diagonal reference, and axis labels at all times.
- Selected curve stays visually dominant; non-selected curves dim.
- Populated graphs should not carry persistent instruction overlays. Keep the plot clear; editing guidance lives in focusable point labels and transient point tooltips. Empty graphs may use the centered hint band.
- The card shell may show a graph-state summary above the SVG when it describes the current data: matching group brightness, one shared brightness shape, mixed shapes, hidden lights, or the selected light's shape. These summaries are context, not instructions, and must update from actual control points.
- Editing affordances:
  - Pointer drag moves points without requiring a selection; the **origin point** (leftmost) is Y-only constrained — a dashed stroke and `ns-resize` cursor signal restricted movement
  - Double-click (`Enter` on keyboard) adds a point — requires a selected light/curve target
  - Right-click, long-press, or `Space` removes a point — requires a selected light/curve target; origin point is protected from accidental long-press deletion
  - Keyboard focus on points enables arrow-key movement, `Enter` add, and `Space` remove (ARIA labels distinguish origin [Y-only, no remove] from all other points [free move + remove])
- SVGs must include a descriptive `<desc>` summary for screen readers.

### Scrubber

- Track aligns with graph padding so preview position matches the plotted data.
- Value badges are a trust feature; if not all fit, show `+N more` rather than silently clipping. Badge overflow measurement is skipped while the list is expanded to prevent flicker loops.
- Visible scrubber copy stays compact. Use "Try brightness" and "Watch room react" language; do not add helper sentences unless they carry safety-critical state.
- Preview state should always be reversible and clearly announced.

### Preview Toggle

- A **Watch room react** button in the scrubber panel enters preview mode independently of scrubber position, defaulting to 50% if the scrubber has not been touched.
- Lights restore to their pre-preview state on: toggle off, `disconnectedCallback`, or entity change.
- Preview brightness changes ease over a fixed short transition (0.25s) using Home Assistant's native `transition` — both when entering or scrubbing preview and when restoring, so lights glide instead of snapping. Devices without native transition support fall back to an abrupt change.
- The button must show clear active/inactive state; do not rely on color alone.

### Legend

- Include a section label: `Lights`.
- Include a compact factual count (`20 lights showing`, `2 lights · 1 hidden`) so dense groups stay understandable without helper text.
- Each item combines color, shape, name, and visibility affordance.
- Raw light IDs are secondary context. Keep them available on hover, focus, selection, or management mode, but do not show them as a permanent third line in the default list.
- Rows should stay lightweight: prefer separators over heavy fills, avoid permanent editing chips, and use an underline accent for selected state instead of heavier framing.
- Groups with 20 or more lights use bounded legend height and slightly denser rows so the light list scrolls inside the supporting surface instead of lengthening the whole editor.

### Hidden Parents

- Hidden dashboard parents such as tabs, popups, and stacked dashboards must preserve graph space until the card becomes visible again.
- Prefer visibility/resize guards only after reproducing a concrete hidden-parent failure in a browser; avoid speculative observers that can fight Home Assistant's native dashboard lifecycle.
- If a hidden-parent issue is reproduced, the guard should be scoped to graph sizing/re-rendering and must not alter save, preview, or entity-load lifecycle behavior.

### Panel

- The entity selector sits in a distinct control row ahead of the editor workspace.
- Unsaved entity switches use an inline confirmation bar, never a blocking browser dialog.
- Empty states should explain what Lightener is, how to start, and where to go next.

## Accessibility Baseline

- Do not rely on color alone to distinguish curves.
- Keep touch targets at mobile-friendly sizes.
- Provide keyboard paths for scrubber, legend, and graph point editing.
- Use `role="status"` or `role="alert"` for transient save/load feedback where appropriate.

## Change Rule

When adding a new editor surface or control, first decide:

1. Which existing panel pattern it belongs to
2. Which token drives its spacing, shape, and type
3. How its dirty/loading/error state is shown inline
4. What the keyboard and screen-reader path is
