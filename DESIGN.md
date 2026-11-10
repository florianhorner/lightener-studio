# Design System

This document describes the implemented Lightener Studio editor, including its View and Edit modes (decided 2026-11-06, implemented 2026-11-07). The decisions log at the end records the choices behind it and the ones that stay open.

## Principles

- Use a graph-first workspace. The graph owns the visual center; scrubber, legend, and panel controls recede into quiet supporting surfaces instead of competing with it.
- Use the quiet space for facts from the data, not generic instructions. Counts the light list already shows are not repeated over the graph, and a populated graph shows no resident how-to chrome.
- Keep the chrome still. Nothing above the graph is reserved or appears later: selecting a light, entering Edit or a message arriving never moves the graph. The header owns the mode, the graph panel owns the data, and the room's warmth owns Watch.
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
- `--graph-bg`: graph background color; used by `curve-graph` for the scrubber dim overlay. It resolves to `--graph-panel`, so the Room dim overlay matches the graph's well.
- `--graph-panel`: the graph's well, `color-mix(in srgb, var(--primary-text-color) 5%, var(--card-background-color))`, framed by a 1px `--divider` ring (a box-shadow, so the plot does not shift) at 12px radius.
- `--edit-bed`: `color-mix(in srgb, var(--primary-text-color) 8%, var(--card-background-color))`, with a 2px `#2563EB` rule along its bottom edge (`inset 0 -2px 0`). Header only, Edit mode only.
- `--watch-warm`: the warm colour of real light in the room (`#ffb300`).
- `--watch-well`: `color-mix(in srgb, var(--graph-panel) 96%, var(--watch-warm) 4%)` and a 1px `--watch-warm` frame, on the graph panel only while Watch room react is on.
- `--divider`: low-contrast structural borders
- `--lightener-panel-surface`: panel shell surface
- `--lightener-panel-border`: panel shell border

These recipes darken a light theme and lighten a dark theme on their own; do not hardcode hex surfaces.

### Type

- `--text-xs`: 9px utility labels
- `--text-sm`: 12px status copy and controls
- `--text-md`: 13px list rows
- `--text-lg`: 14px card heading
- Group headline in the panel header: 28px/32px, weight 600, tracking -0.01em. One line; long names truncate, and the switcher menu shows the full name.
- `--secondary-text`: card-level alias for Home Assistant `--secondary-text-color`; graph and footer children use this alias when the card shell supplies it, with `#616161` fallback

Typography rules:

- Section labels (`Lights`, the membership field labels, the dashboard card editor's field labels) are sentence case, 12px, weight 600, secondary text color. No uppercase or tracked labels anywhere in the editor.
- Main titles use modest weight and slightly negative tracking; the dashboard card title keeps that treatment and the panel's group headline is the 28px size above.
- Actions are 14px/500, Home Assistant's own button size; chips, the Room meaning line and status copy are 12px or smaller.
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
- Chrome state changes (header bed, graph well, button backgrounds) are 150ms colour transitions, off under reduced motion. No lift, scale, glow or gradient.
- Joy moments are on by default, including in the sidebar editor. Individual `joy:` flags may opt out per dashboard card. Their hit tests, shape blends, durations and shared frame loop live in `js/src/utils/motion.ts`; the flash's fade, the draw-in's marker pop and a removed light's fade use CSS keyframes in `curve-graph.ts`, timed by `DIAGONAL_FLASH_MS`, `DRAW_IN_POP_MS` and `DRAW_OUT_FADE_MS`. They never block input. Reduced motion turns off everything that moves; each moment below says what stays.
  - Settle: a released point's marker overshoots 2 SVG units in the direction of its net brightness change (up or down) over 70ms, then returns over 180ms (easeOutCubic). No change, no settle. Only the marker moves; the data, the path and the hit target stay put. A new press, a key press on a point, or a change to the released point itself (a shape applied, an undo) ends it early. Off under reduced motion.
  - Diagonal: a faint dashed reference diagonal from 0% to 100% (`--secondary-text`, 0.75 wide, dash `3 4`, opacity 0.3) sits under the curves. During a drag, a point that lands on the diagonal (never the origin point), on the 0% line or on the 100% line makes that line flash once in `--primary-color` (2 wide, 400ms, peaking at opacity 0.9 at 25%), and touch screens that can vibrate get a 5ms tap. A line stays held until the point has moved 2 steps off it, so the rounding wobble of a drag along a line, or where two lines meet, stays quiet; landing on two lines at once (the top-right corner) flashes the diagonal. The first move of a new drag that lands on a line fires even if the point started there. A new press or key press ends the flash, and nothing fires while the graph is read-only (an undo or cancel animating). Like the curves, both lines sit under the scrubber's dim. A dragged point that comes within 9.2 screen pixels of one of these lines, and no more than 3.45 steps, lands on it: the nearest line wins, a tie goes to the diagonal, and the origin point never takes the diagonal. The reach comes from the measured graph scale, so a graph without a layout never snaps, and keyboard moves never snap. Under reduced motion there is no flash; the reference line, the snapping and the tap stay.
  - Ripple: choosing a shape chip commits the exact new shape at once, so undo, the dirty state and the live preview are what they are without the moment; only the drawing moves. Every x position of the old and the new shape is a point that eases (easeOutCubic) from the old drawn curve to the new one over 300ms, starting 20ms after the point to its left, so a change takes 300 + 20 × (points − 1) ms; past 8 points the delay shrinks, so no change takes longer than 0.44s. Between points the curve blends the old and the new drawn curve piece by piece by their progress, so it starts exactly on the curve on screen and ends exactly on the new shape. The line, fill, markers, hit targets, tooltips and scrubber dot travel with the drawing; the values shown (tooltip text, legend and scrubber readouts) are the new shape's from the click. A press on one of that light's points, a drag, an arrow key that moves one of its points, a point added to or removed from it, a reload, or a shape chosen for another light ends it at once, so editing always starts from the real points. Another shape for the same light continues from the curve on screen, and so do Undo and Cancel, which draw that light's line on to their target (markers stay hidden while they run, as before). Selecting another light does not stop it. A shape previewed from its chip moves too: over 240ms (easeOutCubic) the dashed preview and its dot travel from what was shown before, the previous preview or else the light's own curve, drawn through one height per brightness step, to the new shape. Another chip continues from where the preview is; a re-render of the same shape keeps its geometry still. While the preview is visible, its dashes drift by one 8-unit dash cycle every 1.6 seconds; a preview that ends disappears at once; while a ripple draws that light, the preview appears at once. Off under reduced motion: the shape applies at once, and a preview appears without motion.
  - Watch: turning Watch on wakes the lit lights' list markers in list order, 45ms per row; each scales to 1.9 at 35% of a 900ms ease-out flicker. After each finished change while watching (a released point or light bar, a finished Room move, a shape, an added or removed point, a completed Undo), only the lights whose shown brightness changed since the previous one flicker once. Off under reduced motion; the halos stay.
  - Grip hint: only on demand. Opening Brightness tips waits 660ms (`FIRST_USE_TIMING.orientation`), then the Room grip nudges 12px inward and back over 1.1s while its ring pulses twice, 1.4s each. Inward means left above 50% and right at or below, so the grip never leaves the plot. It is never automatic and never plays for an automatic example. It changes no value, sends no light command and leaves the draft and Undo untouched. A press or key press on the grip, dismissing help, or disconnect ends it. Off under reduced motion.
  - Draw-in: after a successful Edit lights update, only newly added lights reveal their fills, lines and scrubber dots over 500ms (easeOutCubic). After Edit lights restores focus, a fresh IntersectionObserver sample starts the reveal 200ms (`DRAW_IN_DELAY_MS`) after at least half the graph is visible, without scrolling the page, so the eye is back on the graph first. Scrolling away during that pause cancels it until the next visible sample. Pending curves are clipped at zero progress and their undimmed markers stay hidden without starting the pop clock. Scrolling the graph away returns it to that waiting state and clears the cleanup timer; it restarts when visible again. The reveal follows the undimmed scrubber span, with enough overlap to reveal the scrubber dot fully. The curve past the scrubber stays dim and visible; a separate dot clip keeps the dot behind the wipe. Clips live beside the graph-area clip in the root SVG definitions, outside clipped groups. Shape hover and focus trials wait while a draw-in token is active and resume at cleanup if either hover or focus remains on a chip. Each engagement is tracked separately and cleared by its own leave or blur event; both are cleared when trials are invalidated. Only rendered markers at or before the scrubber pop, so the first added light, which Edit lights selects, shows those points at 500 + point index × 40ms. Each pop takes 150ms, scaling from 0 to 1.15 at 70%, then to 1; a keyed SVG wrapper preserves the marker's own shape and rotation. Hit targets remain usable throughout. A capture-phase press or key press anywhere in the card ends a running draw-in without consuming the event; a pending reveal allows pointerdown for touch scrolling but ends on a completed click or key press. A newer membership update, entity change, disabled flag, reduced motion starting or disconnect also ends it. Once the graph starts, cleanup waits at least 1200ms and extends to the last marker pop actually rendered, using its original point index and excluding unselected curves and points past the scrubber, even if no frame ran. Lights the same update removed keep their last line, and the selected light its area, drawn as they were with the previous selection and dash pattern under the live curves; after the same 200ms they fade out over 360ms. That copy is never interactive, and a newer membership update, entity change, disabled flag or disconnect ends it. Off under reduced motion: the curves and points appear at once, and removed lights disappear at once.

Show me how plays one temporary sequence on the existing graph: choose Dim (Early if the selected shape already matches Dim), move its existing midpoint up and down and return it, sweep Room brightness and return it, then add one point and remove it. With a pointer the point lands clearly above or below the line (22 points off it, toward the side with room), so the curve visibly bends to meet it; with the keyboard it lands on the line, as Enter does. A preset highlight precedes the shape change; the point demonstration moves only its own handle. Existing graph callouts explain the effect: “Make this light brighter”, “Dim this light”, “Adjust room brightness”, “Add a point” and “Remove this point”. The Room caption appears before travel. Native curve transitions and continuous visual positions keep motion smooth while editable values remain exact. The sequence restores shapes, selection and Room brightness by 17 seconds. Replay starts again; Done discards it. Reduced motion uses held steps; enabling it during playback freezes the current example. A deliberate graph edit adopts the displayed shape as one undoable draft edit. Tutorial Room values are rendering inputs only, never stored UI state or Watch inputs. Brightness tips retains its separate grip hint.

The programmatic first-use example is disabled by default and cannot be enabled
through card YAML. The sidebar enables the Show me how example explicitly; ordinary
dashboard cards label the first ⋮ item Brightness tips and open the short tips. Both
tutorial entry paths use the same reversible sequence. Help refuses an existing draft or active Watch without saving or
commanding lights. Replay and dismissal preserve actual shapes, selection and
Room brightness; Undo after native takeover restores the prior shapes and clean
state. Group changes, disconnection, a hidden document or scrolling the graph
away dismiss the example. A stable polite region announces phase instructions,
without per-frame announcements. Held frames skip redundant card updates; phase
and caption changes still render, and a viewport resize still remeasures controls.
Browser fixtures cover these contracts; native Home Assistant tutorial acceptance
remains a separate gate.

### Breakpoints

- `500px` is the shared component mobile breakpoint for graph, scrubber, legend, and footer touch-target adjustments.
- Use `MOBILE_MEDIA` from `js/src/utils/breakpoint-styles.ts` for component `css` `@media` blocks, and `MOBILE_BREAKPOINT_MEDIA_QUERY` from `js/src/utils/breakpoints.ts` for `matchMedia` consumers, instead of hand-writing nearby values. `breakpoints.ts` stays framework-free; `breakpoint-styles.ts` is the Lit-aware adapter that wraps the value in a `css` fragment.
- The editor shell's layout keys on the **card's own width** via container queries (`container-type: inline-size` on `.card`; the narrow workbench below 860px), so the Lovelace card and the sidebar panel lay out identically at the same size. Do not reintroduce viewport media queries for shell layout, and do not mix the shell threshold with the 500px touch/mobile component threshold.
- The sidebar panel's `.shell` is the `lightener-shell` container. Two shell widths decide where the header's controls sit: from `640px` Undo moves into the header, and from `1100px` the shape chips and Watch follow. Both are container measurements, never a device class. Dashboard cards have no such container, so their chips, Watch and Undo stay under Room at every width. Between `640px` and `1099px` the row under Room holds the chips only and disappears when no light is selected. The header is not sticky, so on a short screen with a long light list Undo can scroll out of view with it. Below `560px` the panel header takes two rows: the mark, the card's controls, then the headline on its own row.

### Surfaces and segmentation

Three tiers and nothing else: the sheet (`--card-background-color`, where the header, Room row and light list sit directly), the graph panel (`--graph-panel`), and the header bed in Edit mode (`--edit-bed`). A bed means a state the surface is in; a hairline means a boundary between two kinds of content. Beds never group controls, never nest, and never share an edge with a hairline. The editor has one full-width hairline, 1px `--divider`, above the light list (`.side-rail`), at every width. The light rows keep their own faint separators.

How a mode reads without hue: Edit mode is the header bed plus its blue rule plus the exit slot turning from a pencil into worded buttons (Cancel and Save, or Done with a checkmark). Watch is the warm well, its amber frame and the amber switch. Every state also carries a glyph: a checkmark for saved or done, a dot for watching, a triangle for attention. The View, Edit and Watch states must stay recognizable in grayscale. The header has the same box in View and Edit (48px on one row, 92px on two), because the bed paints inside an inset-padding slot that both modes keep.

### Controls

One geometry, weight by consequence. Desktop controls are 36px tall; phones keep 44px targets.

| Control | Treatment |
|---|---|
| Save, Done | filled `#2563EB`, white 14px/500 text, 8px radius; Done carries a checkmark, Save does not |
| Cancel | transparent, 1px neutral border, primary text |
| Undo | ghost: arrow glyph plus "Undo"; dimmed but laid out when there is nothing to undo |
| Edit | ghost pill with a pencil and "Edit" (the pencil alone on phones) |
| ⋮ | ghost icon button, last in the header |
| Watch room react | a custom switch (never Home Assistant's cyan `ha-switch`): neutral off, `--watch-warm` on, label in primary text, label never changes |
| Shape chips | four equal chips with a neutral 1px outline, a 12px shape signature above the short name; 36px tall in the header, 44px under Room; the applied shape takes a light accent bed and outline |

States: hover is a 6% primary-text wash, pressed 10%; keyboard focus is a 2px ring with a 2px gap; disabled keeps its slot and dims; while saving, Save shows a spinner inside the same footprint; a successful save shows a blue checkmark and "Saved" in the exit slot briefly, then Edit returns.

## Component Patterns

### View and Edit modes

- Two modes. View is the default: header, graph, Room row, light list, no edit chrome. The editor opens in View and returns there after a confirmed save, Done, Cancel, a group switch or losing the administrator role.
- Only an administrator enters Edit, and only by one of: the Edit button, tapping or pressing Enter or Space on a light row, dragging a point or a light's bar, arrow keys on a point or bar, adding or removing a point, applying a starting shape, or Show me how. A recovered navigation draft also opens in Edit. Room brightness, Watch, hover, graph point focus and the group switcher never enter it. Edit is shown while the editor is requested to edit, has unsaved changes or is saving; availability notices (read-only, incompatible) are not work and never force it.
- A gesture that enters Edit keeps the View layout until the gesture ends, so rows do not move under the pointer or finger.
- The header's exit slot is the one place to enter, leave and commit: Edit in View; Done while Edit is clean; Cancel and Save once something changed (a spinner inside Save while saving); a blue checkmark with "Saved" briefly after a confirmed save, then Edit. While Show me how runs it holds Replay and Done, and Done returns to the mode help started from. Save returns to View only after a confirmed save, which also clears the light selection; a failed, stale or conflicting save stays in Edit with the draft and Undo intact. Done keeps Watch running; Save and Cancel end it. Viewers (non-administrators) get an empty exit slot.
- Escape in Edit dismisses help or the ⋮ menu first, then clears the selection, then leaves a clean Edit. It never discards a changed draft. Escape in View does nothing.
- The mode is shown as the current state, never as the destination: the header bed in Edit, the worded exit slot and the shape chips. The panel learns the mode from the card's `data-mode` attribute, so the card keeps no panel-specific event.

### Curve Card

- Header is quiet and compact in embedded mode; `embedded` controls chrome only, never layout. The dashboard card's header holds its title, the exit slot and the ⋮ menu; Watch, the shape chips and Undo sit under Room.
- The workspace stacks at every width: the graph, the Room row (Room brightness and its meaning line), then in Edit the chips and Undo row and a message line, and the light list underneath. The list flows into as many columns as fit at 320px or more each, up to six. Nothing above the graph is reserved.
- Selected-light shape commands live in compact chips, not in the light list. Each chip shows only a tiny shape signature plus the short shape name (`Equal`, `Dim`, `Early`, `Late`); long descriptions and helper sentences stay out of the populated editing UI. They exist in Edit with a light selected (Brightness tips and the Show me how example may also point at them from View): one row under the Room row, with Undo at its right end, and, once the panel header is 1100px wide, the chips move into the header (Undo moves there from 640px). Hover or focus may trial the shape in the graph; click applies it and enables Undo, Cancel and Save. When a resize moves the focused chip, Watch or Undo between the two places, focus moves to the copy now shown.
- Undo shows while Edit has history, with or without a selected light, beside the chips under Room or in the wide header. It is dimmed but laid out when there is nothing to undo.
- The message line under the Room row takes one line only while it has something to say; warnings carry a triangle: guidance, the Brightness tips or the Show me how example caption, a save conflict with Review latest, a blocked or failed save, a read-only or incompatible notice, another editor watching, and recovered navigation drafts. An empty list renders no line.
- Show me how explains itself inside the canvas (captions beside the point or the Room grip). Its step instructions appear in the message line, and the exit slot holds Replay and Done. Help is available after ordinary entry and reload without backend progress tracking. A confirmed save explains that the group's brightness control uses the saved shape. Save never implies that a temporary preview level is kept.
- The ⋮ menu is the last item in the header in both modes and holds Show me how, Edit lights…, New group… (administrators, sidebar panel only) and Delete group…. Viewers get no Edit lights… or Delete group… and Show me how is unavailable to them; a blocked administrator keeps Edit lights…, New group… and Delete group… disabled. The add-light form may still offer a starting shape, but that setup picker is separate from selected-light editing.
- The light list area under the graph is for the lights. In Edit its first row is All lights: pressed while nothing is selected, it clears the selection otherwise. The selected light is its highlighted row; no second copy of the name sits above the graph. All lights is absent in View and for viewers.
- Room brightness is the light edge on the graph: its grip sits directly under the plot, aligned to the actual plot endpoints at every width. Narrow cards stack the graph, the grip, the chips row and then the lights.
- The editor graph is capped at 520px tall. Tick and label text keep the proportions of the 320px reference, so a taller graph shows more plot without larger text. The x labels also keep their reference distance under the axis, and the Room grip follows them up rather than sitting below the grown bottom padding. Once the height cap binds, the plot widens with the card, up to three times as wide as it is tall so curves keep their slope; past that it sits at the start of the card; Room brightness stays aligned with the plot edges. Playable previews keep this native size. Keep supporting controls compact. Avoid duplicate labels, permanent entity-ID lines outside the reserved light rows, or extra explanatory panels.
- Light rows retain full Home Assistant names. Entity IDs reveal on row hover, keyboard focus and selection without changing row height. The marker toggles selection. There is no per-light visibility toggle: every light draws and Watch includes every light. A bar tap focuses idempotently, and a deliberate horizontal drag edits only that light at the captured room position, with one Undo snapshot per gesture.

### Graph

- Built-in shapes must have intentional, attractive silhouettes without unnecessary zigzags. Add only useful points that keep the linear brightness response close to the drawn shape, and keep their handles independently selectable on phones. Existing saved shapes are not migrated when starting shapes change.
- Show grid and axis ticks at all times. The diagonal reference follows `joy.diagonal`.
- Show "Room brightness" once, as the graph's x-axis title above the Room grip. Tick typography must stay compact as the graph grows.
- Grid lines stay quiet (opacity 0.075). Curves draw at 1.5 SVG units, the selected curve at 2.5 and a curve hovered in the light list at 3. Point size and hit regions do not change.
- Selected curve stays visually dominant; non-selected curves dim.
- The selected light and a visible light hovered in the list fill the area under their curves; with neither, curves draw as lines only. A fill fades in over 0.3s as it appears. Hovering isolates the hovered curve: other curves drop to 0.14, their points to 0.16 (never a focused or dragged point) and the selected light's fill to 0.06, while the hovered light's fill stays full. Hover is presentation only. It never changes the selection, Undo history, saved shapes or lights, ignores touch, and clears when a graph gesture starts.
- Populated graphs should not carry persistent instruction overlays. Keep the plot clear; editing guidance lives in focusable point labels and transient point tooltips. Empty graphs may use the centered hint band.
- Nothing sits between the header and the graph. The trial feedback (`Trying …`) while a shape chip is hovered or focused is announced to screen readers only; tips and the example caption take the message line under Room. No light or shape counts are shown.
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
- A meaning line under the grip says what the room shows at that position: "All 20 lights on", "18 of 20 lights on" or "All lights off". Every member light counts, and a light is on above 0%. While Watch room react is on a dot leads the line and it reads "Your room follows · …"; with unsaved changes it reads "Watching unsaved changes · Save keeps the shapes." Watch itself sits at the end of this line, except in a 1100px panel header.
- Room brightness samples existing shapes without changing points, dirty state, or Undo history. Points drawn on the edge keep their own drag. The same typed brightness control, an edge grip for the room and a rail for each light, handles relative pointer drags and native keyboard input; the edge line in the graph hands its press to the grip's drag.
- Visible copy stays compact. Use "Room brightness" and "Watch room react"; do not add helper sentences unless they carry safety-critical state.
- Announce preview state changes.

### Preview Toggle

- A **Watch room react** switch (label, track and knob; `role="switch"`) sits at the end of the Room meaning line, or in the panel header from 1100px of header width, so exactly one copy is visible. It enters preview mode at the current viewing brightness, defaulting to 100% when the session has no saved level. It is off when the editor opens and stays latched while on; turning it off, Save or Cancel ends Watch and silently attempts to send each changed light back to its value from before Watch. Saving keeps shapes; putting lights back is separate. Watch includes every light in the group, and Done keeps it running.
- Warm (`--watch-warm`) marks real light in the room; blue stays for data. While watching, the switch track, the dot in the Room meaning line, the graph panel's frame and well, and a halo around each lit light's list marker are warm. The halo grows with that light's brightness (blur 6 + 0.11·v px, spread 1 + v/28 px, strength 45–85%) and sits 2px off the marker in the card colour; 0% has none.
- A one-time note appears the first time Watch turns on, without moving the layout, until **Got it** (or, on narrow cards, the 6-second timeout) dismisses it for that browser. On wide cards it opens under the switch. On narrow cards it is a snackbar on the inverse surface under the Room row and closes itself after 6 seconds.
- Ending Watch, including a group switch or leaving the editor, attempts one command per changed light back to its value from before Watch. Restoration is best-effort, not a physical-brightness guarantee. There is no review dialog. A light is locked only while a command to it is in flight, and each command releases its lock after at most 10 seconds. Connection, user, permission or runtime-barrier loss sends nothing further, including a restore waiting on an earlier command. A timeout releases a lock but does not cancel a command already issued. Refresh, tab close and process loss can leave preview brightness. Other tabs, automations and physical controls are not tracked; restoration may overwrite their changes.
- Preview brightness changes ease over a fixed short transition (0.25s) using Home Assistant's native `transition` — both when entering or scrubbing preview and when restoring, so lights glide instead of snapping. Devices without native transition support fall back to an abrupt change.
- The switch must show clear on/off state; do not rely on color alone.

### Legend

- Include a section label: `Lights`.
- The rows show how many lights there are. The header adds a count only for an empty group (`No lights yet`).
- Each item combines color, shape, name and value. There is no per-light visibility control.
- Show each light's full Home Assistant friendly name consistently across groups. Do not split a shared name prefix into a second line that resembles a room assignment.
- Preserve beta 1's entity ID reveal: show the muted line above the name while the row is hovered, contains keyboard focus, or is selected. Hide the line when none of those states apply, retaining its space so the row does not shift. Truncate long IDs visually and retain the full value in a tooltip. Duplicate names keep distinct accessible control labels. Light management keeps its existing metadata.
- Rows should stay lightweight: 68px tall, the name and value grouped above a slim rail, with separators instead of heavy fills and no permanent editing chips. Rails stay neutral at rest and take the light's graph color on hover and while selected. The selected row adds a subtle tint of the light's color.
- Hovering a row dims the other rows. Hover is presentation only and follows the graph's hover rules.
- Rails keep relative drag: a drag moves the value by the pointer's travel, and pressing elsewhere on a rail does not jump to that spot.
- In Edit the first row is All lights, with the pressed and clearing behavior described under the curve card.
- Up to 8 lights show without an inner scroll. Larger groups scroll inside the list, at most 470px or 60% of the viewport, so the editor column stays in view. Every group size uses the same row height.
- Group management lives in the header's ⋮ menu: Edit lights…, New group… (administrators, sidebar panel only) and Delete group…. Delete confirms inline above the list. Escape or a press outside closes the ⋮ menu and returns focus to it.

### Hidden Parents

- Hidden dashboard parents such as tabs, popups, and stacked dashboards must preserve graph space until the card becomes visible again.
- Prefer visibility/resize guards only after reproducing a concrete hidden-parent failure in a browser; avoid speculative observers that can fight Home Assistant's native dashboard lifecycle.
- If a hidden-parent issue is reproduced, the guard should be scoped to graph sizing/re-rendering and must not alter save, preview, or entity-load lifecycle behavior.

### Panel

- The panel header is one row on a flat sheet: the brand curve mark (accessible name "Lightener Studio"), the group name as the headline with a ▾ switcher that lists every group, then the card's control group (shape chips, Watch and Undo on wide headers), the exit slot and ⋮ last. There is no wordmark text, no Group label, no native group select and no separate New group button. The card supplies its controls through an internal mount; the header's DOM stays stationary through loading and recovery. In Edit the header takes `--edit-bed`. Below 560px the header is two rows: mark, ⋮ and exit slot, then the headline.
- The switcher is panel-owned and outside editor shortcuts. Arrow keys, Home, End and Escape work in the switcher and its menu; the menu items are 44px tall below 560px. The switcher lists groups only. New group… is an item in the ⋮ menu, between Edit lights… and Delete group…; it appears only in the sidebar panel, for administrators, and is absent during a setup-link handoff.
- A scoped `?config_entry=` link (a device-page Visit, a Configure action) chooses which group opens first and wins over the last group used. It never filters the list or hides New group… from the ⋮ menu; switching groups writes `config_entry` back to the URL so a reload returns to the current group. A group that is not in the loaded list opens nothing and the recovery message shows beside the switcher.
- Unsaved group switches use an inline confirmation bar, never a blocking browser dialog.
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

## Decisions log

All three decisions below were approved on 2026-11-06 and implemented on 2026-11-07.

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2026-11-06 | View and Edit modes; no reserved rows above the graph; chips, Watch and Undo under Room, or in the header from 1100px; ⋮ last; eye, Manage row and help button removed | Keeps the graph in place in every state; follows the GNOME HIG edit-mode pattern and Home Assistant's own edit bar | Implemented |
| 2026-11-06 | Beds mean state, hairlines mean boundaries: flat header in View, `--edit-bed` in Edit, warm graph well under Watch, one hairline above the list | Beds used for grouping would compete with beds that show state; luminance and glyphs carry the mode for red-green colourblind users | Implemented |
| 2026-11-06 | Sentence-case section labels; uppercase tracked labels retired | One register across the editor | Implemented |
| 2026-11-08 | Undo moves into the panel header from a 640px shell; chips and Watch stay under Room until 1100px | Undo is about 72px wide and fits the header long before the chips (about 275px); this frees the row under Room for the chips alone. Accepted trade-off: on short screens with long light lists the non-sticky header, and Undo with it, can scroll out of view | In review |

### Still undecided or deferred

- **Exit-slot reachability.** With the action row gone, Cancel and Save live in the header. On a phone with many lights the header is off-screen once the list is scrolled. Whether the exit slot pins, or a compact bar appears when the header leaves the viewport, is undecided; TODOS.md tracks it.
- **Touch inspection.** A row tap enters Edit, so a light cannot be inspected on a phone without leaving View. Accepted for now; a long-press that emphasises the curve and reveals the entity ID without entering Edit is deferred.
