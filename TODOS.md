# TODOs

This is the public product backlog. The 2.18 editor is in a refinement and
acceptance phase. Preserve its current design and keep follow-up changes small.
Completed implementation belongs in `CHANGELOG.md` or GitHub history.

The acceptance section needs evidence against the final integrated candidate.
Physical-light acceptance is required before stable release; any pending native
or device checks must be disclosed in a beta candidate.
Other unchecked items are not automatically release blockers. Reproduce reported
failures, make explicit decisions on requested behavior, and keep broader work
separate from the refinement release. Larger work should be tracked as GitHub
Issues before implementation.

## 2.18 acceptance

- [ ] **[P2 — native light restoration]** Verify Watch restoration across Home Assistant sidebar/dashboard navigation, connection and identity changes, including physical-light behavior. Browser-loss cleanup, cross-tab ownership and protection from unobserved external controls are unsupported.

- [ ] **[P2 — native draft recovery]** Verify draft recovery across Home Assistant sidebar/dashboard navigation, including retained and replaced editors and late identity availability. Recovery must issue no save or light commands. Full-refresh and tab-close recovery are unsupported.

- [ ] **[P2 — transformed-host dialog]** In an embedded card beneath a translated, scaled or filtered ancestor, `light-membership-dialog.ts` uses a fixed-position overlay whose containing block follows that ancestor. Scrolling can leave dialog controls outside the visible viewport. Keep focus and close controls reachable without trapping the modal beneath sibling cards or Home Assistant chrome.

- [ ] **[P2 — visual]** The editor no longer draws graph, Room or light-list panels; spacing, the action-row divider and row separators carry the structure instead. Confirm the regions stay distinct in dark mode in real Home Assistant, then close #229. (#229)

- [ ] **[P2 — onboarding]** Verify New group → native setup → Finish → Visit/Configure → the correct group editor in Home Assistant. The current `?brand=lightener_studio` route opens a provider picker; distinguish a working extra step from a broken handoff. Keep the direct-launch refinement tracked separately from flow correctness and verify any change end to end. (#221)

- [ ] **[P2 — native canvas help]** Verify in Home Assistant that opening, replaying, dismissing and refusing help for an existing draft or active Watch issue no save or light commands. Replay/completion/dismissal preserve shapes, selection and Room value. Pointer/keyboard adoption remains unsaved; Undo restores the prior shape and clean state. Include group changes, disconnection, real-device touch and changing reduced-motion preferences. Browser fixtures alone do not close this item.

- [ ] **[P2 — upgrade acceptance]** Verify existing groups and saved shapes survive the update. Cached editors must be refused safely when they lack guarded-save preconditions, without a forced refresh or silent loss of unsaved work. Verify the served frontend and loaded backend for the tested candidate.

## Small refinement candidates

- [ ] **[P2 — Watch lock length]** A restore that waits on a preview command which timed out starts its own 10-second timeout, so Watch, Edit lights and Delete group can stay blocked about 20 seconds (`preview-session.ts` `_issue`). AGENTS.md says never longer than the 10-second command timeout. Decide: skip the waiting restore once its preview timed out, or reword AGENTS.md and DESIGN.md to "up to 10 seconds per command".

- [ ] **[P2 — Watch rejected command]** A preview command Home Assistant rejects (for example `unauthorized`) is treated like a finished one, so the next queued brightness is still sent before the editor sees the new user state (`preview-session.ts` `.then(finish, finish)`). End Watch without a restore on an authorization rejection and drop queued work.

- [ ] **[P3 — Watch quick restart]** Turning Watch back on after a restore reply but before Home Assistant reports the new state records the Watch brightness as the light's value from before Watch, so the next restore puts the Watch brightness back. Seen with integrations that report state late (MQTT, Zigbee2MQTT, Hue). Needs a decision on remembering the last restore target per light.

- [ ] **[P2 — membership lock after failure]** If Edit lights or Delete group loses its connection before Home Assistant replies, the group's lock stays until reload, so Watch, Edit lights and Delete group stay unavailable. `AGENTS.md` says they must never stay blocked. Decide whether to release the lock on a transport failure or after a time limit, or to narrow the rule to command locks. Files: `js/src/components/light-membership-dialog.ts`, `js/src/lightener-curve-card.ts` (delete path).

- [ ] **[P2 — restore barrier after group switch]** A restore still waiting after a group switch checks the runtime barrier of the group now shown, not the group it belongs to. It can send despite a barrier on the old group, or be dropped when the new group loads blocked. Record the session's config entry and check that entry's barrier. Files: `js/src/utils/preview-controller.ts` (`restoreBlocked`), `js/src/lightener-curve-card.ts`.

- [ ] **[P3 — double-click on the Room edge]** The Room edge's grab strip (about ±1.7% of room brightness) takes the press, so double-click or double-tap there probably does not add a point. Not reproduced. Forward double-click to the add-point handler or start the grab only after horizontal movement. File: `js/src/components/curve-graph.ts` (`room-edge-hit`).

- [ ] **[P3 — Off visibility]** Keep the selected curve and its editable handles clear when Room brightness is Off, while dimming other curves. The current implementation dims the selected shape too. This is deferred presentation work; preserve numeric Room zero, curve data, Undo and light commands.

- [ ] **[P2 — test infra]** Replace elapsed-time waits in the selected-shape and draw-in cases in `selected-light-shapes.spec.ts` and `motion-moments.spec.ts` with observable readiness signals. Verify that they pass together under parallel scheduling.

- [ ] **[P3 — test gap]** No test covers the `prefers-reduced-motion` branch of `.control-point` (`curve-graph.ts`), which drops the transform transition so the scale snaps instead of easing. The scale itself still applies, which is the intent; nothing pins it.

- [ ] **[P3 — undo animation]** When Undo or Cancel animates between shapes with different point counts, the morph pairs points by index and keeps extra start points until the last frame, so points cross mid-animation and an endpoint vanishes at the end (e.g. undo Dim back to Equal). The ripple's blended drawn curves (`motion.ts` `drawnShape`, `blendPieces`) could drive this morph too (`lightener-curve-card.ts` `_animateCurvesTo`, `card-logic.ts` `interpolateControlPoints`).

## View and Edit mode (approved design, 2026-11-06)

These unchecked items describe future work, not the current editor. The current
context line, reserved shape-chip row, header Watch/help, action row, Manage menu,
eye controls and scoped group filtering remain implemented. See DESIGN.md's
"Approved future View and Edit design" section; exit-slot reachability is still
an open choice. Tutorial completion and replay do not implement View/Edit modes.

- [ ] **[P1 — modes]** Open the editor in View mode (graph, Room brightness, lights; no management buttons, Undo/Cancel/Save, All lights or starting shapes). Dragging a point or a light's bar, arrow keys on either, or choosing a light enters Edit mode in the same gesture; Room brightness, Watch, help, the group switcher and hover stay in View mode. One top-right exit slot shows Edit, Done (clean) or Cancel + Save (unsaved). Save returns to View mode only after a confirmed save; a failed, stale or conflicting save stays in Edit mode with draft and Undo intact. Done keeps Watch running; Save and Cancel end it as today. Cover non-admin users and states where curve editing is unavailable. Files: `lightener-curve-card.ts`, `lightener-panel.js`, `curve-legend.ts`.

- [ ] **[P1 — Visit links]** Make New group and every group reachable from scoped `?config_entry=` routes: `config_entry` becomes the initial pick instead of a filter (the `config_entry` handling in `custom_components/lightener_studio/frontend/lightener-panel.js`), switching groups updates it in the URL (`_setSelectedEntity` writes only local storage today), and `config_entry` wins over the stored last group.

- [ ] **[P2 — header]** Group name as the headline (28px/600, truncates) with a group switcher that lists every group and New group…; the brand mark only. One ⋮ menu, last in the header in both modes at every width: Show me how, Edit lights…, Delete group… (confirmation inline). The ? help button, the Manage row and the "Group" label and intro line go. The header sits flat in View mode and takes a tinted bed with a 2px blue rule in Edit mode; its height is fixed in both modes. From 1100px of header width the shape chips, Watch and Undo live in the header; below that, Watch sits at the right of the Room meaning line and chips + Undo take one row under Room while a light is selected. Source: `DESIGN.md` "Approved future View and Edit design" (2026-11-06). Supersedes the Manage-menu question in #230.

- [ ] **[P2 — eye button]** Remove the per-light eye button and the hide state; Watch then previews every light. Make All lights the first row of the light list in Edit mode. Update the selector rule in `AGENTS.md` and the eye-button tests.

- [ ] **[P2 — no reserved rows]** Remove the context line and the shape-chip reserve above the graph; the graph follows the header directly (12px). All lights is the first list row in Edit mode; Undo sits beside the chips; action-needed messages take one line under the Room row only while they exist. The graph panel gets its 5% well with a 1px frame, and a 4% warm well plus amber frame while Watch is on (`DESIGN.md` tokens `--graph-panel`, `--edit-bed`, `--watch-well`). Decided 2026-11-06.

- [ ] **[P2 — exit slot reachability]** With the action row gone, Cancel and Save live in the header; on a phone with 20 lights the header is off-screen once the list is scrolled, so unsaved work can only be saved after scrolling back up. Decide between a sticky panel header on narrow screens and a compact Cancel/Save bar that appears when the header leaves the viewport. Reference: the old `_syncFooterOverlay` measurements (`_syncFooterOverlay` in `js/src/lightener-curve-card.ts`) before they are deleted. Depends on the modes landing first.

- [ ] **[P3 — touch inspection]** On phones a row tap enters Edit mode, so a light cannot be inspected without leaving View mode. Accepted for now (2026-11-06). Revisit with a long-press that emphasises the curve and reveals the entity ID without entering Edit, once the modes are in real use or a phone user reports accidental Edit entries.

- [ ] **[P2 — selection transition]** With light A selected, hovering light B then clicking it goes dotted → full visibility → solid instead of cross-fading dotted → solid. Find the root cause before fixing.

- [ ] **[P3 — wide layout]** Adaptive layout: stacked when narrow, lights beside the graph on wide landscape cards, two columns on ultra-wide. Threshold values still open; settle after the header work.

## Requested behavior requiring scope decisions

- [ ] **[P2 — membership Undo]** Reconcile Undo after adding a light. If included, implement a guarded inverse membership transaction that survives reload, preserves other saved shapes, detects concurrent changes and retains recoverable state on failure. Curve-history Undo alone does not undo persisted membership.

- [ ] **[P2 — light ordering]** Define the requested light-list ordering and persistence scope before implementing it. Preserve entity identity, colors, visibility, selection, saved shapes and active gesture targets through sorting, membership changes and reload.

## Later improvements and known limitations

- [ ] **[P2 — picker reach]** Member-light reverse lookup → parent group card suggestion: when a *member* light (not a lightener light) is picked in the card picker, scan `hass.states`/`hass.entities` for lightener lights whose native `entity_id` attribute contains the picked entity and return a labeled secondary suggestion for the parent group's card (`getLightenerEntitySuggestion` in `js/src/utils/card-registration.ts`). TS-only — the Python state attribute already exists (`LightenerLight` inherits `LightGroup`'s `entity_id` attr; see `tests/components/lightener_studio/test_light.py:780`). Tie-break when a member belongs to multiple groups. (#200)

- [ ] **[P2 — save lifecycle]** Guarded saves now confirm from a complete authoritative receipt, without a post-save confirming re-fetch. Keep any future optimistic-save proposal separate: it must preserve baseline preconditions, draft/history retention and outcome-unknown handling. Receipt waiting is bounded by an 8s client timeout (`save-confirm-guard.ts`); broader lifecycle extraction remains open. (#201)

- [ ] **[P3 — graph clarity]** The scrubber line on the graph has no label. The "Room brightness" scrubber below the graph and every legend row already show the percentage, so a label is only worth adding with new wording (card copy avoids "Preview") and design sign-off. (#228)

- [ ] **[P2 — UI structure]** Edit lights and Delete group now sit in a Manage menu above the light list. Evaluate whether Home Assistant-native row or expansion controls would make the remaining secondary actions easier to scan. Keep management, presets, and destructive actions visually secondary while preserving graph behavior, live preview, save/cancel guards, shape/dash accessibility, and keyboard editing. (#230)

- [ ] **[P2 — correctness]** `LightenerLight.async_update_group_state` resolves a multi-candidate group level with `common_level.pop()`, which returns an arbitrary element of a set when the preferred level is incompatible. Reconciliation runs only while the group is on: a sole Late light that is off skips it, even though Late stays at zero through 40%. An on group can still have multiple compatible levels, including an off member alongside an on member with a flat response. Two members with overlapping positive flat regions leave a 65-level choice (pinned by `test_two_flat_members_leave_a_wide_intersection_resolved_by_pop`). Decide an explicit rule (lowest / nearest to `_prefered_brightness` / hold current) rather than inheriting CPython's set ordering.

- [ ] **[P3 — correctness]** The card and the backend encode a dim floor differently: `prepareBrightnessConfig` rewrites `{lightener: 0, target: t}` onto lightener 1 and previews the two spellings identically, while `prepare_brightness_config` keeps an explicit `0` as the first segment's start (103 vs 34 at group level 1). Pinned from both sides (`interpolation.test.ts`, `test_brightness.py`); reconciling them is a design decision about what a dim floor means.

- [ ] **[P3 — editor UX]** Pinning a light to 0 by hand remains impractical. Late starter now provides a flat zero segment through 40%, but a general manual off-threshold interaction still needs a product decision. Preserve the monotone curve map, outcome-oriented wording, and member-to-group reconciliation; avoid a preset-specific editing path.

- [ ] **[P3 — visual]** Control-point growth scales `stroke-width` along with the marker (2 goes to 2.5 on hover and 2.66 on drag), and scales the origin marker's dash pattern too. The old `r`-based growth left the stroke at 2. `vector-effect: non-scaling-stroke` on `.control-point` would restore the constant outline; whether the thicker outline is wanted is a design call, not a defect.

- [ ] Reproduce hidden-parent rendering in real HA tabs, popups, and stacked dashboards; add a resize/intersection guard only if the browser repro confirms graph space collapses.

- [ ] Find out whether a 100-light group is usable. The legend scrolls after eight lights and keeps one row height at every size, the graph summarizes 20 lights that share one shape, and the server caps a group at 100 lights (`membership.py`). Missing: a legend filter or virtualization, and a stress test above 20 lights (`lightener-curve-card.stress.test.ts` stops at 20).

- [ ] Continue extracting `lightener-curve-card.ts` after `load-lifecycle`, `preview-controller`, `edit-operations`, and `save-confirm-guard`. Coaching phases, shimmer timers and listeners now belong to `coach-controller`; the card stylesheet is also isolated. The card still owns curve selection, edits, membership orchestration and rendering. The goal is clear ownership, not a specific line count. (#201)

- [ ] **[P2 — release CI]** PR-time line enforcement: `scripts/release-branch-check` + `pr-release-target.yml`. The tag-time `assert-release-ref` guard compares SHAs, so a 2.17 feature merged from a not-yet-on-master branch or a mis-targeted PR (2.16-milestoned PR onto master, feature PR onto a hotfix) is only caught — if at all — at tag time. A required PR check that derives the intended line from the milestone and hard-fails a wrong base closes the gap at merge.

- [ ] **[P3 — release guard depth]** Add `git patch-id` content matching to `assert-release-ref` so a 2.17 feature *cherry-picked* into a 2.16 hotfix (fresh SHA — passes the commit-set test today) is also caught. Won't catch squash/reimplement; pair with the PR-time check above.

- [ ] **[P2 — release tooling]** Provide a single pre-tag check for release references, demo freshness, synchronized versions, current bundles, changelog entries, and the HACS archive. Reuse the existing release guards and packaging checks.

- [ ] **[P3 — release CI hardening]** (1) narrow `release.yml` `concurrency: gh-pages-deploy` to the deploy job so 2.16/prerelease asset publishes don't queue behind an unrelated demo deploy; (2) robust `origin/master` refspec at `release.yml:39` (`git fetch origin master:refs/remotes/origin/master`) — currently relies on `fetch-depth: 0`, fails closed if it regresses; (3) anchor `assert-release-ref` prerelease detection to the SemVer prerelease segment, not "any hyphen" (a `+build-7` metadata tag misclassifies); (4) `demo-freshness-check` `norm()` normalizes every `N.N.N` literal in watched files, not just version constants, so a real change that is only such a literal could vanish; (5) `release-line` header comment oversells a "future second maintenance line" it does not model (one series only).

- [ ] **[P2 — restart-free UI]** Show a reload notice when the dashboard card's version differs from the installed integration. Compare `CARD_VERSION` when the card connects and offer the cache-clearing reload described in `docs/TROUBLESHOOTING.md`. The sidebar panel already handles a stale card. The separate loader work would avoid the extra refresh.

- [ ] **[P2 — restart-free UI]** Evaluate a stable frontend loader and a fresh version endpoint so one reload can fetch an updated bundle. Verify service-worker caching, stale editor recovery and version agreement.

- [ ] **[P3 — save]** The client now stops waiting for a curve-save receipt after 8s and retains its draft as outcome unknown, requiring Check saved state before another deliberate save. The backend lock/apply still has no deadline; evaluate cancellation and runtime agreement before adding one. An unchanged read alone cannot prove a pending write will never complete.

- [ ] **[P3 — test harness]** The Home Assistant test plugin lets any test under `tests/components/<integration>/` leave timers behind (`expected_lingering_timers`), so a leaked timer only logs a warning while a leaked task fails the test. Override `expected_lingering_timers` in `tests/conftest.py` to return False so timer leaks fail too; the suite leaks none today.

- [ ] **[P3 — test coverage]** `Store.async_save` failures inside `async_resolve_handoff` have no failure-path test; only the setup-time migration save does. All three calls are unguarded: the expired-entry prune (`handoff.py:139`), the missing-entry prune (`:160`), and the success-path token consumption (`:166`). Pin what a save failure at each does to the token and the returned result.

- [ ] **[P2 — docs]** `tests/components/lightener_studio/test_membership_error_contract.py:153-155` says the direct `send_error` codes "are not part of the membership fixture", but `not_found` and `reload_failed` are both keys in `tests/fixtures/membership_errors_v1.json`, and the grouping directly below the sentence contradicts it. Reword to say these are the literal websocket-level codes, some of which overlap the membership contract.

- [ ] **[P3 — starting shapes]** Offer a named starting shape for common room layouts, such as a living room, bedroom, kitchen, or hallway.

- [ ] **[P3 — contributor docs]** Document how to turn a curve-editor bug report into a first contribution, including reproduction, relevant tests, and pull-request guidance.
