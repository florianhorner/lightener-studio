# TODOs

This is a short public backlog. Completed historical review notes belong in
`CHANGELOG.md` or GitHub history, not in this file. Larger work should be
tracked as GitHub Issues before implementation.

## Open Follow-Ups

- [ ] **[P2 — picker delight]** Ship `preview: true` together with an entity-aware `getStubConfig(hass)` that picks a real Lightener light, so the HA card picker renders a live brightness curve. Ship both together or not at all — preview without a stub entity renders the card's empty state. Deferred from the ha-card-picker design (office-hours cold read, 2026-06-12).
- [ ] **[P2 — picker reach]** Member-light reverse lookup: expose group member entity_ids as a `LightenerLight` state attribute (matching native light-group convention), then suggest the parent group's card when any member light is picked in the card picker (sync `hass.states` scan, labeled suggestion). Deferred from the ha-card-picker design.
- [ ] **[P3 — CI]** Add a CI check that the built bundles (`custom_components/lightener/frontend/lightener-curve-card.js`, `docs/lightener-curve-card.js`) contain `customCards` and `getEntitySuggestion` — catches a build or refactor silently dropping the picker registration. Flagged by /autoplan eng review, 2026-06-12.
- [ ] **[P3 — save lifecycle]** Consider replacing the blocking `confirming` phase with an optimistic save + silent background re-fetch. Both CEO review models flagged this as the more resilient architecture for slow HA environments. User deferred this during the issue-92 review.

<!-- UX/a11y review register (2026-06-22). Verified against code; the P0 undo
     desync from the same register shipped on florianhorner/fix-preview-undo-lights.
     Fixed in this branch: list semantics, desktop tap targets, graph role=group,
     hint overlay band, shape-coded graph markers, Add/Remove action hierarchy. -->
- [ ] **[P1 — copy] NEEDS SIGN-OFF** Plain-language terminology pass: "Lightener group" / "Brightness Curves" / "Presets" don't explain the task. Suggested: "Room or group", "Brightness response", "Choose preset". Product/copy decision — route through office-hours; edits the hand-tracked `custom_components/lightener/frontend/lightener-panel.js:779`/`781` and `js/src/lightener-curve-card.ts:1654`/`1662`.
- [ ] **[P1 — copy]** Raw entity IDs are too prominent (panel select label + every light row). Make the friendly name primary; hide/truncate/mute the ID or show it only to disambiguate duplicate names (`lightener-panel.js:834`, `curve-legend.ts:991`).
- [ ] **[P1 — graph clarity]** The preview/scrubber vertical line is unlabeled. Label it (e.g. "Preview 43%"). (X-axis title intentionally omitted — the slider above the graph labels it; only revisit with design sign-off.) (`curve-graph.ts:656`.)
- [ ] **[P2 — visual]** Graph/preview/included-lights panel boundaries blur together, especially in dark mode. Slightly stronger panel contrast, consistent 1px borders, normalized padding (`curve-legend.ts:51`, panels rendered from `lightener-curve-card.ts:1673`).
- [ ] Reproduce hidden-parent rendering in real HA tabs, popups, and stacked dashboards; add a resize/intersection guard only if the browser repro confirms graph space collapses.
- [ ] Path-stamp the sidebar panel script if upgrade testing shows stale cached panels after HACS updates.
- [ ] Investigate usable upper bound for the curve card light count: what should happen with 30+ lights? Legend virtualization, scroll, or count cap? Flagged by Codex during issue-90 autoplan review as a strategic product question unaddressed by the test fixture. **[P2 — density, from the 2026-06-22 review]** the ~20-light case already needs a dedicated density mode: overview+focus (all curves faint, selected dominant — currently opacity-only at `js/src/components/curve-graph.ts:704`), list search/filter/scroll (simple vertical list, no filter at `curve-legend.ts:68`), and row actions that collapse until selected/manage mode. This is a feature for office-hours/roadmap, not a quick fix.
- [ ] **Won't fix — by design:** axis/preview indicator duplication on the graph. The x-axis label lives on the scrubber; test `E.19` locks the graph to *not* duplicate it.
- [ ] Continue the `lightener-curve-card.ts` god-file extraction after `load-lifecycle`, `preview-controller`, and `edit-operations`: extract cohesive render/orchestration modules until the card file is coherent. The goal is a well-factored card, not a specific line count.
- [ ] Decide the curve-card coverage strategy: either lower the `lightener-curve-card.ts` size threshold in `js/vitest.config.ts` to the card's real size so it is coverage-tracked, or add explicit coverage tests for the card. The 400-line threshold is a coverage-tool heuristic, not a design target.
