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

- **Sentence case.** "Watch room react", not "Watch Room React".
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
- A pinned action row should feel anchored, not floating; use blur and a subtle divider instead of heavy shadows.
- Joy moments are on by default, including in the sidebar editor. Individual `joy:` flags may opt out per dashboard card. Their hit tests, shape blends, durations and shared frame loop live in `js/src/utils/motion.ts`; the flash's fade, the draw-in's marker pop and a removed light's fade use CSS keyframes in `curve-graph.ts`, timed by `DIAGONAL_FLASH_MS`, `DRAW_IN_POP_MS` and `DRAW_OUT_FADE_MS`. They never block input. Reduced motion turns off everything that moves; each moment below says what stays.
  - Settle: a released point's marker overshoots 2 SVG units in the direction of its net brightness change (up or down) over 70ms, then returns over 180ms (easeOutCubic). No change, no settle. Only the marker moves; the data, the path and the hit target stay put. A new press, a key press on a point, or a change to the released point itself (a shape applied, an undo) ends it early. Off under reduced motion.
  - Diagonal: a faint dashed reference diagonal from 0% to 100% (`--secondary-text`, 0.75 wide, dash `3 4`, opacity 0.3) sits under the curves. During a drag, a point that lands on the diagonal (never the origin point), on the 0% line or on the 100% line makes that line flash once in `--primary-color` (2 wide, 400ms, peaking at opacity 0.9 at 25%), and touch screens that can vibrate get a 5ms tap. A line stays held until the point has moved 2 steps off it, so the rounding wobble of a drag along a line, or where two lines meet, stays quiet; landing on two lines at once (the top-right corner) flashes the diagonal. The first move of a new drag that lands on a line fires even if the point started there. A new press or key press ends the flash, and nothing fires while the graph is read-only (an undo or cancel animating). Like the curves, both lines sit under the scrubber's dim. A dragged point that comes within 9.2 screen pixels of one of these lines, and no more than 3.45 steps, lands on it: the nearest line wins, a tie goes to the diagonal, and the origin point never takes the diagonal. The reach comes from the measured graph scale, so a graph without a layout never snaps, and keyboard moves never snap. Under reduced motion there is no flash; the reference line, the snapping and the tap stay.
  - Ripple: choosing a shape chip commits the exact new shape at once, so undo, the dirty state and the live preview are what they are without the moment; only the drawing moves. Every x position of the old and the new shape is a point that eases (easeOutCubic) from the old drawn curve to the new one over 300ms, starting 20ms after the point to its left, so a change takes 300 + 20 × (points − 1) ms; past 8 points the delay shrinks, so no change takes longer than 0.44s. Between points the curve blends the old and the new drawn curve piece by piece by their progress, so it starts exactly on the curve on screen and ends exactly on the new shape. The line, fill, markers, hit targets, tooltips and scrubber dot travel with the drawing; the values shown (tooltip text, legend and scrubber readouts) are the new shape's from the click. A press on one of that light's points, a drag, an arrow key that moves one of its points, a point added to or removed from it, a reload, or a shape chosen for another light ends it at once, so editing always starts from the real points. Another shape for the same light continues from the curve on screen, and so do Undo and Cancel, which draw that light's line on to their target (markers stay hidden while they run, as before). Hiding or selecting another light does not stop it. A shape previewed from its chip moves too: over 240ms (easeOutCubic) the dashed preview and its dot travel from what was shown before, the previous preview or else the light's own curve, drawn through one height per brightness step, to the new shape. Another chip continues from where the preview is; a re-render of the same shape keeps its geometry still. While the preview is visible, its dashes drift by one 8-unit dash cycle every 1.6 seconds; a preview that ends disappears at once; while a ripple draws that light, the preview appears at once. Off under reduced motion: the shape applies at once, and a preview appears without motion.
  - Draw-in: after a successful Edit lights update, only newly added lights reveal their fills, lines and scrubber dots over 500ms (easeOutCubic). After Edit lights restores focus, a fresh IntersectionObserver sample starts the reveal 200ms (`DRAW_IN_DELAY_MS`) after at least half the graph is visible, without scrolling the page, so the eye is back on the graph first. Scrolling away during that pause cancels it until the next visible sample. Pending curves are clipped at zero progress and their undimmed markers stay hidden without starting the pop clock. Scrolling the graph away returns it to that waiting state and clears the cleanup timer; it restarts when visible again. The reveal follows the undimmed scrubber span, with enough overlap to reveal the scrubber dot fully. The curve past the scrubber stays dim and visible; a separate dot clip keeps the dot behind the wipe. Clips live beside the graph-area clip in the root SVG definitions, outside clipped groups. Shape hover and focus trials wait while a draw-in token is active and resume at cleanup if either hover or focus remains on a chip. Each engagement is tracked separately and cleared by its own leave or blur event; both are cleared when trials are invalidated. Only rendered markers at or before the scrubber pop, so the first added light, which Edit lights selects, shows those points at 500 + point index × 40ms. Each pop takes 150ms, scaling from 0 to 1.15 at 70%, then to 1; a keyed SVG wrapper preserves the marker's own shape and rotation. Hit targets remain usable throughout. A capture-phase press or key press anywhere in the card ends a running draw-in without consuming the event; a pending reveal allows pointerdown for touch scrolling but ends on a completed click or key press. A newer membership update, entity change, disabled flag, reduced motion starting or disconnect also ends it. Once the graph starts, cleanup waits at least 1200ms and extends to the last marker pop actually rendered, using its original point index and excluding hidden curves, unselected curves and points past the scrubber, even if no frame ran. Lights the same update removed keep their last line, and the selected light its area, drawn as they were with the previous selection and dash pattern under the live curves; after the same 200ms they fade out over 360ms. That copy is never interactive, and a newer membership update, entity change, disabled flag or disconnect ends it. Off under reduced motion: the curves and points appear at once, and removed lights disappear at once.

The programmatic first-use example is disabled by default and cannot be enabled
through card YAML. It reuses the graph's native handles and ripple utility, with
an orientation pause, a brief handle cue, then Dim emphasis before a slower shape
change. The temporary drawing and readouts never alter configuration or light
output. Native interaction freezes it immediately; the first effective edit
adopts that frame in one undoable transaction. A stationary press stays clean.
Dismissal restores the actual shape. Reduced motion uses a static example;
switching to reduced motion freezes the visible frame. Replay requires a clean,
idle editor with physical preview off. A stable polite status region announces
the example and keyboard route once, without per-frame announcements.

### Breakpoints

- `500px` is the shared component mobile breakpoint for graph, scrubber, legend, and footer touch-target adjustments.
- Use `MOBILE_MEDIA` from `js/src/utils/breakpoint-styles.ts` for component `css` `@media` blocks, and `MOBILE_BREAKPOINT_MEDIA_QUERY` from `js/src/utils/breakpoints.ts` for `matchMedia` consumers, instead of hand-writing nearby values. `breakpoints.ts` stays framework-free; `breakpoint-styles.ts` is the Lit-aware adapter that wraps the value in a `css` fragment.
- The editor shell's column stacking keys on the **card's own width** via a container query (`container-type: inline-size` on `.card`, two columns from 860px), so the Lovelace card and the sidebar panel lay out identically at the same size. Do not reintroduce viewport media queries for shell layout, and do not mix the shell threshold with the 500px touch/mobile component threshold.

## Component Patterns

### Curve Card

- Header is quiet and compact in embedded mode; `embedded` controls chrome only, never layout.
- Workspace becomes two columns on wide cards and a stacked flow on narrow ones, keyed on card width (see Breakpoints) so both hosting contexts behave the same.
- Selected-light shape commands live in the graph header/workbench as compact chips, not in the side rail. Each chip shows only a tiny shape signature plus the short shape name (`Equal`, `Dim`, `Early`, `Late`); long descriptions and helper sentences stay out of the populated editing UI. Chips sit on the left of the workbench, at most 300px wide. Hover/focus may trial the shape in the graph and update the graph header; click applies it and enables Undo, Cancel and Save.
- First-curve tips reuse the graph-header summary slot and can be dismissed or reopened with the small help button. Tips and summaries share reserved space so opening, updating, or dismissing a tip does not move the graph. They lead with a recognizable lamp problem, then optional room preview or Save. Existing groups do not automatically replay the tips; ordinary sidebar entry and reload always offer help without backend progress tracking. A confirmed save explains that the group's brightness control uses the saved shape. Save never implies that a temporary preview level is kept.
- The side rail is for the light list and light management. The add-light form may still offer a starting shape, but that setup picker is separate from selected-light editing.
- A context line above the graph names the selected light beside an All lights button that clears the selection; with nothing selected it reads All lights. It keeps its height, so selecting and clearing never move the graph.
- The action row sits under Room brightness at every width: Watch room react on the left, then save feedback, Undo, Cancel and Save. Clean, dirty and saving states keep the same height, and unavailable actions stay visible and disabled. On narrow cards Watch room react and the save feedback share a line above the edit commands. While the row is active (unsaved changes, saving, watching or save feedback) and scrolled out of view, it pins to the bottom of the viewport and its place in the editor stays reserved.
- The help button sits in the card header; in the sidebar panel it sits at the end of the panel header. The group picker stays panel-owned and outside editor shortcuts.
- Room brightness stays below the graph, aligned to the actual plot endpoints on wide cards. Narrow cards stack the graph, Room brightness, the action row and then the lights.
- The editor graph is capped at 520px tall. Tick and label text keep the proportions of the 320px reference, so a taller graph shows more plot without larger text. Playable previews keep this native size. Keep supporting controls compact. Avoid duplicate labels, permanent entity-ID lines outside the reserved light rows, or extra explanatory panels.
- Light rows retain full Home Assistant names. Entity IDs reveal on row hover, keyboard focus (including the eye), and selection without changing row height. The marker toggles selection; the eye independently toggles visibility. A bar tap focuses idempotently, and a deliberate horizontal drag edits only that light at the captured room position, with one Undo snapshot per gesture.

### Graph

- Built-in shapes must have intentional, attractive silhouettes without unnecessary zigzags. Add only useful points that keep the linear brightness response close to the drawn shape, and keep their handles independently selectable on phones. Existing saved shapes are not migrated when starting shapes change.
- Show grid and axis ticks at all times. The diagonal reference follows `joy.diagonal`.
- Show "Room brightness" once, on the Room bar under the graph; the graph carries no x-axis title. Tick typography must stay compact as the graph grows.
- Grid lines stay quiet (opacity 0.075). Curves draw at 1.5 SVG units, the selected curve at 2.5 and a curve hovered in the light list at 3. Point size and hit regions do not change.
- Selected curve stays visually dominant; non-selected curves dim.
- The selected light and a visible light hovered in the list fill the area under their curves; with neither, curves draw as lines only. A fill fades in over 0.3s as it appears. Hovering isolates the hovered curve: other curves drop to 0.14, their points to 0.16 (never a focused or dragged point) and the selected light's fill to 0.06, while the hovered light's fill stays full. Hover is presentation only. It never changes the selection, Undo history, saved shapes or lights, ignores touch, and clears when a graph gesture starts.
- Populated graphs should not carry persistent instruction overlays. Keep the plot clear; editing guidance lives in focusable point labels and transient point tooltips. Empty graphs may use the centered hint band.
- The card shell may show a graph-state summary above the SVG when it describes the current data: matching group brightness, one shared brightness shape, mixed shapes, hidden lights, or the selected light's shape. These summaries are context, not instructions, and must update from actual control points. When a selected-light shape chip is being trialed, this same header becomes the trial feedback (`Trying …`) instead of adding more visible preset copy. The summary is one line, beside the chips on wide cards and above them on narrow ones. While a light is selected the context line names it, so the summary stays hidden unless it carries a trial, a tip or the example.
- Editing affordances:
  - Pointer drag moves points after a 6 CSS-pixel intent threshold; tap jitter never changes a point. The **origin point** (leftmost) is Y-only constrained — a dashed stroke and `ns-resize` cursor signal restricted movement
  - Double-click (`Enter` on keyboard) adds a point — requires a selected light/curve target
  - Right-click, long-press, or `Space` removes a point — requires a selected light/curve target; origin point is protected from accidental long-press deletion
  - Keyboard focus on points enables arrow-key movement, `Enter` add, and `Space` remove (ARIA labels distinguish origin [Y-only, no remove] from all other points [free move + remove])
- SVGs must include a descriptive `<desc>` summary for screen readers.

### Scrubber

- On wide cards the Room bar aligns with the SVG plot endpoints, including custom graph sizing. On narrow cards it spans the editor column.
- At zero the Room value reads Off; the position itself stays numeric and light commands are unchanged.
- Room brightness samples existing shapes without changing points, dirty state, or Undo history. The same typed brightness control, a full bar for the room and a rail for each light, handles relative pointer drags and native keyboard input.
- Visible copy stays compact. Use "Room brightness" and "Watch room react"; do not add helper sentences unless they carry safety-critical state.
- Announce preview and restoration outcomes, including unresolved light effects.

### Preview Toggle

- A **Watch room react** button, with an eye icon, at the start of the action row enters preview mode at the current viewing brightness, defaulting to 100% when the session has no saved level. While active it offers **Watching · Restore lights**; saving keeps shapes; light restoration has a separate outcome.
- Stopping Watch requests restoration while the editor remains mounted and connected. Navigation or connection loss stops new restoration commands; refresh, tab close and process loss can leave preview brightness. A service receipt does not prove physical restoration.
- Preview brightness changes ease over a fixed short transition (0.25s) using Home Assistant's native `transition` — both when entering or scrubbing preview and when restoring, so lights glide instead of snapping. Devices without native transition support fall back to an abrupt change.
- The button must show clear active/inactive state; do not rely on color alone.

### Legend

- Include a section label: `Lights`.
- Include a compact factual count (`20 lights showing`, `2 lights · 1 hidden`) so dense groups stay understandable without helper text.
- Each item combines color, shape, name, and visibility affordance.
- Show each light's full Home Assistant friendly name consistently across groups. Do not split a shared name prefix into a second line that resembles a room assignment.
- Preserve beta 1's entity ID reveal: show the muted line above the name while the row is hovered, contains keyboard focus, or is selected. Hovering or focusing the eye control also reveals it. Hide the line when none of those states apply, retaining its space so the row does not shift. Truncate long IDs visually and retain the full value in a tooltip. Duplicate names keep distinct accessible control labels. Light management keeps its existing metadata.
- Rows should stay lightweight: 68px tall, the name and value grouped above a slim rail, with separators instead of heavy fills and no permanent editing chips. Rails stay neutral at rest and take the light's graph color on hover and while selected. The selected row adds a subtle tint of the light's color.
- Hovering a row dims the other rows. Hover is presentation only and follows the graph's hover rules.
- Rails keep relative drag: a drag moves the value by the pointer's travel, and pressing elsewhere on a rail does not jump to that spot.
- Up to 8 lights show without an inner scroll. Larger groups scroll inside the list, at most 470px or 60% of the viewport, so the editor column stays in view. Every group size uses the same row height.
- Group management lives in a Manage menu above the list: Edit lights and Delete group…. Delete confirms inline. Escape or a press outside closes the menu and returns focus to Manage.

### Hidden Parents

- Hidden dashboard parents such as tabs, popups, and stacked dashboards must preserve graph space until the card becomes visible again.
- Prefer visibility/resize guards only after reproducing a concrete hidden-parent failure in a browser; avoid speculative observers that can fight Home Assistant's native dashboard lifecycle.
- If a hidden-parent issue is reproduced, the guard should be scoped to graph sizing/re-rendering and must not alter save, preview, or entity-load lifecycle behavior.

### Panel

- The panel header shows the Lightener Studio wordmark, inlined and matched to the light or dark theme, with the accessible name "Lightener Studio". The native group picker and New group sit beside it. Its DOM stays stationary through editor loading and recovery. The card supplies only its help button through an internal mount; edit, preview and save commands stay in the card's action row. On phones the help button shares the wordmark row.
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
