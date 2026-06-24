# TODOs

This is a short public backlog. Completed historical review notes belong in
`CHANGELOG.md` or GitHub history, not in this file. Larger work should be
tracked as GitHub Issues before implementation.

## Open Follow-Ups

- [ ] **[P3 — picker delight, optional]** Optionally seed the picker preview with a *real* Lightener light via an entity-aware `getStubConfig(hass)` instead of the current mock curves. NOTE: `preview: true` already shipped (`lightener-curve-card.ts:79`) and the picker tile already renders a live demo via `createMockCurves()` on the no-entity stub path — so this is cosmetic only. Mock curves are arguably better (deterministic, always populated, no empty-state edge cases), so consider WONTFIX. (Original P2 premise — "ship both together or not at all, else empty state" — is obsolete.)
- [ ] **[P2 — picker reach]** Member-light reverse lookup → parent group card suggestion: when a *member* light (not a lightener light) is picked in the card picker, scan `hass.states`/`hass.entities` for lightener lights whose native `entity_id` attribute contains the picked entity and return a labeled secondary suggestion for the parent group's card (`getLightenerEntitySuggestion` in `js/src/utils/card-registration.ts`). TS-only — the Python state attribute already exists (`LightenerLight` inherits `LightGroup`'s `entity_id` attr; see `tests/components/lightener/test_light.py:777`). Tie-break when a member belongs to multiple groups. Best landed with the P3 picker-registration CI guard below. Deferred from the ha-card-picker design.
- [ ] **[P3 — CI]** Add a CI check that the built bundles (`custom_components/lightener/frontend/lightener-curve-card.js`, `docs/lightener-curve-card.js`) contain `customCards` and `getEntitySuggestion` — catches a build or refactor silently dropping the picker registration. Flagged by /autoplan eng review, 2026-06-12.
- [ ] **[P3 — save lifecycle]** Consider replacing the blocking `confirming` phase with an optimistic save + silent background re-fetch. Both CEO review models flagged this as the more resilient architecture for slow HA environments. User deferred this during the issue-92 review.

<!-- UX/a11y review register (2026-06-22). Verified against code; the P0 undo
     desync from the same register shipped on florianhorner/fix-preview-undo-lights.
     Fixed in this branch: list semantics, desktop tap targets, graph role=group,
     hint overlay band, shape-coded graph markers, Add/Remove action hierarchy. -->
- [ ] **[P1 — copy]** Raw entity IDs are too prominent (panel select label + every light row). Make the friendly name primary; hide/truncate/mute the ID or show it only to disambiguate duplicate names (`lightener-panel.js:834`, `curve-legend.ts:991`).
- [ ] **[P1 — graph clarity]** The preview/scrubber vertical line is unlabeled. Label it (e.g. "Preview 43%"). (X-axis title intentionally omitted — the slider above the graph labels it; only revisit with design sign-off.) (`curve-graph.ts:656`.)
- [ ] **[P2 — visual]** Graph/preview/included-lights panel boundaries blur together, especially in dark mode. Slightly stronger panel contrast, consistent 1px borders, normalized padding (`curve-legend.ts:51`, panels rendered from `lightener-curve-card.ts:1673`).
- [ ] **[P2 — UI structure]** Evaluate whether Home Assistant-native row or expansion controls would make secondary actions easier to scan. Keep management, presets, and destructive actions visually secondary while preserving graph behavior, live preview, save/cancel guards, shape/dash accessibility, and keyboard editing.
- [ ] **[P2 — graph polish]** Hover/focus/drag growth of control points only animates the circle marker — the `.control-point` CSS uses the SVG `r` attribute, which `<rect>`/`<polygon>` markers ignore, so square/diamond/triangle/bar curves don't enlarge on interaction. Drive the size from a transform-based scale (with `transform-box: fill-box; transform-origin: center`) so all shapes respond. Flagged in the 2026-06-22 ship review (`curve-graph.ts` `.control-point` rules + `controlPointShape`).
- [ ] Reproduce hidden-parent rendering in real HA tabs, popups, and stacked dashboards; add a resize/intersection guard only if the browser repro confirms graph space collapses.
- [ ] Path-stamp the sidebar panel script if upgrade testing shows stale cached panels after HACS updates.
- [ ] Investigate usable upper bound for the curve card light count: what should happen with 30+ lights? Legend virtualization, search/filter/scroll, count cap, or a dedicated density mode. The 20-light same-shape case now gets a factual graph summary, but larger disclosure work (overview+focus, list filtering, row actions that collapse until selected/manage mode) remains a roadmap item rather than a quick polish fix.
- [ ] **Won't fix — by design:** axis/preview indicator duplication on the graph. The x-axis label lives on the scrubber; test `E.19` locks the graph to *not* duplicate it.
- [ ] Continue the `lightener-curve-card.ts` god-file extraction after `load-lifecycle`, `preview-controller`, and `edit-operations`: extract cohesive render/orchestration modules until the card file is coherent. The goal is a well-factored card, not a specific line count.
- [ ] Decide the curve-card coverage strategy: either lower the `lightener-curve-card.ts` size threshold in `js/vitest.config.ts` to the card's real size so it is coverage-tracked, or add explicit coverage tests for the card. The 400-line threshold is a coverage-tool heuristic, not a design target.
