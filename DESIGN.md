# Design System

This document describes the implemented Lightener Studio editor. The separately labeled approved future View and Edit design at the end is not implemented; its work remains unchecked in TODOS.md.

## Principles

- Use a graph-first workspace. The graph owns the visual center; scrubber, legend, and panel controls recede into quiet supporting surfaces instead of competing with it.
- Use the quiet space for facts from the data, not generic instructions. Counts the light list already shows are not repeated over the graph, and a populated graph shows no resident how-to chrome.
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

People come to Lightener Studio for a room that behaves the way they want, not to run an engine. So every word we show names what they'll **see or feel in the room**, never the mechanism behind it. There's real machinery underneath (per-light response shapes, live preview, group-brightness mapping), and our job is to keep its weight off the user. **Name the outcome, not the action. Use the same word for the same thing everywhere. If a word makes someone think about the software instead of the room, cut it.**

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
  - Watch: turning Watch on wakes the lit lights' list markers in list order, 45ms per row; each scales to 1.9 at 35% of a 900ms ease-out flicker. After each finished change while watching (a released point or light bar, a finished Room move, a shape, an added or removed point, a completed Undo), only the lights whose shown brightness changed since the previous one flicker once. Off under reduced motion; the halos stay.
  - Grip hint: only on demand. Opening Brightness tips waits 660ms (`FIRST_USE_TIMING.orientation`), then the Room grip nudges 12px inward and back over 1.1s while its ring pulses twice, 1.4s each. Inward means left above 50% and right at or below, so the grip never leaves the plot. It is never automatic and never plays for an automatic example. It changes no value, sends no light command and leaves the draft and Undo untouched. A press or key press on the grip, dismissing help, or disconnect ends it. Off under reduced motion.
  - Draw-in: after a successful Edit lights update, only newly added lights reveal their fills, lines and scrubber dots over 500ms (easeOutCubic). After Edit lights restores focus, a fresh IntersectionObserver sample starts the reveal 200ms (`DRAW_IN_DELAY_MS`) after at least half the graph is visible, without scrolling the page, so the eye is back on the graph first. Scrolling away during that pause cancels it until the next visible sample. Pending curves are clipped at zero progress and their undimmed markers stay hidden without starting the pop clock. Scrolling the graph away returns it to that waiting state and clears the cleanup timer; it restarts when visible again. The reveal follows the undimmed scrubber span, with enough overlap to reveal the scrubber dot fully. The curve past the scrubber stays dim and visible; a separate dot clip keeps the dot behind the wipe. Clips live beside the graph-area clip in the root SVG definitions, outside clipped groups. Shape hover and focus trials wait while a draw-in token is active and resume at cleanup if either hover or focus remains on a chip. Each engagement is tracked separately and cleared by its own leave or blur event; both are cleared when trials are invalidated. Only rendered markers at or before the scrubber pop, so the first added light, which Edit lights selects, shows those points at 500 + point index × 40ms. Each pop takes 150ms, scaling from 0 to 1.15 at 70%, then to 1; a keyed SVG wrapper preserves the marker's own shape and rotation. Hit targets remain usable throughout. A capture-phase press or key press anywhere in the card ends a running draw-in without consuming the event; a pending reveal allows pointerdown for touch scrolling but ends on a completed click or key press. A newer membership update, entity change, disabled flag, reduced motion starting or disconnect also ends it. Once the graph starts, cleanup waits at least 1200ms and extends to the last marker pop actually rendered, using its original point index and excluding hidden curves, unselected curves and points past the scrubber, even if no frame ran. Lights the same update removed keep their last line, and the selected light its area, drawn as they were with the previous selection and dash pattern under the live curves; after the same 200ms they fade out over 360ms. That copy is never interactive, and a newer membership update, entity change, disabled flag or disconnect ends it. Off under reduced motion: the curves and points appear at once, and removed lights disappear at once.

Show me how plays one temporary sequence on the existing graph: choose Dim (Early if the selected shape already matches Dim), move its existing midpoint up and down and return it, sweep Room brightness and return it, then add and remove one point. A preset highlight precedes the shape change; the point demonstration moves only its own handle. Existing graph callouts explain the effect: “Make this light brighter”, “Dim this light”, “Adjust room brightness”, “Add a point” and “Remove this point”. The Room caption appears before travel. Native curve transitions and continuous visual positions keep motion smooth while editable values remain exact. The sequence restores shapes, selection and Room brightness by 17 seconds. Replay starts again; Done discards it. Reduced motion uses held steps; enabling it during playback freezes the current example. A deliberate graph edit adopts the displayed shape as one undoable draft edit. Tutorial Room values are rendering inputs only, never stored UI state or Watch inputs. Brightness tips retains its separate grip hint.

The programmatic first-use example is disabled by default and cannot be enabled
through card YAML. The sidebar enables Show me how explicitly; ordinary dashboard
cards keep Brightness tips. Both tutorial entry paths use the same reversible
sequence. Help refuses an existing draft or active Watch without saving or
commanding lights. Replay and dismissal preserve actual shapes, selection and
Room brightness; Undo after native takeover restores the prior shapes and clean
state. Group changes, disconnection, a hidden document or scrolling the graph
away dismiss the example. A stable polite region announces phase instructions,
without per-frame announcements. Held frames skip redundant card updates; phase
and caption changes still render, and resize/scroll still remeasure controls.
Browser fixtures cover these contracts; native Home Assistant tutorial acceptance
remains a separate gate.

### Breakpoints

- `500px` is the shared component mobile breakpoint for graph, scrubber, legend, and footer touch-target adjustments.
- Use `MOBILE_MEDIA` from `js/src/utils/breakpoint-styles.ts` for component `css` `@media` blocks, and `MOBILE_BREAKPOINT_MEDIA_QUERY` from `js/src/utils/breakpoints.ts` for `matchMedia` consumers, instead of hand-writing nearby values. `breakpoints.ts` stays framework-free; `breakpoint-styles.ts` is the Lit-aware adapter that wraps the value in a `css` fragment.
- The editor shell's layout keys on the **card's own width** via container queries (`container-type: inline-size` on `.card`; the narrow workbench below 860px), so the Lovelace card and the sidebar panel lay out identically at the same size. Do not reintroduce viewport media queries for shell layout, and do not mix the shell threshold with the 500px touch/mobile component threshold.

## Component Patterns

### Curve Card

- Header is quiet and compact in embedded mode; `embedded` controls chrome only, never layout.
- The workspace stacks at every width: the graph, Room brightness and the action row on top, the light list underneath. The list flows into as many columns as fit at 320px or more each, up to six.
- Selected-light shape commands live in the graph header/workbench as compact chips, not in the light list. Each chip shows only a tiny shape signature plus the short shape name (`Equal`, `Dim`, `Early`, `Late`); long descriptions and helper sentences stay out of the populated editing UI. Chips sit on the left of the workbench, at most 300px wide; their row keeps its space when no light is selected. Hover/focus may trial the shape in the graph and update the graph header; click applies it and enables Undo, Cancel and Save.
- Sidebar Show me how reuses the context line for step instructions, Replay and Done, with outcome captions in the graph. Ordinary dashboard cards keep Brightness tips in the graph-header summary slot, reopened with the small help button. These reserved spaces keep opening and dismissing help from moving the graph. Help is available after ordinary entry and reload without backend progress tracking. A confirmed save explains that the group's brightness control uses the saved shape. Save never implies that a temporary preview level is kept.
- The light list area under the graph is for the lights and light management. The add-light form may still offer a starting shape, but that setup picker is separate from selected-light editing.
- A context line above the graph starts with one All lights chip in one place: pressed while nothing is selected, and it clears the selection otherwise. The selected light's name sits beside it. The line keeps its height, so selecting and clearing never move the graph.
- The action row sits under Room brightness at every width: watching status and save feedback on the left, then Undo, Cancel and Save. Clean, dirty and saving states keep the same height, and unavailable actions stay visible and disabled. On narrow cards the status and save feedback take a line above the edit commands. While the row is active (unsaved changes, saving, watching or save feedback) and scrolled out of view, it pins to the bottom of the viewport and its place in the editor stays reserved.
- The help button sits in the card header; in the sidebar panel it sits at the end of the panel header. The group picker stays panel-owned and outside editor shortcuts.
- Room brightness is the light edge on the graph: its grip sits directly under the plot, aligned to the actual plot endpoints at every width. Narrow cards stack the graph, the grip, the action row and then the lights.
- The editor graph is capped at 520px tall. Tick and label text keep the proportions of the 320px reference, so a taller graph shows more plot without larger text. The x labels also keep their reference distance under the axis, and the Room grip follows them up rather than sitting below the grown bottom padding. Once the height cap binds, the plot widens with the card, up to three times as wide as it is tall so curves keep their slope; past that it sits at the start of the card; Room brightness stays aligned with the plot edges. Playable previews keep this native size. Keep supporting controls compact. Avoid duplicate labels, permanent entity-ID lines outside the reserved light rows, or extra explanatory panels.
- Light rows retain full Home Assistant names. Entity IDs reveal on row hover, keyboard focus (including the eye), and selection without changing row height. The marker toggles selection; the eye independently toggles visibility. A bar tap focuses idempotently, and a deliberate horizontal drag edits only that light at the captured room position, with one Undo snapshot per gesture.

### Graph

- Built-in shapes must have intentional, attractive silhouettes without unnecessary zigzags. Add only useful points that keep the linear brightness response close to the drawn shape, and keep their handles independently selectable on phones. Existing saved shapes are not migrated when starting shapes change.
- Show grid and axis ticks at all times. The diagonal reference follows `joy.diagonal`.
- Show "Room brightness" once, as the graph's x-axis title above the Room grip. Tick typography must stay compact as the graph grows.
- Grid lines stay quiet (opacity 0.075). Curves draw at 1.5 SVG units, the selected curve at 2.5 and a curve hovered in the light list at 3. Point size and hit regions do not change.
- Selected curve stays visually dominant; non-selected curves dim.
- The selected light and a visible light hovered in the list fill the area under their curves; with neither, curves draw as lines only. A fill fades in over 0.3s as it appears. Hovering isolates the hovered curve: other curves drop to 0.14, their points to 0.16 (never a focused or dragged point) and the selected light's fill to 0.06, while the hovered light's fill stays full. Hover is presentation only. It never changes the selection, Undo history, saved shapes or lights, ignores touch, and clears when a graph gesture starts.
- Populated graphs should not carry persistent instruction overlays. Keep the plot clear; editing guidance lives in focusable point labels and transient point tooltips. Empty graphs may use the centered hint band.
- The line above the graph carries only what the light list cannot: "All lights are hidden" when the graph is empty, the trial feedback (`Trying …`) while a selected-light shape chip is being trialed, a tip or the example. It shows no light or shape counts. It is one line, beside the chips on wide cards and above them on narrow ones.
- Editing affordances:
  - Pointer drag moves points after a 6 CSS-pixel intent threshold; tap jitter never changes a point. The **origin point** (leftmost) is Y-only constrained — a dashed stroke and `ns-resize` cursor signal restricted movement. A last point at 100% room brightness is held there the same way: it moves only up and down, cannot be removed and shows no reach. A last point below 100 keeps its full reach, including a gesture that reaches 100: that gesture (or keyboard focus) can still take it back, and it is held once released or refocused at 100
  - Double-click (`Enter` on keyboard) adds a point — requires a selected light/curve target
  - Right-click, long-press, or `Space` removes a point — requires a selected light/curve target; the origin point and a last point at 100% room brightness are protected from deletion
  - Keyboard focus on points enables arrow-key movement, `Enter` add, and `Space` remove (ARIA labels distinguish the origin and a last point at 100% [Y-only, no remove] from all other points [free move + remove]; a last point that reached 100 in the current focus may still move but cannot be removed)
  - A point's reach keeps it 3% clear of its neighbours on drag and arrow keys; a point that started closer keeps its starting position within reach, so the 1% low-end anchors never jump. While a point is hovered or focused, the plot outside its reach dims softly (0.28; 0.45 while dragging) under the axes, and a `--primary-color` bar marks the reach on the x-axis. The origin point shows no reach.
  - The tooltip reads `room% → light%`. While dragging, a `--primary-color` pill on the y-axis shows the light brightness, and the dashed crosshair stays.
  - The last point pressed or focused keeps a faint ring in its light's color until another point is touched or the point count changes. Hit areas stay 22 and 28 (touch) SVG units.
- SVGs must include a descriptive `<desc>` summary for screen readers.

### Scrubber

- Room brightness has no slider bar. The boundary between the lit plot (left) and the plot dimmed by 80% (right) is the control: drag the edge line in the graph or its grip under the x-axis. Axes stay above the dimming. While Watch room react is on, the edge and grip are warm.
- The grip strip aligns with the SVG plot endpoints at every width, including custom graph sizing. It stays a 48px target with vertical touch scrolling; the value sits beside the grip and stays visible.
- At zero the Room value reads Off; the position itself stays numeric and light commands are unchanged.
- A meaning line under the grip says what the room shows at that position: "All 20 lights on", "18 of 20 lights on" or "All lights off". Every member light counts, hidden or not, and a light is on above 0%. While Watch room react is on it reads "Your room follows · …".
- Room brightness samples existing shapes without changing points, dirty state, or Undo history. Points drawn on the edge keep their own drag. The same typed brightness control, an edge grip for the room and a rail for each light, handles relative pointer drags and native keyboard input; the edge line in the graph hands its press to the grip's drag.
- Visible copy stays compact. Use "Room brightness" and "Watch room react"; do not add helper sentences unless they carry safety-critical state.
- Announce preview state changes.

### Preview Toggle

- A **Watch room react** switch (label, track and knob; `role="switch"`) in the header, beside help, enters preview mode at the current viewing brightness, defaulting to 100% when the session has no saved level. It is off when the editor opens and stays latched while on; turning it off, Save or Cancel ends Watch and silently attempts to send each changed light back to its value from before Watch. Saving keeps shapes; putting lights back is separate.
- Warm (`--watch-warm`) marks real light in the room; blue stays for data. While watching, the switch track, a status dot beside "Watching · Your lights follow every change" (with unsaved changes, one line: "Watching unsaved changes · Save keeps the shapes.") and a halo around each lit, visible light's list marker are warm. The halo grows with that light's brightness (blur 6 + 0.11·v px, spread 1 + v/28 px, strength 45–85%) and sits 2px off the marker in the card colour; 0% has none.
- A one-time note appears the first time Watch turns on, without moving the layout, until **Got it** (or, on narrow cards, the 6-second timeout) dismisses it for that browser. On wide cards it opens under the switch. On narrow cards it is a snackbar on the inverse surface beside the action row (below it, or above it while the row is pinned) and closes itself after 6 seconds. On phones the header shows only the logo's curve mark and help becomes a round ? (accessible name unchanged), so Watch and help share its row; below about 360px they wrap to their own row.
- Ending Watch, including a group switch or leaving the editor, attempts one command per changed light back to its value from before Watch. Restoration is best-effort, not a physical-brightness guarantee. There is no review dialog. A light is locked only while a command to it is in flight, and each command releases its lock after at most 10 seconds. Connection, user, permission or runtime-barrier loss sends nothing further, including a restore waiting on an earlier command. A timeout releases a lock but does not cancel a command already issued. Refresh, tab close and process loss can leave preview brightness. Other tabs, automations and physical controls are not tracked; restoration may overwrite their changes.
- Preview brightness changes ease over a fixed short transition (0.25s) using Home Assistant's native `transition` — both when entering or scrubbing preview and when restoring, so lights glide instead of snapping. Devices without native transition support fall back to an abrupt change.
- The switch must show clear on/off state; do not rely on color alone.

### Legend

- Include a section label: `Lights`.
- The rows show how many lights there are. The header adds a count only for hidden lights (`1 hidden`).
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

- The panel header shows the Lightener Studio wordmark, inlined and matched to the light or dark theme, with the accessible name "Lightener Studio". The native group picker and New group sit beside it. Its DOM stays stationary through editor loading and recovery. The card supplies Watch and help through an internal mount; Undo, Cancel and Save stay in the card's action row. On phones Watch and help share the logo curve mark's row, above the group picker.
- Unsaved entity switches use an inline confirmation bar, never a blocking browser dialog.
- Empty states should explain what Lightener Studio is, how to start, and where to go next.

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

## Approved future View and Edit design (2026-11-06)

This section records the approved direction, not implemented behavior. The
unchecked work in [TODOS.md](TODOS.md#view-and-edit-mode-approved-design-2026-11-06)
owns implementation. The current editor still has the context line, reserved
shape-chip row, header Watch/help, action row, Manage menu and per-light eye
controls described above. Scoped `?config_entry=` routes still filter groups.
The exit-slot reachability choice remains unresolved.

### Layout principle

- Keep the chrome still. Nothing above the graph is reserved or appears later: selecting a light, entering Edit mode or a message arriving never moves the graph. The header owns the mode, the graph panel owns the data, and the room's warmth owns Watch.

### Planned surface tokens

- `--graph-panel`: the graph's well, `color-mix(in srgb, var(--primary-text-color) 5%, var(--card-background-color))`, framed by a 1px `--divider` ring (a box-shadow, so the plot does not shift) at 12px radius. `--graph-bg` resolves to it so the Room dim overlay matches.
- `--edit-bed`: `color-mix(in srgb, var(--primary-text-color) 8%, var(--card-background-color))` with a 2px `#2563EB` rule along its bottom edge (`inset 0 -2px 0`). Header only, Edit mode only.
- `--watch-well`: `color-mix(in srgb, var(--graph-panel) 96%, var(--watch-warm) 4%)` and a 1px `--watch-warm` frame, on the graph panel only while Watch room react is on.

These recipes darken a light theme and lighten a dark theme on their own; do not hardcode hex surfaces.

### Planned surfaces and segmentation

Three tiers and nothing else: the sheet (`--card-background-color`, where the header, Room row and light list sit directly), the graph panel (`--graph-panel`), and the header bed in Edit mode (`--edit-bed`). A bed means a state the surface is in; a hairline means a boundary between two kinds of content. Beds never group controls, never nest, and never share an edge with a hairline. The editor has exactly one full-width hairline, 1px `--divider`, above the light list, at every width.

How a mode reads without hue: Edit mode is the header bed plus its blue rule plus the exit slot turning from a pencil into worded pills (Cancel + Save, or Done with a checkmark). Watch is the warm well, its amber frame and the amber switch. Every state also carries a glyph: a checkmark for saved or done, a dot for watching, a triangle for attention, a cross for failure. The View, Edit, Watch and conflict states must stay recognizable in grayscale. Chrome state changes are 150ms colour transitions only, off under reduced motion.

### Planned typography and control geometry

- `--text-xl`: 28px/32px, weight 600, tracking -0.01em: the group headline in the panel header. One line; long names truncate, the switcher shows the full name.
- Section labels are sentence case, 12px, weight 600, secondary text color. No uppercase or tracked labels anywhere in the editor (reversed 2026-11-06).
- The dashboard card title keeps modest weight and slightly negative tracking; the panel's group headline is `--text-xl`.
- Actions are 14px/500, Home Assistant's own button size; chips, the meaning line and status copy are 12px.
- Shape chips: pills, 28px tall (32px on phones, 44px target), a 12px signature of the shape plus its name

One geometry, weight by consequence. Desktop controls are 36px tall; phones keep 44px targets.

| Control | Treatment |
|---|---|
| Save, Done | filled `#2563EB`, white 14px/500 text, 8px radius; Done carries a checkmark, Save does not |
| Cancel | transparent, 1px neutral border, primary text |
| Undo | ghost: arrow glyph plus "Undo"; dimmed but laid out when there is nothing to undo |
| ⋮, pencil | ghost icon buttons; on wide headers the pencil is a ghost pill reading "Edit" |
| Watch room react | a custom switch (never Home Assistant's cyan `ha-switch`): neutral off, `--watch-warm` on, label in primary text, label never changes |
| Shape chips | neutral 1px outline; the applied shape takes a restrained blue bed and blue outline |

States: hover is a 6% primary-text wash, pressed 10%; keyboard focus is a 2px blue ring with a 2px gap; disabled keeps its slot; saving swaps the icon for a spinner inside the same footprint; a successful save shows a blue checkmark and "Saved" in the exit slot briefly, then the pencil. No lift, scale, glow or gradient.

### Planned card and panel

- Two modes (approved 2026-11-06; implementation tracked in TODOS.md, "View and Edit mode"). View mode is the default: header, graph, Room row, light list, no edit chrome. Edit mode begins with a dedicated pencil, a point or bar drag, a light-row tap, arrow keys or Show me how; Room, Watch, hover and the group switcher never enter it. The header's exit slot shows Done with a checkmark while clean and Cancel plus Save while changed; Save returns to View only after a confirmed save. The mode is shown as the current state, never as the destination.
- Selected-light shape commands are compact chips (`Equal`, `Dim`, `Early`, `Late`), each a tiny shape signature plus the short name; long descriptions stay out of the editing UI. They exist only in Edit mode with a light selected: in one row under the Room row on narrow cards, together with Undo at its right end, and inside the header once the header is at least 1100px wide. Hover or focus trials the shape in the graph; click applies it and enables Undo, Cancel and Save. Nothing is reserved for them above the graph.
- Show me how explains itself inside the canvas (captions beside the point or the Room grip). While it runs, the exit slot holds Replay and Done. There is no tips panel and no help button. A confirmed save explains that the group's brightness control uses the saved shape. Save never implies that a temporary preview level is kept.
- The light list area under the graph is for the lights. In Edit mode its first row is All lights: pressed while nothing is selected, it clears the selection otherwise. The selected light is its highlighted row; no second copy of the name sits above the graph. The add-light form may still offer a starting shape, but that setup picker is separate from selected-light editing.
- There is no action row. Undo sits beside the shape chips; Cancel and Save live in the header exit slot, which keeps a fixed width so Watch and ⋮ never move between modes. Messages that need an action (a save conflict with Review latest, a blocked or failed save, a recovered draft) take one line under the Room row only while they exist, with their glyph; "Watching …" lives in the Room row's meaning line. Whether the exit slot pins while the header is scrolled away is undecided; the old action-row pin retires with the row.
- The ⋮ menu is the last item in the header in both modes and holds Show me how, Edit lights… and Delete group…. The group switcher stays panel-owned and outside editor shortcuts.
- Light rows retain full Home Assistant names. Entity IDs reveal on row hover, keyboard focus and selection without changing row height. There is no per-light visibility toggle; Watch includes every light. A bar tap focuses idempotently, and a deliberate horizontal drag edits only that light at the captured room position, with one Undo snapshot per gesture.

- The panel header is one row on a flat sheet: the brand curve mark (accessible name "Lightener Studio"), the group name as the headline with a ▾ switcher that lists every group and New group…, then the card's control group (shape chips, Watch and Undo on wide headers), the exit slot and ⋮ last. The card supplies its controls through an internal mount; the header's DOM stays stationary through loading and recovery. In Edit mode the header takes `--edit-bed`. Below 560px the header is two rows: mark, ⋮ and exit slot, then the headline.
- A scoped `?config_entry=` link chooses which group opens first; it never hides the other groups or New group.

- `1100px` of header width is the threshold at which chips, Watch and Undo move into the header; it is a container measurement, never a device class. Below `560px` the header takes two rows. Below the header threshold, Watch sits at the right end of the Room meaning line.

### Decisions log (approved direction; implementation pending)

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-06 | View and Edit modes; no reserved rows above the graph; chips, Watch and Undo under Room, or in the header from 1100px; ⋮ last; eye, Manage row and help button removed | Keeps the graph in place in every state; follows the GNOME HIG edit-mode pattern and Home Assistant's own edit bar |
| 2026-11-06 | Beds mean state, hairlines mean boundaries: flat header in View, `--edit-bed` in Edit, warm graph well under Watch, one hairline above the list | Beds used for grouping would compete with beds that show state; luminance and glyphs carry the mode for red-green colourblind users |
| 2026-11-06 | Sentence-case section labels; uppercase tracked labels retired | One register across the editor |
