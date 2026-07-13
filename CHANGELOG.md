# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **New groups now move from Home Assistant setup into the exact Studio canvas they created.** Setup is two focused screens (group details, then native multi-light selection); the first group opens with its first light selected, a one-pass shimmer through three shaping ideas, and two short prompts that disappear as soon as the user starts shaping.
- **Light membership is now edited as one deliberate batch.** "Edit lights" opens a searchable, area-filterable dialog with an explicit "Update lights"/Cancel commit. Existing shapes are retained byte-for-byte, concurrent edits are rejected instead of overwritten, and failed reloads restore the previous saved membership.

## [2.17.1] - 2026-07-13

All changes since 2.17.0, consolidated from the 2.17.1-dev releases below.

### Added

- **Double-tap the graph on phones and tablets to add a point.** Desktop already supported adding a point with a double-click; touch and pen input now get the same gesture, tracked with a movement threshold and double-tap window so a single tap-tap creates one point without triggering a duplicate from the browser's synthetic `dblclick`.

### Fixed

- **The editor uses widescreen space without breaking graph alignment.** The graph and scrubber share one capped width while the light list gets the remaining room for long names, and the save bar stays on the card rail — Save, Undo, and Cancel span the editor as a Home Assistant-style action bar instead of jumping into a viewport-fixed strip when a selected light's shape chips scroll into view.
- **Some non-English languages had blank or missing setup and repair text.** Localized setup descriptions that were previously blank are now filled in, and missing localized abort/repair strings have been added, bringing non-English locales back in line with English.

### Changed

- **Frontend-only updates no longer require a Home Assistant restart.** The editor panel and curve card are now served from stable URLs instead of per-release version-stamped paths (which only registered on restart, so a frontend update returned a 404 until Home Assistant was restarted). Update in HACS, then refresh the browser; a second refresh may be needed while Home Assistant's frontend swaps in the new bundle. Installs and any backend change still require a restart, and HACS still shows its restart prompt because Lightener Studio is a HACS integration.
- **Shape starters sit in the graph header as compact sparkline chips.** Once you pick a light, the four shape starters (`Equal`, `Dim`, `Late`, `Night`) appear as compact chips in the graph header instead of crowding the light list. Hovering or focusing a chip previews it on the graph and changes the header to `Trying …`; clicking applies it and brings back Save, Undo, and Cancel.

## [2.17.1-dev.3] - 2026-07-11

### Added

- **Double-tap the graph on phones and tablets to add a point.** Desktop already supported adding a point with a double-click; touch and pen input now get the same gesture, tracked with a movement threshold and double-tap window so a single tap-tap creates one point without triggering a duplicate from the browser's synthetic `dblclick`.

### Fixed

- **The editor save bar stays aligned in widescreen sidebar layouts.** When a selected light made the shape chips visible and the page scrolled, Save, Undo, and Cancel could jump into a viewport-fixed strip instead of staying on the card rail. The selected-light shape chips now stay inside the graph header, and the save bar keeps the same width as the editor.
- **Some non-English languages had blank or missing setup and repair text.** Localized setup descriptions that were previously blank are now filled in, and missing localized abort/repair strings have been added, bringing non-English locales back in line with English.

### Changed

- **Frontend-only updates no longer require a Home Assistant restart.** The editor panel and curve card are now served from stable URLs instead of per-release version-stamped paths (which only registered on restart, so a frontend update returned a 404 until Home Assistant was restarted). Update in HACS, then refresh the browser; a second refresh may be needed while Home Assistant's frontend swaps in the new bundle. Installs and any backend change still require a restart, and HACS still shows its restart prompt because Lightener Studio is a HACS integration.

## [2.17.1-dev.1] - 2026-07-05

### Fixed

- **The editor uses widescreen space without breaking graph alignment.** The graph and scrubber still share one capped width, while the light list gets the remaining room for long names and Save, Undo, and Cancel span the editor as a Home Assistant-style action bar.
- **Shape choices no longer crowd the light list.** Once you pick a light, the four shape starters sit in the graph header as compact sparkline chips (`Equal`, `Dim`, `Late`, `Night`). Hovering or focusing a chip still previews it on the graph and changes the header to `Trying …`; clicking applies it and brings back Save, Undo, and Cancel.

## [2.17.0] - 2026-07-02

All changes since 2.16.1, consolidated from the 2.17.0-dev releases below.

### Changed

- **BREAKING: the integration domain is now `lightener_studio` (was `lightener`).** Your lights, groups, saved shapes, and dashboards survive the move; one script does the migration. The old domain belongs to the upstream Lightener project, which blocked a HACS default-store submission. Home Assistant keys everything by domain and loads its registries before any integration code runs, so the migration runs as a script while Home Assistant is stopped:

  ```
  scripts/migrate-to-lightener-studio            # read-only plan (changes nothing)
  scripts/migrate-to-lightener-studio --apply    # remove old dir + deploy + migrate, with backup
  ```

  The script removes the old `custom_components/lightener/` directory, deploys `lightener_studio`, and re-keys `.storage`. Every `entity_id`, `unique_id`, config-entry id, and saved shape survives. It takes a timestamped backup first and can be re-run safely. The card type (`custom:lightener-curve-card`) and the editor route (`/lightener-editor`) are unchanged. Full guide in `docs/TROUBLESHOOTING.md`.
- **The graph is what you see; the machinery stays out of the way.** Populated graphs no longer show instruction overlays or editing labels, and the starting-shape picker stays in the side rail instead of pushing the graph down. Buttons name what happens in the room: "Watch room react" replaces "Preview".
- **Shapes apply to the light you picked, not the whole room.** Shape buttons appear once a light is selected. Hovering a shape sketches it on the graph without changing anything: no edit, no undo entry, nothing sent to your lights. Clicking it is the first real edit.
- **The editor says so when lights move together.** When several lights share one shape, it states it plainly ("20 lights match the group brightness") and offers picking one light to give it its own response.
- **The card lays out the same in a dashboard and the sidebar.** Two columns, with Save, Undo, and Cancel always in reach. The light list scrolls inside its own surface at every group size.
- **The light list works by keyboard and screen reader.** Each row is a button, shows when it is selected, and responds across its whole height. "Remove" is now "Remove a light" and stays neutral until used; red appears only on the per-light confirmation.
- **While a room's shapes load, the card previews the graph.** Layered shape outlines with pulsing points replace the flat loading bar. Honors `prefers-reduced-motion`.

### Added

- **Every light's points on the graph match its legend symbol.** Circle, square, diamond, triangle, or bar, so you can tell lights apart without color.
- **A leftover `custom_components/lightener/` folder now raises a Repair issue.** HACS caches the domain it first saw for a repository and keeps extracting updates into the old folder ([hacs/integration#931](https://github.com/hacs/integration/issues/931)), which can leave two copies of the integration on disk. The integration checks at startup and raises a Repair issue (Settings > System > Repairs) with the fix steps: critical when both folders claim the domain, a warning for a dormant leftover. Folders it cannot attribute to this project, such as upstream Lightener installed alongside, are never flagged.

### Fixed

- **First-run setup returns you to the editor.** The sidebar tells a failed group load apart from a home with no groups yet, offers a retry, and picks up groups that appear after it loaded.
- **"Loading groups" can no longer get stuck.** A slow load times out into the retry screen, and the group dropdown reopens after you select a group.
- **The hide toggle in the light list is visible again.**
- **The brightness slider sits exactly under the graph.** One position drives the slider, the line on the graph, and the per-light badges.
- **Tooltips on graph points no longer flicker as the cursor approaches.**
- **Hovering a shape no longer nudges the graph.**
- **Selecting a light by keyboard no longer cancels itself.**
- **Undo also returns your real lights to the earlier brightness while Watch room react is on.**

### For contributors

- CI reusable workflows are pinned by SHA against supply-chain injection.
- New user-facing card copy lives in `js/src/utils/strings.ts` behind a vocabulary guard (`scripts/lint-vocabulary`, CI and pre-commit) that enforces the "Lead with the light" principle from `DESIGN.md`.
- The demo-GIF freshness gate hard-blocks only the stable cut. Prereleases run it advisory.

## [2.17.0-dev.4] - 2026-07-02

### Fixed

- **A stray pre-rename `custom_components/lightener/` folder is now surfaced as a Repair issue.** HACS caches the integration domain it first derived for a repository and keeps extracting `zip_release` updates into that folder ([hacs/integration#931](https://github.com/hacs/integration/issues/931)), so installs added before the `lightener` → `lightener_studio` rename can fail updates with `No manifest.json file found 'custom_components/lightener/manifest.json'` and end up with two integration folders that both claim the `lightener_studio` domain — Home Assistant then loads one of them unpredictably. The integration now checks for the stray folder at startup and raises a Repair issue (Settings → System → Repairs) with the cleanup steps: critical when both folders claim the domain, a warning for a dormant pre-rename leftover. The check only flags folders attributable to this project — an unrelated integration legitimately installed at `custom_components/lightener` (such as upstream Lightener) is never flagged, and the collision issue is only raised when both folders exist. The full diagnosis and fix sequence is documented in `docs/TROUBLESHOOTING.md`.

## [2.17.0-dev.3] - 2026-07-02

### Fixed

- **The hide toggle in the light list is visible again.** The eye icon's shapes came from a nested `html` template inside the `<svg>`, which Lit parses in the HTML namespace — the elements existed in the DOM but never painted, which is why the earlier opacity bumps never helped. The shapes now render through Lit's `svg` template, the icon gets an explicit color instead of inherit-at-partial-opacity, and a resting chip makes it read as a control without needing hover (touch has none). An SVG-namespace regression test guards it.
- **Curve-point tooltips no longer flicker when the cursor approaches from above.** The tooltip sits above its point and intercepted the pointer, toggling hover state every frame; it now ignores pointer events.
- **Hovering a shape no longer pushes the graph around.** The summary band above the graph reserves its height in every state, and the shape-trial state can no longer unlock text wrapping that grew the band on each hover.
- **Save/Undo/Cancel stay reachable in long light lists — in the Lovelace card too.** The responsive layout (two-column workspace, sticky footer) was scoped to the sidebar panel (`embedded: true`) and keyed on viewport width, so a plain Lovelace card rendered one unstyled stack with the footer below the entire light list. Layout is now driven by container queries on the card's own width and applies identically in both contexts; on wide cards the footer sits under the graph column (sticky), and the light list scrolls inside its own surface at every group size, not only at 20+ lights.
- **The brightness slider lines up with the graph and always shows on it.** In wide panels the drawn graph letterboxed inside a full-width SVG while the slider kept stretching, so slider positions stopped corresponding to graph positions — the graph+scrubber stack is now width-capped and centered as one unit. The thumb also displayed 50% while the graph received no position and drew nothing; one effective position now drives the thumb, the graph indicator, and the per-light badges.
- **Sidebar panel: no more stuck "Loading groups", and the group dropdown reopens after selecting.** The group load gets a 10-second timeout into the existing error-and-retry UI, and one derived view state drives both the status line and the content box, so a populated selector can no longer sit above a "Loading groups" box. The dropdown's options are rebuilt only when the list actually changed and never during the change event — rebuilding a focused native `<select>` is what left it inert until you clicked elsewhere. The loading/empty/error boxes now match the group selector's box style.
- **Light rows are tappable across their whole visible height.** The row's select button stretches the full row, removing the dead zones above and below the text.

### Changed

- **"Remove" is now "Remove a light", neutral until used.** The toggle names what it removes, shares one row with "Add a light", and loses the red resting tint — red is reserved for the actual per-light confirmation, so the toggle no longer looks pre-armed or like a wrapped-button layout bug.
- **Shapes copy is shorter.** "Pick a starting shape, then fine-tune it on the graph." replaces the two-sentence explanation, the hover hint drops its reassurance tail, and the four preset descriptions are tightened. Preset names and descriptions moved into the guarded copy home (`js/src/utils/strings.ts`).

## [2.17.0-dev.2] - 2026-07-01

### Changed

- **BREAKING: the integration domain is renamed `lightener` → `lightener_studio`.** This frees the integration from the upstream-owned `lightener` domain so it can be submitted to the HACS default store. Home Assistant keys config entries and entities by domain, and it loads its registries before any integration code runs, so this cannot migrate automatically in-process — but it is one command. With Home Assistant **stopped**, run:

  ```
  scripts/migrate-to-lightener-studio            # read-only plan (changes nothing)
  scripts/migrate-to-lightener-studio --apply    # remove old dir + deploy + migrate, with backup
  ```

  It removes the colliding old `custom_components/lightener/` directory, deploys `lightener_studio`, and re-keys `.storage` (config entries, entity + device registries) so every `entity_id`, `unique_id`, config-entry id, and stored curve survives. A timestamped backup is taken automatically and it is idempotent. The Lovelace card type (`custom:lightener-curve-card`) and editor route (`/lightener-editor`) are unchanged, so existing dashboards keep working. The underlying storage migrator (`scripts/migrate_domain.py`) can also be run directly; continuity and the migrator's safety behavior are covered by `tests/components/lightener_studio/test_domain_migration.py`.
- **Shapes now target the selected light instead of the whole room.** The card keeps a compact Shapes slot in the side rail and shows shape buttons only after a light is selected. Hovering or focusing a shape draws a graph-only shimmer for that light without dirtying the card, changing the save payload, touching undo history, persisting selection, or sending live commands. Clicking a shape is the first real edit, and browser/scenecast coverage now guards the selected-light flow plus the reduced-motion preview marker.
- **The curve card's loading state now previews the graph instead of a flat shimmer.** While a room's brightness shapes load, the card shows a framed graph area with layered curve silhouettes (primary, warm, cool) and pulsing data points, rather than a single shimmer bar. It honors `prefers-reduced-motion` (animations off) and stays decorative (`aria-hidden`) behind the existing `role="status"` live region. The loading caption ("Loading brightness shapes…") moved into `js/src/utils/strings.ts`.

### Fixed

- **First-run onboarding now recovers cleanly after native setup.** The sidebar panel distinguishes a failed Lightener group load from a real no-groups state, offers a retry, refreshes an initially empty list after Home Assistant state changes, and uses HA's working `?brand=lightener_studio` add-integration route so the native setup path returns to the editor reliably.

## [2.17.0-dev.1] - 2026-06-27

### Security

- **CI reusable-workflow pins hardened against supply-chain injection.** The `commit-lint` workflow now pins `engineering-standards` at SHA `502b48e` (the commit that eliminated PR-title shell injection from the reusable). The `verify-claims` workflow now pins `gh-workflows` at SHA `ea347539` instead of the mutable `@v1.1` tag.

### Changed

- **Secondary editor surfaces now stay in the side rail.** Opening the starting-shape picker no longer inserts a full-width panel above the graph; it stays with the light list so the graph remains the primary editing surface. The light list now reports dense-room state such as "20 lights showing" and keeps raw light IDs as secondary context unless a row is focused, selected, hovered, or being managed.
- **The live-preview button now names what it does: "Watch room react".** The scrubber's preview control read "Preview" / "Preview on · Restore" and its status read "Preview is holding the lights here"; it now reads "Watch room react", "Watching · Put it back", and "Your room is showing this now · Save to keep it". The save button in live preview is sentence case ("Save this room"). Same behavior, clearer words.
- **User-facing card copy gets a guarded home.** New card display strings live in `js/src/utils/strings.ts`, guarded by a new `scripts/lint-vocabulary` check (CI + pre-commit) that enforces the project's "Lead with the light" principle (documented in `DESIGN.md`): the full banned list on `strings.ts`, and the universal-filler subset on component source and the demo site. Pre-existing inline card strings are migrated into `strings.ts` incrementally. No change to the shipped editing, preview, save, or management flows.

## [2.17.0-dev.0] - 2026-06-26

### Added

- **Curve-graph control points are shape-coded to match the legend.** Each light's markers on the graph now use the same shape as its legend entry (circle, square, diamond, triangle, bar), so curves stay distinguishable without relying on color.

### Changed

- **The graph now explains overlapping lights with real state.** When multiple lights share the same brightness shape, the editor says so directly (for example, "20 lights match the group brightness") and invites choosing a light to make it respond differently. Selecting a light changes the context to that light instead of adding graph overlays.

- **Editor copy is plainer and more action-focused.** Sidebar, card editor, scrubber, and light-list labels now use shorter user-facing language such as "Brightness shapes", "Try brightness", "Lights", and "Add a light" while preserving the same editing, preview, save, and management flows.

- **The curve editor puts the graph first.** Populated graphs no longer show persistent instruction overlays or editing labels, the try-brightness scrubber uses shorter copy, and the light list uses lighter row styling while keeping shape-coded markers, keyboard editing, live preview, and management controls intact.

- **The light list is keyboard- and screen-reader-accessible.** Each row is now a button inside a proper list and exposes its selected state, and the row action buttons have larger tap targets on desktop. "Add a light" reads as the primary action and "Remove" as the destructive one. Empty-state graph hint text now renders on a backing band so it stays legible over the curves.

- **Dev: the demo-GIF freshness gate only hard-blocks the stable cut.** The release freshness gate is now advisory (`scripts/demo-freshness-check --warn-only`) on prereleases (`-dev.N`/`-beta.N`) and the 2.16 maintenance line, and a hard gate only on a stable feature release — the one release that publishes the GIF to the public demo. The gate condition now mirrors the gh-pages deploy step exactly, so iterative dev cuts are no longer blocked by a stale GIF; it is refreshed once before the stable cut. Dev-only — no change to the shipped integration or card.

### Fixed

- **Selecting a light by keyboard no longer cancels itself.** Pressing Enter or Space on a light row activated the native button and a duplicate key handler, toggling the selection on then off. The row now selects once.

- **Undo now updates the real lights while Live Preview is on.** With Live Preview active, undoing a curve edit animated the on-screen curve back to its previous state but left the physical lights at the brightness from before the undo. Undo now sends a forced preview refresh once the restore animation lands, so each bulb returns to the brightness for the restored curve at the current scrubber position. This matches how applying a preset already behaved.

## [2.16.1] - 2026-06-22

### Added

- **Live preview in the card picker.** Picking the Lightener Studio card from Home Assistant's **Community** card selector now renders a live preview of the curve editor instead of a blank tile, so you can see the card before adding it.
- **Drag a point to preview one light.** While editing a curve, dragging a single light's point now live-previews just that light in real time, easing to the dragged brightness as you drag.

### Fixed

- **The card editor's entity dropdown now lists only Lightener groups.** Configuring a Lightener Studio card previously offered every light in the entity picker, so picking a normal light errored — the card can only target a Lightener group. The picker is now narrowed to Lightener groups. The in-card "Add light" picker for group members is unchanged; it still lists all lights, since members are ordinary lights.
- **Dragging the floor point previews the dimmed level.** Editing a curve's origin/floor point now previews the light at the dragged dim level instead of turning it off.

## [2.16.1-dev.1] - 2026-06-22

### Fixed

- **The card editor's entity dropdown now lists only Lightener groups.** Configuring a Lightener Studio card previously offered every light in the entity picker, so picking a normal light errored — the card can only target a Lightener group. The picker is now narrowed to Lightener groups. The in-card "Add light" picker for group members is unchanged; it still lists all lights, since members are ordinary lights.

### Changed

- **Dev: the release demo-GIF freshness gate no longer trips on editor-only changes.** `demo-meta.json` gains an optional `verified_through_sha`: an auditable maintainer ack that the committed GIF still matches the rendered card through a given commit, used as the gate's diff base in place of `source_sha`. This covers editor-only changes (the card and its config editor share `lightener-curve-card.ts`, and the editor's code rides in the same bundle), so they no longer force a redundant GIF re-capture — bump the field instead. A fresh `demo-refresh` capture clears it, resetting the base. The watched-path set is unchanged (the bundles stay watched — the gate diffs the committed tree and the capture renders the committed bundle). Dev-only — no change to the shipped integration or card.
- **Dev: the local Home Assistant test instance is now isolated and clean.** `config/configuration.yaml` no longer uses `default_config:` — that pulled in the discovery stack (zeroconf/ssdp/dhcp/usb/bluetooth), which scanned the real LAN (real device names bled into the dev log) and segfaulted on macOS CoreBluetooth at shutdown. It now loads an explicit minimal stack (`frontend`/`config`/`history`/`logbook`) that still gives the full UI and config flow with no discovery. `scripts/develop` gains a `--fresh` flag to wipe local HA state (`.storage`, recorder DB, logs) on demand while keeping `configuration.yaml`. A regression test guards the dev config against regrowing the discovery stack. Dev-only — no change to the shipped integration or card.

## [2.16.1-dev.0] - 2026-06-21

### Added

- **Live preview in the card picker.** Picking the Lightener Studio card from Home Assistant's **Community** card selector now renders a live preview of the curve editor instead of a blank tile, so you can see the card before adding it.
- **Drag a point to preview one light.** While editing a curve, dragging a single light's point now live-previews just that light in real time, easing to the dragged brightness as you drag.

### Fixed

- **Dragging the floor point previews the dimmed level.** Editing a curve's origin/floor point now previews the light at the dragged dim level instead of turning it off.

## [2.16.0] - 2026-06-20

### Added

- **Card picker integration (HA 2026.6+).** Lightener Studio now registers itself on `window.customCards` and suggests the curve card under the picker's **Community** section when you select a Lightener light — and only a Lightener light; ordinary lights are never suggested. The card script also loads automatically on every dashboard via Home Assistant's extra-module mechanism (`frontend.add_extra_js_url`), so a card added from the picker keeps working after a full page reload with no manually configured Lovelace resource — on storage-mode and YAML-mode dashboards alike. If you previously added the card resource by hand, remove it; the integration loads the card itself now.
- **Add a light without leaving the card.** The curve card has an inline **Add light** button that opens an entity picker plus a starting-curve preset chooser and adds the light to the group in place — the same experience in a dashboard and in the sidebar panel, with no navigation. An `<ha-area-picker>` room filter sits above the entity picker so you can narrow a large home down to the lights in one room before choosing. Removing lights (manage mode → trash) and deleting a group work as before.

### Changed

- **Building and managing a group now uses Home Assistant's native light picker.** Creating a group and adding lights to it open Home Assistant's own multi-entity selector — the same one the built-in Light Group helper uses — so you can search, multi-select, drag to reorder, and add several lights at once. "New group" opens the native add dialog (name, then room, then lights), and "Manage lights" opens its Configure dialog. The lights you add are written in a single atomic step, and curve editing is unchanged — it still lives in the Lightener Studio card alongside the inline **Add light** button.
- **Preview lights now fade instead of snapping.** When you scrub or edit a curve, member lights ease to their preview brightness over a short 0.25s transition — and ease back when the preview ends — matching how Home Assistant and Adaptive Lighting present smooth light changes. Preview-only: no backend, configuration, or runtime-behaviour change to the group itself.
- **Live demo overhauled.** The browser demo now lets you try the editor with 2, 3, or 20 lights and very long entity names, add and manage lights through a Home Assistant-style picker, and apply presets — with the light and dark preview cards staying in sync as you drag points, scrub brightness, preview, and undo. Touch targets and hints are tuned for phones, and a manual HACS install link sits next to the one-click "Add to my Home Assistant" button.
- **The card bundle now downloads once per upgrade.** The path-stamped card route is immutable for a given release and is served with cache headers, so the browser fetches the card bundle once after you upgrade instead of re-downloading it on every page load.

### Fixed

- **Save confirmation reflects what's actually on disk.** After a save, the card waits for Home Assistant to confirm the persisted curves before showing the "Saved" banner, and a slow re-fetch can no longer confirm a newer save over an older one. A stalled confirmation gives up after 8 seconds and surfaces a retryable error instead of leaving the controls frozen.
- **A double-loaded card is harmless.** If the card script ends up loaded twice (for example, a leftover manual Lovelace resource alongside the automatic loader), the second load no longer throws — its custom elements register defensively and the picker metadata always registers.

### For contributors

- **Custom elements register via a guarded `safeDefine`.** All of the card bundle's custom elements use a guarded define instead of bare `customElements.define`, so a double-load is safe and picker registration is never skipped.
- **`after_dependencies: ["frontend"]` added to the manifest.** Ensures the frontend integration is set up before Lightener registers its extra JS URL. No user-facing impact.
- **Save-confirmation logic extracted into a tested module.** The saved-banner gating, the post-save confirmation/timeout handling, and the save-generation fence on `<lightener-curve-card>` moved into `js/src/utils/save-confirm-guard.ts` with its own unit tests, continuing the curve-card god-file extraction (after `load-lifecycle`, `preview-controller`, `edit-operations`, and the `save-lifecycle` reducer). Behaviour is unchanged.
- **Native multi-light group building via the config flow.** Building a group and adding several lights at once go through Home Assistant's own Lightener config flow (name, then area, then a native multi-light selector), which writes the config entry and reloads in one atomic step. The inline **Add light** button uses the `lightener/add_light` command.
- **Adaptive Lighting contract pinned by test.** A regression test asserts the brightness-and-color behaviour Lightener presents to Adaptive Lighting, so future changes can't silently break that integration.
- **Deterministic hero-GIF pipeline.** The branded demo GIF is captured from choreography-as-code, and the release is freshness-gated so a stale GIF can't ship.

## [2.16.0-dev.4] - 2026-06-17

### Changed

- **Preview lights now fade instead of snapping.** When you scrub or edit a curve, member lights ease to their preview brightness over a short 0.25s transition — and ease back when the preview ends — matching how Home Assistant and Adaptive Lighting present smooth light changes. Preview-only: no backend, configuration, or runtime-behaviour change to the group itself.

## [2.16.0-dev.3] - 2026-06-14

### Fixed

- **"Manage lights" is no longer a dead end — adding lights happens in the card again.** Since 2.16.0-dev.0 the button navigated to Home Assistant's integration page: in a dashboard it did nothing, and from the sidebar panel it dumped you on the device list with no way to add a light to the group. The curve card now has an inline **Add light** button that opens an entity picker plus a starting-curve preset chooser and adds the light in place — the same experience in a dashboard and in the panel, with no navigation. Removing lights (manage mode → trash) and deleting a group are unchanged. Restores the `lightener/add_light` WebSocket command.

## [2.16.0-dev.2] - 2026-06-12

### Added

- **Card picker integration (HA 2026.6+).** Lightener Studio now registers itself on `window.customCards` and suggests the curve card under the picker's **Community** section when you select a Lightener light — and only a Lightener light; ordinary lights are never suggested. The card script also loads automatically on every dashboard via Home Assistant's extra-module mechanism (`frontend.add_extra_js_url`), so a card added from the picker keeps working after a full page reload with no manually configured Lovelace resource — on storage-mode and YAML-mode dashboards alike. If you had added the card resource by hand, remove it; the integration loads the card itself now.

### Changed

- **Custom elements register defensively.** All of the card bundle's custom elements now use a guarded `safeDefine` instead of bare `customElements.define`, so a double-load (for example a leftover manual resource alongside the automatic loader) is harmless and the picker metadata always registers.
- The path-stamped card route is now served with cache headers (it is immutable per release), so the card bundle downloads once per upgrade instead of on every page load.

## [2.16.0-dev.1] - 2026-06-01

### Changed

- **Live demo overhauled.** The browser demo now lets you try the editor with 2, 3, or 20 lights and very long entity names, add and manage lights through a Home Assistant-style picker, and apply presets — with the light and dark preview cards staying in sync as you drag points, scrub brightness, preview, and undo. Touch targets and hints are tuned for phones, and a manual HACS install link sits next to the one-click "Add to my Home Assistant" button. This is a demo-and-docs change only; the integration and card behavior are unchanged from 2.16.0-dev.0.
- **Save-confirmation logic extracted into a tested module.** The saved-banner gating, the post-save confirmation/timeout handling, and the save-generation fence on the `<lightener-curve-card>` moved out of the card into `js/src/utils/save-confirm-guard.ts`, with its own unit tests. Behavior is unchanged — this is internal structure for testability, continuing the curve-card god-file extraction (after `load-lifecycle`, `preview-controller`, `edit-operations`, and the `save-lifecycle` reducer).

## [2.16.0-dev.0] - 2026-05-31

### Changed

- **Light selection now uses Home Assistant's native picker.** Building a group and managing its lights now open Home Assistant's own multi-entity selector — the same one the built-in Light Group helper uses — so you can pick several lights at once, search, and drag to reorder them. "New group" opens the native add dialog (name, then room, then lights), and "Manage lights" on a group opens its Configure dialog. Curve editing is unchanged and still lives in the Lightener Studio card.

## [2.15.1] - 2026-05-30

### Changed

- **Renamed to Lightener Studio.** The project, repository (`lightener-studio`), HACS listing (`hacs.json`), GitHub Pages demo, and the in-app sidebar panel — its title, the config-flow onboarding copy, and the English/Slovak translations — are now "Lightener Studio". The sidebar route (`/lightener-editor`) is unchanged, so existing deep links keep working. The Home Assistant integration identity (`manifest.json` `name`) intentionally stays `Lightener` — it is unchanged on existing systems, so no integration entry is re-keyed. This is a name and positioning change only: behavior, entities, the WebSocket API, and the bundled upstream Lightener are untouched. Removing the integration still restores stock Lightener with devices and automations intact. The release title for the first preview is "v2.15.1 — Lightener Studio Preview" (superseding the earlier "Curve Editor Preview").

## [2.15.0-dev.11] - 2026-05-18

### Added

- **Room filter in the in-card add-lights form.** An `<ha-area-picker>` now appears above the entity picker when adding a light to a group. Selecting a room narrows the entity picker to only the eligible lights in that room; clearing the room restores the full list. Matches the room-filter step in the group onboarding wizard, so large homes are easy to navigate in both flows. Gracefully degrades — if `ha-area-picker` never loads, the form still works with all lights shown.

### Changed

- **Embedded mode uses default component sizing.** The `.card.embedded` style block no longer sets its own `--curve-graph-max-height`, `--curve-graph-min-height`, `--curve-legend-max-height`, or `--curve-scrubber-badges-max-height` overrides. Embedded (sidebar panel) mode now shares the same graph, legend, and scrubber sizing as the standalone card, so the curve graph caps at the standard 320px. The CSS custom properties themselves are unchanged and still honoured if set by a host. The compact embedded header, sticky-footer layout, and shadow suppression are unaffected.
- **Responsive breakpoint and demo guidance tightened.** Component mobile breakpoints now use shared constants, `DESIGN.md` documents the live `--secondary-text` token and breakpoint policy, and the GitHub Pages demo has clearer install, demo, and troubleshooting paths.
- **"Add to my Home Assistant" CTA.** The primary action button on the demo page now links to the HACS deep-link redirect (`my.home-assistant.io/redirect/hacs_repository/`) so users with HA installed can add the integration in one click.

### Fixed

- **Save confirmation can no longer freeze controls indefinitely.** A stalled post-save `get_curves` confirmation times out after 8 seconds and transitions from `confirming` to a retryable save error. A save generation token now fences late reloads, so a slow re-fetch from a timed-out save can no longer confirm a newer save, and `saveCurves()` waits for the backend to actually confirm before reporting success.

### For contributors

- **Browser regression guard for long light names.** Added Playwright coverage for the 20-light long-name fixture:
  - Surfaces: standalone, Lovelace card, sidebar panel
  - Viewport widths: 320 px, 500 px, 700 px, 1100 px
  - Assertions: card, graph, legend, legend rows, truncating labels, brightness badges, and graph affordances stay within viewport
  - Sidebar mode: validates `<lightener-editor-panel>` mounting, two-column workspace at wide widths, footer-before-side-rail order at narrow widths
- **Preview and edit operations extracted from the curve card.** Live-preview RAF/throttle/dedupe state now lives in `preview-controller`, and point/preset/undo edit mutations route through `edit-operations`, continuing the card god-file extraction after `load-lifecycle`.
- **GitHub Pages demo now uses the shared `fake-ha.js` harness.** The demo page previously inlined a minimal stub `hass` object. It now imports `createPreviewHass`, `scenarios`, and `definePreviewEntityPicker` from `fake-ha.js` — the same harness `js/dev.html` uses. Eliminates a second mock to keep in sync.
- **Build step copies `fake-ha.js` to `docs/`.** `npm run build` now runs `cp dev/fake-ha.js ../docs/fake-ha.js` after the Rollup bundle so the published demo always ships the latest harness.

## [2.15.0-dev.10] - 2026-05-16

### Changed

- **Curve-load lifecycle extracted into a pure, tested module.** The seven scattered load-state fields on `<lightener-curve-card>` (`_loaded`, `_loading`, `_loadError`, and the queued-reload entity IDs) are consolidated into a single `_load` state object driven by pure transition functions in `js/src/utils/load-lifecycle.ts` — the same pattern as `save-lifecycle.ts`. The linear-default preset-chooser decision moved to `presets.ts` as `shouldAutoOpenPresets`. Behaviour is preserved; this is internal structure for testability, on the way to bringing the card under the 400-line coverage threshold. (#106)

### Fixed

- **Malformed curve payloads during an unsaved edit now surface a load error.** A backend `get_curves` response missing its `entities` key while the user has unsaved local edits is no longer silently accepted as "loaded" — it fails loud into the load-error path, matching pre-refactor behaviour. The user's unsaved edits are preserved. (#106)

## [2.15.0-dev.9] - 2026-05-16

### Added

- **Session persistence for curve selection and scrubber position.** Selected curve and scrubber position now survive page reloads and HA navigation via `sessionStorage` (keyed per entity). `<curve-scrubber>` refactored into a fully controlled component; hydration guard prevents overwriting active user state on entity switch. (#102)

### Fixed

- **HA state push during active drag no longer clobbers mid-drag edits.** A `_dragActive` sentinel blocks `_tryLoadCurves()` while a curve point is being dragged. A deferred reload fires on `point-drop`/`point-remove` so the card never stays stale after the drag ends. `@pointercancel` wired to the SVG drag surface closes the mobile touch-cancel escape path. (#103)

- **Stress-fixture test suite for 20-light long-name scenarios.** `lightener-curve-card.stress.test.ts` mounts a full `<lightener-curve-card>` custom element with 20 entities, long friendly names (50+ chars), and a two-state matchMedia mock. Covers: DOM scale (20 legend rows + 20 SVG curve lines), CSS overflow contracts on `.name-block`, `.name`, `.entity-id`, and `.brightness-value`, desktop/mobile hint text and hit-circle radius, partial entity load (10 entities), and a negative guard ensuring `hass.states` friendly names are used — not stripped entity IDs.

### Changed

- **TypeScript strictness tightened.** `noUnusedLocals` and `noUnusedParameters` are now enforced in `js/tsconfig.json`. Three dead symbols were removed to clear the new flags: the unused `curve` parameter in `_renderTooltip`, the never-called `makeScrubber` test helper, and the immediately-overwritten `originalStop` variable.

### Fixed

- **Save banner now reflects confirmed backend state.** The "Saved" banner no longer appears the moment the `save_curves` RPC returns. The card enters a new `confirming` phase (controls still disabled) and triggers a follow-up `get_curves` round-trip. Only when the backend confirms the persisted curves does the card transition to `saved` and show the banner. A failed re-fetch surfaces a "Save failed. Check connection." error instead of leaving controls frozen. The `confirming` phase keeps the save button and undo controls disabled throughout via the existing `isSaving()` guard.
- **Graph hint text no longer overflows on first load.** The two-line "Select a light, then double-click its curve" hint was rendering as a single line that extended ~30px past the right edge of the graph area. It now splits cleanly into two centered lines with proper line spacing at all breakpoints (11px desktop, 14px mobile).
- **Curve editor preview is clearer and easier to read.** The tooltip now reads "Group X% → Light Y%" instead of "(X%, Y%)", making it immediately obvious which axis is which. A subtle plot-frame border now visually anchors the graph area. Hint text is slightly bolder and uses a text halo for better contrast on busy backgrounds. The scrubber heading splits into a title and helper line so you always know what the slider controls. ARIA labels updated to match ("Preview group brightness" instead of "Brightness scrubber").
- **SVG description correctly reports peak brightness for non-monotonic curves.** The graph's accessibility description used the final control point's target as the "max" brightness. For curves that peak before the last point (e.g. `0% → 90% → 40%`) this reported the wrong value. It now scans all control points and reports the highest finite target.

## [2.15.0-dev.7] - 2026-05-10

### Changed

- **Mobile UX audit — Wave 1 cleanup.** Tightens the curve editor's first
  impression after a 50-item visual audit on iPhone screenshots:
  - Unified terminology to "Lightener group" everywhere user-facing
    (panel subtitle, dropdown label, status messages, editor hints,
    fallback strings). Drops "light entity" / "group entity" / "Lightener
    entity" mismatches that left users guessing what they were editing.
  - Renamed chart Y-axis from "Light brightness" to "Per-light output".
    Disambiguates which light the chart is showing — there are many.
  - Reformatted the on-graph control-point tooltip from `51:0` to
    `(51%, 0%)`. The colon read as a time format before it read as
    coordinates.
  - Renamed the legend section from "Lights" to "Group lights" and
    dropped the tracked-uppercase styling on section headers so they
    no longer SHOUT at the surrounding sentence-case copy.
  - Removed the redundant "Group brightness" label above the slider —
    the chart's X-axis already names the same axis.
  - Dropped the decorative mini-curve icon next to the "Brightness
    Curves" heading — it competed with the Presets button for
    attention without earning its keep.
  - Dropped the faint dashed 1:1 reference line — too dim to read,
    too visible to ignore.
  - Prevented "+ New group" button label from wrapping to two lines
    on narrow viewports.

- **Screenshot critique — Wave 1 + 2 follow-ups.** Encodes 26 visual /
  correctness contracts from the iPhone screenshot audit and the
  cross-repo failure-mode research as vitest tests, then fixes the
  gaps. User-visible:
  - Only the selected curve gets a filled area; unselected curves
    render line-only. Five stacked translucent fills no longer mush
    into a purple-pink soup.
  - Control-point dots past the scrubber fade with the curve segment
    they belong to. Saturated endpoints in the dimmed region were
    misleading the eye on the right side of the chart.
  - Touch-cancel events dismiss the on-graph readout chip on iOS.
    Previously a stuck "(51%, 0%)" tooltip persisted across slider
    moves because `pointerleave` doesn't always fire on cancel.
  - Per-row legend layout: bold discriminator on line 1, common
    prefix muted below, monospace `entity_id` as a third secondary
    line. Long shared prefixes (e.g. `Kleiderschrank - Magic Area`)
    no longer eat the discriminating suffix.
  - Brightness-value badge reserves room for `100%` and ellipsizes
    instead of clipping or auto-shrinking.

### Fixed

- **Card "+ New group" no longer freezes HA on submit.** The lights picker
  in the create-group modal accepted other Lightener entities as
  controlled lights, creating a recursive `LightGroup` whose state
  listeners fed each other and deadlocked the HA event loop while the
  new entity registered and immediately received state events from
  itself. The form now enumerates Lightener-platform lights from the
  entity registry across every config entry and excludes them from the
  picker — schema validation rejects bypass attempts at the framework
  level. Adds per-step diagnostic logs (`_LOGGER.debug` /
  `console.debug`) so the next reproducible flow freeze pinpoints the
  offending step in seconds.
- **`curvesToWsPayload` drops non-finite or out-of-range control points
  before serialization.** Previously a `NaN` target would serialize as
  the string `"NaN"`, and a `NaN`/out-of-range lightener would become
  the object key `"NaN"`. The reader (`wsPayloadToCurves`) already
  guarded both axes; the writer now mirrors that contract.

## [2.15.0-dev.6] - 2026-05-08

### Fixed

- **Config flow area step no longer fails with "Unknown error".** The HA entity
  selector's `filter` schema rejects any area key (`PREVENT_EXTRA` allows only
  `integration`/`domain`/`device_class`/`supported_features`). Selecting an area
  in the flow caused a schema validation error that surfaced as a generic
  "Unknown error" toast. Fix resolves the area to a list of light entity_ids
  (entities directly in the area + entities of devices in the area) and passes
  them via `include_entities` instead. Falls back to no narrowing if the area
  resolves to zero lights.

### Changed

- **Native config flow drops the "Starting curve" radio.** Picking a preset by
  text label without seeing the curve was Excel-style number crunching. New
  groups default to a linear curve and the user is handed off to the Lightener
  Editor immediately after creation via a markdown CTA in the success page
  (`config.create_entry.open_editor`, links to `/lightener-editor`).
- **Curve card auto-opens the preset chooser on a freshly-created group's
  first appearance.** When the loaded curves are all at the linear default,
  the presets panel opens once so the user picks a starting curve visually
  against the live graph. One-shot per entity per card lifetime — dismissal
  sticks across navigation.
- **Options flow no longer asks for a starting preset for new lights.** Same
  thesis: the curve card is where presets are picked. New lights added via
  options flow start linear; users tune them in the editor.
- **In-panel "Create Lightener group" modal drops its preset selector.** The
  card's auto-opened preset chooser is now the single source of truth for
  picking a starting curve.

### Added

- **Curve editor golden path: full lifecycle ownership.** The card is now the
  single coherent surface for everything Lightener except the integration
  install itself. New affordances:
  - **Inline "Create group" form** opened from the panel's empty state and
    a "+ New group" button next to the entity selector (admins only). One
    screen for name + lights + optional area + starting curve preset, no
    more leaving the card to walk through HA's 3-step config flow. Drives
    the existing `config_flow.py` over WS, so backend validation is
    unchanged.
  - **Delete this group** in manage mode — two-step confirm that resolves
    the entity's `config_entry_id` and calls `config_entries/remove`. The
    panel auto-selects the next available group or returns to the empty
    state.
  - **Empty state visual** — SVG illustration of a curve graph above the
    "Create your first Lightener group" CTA so new users see what they're
    building toward.
- **Manage lights toggle** in the legend separates editing from setup. By
  default the legend shows just the curves and a quiet "Manage lights"
  button; clicking it reveals trash icons on each row and the "Add light"
  form. Auto-exits after a successful add so returning to the editor is
  one step. Admin-only.
- **Preset button grid in Add light** — replaces the `<select>` with a
  64×40 SVG thumbnail + label per preset. Same `presetPolylinePoints()`
  function used in the Presets panel, so visuals are guaranteed to match.
  2-column on desktop, 1-column on mobile, 44px touch targets.
- **First-time graph hint** — when no curve is selected, the hint reads
  "Select a light, then double-click its curve to add a control point" instead
  of the previous bare "Select a light to edit its curve". Dismisses on
  first interaction and resets per entity so each new group gets the
  guidance once.
- Card module writes a `window.LIGHTENER_CARD_VERSION` marker at load time so
  the panel can detect stale-card-class mismatches without a server round-trip.

### Fixed

- **Cache invalidation on group create/delete.** `lightener/list_entities`
  has a 5-second TTL cache that previously only invalidated on
  add_light / remove_light. Group create (config-entry import) and group
  delete left stale data in the cache, so the panel showed a missing or
  extra group until the TTL expired. `__init__.py` now invalidates the
  cache in both `async_setup_entry` and `async_unload_entry`.
- **Scoped-mode empty state CTA.** When the panel is opened with
  `?config_entry=...`, the empty-state CTA used to open the create-group
  modal — but a newly created entry has a different `config_entry_id`
  and gets filtered out, leaving the panel empty after "success." The
  scoped-mode empty state now links to HA Integrations instead, matching
  the gating already in place on the header `+ New group` button.
- **Stale config-entry flow on submit error.** If any `flow/configure`
  call failed mid-sequence, the orphaned flow_id was left dangling in
  HA. Submit now calls `config_entries/flow/abort` on the cleanup path
  so flows don't accumulate.
- **TOCTOU on Create group submit.** The `_createGroupSubmitting` flag
  was set after `await`, leaving a window where rapid double-clicks
  could fire two parallel `flow/init` calls. Flag is now set
  synchronously before any awaits.
- **Manage-mode trash icons hidden until hover.** Holdover from before
  manage mode existed — defeated the point of an explicit mode where
  affordances should be visible. Trash icons are now visible on
  non-selected rows in manage mode, hidden on the actively-edited row
  to avoid mis-tap on mobile and reduce clutter.
- **"Delete this group" tap target was 26px tall.** Below the 44px
  touch target floor for a destructive action. Bumped to `min-height: 44px`.
- **Selected light name truncated to "C.." on mobile** in manage mode
  because the editing chip + clear-X + trash icon all fit in one row.
  Trash icon hidden on selected row at all viewports.
- Non-zero origin points now save and reload end-to-end, preserving dim-floor
  curves created by dragging the 0% control point vertically.
- WebSocket curve saves now reject booleans, floats, missing brightness payloads,
  and out-of-range points before mutating config entry data.
- Options-flow updates now roll back config entry data when the follow-up reload
  fails.
- Read-only curve endpoints now filter entities through Home Assistant read
  permissions before returning data.
- After a HACS upgrade the browser no longer serves the old card from the ES
  module cache. The panel JS URL now carries `?v=<version>` so the browser
  fetches a fresh copy on every upgrade.
- If a stale card class was already registered in the browser's custom element
  registry before the fresh module loaded, the panel now detects the version
  mismatch and reloads the page once (gated via `sessionStorage`) to flush the
  old class and let the new bundle take over.
- Remove-confirmation card now wraps long light names instead of truncating them
  on narrow cards.
- Touch targets for Add/Cancel, remove, and edit-clear icons are now 44 px
  minimum on mobile, preventing accidental mis-taps on small screens.
- Badge text color now uses the actual rendered surface color to compute
  contrast, correcting an incorrect white-on-white appearance in dark mode.
- Entity-picker `Promise.race` chain now has a `.catch()` guard so a rejected
  `loadCardHelpers` promise no longer produces an unhandled rejection warning.
- Animated elements now respect `prefers-reduced-motion`: the live-preview dot
  pulse and scrubber animations are disabled when the OS requests reduced motion.
- `scripts/sync-version` now exits with a clear error message when the manifest
  is missing, the version key is absent, or the CARD_VERSION constant count is
  not exactly 1 in the bundle.

### Changed

- Restored the release-native curve editor model: the smooth curve graph and
  sampler are paired with the in-card add/remove light management surface.
- The local dev preview now uses a fake Home Assistant WebSocket backend so the
  card can exercise save, preview, add-light, and remove-light flows on a local
  server.
- Curve editing now shows an explicit "Editing" chip on the selected row so the
  active edit state is visible at a glance. A "Stop editing" button (×) dismisses
  it without navigating away.
- Add-light and Presets panels are now mutually exclusive — opening one
  automatically closes the other.
- The per-light brightness badges in the "Group brightness" scrubber have been
  removed. The scrubber now shows a clean track and position label only.
- The "Preview all lights" button has moved into the scrubber panel header,
  inline with the "Group brightness" label, saving vertical space and keeping
  the preview control contextually next to the scrubber it controls.
- The scrubber label is now "Group brightness" (was "At brightness") and the
  preview button now reads "Preview all lights" / "Previewing all lights" to
  make it unambiguous that the preview controls the entire group — not just a
  selected individual light.
- Control points in the curve graph now render above the scrubber's dim overlay
  so they remain fully visible and clickable regardless of scrubber position.
  Control points at 100% brightness no longer show a clipped arc at the top edge.
- Editing label increased from 10 px to 11 px on desktop; hidden on mobile to
  prevent truncation against narrow graph widths.
- `scripts/sync-version` now validates the new TypeScript source constant
  (`CARD_VERSION` in `js/src/lightener-curve-card.ts`) and the built bundle
  alongside the existing manifest/panel-JS check, ensuring all four sources
  stay in sync.

## [2.15.0] - 2026-04-25

### Added

- **In-card light management** — admin users can now add and remove lights from a
  Lightener group directly from the curve editor card. New manage panel with entity
  picker (or plain text fallback), preset selection, inline remove-confirm row, and
  pending-state guards. Uses new admin-gated WebSocket commands `add_light` /
  `remove_light`.
- Clicking any light badge in the "At brightness" scrubber now controls that
  individual light directly, setting it to the interpolated brightness at the current
  scrubber position.
- `getGridOptions()` implemented — the card declares its preferred grid size
  (12 columns × 9 rows, min 6 × 6) to HA's Sections dashboard so it auto-sizes
  correctly on first drop.

### Changed

- Curve rendering is now clipped to the graph plot area — curves and control points
  no longer bleed outside the graph boundary. Uses a per-instance unique `clipPath`
  ID to support multiple cards on one dashboard.
- Legend row hover and selected states now use the HA primary-color tint (matching
  sidebar hover) instead of a grey overlay.
- Selected legend row uses a filled background instead of an absolutely-positioned
  bottom line marker.
- Browser focus ring on legend rows suppressed; replaced with a rounded `box-shadow`
  ring that respects `border-radius`.
- Native browser tooltip (`title` attribute) removed from legend rows — it was
  appearing as a dark overlay on hover. Full name preserved via `aria-label` for
  screen readers.
- Curve endpoint control point is now removable: `Space`, `Delete`, and right-click
  work on the last point the same as on interior points. The minimum 2-point guard
  still applies.
- When a curve has no explicit 100 control point, the UI saves an explicit
  `(100, last_target)` entry so the curve flattens at the last configured level on
  reload.
- ARIA labels on graph points now use two categories — origin (Y-only, no remove)
  and all other points (free move + remove) — replacing the prior three-way
  distinction.

### Fixed

- `<ha-entity-picker>` now loads correctly in the card editor and the add-light
  form. HA lazy-registers this custom element; if the lightener card is the first
  on the page to reference it, the element was never defined and rendered blank.
  We now force registration via `loadCardHelpers()` / `hui-entities-card`, with a
  plain text fallback and a post-timeout upgrade subscription so a late registration
  is never permanently missed.
- Badge overflow count in the "At brightness" scrubber no longer shows "+N more"
  incorrectly on first render. Measurement is deferred to after first paint via
  `requestAnimationFrame`, and a `tallestBadge` floor prevents the container from
  collapsing during font-swap races.
- "At brightness" scrubber label casing corrected (was ALL CAPS).
- Badge pill background strengthened in light mode for better visibility.
- Badge click in scrubber correctly skips hidden (visibility-off) lights.
- Curve graph rendering and preview sampling now use the same piecewise-linear
  interpolation as the backend brightness map, so scrubber values, previewed
  brightness, and saved behavior no longer diverge.
- Preview restore correctly handles on/off-only lights (no brightness attribute):
  they are restored with `turn_on` without a brightness argument.
- Save-success timer is cleared before re-arming on rapid successive saves,
  preventing a status flap when saves complete inside the 2-second display window.

### Security

- Release workflow now validates the tag name against a strict semver regex before
  use and passes it via `strenv()` instead of shell interpolation, closing a CI
  script injection vector in the `yq` version-patching step.
- `ws_list_entities` access control decision documented: the endpoint intentionally
  omits `require_admin` so non-admin users can view curves in read-only mode via
  the sidebar panel. `config_entry_id` is intentionally included because the panel
  uses it for per-entry filtering.

## [2.14.0] - 2026-04-17

### Added

- **Preview toggle** — new "Preview" button in the card header lets you push the live brightness to all lights in the group while you shape the curve, without holding the scrubber. Lights restore automatically when preview is stopped, the card is navigated away from, or the entity changes
- **Origin point Y-drag** — the leftmost control point (brightness at 0% input) can now be dragged vertically to set a dim floor, with a dashed stroke and `ns-resize` cursor to indicate constrained movement
- **Badge overflow** — when the light-selector bar is too narrow to show all badges, excess ones collapse behind a "+N more" button with `aria-expanded` toggle

### Changed

- Save-lifecycle state machine extracted into a pure TypeScript reducer (`save-lifecycle.ts`) — three ad-hoc `@state` booleans collapsed into one `SaveState` + selectors, making save logic testable in isolation
- Brightness helpers extracted from `light.py` into a dedicated `brightness.py` module — identical behaviour, cleaner module boundaries
- Coverage gates hardened: Python floor raised to 90% (baseline 94.74%), JS thresholds set at 75/65/75/75 (baseline 82.52/73.76/83.47/80.52)

### Fixed

- Preview stops on `disconnectedCallback` — lights no longer stuck at preview brightness after navigating away
- Preview scrubber indicator now defaults to 50% when preview starts before the scrubber has been touched, so the graph stays in sync with what lights receive
- Preview throttle now fires a trailing-edge send so the final scrubber position always reaches lights, even after rapid movement
- Rapid preview toggle after an entity switch no longer sends stale brightness restore targets
- Origin control point is now protected from accidental long-press deletion on mobile
- Badge overflow measurement skipped while expanded, fixing an infinite expand/collapse flicker loop
- ARIA labels on keyboard-editable control points now correctly distinguish origin (Y-only) and all other points (free move + remove) — previously all said "Space removes"
- Focus-visible styles added to Preview, Presets, and preset-option buttons for keyboard accessibility
- Division by zero in `scaleRangedValue` when source range is degenerate — now returns target range start instead of `NaN`
- Floating promise anti-pattern in `curve-graph.ts`: `.updateComplete.then()` calls now guarded with `.catch(() => {})` to prevent unhandled rejections on disconnect
- Undo stack for old entity cleared on entity-switch bail path, preventing stale undo history from a previous entity being replayable after switch-back
- Config flow: `_area_filter` internal key regression test added

## [2.13.0] - 2026-04-12

### Added

- **Curve presets** — new "Presets" button in the card header opens a one-click picker with four named curves: Linear, Dim accent, Late starter, and Night mode. Each shows a miniature curve preview. Applies to the selected light only, or all lights if nothing is selected. Fully undoable with Ctrl+Z.

### Fixed

- Presets panel closes automatically when you drag a point, cancel edits, or switch entities — no orphaned panel after navigating away
- Clicking a preset while a save is already in flight is now ignored — previously the UI could fall out of sync with what was actually saved
- Clicking a preset before curves have loaded no longer creates a phantom undo entry
- Config flow: removed unsupported `description` field from curve preset select options, fixing a crash in pytest on HA 2024.11+

## [2.12.0] - 2026-04-12

### Added

- Config flow: area filter step between name and light picker — select a room first to narrow 100+ lights down to the relevant subset on mobile
- Config flow: mode descriptions on all four curve presets (Linear, Dim accent, Late starter, Night mode) shown as radio cards with plain-language explanations
- Brightness preview: "Previewing live — release to restore original brightness" notice shown in the status area while the scrubber is held
- Keyboard-accessible graph point editing: focus curve points, move them with arrow keys, add with `Enter`, remove with `Space`
- `DESIGN.md` documenting UI tokens, component patterns, and accessibility expectations for the editor

### Changed

- Scrubber preview throttle increased from ~16ms (60fps RAF) to 300ms minimum interval, capping at ~3 commands/sec per light to prevent Zigbee/Matter/MQTT command backlog buildup
- Graph hint text updated: "Select a light below — each gets its own curve" to clarify that curves are per-light
- Editor panel empty state now explains what Lightener is, how to create a group, and links straight to Home Assistant Integrations
- Embedded narrow-screen layout now keeps save and cancel actions in a sticky footer directly below the graph stack
- Curve loading now uses a graph-shaped skeleton instead of pulsing text

### Fixed

- SVG adds `user-select: none; -webkit-user-select: none` to prevent iOS from selecting text or triggering native gestures during long-press on control points
- Entity switching in the sidebar panel no longer drops dirty curve edits silently; it now requires inline save or discard confirmation
- Scrubber badge overflow now shows a `+N more` indicator instead of silently clipping extra values

## [2.11.0] - 2026-04-12

### Added

- Embedded workspace layout: 2-column grid (graph+scrubber | legend+footer) when the curve card is hosted in the editor panel, single-column stack on narrow screens
- "Lights" section label on the legend component for scannable hierarchy
- Dynamic SVG `<desc>` element for screen reader curve summary (e.g. "3 curves: Ceiling Light, Sofa Lamp, LED Strip")
- Design review TODOs (TODOS.md) with 10 tracked improvement items

### Changed

- Editor panel shell: wider max-width (1360px), styled control-row with gradient surface, responsive breakpoints at 900px
- Panel DOM construction is now one-time: `shadowRoot.innerHTML` only runs on first render, preventing card-mount wipe on hass updates
- Panel uses ES module import (`import()`) instead of script tag injection for curve card loading
- Entity picker filters by `config_entry_id` when deep-linked via `?config_entry=...` URL param
- Error retry buttons changed from "Tap to retry" to "Retry"
- CSS custom properties (`--curve-graph-max-height`, `--curve-legend-max-height`, `--curve-scrubber-badges-max-height`) for component sizing in embedded mode

### Fixed

- Card mount cleared when no entity is selected (previously showed stale card)
- Panel entity loading race condition with config_entry filtering

## [2.10.0] - 2026-04-12

### Added

- Structured observability layer (`observability.py`): every `turn_on`, `turn_off`, and WebSocket call now emits trace spans, counters, histograms, and structured log events that can be consumed by any log aggregator

### Changed

- `async_update_group_state` now uses an O(1) dict lookup (`_entities_by_id`) instead of a nested O(n) scan, with early exit once the common-level intersection empties — faster state convergence when controlling many lights
- Brightness map construction is now cached via `lru_cache`: lights sharing an identical curve config reuse precomputed maps instead of rebuilding them at startup
- Test dependency bumps: pytest 8→9, pytest-asyncio, pytest-homeassistant-custom-component (includes pycares constraint update)
- JS dev dependency bumps: `@rollup/plugin-terser` 0.4→1.0 (fixes high-severity CVEs in serialize-javascript), vitest 4.1.2→4.1.4 (fixes path-traversal and WebSocket file-read CVEs in vite)

### Fixed

- `async_update_group_state` early-exit no longer skips `is_lightener_change` context detection for unprocessed entities; brightness display after a Lightener-initiated change now correctly uses the preferred level even when levels intersection empties before all entities are visited

### Added

- Visual card configuration editor (`lightener-curve-card-editor`) with HA-native entity picker and optional custom title
- Live light preview: scrubbing the brightness slider pushes interpolated brightness to physical lights in real-time via `light.turn_on`/`turn_off`; brightness restores on release
- Card header now renders from `config.title` with "Brightness Curves" as default
- `DEFAULT_BRIGHTNESS` constant in `const.py` for consistent default curves across config flow and light platform
- Built-in config-flow curve presets (`linear`, `dim_accent`, `late_starter`, `night_mode`) for onboarding without manual curve authoring
- Dedicated Home Assistant sidebar panel (`/lightener-editor`) that hosts the curve editor without requiring manual dashboard card setup
- New `lightener/list_entities` websocket API for panel entity discovery
- Undo support for curve edits (footer undo button and Ctrl/Cmd+Z shortcut)
- Shared graph math module (`graph-math.ts`) with geometry/interpolation helpers reused by graph and scrubber
- 44 new Vitest unit tests (`card-logic.test.ts` and `graph-math.test.ts`) covering undo flow, interaction guards, and curve math
- Release workflow zip validation step that fails when a nested `custom_components/` path is present or `manifest.json` is missing at zip root

### Changed

- Config flow simplified: name your device, pick lights, done — no more text-based brightness mapping
- Options flow simplified: add or remove lights in one step; existing brightness curves are preserved
- Config and options flows now include a starter curve preset selector; selected preset is applied to newly added lights only
- Both flows now guide users to the Lightener Curve Editor card for visual curve editing
- Flow descriptions now point to both the sidebar panel and dashboard card for visual editing
- Config and options flow now show curve preset label ("Starting curve preset") in both setup and edit flows
- Scrubber now emits position events and stays in sync with the graph, including a vertical guide and per-curve value dots
- Curve legend shape markers now use shared constants from graph math utilities for consistent rendering
- Graph and scrubber now sample values through the same smooth-curve interpolation path for consistent badge and graph readouts

### Removed

- Text-based per-light brightness mapping step (replaced by visual curve editor card)

### Fixed

- Graph SVG reference now uses Lit `@query` decorator so drag and double-click work correctly if the graph panel unmounts and remounts during a loading cycle
- Removed a duplicated interpolation code path so graph and scrubber value sampling no longer drift from each other
- Mobile editing behavior now supports long-press point removal while preserving drag interactions
- Undo/cancel animations now preserve each curve's live visibility state instead of restoring stale visibility from snapshots
- Global keyboard shortcuts are now scoped to the card focus context, avoiding accidental save/undo/cancel when focus is outside the card
- WebSocket curve saves now reject unknown entities and malformed per-entity brightness payload shapes
- Release workflow now injects tag version via shell env expansion so manifest version updates resolve reliably
- Integration setup now tolerates sidebar panel registration failures without blocking startup
- Badge text contrast: yellow and orange curve badges now use darkened text to pass WCAG AA
- SVG axis labels and hints scale to 12px on mobile (was 9-10px)
- Control point hit circles use dynamic radius via `matchMedia` for reliable 44px+ touch targets on all mobile WebViews
- Hint text now reads "Dbl-click to add, Right-click or long-press to remove" (was touch-only phrasing)
- Success message fades in and out smoothly instead of disappearing abruptly
- `beforeunload` dialog now works in Firefox (added `returnValue`)
- Legend eye toggle now includes `aria-pressed` for screen reader toggle state
- Sidebar panel entity picker now uses DOM API instead of innerHTML, preventing XSS via crafted entity names
- GitHub Actions `hassfest` and `hacs/action` pinned to commit SHAs instead of mutable branch refs
- Sidebar panel curve editor no longer goes blank after entity list loads: the shadow DOM structure is now built once and updated in-place, so the card mount point is never wiped by subsequent `hass` updates
- `lightener/list_entities` WebSocket response now includes `config_entry_id` so the panel can filter entities by config entry when opened from the integration config flow
- 16 new Vitest unit tests for the sidebar panel (`lightener-panel.test.ts`) covering entity selection, card lifecycle, and config-entry filtering

## [2.9.0] - 2026-04-06

### Added

- "Layered Panels" card redesign: graph, scrubber, and legend each sit in their own tinted sub-panel with subtle depth
- Colorblind-safe curve palette: replaced green colors with indigo and brown
- Shape markers in legend (circle, square, diamond, triangle, bar) for color-independent identification
- Loading indicator with pulse animation while curves are being fetched
- "Editing: {name}" label in graph header showing which curve is selected
- Retry buttons on load and save errors with `role="alert"` for screen readers
- Keyboard support: arrow keys on scrubber slider, Enter/Space on legend items, Ctrl+S to save, Esc to cancel
- Live demo via GitHub Pages
- Scenario switcher in dev mode for testing 2-light, 3-light, 20-light, and long entity ID edge cases
- 32 unit tests covering data conversion and interpolation

### Changed

- Scrubber redesigned: gradient track, round thumb, inline value badges replace bar charts
- Legend selection uses accent underline instead of left border
- Card border radius 12px to 16px, refined layered shadow, padding 16px to 20px
- Save button uses consistent #2563EB blue across all themes
- Footer buttons rounded to 8px

### Fixed

- Right-click to remove control points now works (pointerdown was intercepting right-click button)
- Success status uses blue (#2563EB) with checkmark icon instead of green (colorblind-safe)
- Error/success regions use `role="status"`/`role="alert"` and `aria-live` for screen readers
- Retry affordances converted from spans to focusable buttons
- Value badges cap at 2 rows with overflow hidden (prevents layout explosion with 20+ lights)
- Badge names truncate at 80px with ellipsis for long entity IDs
- WebSocket handler validates curve payload types before accessing `.get()` (prevents crash on malformed messages)
- Legend items are keyboard-operable (tabindex, Enter/Space, ArrowUp/ArrowDown)
- Hint text moved inside graph area to avoid axis label overlap

## [2.8.1] - 2026-04-04

### Fixed

- Restored Lightener setup for migrated configurations
- Fixed brightness mapping migration handling to avoid double-wrapping
- Fixed the `configuration.yaml` setup path when using migrated config data

### Added

- Interactive brightness curve editor card (`custom:lightener-curve-card`)
  - Visual editing of per-light brightness curves directly in the HA dashboard
  - Smooth bezier curves with gradient fills
  - Colorblind-accessible dash patterns to distinguish curves
  - Brightness scrubber with real-time bar gauge readouts per light
  - Keyboard shortcuts: Ctrl+S to save, Esc to cancel
  - Unsaved-changes guard (browser prompt before navigating away)
  - Light and dark theme support via Home Assistant CSS custom properties
  - Mobile-responsive layout with touch-optimised controls
- WebSocket API (`lightener/get_curves`, `lightener/save_curves`) for reading and writing brightness configs from the frontend
  - Read access available to all authenticated users (for dashboard display)
  - Write access restricted to Home Assistant administrators

### Changed

- Renamed HACS display name to "Lightener Curve Editor" to avoid confusion with upstream

### Fixed

- Home Assistant 2026.x compatibility (`async_register_static_paths` API)
- Overlapping curves: selected curve now renders on top so all control points stay clickable
- Curve load race condition when Home Assistant sends rapid state updates
- Legend name truncation for long entity names
- Dirty-state indicator not clearing after save
- Small hit targets making control points hard to grab
- Timer leak when card is removed from the DOM

### Also includes

- Recent UI polish, theming, mobile, and release-readiness improvements validated in the release candidate

## [2.4.0] - Upstream

This version matches [fredck/lightener](https://github.com/fredck/lightener) v2.4.0,
from which this fork was created. All upstream functionality is included unchanged.
