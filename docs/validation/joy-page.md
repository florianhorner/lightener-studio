# Joy moments page validation

The standalone page is `docs/joy.html`. It contains the four interactive motion
studies and loads its pinned editor from `docs/joy-card.js`, with synthetic demo
lights. Its adapter changes only this page's demo behavior; it does not change
the Home Assistant integration.

## Autoplay layout regression

Previously, Save controls, membership messages and the growing light list changed
the card's height during playback. Browser measurements captured a 78 px height
range at 1440 px width and a 158 px range at 390 px. Scripted light additions also
restored focus to the native Edit lights button despite no picker having opened.

The page reserves space for five lights, Save controls and a status message. Its
scripted membership updates skip picker focus restoration; ordinary membership
editing keeps the native behavior.

On 2026-10-17, Chromium checks at 1440, 768 and 390 px sampled two autoplay cycles.
Card height, footer document position, graph document position and scroll position
each varied by 0 px. All three light counts (3, 4 and 5) appeared, every motion
stage ran, and autoplay made no focus or scroll calls.

Mouse and emulated-touch edits stopped playback and retained the edits. Keyboard
editing worked in each of the four studies. Slow playback, the page-wide motion
setting, separate autoplay pause, offscreen pause and initial reduced motion were
also checked. Manual light addition remained available with reduced motion.
No horizontal overflow or JavaScript exceptions were observed in those checks.

Keyboard boundary checks at 1440 and 390 px confirmed that ordinary arrow keys
can leave the 50% guide in both directions and return. Guide feedback does not
rewrite the chosen brightness. Reloading during autoplay showed no navigation
confirmation; after a reader edited the card, its native unsaved-changes
confirmation remained active. These cases also have regression tests.

These are browser checks with synthetic lights and emulated mobile input, not
physical-device or live Home Assistant acceptance. Network fonts were blocked
for deterministic layout checks, so the configured fallback fonts were used.

## Reproduce

From `js/`, run:

```sh
npx playwright test joy-page.spec.ts
```

The regression waits for two complete playback loops, up to 40 seconds, at each
width. The desktop case watches from the page footer. It fails if the card,
footer, graph or scroll position moves by more than 1 px, if autoplay moves focus,
or if the light sequence or editing takeover stops working.
